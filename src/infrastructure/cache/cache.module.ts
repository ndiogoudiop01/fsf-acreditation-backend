import { Global, Module } from '@nestjs/common';
import { CACHE_PORT } from '../../shared/kernel/ports/cache.port.js';
import { redisProvider } from './redis.provider.js';
import { RedisCacheService } from './redis-cache.service.js';

@Global()
@Module({
  providers: [
    redisProvider,
    { provide: CACHE_PORT, useClass: RedisCacheService },
  ],
  exports: [redisProvider, CACHE_PORT],
})
export class CacheModule {}
