import type { Params } from 'nestjs-pino';
import type { AppConfigService } from '../../../config/app-config.service.js';

export function buildLoggerOptions(config: AppConfigService): Params {
  const { logLevel, logPretty } = config.observability;
  return {
    pinoHttp: {
      level: logLevel,
      autoLogging: false, // LoggingInterceptor journalise deja chaque requete HTTP
      transport: logPretty
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'HH:MM:ss' },
          }
        : undefined,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  };
}
