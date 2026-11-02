import React from 'react';
import { Sparkles } from 'lucide-react';
import { DYNAMIC_PROGRESS_STEPS } from '../types/stateMachine';

interface LoadingStateProps {
  progressStepIndex?: number;
  progressMessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  progressStepIndex = 0,
  progressMessage,
  className = '',
}) => {
  const currentMsg =
    progressMessage ||
    DYNAMIC_PROGRESS_STEPS[Math.min(progressStepIndex, DYNAMIC_PROGRESS_STEPS.length - 1)].label;

  return (
    <div
      className={`bg-white border border-indigo-200 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm transition-all ${className}`}
      id="loading-state-container"
    >
      {/* Animated Icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-2xs">
        <Sparkles className="w-7 h-7 animate-spin text-indigo-600" />
      </div>

      {/* Progress Title */}
      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">{currentMsg}...</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          ScamShield AI đang đối chiếu ngữ cảnh và trích xuất bằng chứng an toàn.
        </p>
      </div>

      {/* Dynamic Step Progress Indicator */}
      <div className="max-w-md mx-auto pt-2">
        <div className="grid grid-cols-4 gap-2">
          {DYNAMIC_PROGRESS_STEPS.map((_, idx) => {
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

      {/* Skeleton Preview Frame */}
      <div className="pt-4 border-t border-slate-100 max-w-lg mx-auto space-y-3 opacity-60">
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );
};
