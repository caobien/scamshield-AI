import { RiskLevel, TextExample, UrlExample } from '../types';

export const TEXT_EXAMPLES: TextExample[] = [
  {
    title: 'Mạo danh ngân hàng Vietcombank',
    category: 'Cảnh báo tài khoản',
    content: '[VCB] Tai khoan cua quy khach hien dang bi khoa cap nhat thong tin tai web: http://vcb-bank-sec.top de khong bi phong toai tien.',
  },
  {
    title: 'Tuyển cộng tác viên Shopee',
    category: 'Lừa đảo việc làm',
    content: 'CHÀO BẠN! Shopee tuyển cộng tác viên xử lý đơn hàng tại nhà, thu nhập 300k - 800k/ngày, làm xong nhận tiền ngay. Liên hệ Zalo: 0988xxxxxx.',
  },
  {
    title: 'Thông báo trúng thưởng Tết',
    category: 'Trúng thưởng giả mạo',
    content: 'Chuc mung ban da trung thuong xe may SH 125i tu chuong trinh Tri An Khach Hang VinaPhone. Vui long truy cap http://trungthuong-vinaphone.xyz nhan thuong.',
  },
  {
    title: 'Tin nhắn OTP xác nhận thật',
    category: 'Tin nhắn an toàn',
    content: 'Ma OTP xac nhan giao dich cua quy khach la 829104. Ma co hieu luc trong 3 phut. Tuyet doi khong chia se ma nay cho bat ky ai.',
  },
];

export const URL_EXAMPLES: UrlExample[] = [
  {
    title: 'Mẫu 1: Website tiêu chuẩn (https://www.example.com)',
    url: 'https://www.example.com',
    type: 'safe',
  },
  {
    title: 'Mẫu 2: Ngân hàng mạo danh (http://vietcombank-security.example...)',
    url: 'http://vietcombank-security.example/login?verify=1',
    type: 'suspicious',
  },
  {
    title: 'Mẫu 3: Kỹ thuật đánh lừa với ký tự @ (https://login.example.com@evil.example)',
    url: 'https://login.example.com@evil.example',
    type: 'suspicious',
  },
  {
    title: 'Mẫu 4: Trang mạo danh kết hợp tên miền mở rộng (.top)',
    url: 'http://vietcombank-login-online-sec.top/ebank',
    type: 'suspicious',
  },
];

export const RISK_LEVEL_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    badgeBg: string;
    scoreRange: string;
  }
> = {
  low: {
    label: 'Thấp',
    description: 'Chưa phát hiện dấu hiệu đáng ngờ đáng kể.',
    bgColor: 'bg-emerald-50/80',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    scoreRange: '0 - 24',
  },
  LOW: {
    label: 'Thấp',
    description: 'Chưa phát hiện dấu hiệu đáng ngờ đáng kể.',
    bgColor: 'bg-emerald-50/80',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    scoreRange: '0 - 24',
  },
  medium: {
    label: 'Trung bình',
    description: 'Có một số dấu hiệu cần được kiểm tra thêm.',
    bgColor: 'bg-amber-50/80',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border border-amber-300',
    scoreRange: '25 - 49',
  },
  MEDIUM: {
    label: 'Trung bình',
    description: 'Có một số dấu hiệu cần được kiểm tra thêm.',
    bgColor: 'bg-amber-50/80',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border border-amber-300',
    scoreRange: '25 - 49',
  },
  high: {
    label: 'Cao',
    description: 'Phát hiện nhiều dấu hiệu thường gặp trong nội dung lừa đảo.',
    bgColor: 'bg-orange-50/80',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-800 border border-orange-300',
    scoreRange: '50 - 74',
  },
  HIGH: {
    label: 'Cao',
    description: 'Phát hiện nhiều dấu hiệu thường gặp trong nội dung lừa đảo.',
    bgColor: 'bg-orange-50/80',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-800 border border-orange-300',
    scoreRange: '50 - 74',
  },
  critical: {
    label: 'Rất cao',
    description: 'Phát hiện nhiều dấu hiệu đáng ngờ. Bạn nên tránh tương tác với nội dung này cho đến khi xác minh được nguồn gửi.',
    bgColor: 'bg-rose-50/80',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border border-rose-300',
    scoreRange: '75 - 100',
  },
  CRITICAL: {
    label: 'Rất cao',
    description: 'Phát hiện nhiều dấu hiệu đáng ngờ. Bạn nên tránh tương tác với nội dung này cho đến khi xác minh được nguồn gửi.',
    bgColor: 'bg-rose-50/80',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border border-rose-300',
    scoreRange: '75 - 100',
  },
};

export function getRiskLevelConfig(level: string) {
  const normalized = (level || '').toString();
  return (
    RISK_LEVEL_CONFIG[normalized] ||
    RISK_LEVEL_CONFIG[normalized.toLowerCase()] ||
    RISK_LEVEL_CONFIG[normalized.toUpperCase()] ||
    RISK_LEVEL_CONFIG.HIGH
  );
}
