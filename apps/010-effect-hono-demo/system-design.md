# System Design

This note describes the `apps/010-effect-hono-demo` TODO app as an Effect TS learning system.

## Goal

The app is designed to show how a real Hono API can be built around Effect concepts:

- typed workflows with `Effect`
- typed failures with `Data.TaggedError`
- request validation with `Schema`
- dependency injection with `Context`
- implementation wiring with `Layer`
- resource safety with `Layer.scoped`, `Scope`, and `Effect.acquireRelease`
- app-owned execution with `ManagedRuntime`
- boundary execution with `Effect.runPromise`

The main learning goal is not only "make CRUD work". The goal is to make every
important boundary visible:

```txt
HTTP boundary
  Hono request and response

Validation boundary
  unknown input -> typed data

Business workflow boundary
  route code -> TodoService

Infrastructure boundary
  service code -> database/cache/queue capabilities

Runtime boundary
  Effect value -> Promise used by Hono / Node

Lifetime boundary
  app startup -> scoped infra acquisition -> app shutdown cleanup
```

## High Level Design

```txt
The app is split into four levels:

1. App shell
   src/app.ts
   src/index.ts
   src/runtime.ts

2. Shared infrastructure
   src/infra/database.ts
   src/infra/redis.ts
   src/infra/mq.ts

3. SQL table schema
   src/db/schema/index.ts
   src/db/schema/todo.sql.ts

4. Feature route
   src/routes/index.ts
   src/routes/todo/todo.route.ts
   src/routes/todo/todo.service.ts
   src/routes/todo/todo.repository.ts
   src/routes/todo/todo.cache.ts
   src/routes/todo/todo.queue.ts
   src/routes/todo/todo.schema.ts
   src/routes/todo/todo.errors.ts
   src/routes/todo/todo.runtime.ts
```

```txt
App shell:
  knows how to build Hono
  knows how to mount the route registry
  does not know todo business rules

Node entrypoint:
  src/index.ts is Node.js for now
  it loads config, prepares routes through AppRuntime, and starts @hono/node-server
  it disposes AppRuntime on shutdown

App runtime:
  src/runtime.ts owns the app-level ManagedRuntime
  composes shared infra layers with feature layers
  gives scoped resources app lifetime instead of request lifetime

Future runtime adapters:
  can reuse createApp() from src/app.ts
  should not need to change route modules

Infra:
  knows how to create and release database, Redis, and queue resources
  does not know todo business rules

DB schema:
  knows SQL table shape
  can be reused by repositories and future migrations

Todo feature:
  knows todo routes, validation, and workflows
  asks for infra through Context tags
  contributes TodoLayer to the app runtime
```

## Request Workflow

```txt
Client / Bruno / curl
        |
        v
Hono app
  apps/010-effect-hono-demo/src/app.ts
        |
        v
Todo route module
  routes/todo/todo.route.ts
        |
        | 1. Read params / JSON body
        | 2. Decode input with Schema
        | 3. Ask Context for TodoService
        | 4. Run workflow through AppRuntime
        v
Effect workflow
  Effect.gen(...)
        |
        v
TodoService
  routes/todo/todo.service.ts
        |
        +--------------------+
        |                    |
        v                    v
TodoRepository          TodoCache
  Postgres              Redis
        |
        v
Drizzle + Neon Pool

Mutation side effect:

TodoService
        |
        v
TodoEventQueue
        |
        v
BullMQ / Redis queue
```

## App And Node Entrypoint

```txt
src/app.ts
  createApp()
    -> creates Hono app
    -> mounts routes
    -> returns app
```

```txt
src/index.ts
  Node.js entrypoint

  does:
    loadEnv
    AppRuntime.runPromise(prepareRoutes)
    serve({ fetch: app.fetch, port })
    register SIGINT / SIGTERM shutdown

  useful for:
    local dev
    plain Node deployment
```

## Node Startup Workflow

```txt
node src/index.ts
        |
        v
loadEnv
  Config reads:
    PORT
    DATABASE_URL
    DATABASE_POOL_MAX
    DATABASE_POOL_IDLE_TIMEOUT_MS
    DATABASE_POOL_MAX_LIFETIME_SECONDS
    CACHE_URL
        |
        v
AppRuntime.runPromise(prepareRoutes)
  src/runtime.ts
        |
        v
AppLayer acquisition
  acquire DB pool
  acquire Redis client
  acquire BullMQ queue
        |
        v
prepareRoutes
  src/routes/index.ts
        |
        v
route module prepare effects
        |
        v
prepareTodoRoute
  asks for TodoService from AppRuntime
        |
        v
TodoRepository.ensureSchema
        |
        v
create table if not exists todos (...)
        |
        v
serve Hono app on PORT
```

