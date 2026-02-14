import { randomUUID } from 'crypto';
import { LoggerService } from '@/shared/logger/logger.service';
import {
  MatchCandidate,
  MatchGroup,
  MatchmakingConfig,
} from '../types/matchmaking.types';

export class MatchmakingEngine {
  // using queue data structure to hold players waiting for a match
  private queue: MatchCandidate[] = [];

  constructor(
    private readonly config: MatchmakingConfig,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Adds a player to the matchmaking queue. (enqueue)
   * @param candidate - The player to add to the queue
   */
  addPlayer(candidate: MatchCandidate): void {
    this.queue.push(candidate);
    this.logger.debug(`Player ${candidate.userId} added to matchmaking queue.`);
  }

  /**
   * Removes a player from the matchmaking queue. (dequeue)
   * @param userId - The ID of the player to remove
   */
  removePlayer(userId: string): void {
    this.queue = this.queue.filter((c) => c.userId !== userId);
    this.logger.debug(`Player ${userId} removed from matchmaking queue.`);
  }

  /**
   * Core algorithm to match players based on Elo ratings and wait times.
   * Attempts to match players in the queue based on their Elo ratings and wait times.
   * @returns An array of MatchGroup representing successful matches
   */
  match(): MatchGroup[] {
    const results: MatchGroup[] = []; // matched 'rooms'
    const used = new Set<string>(); // track matched players - push them into a 'room'
    const now = Date.now();

    /**
     * FAIRNESS PRIORITY
     * 1. Players who have waited longer get priority in matching. (role as anchor)
     * 2. Nearby wait time -> sort by elo ascending
     */
    const sorted = [...this.queue].sort((a, b) => {
      const waitDiff = a.joinedAt - b.joinedAt;
      if (Math.abs(waitDiff) > this.config.fairnessWindowMs) return waitDiff;
      return a.elo - b.elo;
    });

    // attempt to match players
    for (let i = 0; i < sorted.length; i++) {
      const anchor = sorted[i];
      if (used.has(anchor.userId)) continue;

      const waitTimeSec = (now - anchor.joinedAt) / 1000;

      // calculate dynamic elo range based on wait time
      const dynamicChange = Math.min(
        this.config.baseEloRange + waitTimeSec * this.config.expandPerSecond,
        this.config.maxEloRange,
      );

      const group: MatchCandidate[] = [anchor];

      // build a group around the anchor player
      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (used.has(candidate.userId)) continue;
        if (group.length >= this.config.maxGroupSize) break; // break if max group size is reached

        // calculate group avg elo
        const avgElo = group.reduce((sum, p) => sum + p.elo, 0) / group.length;

        // calculate elo differences
        const eloDiff = Math.abs(candidate.elo - avgElo);

        if (eloDiff <= dynamicChange) group.push(candidate);
      }

      // force match if wait time exceeds threshold
      const forced =
        group.length >= 2 && // at least 2 players to form a match
        group.length < this.config.minGroupSize &&
        waitTimeSec >= this.config.forceMatchAfterSec;

      if (group.length >= this.config.minGroupSize || forced) {
        group.forEach((p) => used.add(p.userId)); // add matched players into a 'room'

        const avgElo = group.reduce((sum, p) => sum + p.elo, 0) / group.length;

        results.push({
          matchId: randomUUID(),
          players: group,
          avgElo,
          createdAt: now,
          forced,
        });
        this.logger.debug(
          `Match created ${group.map((p) => p.userId).join(', ')} | avgElo=${avgElo.toFixed(
            1,
          )} | forced=${forced}`,
        );
      }
    }

    // remove matched players from queue
    this.queue = this.queue.filter((c) => !used.has(c.userId));
    return results;
  }

  getQueue(): MatchCandidate[] {
    return [...this.queue];
  }
}
