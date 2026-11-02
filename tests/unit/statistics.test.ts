import { calculateDashboardStatistics } from '../../src/services/statisticsService';
import { HistoryItem } from '../../src/services/historyService';

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

console.log('\n--- 2. UNIT TESTS: DASHBOARD STATISTICS SERVICE ---');

const now = Date.now();
const dayMs = 86400000;

const sampleHistoryItems: HistoryItem[] = [
  {
    id: 'item-1',
    timestamp: new Date(now - 1 * dayMs).toLocaleString('vi-VN'),
    createdAt: now - 1 * dayMs,
    sourceType: 'MESSAGE',
    riskScore: 10,
    riskLevel: 'low',
    classification: 'SAFE',
    summary: 'Tin nhắn an toàn',
    redactedContent: 'Chào bạn',
    indicators: [],
    explanation: 'Giải thích 1',
    recommendations: ['Khuyên 1'],
  },
  {
    id: 'item-2',
    timestamp: new Date(now - 2 * dayMs).toLocaleString('vi-VN'),
    createdAt: now - 2 * dayMs,
    sourceType: 'URL',
    riskScore: 85,
    riskLevel: 'critical',
    classification: 'PHISHING',
    summary: 'Liên kết lừa đảo',
    redactedContent: 'http://vcb-fake.top',
    indicators: [],
    explanation: 'Giải thích 2',
    recommendations: ['Khuyên 2'],
  },
  {
    id: 'item-3',
    timestamp: new Date(now - 10 * dayMs).toLocaleString('vi-VN'),
    createdAt: now - 10 * dayMs,
    sourceType: 'SCREENSHOT',
    riskScore: 60,
    riskLevel: 'high',
    classification: 'BANKING_SCAM',
    summary: 'Ảnh bill chuyển khoản nghi vấn',
    redactedContent: 'Bill ngân hàng',
    indicators: [],
    explanation: 'Giải thích 3',
    recommendations: ['Khuyên 3'],
  },
];

runTest('Calculate statistics for empty history (0 items)', () => {
  const stats = calculateDashboardStatistics([]);
  return stats.totalAnalyses === 0 && stats.averageRiskScore === null && stats.isEmpty === true;
});

runTest('Calculate statistics for 1 item', () => {
  const stats = calculateDashboardStatistics([sampleHistoryItems[0]]);
  return (
    stats.totalAnalyses === 1 &&
    stats.severityCounts.LOW === 1 &&
    stats.averageRiskScore === 10 &&
    stats.highRiskRate === 0 &&
    stats.isLowData === true
  );
});

runTest('Calculate statistics for 3 items (All time)', () => {
  const stats = calculateDashboardStatistics(sampleHistoryItems);
  // Avg score: (10 + 85 + 60) / 3 = 155 / 3 = 51.666 -> rounded 51.7
  // High risk items (HIGH + CRITICAL): 2 / 3 = 66.666% -> rounded 66.7%
  return (
    stats.totalAnalyses === 3 &&
    stats.averageRiskScore === 51.7 &&
    stats.highRiskRate === 66.7 &&
    stats.isLowData === false
  );
});

runTest('Filter statistics by Last 7 Days (excludeds 10-day-old item)', () => {
  const stats = calculateDashboardStatistics(sampleHistoryItems, { timeRange: '7d' });
  // Should include item 1 and 2 only (total 2). Avg score: (10 + 85) / 2 = 47.5
  return stats.totalAnalyses === 2 && stats.averageRiskScore === 47.5;
});

runTest('Filter statistics by Source Type URL', () => {
  const stats = calculateDashboardStatistics(sampleHistoryItems, { sourceType: 'URL' });
  return stats.totalAnalyses === 1 && stats.sourceTypeCounts.URL === 1 && stats.averageRiskScore === 85;
});

runTest('Combined Filter (Last 7 Days + Source MESSAGE)', () => {
  const stats = calculateDashboardStatistics(sampleHistoryItems, { timeRange: '7d', sourceType: 'MESSAGE' });
  return stats.totalAnalyses === 1 && stats.averageRiskScore === 10;
});

console.log('✅ Dashboard Statistics Service Unit Tests Completed Successfully!');
