import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/config';
import { NotFoundError, RepositoryError } from '@/imports/import.errors';
import { decodeImportRecords, ImportRecord, type ImportResult } from '@/imports/import.schema';

export interface ImportRepository {
  readonly nextId: Effect.Effect<string>;
  readonly listRecent: (limit: number) => Effect.Effect<readonly ImportRecord[], RepositoryError>;
  readonly findById: (id: string) => Effect.Effect<ImportRecord, RepositoryError | NotFoundError>;
  readonly create: (record: ImportRecord) => Effect.Effect<ImportRecord, RepositoryError>;
  readonly markProcessing: (id: string, now: string) => Effect.Effect<ImportRecord, RepositoryError | NotFoundError>;
  readonly markCompleted: (
    id: string,
    result: ImportResult,
    now: string,
  ) => Effect.Effect<ImportRecord, RepositoryError | NotFoundError>;
  readonly markFailed: (
    id: string,
    reason: string,
    now: string,
  ) => Effect.Effect<ImportRecord, RepositoryError | NotFoundError>;
}

export const ImportRepository = Context.GenericTag<ImportRepository>('012-url-import-demo/imports/ImportRepository');

const notFound = (id: string) => new NotFoundError({ resource: 'import', id });

const toRepositoryError = (operation: string, cause: unknown) => new RepositoryError({ operation, cause });

const isNoEntryError = (cause: unknown) =>
  typeof cause === 'object' &&
  cause !== null &&
  'code' in cause &&
  (cause as { readonly code?: unknown }).code === 'ENOENT';

const sortRecent = (records: readonly ImportRecord[]) =>
  [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

const replaceRecord = (
  records: readonly ImportRecord[],
  id: string,
  update: (record: ImportRecord) => ImportRecord,
): Effect.Effect<readonly ImportRecord[], NotFoundError> => {
  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    return Effect.fail(notFound(id));
  }

  const current = records[index];

  if (current === undefined) {
    return Effect.fail(notFound(id));
  }

  const next = [...records];
  next[index] = update(current);

  return Effect.succeed(next);
};

const makeFileRepository = (storePath: string): ImportRepository => {
  const readRecords = Effect.tryPromise({
    try: () => readFile(storePath, 'utf8'),
    catch: (cause) => cause,
  }).pipe(
    Effect.catchAll((cause) => {
      if (isNoEntryError(cause)) {
        return Effect.succeed('[]');
      }

      return Effect.fail(toRepositoryError('read imports file', cause));
    }),
    Effect.flatMap((raw) =>
      Effect.try({
        try: () => JSON.parse(raw) as unknown,
        catch: (cause) => toRepositoryError('parse imports file', cause),
      }),
    ),
    Effect.flatMap((json) =>
      decodeImportRecords(json).pipe(Effect.mapError((cause) => toRepositoryError('decode imports file', cause))),
    ),
  );

  const writeRecords = (records: readonly ImportRecord[]) =>
    Effect.tryPromise({
      try: async () => {
        await mkdir(dirname(storePath), { recursive: true });
        await writeFile(storePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
      },
      catch: (cause) => toRepositoryError('write imports file', cause),
    });

  const updateRecord = (
    id: string,
    update: (record: ImportRecord) => ImportRecord,
  ): Effect.Effect<ImportRecord, RepositoryError | NotFoundError> =>
    Effect.gen(function* () {
      const records = yield* readRecords;
      const next = yield* replaceRecord(records, id, update);
      yield* writeRecords(next);

      return yield* Effect.succeed(next.find((record) => record.id === id) as ImportRecord);
    });

  return {
    nextId: Effect.sync(() => randomUUID()),
    listRecent: (limit) => readRecords.pipe(Effect.map((records) => sortRecent(records).slice(0, limit))),
    findById: (id) =>
      readRecords.pipe(
        Effect.flatMap((records) => {
          const record = records.find((candidate) => candidate.id === id);
          return record === undefined ? Effect.fail(notFound(id)) : Effect.succeed(record);
        }),
      ),
    create: (record) =>
      Effect.gen(function* () {
        const records = yield* readRecords;
        const next = [record, ...records.filter((candidate) => candidate.id !== record.id)];
        yield* writeRecords(next);

        return record;
      }),
    markProcessing: (id, now) =>
      updateRecord(
        id,
        (record) =>
          new ImportRecord({
            ...record,
            status: 'processing',
            startedAt: record.startedAt ?? now,
            updatedAt: now,
            error: undefined,
          }),
      ),
    markCompleted: (id, result, now) =>
      updateRecord(
        id,
        (record) =>
          new ImportRecord({
            ...record,
            status: 'completed',
            result,
            completedAt: now,
            updatedAt: now,
            error: undefined,
          }),
      ),
    markFailed: (id, reason, now) =>
      updateRecord(
        id,
        (record) =>
          new ImportRecord({
            ...record,
            status: 'failed',
            failedAt: now,
            updatedAt: now,
            error: reason,
          }),
      ),
  };
};

export const ImportRepositoryFileLive = Layer.effect(
  ImportRepository,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    return makeFileRepository(config.storePath);
  }),
);

export const makeImportRepositoryMemoryLive = (seed: readonly ImportRecord[] = []) =>
  Layer.effect(
    ImportRepository,
    Effect.sync(() => {
      let records = [...seed];

      const updateRecord = (
        id: string,
        update: (record: ImportRecord) => ImportRecord,
      ): Effect.Effect<ImportRecord, NotFoundError> =>
        Effect.suspend(() => {
          const index = records.findIndex((record) => record.id === id);
          const current = records[index];

          if (current === undefined) {
            return Effect.fail(notFound(id));
          }

          return Effect.sync(() => {
            const next = update(current);
            records = [...records.slice(0, index), next, ...records.slice(index + 1)];

            return next;
          });
        });

      return {
        nextId: Effect.sync(() => randomUUID()),
        listRecent: (limit) => Effect.sync(() => sortRecent(records).slice(0, limit)),
        findById: (id) =>
          Effect.sync(() => records.find((record) => record.id === id)).pipe(
            Effect.flatMap((record) => (record === undefined ? Effect.fail(notFound(id)) : Effect.succeed(record))),
          ),
        create: (record) =>
          Effect.sync(() => {
            records = [record, ...records.filter((candidate) => candidate.id !== record.id)];
            return record;
          }),
        markProcessing: (id, now) =>
          updateRecord(
            id,
            (record) =>
              new ImportRecord({
                ...record,
                status: 'processing',
                startedAt: record.startedAt ?? now,
                updatedAt: now,
                error: undefined,
              }),
          ),
        markCompleted: (id, result, now) =>
          updateRecord(
            id,
            (record) =>
              new ImportRecord({
                ...record,
                status: 'completed',
                result,
                completedAt: now,
                updatedAt: now,
                error: undefined,
              }),
          ),
        markFailed: (id, reason, now) =>
          updateRecord(
            id,
            (record) =>
              new ImportRecord({
                ...record,
                status: 'failed',
                failedAt: now,
                updatedAt: now,
                error: reason,
              }),
          ),
      };
    }),
  );
