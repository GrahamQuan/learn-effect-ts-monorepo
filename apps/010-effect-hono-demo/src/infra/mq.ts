import { Queue } from 'bullmq';
import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/lib/env';

export interface QueueFactory {
  readonly makeQueue: <Data, Result = void, Name extends string = string>(name: string) => Queue<Data, Result, Name>;
}

export const QueueFactory = Context.GenericTag<QueueFactory>('010-effect-hono-demo/infra/QueueFactory');

const connectionFromUrl = (redisUrl: string) => {
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  };
};

export const QueueLive = Layer.effect(
  QueueFactory,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const connection = connectionFromUrl(config.cacheUrl);

    return {
      makeQueue: (name) => new Queue(name, { connection }),
    };
  }),
);
