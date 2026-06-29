import { Data, Effect, Stream } from 'effect';

import { printChunk, printSection, runIfMain } from './shared';

class LookupError extends Data.TaggedError('LookupError')<{
  readonly id: number;
}> {}

const lookupUserName = (id: number): Effect.Effect<string, LookupError> =>
  Effect.gen(function* () {
    if (id === 2) {
      return yield* Effect.fail(new LookupError({ id }));
    }

    return `user-${id}`;
  });

// Effectful work and typed errors:
// - mapEffect runs an Effect for each stream element.
// - catchTag can recover from tagged stream failures.
export const example3EffectAndErrors = Effect.gen(function* () {
  printSection('001-basic / 03 effect and errors');

  const users = Stream.fromIterable([1, 2, 3]).pipe(
    Stream.mapEffect(lookupUserName),
    Stream.catchTag('LookupError', (error) => Stream.make(`fallback-for-${error.id}`)),
  );

  const collected = yield* Stream.runCollect(users);
  printChunk('[mapEffect + catchTag] users =', collected);
});

runIfMain(import.meta.url, example3EffectAndErrors);
