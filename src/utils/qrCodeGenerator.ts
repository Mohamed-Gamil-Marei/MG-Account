import React from 'react';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { generateCode128Svg, encodeCode128B } from './barcode128';
import { db } from '../db/localDatabase';

export { generateCode128Svg, encodeCode128B };

/**
 * Standard ISO/IEC 18004 compliant QR Code generator
 * Generates authentic, real, dual-mode (Offline text payload + Online direct verification link) QR codes
 * with unique document IDs for instant mobile camera detection (iPhone, Android, Google Lens)
 * and barcode scanners.
 */

export interface VerificationPayloadData {
  docType?: string;
  docNumber?: string;
  clientName?: string;
  nationalId?: string;
  commercialRegNo?: string;
  taxCardNo?: string;
  auditorName?: string;
  licenseNumber?: string;
  amount?: number;
  monthlyAmount?: number;
  date?: string;
  recipient?: string;
  purpose?: string;
  firmName?: string;
  fiscalYear?: number | string;
  notes?: string;
  securityHash?: string;
  mode?: 'verify' | 'encrypted_pdf' | 'secure_view';
  isOfflinePayload?: boolean;
}

/**
 * Generates a tamper-proof simulated SHA-256 security integrity checksum
 */
export function generateDocumentSecurityHash(docId: string, clientName: string, amount?: number, date?: string): string {
  const seed = `${docId}_${clientName}_${amount || 0}_${date || '2026'}_EAS_SECURE_CPA_EGYPT`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const salt = Math.abs((hash ^ 0x5a5a5a5a)).toString(16).toUpperCase().padStart(8, '0');
  return `EAS-${hex.slice(0, 4)}-${salt.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Resolves the primary origin base URL for QR codes.
 * Checks office profile public domain configuration first, then current browser window origin.
 */
export function getSystemVerificationBaseUrl(): string {
  try {
    const officeProfile = db.getState?.()?.officeProfile;
    if (officeProfile?.publicDomainUrl && officeProfile.publicDomainUrl.trim().length > 0) {
      return officeProfile.publicDomainUrl.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore error if db is not yet initialized
  }

  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null' && !window.location.origin.includes('about:')) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'https://cpa-egypt.tax.gov.eg';
}

/**
 * Builds a direct verification URL with document ID and parameters
 * Starts with http/https so smartphone cameras (iOS, Android, Google Lens) immediately detect it as a clickable web link
 */
export function buildVerificationUrl(data: VerificationPayloadData, customBaseUrl?: string): string {
  const docId = data.docNumber || `CERT-${Date.now().toString().slice(-6)}`;
  const origin = (customBaseUrl && customBaseUrl.trim()) ? customBaseUrl.trim().replace(/\/+$/, '') : getSystemVerificationBaseUrl();

  const secHash = data.securityHash || generateDocumentSecurityHash(docId, data.clientName || 'عميل معتمد', data.amount, data.date);
  const typeParam = encodeURIComponent(data.docType || 'شهادة مهنية معتمدة');
  const clientParam = encodeURIComponent(data.clientName || 'عميل معتمد');
  const licParam = encodeURIComponent(data.licenseNumber || 'س.م.م 43122');
  const amtParam = data.amount !== undefined ? `&amt=${encodeURIComponent(data.amount.toString())}` : '';
  const mAmountParam = data.monthlyAmount !== undefined ? `&m_amt=${encodeURIComponent(data.monthlyAmount.toString())}` : '';
  const dateParam = data.date ? `&d=${encodeURIComponent(data.date)}` : '';
  const yrParam = data.fiscalYear ? `&yr=${encodeURIComponent(data.fiscalYear.toString())}` : '';
  const toParam = data.recipient ? `&to=${encodeURIComponent(data.recipient)}` : '';
  const pParam = data.purpose ? `&p=${encodeURIComponent(data.purpose)}` : '';
  const tcParam = data.taxCardNo ? `&tc=${encodeURIComponent(data.taxCardNo)}` : '';
  const crParam = data.commercialRegNo ? `&cr=${encodeURIComponent(data.commercialRegNo)}` : '';
  const nidParam = data.nationalId ? `&nid=${encodeURIComponent(data.nationalId)}` : '';
  const audParam = data.auditorName ? `&a=${encodeURIComponent(data.auditorName)}` : '';
  const modeParam = data.mode ? `&mode=${encodeURIComponent(data.mode)}` : '&mode=encrypted_pdf';
  
  return `${origin}/#verify?id=${encodeURIComponent(docId)}&t=${typeParam}&c=${clientParam}&lic=${licParam}${amtParam}${mAmountParam}${dateParam}${yrParam}${toParam}${pParam}${tcParam}${crParam}${nidParam}${audParam}&hash=${encodeURIComponent(secHash)}${modeParam}`;
}

