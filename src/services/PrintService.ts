import { db } from '../db/localDatabase';
import { PrintSettings } from '../types';

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
};

export class PrintService {
  /**
   * Retrieves active print settings from local database preferences
   */
  public static getSettings(): PrintSettings {
    const prefs = db.getState().preferences;
    return prefs.printSettings || DEFAULT_PRINT_SETTINGS;
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
      const byId = document.getElementById(elementIdOrSelector);
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
      '#official-certificate-document',
      '#credit-financials-container',
      '#credit-printable-dossier',
      '#auditor-report-paper',
      '#printable-preview-canvas',
      '#egyptian-official-tax-form',
      '#office-treasury-voucher-print',
      '#feasibility-study-document',
      '[data-printable="true"]',
      '.printable-canvas',
      '.printable-content',
    ];

    for (const sel of fallbacks) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetHeight > 40) {
        return el;
      }
    }

    return null;
  }

  /**
   * Directly prints a DOM element with isolated high-fidelity rendering,
   * converting inputs to text and preventing blank page bugs.
   */
  public static async printElementById(
    elementIdOrSelector: string,
    options?: {
      title?: string;
      orientation?: 'portrait' | 'landscape';
      pageSize?: 'A4' | 'A3' | 'Letter' | 'Thermal80mm';
      customDelayMs?: number;
      onBeforePrint?: () => void;
      onAfterPrint?: () => void;
    }
  ): Promise<boolean> {
    const targetElement = this.findPrintableElement(elementIdOrSelector);
    if (!targetElement) {
      console.warn(`[PrintService] Target element '${elementIdOrSelector}' not found.`);
      window.print();
      return true;
    }

    if (options?.onBeforePrint) {
      options.onBeforePrint();
    }

    // Clone element to sanitize and prepare for clean print
    const clone = targetElement.cloneNode(true) as HTMLElement;

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

    // Determine page geometry
    const orient = options?.orientation || 'portrait';
    const pSize = options?.pageSize || 'A4';
    let sizeCss = 'A4 portrait';
    if (pSize === 'A4') sizeCss = `A4 ${orient}`;
    else if (pSize === 'A3') sizeCss = `A3 ${orient}`;
    else if (pSize === 'Letter') sizeCss = `letter ${orient}`;
    else if (pSize === 'Thermal80mm') sizeCss = '80mm auto';

    const documentTitle = options?.title || document.title || 'مستند محاسبي معتمد';

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
              margin: 8mm 8mm 10mm 8mm;
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
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              text-align: right;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: 700;
              color: #0f172a;
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
            .page-break-always {
              page-break-after: always !important;
              break-after: page !important;
            }
          </style>
        </head>
        <body>
          <div class="print-document-wrapper" dir="rtl" style="width: 100%; max-width: 100%; margin: 0 auto; background: #fff; letter-spacing: normal;">
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
