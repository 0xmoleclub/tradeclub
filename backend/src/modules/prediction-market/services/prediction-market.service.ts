import {
  CreateMarketJob,
  ProposeOutcomeJob,
} from '../prediction-market.jobs';

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

export abstract class PredictionMarketService {
  abstract enqueueCreateMarket(params: CreateMarketJob): Promise<void>;
  abstract enqueueProposeOutcome(params: ProposeOutcomeJob): Promise<void>;
  abstract createMarket(
    params: CreateMarketParams,
  ): Promise<CreateMarketResult>;
  abstract proposeOutcome(
    params: ProposeOutcomeParams,
  ): Promise<ProposeOutcomeResult>;
}
