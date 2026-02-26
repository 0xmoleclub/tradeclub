import {
  forwardRef,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MatchmakingEngine } from './matchmaking.engine';
import { LoggerService } from '@/shared/logger/logger.service';
import { MatchmakingConfig } from '../types/matchmaking.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { EVENTS } from '../gateway/events.constant';

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  private engine: MatchmakingEngine;
  private ticker: NodeJS.Timeout | null = null;
  private running = false;
  private intervalMs = 500; // run matchmaking every 500ms

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('MATCHMAKING_CONFIG')
    private readonly config: MatchmakingConfig,
  ) {
    // init engine from config
    this.engine = new MatchmakingEngine(this.config);
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
  async tick() {
    if (this.running) return;
    this.running = true;

    try {
      const matches = this.engine.match();

      for (const match of matches) {
        this.eventEmitter.emitAsync(EVENTS.MATCH_FOUND, { match });
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Wrapper function to call
   */
  async addToQueue(userId: string, stake: number) {
    // check user status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }

    // lock user as QUEUING (recommend add enum)
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.PENDING },
    });

    // add to matching queue
    this.engine.addPlayer({
      userId,
      elo: user.elo,
      joinedAt: Date.now(),
      stake,
    });
    await this.tick(); // trigger immediate matchmaking attempt

    this.logger.log(`User ${userId} queued`);
  }

  async removeFromQueue(userId: string) {
    // remove from matching queue
    this.engine.removePlayer(userId);

    // unlock user status
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });
  }

  getQueue() {
    return this.engine.getQueue();
  }
}
