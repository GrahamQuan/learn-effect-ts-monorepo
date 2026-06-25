import { Config, Effect, Layer } from 'effect';

import { DatabaseLive } from '@/infra/database';
import { AppConfig } from '@/lib/env';
import { TodoRepository, TodoRepositoryLive } from '@/routes/todo/todo.repository';
import { CreateTodoInput, type Todo } from '@/routes/todo/todo.schema';

const SeedConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const nodeEnv = yield* Config.string('NODE_ENV').pipe(Config.withDefault('development'));
    const databaseUrl = yield* Config.string('DATABASE_URL');

    return {
      nodeEnv,
      port: 0,
      databaseUrl,
      databasePoolMax: 2,
      databasePoolIdleTimeoutMs: 5_000,
      databasePoolMaxLifetimeSeconds: 60,
      cacheUrl: 'redis://unused-by-seed',
    };
  }),
);

const SeedLayer = TodoRepositoryLive.pipe(Layer.provide(DatabaseLive), Layer.provide(SeedConfigLive));

const seedTodos = [
  new CreateTodoInput({
    title: 'Learn Effect Context',
    description: 'A todo about dependency injection with Context tags.',
  }),
  new CreateTodoInput({
    title: 'Practice Layer wiring',
    description: 'A todo about providing concrete services at the application edge.',
  }),
  new CreateTodoInput({
    title: 'Use Effect.all',
    description: 'A todo about batching independent effects.',
  }),
] as const;

interface SeedResult {
  readonly created: readonly Todo[];
  readonly skipped: number;
}

const seedProgram: Effect.Effect<SeedResult, unknown, TodoRepository> = Effect.gen(function* () {
  const repository = yield* TodoRepository;

  const existingTodos = yield* repository.list;
  const existingTitles = new Set(existingTodos.map((todo) => todo.title));
  const missingTodos = seedTodos.filter((todo) => !existingTitles.has(todo.title));

  const created =
    missingTodos.length === 0
      ? yield* Effect.succeed([])
      : yield* Effect.all(
          missingTodos.map((todo) => repository.create(todo)),
          { concurrency: 1 },
        );

  return {
    created,
    skipped: seedTodos.length - created.length,
  };
});

void Effect.runPromise(
  seedProgram.pipe(
    Effect.provide(SeedLayer),
    Effect.match({
      onFailure: (error) => {
        console.error('Seed failed:', error);
        process.exitCode = 1;
      },
      onSuccess: ({ created, skipped }) => {
        console.log(`Seed complete. Created: ${created.length}. Skipped: ${skipped}.`);

        if (created.length > 0) {
          console.table(
            created.map((todo) => ({
              id: todo.id,
              title: todo.title,
              completed: todo.completed,
            })),
          );
        }
      },
    }),
  ),
);
