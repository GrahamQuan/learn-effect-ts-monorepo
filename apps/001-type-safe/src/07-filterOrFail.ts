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
const main = fetchRequest.pipe(
  // filterOrFail will return the given error (FetchError) when response.ok is false,
  // otherwise it keeps Response as success value.
  Effect.filterOrFail(
    (response) => response.ok,
    (): FetchError => ({
      _tag: 'FetchError',
    }),
  ),
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

/* 

flow: 

fetchRequest succeeds with Response
        ↓
filterOrFail checks response.ok
        ↓
response.ok is false
        ↓
second function creates FetchError
        ↓
pipeline becomes failed
        ↓
flatMap(jsonResponse) is skipped
        ↓
catchTags sees FetchError
        ↓
catchTags runs

*/
