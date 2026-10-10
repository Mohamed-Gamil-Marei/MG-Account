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
    const cleanId = elementIdOrSelector.replace(/^#/, '');
    // Try exact ID
    let el = document.getElementById(cleanId);
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
    '#financial-statements-container',
    '#trial-balance-report',
    '#journal-entries-table-container',
    '#printable-journal-book',
    '#general-ledger-container',
    '#fixed-assets-container',
    '#office-treasury-table-container',
    '#office-treasury-voucher-print',
    '#payroll-payslip-canvas',
    '#chart-of-accounts-card',
    '#clients-archive-unified-card',
    '#tax-agenda-printable-container',
    '#tax-declaration-paper',
    '#official-certificate-document',
    '#credit-financials-container',
    '#credit-batch-print-wrapper',
    '#credit-printable-dossier',
    '#financial-simulator-report',
    '#auditor-report-paper',
    '#feasibility-study-paper',
    '#feasibility-study-document',
    '#audit-working-papers-container',
    '#customs-hub-printable-container',
    '#customs-dossier-printable',
    '#invoice-print-container',
    '#official-invoice-document',
    '#egyptian-official-tax-form',
    '#financial-notes-canvas',
    '#bank-reconciliation-print',
    '#cash-flow-predictor-print',
    '#fraud-sentinel-print',
    '[data-printable="true"]',
    '.official-paper',
    '.printable-canvas',
    '.printable-content',
    '.printable-certificate',
    '.unified-screen-card',
    '.accounting-table',
    'main',
    '#root',
  ];

  for (const selector of candidateSelectors) {
    try {
      const found = document.querySelector<HTMLElement>(selector);
      if (found && found.offsetHeight > 50) {
        return found;
      }
    } catch {
      // ignore
    }
  }

  return document.body;
}

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3' | 'letter';
  fitToSinglePage?: boolean;
  recordId?: string;
  documentTitle?: string;
  clientName?: string;
  fiscalYear?: number | string;
  includeLetterheadEveryPage?: boolean;
  officeProfile?: OfficeProfile;
}

/**
 * Creates high-fidelity official letterhead banner canvas for PDF exports
 */
