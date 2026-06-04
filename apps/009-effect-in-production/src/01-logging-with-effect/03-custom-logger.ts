import { Effect, Logger } from 'effect';

const customLogger = Logger.make(({ logLevel, message }) => {
  console.log(`[${logLevel.label}] ${message}`);
});

const loggerLayer = Logger.add(customLogger);

const main = Effect.logInfo('Hello world').pipe(Effect.provide(loggerLayer));

Effect.runSync(main);
