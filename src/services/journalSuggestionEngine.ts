import { JournalEntry, JournalEntryLine, Account, AccountCategory } from '../types';

export interface AccountUsageStats {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitCount: number;
  creditCount: number;
  totalUsage: number;
  lastUsedDate: string;
  category?: AccountCategory;
}

export interface CounterAccountSuggestion {
  account: Account;
  suggestedNature: 'DEBIT' | 'CREDIT';
  frequency: number;
  confidencePercentage: number;
  sampleDescription?: string;
  typicalShareRatio?: number; // e.g., 0.14 for VAT, 0.01 for WHT, 1.0 for balancing
  suggestedAmount?: number;
}

export interface HistoricalPatternMatch {
  id: string;
  title: string;
  description: string;
  entryType: JournalEntry['entryType'];
  frequency: number;
  lastUsedDate: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    nature: 'DEBIT' | 'CREDIT';
    percentage: number; // percentage of main amount
    typicalAmount?: number;
    description?: string;
  }>;
}

// Arabic Text Normalizer for fuzzy accounting search
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // Remove tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export class JournalSuggestionEngine {
  /**
   * Analyzes all journal entries to build account usage statistics
   */
  static getAccountUsageStats(
    entries: JournalEntry[],
    accounts: Account[]
  ): Map<string, AccountUsageStats> {
    const statsMap = new Map<string, AccountUsageStats>();

    // Initialize map
    accounts.forEach((acc) => {
      statsMap.set(acc.id, {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debitCount: 0,
        creditCount: 0,
        totalUsage: 0,
        lastUsedDate: '',
        category: acc.category,
      });
    });

    // Populate from historical entries
    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        let stat = statsMap.get(line.accountId);
        if (!stat) {
          const accByCode = accounts.find((a) => a.code === line.accountCode);
          if (accByCode) {
            stat = statsMap.get(accByCode.id);
          }
        }

        if (stat) {
          if (Number(line.debit) > 0) stat.debitCount += 1;
          if (Number(line.credit) > 0) stat.creditCount += 1;
          stat.totalUsage += 1;
          if (!stat.lastUsedDate || entry.date > stat.lastUsedDate) {
            stat.lastUsedDate = entry.date;
          }
        }
      });
    });

    return statsMap;
  }

  /**
   * Suggests counter-party accounts when a user has added or selected a specific debit or credit line
   * For example: If User selected "1220 العملاء" on DEBIT, suggests "4110 المبيعات" & "2210 ضريبة القيمة المضافة" on CREDIT.
   */
  static getSuggestedCounterAccounts(
    targetAccountId: string,
    targetNature: 'DEBIT' | 'CREDIT',
    entries: JournalEntry[],
    accounts: Account[],
    currentDifference: number = 0
  ): CounterAccountSuggestion[] {
    if (!targetAccountId) return [];

    const targetAccount = accounts.find((a) => a.id === targetAccountId || a.code === targetAccountId);
    if (!targetAccount) return [];

    const targetCodes = [targetAccount.id, targetAccount.code];
    const counterAccountCounts = new Map<string, { count: number; sampleDesc: string; sampleAmounts: number[] }>();
    let totalTargetOccurrences = 0;

    const expectedCounterNature: 'DEBIT' | 'CREDIT' = targetNature === 'DEBIT' ? 'CREDIT' : 'DEBIT';

    entries.forEach((entry) => {
      // Check if this entry contains our target account on the target nature side
      const hasTarget = entry.lines.some((l) => {
        const matchesAcc = targetCodes.includes(l.accountId) || targetCodes.includes(l.accountCode);
        const matchesNature = targetNature === 'DEBIT' ? Number(l.debit) > 0 : Number(l.credit) > 0;
        return matchesAcc && matchesNature;
      });

      if (hasTarget) {
        totalTargetOccurrences += 1;

        // Find counter accounts on the opposite nature side
        entry.lines.forEach((l) => {
          const isCounter =
            expectedCounterNature === 'DEBIT' ? Number(l.debit) > 0 : Number(l.credit) > 0;
          const isSameAccount =
            targetCodes.includes(l.accountId) || targetCodes.includes(l.accountCode);

          if (isCounter && !isSameAccount) {
            const accObj = accounts.find((a) => a.id === l.accountId || a.code === l.accountCode);
            if (accObj) {
              const prev = counterAccountCounts.get(accObj.id) || {
                count: 0,
                sampleDesc: l.description || entry.description,
                sampleAmounts: [],
              };
              prev.count += 1;
              const val = expectedCounterNature === 'DEBIT' ? Number(l.debit) : Number(l.credit);
              if (val > 0) prev.sampleAmounts.push(val);
              counterAccountCounts.set(accObj.id, prev);
            }
          }
        });
      }
    });

    const suggestions: CounterAccountSuggestion[] = [];

    counterAccountCounts.forEach((data, accId) => {
      const acc = accounts.find((a) => a.id === accId);
      if (!acc) return;

      const confidence = totalTargetOccurrences > 0 ? Math.round((data.count / totalTargetOccurrences) * 100) : 50;

      suggestions.push({
        account: acc,
        suggestedNature: expectedCounterNature,
        frequency: data.count,
        confidencePercentage: Math.min(100, confidence),
        sampleDescription: data.sampleDesc,
        suggestedAmount: currentDifference > 0 ? currentDifference : undefined,
      });
    });

    // Fallback: If history is small, apply Egyptian Accounting Standard (EAS) heuristics
    if (suggestions.length === 0) {
      const standardFallbacks = this.getStandardAccountingFallbacks(targetAccount, targetNature, accounts, currentDifference);
      return standardFallbacks;
    }

    return suggestions.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
  }

  /**
   * Search and match historical entries based on the typed description and entry type
   */
  static findHistoricalMatches(
    queryText: string,
    entryType: JournalEntry['entryType'],
    entries: JournalEntry[],
    accounts: Account[]
  ): HistoricalPatternMatch[] {
    const normalizedQuery = normalizeArabicText(queryText);
    const queryTokens = normalizedQuery.split(' ').filter((t) => t.length >= 2);

    const patternsMap = new Map<string, HistoricalPatternMatch>();

    entries.forEach((entry) => {
      const normEntryDesc = normalizeArabicText(entry.description);
      let matchScore = 0;

      if (entryType && entry.entryType === entryType) {
        matchScore += 2;
      }

      if (queryTokens.length > 0) {
        let tokenMatches = 0;
        queryTokens.forEach((token) => {
          if (normEntryDesc.includes(token)) {
            tokenMatches += 1;
          }
        });

        if (tokenMatches > 0) {
          matchScore += tokenMatches * 3;
        }
      } else if (normEntryDesc.length > 3) {
        // If no query, prioritize recently used entries
        matchScore += 1;
      }

      if (matchScore > 0 && entry.lines && entry.lines.length >= 2) {
        // Generate a signature key for this entry pattern based on accounts
        const signature = entry.lines
          .map((l) => `${l.accountCode || l.accountName}:${Number(l.debit) > 0 ? 'D' : 'C'}`)
          .sort()
          .join('|');

        const mainAmount = Math.max(1, entry.totalDebit || 1);

        const existing = patternsMap.get(signature);
        if (existing) {
          existing.frequency += 1;
          if (entry.date > existing.lastUsedDate) {
            existing.lastUsedDate = entry.date;
            existing.description = entry.description;
          }
        } else {
          patternsMap.set(signature, {
            id: entry.id,
            title: entry.description || 'عملية محاسبية سابقة',
            description: entry.description,
            entryType: entry.entryType || 'GENERAL',
            frequency: 1,
            lastUsedDate: entry.date,
            lines: entry.lines.map((l) => {
              const isDeb = Number(l.debit) > 0;
              const val = isDeb ? Number(l.debit) : Number(l.credit);
              return {
                accountCode: l.accountCode,
                accountName: l.accountName,
                nature: isDeb ? 'DEBIT' : 'CREDIT',
                percentage: Number(((val / mainAmount) * 100).toFixed(2)),
                typicalAmount: val,
                description: l.description,
              };
            }),
          });
        }
      }
    });

    const results = Array.from(patternsMap.values());
    return results.sort((a, b) => b.frequency - a.frequency).slice(0, 6);
  }

  /**
   * Provides intelligent Egyptian Accounting Standard default pairs if no history exists yet
   */
  private static getStandardAccountingFallbacks(
    account: Account,
    nature: 'DEBIT' | 'CREDIT',
    accounts: Account[],
    currentDifference: number
  ): CounterAccountSuggestion[] {
    const code = account.code;
    const fallbacks: CounterAccountSuggestion[] = [];

    const findAcc = (cPrefix: string, namePart?: string) =>
      accounts.find((a) => a.code.startsWith(cPrefix) || (namePart && a.name.includes(namePart)));

    if (nature === 'DEBIT') {
      // If debiting an Expense (5xxx) -> Suggest Bank (1120) or Cash (1110) or Supplier (2110)
      if (code.startsWith('5')) {
        const cash = findAcc('1110', 'خزينة') || findAcc('111', 'صندوق');
        const bank = findAcc('1120', 'بنك');
        const suppliers = findAcc('2110', 'مورد');
        if (bank) fallbacks.push({ account: bank, suggestedNature: 'CREDIT', frequency: 15, confidencePercentage: 85, sampleDescription: 'سداد بشيك / تحويل بنكي', suggestedAmount: currentDifference });
        if (cash) fallbacks.push({ account: cash, suggestedNature: 'CREDIT', frequency: 12, confidencePercentage: 75, sampleDescription: 'سداد نقداً من الخزينة', suggestedAmount: currentDifference });
        if (suppliers) fallbacks.push({ account: suppliers, suggestedNature: 'CREDIT', frequency: 8, confidencePercentage: 60, sampleDescription: 'استحقاق على الحساب للمورد', suggestedAmount: currentDifference });
      }
      // If debiting Clients (1220) -> Suggest Sales (4110) & VAT (2210)
      else if (code.startsWith('122') || account.name.includes('عملاء')) {
        const sales = findAcc('4110', 'مبيعات');
        const vat = findAcc('2210', 'قيمة مضافة');
        if (sales) fallbacks.push({ account: sales, suggestedNature: 'CREDIT', frequency: 20, confidencePercentage: 95, sampleDescription: 'إيراد مبيعات بضاعة / خدمات', suggestedAmount: currentDifference });
        if (vat) fallbacks.push({ account: vat, suggestedNature: 'CREDIT', frequency: 18, confidencePercentage: 90, sampleDescription: 'ضريبة القيمة المضافة 14%', typicalShareRatio: 0.14 });
      }
      // If debiting Cash/Bank (1110/1120) -> Suggest Clients (1220) or Sales (4110)
      else if (code.startsWith('111') || code.startsWith('112')) {
        const clients = findAcc('1220', 'عملاء');
        const sales = findAcc('4110', 'مبيعات');
        if (clients) fallbacks.push({ account: clients, suggestedNature: 'CREDIT', frequency: 14, confidencePercentage: 80, sampleDescription: 'تحصيل مستحقات من العملاء', suggestedAmount: currentDifference });
        if (sales) fallbacks.push({ account: sales, suggestedNature: 'CREDIT', frequency: 10, confidencePercentage: 70, sampleDescription: 'مبيعات نقدية فورية', suggestedAmount: currentDifference });
      }
      // If debiting Fixed Assets (13xx) -> Suggest Bank (1120) or Creditors (2120)
      else if (code.startsWith('13') || account.name.includes('أصول')) {
        const bank = findAcc('1120', 'بنك');
        const creditors = findAcc('2120', 'دائنون') || findAcc('2110', 'موردين');
        if (bank) fallbacks.push({ account: bank, suggestedNature: 'CREDIT', frequency: 9, confidencePercentage: 85, sampleDescription: 'شراء أصول ثابتة بشيك', suggestedAmount: currentDifference });
        if (creditors) fallbacks.push({ account: creditors, suggestedNature: 'CREDIT', frequency: 7, confidencePercentage: 70, sampleDescription: 'شراء أصل ثابت بالأجل', suggestedAmount: currentDifference });
      }
    } else {
      // If crediting Revenue (4xxx) -> Suggest Clients (1220) or Bank (1120) or Cash (1110)
      if (code.startsWith('4')) {
        const clients = findAcc('1220', 'عملاء');
        const bank = findAcc('1120', 'بنك');
        const cash = findAcc('1110', 'خزينة');
        if (clients) fallbacks.push({ account: clients, suggestedNature: 'DEBIT', frequency: 22, confidencePercentage: 90, sampleDescription: 'استحقاق مبيعات آجلة', suggestedAmount: currentDifference });
        if (bank) fallbacks.push({ account: bank, suggestedNature: 'DEBIT', frequency: 15, confidencePercentage: 80, sampleDescription: 'مبيعات محصلة بالبنك', suggestedAmount: currentDifference });
        if (cash) fallbacks.push({ account: cash, suggestedNature: 'DEBIT', frequency: 10, confidencePercentage: 70, sampleDescription: 'مبيعات نقدية بالخزينة', suggestedAmount: currentDifference });
      }
      // If crediting Suppliers (2110) -> Suggest Purchases (5210 / 1210) & VAT
      else if (code.startsWith('211') || account.name.includes('مورد')) {
        const purchases = findAcc('5210', 'مشتريات') || findAcc('1210', 'مخزون');
        const vat = findAcc('1231', 'قيمة مضافة') || findAcc('1230', 'ضرائب');
        if (purchases) fallbacks.push({ account: purchases, suggestedNature: 'DEBIT', frequency: 18, confidencePercentage: 90, sampleDescription: 'إثبات فاتورة مشتريات بضاعة', suggestedAmount: currentDifference });
        if (vat) fallbacks.push({ account: vat, suggestedNature: 'DEBIT', frequency: 15, confidencePercentage: 85, sampleDescription: 'ضريبة قيمة مضافة مشتريات 14%', typicalShareRatio: 0.14 });
      }
      // If crediting Cash/Bank (1110/1120) -> Suggest Expenses (5110) or Suppliers (2110)
      else if (code.startsWith('111') || code.startsWith('112')) {
        const expenses = findAcc('5110', 'مصروفات') || findAcc('5100', 'عمومية');
        const suppliers = findAcc('2110', 'موردين');
        if (expenses) fallbacks.push({ account: expenses, suggestedNature: 'DEBIT', frequency: 16, confidencePercentage: 85, sampleDescription: 'سداد مصروفات إدارية وتشغيلية', suggestedAmount: currentDifference });
        if (suppliers) fallbacks.push({ account: suppliers, suggestedNature: 'DEBIT', frequency: 14, confidencePercentage: 80, sampleDescription: 'سداد دفعات الموردين', suggestedAmount: currentDifference });
      }
    }

    return fallbacks;
  }

  /**
   * وحدة القيد الآلي الفوري بالذكاء الاصطناعي وتحليل النص الطبيعي (Instant NLP Balanced Journal Entry Generator)
   * تأخذ الوصف والقيمة فقط، وتقوم تلقائياً بتحديد الحسابات المدينة والدائنة وحساب الضرائب والتوازن التام
   */
  static parsePromptToBalancedEntry(
    rawDescription: string,
    amount: number,
    accounts: Account[],
    existingEntries: JournalEntry[] = []
  ): SmartParsedEntryResult {
    const cleanDesc = (rawDescription || '').trim();
    const safeAmount = Math.max(0, Number(amount) || 0);
    const normalized = normalizeArabicText(cleanDesc);

    // Helpers to search in accounts
    const findAccount = (predicate: (acc: Account) => boolean): Account | undefined => {
      return accounts.find(predicate);
    };

    const findByCodeOrName = (prefixes: string[], keywords: string[]): Account | undefined => {
      // 1. Exact or prefix match
      for (const p of prefixes) {
        const acc = accounts.find((a) => a.code.startsWith(p));
        if (acc) return acc;
      }
      // 2. Keyword match in name
      for (const kw of keywords) {
        const normKw = normalizeArabicText(kw);
        const acc = accounts.find((a) => normalizeArabicText(a.name).includes(normKw));
        if (acc) return acc;
      }
      return undefined;
    };

    // Standard Egyptian Accounts Resolution
    const cashAcc =
      findByCodeOrName(['1111', '1110', '111'], ['خزينة', 'صندوق', 'نقدية']) ||
      accounts[0];
    const bankAcc =
      findByCodeOrName(['1121', '1120', '112'], ['بنك', 'حساب جاري', 'البنك']) ||
      cashAcc;
    const clientsAcc =
      findByCodeOrName(['1221', '1220', '122', '121'], ['عملاء', 'مدينون']) ||
      accounts[0];
    const suppliersAcc =
      findByCodeOrName(['2111', '2110', '211'], ['موردين', 'دائنون']) ||
      accounts[0];
    const salesAcc =
      findByCodeOrName(['4111', '4110', '411', '41'], ['مبيعات', 'إيراد مبيعات']) ||
      findByCodeOrName(['42'], ['إيرادات']) ||
      accounts[0];
    const purchasesAcc =
      findByCodeOrName(['5211', '5210', '521', '311', '121'], ['مشتريات', 'بضاعة', 'تكلفة المبيعات']) ||
      accounts[0];
    const vatInputAcc =
      findByCodeOrName(['1231', '1230', '1351', '123'], ['قيمة مضافة مدخلات', 'ضريبة القيمة المضافة']) ||
      accounts[0];
    const vatOutputAcc =
      findByCodeOrName(['2211', '2210', '221', '2351'], ['قيمة مضافة مخرجات', 'ضريبة القيمة المضافة']) ||
      vatInputAcc;
    const whtReceivableAcc =
      findByCodeOrName(['1232', '123', '1352'], ['خصم وتحصيل', 'أ.ت.ص']) ||
      vatInputAcc;
    const whtPayableAcc =
      findByCodeOrName(['2212', '221', '2352'], ['خصم وتحصيل دائن', 'أ.ت.ص']) ||
      vatOutputAcc;

    // Determine payment instrument (Cash vs Bank)
    const isBank =
      normalized.includes('بنك') ||
      normalized.includes('شيك') ||
      normalized.includes('تحويل') ||
      normalized.includes('فيزا') ||
      normalized.includes('سويفت') ||
      normalized.includes('بطاقة');
    const paymentAccount = isBank ? bankAcc : cashAcc;

    // Detect Tax Flags
    const includesVat =
      normalized.includes('ضريبة') ||
      normalized.includes('قيمة مضافة') ||
      normalized.includes('14') ||
      normalized.includes('بفاتورة') ||
      normalized.includes('رسمية');

    const includesWht =
      normalized.includes('خصم') ||
      normalized.includes('تحت الحساب') ||
      normalized.includes('ارباح تجارية') ||
      normalized.includes('1%');

    let debitAccount: Account = expensesOrAssetAccount();
    let creditAccount: Account = paymentAccount;
    let entryType: JournalEntry['entryType'] = 'GENERAL';
    let explanation = '';
    let hasVat = false;
    let vatAmount = 0;
    let baseAmount = safeAmount;

    function expensesOrAssetAccount(): Account {
      // 1. Specific Expenses
      if (normalized.includes('ايجار') || normalized.includes('مقر') || normalized.includes('مكتب')) {
        return findByCodeOrName(['5121', '5120', '5110'], ['ايجار', 'إيجار']) || cashAcc;
      }
      if (normalized.includes('كهرباء') || normalized.includes('مياه') || normalized.includes('غاز') || normalized.includes('مرافق') || normalized.includes('فاتورة كهرباء')) {
        return findByCodeOrName(['5124', '5120', '5110'], ['كهرباء', 'مياه', 'مرافق']) || cashAcc;
      }
      if (normalized.includes('مرتب') || normalized.includes('اجور') || normalized.includes('رواتب') || normalized.includes('موظف')) {
        return findByCodeOrName(['5111', '5110', '511'], ['مرتبات', 'أجور']) || cashAcc;
      }
      if (normalized.includes('صيانة') || normalized.includes('اصلاح') || normalized.includes('تصليح')) {
        return findByCodeOrName(['5123', '5120', '5110'], ['صيانة']) || cashAcc;
      }
      if (normalized.includes('بنزين') || normalized.includes('وقود') || normalized.includes('سولار') || normalized.includes('انتقالات') || normalized.includes('مواصلات')) {
        return findByCodeOrName(['5125', '5120'], ['وقود', 'انتقالات', 'سيارات']) || cashAcc;
      }
      if (normalized.includes('دعاية') || normalized.includes('اعلان') || normalized.includes('تسويق')) {
        return findByCodeOrName(['5131', '5130'], ['دعاية', 'إعلان', 'تسويق']) || cashAcc;
      }
      if (normalized.includes('ضيافة') || normalized.includes('بوفيه') || normalized.includes('اكراميات') || normalized.includes('نثريات')) {
        return findByCodeOrName(['5126', '5120'], ['ضيافة', 'بوفيه', 'نثريات']) || cashAcc;
      }
      if (normalized.includes('ادوات') || normalized.includes('مكتبية') || normalized.includes('ورق') || normalized.includes('طباعة')) {
        return findByCodeOrName(['5127', '5120'], ['أدوات كتابية', 'مطبوعات']) || cashAcc;
      }
      if (normalized.includes('عمولة') || normalized.includes('مصاريف بنكية') || normalized.includes('مصروفات بنك')) {
        return findByCodeOrName(['5141', '5140'], ['عمولات بنكية', 'فوائد']) || cashAcc;
      }

      // 2. Fixed Assets
      if (normalized.includes('شراء سيارة') || normalized.includes('سيارة')) {
        return findByCodeOrName(['1313', '1310'], ['سيارات', 'أصول ثابتة']) || cashAcc;
      }
      if (normalized.includes('كمبيوتر') || normalized.includes('لابتوب') || normalized.includes('طابعة') || normalized.includes('اجهزة')) {
        return findByCodeOrName(['1314', '1310'], ['أجهزة', 'حاسب', 'كمبيوتر']) || cashAcc;
      }
      if (normalized.includes('اثاث') || normalized.includes('مكتب') || normalized.includes('تكييف')) {
        return findByCodeOrName(['1312', '1310'], ['أثاث', 'تجهيزات']) || cashAcc;
      }

      // 3. Fallback General Expense
      return findByCodeOrName(['5110', '5100', '51', '5'], ['مصروفات عمومية', 'مصروف']) || cashAcc;
    }

    // SCENARIO 1: Sales / Revenue (مبيعات / إيرادات / تحصيل مبيعات)
    if (
      normalized.includes('بيع') ||
      normalized.includes('مبيعات') ||
      normalized.includes('ايراد') ||
      normalized.includes('اتعاب') ||
      normalized.includes('خدمات')
    ) {
      entryType = isBank || cleanDesc.includes('نقد') ? 'RECEIPT' : 'SALES';
      creditAccount = salesAcc;
      debitAccount = (normalized.includes('اجل') || normalized.includes('عميل') || normalized.includes('على الحساب'))
        ? clientsAcc
        : paymentAccount;

      if (includesVat) {
        hasVat = true;
        // Total includes 14% VAT
        baseAmount = parseFloat((safeAmount / 1.14).toFixed(2));
        vatAmount = parseFloat((safeAmount - baseAmount).toFixed(2));
      }

      explanation = `قيد إثبات إيراد ومبيعات وفقاً لمعيار المحاسبة المصري (EAS 48) ${hasVat ? 'متضمناً ضريبة القيمة المضافة 14% مخرجات' : ''}.`;
    }
    // SCENARIO 2: Purchases / Inventory (مشتريات / بضاعة / مخزون)
    else if (
      normalized.includes('شراء بضاعة') ||
      normalized.includes('مشتريات') ||
      normalized.includes('توريد بضاعة') ||
      normalized.includes('مخزون')
    ) {
      entryType = isBank || cleanDesc.includes('نقد') ? 'PAYMENT' : 'PURCHASE';
      debitAccount = purchasesAcc;
      creditAccount = (normalized.includes('اجل') || normalized.includes('مورد') || normalized.includes('على الحساب'))
        ? suppliersAcc
        : paymentAccount;

      if (includesVat) {
        hasVat = true;
        baseAmount = parseFloat((safeAmount / 1.14).toFixed(2));
        vatAmount = parseFloat((safeAmount - baseAmount).toFixed(2));
      }

      explanation = `قيد إثبات مشتريات وتكلفة بضاعة وفقاً للنظام المحاسبي المصري ${hasVat ? 'مع خصم ضريبة القيمة المضافة للمدخلات 14%' : ''}.`;
    }
    // SCENARIO 3: Customer Collection (تحصيل من عميل)
    else if (normalized.includes('تحصيل') && (normalized.includes('عميل') || normalized.includes('مستحق'))) {
      entryType = 'RECEIPT';
      debitAccount = paymentAccount;
      creditAccount = clientsAcc;
      explanation = 'قيد تحصيل نقدية/شيك من العملاء وتخفيض رصيد المدينين.';
    }
    // SCENARIO 4: Supplier Payment (سداد لمورد)
    else if ((normalized.includes('سداد') || normalized.includes('دفعة')) && (normalized.includes('مورد') || normalized.includes('موردين'))) {
      entryType = 'PAYMENT';
      debitAccount = suppliersAcc;
      creditAccount = paymentAccount;
      explanation = 'قيد سداد مستحقات للموردين وتخفيض رصيد الدائنين.';
    }
    // SCENARIO 5: Loan Repayment / Bank Financing (سداد قرض / تسهيلات بنكية)
    else if (normalized.includes('قرض') || normalized.includes('تسهيل') || normalized.includes('قسط')) {
      entryType = 'PAYMENT';
      const loanAcc = findByCodeOrName(['2121', '2120', '212', '21'], ['قروض', 'تسهيلات', 'بنك']) || suppliersAcc;
      debitAccount = loanAcc;
      creditAccount = bankAcc;
      explanation = 'قيد سداد قسط قرض بنكي وتخفيض التسهيلات الائتمانية.';
    }
    // SCENARIO 6: Partner Drawings / Financing (مسحوبات الشركاء)
    else if (normalized.includes('مسحوبات') || normalized.includes('شريك') || normalized.includes('جاري الشريك')) {
      const partnerAcc = findByCodeOrName(['3121', '3120', '312', '31'], ['جاري الشركاء', 'مسحوبات']) || cashAcc;
      debitAccount = partnerAcc;
      creditAccount = paymentAccount;
      entryType = 'PAYMENT';
      explanation = 'قيد إثبات مسحوبات نقدية للشركاء وفقاً لقواعد جاري الشركاء.';
    }
    // SCENARIO 7: Tax & Insurance Payment (سداد ضرائب / تأمينات)
    else if (normalized.includes('ضرائب') || normalized.includes('قيمة مضافة') || normalized.includes('تأمينات')) {
      entryType = 'PAYMENT';
      debitAccount = vatOutputAcc;
      creditAccount = paymentAccount;
      explanation = 'قيد سداد التزامات ضريبية ومستحقات مصلحة الضرائب المصرية.';
    }
    // SCENARIO 8: General Expenses & Asset Purchases (مصروفات عامة أو شراء أصول)
    else {
      entryType = isBank || cleanDesc.includes('نقد') || cleanDesc.includes('صرف') || cleanDesc.includes('سداد')
        ? 'PAYMENT'
        : 'GENERAL';
      debitAccount = expensesOrAssetAccount();
      creditAccount = paymentAccount;
      explanation = `قيد إثبات سداد ${debitAccount.name} عبر ${creditAccount.name}.`;
    }

    // Build the balanced entry lines
    const lines: SmartParsedEntryResult['lines'] = [];

    if (hasVat && (entryType === 'PURCHASE' || entryType === 'PAYMENT') && vatAmount > 0) {
      // Debit: Base expense/purchase
      lines.push({
        id: 'l1',
        accountId: debitAccount.id,
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        debit: baseAmount,
        credit: 0,
        description: cleanDesc,
      });
      // Debit: Input VAT (14%)
      lines.push({
        id: 'l2',
        accountId: vatInputAcc.id,
        accountCode: vatInputAcc.code,
        accountName: vatInputAcc.name,
        debit: vatAmount,
        credit: 0,
        description: 'ضريبة القيمة المضافة 14% مدخلات',
      });
      // Credit: Cash/Bank/Supplier total
      lines.push({
        id: 'l3',
        accountId: creditAccount.id,
        accountCode: creditAccount.code,
        accountName: creditAccount.name,
        debit: 0,
        credit: safeAmount,
        description: cleanDesc,
      });
    } else if (hasVat && (entryType === 'SALES' || entryType === 'RECEIPT') && vatAmount > 0) {
      // Debit: Total from Customer / Cash
      lines.push({
        id: 'l1',
        accountId: debitAccount.id,
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        debit: safeAmount,
        credit: 0,
        description: cleanDesc,
      });
      // Credit: Base revenue
      lines.push({
        id: 'l2',
        accountId: creditAccount.id,
        accountCode: creditAccount.code,
        accountName: creditAccount.name,
        debit: 0,
        credit: baseAmount,
        description: cleanDesc,
      });
      // Credit: Output VAT (14%)
      lines.push({
        id: 'l3',
        accountId: vatOutputAcc.id,
        accountCode: vatOutputAcc.code,
        accountName: vatOutputAcc.name,
        debit: 0,
        credit: vatAmount,
        description: 'ضريبة القيمة المضافة 14% مخرجات',
      });
    } else {
      // Standard 2-legged balanced entry
      lines.push({
        id: 'l1',
        accountId: debitAccount.id,
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        debit: safeAmount,
        credit: 0,
        description: cleanDesc,
      });
      lines.push({
        id: 'l2',
        accountId: creditAccount.id,
        accountCode: creditAccount.code,
        accountName: creditAccount.name,
        debit: 0,
        credit: safeAmount,
        description: cleanDesc,
      });
    }

    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      description: cleanDesc,
      entryType,
      lines,
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      isBalanced,
      confidence: 96,
      explanation,
      detectedDebitAccountName: debitAccount.name,
      detectedCreditAccountName: creditAccount.name,
      taxBreakdown: hasVat
        ? {
            hasVat: true,
            vatRate: 14,
            vatAmount,
            subtotal: baseAmount,
          }
        : undefined,
    };
  }
}

export interface SmartParsedEntryResult {
  description: string;
  entryType: JournalEntry['entryType'];
  lines: Array<{
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  confidence: number;
  explanation: string;
  detectedDebitAccountName: string;
  detectedCreditAccountName: string;
  taxBreakdown?: {
    hasVat: boolean;
    vatRate?: number;
    vatAmount?: number;
    subtotal?: number;
    hasWht?: boolean;
    whtAmount?: number;
  };
}
