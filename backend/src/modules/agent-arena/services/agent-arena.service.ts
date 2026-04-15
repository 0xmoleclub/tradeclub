import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { HypercoreService } from '@/modules/hypercore/services/hypercore.service';
import { PredictionMarketService } from '@/modules/prediction-market/services/prediction-market.service';
import { BattleService } from '@/modules/battle/services/battle.service';
import { BattleStatus, BattlePlayerStatus } from '@prisma/client';
import { PlaceAgentOrderDto, BuySharesDto } from '../dto';
import { ConfigService } from '@nestjs/config';
import { ChainConfig } from '@config/chain.config';
import { OpenMarketOrderDto, OpenLimitOrderDto } from '@/modules/hypercore/dto';

@Injectable()
export class AgentArenaService {
  private readonly logger = new Logger(AgentArenaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hypercoreService: HypercoreService,
    private readonly predictionMarketService: PredictionMarketService,
    private readonly battleService: BattleService,
    private readonly configService: ConfigService,
  ) {}

  async getActiveBattles(userId: string) {
    return this.prisma.battlePlayer.findMany({
      where: {
        userId,
        battle: {
          status: { in: [BattleStatus.WAITING, BattleStatus.STARTED] },
        },
      },
      include: {
        battle: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true, type: true, elo: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async getBattleState(userId: string, battleId: string) {
    const player = await this.prisma.battlePlayer.findFirst({
      where: { battleId, userId },
      include: {
        battle: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true, type: true, elo: true },
                },
              },
            },
            battlePredictionQuestions: {
              include: { choices: true },
            },
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Battle not found for this user');
    }

    const wallet = await this.prisma.hypercoreWallet.findUnique({
      where: { userId },
      select: { agentAddress: true },
    });

    if (!wallet) {
      throw new NotFoundException('Agent wallet not found');
    }

    const walletAddress = wallet.agentAddress as `0x${string}`;
    const hypercoreAccount = await this.hypercoreService.getAccountSummary(userId, walletAddress);
    const positions = await this.hypercoreService.getPositions(userId, walletAddress);
    const orders = await this.hypercoreService.getOpenOrders(userId, walletAddress);

    return {
      battle: player.battle,
      mySlot: player.slot,
      hypercoreAccount,
      positions,
      orders,
    };
  }

  async placeMarketOrder(userId: string, dto: PlaceAgentOrderDto) {
    await this.ensureBattleActive(userId);
    const order: OpenMarketOrderDto = {
      coin: dto.coin,
      isBuy: dto.isBuy,
      size: dto.size,
    };
    return this.hypercoreService.openMarketOrder(userId, order);
  }

  async placeLimitOrder(userId: string, dto: PlaceAgentOrderDto) {
    await this.ensureBattleActive(userId);
    if (!dto.limitPrice) {
      throw new BadRequestException('limitPrice required for limit orders');
    }
    const order: OpenLimitOrderDto = {
      coin: dto.coin,
      isBuy: dto.isBuy,
      price: dto.limitPrice,
      size: dto.size,
    };
    return this.hypercoreService.openLimitOrder(userId, order);
  }

  async getQuoteBuy(questionId: string, outcome: number, shares: string) {
    const chain = this.configService.getOrThrow<ChainConfig>('chain');
    const question = await this.prisma.battlePredictionQuestion.findUnique({
      where: { id: questionId },
      select: { marketAddress: true },
    });

    if (!question?.marketAddress) {
      throw new NotFoundException('Market not deployed yet');
    }

    return {
      marketAddress: question.marketAddress,
      outcome,
      shares,
      chainId: chain.evm.chainId,
      usdcAddress: chain.evm.contracts.stablecoin,
    };
  }

  async buyShares(userId: string, questionId: string, dto: BuySharesDto) {
    await this.ensureBattleActive(userId);
    const chainInfo = await this.predictionMarketService.getMarketChainInfo(questionId);
    if (!chainInfo.marketAddress) {
      throw new NotFoundException('Market not deployed yet');
    }

    this.logger.log(
      `Agent ${userId} buying outcome ${dto.outcome} shares ${dto.sharesWad} on market ${chainInfo.marketAddress}`,
    );

    return {
      marketAddress: chainInfo.marketAddress,
      usdcAddress: chainInfo.usdcAddress,
      chainId: chainInfo.chainId,
      outcome: dto.outcome,
      sharesWad: dto.sharesWad,
      maxCostUsdc: dto.maxCostUsdc,
    };
  }

  private async ensureBattleActive(userId: string) {
    const active = await this.prisma.battlePlayer.findFirst({
      where: {
        userId,
        battle: { status: BattleStatus.STARTED },
        status: BattlePlayerStatus.PLAYING,
      },
    });

    if (!active) {
      throw new ForbiddenException('No active battle found for this user');
    }
  }
}
