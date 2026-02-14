import { EVENTS } from '@/events/events.constant';
import { EventsGateway } from '@/events/events.gateway';
import { MatchFoundEvent } from '@/modules/matchmaking/match-found.event';
import { LoggerService } from '@/shared/logger/logger.service';
import { BattleService } from '../services/battle.service';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BattleEvents {
  constructor(
    private readonly battle: BattleService,
    private readonly logger: LoggerService,
    private readonly gateway: EventsGateway,
  ) {}

  @OnEvent(EVENTS.MATCH_FOUND, { async: true })
  async handleMatchFound(event: MatchFoundEvent) {
    try {
      const battle = await this.battle.create(event.match);

      this.gateway.broadcastToBattle(battle.id, EVENTS.BATTLE_CREATED, {
        battleId: battle.id,
        players: event.match.players,
      });

      this.logger.log(
        `Battle created for match ${event.match.matchId} with battle ID ${battle.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle match ${event.match.matchId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
