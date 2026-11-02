/**
 * src/services/riskIntelligence/riskIntelligenceAdapter.ts
 * Compatibility Adapter Layer for ScamShield AI Risk Intelligence Engine.
 *
 * Maps internal rich RiskIntelligenceResult back into the standard, non-breaking
 * AnalysisResult contract consumed by the UI, history persistence, and statistics services.
 */

import { AnalysisResult, Indicator } from '../../types/analysis.js';
import { generateAnalysisId } from '../../utils/helpers.js';
import { RiskIntelligenceResult } from './types.js';

/**
 * Transforms an internal RiskIntelligenceResult into the public AnalysisResult structure.
 */
export function adaptToAnalysisResult(internalResult: RiskIntelligenceResult): AnalysisResult {
  const { id, timestamp, sourceType, inputContent, resolvedSignals, fusion, explanation } = internalResult;

  // Convert RiskSignal[] to public Indicator[] format (max 4, sorted by severity)
  const sortedSignals = [...resolvedSignals].sort((a, b) => {
    const rank = (s: string) => (s === 'CRITICAL' || s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1);
    return rank(b.severity) - rank(a.severity);
  });

  const indicators: Indicator[] = sortedSignals.slice(0, 4).map(sig => ({
    type: sig.type,
    description: sig.description,
    explanation: sig.explanation,
    evidence: sig.evidence, // Null or verified substring
    severity: sig.severity,
  }));

  const suspiciousIndicators = indicators.map(i => i.description);

  return {
    id: id || generateAnalysisId(),
    timestamp: timestamp || new Date().toISOString(),
    sourceType,
    inputContent,
    riskScore: fusion.finalRiskScore,
    riskLevel: fusion.riskLevel,
    classification: fusion.classification,
    evidenceConfidence: Math.round(
      sortedSignals.length > 0
        ? (sortedSignals.reduce((acc, s) => acc + s.confidence, 0) / sortedSignals.length) * 100
        : 85
    ),
    summary: explanation.summary,
    indicators,
    suspiciousIndicators,
    explanation: explanation.explanation,
    recommendations: explanation.recommendations,
    limitations: explanation.limitations.length > 0 ? explanation.limitations : undefined,
    rawMetadata: {
      rawRiskScore: fusion.rawRiskScore,
      resolvedSignalCount: resolvedSignals.length,
      dimensions: fusion.dimensionRisks,
    },
  };
}
