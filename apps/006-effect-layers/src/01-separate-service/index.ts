import { Effect } from 'effect';
import { BuildPokeApiUrl } from './BuildPokeApiUrl';
import { PokeApiUrl } from './PokeApiUrl';
import { PokemonCollection } from './PokemonCollection';
import { PokeApi } from './poke-api-context';

const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

const runnable = program.pipe(
  Effect.provideService(PokeApi, PokeApi.Live),
  Effect.provideService(PokemonCollection, PokemonCollection.Live),
  Effect.provideServiceEffect(BuildPokeApiUrl, BuildPokeApiUrl.Live),
  Effect.provideServiceEffect(PokeApiUrl, PokeApiUrl.Live),
);

Effect.runPromise(runnable).then(console.log);
