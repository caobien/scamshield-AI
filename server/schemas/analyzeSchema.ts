/**
 * server/schemas/analyzeSchema.ts
 * Zod schemas for /api/analyze request validation and Gemini output validation.
 * Using Zod for type-safe parsing with runtime guarantees.
 */
import { z } from 'zod';
import { config } from '../config.js';

// ─── Request Body Schema ────────────────────────────────────────────────────

const VALID_SOURCE_TYPES = ['MESSAGE', 'SCREENSHOT', 'URL'] as const;

const VALID_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'] as const;

export const analyzeBodySchema = z
  .object({
    sourceType: z
      .enum(VALID_SOURCE_TYPES, {
        error: 'sourceType phải là MESSAGE, SCREENSHOT hoặc URL.',
      })
      .default('MESSAGE'),

    inputContent: z
      .string()
      .max(config.maxMessageChars, `Nội dung quá dài (tối đa ${config.maxMessageChars.toLocaleString()} ký tự).`)
      .optional()
      .default(''),

    imageBase64: z
      .string()
      .max(
        config.maxImageBase64Chars,
        'Dữ liệu ảnh vượt quá giới hạn cho phép (tối đa 10MB).'
      )
      .optional(),

    mimeType: z
      .string()
      .optional()
      .transform((v) => (v || 'image/png').toLowerCase()),
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === 'MESSAGE') {
      const trimmed = (data.inputContent || '').trim();
      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nội dung tin nhắn không được để trống.',
          path: ['inputContent'],
        });
        return;
      }
      if (trimmed.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nội dung quá ngắn để phân tích (tối thiểu 5 ký tự).',
          path: ['inputContent'],
        });
      }
    }

    if (data.sourceType === 'URL') {
      const trimmed = (data.inputContent || '').trim();
      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng nhập địa chỉ URL cần kiểm tra.',
          path: ['inputContent'],
        });
        return;
      }
      if (trimmed.length > config.maxUrlChars) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Độ dài URL vượt quá ${config.maxUrlChars.toLocaleString()} ký tự.`,
          path: ['inputContent'],
        });
      }
    }

    if (data.sourceType === 'SCREENSHOT') {
      if (!data.imageBase64 || !data.imageBase64.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn hoặc tải lên ảnh chụp màn hình.',
          path: ['imageBase64'],
        });
        return;
      }
      // Validate MIME type
      const normalizedMime = (data.mimeType || '').toLowerCase();
      const validMimes: readonly string[] = VALID_MIME_TYPES;
      if (normalizedMime && !validMimes.includes(normalizedMime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận PNG, JPG/JPEG hoặc WEBP.',
          path: ['mimeType'],
        });
      }
    }
  });

export type AnalyzeBody = z.infer<typeof analyzeBodySchema>;

// ─── Gemini Output Schema ───────────────────────────────────────────────────

const VALID_CLASSIFICATIONS = [
  'SAFE',
  'PHISHING',
  'BANKING_SCAM',
  'JOB_SCAM',
  'INVESTMENT_SCAM',
  'PRIZE_SCAM',
  'IMPERSONATION',
  'ACCOUNT_TAKEOVER',
  'ROMANCE_SCAM',
  'OTHER_SCAM',
  'UNKNOWN',
] as const;

const VALID_INDICATOR_TYPES = [
  'URGENCY',
  'THREAT',
  'IMPERSONATION',
  'CREDENTIAL_REQUEST',
  'FINANCIAL_REQUEST',
  'SUSPICIOUS_URL',
  'UNREALISTIC_OFFER',
  'SOCIAL_ENGINEERING',
  'OTHER',
] as const;

const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export const geminiIndicatorSchema = z.object({
  type: z
    .string()
    .transform((v) => v?.toUpperCase())
    .pipe(
      z
        .enum(VALID_INDICATOR_TYPES)
        .catch('OTHER')
    ),
  description: z
    .string()
    .min(1)
    .max(200)
    .catch('Phát hiện dấu hiệu cần lưu ý.'),
  severity: z
    .string()
    .transform((v) => v?.toUpperCase())
    .pipe(z.enum(VALID_SEVERITIES).catch('MEDIUM')),
  evidence: z.union([z.string().max(500), z.null()]).catch(null),
  explanation: z.string().max(500).optional().catch(undefined),
});

export const geminiOutputSchema = z.object({
  riskScore: z
    .union([z.number(), z.string().transform(Number)])
    .transform((v) => Math.min(100, Math.max(0, Math.round(isNaN(Number(v)) ? 0 : Number(v)))))
    .catch(0),

  classification: z
    .string()
    .transform((v) => v?.toUpperCase())
    .pipe(z.enum(VALID_CLASSIFICATIONS).catch('UNKNOWN')),

  evidenceConfidence: z
    .union([z.number(), z.string().transform(Number)])
    .transform((v) => Math.min(100, Math.max(0, Math.round(isNaN(Number(v)) ? 75 : Number(v)))))
    .catch(75),

  summary: z
    .string()
    .min(1)
    .max(500)
    .catch('Kết quả phân tích nội dung đáng ngờ.'),

  indicators: z
    .array(geminiIndicatorSchema)
    .max(10)
    .catch([]),

  explanation: z
    .string()
    .min(1)
    .max(1000)
    .catch('Không phát hiện bất thường rõ rệt trong nội dung được cung cấp.'),

  recommendations: z
    .array(z.string().max(300))
    .max(5)
    .catch([]),

  limitations: z
    .array(z.string().max(300))
    .max(5)
    .catch([]),
});

export type GeminiOutput = z.infer<typeof geminiOutputSchema>;
