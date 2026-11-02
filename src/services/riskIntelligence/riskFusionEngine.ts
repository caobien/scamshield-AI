/**
 * src/services/riskIntelligence/riskFusionEngine.ts
 * Risk Fusion Engine for ScamShield AI Risk Intelligence Layer.
 *
 * Fuses dimension-level risk scores into final risk score, risk level,
 * and categorical scam classification.
 *
 * Score clamping: 0 to 100 (via clampRiskScore)
 * Risk levels: 0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL (via calculateRiskLevel)
 */

import { Classification, RiskLevel } from '../../types/analysis.js';
import { calculateRiskLevel, clampRiskScore } from '../../utils/helpers.js';
import { DEFAULT_FUSION_CONFIG } from './riskDimensionEvaluator.js';
import {
  DimensionRisk,
  FusionResult,
  RiskDimensionType,
  RiskFusionConfig,
  RiskSignal,
} from './types.js';

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

/**
 * Maps dimensional risk sub-scores and active signals to a standard Classification enum.
 */
function deriveClassification(
  signals: RiskSignal[],
  dimensionRisks: Record<RiskDimensionType, DimensionRisk>,
  finalRiskScore: number,
  geminiClassification?: Classification
): Classification {
  const validGeminiClassification: Classification | undefined = (
    geminiClassification && VALID_CLASSIFICATIONS.includes(geminiClassification)
  ) ? geminiClassification : undefined;

  // If no signals exist and no valid classification was provided by Gemini -> UNKNOWN
  if (signals.length === 0 && !validGeminiClassification) {
    return 'UNKNOWN';
  }

  // 1. If valid classification was provided by Gemini and not UNKNOWN, respect it
  if (validGeminiClassification && validGeminiClassification !== 'UNKNOWN') {
    return validGeminiClassification;
  }

  // 2. If final risk is very low (0-24) and no high-severity signals exist -> SAFE
  const hasHighSeveritySignal = signals.some(s => s.severity === 'HIGH' || s.severity === 'CRITICAL');
  if (finalRiskScore <= 24 && !hasHighSeveritySignal) {
    return 'SAFE';
  }

  // 3. Deterministic URL Brand Mismatch or Impersonation -> IMPERSONATION / PHISHING
  const hasBrandMismatch = signals.some(s => s.type === 'BRAND_DOMAIN_MISMATCH');
  if (hasBrandMismatch) {
    return 'IMPERSONATION';
  }

  const hasIpHost = signals.some(s => s.type === 'IP_HOST_URL');
  if (hasIpHost) {
    return 'PHISHING';
  }

  // 4. Check highest dimension risk
  const sortedDims = Object.values(dimensionRisks).sort((a, b) => b.score - a.score);
  const topDim = sortedDims[0];

  if (topDim && topDim.score >= 50) {
    switch (topDim.dimension) {
      case 'CREDENTIAL_THEFT':
        return 'PHISHING';
      case 'FINANCIAL':
        return 'BANKING_SCAM';
      case 'IMPERSONATION':
        return 'IMPERSONATION';
      case 'MALWARE_LINK':
        return 'PHISHING';
      case 'SOCIAL_ENGINEERING':
        return 'OTHER_SCAM';
      case 'DECEPTION':
        return 'PHISHING';
    }
  }

  // 5. Default fallback for ambiguous cases
  if (finalRiskScore >= 50) {
    return 'OTHER_SCAM';
  }

  return validGeminiClassification || 'UNKNOWN';
}

/**
 * Fuses 6 dimension sub-scores into a unified final risk score, risk level, and classification.
 */
export function fuseRisk(
  dimensionRisks: Record<RiskDimensionType, DimensionRisk>,
  signals: RiskSignal[],
  rawGeminiScore?: number | null,
  geminiClassification?: Classification,
  config: RiskFusionConfig = DEFAULT_FUSION_CONFIG
): FusionResult {
  // Max dimensional score
  const dimScores = Object.values(dimensionRisks).map(d => d.score);
  const maxDimScore = dimScores.length > 0 ? Math.max(...dimScores) : 0;

  // Average dimensional score
  const nonZeroScores = dimScores.filter(s => s > 0);
  const sumScores = nonZeroScores.reduce((acc, curr) => acc + curr, 0);
  const avgNonZero = nonZeroScores.length > 0 ? sumScores / nonZeroScores.length : 0;

  // Conceptual Raw Score: max(D_k) + weighted sum component
  let rawScore = maxDimScore;
  if (nonZeroScores.length > 1) {
    rawScore += avgNonZero * 0.15; // Calibration-ready placeholder boost for multi-dimension threats
  }

  // If Gemini provided a direct score, blend with model inference if no deterministic override
  if (typeof rawGeminiScore === 'number' && !isNaN(rawGeminiScore)) {
    const hasDeterministicHighRisk = signals.some(
      s => s.provenance.isDeterministic && (s.severity === 'HIGH' || s.severity === 'CRITICAL')
    );

    if (hasDeterministicHighRisk) {
      // Deterministic high-risk signal forces score to max(rawScore, 75)
      rawScore = Math.max(rawScore, rawGeminiScore, 75);
    } else if (rawSignalsContainBenign(signals)) {
      // Benign OTP notification dampens raw score
      rawScore = Math.min(rawScore, rawGeminiScore, 20);
    } else {
      // Respect higher model score or dimension score
      rawScore = Math.max(rawScore, rawGeminiScore);
    }
  }

  // Clamp strictly 0 to 100
  const finalRiskScore = clampRiskScore(Math.round(rawScore));

  // Risk Level strictly derived from score
  const riskLevel: RiskLevel = calculateRiskLevel(finalRiskScore);

  // Derive classification
  const classification = deriveClassification(
    signals,
    dimensionRisks,
    finalRiskScore,
    geminiClassification
  );

  return {
    rawRiskScore: Math.round(rawScore),
    finalRiskScore,
    riskLevel,
    classification,
    dimensionRisks,
  };
}

function rawSignalsContainBenign(signals: RiskSignal[]): boolean {
  return signals.some(s => s.type === 'BENIGN_OTP_NOTIFICATION');
}
