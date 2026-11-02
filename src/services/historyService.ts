import { AnalysisResult, SourceType, RiskLevel, Classification, IndicatorType } from '../types';
import { redactSensitiveData, sanitizeContentForHistory } from '../utils/redact';

export interface HistoryIndicator {
  type: IndicatorType;
  description: string;
  severity: RiskLevel;
  evidence?: string | null;
  explanation?: string;
}

export interface HistoryItem {
  id: string;
  schemaVersion?: number;
  timestamp: string;
  createdAt: number;
  sourceType: SourceType;
  riskScore: number;
  riskLevel: RiskLevel;
  classification: Classification;
  summary: string;
  redactedContent: string;
  redactedInputPreview?: string;
  indicators: HistoryIndicator[];
  explanation: string;
  recommendations: string[];
  limitations?: string[];
  evidenceConfidence?: number;
}

const STORAGE_KEY = 'scamshield_ai_history_v1';
const MAX_HISTORY_ITEMS = 50;

class HistoryService {
  /**
   * Safe getter for history items from localStorage.
   * Handles corrupted JSON, quota, and invalid item structures smoothly without crashing.
   */
  public getHistory(): HistoryItem[] {
    try {
      if (typeof localStorage === 'undefined') {
        return [];
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filter & validate each item schema
      return parsed.filter((item): item is HistoryItem => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.timestamp === 'string' &&
          typeof item.riskScore === 'number' &&
          typeof item.riskLevel === 'string' &&
          typeof item.summary === 'string'
        );
      });
    } catch (error) {
      console.warn('HistoryService: Lỗi đọc dữ liệu từ localStorage:', error);
      return [];
    }
  }

  /**
   * Saves a validated analysis result into localStorage after masking sensitive data.
   */
  public saveHistoryItem(
    result: AnalysisResult,
    rawInputContent: string
  ): { success: boolean; item?: HistoryItem; error?: string } {
    try {
      if (!result || typeof result.riskScore !== 'number' || !result.summary) {
        return { success: false, error: 'Kết quả phân tích không hợp lệ để lưu.' };
      }

      if (typeof localStorage === 'undefined') {
        return { success: false, error: 'Trình duyệt không hỗ trợ lưu trữ cục bộ.' };
      }

      const currentHistory = this.getHistory();

      // Check duplicate by id if exists
      const existingIdx = currentHistory.findIndex((h) => h.id === result.id);

      const sanitizedContent = sanitizeContentForHistory(
        rawInputContent || result.inputContent || '',
        result.sourceType
      );

      const previewText = sanitizedContent.length > 120
        ? sanitizedContent.slice(0, 120) + '...'
        : sanitizedContent;

      const sanitizedSummary = redactSensitiveData(result.summary);
      const sanitizedExplanation = redactSensitiveData(result.explanation || '');

      const sanitizedIndicators: HistoryIndicator[] = (result.indicators || []).map((ind) => ({
        type: ind.type,
        description: redactSensitiveData(ind.description || ''),
        severity: ind.severity || 'MEDIUM',
        evidence: ind.evidence ? redactSensitiveData(ind.evidence) : null,
        explanation: ind.explanation ? redactSensitiveData(ind.explanation) : undefined,
      }));

      const newItem: HistoryItem = {
        id: result.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schemaVersion: 1,
        timestamp: result.timestamp || new Date().toLocaleString('vi-VN'),
        createdAt: Date.now(),
        sourceType: result.sourceType || 'MESSAGE',
        riskScore: Number(result.riskScore) || 0,
        riskLevel: result.riskLevel || 'low',
        classification: result.classification || 'SAFE',
        summary: sanitizedSummary,
        redactedContent: sanitizedContent,
        redactedInputPreview: previewText,
        indicators: sanitizedIndicators,
        explanation: sanitizedExplanation,
        recommendations: (result.recommendations || []).map((r) => redactSensitiveData(r)),
        limitations: (result.limitations || []).map((l) => redactSensitiveData(l)),
        evidenceConfidence: result.evidenceConfidence,
      };

      let updatedList: HistoryItem[];
      if (existingIdx >= 0) {
        updatedList = [...currentHistory];
        updatedList[existingIdx] = newItem;
      } else {
        updatedList = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      this.notifyChange();
      return { success: true, item: newItem };
    } catch (error: unknown) {
      console.error('HistoryService: Lỗi lưu lịch sử:', error);
      let errorMsg = 'Không thể lưu lịch sử vào trình duyệt.';
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
          errorMsg = 'Bộ nhớ trình duyệt đã đầy (Quota Exceeded). Vui lòng xóa bớt lịch sử cũ.';
        } else {
          errorMsg = error.message;
        }
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Delete a single history item by ID.
   */
  public deleteHistoryItem(id: string): boolean {
    try {
      const currentHistory = this.getHistory();
      const filtered = currentHistory.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      this.notifyChange();
      return true;
    } catch (error) {
      console.warn('HistoryService: Lỗi xóa mục lịch sử:', error);
      return false;
    }
  }

  /**
   * Clears all history items.
   */
  public clearAllHistory(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notifyChange();
      return true;
    } catch (error) {
      console.warn('HistoryService: Lỗi xóa toàn bộ lịch sử:', error);
      return false;
    }
  }

  /**
   * Dispatches a custom event so subscribers (e.g. Dashboard) update in real-time.
   */
  private notifyChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scamshield_history_updated'));
    }
  }

  /**
   * Checks if an item ID exists in saved history.
   */
  public hasSaved(id: string): boolean {
    if (!id) return false;
    const items = this.getHistory();
    return items.some((item) => item.id === id);
  }
}

export const historyService = new HistoryService();
