import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { HypercoreWallet } from '@prisma/client';
import { EvmCryptoService } from './evm-crypto.service';

/**
 * Hypercore Agent Wallet Service
 * 
 * Generates EVM keypairs for Hyperliquid trading agents.
 * Private keys are encrypted and stored securely.
 */
@Injectable()
export class HypercoreWalletsService {
  private readonly logger = new Logger(HypercoreWalletsService.name);

  constructor(
    private prisma: PrismaService,
    private evmCryptoService: EvmCryptoService,
  ) {}

  /**
   * Create or REPLACE agent wallet for user
   * 
   * - Generates new EVM keypair
   * - Encrypts private key
   * - Stores in database linked to user
   * - Returns the agent address (public key)
   * 
   * @returns agentAddress - the public key to use on Hyperliquid
   */
  async createOrReplaceWallet(userId: string): Promise<{ agentAddress: string }> {
    // Generate new EVM keypair
    const keypair = this.evmCryptoService.generateKeypair();
    const encryptedAgentKey = this.evmCryptoService.encryptPrivateKey(keypair.privateKey);

    // Upsert: Create if not exists, replace if exists
    await this.prisma.hypercoreWallet.upsert({
      where: { userId },
      update: {
        // Replace old wallet
        agentAddress: keypair.address,
        encryptedAgentKey,
      },
      create: {
        // Create new wallet
        userId,
        agentAddress: keypair.address,
        encryptedAgentKey,
      },
    });

    this.logger.log(`Agent wallet created for user ${userId}: ${keypair.address}`);

    return { agentAddress: keypair.address };
  }

  /**
   * Get user's agent wallet (for API response - no sensitive data)
   */
  async getWallet(userId: string): Promise<Pick<HypercoreWallet, 'agentAddress' | 'createdAt'> | null> {
    return this.prisma.hypercoreWallet.findUnique({
      where: { userId },
      select: {
        agentAddress: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get agent private key for signing (used by trading service)
   */
  async getAgentPrivateKey(userId: string): Promise<`0x${string}`> {
    const wallet = await this.prisma.hypercoreWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('No agent wallet found');
    }

    return this.evmCryptoService.decryptPrivateKey(wallet.encryptedAgentKey);
  }
}
