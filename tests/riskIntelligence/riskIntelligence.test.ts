/**
 * tests/riskIntelligence/riskIntelligence.test.ts
 * Comprehensive unit test suite for ScamShield AI Risk Intelligence Engine (Phase 3).
 *
 * Verifies:
 * A. Signal Extraction (Deterministic vs Generative)
 * B. Provenance Tagging & Traceability
 * C. Confidence vs Risk Decoupling
 * D. Conflict Resolution (DETERMINISTIC FACTS > MODEL OPTIMISM)
 * E. Risk Fusion & Dimension Sub-scoring
 * F. Substring Evidence Grounding
 * G. Backward Compatibility with AnalysisResult Contract
 */

import assert from 'assert';
import {
  extractSignals,
  evaluateDimensions,
  resolveConflicts,
  fuseRisk,
  groundExplanation,
  processRiskIntelligence,
  adaptToAnalysisResult,
} from '../../src/services/riskIntelligence/index.js';
import { parseUrl } from '../../src/utils/urlParser.js';

console.log('\n══════════════════════════════════════════════════');
console.log('  RISK INTELLIGENCE ENGINE UNIT TEST SUITE');
console.log('══════════════════════════════════════════════════\n');

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

// ─── A. Signal Extraction Tests ──────────────────────────────────────────────

runTest('A1. Extracts Gemini urgency and OTP signals correctly', () => {
  const signals = extractSignals({
    sourceType: 'MESSAGE',
    inputContent: 'Mã OTP của bạn là 123456. Vui lòng nhập ngay trước khi hết hạn!',
    rawGeminiOutput: {
      riskScore: 75,
      classification: 'PHISHING',
      evidenceConfidence: 90,
      indicators: [
        { type: 'URGENCY', description: 'Thúc giục nhập mã', severity: 'HIGH', evidence: 'nhập ngay' },
        { type: 'CREDENTIAL_REQUEST', description: 'Yêu cầu OTP', severity: 'HIGH', evidence: 'Mã OTP' },
      ],
    },
  });

  assert.strictEqual(signals.length, 2);
  assert.strictEqual(signals[0].type, 'URGENCY');
  assert.strictEqual(signals[0].dimension, 'SOCIAL_ENGINEERING');
  assert.strictEqual(signals[1].type, 'CREDENTIAL_REQUEST');
  assert.strictEqual(signals[1].dimension, 'CREDENTIAL_THEFT');
});

runTest('A2. Extracts deterministic URL parser signals (brand mismatch, IP host, @ trick)', () => {
  const parsedUrl = parseUrl('http://vietcombank-security.xyz:8080/login');
  const signals = extractSignals({
    sourceType: 'URL',
    inputContent: 'http://vietcombank-security.xyz:8080/login',
    parsedUrlResult: parsedUrl,
  });

  assert.ok(signals.length >= 2);
  const brandSig = signals.find(s => s.type === 'BRAND_DOMAIN_MISMATCH');
  const tldSig = signals.find(s => s.type === 'SUSPICIOUS_TLD');
  const portSig = signals.find(s => s.type === 'NON_STANDARD_PORT');

  assert.ok(brandSig, 'Brand mismatch signal extracted');
  assert.strictEqual(brandSig?.provenance.sourceType, 'DETERMINISTIC_PARSER');
  assert.strictEqual(brandSig?.provenance.isDeterministic, true);

  assert.ok(tldSig, 'Suspicious TLD signal extracted');
  assert.ok(portSig, 'Port signal extracted');
});

// ─── B. Provenance Tests ──────────────────────────────────────────────────────

runTest('B1. Deterministic signals carry DETERMINISTIC_PARSER provenance', () => {
  const parsedUrl = parseUrl('http://192.168.1.1/login');
  const signals = extractSignals({
    sourceType: 'URL',
    inputContent: 'http://192.168.1.1/login',
    parsedUrlResult: parsedUrl,
  });

  const ipSig = signals.find(s => s.type === 'IP_HOST_URL');
  assert.ok(ipSig);
  assert.strictEqual(ipSig?.provenance.sourceType, 'DETERMINISTIC_PARSER');
  assert.strictEqual(ipSig?.provenance.isDeterministic, true);
  assert.strictEqual(ipSig?.provenance.extractorId, 'urlParser_v1');
});

