import { PrismaService } from '@/database/prisma.service';
import { MatchGroup } from '../../matchmaking/types/matchmaking.types';
import {
  BattleStatus,
  BattlePlayerStatus,
  UserStatus,
  Prisma,
  Battle,
} from '@prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { CreateBattleResultDto } from '../dto';
import { BattlePlayerService } from './battle-player.service';
import { buildRanking } from '../utils/ranking.util';
import { computeEloDelta } from '../utils/elo.util';
import { ChainServiceFactory } from '@/modules/chain-services/chain-service-factory';
import { PredictionMarketService } from '@/modules/prediction-market/services/prediction-market.service';

// ORCHESTRATOR SERVICE FOR BATTLE LIFECYCLE

@Injectable()
export class BattleService {
  constructor(
    private readonly player: BattlePlayerService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly chainFactory: ChainServiceFactory,
  ) {}

  /**
   * Gets battle details along with its players.
   * This is used to fetch the current state of the battle.
   */
  async getBattle(battleId: string) {
    return this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });
  }

  /**
   * Creates a new battle based on the matched players from matchmaking.
   * This is triggered when a match is found and a battle needs to be created.
   */
  async create(match: MatchGroup): Promise<Battle> {
    const battle = await this.prisma.$transaction(async (tx) => {
      const b = await tx.battle.create({
        data: {
          status: BattleStatus.MATCHING, // initial status
          maxPlayers: match.players.length,
          metadata: {
            matchId: match.matchId,
            avgElo: match.avgElo,
            forced: match.forced,
            matchmakingCreatedAt: match.createdAt,
          },
        },
      });

      await tx.battlePlayer.createMany({
        data: match.players.map((p, index) => ({
          battleId: b.id,
          userId: p.userId,
          status: BattlePlayerStatus.JOINED,
          slot: index + 1,
          eloSnapshot: p.elo,
        })),
      });

      this.logger.log(`Created battle ${b.id} for match ${match.matchId}`);
      return b;
    });

    if (!battle) {
      this.logger.error(`Failed to create battle for match ${match.matchId}`);
      throw new Error(`Failed to create battle for match ${match.matchId}`);
    }

    try {
      await this.chainFactory
        .getCurrent(PredictionMarketService)
        .enqueueCreateMarket({
          battleId: battle.id,
          matchId: match.matchId,
        });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue market creation for match ${match.matchId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return battle;
  }

  /**
   * Starts the battle if all players are ready.
   * It updates the battle status to RUNNING and marks players as PLAYING.
   * Lock users to prevent them from joining other battles while this battle is active.
   */
  async battleStart(battleId: string) {
    return this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
      });

      // check if battle exists and is in correct status
      if (!battle || battle.status !== BattleStatus.MATCHING) {
        return null;
      }

      // update battle status to RUNNING
      const updated = await tx.battle.update({
        where: { id: battleId },
        data: {
          status: BattleStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // mark players as playing
      await this.player.markPlaying(battleId, tx);

      // lock users in battle -> set IN_BATTLE status
      await this.toggleLockUser(battleId, UserStatus.IN_BATTLE, tx);

      return updated;
    });
  }

  /**
   * Finishes the battle if all players are finished.
   * It updates the battle status to FINISHED, calculates results, updates player stats, and unlocks users.
   * This is triggered when the battle is evaluated and determined to be finished.
   */
  async battleFinish(battleId: string, dto: CreateBattleResultDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
        include: { players: true },
      });

      // check if battle exists and is in correct status
      if (!battle || battle.status !== BattleStatus.RUNNING) {
        return null;
      }

      // mark all playing players as finished
      await tx.battle.update({
        where: { id: battleId },
        data: {
          status: BattleStatus.FINISHED,
          endedAt: new Date(),
        },
      });

      // update players elo and rank points based on battle result
      await this.updateEloAndRankPoints(battleId, dto, tx);

      // unlock users in battle -> set ACTIVE status
      await this.toggleLockUser(battleId, UserStatus.ACTIVE, tx);

      // create battle result
      const result = await this.createBattleResult(battleId, dto, tx);

      return result;
    });

    if (result) {
      void this.proposeOutcomeAsync(battleId, dto).catch((error) => {
        this.logger.error(
          `Failed to propose onchain outcome for battle ${battleId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    }

    return result;
  }

  /**
   * Cancels the battle if it is still in MATCHING status.
   * It updates the battle status to CANCELLED and unlocks users if necessary.
   * This is triggered when the battle is evaluated and determined to be cancelled (e.g., a player left).
   */
  async battleCancel(battleId: string) {
    return this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
        include: { players: true },
      });

      if (!battle || battle.status !== BattleStatus.MATCHING) {
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
    });
  }

  // ==================== UTILS ====================

  /**
   * Toggles lock status for a list of users.
   * This is used to lock users when they are in a battle and unlock them when the battle finishes or is cancelled.
   * It updates the user's status to prevent them from joining other battles while locked.
   */
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
    // TODO: replace with real metrics engine
    return tx.battleResult.create({
      data: {
        battleId,
        name: dto.name,
        dataHash: dto.dataHash,
        isCorrect: dto.isCorrect,
        codeCommitHash: dto.codeCommitHash,
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
    // fetch players and their current elo
    const players = await this.player.getPlayers(battleId, tx);

    // compute ranking based on result
    const ranking = buildRanking(dto.metrics);

    // update player's elo based on battle result and eloSnapshot
    // update player's rankPoints (winner)
    for (const rank of ranking) {
      const player = players.find((p) => p.slot === rank.slot);
      if (!player) continue;

      const delta = computeEloDelta(rank.rank, players.length);

      await tx.user.update({
        where: { id: player.userId },
        data: {
          elo: { increment: delta },
          rankPoints: { increment: delta }, // TODO: separate rankPoints and elo
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

    // `slot` is a 1-based player position in the ranking, while the prediction market
    // contract expects a zero-based outcome index. The top-ranked player is at
    // `ranking[0]`, so we subtract 1 from its slot to derive the on-chain outcome id.
    // If a battle has N players (N slots), the first N outcomes in prediction market contract
    // respectively corresponds to the prediction of each player winning
    const outcome = ranking[0].slot - 1;
    await this.chainFactory
      .getCurrent(PredictionMarketService)
      .enqueueProposeOutcome({
        battleId,
        matchId,
        outcome,
        dataHash: dto.dataHash,
        codeCommitHash: dto.codeCommitHash,
      });
  }
}
    // respectively correspond to the prediction of each player winning
