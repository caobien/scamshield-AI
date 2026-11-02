import React, { useState, useEffect, useMemo } from 'react';
import { NavTab, SourceType, Classification, CLASSIFICATION_LABELS } from '../types';
import { historyService, HistoryItem } from '../services/historyService';
import {
  calculateDashboardStatistics,
  DashboardStatistics,
} from '../services/statisticsService';
import { getRiskLevelConfig } from '../data/presets';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  BarChart3,
  ShieldAlert,
  SearchCode,
  TrendingUp,
  FileCheck,
  Building2,
  Globe,
  Info,
  Filter,
  Calendar,
  MessageSquare,
  Image as ImageIcon,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface DashboardViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [timeRange, setTimeRange] = useState<'ALL' | '7d' | '30d'>('ALL');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'ALL' | SourceType>('ALL');

  // Load history data on mount & subscribe to real-time events
  useEffect(() => {
    const loadHistory = () => {
      const items = historyService.getHistory();
      setHistoryItems(items);
    };

    loadHistory();

    window.addEventListener('scamshield_history_updated', loadHistory);
    window.addEventListener('storage', loadHistory);
    return () => {
      window.removeEventListener('scamshield_history_updated', loadHistory);
      window.removeEventListener('storage', loadHistory);
    };
  }, []);

  // Calculate statistics dynamically from real History (No mock data!)
  const stats: DashboardStatistics = useMemo(() => {
    return calculateDashboardStatistics(historyItems, {
      timeRange,
      sourceType: sourceTypeFilter,
    });
  }, [historyItems, timeRange, sourceTypeFilter]);

  const getSourceTypeBadge = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'MESSAGE':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <MessageSquare className="w-3 h-3 text-blue-600 mr-1 inline" />
            Tin nhắn
          </Badge>
        );
      case 'SCREENSHOT':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <ImageIcon className="w-3 h-3 text-purple-600 mr-1 inline" />
            Ảnh chụp
          </Badge>
        );
      case 'URL':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <Globe className="w-3 h-3 text-indigo-600 mr-1 inline" />
            URL
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12" id="dashboard-page-container">
      {/* Header & Dynamic Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê An toàn Thực tế</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard hình thức lừa đảo
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Tổng hợp xu hướng và thống kê được tính toán trực tiếp từ lịch sử kiểm tra cá nhân.
          </p>
        </div>

        {/* Dynamic Filters */}
        {historyItems.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'ALL' | '7d' | '30d')}
                id="dashboard-time-filter"
                className="bg-transparent text-xs text-slate-800 font-semibold focus-ring cursor-pointer"
              >
                <option value="ALL">Tất cả thời gian</option>
                <option value="7d">7 ngày gần nhất</option>
                <option value="30d">30 ngày gần nhất</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value as 'ALL' | SourceType)}
                id="dashboard-source-filter"
                className="bg-transparent text-xs text-slate-800 font-semibold focus-ring cursor-pointer"
              >
                <option value="ALL">Tất cả hình thức</option>
                <option value="MESSAGE">Tin nhắn văn bản</option>
                <option value="SCREENSHOT">Ảnh chụp màn hình</option>
                <option value="URL">Đường dẫn URL</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main KPI Hero Cards Row (Clear visual hierarchy for 4 core metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-kpi-grid">
        {/* KPI 1: Total Analyses */}
        <Card padding="md" className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tổng lượt phân tích</span>
            <FileCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.totalAnalyses}</div>
          <p className="text-xs text-slate-500">
            {stats.isEmpty ? 'Chưa có dữ liệu lịch sử' : 'Tin nhắn, Ảnh chụp & URL'}
          </p>
        </Card>

        {/* KPI 2: Average Risk Score */}
        <Card padding="md" className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Risk Score trung bình</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.averageRiskScore !== null ? (
              <span
                className={
                  stats.averageRiskScore >= 75
                    ? 'text-rose-600'
                    : stats.averageRiskScore >= 50
                    ? 'text-orange-600'
                    : stats.averageRiskScore >= 25
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }
              >
                {stats.averageRiskScore}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <p className="text-xs text-slate-500">Mức rủi ro trung bình các bản lưu</p>
        </Card>

        {/* KPI 3: High Risk Content Rate */}
        <Card padding="md" className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tỷ lệ rủi ro cao</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
            {stats.totalAnalyses > 0 ? `${stats.highRiskRate}%` : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {stats.totalAnalyses > 0
              ? `${stats.highRiskCount}/${stats.totalAnalyses} mục ở mức HIGH & CRITICAL`
              : 'Chưa có đánh giá'}
          </p>
        </Card>

        {/* KPI 4: Most Common High-Risk Category */}
        <Card padding="md" className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Rủi ro cao phổ biến nhất</span>
            <Building2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900 truncate">
            {stats.mostCommonHighRiskClassification
              ? stats.mostCommonHighRiskClassification.label
              : stats.mostCommonClassification
              ? stats.mostCommonClassification.label
              : 'Chưa phát hiện'}
          </div>
          <p className="text-xs text-slate-500">
            {stats.mostCommonHighRiskClassification
              ? `${stats.mostCommonHighRiskClassification.count} lượt phát hiện nguy cơ cao`
              : 'Chưa có dữ liệu rủi ro cao'}
          </p>
        </Card>
      </div>

      {/* Main Content: Grouped Surface Panels */}
      {stats.isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="Chưa có dữ liệu thống kê"
          description="Hãy phân tích một tin nhắn, ảnh chụp màn hình hoặc đường link URL để bắt đầu tổng hợp báo cáo thống kê trực quan."
          actionText="Thực hiện phân tích ngay"
          onAction={() => setActiveTab('analyze')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* GROUPED SURFACE 1: Risk Level Distribution */}
          <Card padding="md" className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Phân bố Mức độ Rủi ro</span>
                </h3>
                <p className="text-xs text-slate-500">Tỷ lệ theo các cấp mức độ cảnh báo chuẩn hóa</p>
              </div>
              <Badge variant="neutral" size="sm" showIcon={false}>
                {stats.totalAnalyses} mục
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              {/* CRITICAL */}
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <Badge level="critical" size="sm">
                    Cực kỳ nguy hiểm (CRITICAL)
                  </Badge>
                  <span className="text-rose-700 font-mono">
                    {stats.criticalCount} ({Math.round((stats.criticalCount / stats.totalAnalyses) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.max((stats.criticalCount / stats.totalAnalyses) * 100, 2)}%` }}
                  />
                </div>
              </div>

              {/* HIGH */}
              <div className="p-3 bg-orange-50/80 rounded-xl border border-orange-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <Badge level="high" size="sm">
                    Rủi ro cao (HIGH)
                  </Badge>
                  <span className="text-orange-700 font-mono">
                    {stats.highCount} ({Math.round((stats.highCount / stats.totalAnalyses) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-orange-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max((stats.highCount / stats.totalAnalyses) * 100, 2)}%` }}
                  />
                </div>
              </div>

              {/* MEDIUM */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <Badge level="medium" size="sm">
                    Rủi ro trung bình (MEDIUM)
                  </Badge>
                  <span className="text-amber-700 font-mono">
                    {stats.mediumCount} ({Math.round((stats.mediumCount / stats.totalAnalyses) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max((stats.mediumCount / stats.totalAnalyses) * 100, 2)}%` }}
                  />
                </div>
              </div>

              {/* LOW */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <Badge level="low" size="sm">
                    An toàn / Rủi ro thấp (LOW)
                  </Badge>
                  <span className="text-emerald-700 font-mono">
                    {stats.lowCount} ({Math.round((stats.lowCount / stats.totalAnalyses) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max((stats.lowCount / stats.totalAnalyses) * 100, 2)}%` }}
                  />
                </div>
              </div>

            </div>
          </Card>

          {/* GROUPED SURFACE 2: Source Breakdown & Top Categories */}
          <Card padding="md" className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-indigo-600" />
                <span>Nguồn Phân tích & Hình thức Phổ biến</span>
              </h3>
              <p className="text-xs text-slate-500">Thống kê định dạng đầu vào và các loại hình thức lừa đảo</p>
            </div>

            {/* Source Type Breakdown */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">Theo dạng đầu vào:</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <MessageSquare className="w-4 h-4 text-blue-600 mx-auto" />
                  <span className="font-semibold text-slate-700 block">Tin nhắn</span>
                  <span className="font-extrabold text-slate-900 text-base block">{stats.sourceTypeCounts.MESSAGE}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <ImageIcon className="w-4 h-4 text-purple-600 mx-auto" />
                  <span className="font-semibold text-slate-700 block">Ảnh chụp</span>
                  <span className="font-extrabold text-slate-900 text-base block">{stats.sourceTypeCounts.SCREENSHOT}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <Globe className="w-4 h-4 text-indigo-600 mx-auto" />
                  <span className="font-semibold text-slate-700 block">Đường link</span>
                  <span className="font-extrabold text-slate-900 text-base block">{stats.sourceTypeCounts.URL}</span>
                </div>
              </div>
            </div>

            {/* Top Classifications List */}
            <div className="space-y-2 text-xs pt-2">
              <span className="font-bold text-slate-700 block">Tần suất hình thức lừa đảo:</span>
              {stats.classificationCounts && stats.classificationCounts.length > 0 ? (
                <div className="space-y-2">
                  {stats.classificationCounts.slice(0, 4).map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{c.label}</span>
                      <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {c.count} lượt ({c.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">Chưa có đủ bản ghi hình thức lừa đảo.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