## App Runtime And Resource Lifetime

The app uses one shared `ManagedRuntime`:

```txt
src/runtime.ts

InfraLive
  AppConfigLive
    -> DatabaseLive
    -> RedisLive
    -> QueueLive

FeatureLive
  TodoLayer

AppLayer
  FeatureLive provided by InfraLive

AppRuntime
  ManagedRuntime.make(AppLayer)
```

This is the production-like lifetime model:

```txt
Node process starts
        |
        v
AppRuntime is created
        |
        v
First AppRuntime.runPromise(...)
        |
        v
Scoped layers acquire resources
  DB pool
  Redis client
  BullMQ queue
        |
        v
Many HTTP requests run small Effects
        |
        v
SIGINT / SIGTERM / startup failure
        |
        v
AppRuntime.disposeEffect
        |
        v
Scoped finalizers run
  pool.end()
  redis.quit()
  queue.close()
```

Important idea:

```txt
Request Effects are short-lived.
AppRuntime is long-lived.
Scoped infra resources live with AppRuntime, not with one request.
```

Scoped resource summary:

```txt
DatabaseLive
  acquire: new Pool(...)
  release: pool.end()
  lifetime: AppRuntime

RedisLive
  acquire: new Redis(...)
  release: redis.quit()
  lifetime: AppRuntime

TodoEventQueueLive
  acquire: QueueFactory.makeQueue("todo-events")
  release: queue.close()
  lifetime: AppRuntime

QueueLive
  acquire: parse CACHE_URL into connection options
  release: none
  lifetime: ordinary Layer value
```

## Future Runtime Adapter Shape

```txt
src/runtimes/serverless.ts
  import { createApp } from '@/app'
  import { AppRuntime } from '@/runtime'

  create an app with lazy preparation
  export app.fetch

Important:
  route code should not change
  app.ts should remain reusable
  only the runtime adapter changes
```

## Route Adapter Pattern

Each Hono route creates an Effect workflow, then the route adapter runs it.

```txt
Hono handler
  receives c
        |
        v
build an Effect
  Effect.gen(...)
        |
        v
AppRuntime.runPromise(
  effect.pipe(
    Effect.match({
      onFailure: appErrorToHttp,
      onSuccess: ok
    })
  )
)
        |
        v
return c.json(body, status)
```

This is the boundary between the Promise world and the Effect world:

```txt
Inside app:
  Effect<A, AppError, TodoService>

At Hono boundary:
  Promise<Response>
```

The route adapter is important because Hono does not understand typed Effect
errors by itself. The adapter converts the Effect result into an HTTP response.

## Validation Flow

```txt
HTTP body / route param
        |
        v
unknown value
        |
        v
Schema.decodeUnknown(...)
        |
        +-------------------------+
        |                         |
        v                         v
typed value                  ValidationError
CreateTodoInput              Data.TaggedError
UpdateTodoInput                    |
UUID string                        v
        |                    HTTP 400
        v
service workflow
```

Important idea:

```txt
Before Schema:
  request data is unknown

After Schema:
  service code receives typed, validated data
```

This keeps validation at the edge. `TodoService` does not need to guess whether
the request body had the right shape.

## CRUD Workflow

```txt
CREATE /api/todos

route
  -> decodeCreateTodoInput(body)
  -> TodoService.create(input)
  -> TodoRepository.create(input)
  -> TodoCache.invalidateById(id)
  -> TodoEventQueue.publish("todo.created")
  -> HTTP 201
```

```txt
LIST /api/todos

route
  -> TodoService.list
  -> TodoCache.getAll
       -> cache hit: return cached todos
       -> CacheMiss: TodoRepository.list
                     -> TodoCache.setAll
                     -> return todos
  -> HTTP 200
```

```txt
GET /api/todos/:id

route
  -> decodeTodoId(param.id)
  -> TodoService.getById(id)
  -> TodoCache.getById(id)
       -> cache hit: return cached todo
       -> CacheMiss: TodoRepository.findById(id)
                     -> TodoCache.setById(todo)
                     -> return todo
  -> HTTP 200 or 404
```

