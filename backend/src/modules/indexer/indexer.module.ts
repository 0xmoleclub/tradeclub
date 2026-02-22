import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PredictionMarketModule } from '@modules/prediction-market/prediction-market.module';
import { SharedModule } from '@shared/shared.module';
import { INDEXER_QUEUE_PREDICTION_MARKET } from './constants/indexer-queue.constants';
import { PredictionIndexerProcessor } from './processor/prediction-indexer.processor';
import { IndexerStateService } from './services/indexer-state.service';
import { HypersyncService } from './services/hypersync.service';
import { ChainIndexerService } from './services/chain-indexer.service';

@Module({
  imports: [
    SharedModule,
    PredictionMarketModule,
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
    PredictionIndexerProcessor,
    IndexerStateService,
    HypersyncService,
    ChainIndexerService,
  ],
})
export class IndexerModule {}
