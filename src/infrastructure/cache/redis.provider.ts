import { Provider } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../../config/app-config.service.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: AppConfigService) =>
    new Redis(config.redis.url, {
      keyPrefix: config.redis.keyPrefix,
      maxRetriesPerRequest: 3,
    }),
  inject: [AppConfigService],
};