```txt
PATCH /api/todos/:id

route
  -> decodeTodoId(param.id)
  -> decodeUpdateTodoInput(body)
  -> TodoService.update(id, input)
  -> TodoRepository.update(id, input)
  -> TodoCache.invalidateById(id)
  -> TodoEventQueue.publish("todo.updated")
  -> HTTP 200 or 404
```

```txt
DELETE /api/todos/:id

route
  -> decodeTodoId(param.id)
  -> TodoService.remove(id)
  -> TodoRepository.remove(id)
  -> TodoCache.invalidateById(id)
  -> TodoEventQueue.publish("todo.deleted")
  -> HTTP 200 or 404
```

## Read Path Details

The read path uses a cache-aside pattern.

```txt
TodoService.list
        |
        v
TodoCache.getAll
        |
        +-----------------------------+
        |                             |
        v                             v
cache hit                       CacheMiss / CacheError
        |                             |
        v                             v
return todos                 TodoRepository.list
                                      |
                                      v
                              TodoCache.setAll
                                      |
                                      v
                               return todos
```

For detail reads:

```txt
TodoService.getById(id)
        |
        v
TodoCache.getById(id)
        |
        +-----------------------------+
        |                             |
        v                             v
cache hit                       CacheMiss / CacheError
        |                             |
        v                             v
return todo                  TodoRepository.findById(id)
                                      |
                                      +-------------------+
                                      |                   |
                                      v                   v
                                  found todo          NotFoundError
                                      |                   |
                                      v                   v
                              TodoCache.setById       HTTP 404
                                      |
                                      v
                                  return todo
```

Why cache errors fall back to database:

```txt
Redis is useful, but it is not the source of truth.
Postgres is the source of truth.

So a cache miss or cache failure should not break reads if the database works.
```

## Write Path Details

Writes go to Postgres first, then the app performs secondary effects.

```txt
create / update / delete
        |
        v
TodoRepository mutation
  source of truth changes in Postgres
        |
        v
Effect.all(...)
  +-----------------------------+
  |                             |
  v                             v
TodoCache.invalidateById     TodoEventQueue.publish
        |                             |
        v                             v
best-effort                  best-effort
        |
        v
return database result to client
```

The mutation result does not depend on cache or queue success:

```txt
If Postgres write succeeds:
  return success to the client

If cache invalidation fails:
  log warning, keep going

If queue publish fails:
  log warning, keep going
```

This is why `todo.service.ts` uses `Effect.catchAll` in `bestEffort`.

## Error Flow

```txt
Data.TaggedError classes
  ValidationError
  NotFoundError
  DatabaseError
  CacheError
  QueueError
        |
        v
AppError union
        |
        v
Effect<A, AppError, R>
        |
        v
Effect.match
        |
        v
HTTP response
```

HTTP mapping:

```txt
ValidationError -> 400
NotFoundError   -> 404
DatabaseError   -> 503
CacheError      -> 503
QueueError      -> 503
Defect          -> 500
```

There are two categories:

```txt
Expected failures:
  represented by typed errors
  handled by Effect.match

Unexpected defects:
  thrown bugs, impossible states, unhandled runtime errors
  caught by the route adapter catch block
```

## Layer Design

```txt
Shared infrastructure layers
  src/infra/database.ts
    provides Database
    scoped resource: Neon Pool

  src/infra/redis.ts
    provides RedisClient
    scoped resource: ioredis client

  src/infra/mq.ts
    provides QueueFactory
    pure factory from CACHE_URL connection options

Feature layers
  routes/todo/todo.repository.ts
    needs Database
    provides TodoRepository

  routes/todo/todo.cache.ts
    needs RedisClient
    provides TodoCache

  routes/todo/todo.queue.ts
    needs QueueFactory
    provides TodoEventQueue
    scoped resource: BullMQ Queue

  routes/todo/todo.service.ts
    needs TodoRepository + TodoCache + TodoEventQueue
    provides TodoService
```

Layer design answers two questions:

```txt
Context tag:
  What capability does this code need?

Layer:
  How do we build the real implementation for that capability?
```

Example:

```txt
TodoRepository says:
  I need Database

DatabaseLive says:
  I can acquire a Neon Pool from AppConfig
  I can create a Drizzle Database from that Pool
  I know how to release the Pool

AppRuntime says:
  I will connect app infra and feature layers once
  I will keep scoped resources alive while the app is alive
  I will release scoped resources when the app shuts down
```

## Runtime Wiring

