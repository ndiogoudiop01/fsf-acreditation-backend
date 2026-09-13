import { Injectable } from '@nestjs/common';
import { AppConfigService } from './config/app-config.service.js';

@Injectable()
export class AppService {
  constructor(private readonly config: AppConfigService) {}

  getInfo(): { name: string; env: string; docs: string } {
    return {
      name: this.config.app.name,
      env: this.config.app.env,
      docs: this.config.app.isProduction ? 'disabled-in-production' : '/docs',
    };
  }
}
