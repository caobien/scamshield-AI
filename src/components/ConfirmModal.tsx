import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <Card
        padding="lg"
        className="max-w-md w-full space-y-6 shadow-2xl border border-slate-200 transform transition-all scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full shrink-0 ${
                isDanger ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