```txt
src/runtime.ts

AppConfigLive
        |
        v
InfraLive
  +--> DatabaseLive
  |      acquire Neon Pool
  |
  +--> RedisLive
  |      acquire Redis client
  |
  +--> QueueLive
         build QueueFactory

TodoLayer
  TodoRepositoryLive needs Database
  TodoCacheLive needs RedisClient
  TodoEventQueueLive needs QueueFactory
  TodoServiceLive needs repository/cache/queue

AppLayer
  TodoLayer provided by InfraLive

AppRuntime
  ManagedRuntime.make(AppLayer)

Hono route handlers call AppRuntime.runPromise(...)
```

## Context Dependency Graph

```txt
TodoService
  depends on:
    TodoRepository
    TodoCache
    TodoEventQueue

TodoRepository
  depends on:
    Database

TodoCache
  depends on:
    RedisClient

TodoEventQueue
  depends on:
    QueueFactory

Database
RedisClient
QueueFactory
  depend on:
    AppConfig
```

Flattened view:

```txt
AppConfig
  -> Database
       -> TodoRepository
            -> TodoService

AppConfig
  -> RedisClient
       -> TodoCache
            -> TodoService

AppConfig
  -> QueueFactory
       -> TodoEventQueue
            -> TodoService
```

## Dependency Direction

```txt
Good direction:

route -> service -> repository/cache/queue -> infra

route knows about service
service knows about feature ports
feature ports know about shared infra tags
infra does not know about todo routes
```

```txt
Avoid this direction:

infra -> todo service -> route

Shared infrastructure should stay reusable.
It should not import route-specific code.
```

## Why Infra Is Separate

```txt
If another route is added later:

routes/user/user.repository.ts
  needs Database

routes/user/user.cache.ts
  needs RedisClient

routes/user/user.queue.ts
  needs QueueFactory

The user route can reuse:

src/infra/database.ts
src/infra/redis.ts
src/infra/mq.ts
```

The practical idea:

```txt
DatabaseLive is one shared outlet.
TodoRepository plugs into it.
UserRepository can plug into it too.
```

## Adding Another Route

If a `user` route is added later, it should follow the same route-local pattern.

```txt
src/routes/user
  user.route.ts
  user.service.ts
  user.repository.ts
  user.cache.ts
  user.queue.ts
  user.schema.ts
  user.errors.ts
  user.table.ts
  user.runtime.ts
```

Then add the route module to `src/routes/index.ts`:

```txt
routeModules = [
  todo module,
  user module
]

routes/index.ts handles:
  app route mounting
  route preparation

src/index.ts does not change
```

Then add the user feature layer to `src/runtime.ts`:

```txt
FeatureLive = Layer.mergeAll(
  TodoLayer,
  UserLayer
)
```

This keeps ownership clear:

```txt
routes/index.ts:
  HTTP route mounting and prepare registry

runtime.ts:
  app-level Layer composition and ManagedRuntime ownership
```

The user feature should reuse shared infra:

```txt
user.repository.ts
  needs Database from src/infra/database.ts

user.cache.ts
  needs RedisClient from src/infra/redis.ts

user.queue.ts
  needs QueueFactory from src/infra/mq.ts
```

The new route should not create a new database client directly:

```txt
Avoid:

user.repository.ts
  new Neon client
  new Redis client
  new Queue(...)

Prefer:

user.repository.ts
  yield* Database

user.cache.ts
  yield* RedisClient

user.queue.ts
  yield* QueueFactory
```

## Drizzle Database Style

This demo uses Drizzle ORM with the Neon serverless Pool driver.

```txt
Connection style:

DATABASE_URL
    |
    v
new Pool({
  connectionString: DATABASE_URL,
  max: DATABASE_POOL_MAX,
  idleTimeoutMillis: DATABASE_POOL_IDLE_TIMEOUT_MS,
  maxLifetimeSeconds: DATABASE_POOL_MAX_LIFETIME_SECONDS
})
    |
    v
drizzle(pool)
    |
    v
DatabaseLive provides Database
  db: Drizzle client
  pool: Neon Pool
```

The pool is an app-scoped resource:

```txt
Acquire:
  new Pool(...)

Use:
  many requests share the Drizzle client backed by the pool

Release:
  pool.end()
```

SQL table definitions live in one folder:

```txt
src/db/schema
  index.ts
  todo.sql.ts
```

Repositories should use Drizzle's SQL-builder API:

```txt
Prefer:

db.select().from(todos)
db.select().from(todos).where(eq(todos.id, id)).limit(1)
db.insert(todos).values(...).returning()
db.update(todos).set(...).where(...).returning()
db.delete(todos).where(...).returning()
```

