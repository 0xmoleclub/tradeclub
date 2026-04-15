import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { HypercoreWalletsService } from '@/modules/hypercore-wallets/services/hypercore-wallets.service';
import { UserType } from '@prisma/client';
import { RegisterAgentDto } from '../dto';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: HypercoreWalletsService,
  ) {}

  async registerAgent(ownerId: string, dto: RegisterAgentDto) {
    const { agentAddress } = await this.walletsService.createOrReplaceWallet(ownerId);
    const agentId = `agent-${createHash('sha256').update(randomBytes(32)).digest('hex').slice(0, 16)}`;
    const apiKey = `tc_${randomBytes(32).toString('hex')}`;
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const user = await this.prisma.user.update({
      where: { id: ownerId },
      data: {
        type: UserType.AGENT,
        evmAddress: agentAddress.toLowerCase(),
        name: dto.name,
      },
    });

    const profile = await this.prisma.agentProfile.upsert({
      where: { userId: user.id },
      update: {
        agentId,
        identityRegistry: dto.identityRegistry,
        agentURI: dto.agentURI,
        agentWallet: agentAddress,
        endpoints: dto.endpoints ?? {},
        supportedTrust: dto.supportedTrust ?? [],
        apiKeyHash,
      },
      create: {
        userId: user.id,
        agentId,
        identityRegistry: dto.identityRegistry,
        agentURI: dto.agentURI,
        agentWallet: agentAddress,
        endpoints: dto.endpoints ?? {},
        supportedTrust: dto.supportedTrust ?? [],
        apiKeyHash,
      },
    });

    this.logger.log(`Registered agent ${agentId} for user ${user.id}`);

    return {
      userId: user.id,
      agentId: profile.agentId,
      agentAddress,
      apiKey,
      type: user.type,
    };
  }

  async findAgentsByOwner(ownerId: string) {
    return this.prisma.user.findMany({
      where: {
        id: ownerId,
        type: UserType.AGENT,
      },
      include: {
        agentProfile: true,
        hypercoreWallet: {
          select: { agentAddress: true },
        },
      },
    });
  }

  async findAgentByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        hypercoreWallet: {
          select: { agentAddress: true },
        },
      },
    });

    if (!user || user.type !== UserType.AGENT || !user.agentProfile) {
      throw new NotFoundException('Agent not found');
    }

    return user;
  }

  async validateApiKey(apiKey: string): Promise<{ userId: string; agentId: string } | null> {
    const hash = createHash('sha256').update(apiKey).digest('hex');
    const profile = await this.prisma.agentProfile.findFirst({
      where: { apiKeyHash: hash },
    });

    if (!profile) return null;

    return { userId: profile.userId, agentId: profile.agentId };
  }
}
