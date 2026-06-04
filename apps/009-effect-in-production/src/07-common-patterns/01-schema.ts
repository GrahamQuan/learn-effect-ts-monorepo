/* 

import { Schema } from 'effect';
import { Language, Library } from './shared';

export class MetadataCourse extends Schema.Class<MetadataCourse>('MetadataCourse')({
  title: Schema.NonEmpty,
  description: Schema.String,
  githubUrl: Schema.TemplateLiteral('https://github.com/', Schema.String),
  languages: Schema.NonEmptyArray(Language),
  libraries: Schema.Array(Library),
  updatedAt: Schema.DateFromString,
}) {}


*/
