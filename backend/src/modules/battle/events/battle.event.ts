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

      // add user to battle room on server-side
      const playerIds = event.match.players.map((p) => p.userId);
      await this.gateway.addUsersToBattleRoom(battle.id, playerIds);

      // broadcast battle created event to all players in the battle room
      this.gateway.broadcastToBattle(battle.id, EVENTS.BATTLE_CREATED, {
        battleId: battle.id,
        players: event.match.players,
      });

      // send notify to user's personal room on server-side to trigger client to join battle room
      for (const userId of playerIds) {
        this.gateway.server
          .to(this.gateway.getUserRoom(userId))
          .emit(EVENTS.BATTLE_CREATED, {
            battleId: battle.id,
            players: event.match.players,
          });
      }

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
