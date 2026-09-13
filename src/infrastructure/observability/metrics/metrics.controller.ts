import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator.js';
import { RawResponse } from '../../../shared/decorators/raw-response.decorator.js';
import { MetricsService } from './metrics.service.js';

@ApiExcludeController()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @RawResponse()
  @Header('Content-Type', 'text/plain')
  async scrape(): Promise<string> {
    return this.metrics.registry.metrics();
  }
}
