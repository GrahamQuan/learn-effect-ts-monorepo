import { Effect } from 'effect';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  type HealthReport,
  HealthService,
  type HealthService as HealthServiceShape,
} from '@/routes/health/health.service';
import { AppRuntime } from '@/runtime';

const statusCode = (report: HealthReport): ContentfulStatusCode => (report.status === 'ok' ? 200 : 503);

const runHealth = async (
  program: Effect.Effect<HealthReport, never, HealthServiceShape>,
): Promise<{ readonly report: HealthReport; readonly status: ContentfulStatusCode }> => {
  try {
    const report = await AppRuntime.runPromise(program);
    return { report, status: statusCode(report) };
  } catch (error) {
    const report: HealthReport = {
      status: 'not_ready',
      checks: [{ name: 'runtime', status: 'down', message: String(error) }],
    };

    return { report, status: 503 };
  }
};

export const healthRoute = new Hono();

healthRoute.get('/health', (c) => c.redirect('/api/livez'));

healthRoute.get('/livez', async (c) => {
  const { report, status } = await runHealth(
    Effect.gen(function* () {
      const health = yield* HealthService;
      return yield* health.live;
    }),
  );
  return c.json(report, status);
});

healthRoute.get('/readyz', async (c) => {
  const { report, status } = await runHealth(
    Effect.gen(function* () {
      const health = yield* HealthService;
      return yield* health.ready;
    }),
  );
  return c.json(report, status);
});
