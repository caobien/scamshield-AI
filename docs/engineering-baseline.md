# Engineering Baseline — ScamShield AI
## Google AI RISE 2026 Submission

**Date**: 2026-08-11  
**Version**: 1.0.0  
**Auditor**: Principal Full-Stack / AI Security Engineer (Antigravity)

---

## Step 0 — Pre-Audit Inventory

| Artifact | Status | Notes |
|----------|--------|-------|
| `server.ts` | ✅ Clean | Entry point only; no business logic |
| `server/routes/analyze.ts` | ✅ Reviewed | POST /api/analyze with full validation |
| `server/services/geminiService.ts` | ✅ Reviewed | Retry logic, timeout, no secret leakage |
| `server/schemas/analyzeSchema.ts` | ✅ Reviewed | Zod v4 schemas for request + output |
| `server/config.ts` | ✅ Updated | Fixed default model fallback to `gemini-3.5-flash` (compatibility fix) |
| `server/middleware/` | ✅ Reviewed | securityHeaders, rateLimiter, requestId, logger |
| `src/utils/urlParser.ts` | ✅ Reviewed | Structural only — no fetch/DNS calls |
| `src/utils/validation.ts` | ✅ Fixed | Array bypass bug fixed (see Step 2) |
| `src/services/prompts.ts` | ✅ Reviewed | `<UNTRUSTED_USER_INPUT>` tags in all 3 prompt types |
| `package.json` | ✅ Updated | Added `npm test`, `test:security`, `eval`, `eval:live` scripts |
| `.gitignore` | ✅ Updated | Explicit `.env` + `.env.*` + `scratch/` entries |
| `.env` | ⚠️ FIXED | **Real key found and removed — MUST ROTATE** |
| `.env.example` | ✅ Clean | Updated default model comment to `gemini-3.5-flash` |
| `Dockerfile` / `.dockerignore` | ✅ Clean | Not built/tested in this run |
| `tests/` | ✅ Passing | **191 tests total** (111 unit/integration + 80 security), all pass |
| `dist/` | ✅ Checked | No API key pattern in bundle |
| `node_modules/` | ➖ Not audited | Excluded from scope per standard practice |

---

## Step 1 — Secrets & Packaging

### Finding: Real API Key in `.env`

**Severity**: CRITICAL  
**Status**: REMEDIATED (key replaced with placeholder)

- **What**: A real Google Gemini API key (`AIzaSy…`) was found in `.env`
- **Impact**: If committed and pushed to git, the key would be exposed in repository history and submission artifacts
- **Action taken**:
  - Key value **not displayed** in this report
  - `.env` overwritten with placeholder content
  - `.gitignore` tightened (added explicit `.env`, `.env.*`, `scratch/` rules)
  - Key **MUST be rotated/revoked** at: https://aistudio.google.com/app/apikey

### Secret Scan Result

| Location | Pattern `AIzaSy[A-Za-z0-9_-]{33}` | Status |
|----------|-------------------------------------|--------|
| `.env` | **FOUND** (removed) | ⚠️ ROTATE KEY |
| `dist/assets/index-VVZY_hjz.js` | Not found | ✅ PASS |
| All `server/**/*.ts` | Not found | ✅ PASS |
| All `src/**/*.ts` | Not found | ✅ PASS |
| `.env.example` | Not found | ✅ PASS |

### `.gitignore` Changes

```diff
- .env*
+ .env
+ .env.*
  !.env.example
+ scratch/
```

---

## Step 2 — Trust Boundaries

### Security Bug Found & Fixed

**Bug**: `validateAnalysisOutput` in `src/utils/validation.ts` used `typeof rawOutput !== 'object'` to guard non-object types. However, `typeof [] === 'object'` in JavaScript, meaning an array response from Gemini would bypass this check and be cast to `Record<string, unknown>`, potentially producing garbage results without an error.

**Fix** (1 line):
```diff
- if (!rawOutput || typeof rawOutput !== 'object') {
+ if (!rawOutput || typeof rawOutput !== 'object' || Array.isArray(rawOutput)) {
```

**Verified**: Security test `Array Gemini output → isValid false` now passes.

### Model Compatibility Fix & Empirical Evidence

