import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { HyperliquidWallet } from '@prisma/client';
import { EvmCryptoService } from './evm-crypto.service';

/**
 * Hyperliquid Agent Wallet Service - ULTRA SIMPLE
 * 
 * ONE endpoint: Create/Replace wallet
 * - If no wallet exists: creates new one
 * - If wallet exists: overwrites with new key (old one auto-revoked by HL via same agent name)
 * 
 * Frontend handles:
 * - ApproveAgent transaction on Hyperliquid
 * - Checking if agent is approved
 * - Revoking/rotating (just call this endpoint again!)
 */
@Injectable()
export class HyperliquidWalletsService {
  private readonly logger = new Logger(HyperliquidWalletsService.name);

  constructor(
    private prisma: PrismaService,
    private evmCryptoService: EvmCryptoService,
  ) {}

  /**
   * Create or REPLACE agent wallet for user
   * 
   * If wallet exists: deletes old one, creates new one
   * Hyperliquid auto-revokes old agent when new one with same name is approved
   * 
   * @returns agentAddress - frontend uses this for ApproveAgent tx
   */
  async createOrReplaceWallet(
    userId: string,
    masterAddress: string,
  ): Promise<{ agentAddress: string }> {
    // Generate new EVM keypair
    const keypair = this.evmCryptoService.generateKeypair();
    const encryptedAgentKey = this.evmCryptoService.encryptPrivateKey(keypair.privateKey);

    // Upsert: Create if not exists, replace if exists
    await this.prisma.hyperliquidWallet.upsert({
      where: { userId },
      update: {
        // Replace old wallet
        agentAddress: keypair.address,
        encryptedAgentKey,
        masterAddress,
      },
      create: {
        // Create new wallet
        userId,
        agentAddress: keypair.address,
        encryptedAgentKey,
        masterAddress,
      },
    });

    this.logger.log(`Agent wallet for user ${userId}: ${keypair.address}`);

    return { agentAddress: keypair.address };
  }

  /**
   * Get user's agent wallet (for API response - no sensitive data)
   */
  async getWallet(userId: string): Promise<Pick<HyperliquidWallet, 'agentAddress' | 'masterAddress' | 'createdAt'> | null> {
    return this.prisma.hyperliquidWallet.findUnique({
      where: { userId },
      select: {
        agentAddress: true,
        masterAddress: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get agent private key for signing (used by trading service)
   */
  async getAgentPrivateKey(userId: string): Promise<`0x${string}`> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('No agent wallet found');
    }

    return this.evmCryptoService.decryptPrivateKey(wallet.encryptedAgentKey);
  }

  /**
   * Get master address for a user
   */
  async getMasterAddress(userId: string): Promise<string> {
    const wallet = await this.prisma.hyperliquidWallet.findUnique({
      where: { userId },
      select: { masterAddress: true },
    });

    if (!wallet) {
      throw new Error('No agent wallet found');
    }

    return wallet.masterAddress;
  }
}