export function drawLetterheadCanvas(
  profile?: OfficeProfile,
  recordId?: string,
  title?: string,
  clientName?: string,
  widthPx: number = 1600,
  heightPx: number = 170
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = widthPx;
  c.height = heightPx;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  // Background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Top emerald accent bar
  const grad = ctx.createLinearGradient(0, 0, widthPx, 0);
  grad.addColorStop(0, '#064e3b');
  grad.addColorStop(0.5, '#047857');
  grad.addColorStop(1, '#0f766e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, widthPx, 8);

  // Right Side (RTL): Office & Auditor Credentials
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Office Name
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 28px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  ctx.fillText(profile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات', widthPx - 30, 44);

  // Auditor & License
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 21px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  ctx.fillText(
    `${profile?.auditorName || 'محمد جميل مرعي'} • قيد س.م.م: ${profile?.licenseNumber || '43122'}`,
    widthPx - 30,
    76
  );

  // Subtitle / Contact
  ctx.fillStyle = '#64748b';
  ctx.font = '15px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  ctx.fillText(
    `عضو جمعية المحاسبين والمراجعين المصرية • هاتف: ${profile?.phone || '01003335360'} • ${profile?.address || 'جمهورية مصر العربية'}`,
    widthPx - 30,
    106
  );

  // Left Side Box: Document Title, Record ID, Date
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';

  // Rounded badge container
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(30, 16, 500, 110, 8);
  ctx.fill();
  ctx.stroke();

  // Document Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  const cleanDocTitle = (title || 'تقرير مالي معتمد').slice(0, 38);
  ctx.fillText(cleanDocTitle, 45, 46);

  // Record ID (Immutable)
  if (recordId) {
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(`ID: ${recordId}`, 45, 75);
  }

  // Client Name & Date
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  const clSnippet = clientName ? `العميل: ${clientName.slice(0, 24)} • ` : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.fillText(`${clSnippet}تاريخ: ${dateStr}`, 45, 104);

  // Bottom green separating line
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(25, heightPx - 6);
  ctx.lineTo(widthPx - 25, heightPx - 6);
  ctx.stroke();

  return c;
}

/**
 * Creates running footer canvas for PDF exports
 */
export function drawRunningFooterCanvas(
  pageIndex: number,
  totalPages: number,
  recordId?: string,
  widthPx: number = 1600,
  heightPx: number = 65
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = widthPx;
  c.height = heightPx;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Top line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(25, 6);
  ctx.lineTo(widthPx - 25, 6);
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "Cairo", "IBM Plex Sans Arabic", Tahoma, sans-serif';
  ctx.fillText(
    `وثيقة رسمية معتمدة وفقاً لمعايير المحاسبة المصرية (EAS) • كود السجل المعتمد: [${recordId || 'FS-OFFICIAL'}]`,
    widthPx - 30,
    36
  );

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px "JetBrains Mono", "Cairo", sans-serif';
  ctx.fillText(`صفحة ${pageIndex + 1} من ${totalPages}`, 35, 36);

  return c;
}

/**
 * Export HTML element to PDF with high-DPI rendering, official office letterhead on EVERY page,
 * and immutable record ID binding to prevent data crossover.
 */
export async function exportElementToPdf(
  elementIdOrSelector?: string,
  filename: string = 'المستند_المعتمد.pdf',
  options?: PdfExportOptions
): Promise<boolean> {
  const element = findTargetElement(elementIdOrSelector);
  if (!element) {
    console.error(`Target element for PDF export could not be found.`);
    return false;
  }

  try {
    // Ensure all web fonts are loaded
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // continue if fonts ready throws
      }
    }

    const orientation = options?.orientation || 'portrait';
    const format = options?.format || 'a4';
    const recordId = options?.recordId?.trim();
    const docTitle = options?.documentTitle || filename.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const clientName = options?.clientName;
    const includeLetterhead = options?.includeLetterheadEveryPage !== false;

    // Standard A4 dimensions in mm
    const pdfWidth = orientation === 'portrait' ? 210 : 297;
    const pdfHeight = orientation === 'portrait' ? 297 : 210;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    // Generate letterhead image if requested
    let letterheadImgData: string | null = null;
    const letterheadHeightMm = includeLetterhead ? (orientation === 'portrait' ? 22 : 20) : 0;
    const footerHeightMm = includeLetterhead ? 9 : 0;

    if (includeLetterhead) {
      const lhCanvas = drawLetterheadCanvas(
        options?.officeProfile,
        recordId,
        docTitle,
        clientName,
        1800,
        170
      );
      letterheadImgData = lhCanvas.toDataURL('image/png', 1.0);
    }

    // Check if element contains discrete page sheets
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

    const visibleSheets = discreteSheets.filter(
      (s) => s.offsetParent !== null || s.offsetHeight > 0 || (s.style && s.style.display !== 'none')
    );
    const sheetsToCapture = visibleSheets.length > 0 ? visibleSheets : discreteSheets;

    if (sheetsToCapture.length > 0) {
      const totalPages = sheetsToCapture.length;
      for (let i = 0; i < totalPages; i++) {
        const sheet = sheetsToCapture[i];
        if (i > 0) {
          pdf.addPage();
        }

        const sheetCanvas = await html2canvas(sheet, {
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            sanitizeClonedDocForHtml2Canvas(clonedDoc);
          },
        });

        const imgData = sheetCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

        // Stamp running footer on every discrete sheet if requested
        if (includeLetterhead) {
          const ftCanvas = drawRunningFooterCanvas(i, totalPages, recordId, 1600, 65);
          const ftImg = ftCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(ftImg, 'PNG', 6, pdfHeight - footerHeightMm - 2, pdfWidth - 12, footerHeightMm, undefined, 'FAST');
        }
      }

      const cleanFilename = recordId && !filename.includes(recordId)
        ? `${filename.replace(/\.pdf$/i, '')}_${recordId}.pdf`
        : (filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      pdf.save(cleanFilename);
      return true;
    }

    // Continuous element rendering with letterhead on every page
    const marginMm = 6;
    const printableWidth = pdfWidth - marginMm * 2;
    const contentAreaHeightMm = pdfHeight - marginMm * 2 - letterheadHeightMm - footerHeightMm - 4;

    const canvas = await html2canvas(element, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1100),
      onclone: (clonedDoc) => {
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
      },
    });

    const totalContentHeightMm = (canvas.height * printableWidth) / canvas.width;
    const shouldFitSinglePage = options?.fitToSinglePage || totalContentHeightMm <= contentAreaHeightMm * 1.25;

    if (shouldFitSinglePage) {
      // 1. Draw top letterhead banner
      if (letterheadImgData) {
        pdf.addImage(letterheadImgData, 'PNG', marginMm, 4, printableWidth, letterheadHeightMm, undefined, 'FAST');
      }

      // 2. Draw content in the middle
      const contentTopY = 4 + letterheadHeightMm + 2;
      const actualHeight = Math.min(totalContentHeightMm, contentAreaHeightMm);
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        marginMm,
        contentTopY,
        printableWidth,
        actualHeight,
        undefined,
        'FAST'
      );

      // 3. Draw bottom running footer
      if (includeLetterhead) {
        const ftCanvas = drawRunningFooterCanvas(0, 1, recordId, 1600, 65);
        const ftImg = ftCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(ftImg, 'PNG', marginMm, pdfHeight - footerHeightMm - 3, printableWidth, footerHeightMm, undefined, 'FAST');
      }

      const cleanFilename = recordId && !filename.includes(recordId)
        ? `${filename.replace(/\.pdf$/i, '')}_${recordId}.pdf`
        : (filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      pdf.save(cleanFilename);
      return true;
    }

    // Multi-page slicing: every slice gets letterhead on top and footer on bottom!
    const pageCanvasHeight = Math.floor(canvas.width * (contentAreaHeightMm / printableWidth));
    let sourceY = 0;
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
      if (currentSliceHeight <= 4) {
        break;
      }

      if (pageIndex > 0) {
        pdf.addPage();
      }

      // Draw Top Letterhead on EVERY page
      if (letterheadImgData) {
        pdf.addImage(letterheadImgData, 'PNG', marginMm, 4, printableWidth, letterheadHeightMm, undefined, 'FAST');
      }

      // Draw Middle Slice Content
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
        const contentTopY = 4 + letterheadHeightMm + 2;
        pdf.addImage(sliceImgData, 'PNG', marginMm, contentTopY, printableWidth, sliceHeightMm, undefined, 'FAST');
      }

      // Draw Bottom Running Footer on EVERY page
      if (includeLetterhead) {
        const ftCanvas = drawRunningFooterCanvas(pageIndex, totalPages, recordId, 1600, 65);
        const ftImg = ftCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(ftImg, 'PNG', marginMm, pdfHeight - footerHeightMm - 3, printableWidth, footerHeightMm, undefined, 'FAST');
      }

      sourceY += pageCanvasHeight;
      pageIndex++;
    }

    const cleanFilename = recordId && !filename.includes(recordId)
      ? `${filename.replace(/\.pdf$/i, '')}_${recordId}.pdf`
      : (filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Error generating PDF with html2canvas:', error);
    try {
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

    wb.Workbook = {
      Views: [{ RTL: true }],
    };

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

/**
 * Exports complete Financial Statements workbook to Excel (.xlsx)
 * with the official office letterhead banner embedded on EVERY worksheet,
 * and immutable recordId reference for audit consistency.
 */
export function exportFinancialStatementsToExcelWithLetterhead(options: {
  recordId: string;
  clientName: string;
  fiscalYear: number | string;
  officeProfile: OfficeProfile;
  incomeStatement?: any;
  balanceSheet?: any;
  cashFlowStatement?: any;
  trialBalanceAccounts?: any[];
  customFilename?: string;
}): boolean {
  try {
    const {
      recordId,
      clientName,
      fiscalYear,
      officeProfile,
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
      trialBalanceAccounts,
      customFilename,
    } = options;

    const wb = XLSX.utils.book_new();

    const makeLetterheadRows = (sheetTitle: string) => [
      { 'البيان / الحقل الرسمي': 'اسم المنشأة المهنية', 'القيمة / التفاصيل': officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات' },
      { 'البيان / الحقل الرسمي': 'المحاسب القانوني ومراقب الحسابات', 'القيمة / التفاصيل': officeProfile?.auditorName || 'محمد جميل مرعي' },
      { 'البيان / الحقل الرسمي': 'رقم القيد بسجل المحاسبين (س.م.م)', 'القيمة / التفاصيل': officeProfile?.licenseNumber || 'س.م.م 43122' },
      { 'البيان / الحقل الرسمي': 'هاتف وتواصل المكتب', 'القيمة / التفاصيل': officeProfile?.phone || '01003335360' },
      { 'البيان / الحقل الرسمي': 'اسم الشركة / المنشأة المعتمدة', 'القيمة / التفاصيل': clientName || 'شركة النيل للصناعات الهندسية والتجارة' },
      { 'البيان / الحقل الرسمي': 'السنة المالية / الفترة المحاسبية', 'القيمة / التفاصيل': `السنة المنتهية في 31 ديسمبر ${fiscalYear}` },
      { 'البيان / الحقل الرسمي': 'معرف السجل المعتمد (Record ID)', 'القيمة / التفاصيل': recordId },
      { 'البيان / الحقل الرسمي': 'عنوان القائمة / التقرير', 'القيمة / التفاصيل': sheetTitle },
      { 'البيان / الحقل الرسمي': 'معيار الإعداد والاعتماد', 'القيمة / التفاصيل': 'معايير المحاسبة المصرية (EAS) والمعايير الدولية (IFRS)' },
      { 'البيان / الحقل الرسمي': 'حالة الاعتماد والتوثيق', 'القيمة / التفاصيل': 'معتمد ومطابق 100% بالرمز الرقمي الموثق' },
      { 'البيان / الحقل الرسمي': 'تاريخ وتوقيت الاستخراج', 'القيمة / التفاصيل': new Date().toLocaleString('ar-EG') },
      { 'البيان / الحقل الرسمي': '----------------------------------------', 'القيمة / التفاصيل': '----------------------------------------' },
    ];

    // 1. Balance Sheet
    if (balanceSheet) {
      const bsData = [
        ...makeLetterheadRows('قائمة المركز المالي المعتمدة (الميزانية العمومية)'),
        { 'البيان / الحقل الرسمي': '[الأصول غير المتداولة]', 'القيمة / التفاصيل': '' },
        { 'البيان / الحقل الرسمي': 'الأصول الثابتة بالصافي (إيضاح 4)', 'القيمة / التفاصيل': balanceSheet.nonCurrentAssets?.netFixedAssets || 0 },
        { 'البيان / الحقل الرسمي': 'مشروعات تحت التنفيذ', 'القيمة / التفاصيل': balanceSheet.nonCurrentAssets?.projectsInProgress || 0 },
        { 'البيان / الحقل الرسمي': 'إجمالي الأصول غير المتداولة', 'القيمة / التفاصيل': balanceSheet.nonCurrentAssets?.totalNonCurrentAssets || 0 },
        { 'البيان / الحقل الرسمي': '[الأصول المتداولة]', 'القيمة / التفاصيل': '' },
        { 'البيان / الحقل الرسمي': 'المخزون السلعي (إيضاح 5)', 'القيمة / التفاصيل': balanceSheet.currentAssets?.inventory || 0 },
        { 'البيان / الحقل الرسمي': 'العملاء وأوراق القبض (إيضاح 6)', 'القيمة / التفاصيل': (balanceSheet.currentAssets?.tradeReceivables || 0) + (balanceSheet.currentAssets?.notesReceivable || 0) },
        { 'البيان / الحقل الرسمي': 'أرصدة مدينة وأخرى (إيضاح 7)', 'القيمة / التفاصيل': balanceSheet.currentAssets?.otherDebitBalances || 0 },
        { 'البيان / الحقل الرسمي': 'النقدية بالبنوك والصندوق (إيضاح 8)', 'القيمة / التفاصيل': balanceSheet.currentAssets?.cashAndBanks || 0 },
        { 'البيان / الحقل الرسمي': 'إجمالي الأصول المتداولة', 'القيمة / التفاصيل': balanceSheet.currentAssets?.totalCurrentAssets || 0 },
        { 'البيان / الحقل الرسمي': '*** إجمالي الأصول ***', 'القيمة / التفاصيل': balanceSheet.totalAssets || 0 },
        { 'البيان / الحقل الرسمي': '[حقوق الملكية]', 'القيمة / التفاصيل': '' },
        { 'البيان / الحقل الرسمي': 'رأس المال المصدر والمدفوع (إيضاح 9)', 'القيمة / التفاصيل': balanceSheet.equity?.paidUpCapital || 0 },
        { 'البيان / الحقل الرسمي': 'الاحتياطي القانوني', 'القيمة / التفاصيل': balanceSheet.equity?.legalReserve || 0 },
        { 'البيان / الحقل الرسمي': 'الأرباح (الخسائر) المرحلة', 'القيمة / التفاصيل': balanceSheet.equity?.retainedEarnings || 0 },
        { 'البيان / الحقل الرسمي': 'صافي ربح العام الحالي', 'القيمة / التفاصيل': balanceSheet.equity?.currentYearNetProfit || 0 },
        { 'البيان / الحقل الرسمي': 'إجمالي حقوق الملكية', 'القيمة / التفاصيل': balanceSheet.totalEquity || 0 },
        { 'البيان / الحقل الرسمي': '[الالتزامات]', 'القيمة / التفاصيل': '' },
        { 'البيان / الحقل الرسمي': 'التزامات غير متداولة (قروض طويلة الأجل)', 'القيمة / التفاصيل': balanceSheet.nonCurrentLiabilities?.longTermLoans || 0 },
        { 'البيان / الحقل الرسمي': 'الموردون وأوراق الدفع (إيضاح 10)', 'القيمة / التفاصيل': (balanceSheet.currentLiabilities?.tradePayables || 0) + (balanceSheet.currentLiabilities?.notesPayable || 0) },
        { 'البيان / الحقل الرسمي': 'مخصص الضرائب المستحقة', 'القيمة / التفاصيل': balanceSheet.currentLiabilities?.incomeTaxPayable || 0 },
        { 'البيان / الحقل الرسمي': 'إجمالي الالتزامات المتداولة', 'القيمة / التفاصيل': balanceSheet.currentLiabilities?.totalCurrentLiabilities || 0 },
        { 'البيان / الحقل الرسمي': '*** إجمالي حقوق الملكية والالتزامات ***', 'القيمة / التفاصيل': balanceSheet.totalEquityAndLiabilities || 0 },
      ];
      const wsBS = XLSX.utils.json_to_sheet(bsData);
      wsBS['!views'] = [{ RTL: true }];
      wsBS['!cols'] = [{ wch: 42 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, wsBS, '1. المركز المالي');
    }

    // 2. Income Statement
    if (incomeStatement) {
      const isData = [
        ...makeLetterheadRows('قائمة الدخل الشامل (الأرباح والخسائر)'),
        { 'البيان / الحقل الرسمي': 'إيرادات النشاط والمبيعات', 'القيمة / التفاصيل': incomeStatement.revenuesTotal || 0 },
        { 'البيان / الحقل الرسمي': 'يخصم: تكلفة المبيعات والحصول على الإيراد', 'القيمة / التفاصيل': -(incomeStatement.costOfGoodsSold || 0) },
        { 'البيان / الحقل الرسمي': '*** مجمل الربح ***', 'القيمة / التفاصيل': incomeStatement.grossProfit || 0 },
        { 'البيان / الحقل الرسمي': 'يخصم: المصروفات الإدارية والعمومية والتسويقية', 'القيمة / التفاصيل': -((incomeStatement.administrativeExpenses || 0) + (incomeStatement.sellingAndMarketingExpenses || 0)) },
        { 'البيان / الحقل الرسمي': 'يخصم: إهلاك الأصول الثابتة', 'القيمة / التفاصيل': -(incomeStatement.depreciationExpense || 0) },
        { 'البيان / الحقل الرسمي': 'أرباح التشغيل قبل الفوائد والضرائب (EBIT)', 'القيمة / التفاصيل': incomeStatement.operatingProfit || 0 },
        { 'البيان / الحقل الرسمي': 'يخصم: التكاليف التمويلية والفوائد البنكية', 'القيمة / التفاصيل': -(incomeStatement.financeCosts || 0) },
        { 'البيان / الحقل الرسمي': 'أرباح / (إيرادات) أخرى', 'القيمة / التفاصيل': incomeStatement.otherIncomes || 0 },
        { 'البيان / الحقل الرسمي': 'صافي الأرباح قبل ضريبة الدخل (EBT)', 'القيمة / التفاصيل': incomeStatement.profitBeforeTax || 0 },
        { 'البيان / الحقل الرسمي': 'يخصم: ضريبة الدخل المستحقة (22.5%)', 'القيمة / التفاصيل': -(incomeStatement.taxExpense || 0) },
        { 'البيان / الحقل الرسمي': '*** صافي أرباح العام بعد الضريبة ***', 'القيمة / التفاصيل': incomeStatement.netProfitAfterTax || 0 },
      ];
      const wsIS = XLSX.utils.json_to_sheet(isData);
      wsIS['!views'] = [{ RTL: true }];
      wsIS['!cols'] = [{ wch: 42 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, wsIS, '2. قائمة الدخل');
    }

    // 3. Cash Flow Statement
    if (cashFlowStatement) {
      const cfData = [
        ...makeLetterheadRows('قائمة التدفقات النقدية (الطريقة غير المباشرة EAS 4)'),
        { 'البيان / الحقل الرسمي': 'صافي التدفقات النقدية من الأنشطة التشغيلية', 'القيمة / التفاصيل': cashFlowStatement.operatingCashFlow?.netOperatingCash || 0 },
        { 'البيان / الحقل الرسمي': 'صافي التدفقات النقدية المستخدمة في الأنشطة الاستثمارية', 'القيمة / التفاصيل': cashFlowStatement.investingCashFlow?.netInvestingCash || 0 },
        { 'البيان / الحقل الرسمي': 'صافي التدفقات النقدية من الأنشطة التمويلية', 'القيمة / التفاصيل': cashFlowStatement.financingCashFlow?.netFinancingCash || 0 },
        { 'البيان / الحقل الرسمي': 'صافي الزيادة (النقص) في النقدية خلال العام', 'القيمة / التفاصيل': cashFlowStatement.netChangeInCash || 0 },
        { 'البيان / الحقل الرسمي': 'رصيد النقدية وما في حكمها في بداية السنة المالية', 'القيمة / التفاصيل': cashFlowStatement.beginningCash || 0 },
        { 'البيان / الحقل الرسمي': '*** رصيد النقدية وما في حكمها في نهاية السنة المالية ***', 'القيمة / التفاصيل': cashFlowStatement.endingCash || 0 },
      ];
      const wsCF = XLSX.utils.json_to_sheet(cfData);
      wsCF['!views'] = [{ RTL: true }];
      wsCF['!cols'] = [{ wch: 45 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsCF, '3. التدفقات النقدية');
    }

    // 4. Trial Balance Accounts if available
    if (trialBalanceAccounts && trialBalanceAccounts.length > 0) {
      const tbHeader = makeLetterheadRows('ميزان المراجعة بالأرصدة والمجاميع المربوط بالقوائم');
      const tbRows = [
        ...tbHeader,
        ...trialBalanceAccounts.map((a: any) => ({
          'البيان / الحقل الرسمي': `[${a.code || ''}] ${a.name || ''}`,
          'القيمة / التفاصيل': `رصيد مدين: ${(a.endingBalanceDebit || 0).toLocaleString('ar-EG')} | رصيد دائن: ${(a.endingBalanceCredit || 0).toLocaleString('ar-EG')}`,
        })),
      ];
      const wsTB = XLSX.utils.json_to_sheet(tbRows);
      wsTB['!views'] = [{ RTL: true }];
      wsTB['!cols'] = [{ wch: 45 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(wb, wsTB, '4. ميزان المراجعة المربوط');
    }

    wb.Workbook = { Views: [{ RTL: true }] };

    const safeClient = (clientName || 'الشركة').replace(/\s+/g, '_');
    const filename = customFilename || `القوائم_المالية_${safeClient}_${recordId}_${fiscalYear}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    triggerFileDownload(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting financial statements to Excel with letterhead:', error);
    return false;
  }
}
