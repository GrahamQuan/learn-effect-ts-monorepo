import { Layer, ManagedRuntime } from 'effect';

import { DatabaseLive } from '@/infra/database';
import { QueueLive } from '@/infra/mq';
import { RedisLive } from '@/infra/redis';
import { AppConfigLive } from '@/lib/env';
import { TodoLayer } from '@/routes/todo/todo.runtime';

const InfraLive = Layer.mergeAll(DatabaseLive, RedisLive, QueueLive).pipe(Layer.provide(AppConfigLive));

// Add future feature layers here; they will share the same app-owned infra.
const FeatureLive = Layer.mergeAll(TodoLayer);

export const AppLayer = FeatureLive.pipe(Layer.provide(InfraLive));

export const AppRuntime = ManagedRuntime.make(AppLayer);
