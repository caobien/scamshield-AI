export interface ParsedUrlResult {
  rawUrl: string;
  normalizedUrl: string;
  protocol: string;
  hostname: string;
  domain: string;
  subdomain: string;
  tld: string;
  isHttps: boolean;
  isValid: boolean;
  isIpAddress: boolean;
  ipAddress?: string;
  hasUserInfo: boolean;
  userInfoText?: string;
  hasNonStandardPort: boolean;
  port?: string;
  urlLength: number;
  isLongUrl: boolean;
  subdomainCount: number;
  hasMultipleSubdomains: boolean;
  isSuspiciousTld: boolean;
  hasBrandImpersonation: boolean;
  impersonatedBrand?: string;
  summaryFeatures: string[];
  error?: string;
}

const NOVEL_OR_EXTENDED_TLDS = [
  'top',
  'xyz',
  'club',
  'online',
  'site',
  'work',
  'info',
  'vip',
  'tech',
  'cc',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'biz',
  'cam',
  'fit',
  'cfd',
  'icu',
  'monster',
  'download',
  'support',
  'link',
  'click',
  'account',
];

const KNOWN_BRANDS: Record<string, string[]> = {
  vietcombank: ['vietcombank.com.vn', 'vcb.com.vn'],
  vcb: ['vietcombank.com.vn', 'vcb.com.vn'],
  techcombank: ['techcombank.com.vn', 'techcombank.com'],
  agribank: ['agribank.com.vn'],
  bidv: ['bidv.com.vn'],
  mbbank: ['mbbank.com.vn'],
  acb: ['acb.com.vn'],
  tpbank: ['tpb.vn', 'tpbank.com.vn'],
  vpbank: ['vpbank.com.vn'],
  momo: ['momo.vn'],
  zalo: ['zalo.me', 'zalo.vn'],
  shopee: ['shopee.vn'],
  lazada: ['lazada.vn'],
  facebook: ['facebook.com', 'fb.com'],
  google: ['google.com', 'google.com.vn'],
  paypal: ['paypal.com'],
  telegram: ['telegram.org', 't.me'],
};

const TWO_PART_TLDS = [
  'com.vn',
  'net.vn',
  'org.vn',
  'gov.vn',
  'edu.vn',
  'co.uk',
  'com.au',
  'co.jp',
];

/**
 * Parses and validates input URL strings safely without initiating any network connections.
 */
