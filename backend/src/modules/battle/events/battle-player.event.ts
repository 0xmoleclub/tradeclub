import { Injectable } from '@nestjs/common';
import { BattlePlayerService } from '../services/battle-player.service';
import { EventsGateway } from '@/events/events.gateway';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '@/events/events.constant';
import { BattlePlayerEvent } from '../types/battle-player.events.types';
import { BattleLifecycleService } from '../services/battle-lifecylce.service';

@Injectable()
export class BattlePlayerEvents {
  constructor(
    private readonly player: BattlePlayerService,
    private readonly lifecycle: BattleLifecycleService,
    private readonly gateway: EventsGateway,
  ) {}

  @OnEvent(EVENTS.PLAYER_READY)
  async handleReady(event: BattlePlayerEvent) {
    const ok = await this.player.markReady(event.battleId, event.userId);
    if (!ok) return;

    // broadcase player ready status to battle room
    this.gateway.broadcastToBattle(event.battleId, EVENTS.PLAYER_READY, event);

    const battle = await this.lifecycle.evaluate(event.battleId);
    if (!battle) return;

    if (battle.type === 'started') {
      this.gateway.broadcastToBattle(event.battleId, EVENTS.BATTLE_STARTED, {
        battleId: event.battleId,
      });
    }
  }

  @OnEvent(EVENTS.PLAYER_FINISHED)
  async handleFinished(event: BattlePlayerEvent) {
    await this.player.markFinished(event.battleId);

    this.gateway.broadcastToBattle(
      event.battleId,
      EVENTS.PLAYER_FINISHED,
      event,
    );

    const result = await this.lifecycle.evaluate(event.battleId);

    if (result && result.type === 'finished') {
      this.gateway.broadcastToBattle(event.battleId, EVENTS.BATTLE_FINISHED, {
        battleId: event.battleId,
        result: result.payload,
      });
    }
  }

  @OnEvent(EVENTS.PLAYER_LEFT)
  async handleLeft(event: BattlePlayerEvent) {
    const { battleId, userId } = event;

    // mark player left in database
    const left = await this.player.leaveBattle(battleId, userId);
    if (!left) return;

    // broadcast player left status to battle room
    this.gateway.broadcastToBattle(battleId, EVENTS.PLAYER_LEFT, {
      battleId,
      userId,
    });

    // remove user socket from battle room
    await this.gateway.removeUserFromBattleRoom(battleId, userId);

    // evaluate battle lifecycle to check if battle should be cancelled (e.g. if all players left)
    const result = await this.lifecycle.evaluate(event.battleId);

    if (result && result.type === 'cancelled') {
      this.gateway.broadcastToBattle(event.battleId, EVENTS.BATTLE_CANCELLED, {
        battleId: event.battleId,
      });

      await this.gateway.cleanupBattleRoom(event.battleId);
    }
  }
}
