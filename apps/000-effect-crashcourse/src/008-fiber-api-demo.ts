import { Effect, Fiber } from 'effect';

// A small successful Effect. It does not start running when this value is created.
const successfulTask = Effect.gen(function* () {
  yield* Effect.sleep('500 millis');
  return 'A: user loaded';
});

// A small failing Effect. The failure goes into Effect's typed error channel.
const failingTask = Effect.gen(function* () {
  yield* Effect.sleep('200 millis');
  return yield* Effect.fail('B: audit log failed' as const);
});

// This is the main Effect program. When it is run, the runtime executes it on
// a main fiber.
const program = Effect.gen(function* () {
  console.log('[main effect] start');

  // Effect.fork starts each task on a child fiber and returns a handle to it.
  // The main fiber continues immediately after both child fibers are started.
  const successFiber = yield* Effect.fork(successfulTask);
  const failureFiber = yield* Effect.fork(failingTask);

  console.log('[main effect] child fibers started');

  // Fiber.await waits for completion and returns an Exit, so failure is data
  // here instead of failing the main program.
  const failureExit = yield* Fiber.await(failureFiber);
  console.log('[main effect] Fiber.await(failureFiber) =', failureExit);

  // Fiber.join waits for completion and returns an Exit, so failure is data
  // const failureExit = yield* Fiber.join(failureFiber);
  // console.log('[main effect] Fiber.join(failureFiber) =', failureExit);

  // Fiber.join waits for success and extracts the success value. If this fiber
  // had failed, the main program would fail too.
  const success = yield* Fiber.join(successFiber);
  console.log('[main effect] Fiber.join(successFiber) =', success);

  return 'main program done';
});

// Effect.runFork starts the whole program from the JavaScript boundary and
// immediately returns the main fiber.
const mainFiber = Effect.runFork(program);

console.log('[js boundary] Effect.runFork(program) returned immediately');

// Effect.runPromise is another JavaScript boundary runner. Here it waits for
// the main fiber by joining it.
Effect.runPromise(Fiber.join(mainFiber)).then((result) => {
  console.log('[js boundary] Effect.runPromise(Fiber.join(mainFiber)) =', result);
});