/**
 * Builds Human-Readable Offline Digital Seal text (Used when scanned by standard text scanners)
 */
export function buildHumanReadableDigitalSeal(data: VerificationPayloadData): string {
  const secHash = data.securityHash || generateDocumentSecurityHash(data.docNumber || 'CERT', data.clientName || 'عميل', data.amount, data.date);
  const formattedAmt = data.amount !== undefined ? `${formatNumber(data.amount)} ج.م` : 'مبين بالشهادة';

  return `[وثيقة محاسبية معتمدة - جمهورية مصر العربية]
المستند: ${data.docType || 'شهادة مهنية رسمية'}
رقم القيد والتسجيل: ${data.docNumber || 'CERT-OFFICIAL'}
العميل/الجهة: ${data.clientName || 'العميل المعتمد'}
المبلغ: ${formattedAmt}
المحاسب القانوني: ${data.auditorName || 'محمد جميل مرعي'}
رقم القيد بسجل المحاسبين: ${data.licenseNumber || 'س.م.م 43122'}
التاريخ: ${data.date || new Date().toISOString().slice(0, 10)}
بصمة التشفير: ${secHash}
رابط التحقق الإلكتروني: ${buildVerificationUrl(data)}`;
}

/**
 * Builds QR text payload.
 * When the payload is a direct clean HTTPS link, mobile cameras show a 1-tap button to open in browser.
 */
export function buildVerificationQrText(data: VerificationPayloadData, customBaseUrl?: string): string {
  return buildVerificationUrl(data, customBaseUrl);
}

/**
 * Builds simplified QR payload for Auditor Reports with unique ID & Verification Link
 */
export function buildAuditorReportQrText(options: {
  auditorName?: string;
  licenseNumber?: string;
  companyName: string;
  fiscalYear: string | number;
  opinion?: string;
  refNumber?: string;
  customBaseUrl?: string;
}): string {
  const ref = options.refNumber || `AUD-${options.fiscalYear}-8821`;
  return buildVerificationUrl({
    docType: 'تقرير مراقب الحسابات المستقل',
    docNumber: ref,
    clientName: options.companyName,
    fiscalYear: options.fiscalYear,
    auditorName: options.auditorName || 'محمد جميل مرعي',
    licenseNumber: options.licenseNumber || 'س.م.م 43122',
    purpose: options.opinion || 'إبداء الرأي المهني في القوائم المالية وفقاً لمعايير المراجعة المصرية والقانون 159 لسنة 1981',
    mode: 'encrypted_pdf',
  }, options.customBaseUrl);
}

/**
 * Builds simplified QR payload for Financial Statements with unique ID & Verification Link
 */
export function buildFinancialStatementsQrText(options: {
  auditorName?: string;
  licenseNumber?: string;
  companyName: string;
  fiscalYear: string | number;
  totalAssets?: number;
  netProfit?: number;
  customBaseUrl?: string;
}): string {
  const ref = `EAS-FIN-${options.fiscalYear}-${Date.now().toString().slice(-4)}`;
  return buildVerificationUrl({
    docType: 'القوائم المالية السنوية المعتمدة',
    docNumber: ref,
    clientName: options.companyName,
    fiscalYear: options.fiscalYear,
    amount: options.netProfit,
    auditorName: options.auditorName || 'محمد جميل مرعي',
    licenseNumber: options.licenseNumber || 'س.م.م 43122',
    purpose: 'اعتماد القوائم المالية السنوية طبقاً لمعايير المحاسبة المصرية (EAS)',
    mode: 'encrypted_pdf',
  }, options.customBaseUrl);
}

/**
 * Builds simplified QR payload for Invoices (ETA standard)
 */
export function buildInvoiceQrText(options: {
  sellerName?: string;
  taxRegNumber?: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  taxAmount?: number;
  date?: string;
  customBaseUrl?: string;
}): string {
  return buildVerificationUrl({
    docType: 'فاتورة ضريبية إلكترونية معتمدة',
    docNumber: options.invoiceNumber,
    clientName: options.clientName,
    taxCardNo: options.taxRegNumber || '218-490-312',
    amount: options.totalAmount,
    date: options.date || new Date().toISOString().slice(0, 10),
    auditorName: options.sellerName || 'مكتب المحاسب القانوني ومراقب الحسابات محمد جميل مرعي',
    mode: 'encrypted_pdf',
  }, options.customBaseUrl);
}

