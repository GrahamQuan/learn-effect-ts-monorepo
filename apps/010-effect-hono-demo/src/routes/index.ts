import { Hono, type Hono as HonoApp } from 'hono';

import { healthRoute } from '@/routes/health/health.route';
import { todoRoute } from '@/routes/todo/todo.route';

interface RouteModule {
  readonly name: string;
  readonly path: `/${string}`;
  readonly route: HonoApp;
}

const routeModules = [
  {
    name: 'health',
    path: '/',
    route: healthRoute,
  },
  {
    name: 'todo',
    path: '/',
    route: todoRoute,
  },
] satisfies readonly RouteModule[];

export const routes = new Hono();

for (const routeModule of routeModules) {
  routes.route(routeModule.path, routeModule.route);
}
