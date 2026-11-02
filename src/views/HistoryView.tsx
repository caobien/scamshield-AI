import React, { useState, useEffect, useMemo } from 'react';
import { NavTab, SourceType, Classification, CLASSIFICATION_LABELS } from '../types';
import { historyService, HistoryItem } from '../services/historyService';
import { getRiskLevelConfig } from '../data/presets';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatVietnameseDateTime } from '../utils/formatDate';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  History,
  Search,
  Filter,
  Trash2,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  Globe,
  Eye,
  X,
  CheckCircle2,
  Info,
  ListChecks,
  ArrowRight,
} from 'lucide-react';

interface HistoryViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ setActiveTab }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSourceType, setFilterSourceType] = useState<string>('ALL');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('ALL');
  const [selectedDetailItem, setSelectedDetailItem] = useState<HistoryItem | null>(null);

  // Confirmation Modal States
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load history on mount & subscribe to real-time events
  useEffect(() => {
    loadHistoryData();

    window.addEventListener('scamshield_history_updated', loadHistoryData);
    window.addEventListener('storage', loadHistoryData);
    return () => {
      window.removeEventListener('scamshield_history_updated', loadHistoryData);
      window.removeEventListener('storage', loadHistoryData);
    };
  }, []);

  const loadHistoryData = () => {
    const items = historyService.getHistory();
    setHistoryItems(items);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Filtered list based on search, sourceType, and riskLevel
  const filteredItems = useMemo(() => {
    return historyItems.filter((item) => {
      // 1. Source Type filter
      if (filterSourceType !== 'ALL' && item.sourceType !== filterSourceType) {
        return false;
      }

      // 2. Risk Level filter
      if (filterRiskLevel !== 'ALL' && (item.riskLevel || '').toLowerCase() !== filterRiskLevel.toLowerCase()) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inSummary = (item.summary || '').toLowerCase().includes(q);
        const inContent = (item.redactedContent || '').toLowerCase().includes(q);
        const inClass = (CLASSIFICATION_LABELS[item.classification as Classification] || item.classification || '')
          .toLowerCase()
          .includes(q);
        return inSummary || inContent || inClass;
      }

      return true;
    });
  }, [historyItems, filterSourceType, filterRiskLevel, searchQuery]);

  // Single delete handler via ConfirmModal
  const confirmSingleDelete = () => {
    if (!itemToDelete) return;
    const success = historyService.deleteHistoryItem(itemToDelete.id);
    if (success) {
      showToast('Đã xóa 1 bản ghi khỏi lịch sử.');
      loadHistoryData();
      if (selectedDetailItem?.id === itemToDelete.id) {
        setSelectedDetailItem(null);
      }
    }
    setItemToDelete(null);
  };

  // Clear all handler via ConfirmModal
  const confirmClearAll = () => {
    const success = historyService.clearAllHistory();
    if (success) {
      showToast('Đã xóa toàn bộ lịch sử phân tích thành công.');
      loadHistoryData();
      setSelectedDetailItem(null);
    }
    setConfirmDeleteAll(false);
  };

  const getSourceTypeBadge = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'MESSAGE':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <MessageSquare className="w-3.5 h-3.5 text-blue-600 mr-1 inline" />
            Tin nhắn
          </Badge>
        );
      case 'SCREENSHOT':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <ImageIcon className="w-3.5 h-3.5 text-purple-600 mr-1 inline" />
            Ảnh chụp
          </Badge>
        );
      case 'URL':
        return (
          <Badge variant="neutral" size="sm" showIcon={false}>
            <Globe className="w-3.5 h-3.5 text-indigo-600 mr-1 inline" />
            Đường link
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12" id="history-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-3 text-sm animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmDeleteAll}
        title="Xóa toàn bộ lịch sử?"
        message="Hành động này sẽ xóa tất cả kết quả đánh giá đã lưu trong trình duyệt của bạn và không thể hoàn tác."
        confirmText="Xóa toàn bộ"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={confirmClearAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="Xóa mục lịch sử này?"
        message={`Bạn có chắc muốn xóa kết quả đánh giá "${itemToDelete?.summary || 'mục này'}" khỏi lịch sử?`}
        confirmText="Xóa mục này"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={confirmSingleDelete}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Lưu trữ cục bộ an toàn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lịch sử kiểm tra rủi ro
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Xem lại các bản phân tích gần đây. Mã OTP, số thẻ và mật khẩu đã được tự động che để bảo vệ quyền riêng tư.
          </p>
        </div>

        {historyItems.length > 0 && (
          <Button
            onClick={() => setConfirmDeleteAll(true)}
            id="clear-all-history-btn"
            variant="danger"
            size="md"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Xóa toàn bộ lịch sử
          </Button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      {historyItems.length > 0 && (
        <Card padding="sm" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm text-slate-800 focus-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer focus-ring"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterSourceType}
                onChange={(e) => setFilterSourceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus-ring font-medium cursor-pointer"
              >
                <option value="ALL">Tất cả định dạng đầu vào</option>
                <option value="MESSAGE">Tin nhắn văn bản</option>
                <option value="SCREENSHOT">Ảnh chụp màn hình</option>
                <option value="URL">Đường dẫn URL</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <select
                value={filterRiskLevel}
                onChange={(e) => setFilterRiskLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus-ring font-medium cursor-pointer"
              >
                <option value="ALL">Tất cả mức rủi ro</option>
                <option value="critical">Rất cao (Critical)</option>
                <option value="high">Cao (High)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="low">Thấp (Low)</option>
                <option value="unknown">Chưa xác định (Unknown)</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Main History List or Empty State */}
      {historyItems.length === 0 ? (
        <Card padding="lg" className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <History className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Chưa có lịch sử đánh giá</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn chưa phân tích tin nhắn, ảnh chụp hay đường link nào. Kết quả kiểm tra sẽ xuất hiện tại đây.
            </p>
          </div>
          <Button
            onClick={() => setActiveTab('analyze')}
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Thực hiện phân tích đầu tiên
          </Button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card padding="md" className="text-center space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-slate-700">Không tìm thấy bản ghi phù hợp bộ lọc.</p>
          <Button
            onClick={() => {
              setSearchQuery('');
              setFilterSourceType('ALL');
              setFilterRiskLevel('ALL');
            }}
            variant="ghost"
            size="sm"
          >
            Xóa toàn bộ bộ lọc
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5" id="history-items-grid">
          {filteredItems.map((item) => {
            const config = getRiskLevelConfig(item.riskLevel);
            const classKey = item.classification as Classification;
            const classLabel = CLASSIFICATION_LABELS[classKey] || item.classification;
            const friendlyDate = formatVietnameseDateTime(item.timestamp);

            return (
              <Card
                key={item.id}
                interactive={true}
                padding="md"
                className="space-y-3"
              >
                {/* Header Row: Badges + Friendly Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSourceTypeBadge(item.sourceType)}
                    <Badge level={item.riskLevel} size="sm">
                      Mức rủi ro: {config.label} ({item.riskScore}/100)
                    </Badge>
                    <Badge variant="neutral" size="sm" showIcon={false}>
                      {classLabel}
                    </Badge>
                  </div>

                  {/* Clean Vietnamese Formatted Date */}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{friendlyDate}</span>
                  </div>
                </div>

                {/* Summary Title */}
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {item.summary}
                  </h3>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono border border-slate-100 line-clamp-2">
                    <span className="font-sans font-bold text-slate-500 mr-1.5">Nội dung đã ẩn danh:</span>
                    “{item.redactedInputPreview || item.redactedContent}”
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    onClick={() => setSelectedDetailItem(item)}
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye className="w-4 h-4" />}
                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                  >
                    Xem báo cáo chi tiết
                  </Button>

                  <Button
                    onClick={() => setItemToDelete(item)}
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    Xóa
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Detail View for History Item */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <Card padding="lg" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Chi tiết bản ghi lịch sử ({formatVietnameseDateTime(selectedDetailItem.timestamp)})
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedDetailItem.summary}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Nội dung đã được che thông tin cá nhân:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedDetailItem.redactedContent}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                Giải thích rủi ro từ AI:
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {selectedDetailItem.explanation}
              </div>
            </div>

            {/* Recommendations */}
            {selectedDetailItem.recommendations && selectedDetailItem.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
                  Khuyên dùng ngay:
                </span>
                <div className="space-y-1">
                  {selectedDetailItem.recommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-medium flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <Button
                onClick={() => setSelectedDetailItem(null)}
                variant="outline"
                size="md"
              >
                Đóng chi tiết
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
