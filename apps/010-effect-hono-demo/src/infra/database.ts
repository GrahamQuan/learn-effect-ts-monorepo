import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/lib/env';

export type DatabaseClient = ReturnType<typeof drizzle>;

export interface Database {
  readonly db: DatabaseClient;
}

export const Database = Context.GenericTag<Database>('010-effect-hono-demo/infra/Database');

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const sql = neon(config.databaseUrl);

    return {
      // Keep this schema-free so repositories use SQL-builder style:
      // db.select().from(table), not db.query.table.findMany().
      db: drizzle(sql),
    };
  }),
);
