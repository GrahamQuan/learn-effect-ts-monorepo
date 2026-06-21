import { Effect } from 'effect';
import type { Context as HonoContext } from 'hono';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppError } from '@/routes/todo/todo.errors';
import { ValidationError } from '@/routes/todo/todo.errors';
import { decodeCreateTodoInput, decodeTodoId, decodeUpdateTodoInput } from '@/routes/todo/todo.schema';
import { TodoService } from '@/routes/todo/todo.service';
import { AppRuntime } from '@/runtime';

export type TodoRoutePrepareError = AppError;

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
const created = (body: unknown): HttpResult => ({ status: 201, body });

const appErrorToHttp = (error: AppError): HttpResult => {
  switch (error._tag) {
    case 'ValidationError':
      return { status: 400, body: { error: error._tag, message: error.message, issues: error.issues ?? [] } };
    case 'NotFoundError':
      return { status: 404, body: { error: error._tag, message: `${error.resource} ${error.id} was not found.` } };
    case 'DatabaseError':
      return { status: 503, body: { error: error._tag, message: `Database operation failed: ${error.operation}` } };
    case 'CacheError':
      return { status: 503, body: { error: error._tag, message: `Cache operation failed: ${error.operation}` } };
    case 'QueueError':
      return { status: 503, body: { error: error._tag, message: `Queue operation failed: ${error.operation}` } };
  }
};

const runTodoRoute = async <A>(
  c: HonoContext,
  program: Effect.Effect<A, AppError, TodoService>,
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

const prepareStorage = Effect.gen(function* () {
  const todos = yield* TodoService;
  yield* todos.ensureStorage;
});

export const prepareTodoRoute: Effect.Effect<void, TodoRoutePrepareError, TodoService> = prepareStorage;

export const todoRoute = new Hono();

todoRoute.get('/', (c) =>
  c.json({
    name: '010-effect-hono-demo',
    routes: ['GET /api/health', 'GET /api/learning/effect-map', 'GET /api/todos', 'POST /api/todos'],
  }),
);

todoRoute.get('/health', (c) => runTodoRoute(c, Effect.succeed('ok')));

todoRoute.get('/learning/effect-map', (c) =>
  runTodoRoute(
    c,
    Effect.succeed([
      { concept: 'Effect.succeed', where: 'Health route and validation success branch.' },
      { concept: 'Effect.fail', where: 'Validation and not-found branches.' },
      { concept: 'Effect.sync', where: 'UUID/date creation and best-effort logging.' },
      { concept: 'Effect.tryPromise', where: 'HTTP body parsing, Drizzle, Redis, and BullMQ calls.' },
      { concept: 'Effect.gen', where: 'Service methods that sequence real app steps.' },
      { concept: 'Effect.all', where: 'Cache invalidation and queue publishing after mutations.' },
      { concept: 'Effect.catchTag', where: 'Cache miss/cache error fallback to Postgres.' },
      { concept: 'Effect.catchAll', where: 'Best-effort cache and queue side effects.' },
      { concept: 'Effect.match', where: 'Route adapter converts typed failures into HTTP responses.' },
      { concept: 'Effect.runPromise', where: 'Hono route adapter and server startup.' },
      { concept: 'Data.TaggedError', where: 'Typed application errors in routes/todo/todo.errors.ts.' },
      { concept: 'Schema', where: 'Request and response validation in routes/todo/todo.schema.ts.' },
      { concept: 'Context', where: 'Services are requested by tag, not imported directly.' },
      { concept: 'Layer', where: 'runtime.ts wires app infra; routes/todo/todo.runtime.ts wires the todo feature.' },
      { concept: 'Scope', where: 'DB pool, Redis, and BullMQ Queue are acquired once and released on shutdown.' },
      { concept: 'ManagedRuntime', where: 'AppRuntime is shared by all routes and owns scoped resources.' },
      { concept: 'Config', where: 'lib/env.ts reads PORT, DATABASE_URL, and CACHE_URL.' },
    ]),
  ),
);

todoRoute.get('/todos', (c) =>
  runTodoRoute(
    c,
    Effect.gen(function* () {
      const todos = yield* TodoService;
      return yield* todos.list;
    }),
  ),
);

todoRoute.post('/todos', (c) =>
  runTodoRoute(
    c,
    Effect.gen(function* () {
      const body = yield* jsonBody(c);
      const input = yield* decodeCreateTodoInput(body);
      const todos = yield* TodoService;

      return yield* todos.create(input);
    }),
    created,
  ),
);

todoRoute.get('/todos/:id', (c) =>
  runTodoRoute(
    c,
    Effect.gen(function* () {
      const id = yield* decodeTodoId(c.req.param('id'));
      const todos = yield* TodoService;

      return yield* todos.getById(id);
    }),
  ),
);

todoRoute.patch('/todos/:id', (c) =>
  runTodoRoute(
    c,
    Effect.gen(function* () {
      const id = yield* decodeTodoId(c.req.param('id'));
      const body = yield* jsonBody(c);
      const input = yield* decodeUpdateTodoInput(body);
      const todos = yield* TodoService;

      return yield* todos.update(id, input);
    }),
  ),
);

todoRoute.delete('/todos/:id', (c) =>
  runTodoRoute(
    c,
    Effect.gen(function* () {
      const id = yield* decodeTodoId(c.req.param('id'));
      const todos = yield* TodoService;

      return yield* todos.remove(id);
    }),
  ),
);
