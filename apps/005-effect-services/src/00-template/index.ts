import { Config, Effect, Schema } from 'effect';
import { FetchError, JsonError } from './error';
import { Pokemon } from './schema';

const getPokemon = Effect.gen(function* () {
  const baseUrl = yield* Config.string('BASE_URL');

  const response = yield* Effect.tryPromise({
    try: () => fetch(`${baseUrl}/api/v2/pokemon/garchomp/`),
    catch: () => new FetchError(),
  });

  if (!response.ok) {
    return yield* new FetchError();
  }

  const json = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: () => new JsonError(),
  });

  return yield* Schema.decodeUnknown(Pokemon)(json);
});

/** Error handling **/
const main = getPokemon.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed('Fetch error'),
    JsonError: () => Effect.succeed('Json error'),
    ParseError: () => Effect.succeed('Parse error'),
  }),
);

/** Running effect **/
Effect.runPromise(main).then(console.log);
