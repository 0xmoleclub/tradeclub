import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import { CacheableMemory } from 'cacheable';
import type { Redis } from 'ioredis';
import { LoggerService } from './logger/logger.service';
import { CacheService, MEMORY_STORE, REDIS_STORE } from './cache/cache.service';
import { UtilsService } from './utils/utils.service';
import { createRedisClient } from './utils/redis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LoggerService,
    UtilsService,
    {
      provide: MEMORY_STORE,
      useFactory: () =>
        new Keyv({ store: new CacheableMemory({ ttl: 60_000, lruSize: 5_000 }) }),
    },
    {
      provide: REDIS_STORE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis | null =>
        createRedisClient(configService),
    },
    CacheService,
  ],
  exports: [LoggerService, CacheService, UtilsService],
})
export class SharedModule {}
