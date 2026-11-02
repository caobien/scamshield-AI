/**
 * server.ts — Entry point.
 * Only wires middleware, routes and starts the server.
 * All business logic lives in server/ subdirectories.
 */
import { config } from './server/config.js';
import { log } from './server/middleware/logger.js';
import { addFrontend, createApp } from './server/app.js';

async function startServer() {
  const app = createApp();
  await addFrontend(app);

  // ── Start ──────────────────────────────────────────────────────────────────
  app.listen(config.port, '0.0.0.0', () => {
    log('INFO', `ScamShield AI server started`, { path: `http://0.0.0.0:${config.port}` });
  });
}

startServer().catch((err) => {
  // Use stderr directly to avoid structured logger dependency at startup failure
  process.stderr.write(`Fatal startup error: ${String(err)}\n`);
  process.exit(1);
});
