import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Building2,
  Calendar,
  Hash,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { generateQrCodeSvg } from '../../utils/qrCodeGenerator';
import { MgBrandBadge } from './MgBrandBadge';

export interface PrintLayoutProps {
  id?: string;
  documentTitle?: string;
  title?: string;
  documentSubtitle?: string;
  subtitle?: string;
  documentRefNumber?: string;
  documentNumber?: string;
  documentDate?: string;
  date?: string;
  companyName?: string;
  clientName?: string;
  companyTaxNumber?: string;
  companyCommercialReg?: string;
  fiscalYear?: number | string;
  currentPage?: number;
  totalPages?: number;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | string;
  qrPayload?: string;
  children: React.ReactNode;
  showSignatureStamp?: boolean;
  notes?: string;
  isOpen?: boolean;
  onClose?: () => void;
  watermarkText?: string;
  showLetterhead?: boolean;
}

export interface PrintLayoutOptions {
  title?: string;
  subtitle?: string;
  documentNumber?: string;
  clientName?: string;
  date?: string;
  fiscalYear?: string | number;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | string;
  showLetterhead?: boolean;
  showStamp?: boolean;
  showPageNumber?: boolean;
  currentPage?: number;
  totalPages?: number;
  onAfterPrint?: () => void;
}

/**
 * دالة مساعدة معتمدة لطباعة أي عنصر مع حزمة التنسيق الموحدة:
 * خط Cairo، اتجاه RTL، مقاس A4، هيدر المكتب بالشعار، التاريخ، ورقم الصفحة
 */
