import {
  AnalysisResult,
  Classification,
  Indicator,
  RiskLevel,
  SourceType,
} from '../types/analysis.js';
import { calculateRiskLevel, clampRiskScore, generateAnalysisId } from './helpers.js';
import { parseUrl } from './urlParser.js';

export interface ValidationStatus {
  isValid: boolean;
  error?: string;
}

/**
 * Validates text message input.
 */
export function validateMessageInput(content: string): ValidationStatus {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Nội dung tin nhắn không được để trống.' };
  }
  if (trimmed.length < 5) {
    return { isValid: false, error: 'Nội dung quá ngắn để phân tích (tối thiểu 5 ký tự).' };
  }
  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Nội dung quá dài (tối đa 2,000 ký tự).' };
  }
  return { isValid: true };
}

/**
 * Validates screenshot input.
 */
export function validateScreenshotInput(
  fileOrBase64: File | string | null
): ValidationStatus {
  if (!fileOrBase64) {
    return { isValid: false, error: 'Vui lòng chọn hoặc tải lên ảnh chụp màn hình.' };
  }

  if (fileOrBase64 && typeof fileOrBase64 === 'object') {
    const fileObj = fileOrBase64 as { name?: string; type?: string; size?: number };
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const name = (fileObj.name || '').toLowerCase();
    const mime = (fileObj.type || '').toLowerCase();

    const hasValidExt = validExts.some((ext) => name.endsWith(ext));
    const hasValidType = validTypes.includes(mime);

    if (!hasValidExt || !hasValidType) {
      return {
        isValid: false,
        error: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh PNG, JPG/JPEG hoặc WEBP.',
      };
    }

    if (typeof fileObj.size === 'number' && fileObj.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'Dung lượng ảnh vượt quá 10MB.' };
    }
  } else if (typeof fileOrBase64 === 'string') {
    const trimmed = fileOrBase64.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Vui lòng chọn hoặc tải lên ảnh chụp màn hình.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates URL input.
 */
export function validateUrlInput(url: string): ValidationStatus {
  const parsed = parseUrl(url);
  if (!parsed.isValid) {
    return { isValid: false, error: parsed.error || 'Địa chỉ URL không hợp lệ.' };
  }
  return { isValid: true };
}

const VALID_CLASSIFICATIONS: Classification[] = [
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
];

function sanitizeIndicatorType(rawType: string): string {
  const upper = (rawType || '').toUpperCase();
  if (upper.includes('URGENCY') || upper.includes('TIME') || upper.includes('KHẨN')) return 'URGENCY';
  if (upper.includes('THREAT') || upper.includes('ĐE DỌA') || upper.includes('HÙ DỌA')) return 'THREAT';
  if (upper.includes('IMPERSONAT') || upper.includes('GIẢ DANH') || upper.includes('MẠO DANH')) return 'IMPERSONATION';
  if (upper.includes('CREDENTIAL') || upper.includes('OTP') || upper.includes('PASSWORD') || upper.includes('MẬT KHẨU')) return 'CREDENTIAL_REQUEST';
  if (upper.includes('FINANCIAL') || upper.includes('MONEY') || upper.includes('FEE') || upper.includes('CHUYỂN TIỀN')) return 'FINANCIAL_REQUEST';
  if (upper.includes('URL') || upper.includes('LINK') || upper.includes('DOMAIN') || upper.includes('TÊN MIỀN')) return 'SUSPICIOUS_URL';
  if (upper.includes('OFFER') || upper.includes('JOB') || upper.includes('PRIZE') || upper.includes('TRÚNG THƯỞNG')) return 'UNREALISTIC_OFFER';
  if (upper.includes('SOCIAL') || upper.includes('ENGINEER') || upper.includes('THAO TÚNG')) return 'SOCIAL_ENGINEERING';
  return 'OTHER';
}

export function verifyAndExtractEvidence(
  rawEvidence: unknown,
  inputContent: string,
  sourceType: SourceType = 'MESSAGE'
): string | null {
  if (typeof rawEvidence !== 'string') return null;
  const trimmed = rawEvidence.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  // Strip leading and trailing quotes or bracket punctuation if added by model
  let cleaned = trimmed.replace(/^[“"'\s«`]+|[”"'\s»`]+$/g, '').trim();
  if (!cleaned) return null;

  // For MESSAGE or URL, verify substring against inputContent
  if (sourceType === 'MESSAGE' || sourceType === 'URL') {
    if (!inputContent) return null;

    // 1. Direct case-insensitive search
    let matchIndex = inputContent.toLowerCase().indexOf(cleaned.toLowerCase());
    if (matchIndex !== -1) {
      return inputContent.substring(matchIndex, matchIndex + cleaned.length);
    }

    // 2. Strip trailing punctuation like . , ! ? : ; if present at the end of cleaned
    let strippedPunct = cleaned.replace(/[.,!?:;]+$/g, '').trim();
    if (strippedPunct.length > 0) {
      matchIndex = inputContent.toLowerCase().indexOf(strippedPunct.toLowerCase());
      if (matchIndex !== -1) {
        return inputContent.substring(matchIndex, matchIndex + strippedPunct.length);
      }
    }

    // 3. Flexible spacing regex match
    try {
      const normCleaned = cleaned.replace(/\s+/g, ' ');
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = normCleaned.split(' ').map(escapeRegex).join('\\s+');
      const regex = new RegExp(pattern, 'i');
      const match = inputContent.match(regex);
      if (match && match[0]) {
        return match[0];
      }
    } catch (e) {
      // Ignore regex error
    }

    return null;
  }

  // For SCREENSHOT, Gemini multimodal extracts visible text from the screenshot.
  if (sourceType === 'SCREENSHOT') {
    if (cleaned.length > 200) {
      return cleaned.substring(0, 200);
    }
    return cleaned;
  }

  return null;
}

/**
 * Strict Schema Validation for future AI output.
 * Guarantees:
 * 1. riskScore is clamped strictly 0-100.
 * 2. riskLevel is computed automatically based on score (0-24: LOW, 25-49: MEDIUM, 50-74: HIGH, 75-100: CRITICAL).
 * 3. classification is constrained to allowed enum values or defaults to UNKNOWN.
 * 4. indicator.evidence MUST be a substring excerpt from inputContent, or set to null.
 */
import { processRiskIntelligence } from '../services/riskIntelligence/index.js';

export function validateAnalysisOutput(
  rawOutput: unknown,
  inputContent: string,
  sourceType: SourceType
): { isValid: boolean; data?: AnalysisResult; errors?: string[] } {
  if (!rawOutput || typeof rawOutput !== 'object' || Array.isArray(rawOutput)) {
    return {
      isValid: false,
      errors: ['Dữ liệu phản hồi không đúng cấu trúc đối tượng JSON.'],
    };
  }

  const raw = rawOutput as Record<string, unknown>;

  // Extract parsed URL if sourceType is URL
  let parsedUrlResult = null;
  if (sourceType === 'URL' && inputContent) {
    parsedUrlResult = parseUrl(inputContent);
  }

  // Pass through Risk Intelligence Engine
  const { publicAnalysisResult } = processRiskIntelligence({
    sourceType,
    inputContent,
    rawGeminiOutput: raw,
    parsedUrlResult: parsedUrlResult?.isValid ? parsedUrlResult : null,
    evidenceConfidence: typeof raw.evidenceConfidence === 'number' ? raw.evidenceConfidence : undefined,
  });

  // Preserve id if passed in raw
  if (typeof raw.id === 'string' && raw.id.trim()) {
    publicAnalysisResult.id = raw.id;
  }

  return {
    isValid: true,
    data: publicAnalysisResult,
  };
}

