import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-job.type';
import { Queue } from 'bullmq';
import { CONTRACT_CALL_QUEUE } from '../constants/queues.constants';

@Injectable()
export class PredictionMarketService {
  constructor(
    @InjectQueue(CONTRACT_CALL_QUEUE)
    private readonly contractCallQueue: Queue,
  ) {}

  async enqueueCreateMarket(params: CreateMarketJob): Promise<void> {
    const jobId = `prediction-market:create:${params.matchId}`;
    await this.contractCallQueue.add(
      PREDICTION_MARKET_JOBS.CREATE_MARKET,
      params,
      {
        jobId,
      },
    );
  }

  async enqueueProposeOutcome(params: ProposeOutcomeJob): Promise<void> {
    const jobId = `prediction-market:propose:${params.matchId}`;
    await this.contractCallQueue.add(
      PREDICTION_MARKET_JOBS.PROPOSE_OUTCOME,
      params,
      {
        jobId,
      },
    );
  }
}
