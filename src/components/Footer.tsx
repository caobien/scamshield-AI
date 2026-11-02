import React from 'react';
import { NavTab } from '../types';
import { Shield, PhoneCall, ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: NavTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-12" id="app-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Col 1: Brand & Safety Statement */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>ScamShield AI</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Giải pháp đánh giá rủi ro an toàn mạng dành cho người dùng Internet Việt Nam.
            </p>
            <p className="text-xs text-slate-500 italic">
              *Kết quả AI hỗ trợ đánh giá rủi ro tham khảo, không thay thế xác minh chính thức.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Lối tắt chính</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button
                onClick={() => setActiveTab('home')}
                className="hover:text-indigo-300 transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Trang chủ
              </button>
              <button
                onClick={() => setActiveTab('analyze')}
                className="hover:text-indigo-300 transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Phân tích
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="hover:text-indigo-300 transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Lịch sử
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hover:text-indigo-300 transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className="hover:text-indigo-300 transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Giới thiệu
              </button>
            </div>
          </div>

          {/* Col 3: Hotlines */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Kênh hỗ trợ chính thức</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Phản ánh tin nhắn/cuộc gọi rác: <strong className="text-white">156</strong> hoặc <strong className="text-white">5656</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href="https://canhbao.khonggiangan.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  canhbao.khonggiangan.vn <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-xs text-center sm:flex sm:justify-between text-slate-500">
          <p>© 2026 ScamShield AI — Công cụ nâng cao nhận thức an toàn mạng cho cộng đồng Việt Nam.</p>
          <p className="mt-1 sm:mt-0 font-medium">Bảo mật • Minh bạch • Dễ sử dụng</p>
        </div>
      </div>
    </footer>
  );
};
