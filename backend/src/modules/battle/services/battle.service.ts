import { PrismaService } from '@/database/prisma.service';
import { MatchGroup } from '../types/matchmaking.types';
import {
  BattleStatus,
  BattlePlayerStatus,
  UserStatus,
  Prisma,
  Battle,
} from '@prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { BattlePlayerService } from './battle-player.service';
import { buildRanking } from '../utils/ranking.util';
import { computeEloDelta } from '../utils/elo.util';
import { PredictionMarketService } from '@modules/prediction-market/services/prediction-market.service';
import { CreateBattleResultDto } from '../dto/battle-result.dto';
import { AgentReputationService } from './agent-reputation.service';

// ORCHESTRATOR SERVICE FOR BATTLE LIFECYCLE

@Injectable()
export class BattleService {
  constructor(
    private readonly player: BattlePlayerService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly predictionMarketService: PredictionMarketService,
    private readonly agentReputationService: AgentReputationService,
  ) {}

  async getBattle(battleId: string) {
    return this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });
  }

  async create(match: MatchGroup): Promise<Battle> {
    const { battle, question } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: { in: match.players.map((p) => p.userId) },
          status: UserStatus.PENDING,
        },
        data: { status: UserStatus.IN_BATTLE },
      });

      if (updated.count !== match.players.length) {
        throw new Error(
          `Some users are not in PENDING state for match ${match.matchId}`,
        );
      }

      const b = await tx.battle.create({
        data: {
          status: BattleStatus.WAITING,
          maxPlayers: match.players.length,
          metadata: {
            matchId: match.matchId,
            avgElo: match.avgElo,
            forced: match.forced,
            matchmakingCreatedAt: match.createdAt,
          },
        },
      });

      const q = await tx.battlePredictionQuestion.create({
        data: {
          battleId: b.id,
          questionText: 'Who will win the battle?',
          description:
            'Predict which combatant will win the battle based on who has the highest PnL at the end.',
        },
      });

      await tx.battlePredictionChoice.createMany({
        data: match.players.map((_, index) => {
          return {
            battleId: b.id,
            battlePredictionQuestionId: q.id,
            outcome: index,
          };
        }),
      });

      await tx.battlePlayer.createMany({
        data: match.players.map((p, index) => ({
          battleId: b.id,
          userId: p.userId,
          status: BattlePlayerStatus.JOINED,
          slot: index + 1,
          stake: p.stake,
          eloSnapshot: p.elo,
        })),
      });

      this.logger.log(`Created battle ${b.id} for match ${match.matchId}`);
      return { battle: b, question: q };
    });

    if (!battle) {
      this.logger.error(`Failed to create battle for match ${match.matchId}`);
      throw new Error(`Failed to create battle for match ${match.matchId}`);
    }

    try {
      await this.predictionMarketService.enqueueCreateMarket({
        battleId: battle.id,
        matchId: match.matchId,
        questionId: question.id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue market creation for match ${match.matchId}`,
        error,
      );
    }

    return battle;
  }

  async battleStart(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const battle = await tx.battle.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.status !== BattleStatus.WAITING) {
      return null;
    }

    await tx.battle.update({
      where: { id: battleId },
      data: {
        status: BattleStatus.STARTED,
        startedAt: new Date(),
      },
    });

    await this.player.markPlaying(battleId, tx);
    await this.toggleLockUser(battleId, UserStatus.IN_BATTLE, tx);

    return true;
  }

  async battleFinish(
    battleId: string,
    dto: CreateBattleResultDto,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const battle = await tx.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });

    if (!battle || battle.status !== BattleStatus.STARTED) {
      return null;
    }

    await tx.battle.update({
      where: { id: battleId },
      data: {
        status: BattleStatus.FINISHED,
        endedAt: new Date(),
      },
    });

    await this.updateEloAndRankPoints(battleId, dto, tx);
    await this.toggleLockUser(battleId, UserStatus.ACTIVE, tx);
    const result = await this.createBattleResult(battleId, dto, tx);

    if (result) {
      void this.proposeOutcomeAsync(battleId, dto).catch((error) => {
        this.logger.error(
          `Failed to propose onchain outcome for battle ${battleId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

      void this.agentReputationService
        .submitBattleReputation(
          battleId,
          dto.metrics.map((m) => ({
            playerSlot: m.playerSlot,
            metric: m.metric,
            value: m.value.toString(),
          })),
        )
        .catch((error) => {
          this.logger.error(
            `Failed to submit agent reputation for battle ${battleId}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    }

    return result;
  }

  async battleCancel(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const battle = await tx.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });

    if (!battle || battle.status !== BattleStatus.WAITING) {
      return null;
    }

    const cancelled = await tx.battle.update({
      where: { id: battleId },
      data: { status: BattleStatus.CANCELLED },
    });

    await tx.user.updateMany({
      where: { id: { in: battle.players.map((p) => p.userId) } },
      data: { status: UserStatus.ACTIVE },
    });

    return cancelled;
  }

  private async toggleLockUser(
    battleId: string,
    status: UserStatus,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const players = await this.player.getPlayers(battleId, tx);

    await tx.user.updateMany({
      where: { id: { in: players.map((p) => p.userId) } },
      data: { status },
    });

    this.logger.log(
      `Toggled lock for users ${players.map((p) => p.userId).join(', ')} to status ${status}`,
    );
  }

  private async createBattleResult(
    battleId: string,
    dto: CreateBattleResultDto,
    tx: Prisma.TransactionClient,
  ) {
    return tx.battleResult.create({
      data: {
        battleId,
        description: dto.description,
        dataHash: dto.dataHash,
        isCorrect: dto.isCorrect,
        codeCommitHash: dto.codeCommitHash,
        battlePredictionQuestionId: dto.questionId,
        outcome: dto.outcome,
        dataPoints: {
          create: dto.metrics.map((m) => ({
            metric: m.metric,
            playerSlot: m.playerSlot,
            value: m.value,
          })),
        },
      },
    });
  }

  private async updateEloAndRankPoints(
    battleId: string,
    dto: CreateBattleResultDto,
    tx: Prisma.TransactionClient,
  ) {
    const players = await this.player.getPlayers(battleId, tx);
    const ranking = buildRanking(dto.metrics);

    for (const rank of ranking) {
      const player = players.find((p) => p.slot === rank.slot);
      if (!player) continue;

      const delta = computeEloDelta(rank.rank, players.length);

      await tx.user.update({
        where: { id: player.userId },
        data: {
          elo: { increment: delta },
          rankPoints: { increment: delta },
        },
      });
    }
  }

  private async proposeOutcomeAsync(
    battleId: string,
    dto: CreateBattleResultDto,
  ) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: { metadata: true },
    });

    const metadata = (battle?.metadata as Record<string, unknown> | null) ?? {};
    const matchId = metadata.matchId as string | undefined;
    if (!matchId) {
      this.logger.warn(`Battle ${battleId} missing matchId metadata`);
      return;
    }

    const ranking = buildRanking(dto.metrics);
    if (ranking.length === 0) {
      this.logger.warn(`Battle ${battleId} has no ranking metrics`);
      return;
    }

    const outcome = ranking[0].slot - 1;
    await this.predictionMarketService.enqueueProposeOutcome({
      battleId,
      matchId,
      outcome,
      dataHash: dto.dataHash,
      questionId: dto.questionId,
      codeCommitHash: dto.codeCommitHash,
    });
  }
}
