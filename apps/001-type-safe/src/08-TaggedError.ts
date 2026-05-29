import { Data, Effect } from 'effect';

class FetchError extends Data.TaggedError('FetchError')<Readonly<{ customMessage: string }>> {}

class JsonError extends Data.TaggedError('JsonError')<Readonly<{ customMessage: string }>> {}

const fetchRequest = Effect.tryPromise({
  try: () => fetch('https://pokeapi.co/api/v2/psadokemon/garchomp/'),
  catch: () => new FetchError({ customMessage: 'Fetch error on fetchRequest()' }),
});

const jsonResponse = (response: Response) =>
  Effect.tryPromise({
    try: () => response.json(),
    catch: () => new JsonError({ customMessage: 'Json error on jsonResponse()' }),
  });

const main = fetchRequest.pipe(
  Effect.filterOrFail(
    (response) => response.ok,
    () => new FetchError({ customMessage: 'Fetch error on filterOrFail()' }),
  ),
  Effect.flatMap(jsonResponse),
  Effect.catchTags({
    FetchError: (error) => Effect.succeed('Fetch error: ' + error.customMessage),
    JsonError: (error) => Effect.succeed('Json error: ' + error.customMessage),
  }),
);

Effect.runPromise(main)
  .then((res) => {
    console.log('main then', res);
  })
  .catch((err) => {
    console.log('main catch', err);
  });
