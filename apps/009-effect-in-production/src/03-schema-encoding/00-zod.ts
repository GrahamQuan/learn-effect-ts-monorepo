import { z } from 'zod';

const Author = z.object({
  name: z.string(),
  age: z
    .string()
    .or(z.number())
    .transform((age) => (typeof age === 'string' ? Number(age) : age)),
});

const author = Author.parse({ name: 'John Doe', age: '30' });
const author2 = Author.parse({ name: 'Jane Doe', age: 25 });

console.log(author);
console.log(author2);
