# 012 URL Import Demo

A small async processing app for practicing Effect TS service composition.

```txt
POST /imports
-> create a pending import record
-> publish a BullMQ job
-> return 202 + importId

worker
-> fetch URL
-> extract article text
-> split/process chunks
-> save result
-> mark completed or failed
```

## Run

Start Redis first. BullMQ needs a Redis protocol URL, so local Redis can use
`redis://127.0.0.1:6379`, while Upstash should use a `rediss://...` URL, not the
Upstash REST URL.

Run the API and worker in separate terminals:

```bash
pnpm --filter 012-url-import-demo dev
pnpm --filter 012-url-import-demo dev:worker
```

The API defaults to `http://localhost:4012`.

1. Create an import

```bash
curl -X POST http://localhost:4012/imports \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.cloudflare.com"}'
```

The response is `202 Accepted` and contains an `importId`:

```json
{
  "importId": "copy-this-id",
  "status": "pending",
  "statusUrl": "/imports/copy-this-id",
  "resultUrl": "/imports/copy-this-id/result"
}
```

2. Get import status

```bash
curl http://localhost:4012/imports/copy-this-id
```

The status moves through the async workflow:

```txt
pending -> processing -> completed
```

If something fails, the status becomes `failed` and the response includes an
`error` field.

3. Get import result

```bash
curl http://localhost:4012/imports/copy-this-id/result
```

If the worker has not finished yet, this returns `409 ResultNotReadyError`.
After completion, it returns the processed article summary.

4. List recent imports

```bash
curl http://localhost:4012/imports
```

Useful environment variables:

```txt
PORT=4012
REDIS_URL=redis://127.0.0.1:6379
IMPORT_QUEUE_NAME=url-imports
IMPORT_STORE_PATH=./.data/imports.json
IMPORT_FETCH_TIMEOUT_MS=5000
IMPORT_WORKER_CONCURRENCY=2
```

## Effect Concepts

- `Schema` validates request bodies, IDs, stored records, and job payloads.
- `Data.TaggedError` models validation, queue, fetch, extract, processing, and repository failures.
- `Context` and `Layer` inject the repository, queue, fetcher, extractor, and processor.
- `Effect.gen` describes the multi-step import workflow.
- `Schedule` retries fetch and chunk-processing work.
- `Stream` processes text chunks before merging the final result.
- `ManagedRuntime` gives Hono routes and the worker the same service graph.
