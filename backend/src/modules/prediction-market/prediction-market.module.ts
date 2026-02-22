import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvmCryptoService } from '@/modules/hypercore-wallets/services';
import { ChainServicesModule } from '@/modules/chain-services/chain-services.module';
import { PredictionMarketService } from './services/evm-prediction-market.service';
import { PredictionMarketContractService } from './services/prediction-market-contract.service';
import { BullModule } from '@nestjs/bullmq';
import { CONTRACT_CALL_QUEUE } from './constants/queues.constants';
import { PredictionContractProcessor } from './processors/prediction-contract.processor';
import { INDEXER_QUEUE_PREDICTION_MARKET } from '@modules/indexer/constants/indexer-queue.constants';

@Module({
  imports: [
    ConfigModule,
    ChainServicesModule,
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
    PredictionMarketContractService,
  ],
  exports: [PredictionMarketService, PredictionMarketContractService],
})
export class PredictionMarketModule {}
