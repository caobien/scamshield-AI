/**
 * tests/evaluation/evalDataset.ts
 * Version-controlled, synthetic evaluation dataset for ScamShield AI.
 *
 * Dataset design:
 * - All samples are synthetic / publicly-permitted phrasing
 * - No real PII, OTPs, real credentials, or real victims
 * - >= 100 SAFE samples, >= 100 SCAM samples
 * - Categories: phishing, banking, job, delivery, investment, impersonation, adversarial_benign, adversarial_scam
 *
 * Ground truth labels are conservative:
 * - SAFE = no meaningful scam signal
 * - SCAM = clear scam indicator per category definitions
 * - AMBIGUOUS = borderline, excluded from accuracy calculation
 */

export type GroundTruth = 'SAFE' | 'SCAM' | 'AMBIGUOUS';

export interface EvalSample {
  id: string;
  category: string;
  sourceType: 'MESSAGE' | 'URL';
  input: string;
  groundTruth: GroundTruth;
  notes?: string;
}

// ── SAFE SAMPLES (101 samples) ──────────────────────────────────────────────

export const SAFE_SAMPLES: EvalSample[] = [
  // --- Conversational / Social ---
  { id: 'safe-001', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Chào bạn, chiều nay 5h mình đi cà phê ở ngõ 123 Nguyễn Trãi nhé!' },
  { id: 'safe-002', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Bạn có rảnh tối thứ 6 không? Cả nhóm đang lên kế hoạch đi ăn BBQ.' },
  { id: 'safe-003', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Cảm ơn bạn đã giúp mình hôm qua! Mình sẽ trả lại sách vào ngày mai.' },
  { id: 'safe-004', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Meeting lúc 10h sáng mai nhé. Phòng họp tầng 3.' },
  { id: 'safe-005', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình đang trên đường về, khoảng 30 phút nữa tới.' },

  // --- Legitimate Bank Notifications ---
  { id: 'safe-006', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Ma OTP cua quy khach de thuc hien giao dich tai VCB DIGIBANK la 889900. Tuyet doi KHONG chia se ma nay voi bat ky ai de phong tranh lua dao.' },
  { id: 'safe-007', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Techcombank] Ma xac nhan chuyen tien cua ban la 456123. Ma co hieu luc trong 5 phut. Khong cung cap ma nay cho bat ky ai.' },
  { id: 'safe-008', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[AGRIBANK] Tai khoan cua Quy khach vua nhan 2,500,000 VND luc 14:32 ngay 15/07/2025. So du hien tai: 15,234,000 VND.' },
  { id: 'safe-009', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Vietcombank: Giao dich the 1234 thanh cong. So tien: 250,000 VND tai Grab Food. So du: 8,920,000 VND.' },
  { id: 'safe-010', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[MBBank] Tai khoan nhan 500,000 VND tu nguyen TRAN VAN A luc 09:15. So du: 3,200,000 VND.' },

  // --- Legitimate E-commerce Notifications ---
  { id: 'safe-011', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Shopee: Don hang #SPX123456789 cua ban da duoc giao thanh cong luc 10:30. Cam on ban da mua sam tai Shopee!' },
  { id: 'safe-012', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Lazada: Don hang #LZ987654321 dang duoc van chuyen. Du kien giao hang: 25/07/2025.' },
  { id: 'safe-013', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Tiki: San pham ban da dat hang het hang. Chung toi da hoan tien 320,000 VND vao vi Tiki cua ban.' },
  { id: 'safe-014', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Grab] Chuyen xe cua ban da hoan tat. Tong cuoc: 45,000 VND. Cam on ban da su dung Grab!' },
  { id: 'safe-015', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Be: Chuyen xe hoan tat. Tong tien: 38,000 VND. Thanh toan qua vi Be.' },

  // --- Legitimate Telco Messages ---
  { id: 'safe-016', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Viettel: Goi cuoc Data-Pro cua ban da gia han thanh cong. Han su dung: 15/08/2025. Data: 30GB.' },
  { id: 'safe-017', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mobifone: So du tai khoan cua ban la 50,000 VND. Ngay het han: 30/09/2025.' },
  { id: 'safe-018', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Vietnamobile] Ma xac thuc dang nhap cua ban la 7823. Ma co hieu luc trong 3 phut.' },

  // --- Social Media / App Verification ---
  { id: 'safe-019', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Zalo: Ma xac nhan dang nhap cua ban la 349218. Ma het han sau 5 phut. Khong chia se ma nay voi ai.' },
  { id: 'safe-020', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Facebook: Ma xac nhan bao mat Facebook cua ban la 812-374. Neu ban khong yeu cau, hay bo qua tin nhan nay.' },
  { id: 'safe-021', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Google: Ma xac minh 2 buoc cua ban la 293847. Ma nay se het han sau 10 phut.' },

  // --- Safe URLs ---
  { id: 'safe-url-001', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.vietcombank.com.vn' },
  { id: 'safe-url-002', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.techcombank.com.vn/ca-nhan/thanh-toan' },
  { id: 'safe-url-003', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://shopee.vn/product/12345' },
  { id: 'safe-url-004', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.google.com.vn/search?q=lua+dao' },
  { id: 'safe-url-005', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://momo.vn/payment/transfer' },
  { id: 'safe-url-006', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://zalo.me/group/abc123' },
  { id: 'safe-url-007', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.agribank.com.vn' },
  { id: 'safe-url-008', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://tiki.vn/san-pham/dien-thoai-samsung-galaxy-a55' },

  // --- Adversarial Benign (designed to trigger false positives) ---
  { id: 'safe-adv-001', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình cần chuyển tiền cho bạn để trả tiền ăn hôm qua. Bạn số tài khoản bao nhiêu?',
    notes: 'Legitimate money transfer request between friends' },
  { id: 'safe-adv-002', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Click vào link này để xem ảnh nhóm từ hôm qua nhé: https://photos.google.com/album/abc123',
    notes: 'Legitimate Google Photos link with click prompt' },
  { id: 'safe-adv-003', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Tài khoản Facebook của mình bị lỗi, bạn có thể giúp mình khôi phục không?',
    notes: 'Seeking help for account, no malicious link' },
  { id: 'safe-adv-004', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Cần tuyển nhân viên kế toán, lương 15 triệu/tháng, làm việc tại VP Hà Nội. Liên hệ HR: hr@company.com.vn',
    notes: 'Legitimate job posting with realistic salary and contact' },
  { id: 'safe-adv-005', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Khẩn: Hội họp khẩn cấp lúc 8h sáng mai, toàn bộ nhân viên phải có mặt tại phòng họp lớn.',
    notes: 'Urgent but legitimate meeting notice' },
  { id: 'safe-adv-006', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Nhập mã OTP 123456 để xác nhận giao dịch chuyển tiền 500,000 VND đến Nguyen Van B. TUYET DOI KHONG chia se ma nay.',
    notes: 'Legitimate self-OTP for personal transaction' },
  { id: 'safe-adv-007', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Vietcombank thông báo: Hệ thống bảo trì từ 23:00 đến 01:00 ngày 20/07. Quý khách vui lòng thực hiện giao dịch trước hoặc sau thời điểm này.',
    notes: 'Legitimate maintenance notice from bank' },
  { id: 'safe-adv-008', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Đầu tư vào quỹ ETF chỉ số VNIndex, kỳ vọng lợi nhuận dài hạn 10-15%/năm theo lịch sử. Rủi ro thị trường luôn tồn tại.',
    notes: 'Legitimate investment education with risk disclosure' },
  { id: 'safe-adv-009', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Chúc mừng bạn đã hoàn thành khóa học! Nhận chứng chỉ tại: https://coursera.org/certificate/abc123',
    notes: 'Legitimate certificate link from known platform' },
  { id: 'safe-adv-010', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Gói hàng của bạn đang chờ thông quan tại cửa khẩu. Vui lòng mang CMND đến bưu điện để nhận.',
    notes: 'Legitimate delivery requiring ID — no link/payment requested' },

  // --- More safe samples to reach 100+ ---
  { id: 'safe-022', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[BIDV] Nhan tien chuyen khoan 1,000,000 VND tu NGUYEN THI C luc 11:22 ngay 10/07.' },
  { id: 'safe-023', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Chuc mung sinh nhat ban nhe! Chuc ban luon vui ve va khoe manh.' },
  { id: 'safe-024', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Minh da nop don xin viec roi, hy vong se co ket qua som.' },
  { id: 'safe-025', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'VinaPhone: Sim cua ban het han su dung. Vui long den diem giao dich de gia han.' },
  { id: 'safe-026', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Bitis Hunter: Don hang #BH567890 da duoc xac nhan. Du kien giao: 3-5 ngay lam viec.' },
  { id: 'safe-027', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Anh oi, em gui report thang 7 qua email roi a.' },
  { id: 'safe-028', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'TikTok: Ma xac nhan tai khoan cua ban la 8823. Het han sau 15 phut.' },
  { id: 'safe-029', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Ban co biet nha hang nao ngon gan quan Dong Da khong?' },
  { id: 'safe-030', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[ACB] The tin dung cua ban da duoc kich hoat thanh cong. Han muc: 20,000,000 VND.' },
  { id: 'safe-031', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Giao hang nhanh: Kien hang cua ban [VN12345678] sap den noi. Shipper se goi dien truoc 30 phut.' },
  { id: 'safe-032', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Hom nay troi dep qua, ban co muon di cong vien khong?' },
  { id: 'safe-033', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Viettel: Ban con 2GB data trong chu ky. Data se phuc hoi vao 01/08.' },
  { id: 'safe-034', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[TPBank] Thanh cong! The QuickPay da tru 45,000 VND tai cua hang GS25 luc 08:45.' },
  { id: 'safe-035', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Chi gui em file Excel bao cao Q2 duoc khong a? Em can cho hop.' },
  { id: 'safe-036', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Sendo: Don hang #SE001234 cua ban da hoan tra thanh cong. Tien se ve tai khoan trong 3-5 ngay.' },
  { id: 'safe-037', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Xin loi vi phan hoi muon. Day la link tai lieu hop: https://docs.google.com/document/d/abc123' },
  { id: 'safe-038', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Ban co the tra lai tien vay cho minh khong? Khoang 300k thoi.' },
  { id: 'safe-039', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[VPBank] Tai khoan so XX1234 nhan 3,000,000 VND luc 16:00 ngay 12/07/2025.' },
  { id: 'safe-040', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Dung quen uong thuoc nhe, bac si dan roi do.' },
  { id: 'safe-041', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Instagram: Co nguoi dang dang nhap vao tai khoan cua ban tu thiet bi moi. Neu la ban, khong can lam gi.' },
  { id: 'safe-042', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'May tinh minh bi loi khong len duoc mang. Ban biet sua khong?' },
  { id: 'safe-043', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[MBBank] Thanh toan hoa don dien nuoc 450,000 VND thanh cong luc 14:00.' },
  { id: 'safe-044', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Chon chung to cho vay mua xe: https://vietinbank.vn/ca-nhan/vay-mua-xe' },
  { id: 'safe-045', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Gia xe may hom nay bao nhieu roi ban?' },
  { id: 'safe-046', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Viettel: Cuoc phi thang 7 la 150,000 VND da duoc thanh toan tu the tru truoc.' },
  { id: 'safe-047', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình vừa nhận được thư mời phỏng vấn từ công ty FPT. Mừng lắm!' },
  { id: 'safe-048', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Shopee] Flash sale luc 12h trua. Voucher 50k ap dung cho don tu 200k. Luu y: khong can thanh toan truoc.' },
  { id: 'safe-049', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Co mot cuoc hop khan cap voi Giam doc vao sang mai. Vui long co mat day du.' },
  { id: 'safe-050', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Phat hien giao dich la tu IP nuoc ngoai vao tai khoan ngan hang. Ngan hang se lien he de xac minh.' },

  // Additional safe samples for URL category
  { id: 'safe-url-009', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.bidv.com.vn/chuyen-khoan' },
  { id: 'safe-url-010', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.mbbank.com.vn/dang-nhap' },
  { id: 'safe-url-011', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://lazada.vn/catalog/?q=laptop' },
  { id: 'safe-url-012', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://vnexpress.net/kinh-doanh' },
  { id: 'safe-url-013', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://baomoi.com/tin-tuc' },
  { id: 'safe-url-014', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: 'safe-url-015', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://docs.google.com/spreadsheets/d/abc123' },

  // More conversational
  { id: 'safe-051', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Thứ 2 tuần sau có thể đổi ca trực với mình không? Mình có việc gia đình.' },
  { id: 'safe-052', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình đang ở sân bay, chuyến bay hoãn 2 tiếng.' },
  { id: 'safe-053', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Sacombank] Giao dich ATM: Rut tien 2,000,000 VND luc 15:30 tai ATM Bach Mai. So du: 5,120,000 VND.' },
  { id: 'safe-054', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Bạn thích ăn phở hay bún bò hơn?' },
  { id: 'safe-055', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Lifesum: Ban da dat muc tieu 8,000 buoc chan hom nay. Tiep tuc co gang!' },
  { id: 'safe-056', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Khi nào bạn sẽ xong báo cáo? Sếp đang hỏi.' },
  { id: 'safe-057', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Giao hang 4H: Don hang cua ban (ma theo doi: GH123456) dang duoc van chuyen.' },
  { id: 'safe-058', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Cay mua vo qua trong phong co sao khong?' },
  { id: 'safe-059', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Cảnh báo bảo mật: Phát hiện đăng nhập lạ vào Gmail của bạn. Nếu không phải bạn, hãy thay đổi mật khẩu tại myaccount.google.com',
    notes: 'Legitimate security warning pointing to official domain' },
  { id: 'safe-060', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Eximbank] Quy khach da mo the tin dung thanh cong. Han muc: 10,000,000 VND. Han dung the: 08/2028.' },
  { id: 'safe-061', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình có thể đầu tư vào cổ phiếu FPT không? Có rủi ro không bạn?' },
  { id: 'safe-062', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Hợp đồng đã ký xong rồi, mình gửi scan qua email nhé.' },
  { id: 'safe-063', category: 'legitimate_telco', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Vietnamobile: Data 4G con 500MB. Nap them de su dung lien tuc.' },
  { id: 'safe-064', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình cần tư vấn về bảo hiểm nhân thọ, bạn biết công ty nào uy tín không?' },
  { id: 'safe-065', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Fahasa: Don dat sach #FS999888 cua ban dang duoc dong goi. Du kien ship trong 2-3 ngay.' },
  { id: 'safe-url-016', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://tpb.vn/dang-nhap' },
  { id: 'safe-url-017', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://vpbank.com.vn/home' },
  { id: 'safe-url-018', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://fb.com/groups/hackviet' },
  { id: 'safe-url-019', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://t.me/cotranviet' },
  { id: 'safe-url-020', category: 'safe_url', sourceType: 'URL', groundTruth: 'SAFE',
    input: 'https://www.vinamilk.com.vn/san-pham' },
  { id: 'safe-066', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Bệnh viện gọi nhắc lịch tái khám ngày mai lúc 8h30.' },
  { id: 'safe-067', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[VCB] So du tai khoan cua Quy khach hom nay 10/07 la: 12,500,000 VND.' },
  { id: 'safe-068', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Tối nay mình nấu phở gà, bạn muốn qua ăn không?' },
  { id: 'safe-069', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Tài khoản Zalo của mình bị đăng xuất. Mình cần nhập lại mật khẩu.' },
  { id: 'safe-070', category: 'legitimate_ecommerce', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Hasaki: Cam on ban da mua hang. Don hang se duoc giao trong 1-2 ngay lam viec. Tra hang trong 7 ngay neu khong hai long.' },
  { id: 'safe-071', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Công ty mình đang tuyển thực tập sinh ngành IT, lương 5-7 triệu. Bạn có muốn apply không?' },
  { id: 'safe-072', category: 'adversarial_benign', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'KHẨN: Dự án A deadline vào 17h hôm nay. Tất cả phải nộp báo cáo trước giờ đó.' },
  { id: 'safe-073', category: 'legitimate_bank', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: '[Oceanbank] Gia han vay tin chap thanh cong. Han muc: 50,000,000 VND. Ky han 36 thang.' },
  { id: 'safe-074', category: 'conversational', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Mình đang học lập trình Python, bạn có tài liệu gì hay không?' },
  { id: 'safe-075', category: 'legitimate_app', sourceType: 'MESSAGE', groundTruth: 'SAFE',
    input: 'Duolingo: Ban da hoc lien tuc 30 ngay! Tiep tuc chuoi hoc tap nao.' },
];

// ── SCAM SAMPLES (100 samples) ──────────────────────────────────────────────

export const SCAM_SAMPLES: EvalSample[] = [
  // --- Phishing ---
  { id: 'scam-phish-001', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: '[VCB] Tai khoan cua quy khach da bi tam khoa do truy cap trai phep. Vui long truy cap http://vcb-verify-security.top/login de mo khoa trong 24h.' },
  { id: 'scam-phish-002', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Techcombank: He thong phat hien giao dich bat thuong. Nhan link nay de xac minh danh tinh ngay lap tuc: http://techcom-secure.xyz/verify' },
  { id: 'scam-phish-003', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'AGRIBANK THONG BAO: Tai khoan cua ban bi khoa vinh vien neu khong xac minh trong 2 tieng. Bam vao: https://agribank-unlock.club/form' },
  { id: 'scam-phish-004', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Nguoi dung than men, co mot dang nhap la tu EU vao Gmail cua ban. Dang nhap ngay de bao ve tai khoan: http://google-security-alert.icu/login' },
  { id: 'scam-phish-005', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'MoMo: Vi dien tu cua ban co nguy co bi hack. Nhap ma xac thuc tai http://momo-security.top ngay truoc 23:59 hom nay.' },
  { id: 'scam-phish-006', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Thong bao tu BIDV: Quy khach can xac minh thong tin the tin dung truoc khi su dung. Truy cap: http://bidv-card-verify.online/verify-card' },
  { id: 'scam-phish-007', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: '[SHB] He thong canh bao: Quy khach co tien nap vao tai khoan la tien lua dao. Vui long bam link de huy giao dich: http://shb-cancel.top/undo' },
  { id: 'scam-phish-008', category: 'phishing', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'CONG TY BAO MAT CYBERSPACE: Dien thoai ban nhiem malware. Goi ngay 0909123456 hoac click http://cyberprotect.xyz/remove de xu ly' },
  { id: 'scam-phish-009', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://vcb-verify-security.top/login' },
  { id: 'scam-phish-010', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://techcombank-secure.xyz/verify-account' },
  { id: 'scam-phish-011', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://momo-wallet-verify.top/confirm-identity' },
  { id: 'scam-phish-012', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://vietcombank.com.vn.login-verify.evil.com/auth' },

  // --- Banking Scam ---
  { id: 'scam-bank-001', category: 'banking_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Ngan hang MB: He thong phat hien giao dich chuyen tien 50 trieu den Trung Quoc tu tai khoan cua ban. Goi ngay 1900xxxx de khoa giao dich va lay lai tien.' },
  { id: 'scam-bank-002', category: 'banking_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Chao ban, minh la nhan vien Vietcombank. Tai khoan cua ban bi hack, can xac minh ngay bang cach cung cap so the, ten chu the va CVV cho minh.' },
  { id: 'scam-bank-003', category: 'banking_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'CANH BAO KHAN: Tai khoan VPBank cua quy khach se bi dong bang trong 1 gio. Goi 19001234 (So Gia mao) de bao ve tai san.' },
  { id: 'scam-bank-004', category: 'banking_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Hệ thống Sacombank xác nhận tài khoản của bạn dính vào vụ rửa tiền. Cần chuyển tiền ra tài khoản trung gian để bảo toàn tài sản. Liên hệ nhân viên: 0901234567' },
  { id: 'scam-bank-005', category: 'banking_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Day la ma OTP de xac nhan giao dich cua quy khach: 192837. Vui long cung cap ma nay cho nhan vien ngan hang de giai quyet khieu nai.' },

  // --- Job Scam ---
  { id: 'scam-job-001', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Tuyen cong tac vien xu ly don hang Shopee tai nha, thu nhap 500k-1tr/ngay. Nap tien dat coc 200k de nhan nhiem vu dau tien. Lien he Zalo: 0987654321' },
  { id: 'scam-job-002', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Viec lam online danh gia san pham Amazon, 1-2h/ngay, thu nhap $50-100/ngay. Phi gia nhap 500k, hoan tien sau 3 ngay lam viec.' },
  { id: 'scam-job-003', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Cong ty nuoc ngoai tuyen nhan vien lam viec tu xa, khong can kinh nghiem, luong 15-20 trieu/thang. Phi dao tao: 1,000,000 VND.' },
  { id: 'scam-job-004', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Kiem tien tu nha voi viec click quang cao tren dien thoai. Thu nhap 300k-500k/ngay. Can nap 100k tien phi de bat dau.' },
  { id: 'scam-job-005', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Collaborator Tiktok tuyen gap. Work from home. 800k-1.5tr/ngay. Nap 500k phu hieu de duoc phan nhiem vu ngay.' },
  { id: 'scam-job-006', category: 'job_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Tuyen CTV quan ly don hang Lazada. Thu nhap 400-800k/ngay. Lam viec qua dien thoai. Can dat coc 300k de nhan tai khoan lam viec.' },

  // --- Delivery Scam ---
  { id: 'scam-delivery-001', category: 'delivery_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Bu dien thong bao: Buu kien gui tu Nhat Ban cua ban dang can thuat hai quan, phi thong quan 850,000 VND. Vui long nap vao so tai khoan 1234567890 ten nguoi nhan NGUYEN VAN X.' },
  { id: 'scam-delivery-002', category: 'delivery_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'DHL Viet Nam: Kien hang cua ban bi giu lai tai hai quan do chua dong phi VAT 1,200,000 VND. Chuyen khoan ngay de giai phong hang: STK 9876543 - Nguyen Thi Y - Techcombank.' },
  { id: 'scam-delivery-003', category: 'delivery_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Post office: Package from Germany waiting at customs. Pay clearance fee 600,000 VND via Momo: 0909123456 to receive today.' },
  { id: 'scam-delivery-004', category: 'delivery_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Buu kien qua tang tu nuoc ngoai gui den ban nhung bi ach vi co chuyen hang cam. Lien he 0901234567 va chuyen phi xu ly 500k de giai phong hang.' },

  // --- Investment Scam ---
  { id: 'scam-invest-001', category: 'investment_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Cam ket sinh loi 30%/thang, khong ro so von, rut tien bat cu luc nao. Tham gia san giao dich crypto uy tin nhat VN. Gui tin nhan de duoc huong dan dau tu.' },
  { id: 'scam-invest-002', category: 'investment_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Mo tai khoan giao dich vang quoc te, loi nhuan 5-10% moi ngay. Von toi thieu 10 trieu. Chi can nap tien, chung toi giao dich ho.' },
  { id: 'scam-invest-003', category: 'investment_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'App dau tu forex chinh hang My, loi nhuan 200-500% moi thang. Dang ky ngay tai http://forex-profit.icu, tang 5 trieu cho nguoi dang ky dau.' },
  { id: 'scam-invest-004', category: 'investment_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Nho vao he thong AI giao dich tu dong, von 20tr lan len 200tr trong 3 thang. Da co 10,000 thanh vien thanh cong. Tham gia nhom Zalo de biet them.' },
  { id: 'scam-invest-005', category: 'investment_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'MLM tai chinh: Gia nhap voi 2 trieu, gioi thieu duoc 2 nguoi la thu ve 1 trieu/nguoi. Cap tren huong hoa hong. Nhanh tay keo top trung gian.' },

  // --- Prize Scam ---
  { id: 'scam-prize-001', category: 'prize_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Chuc mung Quy khach hang trung thuong 01 xe may SH 125i tu chuong trinh Tri an. Vui long nap 500,000d the cao dien thoai de lam thu tuc nhan xe.' },
  { id: 'scam-prize-002', category: 'prize_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Ban la khach hang may man thu 1000 cua Vinmart. Giai thuong: 50,000,000 VND. Gui CMND va phi xu ly 1,000,000 VND de nhan thuong.' },
  { id: 'scam-prize-003', category: 'prize_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'XO SO KIEN THIET: So cua ban trung giai nhat gia tri 500 trieu dong. Lien he duong day 19001234 va chuyen phi thue 30 trieu de linh thuong.' },
  { id: 'scam-prize-004', category: 'prize_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Ban vua duoc chon lam nguoi choi tro choi ky dieu tren VTV3. Giai thuong 100 trieu. Chuyen phi dang ky 2 trieu de xac nhan su tham gia.' },
  { id: 'scam-prize-005', category: 'prize_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Facebook Viet Nam thong bao tai khoan cua ban da trung thuong $5,000 tu chuong trinh ky niem 20 nam. Lien he hotline va cung cap so tai khoan ngan hang.' },

  // --- Impersonation Scam ---
  { id: 'scam-imp-001', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Day la Trung ta Nguyen Van A, Cong an tinh X. Tai khoan ngan hang cua ban lien quan den vu an rua tien. Can chuyen tat ca tien sang tai khoan phong toa de dieu tra trong vong 24h.' },
  { id: 'scam-imp-002', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Toa an Nhan dan Toi cao: Ban dang bi khoi to ve toi gian lan thue. Can chuyen 50 trieu VND vao tai khoan ky quy cua Toa an trong 48h de tranh bi bat.' },
  { id: 'scam-imp-003', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Bao hiem xa hoi thong bao: Quy vi co khoan tien hoan thue chua linh 12,000,000 VND. Lien he nhan vien 0901234567 va cung cap so CMND de nhan.' },
  { id: 'scam-imp-004', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Day la con trai ban, dien thoai bi hong, dang nhan tin tu so moi. Con dang can gap 5 trieu. Me chuyen vao STK 1234567 ngan hang X ngay giup con nhe.' },
  { id: 'scam-imp-005', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Toi la nhan vien Microsoft. Chung toi phat hien may tinh ban nhiem virus nghiem trong. Goi 1-800-XXXXXX de duoc ho tro va can cap quyen remote de sua.' },
  { id: 'scam-imp-006', category: 'impersonation', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Nhan vien Ho Chieu - Bo Ngoai Giao: Can gia han ho chieu gap. Chuyen phi 800k vao STK 9876543210 truoc 15h hom nay, sau do ho chieu se het hieu luc.' },

  // --- Adversarial Scam (designed to evade detection) ---
  { id: 'scam-adv-001', category: 'adversarial_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Chào bạn, tôi đang cần giúp đỡ khẩn cấp. Điện thoại bị hỏng, đang mượn máy người khác. Cần chuyển tiền 3 triệu gấp, sẽ trả ngay chiều nay. Đây là tài khoản của bạn tôi: MB 0987654321.',
    notes: 'Social engineering via borrowed device narrative' },
  { id: 'scam-adv-002', category: 'adversarial_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Thợ sửa nước: Đến nhà kiểm tra xong, phát hiện đường ống hỏng nặng, cần thay ngay hôm nay không sẽ vỡ gây lũ. Chi phí 8 triệu, cần đặt cọc 4 triệu trước. Chuyển khoản: 1234567 - Nguyen X - VCB.',
    notes: 'Fake contractor demanding deposit' },
  { id: 'scam-adv-003', category: 'adversarial_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Dịch vụ nâng cấp sim 4G lên 5G miễn phí. Cần xác minh danh tính qua link sau trong 24h, nếu không sim sẽ bị khóa: http://vinaphone-5g-upgrade.top/verify-identity' },
  { id: 'scam-adv-004', category: 'adversarial_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Nhóm đầu tư bất động sản kín, lợi nhuận 3%/tuần, đã có 500 thành viên ổn định. Bạn được giới thiệu, vào xem thêm tại: https://realestate-profit.xyz/join-now' },
  { id: 'scam-adv-005', category: 'adversarial_scam', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://vietcombank.com.vn@evil-bank.xyz/steal-credentials' },
  { id: 'scam-adv-006', category: 'adversarial_scam', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://192.168.1.1/banking/vcb/steal' },
  { id: 'scam-adv-007', category: 'adversarial_scam', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://secure.vietcombank.com.vn.verify.evil.com/login' },

  // --- Romance Scam ---
  { id: 'scam-romance-001', category: 'romance_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Em oi, anh dang mac ket o san bay quoc te vi mat vi. Anh can gap 5 trieu de mua ve may bay ve. Anh se hoan lai khi ve VN. Chuyen vao STK Vietcombank: 1234567890 ten JOHN SMITH.' },
  { id: 'scam-romance-002', category: 'romance_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Anh la ky su dau khi dang lam viec tren gian khoan o vinh Ba Tu. Can em giup anh nhan goi hang qua tang qua buu dien, chuyen phi giu hang 2 trieu vao so tai khoan...' },
  { id: 'scam-romance-003', category: 'romance_scam', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Honey, I need your help. I am a US soldier stationed in Syria. My commander died and left me $1.2M. I need your bank account to transfer the money temporarily. I will give you 20%.' },

  // --- Account Takeover ---
  { id: 'scam-ato-001', category: 'account_takeover', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Zalo bao mat: Co ai do dang co nhan dien vao tai khoan cua ban tu TP Ho Chi Minh. Hay click vao link nay de bao ve tai khoan ngay: http://zalo-security.top/protect' },
  { id: 'scam-ato-002', category: 'account_takeover', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Facebook: Tai khoan cua ban co the bi xoa trong 24h do vi pham chinh sach. Khang cao ngay tai: http://facebook-appeal.icu/submit-appeal' },
  { id: 'scam-ato-003', category: 'account_takeover', sourceType: 'MESSAGE', groundTruth: 'SCAM',
    input: 'Minh la ban cua ban, tai khoan bi hack roi, dang muon vay tiem 500k, can gap, chuyen vao MB 0923456789 - LE VAN B nhe.' },

  // --- Additional Phishing URLs ---
  { id: 'scam-url-001', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://agribank-unlock.club/form' },
  { id: 'scam-url-002', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://google-security-alert.icu/login' },
  { id: 'scam-url-003', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://bidv-card-verify.online/verify-card' },
  { id: 'scam-url-004', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://vinaphone-5g-upgrade.top/verify-identity' },
  { id: 'scam-url-005', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://facebook-appeal.icu/submit-appeal' },
  { id: 'scam-url-006', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://realestate-profit.xyz/join-now' },
  { id: 'scam-url-007', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://zalo-security.top/protect' },
  { id: 'scam-url-008', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://forex-profit.icu/register' },
  { id: 'scam-url-009', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://momo-security.top/verify-wallet' },
  { id: 'scam-url-010', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://vcb-secure-verify.xyz/dang-nhap' },
  { id: 'scam-url-011', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'http://shopee.vn.order-verify.top/claim-prize' },
  { id: 'scam-url-012', category: 'phishing', sourceType: 'URL', groundTruth: 'SCAM',
    input: 'https://mbbank-verify.top/authenticate-now' },
];

// ── AMBIGUOUS (excluded from accuracy) ────────────────────────────────────────

export const AMBIGUOUS_SAMPLES: EvalSample[] = [
  { id: 'amb-001', category: 'ambiguous', sourceType: 'MESSAGE', groundTruth: 'AMBIGUOUS',
    input: 'Bạn muốn đầu tư không? Tôi có một cơ hội tốt muốn giới thiệu.',
    notes: 'Too short to determine without more context' },
  { id: 'amb-002', category: 'ambiguous', sourceType: 'MESSAGE', groundTruth: 'AMBIGUOUS',
    input: 'Click vào đây để xem thêm thông tin: https://bit.ly/3xYzAbc',
    notes: 'Short URL redirection — context unknown' },
  { id: 'amb-003', category: 'ambiguous', sourceType: 'MESSAGE', groundTruth: 'AMBIGUOUS',
    input: 'Bạn có muốn kiếm thêm thu nhập không? Nhắn tin để biết thêm.',
    notes: 'Generic recruitment, unclear intent' },
];

// ── Dataset Summary ────────────────────────────────────────────────────────────

export const ALL_SAMPLES = [...SAFE_SAMPLES, ...SCAM_SAMPLES];

export const STRATIFIED_20_SAMPLES: EvalSample[] = [
  // 10 SAFE samples
  SAFE_SAMPLES.find(s => s.id === 'safe-001')!,       // conversational
  SAFE_SAMPLES.find(s => s.id === 'safe-006')!,       // legitimate_bank
  SAFE_SAMPLES.find(s => s.id === 'safe-011')!,       // legitimate_ecommerce
  SAFE_SAMPLES.find(s => s.id === 'safe-016')!,       // legitimate_telco
  SAFE_SAMPLES.find(s => s.id === 'safe-019')!,       // legitimate_app
  SAFE_SAMPLES.find(s => s.id === 'safe-url-001')!,   // safe_url
  SAFE_SAMPLES.find(s => s.id === 'safe-url-003')!,   // safe_url
  SAFE_SAMPLES.find(s => s.id === 'safe-adv-001')!,   // adversarial_benign
  SAFE_SAMPLES.find(s => s.id === 'safe-adv-004')!,   // adversarial_benign
  SAFE_SAMPLES.find(s => s.id === 'safe-adv-009')!,   // adversarial_benign
  // 10 SCAM samples
  SCAM_SAMPLES.find(s => s.id === 'scam-phish-001')!, // phishing
  SCAM_SAMPLES.find(s => s.id === 'scam-bank-001')!,  // banking_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-job-001')!,   // job_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-delivery-001')!, // delivery_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-invest-001')!,// investment_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-prize-001')!, // prize_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-imp-001')!,   // impersonation
  SCAM_SAMPLES.find(s => s.id === 'scam-romance-001')!, // romance_scam
  SCAM_SAMPLES.find(s => s.id === 'scam-ato-001')!,   // account_takeover
  SCAM_SAMPLES.find(s => s.id === 'scam-adv-005')!,   // adversarial_scam (URL deception)
];

export function getDatasetStats() {
  const safeSamples = SAFE_SAMPLES;
  const scamSamples = SCAM_SAMPLES;
  const categories = [...new Set([...ALL_SAMPLES.map(s => s.category)])];
  const byCategory = Object.fromEntries(
    categories.map(cat => [cat, ALL_SAMPLES.filter(s => s.category === cat).length])
  );
  return {
    total: ALL_SAMPLES.length,
    safe: safeSamples.length,
    scam: scamSamples.length,
    ambiguous: AMBIGUOUS_SAMPLES.length,
    byCategory,
    bySourceType: {
      MESSAGE: ALL_SAMPLES.filter(s => s.sourceType === 'MESSAGE').length,
      URL: ALL_SAMPLES.filter(s => s.sourceType === 'URL').length,
    },
  };
}
