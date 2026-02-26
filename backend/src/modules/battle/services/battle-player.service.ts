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
   * Checks if all players in the battle are ready
   * This is used to determine if the battle can start.
   */
  async allPlayersReady(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const players = await this.getPlayers(battleId, tx);

    return players.every((p) => p.status === BattlePlayerStatus.READY);
  }

  /**
   * Checks if all players in the battle are finished
   * This is used to determine if the battle can be marked as finished.
   */
  async areAllFinished(battleId: string, tx: Prisma.TransactionClient) {
    const players = await this.getPlayers(battleId, tx);

    return (
      players.length > 0 &&
      players.every((p) => p.status === BattlePlayerStatus.FINISHED)
    );
  }

  /**
   * Marks a player as ready in the battle
   * This is used when a player indicates they are ready to start the battle.
   */
  async markReady(
    battleId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const result = await tx.battlePlayer.updateMany({
      where: {
        battleId,
        userId,
        status: BattlePlayerStatus.JOINED,
      },
      data: { status: BattlePlayerStatus.READY },
    });
    return result.count > 0;
  }

  /**
   * Marks all ready players as playing in the battle
   * This is used when the battle starts to update player statuses.
   */
  async markPlaying(
    battleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    await tx.battlePlayer.updateMany({
      where: { battleId, status: BattlePlayerStatus.READY },
      data: { status: BattlePlayerStatus.PLAYING },
    });
  }

  /**
   * Mark player as finished in battle
   */
  async markFinished(
    battleId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const result = await tx.battlePlayer.updateMany({
      where: { battleId, userId, status: BattlePlayerStatus.PLAYING },
      data: { status: BattlePlayerStatus.FINISHED, finishedAt: new Date() },
    });

    return result.count > 0;
  }

  /**
   * Marks a player as disconnected in the battle
   * This is used when a player loses connection during the battle.
   */
  async markDisconnected(
    battleId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const result = await tx.battlePlayer.updateMany({
      where: { battleId, userId },
      data: { status: BattlePlayerStatus.DISCONNECTED },
    });

    this.logger.log(`Player ${userId} disconnected from battle ${battleId}`);

    return result.count > 0;
  }

  /**
   * Removes a player from the battle
   * This is used when a player leaves before the battle starts or after it ends.
   */
  async leaveBattle(
    battleId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const result = await tx.battlePlayer.updateMany({
      where: { battleId, userId },
      data: { status: BattlePlayerStatus.LEFT },
    });

    this.logger.log(`Player ${userId} left battle ${battleId}`);

    return result.count > 0;
  }
}