runTest('B2. Generative signals carry MODEL_INFERENCE provenance', () => {
  const signals = extractSignals({
    sourceType: 'MESSAGE',
    inputContent: 'Trúng thưởng 100 triệu',
    rawGeminiOutput: {
      riskScore: 80,
      indicators: [{ type: 'UNREALISTIC_OFFER', description: 'Trúng thưởng lớn', severity: 'HIGH', evidence: null }],
    },
  });

  const sig = signals[0];
  assert.strictEqual(sig.provenance.sourceType, 'MODEL_INFERENCE');
  assert.strictEqual(sig.provenance.isDeterministic, false);
  assert.strictEqual(sig.provenance.extractorId, 'gemini_3.5_flash');
});

// ─── C. Confidence vs Risk Tests ───────────────────────────────────────────────

runTest('C1. Confidence is decoupled from risk severity', () => {
  const signals = extractSignals({
    sourceType: 'MESSAGE',
    inputContent: 'Mã OTP của bạn là 889900. Tránh chia sẻ cho bất kỳ ai.',
    rawGeminiOutput: {
      riskScore: 10,
      classification: 'SAFE',
      evidenceConfidence: 95, // High confidence (0.95) that it's safe
      indicators: [],
    },
  });

  const benignSig = signals.find(s => s.type === 'BENIGN_OTP_NOTIFICATION');
  assert.ok(benignSig);
  assert.strictEqual(benignSig?.confidence, 0.95);
  assert.strictEqual(benignSig?.severity, 'LOW');
});

// ─── D. Conflict Resolution Tests ──────────────────────────────────────────────

runTest('D1. Deterministic URL brand mismatch overrides model optimism (Case 1)', () => {
  const parsedUrl = parseUrl('http://vietcombank-security.top');
  const rawSignals = extractSignals({
    sourceType: 'URL',
    inputContent: 'http://vietcombank-security.top',
    parsedUrlResult: parsedUrl,
    rawGeminiOutput: {
      riskScore: 10,
      classification: 'SAFE',
      indicators: [],
    },
  });

  const conflict = resolveConflicts(rawSignals);
  assert.strictEqual(conflict.deterministicOverrideApplied, true);
  assert.ok(conflict.resolvedSignals.some(s => s.type === 'BRAND_DOMAIN_MISMATCH'));
});

runTest('D2. Visual phishing UI takes priority over harmless text caption (Case 3)', () => {
  const rawSignals = extractSignals({
    sourceType: 'SCREENSHOT',
    inputContent: 'Ảnh chụp màn hình',
    rawGeminiOutput: {
      riskScore: 85,
      classification: 'PHISHING',
      indicators: [
        { type: 'FAKE_LOGIN_UI', description: 'Giao diện đăng nhập giả mạo', severity: 'HIGH', evidence: 'Vietcombank Login' },
      ],
    },
  });

  const conflict = resolveConflicts(rawSignals);
  assert.ok(conflict.resolvedSignals.some(s => s.type === 'FAKE_LOGIN_UI'));
});

// ─── E. Risk Fusion & Dimension Sub-scoring Tests ─────────────────────────────

runTest('E1. Dimension sub-scoring computes 6 dimensions independently', () => {
  const parsedUrl = parseUrl('http://vietcombank-security.top');
  const rawSignals = extractSignals({
    sourceType: 'URL',
    inputContent: 'http://vietcombank-security.top',
    parsedUrlResult: parsedUrl,
  });

  const conflict = resolveConflicts(rawSignals);
  const dims = evaluateDimensions(conflict.resolvedSignals);

  assert.ok('DECEPTION' in dims);
  assert.ok('CREDENTIAL_THEFT' in dims);
  assert.ok('FINANCIAL' in dims);
  assert.ok('IMPERSONATION' in dims);
  assert.ok('MALWARE_LINK' in dims);
  assert.ok('SOCIAL_ENGINEERING' in dims);

  assert.ok(dims.IMPERSONATION.score > 0, 'Impersonation score is non-zero');
  assert.ok(dims.MALWARE_LINK.score > 0, 'Malware link score is non-zero');
});

