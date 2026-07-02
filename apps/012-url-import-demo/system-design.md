# System Design: 012 URL Import Demo

This demo is a small backend system for learning how Effect TS fits into a real
async workflow.

The app accepts a URL, creates an import job, returns immediately, and lets a
separate worker process the URL in the background.

It is intentionally small, but it uses the same shape as many production
systems:

```txt
HTTP API
-> validate input
-> create a pending record
-> publish a queue job
-> return 202 Accepted

Worker
-> receive job
-> fetch URL
-> extract text
-> process chunks
-> save result
-> mark completed or failed
```

## What This Demo Does

The system imports article-like content from a URL.

From the user's point of view:

1. Send `POST /imports` with a URL.
2. Receive an `importId` immediately.
3. Check `GET /imports/:id` to see the current status.
4. Check `GET /imports/:id/result` to read the final result.

The important design detail is that `POST /imports` does not do the expensive
work. It only creates a job.

That makes this app different from a normal CRUD app:

```txt
CRUD request:
request -> do work now -> response

Async import request:
request -> create job -> response
                 |
                 v
              worker does the slow work later
```

## Why This Demo Exists

This app is meant to connect the Effect TS concepts you already learned:

- `Schema`
- `Data.TaggedError`
- `Context`
- `Layer`
- `Effect.gen`
- `Schedule`
- `Stream`
- `Scope`
- `ManagedRuntime`

The goal is not to use every advanced Effect API. The goal is to show how common
Effect concepts fit together in one backend workflow.

## High-Level Architecture

```txt
Client
  |
  | POST /imports
  v
Hono Route
  |
  | AppRuntime.runPromise(effect)
  v
ImportService.create
  |
  | create pending record
  | publish BullMQ job
  v
Redis / BullMQ
  |
  | worker receives job
  v
ImportService.processImport
  |
  | fetch URL
  | extract article
  | split text into chunks
  | process chunks with Stream
  | save result
  v
File Repository
```

There are two running processes:

1. API process
2. Worker process

They share the same service graph through the same `AppRuntime`, but they enter
the system from different boundaries.

## Main Components

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Starts the Hono API server. |
| `src/worker.ts` | Starts the BullMQ worker process. |
| `src/app.ts` | Creates the Hono app and mounts the import route. |
| `src/runtime.ts` | Builds the shared Effect runtime. |
| `src/config.ts` | Reads environment config with Effect Config. |
| `src/infra/bullmq.ts` | Shared BullMQ job options and Redis connection helper. |
| `src/imports/import.route.ts` | HTTP adapter: decode request, run Effect, map errors to HTTP responses. |
| `src/imports/import.service.ts` | Core application workflow. |
| `src/imports/import.repository.ts` | Stores import records and status transitions. |
| `src/imports/import.queue.ts` | Publishes import jobs to BullMQ. |
| `src/imports/import.worker.ts` | Receives BullMQ jobs and runs the import workflow. |
| `src/imports/import.fetcher.ts` | Fetches HTML from the URL. |
| `src/imports/import.extractor.ts` | Extracts article-like text from HTML. |
| `src/imports/import.processor.ts` | Processes text chunks. |
| `src/imports/import.schema.ts` | Runtime validation and typed data models. |
| `src/imports/import.errors.ts` | Typed application errors. |

## Import State Machine

Each import record moves through a small state machine:

```txt
pending
  |
  v
processing
  |
  | success
  v
completed

processing
  |
  | failure
  v
failed
```

The status matters because the API returns before the work is done.

`GET /imports/:id/result` can only return a result when the import is
`completed`. Before that, the app returns `ResultNotReadyError`.

This is a common backend pattern:

```txt
POST command endpoint
-> creates async work
-> client polls status
-> client reads result later
```

## API Flow

### 1. Create Import

Endpoint:

```txt
POST /imports
```

Request body:

```json
{
  "url": "https://www.cloudflare.com"
}
```

Flow:

```txt
import.route.ts
-> parse JSON body
-> decode with Schema
-> get ImportService from Context
-> run ImportService.create
-> map typed error to HTTP response
```

Service flow:

```txt
ImportService.create
-> generate id
-> create ImportRecord with status "pending"
-> save record through ImportRepository
-> publish ImportJobPayload through ImportQueue
-> return importId, statusUrl, resultUrl
```

Response:

