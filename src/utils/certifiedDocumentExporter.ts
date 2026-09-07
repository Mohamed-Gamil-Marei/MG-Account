import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { OfficeProfile } from '../types';

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
  monthlyNetIncome?: number;
  periodText?: string;
  recipientEntity?: string;
  purpose?: string;
  auditorNotes?: string;
  customBodyText?: string;
  customPreambleBasis?: string;
  issueDate?: string;
  incomeBreakdown?: {
    salaryIncome?: number;
    businessIncome?: number;
    investmentIncome?: number;
    otherIncome?: number;
    notes?: string;
  };
  qrPayload?: string;
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
    console.error('Error generating PDF:', error);
    return false;
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
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${doc.certificateType || 'شهادة معتمدة'}</title>
        <style>
          body {
            font-family: 'Traditional Arabic', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            margin: 20mm;
            line-height: 1.6;
          }
          h1, h2, h3 { color: #1e3a8a; text-align: center; margin-bottom: 10px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
          .footer { border-top: 2px solid #000; padding-top: 15px; margin-top: 35px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #999; padding: 8px; text-align: right; }
          th { background-color: #f1f5f9; }
          .highlight { background-color: #eff6ff; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <table style="border: none;">
            <tr style="border: none;">
              <td style="border: none; width: 60%;">
                <h3 style="text-align: right; margin: 0;">${officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}</h3>
                <p style="margin: 2px 0;"><strong>${officeProfile?.auditorName || 'محمد جميل مرعي'}</strong></p>
                <p style="margin: 2px 0; font-size: 12px;">سجل المحاسبين والمراجعين: ${officeProfile?.licenseNumber || 'س.م.م 43122'}</p>
              </td>
              <td style="border: none; width: 40%; text-align: left;">
                <p style="margin: 2px 0;"><strong>رقم الشهادة:</strong> ${doc.certificateNumber || doc.invoiceNumber || '2026-001'}</p>
                <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${doc.issueDate || new Date().toISOString().slice(0, 10)}</p>
              </td>
            </tr>
          </table>
        </div>

        <h2 style="text-align: center; text-decoration: underline;">${doc.certificateType || 'شهادة إثبات دخل مهنية معتمدة'}</h2>

        <p style="margin-top: 20px;"><strong>السادة / ${doc.recipientEntity || 'من يهمه الأمر'}</strong></p>
        <p style="text-indent: 30px;">تحية طيبة وبعد ،،،</p>

        <p style="text-align: justify; line-height: 1.8;">
          بناءً على طلب العميل السيد / <strong>${doc.clientName || ''}</strong>، الحامل للرقم القومي (<strong>${doc.nationalId || '---'}</strong>)
          والذي يعمل بمهنة <strong>${doc.jobTitle || doc.activityName || '---'}</strong>،
          وبعد الفحص والاطلاع على المستندات والدفاتر المالية والبنكية المقدمة إلينا،
          <strong>يشهد مكتبنا</strong> بأن صافي الدخل السنوي المحقق يبلغ 
          <strong style="color: #1e3a8a; font-size: 16px;">${(doc.certifiedAmount || doc.annualNetIncome || 0).toLocaleString('ar-EG')} ج.م</strong>
          (فقط وقدره ${(doc.certifiedAmount || doc.annualNetIncome || 0).toLocaleString('ar-EG')} جنيهاً مصرياً لا غير)
          عن الفترة ${doc.periodText || 'العام المالي المنتهي'}.
        </p>

        <p style="text-align: justify;">
          وقد أعطيت هذه الشهادة للعميل لتقديمها إلى <strong>${doc.recipientEntity || 'الجهات المختصة'}</strong>
          لغرض <strong>${doc.purpose || 'استيفاء الإجراءات الرسمية'}</strong>، دون أدنى مسؤولية على المكتب تجاه حقوق الغير.
        </p>

        <div class="footer">
          <table style="border: none;">
            <tr style="border: none;">
              <td style="border: none; width: 50%;">
                <p><strong>المحاسب القانوني ومراقب الحسابات:</strong></p>
                <p style="font-size: 14px; font-weight: bold;">${officeProfile?.auditorName || 'محمد جميل مرعي'}</p>
                <p style="font-size: 12px;">سجل المحاسبين: ${officeProfile?.licenseNumber || 'س.م.م 43122'}</p>
              </td>
              <td style="border: none; width: 50%; text-align: left;">
                <p><strong>الخاتم والاعتماد المهني:</strong></p>
                <div style="border: 1px dashed #333; width: 120px; height: 70px; text-align: center; padding-top: 20px; font-size: 10px;">
                  خاتم الاعتماد
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

    const filename = customFilename || `شهادة_معتمدة_${doc.clientName || 'عميل'}.doc`;
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
 * Export Certified Document to Excel (.xlsx)
 */
export function exportDocumentToExcel(
  doc: CertifiedDocumentData,
  officeProfile: OfficeProfile,
  customFilename?: string
): boolean {
  try {
    const rows = [
      { 'البيان': 'نوع المستند / الشهادة', 'القيمة': doc.certificateType || 'شهادة معتمدة' },
      { 'البيان': 'رقم المستند / الشهادة', 'القيمة': doc.certificateNumber || doc.invoiceNumber || '2026-001' },
      { 'البيان': 'تاريخ الإصدار', 'القيمة': doc.issueDate || new Date().toISOString().slice(0, 10) },
      { 'البيان': 'اسم العميل / الممول', 'القيمة': doc.clientName || '' },
      { 'البيان': 'الرقم القومي', 'القيمة': doc.nationalId || '---' },
      { 'البيان': 'رقم البطاقة الضريبية', 'القيمة': doc.taxCardNo || '---' },
      { 'البيان': 'السجل التجاري', 'القيمة': doc.commercialRegNo || '---' },
      { 'البيان': 'المهنة / النشاط', 'القيمة': doc.jobTitle || doc.activityName || '---' },
      { 'البيان': 'صافي الدخل السنوي المعتمد', 'القيمة': doc.certifiedAmount || doc.annualNetIncome || 0 },
      { 'البيان': 'متوسط الدخل الشهري المعتمد', 'القيمة': doc.monthlyNetIncome || 0 },
      { 'البيان': 'الفترة المحاسبية', 'القيمة': doc.periodText || '' },
      { 'البيان': 'الجهة الموجه إليها المستند', 'القيمة': doc.recipientEntity || 'من يهمه الأمر' },
      { 'البيان': 'الغرض من المستند', 'القيمة': doc.purpose || 'استيفاء الإجراءات الرسمية' },
      { 'البيان': 'المحاسب القانوني ومراقب الحسابات', 'القيمة': officeProfile?.auditorName || 'محمد جميل مرعي' },
      { 'البيان': 'رقم سجل المحاسبين والمراجعين', 'القيمة': officeProfile?.licenseNumber || 'س.م.م 43122' },
      { 'البيان': 'حالة الاعتماد', 'القيمة': 'معتمد وموثق رسمياً وفق معايير المحاسبة المصرية' },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'بيانات الشهادة المعتمدة');

    const filename = customFilename || `شهادة_معتمدة_${doc.clientName || doc.certificateNumber || 'بيانات'}.xlsx`;
    XLSX.writeFile(wb, filename);
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

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = customFilename || `شهادة_معتمدة_${doc.certificateNumber || 'بيانات'}.json`;
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
    console.error('Error exporting XML:', error);
    return false;
  }
}
