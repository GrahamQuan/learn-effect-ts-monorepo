import { Console, Effect } from 'effect';

const main1 = Console.log('Hello world');
const main2 = Effect.log('Hello world');

console.log('Console.log');
Effect.runSync(main1);

console.log('\n--------------------------------\n');

console.log('Effect.log');
Effect.runSync(main2);
