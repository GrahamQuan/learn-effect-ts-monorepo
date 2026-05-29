import { Effect, pipe } from 'effect';

const fetchRequest = Effect.tryPromise(() => fetch('https://pokeapi.co/api/v2/pokemon/garchomp/'));

const jsonResponse = (response: Response) => Effect.promise(() => response.json());

const mainPipe = pipe(fetchRequest, Effect.flatMap(jsonResponse));

Effect.runPromise(mainPipe)
  .then((data) => {
    console.log('mainPipe');
    console.log(data);
    console.log('\n--------------------------------\n');
  })
  .catch(console.error);

const main = fetchRequest.pipe(Effect.flatMap(jsonResponse));

Effect.runPromise(main)
  .then((data) => {
    console.log('main');
    console.log(data);
    console.log('\n--------------------------------\n');
  })
  .catch(console.error);

const num: number = 10;
const numEffect: Effect.Effect<number> = Effect.succeed(num);

const result = Effect.runSync(numEffect);
console.log('numEffect');
console.log(result);