```json
{
  "importId": "uuid",
  "status": "pending",
  "statusUrl": "/imports/uuid",
  "resultUrl": "/imports/uuid/result"
}
```

HTTP status is `202 Accepted`, because the request was accepted but the work is
not finished yet.

### 2. Get Status

Endpoint:

```txt
GET /imports/:id
```

Flow:

```txt
decode id
-> repository.findById
-> convert ImportRecord to ImportStatusResponse
```

Possible statuses:

- `pending`
- `processing`
- `completed`
- `failed`

### 3. Get Result

Endpoint:

```txt
GET /imports/:id/result
```

Flow:

```txt
decode id
-> repository.findById
-> if completed, return result
-> otherwise fail with ResultNotReadyError
```

If the result is not ready, the HTTP response is `409 Conflict`.

That is intentional. It teaches that an Effect can fail with a typed domain
error without crashing the process.

### 4. List Recent Imports

Endpoint:

```txt
GET /imports
```

This returns recent import records without the full result body.

## Worker Flow

The worker is started separately:

```bash
pnpm --filter 012-url-import-demo dev:worker
```

The worker listens to the same BullMQ queue used by the API.

Flow:

```txt
BullMQ Worker receives job
-> decode job payload with Schema
-> get ImportService from Context
-> run ImportService.processImport
```

The job payload looks like:

```json
{
  "importId": "uuid",
  "url": "https://example.com"
}
```

The worker workflow:

```txt
mark import as processing
-> fetch URL with retry
-> extract article text
-> split text into chunks
-> process chunks with Stream
-> merge chunks into ImportResult
-> mark import as completed
```

If any step fails:

```txt
error
-> tapError
-> mark import as failed
-> preserve error reason on the record
```

## How The System Uses Effect TS

### Effect Values

Most functions do not immediately perform work. They return an `Effect`.

For example, a service method has this shape:

```ts
create: (input) => Effect.Effect<CreateImportResponse, AppError>
```

That means:

```txt
This function describes a workflow.
It does not run the workflow by itself.
```

The workflow only runs at the edge:

- Hono route uses `AppRuntime.runPromise(...)`
- BullMQ worker uses `AppRuntime.runPromise(...)`
- server startup uses `AppRuntime.runPromise(...)`

This is an important Effect mental model:

```txt
inside app: build Effect values
at boundary: run Effect values
```

### Schema

`import.schema.ts` validates:

- create request body
- import id
- BullMQ job payload
- stored import records

This means the app does not trust:

- HTTP input
- queue input
- JSON read from disk

Effect Schema turns unknown data into typed data, or returns a typed validation
error.

### Tagged Errors

`import.errors.ts` defines the expected failures:

- `ValidationError`
- `NotFoundError`
- `ResultNotReadyError`
- `RepositoryError`
- `QueueError`
- `FetchError`
- `ExtractError`
- `ProcessingError`

These are not random thrown exceptions. They are part of the Effect type.

That gives the route a clear job:

```txt
AppError -> HTTP response
```

Examples:

```txt
ValidationError -> 400
NotFoundError -> 404
ResultNotReadyError -> 409
QueueError -> 503
FetchError -> 502
ProcessingError -> 422
```

### Context

The service does not directly import concrete implementations.

Instead, it asks for dependencies:

```txt
ImportRepository
ImportQueue
UrlFetcher
ArticleExtractor
TextProcessor
```

This is dependency injection.

The learning point:

```txt
Context describes what a workflow needs.
Layer describes how to provide it.
```

### Layer

Layers wire concrete implementations into the service graph.

The rough graph is:

```txt
AppRuntime
  |
  v
AppLayer
  |
  v
ImportLayer
  |
  +-> ImportServiceLive
        |
        +-> ImportRepositoryFileLive
        +-> ImportQueueLive
        +-> UrlFetcherLive
        +-> ArticleExtractorLive
        +-> TextProcessorLive
```

`AppConfigLive` provides environment config to the layers that need it.

This is why the route can ask only for `ImportService`, while the runtime knows
how to build the whole tree.

### ManagedRuntime

`ManagedRuntime` owns the app's live dependencies.

The API route and the worker both run Effects through `AppRuntime`.

That gives both processes the same dependency wiring:

```txt
API route -> AppRuntime -> ImportService
Worker    -> AppRuntime -> ImportService
```

The difference is the entry point, not the service graph.

