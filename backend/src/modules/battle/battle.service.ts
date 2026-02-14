import { EVENTS } from '@/events/events.constant';
import { EventsGateway } from '@/events/events.gateway';
import { MatchFoundEvent } from '@/modules/matchmaking/match-found.event';
import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter/dist/decorators/on-event.decorator';
import { BattleStatus } from '@prisma/client';
import { BattleRepository } from './battle.repository';

/**
 * This service roled as a event listener
 * for match found events and creates battles accordingly
 */

@Injectable()
export class BattleService {
  constructor(
    private readonly battle: BattleRepository,
    private readonly logger: LoggerService,
    private readonly gateway: EventsGateway,
  ) {}

  // ==================== CREATE MATCH ====================

  @OnEvent(EVENTS.MATCH_FOUND, { async: true })
  async handleMatchFound(event: MatchFoundEvent) {
    try {
      const battle = await this.battle.create(event.match);

      this.gateway.broadcast(EVENTS.BATTLE_CREATED, {
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

  // ==================== START BATTLE ====================

  @OnEvent(EVENTS.BATTLE_STARTED, { async: true })
  async handleBattleStarted({ battleId }: { battleId: string }) {
    try {
      const battle = await this.battle.battleStart(battleId);

      this.gateway.broadcast(EVENTS.BATTLE_STARTED, {
        battleId: battle?.id,
      });

      this.logger.log(`Battle ${battleId} started`);
    } catch (error) {
      this.logger.error(
        `Failed to start battle ${battleId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ==================== CANCEL BATTLE ====================

  @OnEvent(EVENTS.BATTLE_CANCELLED, { async: true })
  async handleBattleCancelled({ battleId }: { battleId: string }) {
    try {
      const battle = await this.battle.battleCancel(battleId);

      this.gateway.broadcast(EVENTS.BATTLE_CANCELLED, {
        battleId: battle?.id,
      });

      this.logger.log(`Battle ${battleId} cancelled`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel battle ${battleId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ==================== FINISH BATTLE ====================

  @OnEvent(EVENTS.BATTLE_FINISHED, { async: true })
  async handleBattleFinished({ battleId }: { battleId: string }) {
    try {
      this.gateway.broadcast(EVENTS.BATTLE_FINISHED, {
        battleId,
      });

      this.logger.log(`Battle ${battleId} finished`);
    } catch (error) {
      this.logger.error(
        `Failed to finish battle ${battleId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
