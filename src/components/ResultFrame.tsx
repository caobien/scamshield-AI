import React, { useState, useEffect } from 'react';
import { AnalysisResult, RiskLevel, CLASSIFICATION_LABELS, Classification, INDICATOR_TYPE_LABELS } from '../types';
import { getRiskLevelConfig, RISK_LEVEL_CONFIG } from '../data/presets';
import { historyService } from '../services/historyService';
import { redactSensitiveData } from '../utils/redact';
import { DYNAMIC_PROGRESS_STEPS } from '../types/stateMachine';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  ListChecks,
  AlertOctagon,
  Eye,
  FileText,
  AlertCircle,
  BookmarkPlus,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';

interface ResultFrameProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  progressStepIndex?: number;
  progressMessage?: string;
  rawInputContent?: string;
  onReset: () => void;
  onSimulateDemo?: (level: RiskLevel) => void;
}

export const ResultFrame: React.FC<ResultFrameProps> = ({
  result,
  isAnalyzing,
  progressStepIndex = 0,
  progressMessage,
  rawInputContent,
  onReset,
  onSimulateDemo,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showAllIndicators, setShowAllIndicators] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    if (result) {
      setIsSaved(historyService.hasSaved(result.id));
      setSaveFeedback(null);
      setShowTechnicalDetails(false);
      setShowAllIndicators(false);
      setCopiedReport(false);
    } else {
      setIsSaved(false);
      setSaveFeedback(null);
      setShowTechnicalDetails(false);
      setShowAllIndicators(false);
      setCopiedReport(false);
    }
  }, [result?.id]);

  const handleSaveToHistory = () => {
    if (!result) return;
    const res = historyService.saveHistoryItem(result, rawInputContent || result.inputContent || '');
    if (res.success) {
      setIsSaved(true);
      setSaveFeedback({
        text: 'Đã lưu vào lịch sử thành công! (Dữ liệu cá nhân như OTP, mật khẩu, tài khoản đã được che tự động)',
        isError: false,
      });
    } else {
      setSaveFeedback({
        text: res.error || 'Không thể lưu vào lịch sử.',
        isError: true,
      });
    }
  };

  const handleCopyReport = () => {
    if (!result) return;

    const classKey = result.classification as Classification;
    const classLabel = CLASSIFICATION_LABELS[classKey] || result.classification;

    const safeSummary = redactSensitiveData(result.summary);
    const safeExplanation = redactSensitiveData(result.explanation || '');
    const safeRecs = (result.recommendations || []).map((r) => `- ${redactSensitiveData(r)}`).join('\n');

    const reportText = `[BÁO CÁO PHÂN TÍCH SCAMSHIELD AI]
Mức độ rủi ro: ${result.riskScore}/100 (${result.riskLevel?.toUpperCase()})
Loại phân tích: ${classLabel}
Tóm tắt: ${safeSummary}

VIỆC CẦN LÀM NGAY:
${safeRecs}

GIẢI THÍCH CHI TIẾT:
${safeExplanation}

Tuyên bố: Kết quả do AI phân tích mang tính chất hỗ trợ ra quyết định, không phải kết luận pháp lý hay kỹ thuật tuyệt đối.`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Render Meaningful Dynamic Stepper during Analysis
  if (isAnalyzing) {
    const currentMsg = progressMessage || DYNAMIC_PROGRESS_STEPS[Math.min(progressStepIndex, DYNAMIC_PROGRESS_STEPS.length - 1)].label;

    return (
      <Card padding="lg" className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-xs">
          <Sparkles className="w-8 h-8 animate-spin text-indigo-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">{currentMsg}...</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Hệ thống đang phân tích ngữ cảnh, kiểm tra các dấu hiệu giả mạo và trích xuất bằng chứng an toàn.
          </p>
        </div>

        {/* Dynamic Stepper Bar (No fake percentages) */}
        <div className="max-w-md mx-auto pt-2">
          <div className="grid grid-cols-4 gap-2">
            {DYNAMIC_PROGRESS_STEPS.map((step, idx) => {
              const isCompleted = idx < progressStepIndex;
              const isActive = idx === progressStepIndex;

              return (
                <div key={idx} className="flex flex-col items-center space-y-1.5">
                  <div
                    className={`h-2 w-full rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-indigo-600'
                        : isActive
                        ? 'bg-indigo-400 animate-pulse'
                        : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium leading-tight text-center ${
                      isActive
                        ? 'text-indigo-600 font-bold'
                        : isCompleted
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    Bước {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  // Active result display with Result-First & Progressive Disclosure
  if (result) {
    const config = getRiskLevelConfig(result.riskLevel);
    const normalizedLevel = (result.riskLevel || '').toString().toLowerCase();

    // Map classification label
    const classKey = result.classification as Classification;
    const classLabel = CLASSIFICATION_LABELS[classKey] || result.classification;

    // Progressive Disclosure for Indicators (Show top 3-4 first)
    const allIndicators = result.indicators || [];
    const TOP_LIMIT = 3;
    const visibleIndicators = showAllIndicators ? allIndicators : allIndicators.slice(0, TOP_LIMIT);
    const hasMoreIndicators = allIndicators.length > TOP_LIMIT;

    // Safe Wording for SAFE or UNKNOWN
    let displaySummary = result.summary;
    if (result.classification === 'SAFE' || normalizedLevel === 'low') {
      if (!displaySummary || displaySummary.includes('An toàn tuyệt đối')) {
        displaySummary = 'Chưa phát hiện dấu hiệu đáng ngờ đáng kể trong dữ liệu đã cung cấp.';
      }
    } else if (result.classification === 'UNKNOWN' || normalizedLevel === 'unknown') {
      displaySummary = 'Dữ liệu cung cấp chưa đủ thông tin rõ ràng để đánh giá kết luận nguy cơ lừa đảo.';
    }

    return (
      <Card padding="none" className="overflow-hidden shadow-sm transition-all duration-300" id="analysis-result-card">
        {/* Header Control Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Kết quả Phân tích Gemini AI:</strong> Hỗ trợ đánh giá rủi ro trực quan.
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Button
                onClick={handleCopyReport}
                id="result-copy-report-btn"
                variant="outline"
                size="sm"
                leftIcon={copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              >
                {copiedReport ? 'Đã chép báo cáo' : 'Sao chép báo cáo'}
              </Button>

              <Button
                onClick={handleSaveToHistory}
                disabled={isSaved}
                id="result-save-history-btn"
                variant={isSaved ? 'outline' : 'primary'}
                size="sm"
                leftIcon={isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" /> : <BookmarkPlus className="w-3.5 h-3.5 text-white" />}
                className={isSaved ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-default' : ''}
              >
                {isSaved ? 'Đã lưu vào lịch sử' : 'Lưu vào lịch sử'}
              </Button>

              <Button
                onClick={onReset}
                id="result-reset-btn"
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
              >
                Kiểm tra lại
              </Button>
            </div>
          </div>

          {/* Feedback banner for history save */}
          {saveFeedback && (
            <div
              className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-2 border ${
                saveFeedback.isError
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {saveFeedback.isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              <span>{saveFeedback.text}</span>
            </div>
          )}
        </div>

        {/* Primary Status Header (RESULT FIRST: Risk Level + Score Gauge) */}
        <div className={`p-6 sm:p-8 border-b ${config.borderColor} ${config.bgColor}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                {/* Risk Level Badge */}
                <Badge
                  level={result.riskLevel}
                  size="lg"
                  id="result-risk-badge"
                >
                  Mức độ rủi ro: {config.label}
                </Badge>

                <Badge variant="neutral" size="md" showIcon={false}>
                  Phân loại: {classLabel}
                </Badge>

                {typeof result.evidenceConfidence === 'number' && (
                  <span className="text-xs text-slate-600 font-semibold bg-white/80 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                    Độ tin cậy bằng chứng: {result.evidenceConfidence}%
                  </span>
                )}
              </div>

              {/* Short Summary */}
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {displaySummary}
              </h3>
            </div>

            {/* Risk Gauge Bar */}
            <div className="bg-white/95 p-4 rounded-xl border border-slate-200 shadow-2xs min-w-[210px] space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Điểm rủi ro:</span>
                <span className={`font-extrabold text-base ${config.textColor}`}>
                  {result.riskScore}/100
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    normalizedLevel === 'low'
                      ? 'bg-emerald-500'
                      : normalizedLevel === 'medium'
                      ? 'bg-amber-500'
                      : normalizedLevel === 'high'
                      ? 'bg-orange-500'
                      : normalizedLevel === 'critical'
                      ? 'bg-rose-600'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.max(result.riskScore, 5)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 text-center font-medium">
                Cảnh báo: <strong className={config.textColor}>{config.label}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="p-6 sm:p-8 border-b border-slate-200 space-y-3" id="result-section-action">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-emerald-600" />
              <span>🛡️ Việc cần làm ngay</span>
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {result.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-emerald-50/80 text-emerald-950 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Indicators & Evidence Excerpts */}
        <div className="p-6 sm:p-8 space-y-6 border-b border-slate-200" id="result-section-evidence">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>🔍 Dấu hiệu & Bằng chứng phát hiện ({allIndicators.length})</span>
              </h4>
            </div>

            {visibleIndicators.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {visibleIndicators.map((ind, idx) => {
                    const typeLabel = INDICATOR_TYPE_LABELS[ind.type] || ind.type || 'Dấu hiệu nghi vấn';
                    const sev = (ind.severity || result.riskLevel || 'MEDIUM').toString().toUpperCase();

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-sm text-slate-800"
                      >
                        <div className="flex items-start gap-2.5">
                          <XCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap justify-between">
                              <span className="font-bold text-slate-900">{typeLabel}</span>
                              <Badge level={sev} size="sm">
                                Mức cảnh báo: {sev === 'CRITICAL' ? 'Rất cao' : sev === 'HIGH' ? 'Cao' : sev === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                              </Badge>
                            </div>
                            {ind.description && ind.description.toLowerCase() !== typeLabel.toLowerCase() && (
                              <p className="text-xs font-semibold text-slate-800">{ind.description}</p>
                            )}
                            {ind.explanation && (
                              <p className="text-xs text-slate-600 leading-relaxed">{ind.explanation}</p>
                            )}
                          </div>
                        </div>

                        {ind.evidence ? (
                          <div className="mt-2 ml-7 p-2.5 bg-white rounded-lg border-l-4 border-indigo-500 border-slate-200 text-xs font-mono text-slate-800 shadow-2xs">
                            <span className="font-sans font-bold text-indigo-700 mr-1.5">Đoạn trích bằng chứng:</span>
                            “{ind.evidence}”
                          </div>
                        ) : (
                          <div className="mt-1.5 ml-7 text-[11px] text-slate-400 italic">
                            Không phát hiện đoạn trích trực tiếp trong nội dung.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progressive Disclosure Accordion Button */}
                {hasMoreIndicators && (
                  <Button
                    onClick={() => setShowAllIndicators(!showAllIndicators)}
                    variant="outline"
                    size="sm"
                    fullWidth
                    rightIcon={showAllIndicators ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  >
                    {showAllIndicators
                      ? 'Thu gọn danh sách dấu hiệu'
                      : `Xem thêm ${allIndicators.length - TOP_LIMIT} dấu hiệu nghi vấn khác...`}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Chưa phát hiện dấu hiệu giả mạo rõ rệt trong dữ liệu cung cấp.</p>
            )}
          </div>

          {/* SECTION 3: Detailed Explanation (Giải thích chi tiết) */}
          <div className="space-y-3" id="result-section-why">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-600" />
              <span>🧠 Giải thích chi tiết từ AI</span>
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed">
              <p className="font-medium">{result.explanation}</p>
            </div>
          </div>

          {/* Technical Details Accordion (Progressive Disclosure) */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors focus-ring cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>⚙️ Xem chi tiết kỹ thuật bản ghi</span>
              </span>
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalDetails && (
              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-2 font-mono text-xs overflow-x-auto">
                <p><span className="text-indigo-400">ID bản ghi:</span> {result.id}</p>
                <p><span className="text-indigo-400">Thời gian:</span> {result.timestamp}</p>
                <p><span className="text-indigo-400">Loại nguồn:</span> {result.sourceType}</p>
                <p><span className="text-indigo-400">Classification Enum:</span> {result.classification}</p>
                <p><span className="text-indigo-400">Risk Level Enum:</span> {result.riskLevel}</p>
                {result.limitations && (
                  <div>
                    <span className="text-amber-400 block mb-1">Giới hạn đánh giá:</span>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                      {result.limitations.map((l, lIdx) => (
                        <li key={lIdx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Limitations & Trust Boundaries Disclaimer */}
          <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Giới hạn của AI & Tuyên bố miễn trừ:</strong>
              <p className="mt-1 leading-relaxed text-amber-800">
                ScamShield AI là công cụ <em>hỗ trợ ra quyết định</em> cho người dùng. Kết quả phân tích không thay thế phán quyết pháp lý hay xác nhận tuyệt đối từ tổ chức liên quan. Khi gặp tình huống nhạy cảm hoặc giao dịch chuyển tiền, bạn luôn nên trực tiếp kiểm tra lại qua kênh chính thức.
              </p>
            </div>
          </div>

          {/* Level Switcher Demo Bar */}
          {onSimulateDemo && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Thử xem giao diện kết quả theo các mức độ rủi ro khác nhau:
                </span>
                <div className="flex items-center gap-2 flex-wrap" id="demo-risk-level-buttons">
                  {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((lvl) => {
                    const cfg = RISK_LEVEL_CONFIG[lvl];
                    return (
                      <button
                        key={lvl}
                        onClick={() => onSimulateDemo(lvl)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer focus-ring ${cfg.badgeBg}`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
};
