import { Schema } from 'effect';

/** Schema definition **/
export class Pokemon extends Schema.Class<Pokemon>('Pokemon')({
  id: Schema.Number,
  order: Schema.Number,
  name: Schema.String,
  height: Schema.Number,
  weight: Schema.Number,
}) {}
