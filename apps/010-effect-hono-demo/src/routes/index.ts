import { Effect } from 'effect';
import { Hono, type Hono as HonoApp } from 'hono';

import { prepareTodoRoute, type TodoRoutePrepareError, todoRoute } from '@/routes/todo/todo.route';

type RoutePrepareError = TodoRoutePrepareError;

interface RouteModule {
  readonly name: string;
  readonly path: `/${string}`;
  readonly route: HonoApp;
  readonly prepare: Effect.Effect<void, RoutePrepareError, never>;
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

export const prepareRoutes: Effect.Effect<void, RoutePrepareError, never> = Effect.all(
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
