/**
 * server/middleware/rateLimiter.ts
 * IP-based rate limiting for the /api/analyze endpoint.
 * Returns a 429 with a user-friendly Vietnamese message on breach.
 *
 * Resolves ERR_ERL_KEY_GEN_IPV6: uses express-rate-limit's ipKeyGenerator helper
 * inside the keyGenerator callback to normalize IPv6 addresses correctly.
 * Cloud Run sits behind GFE proxy — X-Forwarded-For is trusted because
 * server.ts sets `app.set('trust proxy', 1)`.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../config.js';

export const analyzeLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,        // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Wrap ipKeyGenerator to satisfy ValueDeterminingMiddleware<string> signature.
  // ipKeyGenerator(ip) normalizes IPv4-mapped IPv6 (::ffff:x.x.x.x) and applies
  // subnet grouping — prevents bypass via IPv6 address rotation.
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  },
  handler: (req, res) => {
    const requestId = req.context?.requestId || '';
    res.status(429).json({
      error:
        'Bạn đã gửi quá nhiều yêu cầu phân tích. Vui lòng chờ một lúc rồi thử lại.',
      requestId: requestId || undefined,
    });
  },
});
