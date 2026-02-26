export interface BattlePlayerEvent {
  battleId: string;
  userId: string;
}

export interface BattlePlayerShorted {
  userId: string;
  name: string;
  stake: number;
}
