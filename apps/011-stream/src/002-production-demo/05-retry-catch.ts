import { Data, Effect, Schedule, Stream } from 'effect';

import { printSection, runIfMain } from './shared';

class ExternalApiError extends Data.TaggedError('ExternalApiError')<{
  readonly attempt: number;
}> {}

// retry re-runs the stream when it fails.
// catchTag gives a typed fallback if retry still cannot recover.
export const example5RetryCatch = Effect.gen(function* () {
  printSection('002-production-demo / 05 retry and catchTag');

  let attempts = 0;

  const flakyStream = Stream.fromEffect(
    Effect.gen(function* () {
      attempts += 1;
      console.log(`[api] attempt ${attempts}`);

      if (attempts < 3) {
        return yield* Effect.fail(new ExternalApiError({ attempt: attempts }));
      }

      return `live-response-attempt-${attempts}`;
    }),
  );

  const recovered = flakyStream.pipe(
    Stream.retry(Schedule.recurs(2)),
    Stream.catchTag('ExternalApiError', (error) => Stream.make(`fallback-after-attempt-${error.attempt}`)),
  );

  yield* Stream.runForEach(recovered, (value) =>
    Effect.sync(() => {
      console.log('[consumer] value =', value);
    }),
  );
});

runIfMain(import.meta.url, example5RetryCatch);
