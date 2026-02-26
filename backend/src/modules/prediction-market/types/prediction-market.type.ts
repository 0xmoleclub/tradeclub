export interface OrderbookLevel {
  /** Target price after filling this level (cumulative from current) */
  price: number;
  /** Cumulative shares to trade (WAD-normalised float, i.e. divided by 1e18) */
  shares: number;
  /** Cumulative cost in human-readable USDC (asks only) */
  costUsd?: number;
  /** Cumulative proceeds in human-readable USDC (bids only) */
  proceedsUsd?: number;
}

export interface OutcomeOrderbook {
  outcome: number;
  currentPrice: number;
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
}

export interface OrderbookResponse {
  marketAddress: string;
  /** LMSR b parameter, WAD integer as decimal string */
  bScore: string;
  outcomesCount: number;
  outcomes: OutcomeOrderbook[];
}
