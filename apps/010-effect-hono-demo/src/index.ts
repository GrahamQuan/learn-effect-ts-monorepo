import { serve } from '@hono/node-server';

import { app } from './app';
import { env } from './lib/env';

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log({ url: `http://localhost:${info.port}` });
});
