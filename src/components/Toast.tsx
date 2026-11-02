import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-bounce-short transition-all ${
        type === 'error'
          ? 'bg-rose-900 text-rose-100 border-rose-700'
          : type === 'info'
          ? 'bg-indigo-900 text-indigo-100 border-indigo-700'
          : 'bg-emerald-900 text-emerald-100 border-emerald-700'
      }`}
      role="alert"
    >
      {type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      ) : type === 'info' ? (
        <Info className="w-5 h-5 text-indigo-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:opacity-80 rounded-lg text-slate-300 transition-opacity ml-2 cursor-pointer"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
