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

export class ResultNotReadyError extends Data.TaggedError('ResultNotReadyError')<
  Readonly<{
    importId: string;
    status: ImportStatus;
    reason?: string;
  }>
> {}

export class RepositoryError extends Data.TaggedError('RepositoryError')<
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

export class FetchError extends Data.TaggedError('FetchError')<
  Readonly<{
    url: string;
    cause: unknown;
  }>
> {}

export class ExtractError extends Data.TaggedError('ExtractError')<
  Readonly<{
    url: string;
    cause: unknown;
  }>
> {}

export class ProcessingError extends Data.TaggedError('ProcessingError')<
  Readonly<{
    chunkIndex: number;
    cause: unknown;
  }>
> {}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type AppError =
  | ValidationError
  | NotFoundError
  | ResultNotReadyError
  | RepositoryError
  | QueueError
  | FetchError
  | ExtractError
  | ProcessingError;

export const appErrorMessage = (error: AppError) => {
  switch (error._tag) {
    case 'ValidationError':
      return error.message;
    case 'NotFoundError':
      return `${error.resource} ${error.id} was not found.`;
    case 'ResultNotReadyError':
      return `Import ${error.importId} is ${error.status}; no result is available yet.`;
    case 'RepositoryError':
      return `Repository operation failed: ${error.operation}`;
    case 'QueueError':
      return `Queue operation failed: ${error.operation}`;
    case 'FetchError':
      return `Failed to fetch ${error.url}`;
    case 'ExtractError':
      return `Failed to extract article text from ${error.url}`;
    case 'ProcessingError':
      return `Failed to process chunk ${error.chunkIndex}`;
  }
};
