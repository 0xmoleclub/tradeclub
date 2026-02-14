import { PrismaService } from '@/database/prisma.service';
import { MatchGroup } from '../matchmaking/types/matchmaking.types';
import { BattleStatus } from '@prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';

export class BattleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* ================== Services ================== */

  async create(match: MatchGroup) {
    return this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.create({
        data: {
          status: BattleStatus.MATCHING, // initial status
          maxPlayers: match.players.length,
          metadata: {
            avgElo: match.avgElo,
            forced: match.forced,
            matchmakingCreatedAt: match.createdAt,
          },
        },
      });

      await tx.battlePlayer.createMany({
        data: match.players.map((p, index) => ({
          battleId: battle.id,
          userId: p.userId,
          slot: index + 1,
          eloSnapshot: p.elo,
        })),
      });

      this.logger.log(`Created battle ${battle.id} for match ${match.matchId}`);

      return battle;
    });
  }

  async battleStart(battleId: string) {
    const updated = await this.prisma.battle.updateMany({
      where: {
        id: battleId,
        status: BattleStatus.MATCHING,
      },
      data: {
        status: BattleStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      this.logger.error(
        `Battle ${battleId} could not be started (not found or invalid status)`,
      );
    }

    this.logger.log(`Battle ${battleId} started`);

    return this.prisma.battle.findUnique({ where: { id: battleId } });
  }

  async battleCancel(battleId: string) {
    const updated = await this.prisma.battle.updateMany({
      where: {
        id: battleId,
        status: BattleStatus.MATCHING,
      },
      data: {
        status: BattleStatus.CANCELLED,
        endedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      this.logger.error(
        `Battle ${battleId} could not be canceled (not found or invalid status)`,
      );
      throw new Error('Battle cannot be canceled');
    }

    this.logger.log(`Battle ${battleId} canceled`);

    return this.prisma.battle.findUnique({ where: { id: battleId } });
  }

  async battleFinish(battleId: string) {}
}
