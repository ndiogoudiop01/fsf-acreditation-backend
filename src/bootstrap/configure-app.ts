import {
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppConfigService } from '../config/app-config.service.js';
import { AllExceptionsFilter } from '../shared/filters/all-exceptions.filter.js';
import { ResponseEnvelopeInterceptor } from '../shared/interceptors/response-envelope.interceptor.js';
import { TimeoutInterceptor } from '../shared/interceptors/timeout.interceptor.js';

/**
 * Cablage commun (prefixe, versionnement, pipes, intercepteurs, filtres),
 * partage entre `main.ts` et les tests e2e — evite qu'un test e2e "reussisse"
 * sans les memes pipes globaux que la production (piege deja rencontre :
 * sans `ValidationPipe`, les valeurs par defaut des DTO de pagination ne
 * s'appliquent jamais et Prisma echoue avec "Argument `skip` is missing").
 */
export function configureApp(
  app: INestApplication,
  config: AppConfigService,
): void {
  app.setGlobalPrefix(config.app.globalPrefix, {
    exclude: ['health/live', 'health/ready', 'metrics'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.app.defaultApiVersion,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalInterceptors(
    new TimeoutInterceptor(15_000),
    new ResponseEnvelopeInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
