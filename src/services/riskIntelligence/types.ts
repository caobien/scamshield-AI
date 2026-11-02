/**
 * src/services/riskIntelligence/types.ts
 * Canonical TypeScript contracts for ScamShield AI Risk Intelligence Engine.
 *
 * Source of truth: docs/risk-intelligence-architecture.md
 * Standardizes multi-source signal representation, provenance, risk dimensions,
 * conflict resolution, fusion parameters, and grounded explanation contracts.
 */

import { Classification, RiskLevel, SourceType } from '../../types/analysis.js';

// ─── Provenance & Signal Sources ─────────────────────────────────────────────

export type SignalProvenanceType =
  | 'DETERMINISTIC_PARSER'   // Non-network static parsers (e.g. urlParser.ts)
  | 'MODEL_INFERENCE'       // Structured LLM / Multimodal output (e.g. Gemini 3.5 Flash)
  | 'RULE_ENGINE'            // Static heuristic rules
  | 'USER_PROVIDED_CONTEXT'; // Input payload context

export interface SignalProvenance {
  sourceType: SignalProvenanceType;
  extractorId: string;       // e.g. 'urlParser_v1', 'gemini_3.5_flash', 'magicBytes_v1'
  timestamp: string;
  isDeterministic: boolean;  // true for static rules/parsers, false for LLM outputs
}

// ─── Risk Dimensions & Severities ──────────────────────────────────────────────

export type RiskSeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskDimensionType =
  | 'DECEPTION'
  | 'CREDENTIAL_THEFT'
  | 'FINANCIAL'
  | 'IMPERSONATION'
  | 'MALWARE_LINK'
  | 'SOCIAL_ENGINEERING';

// ─── Core Signal Entity ───────────────────────────────────────────────────────

export interface RiskSignal {
  /** Unique signal ID within analysis session */
  signalId: string;

  /** Standard indicator type or custom technical signal key */
  type: string;

  /** Short Vietnamese title / description */
  description: string;

  /** Target risk dimension influenced by this signal */
  dimension: RiskDimensionType;

  /** Qualitative severity level */
  severity: RiskSeverityLevel;

  /** Signal presence confidence [0.0 - 1.0] (NOT risk score) */
  confidence: number;

  /** Verified exact verbatim substring from input, or null */
  evidence: string | null;

  /** Short Vietnamese explanation of signal significance */
  explanation?: string;

  /** Full provenance tracking */
  provenance: SignalProvenance;

  /** Additional key-value metadata */
  metadata?: Record<string, unknown>;
}

// ─── Dimension Evaluation & Fusion ────────────────────────────────────────────

export interface DimensionRisk {
  dimension: RiskDimensionType;
  /** Internal score 0-100 for this dimension */
  score: number;
  maxSeverity: RiskSeverityLevel;
  activeSignals: RiskSignal[];
  confidence: number;
  dampener: number;
}

export interface ConflictResolutionResult {
  resolvedSignals: RiskSignal[];
  conflictsDetected: boolean;
  conflictNotes: string[];
  deterministicOverrideApplied: boolean;
}

export interface FusionResult {
  rawRiskScore: number;
  finalRiskScore: number;
  riskLevel: RiskLevel;
  classification: Classification;
  dimensionRisks: Record<RiskDimensionType, DimensionRisk>;
}

// ─── Grounded Explanation ─────────────────────────────────────────────────────

export interface GroundedEvidenceItem {
  rawSubstring: string | null;
  indicatorType: string;
  source: SourceType;
  confidence: number;
}

export interface GroundedExplanation {
  summary: string;
  explanation: string;
  verifiedEvidence: GroundedEvidenceItem[];
  recommendations: string[];
  limitations: string[];
}

// ─── Aggregate Engine Output ──────────────────────────────────────────────────

export interface RiskIntelligenceResult {
  id: string;
  timestamp: string;
  sourceType: SourceType;
  inputContent: string;
  rawSignals: RiskSignal[];
  resolvedSignals: RiskSignal[];
  fusion: FusionResult;
  explanation: GroundedExplanation;
}

// ─── Calibration Configuration Schema ─────────────────────────────────────────

export type CalibrationStatus = 'WEIGHT_TBD' | 'CALIBRATED_FROM_EVALUATION';

export interface RiskFusionConfig {
  status: CalibrationStatus;
  
  /** Weight multipliers per dimension [WEIGHT_TBD placeholder] */
  dimensionWeights: Record<RiskDimensionType, number>;
  
  /** Dampening factors for context (e.g. legitimate OTP message) */
  contextDampeners: {
    benignOtpOffset: number;
    blurryImageConfidenceThreshold: number;
  };
  
  /** Severity score multipliers */
  severityWeights: Record<RiskSeverityLevel, number>;
}
