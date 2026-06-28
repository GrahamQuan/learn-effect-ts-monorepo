import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Cause, Duration, Effect, Exit } from 'effect';

export const printSection = (title: string) => {
  console.log(`\n=== ${title} ===`);
};

const firstLine = (text: string) => text.split('\n')[0] ?? text;

export const printExit = <A, E>(label: string, exit: Exit.Exit<A, E>) => {
  if (Exit.isSuccess(exit)) {
    console.log(label, {
      tag: exit._tag,
      value: exit.value,
    });
    return;
  }

  console.log(label, {
    tag: exit._tag,
    isTypedFailure: Cause.isFailure(exit.cause),
    isDefect: Cause.isDie(exit.cause),
    isInterrupted: Cause.isInterrupted(exit.cause),
    pretty: firstLine(Cause.pretty(exit.cause)),
  });
};

// A tiny helper for examples that need a visible async task.
// The onInterrupt handler lets us see when a fiber is cancelled.
export const delayedTask = <A>(label: string, delay: Duration.DurationInput, value: A) =>
  Effect.gen(function* () {
    console.log(`[${label}] start`);
    yield* Effect.sleep(delay);
    console.log(`[${label}] done`);
    return value;
  }).pipe(
    Effect.onInterrupt(() =>
      Effect.sync(() => {
        console.log(`[${label}] interrupted`);
      }),
    ),
  );

export const runProgram = <A, E>(program: Effect.Effect<A, E, never>) => {
  Effect.runPromise(program).catch((error) => {
    console.error('[js boundary] unexpected program failure', error);
  });
};

export const runIfMain = <A, E>(metaUrl: string, program: Effect.Effect<A, E, never>) => {
  if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(metaUrl)) {
    runProgram(program);
  }
};
