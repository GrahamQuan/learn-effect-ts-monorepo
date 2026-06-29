import { Effect, Stream } from 'effect';

import { printChunk, printSection, runIfMain } from './shared';

// Basic transformations:
// - map changes each element.
// - filter keeps selected elements.
// - flatMap can turn one element into many elements.
// - take / drop control how many elements pass through.
export const example2Transform = Effect.gen(function* () {
  printSection('001-basic / 02 transform');

  const stream = Stream.fromIterable([1, 2, 3, 4, 5, 6]).pipe(
    Stream.drop(1),
    Stream.filter((n) => n % 2 === 0),
    Stream.map((n) => n * 10),
    Stream.flatMap((n) => Stream.make(n, n + 1)),
    Stream.take(4),
  );

  const collected = yield* Stream.runCollect(stream);
  printChunk('[transform] result =', collected);
});

runIfMain(import.meta.url, example2Transform);
