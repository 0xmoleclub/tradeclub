import { Injectable, NotFoundException } from '@nestjs/common';
import { isAddress } from 'viem';
import bs58 from 'bs58';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a random 6-digit nonce
   */
  private randomNonce(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  /**
   * Detect if address is EVM or Solana
   */
  private detectAddressType(address: string): 'evm' | 'solana' | 'unknown' {
    if (isAddress(address, { strict: false })) return 'evm';
    try {
      const decoded = bs58.decode(address);
      if (decoded.length === 32) return 'solana';
    } catch {
      // Not base58
    }
    return 'unknown';
  }

  /**
   * Get or create nonce for wallet address (supports both EVM and Solana)
   */
  async getNonce(walletAddress: string): Promise<string> {
    const nonce = this.randomNonce();
    const addressType = this.detectAddressType(walletAddress);

    if (addressType === 'evm') {
      // EVM address
      const user = await this.prisma.user.upsert({
        where: { evmAddress: walletAddress },
        update: { nonce },
        create: {
          evmAddress: walletAddress,
          nonce,
        },
      });
      return user.nonce!;
    } else if (addressType === 'solana') {
      // DEPRECATED: Solana address
      const user = await this.prisma.user.upsert({
        where: { walletAddress },
        update: { nonce },
        create: {
          walletAddress,
          nonce,
        },
      });
      return user.nonce!;
    } else {
      throw new Error('Invalid wallet address format');
    }
  }

  /**
   * Clear nonce and update last login after successful login
   */
  async loginSuccess(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nonce: null,
        lastLoginAt: new Date(),
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        // Hypercore wallet
        hypercoreWallet: {
          select: {
            agentAddress: true,
            masterAddress: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        hypercoreWallet: {
          select: {
            agentAddress: true,
            masterAddress: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * DEPRECATED: Find user by Solana wallet address
   */
  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { walletAddress },
    });
  }

  /**
   * Find user by EVM wallet address
   */
  async findByEvmAddress(evmAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { evmAddress },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.findById(id); // Verify user exists
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
