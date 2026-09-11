import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { OfficeProfile } from '../types';
import { triggerFileDownload } from './dataImportExport';

/**
 * Utility to export certified accounting documents (Certificates, Invoices, Declarations, Financial Statements)
 * into all official formats: PDF (jspdf + html2canvas), Word (.doc), High-Res Image (PNG/JPG), Excel (.xlsx), and JSON/XML.
 */

/**
 * Helper to convert any modern CSS color syntax (oklch, oklab, lab, lch, color(...))
 * to standard RGB/RGBA/HEX that html2canvas can parse without errors.
 */
function normalizeColorToRgb(colorStr: string, canvasCtx?: CanvasRenderingContext2D | null): string {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  if (!colorStr.includes('oklch') && !colorStr.includes('lab') && !colorStr.includes('color(')) {
    return colorStr;
  }

  let ctx = canvasCtx;
  if (!ctx) {
    try {
      const c快乐 = document.createElement('canvas');
      c快乐.width = 1;
      c快乐.height = 1;
      ctx = c快乐.getContext('2d');
    } catch {
      // ignore
    }
  }

  try {
    return colorStr.replace(/(?:oklch|oklab|lab|lch|color)\([^)]+\)/gi, (match) => {
      if (ctx) {
        try {
          ctx.fillStyle = '#000000';
          ctx.fillStyle = match;
          return ctx.fillStyle || '#000000';
        } catch {
          return '#000000';
        }
      }
      return '#000000';
    });
  } catch {
    return colorStr;
  }
}

/**
 * Sanitizes all DOM nodes, CSS rules, inline styles, SVGs, and computed properties in clonedDoc
 * to completely eliminate unsupported modern CSS functions (such as oklch) before html2canvas parses them.
 */
export function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  // Inject Arabic font and ligature preservation styles
  const arabicTypographyFix = clonedDoc.createElement('style');
  arabicTypographyFix.textContent = `
    *, *::before, *::after {
      letter-spacing: 0px !important;
      word-spacing: normal !important;
      text-rendering: geometricPrecision !important;
    }
    .text-justify {
      text-align: right !important;
    }
    [class*="tracking-"] {
      letter-spacing: 0px !important;
    }
    body, div, p, span, h1, h2, h3, h4, h5, h6, table, tr, th, td {
      font-family: 'Cairo', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif !important;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace !important;
    }
  `;
  if (clonedDoc.head) {
    clonedDoc.head.appendChild(arabicTypographyFix);
  } else if (clonedDoc.body) {
    clonedDoc.body.appendChild(arabicTypographyFix);
  }

  // 1. Sanitize all <style> tags content
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('lab'))) {
      styleTag.textContent = normalizeColorToRgb(styleTag.textContent, ctx);
    }
  });

  // 2. Sanitize all style attributes and computed color properties on all elements
  const allElements = clonedDoc.querySelectorAll<HTMLElement | SVGElement>('*');
  const view = clonedDoc.defaultView || window;

  const COLOR_PROPS = [
    'color',
    'backgroundColor',
    'background',
    'backgroundImage',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'boxShadow',
    'textShadow',
    'fill',
    'stroke',
    'stopColor',
    'floodColor',
    'lightingColor',
    'accentColor',
    'caretColor',
  ] as const;

  allElements.forEach((el) => {
    // Reset transforms that break scaling
    if (el instanceof HTMLElement) {
      if (el.style.transform && el.style.transform.includes('scale')) {
        el.style.transform = 'none';
      }
      if (el.style.webkitTransform && el.style.webkitTransform.includes('scale')) {
        el.style.webkitTransform = 'none';
      }

      // Eliminate letter-spacing and reset text-justify on elements to preserve Arabic ligatures
      if (el.style.letterSpacing && el.style.letterSpacing !== 'normal' && el.style.letterSpacing !== '0px') {
        el.style.letterSpacing = '0px';
      }
      if (el.style.textAlign === 'justify') {
        el.style.textAlign = 'right';
      }
      el.classList.remove('tracking-wider', 'tracking-wide', 'tracking-widest', 'tracking-tight', 'text-justify');
    }

    // Inspect computed styles for any oklch color values
    try {
      const computed = view.getComputedStyle(el);
      if (computed) {
        for (const prop of COLOR_PROPS) {
          const val = (computed as any)[prop];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('lab') || val.includes('color('))) {
            const converted = normalizeColorToRgb(val, ctx);
            if (el instanceof HTMLElement || el instanceof SVGElement) {
              (el.style as any)[prop] = converted;
            }
          }
        }
      }
    } catch {
      // getComputedStyle may fail on some detached nodes, ignore
    }

    // Also sanitize inline styles and custom CSS properties (--tw-*)
    if (el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const propName = el.style[i];
        const val = el.style.getPropertyValue(propName);
        if (val && (val.includes('oklch') || val.includes('lab') || val.includes('color('))) {
          el.style.setProperty(propName, normalizeColorToRgb(val, ctx));
        }
      }
    }

    // Sanitize SVG attributes directly if present
    if (el instanceof SVGElement) {
      ['fill', 'stroke', 'stop-color'].forEach((attr) => {
        const attrVal深受 = el.getAttribute(attr);
        if (attrVal深受 && (attrVal深受.includes('oklch') || attrVal深受.includes('lab'))) {
          el.setAttribute(attr, normalizeColorToRgb(attrVal深受, ctx));
        }
      });
    }
  });

  // 3. Convert inputs, selects, and textareas into clean text representation
  const inputEls = clonedDoc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea'
  );
  inputEls.forEach((input) => {
    const span = clonedDoc.createElement('span');
    span.className = 'font-mono font-bold text-slate-900 inline-block px-1';
    span.textContent = input.value || '';
    input.parentNode?.replaceChild(span, input);
  });

  // 4. Hide non-printable elements
  const hideEls = clonedDoc.querySelectorAll<HTMLElement>(
    '.no-print, [data-no-print="true"], button, .action-toolbar, .screen-action-toolbar, .modal-backdrop'
  );
  hideEls.forEach((el) => {
    el.style.display = 'none';
  });
}

