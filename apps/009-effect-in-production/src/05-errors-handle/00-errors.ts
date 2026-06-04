/* 
## Unexpected errors in effect
When working with software a lot of unexpected situations can happen:

- The server crashes
- The memory is full
- The internet connection suddenly disappears


const main = fetchRequest.pipe(
  Effect.flatMap(jsonResponse),
  Effect.catchTags({
    FetchError: () => Effect.succeed("Fetch error"),
    JsonError: () => Effect.succeed("Json error"),
  })
);
*/
