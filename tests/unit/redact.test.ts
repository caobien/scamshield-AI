import { redactSensitiveData, sanitizeContentForHistory } from '../../src/utils/redact';
import { EDGE_CASE_FIXTURES } from '../fixtures/scam-cases';

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

console.log('\n--- 3. UNIT TESTS: SENSITIVE DATA REDACTION ---');

runTest('Redact OTP code, phone number, card number, and password from plain text', () => {
  const redacted = redactSensitiveData(EDGE_CASE_FIXTURES.sensitiveMessage);
  const hidesOtp = !redacted.includes('998877') && (redacted.includes('[MÃ OTP ĐÃ CHE]') || redacted.includes('[MÃ XÁC THỰC ĐÃ CHE]'));
  const hidesCard = !redacted.includes('4123456789012345') && redacted.includes('[SỐ TÀI KHOẢN/THẺ ĐÃ CHE]');
  const hidesPass = !redacted.includes('MatKhau1234') && redacted.includes('[MẬT KHẨU ĐÃ CHE]');
  const hidesPhone = !redacted.includes('0912345678') && redacted.includes('[SỐ ĐIỆN THOẠI ĐÃ CHE]');
  return hidesOtp && hidesCard && hidesPass && hidesPhone;
});

runTest('Redact email addresses', () => {
  const textWithEmail = 'Liên hệ hỗ trợ qua email user.test@domain-example.com ngay.';
  const redacted = redactSensitiveData(textWithEmail);
  return !redacted.includes('user.test@domain-example.com') && redacted.includes('[EMAIL ĐÃ CHE]');
});

runTest('Sanitize screenshot base64 image content for history', () => {
  const rawBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const sanitized = sanitizeContentForHistory(rawBase64, 'SCREENSHOT');
  return !sanitized.includes('data:image') && sanitized.includes('[Ảnh chụp màn hình đã được phân tích');
});

console.log('✅ Sensitive Data Redaction Unit Tests Completed Successfully!');
