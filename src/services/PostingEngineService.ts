/**
 * Automated Posting Engine Service (محرك الترحيل الآلي للقيود المحاسبية)
 * مصمم وفق معايير المحاسبة المصرية (EAS) والدليل المحاسبي الموحد
 */

import { db } from '../db/localDatabase';
import { Invoice, Account, JournalEntry, JournalEntryLine } from '../types';
import { cloudSync } from '../lib/cloudSync';

export interface PostResult {
  success: boolean;
  journalEntry?: JournalEntry;
  error?: string;
}

export interface BatchPostResult {
  totalProcessed: number;
  postedCount: number;
  skippedCount: number;
  errors: string[];
  postedEntries: JournalEntry[];
}

export class PostingEngineService {
  /**
   * البحث عن معرف الحساب أو الكود المناسب من الدليل
   */
  private static findAccount(
    accounts: Account[],
    preferredCodes: string[],
    fallbackCategory: string,
    fallbackName: string
  ): { id: string; code: string; name: string } {
    // 1. Try finding by preferred code
    for (const code of preferredCodes) {
      const acc = accounts.find((a) => a.code === code);
      if (acc) return { id: acc.id, code: acc.code, name: acc.name };
    }

    // 2. Try partial code match
    for (const code of preferredCodes) {
      const acc = accounts.find((a) => a.code.startsWith(code));
      if (acc) return { id: acc.id, code: acc.code, name: acc.name };
    }

    // 3. Try name matching
    const nameMatch = accounts.find(
      (a) => a.name.includes(fallbackName) || fallbackName.includes(a.name)
    );
    if (nameMatch) return { id: nameMatch.id, code: nameMatch.code, name: nameMatch.name };

    // 4. Fallback to category
    const catMatch = accounts.find((a) => a.category === fallbackCategory && a.level >= 2);
    if (catMatch) return { id: catMatch.id, code: catMatch.code, name: catMatch.name };

    // 5. Hard fallback
    return {
      id: `acc-fallback-${preferredCodes[0] || 'gen'}`,
      code: preferredCodes[0] || '1000',
      name: fallbackName,
    };
  }

