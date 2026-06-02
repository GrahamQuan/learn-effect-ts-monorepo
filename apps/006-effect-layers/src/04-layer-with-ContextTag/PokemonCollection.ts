import { Context, type Array as EffectArrayType, Layer } from 'effect';

export class PokemonCollection extends Context.Tag('PokemonCollection')<
  PokemonCollection,
  EffectArrayType.NonEmptyArray<string>
>() {
  static readonly Live = Layer.succeed(this, ['staryu', 'perrserker', 'flaaffy']);
}
