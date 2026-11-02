/**
 * src/services/riskIntelligence/riskDimensionEvaluator.ts
 * Dimension Evaluation Layer for ScamShield AI Risk Intelligence Engine.
 *
 * Evaluates raw signals across 6 risk dimensions:
 * - DECEPTION
 * - CREDENTIAL_THEFT
 * - FINANCIAL
 * - IMPERSONATION
 * - MALWARE_LINK
 * - SOCIAL_ENGINEERING
 *
 * Employs calibration-ready parameters (WEIGHT_TBD / CALIBRATED_FROM_EVALUATION).
 */

import {
  DimensionRisk,
  RiskDimensionType,
  RiskFusionConfig,
  RiskSeverityLevel,
  RiskSignal,
} from './types.js';

// ─── Default Calibration Parameters (Calibration-Ready) ──────────────────────

export const DEFAULT_FUSION_CONFIG: RiskFusionConfig = {
  status: 'WEIGHT_TBD',
  dimensionWeights: {
    DECEPTION: 1.0,          // CALIBRATED_FROM_EVALUATION
    CREDENTIAL_THEFT: 1.0,   // CALIBRATED_FROM_EVALUATION
    FINANCIAL: 1.0,          // CALIBRATED_FROM_EVALUATION
    IMPERSONATION: 1.0,      // CALIBRATED_FROM_EVALUATION
    MALWARE_LINK: 1.0,       // CALIBRATED_FROM_EVALUATION
    SOCIAL_ENGINEERING: 1.0, // CALIBRATED_FROM_EVALUATION
  },
  contextDampeners: {
    benignOtpOffset: 0.2,               // Dampens deception/credential risk for routine OTP notifications
    blurryImageConfidenceThreshold: 0.4, // Dampeners for blurry inputs
  },
  severityWeights: {
    CRITICAL: 1.0, // 100% impact
    HIGH: 0.85,    // 85% impact
    MEDIUM: 0.50,  // 50% impact
    LOW: 0.20,     // 20% impact
  },
};

const DIMENSION_LIST: RiskDimensionType[] = [
  'DECEPTION',
  'CREDENTIAL_THEFT',
  'FINANCIAL',
  'IMPERSONATION',
  'MALWARE_LINK',
  'SOCIAL_ENGINEERING',
];

function getHighestSeverity(severities: RiskSeverityLevel[]): RiskSeverityLevel {
  if (severities.includes('CRITICAL')) return 'CRITICAL';
  if (severities.includes('HIGH')) return 'HIGH';
  if (severities.includes('MEDIUM')) return 'MEDIUM';
  if (severities.includes('LOW')) return 'LOW';
  return 'LOW';
}

/**
 * Evaluates risk across each of the 6 dimensions given a set of normalized RiskSignal[].
 */
export function evaluateDimensions(
  signals: RiskSignal[],
  config: RiskFusionConfig = DEFAULT_FUSION_CONFIG
): Record<RiskDimensionType, DimensionRisk> {
  const result: Partial<Record<RiskDimensionType, DimensionRisk>> = {};

  // Check for benign context dampeners
  const hasBenignOtp = signals.some(s => s.type === 'BENIGN_OTP_NOTIFICATION');

  for (const dim of DIMENSION_LIST) {
    const dimSignals = signals.filter(s => s.dimension === dim);

    if (dimSignals.length === 0) {
      result[dim] = {
        dimension: dim,
        score: 0,
        maxSeverity: 'LOW',
        activeSignals: [],
        confidence: 1.0,
        dampener: 1.0,
      };
      continue;
    }

    const severities = dimSignals.map(s => s.severity);
    const maxSeverity = getHighestSeverity(severities);

    // Compute max (severityWeight * confidence) across signals in this dimension
    let maxSignalImpact = 0;
    let totalConfidence = 0;

    for (const s of dimSignals) {
      const sevWeight = config.severityWeights[s.severity] ?? 0.5;
      const impact = sevWeight * s.confidence;
      if (impact > maxSignalImpact) {
        maxSignalImpact = impact;
      }
      totalConfidence += s.confidence;
    }

    const avgConfidence = totalConfidence / dimSignals.length;
    let dampener = 1.0;

    // Apply context dampener if applicable
    if (hasBenignOtp && (dim === 'DECEPTION' || dim === 'CREDENTIAL_THEFT')) {
      dampener = config.contextDampeners.benignOtpOffset;
    }

    const rawDimScore = maxSignalImpact * dampener * 100;
    const clampedScore = Math.min(100, Math.max(0, Math.round(rawDimScore)));

    result[dim] = {
      dimension: dim,
      score: clampedScore,
      maxSeverity,
      activeSignals: dimSignals,
      confidence: avgConfidence,
      dampener,
    };
  }

  return result as Record<RiskDimensionType, DimensionRisk>;
}
