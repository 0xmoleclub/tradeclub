export const JOBS_QUEUE = 'jobs';

export const PREDICTION_MARKET_JOBS = {
  CREATE_MARKET: 'prediction-market.create-market',
  PROPOSE_OUTCOME: 'prediction-market.propose-outcome',
} as const;

export interface CreateMarketJob {
  battleId: string;
  matchId: string;
}

export interface ProposeOutcomeJob {
  battleId: string;
  matchId: string;
  outcome: number;
  dataHash: string;
  codeCommitHash: string;
}
