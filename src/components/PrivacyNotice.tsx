import React from 'react';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

interface PrivacyNoticeProps {
  variant?: 'subtle' | 'compact' | 'full';
  className?: string;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  variant = 'subtle',
  className = '',
}) => {
  if (variant === 'compact') {
    return (
      <div
        className={`p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2.5 ${className}`}
      >
        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>Bảo mật & Quyền riêng tư:</strong> Không tự động truy cập URL. Dữ liệu cá nhân (OTP, mật khẩu) được ẩn danh tự động.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-start gap-3 ${className}`}
    >
      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
        <ShieldCheck className="w-4.5 h-4.5" />
      </div>
      <div className="space-y-1">
        <span className="font-bold text-slate-900 block text-sm">
          🔒 Quyền riêng tư & Nguyên tắc An toàn
        </span>
        <ul className="text-slate-600 space-y-1 leading-relaxed list-disc list-inside">
          <li>
            <strong>Không tự động truy cập liên kết:</strong> URL chỉ được phân tích cú pháp cấu trúc chuỗi.
          </li>
          <li>
            <strong>Ẩn danh thông tin nhạy cảm:</strong> Mã OTP, số thẻ, mật khẩu được che tự động trước khi xử lý.
          </li>
          <li>
            <strong>Hỗ trợ ra quyết định:</strong> Kết quả AI mang tính tham khảo; luôn chủ động xác minh qua kênh chính thống khi có giao dịch tài chính.
          </li>
        </ul>
      </div>
    </div>
  );
};
