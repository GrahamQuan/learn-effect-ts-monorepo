import { Effect, Fiber } from 'effect';

import { delayedTask, printExit, printSection, runIfMain } from './shared';

// interrupt: cancel a running child fiber and inspect its Exit.
export const example1Interrupt = Effect.gen(function* () {
  printSection('1. Fiber.interrupt');

  const fiber = yield* Effect.fork(delayedTask('manual-worker', '2 seconds', 'worker result'));

  yield* Effect.sleep('150 millis');
  console.log('[main] interrupting manual-worker');

  const exit = yield* Fiber.interrupt(fiber);
  printExit('[main] Fiber.interrupt exit', exit);
});

runIfMain(import.meta.url, example1Interrupt);
