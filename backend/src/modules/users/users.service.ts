import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User } from '@prisma/client';

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
   * Get or create nonce for wallet address
   */
  async getNonce(walletAddress: string): Promise<string> {
    const nonce = this.randomNonce();

    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: {
        walletAddress,
        nonce,
      },
    });

    return user.nonce!;
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
        agentWallet: {
          select: {
            id: true,
            publicKey: true,
            isDelegated: true,
            subaccountIndex: true,
            status: true,
            delegatedAt: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        agentWallet: {
          select: {
            id: true,
            publicKey: true,
            isDelegated: true,
            subaccountIndex: true,
            status: true,
            delegatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { walletAddress },
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
