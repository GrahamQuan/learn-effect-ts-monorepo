/// Raw JavaScript generator syntax with fetch
function* fetchDemo(): Generator<Promise<unknown>, string, unknown> {
  const response = (yield fetch('https://jsonplaceholder.typicode.com/todos/1')) as Response;
  const data = (yield response.json()) as { title: string };
  return data.title;
}

const iterator = fetchDemo();
const firstStep = iterator.next();

if (!firstStep.done) {
  (firstStep.value as Promise<Response>)
    .then((response) => iterator.next(response).value as Promise<{ title: string }>)
    .then((data) => {
      const finalStep = iterator.next(data);
      console.log({ value: finalStep.value });
    })
    .catch((error) => {
      console.log({ error });
    });
}
