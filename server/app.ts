/**
 * Express application factory.
 * Kept separate from process startup so HTTP behavior can be tested directly.
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { config } from './config.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { analyzeLimiter } from './middleware/rateLimiter.js';
import { requestLoggerMiddleware } from './middleware/logger.js';
import analyzeRouter from './routes/analyze.js';
import healthRouter from './routes/health.js';

export function createApp(): express.Express {
  const app = express();

  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(express.json({ limit: '15mb' }));
  app.set('trust proxy', 1);

  app.use('/api/health', healthRouter);
  app.use('/api/analyze', analyzeLimiter, analyzeRouter);

  // Return a safe JSON response for malformed JSON request bodies.
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Dữ liệu JSON không hợp lệ.' });
      return;
    }
    next(err);
  });

  return app;
}

export async function addFrontend(app: express.Express): Promise<void> {
  if (!config.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }

  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
