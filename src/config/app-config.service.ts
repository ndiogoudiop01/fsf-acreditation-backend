import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from './configuration.js';

/**
 * Point d'acces unique et type a la configuration de l'application.
 * Aucun autre fichier ne doit lire `process.env` directement.
 */
@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  get app() {
    return this.configService.get('app', { infer: true });
  }

  get database() {
    return this.configService.get('database', { infer: true });
  }

  get redis() {
    return this.configService.get('redis', { infer: true });
  }

  get auth() {
    return this.configService.get('auth', { infer: true });
  }

  get qrCode() {
    return this.configService.get('qrCode', { infer: true });
  }

  get security() {
    return this.configService.get('security', { infer: true });
  }

  get storage() {
    return this.configService.get('storage', { infer: true });
  }

  get mail() {
    return this.configService.get('mail', { infer: true });
  }

  get sms() {
    return this.configService.get('sms', { infer: true });
  }

  get observability() {
    return this.configService.get('observability', { infer: true });
  }

  get throttle() {
    return this.configService.get('throttle', { infer: true });
  }
}
