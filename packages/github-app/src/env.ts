import os from 'node:os';
import path from 'node:path';

export type Env = {
  appId?: string;
  privateKey?: string;
  webhookSecret: string;
  /** Signs the expiring `/img/<token>` links. */
  imageUrlSecret: string;
  /** Public origin of this server, used to build image links. */
  publicUrl: string;
  cacheDir: string;
  port: number;
  host: string;
  cacheTtlHours: number;
  cacheMaxBytes: number;
  imageUrlTtlHours: number;
  /** Cap for one artifact download and for all downloads of one run. */
  maxArtifactBytes: number;
  /** Cap for a single file inside an artifact. */
  maxFileBytes: number;
  webhookProxyUrl?: string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  logFormat?: 'json' | 'pretty';
};

const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

const num = (value: string | undefined, fallback: number) => {
  const parsed = value === undefined || value === '' ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Accepts the PEM verbatim or base64-encoded on a single line (handy for env files). */
export const decodePrivateKey = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.includes('-----BEGIN')) return trimmed.replace(/\\n/g, '\n');
  return Buffer.from(trimmed, 'base64').toString('utf8');
};

export const readEnv = (env: NodeJS.ProcessEnv = process.env): Env => {
  const port = num(env.PORT, 3100);
  const webhookSecret = env.WEBHOOK_SECRET || 'development';
  return {
    appId: env.APP_ID || undefined,
    privateKey: decodePrivateKey(env.PRIVATE_KEY),
    webhookSecret,
    imageUrlSecret: env.IMAGE_URL_SECRET || webhookSecret,
    publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(
      /\/+$/,
      '',
    ),
    cacheDir: env.CACHE_DIR || path.join(os.tmpdir(), 'cpvrd-github-app'),
    port,
    host: env.HOST || '0.0.0.0',
    cacheTtlHours: num(env.CACHE_TTL_HOURS, 24 * 7),
    cacheMaxBytes: num(env.CACHE_MAX_BYTES, 5 * GiB),
    imageUrlTtlHours: num(env.IMAGE_URL_TTL_HOURS, 24 * 14),
    maxArtifactBytes: num(env.MAX_ARTIFACT_BYTES, 2 * GiB),
    maxFileBytes: num(env.MAX_FILE_BYTES, 50 * MiB),
    webhookProxyUrl: env.WEBHOOK_PROXY_URL || undefined,
    logLevel: env.LOG_LEVEL as Env['logLevel'],
    logFormat: env.LOG_FORMAT as Env['logFormat'],
  };
};
