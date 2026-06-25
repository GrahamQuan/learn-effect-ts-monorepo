# `010-effect-hono-demo`

## Demo: TODO APP

### Tech Stack
- hono
- effect
- postgres
- drizzle (from neon DB)
    - use SQL-builder style: `db.select().from(table)`
    - do not use relational query style: `db.query.table.findMany()`
- redis (from upstash, redis#1)
    - get all
    - get detail by id
- bullmq (from upstash, redis#2)
    - create
    - update
    - delete

### features
- CRUD
- Request validation with Effect `Schema`
- Typed application errors with `Data.TaggedError`
- Service dependency injection with `Context` and `Layer`
- Runtime wiring with `ManagedRuntime`
- Config loading with Effect `Config`
- Cache-aside reads with Redis
- Best-effort BullMQ events after mutations
- App-scoped DB, Redis, and queue resources with `Layer.scoped`
- Drizzle migrations instead of startup table creation
- Liveness and readiness endpoints
- Service tests with test Layers

The existing env source is used as-is:

- `PORT`
- `DATABASE_URL`
- `CACHE_URL`

Because this practice app currently has one Redis URL, both the cache service and
the BullMQ demo service read `CACHE_URL`. If you later add a second Upstash Redis
instance, the next step would be adding a separate queue config value.

## Run

```bash
pnpm --filter 010-effect-hono-demo db:migrate
pnpm --filter 010-effect-hono-demo dev
```

The dev script uses the Node.js entrypoint at `src/index.ts`.
`src/app.ts` still exports `createApp()` so a future serverless adapter can reuse
the same Hono app without changing route code.

Schema changes are owned by Drizzle migrations. App startup only loads config,
starts Hono, and keeps the shared runtime alive.

## API

- `GET /api/livez`
- `GET /api/readyz`
- `GET /api/health` redirects to `/api/livez`
- `GET /api/learning/effect-map`
- `GET /api/todos`
- `POST /api/todos`
- `GET /api/todos/:id`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`

Example:

```bash
curl -X POST http://localhost:4000/api/todos \
  -H 'content-type: application/json' \
  -d '{"title":"Learn Effect Context and Layer"}'
```

## Bruno

Open `apps/010-effect-hono-demo/bruno` in Bruno and choose the `Local`
environment.

Run the requests in order inside the `Todo CRUD` folder:

1. `00 Livez`
2. `00 Readyz`
3. `01 Create Todo`
4. `02 List Todos`
5. `03 Get Todo`
6. `04 Update Todo`
7. `05 Delete Todo`
8. `06 Get Deleted Todo`

`01 Create Todo` stores the response `id` into the `todoId` environment
variable, so the later requests can reuse it.

## Code layout

This app has its own `tsconfig.json` with:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

So imports can use `@/` as the app `src` root:

```ts
import { Database } from '@/infra/database';
import { todos } from '@/db/schema';
```

Shared infrastructure layers live under `src/infra`:

- `database.ts`
- `redis.ts`
- `mq.ts`

Drizzle SQL table schemas live under `src/db/schema`:

- `todo.sql.ts`

Route modules are registered in `src/routes/index.ts`.

Runtime entrypoints:

- `src/index.ts`: current Node.js server entrypoint
- `src/app.ts`: Hono app factory for future runtimes
- `src/runtime.ts`: app `ManagedRuntime` and Layer wiring

Health-specific code is grouped under `src/routes/health`:

- `health.route.ts`
- `health.service.ts`
- `health.runtime.ts`

Todo-specific code is grouped under `src/routes/todo` with dot-style file names:

- `todo.route.ts`
- `todo.service.ts`
- `todo.repository.ts`
- `todo.schema.ts`
- `todo.errors.ts`
- `todo.cache.ts`
- `todo.queue.ts`
- `todo.runtime.ts`
- `todo.service.test.ts`

Test setup:

- `vitest.config.ts`

## Effect concepts in this demo

- `Effect.succeed`: health route and validation success branch
- `Effect.fail`: validation and not-found branches
- `Effect.sync`: UUID/date creation and best-effort logging
- `Effect.tryPromise`: Hono body parsing, Drizzle, Redis, and BullMQ calls
- `Effect.gen`: readable sequencing for route and service workflows
- `Effect.all`: run mutation side effects together
- `Effect.catchTag`: fallback from cache miss/cache error to Postgres
- `Effect.catchAll`: swallow non-critical cache/queue side-effect failures
- `Effect.match`: convert typed errors into HTTP responses
- `Effect.runPromise`: run Effects from Hono handlers and scripts
- `Data.TaggedError`: typed error classes in `src/routes/todo/todo.errors.ts`
- `Schema`: request and response models in `src/routes/todo/todo.schema.ts`
- `Context`: service tags such as `TodoService`, `TodoRepository`, and `TodoCache`
- `Layer`: infrastructure wiring in `src/infra` and feature wiring in `src/routes/todo/todo.runtime.ts`
- `Layer.scoped`: app-lifetime DB, Redis, and BullMQ resources
- `Layer.succeed`: fake service implementations in tests
- `ManagedRuntime`: one app runtime that owns shared scoped resources
- `Config`: env loading in `src/lib/env.ts`
