import { Effect } from 'effect';
import { expect, it } from 'vitest';
import { PokeApi } from '../PokeApi';

const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

// 👇 Provide the `PokeApi` live implementation to test
const main = program.pipe(Effect.provide(PokeApi.Default));

it('returns a valid pokemon', async () => {
  const response = await Effect.runPromise(main);
  expect(response).toEqual({
    id: 1,
    height: 10,
    weight: 10,
    order: 1,
    name: 'myname',
  });
});
