import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '../../config/config.module.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { buildLoggerOptions } from './logger/logger.config.js';
import { HealthController } from './health/health.controller.js';
import { PrismaHealthIndicator } from './health/prisma.health.js';
import { RedisHealthIndicator } from './health/redis.health.js';
import { MetricsController } from './metrics/metrics.controller.js';
import { MetricsService } from './metrics/metrics.service.js';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      providers: [],
      inject: [AppConfigService],
      useFactory: buildLoggerOptions,
    }),
    TerminusModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
