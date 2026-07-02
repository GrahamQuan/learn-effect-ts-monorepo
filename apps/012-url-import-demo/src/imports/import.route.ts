import { Effect } from 'effect';
import type { Context as HonoContext } from 'hono';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppError } from '@/imports/import.errors';
import { ValidationError } from '@/imports/import.errors';
import { decodeCreateImportRequest, decodeImportId } from '@/imports/import.schema';
import { ImportService } from '@/imports/import.service';
import { AppRuntime } from '@/runtime';

type HttpResult = Readonly<{
  status: ContentfulStatusCode;
  body: unknown;
}>;

const jsonBody = (c: HonoContext) =>
  Effect.tryPromise({
    try: () => c.req.json() as Promise<unknown>,
    catch: () => new ValidationError({ message: 'Expected a JSON request body.' }),
  });

const ok = (body: unknown): HttpResult => ({ status: 200, body });
const accepted = (body: unknown): HttpResult => ({ status: 202, body });

const appErrorToHttp = (error: AppError): HttpResult => {
  switch (error._tag) {
    case 'ValidationError':
      return { status: 400, body: { error: error._tag, message: error.message, issues: error.issues ?? [] } };
    case 'NotFoundError':
      return { status: 404, body: { error: error._tag, message: `${error.resource} ${error.id} was not found.` } };
    case 'ResultNotReadyError':
      return {
        status: 409,
        body: { error: error._tag, importId: error.importId, status: error.status, reason: error.reason },
      };
    case 'RepositoryError':
      return { status: 503, body: { error: error._tag, message: `Repository operation failed: ${error.operation}` } };
    case 'QueueError':
      return { status: 503, body: { error: error._tag, message: `Queue operation failed: ${error.operation}` } };
    case 'FetchError':
      return { status: 502, body: { error: error._tag, message: `Fetch failed for ${error.url}` } };
    case 'ExtractError':
      return { status: 422, body: { error: error._tag, message: `Could not extract article text from ${error.url}` } };
    case 'ProcessingError':
      return { status: 422, body: { error: error._tag, message: `Could not process chunk ${error.chunkIndex}` } };
  }
};

const runImportRoute = async <A>(
  c: HonoContext,
  program: Effect.Effect<A, AppError, ImportService>,
  onSuccess: (value: A) => HttpResult = ok,
) => {
  try {
    const result = await AppRuntime.runPromise(
      program.pipe(
        Effect.match({
          onFailure: appErrorToHttp,
          onSuccess,
        }),
      ),
    );

    return c.json(result.body, result.status);
  } catch (cause) {
    return c.json({ error: 'Defect', message: String(cause) }, 500);
  }
};

export const importRoute = new Hono();

importRoute.get('/', (c) =>
  runImportRoute(
    c,
    Effect.gen(function* () {
      const imports = yield* ImportService;
      return yield* imports.listRecent;
    }),
  ),
);

importRoute.post('/', (c) =>
  runImportRoute(
    c,
    Effect.gen(function* () {
      const body = yield* jsonBody(c);
      const input = yield* decodeCreateImportRequest(body);
      const imports = yield* ImportService;

      return yield* imports.create(input);
    }),
    accepted,
  ),
);

importRoute.get('/:id/result', (c) =>
  runImportRoute(
    c,
    Effect.gen(function* () {
      const id = yield* decodeImportId(c.req.param('id'));
      const imports = yield* ImportService;

      return yield* imports.getResult(id);
    }),
  ),
);

importRoute.get('/:id', (c) =>
  runImportRoute(
    c,
    Effect.gen(function* () {
      const id = yield* decodeImportId(c.req.param('id'));
      const imports = yield* ImportService;

      return yield* imports.getById(id);
    }),
  ),
);
