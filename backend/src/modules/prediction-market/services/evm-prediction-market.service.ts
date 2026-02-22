import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/logger/logger.service';
import { ChainServiceRegistry } from '@/modules/chain-services/chain-service-registry';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-job.type';
import { EvmCryptoService } from '@modules/hypercore-wallets/services';
import { Queue } from 'bullmq';
import { CONTRACT_CALL_QUEUE } from '../constants/queues.constants';
import { INDEXER_QUEUE_PREDICTION_MARKET } from '@/modules/indexer/constants/indexer-queue.constants';

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
