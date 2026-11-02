/**
 * Redaction utility for masking sensitive personal and financial data
 * before persisting analysis results to local history.
 */

// RegEx patterns for sensitive Vietnamese & global data
const PATTERNS = {
  // OTP codes: e.g. "OTP là 123456", "Mã xác thực: 889900", or isolated 4-8 digit numbers
  otp: /(?:mã\s*(?:otp|xác\s*thực)|otp\s*(?:code|is|là)?|\bcode\b)[\s:=]*([0-9]{4,8})/gi,
  genericOtpNumber: /\b\d{6}\b/g, // Common 6-digit OTPs

  // Passwords / PINs: e.g. "mật khẩu là 123456", "pass: Abc1234"
  password: /(?:mật\s*khẩu|mat\s*khau|password|pass|mã\s*pin|pin\s*code)[\s:=]*([^\s,;.]{3,30})/gi,

  // Phone numbers: Vietnamese format e.g. 0912345678, +84987654321
  phone: /(?:\+84|0)(?:3|5|7|8|9)\d{8}\b/g,

  // Bank account / Card numbers: 10 to 19 digits
  bankCard: /\b\d{10,19}\b/g,

  // CCCD / CMND (Vietnamese Citizen ID): 9 or 12 digits
  cccd: /\b\d{9}\b|\b\d{12}\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
};

/**
 * Masks sensitive patterns in plain text string with explicit labels.
 */
export function redactSensitiveData(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Mask Email
  sanitized = sanitized.replace(PATTERNS.email, '[EMAIL ĐÃ CHE]');

  // 2. Mask Passwords
  sanitized = sanitized.replace(PATTERNS.password, (match) => {
    const parts = match.split(/[\s:=]+/);
    const label = parts[0] || 'Mật khẩu';
    return `${label}: [MẬT KHẨU ĐÃ CHE]`;
  });

  // 3. Mask OTP patterns
  sanitized = sanitized.replace(PATTERNS.otp, (match) => {
    return match.replace(/\d{4,8}/, '[MÃ OTP ĐÃ CHE]');
  });

  // 4. Mask Phone Numbers
  sanitized = sanitized.replace(PATTERNS.phone, '[SỐ ĐIỆN THOẠI ĐÃ CHE]');

  // 5. Mask CCCD / CMND (9 or 12 digits)
  sanitized = sanitized.replace(PATTERNS.cccd, '[SỐ CCCD/CMND ĐÃ CHE]');

  // 6. Mask Bank Card / Account Numbers (10 to 19 digits)
  sanitized = sanitized.replace(PATTERNS.bankCard, '[SỐ TÀI KHOẢN/THẺ ĐÃ CHE]');

  // 7. General 6-digit OTP fallback if standalone
  sanitized = sanitized.replace(PATTERNS.genericOtpNumber, '[MÃ XÁC THỰC ĐÃ CHE]');

  return sanitized;
}

/**
 * Ensures input for SCREENSHOT / image never stores base64 binary or raw image URLs.
 */
export function sanitizeContentForHistory(
  content: string,
  sourceType: 'MESSAGE' | 'SCREENSHOT' | 'URL'
): string {
  if (sourceType === 'SCREENSHOT') {
    if (content.startsWith('data:image') || content.length > 500) {
      return '[Ảnh chụp màn hình đã được phân tích - Dữ liệu hình ảnh thô không lưu để bảo mật]';
    }
  }

  return redactSensitiveData(content);
}
