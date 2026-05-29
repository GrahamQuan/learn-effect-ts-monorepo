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

/// Effect<unknown, FetchError | JsonError>
const main = fetchRequest.pipe(Effect.flatMap(jsonResponse));

Effect.runPromise(main)
  .then((res) => {
    console.log('main then', res);
  })
  .catch((err) => {
    console.log('main catch', err);
  });
