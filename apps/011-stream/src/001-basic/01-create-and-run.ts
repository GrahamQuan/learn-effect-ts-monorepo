import { Effect, Stream } from 'effect';

import { printChunk, printSection, runIfMain } from './shared';

// Basic creation and running:
// - Stream values are lazy descriptions.
// - runCollect / runForEach / runDrain turn a Stream into an Effect.
export const example1CreateAndRun = Effect.gen(function* () {
  printSection('001-basic / 01 create and run');

  const numbers = Stream.fromIterable([1, 2, 3]);
  const collected = yield* Stream.runCollect(numbers);
  printChunk('[runCollect] numbers =', collected);

  yield* Stream.make('a', 'b', 'c').pipe(
    Stream.runForEach((letter) =>
      Effect.sync(() => {
        console.log('[runForEach] letter =', letter);
      }),
    ),
  );

  yield* Stream.fromEffect(
    Effect.sync(() => {
      console.log('[fromEffect] the Effect runs when the Stream is consumed');
      return 'created by Effect';
    }),
  ).pipe(Stream.runDrain);
});

runIfMain(import.meta.url, example1CreateAndRun);
