import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './node';

process.env.BASE_URL = 'http://localhost:3000';

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
