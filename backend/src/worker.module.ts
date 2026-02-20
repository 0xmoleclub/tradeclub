import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { appConfig, chainConfig, databaseConfig } from '@config/index';
import { DatabaseModule } from '@/database/database.module';
import { SharedModule } from '@shared/shared.module';
import { ChainServicesModule } from '@modules/chain-services/chain-services.module';
import { PredictionMarketModule } from '@modules/prediction-market/prediction-market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, chainConfig, databaseConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }

        const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = parseInt(
          configService.get<string>('REDIS_PORT') || '6379',
          10,
        );
        const password = configService.get<string>('REDIS_PASSWORD');
        const db = parseInt(configService.get<string>('REDIS_DB') || '0', 10);

        return {
          connection: {
            host,
            port,
            password: password || undefined,
            db,
          },
        };
      },
    }),
    DatabaseModule,
    SharedModule,
    ChainServicesModule,
    PredictionMarketModule,
  ],
})
export class WorkerModule {}