  /**
   * تجهيز مسودة قيد اليومية لفاتورة مبيعات إلكترونية
   */
  public static buildInvoiceJournalEntry(
    invoice: Invoice,
    accounts: Account[],
    fiscalYear?: number
  ): Omit<JournalEntry, 'id' | 'serialNumber' | 'entryNumber' | 'createdAt' | 'updatedAt' | 'auditTrail'> {
    const lines: JournalEntryLine[] = [];
    const entryFiscalYear = fiscalYear || new Date(invoice.date).getFullYear() || 2026;

    // Accounts resolution:
    // Receivable / Cash / Bank
    let targetPaymentAccount: { id: string; code: string; name: string };
    if (invoice.paymentMethod === 'CASH') {
      targetPaymentAccount = this.findAccount(accounts, ['1250', '1251'], 'ASSETS', 'النقدية بالصندوق (الخزينة الرئيسية)');
    } else if (invoice.paymentMethod === 'BANK' || invoice.paymentMethod === 'INSTAPAY') {
      targetPaymentAccount = this.findAccount(accounts, ['1260', '1261'], 'ASSETS', 'البنوك - الحسابات الجارية');
    } else {
      targetPaymentAccount = this.findAccount(accounts, ['1220', '1221'], 'ASSETS', `العملاء - ${invoice.partnerName || 'مدينون تجاريون'}`);
    }

    // WHT Asset Account (1% أ.ت.ص)
    const whtAccount = this.findAccount(accounts, ['1230', '1231'], 'ASSETS', 'مصلحة الضرائب - ضريبة خصم وتحصيل (أ.ت.ص)');

    // Revenue Account (إيرادات المبيعات)
    const revenueAccount = this.findAccount(accounts, ['4110', '4100', '41'], 'REVENUES', 'إيرادات المبيعات والخدمات');

    // VAT Liability Account (ضريبة القيمة المضافة 14%)
    const vatAccount = this.findAccount(accounts, ['2145', '2140', '214'], 'LIABILITIES', 'مصلحة الضرائب على القيمة المضافة');

    const totalBeforeTax = Math.round((invoice.subtotal - (invoice.totalDiscount || 0)) * 100) / 100;
    const vatAmount = Math.round((invoice.totalVat || 0) * 100) / 100;
    const whtAmount = Math.round((invoice.totalWht || 0) * 100) / 100;
    
    // Net receivable or cash to receive = Total before tax + VAT - WHT
    const netCashOrReceivable = Math.round((totalBeforeTax + vatAmount - whtAmount) * 100) / 100;

    // Line 1: Debit - Cash / Bank / Receivable
    lines.push({
      id: `line-${Date.now()}-1`,
      accountId: targetPaymentAccount.id,
      accountCode: targetPaymentAccount.code,
      accountName: targetPaymentAccount.name,
      currency: 'EGP',
      exchangeRate: 1,
      debit: netCashOrReceivable,
      credit: 0,
      description: `استحقاق فاتورة مبيعات رقم ${invoice.invoiceNumber} - العميل: ${invoice.partnerName}`,
    });

    // Line 2: Debit - WHT (1% Withholding Tax) if applicable
    if (whtAmount > 0) {
      lines.push({
        id: `line-${Date.now()}-2`,
        accountId: whtAccount.id,
        accountCode: whtAccount.code,
        accountName: whtAccount.name,
        currency: 'EGP',
        exchangeRate: 1,
        debit: whtAmount,
        credit: 0,
        description: `ضريبة خصم وتحصيل أ.ت.ص مخصومة من فاتورة ${invoice.invoiceNumber}`,
      });
    }

    // Line 3: Credit - Sales Revenue
    lines.push({
      id: `line-${Date.now()}-3`,
      accountId: revenueAccount.id,
      accountCode: revenueAccount.code,
      accountName: revenueAccount.name,
      currency: 'EGP',
      exchangeRate: 1,
      debit: 0,
      credit: totalBeforeTax,
      description: `إيراد مبيعات فاتورة رقم ${invoice.invoiceNumber}`,
    });

    // Line 4: Credit - VAT (14%) if applicable
    if (vatAmount > 0) {
      lines.push({
        id: `line-${Date.now()}-4`,
        accountId: vatAccount.id,
        accountCode: vatAccount.code,
        accountName: vatAccount.name,
        currency: 'EGP',
        exchangeRate: 1,
        debit: 0,
        credit: vatAmount,
        description: `ضريبة القيمة المضافة 14% على فاتورة رقم ${invoice.invoiceNumber}`,
      });
    }

    // Total verification
    const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);

