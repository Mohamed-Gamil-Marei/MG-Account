import { PrintSettings, StandardReportType, ReportLayoutConfig } from '../types';

export interface PrintElementOptions {
  documentTitle?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'A3' | 'LETTER';
  marginsMm?: { top: number; right: number; bottom: number; left: number };
  scalePercent?: number;
  pageRange?: string;
  [key: string]: any;
}

const STORAGE_KEY = 'mg_cpa_print_settings_v2';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: 'normal',
  customMarginsMm: { top: 12, right: 12, bottom: 12, left: 12 },
  scalePercent: 100,
  fontFamily: 'Cairo, Tajawal, sans-serif',
  baseFontSizePx: 12,
  headerStyle: 'OFFICIAL_BOXED',
  showOfficeHeader: true,
  showClientBanner: true,
  showFooterSignatures: true,
  showPageNumbers: true,
  showPrintTimestamp: true,
  showQrCode: true,
  showCode128Barcode: true,
  showWatermark: true,
  watermarkText: 'مكتب المحاسب القانوني محمد جميل مرعي',
  watermarkOpacity: 0.04,
  useAccountingParentheses: true,
  hideZeroBalances: false,
  colorMode: 'COLOR',
  tableDensity: 'NORMAL',
  qrSizePx: 96,
  qrMode: 'OFFLINE_TEXT',
  reportDefaults: {},
};

export const DEFAULT_REPORT_LAYOUTS: Record<string, ReportLayoutConfig> = {
  TRIAL_BALANCE: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  INCOME_STATEMENT: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  BALANCE_SHEET: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  CASH_FLOW: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  GENERAL_LEDGER: { orientation: 'LANDSCAPE', paperSize: 'A4', margins: 'NARROW', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  JOURNAL_VOUCHER: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  TAX_DECLARATION: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  CERTIFICATE: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  CLIENT_STATEMENT: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  FEASIBILITY_STUDY: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  CREDIT_STUDY: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
  AUDIT_REPORT: { orientation: 'PORTRAIT', paperSize: 'A4', margins: 'DEFAULT', showHeader: true, showFooter: true, showSignatureBlock: true, showStamp: true, showQrVerification: true },
};

export class PrintService {
  public static getSettings(): PrintSettings {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return { ...DEFAULT_PRINT_SETTINGS };
      return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PRINT_SETTINGS };
    }
  }

  public static saveSettings(partial: Partial<PrintSettings>): PrintSettings {
    const merged = { ...this.getSettings(), ...partial };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    } catch {
      // ignore storage errors
    }
    return merged;
  }

  public static getReportLayoutConfig(reportType: StandardReportType): ReportLayoutConfig {
    const settings = this.getSettings();
    const override = settings.reportDefaults?.[reportType] || {};
    return {
      reportType,
      paperSize: override.paperSize || settings.paperSize || 'A4',
      orientation: override.orientation || settings.orientation || 'portrait',
      marginsMm: override.marginsMm || settings.customMarginsMm || { top: 12, right: 12, bottom: 12, left: 12 },
      margins: override.margins || settings.margins || 'normal',
      fontScalePercent: override.fontScalePercent || settings.scalePercent || 100,
      showLogo: override.showLogo ?? settings.showOfficeHeader ?? true,
      showWatermark: override.showWatermark ?? settings.showWatermark ?? true,
      showQrVerification: override.showQrVerification ?? settings.showQrCode ?? true,
      showBarcode: override.showBarcode ?? settings.showCode128Barcode ?? true,
      showSignatureBlock: override.showSignatureBlock ?? settings.showFooterSignatures ?? true,
      showComparativeFigures: override.showComparativeFigures ?? true,
      includeLetterhead: override.includeLetterhead ?? true,
      includeStamp: override.includeStamp ?? true,
    };
  }

  public static findPrintableElement(targetElementId?: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    if (targetElementId) {
      const cleanId = targetElementId.replace(/^#/, '');
      const byId = document.getElementById(cleanId) || document.querySelector(targetElementId);
      if (byId instanceof HTMLElement) return byId;
    }
    const fallback = document.querySelector('[data-printable="true"], .printable-area, main');
    return fallback instanceof HTMLElement ? fallback : document.body;
  }

  public static findPrintableElementForRecord(recordId?: string, targetElementId?: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    if (recordId) {
      const byRecord = document.querySelector(`[data-record-id="${recordId}"]`);
      if (byRecord instanceof HTMLElement) return byRecord;
    }
    return this.findPrintableElement(targetElementId);
  }

  public static async printElementById(targetElementId: string, options?: PrintElementOptions): Promise<boolean> {
    const el = this.findPrintableElement(targetElementId);
    if (!el) return false;
    return this.printHtmlContent(el.outerHTML, options?.documentTitle || document.title, options);
  }

  public static async printRecordById(
    recordId: string,
    fallbackElementId?: string,
    options?: PrintElementOptions
  ): Promise<boolean> {
    const el = this.findPrintableElementForRecord(recordId, fallbackElementId);
    if (!el) return false;
    return this.printHtmlContent(el.outerHTML, options?.documentTitle || document.title, options);
  }

  public static async printHtmlContent(
    htmlContent: string,
    documentTitle = 'وثيقة رسمية معتمدة',
    _options?: PrintElementOptions
  ): Promise<boolean> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
      const prevTitle = document.title;
      document.title = documentTitle;
      window.print();
      document.title = prevTitle;
      return true;
    } catch {
      return false;
    }
  }
}
