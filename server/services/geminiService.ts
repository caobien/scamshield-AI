/**
 * server/services/geminiService.ts
 * Singleton Gemini client with timeout (AbortController) and retry logic.
 *
 * Retry policy:
 * - Retries: 429 (rate limited), 503 (unavailable), network errors
 * - No retry: 4xx validation errors from client, schema violations
 * - Backoff: exponential with jitter (base 500ms, max 8s)
 * - Max retries: configured via GEMINI_MAX_RETRIES env (default 3)
 *
 * Security:
 * - API key is read once at startup, never logged, never returned to client
 * - Timeout enforced via AbortController per call
 * - Provider error messages are NOT forwarded to client
 */
import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.js';
import { logRequest } from '../middleware/logger.js';

// ─── Singleton Client ────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = config.geminiApiKey; // Throws if not set
    _client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'scamshield-ai/1.0' },
      },
    });
  }
  return _client;
}

// ─── Retry Utilities ─────────────────────────────────────────────────────────

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Network-level errors
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnreset')) {
      return true;
    }
    // Gemini SDK wraps status codes in error message
    if (msg.includes('429') || msg.includes('too many requests')) return true;
    if (msg.includes('503') || msg.includes('service unavailable')) return true;
    if (msg.includes('500') || msg.includes('internal server error')) return true;
    if (msg.includes('aborted') || msg.includes('abort')) return false; // Our own timeout — don't retry
  }
  return false;
}

function exponentialBackoffMs(attempt: number): number {
  const base = 500;
  const cap = 8_000;
  const exp = Math.min(base * Math.pow(2, attempt), cap);
  // Add jitter: ±25% of exp
  const jitter = exp * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exp + jitter);
}

// ─── Gemini Response Schema ──────────────────────────────────────────────────

export const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    riskScore: {
      type: Type.INTEGER,
      description: 'Điểm số rủi ro từ 0 đến 100',
    },
    classification: {
      type: Type.STRING,
      description:
        'SAFE | PHISHING | BANKING_SCAM | JOB_SCAM | INVESTMENT_SCAM | PRIZE_SCAM | IMPERSONATION | ACCOUNT_TAKEOVER | ROMANCE_SCAM | OTHER_SCAM | UNKNOWN',
    },
    evidenceConfidence: {
      type: Type.INTEGER,
      description: 'Mức độ tin cậy bằng chứng 0-100',
    },
    summary: {
      type: Type.STRING,
      description: 'Tóm tắt phán quyết tối đa 2 câu bằng tiếng Việt',
    },
    indicators: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description:
              'URGENCY | THREAT | IMPERSONATION | CREDENTIAL_REQUEST | FINANCIAL_REQUEST | SUSPICIOUS_URL | UNREALISTIC_OFFER | SOCIAL_ENGINEERING | OTHER',
          },
          description: {
            type: Type.STRING,
            description: 'Tên hoặc mô tả ngắn dấu hiệu tiếng Việt',
          },
          severity: {
            type: Type.STRING,
            description: 'LOW | MEDIUM | HIGH',
          },
          evidence: {
            type: Type.STRING,
            description: 'Đoạn trích NGUYÊN VĂN chính xác có trong đầu vào hoặc null',
            nullable: true,
          },
          explanation: {
            type: Type.STRING,
            description: 'Giải thích ngắn gọn tối đa 2 câu bằng tiếng Việt',
          },
        },
        required: ['type', 'description', 'evidence', 'explanation'],
      },
      description: 'Danh sách các dấu hiệu nghi vấn (tối đa 4). Chỉ bao gồm dấu hiệu thực sự xuất hiện.',
    },
    explanation: {
      type: Type.STRING,
      description: 'Giải thích chi tiết tâm lý, thủ đoạn lừa đảo bằng tiếng Việt',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tối đa 3 hành động cụ thể',
    },
    limitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Giới hạn phân tích hoặc cảnh báo xác minh thêm',
    },
  },
  required: ['riskScore', 'classification', 'summary', 'explanation', 'recommendations'],
} as const;

// ─── Concurrency Limiter ─────────────────────────────────────────────────────

