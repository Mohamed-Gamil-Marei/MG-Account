/**
 * Utilities and helpers for managing form drafts and auto-save persistence in localStorage.
 */

export interface FormDraftMeta {
  savedAt: string; // ISO timestamp
  timeFormatted: string; // Arabic localized time string
}

export interface JournalEntryDraft {
  date: string;
  entryType: string;
  description: string;
  lines: Array<{
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  aiPrompt?: string;
  aiAmount?: number | '';
  aiExplanation?: string | null;
  meta: FormDraftMeta;
}

export interface InvoiceDraft {
  invoiceType: 'SALES' | 'PURCHASE';
  date: string;
  dueDate: string;
  partnerName: string;
  partnerTaxNo: string;
  items: Array<{
    id: string;
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountRate: number;
    vatRate: number;
    whtRate: number;
    totalBeforeTax: number;
    vatAmount: number;
    whtAmount: number;
    netTotal: number;
  }>;
  applyWht: boolean;
  meta: FormDraftMeta;
}

const STORAGE_KEYS = {
  JOURNAL_ENTRY_DRAFT: 'acc_system_journal_entry_draft_v1',
  INVOICE_DRAFT: 'acc_system_invoice_draft_v1',
};

function formatArabicTime(date: Date): string {
  try {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export const formDraftStorage = {
  // Journal Entry Draft
  saveJournalDraft: (draft: Omit<JournalEntryDraft, 'meta'>): FormDraftMeta => {
    try {
      const now = new Date();
      const meta: FormDraftMeta = {
        savedAt: now.toISOString(),
        timeFormatted: formatArabicTime(now),
      };
      const fullDraft: JournalEntryDraft = { ...draft, meta };
      localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT, JSON.stringify(fullDraft));
      return meta;
    } catch (e) {
      console.warn('Failed to save journal entry draft to localStorage', e);
      return {
        savedAt: new Date().toISOString(),
        timeFormatted: formatArabicTime(new Date()),
      };
    }
  },

  getJournalDraft: (): JournalEntryDraft | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw) as JournalEntryDraft;
    } catch (e) {
      console.warn('Failed to parse journal entry draft', e);
      return null;
    }
  },

  clearJournalDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT);
    } catch (e) {
      console.warn('Failed to clear journal entry draft', e);
    }
  },

  // Invoice Draft
  saveInvoiceDraft: (draft: Omit<InvoiceDraft, 'meta'>): FormDraftMeta => {
    try {
      const now = new Date();
      const meta: FormDraftMeta = {
        savedAt: now.toISOString(),
        timeFormatted: formatArabicTime(now),
      };
      const fullDraft: InvoiceDraft = { ...draft, meta };
      localStorage.setItem(STORAGE_KEYS.INVOICE_DRAFT, JSON.stringify(fullDraft));
      return meta;
    } catch (e) {
      console.warn('Failed to save invoice draft to localStorage', e);
      return {
        savedAt: new Date().toISOString(),
        timeFormatted: formatArabicTime(new Date()),
      };
    }
  },

  getInvoiceDraft: (): InvoiceDraft | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVOICE_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw) as InvoiceDraft;
    } catch (e) {
      console.warn('Failed to parse invoice draft', e);
      return null;
    }
  },

  clearInvoiceDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.INVOICE_DRAFT);
    } catch (e) {
      console.warn('Failed to clear invoice draft', e);
    }
  },
};
