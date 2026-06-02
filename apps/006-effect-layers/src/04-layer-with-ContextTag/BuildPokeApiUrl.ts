import { Context, Effect, Layer } from 'effect';
import { PokeApiUrl } from './PokeApiUrl';

export class BuildPokeApiUrl extends Context.Tag('BuildPokeApiUrl')<
  BuildPokeApiUrl,
  ({ name }: { name: string }) => string
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const pokeApiUrl = yield* PokeApiUrl; // 👈 Create dependency
      return ({ name }) => `${pokeApiUrl}/${name}`;
    }),
  ).pipe(
    // 👇 `PokeApiUrl` is provided from `BuildPokeApiUrl`
    Layer.provide(PokeApiUrl.Live),
  );
}
