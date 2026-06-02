import { Effect } from 'effect';
import { PokeApi } from './PokeApi';

export const PokeApiTest = PokeApi.of({
  getPokemon: Effect.succeed({
    id: 1,
    height: 10,
    weight: 10,
    order: 1,
    name: 'myname',
  }),
});
