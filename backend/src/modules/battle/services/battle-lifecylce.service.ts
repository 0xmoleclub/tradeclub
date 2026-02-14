import { Injectable } from '@nestjs/common';
import { BattlePlayerService } from './battle-player.service';
import { BattleService } from './battle.service';
import { BattlePlayerStatus, BattleStatus } from '@prisma/client';

@Injectable()
export class BattleLifecycleService {
  constructor(
    private readonly player: BattlePlayerService,
    private readonly battle: BattleService,
  ) {}

  private buildAutoResult(battleId: string) {
    return {
      name: 'auto-result',
      dataHash: `battle:${battleId}:auto-result`,
      isCorrect: true,
      codeCommitHash: 'system',
      metrics: [],
    };
  }

  async evaluate(battleId: string) {
    const battle = await this.battle.getBattle(battleId);
    if (!battle) return null;

    const players = battle.players;

    // cancel if empty
    if (players.length === 0) {
      await this.battle.battleCancel(battleId);
      return { type: 'cancelled' };
    }

    // ---------- MATCHING → RUNNING ----------

    if (battle.status === BattleStatus.MATCHING) {
      const allReady = players.every(
        (p) =>
          p.status === BattlePlayerStatus.READY ||
          p.status === BattlePlayerStatus.PLAYING,
      );

      if (allReady) {
        await this.battle.battleStart(battleId);
        return { type: 'started' };
      }
    }

    // ---------- RUNNING → FINISHED ----------

    if (battle.status === BattleStatus.RUNNING) {
      const allFinished = players.every(
        (p) => p.status === BattlePlayerStatus.FINISHED,
      );

      if (allFinished) {
        const dto = this.buildAutoResult(battleId);
        const result = await this.battle.battleFinish(battleId, dto);
        return { type: 'finished', payload: result };
      }
    }

    return null;
  }
}
