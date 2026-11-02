import { Classification, CLASSIFICATION_LABELS, SourceType } from '../types/analysis';
import { HistoryItem } from './historyService';

export interface FilterOptions {
  timeRange?: 'ALL' | '7d' | '30d';
  sourceType?: 'ALL' | SourceType;
}

export interface ClassificationStat {
  key: Classification;
  label: string;
  count: number;
  percentage: number;
}

export interface RiskBucketStat {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface DailyActivityStat {
  dateStr: string;
  displayDate: string;
  count: number;
  highRiskCount: number;
}

export interface DashboardStatistics {
  totalAnalyses: number;
  averageRiskScore: number | null;
  highRiskRate: number;
  highRiskCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  severityCounts: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>;
  sourceTypeCounts: Record<SourceType, number>;
  classificationCounts: ClassificationStat[];
  riskScoreBuckets: RiskBucketStat[];
  recentActivity: DailyActivityStat[];
  mostCommonClassification: ClassificationStat | null;
  mostCommonHighRiskClassification: ClassificationStat | null;
  recentHighRiskItems: HistoryItem[];
  isLowData: boolean;
  isEmpty: boolean;
}

/**
 * Robust helper to extract timestamp in milliseconds from a HistoryItem.
 * Supports createdAt, ISO strings, locale strings, and DD/MM/YYYY regex.
 */
export function getItemTimeMs(item?: Partial<HistoryItem>): number {
  if (!item) return Date.now();
  if (typeof item.createdAt === 'number' && !isNaN(item.createdAt) && item.createdAt > 0) {
    return item.createdAt;
  }
  if (item.timestamp) {
    const parsed = new Date(item.timestamp).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    // Match DD/MM/YYYY or DD/MM/YYYY, HH:mm:ss
    const match = item.timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.getTime();
      }
    }
  }
  return Date.now();
}

/**
 * Normalizes raw severity levels to uppercase standard keys ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL').
 */
export function normalizeSeverity(level?: string, score?: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const norm = (level || '').toString().trim().toUpperCase();
  if (norm === 'LOW' || norm === 'MEDIUM' || norm === 'HIGH' || norm === 'CRITICAL') {
    return norm;
  }
  // Fallback to score calculation if severity string is non-standard
  if (isValidRiskScore(score)) {
    if (score <= 24) return 'LOW';
    if (score <= 49) return 'MEDIUM';
    if (score <= 74) return 'HIGH';
    return 'CRITICAL';
  }
  return 'MEDIUM';
}

/**
 * Normalizes raw classification strings to valid Classification enum values with alias mapping.
 */
export function normalizeClassification(raw?: string): Classification {
  if (!raw) return 'UNKNOWN';
  const clean = raw.toString().trim().toUpperCase().replace(/[\s-]+/g, '_');

  const validKeys: Classification[] = [
    'SAFE',
    'PHISHING',
    'BANKING_SCAM',
    'JOB_SCAM',
    'INVESTMENT_SCAM',
    'PRIZE_SCAM',
    'IMPERSONATION',
    'ACCOUNT_TAKEOVER',
    'ROMANCE_SCAM',
    'OTHER_SCAM',
    'UNKNOWN',
  ];

  if (validKeys.includes(clean as Classification)) {
    return clean as Classification;
  }

  // Alias checks
  if (clean.includes('PHISHING')) return 'PHISHING';
  if (clean.includes('BANKING') || clean.includes('BANK')) return 'BANKING_SCAM';
  if (clean.includes('JOB') || clean.includes('WORK')) return 'JOB_SCAM';
  if (clean.includes('INVEST') || clean.includes('CRYPTO')) return 'INVESTMENT_SCAM';
  if (clean.includes('PRIZE') || clean.includes('GIFT')) return 'PRIZE_SCAM';
  if (clean.includes('IMPERSONAT')) return 'IMPERSONATION';
  if (clean.includes('ACCOUNT') || clean.includes('TAKEOVER')) return 'ACCOUNT_TAKEOVER';
  if (clean.includes('ROMANCE') || clean.includes('LOVE')) return 'ROMANCE_SCAM';
  if (clean.includes('OTHER')) return 'OTHER_SCAM';

  return 'UNKNOWN';
}

