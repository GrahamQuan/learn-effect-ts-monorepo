import { ConfigProvider, Effect, Layer, ManagedRuntime } from 'effect';
import { expect, it } from 'vitest';
import { PokeApi } from '../PokeApi';

const TestConfigProvider = ConfigProvider.fromMap(new Map([['BASE_URL', 'http://localhost:3000']]));

const ConfigProviderLayer = Layer.setConfigProvider(TestConfigProvider);
const MainLayer = PokeApi.Default.pipe(Layer.provide(ConfigProviderLayer));

const TestingRuntime = ManagedRuntime.make(MainLayer);

const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

const _main = program.pipe(Effect.provide(MainLayer));

it('returns a valid pokemon', async () => {
  const response = await TestingRuntime.runPromise(program);
  expect(response).toEqual({
    id: 1,
    height: 10,
    weight: 10,
    order: 1,
    name: 'myname',
  });
});
