import { Console, Effect } from 'effect';

/// 1️⃣ Define the `main` app
// Effect alone does not execute any logic
const main: Effect.Effect<void, never, never> = Console.log('Hello world');

/// 2️⃣ Execute app
// we need to explicitly call a runXxxx method
Effect.runSync(main);
