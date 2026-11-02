/**
 * src/services/riskIntelligence/explanationGrounder.ts
 * Explanation Grounding Layer for ScamShield AI Risk Intelligence Engine.
 *
 * Ensures all evidence quotes rendered to the user are strictly verified
 * against original input content via verifyAndExtractEvidence().
 *
 * Prevents hallucinated evidence quotes from reaching the client.
 */

import { Classification, RiskLevel, SourceType } from '../../types/analysis.js';
import { verifyAndExtractEvidence } from '../../utils/validation.js';
import { GroundedEvidenceItem, GroundedExplanation, RiskSignal } from './types.js';

export interface GrounderInputParams {
  sourceType: SourceType;
  inputContent: string;
  signals: RiskSignal[];
  riskLevel: RiskLevel;
  classification: Classification;
  rawSummary?: string;
  rawExplanation?: string;
  rawRecommendations?: string[];
  rawLimitations?: string[];
}

/**
 * Builds grounded explanations, recommendations, and evidence lists.
 */
export function groundExplanation(params: GrounderInputParams): GroundedExplanation {
  const {
    sourceType,
    inputContent,
    signals,
    riskLevel,
    classification,
    rawSummary,
    rawExplanation,
    rawRecommendations,
    rawLimitations,
  } = params;

  // ── 1. Ground and verify evidence quotes ──────────────────────────────────────

  const verifiedEvidence: GroundedEvidenceItem[] = [];

  for (const s of signals) {
    if (s.evidence) {
      const verified = verifyAndExtractEvidence(s.evidence, inputContent, sourceType);
      verifiedEvidence.push({
        rawSubstring: verified, // Null if not found in inputContent
        indicatorType: s.type,
        source: sourceType,
        confidence: s.confidence,
      });
      // Mutate signal's evidence field to verified string or null
      s.evidence = verified;
    }
  }

  // ── 2. Summary & Explanation ───────────────────────────────────────────────────

  const summary = (rawSummary && rawSummary.trim())
    ? rawSummary.trim()
    : riskLevel === 'LOW'
      ? 'Nội dung không phát hiện dấu hiệu lừa đảo rõ rệt.'
      : 'Nội dung chứa các dấu hiệu nguy cơ lừa đảo hoặc mạo danh đáng ngờ.';

  const explanation = (rawExplanation && rawExplanation.trim())
    ? rawExplanation.trim()
    : 'Không phát hiện bất thường rõ rệt trong nội dung được cung cấp.';

  // ── 3. Recommendations (Max 3) ───────────────────────────────────────────────

  let recs: string[] = Array.isArray(rawRecommendations)
    ? rawRecommendations.filter(r => typeof r === 'string' && r.trim()).map(r => r.trim())
    : [];

  if (recs.length === 0) {
    if (classification === 'SAFE' || riskLevel === 'LOW') {
      recs = [
        'Không cần lo lắng, tuy nhiên hãy duy trì sự cẩn trọng khi nhận tin nhắn từ số lạ.',
        'Tránh chia sẻ mật khẩu cá nhân hoặc mã OTP trong bất kỳ trường hợp nào.',
        'Xác minh trực tiếp qua các kênh chính thống nếu nhận được yêu cầu phát sinh.',
      ];
    } else if (classification === 'UNKNOWN') {
      recs = [
        'Cung cấp thêm ngữ cảnh hoặc toàn bộ tin nhắn để đánh giá chính xác hơn.',
        'Tuyệt đối không nhấp vào liên kết lạ hoặc nạp khoản phí chưa rõ mục đích.',
        'Xác minh thông tin qua các kênh truyền thông chính thức của tổ chức.',
      ];
    } else {
      recs = [
        'Tuyệt đối không nhấp vào đường dẫn liên kết hoặc cung cấp mã OTP/mật khẩu.',
        'Xác minh thông tin trực tiếp với tổng đài chính thức của đơn vị liên quan.',
        'Báo cáo tin nhắn rác hoặc nghi vấn lừa đảo tới đầu số 156 / 5656.',
      ];
    }
  }

  const recommendations = recs.slice(0, 3);

  // ── 4. Limitations & Disclaimers ───────────────────────────────────────────────

  const MANDATORY_LIMITATION =
    sourceType === 'URL'
      ? 'Hệ thống KHÔNG kết nối hoặc truy cập trang web, kết quả đánh giá hoàn toàn dựa trên phân tích cấu trúc chuỗi đường dẫn URL.'
      : 'Kết quả dựa trên nội dung được cung cấp và không thể xác minh danh tính thực tế của người gửi hoặc website.';

  let lims: string[] = Array.isArray(rawLimitations)
    ? rawLimitations.filter(l => typeof l === 'string' && l.trim()).map(l => l.trim())
    : [];

  if (!lims.some(l => l.toLowerCase().includes('không kết nối') || l.toLowerCase().includes('xác minh danh tính'))) {
    lims.unshift(MANDATORY_LIMITATION);
  }

  const limitations = lims.slice(0, 3);

  return {
    summary,
    explanation,
    verifiedEvidence,
    recommendations,
    limitations,
  };
}
