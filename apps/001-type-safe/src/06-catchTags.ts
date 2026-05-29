import { Effect } from 'effect';

interface FetchError {
  readonly _tag: 'FetchError';
}

interface JsonError {
  readonly _tag: 'JsonError';
}

/// 👇 Effect<Response, FetchError>
const fetchRequest = Effect.tryPromise({
  try: () => fetch('https://pokeapi.co/api/v2/psadokemon/garchomp/'),
  catch: (): FetchError => ({ _tag: 'FetchError' }),
});

const jsonResponse = (response: Response) =>
  /// 👇 Effect<unknown, JsonError>
  Effect.tryPromise({
    try: () => response.json(),
    catch: (): JsonError => ({ _tag: 'JsonError' }),
  });

/// Effect<unknown, never>
// const main = fetchRequest.pipe(
//   Effect.flatMap(jsonResponse),
//   Effect.catchTag('FetchError', () => Effect.succeed('Fetch error')),
//   Effect.catchTag('JsonError', () => Effect.succeed('Json error')),
// );

/// Effect<unknown, never>
const main = fetchRequest.pipe(
  Effect.flatMap(jsonResponse),
  Effect.catchTags({
    FetchError: () => Effect.succeed('Fetch error'),
    JsonError: () => Effect.succeed('Json error'),
    // OtherError: () => Effect.succeed('Other error'), // never exist
  }),
);

Effect.runPromise(main)
  .then((res) => {
    console.log('main then', res);
  })
  .catch((err) => {
    console.log('main catch', err);
  });
