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
  trader: string;        // indexed: topic1
  outcome: number;       // indexed: topic2
  shares: string;        // uint256 as decimal string
  cost: string;          // uint256 as decimal string (USDC-wei)
  fee: string;           // uint256 as decimal string (USDC-wei)
  isBuy: boolean;
  timestamp: number;
}

export interface MarketCreatedJob {
  txHash: string;
  blockNumber: number;
  logIndex: number;
  matchId: string; // bytes32-padded match ID - originally 16 bytes UUID
  market: string; // contract address
  outcomesCount: number;
  b: number; // b score parameter for LMSR
  feeBps: number; // fee in basis points
  timestamp: number;
}
