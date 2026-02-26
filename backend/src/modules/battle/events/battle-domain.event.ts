import { MatchFoundEvent } from '@/modules/battle/events/match-found.event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BattleLifecycleService } from '../services/battle-lifecylce.service';
import { BattlePlayerEvent } from '../types/battle-player.events.types';
import { EVENTS } from '../gateway/events.constant';

@Injectable()
export class BattleDomainEvents {
  constructor(private readonly lifecycle: BattleLifecycleService) {}

  @OnEvent(EVENTS.MATCH_FOUND)
  async onMatch(event: MatchFoundEvent) {
    await this.lifecycle.handleMatch(event.match);
  }

  @OnEvent(EVENTS.PLAYER_READY)
  async onReady(event: BattlePlayerEvent) {
    await this.lifecycle.handlePlayerReady(event.battleId, event.userId);
  }

  @OnEvent(EVENTS.PLAYER_FINISHED)
  async onFinished(event: BattlePlayerEvent) {
    await this.lifecycle.handlePlayerFinished(event.battleId, event.userId);
  }

  @OnEvent(EVENTS.PLAYER_LEFT)
  async onLeft(event: BattlePlayerEvent) {
    await this.lifecycle.handlePlayerLeft(event.battleId, event.userId);
  }
}
