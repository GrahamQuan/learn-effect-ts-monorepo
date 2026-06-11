import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/', (c) => c.json({ message: 'Hello from Hono' }));
app.get('/health', (c) => c.text('ok'));

export { app };
