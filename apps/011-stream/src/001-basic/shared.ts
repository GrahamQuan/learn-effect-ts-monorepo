import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Chunk, Effect } from 'effect';

export const printSection = (title: string) => {
  console.log(`\n=== ${title} ===`);
};

export const printChunk = <A>(label: string, chunk: Chunk.Chunk<A>) => {
  console.log(label, Chunk.toReadonlyArray(chunk));
};

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
