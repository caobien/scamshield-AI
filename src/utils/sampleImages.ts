/**
 * Generates sample screenshot images for testing multimodal AI analysis.
 */

export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function createSampleBankPhishingImage(): { file: File; dataUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 650, 420);

  // Phone status bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 650, 45);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SMS • Vietcombank Security Alert', 20, 28);

  // Chat bubble container
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(20, 65, 610, 310, 16);
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Ngân hàng thông báo khẩn cấp', 40, 110);

  // Body text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText('Tài khoản VCB của bạn sẽ bị khóa trong 24 giờ tới', 40, 150);
  ctx.fillText('do phát hiện nghi vấn truy cập bất hợp pháp.', 40, 180);

  // Malicious URL line
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Hãy truy cập ngay: http://vietcombank-security.example', 40, 225);

  // Action / OTP demand
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('để xác minh thông tin và nhập mã OTP ngay lập tức.', 40, 260);

  // Footer / Time
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText('Tin nhắn từ hệ thống • Hôm nay 09:15', 40, 320);

  const dataUrl = canvas.toDataURL('image/png');
  const file = dataURLtoFile(dataUrl, 'sample_bank_phishing.png');
  return { file, dataUrl };
}

export function createSampleBlurryImage(): { file: File; dataUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Blurry background fill
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 400, 250);

  // Draw blurry noise lines
  ctx.fillStyle = '#64748b';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(Math.random() * 400, Math.random() * 250, 80, 20);
  }

  // Apply CSS-like blur effect via fill with opacity
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.fillRect(10, 10, 380, 230);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px sans-serif';
  ctx.fillText('... image unreadable blur content ...', 50, 120);

  const dataUrl = canvas.toDataURL('image/png');
  const file = dataURLtoFile(dataUrl, 'sample_blurry_unreadable.png');
  return { file, dataUrl };
}
