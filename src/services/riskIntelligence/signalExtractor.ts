/**
 * src/services/riskIntelligence/signalExtractor.ts
 * Pure signal normalization layer for ScamShield AI Risk Intelligence Engine.
 *
 * Converts heterogeneous inputs (Gemini output, urlParser results, visual OCR context)
 * into standard RiskSignal[] array with strict multi-source provenance tagging.
 */

import { SourceType } from '../../types/analysis.js';
import { ParsedUrlResult } from '../../utils/urlParser.js';
import {
  RiskDimensionType,
  RiskSeverityLevel,
  RiskSignal,
  SignalProvenance,
} from './types.js';

export interface SignalExtractorParams {
  sourceType: SourceType;
  inputContent: string;
  rawGeminiOutput?: Record<string, unknown> | null;
  parsedUrlResult?: ParsedUrlResult | null;
  evidenceConfidence?: number;
}

// ─── Indicator Type → Risk Dimension Mapping (Taxonomy) ───────────────────────

const INDICATOR_DIMENSION_MAP: Record<string, RiskDimensionType> = {
  URGENCY: 'SOCIAL_ENGINEERING',
  THREAT: 'DECEPTION',
  IMPERSONATION: 'IMPERSONATION',
  CREDENTIAL_REQUEST: 'CREDENTIAL_THEFT',
  FINANCIAL_REQUEST: 'FINANCIAL',
  SUSPICIOUS_URL: 'MALWARE_LINK',
  UNREALISTIC_OFFER: 'DECEPTION',
  SOCIAL_ENGINEERING: 'SOCIAL_ENGINEERING',
  OTHER: 'DECEPTION',
  
  // Custom Taxonomy Signals
  URGENCY_PRESSURE: 'SOCIAL_ENGINEERING',
  THREAT_COERCION: 'DECEPTION',
  BANK_IMPERSONATION: 'IMPERSONATION',
  GOVT_IMPERSONATION: 'IMPERSONATION',
  BRAND_DOMAIN_MISMATCH: 'IMPERSONATION',
  OTP_REQUEST: 'CREDENTIAL_THEFT',
  CREDENTIAL_HARVEST: 'CREDENTIAL_THEFT',
  MONEY_TRANSFER_REQ: 'FINANCIAL',
  ADVANCE_FEE_REQ: 'FINANCIAL',
  SUSPICIOUS_TLD: 'MALWARE_LINK',
  IP_HOST_URL: 'MALWARE_LINK',
  USERINFO_AT_TRICK: 'DECEPTION',
  MULTIPLE_SUBDOMAINS: 'DECEPTION',
  NON_STANDARD_PORT: 'MALWARE_LINK',
  FAKE_LOGIN_UI: 'CREDENTIAL_THEFT',
  FAKE_BRAND_LOGO: 'IMPERSONATION',
  BENIGN_OTP_NOTIFICATION: 'DECEPTION',
  LOW_EVIDENCE_CONFIDENCE: 'DECEPTION',
};

export function mapIndicatorToDimension(type: string): RiskDimensionType {
  const upper = (type || '').toUpperCase();
  return INDICATOR_DIMENSION_MAP[upper] || 'DECEPTION';
}

function clampConfidence(val: unknown, fallback = 0.8): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  if (num > 1.0) return Math.min(1.0, Math.max(0.0, num / 100)); // Normalize 0-100 to 0.0-1.0 if needed
  return Math.min(1.0, Math.max(0.0, num));
}

function sanitizeSeverity(val: unknown): RiskSeverityLevel {
  const str = (typeof val === 'string' ? val : '').toUpperCase();
  if (str === 'CRITICAL' || str === 'HIGH') return 'HIGH';
  if (str === 'MEDIUM') return 'MEDIUM';
  if (str === 'LOW') return 'LOW';
  return 'MEDIUM';
}

/**
 * Extracts and normalizes signals from all available analyzers into RiskSignal[].
 */
