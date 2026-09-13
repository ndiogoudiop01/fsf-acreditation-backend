import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config.service.js';
import { configureApp } from './bootstrap/configure-app.js';
import { setupGracefulShutdown } from './bootstrap/graceful-shutdown.js';
import { setupSecurity } from './bootstrap/security.js';
import { setupSwagger } from './bootstrap/swagger.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  const config = app.get(AppConfigService);

  setupSecurity(app, config);
  configureApp(app, config);
  setupSwagger(app, config);
  setupGracefulShutdown(app);

  await app.listen(config.app.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(
    `API demarree sur ${await app.getUrl()}/${config.app.globalPrefix}/v${config.app.defaultApiVersion}`,
  );
  logger.log(`Environnement : ${config.app.env}`);
}

void bootstrap();
