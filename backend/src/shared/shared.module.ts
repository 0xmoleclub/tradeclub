import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { CacheService } from './cache/cache.service';
import { UtilsService } from './utils/utils.service';

@Global()
@Module({
  providers: [LoggerService, CacheService, UtilsService],
  exports: [LoggerService, CacheService, UtilsService],
})
export class SharedModule {}
