import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvmCryptoService } from '@/modules/hypercore-wallets/services';
import { PredictionMarketService } from './services/prediction-market.service';
import { PredictionContractService } from './services/prediction-contract.service';
import { BullModule } from '@nestjs/bullmq';
import { CONTRACT_CALL_QUEUE } from './constants/queues.constants';
import { PredictionContractProcessor } from './processors/prediction-contract.processor';
import { INDEXER_QUEUE_PREDICTION_MARKET } from '@modules/indexer/constants/indexer-queue.constants';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: CONTRACT_CALL_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: INDEXER_QUEUE_PREDICTION_MARKET,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    PredictionMarketService,
    EvmCryptoService,
    PredictionContractProcessor,
    PredictionContractService,
  ],
  exports: [PredictionMarketService, PredictionContractService],
})
export class PredictionMarketModule {}
