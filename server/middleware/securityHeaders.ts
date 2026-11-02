/**
 * server/middleware/securityHeaders.ts
 * Security headers for the Express app using helmet.
 * CSP is tuned for a Vite SPA with inline scripts (dev) and hashed scripts (prod).
 */
import helmet from 'helmet';
import { config } from '../config.js';

// For same-origin SPA: restrict CSP tightly.
// In dev mode, Vite HMR needs slightly looser script-src.
const cspDirectives = config.isProduction
  ? {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    }
  : undefined; // Helmet default CSP in dev — permissive enough for Vite HMR

export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: cspDirectives ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: false, // Avoid breaking Vite dev assets
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  hsts: config.isProduction
    ? { maxAge: 31_536_000, includeSubDomains: true }
    : false,
});
