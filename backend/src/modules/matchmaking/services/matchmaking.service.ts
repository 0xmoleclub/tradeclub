import {
  forwardRef,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MatchmakingEngine } from './matchmaking.engine';
import { LoggerService } from '@/shared/logger/logger.service';
import { MatchCandidate, MatchmakingConfig } from '../types/matchmaking.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@/events/events.constant';
import { MatchFoundEvent } from '../match-found.event';

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  private engine: MatchmakingEngine;
  private ticker: NodeJS.Timeout | null = null;
  private running = false;
  private intervalMs = 500; // run matchmaking every 500ms

  constructor(
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('MATCHMAKING_CONFIG')
    private readonly config: MatchmakingConfig,
  ) {
    // init engine from config
    this.engine = new MatchmakingEngine(this.config, this.logger);
  }

  onModuleInit() {
    this.start();
  }
  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.ticker) return;
    this.ticker = setInterval(
      () =>
        this.tick().catch((err) => {
          this.logger.error('Matchmaking tick error', err);
        }),
      this.intervalMs,
    );
    this.logger.debug('MatchmakingService started');
  }

  stop() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
      this.logger.debug('MatchmakingService stopped.');
    }
  }

  // prevent overlapping ticks
  private async tick() {
    if (this.running) return;
    this.running = true;

    try {
      // start matchmaking engine tick
      const matches = this.engine.match();

      // match found, emit event for battle creation
      for (const match of matches) {
        this.eventEmitter.emit(EVENTS.MATCH_FOUND, new MatchFoundEvent(match));
        this.logger.log(`Match event emitted: ${match.matchId} `);
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Wrapper function to call
   */
  addToQueue(candidate: MatchCandidate) {
    this.engine.addPlayer(candidate);
  }

  removeFromQueue(userId: string) {
    this.engine.removePlayer(userId);
  }

  getQueue() {
    return this.engine.getQueue();
  }
}
