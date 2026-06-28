import { Effect } from 'effect';

import { delayedTask, printExit, printSection, runIfMain } from './shared';

// timeout/race: timeout interrupts slow work; race interrupts the loser.
export const example2TimeoutAndRace = Effect.gen(function* () {
  printSection('2. Effect.timeout and Effect.race');

  const timeoutExit = yield* delayedTask('slow-api', '1 second', 'slow response').pipe(
    Effect.timeout('200 millis'),
    Effect.exit,
  );
  printExit('[main] timeout exit', timeoutExit);

  const winner = yield* Effect.race(
    delayedTask('primary-region', '500 millis', 'primary response'),
    delayedTask('backup-region', '150 millis', 'backup response'),
  );

  console.log('[main] race winner =', winner);
});

runIfMain(import.meta.url, example2TimeoutAndRace);
