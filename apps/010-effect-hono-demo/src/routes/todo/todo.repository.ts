import { randomUUID } from 'node:crypto';

import { desc, eq, sql } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';

import { todos } from '@/db/schema';
import { Database, type DatabaseClient } from '@/infra/database';
import { DatabaseError, NotFoundError } from '@/routes/todo/todo.errors';
import { CreateTodoInput, Todo, UpdateTodoInput } from '@/routes/todo/todo.schema';

type TodoRow = typeof todos.$inferSelect;

export interface TodoRepository {
  readonly ensureSchema: Effect.Effect<void, DatabaseError>;
  readonly list: Effect.Effect<readonly Todo[], DatabaseError>;
  readonly findById: (id: string) => Effect.Effect<Todo, DatabaseError | NotFoundError>;
  readonly create: (input: CreateTodoInput) => Effect.Effect<Todo, DatabaseError>;
  readonly update: (id: string, input: UpdateTodoInput) => Effect.Effect<Todo, DatabaseError | NotFoundError>;
  readonly remove: (id: string) => Effect.Effect<Todo, DatabaseError | NotFoundError>;
}

export const TodoRepository = Context.GenericTag<TodoRepository>('010-effect-hono-demo/todo/TodoRepository');

const toTodo = (row: TodoRow) =>
  new Todo({
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

const firstTodo = (rows: readonly TodoRow[], id: string) => {
  const row = rows[0];

  return row === undefined ? Effect.fail(new NotFoundError({ resource: 'todo', id })) : Effect.succeed(toTodo(row));
};

const firstInsertedTodo = (rows: readonly TodoRow[]) => {
  const row = rows[0];

  return row === undefined
    ? Effect.fail(new DatabaseError({ operation: 'create todo', cause: 'Insert did not return a row.' }))
    : Effect.succeed(toTodo(row));
};

// Drizzle SQL-builder style: db.select().from(...), not db.query.todos.findMany().
const selectTodosSql = (db: DatabaseClient) => db.select().from(todos).orderBy(desc(todos.createdAt));

const selectTodoByIdSql = (db: DatabaseClient, id: string) => db.select().from(todos).where(eq(todos.id, id)).limit(1);

const insertTodoSql = (db: DatabaseClient, id: string, input: CreateTodoInput, now: Date) =>
  db
    .insert(todos)
    .values({
      id,
      title: input.title,
      description: input.description ?? null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

const updateTodoSql = (db: DatabaseClient, id: string, input: UpdateTodoInput, now: Date) =>
  db
    .update(todos)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
      updatedAt: now,
    })
    .where(eq(todos.id, id))
    .returning();

const deleteTodoSql = (db: DatabaseClient, id: string) => db.delete(todos).where(eq(todos.id, id)).returning();

export const TodoRepositoryLive = Layer.effect(
  TodoRepository,
  Effect.gen(function* () {
    const { db } = yield* Database;

    return {
      ensureSchema: Effect.tryPromise({
        try: async () => {
          await db.execute(sql`
            create table if not exists todos (
              id uuid primary key,
              title text not null,
              description text,
              completed boolean not null default false,
              created_at timestamptz not null default now(),
              updated_at timestamptz not null default now()
            )
          `);
        },
        catch: (cause) =>
          new DatabaseError({
            operation: 'ensure todos table',
            cause,
          }),
      }),
      list: Effect.tryPromise({
        try: () => selectTodosSql(db),
        catch: (cause) =>
          new DatabaseError({
            operation: 'list todos',
            cause,
          }),
      }).pipe(Effect.map((rows) => rows.map(toTodo))),
      findById: (id) =>
        Effect.tryPromise({
          try: () => selectTodoByIdSql(db, id),
          catch: (cause) =>
            new DatabaseError({
              operation: `find todo ${id}`,
              cause,
            }),
        }).pipe(Effect.flatMap((rows) => firstTodo(rows, id))),
      create: (input) =>
        Effect.gen(function* () {
          const id = yield* Effect.sync(() => randomUUID());
          const now = yield* Effect.sync(() => new Date());
          const rows = yield* Effect.tryPromise({
            try: () => insertTodoSql(db, id, input, now),
            catch: (cause) =>
              new DatabaseError({
                operation: 'create todo',
                cause,
              }),
          });

          return yield* firstInsertedTodo(rows);
        }),
      update: (id, input) =>
        Effect.gen(function* () {
          const now = yield* Effect.sync(() => new Date());
          const rows = yield* Effect.tryPromise({
            try: () => updateTodoSql(db, id, input, now),
            catch: (cause) =>
              new DatabaseError({
                operation: `update todo ${id}`,
                cause,
              }),
          });

          return yield* firstTodo(rows, id);
        }),
      remove: (id) =>
        Effect.tryPromise({
          try: () => deleteTodoSql(db, id),
          catch: (cause) =>
            new DatabaseError({
              operation: `delete todo ${id}`,
              cause,
            }),
        }).pipe(Effect.flatMap((rows) => firstTodo(rows, id))),
    };
  }),
);
