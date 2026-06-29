import { Effect, Queue, Stream } from 'effect';

import { printSection, runIfMain } from './shared';

// fromQueue turns a Queue into a Stream.
// take(3) makes this demo finite; a real worker would usually keep running
// until the app/runtime shuts it down.
export const example4QueueWorker = Effect.gen(function* () {
  printSection('002-production-demo / 04 fromQueue worker');

  const queue = yield* Queue.unbounded<string>();

  const producer = Effect.gen(function* () {
    yield* Queue.offer(queue, 'job-1');
    yield* Effect.sleep('50 millis');
    yield* Queue.offer(queue, 'job-2');
    yield* Effect.sleep('50 millis');
    yield* Queue.offer(queue, 'job-3');
  });

  yield* Effect.fork(producer);

  yield* Stream.fromQueue(queue).pipe(
    Stream.take(3),
    Stream.runForEach((job) =>
      Effect.sync(() => {
        console.log('[worker] processing', job);
      }),
    ),
  );

  yield* Queue.shutdown(queue);
});

runIfMain(import.meta.url, example4QueueWorker);
