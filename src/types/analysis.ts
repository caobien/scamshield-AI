export type SourceType = 'MESSAGE' | 'SCREENSHOT' | 'URL';

export type StandardRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskLevel =
  | StandardRiskLevel
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type Classification =
  | 'SAFE'
  | 'PHISHING'
  | 'BANKING_SCAM'
  | 'JOB_SCAM'
  | 'INVESTMENT_SCAM'
  | 'PRIZE_SCAM'
  | 'IMPERSONATION'
  | 'ACCOUNT_TAKEOVER'
  | 'ROMANCE_SCAM'
  | 'OTHER_SCAM'
  | 'UNKNOWN';

export type IndicatorType =
  | 'URGENCY'
  | 'THREAT'
  | 'IMPERSONATION'
  | 'CREDENTIAL_REQUEST'
  | 'FINANCIAL_REQUEST'
  | 'SUSPICIOUS_URL'
  | 'UNREALISTIC_OFFER'
  | 'SOCIAL_ENGINEERING'
  | 'OTHER'
  | string;

export interface Indicator {
  type: IndicatorType;
  description: string;
  explanation?: string;
  evidence: string | null; // Must be an exact excerpt from the input, or null
  severity?: RiskLevel;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  sourceType: SourceType;
  inputContent: string;
  riskScore: number; // Strictly 0 to 100
  riskLevel: RiskLevel; // Derived from riskScore (0-24: LOW, 25-49: MEDIUM, 50-74: HIGH, 75-100: CRITICAL)
  classification: Classification;
  evidenceConfidence?: number; // 0 to 100
  summary: string;
  indicators: Indicator[];
  suspiciousIndicators?: string[]; // Helper for display array string
  explanation: string;
  recommendations: string[];
  limitations?: string[];
  rawMetadata?: Record<string, unknown>;
}

// Classification Display Labels in Vietnamese
export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  SAFE: 'Nội dung an toàn',
  PHISHING: 'Lừa đảo giả mạo',
  BANKING_SCAM: 'Lừa đảo ngân hàng',
  JOB_SCAM: 'Lừa đảo việc làm',
  INVESTMENT_SCAM: 'Lừa đảo đầu tư',
  PRIZE_SCAM: 'Lừa đảo trúng thưởng',
  IMPERSONATION: 'Lừa đảo mạo danh',
  ACCOUNT_TAKEOVER: 'Chiếm đoạt tài khoản',
  ROMANCE_SCAM: 'Lừa đảo tình cảm',
  OTHER_SCAM: 'Hình thức lừa đảo khác',
  UNKNOWN: 'Chưa xác định',
};

// Indicator Type Display Labels in Vietnamese
export const INDICATOR_TYPE_LABELS: Record<string, string> = {
  URGENCY: 'Thúc giục / Áp lực thời gian',
  THREAT: 'Đe dọa / Hù dọa hậu quả',
  IMPERSONATION: 'Giả danh tổ chức / Cá nhân',
  CREDENTIAL_REQUEST: 'Yêu cầu Mật khẩu / OTP / CCCD',
  FINANCIAL_REQUEST: 'Yêu cầu Chuyển tiền / Nạp phí',
  SUSPICIOUS_URL: 'Liên kết URL nghi vấn',
  UNREALISTIC_OFFER: 'Hứa hẹn Quyền lợi / Thu nhập bất thường',
  SOCIAL_ENGINEERING: 'Thao túng tâm lý / Tiếp cận',
  OTHER: 'Dấu hiệu nghi vấn khác',
};
