import { Context, type Array as EffectArrayType } from 'effect';

export class PokemonCollection extends Context.Tag('PokemonCollection')<
  PokemonCollection,
  /// 👇 A list of names of your favorite Pokémon
  EffectArrayType.NonEmptyArray<string>
>() {
  static readonly Live = PokemonCollection.of(['staryu', 'perrserker', 'flaaffy']);
}
