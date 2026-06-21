import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { Config, Context, Effect, Layer } from 'effect';

expand(config());

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databasePoolMax: number;
  readonly databasePoolIdleTimeoutMs: number;
  readonly databasePoolMaxLifetimeSeconds: number;
  readonly cacheUrl: string;
}

export const AppConfig = Context.GenericTag<AppConfig>('010-effect-hono-demo/AppConfig');

export const loadEnv = Effect.gen(function* () {
  const nodeEnv = yield* Config.string('NODE_ENV').pipe(Config.withDefault('development'));
  const port = yield* Config.number('PORT').pipe(Config.withDefault(4000));
  const databaseUrl = yield* Config.string('DATABASE_URL');
  const databasePoolMax = yield* Config.number('DATABASE_POOL_MAX').pipe(Config.withDefault(10));
  const databasePoolIdleTimeoutMs = yield* Config.number('DATABASE_POOL_IDLE_TIMEOUT_MS').pipe(Config.withDefault(30_000));
  const databasePoolMaxLifetimeSeconds = yield* Config.number('DATABASE_POOL_MAX_LIFETIME_SECONDS').pipe(
    Config.withDefault(300),
  );
  const cacheUrl = yield* Config.string('CACHE_URL');

  return {
    nodeEnv,
    port,
    databaseUrl,
    databasePoolMax,
    databasePoolIdleTimeoutMs,
    databasePoolMaxLifetimeSeconds,
    cacheUrl,
  };
});

export const AppConfigLive = Layer.effect(AppConfig, loadEnv);
