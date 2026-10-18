import {
  Account,
  AccountCategory,
  AccountMappingFieldKey,
  ClientAccountMapping,
  Invoice,
  InvoiceType,
  JournalEntry,
  JournalEntryLine,
} from '../types';
import { createDefaultClientAccountMapping, db } from '../db/localDatabase';
import { getCairoDateString, getCairoTimestamp } from '../utils/cairoTime';

export interface PostingResult {
  success: boolean;
  entryId?: string;
  entry?: JournalEntry;
  journalEntry?: JournalEntry;
  fxDifferenceEgp?: number;
  fxType?: 'GAIN' | 'LOSS' | 'NONE';
  error?: string;
  errors?: string[];
}

export interface ForeignCurrencySettlementParams {
  invoiceId: string;
  settlementDate?: string;
  foreignAmountPaid?: number;
  settlementExchangeRate?: number;
  notes?: string;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export class PostingEngineService {
  /**
   * Validates that a specific account is analytical (not a summary/parent account) and active.
   */
  public static assertAnalyticalActiveAccount(
    account: Account,
    clientAccounts: Account[],
    labelAr: string
  ): Account {
    if (account.isActive === false) {
      throw new Error(
        `تعذر ترحيل القيد: الحساب (${account.code} - ${account.name}) المربوط لـ (${labelAr}) غير فعّال (موقوف).`
      );
    }

    const isSummaryParent =
      (account.level !== undefined && account.level <= 3 && account.code.length <= 3) ||
      (account.level !== undefined && account.level <= 2) ||
      clientAccounts.some(
        (child) =>
          child.id !== account.id &&
          (child.parentId === account.id ||
            child.parentCode === account.code ||
            child.code.startsWith(account.code + '0'))
      );

    if (isSummaryParent) {
      throw new Error(
        `تعذر ترحيل القيد: الحساب (${account.code} - ${account.name}) هو حساب رئيسي/تجميعي لا يقبل الترحيل المباشر. يرجى تحديد حساب تحليلي تفصيلي صريح لـ (${labelAr}).`
      );
    }

    return account;
  }

  /**
   * Resolves an account strictly from the client's Account Mapping without falling back to an account of a different meaning.
   */
  public static resolveMappedAccount(
    clientAccounts: Account[],
    mapping: Partial<ClientAccountMapping> | undefined,
    fieldKey: AccountMappingFieldKey,
    labelAr: string,
    clientId: string
  ): Account {
    const mappedCode = String(mapping?.[fieldKey] || '').trim();
    if (!mappedCode) {
      throw new Error(
        `تعذر ترحيل القيد: لم يتم ربط حساب (${labelAr}) في شاشة "ربط الحسابات" للعميل (${clientId}). يرجى ربط الحساب أولاً.`
      );
    }

    const matched = clientAccounts.find((a) => a.code === mappedCode);
    if (!matched) {
      throw new Error(
        `تعذر ترحيل القيد: الحساب المربوط لـ (${labelAr}) بالكود (${mappedCode}) غير موجود في دليل حسابات العميل (${clientId}). لا يُسمح باستخدام حساب بديل مختلف المعنى.`
      );
    }

    return this.assertAnalyticalActiveAccount(matched, clientAccounts, labelAr);
  }

  /**
   * Legacy helper kept for backward compatibility: finds an account by exact code in preferredCodes
   * and rejects parent/summary accounts. Never falls back to an account outside preferredCodes.
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
        return this.assertAnalyticalActiveAccount(matched, accounts, labelAr);
      }
    }

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
      `تعذر ترحيل القيد: لم يتم العثور على حساب تحليلي مربوط للأكواد (${preferredCodes.join(', ')}) والخاص بـ (${labelAr}) في دليل الحسابات.`
    );
  }

  /**
   * Builds a balanced JournalEntry from an Invoice using the client's Account Mapping and Chart of Accounts.
   * Supports all 7 invoice types:
   * - SALES
   * - PURCHASE
   * - RETURN_SALES
   * - RETURN_PURCHASE
   * - CREDIT_NOTE (إشعار دائن)
   * - DEBIT_NOTE (إشعار مدين)
   * - OFFICE_SERVICE (إيراد أتعاب المكتب)
   */
  public static buildInvoiceJournalEntry(
    invoice: Invoice,
    accounts: Account[],
    entryNumber?: number | string,
    userCanPost = false,
    explicitMapping?: Partial<ClientAccountMapping>
  ): JournalEntry {
    const clientId = String(invoice.clientId || '').trim();
    if (!clientId) {
      throw new Error('تعذر ترحيل الفاتورة: معرّف العميل (clientId) إلزامي على الفاتورة.');
    }

    const clientAccounts = accounts.filter((a) => !a.clientId || a.clientId === clientId);
    if (clientAccounts.length === 0) {
      throw new Error(`تعذر ترحيل الفاتورة: لا يوجد دليل حسابات مسجل للعميل (${clientId}).`);
    }

    // Resolve client account mapping: use explicitMapping if passed, else from db state if initialized, else default mapping
    const stateMappings = db.getState().accountMappings || {};
    const storedMapping = stateMappings[clientId];
    const effectiveMapping: Partial<ClientAccountMapping> =
      explicitMapping || storedMapping || createDefaultClientAccountMapping(clientId);

    const invDate = (invoice.date || getCairoDateString()).slice(0, 10);
    const currency = String(invoice.currency || 'EGP').trim().toUpperCase();
    const exchangeRate =
      currency === 'EGP'
        ? 1
        : invoice.exchangeRate && invoice.exchangeRate > 0
        ? Number(invoice.exchangeRate)
        : db.getExchangeRateValue(currency, invDate);

    if (currency !== 'EGP' && (!exchangeRate || exchangeRate <= 0)) {
      throw new Error(`تعذر ترحيل الفاتورة: سعر الصرف للعملة (${currency}) بتاريخ (${invDate}) غير صالح.`);
    }

    const subtotal = round2(Number(invoice.subtotal) || 0);
    const discount = round2(Number(invoice.totalDiscount) || 0);
    const netTaxable = round2(Math.max(0, subtotal - discount));
    const vat = round2(Number(invoice.totalVat) || 0);
    const wht = round2(Number(invoice.totalWht) || 0);
    const tableTax = round2(Number(invoice.totalTableTax) || 0);
    const netCounterparty = round2(netTaxable + vat + tableTax - wht);

    if (netTaxable <= 0) {
      throw new Error('تعذر ترحيل الفاتورة: صافي قيمة الفاتورة الخاضعة يجب أن يكون أكبر من الصفر.');
    }
    if (netCounterparty <= 0) {
      throw new Error('تعذر ترحيل الفاتورة: صافي المستحق بعد الضرائب يجب أن يكون أكبر من الصفر.');
    }

    const rawType = String(invoice.invoiceType || 'SALES').trim().toUpperCase() as InvoiceType;
    const isCash = String(invoice.paymentMethod || '').toUpperCase() === 'CASH';

    const lines: JournalEntryLine[] = [];
    let lineSeq = 1;

    const pushLine = (
      acc: Account,
      side: 'DEBIT' | 'CREDIT',
      foreignAmount: number,
      description: string
    ): void => {
      const cleanForeign = round2(foreignAmount);
      if (cleanForeign <= 0) return;
      const egpVal = currency === 'EGP' ? cleanForeign : round2(cleanForeign * exchangeRate);
      lines.push({
        id: `${invoice.id}-line-${lineSeq++}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: side === 'DEBIT' ? egpVal : 0,
        credit: side === 'CREDIT' ? egpVal : 0,
        foreignDebit: currency !== 'EGP' ? (side === 'DEBIT' ? cleanForeign : 0) : undefined,
        foreignCredit: currency !== 'EGP' ? (side === 'CREDIT' ? cleanForeign : 0) : undefined,
        originalAmount: cleanForeign,
        amountEgp: egpVal,
        currency,
        exchangeRate,
        description,
        clientId,
      });
    };

    const resolveAcc = (fieldKey: AccountMappingFieldKey, labelAr: string): Account =>
      this.resolveMappedAccount(clientAccounts, effectiveMapping, fieldKey, labelAr, clientId);

    switch (rawType) {
      case 'SALES': {
        const debitCounterpartyAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('receivablesAccountCode', 'العملاء والمدينون');
        pushLine(
          debitCounterpartyAcc,
          'DEBIT',
          netCounterparty,
          `فاتورة مبيعات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (wht > 0) {
          const whtRecAcc = resolveAcc('whtReceivableAccountCode', 'ضريبة الخصم والإضافة المدينة');
          pushLine(
            whtRecAcc,
            'DEBIT',
            wht,
            `ضريبة خصم وتحصيل (مدين) عن فاتورة مبيعات رقم ${invoice.invoiceNumber}`
          );
        }

        const salesAcc = resolveAcc('salesAccountCode', 'المبيعات');
        pushLine(salesAcc, 'CREDIT', netTaxable, `صافي مبيعات فاتورة رقم ${invoice.invoiceNumber}`);

        if (vat > 0) {
          const vatOutAcc = resolveAcc('vatOutputAccountCode', 'ضريبة القيمة المضافة - مخرجات');
          pushLine(vatOutAcc, 'CREDIT', vat, `ضريبة القيمة المضافة مخرجات عن فاتورة رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'CREDIT', tableTax, `ضريبة الجدول عن فاتورة رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      case 'PURCHASE': {
        const purchasesAcc = resolveAcc('purchasesAccountCode', 'المشتريات');
        pushLine(
          purchasesAcc,
          'DEBIT',
          netTaxable,
          `فاتورة مشتريات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (vat > 0) {
          const vatInAcc = resolveAcc('vatInputAccountCode', 'ضريبة القيمة المضافة - مدخلات');
          pushLine(vatInAcc, 'DEBIT', vat, `ضريبة القيمة المضافة مدخلات عن فاتورة رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'DEBIT', tableTax, `ضريبة الجدول عن فاتورة مشتريات رقم ${invoice.invoiceNumber}`);
        }

        const creditCounterpartyAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('payablesAccountCode', 'الموردين والدائنين');
        pushLine(
          creditCounterpartyAcc,
          'CREDIT',
          netCounterparty,
          `صافي المستحق للمورد عن فاتورة رقم ${invoice.invoiceNumber}`
        );

        if (wht > 0) {
          const whtPayAcc = resolveAcc('whtPayableAccountCode', 'ضريبة الخصم والإضافة الدائنة');
          pushLine(
            whtPayAcc,
            'CREDIT',
            wht,
            `ضريبة خصم وتحصيل مستقطعة (دائن) عن فاتورة رقم ${invoice.invoiceNumber}`
          );
        }
        break;
      }

      case 'RETURN_SALES': {
        // من حـ/ مردودات ومسموحات المبيعات + من حـ/ ضريبة القيمة المضافة (مخرجات) إلى حـ/ العملاء
        const salesReturnsAcc = resolveAcc('salesReturnsAccountCode', 'مردودات ومسموحات المبيعات');
        pushLine(
          salesReturnsAcc,
          'DEBIT',
          netTaxable,
          `مردودات مبيعات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (vat > 0) {
          const vatOutAcc = resolveAcc('vatOutputAccountCode', 'ضريبة القيمة المضافة - مخرجات');
          pushLine(vatOutAcc, 'DEBIT', vat, `رد ضريبة القيمة المضافة مخرجات عن مردود مبيعات رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'DEBIT', tableTax, `رد ضريبة الجدول عن مردود مبيعات رقم ${invoice.invoiceNumber}`);
        }

        const creditCustAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('receivablesAccountCode', 'العملاء والمدينون');
        pushLine(
          creditCustAcc,
          'CREDIT',
          netCounterparty,
          `تخفيض حساب العميل بمردودات مبيعات رقم ${invoice.invoiceNumber}`
        );

        if (wht > 0) {
          const whtRecAcc = resolveAcc('whtReceivableAccountCode', 'ضريبة الخصم والإضافة المدينة');
          pushLine(whtRecAcc, 'CREDIT', wht, `تسوية خصم منبع عن مردود مبيعات رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      case 'RETURN_PURCHASE': {
        // من حـ/ الموردين إلى حـ/ مردودات المشتريات + حـ/ ضريبة المدخلات
        const debitSuppAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('payablesAccountCode', 'الموردين والدائنين');
        pushLine(
          debitSuppAcc,
          'DEBIT',
          netCounterparty,
          `تخفيض حساب المورد بمردودات مشتريات رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (wht > 0) {
          const whtPayAcc = resolveAcc('whtPayableAccountCode', 'ضريبة الخصم والإضافة الدائنة');
          pushLine(whtPayAcc, 'DEBIT', wht, `تسوية ضريبة خصم منبع عن مردود مشتريات رقم ${invoice.invoiceNumber}`);
        }

        const purchaseReturnsAcc = resolveAcc('purchaseReturnsAccountCode', 'مردودات المشتريات');
        pushLine(
          purchaseReturnsAcc,
          'CREDIT',
          netTaxable,
          `صافي مردودات المشتريات رقم ${invoice.invoiceNumber}`
        );

        if (vat > 0) {
          const vatInAcc = resolveAcc('vatInputAccountCode', 'ضريبة القيمة المضافة - مدخلات');
          pushLine(vatInAcc, 'CREDIT', vat, `رد ضريبة المدخلات عن مردود مشتريات رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'CREDIT', tableTax, `رد ضريبة الجدول عن مردود مشتريات رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      case 'CREDIT_NOTE': {
        // إشعار دائن للعميل: من حـ/ مردودات ومسموحات المبيعات + حـ/ ضريبة القيمة المضافة مخرجات إلى حـ/ العملاء
        const salesReturnsAcc = resolveAcc('salesReturnsAccountCode', 'مردودات ومسموحات المبيعات');
        pushLine(
          salesReturnsAcc,
          'DEBIT',
          netTaxable,
          `إشعار دائن رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (vat > 0) {
          const vatOutAcc = resolveAcc('vatOutputAccountCode', 'ضريبة القيمة المضافة - مخرجات');
          pushLine(vatOutAcc, 'DEBIT', vat, `تسوية ضريبة مخرجات بموجب إشعار دائن رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'DEBIT', tableTax, `تسوية ضريبة الجدول بموجب إشعار دائن رقم ${invoice.invoiceNumber}`);
        }

        const creditCustAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('receivablesAccountCode', 'العملاء والمدينون');
        pushLine(
          creditCustAcc,
          'CREDIT',
          netCounterparty,
          `تخفيض مديونية العميل بموجب إشعار دائن رقم ${invoice.invoiceNumber}`
        );

        if (wht > 0) {
          const whtRecAcc = resolveAcc('whtReceivableAccountCode', 'ضريبة الخصم والإضافة المدينة');
          pushLine(whtRecAcc, 'CREDIT', wht, `تسوية خصم منبع بموجب إشعار دائن رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      case 'DEBIT_NOTE': {
        // إشعار مدين على العميل: من حـ/ العملاء إلى حـ/ المبيعات + حـ/ ضريبة القيمة المضافة مخرجات
        const debitCustAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('receivablesAccountCode', 'العملاء والمدينون');
        pushLine(
          debitCustAcc,
          'DEBIT',
          netCounterparty,
          `إشعار مدين رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (wht > 0) {
          const whtRecAcc = resolveAcc('whtReceivableAccountCode', 'ضريبة الخصم والإضافة المدينة');
          pushLine(whtRecAcc, 'DEBIT', wht, `ضريبة خصم منبع عن إشعار مدين رقم ${invoice.invoiceNumber}`);
        }

        const salesAcc = resolveAcc('salesAccountCode', 'المبيعات');
        pushLine(salesAcc, 'CREDIT', netTaxable, `صافي قيمة إشعار مدين رقم ${invoice.invoiceNumber}`);

        if (vat > 0) {
          const vatOutAcc = resolveAcc('vatOutputAccountCode', 'ضريبة القيمة المضافة - مخرجات');
          pushLine(vatOutAcc, 'CREDIT', vat, `ضريبة القيمة المضافة مخرجات عن إشعار مدين رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'CREDIT', tableTax, `ضريبة الجدول عن إشعار مدين رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      case 'OFFICE_SERVICE': {
        // إيراد أتعاب مهنية للمكتب وليس مصروفاً: من حـ/ العملاء (أو النقدية) + حـ/ ضريبة الخصم المدينة إلى حـ/ إيراد أتعاب المكتب + حـ/ ضريبة المخرجات
        const debitClientAcc = isCash
          ? resolveAcc('cashAccountCode', 'النقدية بالصندوق')
          : resolveAcc('receivablesAccountCode', 'العملاء والمدينون');
        pushLine(
          debitClientAcc,
          'DEBIT',
          netCounterparty,
          `مطالبة / فاتورة أتعاب مهنية رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`
        );

        if (wht > 0) {
          const whtRecAcc = resolveAcc('whtReceivableAccountCode', 'ضريبة الخصم والإضافة المدينة');
          pushLine(
            whtRecAcc,
            'DEBIT',
            wht,
            `ضريبة خصم منبع مهن حرة (مدين) عن فاتورة أتعاب رقم ${invoice.invoiceNumber}`
          );
        }

        const officeRevAcc = resolveAcc(
          'officeServiceRevenueAccountCode',
          'إيراد أتعاب المكتب والخدمات المهنية'
        );
        pushLine(
          officeRevAcc,
          'CREDIT',
          netTaxable,
          `إيراد أتعاب وخدمات مهنية عن فاتورة رقم ${invoice.invoiceNumber}`
        );

        if (vat > 0) {
          const vatOutAcc = resolveAcc('vatOutputAccountCode', 'ضريبة القيمة المضافة - مخرجات');
          pushLine(vatOutAcc, 'CREDIT', vat, `ضريبة القيمة المضافة مخرجات عن فاتورة أتعاب رقم ${invoice.invoiceNumber}`);
        }

        if (tableTax > 0) {
          const tblTaxAcc = resolveAcc('tableTaxAccountCode', 'ضريبة الجدول');
          pushLine(tblTaxAcc, 'CREDIT', tableTax, `ضريبة الجدول عن فاتورة أتعاب رقم ${invoice.invoiceNumber}`);
        }
        break;
      }

      default:
        throw new Error(`نوع الفاتورة (${rawType}) غير مدعوم في محرك الترحيل المحاسبي.`);
    }

    // Align 1-piastre (0.01 EGP) rounding difference on converted lines if present
    let totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
    let totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(Math.abs(totalDebit - totalCredit));
    if (diff > 0 && diff <= 0.01) {
      if (totalDebit < totalCredit) {
        const target = lines.find((l) => l.debit > 0);
        if (target) {
          target.debit = round2(target.debit + diff);
          target.amountEgp = target.debit;
          totalDebit = totalCredit;
        }
      } else {
        const target = lines.find((l) => l.credit > 0);
        if (target) {
          target.credit = round2(target.credit + diff);
          target.amountEgp = target.credit;
          totalCredit = totalDebit;
        }
      }
    }

    const typeLabelsAr: Record<InvoiceType, string> = {
      SALES: 'مبيعات',
      PURCHASE: 'مشتريات',
      RETURN_SALES: 'مردودات مبيعات',
      RETURN_PURCHASE: 'مردودات مشتريات',
      CREDIT_NOTE: 'إشعار دائن',
      DEBIT_NOTE: 'إشعار مدين',
      OFFICE_SERVICE: 'إيراد أتعاب مهنية',
    };

    const isPosted = Boolean(userCanPost);
    const fiscalYear = parseInt(invDate.slice(0, 4), 10) || 2026;

    return {
      id: `je-inv-${invoice.id}`,
      entryNumber: entryNumber ?? db.peekNextJournalEntryNumber(clientId, fiscalYear),
      date: invDate,
      fiscalYear,
      description: `قيد آلي من فاتورة ${typeLabelsAr[rawType] || rawType} رقم ${invoice.invoiceNumber} - ${invoice.partnerName}`,
      referenceNumber: invoice.invoiceNumber,
      documentType: 'INVOICE',
      invoiceType: rawType,
      lines,
      totalDebit,
      totalCredit,
      isPosted,
      status: isPosted ? 'POSTED' : 'DRAFT',
      postedAt: isPosted ? getCairoTimestamp() : undefined,
      clientId,
      currency,
      exchangeRate,
      source: 'INVOICE_ENGINE',
      sourceInvoiceId: invoice.id,
      isAutoGenerated: true,
      createdAt: getCairoTimestamp(),
    };
  }

  /**
   * Requirement 6: Checks if an invoice is already posted by comparing (clientId + invoiceNumber + invoiceType)
   * strictly within invoice journal entries only.
   */
  public static isInvoicePosted(
    invoiceNumber: string,
    clientId?: string,
    invoiceType?: InvoiceType | string
  ): { isPosted: boolean; entryId?: string } {
    const normInv = String(invoiceNumber || '').trim();
    const normClient = String(clientId || '').trim();
    const normType = invoiceType ? String(invoiceType).trim().toUpperCase() : '';

    if (!normInv || !normClient) {
      return { isPosted: false };
    }

    const state = db.getState();
    const invoicesById = new Map((state.invoices || []).map((inv) => [inv.id, inv]));

    const matchedEntry = (state.journalEntries || []).find((je) => {
      // Must be an invoice journal entry only
      const isInvoiceEntry =
        je.documentType === 'INVOICE' ||
        je.source === 'INVOICE_ENGINE' ||
        Boolean(je.sourceInvoiceId);
      if (!isInvoiceEntry) return false;

      const clientMatch = String(je.clientId || '').trim() === normClient;
      const refMatch = String(je.referenceNumber || '').trim() === normInv;
      if (!clientMatch || !refMatch) return false;

      if (normType) {
        const linkedInv = je.sourceInvoiceId ? invoicesById.get(je.sourceInvoiceId) : undefined;
        const entryInvType = String(
          je.invoiceType || linkedInv?.invoiceType || 'SALES'
        )
          .trim()
          .toUpperCase();
        return entryInvType === normType;
      }

      return true;
    });

    if (matchedEntry) {
      return { isPosted: true, entryId: matchedEntry.id };
    }
    return { isPosted: false };
  }

  /**
   * Requirement 6: Posts an invoice from localDatabase by ID:
   * - Rejects invoices without clientId
   * - Checks duplicates per (clientId + invoiceNumber + invoiceType) within invoice entries only
   * - Assigns sequential entryNumber per (clientId + fiscalYear) via systemSerials
   * - Persists state via db.saveState
   */
  public static postInvoice(
    invoiceId: string,
    actingUser?: { id?: string; name?: string; role?: string; canPostEntries?: boolean }
  ): PostingResult {
    const state = db.getState();
    const invoice = (state.invoices || []).find((inv) => inv.id === invoiceId);
    if (!invoice) {
      const msg = 'الفاتورة غير موجودة في قاعدة البيانات.';
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }

    const clientId = String(invoice.clientId || '').trim();
    if (!clientId) {
      const msg = 'رفض ترحيل الفاتورة: الفاتورة لا تحتوي على معرّف عميل (clientId إلزامي).';
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }

    const invoiceType = String(invoice.invoiceType || 'SALES').trim().toUpperCase();

    // Check duplicate per (clientId + invoiceNumber + invoiceType) within invoice journal entries only
    const dupCheck = this.isInvoicePosted(invoice.invoiceNumber, clientId, invoiceType);
    if (dupCheck.isPosted) {
      const msg = `تم ترحيل هذه الفاتورة مسبقاً (${invoice.invoiceNumber} - ${invoiceType}) لهذا العميل.`;
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }

    const currentUser = actingUser || db.getCurrentUser();
    const userCanPost = Boolean(currentUser?.canPostEntries);

    try {
      const invDate = (invoice.date || getCairoDateString()).slice(0, 10);
      const fiscalYear = parseInt(invDate.slice(0, 4), 10) || 2026;
      const nextEntryNo = db.peekNextJournalEntryNumber(clientId, fiscalYear);

      const builtEntry = this.buildInvoiceJournalEntry(
        invoice,
        state.accounts || [],
        nextEntryNo,
        userCanPost
      );

      // Save through db.addJournalEntry when currentUser is available in db, or validate & persist via db.saveState
      let savedEntry: JournalEntry;
      if (db.getCurrentUser()) {
        savedEntry = db.addJournalEntry(builtEntry);
      } else {
        // When actingUser is explicitly passed in isolated unit tests without an active session user
        const allocNo = db.getNextJournalEntryNumber(clientId, fiscalYear);
        savedEntry = {
          ...builtEntry,
          entryNumber: allocNo,
          serialNumber: `JV-${fiscalYear}-${String(allocNo).padStart(4, '0')}`,
        };
        state.journalEntries.unshift(savedEntry);
        db.saveState('JOURNAL');
        db.saveState('SERIALS');
      }

      invoice.journalEntryId = savedEntry.id;
      invoice.isPosted = savedEntry.isPosted;
      db.saveState('INVOICES');

      return {
        success: true,
        entryId: savedEntry.id,
        entry: savedEntry,
        journalEntry: savedEntry,
        errors: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء ترحيل الفاتورة.';
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }
  }

  /**
   * Requirement 4: Posts a foreign currency invoice settlement and automatically records
   * Foreign Exchange Gain (4201) or Foreign Exchange Loss (5301) based on the settlement date exchange rate.
   */
  public static postForeignCurrencySettlement(
    params: ForeignCurrencySettlementParams
  ): PostingResult {
    const state = db.getState();
    const invoice = (state.invoices || []).find((inv) => inv.id === params.invoiceId);
    if (!invoice) {
      const msg = 'الفاتورة المطلوب سدادها غير موجودة.';
      return { success: false, error: msg, errors: [msg] };
    }

    const clientId = String(invoice.clientId || '').trim();
    if (!clientId) {
      const msg = 'رفض تسوية السداد: الفاتورة غير مرتبطة بعميل (clientId إلزامي).';
      return { success: false, error: msg, errors: [msg] };
    }

    const currency = String(invoice.currency || 'EGP').trim().toUpperCase();
    if (currency === 'EGP') {
      const msg = 'الفاتورة بالجنيه المصري وليست بعملة أجنبية.';
      return { success: false, error: msg, errors: [msg] };
    }

    try {
      const settlementDate = (params.settlementDate || getCairoDateString()).slice(0, 10);
      const invoiceRate =
        invoice.exchangeRate && invoice.exchangeRate > 0
          ? Number(invoice.exchangeRate)
          : db.getExchangeRateValue(currency, invoice.date);
      const settlementRate =
        params.settlementExchangeRate && params.settlementExchangeRate > 0
          ? Number(params.settlementExchangeRate)
          : db.getExchangeRateValue(currency, settlementDate);

      const subtotal = round2(Number(invoice.subtotal) || 0);
      const discount = round2(Number(invoice.totalDiscount) || 0);
      const netTaxable = round2(Math.max(0, subtotal - discount));
      const vat = round2(Number(invoice.totalVat) || 0);
      const tableTax = round2(Number(invoice.totalTableTax) || 0);
      const wht = round2(Number(invoice.totalWht) || 0);
      const defaultForeignNet = round2(netTaxable + vat + tableTax - wht);

      const foreignPaid = round2(
        params.foreignAmountPaid && params.foreignAmountPaid > 0
          ? params.foreignAmountPaid
          : defaultForeignNet
      );

      const bookAmountEgp = round2(foreignPaid * invoiceRate);
      const cashAmountEgp = round2(foreignPaid * settlementRate);
      const fxDiffEgp = round2(cashAmountEgp - bookAmountEgp);

      const clientAccounts = (state.accounts || []).filter((a) => a.clientId === clientId);
      const mapping = db.getClientAccountMapping(clientId);

      const cashAcc = this.resolveMappedAccount(
        clientAccounts,
        mapping,
        'cashAccountCode',
        'النقدية بالصندوق / البنك',
        clientId
      );

      const invType = String(invoice.invoiceType || 'SALES').toUpperCase() as InvoiceType;
      const isReceivableSettlement =
        invType === 'SALES' || invType === 'OFFICE_SERVICE' || invType === 'DEBIT_NOTE';

      const counterpartyAcc = isReceivableSettlement
        ? this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'receivablesAccountCode',
            'العملاء والمدينون',
            clientId
          )
        : this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'payablesAccountCode',
            'الموردين والدائنين',
            clientId
          );

      const lines: JournalEntryLine[] = [];
      let fxType: 'GAIN' | 'LOSS' | 'NONE' = 'NONE';

      if (isReceivableSettlement) {
        // تحصيل من عميل: النقدية مدينة بسعر يوم التحصيل، والعميل دائن بسعر يوم الفاتورة
        lines.push({
          id: `fx-settle-${invoice.id}-cash`,
          accountId: cashAcc.id,
          accountCode: cashAcc.code,
          accountName: cashAcc.name,
          debit: cashAmountEgp,
          credit: 0,
          foreignDebit: foreignPaid,
          foreignCredit: 0,
          originalAmount: foreignPaid,
          amountEgp: cashAmountEgp,
          currency,
          exchangeRate: settlementRate,
          description: `تحصيل فاتورة رقم ${invoice.invoiceNumber} (${foreignPaid} ${currency} × ${settlementRate})`,
          clientId,
        });

        lines.push({
          id: `fx-settle-${invoice.id}-ar`,
          accountId: counterpartyAcc.id,
          accountCode: counterpartyAcc.code,
          accountName: counterpartyAcc.name,
          debit: 0,
          credit: bookAmountEgp,
          foreignDebit: 0,
          foreignCredit: foreignPaid,
          originalAmount: foreignPaid,
          amountEgp: bookAmountEgp,
          currency,
          exchangeRate: invoiceRate,
          description: `إقفال مديونية فاتورة رقم ${invoice.invoiceNumber} بسعر الإصدار (${invoiceRate})`,
          clientId,
        });

        if (fxDiffEgp > 0) {
          fxType = 'GAIN';
          const fxGainAcc = this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'fxGainAccountCode',
            'أرباح فروق العملة',
            clientId
          );
          lines.push({
            id: `fx-settle-${invoice.id}-gain`,
            accountId: fxGainAcc.id,
            accountCode: fxGainAcc.code,
            accountName: fxGainAcc.name,
            debit: 0,
            credit: fxDiffEgp,
            originalAmount: fxDiffEgp,
            amountEgp: fxDiffEgp,
            currency: 'EGP',
            exchangeRate: 1,
            description: `أرباح فروق عملة محققة عند تحصيل فاتورة رقم ${invoice.invoiceNumber}`,
            clientId,
          });
        } else if (fxDiffEgp < 0) {
          fxType = 'LOSS';
          const absLoss = round2(Math.abs(fxDiffEgp));
          const fxLossAcc = this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'fxLossAccountCode',
            'خسائر فروق العملة',
            clientId
          );
          lines.push({
            id: `fx-settle-${invoice.id}-loss`,
            accountId: fxLossAcc.id,
            accountCode: fxLossAcc.code,
            accountName: fxLossAcc.name,
            debit: absLoss,
            credit: 0,
            originalAmount: absLoss,
            amountEgp: absLoss,
            currency: 'EGP',
            exchangeRate: 1,
            description: `خسائر فروق عملة محققة عند تحصيل فاتورة رقم ${invoice.invoiceNumber}`,
            clientId,
          });
        }
      } else {
        // سداد لمورد: المورد مدين بسعر يوم الفاتورة، والنقدية دائنة بسعر يوم السداد
        lines.push({
          id: `fx-settle-${invoice.id}-ap`,
          accountId: counterpartyAcc.id,
          accountCode: counterpartyAcc.code,
          accountName: counterpartyAcc.name,
          debit: bookAmountEgp,
          credit: 0,
          foreignDebit: foreignPaid,
          foreignCredit: 0,
          originalAmount: foreignPaid,
          amountEgp: bookAmountEgp,
          currency,
          exchangeRate: invoiceRate,
          description: `إقفال دائنية المورد عن فاتورة رقم ${invoice.invoiceNumber} بسعر الإصدار (${invoiceRate})`,
          clientId,
        });

        lines.push({
          id: `fx-settle-${invoice.id}-cash`,
          accountId: cashAcc.id,
          accountCode: cashAcc.code,
          accountName: cashAcc.name,
          debit: 0,
          credit: cashAmountEgp,
          foreignDebit: 0,
          foreignCredit: foreignPaid,
          originalAmount: foreignPaid,
          amountEgp: cashAmountEgp,
          currency,
          exchangeRate: settlementRate,
          description: `سداد فاتورة مورد رقم ${invoice.invoiceNumber} (${foreignPaid} ${currency} × ${settlementRate})`,
          clientId,
        });

        if (fxDiffEgp > 0) {
          // دفعنا جنيه أكثر مما كان مسجلاً -> خسارة فروق عملة (مدين)
          fxType = 'LOSS';
          const fxLossAcc = this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'fxLossAccountCode',
            'خسائر فروق العملة',
            clientId
          );
          lines.push({
            id: `fx-settle-${invoice.id}-loss`,
            accountId: fxLossAcc.id,
            accountCode: fxLossAcc.code,
            accountName: fxLossAcc.name,
            debit: fxDiffEgp,
            credit: 0,
            originalAmount: fxDiffEgp,
            amountEgp: fxDiffEgp,
            currency: 'EGP',
            exchangeRate: 1,
            description: `خسائر فروق عملة محققة عند سداد فاتورة مشتريات رقم ${invoice.invoiceNumber}`,
            clientId,
          });
        } else if (fxDiffEgp < 0) {
          // دفعنا جنيه أقل مما كان مسجلاً -> ربح فروق عملة (دائن)
          fxType = 'GAIN';
          const absGain = round2(Math.abs(fxDiffEgp));
          const fxGainAcc = this.resolveMappedAccount(
            clientAccounts,
            mapping,
            'fxGainAccountCode',
            'أرباح فروق العملة',
            clientId
          );
          lines.push({
            id: `fx-settle-${invoice.id}-gain`,
            accountId: fxGainAcc.id,
            accountCode: fxGainAcc.code,
            accountName: fxGainAcc.name,
            debit: 0,
            credit: absGain,
            originalAmount: absGain,
            amountEgp: absGain,
            currency: 'EGP',
            exchangeRate: 1,
            description: `أرباح فروق عملة محققة عند سداد فاتورة مشتريات رقم ${invoice.invoiceNumber}`,
            clientId,
          });
        }
      }

      const fiscalYear = parseInt(settlementDate.slice(0, 4), 10) || 2026;
      const savedEntry = db.addJournalEntry({
        clientId,
        date: settlementDate,
        fiscalYear,
        description:
          params.notes ||
          `قيد سداد وفروق عملة للفاتورة رقم ${invoice.invoiceNumber} (${currency} من ${invoiceRate} إلى ${settlementRate})`,
        referenceNumber: `FX-SET-${invoice.invoiceNumber}`,
        documentType: 'FX_SETTLEMENT',
        currency,
        exchangeRate: settlementRate,
        isPosted: true,
        status: 'POSTED',
        source: 'FX_SETTLEMENT_ENGINE',
        sourceInvoiceId: invoice.id,
        lines,
      });

      invoice.paidAmount = round2((Number(invoice.paidAmount) || 0) + foreignPaid);
      invoice.remainingAmount = Math.max(0, round2(defaultForeignNet - invoice.paidAmount));
      invoice.status = invoice.remainingAmount <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';
      db.saveState('INVOICES');

      return {
        success: true,
        entryId: savedEntry.id,
        entry: savedEntry,
        journalEntry: savedEntry,
        fxDifferenceEgp: fxDiffEgp,
        fxType,
        errors: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تسجيل قيد السداد وفروق العملة.';
      return {
        success: false,
        error: msg,
        errors: [msg],
      };
    }
  }
}
