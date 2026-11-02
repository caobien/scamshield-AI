/**
 * tests/evaluation/ratePacingUtils.ts
 * Helper functions for parsing Retry-After headers, calculating rate limit cooldowns,
 * and rate pacing math.
 */

/**
 * Parses a Retry-After header string (either integer seconds or HTTP-date).
 * Returns duration in seconds.
 */
export function parseRetryAfterHeader(headerValue: string | null | undefined, fallbackSec = 15): number {
  if (!headerValue || !headerValue.trim()) return fallbackSec;
  const trimmed = headerValue.trim();

  // 1. Integer seconds (e.g. "15" or "30")
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // 2. HTTP-Date (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diffSec = Math.ceil((dateMs - Date.now()) / 1000);
    return diffSec > 0 ? diffSec : fallbackSec;
  }

  return fallbackSec;
}

/**
 * Computes cooldown delay in milliseconds when a rate limit (429) occurs.
 * If Retry-After is present, respects it. Otherwise applies a conservative cooldown.
 */
export function calculateCooldownMs(
  status: number,
  headers?: { get(name: string): string | null },
  bodyCode?: string,
  minCooldownMs = 12000
): number {
  if (status === 429 || bodyCode === 'RATE_LIMIT' || bodyCode === 'HTTP_429') {
    const retryAfterHeader = headers?.get('retry-after');
    const sec = parseRetryAfterHeader(retryAfterHeader, 15);
    return Math.max(sec * 1000, minCooldownMs);
  }
  return 0;
}
