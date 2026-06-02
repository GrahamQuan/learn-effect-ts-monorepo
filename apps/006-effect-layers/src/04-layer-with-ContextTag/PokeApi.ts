import { Context, Effect, Layer, Schema } from 'effect';
import { BuildPokeApiUrl } from './BuildPokeApiUrl';
import { FetchError, JsonError } from './error';
import { PokemonCollection } from './PokemonCollection';
import { Pokemon } from './schema';

const make = Effect.gen(function* () {
  /// 1️⃣ Extract `PokemonCollection` and `BuildPokeApiUrl` outside of `getPokemon`
  const pokemonCollection = yield* PokemonCollection;
  const buildPokeApiUrl = yield* BuildPokeApiUrl;

  return {
    getPokemon: Effect.gen(function* () {
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
});

export class PokeApi extends Context.Tag('PokeApi')<
  PokeApi,
  /// 2️⃣ Change the definition of the service to `Effect.Effect.Success<typeof make>`
  Effect.Effect.Success<typeof make>
>() {
  /// 3️⃣ Use `Layer.effect` instead of `Layer.succeed`
  // static readonly Live = Layer.effect(this, make);

  static readonly Live = Layer.effect(this, make).pipe(
    // 👇 Remember: provide dependencies directly inside `Live`
    Layer.provide(Layer.mergeAll(PokemonCollection.Live, BuildPokeApiUrl.Live)),
  );

  // 👇 With this pattern we have all services implementations defined as separate static parameters
  static readonly Mock = Layer.succeed(
    this,
    PokeApi.of({
      getPokemon: Effect.succeed({
        id: 1,
        height: 10,
        weight: 10,
        name: 'my-name',
        order: 1,
      }),
    }),
  );
}
