import { Schema } from 'effect';

const Author = Schema.Struct({
  name: Schema.String,
  age: Schema.Union(Schema.NumberFromString, Schema.Number),
});

const authorDecoded = Schema.decodeSync(Author)({ name: 'John Doe', age: '30' });
const authorDecoded2 = Schema.decodeSync(Author)({ name: 'Jane Doe', age: 25 });

console.log(authorDecoded);
console.log(authorDecoded2);

console.log('\n-----------------\n');

const authorEncoded = Schema.encodeSync(Author)(authorDecoded);
const authorEncoded2 = Schema.encodeSync(Author)(authorDecoded2);

console.log(authorEncoded);
console.log(authorEncoded2);
