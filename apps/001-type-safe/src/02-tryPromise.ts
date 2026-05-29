import { Effect } from 'effect';

/// Effect<Response, UnknownException>
const fetchRequest = Effect.tryPromise(() => fetch('https://pokeapi.co/api/v2/pokemon/garchomp/'));

/// Effect<Response, UnknownException>
const jsonResponse = (response: Response) => Effect.promise(() => response.json());

/// Effect<Response, UnknownException>
const main = Effect.flatMap(fetchRequest, jsonResponse);

Effect.runPromise(main).then(console.log).catch(console.error);
