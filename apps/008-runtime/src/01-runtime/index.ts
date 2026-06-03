import { Effect, Layer, ManagedRuntime } from 'effect';
import { PokeApi } from './PokeApi';

const MainLayer = Layer.mergeAll(PokeApi.Default);

// 👉 Create a `Runtime` from a layer (`MainLayer`)
const PokemonRuntime = ManagedRuntime.make(MainLayer);

export const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

// Don't need `runnable` nor `Effect.provide` anymore
const _runnable = program.pipe(Effect.provide(MainLayer));

const main = program.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed('Fetch error'),
    JsonError: () => Effect.succeed('Json error'),
    ParseError: () => Effect.succeed('Parse error'),
  }),
);

// Effect.runPromise(main).then(console.log);
PokemonRuntime.runPromise(main).then(console.log);
