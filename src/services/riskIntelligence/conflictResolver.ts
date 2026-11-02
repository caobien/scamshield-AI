/**
 * src/services/riskIntelligence/conflictResolver.ts
 * Conflict Resolution Engine for ScamShield AI Risk Intelligence Layer.
 *
 * Core Principle: DETERMINISTIC FACTS > MODEL OPTIMISM
 * Resolves discrepancies between static URL/signature parsers and generative LLM output.
 */

import { ConflictResolutionResult, RiskSignal } from './types.js';

/**
 * Resolves conflicts between signals extracted from different analyzers.
 * Ensures deterministic facts (e.g. urlParser brand mismatch) override model optimism.
 */
export function resolveConflicts(rawSignals: RiskSignal[]): ConflictResolutionResult {
  const conflictNotes: string[] = [];
  let conflictsDetected = false;
  let deterministicOverrideApplied = false;

  // Clone signals array
  let resolvedSignals = [...rawSignals];

  // ── Case 1: Deterministic URL Brand Mismatch / IP Host vs Model Optimism ──────
  const deterministicUrlSignals = rawSignals.filter(
    s => s.provenance.isDeterministic && s.provenance.sourceType === 'DETERMINISTIC_PARSER'
  );

  const hasDeterministicImpersonation = deterministicUrlSignals.some(
    s => s.type === 'BRAND_DOMAIN_MISMATCH' || s.type === 'IP_HOST_URL' || s.type === 'USERINFO_AT_TRICK'
  );

  const hasModelBenignSignal = rawSignals.some(
    s => !s.provenance.isDeterministic && (s.type === 'BENIGN_OTP_NOTIFICATION' || s.severity === 'LOW')
  );

  if (hasDeterministicImpersonation) {
    const hasModelOptimism = rawSignals.some(s => !s.provenance.isDeterministic && (s.type === 'BENIGN_OTP_NOTIFICATION' || s.severity === 'LOW')) ||
      !rawSignals.some(s => !s.provenance.isDeterministic && (s.severity === 'HIGH' || s.severity === 'CRITICAL'));

    if (hasModelOptimism) {
      conflictsDetected = true;
      deterministicOverrideApplied = true;
      conflictNotes.push(
        'Phát hiện xung đột: Phân tích kỹ thuật URL ghi nhận giả mạo tên miền / IP thô, ưu tiên tín hiệu kỹ thuật trực tiếp.'
      );
      resolvedSignals = resolvedSignals.filter(s => s.type !== 'BENIGN_OTP_NOTIFICATION');
    }
  }

  // ── Case 2: Semantic Threat Text without Technical URL ────────────────────────
  const hasLinguisticThreat = rawSignals.some(
    s => s.type === 'URGENCY' || s.type === 'THREAT' || s.type === 'CREDENTIAL_REQUEST' || s.type === 'FINANCIAL_REQUEST'
  );
  const hasUrlSignals = rawSignals.some(s => s.dimension === 'MALWARE_LINK');

  if (hasLinguisticThreat && !hasUrlSignals) {
    // Both signals are valid; maintain semantic threat
    conflictNotes.push(
      'Nội dung có dấu hiệu thao túng tâm lý / đe dọa trực tiếp (dù không đính kèm liên kết URL).'
    );
  }

  // ── Case 3: Visual Phishing UI vs Harmless Text Caption ─────────────────────────
  const hasVisualPhishing = rawSignals.some(
    s => s.type === 'FAKE_LOGIN_UI' || s.type === 'FAKE_BRAND_LOGO'
  );
  if (hasVisualPhishing && hasModelBenignSignal) {
    conflictsDetected = true;
    deterministicOverrideApplied = true;
    conflictNotes.push(
      'Ưu tiên bằng chứng trực quan: Giao diện giả mạo được phát hiện trong ảnh chụp màn hình ghi đè phần văn bản kèm theo.'
    );
    resolvedSignals = resolvedSignals.filter(s => s.type !== 'BENIGN_OTP_NOTIFICATION');
  }

  // ── Case 4: Signal Deduplication by Type & Verbatim Evidence ───────────────────
  const dedupedMap = new Map<string, RiskSignal>();
  for (const sig of resolvedSignals) {
    const key = `${sig.type}::${(sig.evidence || '').toLowerCase()}`;
    const existing = dedupedMap.get(key);

    if (!existing) {
      dedupedMap.set(key, sig);
    } else {
      // If duplicate exists, prefer deterministic parser signal over model inference
      if (sig.provenance.isDeterministic && !existing.provenance.isDeterministic) {
        dedupedMap.set(key, sig);
      } else if (sig.confidence > existing.confidence) {
        dedupedMap.set(key, sig);
      }
    }
  }

  resolvedSignals = Array.from(dedupedMap.values());

  return {
    resolvedSignals,
    conflictsDetected,
    conflictNotes,
    deterministicOverrideApplied,
  };
}
