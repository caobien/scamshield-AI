import { validateMessageInput, validateScreenshotInput, validateUrlInput } from '../../src/utils/validation';
import { parseUrl } from '../../src/utils/urlParser';
import { EDGE_CASE_FIXTURES, SAFE_TEST_CASES, PHISHING_TEST_CASES } from '../fixtures/scam-cases';

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

console.log('\n--- 1. UNIT TESTS: VALIDATION & URL PARSER ---');

runTest('Validate normal safe message input', () => {
  const res = validateMessageInput(SAFE_TEST_CASES[0].input);
  return res.isValid === true;
});

runTest('Validate suspicious message input', () => {
  const res = validateMessageInput(PHISHING_TEST_CASES[0].input);
  return res.isValid === true;
});

runTest('Reject empty message input', () => {
  const res = validateMessageInput(EDGE_CASE_FIXTURES.emptyMessage);
  return res.isValid === false && (res.error || '').includes('không được để trống');
});

runTest('Reject whitespace-only message input', () => {
  const res = validateMessageInput(EDGE_CASE_FIXTURES.whitespaceMessage);
  return res.isValid === false && (res.error || '').includes('không được để trống');
});

runTest('Reject message under 5 characters', () => {
  const res = validateMessageInput('1234');
  return res.isValid === false && (res.error || '').includes('tối thiểu 5 ký tự');
});

runTest('Reject message exceeding 2000 characters', () => {
  const res = validateMessageInput(EDGE_CASE_FIXTURES.hugeMessage);
  return res.isValid === false && (res.error || '').includes('2,000');
});

runTest('Parse and accept valid HTTPS URL', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.validHttpsUrl);
  return parsed.isValid === true && parsed.isHttps === true && parsed.domain === 'vietcombank.com.vn';
});

runTest('Parse and accept valid HTTP URL', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.validHttpUrl);
  return parsed.isValid === true && parsed.isHttps === false;
});

runTest('Reject javascript: protocol URL scheme', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.invalidUrlSchemeJavascript);
  return parsed.isValid === false && (parsed.error || '').includes('không được hỗ trợ');
});

runTest('Reject data: protocol URL scheme', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.invalidUrlSchemeData);
  return parsed.isValid === false && (parsed.error || '').includes('không được hỗ trợ');
});

runTest('Reject file: protocol URL scheme', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.invalidUrlSchemeFile);
  return parsed.isValid === false && (parsed.error || '').includes('không được hỗ trợ');
});

runTest('Reject URL exceeding 2000 characters', () => {
  const parsed = parseUrl(EDGE_CASE_FIXTURES.hugeUrl);
  return parsed.isValid === false && (parsed.error || '').includes('2,000');
});

runTest('Validate image format (PNG, JPG, WEBP accepted)', () => {
  const fakePng = { name: 'screenshot.png', type: 'image/png', size: 2 * 1024 * 1024 };
  const res = validateScreenshotInput(fakePng as unknown as File);
  return res.isValid === true;
});

runTest('Reject unsupported file extension (.exe)', () => {
  const fakeExe = { name: 'malware.exe', type: 'application/x-msdownload', size: 1000 };
  const res = validateScreenshotInput(fakeExe as unknown as File);
  return res.isValid === false && (res.error || '').includes('Định dạng tệp không hợp lệ');
});

runTest('Reject oversized image (> 10MB)', () => {
  const fakeBig = { name: 'heavy.png', type: 'image/png', size: 15 * 1024 * 1024 };
  const res = validateScreenshotInput(fakeBig as unknown as File);
  return res.isValid === false && (res.error || '').includes('10MB');
});

console.log('✅ Validation & URL Parser Unit Tests Completed Successfully!');