### Scope And Resource Safety

BullMQ queues and workers need cleanup.

The app uses scoped resources so that:

- Queue connections are created when the layer is built.
- Queue connections are closed when the runtime is disposed.
- The worker closes when the process receives a shutdown signal.

The learning point:

```txt
Scope is for resource lifetime.
It answers: who opens this thing, and who closes it?
```

### Schedule

The import workflow uses retry schedules for unstable work:

```txt
fetch URL -> retry
process chunk -> retry
```

This is useful because network and background jobs fail in normal production
systems.

The learning point:

```txt
Schedule describes retry behavior as data.
Effect.retry applies that behavior to a workflow.
```

### Stream

The app splits extracted text into chunks, then processes those chunks with
`Stream`.

In this demo, the stream is small and finite:

```txt
array of chunks
-> Stream.fromIterable
-> Stream.mapEffect(process each chunk)
-> Stream.runCollect
```

This is not a real infinite stream. It is a practical way to learn how Stream
can model "many values processed through an Effectful pipeline".

The learning point:

```txt
Effect is one workflow.
Stream is many values flowing through a workflow.
```

## Why Queue Is Important Here

In a normal CRUD app, queue publishing can be a side effect:

```txt
create todo
-> publish todo.created event
```

If the event fails, the todo might still be created.

In this URL import app, the queue is part of the main business flow:

```txt
create import
-> publish job
-> worker processes job
```

If the job is not published, the import will never be processed.

That is the biggest design difference from a simple Hono CRUD app.

## API Process vs Worker Process

The API process handles short requests.

```txt
validate input
create record
publish job
return response
```

The worker process handles slow work.

```txt
fetch network content
process text
write result
handle failure
```

This split is a common production pattern because it keeps HTTP requests fast
and moves unreliable work into a retryable background system.

## Error Handling Model

There are three important error layers:

1. Input errors
2. Business state errors
3. Infrastructure errors

Input errors:

```txt
bad JSON
invalid URL
invalid UUID
```

Business state errors:

```txt
result requested before import is completed
record not found
```

Infrastructure errors:

```txt
Redis failed
file repository failed
fetch failed
processing failed
```

Effect makes these visible in the type of the workflow.

The route then converts them into HTTP responses.

## Runtime Boundary

The route adapter is the main boundary between plain JavaScript and Effect.

Inside Hono:

```txt
HTTP request comes in as normal JS
-> build Effect program
-> AppRuntime.runPromise(program)
-> return HTTP response
```

Inside BullMQ:

```txt
job comes in as normal JS
-> build Effect program
-> AppRuntime.runPromise(program)
-> let BullMQ mark job completed or failed
```

This is the practical pattern:

```txt
framework callback
-> convert to Effect
-> run through runtime
-> convert result back to framework response
```

## Current Demo Limitations

This app is intentionally simple.

Current limitations:

- The repository is file-based, not Postgres.
- The article extractor is simple and not production-grade.
- The text processor is a local demo processor, not an LLM or real summarizer.
- There is no authentication.
- There is no idempotency key.
- There is no progress percentage.
- There is no dashboard for jobs.
- There is no dead-letter queue.
- There is no distributed locking around file writes.

These limits are acceptable for learning because they keep the Effect structure
easy to see.

## Production Improvements

If this became a real app, likely improvements would include:

- Replace file repository with Postgres.
- Add idempotency keys so repeated URL submissions do not duplicate work.
- Store progress, chunk count, and failure details.
- Add a dead-letter queue for jobs that repeatedly fail.
- Add worker metrics and structured logging.
- Add authentication and rate limits.
- Use a stronger article extraction library.
- Use an LLM-backed `TextProcessor`.
- Add `GET /imports/:id/events` with server-sent events for live progress.
- Add tests for worker retry and failure recovery.

## Learning Summary

This demo is useful because it shows Effect TS as an application architecture,
not just as isolated APIs.

The core idea:

```txt
Effect describes workflows.
Context describes dependencies.
Layer builds dependencies.
Runtime runs workflows.
Schema validates boundaries.
TaggedError models expected failure.
Schedule handles retry.
Stream handles many values.
Scope manages resource lifetime.
```

The whole system can be summarized as:

```txt
HTTP command
-> typed validation
-> service workflow
-> queue job
-> worker workflow
-> persisted status/result
```

That is the main backend pattern this demo is teaching.
