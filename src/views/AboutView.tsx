import React from 'react';
import { NavTab } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  PhoneCall,
  SearchCode,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface AboutViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setActiveTab }) => {
  return (
    <div className="space-y-12 pb-12" id="about-page-container">
      {/* Header */}
      <div className="space-y-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Về dự án ScamShield AI</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Sứ mệnh phòng chống lừa đảo trực tuyến
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          ScamShield AI được xây dựng với mục tiêu giúp người dùng phổ thông tại Việt Nam dễ dàng nhận biết, phân tích và phòng tránh các nguy cơ lừa đảo trong thời đại số.
        </p>
      </div>

      {/* Critical Disclaimer Notice */}
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-amber-900 shadow-2xs">
        <div className="flex items-center gap-3 text-amber-900 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Tuyên bố miễn trừ trách nhiệm quan trọng</span>
        </div>
        <p className="text-sm leading-relaxed text-amber-900/90">
          <strong>ScamShield AI chỉ là công cụ hỗ trợ đánh giá rủi ro</strong> dựa trên việc phân tích các mẫu dấu hiệu nguy hiểm phổ biến. Ứng dụng <strong>giúp giảm thiểu việc lộ dữ liệu nhạy cảm</strong> và kết quả phân tích AI <strong>có thể có sai số</strong>, không thể thay thế cho sự cẩn trọng cá nhân của bạn.
        </p>
        <p className="text-xs text-amber-800">
          Trong mọi trường hợp liên quan đến giao dịch chuyển tiền hoặc cung cấp mã OTP/mật khẩu, người dùng bắt buộc phải xác minh trực tiếp qua các kênh chính thống của Ngân hàng hoặc Cơ quan chức năng.
        </p>
      </div>

      {/* Core Principles */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span>3 Nguyên tắc hoạt động cốt lõi</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md" className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">1. Giải thích minh bạch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Không chỉ gắn nhãn “An toàn” hay “Lừa đảo”, ScamShield AI giải thích rõ ràng tại sao nội dung đó chứa nguy cơ (ví dụ: hối thúc thời gian, tên miền mạo danh, yêu cầu nạp tiền).
            </p>
          </Card>

          <Card padding="md" className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">2. Bảo vệ quyền riêng tư</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống không thu thập số điện thoại, mật khẩu hay tài khoản ngân hàng của bạn. Mọi phân tích được thực hiện bảo mật.
            </p>
          </Card>

          <Card padding="md" className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">3. Không tự kích hoạt link</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi bạn nhập đường dẫn nghi vấn, ScamShield AI chỉ phân tích cấu trúc cú pháp và tên miền mà không tự ý truy cập liên kết đó.
            </p>
          </Card>
        </div>
      </div>

      {/* Common Scam Tactics Guide */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>Nhận diện 4 kịch bản lừa đảo phổ biến nhất</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card padding="md" className="space-y-2">
            <Badge level="critical" size="sm">
              Kịch bản 1
            </Badge>
            <h3 className="font-bold text-slate-900 text-sm">Mạo danh Ngân hàng / Khóa tài khoản</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gửi tin nhắn thông báo tài khoản bị khóa do nghi ngờ giao dịch lạ, yêu cầu bấm vào đường dẫn có dạng <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-700">vietcombank-login-sec.top</code> để xác minh. Khi nhập thông tin, kẻ gian sẽ chiếm quyền tài khoản.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <Badge level="medium" size="sm">
              Kịch bản 2
            </Badge>
            <h3 className="font-bold text-slate-900 text-sm">Tuyển cộng tác viên chốt đơn online</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dụ dỗ người dùng làm nhiệm vụ xem sản phẩm hoặc chốt đơn trên sàn thương mại điện tử với hoa hồng 10-20%. Những đơn đầu cho rút tiền thật, các đơn sau yêu cầu nạp số tiền lớn rồi chiếm đoạt.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <Badge level="high" size="sm">
              Kịch bản 3
            </Badge>
            <h3 className="font-bold text-slate-900 text-sm">Giả danh Công an / Cơ quan nhà nước</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gọi điện hù dọa liên quan đến vụ án mạng hoặc nợ cước viễn thông, yêu cầu tải ứng dụng Dịch vụ công giả mạo đuôi <code className="bg-slate-100 px-1 py-0.5 rounded text-orange-700">.apk</code> để cập nhật VNeID, từ đó cài mã độc theo dõi bàn phím và rút tiền.
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <Badge variant="neutral" size="sm" showIcon={false}>
              Kịch bản 4
            </Badge>
            <h3 className="font-bold text-slate-900 text-sm">Thông báo trúng thưởng xe / Quà Tết</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gửi tin nhắn báo trúng thưởng xe máy SH hoặc khoản tiền lớn từ nhà mạng/ví điện tử. Yêu cầu chuyển trước khoản phí làm thủ tục hoặc tiền thuế trước khi nhận quà.
            </p>
          </Card>
        </div>
      </div>

      {/* Emergency Hotlines Box */}
      <Card padding="md" className="bg-white border border-indigo-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-rose-600" />
          <span>Kênh báo cáo & Đầu số phản ánh tại Việt Nam</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">Tổng đài 156 / 5656 (Miễn phí)</p>
            <p className="text-slate-600">
              Tiếp nhận phản ánh cuộc gọi rác, tin nhắn rác, cuộc gọi lừa đảo từ Bộ Thông tin và Truyền thông.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">Trang Cảnh báo An toàn thông tin</p>
            <a
              href="https://canhbao.khonggiangan.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 focus-ring rounded"
            >
              canhbao.khonggiangan.vn <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-slate-600">Cổng tiếp nhận báo cáo trang web lừa đảo quốc gia.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            onClick={() => setActiveTab('analyze')}
            variant="primary"
            size="md"
            leftIcon={<SearchCode className="w-4 h-4" />}
          >
            Đến trang kiểm tra tin nhắn nghi vấn
          </Button>
        </div>
      </Card>
    </div>
  );
};
