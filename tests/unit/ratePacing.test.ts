/**
 * tests/unit/ratePacing.test.ts
 * Unit tests for rate pacing and Retry-After header parsing utilities.
 * Does NOT make any real network or Gemini API calls.
 */

import { parseRetryAfterHeader, calculateCooldownMs } from '../evaluation/ratePacingUtils.js';

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ PASS: ${name}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failCount++;
    }
  } catch (err) {
    console.error(`  ❌ EXCEPTION in "${name}":`, err);
    failCount++;
  }
}

console.log('\n--- UNIT TESTS: RATE PACING & RETRY-AFTER PARSING ---');

test('parseRetryAfterHeader: null header returns fallback', () => {
  return parseRetryAfterHeader(null, 15) === 15;
});

test('parseRetryAfterHeader: empty header returns fallback', () => {
  return parseRetryAfterHeader('', 20) === 20;
});

test('parseRetryAfterHeader: integer seconds parsed correctly', () => {
  return parseRetryAfterHeader('30', 15) === 30;
});

test('parseRetryAfterHeader: whitespace trimmed correctly', () => {
  return parseRetryAfterHeader('  45  ', 15) === 45;
});

test('parseRetryAfterHeader: invalid string returns fallback', () => {
  return parseRetryAfterHeader('invalid-seconds', 15) === 15;
});

test('calculateCooldownMs: non-429 status returns 0 cooldown', () => {
  const headers = { get: (_: string) => null };
  return calculateCooldownMs(200, headers, undefined, 12000) === 0;
});

test('calculateCooldownMs: 429 status with Retry-After "20" returns 20000ms', () => {
  const headers = { get: (name: string) => (name.toLowerCase() === 'retry-after' ? '20' : null) };
  return calculateCooldownMs(429, headers, undefined, 12000) === 20000;
});

test('calculateCooldownMs: RATE_LIMIT code with no Retry-After applies minimum cooldown (12000ms)', () => {
  const headers = { get: (_: string) => null };
  return calculateCooldownMs(500, headers, 'RATE_LIMIT', 12000) === 15000; // parseRetryAfterHeader fallback 15s = 15000ms >= 12000ms
});

test('calculateCooldownMs: HTTP_429 code with Retry-After "30" returns 30000ms', () => {
  const headers = { get: (name: string) => (name.toLowerCase() === 'retry-after' ? '30' : null) };
  return calculateCooldownMs(200, headers, 'HTTP_429', 12000) === 30000;
});

if (failCount > 0) {
  console.error(`\n❌ ${failCount} rate pacing unit test(s) failed!`);
  process.exit(1);
} else {
  console.log(`✅ All ${passCount} Rate Pacing Unit Tests Passed!`);
}
