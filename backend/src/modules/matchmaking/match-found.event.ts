import { MatchGroup } from '../types/matchmaking.types';

export class MatchFoundEvent {
  constructor(public readonly match: MatchGroup) {}
}
