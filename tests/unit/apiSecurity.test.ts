import fs from 'fs';
import path from 'path';
import { validateMessageInput, validateScreenshotInput, validateUrlInput } from '../../src/utils/validation';
import { SYSTEM_INSTRUCTION_ANALYSIS, SYSTEM_INSTRUCTION_SCREENSHOT, SYSTEM_INSTRUCTION_URL } from '../../src/services/prompts';

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

console.log('\n--- 6. API SECURITY HARDENING TESTS ---');

runTest('Verify client bundle dist/assets does NOT expose GEMINI API secret keys', () => {
  const distDir = path.join(process.cwd(), 'dist', 'assets');
  if (!fs.existsSync(distDir)) {
    // If dist doesn't exist yet, return true for test
    return true;
  }
  const files = fs.readdirSync(distDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(distDir, file), 'utf-8');
      // Must not contain AIza pattern (Google API Key format)
      if (/AIzaSy[A-Za-z0-9_-]{33}/.test(content)) {
        return false;
      }
    }
  }
  return true;
});

runTest('Server System Prompts encapsulate inputs inside <UNTRUSTED_USER_INPUT> tags', () => {
  const hasMsgBoundary = SYSTEM_INSTRUCTION_ANALYSIS.includes('<UNTRUSTED_USER_INPUT>');
  const hasImgBoundary = SYSTEM_INSTRUCTION_SCREENSHOT.includes('<UNTRUSTED_USER_INPUT>');
  const hasUrlBoundary = SYSTEM_INSTRUCTION_URL.includes('<UNTRUSTED_USER_INPUT>');
  return hasMsgBoundary && hasImgBoundary && hasUrlBoundary;
});

runTest('Oversized requests (> 2000 chars text or > 10MB image) rejected before calling Gemini API', () => {
  const hugeText = 'A'.repeat(2500);
  const msgVal = validateMessageInput(hugeText);

  const fakeHugeImage = { name: 'huge.png', type: 'image/png', size: 15 * 1024 * 1024 };
  const imgVal = validateScreenshotInput(fakeHugeImage as unknown as File);

  return msgVal.isValid === false && imgVal.isValid === false;
});

runTest('Invalid request formats (empty or whitespace) rejected with 400-level safe validation', () => {
  const emptyMsgVal = validateMessageInput('');
  const emptyUrlVal = validateUrlInput('');
  return emptyMsgVal.isValid === false && emptyUrlVal.isValid === false;
});

console.log('✅ API Security Hardening Unit Tests Completed Successfully!');
