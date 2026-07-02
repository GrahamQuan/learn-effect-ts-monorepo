import { Effect, Schema } from 'effect';

import type { ImportStatus } from '@/imports/import.errors';
import { ValidationError } from '@/imports/import.errors';

const isHttpUrl = (input: string) => {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const HttpUrl = Schema.String.pipe(Schema.nonEmptyString(), Schema.filter(isHttpUrl));

export class CreateImportRequest extends Schema.Class<CreateImportRequest>('CreateImportRequest')({
  url: HttpUrl,
}) {}

export class CreateImportResponse extends Schema.Class<CreateImportResponse>('CreateImportResponse')({
  importId: Schema.UUID,
  status: Schema.Literal('pending'),
  statusUrl: Schema.String,
  resultUrl: Schema.String,
}) {}

export class ImportJobPayload extends Schema.Class<ImportJobPayload>('ImportJobPayload')({
  importId: Schema.UUID,
  url: HttpUrl,
}) {}

export class ImportResult extends Schema.Class<ImportResult>('ImportResult')({
  importId: Schema.UUID,
  url: HttpUrl,
  title: Schema.String,
  summary: Schema.String,
  chunks: Schema.Array(Schema.String),
  wordCount: Schema.Number,
  processedAt: Schema.String,
}) {}

export class ImportRecord extends Schema.Class<ImportRecord>('ImportRecord')({
  id: Schema.UUID,
  url: HttpUrl,
  status: Schema.Literal('pending', 'processing', 'completed', 'failed'),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  failedAt: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  result: Schema.optional(ImportResult),
}) {}

export class ImportStatusResponse extends Schema.Class<ImportStatusResponse>('ImportStatusResponse')({
  id: Schema.UUID,
  url: HttpUrl,
  status: Schema.Literal('pending', 'processing', 'completed', 'failed'),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  failedAt: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
}) {}

export const statusResponseFromRecord = (record: ImportRecord) =>
  new ImportStatusResponse({
    id: record.id,
    url: record.url,
    status: record.status as ImportStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    failedAt: record.failedAt,
    error: record.error,
  });

const validationError = (message: string, cause: unknown) =>
  new ValidationError({
    message,
    issues: [String(cause)],
  });

export const decodeCreateImportRequest = (input: unknown) =>
  Schema.decodeUnknown(CreateImportRequest)(input).pipe(
    Effect.mapError((cause) =>
      validationError('Invalid create import body. Expected { "url": "https://..." }.', cause),
    ),
  );

export const decodeImportId = (input: unknown) =>
  Schema.decodeUnknown(Schema.UUID)(input).pipe(
    Effect.mapError((cause) => validationError('Import id must be a UUID.', cause)),
  );

export const decodeImportJobPayload = (input: unknown) =>
  Schema.decodeUnknown(ImportJobPayload)(input).pipe(
    Effect.mapError((cause) => validationError('Invalid import job payload.', cause)),
  );

export const decodeImportRecords = (input: unknown) => Schema.decodeUnknown(Schema.Array(ImportRecord))(input);
