import { Probot, Server } from 'probot';
import { readEnv } from './env.js';
import { sweepCache } from './images.js';
import { createApp } from './index.js';

const env = readEnv();

const server = new Server({
  Probot: Probot.defaults({
    appId: env.appId,
    privateKey: env.privateKey,
    secret: env.webhookSecret,
    logLevel: env.logLevel,
    logFormat: env.logFormat,
  }),
  port: env.port,
  host: env.host,
  webhookProxy: env.webhookProxyUrl,
});

await server.load(createApp({ env }));
await server.start();

const sweep = () =>
  sweepCache(env.cacheDir, {
    ttlMs: env.cacheTtlHours * 3600_000,
    maxBytes: env.cacheMaxBytes,
  }).catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('cache sweep failed', error);
  });
void sweep();
const timer = setInterval(sweep, 3600_000);

const shutdown = () => {
  clearInterval(timer);
  void server.stop().finally(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
