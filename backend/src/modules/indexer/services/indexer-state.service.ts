import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Persists the last-processed block number per chainId in Redis,
 * acting as the indexer checkpoint.
 */
@Injectable()
export class IndexerStateService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: false });
    } else {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        lazyConnect: false,
      });
    }

    this.redis.on('error', (err: Error) =>
      this.logger.error('IndexerStateService Redis error', err.message),
    );
    this.logger.log('IndexerStateService: Redis connection initialised');
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  private checkpointKey(chainId: number): string {
    return `indexer:lastBlock:${chainId}`;
  }

  async getLastBlock(chainId: number): Promise<number | null> {
    const val = await this.redis.get(this.checkpointKey(chainId));
    if (val === null) return null;
    return parseInt(val, 10);
  }

  async setLastBlock(chainId: number, blockNumber: number): Promise<void> {
    await this.redis.set(this.checkpointKey(chainId), blockNumber.toString());
  }
}
