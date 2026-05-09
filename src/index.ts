import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import protectRoutes from './middleware/protectRoutes.js';
import baseApp from './routes/index.js';

const app = new Hono();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use('*', protectRoutes);

app.route('/', baseApp);

app.get('/styles.css', async (c) => {
  const css = await readFile(path.join(__dirname, '../src/styles.css'), 'utf8');
  return c.body(css, 200, { 'Content-Type': 'text/css' });
});

const server = serve(app);

// graceful shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});