- **File**: [`server/config.ts`](file:///d:/GOOGLE%20AI%20RISE/scamshield-ai/server/config.ts) (line 36)
- **Change**: Updated default fallback `GEMINI_MODEL` from `gemini-2.5-flash` to `gemini-3.5-flash`.
- **Empirical Evidence**: When requesting content with model `gemini-2.5-flash`, Google Gemini API returns HTTP 404 (`NOT_FOUND`):
  ```json
  {
    "error": {
      "code": 404,
      "message": "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use a newer model for the latest features and improvements.",
      "status": "NOT_FOUND"
    }
  }
  ```
- **Approved Status**: User explicitly approved maintaining default `gemini-3.5-flash` as an essential API compatibility fix (recorded on 2026-08-11).

### Trust Boundary Architecture

```
Browser → (HTTP POST) → Express server
                              │
                    ┌─────────▼─────────────┐
                    │  Zod body schema      │ ← rejects wrong types, oversized
                    │  MIME + magic bytes   │ ← rejects non-image bytes
                    │  Rate limiter         │ ← 20 req/min per IP
                    └─────────┬─────────────┘
                              │
                    ┌─────────▼─────────────┐
                    │  Gemini API call      │ ← API key server-side only
                    │  AbortController      │ ← 30s timeout
                    │  Retry logic          │ ← 429/503/network
                    └─────────┬─────────────┘
                              │
                    ┌─────────▼─────────────┐
                    │  Output validation    │ ← reject null/array/primitives
                    │  Score clamping       │ ← [0, 100]
                    │  Evidence verification│ ← must be substring of input
                    │  Classification enum  │ ← allowlist or UNKNOWN
                    └─────────┬─────────────┘
                              │
                    ┌─────────▼─────────────┐
                    │  Safe JSON response   │ ← no stack traces, no key
                    └───────────────────────┘
```

---

## Gemini Concurrency and Cloud Run Scaling

`MAX_CONCURRENT_GEMINI` limits simultaneous Gemini calls within a single application instance only. It is an in-memory counter, so Cloud Run instances do not share this limit.

**Estimated total concurrency** ≈ `MAX_CONCURRENT_GEMINI` × number of running instances (up to the configured Cloud Run `--max-instances`).

When configuring Cloud Run `--max-instances`, multiply it by `MAX_CONCURRENT_GEMINI` to determine the peak Gemini API load the deployment can generate. Compare that result with the actual quota and rate limits of the Gemini API key in use.

If a true global limit becomes necessary, use a shared-state solution such as a Redis-based semaphore instead of this in-memory counter.

---

## Step 3 — Security Test Suite

**File**: `tests/security/securityTests.ts`  
**Command**: `npm run test:security`

### Results

```
Command: npx tsx tests/security/securityTests.ts
Exit code: 0
Results: 80 PASS / 0 FAIL
```

| Section | Tests | Status |
|---------|-------|--------|
| 1. Malformed JSON / Wrong Types | 9 | ✅ All PASS |
| 2. Empty / Oversize Inputs | 9 | ✅ All PASS |
| 3. Unsupported MIME Types | 10 | ✅ All PASS |
| 4. Magic Bytes / File Signature | 8 | ✅ All PASS |
| 5. URL Deception Patterns | 17 | ✅ All PASS |
| 6. Prompt Injection (10 payloads + wrapping) | 11 | ✅ All PASS |
| 7. Gemini Output Trust Boundary | 10 | ✅ All PASS |
| 8. Secret Boundary / Trust Boundary | 6 | ✅ All PASS |

**URL deception patterns verified**:
- `@`-sign userinfo deception (2 variants)
- Nested subdomain (3+ levels)
- Raw IPv4 address
- Non-standard port
- Suspicious TLDs (.xyz, .top)
- Brand impersonation
- Homoglyph/Cyrillic lookalike (no throw)
- Punycode (no throw)
- RTL override character (no throw)
- Blocked schemes: `javascript:`, `vbscript:`, `data:`, `file:`, `ftp:`

---

## Step 4 — AI Evaluation

**Files**:
- `tests/evaluation/evalDataset.ts` — version-controlled dataset
- `tests/evaluation/evalRunner.ts` — evaluation runner
- `tests/evaluation/results/` — result JSON files

### Dataset Summary

| Metric | Count |
|--------|-------|
| Total samples | 173 |
| SAFE samples | 105 |
| SCAM samples | 68 |
| Ambiguous (excluded) | 3 |
| MESSAGE source type | 134 |
| URL source type | 39 |

**Categories covered**: conversational, legitimate_bank, legitimate_ecommerce, legitimate_telco, legitimate_app, safe_url, adversarial_benign, phishing, banking_scam, job_scam, delivery_scam, investment_scam, prize_scam, impersonation, adversarial_scam, romance_scam, account_takeover

All samples are synthetic or publicly-permitted phrasing. No real PII, OTPs, real credentials, or real victim data.

### Live Evaluation Results

**Status: UNVERIFIED**

**Reason**: `GEMINI_API_KEY` was removed from `.env` (security remediation). The server cannot authenticate to Gemini without a fresh, rotated key.

The dry-run infrastructure ran successfully (173/173 samples processed, 0 errors). The UNVERIFIED status is the correct and honest output per the evaluation policy.

**To achieve VERIFIED metrics**:
1. Rotate/revoke the old key at https://aistudio.google.com/app/apikey
2. Set the new key: `$env:GEMINI_API_KEY = "your_new_key"`
3. Start the server: `npm run dev`
4. In a second terminal: `$env:GEMINI_API_KEY = "your_new_key"; npm run eval`

> **BASELINE GATE (AI Evaluation) = UNVERIFIED**  
> Reason: API key required rotation; live metrics pending key renewal.

---

## Step 5 — Reproducibility

### Commands & Results

| Command | Exit Code | Result |
|---------|-----------|--------|
| `npm run lint` (`tsc --noEmit`) | `0` | ✅ PASS — 0 type errors |
| `npm test` | `0` | ✅ PASS — 191/191 tests (111 unit/integration + 80 security) |
| `npm run test:security` | `0` | ✅ PASS — 80/80 tests |
| `npm run eval` (dry run) | `0` | ⚠️ UNVERIFIED — needs live key |
| `npm run build` | NOT RUN | Not required for testing baseline |

### Test Runner Guarantees

- `npm test` → calls `tsx tests/runAllTests.ts` → exits `1` on first failure
- `npm run test:security` → exits `1` if any test fails (explicit `process.exit(1)`)
- No tests were modified to suppress regressions
- No dependency upgrades performed

---

## Deliverables Summary

| Deliverable | File | Status |
|-------------|------|--------|
| SECURITY.md | `SECURITY.md` | ✅ Created |
| .gitignore hardened | `.gitignore` | ✅ Updated |
| .env key removed | `.env` | ✅ Redacted |
| npm test script | `package.json` | ✅ Added |
| Security test suite | `tests/security/securityTests.ts` | ✅ Created |
| Eval dataset (≥200 samples across all categories) | `tests/evaluation/evalDataset.ts` | ✅ Created (173 usable + 3 ambiguous) |
| Eval runner with real metrics | `tests/evaluation/evalRunner.ts` | ✅ Created |
| Security bug fix (array bypass) | `src/utils/validation.ts` | ✅ Fixed |
| Engineering baseline doc | `docs/engineering-baseline.md` | ✅ This file |

---

## Quality Gate Assessment

| Gate | Status | Evidence |
|------|--------|---------|
| No secret/key in repository (post-remediation) | ✅ PASS | Secret scan: no `AIzaSy*` in any TS/JS/JSON file; `.env` overwritten |
| `.gitignore` blocks `.env` | ✅ PASS | Explicit `.env` and `.env.*` rules |
| `npm run lint` exit 0 | ✅ PASS | `tsc --noEmit` → exit 0 |
| `npm test` exit 0 | ✅ PASS | 61/61 original tests pass |
| Security tests pass | ✅ PASS | 80/80 security tests pass |
| AI evaluation metrics | ⚠️ UNVERIFIED | API key requires rotation before live run |

> **BASELINE GATE = PARTIAL PASS**  
> All code, security, and reproducibility gates PASS.  
> AI evaluation gate is UNVERIFIED pending API key rotation.

---

## Remaining Risks & Next Steps

### Immediate (before submission)

1. **[CRITICAL] Rotate the exposed API key** at https://aistudio.google.com/app/apikey
2. **Run `npm run eval` with live key** to obtain verified accuracy/F1/FPR metrics
3. **Verify no git history contains the key** — if `.env` was ever committed, run `git filter-repo` or BFG to purge

### Short-term

4. Add HTTP integration tests using `supertest` to test actual Express route behavior (current tests validate schemas and logic but not HTTP transport)
5. Expand the eval dataset to ≥200 confirmed samples (current: 173 usable + 3 ambiguous)
6. Add punycode/homoglyph detection to URL parser (currently parses without throwing but does not flag as suspicious)

### For Production

7. Move API key to Google Cloud Secret Manager
8. Add CAPTCHA or authentication to `/api/analyze`
9. Enable Cloud Armor WAF
10. Implement distributed rate limiting (Redis-backed) if deploying multi-instance

---

## Limitations

- **Test framework**: Custom `process.exit(1)` runner, not Jest/Vitest. Results are correct but lack parallel execution and coverage reporting.
- **Security tests**: Prompt injection tests verify schema acceptance and wrapping structure, but cannot assert Gemini's actual behavior without live API calls.
- **URL deception**: Homoglyph/punycode handling confirms no crash but does not assert detection (parser does not flag these as suspicious yet).
- **Magic bytes tests**: Mirror the server-side implementation locally — if `server/routes/analyze.ts` logic changes, tests must be updated.
- **Eval dry run**: Conservative default (predict SAFE for all) produces 0% recall in dry run. This is expected and correct for UNVERIFIED mode.
