# 🛡️ ScamShield AI — Nhận diện lừa đảo bằng AI

> **AI RISE 2026 Submission** | Công cụ hỗ trợ nhận diện và cảnh báo lừa đảo trực tuyến cho cộng đồng người Việt bằng Trí tuệ Nhân tạo.

---

## 📌 Tổng quan về ScamShield AI

**ScamShield AI** là giải pháp an toàn thông tin thông minh giúp người dùng Việt Nam kiểm tra, đánh giá và giải thích chi tiết các nguy cơ lừa đảo trực tuyến trong **tin nhắn SMS/Zalo**, **ảnh chụp màn hình hóa đơn/chuyển khoản** và **đường dẫn liên kết web (URL)**.

Khác với các công cụ cảnh báo nhị phân đơn thuần, ScamShield AI mang lại khả năng **Explainable AI (AI có thể giải thích)**:
- **Thang điểm rủi ro trực quan (Risk Score 0–100)** cùng 4 cấp độ nghiêm trọng.
- **Phân loại hành vi lừa đảo cụ thể** (Lừa đảo ngân hàng, Việc làm nạp cọc, Trúng thưởng giả mạo, Mạo danh thương hiệu...).
- **Trích xuất bằng chứng nguyên văn** từ nội dung nghi vấn để người dùng tự đối chiếu.
- **Khuyến nghị hành động trực tiếp** giúp người dùng phòng tránh và phản ánh tới cơ quan chức năng.

---

## ✨ Tính năng chính

1. **💬 Message Analyzer** — Phân tích tin nhắn văn bản (SMS, Zalo, Telegram, Email).
2. **🖼️ Screenshot Analyzer** — Phân tích ảnh chụp màn hình; AI đọc văn bản trong ảnh, không lưu ảnh gốc.
3. **🔗 URL Analyzer** — Phân tích cấu trúc URL; **tuyệt đối không tự động truy cập liên kết**.
4. **🧠 Explainable AI** — Hiển thị từng dấu hiệu nghi ngờ kèm mức độ nghiêm trọng và trích xuất bằng chứng.
5. **📚 History & Privacy** — Tự động che OTP, số thẻ, điện thoại, mật khẩu trước khi lưu vào `localStorage`.
6. **📊 Dashboard** — Tổng hợp số liệu phân tích thực tế từ lịch sử sử dụng.

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Express.js, Zod (validation), Helmet (security headers), express-rate-limit
- **AI Core**: Google Gemini API (`@google/genai`) — server-side only
- **Build**: Vite 6, Esbuild, TSX Runner

---

## 🚀 Hướng dẫn Cài đặt & Chạy ứng dụng

