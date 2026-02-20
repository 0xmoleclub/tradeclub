import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvmCryptoService } from '@/modules/hypercore-wallets/services';
import { ChainServicesModule } from '@/modules/chain-services/chain-services.module';
import { EvmPredictionMarketService } from './services/evm-prediction-market.service';
import { BullModule } from '@nestjs/bullmq';
import { JOBS_QUEUE } from './prediction-market.jobs';
import { PredictionMarketProcessor } from './prediction-market.processor';

@Module({
  imports: [
    ConfigModule,
    ChainServicesModule,
    BullModule.registerQueue({
      name: JOBS_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    EvmPredictionMarketService,
    EvmCryptoService,
    PredictionMarketProcessor,
  ],
  exports: [EvmPredictionMarketService],
})
export class PredictionMarketModule {}
