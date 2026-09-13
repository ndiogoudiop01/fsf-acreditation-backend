import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../../shared/decorators/public.decorator.js';
import { RawResponse } from '../../../shared/decorators/raw-response.decorator.js';
import { PrismaHealthIndicator } from './prisma.health.js';
import { RedisHealthIndicator } from './redis.health.js';

@ApiExcludeController()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get('live')
  @Public()
  @RawResponse()
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @RawResponse()
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaIndicator.check('database'),
      () => this.redisIndicator.check('redis'),
    ]);
  }
}
