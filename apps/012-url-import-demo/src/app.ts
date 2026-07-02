import { Hono } from 'hono';

import { importRoute } from '@/imports/import.route';

export const createApp = () => {
  const app = new Hono();

  app.get('/', (c) =>
    c.json({
      name: '012-url-import-demo',
      routes: ['POST /imports', 'GET /imports', 'GET /imports/:id', 'GET /imports/:id/result'],
    }),
  );

  app.route('/imports', importRoute);

  return app;
};
