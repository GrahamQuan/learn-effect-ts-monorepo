import { Context, Effect, type Array as EffectArrayType, Layer } from 'effect';

// (1) Context.Tag
// export class PokemonCollection extends Context.Tag('PokemonCollection')<
//   PokemonCollection,
//   EffectArrayType.NonEmptyArray<string>
// >() {
//   static readonly Live = Layer.succeed(this, ['staryu', 'perrserker', 'flaaffy']);
// }

// (2) Effect.Service
export class PokemonCollection extends Effect.Service<PokemonCollection>()('PokemonCollection', {
  succeed: ['staryu', 'perrserker', 'flaaffy'],
}) {}
