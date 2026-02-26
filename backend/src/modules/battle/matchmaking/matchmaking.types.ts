/**
 * MatchCandidate represents a user waiting to be matched for a game.
 */
export interface MatchCandidate {
  userId: string;
  elo: number;
  joinedAt: number; // timestamp (ms)
}

/**
 * MatchGroup represents a group of players matched together.
 * This is the matchmaking final result
 */
export interface MatchGroup {
  matchId: string;
  players: MatchCandidate[];
  avgElo: number;
  createdAt: number;
  forced: boolean;
}

/**
 * MatchmakingConfig defines the configuration parameters for the matchmaking system.
 */
export interface MatchmakingConfig {
  minGroupSize: number; // = 2
  maxGroupSize: number; // = 4
  baseEloRange: number; // ex: 50
  maxEloRange: number; // ex: 300
  fairnessWindowMs: number; // ex: 2000 ms
  expandPerSecond: number; // ex: 10 elo / sec
  forceMatchAfterSec: number;
}