export interface CertifiedDocumentData {
  id?: string;
  title?: string;
  certificateTypeTitle?: string;
  certificateNumber?: string;
  invoiceNumber?: string;
  clientName?: string;
  beneficiaryTitle?: string;
  beneficiaryType?: string;
  beneficiaryGender?: 'MALE' | 'FEMALE';
  nationalId?: string;
  jobTitle?: string;
  address?: string;
  taxCardNo?: string;
  commercialRegNo?: string;
  activityName?: string;
  certificateType?: string;
  annualNetIncome?: number;
  certifiedAmount?: number;
  investedCapitalAmount?: number;
  totalAmount?: number;
  amount?: number;
  monthlyNetIncome?: number;
  periodText?: string;
  recipientEntity?: string;
  purpose?: string;
  auditorNotes?: string;
  customBodyText?: string;
  customPreambleBasis?: string;
  issueDate?: string;
  breakdownItems?: Array<{
    source?: string;
    amount?: number;
    percentage?: number | string;
    notes?: string;
    [key: string]: any;
  }>;
  items?: any[];
  lines?: any[];
  incomeBreakdown?: {
    salaryIncome?: number;
    businessIncome?: number;
    investmentIncome?: number;
    otherIncome?: number;
    notes?: string;
    [key: string]: any;
  };
  qrPayload?: string;
  [key: string]: any;
}

/**
 * Smartly finds the target element in the DOM using ID, selector, or intelligent fallbacks
 */
