import { Effect, Layer } from 'effect';
import { expect, it } from 'vitest';
import { FetchError, ProcessingError } from '@/imports/import.errors';
import { ArticleExtractor } from '@/imports/import.extractor';
import { UrlFetcher } from '@/imports/import.fetcher';
import { TextProcessor } from '@/imports/import.processor';
import { ImportQueue } from '@/imports/import.queue';
import { makeImportRepositoryMemoryLive } from '@/imports/import.repository';
import { CreateImportRequest, type ImportJobPayload } from '@/imports/import.schema';
import { ImportService, ImportServiceLive } from '@/imports/import.service';

const makeTestLayer = (
  publishedJobs: ImportJobPayload[],
  fetchHtml = '<title>Effect article</title><main>Hello Effect workers and queues.</main>',
) => {
  const QueueTest = Layer.succeed(ImportQueue, {
    publish: (payload) =>
      Effect.sync(() => {
        publishedJobs.push(payload);
      }),
  });

  const FetcherTest = Layer.succeed(UrlFetcher, {
    fetch: () => Effect.succeed(fetchHtml),
  });

  const ExtractorTest = Layer.succeed(ArticleExtractor, {
    extract: () =>
      Effect.succeed({
        title: 'Effect article',
        text: 'Effect lets us describe async workflows as values. Workers can run the same service graph as routes.',
      }),
  });

  const ProcessorTest = Layer.succeed(TextProcessor, {
    processChunk: (chunk) =>
      Effect.succeed({
        index: chunk.index,
        summary: `processed:${chunk.text}`,
        wordCount: chunk.text.split(/\s+/).filter(Boolean).length,
      }),
  });

  return ImportServiceLive.pipe(
    Layer.provide(
      Layer.mergeAll(makeImportRepositoryMemoryLive(), QueueTest, FetcherTest, ExtractorTest, ProcessorTest),
    ),
  );
};

it('creates a pending import and publishes a BullMQ payload through the queue service', async () => {
  const publishedJobs: ImportJobPayload[] = [];

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const imports = yield* ImportService;
      const created = yield* imports.create(new CreateImportRequest({ url: 'https://example.com/article' }));
      const status = yield* imports.getById(created.importId);

      return { created, status };
    }).pipe(Effect.provide(makeTestLayer(publishedJobs))),
  );

  expect(result.created.status).toBe('pending');
  expect(result.status.status).toBe('pending');
  expect(publishedJobs).toEqual([{ importId: result.created.importId, url: 'https://example.com/article' }]);
});

it('processes an import job and saves the merged result', async () => {
  const publishedJobs: ImportJobPayload[] = [];

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const imports = yield* ImportService;
      const created = yield* imports.create(new CreateImportRequest({ url: 'https://example.com/effect' }));
      const job = publishedJobs[0];

      if (job === undefined) {
        throw new Error('Expected a queued import job.');
      }

      const record = yield* imports.processImport(job);
      const savedResult = yield* imports.getResult(created.importId);

      return { record, savedResult };
    }).pipe(Effect.provide(makeTestLayer(publishedJobs))),
  );

  expect(result.record.status).toBe('completed');
  expect(result.savedResult.title).toBe('Effect article');
  expect(result.savedResult.summary).toContain('processed:Effect lets us describe async workflows');
});

it('marks the import failed when a workflow dependency fails', async () => {
  const publishedJobs: ImportJobPayload[] = [];
  const QueueTest = Layer.succeed(ImportQueue, {
    publish: (payload: ImportJobPayload) =>
      Effect.sync(() => {
        publishedJobs.push(payload);
      }),
  });
  const FetcherTest = Layer.succeed(UrlFetcher, {
    fetch: (url: string) => Effect.fail(new FetchError({ url, cause: 'network unavailable' })),
  });
  const ExtractorTest = Layer.succeed(ArticleExtractor, {
    extract: () => Effect.die('extractor should not run'),
  });
  const ProcessorTest = Layer.succeed(TextProcessor, {
    processChunk: (chunk) =>
      Effect.fail(new ProcessingError({ chunkIndex: chunk.index, cause: 'processor should not run' })),
  });
  const TestLayer = ImportServiceLive.pipe(
    Layer.provide(
      Layer.mergeAll(makeImportRepositoryMemoryLive(), QueueTest, FetcherTest, ExtractorTest, ProcessorTest),
    ),
  );

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const imports = yield* ImportService;
      const created = yield* imports.create(new CreateImportRequest({ url: 'https://example.com/fail' }));
      const job = publishedJobs[0];

      if (job === undefined) {
        throw new Error('Expected a queued import job.');
      }

      const failed = yield* imports.processImport(job).pipe(Effect.either);
      const status = yield* imports.getById(created.importId);

      return { failed, status };
    }).pipe(Effect.provide(TestLayer)),
  );

  expect(result.failed._tag).toBe('Left');
  expect(result.status.status).toBe('failed');
  expect(result.status.error).toContain('Failed to fetch https://example.com/fail');
});
