import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { Config, Context, Effect, Layer } from 'effect';

expand(config());

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly cacheUrl: string;
}

export const AppConfig = Context.GenericTag<AppConfig>('010-effect-hono-demo/AppConfig');

export const loadEnv = Effect.gen(function* () {
  const nodeEnv = yield* Config.string('NODE_ENV').pipe(Config.withDefault('development'));
  const port = yield* Config.number('PORT').pipe(Config.withDefault(4000));
  const databaseUrl = yield* Config.string('DATABASE_URL');
  const cacheUrl = yield* Config.string('CACHE_URL');

  return {
    nodeEnv,
    port,
    databaseUrl,
    cacheUrl,
  };
});

export const AppConfigLive = Layer.effect(AppConfig, loadEnv);