    return {
      date: invoice.date || new Date().toISOString().substring(0, 10),
      description: `قيد ترحيل آلي لفاتورة مبيعات إلكترونية رقم [${invoice.invoiceNumber}] - العميل: ${invoice.partnerName}`,
      entryType: 'SALES',
      currency: 'EGP',
      clientId: invoice.clientId,
      clientName: invoice.partnerName,
      isPosted: true,
      lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      referenceNumber: invoice.invoiceNumber,
    };
  }

  /**
   * ترحيل فاتورة إلكترونية معينة إلى دفتر اليومية
   */
  public static postInvoice(invoiceId: string, currentUser?: string): PostResult {
    const state = db.getState();
    const invoice = state.invoices.find((i) => i.id === invoiceId);

    if (!invoice) {
      return { success: false, error: 'لم يتم العثور على الفاتورة المطلوبة.' };
    }

    // Check if already posted
    const existingEntry = state.journalEntries.find(
      (je) => je.entryType === 'SALES' && je.referenceNumber === invoice.invoiceNumber
    );
    if (existingEntry) {
      return {
        success: false,
        error: `تم ترحيل هذه الفاتورة مسبقاً بالقيد رقم [${existingEntry.serialNumber}].`,
        journalEntry: existingEntry,
      };
    }

    try {
      const entryDraft = this.buildInvoiceJournalEntry(invoice, state.accounts);
      const diff = Math.abs(entryDraft.totalDebit - entryDraft.totalCredit);

      if (diff > 0.05) {
        return {
          success: false,
          error: `القيد غير متوازن، الفرق بين المدين والدائن: ${diff.toFixed(2)} ج.م`,
        };
      }

      const createdEntry = db.addJournalEntry(entryDraft);

      // Log in audit logs & sync
      db.logAudit(
        'POST',
        `ترحيل آلي للفاتورة رقم ${invoice.invoiceNumber} إلى قيد اليومية رقم ${createdEntry.serialNumber}`,
        null,
        { invoiceId: invoice.id, journalSerial: createdEntry.serialNumber }
      );

      cloudSync.pushStateToCloud(db.getState());

      return {
        success: true,
        journalEntry: createdEntry,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'فشل ترحيل الفاتورة إلى دفتر اليومية.',
      };
    }
  }

  /**
   * ترحيل مجمع لمجموعة فواتير غير مرحلة
   */
  public static batchPostInvoices(invoiceIds: string[], currentUser?: string): BatchPostResult {
    const result: BatchPostResult = {
      totalProcessed: invoiceIds.length,
      postedCount: 0,
      skippedCount: 0,
      errors: [],
      postedEntries: [],
    };

    invoiceIds.forEach((id) => {
      const postRes = this.postInvoice(id, currentUser);
      if (postRes.success && postRes.journalEntry) {
        result.postedCount++;
        result.postedEntries.push(postRes.journalEntry);
      } else {
        result.skippedCount++;
        if (postRes.error) {
          result.errors.push(postRes.error);
        }
      }
    });

    return result;
  }

  /**
   * توليد وترحيل قيد إهلاك الأصول الثابتة السنوي/الفصلي
   */
  public static postDepreciationEntry(params: {
    fiscalYear: number;
    date?: string;
    depreciationAmount: number;
    description?: string;
    assetCategoryName?: string;
  }): PostResult {
    const state = db.getState();
    const accounts = state.accounts;

    if (!params.depreciationAmount || params.depreciationAmount <= 0) {
      return { success: false, error: 'قيمة الإهلاك يجب أن تكون أكبر من الصفر.' };
    }

    const depExpenseAccount = this.findAccount(
      accounts,
      ['5220', '5200', '52'],
      'EXPENSES',
      'مصروفات إهلاك الأصول الثابتة'
    );

    const accumDepAccount = this.findAccount(
      accounts,
      ['1190', '119'],
      'ASSETS',
      'مجمع إهلاك الأصول الثابتة'
    );

    const amount = Math.round(params.depreciationAmount * 100) / 100;
    const catLabel = params.assetCategoryName ? ` (${params.assetCategoryName})` : '';

    const lines: JournalEntryLine[] = [
      {
        id: `dep-line-1-${Date.now()}`,
        accountId: depExpenseAccount.id,
        accountCode: depExpenseAccount.code,
        accountName: depExpenseAccount.name,
        currency: 'EGP',
        exchangeRate: 1,
        debit: amount,
        credit: 0,
        description: `إثبات مصروف إهلاك الأصول الثابتة${catLabel} عن السنة المالية ${params.fiscalYear}`,
      },
      {
        id: `dep-line-2-${Date.now()}`,
        accountId: accumDepAccount.id,
        accountCode: accumDepAccount.code,
        accountName: accumDepAccount.name,
        currency: 'EGP',
        exchangeRate: 1,
        debit: 0,
        credit: amount,
        description: `إثبات مجمع إهلاك الأصول الثابتة${catLabel} عن السنة المالية ${params.fiscalYear}`,
      },
    ];

    const entryDraft = {
      date: params.date || `${params.fiscalYear}-12-31`,
      description: params.description || `قيد إهلاك الأصول الثابتة${catLabel} - السنة المالية ${params.fiscalYear}`,
      entryType: 'ADJUSTING' as const,
      currency: 'EGP' as const,
      isPosted: true,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      referenceNumber: `FA-DEP-${params.fiscalYear}`,
    };

    try {
      const createdEntry = db.addJournalEntry(entryDraft);
      db.logAudit(
        'POST',
        `ترحيل آلي لقيد إهلاك الأصول الثابتة لعام ${params.fiscalYear} بقيمة ${amount} ج.م (قيد رقم ${createdEntry.serialNumber})`
      );
      cloudSync.pushStateToCloud(db.getState());
      return { success: true, journalEntry: createdEntry };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل ترحيل قيد الإهلاك.' };
    }
  }

  /**
   * التحقق مما إذا كانت الفاتورة مرحلة وربط القيد بها
   */
  public static isInvoicePosted(invoiceNumber: string): { isPosted: boolean; serialNumber?: string; entryId?: string } {
    const state = db.getState();
    const entry = state.journalEntries.find(
      (je) => je.entryType === 'SALES' && je.referenceNumber === invoiceNumber
    );
    if (entry) {
      return { isPosted: true, serialNumber: entry.serialNumber, entryId: entry.id };
    }
    return { isPosted: false };
  }
}
