import { Queue } from 'bullmq';
import { Context, Effect, Layer } from 'effect';

import { QueueFactory } from '@/infra/mq';
import { QueueError } from '@/routes/todo/todo.errors';
import type { TodoEvent } from '@/routes/todo/todo.schema';

export interface TodoEventQueue {
  readonly publish: (event: TodoEvent) => Effect.Effect<void, QueueError>;
}

export const TodoEventQueue = Context.GenericTag<TodoEventQueue>('010-effect-hono-demo/todo/TodoEventQueue');

export const TodoEventQueueLive = Layer.effect(
  TodoEventQueue,
  Effect.gen(function* () {
    const queueFactory = yield* QueueFactory;
    const queue = queueFactory.makeQueue<TodoEvent, void, TodoEvent['type']>('todo-events');

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
