import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateCode128Svg as barcode128Svg } from './barcode128';

export interface VerificationPayloadData {
  docType: string;
  docNumber: string;
  clientName: string;
  taxId?: string;
  fiscalYear?: number | string;
  issueDate?: string;
  date?: string;
  totalAmount?: number;
  amount?: number;
  netProfit?: number;
  auditorName?: string;
  licenseNumber?: string;
  verificationCode?: string;
  securityHash?: string;
  [key: string]: any;
}

export function formatEgyptianCurrency(
  amount: number | string | null | undefined,
  includeSymbol = false
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return includeSymbol ? '0 ج.م' : '0';
  const formatted = Math.round(num).toLocaleString('ar-EG');
  return includeSymbol ? `${formatted} ج.م` : formatted;
}

export function formatNumber(amount: number | string | null | undefined, decimals = 0): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return '0';
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseFlexibleNumber(val: string | number | null | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let str = String(val).trim();
  str = str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  const isParenNegative = /^\(.*\)$/.test(str);
  str = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  return isParenNegative ? -Math.abs(parsed) : parsed;
}

export function generateDocumentSecurityHash(...args: any[]): string {
  const payload = args.map((a) => String(a ?? '')).join('|');
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0, ch; i < payload.length; i++) {
    ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).toUpperCase().padStart(12, '0');
  return `MG-SEC-${hex}`;
}

export function buildVerificationUrl(payload: VerificationPayloadData | string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://marei-cpa.eg';
  if (typeof payload === 'string') {
    return `${origin}/?verify=${encodeURIComponent(payload)}`;
  }
  const code = payload.verificationCode || payload.docNumber || generateDocumentSecurityHash(JSON.stringify(payload));
  return `${origin}/?verify=${encodeURIComponent(code)}&doc=${encodeURIComponent(payload.docNumber || '')}`;
}

export function buildVerificationQrText(payload: VerificationPayloadData | string): string {
  return buildVerificationUrl(payload);
}

export function buildHumanReadableDigitalSeal(payload: VerificationPayloadData | string): string {
  if (typeof payload === 'string') return payload;
  return [
    `[ختم توثيق رقمي معتمد]`,
    `الوثيقة: ${payload.docType || 'مستند رسمي'} (${payload.docNumber || '-'})`,
    `العميل: ${payload.clientName || '-'}`,
    `التاريخ: ${payload.issueDate || payload.date || new Date().toISOString().slice(0, 10)}`,
    `المحاسب القانوني: ${payload.auditorName || 'محمد جميل مرعي'} - ${payload.licenseNumber || 'س.م.م 43122'}`,
    `كود التحقق: ${payload.verificationCode || payload.securityHash || generateDocumentSecurityHash(payload.docNumber, payload.clientName)}`,
  ].join('\n');
}

export function generateCode128Svg(
  text: string,
  heightOrOptions: number | { height?: number; moduleWidth?: number; showText?: boolean } = 36,
  showText = true
): string {
  if (typeof heightOrOptions === 'object' && heightOrOptions !== null) {
    return barcode128Svg(text, heightOrOptions);
  }
  const numericHeight = typeof heightOrOptions === 'number' ? heightOrOptions : 36;
  return barcode128Svg(text, { height: numericHeight, showText });
}

export function buildFinancialStatementsQrText(params: {
  companyName: string;
  taxId?: string;
  fiscalYear: number | string;
  totalAssets: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalRevenues?: number;
  netProfit: number;
  auditorName?: string;
  licenseNumber?: string;
  verificationCode?: string;
  securityHash?: string;
  version?: number;
  status?: 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | string;
  supersededAt?: string;
  supersededByVersion?: number;
  supersededByVerificationCode?: string;
  statementId?: string;
  clientId?: string;
  [key: string]: any;
}): string {
  const code =
    params.verificationCode ||
    generateDocumentSecurityHash(
      params.companyName,
      params.fiscalYear,
      params.version || 1,
      params.totalAssets,
      params.netProfit
    );
  const isSuperseded = Boolean(params.status === 'SUPERSEDED' || params.supersededAt);
  const supDate = (params.supersededAt || '').slice(0, 10);
  const statusText = isSuperseded
    ? `هذا الإصدار تم استبداله بإصدار أحدث بتاريخ ${supDate}${
        params.supersededByVersion ? ` (الإصدار رقم ${params.supersededByVersion})` : ''
      }`
    : params.status === 'DRAFT'
    ? 'مسودة غير معتمدة'
    : 'سليم';

  const parts = [
    `CPA-FS-CERTIFIED`,
    `CO:${params.companyName}`,
    `TAX:${params.taxId || 'N/A'}`,
    `FY:${params.fiscalYear}`,
    `VER:${params.version || 1}`,
    `STATUS:${statusText}`,
    `ASSETS:${Math.round(Number(params.totalAssets) || 0)}`,
    ...(params.totalLiabilities !== undefined
      ? [`LIAB:${Math.round(Number(params.totalLiabilities) || 0)}`]
      : []),
    ...(params.totalEquity !== undefined
      ? [`EQ:${Math.round(Number(params.totalEquity) || 0)}`]
      : []),
    ...(params.totalRevenues !== undefined
      ? [`REV:${Math.round(Number(params.totalRevenues) || 0)}`]
      : []),
    `NET:${Math.round(Number(params.netProfit) || 0)}`,
    `AUD:${params.auditorName || ''}`,
    ...(params.licenseNumber ? [`LIC:${params.licenseNumber}`] : []),
    ...(params.securityHash ? [`SHA256:${params.securityHash}`] : []),
    `CODE:${code}`,
    `كود التحقق: ${code}`,
  ];
  if (isSuperseded && params.supersededByVerificationCode) {
    parts.push(`NEW_CODE:${params.supersededByVerificationCode}`);
  }
  return parts.join('|');
}

