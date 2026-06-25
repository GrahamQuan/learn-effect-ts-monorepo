import { Effect, Layer } from 'effect';
import { expect, it } from 'vitest';

import { TodoCache } from '@/routes/todo/todo.cache';
import { CacheMiss } from '@/routes/todo/todo.errors';
import { TodoEventQueue } from '@/routes/todo/todo.queue';
import { TodoRepository } from '@/routes/todo/todo.repository';
import { CreateTodoInput, Todo, type TodoEvent, type UpdateTodoInput } from '@/routes/todo/todo.schema';
import { TodoService, TodoServiceLive } from '@/routes/todo/todo.service';

const todo = new Todo({
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Learn test layers',
  description: null,
  completed: false,
  createdAt: '2026-06-22T00:00:00.000Z',
  updatedAt: '2026-06-22T00:00:00.000Z',
});

it('can test TodoService with fake layers instead of real infra', async () => {
  const invalidatedIds: string[] = [];
  const publishedEvents: TodoEvent[] = [];

  const RepositoryTest = Layer.succeed(TodoRepository, {
    list: Effect.succeed([todo]),
    findById: () => Effect.succeed(todo),
    create: () => Effect.succeed(todo),
    update: () => Effect.succeed(todo),
    remove: () => Effect.succeed(todo),
  });

  const CacheTest = Layer.succeed(TodoCache, {
    getAll: Effect.fail(new CacheMiss({ key: 'todos:all' })),
    setAll: () => Effect.succeed(undefined),
    getById: () => Effect.fail(new CacheMiss({ key: `todos:${todo.id}` })),
    setById: () => Effect.succeed(undefined),
    invalidateAll: Effect.succeed(undefined),
    invalidateById: (id) =>
      Effect.sync(() => {
        invalidatedIds.push(id);
      }),
  });

  const QueueTest = Layer.succeed(TodoEventQueue, {
    publish: (event) =>
      Effect.sync(() => {
        publishedEvents.push(event);
      }),
  });

  const TestLayer = TodoServiceLive.pipe(Layer.provide(Layer.mergeAll(RepositoryTest, CacheTest, QueueTest)));

  const created = await Effect.runPromise(
    Effect.gen(function* () {
      const todos = yield* TodoService;

      return yield* todos.create(new CreateTodoInput({ title: todo.title }));
    }).pipe(Effect.provide(TestLayer)),
  );

  expect(created).toEqual(todo);
  expect(invalidatedIds).toEqual([todo.id]);
  expect(publishedEvents).toEqual([{ type: 'todo.created', todoId: todo.id }]);
});

it('falls back to repository when the cache misses', async () => {
  let cachedCount = 0;

  const RepositoryTest = Layer.succeed(TodoRepository, {
    list: Effect.succeed([todo]),
    findById: () => Effect.succeed(todo),
    create: () => Effect.succeed(todo),
    update: (_id: string, _input: UpdateTodoInput) => Effect.succeed(todo),
    remove: () => Effect.succeed(todo),
  });

  const CacheTest = Layer.succeed(TodoCache, {
    getAll: Effect.fail(new CacheMiss({ key: 'todos:all' })),
    setAll: () =>
      Effect.sync(() => {
        cachedCount += 1;
      }),
    getById: () => Effect.fail(new CacheMiss({ key: `todos:${todo.id}` })),
    setById: () => Effect.succeed(undefined),
    invalidateAll: Effect.succeed(undefined),
    invalidateById: () => Effect.succeed(undefined),
  });

  const QueueTest = Layer.succeed(TodoEventQueue, {
    publish: () => Effect.succeed(undefined),
  });

  const TestLayer = TodoServiceLive.pipe(Layer.provide(Layer.mergeAll(RepositoryTest, CacheTest, QueueTest)));

  const todos = await Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* TodoService;

      return yield* service.list;
    }).pipe(Effect.provide(TestLayer)),
  );

  expect(todos).toEqual([todo]);
  expect(cachedCount).toBe(1);
});
