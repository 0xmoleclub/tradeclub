import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AgentWallet, AgentWalletStatus } from '@prisma/client';
import { Keypair } from '@solana/web3.js';
import { CryptoService } from './crypto.service';
import { UsersService } from '../../users/users.service';

/**
 * Service for managing agent wallets
 * Agent wallets are platform-managed wallets that act as delegates
 * on Drift Protocol on behalf of users
 */
@Injectable()
export class AgentWalletsService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private usersService: UsersService,
  ) {}

  /**
   * Create a new agent wallet for a user
   * This generates a new Solana keypair and encrypts the private key
   */
  async createAgentWallet(userId: string): Promise<AgentWallet> {
    // Check if user already has an agent wallet
    const existingWallet = await this.prisma.agentWallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      throw new ConflictException('User already has an agent wallet');
    }

    // Check if user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new Solana keypair
    const keypair = Keypair.generate();

    // Encrypt secret key (64 bytes)
    const encryptedSecretKey = this.cryptoService.encryptSecretKey(
      Buffer.from(keypair.secretKey),
    );

    // Create agent wallet record
    const agentWallet = await this.prisma.agentWallet.create({
      data: {
        userId,
        publicKey: keypair.publicKey.toBase58(),
        encryptedSecretKey,
        encryptionVersion: 'v1',
        isDelegated: false,
        subaccountIndex: 0,
        status: AgentWalletStatus.ACTIVE,
      },
    });

    return agentWallet;
  }

  /**
   * Get agent wallet by user ID
   */
  async getAgentWalletByUserId(userId: string): Promise<AgentWallet | null> {
    return this.prisma.agentWallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Get agent wallet by public key
   */
  async getAgentWalletByPublicKey(publicKey: string): Promise<AgentWallet | null> {
    return this.prisma.agentWallet.findUnique({
      where: { publicKey },
    });
  }

  /**
   * Mark agent wallet as delegated
   * Called after user sets this wallet as delegate on Drift
   */
  async markAsDelegated(
    walletId: string,
    subaccountIndex: number = 0,
  ): Promise<AgentWallet> {
    const wallet = await this.prisma.agentWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Agent wallet not found');
    }

    return this.prisma.agentWallet.update({
      where: { id: walletId },
      data: {
        isDelegated: true,
        subaccountIndex,
        delegatedAt: new Date(),
      },
    });
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(walletId: string): Promise<AgentWallet> {
    const wallet = await this.prisma.agentWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Agent wallet not found');
    }

    return this.prisma.agentWallet.update({
      where: { id: walletId },
      data: {
        isDelegated: false,
        status: AgentWalletStatus.REVOKED,
        delegatedAt: null,
      },
    });
  }

  /**
   * Decrypt and get secret key for signing transactions
   * Use with caution - only decrypt when needed for signing
   */
  async getSecretKey(walletId: string): Promise<Uint8Array> {
    const wallet = await this.prisma.agentWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Agent wallet not found');
    }

    return this.cryptoService.decryptSecretKey(wallet.encryptedSecretKey);
  }

  /**
   * Update cached gas balance (SOL)
   */
  async updateGasBalance(walletId: string, balance: string): Promise<void> {
    await this.prisma.agentWallet.update({
      where: { id: walletId },
      data: { gasBalance: balance },
    });
  }
}