export function buildAuditorReportQrText(params: {
  companyName: string;
  fiscalYear: number | string;
  opinionType?: string;
  opinion?: string;
  reportDate?: string;
  auditorName?: string;
  licenseNumber?: string;
  totalAssets?: number;
  totalRevenues?: number;
  netProfit?: number;
  version?: number;
  status?: 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | string;
  supersededAt?: string;
  supersededByVersion?: number;
  verificationCode?: string;
  reportId?: string;
  [key: string]: any;
}): string {
  const rDate = params.reportDate || new Date().toISOString().slice(0, 10);
  const opinionVal = String(params.opinionType || params.opinion || '').trim();
  const isSuperseded = Boolean(params.status === 'SUPERSEDED' || params.supersededAt);
  const statusText = isSuperseded
    ? `هذا الإصدار تم استبداله بإصدار أحدث بتاريخ ${(params.supersededAt || '').slice(0, 10)}`
    : 'سليم';
  const code =
    params.verificationCode ||
    generateDocumentSecurityHash(
      params.companyName,
      params.fiscalYear,
      rDate,
      opinionVal,
      params.totalAssets,
      params.netProfit
    );
  return [
    `CPA-AUDIT-REPORT`,
    `CO:${params.companyName}`,
    `FY:${params.fiscalYear}`,
    `VER:${params.version || 1}`,
    `STATUS:${statusText}`,
    `OPINION:${opinionVal || 'NONE_SELECTED'}`,
    ...(params.totalAssets !== undefined
      ? [`ASSETS:${Math.round(Number(params.totalAssets) || 0)}`]
      : []),
    ...(params.totalRevenues !== undefined
      ? [`REV:${Math.round(Number(params.totalRevenues) || 0)}`]
      : []),
    ...(params.netProfit !== undefined
      ? [`NET:${Math.round(Number(params.netProfit) || 0)}`]
      : []),
    `DATE:${rDate}`,
    `AUD:${params.auditorName || ''}`,
    `LIC:${params.licenseNumber || ''}`,
    `CODE:${code}`,
    `كود التحقق: ${code}`,
  ].join('|');
}

export function buildTaxDeclarationQrText(params: {
  companyName?: string;
  taxpayerName?: string;
  taxId?: string;
  taxCardNumber?: string;
  declarationType: string;
  period?: string;
  fiscalYear?: number | string;
  netTaxPayable?: number;
  netTaxDue?: number;
  submissionDate?: string;
  [key: string]: any;
}): string {
  const co = params.companyName || params.taxpayerName || 'Taxpayer';
  const periodStr = params.period || (params.fiscalYear !== undefined ? String(params.fiscalYear) : '');
  const taxVal = params.netTaxPayable ?? params.netTaxDue ?? 0;
  return [
    `ETA-TAX-RETURN`,
    `CO:${co}`,
    `RIN:${params.taxId || params.taxCardNumber || 'N/A'}`,
    `FORM:${params.declarationType}`,
    `PERIOD:${periodStr}`,
    `TAX:${Math.round(taxVal)}`,
    `DATE:${params.submissionDate || new Date().toISOString().slice(0, 10)}`,
  ].join('|');
}

export function generateQrCodeSvg(payload: string, size = 96, _options?: any): string {
  const text = String(payload || 'MG-CPA-VERIFIED');
  const grid = 21;
  const cell = Math.floor(size / grid);
  const actualSize = cell * grid;

  let rects = '';
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7);

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (border || inner) {
          rects += `<rect x="${(c0 + c) * cell}" y="${(r0 + r) * cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, grid - 7);
  drawFinder(grid - 7, 0);

  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (isFinder(r, c)) continue;
      seed ^= (r * 31 + c * 17) & 0xff;
      seed = Math.imul(seed, 16777619);
      if ((seed >>> 0) % 2 === 0) {
        rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actualSize} ${actualSize}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${actualSize}" height="${actualSize}" fill="#ffffff"/>${rects}</svg>`;
}

export const CertifiedQrCodeReact: React.FC<{
  value: string;
  size?: number;
  title?: string;
  className?: string;
}> = ({ value, size = 84, className = '' }) => {
  return (
    <div className={`inline-flex flex-col items-center justify-center p-1.5 bg-white border border-slate-300 rounded-lg ${className}`}>
      <QRCodeSVG value={value || 'MG-CPA-VERIFIED'} size={size} level="M" includeMargin={false} />
    </div>
  );
};
