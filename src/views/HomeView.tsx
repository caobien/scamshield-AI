import React from 'react';
import { NavTab } from '../types';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ShieldAlert,
  SearchCode,
  MessageSquare,
  Image as ImageIcon,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Zap,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab }) => {
  return (
    <div className="space-y-12 pb-8" id="home-view-container">
      {/* Calm Digital Safety Hero Section */}
      <Card padding="lg" className="relative overflow-hidden text-center space-y-8">
        <div className="relative max-w-3xl mx-auto space-y-6">
          {/* Main Title Badge */}
          <Badge level="low" size="md">
            Công cụ phòng chống lừa đảo trực tuyến cho cộng đồng Việt Nam
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            ScamShield AI
          </h1>

          <p className="text-lg sm:text-xl font-bold text-indigo-600 tracking-wide">
            “Hiểu rõ tin nhắn đáng ngờ trước khi bạn hành động.”
          </p>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Giúp người dùng Internet phổ thông dừng lại, phân tích tin nhắn, hình ảnh và đường link đáng ngờ; giải thích chi tiết các dấu hiệu nguy hiểm và đưa ra hướng dẫn xử lý an toàn.
          </p>

          {/* Single Primary CTA */}
          <div className="pt-2 flex justify-center">
            <Button
              onClick={() => setActiveTab('analyze')}
              id="hero-primary-cta"
              variant="primary"
              size="lg"
              leftIcon={<SearchCode className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              Kiểm tra ngay
            </Button>
          </div>

          {/* Privacy & Safety Note */}
          <div className="pt-4 max-w-xl mx-auto">
            <PrivacyNotice variant="compact" />
          </div>
        </div>

        {/* Unified 3-Input Method Choice Selector */}
        <div className="pt-6 border-t border-slate-100 max-w-4xl mx-auto space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Bạn có thể kiểm tra 3 dạng nội dung nghi vấn trong cùng một luồng duy nhất:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div
              onClick={() => setActiveTab('analyze')}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors space-y-2 cursor-pointer focus-ring group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 border border-indigo-200 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  1. Tin nhắn văn bản
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dán SMS, Zalo hay email hù dọa khóa tài khoản hoặc tuyển dụng cọc tiền.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('analyze')}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors space-y-2 cursor-pointer focus-ring group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 border border-purple-200 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  2. Ảnh chụp màn hình
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tải lên ảnh bill chuyển khoản, thông báo trúng thưởng hoặc tin nhắn bằng ảnh.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('analyze')}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors space-y-2 cursor-pointer focus-ring group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 border border-blue-200 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  3. Đường dẫn URL
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kiểm tra cú pháp tên miền mạo danh ngân hàng (ScamShield không bao giờ tự mở URL).
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Answer the 3 Core User Questions */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900">
            Thông tin nhanh về ScamShield AI
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Giải đáp ba câu hỏi cốt lõi giúp bạn yên tâm sử dụng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md" className="space-y-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit border border-indigo-100">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">1. ScamShield AI giúp gì?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Phát hiện chiêu trò lừa đảo, giải thích bằng chứng nguy hiểm bằng tiếng Việt dễ hiểu và cung cấp các hành động ứng phó an toàn ngay lập tức.
            </p>
          </Card>

          <Card padding="md" className="space-y-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit border border-indigo-100">
              <SearchCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">2. Tôi có thể kiểm tra gì?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kiểm tra tin nhắn SMS/Zalo, ảnh chụp thông báo/biên lai và chuỗi đường dẫn URL nghi vấn mạo danh ngân hàng hay cơ quan nhà nước.
            </p>
          </Card>

          <Card padding="md" className="space-y-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit border border-indigo-100">
              <ArrowRight className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">3. Tôi bắt đầu ở đâu?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chỉ cần bấm nút <strong>“Kiểm tra ngay”</strong> ở trên, dán nội dung nghi vấn và nhận kết quả đánh giá phân tích tức thì.
            </p>
          </Card>
        </div>
      </section>

      {/* Why ScamShield AI Features Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Giá trị cốt lõi của sản phẩm
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Phát hiện — Giải thích — Cảnh báo — Nâng cao nhận thức.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="space-y-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Giải thích nguyên nhân</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đưa ra lập luận dựa trên bằng chứng nguyên văn có trong nội dung.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Điểm rủi ro trực quan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đánh giá rủi ro từ 0 đến 100 kèm 4 cấp độ: Thấp, Trung bình, Cao, Rất cao.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Bảo vệ quyền riêng tư</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mã OTP, số thẻ, mật khẩu được ẩn danh tự động trước khi lưu lịch sử.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Khuyến nghị an toàn</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cung cấp danh sách hành động cụ thể để bảo vệ tài sản và tài khoản.
            </p>
          </Card>
        </div>
      </section>

      {/* Call To Action Banner */}
      <Card padding="lg" className="bg-white border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>Nhận được tin nhắn hoặc đường link nghi vấn?</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
            Hãy dán nội dung vào ScamShield AI ngay để được phân tích các dấu hiệu rủi ro.
          </p>
        </div>

        <Button
          onClick={() => setActiveTab('analyze')}
          id="cta-check-now-btn"
          variant="primary"
          size="md"
          leftIcon={<SearchCode className="w-4 h-4" />}
          className="shrink-0"
        >
          Kiểm tra ngay
        </Button>
      </Card>
    </div>
  );
};
