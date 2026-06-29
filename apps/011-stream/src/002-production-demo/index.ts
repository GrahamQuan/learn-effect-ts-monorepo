import { Effect } from 'effect';

import { example1PaginateEffect } from './01-paginate-effect';
import { example2BatchProcessing } from './02-batch-processing';
import { example3Concurrency } from './03-concurrency';
import { example4QueueWorker } from './04-queue-worker';
import { example5RetryCatch } from './05-retry-catch';
import { runProgram } from './shared';

const program = Effect.gen(function* () {
  yield* example1PaginateEffect;
  yield* example2BatchProcessing;
  yield* example3Concurrency;
  yield* example4QueueWorker;
  yield* example5RetryCatch;
});

runProgram(program);
