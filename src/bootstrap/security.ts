import type { INestApplication } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import type { AppConfigService } from '../config/app-config.service.js';

export function setupSecurity(
  app: INestApplication,
  config: AppConfigService,
): void {
  app.use(
    helmet({
      contentSecurityPolicy: config.app.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    }),
  );
  app.use(compression());

  // Derriere un reverse proxy (nginx, ALB, Cloudflare) : sans ceci, req.ip
  // renvoie l'IP du proxy et le rate-limiting devient global au lieu d'etre
  // applique par client.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const allowedOrigins = new Set([
    config.app.frontendUrl,
    ...config.app.corsOrigins,
  ]);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true); // appels serveur-a-serveur, controle d'acces mobile
      const allowed = allowedOrigins.has(origin);
      callback(
        allowed ? null : new Error(`Origine non autorisee : ${origin}`),
        allowed,
      );
    },
    credentials: true,
    exposedHeaders: ['x-request-id', 'retry-after'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'idempotency-key',
      'x-request-id',
    ],
    maxAge: 86_400,
  });
}
