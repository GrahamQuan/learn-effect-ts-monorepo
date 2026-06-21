import { Queue } from 'bullmq';
import { Context, Effect, Layer } from 'effect';

import { QueueFactory } from '@/infra/mq';
import { QueueError } from '@/routes/todo/todo.errors';
import type { TodoEvent } from '@/routes/todo/todo.schema';

export interface TodoEventQueue {
  readonly publish: (event: TodoEvent) => Effect.Effect<void, QueueError>;
}

export const TodoEventQueue = Context.GenericTag<TodoEventQueue>('010-effect-hono-demo/todo/TodoEventQueue');

export const TodoEventQueueLive = Layer.scoped(
  TodoEventQueue,
  Effect.gen(function* () {
    const queueFactory = yield* QueueFactory;
    const queue = yield* Effect.acquireRelease(
      Effect.sync(() => queueFactory.makeQueue<TodoEvent, void, TodoEvent['type']>('todo-events')),
      (queue) => Effect.tryPromise(() => queue.close()).pipe(Effect.ignoreLogged),
    );

    return {
      publish: (event) =>
        Effect.tryPromise({
          try: async () => {
            await queue.add(event.type, event, {
              removeOnComplete: true,
              removeOnFail: 100,
            });
          },
          catch: (cause) =>
            new QueueError({
              operation: `publish ${event.type}`,
              cause,
            }),
        }),
    };
  }),
);
