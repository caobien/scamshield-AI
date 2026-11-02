import { AnalysisResult, RiskLevel } from '../types/analysis.js';

/**
 * Calculates risk level strictly based on risk score:
 * - 0–24: LOW
 * - 25–49: MEDIUM
 * - 50–74: HIGH
 * - 75–100: CRITICAL
 */
export function calculateRiskLevel(score: number): RiskLevel {
  const clamped = clampRiskScore(score);
  if (clamped <= 24) return 'LOW';
  if (clamped <= 49) return 'MEDIUM';
  if (clamped <= 74) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Ensures risk score is strictly an integer between 0 and 100.
 */
export function clampRiskScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Normalizes risk level to legacy lowercase keys for existing UI components.
 */
export function mapRiskLevelToLegacyKey(
  level: RiskLevel | string
): 'low' | 'medium' | 'high' | 'critical' {
  const normalized = (level || '').toString().toUpperCase();
  if (normalized === 'LOW') return 'low';
  if (normalized === 'MEDIUM') return 'medium';
  if (normalized === 'HIGH') return 'high';
  if (normalized === 'CRITICAL') return 'critical';

  const lower = level.toString().toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(lower)) {
    return lower as 'low' | 'medium' | 'high' | 'critical';
  }
  return 'high';
}

/**
 * Generates a unique analysis transaction ID.
 */
export function generateAnalysisId(): string {
  return `ANL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Safely truncates a text string for preview displays.
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
