import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Redis } from 'ioredis';

/** Injection token for the in-process memory Keyv store. */
export const MEMORY_STORE = Symbol('MEMORY_STORE');
/** Injection token for the raw ioredis client (null when Redis is not configured). */
export const REDIS_STORE = Symbol('REDIS_STORE');

/** Minimal async K/V interface implemented by Keyv (used for memory store). */
export interface KeyvStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttl?: number): Promise<boolean | undefined>;
  delete(key: string): Promise<boolean>;
  clear?(): Promise<void>;
}

/**
 * Unified cache service.
 *
 *   - `memory.*`  → in-process LRU via Keyv/CacheableMemory (local to replica)
 *   - `redis.*`   → JSON K/V helpers on top of ioredis (cross-replica)
 *   - `this.redis` → raw ioredis client for any native command (SADD, ZADD, etc.)
 *
 * TTL parameters are in **seconds** (0 = no expiry).
 */
@Injectable()
export class CacheService {
  constructor(
    @Inject(MEMORY_STORE) public readonly memory: KeyvStore,
    @Optional() @Inject(REDIS_STORE) public readonly redis: Redis | null,
  ) {}

  // ── Memory ───────────────────────────────────────────────────────────────

  /** Write to in-process memory only. */
  async setMemory<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    await this.memory.set(
      key,
      value,
      ttlSeconds ? ttlSeconds * 1_000 : undefined,
    );
  }

  async getMemory<T>(key: string): Promise<T | undefined> {
    return this.memory.get<T>(key);
  }

  async deleteMemory(key: string): Promise<void> {
    await this.memory.delete(key);
  }

  async clearMemory(): Promise<void> {
    await this.memory.clear?.();
  }

  // ── Redis K/V (JSON-serialised) ───────────────────────────────────────────
  // For anything beyond simple K/V use `this.redis` (full ioredis API) directly.

  /** Serialise value as JSON and write to Redis with optional EX TTL. */
  async setRedis<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    if (!this.redis) return;
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, payload);
    }
  }

  /** Parse JSON value from Redis. Returns undefined on miss or when Redis is absent. */
  async getRedis<T>(key: string): Promise<T | undefined> {
    if (!this.redis) return undefined;
    const raw = await this.redis.get(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  }

  async deleteRedis(key: string): Promise<void> {
    await this.redis?.del(key);
  }

  // ── Redis Sets ────────────────────────────────────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<number> {
    return (await this.redis?.sadd(key, ...members)) ?? 0;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return (await this.redis?.srem(key, ...members)) ?? 0;
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.redis) return false;
    return (await this.redis.sismember(key, member)) === 1;
  }

  async smembers(key: string): Promise<string[]> {
    return (await this.redis?.smembers(key)) ?? [];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis?.expire(key, ttlSeconds);
  }

  /** True when a Redis client was successfully provided. */
  get hasRedis(): boolean {
    return this.redis !== null;
  }
}
