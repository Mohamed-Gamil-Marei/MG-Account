/**
 * Utilities and helpers for managing form drafts and auto-save persistence in localStorage.
 * Ensures zero data loss during network disconnection (offline mode) or unexpected page reloads.
 */

import { useState, useEffect, useCallback } from 'react';
import { JournalEntryLine, InvoiceItem, CurrencyCode } from '../types';

export interface FormDraftMeta {
  savedAt: string; // ISO timestamp
  timeFormatted: string; // Arabic localized time string
}

export interface JournalEntryDraft {
  date: string;
  entryType: string;
  description: string;
  clientId?: string | null;
  currency?: CurrencyCode;
  exchangeRate?: number;
  entryFormMode?: 'WIZARD' | 'CLASSIC';
  entryStep?: number;
  lines: JournalEntryLine[];
  aiPrompt?: string;
  aiAmount?: number | '';
  aiExplanation?: string | null;
  meta: FormDraftMeta;
}

export interface InvoiceDraft {
  invoiceType: 'SALES' | 'PURCHASE' | 'OFFICE_SERVICE';
  isReceipt?: boolean;
  docType?: 'I' | 'C' | 'D';
  receiverType?: 'B' | 'P' | 'F';
  date: string;
  dueDate: string;
  partnerName: string;
  partnerTaxNo: string;
  partnerNationalId?: string;
  partnerAddress?: string;
  paymentMethod?: 'BANK' | 'CASH' | 'INSTAPAY' | 'CREDIT';
  notes?: string;
  items: InvoiceItem[];
  applyWht: boolean;
  autoPostOnIssue?: boolean;
  meta: FormDraftMeta;
}

const STORAGE_KEYS = {
  JOURNAL_ENTRY_DRAFT: 'acc_system_journal_entry_draft_v2',
  JOURNAL_ENTRY_DRAFT_LEGACY: 'acc_system_journal_entry_draft_v1',
  INVOICE_DRAFT: 'acc_system_invoice_draft_v2',
  INVOICE_DRAFT_LEGACY: 'acc_system_invoice_draft_v1',
  CUSTOMS_DRAFT: 'acc_system_customs_draft_v1',
};

export function formatArabicTime(date: Date = new Date()): string {
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
      let raw = localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT);
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT_LEGACY);
      }
      if (!raw) return null;
      return JSON.parse(raw) as JournalEntryDraft;
    } catch (e) {
      console.warn('Failed to parse journal entry draft', e);
      return null;
    }
  },

  hasJournalDraft: (): boolean => {
    try {
      const draft = formDraftStorage.getJournalDraft();
      if (!draft) return false;
      return (
        Boolean(draft.description?.trim()) ||
        Boolean(draft.aiPrompt?.trim()) ||
        Boolean(draft.lines?.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
      );
    } catch {
      return false;
    }
  },

  clearJournalDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRY_DRAFT_LEGACY);
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
      let raw = localStorage.getItem(STORAGE_KEYS.INVOICE_DRAFT);
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEYS.INVOICE_DRAFT_LEGACY);
      }
      if (!raw) return null;
      return JSON.parse(raw) as InvoiceDraft;
    } catch (e) {
      console.warn('Failed to parse invoice draft', e);
      return null;
    }
  },

  hasInvoiceDraft: (): boolean => {
    try {
      const draft = formDraftStorage.getInvoiceDraft();
      if (!draft) return false;
      return (
        Boolean(draft.partnerName?.trim()) ||
        Boolean(draft.partnerTaxNo?.trim()) ||
        Boolean(draft.notes?.trim()) ||
        Boolean(draft.items?.some((it) => it.description?.trim() || (Number(it.unitPrice) || 0) > 0))
      );
    } catch {
      return false;
    }
  },

  clearInvoiceDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.INVOICE_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.INVOICE_DRAFT_LEGACY);
    } catch (e) {
      console.warn('Failed to clear invoice draft', e);
    }
  },

  // Customs Shipment Draft
  saveCustomsDraft: (draft: any): FormDraftMeta => {
    try {
      const now = new Date();
      const meta: FormDraftMeta = {
        savedAt: now.toISOString(),
        timeFormatted: formatArabicTime(now),
      };
      const fullDraft = { ...draft, meta };
      localStorage.setItem(STORAGE_KEYS.CUSTOMS_DRAFT, JSON.stringify(fullDraft));
      return meta;
    } catch (e) {
      console.warn('Failed to save customs draft to localStorage', e);
      return {
        savedAt: new Date().toISOString(),
        timeFormatted: formatArabicTime(new Date()),
      };
    }
  },

  getCustomsDraft: (): any | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMS_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse customs draft', e);
      return null;
    }
  },

  hasCustomsDraft: (): boolean => {
    try {
      const draft = formDraftStorage.getCustomsDraft();
      if (!draft) return false;
      return Boolean(
        draft.shipmentNumber?.trim() ||
        draft.importerExporterName?.trim() ||
        draft.customsDeclarationNo?.trim() ||
        draft.acidNumber?.trim() ||
        draft.goodsDescription?.trim()
      );
    } catch {
      return false;
    }
  },

  clearCustomsDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOMS_DRAFT);
    } catch (e) {
      console.warn('Failed to clear customs draft', e);
    }
  },
};

/**
 * Custom React Hook to detect network connection status (online / offline)
 * in real-time, helping users know when work is being kept safely in LocalStorage.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

