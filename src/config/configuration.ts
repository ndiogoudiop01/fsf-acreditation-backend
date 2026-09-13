import type { Env } from './env.schema.js';

/**
 * Projette l'environnement plat (variables `.env`) vers des namespaces
 * metier types. Le reste du code n'accede JAMAIS a `process.env` : il
 * injecte `AppConfigService` et lit une propriete fortement typee.
 */
export const buildConfiguration = (env: Env) => ({
  app: {
    name: env.APP_NAME,
    env: env.NODE_ENV,
    port: env.APP_PORT,
    globalPrefix: env.APP_GLOBAL_PREFIX,
    defaultApiVersion: env.APP_DEFAULT_API_VERSION,
    publicUrl: env.APP_PUBLIC_URL,
    frontendUrl: env.FRONTEND_URL,
    corsOrigins: env.CORS_ORIGINS,
    isProduction: env.NODE_ENV === 'production',
  },
  database: {
    url: env.DATABASE_URL,
    logQueries: env.DATABASE_LOG_QUERIES,
  },
  redis: {
    url: env.REDIS_URL,
    keyPrefix: env.REDIS_KEY_PREFIX,
    cacheDefaultTtlSeconds: env.CACHE_DEFAULT_TTL_SECONDS,
  },
  auth: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshTtl: env.JWT_REFRESH_TTL,
    argon2: {
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
    },
    maxFailedLoginAttempts: env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: env.AUTH_LOCKOUT_DURATION_MINUTES,
  },
  qrCode: {
    tokenSecret: env.QR_TOKEN_SECRET,
  },
  security: {
    ecdsaPrivateKeyPem: env.ECDSA_PRIVATE_KEY_PEM,
  },
  storage: {
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    bucket: env.STORAGE_BUCKET,
    accessKey: env.STORAGE_ACCESS_KEY,
    secretKey: env.STORAGE_SECRET_KEY,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    presignTtlSeconds: env.STORAGE_PRESIGN_TTL_SECONDS,
    maxFileSizeBytes: env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024,
    allowedMimeTypes: env.STORAGE_ALLOWED_MIME.length
      ? env.STORAGE_ALLOWED_MIME
      : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  },
  mail: {
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      secure: env.SMTP_SECURE,
    },
  },
  sms: {
    enabled: env.SMS_ENABLED,
  },
  observability: {
    logLevel: env.LOG_LEVEL,
    logPretty: env.LOG_PRETTY,
    metricsEnabled: env.METRICS_ENABLED,
  },
  throttle: {
    ttlSeconds: env.THROTTLE_TTL_SECONDS,
    limit: env.THROTTLE_LIMIT,
  },
});

export type AppConfiguration = ReturnType<typeof buildConfiguration>;
