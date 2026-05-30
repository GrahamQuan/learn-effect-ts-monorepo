import { Effect } from 'effect';
// 👇 Separate/Multiple imports for service definition and implementations
import { PokeApi, PokeApiLive } from './poke-api-context';

/// program: Full Effect implementation with errors and dependencies included in the type
const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

/// runnable: Provide all the dependencies to program to make the third type parameter never
const runnable = program.pipe(Effect.provideService(PokeApi, PokeApiLive));

/// main: Handle all (or part of) the errors from runnable to make the second type parameter never
const main = runnable.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed('Fetch error'),
    JsonError: () => Effect.succeed('Json error'),
    ParseError: () => Effect.succeed('Parse error'),
    ConfigError: () => Effect.succeed('Config error'),
  }),
);

Effect.runPromise(main).then(console.log);
