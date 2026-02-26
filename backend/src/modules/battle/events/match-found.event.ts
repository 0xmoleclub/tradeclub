import { MatchGroup } from '../matchmaking/matchmaking.types';

export class MatchFoundEvent {
  constructor(public readonly match: MatchGroup) {}
}
