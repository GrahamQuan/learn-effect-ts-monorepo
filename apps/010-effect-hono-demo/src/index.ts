import { serve, type ServerType } from '@hono/node-server';
import { Effect } from 'effect';

import { createApp } from '@/app';
import { loadEnv } from '@/lib/env';
import { prepareRoutes } from '@/routes';
import { AppRuntime } from '@/runtime';

const app = createApp();

const closeServer = (server: ServerType) =>
  Effect.tryPromise({
    try: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    catch: (cause) => cause,
  });

const registerShutdown = (server: ServerType) => {
  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}; closing server and app runtime.`);

    void Effect.runPromise(
      closeServer(server).pipe(
        Effect.ensuring(AppRuntime.disposeEffect),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            console.error('Shutdown failed:', error);
            process.exitCode = 1;
          }),
        ),
      ),
    );
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

const main = Effect.gen(function* () {
  const env = yield* loadEnv;

  yield* Effect.tryPromise({
    try: () => AppRuntime.runPromise(prepareRoutes),
    catch: (cause) => cause,
  });

  return yield* Effect.sync(() => {
    const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
      console.log('Server is running on port:', info.port);
    });

    registerShutdown(server);

    return server;
  });
});

void Effect.runPromise(
  main.pipe(
    Effect.catchAll((error) =>
      AppRuntime.disposeEffect.pipe(
        Effect.zipRight(
          Effect.sync(() => {
            console.error(error);
            process.exitCode = 1;
          }),
        ),
      ),
    ),
  ),
);
