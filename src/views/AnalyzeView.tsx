import React, { useState } from 'react';
import { AnalyzeType, AnalysisResult, RiskLevel } from '../types';
import { TEXT_EXAMPLES, URL_EXAMPLES, RISK_LEVEL_CONFIG } from '../data/presets';
import { ResultFrame } from '../components/ResultFrame';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { analysisService } from '../services/analysisService';
import { createSampleBankPhishingImage, createSampleBlurryImage } from '../utils/sampleImages';
import { parseUrl } from '../utils/urlParser';
import { useAnalysisState } from '../features/analysis/useAnalysisState';
import {
  MessageSquare,
  Image as ImageIcon,
  Globe,
  Trash2,
  SearchCode,
  Upload,
  X,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  ListChecks,
  Info,
} from 'lucide-react';

export const AnalyzeView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyzeType>('text');

  // Input states
  const [textContent, setTextContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [urlContent, setUrlContent] = useState('');
  const [, setCopiedUrl] = useState(false);

  // Field-level error state
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Analysis State Machine
  const analysisState = useAnalysisState();
  const {
    status,
    result,
    errorMessage,
    progressMessage,
    progressStepIndex,
    isAnalyzing,
    startValidation,
    startAnalyzing,
    setSuccess,
    setError,
    setTimeoutError,
    reset: resetAnalysisState,
  } = analysisState;

  // Maximum text length
  const MAX_TEXT_LENGTH = 2000;

  // Clear input errors when user types or changes tabs
  const handleInputChange = (type: 'text' | 'url', val: string) => {
    setFieldError(null);
    if (errorMessage) resetAnalysisState();
    if (type === 'text') setTextContent(val);
    if (type === 'url') setUrlContent(val);
  };

  const handleTabChange = (newTab: AnalyzeType) => {
    setActiveSubTab(newTab);
    setFieldError(null);
    resetAnalysisState();
  };

  // Process & Validate Image File
  const processImageFile = (file: File) => {
    setFieldError(null);
    resetAnalysisState();

    // 1. Check file format (MIME type and Extension)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileName = file.name.toLowerCase();

    const hasValidExt = validExts.some((ext) => fileName.endsWith(ext));
    const hasValidType = validTypes.includes(file.type.toLowerCase());

    if (!hasValidExt || !hasValidType) {
      setFieldError('Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh PNG, JPG/JPEG hoặc WEBP.');
      return;
    }

    // 2. Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFieldError('Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    // 3. Read image preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setFieldError('Không thể đọc nội dung tệp ảnh đã chọn.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Image Selection via File Picker
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    } else {
      setFieldError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG/JPEG, WEBP).');
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFieldError(null);
    resetAnalysisState();
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSelectSampleImage = (type: 'phishing' | 'blurry') => {
    setFieldError(null);
    resetAnalysisState();
    try {
      const sample = type === 'phishing' ? createSampleBankPhishingImage() : createSampleBlurryImage();
      setImageFile(sample.file);
      setImagePreview(sample.dataUrl);
    } catch {
      setFieldError('Không thể khởi tạo ảnh mẫu thử nghiệm.');
    }
  };

  // Analysis trigger with State Machine transitions
  const handleStartAnalysis = async () => {
    if (isAnalyzing) return; // Prevent double submit
    setFieldError(null);

    // TAB 1: Text Analysis
    if (activeSubTab === 'text') {
      const input = textContent.trim();
      startValidation(input);

      const validation = analysisService.validateInput({
        sourceType: 'MESSAGE',
        inputContent: input,
      });

      if (!validation.isValid) {
        setFieldError(validation.error || 'Nội dung tin nhắn không hợp lệ.');
        setError(validation.error || 'Nội dung tin nhắn không hợp lệ.');
        return;
      }

      startAnalyzing();

      try {
        const realResult = await analysisService.analyzeMessage(input);
        setSuccess(realResult);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối tới dịch vụ AI. Vui lòng kiểm tra kết nối mạng và thử lại.';

        if (msg.includes('thời gian') || msg.includes('30s') || msg.includes('timed out')) {
          setTimeoutError();
        } else {
          setError(msg);
        }
      }
      return;
    }

    // TAB 2: Screenshot Multimodal Analysis
    if (activeSubTab === 'image') {
      if (!imageFile && !imagePreview) {
        setFieldError('Vui lòng chọn hoặc tải lên ảnh chụp màn hình trước khi phân tích!');
        setError('Vui lòng chọn hoặc tải lên ảnh chụp màn hình trước khi phân tích!');
        return;
      }

      const imgTarget = imageFile || imagePreview!;
      startValidation('Ảnh chụp màn hình');
      startAnalyzing();

      try {
        const realResult = await analysisService.analyzeScreenshot(imgTarget);
        setSuccess(realResult);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối tới dịch vụ AI. Vui lòng kiểm tra kết nối mạng và thử lại.';

        if (msg.includes('thời gian') || msg.includes('30s') || msg.includes('timed out')) {
          setTimeoutError();
        } else {
          setError(msg);
        }
      }
      return;
    }

    // TAB 3: URL Analysis
    if (activeSubTab === 'url') {
      const currentInput = urlContent.trim();
      startValidation(currentInput);

      const validation = analysisService.validateInput({
        sourceType: 'URL',
        inputContent: currentInput,
      });

      if (!validation.isValid) {
        setFieldError(validation.error || 'Địa chỉ URL không hợp lệ.');
        setError(validation.error || 'Địa chỉ URL không hợp lệ.');
        return;
      }

      startAnalyzing();

      try {
        const realResult = await analysisService.analyzeUrl(currentInput);
        setSuccess(realResult);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối tới dịch vụ AI. Vui lòng kiểm tra kết nối mạng và thử lại.';

        if (msg.includes('thời gian') || msg.includes('30s') || msg.includes('timed out')) {
          setTimeoutError();
        } else {
          setError(msg);
        }
      }
      return;
    }
  };

  // Demo Simulation Handler
  const handleSimulateDemoLevel = (level: RiskLevel) => {
    const config = RISK_LEVEL_CONFIG[level];
    setSuccess({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('vi-VN'),
      sourceType: activeSubTab === 'text' ? 'MESSAGE' : activeSubTab === 'image' ? 'SCREENSHOT' : 'URL',
      inputContent: 'Mẫu kiểm thử giao diện',
      riskScore: level === 'critical' ? 92 : level === 'high' ? 75 : level === 'medium' ? 48 : 10,
      riskLevel: level,
      classification: level === 'critical' ? 'BANKING_SCAM' : level === 'high' ? 'PHISHING' : level === 'medium' ? 'JOB_SCAM' : 'SAFE',
      summary: `Mẫu kết quả minh họa cho mức độ: ${config.label}`,
      indicators: [
        {
          type: 'IMPERSONATION',
          description: `Dấu hiệu mẫu cho mức độ ${config.label}`,
          severity: level === 'critical' ? 'CRITICAL' : level === 'high' ? 'HIGH' : level === 'medium' ? 'MEDIUM' : 'LOW',
          evidence: 'Mẫu trích dẫn bằng chứng nguyên văn',
          explanation: 'Giải thích minh họa bằng chứng.',
        },
      ],
      explanation: `Đây là giải thích minh họa cho cấp độ rủi ro ${config.label}. Khi kết nối Gemini API, nội dung này sẽ được mô hình AI tự động tổng hợp từ dữ liệu đầu vào.`,
      recommendations: [
        'Luôn kiểm tra kỹ thông tin người gửi trước khi thực hiện giao dịch.',
        'Không cung cấp mật khẩu hoặc mã OTP cho bất kỳ ai.',
        'Liên hệ tổng đài hỗ trợ chính thức nếu phát hiện nghi vấn.',
      ],
    });
  };

  return (
    <div className="space-y-6 pb-12" id="analyze-page-container">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
          <SearchCode className="w-4 h-4" />
          <span>Trung tâm Phân tích & Đánh giá Rủi ro</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Kiểm tra nội dung đáng ngờ
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Chọn định dạng đầu vào bên dưới. ScamShield AI giúp nhận diện các dấu hiệu lừa đảo và hướng dẫn xử lý an toàn.
        </p>
      </div>

      {/* Main Balanced 2-Column Desktop Grid Layout / Mobile Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Input Panel & Tabs (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-5">
          <Card padding="none" className="overflow-hidden">
            {/* Sub-tabs Selection (3 tabs: Message, Screenshot, URL) */}
            <div className="flex border-b border-slate-200 bg-slate-50/90 p-2 gap-1.5 overflow-x-auto" id="analyze-subtabs">
              <button
                onClick={() => handleTabChange('text')}
                id="subtab-text"
                disabled={isAnalyzing}
                className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring disabled:opacity-50 min-h-[44px] ${
                  activeSubTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Tin nhắn</span>
              </button>

              <button
                onClick={() => handleTabChange('image')}
                id="subtab-image"
                disabled={isAnalyzing}
                className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring disabled:opacity-50 min-h-[44px] ${
                  activeSubTab === 'image'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Ảnh chụp</span>
              </button>

              <button
                onClick={() => handleTabChange('url')}
                id="subtab-url"
                disabled={isAnalyzing}
                className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring disabled:opacity-50 min-h-[44px] ${
                  activeSubTab === 'url'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Đường link</span>
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-5 space-y-5">
              <PrivacyNotice variant="compact" />

              {/* TAB 1: MESSAGE ANALYZER */}
              {activeSubTab === 'text' && (
                <div className="space-y-4" id="panel-text-analysis">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="analyze-textarea" className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span>Dán tin nhắn bạn nghi ngờ vào đây:</span>
                      </label>
                      <span className="text-xs text-slate-400">
                        {textContent.length}/{MAX_TEXT_LENGTH} ký tự
                      </span>
                    </div>

                    <div className="relative">
                      <textarea
                        id="analyze-textarea"
                        rows={5}
                        maxLength={MAX_TEXT_LENGTH}
                        disabled={isAnalyzing}
                        value={textContent}
                        onChange={(e) => handleInputChange('text', e.target.value)}
                        placeholder="Ví dụ: [VCB] Tai khoan cua quy khach bi khoa do nghi ngo truy cap trai phep, nhap http://vcb-sec.top de bao ve..."
                        className={`w-full bg-slate-50 border rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus-ring leading-relaxed ${
                          fieldError
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      />

                      {textContent && !isAnalyzing && (
                        <button
                          onClick={() => handleInputChange('text', '')}
                          id="text-clear-btn"
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors text-xs flex items-center gap-1 cursor-pointer focus-ring min-h-[36px]"
                          title="Xóa văn bản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                    {fieldError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{fieldError}</span>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={!textContent.trim() || isAnalyzing}
                      isLoading={isAnalyzing}
                      id="text-analyze-submit-btn"
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<SearchCode className="w-4 h-4" />}
                    >
                      {isAnalyzing ? 'Đang phân tích...' : 'Phân tích tin nhắn'}
                    </Button>
                  </div>

                  {/* Preset Text Examples */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Mẫu tin nhắn nghi vấn phổ biến:
                    </p>
                    <div className="grid grid-cols-1 gap-2" id="text-preset-list">
                      {TEXT_EXAMPLES.map((ex, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isAnalyzing) return;
                            setTextContent(ex.content);
                            setFieldError(null);
                            resetAnalysisState();
                          }}
                          className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all hover:bg-indigo-50/50 space-y-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                              {ex.title}
                            </span>
                            <Badge variant="neutral" size="sm" showIcon={false}>
                              {ex.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 italic">
                            "{ex.content}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SCREENSHOT ANALYZER */}
              {activeSubTab === 'image' && (
                <div className="space-y-4" id="panel-image-analysis">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🖼️</span>
                      <span>Phân tích ảnh chụp màn hình</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Tải lên ảnh tin nhắn, biên lai chuyển khoản hoặc thông báo nghi vấn (PNG, JPG, WebP tối đa 10MB).
                    </p>
                  </div>

                  {!imagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 transition-colors cursor-pointer group ${
                        fieldError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleImageChange}
                        disabled={isAnalyzing}
                        className="hidden"
                        id="image-upload-input"
                      />
                      <label htmlFor="image-upload-input" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900">Kéo ảnh vào đây hoặc chọn tệp</p>
                          <p className="text-xs text-slate-500">PNG, JPG/JPEG hoặc WebP (Tối đa 10MB)</p>
                        </div>
                        <Button variant="outline" size="sm" type="button">
                          Tải ảnh lên
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3" id="image-preview-container">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {imageFile?.name || 'Ảnh chụp màn hình'}
                        </span>
                        <Button
                          onClick={clearImage}
                          disabled={isAnalyzing}
                          id="image-clear-btn"
                          variant="ghost"
                          size="sm"
                          leftIcon={<X className="w-3.5 h-3.5 text-rose-600" />}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          Xóa ảnh
                        </Button>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[260px] flex items-center justify-center p-2">
                        <img
                          src={imagePreview}
                          alt="Ảnh chụp màn hình phân tích"
                          className="max-h-[240px] w-auto object-contain rounded-lg"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleStartAnalysis}
                          disabled={isAnalyzing}
                          isLoading={isAnalyzing}
                          id="image-analyze-submit-btn"
                          variant="primary"
                          size="lg"
                          fullWidth
                          leftIcon={<SearchCode className="w-4 h-4" />}
                        >
                          {isAnalyzing ? 'Đang phân tích...' : 'Phân tích ảnh'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {fieldError && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldError}</span>
                    </p>
                  )}

                  {/* Preset Test Screenshot Options */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Hoặc thử nghiệm nhanh với mẫu ảnh dưới đây:
                    </p>

                    <div className="grid grid-cols-1 gap-2" id="image-preset-list">
                      <div
                        onClick={() => !isAnalyzing && handleSelectSampleImage('phishing')}
                        className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all hover:bg-indigo-50/50 space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                            Mẫu 1: SMS Ngân hàng mạo danh
                          </span>
                          <Badge level="critical" size="sm" showIcon={false}>
                            Giả mạo ngân hàng
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                          "Ảnh chụp SMS thông báo khóa tài khoản 24h kèm URL độc hại"
                        </p>
                      </div>

                      <div
                        onClick={() => !isAnalyzing && handleSelectSampleImage('blurry')}
                        className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all hover:bg-indigo-50/50 space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                            Mẫu 2: Ảnh mờ / chất lượng kém
                          </span>
                          <Badge level="medium" size="sm" showIcon={false}>
                            Không đọc được chữ
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                          "Ảnh mờ nét không nhìn rõ chữ hoặc thông số"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: URL ANALYZER */}
              {activeSubTab === 'url' && (
                <div className="space-y-4" id="panel-url-analysis">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🔗</span>
                      <span>Kiểm tra cấu trúc đường link</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      ScamShield AI sẽ kiểm tra cú pháp và tên miền độc hại mà <strong>không tự động mở hay truy cập URL</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        id="url-input"
                        disabled={isAnalyzing}
                        value={urlContent}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="Dán URL đáng ngờ (Ví dụ: http://vietcombank-security.top/login...)"
                        className={`w-full bg-slate-50 border rounded-xl p-3.5 pr-20 text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus-ring transition-all break-all ${
                          fieldError
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      {urlContent && !isAnalyzing && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1">
                          <button
                            onClick={() => {
                              handleInputChange('url', '');
                              resetAnalysisState();
                            }}
                            id="url-clear-btn"
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors text-xs flex items-center gap-1 cursor-pointer focus-ring min-h-[36px]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {fieldError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{fieldError}</span>
                      </p>
                    )}
                  </div>

                  {/* Local URL Structural Parser Card */}
                  {urlContent.trim() && (() => {
                    const parsed = parseUrl(urlContent.trim());
                    if (!parsed.isValid) return null;
                    return (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2" id="local-url-parser-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-indigo-600" />
                            Đặc điểm cấu trúc kỹ thuật:
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {parsed.protocol.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-slate-500 block text-xs">Tên miền máy chủ:</span>
                            <span className="font-mono font-medium text-slate-800 break-all">{parsed.hostname}</span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="text-slate-500 block text-xs">Tên miền gốc:</span>
                            <span className="font-mono font-bold text-indigo-700 break-all">{parsed.domain || 'Không xác định'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={!urlContent.trim() || isAnalyzing}
                      isLoading={isAnalyzing}
                      id="url-analyze-submit-btn"
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<SearchCode className="w-4 h-4" />}
                    >
                      {isAnalyzing ? 'Đang phân tích...' : 'Kiểm tra đường link'}
                    </Button>
                  </div>

                  {/* URL Examples (Safe vs Suspicious) */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Thử nghiệm với các đường link mẫu:
                    </p>

                    <div className="grid grid-cols-1 gap-2" id="url-preset-list">
                      {URL_EXAMPLES.map((ex, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isAnalyzing) return;
                            setUrlContent(ex.url);
                            setFieldError(null);
                            resetAnalysisState();
                          }}
                          className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all hover:bg-indigo-50/50 space-y-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                              {ex.title}
                            </span>
                            <Badge
                              level={ex.type === 'safe' ? 'low' : 'high'}
                              size="sm"
                              showIcon={false}
                            >
                              {ex.type === 'safe' ? 'Chính thức / An toàn' : 'Liên kết đáng ngờ'}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-slate-500 truncate">
                            {ex.url}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Error Banner Component */}
          {errorMessage && (
            <ErrorState
              message={errorMessage}
              onRetry={status === 'error' || status === 'timeout' ? handleStartAnalysis : undefined}
              onDismiss={resetAnalysisState}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Result Panel or Informative Result Placeholder (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-6">
          {isAnalyzing ? (
            <LoadingState
              progressStepIndex={progressStepIndex}
              progressMessage={progressMessage}
            />
          ) : result ? (
            <ResultFrame
              result={result}
              isAnalyzing={isAnalyzing}
              progressStepIndex={progressStepIndex}
              progressMessage={progressMessage}
              rawInputContent={
                activeSubTab === 'image'
                  ? imageFile?.name || 'Ảnh chụp màn hình'
                  : activeSubTab === 'url'
                  ? urlContent
                  : textContent
              }
              onReset={resetAnalysisState}
              onSimulateDemo={handleSimulateDemoLevel}
            />
          ) : (
            /* Informative Result Placeholder */
            <Card padding="lg" className="space-y-6">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Bảng kết quả đánh giá AI</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Sẵn sàng phân tích nội dung</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhập tin nhắn, ảnh chụp hoặc URL ở bảng bên trái rồi bấm <strong>"Phân tích"</strong> để nhận báo cáo kết quả chi tiết.
                </p>
              </div>

              {/* Informative Preview of What the User Will Receive */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Báo cáo phân tích sẽ bao gồm:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-slate-900">Thang điểm rủi ro</strong>
                      <span className="text-slate-500">Đánh giá 0–100 kèm 4 cấp độ cảnh báo.</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                    <ListChecks className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-slate-900">Việc cần làm ngay</strong>
                      <span className="text-slate-500">Khuyên dùng ứng phó phòng hộ an toàn.</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                    <SearchCode className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-slate-900">Trích xuất bằng chứng</strong>
                      <span className="text-slate-500">Trích câu từ nghi vấn nguyên văn trong nội dung.</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-slate-900">Giải thích từ AI</strong>
                      <span className="text-slate-500">Giải thích chi tiết lý do và ngữ cảnh nguy cơ.</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
