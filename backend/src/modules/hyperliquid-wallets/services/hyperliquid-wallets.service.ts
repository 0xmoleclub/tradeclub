import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { HyperliquidWallet, HyperliquidWalletStatus } from '@prisma/client';
import { EvmCryptoService } from './evm-crypto.service';
import { UsersService } from '../../users/users.service';

/**
 * Service for managing Hyperliquid agent wallets
 * 
 * Hyperliquid Agent Wallet Architecture:
 * - Master Account: User's main EVM wallet (holds USDC funds)
 * - Agent Wallet: Platform-managed EVM keypair (signs orders/cancels)
 * - Master must sign "ApproveAgent" tx to authorize agent
 * - Agent can then sign orders on behalf of master
 * - Nonces are tracked per-signer (100 highest nonces stored)
 */
@Injectable()
export class HyperliquidWalletsService {
  private readonly logger = new Logger(HyperliquidWalletsService.name);

  constructor(
    private prisma: PrismaService,
    private evmCryptoService: EvmCryptoService,
    private usersService: UsersService,
  ) {}

  /**
   * Create a new Hyperliquid agent wallet for a user
   * This generates a new EVM keypair and encrypts the private key
   * 
   * @param userId - The user ID
   * @param masterAddress - The user's main EVM wallet address (master account)
   * @returns The created agent wallet (without encrypted key)
   */
  async createAgentWallet(
    userId: string,
    masterAddress: string,
  ): Promise<Omit<HyperliquidWallet, 'encryptedAgentKey'>> {
    // Check if user already has a Hyperliquid wallet
    const existingWallet = await this.getWalletByUserId(userId);

    if (existingWallet) {
      throw new ConflictException('User already has a Hyperliquid agent wallet');
    }

    // Check if user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new EVM keypair for agent
    const keypair = this.evmCryptoService.generateKeypair();

    // Encrypt private key
    const encryptedAgentKey = this.evmCryptoService.encryptPrivateKey(keypair.privateKey);

    // Create wallet record
    const wallet = await this.prisma.hyperliquidWallet.create({
      data: {
        userId,
        agentAddress: keypair.address,
        masterAddress,
        encryptedAgentKey,
        encryptionVersion: 'v1',
        isApproved: false,
        subaccountIndex: 0, // Default to master account
        status: HyperliquidWalletStatus.ACTIVE,
        lastNonce: BigInt(0),
      },
    });

    this.logger.log(`Created Hyperliquid agent wallet for user ${userId}: ${keypair.address}`);

    // Return without encrypted key
    const { encryptedAgentKey: _, ...walletSafe } = wallet;
    return walletSafe;
  }

  /**
   * Get Hyperliquid wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<HyperliquidWallet | null> {
    return this.prisma.hyperliquidWallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Get Hyperliquid wallet by user ID (safe - excludes encryptedAgentKey)
   */
  async getWalletSafe(
    userId: string,
  ): Promise<Omit<HyperliquidWallet, 'encryptedAgentKey'> | null> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        agentAddress: true,
        masterAddress: true,
        agentName: true,
        subaccountIndex: true,
        isApproved: true,
        approvedAt: true,
        lastNonce: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        encryptionVersion: true,
      },
    });
    return wallet;
  }

  /**
   * Get Hyperliquid wallet by agent address
   */
  async getWalletByAgentAddress(
    agentAddress: string,
  ): Promise<HyperliquidWallet | null> {
    return this.prisma.hyperliquidWallet.findUnique({
      where: { agentAddress },
    });
  }

  /**
   * Mark agent wallet as approved
   * Called after user approves the agent on Hyperliquid via ApproveAgent transaction
   * 
   * @param walletId - The wallet ID
   * @param agentName - Optional name for the agent (named agents)
   */
  async markAsApproved(
    walletId: string,
    agentName?: string,
  ): Promise<HyperliquidWallet> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Hyperliquid wallet not found');
    }

    this.logger.log(`Marking agent wallet ${wallet.agentAddress} as approved`);

    return this.prisma.hyperliquidWallet.update({
      where: { id: walletId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        agentName: agentName || wallet.agentName,
      },
    });
  }

  /**
   * Revoke agent approval
   * Called when user revokes the agent on Hyperliquid
   * 
   * IMPORTANT: Once an agent is deregistered on Hyperliquid, its nonce state
   * may be pruned. DO NOT reuse this agent address - generate a new one instead.
   */
  async revokeApproval(walletId: string): Promise<HyperliquidWallet> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Hyperliquid wallet not found');
    }

    this.logger.warn(`Revoking agent approval for ${wallet.agentAddress}. ` +
      'WARNING: This agent address should NOT be reused after deregistration.');

    return this.prisma.hyperliquidWallet.update({
      where: { id: walletId },
      data: {
        isApproved: false,
        status: HyperliquidWalletStatus.REVOKED,
        approvedAt: null,
      },
    });
  }

  /**
   * Decrypt and get the agent's private key for signing
   * Use with caution - only decrypt when needed for signing
   * 
   * @param walletId - The wallet ID
   * @returns The private key with 0x prefix
   */
  async getAgentPrivateKey(walletId: string): Promise<`0x${string}`> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Hyperliquid wallet not found');
    }

    return this.evmCryptoService.decryptPrivateKey(wallet.encryptedAgentKey);
  }

  /**
   * Get and increment nonce for signing
   * Hyperliquid tracks 100 highest nonces per signer
   * Nonces must be unique and within (T - 2 days, T + 1 day) where T is current time
   * 
   * @param walletId - The wallet ID
   * @returns The next nonce to use (as bigint for timestamp-based nonces)
   */
  async getNextNonce(walletId: string): Promise<bigint> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Hyperliquid wallet not found');
    }

    // Use current timestamp as base nonce (milliseconds)
    const timestamp = BigInt(Date.now());
    
    // If last nonce is in the past, use current timestamp
    // If somehow we're colliding, increment
    const nextNonce = timestamp > wallet.lastNonce ? timestamp : wallet.lastNonce + BigInt(1);

    // Update the stored nonce
    await this.prisma.hyperliquidWallet.update({
      where: { id: walletId },
      data: { lastNonce: nextNonce },
    });

    return nextNonce;
  }

  /**
   * Update subaccount index
   * Hyperliquid supports subaccounts for isolated positions
   * 
   * @param walletId - The wallet ID
   * @param subaccountIndex - The subaccount index (0 = master)
   */
  async updateSubaccount(
    walletId: string,
    subaccountIndex: number,
  ): Promise<HyperliquidWallet> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Hyperliquid wallet not found');
    }

    return this.prisma.hyperliquidWallet.update({
      where: { id: walletId },
      data: { subaccountIndex },
    });
  }
}
