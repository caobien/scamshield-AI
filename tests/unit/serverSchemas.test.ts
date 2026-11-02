/**
 * tests/unit/serverSchemas.test.ts
 * Unit tests for Zod request body schema and Gemini output schema validation.
 * Uses Zod v4 API (.issues instead of .errors on ZodError)
 */
import { analyzeBodySchema, geminiOutputSchema } from '../../server/schemas/analyzeSchema.js';
import { z } from 'zod';

function runTest(name: string, fn: () => boolean) {
  try {
    const passed = fn();
    if (passed) {
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`  ❌ EXCEPTION in ${name}:`, err);
    process.exit(1);
  }
}

console.log('\n--- 7. UNIT TESTS: ZOD SCHEMA VALIDATION ---');

// ─── Request Body Schema ─────────────────────────────────────────────────────

runTest('Accept valid MESSAGE body', () => {
  const result = analyzeBodySchema.safeParse({
    sourceType: 'MESSAGE',
    inputContent: '[VCB] Tài khoản của bạn bị tạm khóa, truy cập ngay http://vcb-fake.top',
  });
  return result.success;
});

runTest('Reject MESSAGE with empty inputContent', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'MESSAGE', inputContent: '' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('không được để trống'));
});

runTest('Reject MESSAGE with whitespace-only inputContent', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'MESSAGE', inputContent: '   ' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('không được để trống'));
});

runTest('Reject MESSAGE with inputContent under 5 chars', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'MESSAGE', inputContent: 'abc' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('tối thiểu 5 ký tự'));
});

runTest('Reject MESSAGE with inputContent over 2000 chars', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'MESSAGE', inputContent: 'A'.repeat(2001) });
  return !result.success;
});

runTest('Accept valid URL body', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'URL', inputContent: 'https://vcb-fake.top/login' });
  return result.success;
});

runTest('Reject URL with empty inputContent', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'URL', inputContent: '' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('Vui lòng nhập'));
});

runTest('Accept valid SCREENSHOT body with mimeType', () => {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const result = analyzeBodySchema.safeParse({ sourceType: 'SCREENSHOT', imageBase64: pngBase64, mimeType: 'image/png' });
  return result.success;
});

runTest('Reject SCREENSHOT with empty imageBase64', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'SCREENSHOT', imageBase64: '', mimeType: 'image/png' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('Vui lòng chọn'));
});

runTest('Reject SCREENSHOT with invalid MIME type (application/pdf)', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'SCREENSHOT', imageBase64: 'abc123data', mimeType: 'application/pdf' });
  if (result.success) return false;
  const msgs = result.error.issues.map(i => i.message);
  return msgs.some(m => m.includes('Định dạng ảnh không hợp lệ'));
});

runTest('Reject unknown sourceType', () => {
  const result = analyzeBodySchema.safeParse({ sourceType: 'AUDIO', inputContent: 'test' });
  return !result.success;
});

runTest('Default sourceType to MESSAGE if omitted', () => {
  const result = analyzeBodySchema.safeParse({ inputContent: 'Tin nhắn kiểm tra bình thường' });
  return result.success && result.data.sourceType === 'MESSAGE';
});

// ─── Gemini Output Schema ────────────────────────────────────────────────────

runTest('Accept well-formed Gemini output', () => {
  const result = geminiOutputSchema.safeParse({
    riskScore: 85,
    classification: 'PHISHING',
    evidenceConfidence: 90,
    summary: 'Phát hiện đường dẫn giả mạo ngân hàng.',
    indicators: [{ type: 'SUSPICIOUS_URL', description: 'Tên miền giả mạo', severity: 'HIGH', evidence: 'http://vcb-verify.top', explanation: 'Địa chỉ tên miền lạ.' }],
    explanation: 'Nội dung hù dọa nhằm lừa đảo.',
    recommendations: ['Không bấm vào link.'],
    limitations: [],
  });
  return result.success && result.data.riskScore === 85;
});

runTest('Clamp riskScore 999 to 100', () => {
  const result = geminiOutputSchema.safeParse({ riskScore: 999, classification: 'PHISHING', summary: 'test', explanation: 'test', recommendations: [] });
  return result.success && result.data.riskScore === 100;
});

runTest('Clamp negative riskScore -50 to 0', () => {
  const result = geminiOutputSchema.safeParse({ riskScore: -50, classification: 'SAFE', summary: 'test', explanation: 'test', recommendations: [] });
  return result.success && result.data.riskScore === 0;
});

runTest('Fallback unknown classification to UNKNOWN', () => {
  const result = geminiOutputSchema.safeParse({ riskScore: 40, classification: 'SPACE_SCAM', summary: 'test', explanation: 'test', recommendations: [] });
  return result.success && result.data.classification === 'UNKNOWN';
});

runTest('Fallback unknown indicator type to OTHER', () => {
  const result = geminiOutputSchema.safeParse({
    riskScore: 50, classification: 'PHISHING', summary: 'test', explanation: 'test', recommendations: [],
    indicators: [{ type: 'SPACE_INDICATOR', description: 'test', severity: 'HIGH', evidence: null, explanation: 'test' }],
  });
  return result.success && result.data.indicators[0].type === 'OTHER';
});

runTest('Handle non-parseable riskScore string gracefully', () => {
  const result = geminiOutputSchema.safeParse({ riskScore: 'seventy', classification: 'SAFE', summary: 'test', explanation: 'test', recommendations: [] });
  return result.success && result.data.riskScore === 0;
});

console.log('✅ Zod Schema Validation Unit Tests Completed Successfully!');
