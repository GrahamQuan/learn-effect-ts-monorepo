import { Context, Effect, Layer, Schema } from 'effect';
import Redis from 'ioredis';

import { RedisClient } from '@/infra/redis';
import { CacheError, CacheMiss } from '@/routes/todo/todo.errors';
import { Todo } from '@/routes/todo/todo.schema';

const todoListKey = 'todos:all';
const todoDetailKey = (id: string) => `todos:${id}`;
const cacheTtlSeconds = 60;

export interface TodoCache {
  readonly getAll: Effect.Effect<readonly Todo[], CacheMiss | CacheError>;
  readonly setAll: (todos: readonly Todo[]) => Effect.Effect<void, CacheError>;
  readonly getById: (id: string) => Effect.Effect<Todo, CacheMiss | CacheError>;
  readonly setById: (todo: Todo) => Effect.Effect<void, CacheError>;
  readonly invalidateAll: Effect.Effect<void, CacheError>;
  readonly invalidateById: (id: string) => Effect.Effect<void, CacheError>;
}

export const TodoCache = Context.GenericTag<TodoCache>('010-effect-hono-demo/todo/TodoCache');

const readJson = (redis: Redis, key: string) =>
  Effect.tryPromise({
    try: async () => {
      const raw = await redis.get(key);

      if (raw === null) {
        throw new CacheMiss({ key });
      }

      return JSON.parse(raw) as unknown;
    },
    catch: (cause) =>
      cause instanceof CacheMiss
        ? cause
        : new CacheError({
            operation: `read ${key}`,
            cause,
          }),
  });

const writeJson = (redis: Redis, key: string, value: unknown) =>
  Effect.tryPromise({
    try: async () => {
      await redis.set(key, JSON.stringify(value), 'EX', cacheTtlSeconds);
    },
    catch: (cause) =>
      new CacheError({
        operation: `write ${key}`,
        cause,
      }),
  });

const deleteKeys = (redis: Redis, keys: readonly string[]) =>
  keys.length === 0
    ? Effect.succeed(undefined)
    : Effect.tryPromise({
        try: async () => {
          await redis.del(...keys);
        },
        catch: (cause) =>
          new CacheError({
            operation: `delete ${keys.join(', ')}`,
            cause,
          }),
      });

export const TodoCacheLive = Layer.effect(
  TodoCache,
  Effect.gen(function* () {
    const { redis } = yield* RedisClient;

    return {
      getAll: readJson(redis, todoListKey).pipe(
        Effect.flatMap((value) =>
          Schema.decodeUnknown(Schema.Array(Todo))(value).pipe(
            Effect.mapError(() => new CacheMiss({ key: todoListKey })),
          ),
        ),
      ),
      setAll: (todos) => writeJson(redis, todoListKey, todos),
      getById: (id) =>
        readJson(redis, todoDetailKey(id)).pipe(
          Effect.flatMap((value) =>
            Schema.decodeUnknown(Todo)(value).pipe(Effect.mapError(() => new CacheMiss({ key: todoDetailKey(id) }))),
          ),
        ),
      setById: (todo) => writeJson(redis, todoDetailKey(todo.id), todo),
      invalidateAll: deleteKeys(redis, [todoListKey]),
      invalidateById: (id) => deleteKeys(redis, [todoListKey, todoDetailKey(id)]),
    };
  }),
);
