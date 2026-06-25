import { Context, Effect, Layer } from 'effect';

import { TodoCache } from '@/routes/todo/todo.cache';
import type { AppError } from '@/routes/todo/todo.errors';
import { TodoEventQueue } from '@/routes/todo/todo.queue';
import { TodoRepository } from '@/routes/todo/todo.repository';
import type { CreateTodoInput, Todo, TodoEvent, UpdateTodoInput } from '@/routes/todo/todo.schema';

export interface TodoService {
  readonly list: Effect.Effect<readonly Todo[], AppError>;
  readonly getById: (id: string) => Effect.Effect<Todo, AppError>;
  readonly create: (input: CreateTodoInput) => Effect.Effect<Todo, AppError>;
  readonly update: (id: string, input: UpdateTodoInput) => Effect.Effect<Todo, AppError>;
  readonly remove: (id: string) => Effect.Effect<Todo, AppError>;
}

export const TodoService = Context.GenericTag<TodoService>('010-effect-hono-demo/todo/TodoService');

const bestEffort = <E>(label: string, effect: Effect.Effect<void, E>) =>
  effect.pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.warn(`[best-effort:${label}]`, error);
      }),
    ),
  );

export const TodoServiceLive = Layer.effect(
  TodoService,
  Effect.gen(function* () {
    const repository = yield* TodoRepository;
    const cache = yield* TodoCache;
    const events = yield* TodoEventQueue;

    const loadListFromDatabase = repository.list.pipe(
      Effect.tap((todos) => bestEffort('cache-list', cache.setAll(todos))),
    );
    const loadOneFromDatabase = (id: string) =>
      repository.findById(id).pipe(Effect.tap((todo) => bestEffort('cache-detail', cache.setById(todo))));
    const afterMutation = (id: string, event: TodoEvent) =>
      Effect.all(
        [bestEffort('cache-invalidate', cache.invalidateById(id)), bestEffort('queue-publish', events.publish(event))],
        { concurrency: 'unbounded', discard: true },
      );

    return {
      list: cache.getAll.pipe(
        Effect.catchTag('CacheMiss', () => loadListFromDatabase),
        Effect.catchTag('CacheError', () => loadListFromDatabase),
      ),
      getById: (id) =>
        cache.getById(id).pipe(
          Effect.catchTag('CacheMiss', () => loadOneFromDatabase(id)),
          Effect.catchTag('CacheError', () => loadOneFromDatabase(id)),
        ),
      create: (input) =>
        Effect.gen(function* () {
          const todo = yield* repository.create(input);
          yield* afterMutation(todo.id, { type: 'todo.created', todoId: todo.id });

          return todo;
        }),
      update: (id, input) =>
        Effect.gen(function* () {
          const todo = yield* repository.update(id, input);
          yield* afterMutation(id, { type: 'todo.updated', todoId: id });

          return todo;
        }),
      remove: (id) =>
        Effect.gen(function* () {
          const todo = yield* repository.remove(id);
          yield* afterMutation(id, { type: 'todo.deleted', todoId: id });

          return todo;
        }),
    };
  }),
);
