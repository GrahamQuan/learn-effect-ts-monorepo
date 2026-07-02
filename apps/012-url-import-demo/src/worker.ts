import { Effect } from 'effect';

import { makeImportWorker } from '@/imports/import.worker';
import { AppRuntime } from '@/runtime';

const waitForShutdownSignal = Effect.promise<NodeJS.Signals>(
  () =>
    new Promise((resolve) => {
      process.once('SIGINT', () => resolve('SIGINT'));
      process.once('SIGTERM', () => resolve('SIGTERM'));
    }),
);

const main = Effect.scoped(
  Effect.gen(function* () {
    yield* makeImportWorker;
    const signal = yield* waitForShutdownSignal;

    yield* Effect.sync(() => {
      console.log(`Received ${signal}; closing worker and app runtime.`);
    });
  }),
);

void AppRuntime.runPromise(
  main.pipe(
    Effect.ensuring(AppRuntime.disposeEffect),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(error);
        process.exitCode = 1;
      }),
    ),
  ),
);
