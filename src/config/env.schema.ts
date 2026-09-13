import { z } from 'zod';

/**
 * `z.coerce.boolean()` utilise `Boolean(valeur)`, qui vaut `true` pour
 * N'IMPORTE QUELLE chaine non vide — y compris la chaine litterale
 * "false" ! Ce piege a deja provoque un bug reel ici (SMTP_SECURE=false
 * force en HTTPS/TLS sur un port SMTP en clair). On analyse donc le texte
 * explicitement.
 */
const boolFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue;
      return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    });

const csv = () =>
  z
    .string()
    .optional()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    );

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_NAME: z.string().default('FSF Accreditation'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_GLOBAL_PREFIX: z.string().default('api'),
  APP_DEFAULT_API_VERSION: z.string().default('1'),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: csv(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  DATABASE_LOG_QUERIES: boolFromEnv(false),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('fsf:'),
  CACHE_DEFAULT_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET doit faire au moins 16 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET doit faire au moins 16 caracteres'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),

  QR_TOKEN_SECRET: z
    .string()
    .min(16, 'QR_TOKEN_SECRET doit faire au moins 16 caracteres'),

  // Cle privee EC (PEM), avec les retours a la ligne echappes en "\n" dans le
  // .env (une seule ligne). Generer via :
  //   openssl ecparam -name prime256v1 -genkey -noout | awk '{printf "%s\\n", $0}'
  ECDSA_PRIVATE_KEY_PEM: z
    .string()
    .min(
      1,
      'ECDSA_PRIVATE_KEY_PEM est requis (cle privee EC P-256 au format PEM)',
    )
    .transform((value) => value.replace(/\\n/g, '\n')),

  STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('fsf-documents'),
  STORAGE_ACCESS_KEY: z.string().default('minioadmin'),
  STORAGE_SECRET_KEY: z.string().default('minioadmin'),
  STORAGE_FORCE_PATH_STYLE: boolFromEnv(true),
  STORAGE_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  STORAGE_ALLOWED_MIME: csv(),

  MAIL_FROM: z.string().default('FSF Accreditation <no-reply@fsf.sn>'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_SECURE: boolFromEnv(false),

  SMS_ENABLED: boolFromEnv(false),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  LOG_PRETTY: boolFromEnv(true),
  METRICS_ENABLED: boolFromEnv(true),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return parsed.data;
}
