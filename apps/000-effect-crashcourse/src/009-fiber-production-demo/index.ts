import { Effect } from 'effect';

import { example1Interrupt } from './01-interrupt';
import { example2TimeoutAndRace } from './02-timeout-race';
import { example3HighLevelConcurrency } from './03-all-for-each-concurrency';
import { example4FiberLifetime } from './04-fork-scoped-fork-daemon';
import { example5CauseAndExit } from './05-cause-exit';
import { runProgram } from './shared';

const program = Effect.gen(function* () {
  yield* example1Interrupt;
  yield* example2TimeoutAndRace;
  yield* example3HighLevelConcurrency;
  yield* example4FiberLifetime;
  yield* example5CauseAndExit;
});

runProgram(program);
