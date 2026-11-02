import { validateAnalysisOutput } from '../../src/utils/validation';

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

console.log('\n--- 4. UNIT TESTS: GEMINI OUTPUT PARSER & NORMALIZATION ---');

runTest('Validate well-formed Gemini JSON response', () => {
  const mockAiOutput = {
    riskScore: 85,
    classification: 'PHISHING',
    evidenceConfidence: 90,
    summary: 'Phát hiện đường dẫn giả mạo ngân hàng.',
    indicators: [
      {
        type: 'SUSPICIOUS_URL',
        description: 'Tên miền giả mạo',
        severity: 'HIGH',
        evidence: 'http://vcb-verify.top',
        explanation: 'Địa chỉ tên miền lạ.',
      },
    ],
    explanation: 'Nội dung hù dọa nhằm lừa đảo.',
    recommendations: ['Không bấm vào link.', 'Gọi tổng đài chính thức.'],
  };

  const val = validateAnalysisOutput(mockAiOutput, 'Nội dung tin nhắn http://vcb-verify.top', 'MESSAGE');
  return (
    val.isValid === true &&
    val.data !== undefined &&
    val.data.riskScore === 85 &&
    val.data.riskLevel === 'CRITICAL' &&
    val.data.classification === 'PHISHING' &&
    val.data.indicators.length === 1 &&
    val.data.indicators[0].evidence === 'http://vcb-verify.top'
  );
});

runTest('Clamp riskScore 999 to 100 and auto-compute riskLevel CRITICAL', () => {
  const mockRaw = {
    riskScore: 999,
    classification: 'BANKING_SCAM',
    summary: 'Mẫu thử điểm vượt khung',
  };
  const val = validateAnalysisOutput(mockRaw, 'Tin nhắn mẫu', 'MESSAGE');
  return val.isValid === true && val.data?.riskScore === 100 && val.data?.riskLevel === 'CRITICAL';
});

runTest('Clamp negative riskScore -50 to 0 and auto-compute riskLevel LOW', () => {
  const mockRaw = {
    riskScore: -50,
    classification: 'SAFE',
    summary: 'Mẫu thử điểm âm',
  };
  const val = validateAnalysisOutput(mockRaw, 'Tin nhắn an toàn', 'MESSAGE');
  return val.isValid === true && val.data?.riskScore === 0 && val.data?.riskLevel === 'LOW';
});

runTest('Fallback invalid classification enum to UNKNOWN', () => {
  const mockRaw = {
    riskScore: 40,
    classification: 'SUPER_EXTREME_SCAM',
    summary: 'Phân loại lạ',
  };
  const val = validateAnalysisOutput(mockRaw, 'Tin nhắn mẫu', 'MESSAGE');
  return val.isValid === true && val.data?.classification === 'UNKNOWN';
});

runTest('Reject fabricated evidence not present in raw input message', () => {
  const mockRaw = {
    riskScore: 80,
    classification: 'PHISHING',
    summary: 'Bằng chứng giả mạo',
    indicators: [
      {
        type: 'FINANCIAL_REQUEST',
        description: 'Yêu cầu nạp tiền',
        severity: 'HIGH',
        evidence: 'Chuyển tiền 100 triệu vào tài khoản 99999', // NOT in inputContent
        explanation: 'Thủ đoạn bịa đặt bằng chứng',
      },
    ],
  };
  const val = validateAnalysisOutput(mockRaw, 'Tin nhắn chỉ thông báo bình thường không có tài khoản 99999', 'MESSAGE');
  return val.isValid === true && val.data?.indicators[0].evidence === null;
});

runTest('Extract exact evidence excerpt present in raw input message', () => {
  const rawInput = '[VCB] Tai khoan cua quy khach bi khoa do nghi ngo nhap hinh thuc http://vcb-fake.top';
  const mockRaw = {
    riskScore: 90,
    classification: 'PHISHING',
    summary: 'Phát hiện URL giả mạo',
    indicators: [
      {
        type: 'SUSPICIOUS_URL',
        description: 'Liên kết giả mạo',
        severity: 'HIGH',
        evidence: 'http://vcb-fake.top',
        explanation: 'Đường dẫn lạ',
      },
    ],
  };
  const val = validateAnalysisOutput(mockRaw, rawInput, 'MESSAGE');
  return val.isValid === true && val.data?.indicators[0].evidence === 'http://vcb-fake.top';
});

runTest('Include mandatory caution limitation for URL analyzer', () => {
  const val = validateAnalysisOutput({ riskScore: 70 }, 'https://example-scam.xyz', 'URL');
  return (
    val.isValid === true &&
    val.data?.limitations !== undefined &&
    val.data.limitations.some((l) => l.includes('KHÔNG kết nối hoặc truy cập trang web'))
  );
});

console.log('✅ Gemini Output Parser Unit Tests Completed Successfully!');
