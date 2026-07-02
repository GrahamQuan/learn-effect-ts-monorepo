import { Worker } from 'bullmq';
import { Effect } from 'effect';

import { loadEnv } from '@/config';
import { QueueError } from '@/imports/import.errors';
import { decodeImportJobPayload } from '@/imports/import.schema';
import { ImportService } from '@/imports/import.service';
import { connectionFromRedisUrl } from '@/infra/bullmq';
import { AppRuntime } from '@/runtime';

export const makeImportWorker = Effect.acquireRelease(
  Effect.gen(function* () {
    const config = yield* loadEnv;

    const worker = new Worker<unknown>(
      config.queueName,
      async (job) => {
        await AppRuntime.runPromise(
          Effect.gen(function* () {
            const payload = yield* decodeImportJobPayload(job.data);
            const imports = yield* ImportService;

            return yield* imports.processImport(payload);
          }),
        );
      },
      {
        connection: connectionFromRedisUrl(config.redisUrl),
        concurrency: config.workerConcurrency,
      },
    );

    worker.on('completed', (job) => {
      console.log(`[worker] completed job ${job.id ?? 'unknown'}`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[worker] failed job ${job?.id ?? 'unknown'}:`, error);
    });

    yield* Effect.tryPromise({
      try: () => worker.waitUntilReady(),
      catch: (cause) => new QueueError({ operation: 'start import worker', cause }),
    });

    console.log(`[worker] listening on queue "${config.queueName}"`);

    return worker;
  }),
  (worker) => Effect.tryPromise(() => worker.close()).pipe(Effect.ignoreLogged),
);
