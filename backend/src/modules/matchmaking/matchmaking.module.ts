import { Module } from '@nestjs/common';
import { MatchmakingConfig } from './types/matchmaking.types';
import { LoggerService } from '@/shared/logger/logger.service';
import { MatchmakingService } from './services/matchmaking.service';

const defaultConfig: MatchmakingConfig = {
  minGroupSize: 2,
  maxGroupSize: 4,
  baseEloRange: 50,
  maxEloRange: 300,
  expandPerSecond: 15,
  forceMatchAfterSec: 15,
  fairnessWindowMs: 2000,
};

@Module({
  providers: [
    LoggerService,
    { provide: 'MATCHMAKING_CONFIG', useValue: defaultConfig },
    MatchmakingService,
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
