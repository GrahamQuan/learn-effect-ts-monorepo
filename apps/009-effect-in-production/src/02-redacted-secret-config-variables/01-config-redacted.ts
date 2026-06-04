import { Config, Effect, Redacted } from 'effect';

// const config = Config.redacted('SECRET_KEY');
// const program = Effect.gen(function* () {
//   /// 👇 Type is `Redacted<string>`
//   const secretKey = yield* Config.redacted('SECRET_KEY');
// });

const doSomeDangerousStuff = (secret: string) => {
  console.log(secret);
  return secret;
};

const program = Effect.gen(function* () {
  const secretKey = yield* Config.redacted('SECRET_KEY');

  /// ✅ This works
  doSomeDangerousStuff(Redacted.value(secretKey));
});

Effect.runSync(program);
