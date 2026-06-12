import { Layer, ManagedRuntime } from 'effect';

import { DatabaseLive } from '@/infra/database';
import { QueueLive } from '@/infra/mq';
import { RedisLive } from '@/infra/redis';
import { AppConfigLive } from '@/lib/env';
import { TodoCacheLive } from '@/routes/todo/todo.cache';
import { TodoEventQueueLive } from '@/routes/todo/todo.queue';
import { TodoRepositoryLive } from '@/routes/todo/todo.repository';
import { TodoServiceLive } from '@/routes/todo/todo.service';

const RepositoryLive = TodoRepositoryLive.pipe(Layer.provide(DatabaseLive));
const CacheLive = TodoCacheLive.pipe(Layer.provide(RedisLive));
const EventQueueLive = TodoEventQueueLive.pipe(Layer.provide(QueueLive));

export const TodoStorageLayer = RepositoryLive.pipe(Layer.provide(AppConfigLive));

export const TodoLayer = TodoServiceLive.pipe(
  Layer.provide(Layer.mergeAll(RepositoryLive, CacheLive, EventQueueLive)),
  Layer.provide(AppConfigLive),
);

export const TodoRuntime = ManagedRuntime.make(TodoLayer);
