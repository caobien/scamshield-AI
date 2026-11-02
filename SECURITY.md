# SECURITY.md — ScamShield AI

## Reporting a Vulnerability

If you discover a security issue, please **do NOT open a public GitHub issue**.

Contact: Report privately via the repository's Security tab → "Report a vulnerability", or email the project maintainer directly.

**Response time**: We aim to acknowledge within 48 hours and provide an initial assessment within 7 days.

---

## Security Architecture

### Trust Boundaries

```
Browser (untrusted)
    │  HTTP POST /api/analyze
    ▼
Express Server (trusted boundary)
    │  ├─ Zod schema validation (body shape, types, size limits)
    │  ├─ Magic bytes validation (image MIME vs actual bytes)
    │  ├─ Rate limiting (20 req/min per IP)
    │  └─ Request ID + structured logging (no user content in logs)
    │
    ▼
Gemini API (untrusted output — validated before return)
    │  ├─ Schema validation (Zod — types, ranges, enums)
    │  ├─ Score clamping (riskScore 0–100)
    │  ├─ Classification enum allowlist
    │  ├─ Evidence verification (substring must exist in input)
    │  └─ Array/primitive output rejection
    │
    ▼
Client (receives only sanitized, validated JSON)
```

### Secrets

| Secret | Location | Rule |
|--------|----------|------|
| `GEMINI_API_KEY` | Server-side only | Never in client bundle; never logged; accessed via `server/config.ts` |
| Vite env vars | Client bundle | No `VITE_*` secrets exist in this project |

### Input Untrusted Data Handling

All user-provided input (messages, URLs, OCR text from screenshots) is:
1. **Size-limited** before any processing (2,000 chars for messages/URLs; 10 MB for images)
2. **Type-validated** with Zod schemas (rejects arrays, numbers, objects in string fields)
3. **Wrapped in `<UNTRUSTED_USER_INPUT>` tags** before being sent to Gemini to prevent prompt injection
4. **Never fetched/resolved** — URL analysis is purely structural, no DNS or HTTP requests

### Gemini Output Validation (Defense Against Malicious AI Response)

All Gemini responses are treated as untrusted input and go through:
1. JSON parse validation
2. Type check: must be a plain object (arrays, primitives rejected)
3. Zod schema validation with explicit enum allowlists
4. Score clamping: `riskScore` and `evidenceConfidence` bounded to [0, 100]
5. Evidence verification: `indicator.evidence` must be a literal substring of the original input
6. Classification fallback: unknown values → `UNKNOWN`

### Security Headers

Applied via `server/middleware/securityHeaders.ts`:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (HSTS) in production

### Rate Limiting

- 20 requests per minute per IP (default)
- 5 concurrent Gemini API calls maximum (cost protection)
- Configurable via env vars: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `MAX_CONCURRENT_GEMINI`

### Error Responses

- No stack traces returned to clients
- No provider/internal paths in error messages
- No API keys in error messages
- Errors use safe, localized Vietnamese messages

---

## Known Limitations

1. **Prompt injection resistance is advisory, not guaranteed** — Gemini LLMs can be influenced by carefully crafted inputs. The `<UNTRUSTED_USER_INPUT>` wrapper and system instruction reduce risk but cannot eliminate it.

2. **URL analysis is structural only** — We do not fetch or resolve URLs. Malicious intent may not be detectable from structure alone for freshly registered clean-looking domains.

3. **Screenshot OCR accuracy** — Gemini's multimodal OCR may miss text in certain image qualities. Low-confidence results are flagged via `evidenceConfidence`.

4. **Rate limiting** — IP-based rate limiting can be bypassed via distributed requests. Consider adding CAPTCHA for production.

5. **No authentication** — The API is public. For production deployment, add authentication.

---

## Security Checklist for Deployment

- [ ] Rotate/revoke any previously exposed API keys (see step below)
- [ ] Set `GEMINI_API_KEY` via Secret Manager (not plain environment variable on Cloud Run)
- [ ] Set `NODE_ENV=production`
- [ ] Enable Cloud Armor or WAF in front of Cloud Run
- [ ] Review rate limits for production traffic expectations
- [ ] Enable Cloud Run audit logging

---

## Key Rotation Procedure

If a Gemini API key is exposed:

1. **Immediately revoke** the key at: https://aistudio.google.com/app/apikey
2. Create a new key
3. Update Secret Manager (or `.env` for local dev only) with the new key
4. Redeploy the service
5. Audit logs for unauthorized usage during the exposure window

> ⚠️ A real API key was found in `.env` during the security audit on 2026-08-11.
> The key has been replaced with a placeholder in the repository.
> **The original key must be rotated/revoked immediately.**
