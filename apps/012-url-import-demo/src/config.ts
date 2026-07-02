import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { Config, Context, Effect, Layer } from 'effect';

expand(config());

const defaultStorePath = fileURLToPath(new URL('../.data/imports.json', import.meta.url));

export interface AppConfig {
  readonly port: number;
  readonly redisUrl: string;
  readonly queueName: string;
  readonly storePath: string;
  readonly fetchTimeoutMs: number;
  readonly workerConcurrency: number;
}

export const AppConfig = Context.GenericTag<AppConfig>('012-url-import-demo/AppConfig');

export const loadEnv = Effect.gen(function* () {
  const port = yield* Config.number('PORT').pipe(Config.withDefault(4012));
  const redisUrl = yield* Config.string('REDIS_URL').pipe(Config.withDefault('redis://127.0.0.1:6379'));
  const queueName = yield* Config.string('IMPORT_QUEUE_NAME').pipe(Config.withDefault('url-imports'));
  const storePath = yield* Config.string('IMPORT_STORE_PATH').pipe(Config.withDefault(defaultStorePath));
  const fetchTimeoutMs = yield* Config.number('IMPORT_FETCH_TIMEOUT_MS').pipe(Config.withDefault(5_000));
  const workerConcurrency = yield* Config.number('IMPORT_WORKER_CONCURRENCY').pipe(Config.withDefault(2));

  return {
    port,
    redisUrl,
    queueName,
    storePath,
    fetchTimeoutMs,
    workerConcurrency,
  };
});

export const storeDirectory = (config: AppConfig) => dirname(config.storePath);

export const AppConfigLive = Layer.effect(AppConfig, loadEnv);
