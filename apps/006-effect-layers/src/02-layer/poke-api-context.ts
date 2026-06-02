import { Context, Effect, Layer, Schema } from 'effect';
import { BuildPokeApiUrl } from './BuildPokeApiUrl';
import { FetchError, JsonError } from './error';
import { PokemonCollection } from './PokemonCollection';
import { Pokemon } from './schema';

// interface PokeApiImpl {
//   /// `getPokemon` has `never` as dependencies
//   /// (`never` is the default type when not defined)
//   ///
//   /// But our implementation uses `BuildPokeApiUrl` and `PokemonCollection`
//   /// ⛔️ Not assignable to `never`!
//   readonly getPokemon: Effect.Effect<Pokemon, FetchError | JsonError | ParseResult.ParseError | ConfigError>;
// }

const make = {
  getPokemon: Effect.gen(function* () {
    const pokemonCollection = yield* PokemonCollection;
    const buildPokeApiUrl = yield* BuildPokeApiUrl;

    const requestUrl = buildPokeApiUrl({ name: pokemonCollection[0] });

    const response = yield* Effect.tryPromise({
      try: () => fetch(requestUrl),
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
};

export class PokeApi extends Context.Tag('PokeApi')<PokeApi, typeof make>() {
  static readonly Live = Layer.succeed(this, make);
}
