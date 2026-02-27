export enum MarketStatus {
  /** Market contract not yet deployed onchain */
  PENDING = 'PENDING',
  /** Market contract deployed, trading open */
  ACTIVE = 'ACTIVE',
  /** Outcome proposed/resolved onchain */
  RESOLVED = 'RESOLVED',
}

export class ChoiceStateDto {
  /** 0-indexed outcome identifier */
  outcome: number;
  /** LMSR-derived spot price (0–1 range, sum across outcomes ≈ 1) */
  spotPrice: string;
  /** Total shares outstanding for this outcome (WAD integer as decimal string) */
  shares: string;
  /** Total USD volume traded for this outcome (WAD integer as decimal string) */
  volume: string;
}

export class MarketStateDto {
  id: string;
  questionText: string;
  description: string | null;
  /** Onchain market contract address; null if not yet deployed */
  marketAddress: string | null;
  /** LMSR b parameter in WAD (1e18) as decimal string */
  bScore: string;
  status: MarketStatus;
  outcomesCount: number;
  /** Total USD volume across all choices (WAD integer as decimal string) */
  totalVolume: string;
  choices: ChoiceStateDto[];
  /** Winning outcome index if resolved, null otherwise */
  resolvedOutcome: number | null;
}

export class BattleMarketsResponseDto {
  battleId: string;
  markets: MarketStateDto[];
}

export class UserPositionResponseDto {
  walletAddress: string;
  questionId: string;
  /** Onchain market contract address; null if not yet deployed */
  marketAddress: string | null;
  /**
   * Net shares held across all outcomes.
   * NOTE: per-outcome breakdown requires an `outcome` column on
   * BattlePredictionTrade which will be added in Phase 2.
   */
  netShares: string;
  /** Average USD cost per share (buys only) */
  avgEntryPrice: string;
  /** Total USD spent on BUY trades */
  totalCostUsd: string;
}

/**
 * Everything the frontend needs to call the onchain PredictionMarket
 */
export class ChainInfoResponseDto {
  /** Prediction market contract address (null if not yet deployed) */
  marketAddress: string | null;
  /** USDC (stablecoin) contract address */
  usdcAddress: string;
  /** EVM chain ID the contracts are deployed on */
  chainId: number;
}