### Yêu cầu môi trường
- **Node.js**: v20 LTS (>=20, <23). Dùng `nvm use` nếu đã cài nvm.
- **npm**: v9.0.0 trở lên
- **Google Gemini API Key**: Lấy tại [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Environment Variables

> ⚠️ **Quan trọng:** API Key phải đặt ở **server-side** (`GEMINI_API_KEY`), KHÔNG được dùng `VITE_GEMINI_API_KEY` (biến `VITE_` sẽ được Vite đưa vào client bundle và lộ ra trình duyệt).

Tạo tệp `.env` trong thư mục gốc dự án:
```env
# BẮT BUỘC: Gemini API Key (chỉ dùng phía server)
GEMINI_API_KEY=your_gemini_api_key_here

# TÙY CHỌN: Xem .env.example để biết đầy đủ các biến
```

Tham khảo [`.env.example`](.env.example) để xem toàn bộ các biến cấu hình và giá trị mặc định.

### 3. Chạy ứng dụng Development
```bash
npm run dev
```
Mở trình duyệt: `http://localhost:3000`

### 4. Build Production
```bash
npm run build
```

### 5. Chạy Production Build
```bash
npm run start
```

---

## 🔒 Cấu hình Bảo mật (Security Configuration)

### Environment Variables quan trọng

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GEMINI_API_KEY` | *(bắt buộc)* | Gemini API Key — **server-side only** |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Tên model Gemini |
| `GEMINI_TIMEOUT_MS` | `30000` | Timeout gọi API (ms) |
| `GEMINI_MAX_RETRIES` | `3` | Số lần retry khi lỗi tạm thời |
| `RATE_LIMIT_MAX` | `20` | Số request tối đa mỗi IP/phút |
| `MAX_CONCURRENT_GEMINI` | `5` | Số cuộc gọi Gemini đồng thời tối đa |
| `MAX_MESSAGE_CHARS` | `2000` | Giới hạn ký tự tin nhắn/URL |
| `MAX_IMAGE_BYTES` | `10485760` | Giới hạn kích thước ảnh (10MB) |
| `PORT` | `3000` | Cổng server (Cloud Run tự inject) |

### Hành vi bảo mật

- **API Key**: Chỉ đọc từ server environment, không bao giờ gửi xuống client, không log.
- **Rate Limiting**: 20 request/IP/phút cho `/api/analyze`.
- **Request Validation**: Mọi request được validate bằng Zod schema trước khi gọi Gemini.
- **Image Validation**: Kiểm tra MIME type, kích thước decoded và magic bytes (file signature).
- **Prompt Injection Protection**: User input được bọc trong `<UNTRUSTED_USER_INPUT>` tags.
- **URL Analysis**: Chỉ phân tích chuỗi URL — **tuyệt đối không fetch, resolve DNS hay truy cập trang web**.
- **Logging**: Structured JSON, không log nội dung người dùng, OTP, mật khẩu, API key, hay stack trace.
- **Security Headers**: CSP, X-Content-Type-Options, X-Frame-Options, HSTS (production), Referrer-Policy.
- **Concurrency Limit**: Tối đa 5 Gemini calls đồng thời cho mỗi instance (bảo vệ chi phí).
- **Retry**: Exponential backoff với jitter cho 429/503/network errors, không retry lỗi validation.

---

## 🐳 Deploy lên Cloud Run

### Prerequisites
- Docker
- Google Cloud SDK
- Quyền truy cập Secret Manager (cho API key)

### Bước 1: Tạo Secret cho API Key
```bash
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create gemini-api-key --data-file=-
```

### Bước 2: Build và Push Docker Image
```bash
export PROJECT_ID=$(gcloud config get-value project)
export IMAGE="gcr.io/$PROJECT_ID/scamshield-ai"

docker build -t $IMAGE .
docker push $IMAGE
```

### Bước 3: Deploy lên Cloud Run
```bash
gcloud run deploy scamshield-ai \
  --image $IMAGE \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10
```

> Cloud Run tự động inject `PORT` vào environment — server đọc từ `process.env.PORT`.

> `MAX_CONCURRENT_GEMINI` là giới hạn theo từng instance. Với `--max-instances 10` và giá trị mặc định 5, hệ thống có thể tạo tối đa khoảng 50 Gemini calls đồng thời; hãy đối chiếu mức này với quota API key.

---

## 🧪 Kiểm thử & Bảo mật

```bash
# 1. TypeScript type check
npx tsc --noEmit

# 2. Chạy toàn bộ test suite (Unit + Integration)
npx tsx tests/runAllTests.ts

# 3. Production build
npm run build
```

### Test Suite bao gồm:
- **Validation**: MESSAGE, URL, SCREENSHOT inputs; empty, too-short, oversized.
- **URL Parser**: Dangerous protocols (javascript:, data:, file:, ftp:), @-deception.
- **Gemini Output**: Score clamping, enum fallback, evidence verification, limitations.
- **Zod Schemas**: Request body validation, Gemini output schema.
- **Retry Logic**: Backoff math, error classification (retryable vs not), concurrency.
- **Security**: No API key in bundle, UNTRUSTED_USER_INPUT tags, no URL fetch.
- **HTTP integration**: Chạy Express app thật để kiểm tra health endpoint, security headers, request ID và lỗi JSON/input.

---

## ⚠️ Giới hạn hệ thống (Limitations)

> Đây là những giới hạn kỹ thuật thực tế của sản phẩm. Vui lòng đọc kỹ trước khi sử dụng.

1. **Kết quả là tham khảo, không phải phán quyết cuối cùng.** AI có thể có false positive (báo lừa đảo nhầm với nội dung hợp lệ) và false negative (bỏ sót lừa đảo tinh vi).

2. **URL Analyzer chỉ phân tích chuỗi ký tự URL.** Hệ thống không truy cập trang web, không kiểm tra nội dung HTML thực tế, không check blacklist realtime.

3. **Screenshot Analyzer phụ thuộc vào chất lượng ảnh.** Ảnh mờ, cắt thiếu nội dung, hoặc ảnh không có văn bản sẽ cho kết quả không chính xác.

4. **Không xác minh danh tính người gửi.** Hệ thống phân tích nội dung tin nhắn, không có khả năng xác nhận số điện thoại hay tài khoản của người gửi có thực sự là ai.

5. **Lịch sử lưu cục bộ (`localStorage`).** Không đồng bộ giữa thiết bị. Xóa cache trình duyệt sẽ mất lịch sử.

6. **Không thay thế cho cơ quan chức năng.** Nếu bạn đã bị lừa đảo, hãy liên hệ ngay với ngân hàng và trình báo cơ quan công an.

---

## ⚙️ Kiến trúc Backend

```
server.ts              ← Entry point (wiring only)
server/
  config.ts            ← Environment-based configuration
  types.ts             ← Server-side TypeScript types
  schemas/
    analyzeSchema.ts   ← Zod schemas (request + Gemini output)
  middleware/
    requestId.ts       ← UUID per-request traceability
    securityHeaders.ts ← Helmet CSP/HSTS/nosniff
    rateLimiter.ts     ← IP-based rate limiting
    logger.ts          ← Structured JSON logging (no user data)
  services/
    geminiService.ts   ← Singleton client, timeout, retry, concurrency
  routes/
    analyze.ts         ← POST /api/analyze
    health.ts          ← GET /api/health
src/
  services/
    prompts.ts         ← System instructions (UNTRUSTED_USER_INPUT tags)
  utils/
    validation.ts      ← Output validation + evidence verification
    urlParser.ts       ← URL parsing (no network calls)
    redact.ts          ← Sensitive data masking for history
```

---

## ⚠️ Tuyên bố miễn trừ trách nhiệm

*ScamShield AI là công cụ hỗ trợ nâng cao nhận thức an toàn mạng, không phải hệ thống bảo mật chuyên dụng. Kết quả phân tích mang tính chất tham khảo và có thể có sai số. Người dùng luôn cần cẩn trọng và xác minh thông tin qua kênh chính thức trước mọi giao dịch tài chính.*

---

© 2026 **ScamShield AI Team** — Submitted to **AI RISE 2026**