export function extractSignals(params: SignalExtractorParams): RiskSignal[] {
  const { sourceType, inputContent, rawGeminiOutput, parsedUrlResult, evidenceConfidence } = params;
  const signals: RiskSignal[] = [];
  const now = new Date().toISOString();
  let signalCounter = 0;

  const nextSignalId = (prefix: string) => `${prefix}_${Date.now()}_${++signalCounter}`;

  // ── 1. Deterministic URL Parser Signals ──────────────────────────────────────

  if (parsedUrlResult && parsedUrlResult.isValid) {
    const urlProv: SignalProvenance = {
      sourceType: 'DETERMINISTIC_PARSER',
      extractorId: 'urlParser_v1',
      timestamp: now,
      isDeterministic: true,
    };

    if (parsedUrlResult.hasBrandImpersonation && parsedUrlResult.impersonatedBrand) {
      signals.push({
        signalId: nextSignalId('url_brand_mismatch'),
        type: 'BRAND_DOMAIN_MISMATCH',
        description: `Tên miền không thuộc kênh chính thức của thương hiệu ${parsedUrlResult.impersonatedBrand}`,
        dimension: 'IMPERSONATION',
        severity: 'HIGH',
        confidence: 1.0,
        evidence: parsedUrlResult.domain || parsedUrlResult.hostname,
        explanation: `Đường dẫn chứa từ khóa "${parsedUrlResult.impersonatedBrand}" nhưng tên miền chính là "${parsedUrlResult.domain}".`,
        provenance: urlProv,
        metadata: { brand: parsedUrlResult.impersonatedBrand, domain: parsedUrlResult.domain },
      });
    }

    if (parsedUrlResult.isIpAddress) {
      signals.push({
        signalId: nextSignalId('url_ip_host'),
        type: 'IP_HOST_URL',
        description: 'Sử dụng địa chỉ IP thô thay cho tên miền có định danh',
        dimension: 'MALWARE_LINK',
        severity: 'HIGH',
        confidence: 1.0,
        evidence: parsedUrlResult.hostname,
        explanation: 'Trang web sử dụng địa chỉ IP trực tiếp, thường dùng trong các chiến dịch lừa đảo để né tránh kiểm duyệt tên miền.',
        provenance: urlProv,
        metadata: { ip: parsedUrlResult.hostname },
      });
    }

    if (parsedUrlResult.hasUserInfo) {
      signals.push({
        signalId: nextSignalId('url_userinfo'),
        type: 'USERINFO_AT_TRICK',
        description: 'Chứa ký tự "@" ẩn danh giả mạo địa chỉ thực',
        dimension: 'DECEPTION',
        severity: 'HIGH',
        confidence: 1.0,
        evidence: parsedUrlResult.rawUrl,
        explanation: 'Kỹ thuật chèn ký tự "@" khiến người dùng nhầm tưởng truy cập trang web uy tín đứng trước ký tự "@".',
        provenance: urlProv,
      });
    }

    if (parsedUrlResult.hasMultipleSubdomains) {
      signals.push({
        signalId: nextSignalId('url_subdomains'),
        type: 'MULTIPLE_SUBDOMAINS',
        description: `Tên miền có nhiều cấp subdomain (${parsedUrlResult.subdomainCount} cấp)`,
        dimension: 'DECEPTION',
        severity: 'MEDIUM',
        confidence: 1.0,
        evidence: parsedUrlResult.subdomain,
        explanation: 'Sử dụng nhiều cấp tên miền con nhằm tạo cảm giác giống trang web thật.',
        provenance: urlProv,
        metadata: { subdomainCount: parsedUrlResult.subdomainCount },
      });
    }

    if (parsedUrlResult.isSuspiciousTld) {
      signals.push({
        signalId: nextSignalId('url_suspicious_tld'),
        type: 'SUSPICIOUS_TLD',
        description: `Tên miền sử dụng đuôi mở rộng nghi vấn (.${parsedUrlResult.tld})`,
        dimension: 'MALWARE_LINK',
        severity: 'MEDIUM',
        confidence: 0.9,
        evidence: `.${parsedUrlResult.tld}`,
        explanation: `Đuôi tên miền mở rộng .${parsedUrlResult.tld} thường được đăng ký chi phí thấp cho mục đích đáng ngờ.`,
        provenance: urlProv,
        metadata: { tld: parsedUrlResult.tld },
      });
    }

    if (parsedUrlResult.hasNonStandardPort) {
      signals.push({
        signalId: nextSignalId('url_port'),
        type: 'NON_STANDARD_PORT',
        description: `Sử dụng cổng dịch vụ phi tiêu chuẩn (Port ${parsedUrlResult.port})`,
        dimension: 'MALWARE_LINK',
        severity: 'MEDIUM',
        confidence: 1.0,
        evidence: parsedUrlResult.port || null,
        explanation: 'Truy cập thông qua cổng mạng phi tiêu chuẩn thay vì cổng web mặc định 80/443.',
        provenance: urlProv,
      });
    }
  }

  // ── 2. Generative Gemini Model Signals ────────────────────────────────────────

  if (rawGeminiOutput && typeof rawGeminiOutput === 'object') {
    const geminiProv: SignalProvenance = {
      sourceType: 'MODEL_INFERENCE',
      extractorId: 'gemini_3.5_flash',
      timestamp: now,
      isDeterministic: false,
    };

    const overallConfidence = clampConfidence(
      evidenceConfidence ?? rawGeminiOutput.evidenceConfidence,
      0.8
    );

    // Extract indicators array
    const rawIndicators = Array.isArray(rawGeminiOutput.indicators)
      ? rawGeminiOutput.indicators
      : [];

    for (const item of rawIndicators) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>;
        const rawType = typeof itemObj.type === 'string' ? itemObj.type.toUpperCase() : 'OTHER';
        const dimension = mapIndicatorToDimension(rawType);
        const severity = sanitizeSeverity(itemObj.severity);
        const description = typeof itemObj.description === 'string' ? itemObj.description.trim() : rawType;
        const evidence = typeof itemObj.evidence === 'string' && itemObj.evidence.trim() ? itemObj.evidence.trim() : null;
        const explanation = typeof itemObj.explanation === 'string' ? itemObj.explanation.trim() : undefined;

        signals.push({
          signalId: nextSignalId('gemini_ind'),
          type: rawType,
          description,
          dimension,
          severity,
          confidence: overallConfidence,
          evidence,
          explanation,
          provenance: geminiProv,
        });
      }
    }

    // Contextual Benign OTP Signal Check
    const classificationStr = String(rawGeminiOutput.classification || '').toUpperCase();
    const riskScoreNum = Number(rawGeminiOutput.riskScore || 0);

    if (
      classificationStr === 'SAFE' &&
      riskScoreNum <= 20 &&
      inputContent.toLowerCase().includes('otp')
    ) {
      signals.push({
        signalId: nextSignalId('benign_otp'),
        type: 'BENIGN_OTP_NOTIFICATION',
        description: 'Thông báo mã OTP xác thực hợp lệ',
        dimension: 'DECEPTION',
        severity: 'LOW',
        confidence: 0.95,
        evidence: null,
        explanation: 'Tin nhắn OTP xác thực chuẩn không yêu cầu cung cấp lại hay nhấp vào liên kết lạ.',
        provenance: geminiProv,
      });
    }

    // Meta signal: Low evidence confidence / Blurry input
    if (overallConfidence < 0.40) {
      signals.push({
        signalId: nextSignalId('low_evidence_conf'),
        type: 'LOW_EVIDENCE_CONFIDENCE',
        description: 'Độ rõ ràng của bằng chứng hoặc hình ảnh ở mức thấp',
        dimension: 'DECEPTION',
        severity: 'LOW',
        confidence: overallConfidence,
        evidence: null,
        explanation: 'Dữ liệu đầu vào mờ, ngắn hoặc thiếu ngữ cảnh để khẳng định chắc chắn.',
        provenance: geminiProv,
      });
    }
  }

  return signals;
}
