import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  appConfig,
  chainConfig,
  databaseConfig,
  indexerConfig,
} from '@config/index';
import { workerEnvSchema } from '@config/validation/worker.schema';
import { DatabaseModule } from '@/database/database.module';
import { SharedModule } from '@shared/shared.module';
import { ChainServicesModule } from '@modules/chain-services/chain-services.module';
import { IndexerModule } from '@modules/indexer/indexer.module';
import { getRedisConnection } from '@shared/utils/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, chainConfig, databaseConfig, indexerConfig],
      envFilePath: ['.env', '.env.local'],
      validationSchema: workerEnvSchema,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getRedisConnection(configService),
    }),
    DatabaseModule,
    SharedModule,
    ChainServicesModule,
    IndexerModule,
  ],
})
export class WorkerModule {}
