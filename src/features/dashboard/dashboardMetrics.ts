import { AnalysisResult, StandardRiskLevel } from '../../types/analysis';

export interface DashboardMetrics {
  totalChecks: number;
  highRiskPercentage: number;
  riskDistribution: Record<StandardRiskLevel, number>;
  topClassification: string;
  sourceBreakdown: {
    MESSAGE: number;
    SCREENSHOT: number;
    URL: number;
  };
}

export function calculateDashboardMetrics(history: AnalysisResult[]): DashboardMetrics {
  const total = history.length;

  if (total === 0) {
    return {
      totalChecks: 0,
      highRiskPercentage: 0,
      riskDistribution: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
      topClassification: 'Mạo danh Ngân hàng',
      sourceBreakdown: {
        MESSAGE: 0,
        SCREENSHOT: 0,
        URL: 0,
      },
    };
  }

  let highOrCriticalCount = 0;
  const riskDistribution: Record<StandardRiskLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  const classificationCounts: Record<string, number> = {};
  const sourceBreakdown = {
    MESSAGE: 0,
    SCREENSHOT: 0,
    URL: 0,
  };

  for (const item of history) {
    const normalizedLevel = (item.riskLevel || '').toString().toUpperCase() as StandardRiskLevel;
    if (normalizedLevel in riskDistribution) {
      riskDistribution[normalizedLevel]++;
    }
    if (normalizedLevel === 'HIGH' || normalizedLevel === 'CRITICAL') {
      highOrCriticalCount++;
    }

    // Classification count
    if (item.classification) {
      classificationCounts[item.classification] =
        (classificationCounts[item.classification] || 0) + 1;
    }

    // Source breakdown
    if (item.sourceType && item.sourceType in sourceBreakdown) {
      sourceBreakdown[item.sourceType as keyof typeof sourceBreakdown]++;
    }
  }

  // Determine top classification
  let topClassification = 'Chưa xác định';
  let maxCount = 0;
  for (const [cls, count] of Object.entries(classificationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topClassification = cls;
    }
  }

  return {
    totalChecks: total,
    highRiskPercentage: Math.round((highOrCriticalCount / total) * 100),
    riskDistribution,
    topClassification,
    sourceBreakdown,
  };
}
