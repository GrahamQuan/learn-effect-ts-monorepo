import { Effect, Option, Stream } from 'effect';

import { printSection, runIfMain } from './shared';

type Page = Readonly<{
  readonly items: readonly string[];
  readonly nextPage: Option.Option<number>;
}>;

const fetchPage = (page: number): Effect.Effect<Page> =>
  Effect.sync(() => {
    console.log(`[api] fetch page ${page}`);

    if (page >= 3) {
      return { items: [`item-${page}-a`, `item-${page}-b`], nextPage: Option.none() };
    }

    return { items: [`item-${page}-a`, `item-${page}-b`], nextPage: Option.some(page + 1) };
  });

// paginateEffect models API pagination without loading every page manually.
export const example1PaginateEffect = Effect.gen(function* () {
  printSection('002-production-demo / 01 paginateEffect');

  const stream = Stream.paginateEffect(1, (page) =>
    fetchPage(page).pipe(
      Effect.map((result) => [result.items, result.nextPage] as const),
    ),
  ).pipe(Stream.flatMap(Stream.fromIterable));

  yield* Stream.runForEach(stream, (item) =>
    Effect.sync(() => {
      console.log('[consumer] item =', item);
    }),
  );
});

runIfMain(import.meta.url, example1PaginateEffect);
