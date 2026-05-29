import { Data, Effect } from 'effect';

class FetchError extends Data.TaggedError('FetchError')<Readonly<{ customMessage: string }>> {}

class JsonError extends Data.TaggedError('JsonError')<Readonly<{ customMessage: string }>> {}

const fetchRequest = Effect.tryPromise({
  try: () => fetch('https://pokeapi.co/api/v2/psadokemon/garchomp'),
  catch: () => new FetchError({ customMessage: 'Fetch error on fetchRequest()' }),
});

const jsonResponse = (response: Response) =>
  Effect.tryPromise({
    try: () => response.json(),
    catch: () => new JsonError({ customMessage: 'Json error on jsonResponse()' }),
  });

const main = Effect.gen(function* () {
  const response = yield* fetchRequest;
  if (!response.ok) {
    return yield* new FetchError({ customMessage: 'Fetch error on main()' });
  }

  return yield* jsonResponse(response);
});

Effect.runPromise(main)
  .then((res) => {
    console.log('main then', res);
  })
  .catch((err) => {
    console.log('main catch', err);
  });
