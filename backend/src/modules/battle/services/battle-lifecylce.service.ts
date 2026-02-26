import { Injectable } from '@nestjs/common';
import { BattlePlayerService } from './battle-player.service';
import { BattleService } from './battle.service';
import { BattleStatus } from '@prisma/client';
import { BattleRealtimeService } from '@/modules/battle/services/battle-realtime.service';
import { MatchGroup } from '@/modules/battle/matchmaking/matchmaking.types';
import { PrismaService } from '@/database/prisma.service';
import { CreateBattleResultDto } from '../dto/battle-result.dto';
import { buildBattleResult } from '../utils/build-battle-result';
import { EVENTS } from '../gateway/events.constant';

@Injectable()
export class BattleLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly player: BattlePlayerService,
    private readonly battle: BattleService,
    private readonly realtime: BattleRealtimeService,
  ) {}

  // ========== MATCH FOUND ==========

  async handleMatch(match: MatchGroup) {
    const battle = await this.battle.create(match);

    for (const p of match.players) {
      this.realtime.emitToUser(p.userId, EVENTS.BATTLE_CREATED, {
        battleId: battle.id,
        players: match.players,
      });
    }
  }

  // ========== PLAYER READY ==========

  async handlePlayerReady(battleId: string, userId: string) {
    let started = false;

    await this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
      });

      if (!battle || battle.status !== BattleStatus.WAITING) return;

      const updated = await this.player.markReady(battleId, userId, tx);

      if (!updated) return;

      const allReady = await this.player.allPlayersReady(battleId, tx);
      if (allReady) {
        // transition WAITING → STARTED
        await this.battle.battleStart(battleId, tx);
        started = true; // make sure all players are ready before emitting start event
      }
    });

    if (started) {
      this.realtime.emitToBattle(battleId, EVENTS.BATTLE_STARTED, {
        battleId,
      });
    }
  }

  // ================= FINISH =================

  async handlePlayerFinished(battleId: string, userId: string) {
    let dto: CreateBattleResultDto | null = null;
    let result: any = null;

    await this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
      });

      if (!battle || battle.status !== BattleStatus.STARTED) return;

      const marked = await this.player.markFinished(battleId, userId, tx);

      if (!marked) return;

      const allFinished = await this.player.areAllFinished(battleId, tx);

      if (!allFinished) return;

      dto = buildBattleResult() as CreateBattleResultDto; // TODO: build real result based on player performance and metrics

      // transition STARTED → FINISHED
      result = await this.battle.battleFinish(battleId, dto, tx);
    });

    if (result) {
      this.realtime.emitToBattle(battleId, EVENTS.BATTLE_FINISHED, {
        battleId,
        result,
      });
    }
  }

  // ================= LEAVE =================

  async handlePlayerLeft(battleId: string, userId: string) {
    let cancelled = false;

    await this.prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
      });

      if (!battle) return;

      await this.player.leaveBattle(battleId, userId, tx);

      // Only cancel if still WAITING
      if (battle.status === BattleStatus.WAITING) {
        await this.battle.battleCancel(battleId, tx);
        cancelled = true;
      }
    });

    if (cancelled) {
      this.realtime.emitToBattle(battleId, EVENTS.BATTLE_CANCELLED, {
        battleId,
      });
    }
  }
}
