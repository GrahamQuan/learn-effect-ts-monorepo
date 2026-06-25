import { sql } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';

import { Database } from '@/infra/database';
import { QueueFactory } from '@/infra/mq';
import { RedisClient } from '@/infra/redis';

export type HealthCheckStatus = 'up' | 'down';
export type HealthReportStatus = 'ok' | 'not_ready';

export interface HealthCheck {
  readonly name: string;
  readonly status: HealthCheckStatus;
  readonly message?: string;
}

export interface HealthReport {
  readonly status: HealthReportStatus;
  readonly checks: readonly HealthCheck[];
}

export interface HealthService {
  readonly live: Effect.Effect<HealthReport>;
  readonly ready: Effect.Effect<HealthReport>;
}

export const HealthService = Context.GenericTag<HealthService>('010-effect-hono-demo/health/HealthService');

const healthy = (name: string): HealthCheck => ({ name, status: 'up' });

const unhealthy = (name: string, error: unknown): HealthCheck => ({
  name,
  status: 'down',
  message: String(error),
});

const check = <E>(name: string, effect: Effect.Effect<void, E>) =>
  effect.pipe(
    Effect.as(healthy(name)),
    Effect.catchAll((error) => Effect.succeed(unhealthy(name, error))),
  );

const report = (checks: readonly HealthCheck[]): HealthReport => ({
  status: checks.every((check) => check.status === 'up') ? 'ok' : 'not_ready',
  checks,
});

export const HealthServiceLive = Layer.effect(
  HealthService,
  Effect.gen(function* () {
    const { db } = yield* Database;
    const { redis } = yield* RedisClient;
    const queueFactory = yield* QueueFactory;

    const database = check(
      'database',
      Effect.tryPromise({
        try: async () => {
          await db.execute(sql`select 1`);
        },
        catch: (cause) => cause,
      }),
    );
    const redisCache = check(
      'redis',
      Effect.tryPromise({
        try: async () => {
          await redis.ping();
        },
        catch: (cause) => cause,
      }),
    );
    const queue = check('queue', queueFactory.check);

    return {
      live: Effect.succeed(report([healthy('process')])),
      ready: Effect.all([database, redisCache, queue]).pipe(Effect.map(report)),
    };
  }),
);
