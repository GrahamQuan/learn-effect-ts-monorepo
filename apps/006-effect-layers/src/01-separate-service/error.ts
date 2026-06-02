import { Data } from 'effect';

/** Errors **/
export class FetchError extends Data.TaggedError('FetchError')<{}> {}
export class JsonError extends Data.TaggedError('JsonError')<{}> {}
