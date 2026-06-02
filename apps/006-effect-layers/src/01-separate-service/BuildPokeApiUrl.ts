import { Context, Effect } from 'effect';
import { PokeApiUrl } from './PokeApiUrl';

export class BuildPokeApiUrl extends Context.Tag('BuildPokeApiUrl')<
  BuildPokeApiUrl,
  /// 👇 A single function
  (props: { name: string }) => string
>() {
  static readonly Live = Effect.gen(function* () {
    const pokeApiUrl = yield* PokeApiUrl; // 👈 Create dependency
    return BuildPokeApiUrl.of(({ name }) => `${pokeApiUrl}/${name}`);
  });
}
