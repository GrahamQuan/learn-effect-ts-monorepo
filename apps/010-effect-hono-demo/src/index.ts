import { serve } from '@hono/node-server';
import { Effect } from 'effect';

import { createApp } from '@/app';
import { loadEnv } from '@/lib/env';
import { prepareRoutes } from '@/routes';

const app = createApp();

const main = Effect.gen(function* () {
  const env = yield* loadEnv;

  yield* prepareRoutes;

  return yield* Effect.sync(() =>
    serve({ fetch: app.fetch, port: env.port }, (info) => {
      console.log('Server is running on port:', info.port);
    }),
  );
});

void Effect.runPromise(
  main.pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(error);
        process.exitCode = 1;
      }),
    ),
  ),
);