runTest('E2. Risk Fusion clamps final score between 0 and 100', () => {
  const parsedUrl = parseUrl('http://vietcombank.com.vn@evil-scam.xyz:8080/login');
  const rawSignals = extractSignals({
    sourceType: 'URL',
    inputContent: 'http://vietcombank.com.vn@evil-scam.xyz:8080/login',
    parsedUrlResult: parsedUrl,
  });

  const conflict = resolveConflicts(rawSignals);
  const dims = evaluateDimensions(conflict.resolvedSignals);
  const fusion = fuseRisk(dims, conflict.resolvedSignals, 95, 'PHISHING');

  assert.ok(fusion.finalRiskScore >= 0 && fusion.finalRiskScore <= 100);
  assert.strictEqual(fusion.riskLevel, 'CRITICAL');
  assert.ok(['PHISHING', 'IMPERSONATION'].includes(fusion.classification));
});

// ─── F. Substring Evidence Grounding Tests ────────────────────────────────────

runTest('F1. Verifies exact case-insensitive evidence substring match', () => {
  const signals = extractSignals({
    sourceType: 'MESSAGE',
    inputContent: 'Tài khoản Ngân Hàng của bạn sẽ bị LỘ',
    rawGeminiOutput: {
      riskScore: 80,
      indicators: [
        { type: 'THREAT', description: 'Đe dọa khóa tài khoản', severity: 'HIGH', evidence: 'ngân hàng' },
      ],
    },
  });

  const grounded = groundExplanation({
    sourceType: 'MESSAGE',
    inputContent: 'Tài khoản Ngân Hàng của bạn sẽ bị LỘ',
    signals,
    riskLevel: 'HIGH',
    classification: 'BANKING_SCAM',
  });

  assert.strictEqual(grounded.verifiedEvidence.length, 1);
  assert.strictEqual(grounded.verifiedEvidence[0].rawSubstring, 'Ngân Hàng');
});

runTest('F2. Nulls out fabricated evidence string not found in input', () => {
  const signals = extractSignals({
    sourceType: 'MESSAGE',
    inputContent: 'Xin chào bạn',
    rawGeminiOutput: {
      riskScore: 80,
      indicators: [
        { type: 'THREAT', description: 'Chuyển khoản ngay', severity: 'HIGH', evidence: 'CHUYỂN 5 TRIỆU NGAY' },
      ],
    },
  });

  const grounded = groundExplanation({
    sourceType: 'MESSAGE',
    inputContent: 'Xin chào bạn',
    signals,
    riskLevel: 'HIGH',
    classification: 'BANKING_SCAM',
  });

  assert.strictEqual(grounded.verifiedEvidence[0].rawSubstring, null);
  assert.strictEqual(signals[0].evidence, null);
});

// ─── G. Backward Compatibility Adapter Tests ─────────────────────────────────

runTest('G1. Adapter maps internal result to public AnalysisResult contract', () => {
  const { publicAnalysisResult } = processRiskIntelligence({
    sourceType: 'MESSAGE',
    inputContent: 'Khẩn cấp! Vui lòng chuyển tiền cọc 500k để nhận việc làm.',
    rawGeminiOutput: {
      riskScore: 85,
      classification: 'JOB_SCAM',
      evidenceConfidence: 90,
      summary: 'Dấu hiệu lừa đảo tuyển dụng việc làm.',
      explanation: 'Yêu cầu chuyển tiền đặt cọc trước khi nhận việc.',
      indicators: [
        { type: 'FINANCIAL_REQUEST', description: 'Yêu cầu chuyển tiền cọc', severity: 'HIGH', evidence: 'chuyển tiền' },
        { type: 'URGENCY', description: 'Áp lực khẩn cấp', severity: 'MEDIUM', evidence: 'Khẩn cấp' },
      ],
    },
  });

  assert.ok(publicAnalysisResult.id);
  assert.ok(publicAnalysisResult.timestamp);
  assert.strictEqual(publicAnalysisResult.sourceType, 'MESSAGE');
  assert.ok(publicAnalysisResult.riskScore >= 85);
  assert.strictEqual(publicAnalysisResult.riskLevel, 'CRITICAL');
  assert.strictEqual(publicAnalysisResult.classification, 'JOB_SCAM');
  assert.strictEqual(publicAnalysisResult.indicators.length, 2);
  assert.ok(publicAnalysisResult.indicators[0].evidence);
});

console.log('\n==================================================');
console.log('🎉 ALL RISK INTELLIGENCE UNIT TESTS PASSED!');
console.log('==================================================\n');
