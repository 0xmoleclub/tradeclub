import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BattleLifecycleService } from '../services/battle-lifecylce.service';
import { BattlePlayerEvent } from '../types/battle-player.types';
import { EVENTS } from '../gateway/events.constant';
import { MatchFoundEvent } from '../types/match-types';

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
