import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

/**
 * Creates an ioredis client from env config.
 * Returns null when neither REDIS_URL nor REDIS_HOST is set
 * (i.e. Redis is explicitly not configured).
 */
export function createRedisClient(configService: ConfigService): Redis | null {
  const url = configService.get<string>('REDIS_URL');
  if (url) return new Redis(url, { lazyConnect: true });

  const host = configService.get<string>('REDIS_HOST');
  if (!host) return null;

  const port = parseInt(configService.get<string>('REDIS_PORT') || '6379', 10);
  const password = configService.get<string>('REDIS_PASSWORD') || undefined;
  const db = parseInt(configService.get<string>('REDIS_DB') || '0', 10);
  return new Redis({ host, port, password, db, lazyConnect: true });
}

/** Returns a redis:// URL built from whichever env vars are present. */
export function getRedisUrl(configService: ConfigService): string {
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) return redisUrl;

  const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
  const port = configService.get<string>('REDIS_PORT') || '6379';
  const password = configService.get<string>('REDIS_PASSWORD');
  const db = parseInt(configService.get<string>('REDIS_DB') || '0', 10);

  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  const dbPath = db ? `/${db}` : '';
  return `redis://${auth}${host}:${port}${dbPath}`;
}

/** Returns an ioredis-style connection config (used by BullMQ etc.). */
export function getRedisConnection(configService: ConfigService) {
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) {
    return { connection: { url: redisUrl } };
  }

  const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
  const port = parseInt(configService.get<string>('REDIS_PORT') || '6379', 10);
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
}
