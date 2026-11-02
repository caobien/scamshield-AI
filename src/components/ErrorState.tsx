import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra sự cố',
  message,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      className={`p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm shadow-xs ${className}`}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <span className="font-bold block text-rose-900">{title}:</span>
        <p className="text-rose-700 leading-relaxed text-xs sm:text-sm">{message}</p>

        {onRetry && (
          <div className="pt-1">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử lại phân tích</span>
            </button>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-2 text-rose-500 hover:text-rose-800 rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Đóng thông báo lỗi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
