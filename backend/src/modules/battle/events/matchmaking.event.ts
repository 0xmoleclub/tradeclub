import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../gateway/events.constant';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

@Injectable()
export class MatchmakingEvents {
  constructor(private readonly matchmaking: MatchmakingService) {}

  @OnEvent(EVENTS.PLAYER_QUEUE)
  async onPlayerQueue(payload: { userId: string; stake: number }) {
    await this.matchmaking.addToQueue(payload.userId, payload.stake);
  }

  @OnEvent(EVENTS.PLAYER_DEQUEUE)
  async onPlayerDequeue(payload: { userId: string }) {
    await this.matchmaking.removeFromQueue(payload.userId);
  }
}
