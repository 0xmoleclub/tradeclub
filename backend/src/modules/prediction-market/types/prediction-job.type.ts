/**
 * Define the job types and their payloads for the prediction market module.
 */
export const PREDICTION_MARKET_JOBS = {
  CREATE_MARKET: 'prediction-market.create-market',
  PROPOSE_OUTCOME: 'prediction-market.propose-outcome',
} as const;

/**
 * Payload for the job to create a new prediction market contract.
 */
export interface CreateMarketJob {
  battleId: string;
  matchId: string;
}

/**
 * Payload for the job to propose an outcome for a match in the prediction market contract.
 */
export interface ProposeOutcomeJob {
  battleId: string;
  matchId: string;
  outcome: number;
  dataHash: string;
  codeCommitHash: string;
}
