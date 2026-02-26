import { MatchmakingConfig } from '@/modules/battle/types/matchmaking.types';

export const matchmakingConfig: MatchmakingConfig = {
  minGroupSize: 2,
  maxGroupSize: 4,
  baseEloRange: 50,
  maxEloRange: 300,
  expandPerSecond: 15,
  forceMatchAfterSec: 15,
  fairnessWindowMs: 2000,
};
