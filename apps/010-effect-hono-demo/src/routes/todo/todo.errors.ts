import { Data } from 'effect';

export class ValidationError extends Data.TaggedError('ValidationError')<
  Readonly<{
    message: string;
    issues?: readonly string[];
  }>
> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<
  Readonly<{
    resource: string;
    id: string;
  }>
> {}

export class DatabaseError extends Data.TaggedError('DatabaseError')<
  Readonly<{
    operation: string;
    cause: unknown;
  }>
> {}

export class CacheMiss extends Data.TaggedError('CacheMiss')<
  Readonly<{
    key: string;
  }>
> {}

export class CacheError extends Data.TaggedError('CacheError')<
  Readonly<{
    operation: string;
    cause: unknown;
  }>
> {}

export class QueueError extends Data.TaggedError('QueueError')<
  Readonly<{
    operation: string;
    cause: unknown;
  }>
> {}

export type AppError = ValidationError | NotFoundError | DatabaseError | CacheError | QueueError;
