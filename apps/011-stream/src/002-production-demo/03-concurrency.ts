import { Effect, Stream } from 'effect';

import { delayedEffect, printSection, runIfMain } from './shared';

const callExternalApi = (id: number) => delayedEffect(`api-${id}`, `${id * 100} millis`, `response-${id}`);

// mapEffect with concurrency controls fan-out pressure.
// In production this protects databases, APIs, and queues from unbounded load.
export const example3Concurrency = Effect.gen(function* () {
  printSection('002-production-demo / 03 mapEffect concurrency');

  const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
    Stream.mapEffect(callExternalApi, { concurrency: 2 }),
  );

  yield* Stream.runForEach(stream, (response) =>
    Effect.sync(() => {
      console.log('[consumer] response =', response);
    }),
  );
});

runIfMain(import.meta.url, example3Concurrency);