export async function printElementWithPrintLayout(
  elementIdOrSelector: string,
  options?: PrintLayoutOptions
): Promise<boolean> {
  const cleanId = elementIdOrSelector.replace(/^#/, '');
  const el = document.getElementById(cleanId) || document.querySelector<HTMLElement>(elementIdOrSelector);

  if (!el) {
    console.warn(`[PrintLayout] Target element '${elementIdOrSelector}' not found. Falling back to window.print()`);
    window.print();
    return false;
  }

  const office = db.getState().officeProfile;
  const officeName = office?.firmName || office?.auditorName || 'مكتب المحاسب القانوني / محمد جميل مرعي';
  const officeTitle = office?.title || 'محاسب ومراجع قانوني - خبير ضرائب واستشارات مالية';
  const licenseNumber = office?.licenseNumber || 'سجل المحاسبين والمراجعين رقم 43122';
  const taxNumber = office?.taxAuthorityRegNo || '654-987-321';
  const phone = office?.phone || office?.mobile || '01003335360';
  const logoUrl = office?.logoUrl || '';

  const docTitle = options?.title || 'وثيقة رسمية معتمدة';
  const docSubtitle = options?.subtitle || '';
  const docRef = options?.documentNumber || '';
  const docDate =
    options?.date ||
    new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const orientation = options?.orientation || 'portrait';
  const pageSize = options?.pageSize || 'A4';
  const clientName = options?.clientName || '';
  const fiscalYear = options?.fiscalYear ? String(options.fiscalYear) : '';
  const showLetterhead = options?.showLetterhead !== false;
  const showStamp = options?.showStamp !== false;
  const showPageNumber = options?.showPageNumber !== false;
  const currentPage = options?.currentPage || 1;
  const totalPages = options?.totalPages || 1;

  // Check if target element already contains an official print header
  const hasExistingHeader = !!el.querySelector('.official-header, [data-official-header="true"]');

  // Create isolated print iframe
  let printIframe = document.getElementById('unified-print-layout-iframe') as HTMLIFrameElement;
  if (!printIframe) {
    printIframe = document.createElement('iframe');
    printIframe.id = 'unified-print-layout-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0px';
    printIframe.style.height = '0px';
    printIframe.style.border = 'none';
    printIframe.style.opacity = '0';
    printIframe.style.pointerEvents = 'none';
    printIframe.style.zIndex = '-9999';
    document.body.appendChild(printIframe);
  }

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return false;
  }

  // Clone content safely and convert inputs to static text
  const cloned = el.cloneNode(true) as HTMLElement;
  const originalInputs = el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea'
  );
  const clonedInputs = cloned.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea'
  );

  originalInputs.forEach((orig, idx) => {
    const cloneInput = clonedInputs[idx];
    if (!cloneInput) return;

    const span = document.createElement('span');
    span.className = 'print-input-text font-bold';
    if (orig instanceof HTMLInputElement && (orig.type === 'checkbox' || orig.type === 'radio')) {
      span.textContent = orig.checked ? '☑' : '☐';
    } else {
      span.textContent = orig.value || '—';
    }
    cloneInput.parentNode?.replaceChild(span, cloneInput);
  });

  // Extract all existing CSS styles
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => s.outerHTML)
    .join('\n');

  // Build office header HTML if needed
  const headerHtml =
    showLetterhead && !hasExistingHeader
      ? `
      <header class="official-print-header" style="border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; direction: rtl; text-align: right;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="شعار المكتب" style="width: 58px; height: 58px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; padding: 2px;" />`
                : `<div style="width: 52px; height: 52px; border-radius: 10px; background: #0f172a; color: #fbbf24; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1.5px solid #d97706;">MG</div>`
            }
            <div>
              <h1 style="font-size: 17px; font-weight: 900; margin: 0 0 3px 0; color: #0f172a;">${officeName}</h1>
              <p style="font-size: 11px; font-weight: 700; margin: 0 0 4px 0; color: #047857;">${officeTitle}</p>
              <div style="font-size: 10px; color: #475569; display: flex; gap: 12px; flex-wrap: wrap;">
                <span><strong>ترخيص:</strong> <span style="font-family: monospace;">${licenseNumber}</span></span>
                <span><strong>ب.ض:</strong> <span style="font-family: monospace;">${taxNumber}</span></span>
                <span><strong>هاتف:</strong> <span style="font-family: monospace;">${phone}</span></span>
              </div>
            </div>
          </div>

          <div style="text-align: left; font-size: 10.5px; color: #334155; line-height: 1.6;">
            ${docRef ? `<div><strong>الرقم المرجعي:</strong> <span style="font-family: monospace; font-weight: 700; background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${docRef}</span></div>` : ''}
            <div><strong>التاريخ:</strong> <span>${docDate}</span></div>
            ${showPageNumber ? `<div style="font-weight: 700; color: #047857;"><strong>رقم الصفحة:</strong> صفحة ${currentPage} من ${totalPages}</div>` : ''}
            ${fiscalYear ? `<div><strong>السنة المالية:</strong> <span style="font-family: monospace; font-weight: 700;">${fiscalYear}</span></div>` : ''}
          </div>
        </div>

        <div style="margin-top: 10px; padding: 6px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="font-size: 13px; font-weight: 900; margin: 0; color: #0f172a;">${docTitle}</h2>
            ${docSubtitle ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">${docSubtitle}</p>` : ''}
          </div>
          ${clientName ? `<div style="font-size: 11px; font-weight: 700; color: #065f46;">المنشأة / العميل: <span>${clientName}</span></div>` : ''}
        </div>
      </header>
    `
      : '';

  // Build footer HTML
  const footerHtml = showStamp
    ? `
      <footer class="official-print-footer" style="margin-top: 24px; padding-top: 14px; border-top: 2px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-start; font-size: 10.5px; direction: rtl;">
        <div style="text-align: right; color: #475569;">
          <div style="font-weight: 700; color: #1e293b;">إعداد ومراجعة:</div>
          <div>قسم المراجعة والتدقيق المحاسبي المعتمد</div>
          <div style="font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 2px;">نظام الرقابة المالية والحوكمة الرقمية</div>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 10px;">
          <div style="font-weight: 700; color: #0f172a;">صفحة ${currentPage} من ${totalPages}</div>
          <div style="font-size: 8.5px; margin-top: 2px;">طُبعت آلياً بتاريخ ${docDate}</div>
        </div>

        <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end;">
          <div style="font-weight: 700; color: #0f172a;">المحاسب القانوني المعتمد:</div>
          <div style="color: #047857; font-weight: 700;">${officeName}</div>
          <div style="width: 140px; height: 50px; border: 1px dashed #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; background: #fafafa; margin-top: 4px;">
            (خاتم وتوقيع المحاسب القانوني)
          </div>
        </div>
      </footer>
    `
    : '';

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle} - ${officeName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        ${styles}
        <style>
          @page {
            size: ${pageSize} ${orientation};
            margin: 8mm 8mm 10mm 8mm;
            @bottom-center {
              content: "صفحة " counter(page) " من " counter(pages);
              font-family: 'Cairo', sans-serif;
              font-size: 9pt;
              color: #64748b;
            }
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
            direction: rtl !important;
            text-align: right !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-font-smoothing: antialiased;
          }
          .unified-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            font-family: 'Cairo', sans-serif !important;
          }
          .print-page-number {
            font-family: 'Cairo', monospace !important;
          }
        </style>
      </head>
      <body>
        <div class="unified-print-container">
          ${headerHtml}
          <div class="document-body">
            ${cloned.outerHTML}
          </div>
          ${footerHtml}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for font and styles to settle then print cleanly
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        if (options?.onAfterPrint) options.onAfterPrint();
        resolve(true);
      } catch (err) {
        console.error('[PrintLayout] Printing via iframe failed, calling window.print()', err);
        window.print();
        resolve(false);
      }
    }, 280);
  });
}

/**
 * مكوّن الطباعة الموحّد (PrintLayout)
 * يتضمن:
 * 1. هيدر المكتب بالشعار
 * 2. رقم الصفحة
 * 3. التاريخ
 * 4. حجم A4
 * 5. اتجاه RTL
 * 6. خط Cairo
 */
export const PrintLayout: React.FC<PrintLayoutProps> & {
  printElement: typeof printElementWithPrintLayout;
} = ({
  id = 'unified-print-layout-canvas',
  documentTitle,
  title,
  documentSubtitle,
  subtitle,
  documentRefNumber,
  documentNumber,
  documentDate,
  date,
  companyName,
  clientName,
  companyTaxNumber,
  companyCommercialReg,
  fiscalYear = '2026',
  currentPage = 1,
  totalPages = 1,
  orientation = 'portrait',
  pageSize = 'A4',
  qrPayload,
  children,
  showSignatureStamp = true,
  notes,
  isOpen,
  onClose,
  watermarkText,
  showLetterhead = true,
}) => {
  const effectiveTitle = documentTitle || title || 'تقرير مالي معتمد';
  const effectiveSubtitle = documentSubtitle || subtitle || '';
  const effectiveRefNumber = documentRefNumber || documentNumber || '';
  const effectiveDate =
    documentDate ||
    date ||
    new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const effectiveCompanyName = companyName || clientName || '';

  // Get office profile from central local database
  const stateProfile = db.getState().officeProfile;
  const officeName = stateProfile?.firmName || stateProfile?.auditorName || 'مكتب المحاسب القانوني / محمد جميل مرعي';
  const officeTitle = stateProfile?.title || 'محاسب ومراجع قانوني - خبير ضرائب واستشارات مالية';
  const licenseNumber = stateProfile?.licenseNumber || 'سجل المحاسبين والمراجعين رقم 43122';
  const taxAuthorityRegNo = stateProfile?.taxAuthorityRegNo || '654-987-321';
  const officePhone = stateProfile?.phone || stateProfile?.mobile || '01003335360';
  const logoUrl = stateProfile?.logoUrl || '';

  const [activeOrientation, setActiveOrientation] = useState<'portrait' | 'landscape'>(orientation);

  useEffect(() => {
    setActiveOrientation(orientation);
  }, [orientation]);

  const handlePrint = () => {
    printElementWithPrintLayout(id, {
      title: effectiveTitle,
      subtitle: effectiveSubtitle,
      documentNumber: effectiveRefNumber,
      clientName: effectiveCompanyName,
      date: effectiveDate,
      fiscalYear,
      orientation: activeOrientation,
      pageSize,
      showLetterhead,
      showStamp: showSignatureStamp,
      currentPage,
      totalPages,
    });
  };

  const verificationPayload =
    qrPayload ||
    `OFFICE: ${officeName} | DOC: ${effectiveTitle} | REF: ${effectiveRefNumber || 'MG-2026'} | DATE: ${effectiveDate} | AUTH: LIC-43122`;

  const paperContent = (
    <div
      id={id}
      dir="rtl"
      className={`print-layout-paper bg-white text-slate-900 mx-auto rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 relative transition-all duration-150 ${
        activeOrientation === 'landscape' ? 'max-w-6xl p-6 sm:p-8' : 'max-w-4xl p-6 sm:p-10'
      }`}
      style={{
        fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
      }}
    >
      {/* Watermark */}
      {watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
          <span className="text-6xl font-black rotate-[-25deg]">{watermarkText}</span>
        </div>
      )}

      {/* 1. Official Header with Logo (هيدر المكتب بالشعار) */}
      {showLetterhead && (
        <header
          data-official-header="true"
          className="official-header border-b-2 border-slate-900 pb-4 mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Right side: Office Info & Logo */}
            <div className="flex items-start gap-3.5 text-right">
              {stateProfile?.showLogo !== false && (
                <div className="shrink-0 pt-0.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="شعار المكتب"
                      className="object-contain rounded-lg border border-slate-200 p-0.5 w-14 h-14"
                    />
                  ) : stateProfile?.logoType === 'MOHAMED_GAMIL_GOLD' ? (
                    <MgBrandBadge size="md" interactive={false} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black flex items-center justify-center border border-amber-500/40 shadow-xs">
                      MG
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 font-['Cairo']">
                  {officeName}
                </h1>
                <p className="text-xs font-bold text-emerald-800 font-['Cairo']">
                  {officeTitle}
                </p>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-0.5">
                  <div>
                    <span className="font-semibold text-slate-800">ترخيص المزاولة:</span>{' '}
                    <span className="font-mono">{licenseNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="font-semibold text-slate-800">ب.ض:</span>{' '}
                      <span className="font-mono">{taxAuthorityRegNo}</span>
                    </span>
                    <span>•</span>
                    <span>
                      <span className="font-semibold text-slate-800">هاتف:</span>{' '}
                      <span className="font-mono font-bold text-slate-800">{officePhone}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Left side: Date, Page Number & QR Code */}
            <div className="flex items-start gap-3">
              <div className="text-left text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-end gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{effectiveDate}</span>
                </div>
                {/* 2. رقم الصفحة */}
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-center font-['Cairo']">
                  صفحة {currentPage} من {totalPages}
                </div>
                {effectiveRefNumber && (
                  <div className="text-[10px] font-mono text-slate-500 text-left">
                    مرجع: {effectiveRefNumber}
                  </div>
                )}
              </div>

              {/* QR Verification Code */}
              <div
                data-qr-container="true"
                className="qr-verification flex flex-col items-center justify-center p-1 rounded-xl bg-white border border-slate-200 shrink-0"
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(verificationPayload, 72),
                  }}
                />
                <span className="text-[8px] font-mono font-bold text-slate-500 mt-0.5">وثيقة معتمدة</span>
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="mt-4 pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/90 px-3.5 py-2 rounded-xl">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Cairo']">
                {effectiveTitle}
              </h2>
              {effectiveSubtitle && (
                <p className="text-xs text-slate-500 font-['Cairo']">{effectiveSubtitle}</p>
              )}
            </div>

            {effectiveCompanyName && (
              <div className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                المنشأة: <span className="font-extrabold">{effectiveCompanyName}</span>
                {fiscalYear && <span className="font-mono text-slate-600 mr-2">({fiscalYear})</span>}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Document Body */}
      <main className="min-h-[220px] font-['Cairo']">{children}</main>

      {/* Notes Section */}
      {notes && (
        <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-['Cairo']">
          <span className="font-bold text-slate-800 block mb-0.5">ملاحظات وإيضاحات:</span>
          <p>{notes}</p>
        </div>
      )}

      {/* Official Stamp & Signatures */}
      {showSignatureStamp && (
        <footer
          data-stamp="true"
          className="official-stamp mt-8 pt-5 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs font-['Cairo']"
        >
          <div className="text-right space-y-1">
            <span className="text-slate-500 block">إعداد ومراجعة:</span>
            <span className="font-bold text-slate-800">قسم الحسابات والمراجعة الفنية</span>
            <div className="text-[10px] text-slate-400 font-mono">نظام التدقيق الرقمي المعتمد</div>
          </div>

          <div className="text-left space-y-1.5 flex flex-col items-end">
            <span className="text-slate-500 block text-right">المحاسب القانوني المعتمد:</span>
            <span className="font-bold text-slate-900 text-right">{officeName}</span>
            <div className="w-36 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-[10px] bg-slate-50/50">
              (خاتم وتوقيع المحاسب القانوني)
            </div>
          </div>
        </footer>
      )}

      {/* Print Page Footer with Cairo and Page number */}
      <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-['Cairo']">
        <span>طُبعت هذه الوثيقة آلياً وفقاً لمعايير المحاسبة المصرية المعتمدة</span>
        <div className="font-bold text-slate-600 font-['Cairo']">
          صفحة {currentPage} من {totalPages}
        </div>
        <span className="font-mono">{new Date().toISOString().replace('T', ' ').substring(0, 19)}</span>
      </div>
    </div>
  );

  // If used as a modal / preview dialog
  if (isOpen !== undefined) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto no-print">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-300 dark:border-slate-800 no-print flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Cairo']">
                  معاينة طباعة الوثيقة (A4 - خط Cairo - RTL)
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {effectiveTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Orientation toggle */}
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeOrientation === 'portrait'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  طولي (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeOrientation === 'landscape'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  عرضي (A4)
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 font-['Cairo']"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الوثيقة الآن</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer font-['Cairo']"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>

          {/* Render printable content */}
          <div className="flex-1 overflow-y-auto">
            {paperContent}
          </div>
        </div>
      </div>
    );
  }

  return paperContent;
};

// Bind static method to the PrintLayout component
PrintLayout.printElement = printElementWithPrintLayout;
