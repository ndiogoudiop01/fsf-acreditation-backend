import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppConfigService } from '../../config/app-config.service.js';
import type { CachePort } from '../../shared/kernel/ports/cache.port.js';
import { REDIS_CLIENT } from './redis.provider.js';

@Injectable()
export class RedisCacheService implements CachePort {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.config.redis.cacheDefaultTtlSeconds;
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
