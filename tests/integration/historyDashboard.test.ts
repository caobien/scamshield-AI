import { historyService } from '../../src/services/historyService';
import { calculateDashboardStatistics } from '../../src/services/statisticsService';
import { AnalysisResult } from '../../src/types/analysis';

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

console.log('\n--- 5. INTEGRATION TESTS: ANALYSIS -> HISTORY -> DASHBOARD ---');

// Mock localStorage in Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  };
}

// Clear history before test
historyService.clearAllHistory();

runTest('Initial state: History is empty & Dashboard is empty', () => {
  const history = historyService.getHistory();
  const stats = calculateDashboardStatistics(history);
  return history.length === 0 && stats.totalAnalyses === 0 && stats.isEmpty === true;
});

runTest('Save analysis result #1 to History and calculate updated Dashboard stats', () => {
  const result1: AnalysisResult = {
    id: 'res-int-1',
    timestamp: new Date().toLocaleString('vi-VN'),
    sourceType: 'MESSAGE',
    inputContent: 'Mã OTP của bạn là 123456. Gửi cho 0912345678',
    riskScore: 20,
    riskLevel: 'LOW',
    classification: 'SAFE',
    summary: 'Tin nhắn OTP xác nhận thông thường.',
    indicators: [],
    explanation: 'Giải thích tích hợp 1.',
    recommendations: ['Không chia sẻ OTP'],
  };

  const saveRes = historyService.saveHistoryItem(result1, result1.inputContent);
  if (!saveRes.success) return false;

  const updatedHistory = historyService.getHistory();
  const stats = calculateDashboardStatistics(updatedHistory);

  // Check data redaction occurred: "123456" redacted to "[MÃ XÁC THỰC ĐÃ CHE]"
  const redactedContent = updatedHistory[0].redactedContent;
  const isRedacted = !redactedContent.includes('123456') && (redactedContent.includes('[MÃ OTP ĐÃ CHE]') || redactedContent.includes('[MÃ XÁC THỰC ĐÃ CHE]'));

  return (
    updatedHistory.length === 1 &&
    stats.totalAnalyses === 1 &&
    stats.averageRiskScore === 20 &&
    stats.severityCounts.LOW === 1 &&
    isRedacted
  );
});

runTest('Save analysis result #2 (URL Phishing) and verify Dashboard aggregation', () => {
  const result2: AnalysisResult = {
    id: 'res-int-2',
    timestamp: new Date().toLocaleString('vi-VN'),
    sourceType: 'URL',
    inputContent: 'http://vietcombank-security.top',
    riskScore: 90,
    riskLevel: 'CRITICAL',
    classification: 'PHISHING',
    summary: 'URL giả mạo thương hiệu Vietcombank.',
    indicators: [
      {
        type: 'SUSPICIOUS_URL',
        description: 'Tên miền giả mạo',
        severity: 'HIGH',
        evidence: 'http://vietcombank-security.top',
      },
    ],
    explanation: 'Giả mạo ngân hàng',
    recommendations: ['Tránh truy cập link'],
  };

  const saveRes = historyService.saveHistoryItem(result2, result2.inputContent);
  if (!saveRes.success) return false;

  const updatedHistory = historyService.getHistory();
  const stats = calculateDashboardStatistics(updatedHistory);

  // Total 2 items, avg score: (20 + 90) / 2 = 55
  // High risk rate: 1 CRITICAL / 2 = 50%
  const phishingStat = stats.classificationCounts.find((c) => c.key === 'PHISHING');
  return (
    updatedHistory.length === 2 &&
    stats.totalAnalyses === 2 &&
    stats.averageRiskScore === 55 &&
    stats.highRiskRate === 50 &&
    phishingStat?.count === 1
  );
});

runTest('Delete single history item #1 and verify Dashboard updates dynamically', () => {
  const delSuccess = historyService.deleteHistoryItem('res-int-1');
  if (!delSuccess) return false;

  const updatedHistory = historyService.getHistory();
  const stats = calculateDashboardStatistics(updatedHistory);

  return (
    updatedHistory.length === 1 &&
    stats.totalAnalyses === 1 &&
    stats.averageRiskScore === 90 &&
    stats.highRiskRate === 100
  );
});

runTest('Clear all History and verify Dashboard reverts to empty state', () => {
  historyService.clearAllHistory();

  const updatedHistory = historyService.getHistory();
  const stats = calculateDashboardStatistics(updatedHistory);

  return updatedHistory.length === 0 && stats.totalAnalyses === 0 && stats.isEmpty === true;
});

console.log('✅ Integration Tests (Analysis -> History -> Dashboard) Completed Successfully!');
