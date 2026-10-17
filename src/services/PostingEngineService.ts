import { Account, AccountCategory, Invoice, JournalEntry, JournalEntryLine } from '../types';
import { db } from '../db/localDatabase';

export interface PostingResult {
  success: boolean;
  entryId?: string;
  entry?: JournalEntry;
  journalEntry?: JournalEntry;
  error?: string;
  errors?: string[];
}

export class PostingEngineService {
  /**
   * Finds an account strictly by exact code match in preferredCodes, and rejects parent/summary accounts (level <= 3 or codes like '41', '214').
   */
  public static findAccount(
    accounts: Account[],
    preferredCodes: string[],
    _category?: AccountCategory,
    labelAr = 'حساب مطلوب'
  ): Account {
    for (const code of preferredCodes) {
      const matched = accounts.find((a) => a.code === code);
      if (matched) {
        const isSummaryParent =
          (matched.level !== undefined && matched.level <= 3 && matched.code.length <= 3) ||
          accounts.some((child) => child.id !== matched.id && (child.parentId === matched.id || child.parentCode === matched.code || child.code.startsWith(matched.code + '0')));
        if (isSummaryParent) {
          throw new Error(
            `تعذر ترحيل القيد: الحساب (${matched.code} - ${matched.name}) هو حساب رئيسي/تجميعي لا يقبل الترحيل المباشر. يرجى إعداد وتحديد حساب تحليلي تفصيلي صريح لـ (${labelAr}).`
          );
        }
        return matched;
      }
    }

    // Check if a parent/summary code exists in accounts to give the specific parent-account error message
    const parentCandidate = accounts.find(
      (a) =>
        (a.code === '41' && preferredCodes.some((c) => c.startsWith('41'))) ||
        (a.code === '214' && preferredCodes.some((c) => c.startsWith('21') || c.startsWith('22')))
    );
    if (parentCandidate) {
      throw new Error(
        `تعذر ترحيل القيد: الحساب المتوفر (${parentCandidate.code} - ${parentCandidate.name}) هو حساب رئيسي/تجميعي. يرجى إعداد وتحديد حساب تحليلي تفصيلي صريح لـ (${labelAr}).`
      );
    }

    throw new Error(
      `تعذر ترحيل القيد: لم يتم العثور على حساب تحليلي مطابق للأكواد (${preferredCodes.join(', ')}) والخاص بـ (${labelAr}) في دليل الحسابات.`
    );
  }

