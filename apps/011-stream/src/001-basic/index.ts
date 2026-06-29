import { Effect } from 'effect';

import { example1CreateAndRun } from './01-create-and-run';
import { example2Transform } from './02-transform';
import { example3EffectAndErrors } from './03-effect-and-errors';
import { runProgram } from './shared';

const program = Effect.gen(function* () {
  yield* example1CreateAndRun;
  yield* example2Transform;
  yield* example3EffectAndErrors;
});

runProgram(program);
