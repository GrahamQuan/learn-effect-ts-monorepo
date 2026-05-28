import { Console, Effect } from 'effect';

const print = Console.log('Hello');

// const printingArray = [print, print, print];

const printIfTrue = (check: boolean, toPrint: Effect.Effect<void, never, never>) => {
  if (check) {
    Effect.runSync(toPrint);
  }
};

printIfTrue(true, print);
