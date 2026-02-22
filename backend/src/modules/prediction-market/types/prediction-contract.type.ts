export interface CreateMarketParams {
  matchId: string;
  outcomesCount?: number;
  bScore?: string;
  feeBps?: number;
}

export interface CreateMarketResult {
  txHash: string;
  marketAddress?: string;
}

export interface ProposeOutcomeParams {
  matchId: string;
  outcome: number;
  dataHash: string;
  codeCommitHash: string;
}

export interface ProposeOutcomeResult {
  txHash: string;
}
