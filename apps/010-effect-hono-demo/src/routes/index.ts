import { Effect } from 'effect';
import { Hono, type Hono as HonoApp } from 'hono';

import { prepareTodoRoute, type TodoRoutePrepareError, todoRoute } from '@/routes/todo/todo.route';
import type { TodoService } from '@/routes/todo/todo.service';

type RoutePrepareError = TodoRoutePrepareError;
type RoutePrepareContext = TodoService;

interface RouteModule {
  readonly name: string;
  readonly path: `/${string}`;
  readonly route: HonoApp;
  readonly prepare: Effect.Effect<void, RoutePrepareError, RoutePrepareContext>;
}

const routeModules = [
  {
    name: 'todo',
    path: '/',
    route: todoRoute,
    prepare: prepareTodoRoute,
  },
] satisfies readonly RouteModule[];

export const routes = new Hono();

for (const routeModule of routeModules) {
  routes.route(routeModule.path, routeModule.route);
}

export const prepareRoutes: Effect.Effect<void, RoutePrepareError, RoutePrepareContext> = Effect.all(
  routeModules.map((routeModule) =>
    routeModule.prepare.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          console.error(`Route prepare failed: ${routeModule.name}`, error);
        }),
      ),
    ),
  ),
  { discard: true },
);