function findTargetElement(elementIdOrSelector?: string): HTMLElement | null {
  if (elementIdOrSelector) {
    // Try exact ID
    let el = document.getElementById(elementIdOrSelector);
    if (el) return el;

    // Try query selector
    try {
      el = document.querySelector(elementIdOrSelector);
      if (el) return el;
    } catch {
      // Invalid selector, continue to fallbacks
    }
  }

  // Intelligent fallbacks across all views
  const candidateSelectors = [
    '#printable-preview-canvas',
    '#official-certificate-document',
    '#credit-financials-container',
    '#credit-batch-print-wrapper',
    '#credit-printable-dossier',
    '#financial-simulator-report',
    '#auditor-report-paper',
    '#financial-statements-container',
    '#feasibility-study-paper',
    '#feasibility-study-document',
    '#tax-declaration-paper',
    '#egyptian-official-tax-form',
    '#invoice-print-container',
    '#official-invoice-document',
    '#trial-balance-report',
    '#audit-working-papers-container',
    '#payroll-payslip-canvas',
    '#financial-notes-canvas',
    '#bank-reconciliation-print',
    '#cash-flow-predictor-print',
    '#fraud-sentinel-print',
    '[data-printable="true"]',
    '.official-paper',
    '.printable-canvas',
    '.printable-content',
    '.printable-certificate',
    'main',
    '#root',
  ];

  for (const selector of candidateSelectors) {
    const found = document.querySelector<HTMLElement>(selector);
    if (found && found.offsetHeight > 50) {
      return found;
    }
  }

  return document.body;
}

/**
 * Export HTML element to PDF with high-DPI rendering and multi-page slicing
 */