export function parseUrl(inputUrl: string): ParsedUrlResult {
  const raw = (inputUrl || '').trim();

  if (!raw) {
    return {
      rawUrl: raw,
      normalizedUrl: '',
      protocol: '',
      hostname: '',
      domain: '',
      subdomain: '',
      tld: '',
      isHttps: false,
      isValid: false,
      isIpAddress: false,
      hasUserInfo: false,
      hasNonStandardPort: false,
      urlLength: 0,
      isLongUrl: false,
      subdomainCount: 0,
      hasMultipleSubdomains: false,
      isSuspiciousTld: false,
      hasBrandImpersonation: false,
      summaryFeatures: [],
      error: 'Vui lòng nhập địa chỉ URL cần kiểm tra.',
    };
  }

  if (raw.length > 2000) {
    return {
      rawUrl: raw,
      normalizedUrl: '',
      protocol: '',
      hostname: '',
      domain: '',
      subdomain: '',
      tld: '',
      isHttps: false,
      isValid: false,
      isIpAddress: false,
      hasUserInfo: false,
      hasNonStandardPort: false,
      urlLength: raw.length,
      isLongUrl: true,
      subdomainCount: 0,
      hasMultipleSubdomains: false,
      isSuspiciousTld: false,
      hasBrandImpersonation: false,
      summaryFeatures: [],
      error: 'Độ dài đường dẫn URL vượt quá 2,000 ký tự.',
    };
  }

  // Basic sanity check: reject strings containing whitespace or obvious non-URL text
  if (/\s/.test(raw)) {
    return {
      rawUrl: raw,
      normalizedUrl: '',
      protocol: '',
      hostname: '',
      domain: '',
      subdomain: '',
      tld: '',
      isHttps: false,
      isValid: false,
      isIpAddress: false,
      hasUserInfo: false,
      hasNonStandardPort: false,
      urlLength: raw.length,
      isLongUrl: false,
      subdomainCount: 0,
      hasMultipleSubdomains: false,
      isSuspiciousTld: false,
      hasBrandImpersonation: false,
      summaryFeatures: [],
      error: 'Định dạng đường dẫn URL không hợp lệ (chứa khoảng trắng). Vui lòng nhập địa chỉ web dạng: https://example.com',
    };
  }

  let urlToParse = raw;
  const schemeMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9+-.]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const ALLOWED_SCHEMES = ['http', 'https'];
    if (!ALLOWED_SCHEMES.includes(scheme)) {
      return {
        rawUrl: raw,
        normalizedUrl: '',
        protocol: `${scheme}:`,
        hostname: '',
        domain: '',
        subdomain: '',
        tld: '',
        isHttps: false,
        isValid: false,
        isIpAddress: false,
        hasUserInfo: false,
        hasNonStandardPort: false,
        urlLength: raw.length,
        isLongUrl: false,
        subdomainCount: 0,
        hasMultipleSubdomains: false,
        isSuspiciousTld: false,
        hasBrandImpersonation: false,
        summaryFeatures: [],
        error: `Giao thức "${scheme}:" không được hỗ trợ vì lý do an toàn. Chỉ chấp nhận các đường dẫn web http:// hoặc https://.`,
      };
    }
  } else {
    urlToParse = 'http://' + urlToParse;
  }

  try {
    const parsed = new URL(urlToParse);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const isHttps = protocol === 'https:';

    // Must have at least one dot in hostname unless it's 'localhost' or an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const isIpAddress = ipv4Regex.test(hostname) || hostname.startsWith('[');

    if (!hostname.includes('.') && hostname !== 'localhost' && !isIpAddress) {
      return {
        rawUrl: raw,
        normalizedUrl: '',
        protocol,
        hostname,
        domain: hostname,
        subdomain: '',
        tld: '',
        isHttps,
        isValid: false,
        isIpAddress: false,
        hasUserInfo: false,
        hasNonStandardPort: false,
        urlLength: raw.length,
        isLongUrl: false,
        subdomainCount: 0,
        hasMultipleSubdomains: false,
        isSuspiciousTld: false,
        hasBrandImpersonation: false,
        summaryFeatures: [],
        error: 'Định dạng đường dẫn URL không hợp lệ. Vui lòng nhập địa chỉ web đầy đủ dạng: https://example.com',
      };
    }

    // Extract TLD, Domain, and Subdomain
    const parts = hostname.split('.');
    let tld = '';
    let domain = hostname;
    let subdomain = '';

    if (!isIpAddress && parts.length >= 2) {
      const lastTwo = parts.slice(-2).join('.');
      if (TWO_PART_TLDS.includes(lastTwo) && parts.length >= 3) {
        domain = parts.slice(-3).join('.');
        tld = lastTwo;
        subdomain = parts.slice(0, -3).join('.');
      } else {
        domain = parts.slice(-2).join('.');
        tld = parts[parts.length - 1];
        subdomain = parts.slice(0, -2).join('.');
      }
    }

    const subdomainParts = subdomain ? subdomain.split('.') : [];
    const subdomainCount = subdomainParts.length;
    const hasMultipleSubdomains = subdomainCount >= 2;

    const isSuspiciousTld = NOVEL_OR_EXTENDED_TLDS.includes(tld);

    // UserInfo & @ symbol trick check
    const hasUserInfo = Boolean(parsed.username || raw.match(/https?:\/\/[^/]*@/i));
    const userInfoText = parsed.username || undefined;

    // Port check
    const port = parsed.port;
    const hasNonStandardPort = Boolean(
      port &&
        ((protocol === 'http:' && port !== '80') ||
          (protocol === 'https:' && port !== '443'))
    );

    // URL Length
    const urlLength = raw.length;
    const isLongUrl = urlLength > 75;

    // Brand Impersonation check
    let hasBrandImpersonation = false;
    let impersonatedBrand: string | undefined;

    const fullStringToCheck = `${hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
    for (const [brand, officialDomains] of Object.entries(KNOWN_BRANDS)) {
      if (fullStringToCheck.includes(brand)) {
        const matchesOfficial = officialDomains.some((official) =>
          domain.endsWith(official)
        );
        if (!matchesOfficial) {
          hasBrandImpersonation = true;
          impersonatedBrand = brand;
          break;
        }
      }
    }

    // Generate human-readable structural features in Vietnamese
    const summaryFeatures: string[] = [];

    if (isHttps) {
      summaryFeatures.push('Sử dụng giao thức mã hóa HTTPS.');
    } else {
      summaryFeatures.push('Sử dụng giao thức truyền tin chưa mã hóa HTTP (không có HTTPS).');
    }

    if (isIpAddress) {
      summaryFeatures.push(`Địa chỉ máy chủ là IP thô (${hostname}) thay cho tên miền có định danh.`);
    } else if (domain) {
      summaryFeatures.push(`Tên miền chính (Root domain): ${domain}`);
    }

    if (hasUserInfo) {
      summaryFeatures.push(
        `Chứa kỹ thuật ẩn danh / giả mạo thông qua ký tự '@' (${userInfoText || 'chứa thông tin xác thực giả'}).`
      );
    }

    if (hasBrandImpersonation && impersonatedBrand) {
      summaryFeatures.push(
        `Chứa từ khóa thương hiệu "${impersonatedBrand}" trên tên miền/đường dẫn không thuộc kênh chính thức (${domain}).`
      );
    }

    if (hasMultipleSubdomains) {
      summaryFeatures.push(`Địa chỉ có nhiều cấp tên miền con (${subdomainCount} cấp subdomain: ${subdomain}).`);
    }

    if (isSuspiciousTld) {
      summaryFeatures.push(`Đuôi tên miền mở rộng (.${tld}) (tín hiệu ngữ cảnh bổ sung, không phải bằng chứng vi phạm độc lập).`);
    }

    if (hasNonStandardPort) {
      summaryFeatures.push(`Sử dụng cổng dịch vụ phi tiêu chuẩn (Port: ${port}).`);
    }

    if (isLongUrl) {
      summaryFeatures.push(`Độ dài chuỗi URL tương đối lớn (${urlLength} ký tự).`);
    }

    return {
      rawUrl: raw,
      normalizedUrl: parsed.toString(),
      protocol,
      hostname,
      domain,
      subdomain,
      tld,
      isHttps,
      isValid: true,
      isIpAddress,
      ipAddress: isIpAddress ? hostname : undefined,
      hasUserInfo,
      userInfoText,
      hasNonStandardPort,
      port,
      urlLength,
      isLongUrl,
      subdomainCount,
      hasMultipleSubdomains,
      isSuspiciousTld,
      hasBrandImpersonation,
      impersonatedBrand,
      summaryFeatures,
    };
  } catch {
    return {
      rawUrl: raw,
      normalizedUrl: '',
      protocol: '',
      hostname: '',
      domain: '',
      subdomain: '',
      tld: '',
      isHttps: false,
      isValid: false,
      isIpAddress: false,
      hasUserInfo: false,
      hasNonStandardPort: false,
      urlLength: raw.length,
      isLongUrl: false,
      subdomainCount: 0,
      hasMultipleSubdomains: false,
      isSuspiciousTld: false,
      hasBrandImpersonation: false,
      summaryFeatures: [],
      error: 'Định dạng đường dẫn URL không hợp lệ. Vui lòng nhập địa chỉ web có dạng: https://example.com',
    };
  }
}
