import { Config, Data, Effect, Schema } from 'effect';

const config = Config.string('BASE_URL');

/** Schema definition **/
class Pokemon extends Schema.Class<Pokemon>('Pokemon')({
  id: Schema.Number,
  order: Schema.Number,
  name: Schema.String,
  height: Schema.Number,
  weight: Schema.Number,
}) {}

/** Errors **/
class FetchError extends Data.TaggedError('FetchError')<{}> {}
class JsonError extends Data.TaggedError('JsonError')<{}> {}

/** Implementation **/
const fetchRequest = (baseUrl: string) =>
  Effect.tryPromise({
    try: () => fetch(`${baseUrl}/api/v2/pokemon/garchomp/`),
    catch: () => new FetchError(),
  });

const jsonResponse = (response: Response) =>
  Effect.tryPromise({
    try: () => response.json(),
    catch: () => new JsonError(),
  });

const decodePokemon = Schema.decodeUnknown(Pokemon);

const program = Effect.gen(function* () {
  const baseUrl = yield* config;
  const response = yield* fetchRequest(baseUrl);
  if (!response.ok) {
    return yield* new FetchError();
  }

  const json = yield* jsonResponse(response);

  return yield* decodePokemon(json);
});

/** Error handling **/
const main = program.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed('Fetch error'),
    JsonError: () => Effect.succeed('Json error'),
    ParseError: () => Effect.succeed('Parse error'),
  }),
);

/** Running effect **/
Effect.runPromise(main).then(console.log);