export async function exportElementToPdf(
  elementIdOrSelector?: string,
  filename: string = 'المستند_المعتمد.pdf',
  options?: { orientation?: 'portrait' | 'landscape'; format?: 'a4' | 'a3' | 'letter' }
): Promise<boolean> {
  const element = findTargetElement(elementIdOrSelector);
  if (!element) {
    console.error(`Target element for PDF export could not be found.`);
    return false;
  }

  try {
    // Ensure all web fonts (Cairo, IBM Plex Sans Arabic) are fully loaded before capturing
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // continue if fonts ready throws
      }
    }

    const orientation = options?.orientation || 'portrait';
    const format = options?.format || 'a4';

    // Standard A4 dimensions in mm
    const pdfWidth = orientation === 'portrait' ? 210 : 297;
    const pdfHeight = orientation === 'portrait' ? 297 : 210;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    // Check if element contains discrete page sheets (like multi-page A4 canvas dossier)
    let discreteSheets: HTMLElement[] = [];
    if (
      element.matches &&
      (element.matches('.a4-sheet-canvas') ||
        element.matches('.print-page-break') ||
        element.matches('[data-page-break="always"]'))
    ) {
      discreteSheets = [element];
    } else {
      const found = element.querySelectorAll<HTMLElement>(
        '.a4-sheet-canvas, .print-page-break, [data-page-break="always"]'
      );
      if (found.length > 0) {
        discreteSheets = Array.from(found);
      }
    }

    // Filter to visible sheets to avoid exporting blank/hidden filtered pages
    const visibleSheets = discreteSheets.filter(
      (s) => s.offsetParent !== null || s.offsetHeight > 0 || (s.style && s.style.display !== 'none')
    );
    const sheetsToCapture = visibleSheets.length > 0 ? visibleSheets : discreteSheets;

    if (sheetsToCapture.length > 0) {
      // Multi-sheet discrete rendering: capture each page individually for exact 1:1 A4 alignment
      for (let i = 0; i < sheetsToCapture.length; i++) {
        const sheet = sheetsToCapture[i];
        if (i > 0) {
          pdf.addPage();
        }

        const sheetCanvas = await html2canvas(sheet, {
          scale: 2.2, // High resolution for crisp Arabic typography and lines
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1200, // Force desktop width so A4 layout doesn't collapse into mobile breakpoint
          onclone: (clonedDoc) => {
            sanitizeClonedDocForHtml2Canvas(clonedDoc);
          },
        });

        const imgData = sheetCanvas.toDataURL('image/png', 1.0);
        // Add full-bleed exact page image (the sheet already contains internal 14-16mm padding)
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    }

    // Continuous single-element fallback with careful proportional margins
    const marginMm = 8;
    const printableWidth = pdfWidth - marginMm * 2;
    const printableHeight = pdfHeight - marginMm * 2;

    const canvas = await html2canvas(element, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1200),
      onclone: (clonedDoc) => {
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
      },
    });

    const pageCanvasHeight = Math.floor(canvas.width * (printableHeight / printableWidth));
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
      if (currentSliceHeight <= 4) {
        break;
      }

      if (pageIndex > 0) {
        pdf.addPage();
      }
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;
      const ctx = sliceCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          currentSliceHeight,
          0,
          0,
          canvas.width,
          currentSliceHeight
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        const sliceHeightMm = (currentSliceHeight * printableWidth) / canvas.width;
        pdf.addImage(sliceImgData, 'PNG', marginMm, marginMm, printableWidth, sliceHeightMm, undefined, 'FAST');
      }

      sourceY += pageCanvasHeight;
      pageIndex++;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF with html2canvas:', error);
    try {
      // Graceful fallback: trigger native browser print which allows Save as PDF without canvas errors
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Export HTML element to High-Res Image (PNG or JPEG)
 */
export async function exportElementToImage(
  elementIdOrSelector?: string,
  filename: string = 'المستند_المعتمد.png',
  format: 'png' | 'jpeg' = 'png'
): Promise<boolean> {
  const element = findTargetElement(elementIdOrSelector);
  if (!element) {
    console.error(`Target element for image export could not be found.`);
    return false;
  }

  try {
    // Ensure all web fonts are fully loaded before capturing
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // continue
      }
    }

    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1200),
      onclone: (clonedDoc) => {
        // Deeply sanitize all oklch / lab color values and elements
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
      },
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, 0.95);

    const link = document.createElement('a');
    link.download = filename.endsWith(`.${format}`) ? filename : `${filename}.${format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Error exporting image:', error);
    return false;
  }
}

/**
 * Export Certified Document to Editable Microsoft Word (.doc) with Arabic RTL styling
 */
export function exportDocumentToWord(
  doc: CertifiedDocumentData,
  officeProfile: OfficeProfile,
  customFilename?: string
): boolean {
  try {
    const isCapital =
      doc.certificateType === 'INVESTED_CAPITAL' ||
      String(doc.title || '').includes('رأس المال');
    const isSolvency =
      doc.certificateType === 'SOLVENCY_FINANCIAL_STANDING' ||
      String(doc.title || '').includes('ملاءة');
    const isAuditorReport =
      doc.certificateType === 'AUDITOR_REPORT' ||
      String(doc.title || '').includes('مراقب الحسابات');

    const certTitle =
      doc.certificateTypeTitle ||
      (isCapital
        ? 'شهادة تحديد وتوثيق رأس المال المستثمر المعتمدة'
        : isSolvency
        ? 'شهادة الملاءة والمركز المالي المعتمدة'
        : isAuditorReport
        ? 'تقرير مراقب الحسابات المستقل'
        : doc.certificateType || 'شهادة إثبات دخل مهنية معتمدة');

    const primaryAmount =
      doc.investedCapitalAmount ||
      doc.certifiedAmount ||
      doc.annualNetIncome ||
      doc.totalAmount ||
      doc.amount ||
      0;

    let breakdownTableHtml = '';
    if (doc.breakdownItems && doc.breakdownItems.length > 0) {
      breakdownTableHtml = `
        <h4 style="margin-top: 20px; color: #0f172a;">تفاصيل ومكونات رأس المال المستثمر المفحوصة مستندياً:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #94a3b8; padding: 8px; text-align: center; width: 40px;">م</th>
              <th style="border: 1px solid #94a3b8; padding: 8px; text-align: right;">عنصر رأس المال / البيان</th>
              <th style="border: 1px solid #94a3b8; padding: 8px; text-align: center; width: 140px;">القيمة المعتمدة (ج.م)</th>
              <th style="border: 1px solid #94a3b8; padding: 8px; text-align: center; width: 80px;">النسبة</th>
              <th style="border: 1px solid #94a3b8; padding: 8px; text-align: right;">السند والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${doc.breakdownItems
              .map(
                (item, idx) => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${item.source || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #1e3a8a;">${(item.amount || 0).toLocaleString('ar-EG')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${item.percentage ? `${item.percentage}%` : '---'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 11px;">${item.notes || 'مستوفى وموثق'}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #94a3b8; padding: 8px; text-align: center;">إجمالي رأس المال المستثمر المعتمد</td>
              <td style="border: 1px solid #94a3b8; padding: 8px; text-align: center; color: #047857; font-size: 14px;">${primaryAmount.toLocaleString('ar-EG')} ج.م</td>
              <td colspan="2" style="border: 1px solid #94a3b8; padding: 8px; font-size: 11px;">فقط وقدره ${primaryAmount.toLocaleString('ar-EG')} جنيهاً مصرياً لا غير</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${certTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 15mm;
          }
          body {
            font-family: 'Traditional Arabic', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 10px;
            line-height: 1.6;
            color: #0f172a;
          }
          h1, h2, h3, h4 { color: #1e3a8a; text-align: center; margin-bottom: 8px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .footer { border-top: 2px solid #0f172a; padding-top: 15px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #94a3b8; padding: 7px; text-align: right; }
          th { background-color: #f1f5f9; }
          .highlight-box {
            background-color: #f8fafc;
            border: 2px solid #1e3a8a;
            border-radius: 6px;
            padding: 12px;
            margin: 15px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <table style="border: none; margin: 0;">
            <tr style="border: none;">
              <td style="border: none; width: 60%; vertical-align: top;">
                <h3 style="text-align: right; margin: 0; color: #1e3a8a;">${officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}</h3>
                <p style="margin: 2px 0; font-size: 14px;"><strong>${officeProfile?.auditorName || 'محمد جميل مرعي'}</strong></p>
                <p style="margin: 2px 0; font-size: 12px; color: #475569;">سجل المحاسبين والمراجعين: ${officeProfile?.licenseNumber || 'س.م.م 43122'}</p>
                <p style="margin: 2px 0; font-size: 11px; color: #64748b;">هاتف: ${officeProfile?.phone || '01003335360'} | العنوان: ${officeProfile?.address || 'مصر'}</p>
              </td>
              <td style="border: none; width: 40%; text-align: left; vertical-align: top;">
                <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; background-color: #f8fafc; display: inline-block; text-align: right;">
                  <p style="margin: 2px 0; font-size: 12px;"><strong>رقم الشهادة / السيريال:</strong> ${doc.certificateNumber || doc.invoiceNumber || '2026-CERT'}</p>
                  <p style="margin: 2px 0; font-size: 12px;"><strong>تاريخ التحرير:</strong> ${doc.issueDate || new Date().toISOString().slice(0, 10)}</p>
                  <p style="margin: 2px 0; font-size: 11px; color: #047857;"><strong>التوثيق:</strong> معتمد برمز التحقق QR</p>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <h2 style="text-align: center; text-decoration: underline; color: #1e3a8a; margin: 15px 0;">${certTitle}</h2>

        <p style="margin-top: 15px; font-size: 14px;"><strong>السادة / ${doc.recipientEntity || 'من يهمه الأمر'}</strong></p>
        <p style="text-indent: 25px; margin-bottom: 15px;">تحية طيبة وبعد ،،،</p>

        <p style="text-align: justify; line-height: 1.8; font-size: 13px;">
          بناءً على طلب العميل / المنشأة: <strong>${doc.clientName || ''}</strong>،
          ${doc.nationalId ? `الرقم القومي: (<strong>${doc.nationalId}</strong>)، ` : ''}
          ${doc.taxCardNo ? `البطاقة الضريبية: (<strong>${doc.taxCardNo}</strong>)، ` : ''}
          ${doc.commercialRegNo ? `السجل التجاري: (<strong>${doc.commercialRegNo}</strong>)، ` : ''}
          والعامل بمهنة أو نشاط: <strong>${doc.jobTitle || doc.activityName || 'النشاط التجاري والمهني'}</strong>.
        </p>

        <p style="text-align: justify; line-height: 1.8; font-size: 13px;">
          وبعد الفحص والاطلاع والمراجعة المستندية للدفاتر المحاسبية والقوائم المالية والحسابات البنكية والإيصالات المعتمدة المقدمة للمكتب عن الفترة <strong>${doc.periodText || 'الفترة المالية المنتهية'}</strong>،
          <strong>يشهد مكتبنا</strong> بأن إجمالي المبلغ المعتمد موضوع هذه الشهادة يبلغ:
        </p>

        <div class="highlight-box">
          <span style="font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">المبلغ الإجمالي المعتمد والموثق رسمياً</span>
          <span style="font-size: 20px; font-weight: bold; color: #1e3a8a;">${primaryAmount.toLocaleString('ar-EG')} ج.م</span>
          <span style="font-size: 12px; color: #0f172a; display: block; margin-top: 4px;">(فقط وقدره ${primaryAmount.toLocaleString('ar-EG')} جنيهاً مصرياً لا غير)</span>
        </div>

        ${breakdownTableHtml}

        <p style="text-align: justify; font-size: 12px; color: #334155; line-height: 1.7;">
          وقد صدرت هذه الشهادة الرسمية المعتمدة لتقديمها إلى <strong>${doc.recipientEntity || 'الجهة المختصة'}</strong>
          لاستخدامها في الغرض المخصص: <strong>${doc.purpose || 'استيفاء الإجراءات الرسمية والبنكية'}</strong>،
          دون أدنى مسؤولية مدنية أو جنائية على مكتب المحاسب القانوني تجاه التزامات العميل مع الغير.
        </p>

        ${doc.auditorNotes ? `<p style="background-color: #f1f5f9; padding: 8px; border-right: 3px solid #1e3a8a; font-size: 12px; margin: 10px 0;"><strong>ملاحظات المراجع القانوني:</strong> ${doc.auditorNotes}</p>` : ''}

        <div class="footer">
          <table style="border: none; margin: 0;">
            <tr style="border: none;">
              <td style="border: none; width: 50%; vertical-align: middle;">
                <p style="margin: 2px 0;"><strong>المحاسب القانوني ومراقب الحسابات:</strong></p>
                <p style="font-size: 14px; font-weight: bold; margin: 2px 0; color: #1e3a8a;">${officeProfile?.auditorName || 'محمد جميل مرعي'}</p>
                <p style="font-size: 12px; margin: 2px 0; color: #475569;">سجل المحاسبين والمراجعين: ${officeProfile?.licenseNumber || 'س.م.م 43122'}</p>
                <p style="font-size: 11px; margin: 2px 0; color: #047857;">عضو جمعية المحاسبين والمراجعين المصرية</p>
              </td>
              <td style="border: none; width: 50%; text-align: left; vertical-align: middle;">
                <p style="margin: 2px 0;"><strong>خاتم الاعتماد والتوثيق المهني:</strong></p>
                <div style="border: 2px dashed #94a3b8; width: 140px; height: 75px; text-align: center; padding-top: 24px; font-size: 11px; color: #64748b; display: inline-block; border-radius: 6px;">
                  خاتم وتوقيع المحاسب القانوني
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], {
      type: 'application/msword;charset=utf-8',
    });

    const filename = customFilename || `${certTitle.replace(/\s+/g, '_')}_${doc.clientName || 'معتمد'}.doc`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting Word document:', error);
    return false;
  }
}

/**
 * Export Certified Document to Excel (.xlsx) with complete RTL formatting and sub-sheets
 */
export function exportDocumentToExcel(
  doc: CertifiedDocumentData,
  officeProfile: OfficeProfile,
  customFilename?: string
): boolean {
  try {
    const isCapital =
      doc.certificateType === 'INVESTED_CAPITAL' ||
      String(doc.title || '').includes('رأس المال');
    const isSolvency =
      doc.certificateType === 'SOLVENCY_FINANCIAL_STANDING' ||
      String(doc.title || '').includes('ملاءة');

    const primaryAmount =
      doc.investedCapitalAmount ||
      doc.certifiedAmount ||
      doc.annualNetIncome ||
      doc.totalAmount ||
      doc.amount ||
      0;

    const rows = [
      { 'البيان / الحقل الرسمي': 'اسم المنشأة المهنية', 'القيمة / التفاصيل': officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات' },
      { 'البيان / الحقل الرسمي': 'المحاسب القانوني ومراقب الحسابات', 'القيمة / التفاصيل': officeProfile?.auditorName || 'محمد جميل مرعي' },
      { 'البيان / الحقل الرسمي': 'رقم القيد بسجل المحاسبين والمراجعين', 'القيمة / التفاصيل': officeProfile?.licenseNumber || 'س.م.م 43122' },
      { 'البيان / الحقل الرسمي': 'نوع المستند / الشهادة', 'القيمة / التفاصيل': doc.certificateTypeTitle || doc.certificateType || 'شهادة معتمدة' },
      { 'البيان / الحقل الرسمي': 'رقم الشهادة / السيريال', 'القيمة / التفاصيل': doc.certificateNumber || doc.invoiceNumber || '2026-CERT' },
      { 'البيان / الحقل الرسمي': 'تاريخ التحرير والإصدار', 'القيمة / التفاصيل': doc.issueDate || new Date().toISOString().slice(0, 10) },
      { 'البيان / الحقل الرسمي': 'اسم العميل / الممول / الشركة', 'القيمة / التفاصيل': doc.clientName || '' },
      { 'البيان / الحقل الرسمي': 'الرقم القومي للمسؤول', 'القيمة / التفاصيل': doc.nationalId || '---' },
      { 'البيان / الحقل الرسمي': 'رقم البطاقة الضريبية', 'القيمة / التفاصيل': doc.taxCardNo || '---' },
      { 'البيان / الحقل الرسمي': 'رقم السجل التجاري', 'القيمة / التفاصيل': doc.commercialRegNo || '---' },
      { 'البيان / الحقل الرسمي': 'المهنة / النشاط الاقتصادي', 'القيمة / التفاصيل': doc.jobTitle || doc.activityName || '---' },
      { 'البيان / الحقل الرسمي': isCapital ? 'إجمالي رأس المال المستثمر المعتمد' : 'المبلغ المالي المعتمد', 'القيمة / التفاصيل': primaryAmount },
      { 'البيان / الحقل الرسمي': 'متوسط الدخل الشهري المعتمد', 'القيمة / التفاصيل': doc.monthlyNetIncome || 0 },
      { 'البيان / الحقل الرسمي': 'الفترة المحاسبية المغطاة', 'القيمة / التفاصيل': doc.periodText || '' },
      { 'البيان / الحقل الرسمي': 'الجهة الموجه إليها المستند', 'القيمة / التفاصيل': doc.recipientEntity || 'من يهمه الأمر' },
      { 'البيان / الحقل الرسمي': 'الغرض من المستند والاستخدام', 'القيمة / التفاصيل': doc.purpose || 'استيفاء الإجراءات الرسمية والبنكية' },
      { 'البيان / الحقل الرسمي': 'ملاحظات المراجع القانوني', 'القيمة / التفاصيل': doc.auditorNotes || 'معتمد وموثق' },
      { 'البيان / الحقل الرسمي': 'رمز التحقق والتشفير الرقمي QR', 'القيمة / التفاصيل': doc.qrPayload || `EAS-CERT|${doc.certificateNumber}|${doc.clientName}` },
      { 'البيان / الحقل الرسمي': 'حالة الاعتماد والتوثيق', 'القيمة / التفاصيل': 'معتمد وموثق رسمياً وفق معايير المحاسبة والمراجعة المصرية' },
    ];

    const wb = XLSX.utils.book_new();

    // 1. Overview Sheet with RTL & Auto Column Widths
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!views'] = [{ RTL: true }];
    ws['!cols'] = [{ wch: 36 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, '1. بيانات الشهادة المعتمدة');

    // 2. Breakdown Items Sheet if available
    if (doc.breakdownItems && doc.breakdownItems.length > 0) {
      const bdRows = doc.breakdownItems.map((item, idx) => ({
        'م': idx + 1,
        'عنصر رأس المال / البيان': item.source || '',
        'القيمة المعتمدة (ج.م)': item.amount || 0,
        'النسبة المئوية (%)': item.percentage ? `${item.percentage}%` : '---',
        'الإيضاح والسند المستندي': item.notes || 'مستوفى وموثق',
      }));
      const wsBreakdown = XLSX.utils.json_to_sheet(bdRows);
      wsBreakdown['!views'] = [{ RTL: true }];
      wsBreakdown['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 22 }, { wch: 16 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsBreakdown, '2. تفاصيل رأس المال المستثمر');
    }

    // 3. Invoice Items if available
    if (doc.items && doc.items.length > 0) {
      const itemRows = doc.items.map((it: any, idx: number) => ({
        'م': idx + 1,
        'بيان الخدمة / الصنف': it.description || it.name || '',
        'الكمية': it.quantity || 1,
        'سعر الوحدة (ج.م)': it.unitPrice || it.rate || 0,
        'الإجمالي قبل الضريبة': it.subtotal || 0,
        'ضريبة القيمة المضافة': it.vatAmount || 0,
        'الصافي الإجمالي': it.total || 0,
      }));
      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      wsItems['!views'] = [{ RTL: true }];
      wsItems['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsItems, '2. بنود الفاتورة المعتمدة');
    }

    const filename = customFilename || `شهادة_معتمدة_${doc.clientName || doc.certificateNumber || 'بيانات'}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    triggerFileDownload(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return false;
  }
}

/**
 * Export Certified Document to JSON
 */
export function exportDocumentToJson(doc: CertifiedDocumentData, customFilename?: string): boolean {
  try {
    const jsonStr = JSON.stringify(
      {
        certifiedDocumentFormat: 'EGY-CPA-CERT-V2',
        exportedAt: new Date().toISOString(),
        document: doc,
      },
      null,
      2
    );

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const filename = customFilename || `شهادة_معتمدة_${doc.certificateNumber || 'بيانات'}.json`;
    triggerFileDownload(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting JSON:', error);
    return false;
  }
}

/**
 * Export Certified Document to XML
 */
export function exportDocumentToXml(doc: CertifiedDocumentData, customFilename?: string): boolean {
  try {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CertifiedDocument xmlns="urn:egypt-cpa:certified-doc:v2">
  <DocumentId>${doc.id || ''}</DocumentId>
  <CertificateNumber>${doc.certificateNumber || doc.invoiceNumber || ''}</CertificateNumber>
  <IssueDate>${doc.issueDate || ''}</IssueDate>
  <Client>
    <Name><![CDATA[${doc.clientName || ''}]]></Name>
    <NationalId>${doc.nationalId || ''}</NationalId>
    <CommercialRegNo>${doc.commercialRegNo || ''}</CommercialRegNo>
    <TaxCardNo>${doc.taxCardNo || ''}</TaxCardNo>
    <JobTitle><![CDATA[${doc.jobTitle || ''}]]></JobTitle>
    <ActivityName><![CDATA[${doc.activityName || ''}]]></ActivityName>
    <Address><![CDATA[${doc.address || ''}]]></Address>
  </Client>
  <Financials>
    <CertifiedAnnualAmount currency="EGP">${doc.certifiedAmount || doc.annualNetIncome || 0}</CertifiedAnnualAmount>
    <CertifiedMonthlyAmount currency="EGP">${doc.monthlyNetIncome || 0}</CertifiedMonthlyAmount>
    <PeriodText><![CDATA[${doc.periodText || ''}]]></PeriodText>
  </Financials>
  <Auditor>
    <Name>محمد جميل مرعي</Name>
    <LicenseNumber>س.م.م / 43122</LicenseNumber>
    <Phone>01003335360</Phone>
  </Auditor>
  <RecipientEntity><![CDATA[${doc.recipientEntity || ''}]]></RecipientEntity>
  <Purpose><![CDATA[${doc.purpose || ''}]]></Purpose>
  <QRPayload><![CDATA[${doc.qrPayload || ''}]]></QRPayload>
</CertifiedDocument>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const filename = customFilename || `شهادة_معتمدة_${doc.certificateNumber || 'بيانات'}.xml`;
    triggerFileDownload(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting XML:', error);
    return false;
  }
}
