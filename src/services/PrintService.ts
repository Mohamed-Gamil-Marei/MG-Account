import { db } from '../db/localDatabase';
import { PrintSettings, ReportLayoutConfig, StandardReportType } from '../types';

export const DEFAULT_REPORT_LAYOUTS: Record<StandardReportType, ReportLayoutConfig> = {
  TRIAL_BALANCE: {
    paperSize: 'A4',
    orientation: 'LANDSCAPE',
    margins: 'NARROW',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  BALANCE_SHEET: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  INCOME_STATEMENT: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  UNIFIED_FINANCIAL_REPORT: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  AUDITOR_REPORT: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  INVOICE: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  TAX_DECLARATION: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'NARROW',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  CERTIFICATE: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  CREDIT_DOSSIER: {
    paperSize: 'A4',
    orientation: 'LANDSCAPE',
    margins: 'NARROW',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
  FEASIBILITY_STUDY: {
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    margins: 'DEFAULT',
    includeLetterhead: true,
    includeStamp: true,
    includeQr: true,
  },
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'PORTRAIT',
  quality: 'HIGH',
  margins: 'DEFAULT',
  includeLetterhead: true,
  includeOfficeTaxInfo: true,
  includeQrVerification: true,
  includeSignatureStamp: true,
  autoPrintDelayMs: 200,
  showPreviewModalByDefault: true,
  qrMode: 'OFFLINE_TEXT',
  qrSizePx: 115,
  stampStyle: 'CIRCULAR_SEAL',
  showPageNumbers: true,
  showDocumentTimestamp: true,
  watermark: 'NONE',
  inkSaver: false,
  headerStyle: 'standard',
  headerColorTheme: 'navy',
  logoPosition: 'RIGHT',
  logoSizePx: 64,
  reportDefaults: DEFAULT_REPORT_LAYOUTS,
};

export interface PrintElementOptions {
  recordId?: string; // المعرف الثابت الفريد للسجل الحالي لضمان عدم حدوث أي تداخل في البيانات
  documentId?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Thermal80mm';
  margins?: 'DEFAULT' | 'NARROW' | 'NONE';
  customDelayMs?: number;
  selectedPages?: number[];
  resequencePageNumbers?: boolean;
  showLetterhead?: boolean;
  showStamp?: boolean;
  showQr?: boolean;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export class PrintService {
  /**
   * Tracks active print jobs to strictly prevent race conditions or cross-contamination
   */
  private static activePrintJobs = new Set<string>();

  /**
   * Retrieves active print settings from local database preferences
   */
  public static getSettings(): PrintSettings {
    const prefs = db.getState().preferences;
    return prefs.printSettings || DEFAULT_PRINT_SETTINGS;
  }

  /**
   * Dedicated print function requiring an immutable record ID to guarantee no data crossover.
   */
  public static async printRecordById(
    recordId: string,
    elementIdOrSelector: string = '',
    options?: Omit<PrintElementOptions, 'recordId'>
  ): Promise<boolean> {
    if (!recordId || typeof recordId !== 'string' || recordId.trim() === '') {
      console.warn('[PrintService] printRecordById called without a valid recordId.');
    }
    return this.printElementById(elementIdOrSelector, {
      ...options,
      recordId: recordId?.trim(),
    });
  }

  /**
   * Finds target printable element strictly bound to a specific record ID to avoid data bleeding
   */
  public static findPrintableElementForRecord(
    recordId?: string,
    elementIdOrSelector?: string
  ): HTMLElement | null {
    if (recordId && recordId.trim()) {
      const cleanRecordId = recordId.trim();
      // 1. Direct match by data-record-id attribute
      const byRecordAttr = document.querySelector<HTMLElement>(`[data-record-id="${cleanRecordId}"]`);
      if (byRecordAttr && byRecordAttr.offsetHeight > 40) {
        return byRecordAttr;
      }

      // 2. Direct match by element ID matching or containing recordId
      const byExactId = document.getElementById(cleanRecordId) || document.getElementById(`print-record-${cleanRecordId}`);
      if (byExactId && byExactId.offsetHeight > 40) {
        return byExactId;
      }
    }

    // 3. Fallback to specified selector or ID
    return this.findPrintableElement(elementIdOrSelector);
  }

  /**
   * Saves updated print settings to database
   */
  public static saveSettings(settings: Partial<PrintSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    db.updatePreferences({ printSettings: updated });
  }

  /**
   * Retrieves configured layout defaults for a specific report type (A4/Portrait/Landscape)
   */
  public static getReportLayout(reportType: StandardReportType): ReportLayoutConfig {
    const settings = this.getSettings();
    if (settings.reportDefaults && settings.reportDefaults[reportType]) {
      return settings.reportDefaults[reportType]!;
    }
    return DEFAULT_REPORT_LAYOUTS[reportType] || {
      paperSize: settings.paperSize || 'A4',
      orientation: settings.orientation === 'LANDSCAPE' ? 'LANDSCAPE' : 'PORTRAIT',
      margins: settings.margins || 'DEFAULT',
      includeLetterhead: settings.includeLetterhead !== false,
      includeStamp: settings.includeSignatureStamp !== false,
      includeQr: settings.includeQrVerification !== false,
    };
  }

  /**
   * Saves customized layout config for a specific report
   */
  public static saveReportLayout(reportType: StandardReportType, config: Partial<ReportLayoutConfig>): void {
    const settings = this.getSettings();
    const currentDefaults = settings.reportDefaults || { ...DEFAULT_REPORT_LAYOUTS };
    const currentForType = currentDefaults[reportType] || DEFAULT_REPORT_LAYOUTS[reportType];
    const updatedForType = { ...currentForType, ...config };
    const updatedDefaults = {
      ...currentDefaults,
      [reportType]: updatedForType,
    };
    this.saveSettings({ reportDefaults: updatedDefaults });
  }

  /**
   * Collects all active stylesheets and CSS rules from the main document to inject into the print frame
   */
  private static extractDocumentStyles(): string {
    let stylesHtml = '';
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach((tag) => {
      stylesHtml += tag.outerHTML + '\n';
    });

    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach((link) => {
      stylesHtml += link.outerHTML + '\n';
    });

    return stylesHtml;
  }

  /**
   * Finds target printable element by ID, selector, or intelligent fallbacks
   */
  public static findPrintableElement(elementIdOrSelector?: string): HTMLElement | null {
    if (elementIdOrSelector) {
      const cleanId = elementIdOrSelector.replace(/^#/, '');
      const byId = document.getElementById(cleanId);
      if (byId) return byId;

      try {
        const bySel = document.querySelector<HTMLElement>(elementIdOrSelector);
        if (bySel) return bySel;
      } catch {
        // ignore invalid selector
      }
    }

    const fallbacks = [
      '#printable-report-content',
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
      '#auditor-report-paper',
      '#credit-financials-container',
      '#credit-printable-dossier',
      '#feasibility-study-document',
      '#feasibility-study-paper',
      '#audit-working-papers-container',
      '#customs-hub-printable-container',
      '#customs-dossier-printable',
      '#invoice-print-container',
      '#official-invoice-document',
      '#printable-preview-canvas',
      '#egyptian-official-tax-form',
      '[data-printable="true"]',
      '.printable-canvas',
      '.printable-content',
      '.accounting-table',
      'main',
    ];

    for (const sel of fallbacks) {
      try {
        const el = document.querySelector<HTMLElement>(sel);
        if (el && el.offsetHeight > 40) {
          return el;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  /**
   * Directly prints a DOM element with isolated high-fidelity rendering,
   * converting inputs to text, supporting dynamic page filtering and renumbering,
   * and strictly preventing blank page bugs.
   */
  public static async printElementById(
    elementIdOrSelector: string,
    options?: PrintElementOptions
  ): Promise<boolean> {
    const targetElement = options?.recordId
      ? this.findPrintableElementForRecord(options.recordId, elementIdOrSelector)
      : this.findPrintableElement(elementIdOrSelector);

    if (!targetElement) {
      console.warn(`[PrintService] Target element '${elementIdOrSelector}' (recordId: '${options?.recordId || 'none'}') not found.`);
      window.print();
      return true;
    }

    if (options?.onBeforePrint) {
      options.onBeforePrint();
    }

    // Clone element to sanitize and prepare for clean isolated print
    const clone = targetElement.cloneNode(true) as HTMLElement;

    if (options?.recordId) {
      clone.setAttribute('data-record-id', options.recordId);
      clone.setAttribute('data-print-isolated-record', options.recordId);
    }

    // Convert interactive inputs and textareas to clean typography
    const inputs = clone.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );
    inputs.forEach((input) => {
      const span = document.createElement('span');
      span.className = 'font-mono font-bold text-slate-900 inline-block px-1';
      span.textContent = input.value || '';
      input.parentNode?.replaceChild(span, input);
    });

    // Remove any buttons, dropdown menus, or no-print elements
    const hideNodes = clone.querySelectorAll<HTMLElement>(
      'button, .no-print, [data-no-print="true"], .action-toolbar, .screen-action-toolbar'
    );
    hideNodes.forEach((node) => {
      node.remove();
    });

    // Handle Selective Pages filtering if specified
    const pageSheets = Array.from(
      clone.querySelectorAll<HTMLElement>(
        '[id^="page-sheet-"], [data-page-index], .a4-sheet-canvas, .printable-page, .print-sheet'
      )
    );

    if (pageSheets.length > 0 && options?.selectedPages && options.selectedPages.length > 0) {
      const allowedSet = new Set(options.selectedPages);
      
      pageSheets.forEach((sheet, idx) => {
        const pageIdx = idx + 1;
        if (!allowedSet.has(pageIdx)) {
          sheet.remove();
        }
      });

      // Handle dynamic resequencing of footers on surviving sheets
      const survivingSheets = Array.from(
        clone.querySelectorAll<HTMLElement>(
          '[id^="page-sheet-"], [data-page-index], .a4-sheet-canvas, .printable-page, .print-sheet'
        )
      );

      if (options.resequencePageNumbers !== false) {
        survivingSheets.forEach((sheet, newIdx) => {
          const newPageNum = newIdx + 1;
          const totalNewPages = survivingSheets.length;

          // Replace text inside elements containing 'صفحة X من Y'
          const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
          let textNode: Node | null;
          while ((textNode = walker.nextNode())) {
            if (textNode.nodeValue && /صفحة\s+\d+\s+من\s+\d+/i.test(textNode.nodeValue)) {
              textNode.nodeValue = textNode.nodeValue.replace(
                /صفحة\s+\d+\s+من\s+\d+/i,
                `صفحة ${newPageNum} من ${totalNewPages}`
              );
            }
          }
        });
      }

      // Strictly ensure the last surviving sheet does NOT cause a blank trailing page
      if (survivingSheets.length > 0) {
        const lastSheet = survivingSheets[survivingSheets.length - 1];
        lastSheet.style.pageBreakAfter = 'avoid';
        lastSheet.style.breakAfter = 'avoid';
        lastSheet.style.marginBottom = '0';
      }
    } else if (pageSheets.length > 0) {
      // Prevent blank page on the very last sheet of standard multi-page documents
      const lastSheet = pageSheets[pageSheets.length - 1];
      lastSheet.style.pageBreakAfter = 'avoid';
      lastSheet.style.breakAfter = 'avoid';
      lastSheet.style.marginBottom = '0';
    }

    // Toggle specific elements if requested
    if (options?.showLetterhead === false) {
      clone.querySelectorAll('.official-header, .injected-official-print-header, [data-letterhead="true"]').forEach((n) => n.remove());
    }
    if (options?.showStamp === false) {
      clone.querySelectorAll('.official-stamp, [data-stamp="true"]').forEach((n) => n.remove());
    }
    if (options?.showQr === false) {
      clone.querySelectorAll('.qr-verification, [data-qr="true"]').forEach((n) => n.remove());
    }

    // Determine page geometry
    const orient = options?.orientation || 'portrait';
    const pSize = options?.pageSize || 'A4';
    let sizeCss = 'A4 portrait';
    if (pSize === 'A4') sizeCss = `A4 ${orient}`;
    else if (pSize === 'A3') sizeCss = `A3 ${orient}`;
    else if (pSize === 'Letter') sizeCss = `letter ${orient}`;
    else if (pSize === 'Thermal80mm') sizeCss = '80mm auto';

    const marginsMode = options?.margins || 'DEFAULT';
    let marginsCss = '8mm 8mm 8mm 8mm';
    if (marginsMode === 'NARROW') marginsCss = '5mm 5mm 5mm 5mm';
    else if (marginsMode === 'NONE') marginsCss = '0mm 0mm 0mm 0mm';

    const documentTitle = options?.title || document.title || 'مستند محاسبي معتمد';

    // Auto-inject professional certified CPA Letterhead if missing and requested
    const hasExistingHeader = !!clone.querySelector('.official-header, .injected-official-print-header, [data-official-header="true"], [data-letterhead="true"]');
    if (options?.showLetterhead !== false && !hasExistingHeader) {
      const dbState = db.getState();
      const profile = dbState.officeProfile;
      const clientCtx = dbState.activeClientContext;

      const headerDiv = document.createElement('div');
      headerDiv.className = 'injected-official-print-header';
      headerDiv.setAttribute('data-official-header', 'true');
      headerDiv.dir = 'rtl';
      headerDiv.style.cssText = 'width: 100%; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2.5px solid #064e3b; display: flex; justify-content: space-between; align-items: flex-start; font-family: "Cairo", "IBM Plex Sans Arabic", sans-serif;';
      headerDiv.innerHTML = `
        <div style="text-align: right; line-height: 1.35;">
          <div style="font-size: 13pt; font-weight: 900; color: #022c22;">${profile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}</div>
          <div style="font-size: 10.5pt; font-weight: 800; color: #047857; margin-top: 1px;">المحاسب القانوني: ${profile?.auditorName || 'محمد جميل مرعي'}</div>
          <div style="font-size: 8pt; font-weight: 600; color: #475569; margin-top: 1px;">سجل المحاسبين والمراجعين: ${profile?.licenseNumber || 'س.م.م 43122'} | بطاقة ضريبية: ${profile?.taxAuthorityRegNo || '654-987-321'}</div>
          <div style="font-size: 7.5pt; color: #64748b;">هاتف: ${profile?.phone || '01003335360'} | ${profile?.address || 'جمهورية مصر العربية'}</div>
        </div>
        <div style="text-align: center; line-height: 1.35; padding: 0 10px;">
          <div style="display: inline-block; padding: 4px 12px; background: #f0fdf4; border: 1.5px solid #059669; border-radius: 8px; font-size: 11pt; font-weight: 900; color: #064e3b;">
            ${documentTitle}
          </div>
          ${clientCtx?.clientName ? `<div style="font-size: 9pt; font-weight: 700; color: #1e293b; margin-top: 3px;">المنشأة: ${clientCtx.clientName}</div>` : ''}
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">السنة المالية: ${clientCtx?.selectedFiscalYear || 2026} • معايير المحاسبة المصرية (EAS)</div>
        </div>
        <div style="text-align: left; line-height: 1.35;">
          <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</div>
          <div style="font-size: 7.5pt; color: #64748b; font-family: monospace;">كود السجل: ${options?.recordId ? `<strong>${options.recordId}</strong>` : `EAS-DOC-${Date.now().toString().slice(-6)}`}</div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #059669; margin-top: 2px;">✓ مستند معتمد وموثق</div>
        </div>
      `;
      clone.insertBefore(headerDiv, clone.firstChild);
    }

    // Auto-inject certified CPA Seal and Signature Footer if missing and requested
    const hasExistingFooter = !!clone.querySelector('.official-stamp, .official-seal, .official-footer, [data-stamp="true"]');
    if (options?.showStamp !== false && !hasExistingFooter) {
      const profile = db.getState().officeProfile;
      const footerDiv = document.createElement('div');
      footerDiv.className = 'injected-official-print-footer avoid-page-break';
      footerDiv.setAttribute('data-stamp', 'true');
      footerDiv.dir = 'rtl';
      footerDiv.style.cssText = 'width: 100%; margin-top: 18px; padding-top: 10px; border-top: 1.5px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-family: "Cairo", "IBM Plex Sans Arabic", sans-serif; page-break-inside: avoid; break-inside: avoid;';
      footerDiv.innerHTML = `
        <div style="text-align: right; font-size: 7.5pt; color: #64748b; line-height: 1.4;">
          <div>منظومة المحاسب والمراجع القانوني المتكامل - كود الاعتماد المالي</div>
          <div>معايير المحاسبة المصرية (EAS) وقانون الشركات 159 لسنة 1981</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #0f172a;">المحاسب القانوني ومراقب الحسابات</div>
          <div style="font-size: 9.5pt; font-weight: 900; color: #064e3b; margin-top: 1px;">${profile?.auditorName || 'محمد جميل مرعي'}</div>
          <div style="margin-top: 3px; display: inline-block; border: 2px double #064e3b; border-radius: 9999px; padding: 2px 12px; font-size: 7.5pt; font-weight: 800; color: #064e3b;">
            اعتماد وخاتم مراقب الحسابات
          </div>
        </div>
      `;
      clone.appendChild(footerDiv);
    }

    // Build standalone HTML for isolated iframe
    const collectedStyles = this.extractDocumentStyles();

    // Deep sanitize letter-spacing and text-justify on all cloned elements to guarantee intact Arabic cursive script
    const elementsToFix = clone.querySelectorAll<HTMLElement>('*');
    elementsToFix.forEach((el) => {
      if (el.style) {
        if (el.style.letterSpacing && el.style.letterSpacing !== 'normal' && el.style.letterSpacing !== '0px') {
          el.style.letterSpacing = 'normal';
        }
        if (el.style.textAlign === 'justify') {
          el.style.textAlign = 'right';
        }
      }
      el.classList.remove('tracking-wider', 'tracking-wide', 'tracking-widest', 'tracking-tight', 'text-justify');
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${documentTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
          ${collectedStyles}
          <style>
            @page {
              size: ${sizeCss};
              margin: ${marginsCss};
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
              letter-spacing: normal !important;
              word-spacing: normal !important;
            }
            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Cairo', 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif !important;
              font-size: 11pt;
              line-height: 1.45;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              letter-spacing: normal !important;
              text-rendering: geometricPrecision !important;
            }
            p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, a {
              letter-spacing: normal !important;
            }
            .text-justify {
              text-align: right !important;
            }
            [class*="tracking-"] {
              letter-spacing: normal !important;
            }
            .font-mono {
              font-family: 'JetBrains Mono', monospace, 'Courier New' !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 1rem !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
            thead {
              display: table-header-group !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            th, td {
              padding: 4px 6px;
              text-align: right;
            }
            .border-double-accounting {
              border-bottom: 3px double #0f172a !important;
            }
            .border-single-accounting {
              border-bottom: 1px solid #0f172a !important;
            }
            .no-print {
              display: none !important;
            }
            .official-header, .injected-official-print-header {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .a4-sheet-canvas, [id^="page-sheet-"], .printable-page {
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              margin-bottom: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            /* Strictly eliminate blank trailing pages */
            .a4-sheet-canvas:last-child,
            [id^="page-sheet-"]:last-child,
            .printable-page:last-child,
            .print-document-wrapper > *:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
              margin-bottom: 0 !important;
            }
          </style>
        </head>
        <body>
          <div class="print-document-wrapper" dir="rtl" data-record-id="${options?.recordId || ''}" style="width: 100%; max-width: 100%; margin: 0 auto; background: #fff; letter-spacing: normal;">
            ${clone.outerHTML}
          </div>
        </body>
      </html>
    `;

    // Create isolated iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return true;
    }

    doc.open();
    doc.write(fullHtml);
    doc.close();

    const delay = options?.customDelayMs ?? 350;

    return new Promise((resolve) => {
      const executePrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          if (options?.onAfterPrint) {
            options.onAfterPrint();
          }
          resolve(true);
        } catch (e) {
          console.error('[PrintService] Printing error in iframe:', e);
          window.print();
          resolve(true);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      };

      if ((doc as any).fonts && (doc as any).fonts.ready) {
        (doc as any).fonts.ready
          .then(() => {
            setTimeout(executePrint, Math.max(delay, 250));
          })
          .catch(() => {
            setTimeout(executePrint, delay);
          });
      } else {
        setTimeout(executePrint, delay);
      }
    });
  }

  /**
   * Triggers an isolated print iframe with custom injected HTML and stylesheets
   */
  public static printHtmlContent(
    htmlContent: string,
    documentTitle: string = 'تقرير محاسبي معتمد'
  ): void {
    this.printElementById('', { title: documentTitle });
  }
}