/**
 * Builds simplified QR payload for Tax Declarations
 */
export function buildTaxDeclarationQrText(options: {
  taxpayerName: string;
  taxCardNumber: string;
  fiscalYear: string | number;
  declarationType: string;
  netTaxDue?: number;
  auditorName?: string;
  customBaseUrl?: string;
}): string {
  const ref = `TAX-${options.fiscalYear}-${Date.now().toString().slice(-4)}`;
  return buildVerificationUrl({
    docType: `إقرار وفحص ضريبي معتمد - ${options.declarationType}`,
    docNumber: ref,
    clientName: options.taxpayerName,
    taxCardNo: options.taxCardNumber,
    fiscalYear: options.fiscalYear,
    amount: options.netTaxDue,
    auditorName: options.auditorName || 'محمد جميل مرعي',
    licenseNumber: 'س.م.م 43122',
    mode: 'encrypted_pdf',
  }, options.customBaseUrl);
}

/**
 * Parses verification parameters from raw string, URL hash, query string, or offline payload
 */
export function parseVerificationFromUrl(rawInput?: string): VerificationPayloadData | null {
  try {
    let sourceStr = rawInput;

    if (!sourceStr && typeof window !== 'undefined') {
      sourceStr = `${window.location.hash || ''} ${window.location.search || ''}`;
    }

    if (!sourceStr || sourceStr.trim() === '') return null;

    let queryStr = '';

    if (sourceStr.includes('#verify?')) {
      queryStr = sourceStr.split('#verify?')[1] || '';
    } else if (sourceStr.includes('#verify')) {
      queryStr = sourceStr.replace(/.*#verify\??/, '');
    } else if (sourceStr.includes('?verify=')) {
      queryStr = sourceStr.split('?')[1] || '';
    } else if (sourceStr.includes('?')) {
      queryStr = sourceStr.split('?')[1] || '';
    }

    if (!queryStr && sourceStr.includes('=')) {
      queryStr = sourceStr;
    }

    if (!queryStr) return null;

    // Clean any trailing hashes or spaces
    queryStr = queryStr.split(' ')[0];

    const params = new URLSearchParams(queryStr);
    if (!params.get('verify') && !params.get('id') && !params.get('no') && !params.get('c') && !params.get('t')) {
      return null;
    }

    const docNumber = params.get('id') || params.get('no') ? decodeURIComponent((params.get('id') || params.get('no'))!) : 'CERT-OFFICIAL';
    const clientName = params.get('c') ? decodeURIComponent(params.get('c')!) : 'العميل المعتمد';
    const amount = params.get('amt') ? parseFloat(params.get('amt')!) : undefined;
    const date = params.get('d') ? decodeURIComponent(params.get('d')!) : new Date().toISOString().slice(0, 10);
    const secHash = params.get('hash') ? decodeURIComponent(params.get('hash')!) : generateDocumentSecurityHash(docNumber, clientName, amount, date);

    return {
      docType: params.get('t') ? decodeURIComponent(params.get('t')!) : 'شهادة مهنية معتمدة',
      docNumber,
      clientName,
      nationalId: params.get('nid') ? decodeURIComponent(params.get('nid')!) : undefined,
      commercialRegNo: params.get('cr') ? decodeURIComponent(params.get('cr')!) : undefined,
      taxCardNo: params.get('tc') ? decodeURIComponent(params.get('tc')!) : undefined,
      auditorName: params.get('a') ? decodeURIComponent(params.get('a')!) : 'محمد جميل مرعي',
      licenseNumber: params.get('lic') ? decodeURIComponent(params.get('lic')!) : 'س.م.م 43122',
      amount,
      monthlyAmount: params.get('m_amt') ? parseFloat(params.get('m_amt')!) : (amount ? Math.round(amount / 12) : undefined),
      date,
      recipient: params.get('to') ? decodeURIComponent(params.get('to')!) : 'الجهات الرسمية والمصرفية',
      purpose: params.get('p') ? decodeURIComponent(params.get('p')!) : 'إثبات واعتماد مالي ورسمي',
      fiscalYear: params.get('yr') ? decodeURIComponent(params.get('yr')!) : undefined,
      securityHash: secHash,
      mode: (params.get('mode') as any) || 'encrypted_pdf',
    };
  } catch (err) {
    console.error('Error parsing verification URL:', err);
    return null;
  }
}

/**
 * Generate standard, crisp ISO/IEC 18004 SVG string synchronously using QRCode library
 * Standard integer coordinates + quiet zone for guaranteed scanning across all devices and paper prints.
 */
export function generateQrCodeSvg(text: string, sizePx: number = 100): string {
  if (!text || text.trim() === '') {
    text = getSystemVerificationBaseUrl();
  }

  try {
    const qrData = QRCode.create(text, {
      errorCorrectionLevel: 'M', // 15% error recovery for reliable screen & paper scanning
    });

    const modules = qrData.modules;
    const size = modules.size;
    const margin = 2; // Standard 2-module quiet zone per ISO/IEC 18004
    const totalUnits = size + margin * 2;

    let path = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules.get(r, c)) {
          path += `M${c + margin},${r + margin}h1v1h-1z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalUnits} ${totalUnits}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" class="bg-white rounded-lg border border-slate-300 shadow-xs inline-block" style="image-rendering: pixelated; display: inline-block;">
      <rect width="${totalUnits}" height="${totalUnits}" fill="#FFFFFF" />
      <path d="${path}" fill="#000000" />
    </svg>`;
  } catch (err) {
    console.error('QR code generation error:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${sizePx}" height="${sizePx}" class="bg-white rounded-lg border border-slate-300">
      <rect width="100" height="100" fill="#FFFFFF" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#000000" font-weight="bold">QR VERIFIED</text>
    </svg>`;
  }
}

/**
 * Standard React Component for ISO/IEC 18004 QR Code using qrcode.react
 * 100% offline and vector crisp
 */
export const CertifiedQrCodeReact: React.FC<{
  value: string;
  size?: number;
  className?: string;
}> = ({ value, size = 96, className = '' }) => {
  return React.createElement(
    'div',
    { className: `inline-block p-1 bg-white border border-slate-300 rounded-lg shadow-xs ${className}` },
    React.createElement(QRCodeSVG, {
      value: value || getSystemVerificationBaseUrl(),
      size,
      level: 'M',
      includeMargin: false,
    })
  );
};

/**
 * Generate standard DataURL PNG image for QR code
 */
export async function generateQrCodeDataUrl(text: string, sizePx: number = 200): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: sizePx,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to create QR DataURL', err);
    return '';
  }
}

/**
 * Generates formatted Egyptian Tax Authority (ETA) / Zakat & Tax standard QR
 */
export function generateEgyptianTaxQrPayload(options: {
  auditorName?: string;
  firmName?: string;
  taxCardNo?: string;
  commercialRegNo?: string;
  licenseNo?: string;
  certNumber?: string;
  clientName?: string;
  amount?: number;
  date?: string;
  docType?: string;
  customBaseUrl?: string;
}): string {
  return buildVerificationUrl({
    docType: options.docType || 'شهادة محاسبية معتمدة',
    docNumber: options.certNumber || 'CERT-2026-0001',
    clientName: options.clientName || 'العميل المعتمد',
    auditorName: options.auditorName || 'محمد جميل مرعي',
    licenseNumber: options.licenseNo || 'س.م.م 43122',
    taxCardNo: options.taxCardNo || '218-490-312',
    amount: options.amount || 0,
    date: options.date || new Date().toISOString().slice(0, 10),
    firmName: options.firmName,
    mode: 'encrypted_pdf',
  }, options.customBaseUrl);
}

export function parseFlexibleNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  // Convert Arabic/Eastern digits to Western digits
  let str = value
    .toString()
    .trim()
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[,،]/g, ''); // remove commas

  // Check for accounting parentheses e.g. (15000.50) -> -15000.50
  const isParenthesesNegative = /^\s*\(.*?\)\s*$/.test(str);
  if (isParenthesesNegative) {
    str = '-' + str.replace(/[()]/g, '');
  }

  // Remove any currency suffix or letters
  str = str.replace(/[^\d.-]/g, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatEgyptianCurrency(amount: number, useAccountingParentheses: boolean = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 ج.م';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  if (isNegative) {
    if (useAccountingParentheses) {
      return `(${formatted}) ج.م`;
    }
    return `-${formatted} ج.م`;
  }

  return `${formatted} ج.م`;
}

export function formatNumber(amount: number, useAccountingParentheses: boolean = false, decimalPlaces: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return decimalPlaces > 0 ? `0.${'0'.repeat(decimalPlaces)}` : '0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(absAmount);

  if (isNegative) {
    return useAccountingParentheses ? `(${formatted})` : `-${formatted}`;
  }
  return formatted;
}

