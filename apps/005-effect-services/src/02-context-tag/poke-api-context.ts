import { Config, Context, Effect, type ParseResult, Schema } from 'effect';
import { ConfigError } from 'effect/ConfigError';
import { FetchError, JsonError } from './error';
import { Pokemon } from './schema';

interface PokeApiImpl {
  readonly getPokemon: Effect.Effect<Pokemon, FetchError | JsonError | ParseResult.ParseError | ConfigError>;
}

// 👉 `PokeApi.of` defines a concrete implementation for the service
export class PokeApi extends Context.Tag('PokeApi')<PokeApi, PokeApiImpl>() {
  static readonly Live = PokeApi.of({
    getPokemon: Effect.gen(function* () {
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
    }),
  });
}
