import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { isAddress } from 'viem';
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
   * Get or create nonce for EVM address
   */
  async getNonce(evmAddress: string): Promise<string> {
    // Validate EVM address
    if (!isAddress(evmAddress, { strict: false })) {
      throw new BadRequestException('Invalid EVM address format');
    }

    const nonce = this.randomNonce();

    const user = await this.prisma.user.upsert({
      where: { evmAddress },
      update: { nonce },
      create: {
        evmAddress,
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
        hypercoreWallet: {
          select: {
            agentAddress: true,
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
