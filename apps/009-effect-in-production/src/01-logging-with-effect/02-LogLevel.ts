import { Effect, Logger, LogLevel } from 'effect';

const main = Effect.logInfo('Hello world');

Effect.runSync(Logger.withMinimumLogLevel(main, LogLevel.Error));
