import { Chunk, Context, Effect, Layer, Schedule, Stream } from 'effect';

import {
  type AppError,
  appErrorMessage,
  FetchError,
  ProcessingError,
  ResultNotReadyError,
} from '@/imports/import.errors';
import { ArticleExtractor } from '@/imports/import.extractor';
import { UrlFetcher } from '@/imports/import.fetcher';
import { type ProcessedChunk, type TextChunk, TextProcessor } from '@/imports/import.processor';
import { ImportQueue } from '@/imports/import.queue';
import { ImportRepository } from '@/imports/import.repository';
import {
  CreateImportRequest,
  CreateImportResponse,
  ImportJobPayload,
  ImportRecord,
  ImportResult,
  ImportStatusResponse,
  statusResponseFromRecord,
} from '@/imports/import.schema';

export interface ImportService {
  readonly create: (input: CreateImportRequest) => Effect.Effect<CreateImportResponse, AppError>;
  readonly listRecent: Effect.Effect<readonly ImportStatusResponse[], AppError>;
  readonly getById: (id: string) => Effect.Effect<ImportStatusResponse, AppError>;
  readonly getResult: (id: string) => Effect.Effect<ImportResult, AppError>;
  readonly processImport: (payload: ImportJobPayload) => Effect.Effect<ImportRecord, AppError>;
}

export const ImportService = Context.GenericTag<ImportService>('012-url-import-demo/imports/ImportService');

const nowIso = Effect.sync(() => new Date().toISOString());

const splitIntoChunks = (text: string, wordsPerChunk = 80): readonly TextChunk[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: TextChunk[] = [];

  for (let start = 0; start < words.length; start += wordsPerChunk) {
    chunks.push({
      index: chunks.length,
      text: words.slice(start, start + wordsPerChunk).join(' '),
    });
  }

  return chunks;
};

const mergeChunks = (
  payload: ImportJobPayload,
  title: string,
  processedChunks: readonly ProcessedChunk[],
  processedAt: string,
) =>
  new ImportResult({
    importId: payload.importId,
    url: payload.url,
    title,
    summary: processedChunks.map((chunk) => chunk.summary).join('\n\n'),
    chunks: processedChunks.map((chunk) => chunk.summary),
    wordCount: processedChunks.reduce((total, chunk) => total + chunk.wordCount, 0),
    processedAt,
  });

const fetchRetry = Schedule.recurs(2);
const processingRetry = Schedule.recurs(2);

export const ImportServiceLive = Layer.effect(
  ImportService,
  Effect.gen(function* () {
    const repository = yield* ImportRepository;
    const queue = yield* ImportQueue;
    const fetcher = yield* UrlFetcher;
    const extractor = yield* ArticleExtractor;
    const processor = yield* TextProcessor;

    const processChunks = (chunks: readonly TextChunk[]): Effect.Effect<readonly ProcessedChunk[], ProcessingError> =>
      Stream.fromIterable(chunks).pipe(
        Stream.mapEffect((chunk) => processor.processChunk(chunk).pipe(Effect.retry(processingRetry))),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
      );

    return {
      create: (input) =>
        Effect.gen(function* () {
          const id = yield* repository.nextId;
          const createdAt = yield* nowIso;
          const record = new ImportRecord({
            id,
            url: input.url,
            status: 'pending',
            createdAt,
            updatedAt: createdAt,
          });

          yield* repository.create(record);

          const payload = new ImportJobPayload({ importId: record.id, url: record.url });

          yield* queue
            .publish(payload)
            .pipe(
              Effect.tapError((error) =>
                nowIso.pipe(
                  Effect.flatMap((failedAt) =>
                    repository.markFailed(record.id, appErrorMessage(error), failedAt).pipe(Effect.ignore),
                  ),
                ),
              ),
            );

          return new CreateImportResponse({
            importId: record.id,
            status: 'pending',
            statusUrl: `/imports/${record.id}`,
            resultUrl: `/imports/${record.id}/result`,
          });
        }),
      listRecent: repository.listRecent(20).pipe(Effect.map((records) => records.map(statusResponseFromRecord))),
      getById: (id) => repository.findById(id).pipe(Effect.map(statusResponseFromRecord)),
      getResult: (id) =>
        repository.findById(id).pipe(
          Effect.flatMap((record) =>
            record.status === 'completed' && record.result !== undefined
              ? Effect.succeed(record.result)
              : Effect.fail(
                  new ResultNotReadyError({
                    importId: id,
                    status: record.status,
                    reason: record.error,
                  }),
                ),
          ),
        ),
      processImport: (payload) => {
        const workflow = Effect.gen(function* () {
          const startedAt = yield* nowIso;
          yield* repository.markProcessing(payload.importId, startedAt);

          const html = yield* fetcher.fetch(payload.url).pipe(
            Effect.retry(fetchRetry),
            Effect.mapError((error) => new FetchError({ url: payload.url, cause: error.cause })),
          );
          const article = yield* extractor.extract(html, payload.url);
          const chunks = splitIntoChunks(article.text);
          const processedChunks = yield* processChunks(chunks);
          const processedAt = yield* nowIso;
          const result = mergeChunks(payload, article.title, processedChunks, processedAt);

          return yield* repository.markCompleted(payload.importId, result, processedAt);
        });

        return workflow.pipe(
          Effect.tapError((error) =>
            nowIso.pipe(
              Effect.flatMap((failedAt) =>
                repository.markFailed(payload.importId, appErrorMessage(error), failedAt).pipe(Effect.ignore),
              ),
            ),
          ),
        );
      },
    };
  }),
);
