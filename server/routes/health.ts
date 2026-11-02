/**
 * server/routes/health.ts
 * Safe health check endpoint.
 * Exposes: status, uptime (seconds), version.
 * NEVER exposes: API key, model config, env vars, secrets.
 */
import { Router, Request, Response } from 'express';
import { createRequire } from 'module';

const router = Router();
const START_TIME = Date.now();

// Read version without top-level await (CJS-compatible)
let _version = '1.0.0';
try {
  const require = createRequire(import.meta.url);
  const pkg = require('../../package.json') as { version?: string };
  _version = pkg.version || '1.0.0';
} catch {
  // Fallback — version not critical
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    version: _version,
  });
});

export default router;
