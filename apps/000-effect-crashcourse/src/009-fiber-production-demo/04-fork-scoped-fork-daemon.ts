import { Effect, Fiber } from 'effect';

import { delayedTask, printExit, printSection, runIfMain } from './shared';

// forkScoped / forkDaemon: scoped fibers are tied to a Scope; daemon fibers are
// not tied to the parent fiber, so production code must own their lifetime.
export const example4FiberLifetime = Effect.gen(function* () {
  printSection('4. Effect.forkScoped / Effect.forkDaemon');

  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.forkScoped(delayedTask('scoped-worker', '2 seconds', 'scoped result'));
      yield* Effect.sleep('150 millis');
      console.log('[scope] leaving scope; scoped-worker will be interrupted');
    }),
  );

  console.log('[main] local scope is closed');

  const daemonFiber = yield* Effect.forkDaemon(delayedTask('daemon-worker', '2 seconds', 'daemon result'));

  yield* Effect.sleep('150 millis');
  console.log('[main] daemon-worker is not scoped to this parent; interrupt it manually in this demo');

  const daemonExit = yield* Fiber.interrupt(daemonFiber);
  printExit('[main] daemon interrupt exit', daemonExit);
});

runIfMain(import.meta.url, example4FiberLifetime);