/**
 * Validates whether a risk score is a valid finite number strictly between 0 and 100.
 */
export function isValidRiskScore(score: unknown): score is number {
  return (
    typeof score === 'number' &&
    !isNaN(score) &&
    isFinite(score) &&
    score >= 0 &&
    score <= 100
  );
}

/**
 * Pure function to filter history items based on time range and source type.
 */
export function filterHistoryItems(
  items: HistoryItem[],
  options: FilterOptions = {}
): HistoryItem[] {
  const { timeRange = 'ALL', sourceType = 'ALL' } = options;
  const now = Date.now();

  return (items || []).filter((item) => {
    if (!item || typeof item !== 'object') return false;

    // 1. Source Type Filter
    if (sourceType !== 'ALL' && item.sourceType !== sourceType) {
      return false;
    }

    // 2. Time Range Filter
    if (timeRange !== 'ALL') {
      const itemTime = getItemTimeMs(item);
      const diffDays = (now - itemTime) / (1000 * 60 * 60 * 24);
      if (timeRange === '7d' && diffDays > 7) {
        return false;
      }
      if (timeRange === '30d' && diffDays > 30) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Main Pure Statistics Calculator.
 * Takes raw history items and filter options, returns complete calculated aggregated stats.
 */
export function calculateDashboardStatistics(
  rawItems: HistoryItem[],
  options: FilterOptions = {}
): DashboardStatistics {
  const filtered = filterHistoryItems(rawItems, options);
  const totalAnalyses = filtered.length;

  if (totalAnalyses === 0) {
    return {
      totalAnalyses: 0,
      averageRiskScore: null,
      highRiskRate: 0,
      highRiskCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      severityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      sourceTypeCounts: { MESSAGE: 0, SCREENSHOT: 0, URL: 0 },
      classificationCounts: [],
      riskScoreBuckets: [
        { range: '0–20', min: 0, max: 20, count: 0, percentage: 0 },
        { range: '21–40', min: 21, max: 40, count: 0, percentage: 0 },
        { range: '41–60', min: 41, max: 60, count: 0, percentage: 0 },
        { range: '61–80', min: 61, max: 80, count: 0, percentage: 0 },
        { range: '81–100', min: 81, max: 100, count: 0, percentage: 0 },
      ],
      recentActivity: [],
      mostCommonClassification: null,
      mostCommonHighRiskClassification: null,
      recentHighRiskItems: [],
      isLowData: false,
      isEmpty: true,
    };
  }

  // 1. Severity Counts
  const severityCounts: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  // 2. Source Type Counts
  const sourceTypeCounts: Record<SourceType, number> = {
    MESSAGE: 0,
    SCREENSHOT: 0,
    URL: 0,
  };

  // 3. Classification Counts
  const classMap = new Map<Classification, number>();
  const highRiskClassMap = new Map<Classification, number>();

  // 4. Score Buckets
  const bucketCounts = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100

  // 5. Total Valid Scores
  let sumRiskScore = 0;
  let validScoreCount = 0;

  // 6. Recent High Risk Items
  const recentHighRiskItems: HistoryItem[] = [];

  // 7. Daily Activity Aggregation
  const dailyMap = new Map<string, { displayDate: string; count: number; highRiskCount: number }>();

  for (const item of filtered) {
    const sev = normalizeSeverity(item.riskLevel, item.riskScore);
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;

    const source = (item.sourceType || 'MESSAGE') as SourceType;
    if (sourceTypeCounts[source] !== undefined) {
      sourceTypeCounts[source] += 1;
    } else {
      sourceTypeCounts['MESSAGE'] += 1;
    }

    const cls = normalizeClassification(item.classification);
    classMap.set(cls, (classMap.get(cls) || 0) + 1);

    if (sev === 'HIGH' || sev === 'CRITICAL') {
      highRiskClassMap.set(cls, (highRiskClassMap.get(cls) || 0) + 1);
      if (recentHighRiskItems.length < 5) {
        recentHighRiskItems.push(item);
      }
    }

    // Valid Risk Score aggregation
    if (isValidRiskScore(item.riskScore)) {
      const score = item.riskScore;
      sumRiskScore += score;
      validScoreCount += 1;

      if (score <= 20) bucketCounts[0]++;
      else if (score <= 40) bucketCounts[1]++;
      else if (score <= 60) bucketCounts[2]++;
      else if (score <= 80) bucketCounts[3]++;
      else bucketCounts[4]++;
    }

    // Daily Date aggregation
    const timeMs = getItemTimeMs(item);
    const d = new Date(timeMs);
    const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    const currentDaily = dailyMap.get(dateKey) || { displayDate, count: 0, highRiskCount: 0 };
    currentDaily.count += 1;
    if (sev === 'HIGH' || sev === 'CRITICAL') {
      currentDaily.highRiskCount += 1;
    }
    dailyMap.set(dateKey, currentDaily);
  }

  // Calculate Averages & Percentages
  const averageRiskScore =
    validScoreCount > 0 ? Math.round((sumRiskScore / validScoreCount) * 10) / 10 : null;

  const highRiskCount = severityCounts.HIGH + severityCounts.CRITICAL;
  const highRiskRate = Math.round((highRiskCount / totalAnalyses) * 1000) / 10;

  // Format Classifications List (Sorted Descending & Capped to Top 5 + OTHER)
  let rawClassList: ClassificationStat[] = Array.from(classMap.entries())
    .map(([key, count]) => ({
      key,
      label: CLASSIFICATION_LABELS[key] || key,
      count,
      percentage: Math.round((count / totalAnalyses) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  if (rawClassList.length > 5) {
    const top5 = rawClassList.slice(0, 5);
    const otherCount = rawClassList.slice(5).reduce((sum, item) => sum + item.count, 0);
    top5.push({
      key: 'OTHER_SCAM',
      label: 'Hình thức lừa đảo khác',
      count: otherCount,
      percentage: Math.round((otherCount / totalAnalyses) * 1000) / 10,
    });
    rawClassList = top5;
  }
  const classificationCounts = rawClassList;

  // Formatted Score Buckets
  const bucketRanges = [
    { range: '0–20', min: 0, max: 20 },
    { range: '21–40', min: 21, max: 40 },
    { range: '41–60', min: 41, max: 60 },
    { range: '61–80', min: 61, max: 80 },
    { range: '81–100', min: 81, max: 100 },
  ];

  const riskScoreBuckets: RiskBucketStat[] = bucketRanges.map((b, idx) => ({
    ...b,
    count: bucketCounts[idx],
    percentage: Math.round((bucketCounts[idx] / totalAnalyses) * 1000) / 10,
  }));

  // Daily Activity List (Sorted Chronologically)
  const recentActivity: DailyActivityStat[] = Array.from(dailyMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-7)
    .map(([dateStr, data]) => ({
      dateStr,
      displayDate: data.displayDate,
      count: data.count,
      highRiskCount: data.highRiskCount,
    }));

  // Top Classifications
  const mostCommonClassification = classificationCounts.length > 0 ? classificationCounts[0] : null;

  const sortedHighRiskClasses = Array.from(highRiskClassMap.entries())
    .map(([key, count]) => ({
      key,
      label: CLASSIFICATION_LABELS[key] || key,
      count,
      percentage: Math.round((count / (highRiskCount || 1)) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const mostCommonHighRiskClassification =
    sortedHighRiskClasses.length > 0 ? sortedHighRiskClasses[0] : null;

  return {
    totalAnalyses,
    averageRiskScore,
    highRiskRate,
    highRiskCount,
    criticalCount: severityCounts.CRITICAL,
    highCount: severityCounts.HIGH,
    mediumCount: severityCounts.MEDIUM,
    lowCount: severityCounts.LOW,
    severityCounts,
    sourceTypeCounts,
    classificationCounts,
    riskScoreBuckets,
    recentActivity,
    mostCommonClassification,
    mostCommonHighRiskClassification,
    recentHighRiskItems,
    isLowData: totalAnalyses >= 1 && totalAnalyses <= 2,
    isEmpty: false,
  };
}
