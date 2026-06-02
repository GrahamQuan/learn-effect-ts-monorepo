import { Config, Context, Effect } from 'effect';

export class PokeApiUrl extends Context.Tag('PokeApiUrl')<
  PokeApiUrl,
  // 👇 Even a single `string` works
  string
>() {
  static readonly Live = Effect.gen(function* () {
    const baseUrl = yield* Config.string('BASE_URL');
    return PokeApiUrl.of(`${baseUrl}/api/v2/pokemon`);
  });
}
