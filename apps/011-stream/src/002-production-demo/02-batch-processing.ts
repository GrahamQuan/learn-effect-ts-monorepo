import { Effect, Stream } from 'effect';

import { chunkToArray, printSection, runIfMain } from './shared';

// groupedWithin batches by size or by time, whichever happens first.
// This is useful for bulk database writes or batched API requests.
export const example2BatchProcessing = Effect.gen(function* () {
  printSection('002-production-demo / 02 groupedWithin batch processing');

  const stream = Stream.fromIterable(['todo-1', 'todo-2', 'todo-3', 'todo-4', 'todo-5']).pipe(
    Stream.groupedWithin(2, '1 second'),
  );

  yield* Stream.runForEach(stream, (batch) =>
    Effect.sync(() => {
      console.log('[db] write batch =', chunkToArray(batch));
    }),
  );
});

runIfMain(import.meta.url, example2BatchProcessing);
