import { PrismaService } from '@/database/prisma.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { BattlePlayerStatus, Prisma } from '@prisma/client';

@Injectable()
export class BattlePlayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Gets all players in a battle, ordered by their slot number.
   */
  async getPlayers(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.battlePlayer.findMany({
      where: { battleId },
      orderBy: { slot: 'asc' },
    });
  }

  /**
   * Checks if all players in the battle are ready or playing.
   * This is used to determine if the battle can start.
   */
  async allPlayersReady(battleId: string) {
    const players = await this.getPlayers(battleId);

    return players.every(
      (p) =>
        p.status === BattlePlayerStatus.READY ||
        p.status === BattlePlayerStatus.PLAYING,
    );
  }

  /**
   * Marks a player as ready in the battle
   * This is used when a player indicates they are ready to start the battle.
   */
  async markReady(battleId: string, userId: string) {
    const result = await this.prisma.battlePlayer.updateMany({
      where: {
        battleId,
        userId,
        status: BattlePlayerStatus.JOINED,
      },
      data: { status: BattlePlayerStatus.READY },
    });

    if (result.count === 0) return false;

    return true;
  }

  /**
   * Marks all ready players as playing in the battle
   * This is used when the battle starts to update player statuses.
   */
  async markPlaying(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const player = await tx.battlePlayer.updateMany({
      where: { battleId, status: BattlePlayerStatus.READY },
      data: { status: BattlePlayerStatus.PLAYING },
    });

    if (player.count === 0) {
      throw new Error(
        `Players in battle ${battleId} cannot be marked as playing. No players ready.`,
      );
    }

    this.logger.log(`All players in battle ${battleId} are now playing`);
    return this.getPlayers(battleId, tx);
  }

  /**
   * Mark player as finished in battle
   */
  async markFinished(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const player = await tx.battlePlayer.updateMany({
      where: { battleId, status: BattlePlayerStatus.PLAYING },
      data: { status: BattlePlayerStatus.FINISHED, finishedAt: new Date() },
    });

    if (player.count === 0) {
      throw new Error(
        `Players in battle ${battleId} cannot be marked as finished. No players playing.`,
      );
    }

    this.logger.log(`All players in battle ${battleId} are now finished`);
    return this.getPlayers(battleId, tx);
  }

  /**
   * Marks a player as disconnected in the battle
   * This is used when a player loses connection during the battle.
   */
  async markDisconnected(battleId: string, userId: string) {
    await this.prisma.battlePlayer.updateMany({
      where: { battleId, userId },
      data: { status: BattlePlayerStatus.DISCONNECTED },
    });

    this.logger.log(`Player ${userId} disconnected from battle ${battleId}`);
  }

  /**
   * Removes a player from the battle
   * This is used when a player leaves before the battle starts or after it ends.
   */
  async leaveBattle(battleId: string, userId: string) {
    await this.prisma.battlePlayer.updateMany({
      where: { battleId, userId },
      data: { status: BattlePlayerStatus.LEFT },
    });

    this.logger.log(`Player ${userId} left battle ${battleId}`);
  }
}
