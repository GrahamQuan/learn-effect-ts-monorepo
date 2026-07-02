import { Queue } from 'bullmq';
import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/config';
import { QueueError } from '@/imports/import.errors';
import type { ImportJobPayload } from '@/imports/import.schema';
import { connectionFromRedisUrl, defaultJobOptions, IMPORT_JOB_NAME } from '@/infra/bullmq';

export interface ImportQueue {
  readonly publish: (payload: ImportJobPayload) => Effect.Effect<void, QueueError>;
}

export const ImportQueue = Context.GenericTag<ImportQueue>('012-url-import-demo/imports/ImportQueue');

export const ImportQueueLive = Layer.scoped(
  ImportQueue,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const queue = yield* Effect.acquireRelease(
      Effect.sync(
        () => new Queue<ImportJobPayload>(config.queueName, { connection: connectionFromRedisUrl(config.redisUrl) }),
      ),
      (queue) => Effect.tryPromise(() => queue.close()).pipe(Effect.ignoreLogged),
    );

    return {
      publish: (payload) =>
        Effect.tryPromise({
          try: async () => {
            await queue.add(IMPORT_JOB_NAME, payload, defaultJobOptions);
          },
          catch: (cause) =>
            new QueueError({
              operation: 'publish import job',
              cause,
            }),
        }),
    };
  }),
);
