import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/lib/env';

const makeDatabase = (pool: Pool) => drizzle(pool);

export type DatabaseClient = ReturnType<typeof makeDatabase>;

export interface Database {
  readonly db: DatabaseClient;
  readonly pool: Pool;
}

export const Database = Context.GenericTag<Database>('010-effect-hono-demo/infra/Database');

export const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const pool = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Pool({
            connectionString: config.databaseUrl,
            max: config.databasePoolMax,
            idleTimeoutMillis: config.databasePoolIdleTimeoutMs,
            maxLifetimeSeconds: config.databasePoolMaxLifetimeSeconds,
          }),
      ),
      (pool) => Effect.tryPromise(() => pool.end()).pipe(Effect.ignoreLogged),
    );

    return {
      // Keep this schema-free so repositories use SQL-builder style:
      // db.select().from(table), not db.query.table.findMany().
      db: makeDatabase(pool),
      pool,
    };
  }),
);
