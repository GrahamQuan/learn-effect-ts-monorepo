import { Hono } from 'hono';

import { routes } from '@/routes';

export interface CreateAppOptions {
  readonly prepare?: () => Promise<void>;
}

export const createApp = (options: CreateAppOptions = {}) => {
  const app = new Hono().basePath('/api');
  const prepare = options.prepare;

  if (prepare !== undefined) {
    app.use('*', async (c, next) => {
      try {
        await prepare();
      } catch (error) {
        console.error('App preparation failed:', error);
        return c.json(
          { error: 'AppPreparationError', message: 'The app failed to prepare before handling request.' },
          500,
        );
      }

      await next();
    });
  }

  app.route('/', routes);

  return app;
};
