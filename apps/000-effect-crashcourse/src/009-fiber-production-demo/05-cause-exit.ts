import { Effect, Fiber } from 'effect';

import { printExit, printSection, runIfMain } from './shared';

// Cause / Exit: Exit tells us whether an Effect succeeded or failed; Cause tells
// us what kind of failure happened: typed failure, defect, or interruption.
export const example5CauseAndExit = Effect.gen(function* () {
  printSection('5. Cause / Exit');

  const successExit = yield* Effect.exit(Effect.succeed('ok'));
  printExit('[main] success exit', successExit);

  const failureExit = yield* Effect.exit(Effect.fail('typed business error' as const));
  printExit('[main] typed failure exit', failureExit);

  const defectExit = yield* Effect.exit(Effect.dieMessage('unexpected bug'));
  printExit('[main] defect exit', defectExit);

  const interruptedFiber = yield* Effect.fork(
    Effect.never.pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          console.log('[never-ending-worker] interrupted');
        }),
      ),
    ),
  );

  const interruptedExit = yield* Fiber.interrupt(interruptedFiber);
  printExit('[main] interrupted exit', interruptedExit);
});

runIfMain(import.meta.url, example5CauseAndExit);
