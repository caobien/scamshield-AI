/**
 * server/config.ts
 * Centralized server configuration from environment variables.
 * All secrets are read server-side only — never exposed to client bundle.
 */
import 'dotenv/config';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Required environment variable "${name}" is not set.`);
  }
  return val;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) ? fallback : n;
}

function strEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  // ── Server ──────────────────────────────────────────────
  port: intEnv('PORT', 3000),
  nodeEnv: strEnv('NODE_ENV', 'development'),
  isProduction: strEnv('NODE_ENV', 'development') === 'production',

  // ── Gemini API ──────────────────────────────────────────
  get geminiApiKey(): string {
    return requireEnv('GEMINI_API_KEY');
  },
  geminiModel: strEnv('GEMINI_MODEL', 'gemini-3.5-flash'),
  geminiTemperature: 0.1,
  geminiTimeoutMs: intEnv('GEMINI_TIMEOUT_MS', 30_000),
  geminiMaxRetries: intEnv('GEMINI_MAX_RETRIES', 3),

  // ── Rate Limiting ────────────────────────────────────────
  rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),   // 1 minute
  rateLimitMaxRequests: intEnv('RATE_LIMIT_MAX', 20),           // 20 req/min per IP

  // ── Concurrency ──────────────────────────────────────────
  maxConcurrentGeminiCalls: intEnv('MAX_CONCURRENT_GEMINI', 5),

  // ── Input Limits ─────────────────────────────────────────
  maxMessageChars: intEnv('MAX_MESSAGE_CHARS', 2_000),
  maxUrlChars: intEnv('MAX_URL_CHARS', 2_000),
  // 10 MB raw → ~13.4 MB base64 string → add margin
  maxImageBase64Chars: intEnv('MAX_IMAGE_B64_CHARS', 14_000_000),
  maxImageDecodedBytes: intEnv('MAX_IMAGE_BYTES', 10 * 1024 * 1024), // 10 MB

} as const;
