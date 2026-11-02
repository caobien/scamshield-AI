/**
 * src/services/riskIntelligence/index.ts
 * Main entry point for ScamShield AI Risk Intelligence Engine.
 *
 * Orchestrates the 6-stage intelligence pipeline:
 * 1. Signal Extraction (signalExtractor.ts)
 * 2. Conflict Resolution (conflictResolver.ts)
 * 3. Dimension Evaluation (riskDimensionEvaluator.ts)
 * 4. Risk Fusion (riskFusionEngine.ts)
 * 5. Explanation Grounding (explanationGrounder.ts)
 * 6. Compatibility Adapter (riskIntelligenceAdapter.ts)
 */

import { AnalysisResult, SourceType } from '../../types/analysis.js';
import { generateAnalysisId } from '../../utils/helpers.js';
import { ParsedUrlResult } from '../../utils/urlParser.js';
import { resolveConflicts } from './conflictResolver.js';
import { groundExplanation } from './explanationGrounder.js';
import { evaluateDimensions } from './riskDimensionEvaluator.js';
import { fuseRisk } from './riskFusionEngine.js';
import { adaptToAnalysisResult } from './riskIntelligenceAdapter.js';
import { extractSignals } from './signalExtractor.js';
import { RiskFusionConfig, RiskIntelligenceResult } from './types.js';

export interface ProcessRiskIntelligenceParams {
  sourceType: SourceType;
  inputContent: string;
  rawGeminiOutput?: Record<string, unknown> | null;
  parsedUrlResult?: ParsedUrlResult | null;
  evidenceConfidence?: number;
  config?: RiskFusionConfig;
}

/**
 * Orchestrates the full Risk Intelligence Engine pipeline.
 * Returns both internal rich state and the backward-compatible AnalysisResult contract.
 */
export function processRiskIntelligence(params: ProcessRiskIntelligenceParams): {
  internalResult: RiskIntelligenceResult;
  publicAnalysisResult: AnalysisResult;
} {
  const {
    sourceType,
    inputContent,
    rawGeminiOutput,
    parsedUrlResult,
    evidenceConfidence,
    config,
  } = params;

  const sessionId = generateAnalysisId();
  const now = new Date().toISOString();

  // 1. Signal Extraction
  const rawSignals = extractSignals({
    sourceType,
    inputContent,
    rawGeminiOutput,
    parsedUrlResult,
    evidenceConfidence,
  });

  // 2. Conflict Resolution (DETERMINISTIC FACTS > MODEL OPTIMISM)
  const conflictResult = resolveConflicts(rawSignals);
  const resolvedSignals = conflictResult.resolvedSignals;

  // 3. Dimension Evaluation (6 Dimensions)
  const dimensionRisks = evaluateDimensions(resolvedSignals, config);

  // 4. Risk Fusion
  const rawGeminiScore = typeof rawGeminiOutput?.riskScore === 'number'
    ? rawGeminiOutput.riskScore
    : null;
  const rawGeminiClassification = typeof rawGeminiOutput?.classification === 'string'
    ? rawGeminiOutput.classification as any
    : undefined;

  const fusion = fuseRisk(
    dimensionRisks,
    resolvedSignals,
    rawGeminiScore,
    rawGeminiClassification,
    config
  );

  // 5. Grounded Explanation & Evidence Verification
  const rawSummary = typeof rawGeminiOutput?.summary === 'string' ? rawGeminiOutput.summary : undefined;
  const rawExplanation = typeof rawGeminiOutput?.explanation === 'string' ? rawGeminiOutput.explanation : undefined;
  const rawRecommendations = Array.isArray(rawGeminiOutput?.recommendations) ? rawGeminiOutput.recommendations as string[] : undefined;
  const rawLimitations = Array.isArray(rawGeminiOutput?.limitations) ? rawGeminiOutput.limitations as string[] : undefined;

  const explanation = groundExplanation({
    sourceType,
    inputContent,
    signals: resolvedSignals,
    riskLevel: fusion.riskLevel,
    classification: fusion.classification,
    rawSummary,
    rawExplanation,
    rawRecommendations,
    rawLimitations,
  });

  // Assemble internal rich result
  const internalResult: RiskIntelligenceResult = {
    id: sessionId,
    timestamp: now,
    sourceType,
    inputContent,
    rawSignals,
    resolvedSignals,
    fusion,
    explanation,
  };

  // 6. Compatibility Adapter
  const publicAnalysisResult = adaptToAnalysisResult(internalResult);

  return {
    internalResult,
    publicAnalysisResult,
  };
}

export * from './types.js';
export * from './signalExtractor.js';
export * from './riskDimensionEvaluator.js';
export * from './conflictResolver.js';
export * from './riskFusionEngine.js';
export * from './explanationGrounder.js';
export * from './riskIntelligenceAdapter.js';
