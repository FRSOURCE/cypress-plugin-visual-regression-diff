import { describe, expect, it } from 'vitest';
import { decodePrivateKey, readEnv } from './env.js';

describe('readEnv', () => {
  it('applies defaults', () => {
    const env = readEnv({});
    expect(env).toMatchObject({
      appId: undefined,
      privateKey: undefined,
      webhookSecret: 'development',
      imageUrlSecret: 'development',
      publicUrl: 'http://localhost:3100',
      port: 3100,
      host: '0.0.0.0',
      cacheTtlHours: 168,
      imageUrlTtlHours: 336,
    });
    expect(env.cacheDir).toContain('cpvrd-github-app');
  });

  it('reads and normalises the given values', () => {
    const env = readEnv({
      APP_ID: '7',
      WEBHOOK_SECRET: 'w',
      IMAGE_URL_SECRET: 'i',
      PUBLIC_URL: 'https://vr.example.test///',
      PORT: '4000',
      CACHE_TTL_HOURS: 'nope',
      MAX_FILE_BYTES: '10',
      LOG_LEVEL: 'debug',
    });
    expect(env).toMatchObject({
      appId: '7',
      webhookSecret: 'w',
      imageUrlSecret: 'i',
      publicUrl: 'https://vr.example.test',
      port: 4000,
      cacheTtlHours: 168,
      maxFileBytes: 10,
      logLevel: 'debug',
    });
  });
});

describe('decodePrivateKey', () => {
  const pem =
    '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----';

  it('keeps a PEM and unescapes literal \\n', () => {
    expect(decodePrivateKey(pem)).toBe(pem);
    expect(decodePrivateKey(pem.replace(/\n/g, '\\n'))).toBe(pem);
  });

  it('decodes a base64 single line', () => {
    expect(decodePrivateKey(Buffer.from(pem).toString('base64'))).toBe(pem);
  });

  it('passes through empty values', () => {
    expect(decodePrivateKey(undefined)).toBeUndefined();
    expect(decodePrivateKey('')).toBeUndefined();
  });
});