  /**
   * Builds a balanced JournalEntry from an Invoice using the provided Chart of Accounts.
   * Respects invoice currency & exchangeRate, and sets isPosted=true ONLY if userCanPost === true.
   */
  public static buildInvoiceJournalEntry(
    invoice: Invoice,
    accounts: Account[],
    entryNumber?: number | string,
    userCanPost = false
  ): JournalEntry {
    const currency = invoice.currency || 'EGP';
    const exchangeRate = invoice.exchangeRate && invoice.exchangeRate > 0 ? invoice.exchangeRate : 1;

    const subtotal = Number(invoice.subtotal) || 0;
    const discount = Number(invoice.totalDiscount) || 0;
    const netTaxable = Math.max(0, subtotal - discount);
    const vat = Number(invoice.totalVat) || 0;
    const wht = Number(invoice.totalWht) || 0;
    const tableTax = Number(invoice.totalTableTax) || 0;
    const netReceivableOrPayable = Number((netTaxable + vat + tableTax - wht).toFixed(2));

    const isSales = invoice.invoiceType === 'SALES' || invoice.invoiceType === 'RETURN_PURCHASE';
    const isCash = invoice.paymentMethod === 'CASH';

    const lines: JournalEntryLine[] = [];

    if (isSales) {
      const mainDebitAcc = isCash
        ? this.findAccount(accounts, ['1250', '1101', '1251'], 'ASSETS', 'النقدية بالصندوق')
        : this.findAccount(accounts, ['1220', '1103', '1221'], 'ASSETS', 'العملاء والمدينون');

      lines.push({
        id: `${invoice.id}-line-dr-main`,
        accountId: mainDebitAcc.id,
        accountCode: mainDebitAcc.code,
        accountName: mainDebitAcc.name,
        debit: netReceivableOrPayable,
        credit: 0,
        currency,
        exchangeRate,
        description: `فاتورة مبيعات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`,
      });

      if (wht > 0) {
        const whtAcc = this.findAccount(
          accounts,
          ['1230', '1106', '1231'],
          'ASSETS',
          'ضريبة خصم وتحصيل تحت حساب الضريبة'
        );
        lines.push({
          id: `${invoice.id}-line-dr-wht`,
          accountId: whtAcc.id,
          accountCode: whtAcc.code,
          accountName: whtAcc.name,
          debit: Number(wht.toFixed(2)),
          credit: 0,
          currency,
          exchangeRate,
          description: `خصم منبع أ.ت.ص عن فاتورة رقم ${invoice.invoiceNumber}`,
        });
      }

      const revAcc = this.findAccount(
        accounts,
        ['4110', '4120', '4101', '4100'],
        'REVENUES',
        'إيرادات المبيعات والخدمات'
      );
      lines.push({
        id: `${invoice.id}-line-cr-rev`,
        accountId: revAcc.id,
        accountCode: revAcc.code,
        accountName: revAcc.name,
        debit: 0,
        credit: Number(netTaxable.toFixed(2)),
        currency,
        exchangeRate,
        description: `صافي إيراد فاتورة رقم ${invoice.invoiceNumber}`,
      });

      if (vat + tableTax > 0) {
        const vatAcc = this.findAccount(
          accounts,
          ['2230', '2104', '2145'],
          'LIABILITIES',
          'ضريبة القيمة المضافة'
        );
        lines.push({
          id: `${invoice.id}-line-cr-vat`,
          accountId: vatAcc.id,
          accountCode: vatAcc.code,
          accountName: vatAcc.name,
          debit: 0,
          credit: Number((vat + tableTax).toFixed(2)),
          currency,
          exchangeRate,
          description: `ضريبة القيمة المضافة عن فاتورة رقم ${invoice.invoiceNumber}`,
        });
      }
    } else {
      // PURCHASE
      const expAcc = this.findAccount(
        accounts,
        ['5110', '5101', '5120', '5100'],
        'EXPENSES',
        'تكلفة المشتريات والمصروفات'
      );
      lines.push({
        id: `${invoice.id}-line-dr-exp`,
        accountId: expAcc.id,
        accountCode: expAcc.code,
        accountName: expAcc.name,
        debit: Number(netTaxable.toFixed(2)),
        credit: 0,
        currency,
        exchangeRate,
        description: `فاتورة مشتريات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`,
      });

      if (vat + tableTax > 0) {
        const vatInAcc = this.findAccount(
          accounts,
          ['1235', '1105', '2230', '2104'],
          'ASSETS',
          'ضريبة القيمة المضافة على المدخلات'
        );
        lines.push({
          id: `${invoice.id}-line-dr-vat`,
          accountId: vatInAcc.id,
          accountCode: vatInAcc.code,
          accountName: vatInAcc.name,
          debit: Number((vat + tableTax).toFixed(2)),
          credit: 0,
          currency,
          exchangeRate,
          description: `ضريبة مدخلات عن فاتورة رقم ${invoice.invoiceNumber}`,
        });
      }

      const mainCreditAcc = isCash
        ? this.findAccount(accounts, ['1250', '1101'], 'ASSETS', 'النقدية بالصندوق')
        : this.findAccount(accounts, ['2110', '2101', '2210'], 'LIABILITIES', 'الموردون والدائنون');
      lines.push({
        id: `${invoice.id}-line-cr-main`,
        accountId: mainCreditAcc.id,
        accountCode: mainCreditAcc.code,
        accountName: mainCreditAcc.name,
        debit: 0,
        credit: netReceivableOrPayable,
        currency,
        exchangeRate,
        description: `صافي المستحق للمورد عن فاتورة رقم ${invoice.invoiceNumber}`,
      });

      if (wht > 0) {
        const whtPayAcc = this.findAccount(
          accounts,
          ['2235', '2105', '2230'],
          'LIABILITIES',
          'ضرائب خصم وتحصيل مستقطعة من الغير'
        );
        lines.push({
          id: `${invoice.id}-line-cr-wht`,
          accountId: whtPayAcc.id,
          accountCode: whtPayAcc.code,
          accountName: whtPayAcc.name,
          debit: 0,
          credit: Number(wht.toFixed(2)),
          currency,
          exchangeRate,
          description: `خصم منبع مستقطع عن فاتورة رقم ${invoice.invoiceNumber}`,
        });
      }
    }

    const isPosted = Boolean(userCanPost);

    return {
      id: `je-inv-${invoice.id}`,
      entryNumber: entryNumber ?? `INV-${invoice.invoiceNumber}`,
      date: invoice.date || new Date().toISOString().slice(0, 10),
      description: `قيد آلي من فاتورة ${isSales ? 'مبيعات' : 'مشتريات'} رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`,
      referenceNumber: invoice.invoiceNumber,
      documentType: 'INVOICE',
      lines,
      isPosted,
      status: isPosted ? 'POSTED' : 'DRAFT',
      postedAt: isPosted ? new Date().toISOString() : undefined,
      clientId: invoice.clientId,
      currency,
      exchangeRate,
      source: 'INVOICE_ENGINE',
      sourceInvoiceId: invoice.id,
      isAutoGenerated: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Checks if an invoice number is already posted for the given clientId (per client + invoiceNumber).
   */
  public static isInvoicePosted(
    invoiceNumber: string,
    clientId?: string
  ): { isPosted: boolean; entryId?: string } {
    const state = db.getState();
    const normInv = String(invoiceNumber || '').trim();
    const normClient = String(clientId || '').trim();

    const matchedEntry = (state.journalEntries || []).find((je) => {
      const refMatch = String(je.referenceNumber || '').trim() === normInv;
      const clientMatch = String(je.clientId || '').trim() === normClient;
      return refMatch && clientMatch;
    });

    if (matchedEntry) {
      return { isPosted: true, entryId: matchedEntry.id };
    }
    return { isPosted: false };
  }

  /**
   * Posts an invoice from localDatabase by ID, checking duplicate per (clientId + invoiceNumber)
   * and user permission (canPostEntries).
   */
  public static postInvoice(
    invoiceId: string,
    actingUser?: { id?: string; name?: string; role?: string; canPostEntries?: boolean }
  ): PostingResult {
    const state = db.getState();
    const invoice = (state.invoices || []).find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return {
        success: false,
        error: 'الفاتورة غير موجودة في قاعدة البيانات.',
        errors: ['الفاتورة غير موجودة في قاعدة البيانات.'],
      };
    }

    // Check duplicate per (clientId + invoiceNumber)
    const dupCheck = this.isInvoicePosted(invoice.invoiceNumber, invoice.clientId);
    if (dupCheck.isPosted) {
      const msg = `تم ترحيل هذه الفاتورة مسبقاً (${invoice.invoiceNumber}) لهذا العميل.`;
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }

    const currentUser = actingUser || db.getCurrentUser();
    const userCanPost = Boolean(currentUser?.canPostEntries);

    try {
      const entry = this.buildInvoiceJournalEntry(
        invoice,
        state.accounts || [],
        (state.journalEntries?.length || 0) + 1,
        userCanPost
      );

      state.journalEntries.push(entry);
      invoice.journalEntryId = entry.id;
      invoice.isPosted = entry.isPosted;

      return {
        success: true,
        entryId: entry.id,
        entry,
        journalEntry: entry,
        errors: [],
      };
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء ترحيل الفاتورة.';
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }
  }
}
