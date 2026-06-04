/* 

/// under a 'services' folder, eg. (services/Mdx.ts)

/// 👇 Error(s)
export class MdxError extends Data.TaggedError("MdxError")<
  Readonly<{
    error: unknown;
  }>
> {}

/// 👇 Implementation
const make = /// ...

/// 👇 Service definition
export class Mdx extends Context.Tag("Mdx")<
  Mdx,
  Effect.Effect.Success<typeof make>
>() {
  /// 👇 Layers
  static readonly Live = Layer.effect(this, make);
}

*/
