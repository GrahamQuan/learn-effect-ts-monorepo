import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Chunk, Duration, Effect } from 'effect';

export const printSection = (title: string) => {
  console.log(`\n=== ${title} ===`);
};

export const chunkToArray = <A>(chunk: Chunk.Chunk<A>) => Chunk.toReadonlyArray(chunk);

export const delayedEffect = <A>(label: string, delay: Duration.DurationInput, value: A) =>
  Effect.gen(function* () {
    console.log(`[${label}] start`);
    yield* Effect.sleep(delay);
    console.log(`[${label}] done`);
    return value;
  });

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
