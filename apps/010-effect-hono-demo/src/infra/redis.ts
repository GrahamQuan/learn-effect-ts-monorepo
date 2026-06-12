import { Context, Effect, Layer } from 'effect';
import Redis from 'ioredis';

import { AppConfig } from '@/lib/env';

export interface RedisClient {
  readonly redis: Redis;
}

export const RedisClient = Context.GenericTag<RedisClient>('010-effect-hono-demo/infra/RedisClient');

export const RedisLive = Layer.effect(
  RedisClient,
  Effect.gen(function* () {
    const config = yield* AppConfig;

    return {
      redis: new Redis(config.cacheUrl, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
      }),
    };
  }),
);
