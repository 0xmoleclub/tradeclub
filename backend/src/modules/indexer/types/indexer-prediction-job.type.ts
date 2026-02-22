export const INDEXER_PREDICTION_JOB = {
  HANDLE_TRADE_EVENT: 'handle-trade-event',
  HANDLE_MARKET_CREATED: 'handle-market-created',
};

export type PredictionOrderJob = MarketCreatedJob | TradeJob;

export interface TradeJob {
  txHash: string;
  blockNumber: number;
  logIndex: number;
  marketAddress: string; // emitting contract address (lowercased)
  trader: string; // indexed: topic1
  outcome: number; // indexed: topic2
  shares: string; // uint256 as decimal string
  cost: string; // uint256 as decimal string (USDC-wei)
  fee: string; // uint256 as decimal string (USDC-wei)
  isBuy: boolean;
  timestamp: number;
}

export interface MarketCreatedJob {
  txHash: string;
  blockNumber: number;
  logIndex: number;
  matchId: string; // bytes16 matchId, hex string with 0x prefix
  questionId: string; // bytes16 questionId, sent as contract call param and emitted back in event to help with indexing
  market: string; // contract address
  outcomesCount: number;
  b: number; // b score parameter for LMSR
  feeBps: number; // fee in basis points
  timestamp: number;
}
