import { Layer } from 'effect';

import { TodoCacheLive } from '@/routes/todo/todo.cache';
import { TodoEventQueueLive } from '@/routes/todo/todo.queue';
import { TodoRepositoryLive } from '@/routes/todo/todo.repository';
import { TodoServiceLive } from '@/routes/todo/todo.service';

export const TodoLayer = TodoServiceLive.pipe(
  Layer.provide(Layer.mergeAll(TodoRepositoryLive, TodoCacheLive, TodoEventQueueLive)),
);
