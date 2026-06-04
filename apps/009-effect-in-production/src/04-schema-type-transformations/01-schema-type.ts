import { Schema } from 'effect';

const HeightFormat = Schema.Number.pipe(
  Schema.transform(
    Schema.String, // 👈 Transform to a `string`
    {
      decode: (from) => `${from}cm`,
      encode: (to) => Number(to.substring(0, to.length - 2)),
    },
  ),
);

export class Pokemon extends Schema.Class<Pokemon>('Pokemon')({
  id: Schema.Number,
  order: Schema.Number,
  name: Schema.String,
  height: HeightFormat,
  weight: Schema.Number,
}) {}

export type Encoded = typeof HeightFormat.Encoded; // 👈 `number`
export type Decoded = typeof HeightFormat.Type; // 👈 `string`

// 👇 Effect<string, ParseError>
const heightFormat = Schema.decode(HeightFormat)(175);

// 👇 Effect<number, ParseError>
const backToNumber = Schema.encode(HeightFormat)('175cm');

console.log(heightFormat);
console.log(backToNumber);
