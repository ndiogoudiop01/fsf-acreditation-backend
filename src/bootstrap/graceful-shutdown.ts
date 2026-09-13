import type { INestApplication } from '@nestjs/common';

export function setupGracefulShutdown(app: INestApplication): void {
  app.enableShutdownHooks();
}