Do not use Drizzle's relational query API in this demo:

```txt
Avoid:

db.query.todos.findMany()
db.query.todos.findFirst()
```

Why:

```txt
The SQL-builder style is closer to SQL.
It is easier to learn what query is being sent.
It keeps each repository explicit about table, where, order, and limit.
It also avoids needing a route-specific schema object in the shared DatabaseLive.
```

## Bruno Testing Workflow

```txt
Start server:
  pnpm --filter 010-effect-hono-demo dev

Open Bruno collection:
  apps/010-effect-hono-demo/bruno

Select environment:
  Local

Run requests in order:
  00 Health
  01 Create Todo
  02 List Todos
  03 Get Todo
  04 Update Todo
  05 Delete Todo
  06 Get Deleted Todo
```

State shared by Bruno requests:

```txt
Local environment
  baseUrl = http://localhost:4000
  todoId = set by "01 Create Todo"

01 Create Todo response
        |
        v
script:post-response
  bru.setEnvVar("todoId", body.id)
        |
        v
later requests use:
  {{todoId}}
```

## Effect Concept Map

```txt
Effect.succeed
  used when a workflow already has a successful value

Effect.fail
  used when validation or business logic returns a typed error

Effect.sync
  wraps synchronous side effects like randomUUID(), new Date(), console.warn()

Effect.tryPromise
  wraps async boundaries like Hono body parsing, Drizzle, Redis, BullMQ

Effect.gen
  writes multi-step workflows in direct style

Effect.all
  runs independent mutation side effects together

Effect.acquireRelease
  describes how to acquire a resource and how to release it

Effect.catchTag
  handles one known tagged error, such as CacheMiss

Effect.catchAll
  handles any remaining error, used for best-effort side effects

Effect.match
  converts success/failure into HTTP response data

Effect.runPromise
  runs the Effect at the Hono boundary

Layer.scoped
  builds services that need app-lifetime cleanup

ManagedRuntime
  owns the app Scope and runs request Effects with app services
```

## Source Of Truth

```txt
Postgres:
  source of truth for todos

Redis cache:
  fast read copy
  can be empty
  can be stale briefly
  can fail without breaking database reads

BullMQ queue:
  event side effect after mutations
  useful for async consumers later
  currently best-effort in this demo
```

## Design Tradeoffs

```txt
Current demo choice:
  one AppRuntime in src/runtime.ts

Why it is production-like:
  all route Effects run through one app-owned runtime
  shared infra layers are acquired once
  scoped finalizers run when the runtime is disposed

Tradeoff:
  route modules now import AppRuntime at the HTTP adapter boundary
  feature services still depend on Context tags, not direct infra constructors
```

```txt
Current demo choice:
  DB pool, Redis client, and BullMQ Queue are scoped resources

Why it is production-like:
  long-lived resources are not created per request
  cleanup is explicit and tied to AppRuntime.disposeEffect

Tradeoff:
  startup wiring is a little more complex than plain constructors
  the lifetime model is much clearer for learning real services
```

```txt
Current demo choice:
  startup creates the todos table

Why it is okay here:
  easy learning setup
  no separate migration command needed

Future production direction:
  use migrations
  run migrations separately from app boot
```

```txt
Current demo choice:
  CACHE_URL is used for Redis cache and BullMQ

Why it is okay here:
  existing env source only has one Redis URL

Future production direction:
  CACHE_URL for cache Redis
  QUEUE_REDIS_URL for queue Redis
```

## File Layout

Import alias:

```txt
@/ means apps/010-effect-hono-demo/src/

Examples:
  @/infra/database
  @/db/schema
  @/routes/todo/todo.service
```

```txt
apps/010-effect-hono-demo
  tsconfig.json

  src
    app.ts
    index.ts
    runtime.ts

    lib
      env.ts

    db
      schema
        index.ts
        todo.sql.ts

    infra
      database.ts
      redis.ts
      mq.ts

    routes
      index.ts

      todo
        todo.route.ts
        todo.service.ts
        todo.repository.ts
        todo.cache.ts
        todo.queue.ts
        todo.schema.ts
        todo.errors.ts
        todo.runtime.ts

  bruno
    bruno.json
    environments
      Local.bru
    Todo
      00-health.bru
      01-create-todo.bru
      02-list-todos.bru
      03-get-todo.bru
      04-update-todo.bru
      05-delete-todo.bru
      06-get-deleted-todo.bru
```