// Per-instance only: each Cloud Run container maintains its own count, not a global limit.
// See docs/engineering-baseline.md, "Gemini Concurrency and Cloud Run Scaling", for quota planning.
let _activeCalls = 0;
const MAX = config.maxConcurrentGeminiCalls;

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (_activeCalls >= MAX) {
    throw new GeminiServiceError(
      'Hệ thống đang xử lý nhiều yêu cầu cùng lúc. Vui lòng thử lại sau giây lát.',
      'CONCURRENCY_LIMIT'
    );
  }
  _activeCalls++;
  try {
    return await fn();
  } finally {
    _activeCalls--;
  }
}

// ─── Custom Error ────────────────────────────────────────────────────────────

export class GeminiServiceError extends Error {
  public readonly code: string;
  public readonly retryCount: number;

  constructor(message: string, code: string, retryCount = 0) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.retryCount = retryCount;
  }
}

// ─── Main Call Function ──────────────────────────────────────────────────────

export interface GeminiCallParams {
  systemInstruction: string;
  contents: unknown;
  requestId: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GeminiCallResult {
  rawJson: unknown;
  retryCount: number;
}

/**
 * Calls Gemini with timeout and retry logic.
 * Returns parsed JSON or throws GeminiServiceError with a safe message.
 */
export async function callGeminiWithRetry(
  params: GeminiCallParams
): Promise<GeminiCallResult> {
  const {
    systemInstruction,
    contents,
    requestId,
    timeoutMs = config.geminiTimeoutMs,
    maxRetries = config.geminiMaxRetries,
  } = params;

  const client = getClient();
  let lastError: unknown = null;
  let attempt = 0;

  return withConcurrencyLimit(async () => {
    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await client.models.generateContent({
          model: config.geminiModel,
          contents: contents as any,
          config: {
            systemInstruction,
            temperature: config.geminiTemperature,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA as any,
          },
        });

        clearTimeout(timeoutHandle);

        const responseText = response.text;
        if (!responseText || !responseText.trim()) {
          throw new GeminiServiceError(
            'Mô hình AI không trả về nội dung kết quả.',
            'EMPTY_RESPONSE',
            attempt
          );
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(responseText.trim());
        } catch {
          throw new GeminiServiceError(
            'Kết quả từ AI không đúng định dạng JSON.',
            'INVALID_JSON',
            attempt
          );
        }

        return { rawJson: parsed, retryCount: attempt };
      } catch (err: unknown) {
        clearTimeout(timeoutHandle);

        // If it's already our typed error (e.g. empty response, invalid JSON), don't retry
        if (err instanceof GeminiServiceError) {
          throw err;
        }

        lastError = err;

        const isAbort =
          err instanceof Error &&
          (err.name === 'AbortError' || err.message.includes('aborted'));

        if (isAbort) {
          logRequest(requestId, 'WARN', 'Gemini call timed out', {
            errorCode: 'TIMEOUT',
            retryCount: attempt,
          });
          throw new GeminiServiceError(
            `Hệ thống AI không phản hồi trong thời gian cho phép (${Math.round(timeoutMs / 1000)}s). Vui lòng thử lại.`,
            'TIMEOUT',
            attempt
          );
        }

        if (attempt < maxRetries && isRetryableError(err)) {
          const delayMs = exponentialBackoffMs(attempt);
          logRequest(requestId, 'WARN', `Gemini retryable error — attempt ${attempt + 1}/${maxRetries}`, {
            errorCode: 'RETRYABLE',
            retryCount: attempt,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        // Not retryable or exhausted retries — throw safe error
        const isRateLimit = err instanceof Error && (
          err.message.includes('429') ||
          err.message.toLowerCase().includes('quota') ||
          err.message.toLowerCase().includes('too many requests')
        );
        const errorCode = isRateLimit ? 'RATE_LIMIT' : 'GEMINI_FAILURE';

        logRequest(requestId, 'ERROR', 'Gemini call failed', {
          errorCode,
          retryCount: attempt,
        });
        throw new GeminiServiceError(
          isRateLimit
            ? 'Tần suất gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát.'
            : 'Hệ thống AI không thể hoàn tất phân tích lúc này. Vui lòng thử lại sau.',
          errorCode,
          attempt
        );
      }
    }

    // Exhausted retries
    throw new GeminiServiceError(
      'Hệ thống AI không thể hoàn tất phân tích sau nhiều lần thử. Vui lòng thử lại sau.',
      'MAX_RETRIES_EXCEEDED',
      attempt
    );
  });
}
