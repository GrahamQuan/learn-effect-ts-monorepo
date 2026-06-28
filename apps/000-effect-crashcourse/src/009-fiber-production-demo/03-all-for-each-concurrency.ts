import { Effect } from 'effect';

import { delayedTask, printSection, runIfMain } from './shared';

// Effect.all / Effect.forEach concurrency: prefer high-level APIs for normal
// production fan-out instead of manually managing fibers.
export const example3HighLevelConcurrency = Effect.gen(function* () {
  printSection('3. Effect.all / Effect.forEach concurrency');

  const dashboard = yield* Effect.all(
    [
      delayedTask('load-user', '300 millis', { id: 'user-1' }),
      delayedTask('load-orders', '200 millis', ['order-1', 'order-2']),
    ],
    { concurrency: 2 },
  );

  console.log('[main] Effect.all result =', dashboard);

  const ids = [1, 2, 3, 4];
  const enriched = yield* Effect.forEach(
    ids,
    (id) => delayedTask(`enrich-${id}`, `${id * 100} millis`, `item-${id}`),
    { concurrency: 2 },
  );

  console.log('[main] Effect.forEach result =', enriched);
});

runIfMain(import.meta.url, example3HighLevelConcurrency);
