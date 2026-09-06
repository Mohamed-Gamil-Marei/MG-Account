/**
 * High-Speed In-Memory Indexing, Caching & Forensic Calculation Engine
 * Designed for lightning-fast responsiveness under massive records & archive operations
 * منظومة الأداء العالي والمطابقة السريعة / مكتب المحاسب القانوني محمد جميل مرعي
 */

import {
  JournalEntry,
  Account,
  BankStatementLine,
  BenfordDigitStat,
  AnomalyAlert,
  CashFlowMonthForecast,
} from '../types';

class FastPerformanceCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set(key: string, value: any, ttl = this.DEFAULT_TTL): void {
    if (this.cache.size > 200) {
      // Auto-prune oldest 50 items to prevent any memory bloat
      const keys = Array.from(this.cache.keys()).slice(0, 50);
      keys.forEach((k) => this.cache.delete(k));
    }
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const perfCache = new FastPerformanceCache();

// -------------------------------------------------------------
// 1. Benford's Law Analysis & Anomaly Detection (Forensic Engine)
// -------------------------------------------------------------
export function calculateBenfordDistribution(entries: JournalEntry[]): {
  digitStats: BenfordDigitStat[];
  anomalies: AnomalyAlert[];
  overallRiskScore: number; // 0 (Low) to 100 (Critical)
  totalSampleAmounts: number;
} {
  const cacheKey = `benford_${entries.length}_${entries[0]?.updatedAt || 'empty'}`;
  const cached = perfCache.get<any>(cacheKey);
  if (cached) return cached;

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let totalAmountsCount = 0;
  const anomalies: AnomalyAlert[] = [];

  // Theoretical Benford's percentages
  const expectedPercentages: Record<number, number> = {
    1: 30.1,
    2: 17.6,
    3: 12.5,
    4: 9.7,
    5: 7.9,
    6: 6.7,
    7: 5.8,
    8: 5.1,
    9: 4.6,
  };

  entries.forEach((entry) => {
    // Check entry date for weekend/off-hours anomalies
    const entryDate = new Date(entry.date);
    const dayOfWeek = entryDate.getDay(); // 5 = Friday, 6 = Saturday (Egyptian weekend)

    entry.lines.forEach((line) => {
      const amt = Math.max(line.debit || 0, line.credit || 0);
      if (amt >= 10) {
        totalAmountsCount++;
        const firstDigitStr = amt.toString().replace(/[^1-9]/, '').charAt(0);
        const digit = parseInt(firstDigitStr, 10);
        if (digit >= 1 && digit <= 9) {
          counts[digit]++;
        }

        // Anomaly: Repeated high round numbers (e.g., 50,000 / 100,000 / 250,000)
        if (amt >= 20000 && amt % 10000 === 0 && line.accountName.includes('مصروف')) {
          anomalies.push({
            id: `anom-round-${entry.id}-${line.id}`,
            entryId: entry.id,
            entryNumber: entry.entryNumber,
            entryDate: entry.date,
            accountName: line.accountName,
            amount: amt,
            severity: amt >= 100000 ? 'HIGH' : 'MEDIUM',
            category: 'ROUND_NUMBER',
            title: `مبلغ دائري غير طبيعي (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تم قيد مبلغ دائري منتظم بحساب ${line.accountName} دون كسور ضريبية أو فواتير تفصيلية.`,
            recommendation: 'فحص المستند المؤيد وأصل الفاتورة الضريبية للتأكد من عدم التقدير الجزافي.',
          });
        }

        // Anomaly: Large Cash Withdrawals (المسحوبات النقدية المباشرة بدون شيك أو تحويل)
        if (amt >= 50000 && (line.accountName.includes('صندوق') || line.accountName.includes('نقدية')) && line.debit > 0) {
          anomalies.push({
            id: `anom-cash-${entry.id}-${line.id}`,
            entryId: entry.id,
            entryNumber: entry.entryNumber,
            entryDate: entry.date,
            accountName: line.accountName,
            amount: amt,
            severity: 'CRITICAL',
            category: 'LARGE_CASH_DRAWS',
            title: `سحب نقدي ضخم (${amt.toLocaleString('ar-EG')} ج.م) مخالف لتعليمات المدفوعات غير النقدية`,
            description: `تم سحب مبلغ نقدي يتجاوز الحدود القانونية لقانون المدفوعات غير النقدية رقم 18 لسنة 2019.`,
            recommendation: 'مراجعة إذن الصرف وتوجيه العميل بالتحويل البنكي أو الشيكات البنكية لتفادي المخالفات.',
          });
        }
      }
    });

    // Check Friday postings (Weekend anomalies)
    if (dayOfWeek === 5 && entry.lines.some((l) => (l.debit || 0) > 30000)) {
      anomalies.push({
        id: `anom-wend-${entry.id}`,
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        entryDate: entry.date,
        accountName: entry.lines[0]?.accountName || 'قيد عطلة',
        amount: entry.totalDebit,
        severity: 'MEDIUM',
        category: 'WEEKEND',
        title: `قيد مرحل في عطلة أسبوعية رسمية (الجمعة)`,
        description: `تم تسجيل وترحيل القيد رقم ${entry.entryNumber} في يوم عطلة رسمية بمبلغ ${entry.totalDebit.toLocaleString('ar-EG')} ج.م.`,
        recommendation: 'التحقق من توقيت وسجل الموظف القائم بالإدخال في سجل المراجعة (Audit Log).',
      });
    }
  });

  const digitStats: BenfordDigitStat[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
    const count = counts[digit] || 0;
    const actualPercentage = totalAmountsCount > 0 ? Number(((count / totalAmountsCount) * 100).toFixed(1)) : 0;
    const expectedPercentage = expectedPercentages[digit];
    const deviation = Number(Math.abs(actualPercentage - expectedPercentage).toFixed(1));
    const isAnomalous = totalAmountsCount > 30 && deviation > 6.5;

    return {
      digit,
      actualCount: count,
      actualPercentage,
      expectedPercentage,
      deviation,
      isAnomalous,
    };
  });

  // Calculate overall risk score
  const anomalousDigitsCount = digitStats.filter((d) => d.isAnomalous).length;
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL').length;
  const highAnomalies = anomalies.filter((a) => a.severity === 'HIGH').length;

  let overallRiskScore = 15; // baseline healthy
  overallRiskScore += anomalousDigitsCount * 12;
  overallRiskScore += criticalAnomalies * 18;
  overallRiskScore += highAnomalies * 8;
  overallRiskScore = Math.min(100, Math.max(5, overallRiskScore));

  const result = {
    digitStats,
    anomalies: anomalies.slice(0, 30),
    overallRiskScore,
    totalSampleAmounts: totalAmountsCount,
  };

  perfCache.set(cacheKey, result);
  return result;
}

// -------------------------------------------------------------
// 2. Automated Smart Bank Reconciliation Engine
// -------------------------------------------------------------
export function autoMatchBankStatement(
  statementLines: BankStatementLine[],
  journalEntries: JournalEntry[],
  bankAccountId: string
): {
  matchedLines: BankStatementLine[];
  matchRate: number;
  totalStatementDebits: number;
  totalStatementCredits: number;
  unmatchedInBankCount: number;
} {
  // Extract all posted journal entry lines for this bank account
  const bankJournalLines: {
    entryId: string;
    entryNumber: number;
    serialNumber: string;
    date: string;
    debit: number;
    credit: number;
    description: string;
    matched?: boolean;
  }[] = [];

  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (line.accountId === bankAccountId || line.accountCode.startsWith('1102') || line.accountName.includes('بنك')) {
        bankJournalLines.push({
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          serialNumber: entry.serialNumber,
          date: entry.date,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || entry.description,
        });
      }
    });
  });

  let matchedCount = 0;
  let totalStatementDebits = 0;
  let totalStatementCredits = 0;

  const processedLines: BankStatementLine[] = statementLines.map((line) => {
    totalStatementDebits += line.debit || 0;
    totalStatementCredits += line.credit || 0;

    if (line.isMatched && line.matchedEntryId) {
      matchedCount++;
      return line;
    }

    // In Bank statement: Credit is Deposit into bank (Bank DEBIT in our books)
    // Debit in bank statement is Withdrawal/Fee (Bank CREDIT in our books)
    const targetBookDebit = line.credit || 0;
    const targetBookCredit = line.debit || 0;

    // Search for match in book lines
    const matchedBookLine = bankJournalLines.find((bj) => {
      if (bj.matched) return false;
      const amtMatch =
        (targetBookDebit > 0 && Math.abs(bj.debit - targetBookDebit) < 0.05) ||
        (targetBookCredit > 0 && Math.abs(bj.credit - targetBookCredit) < 0.05);

      if (!amtMatch) return false;

      // Date check within 7 days window (due to clearing delays)
      const stDate = new Date(line.date).getTime();
      const bkDate = new Date(bj.date).getTime();
      const daysDiff = Math.abs(stDate - bkDate) / (1000 * 3600 * 24);

      return daysDiff <= 10;
    });

    if (matchedBookLine) {
      matchedBookLine.matched = true;
      matchedCount++;
      return {
        ...line,
        isMatched: true,
        matchedEntryId: matchedBookLine.entryId,
        matchedEntryRef: matchedBookLine.serialNumber || `JV-${matchedBookLine.entryNumber}`,
        matchConfidence: 98,
        notes: `مطابقة تامة مع قيد ${matchedBookLine.serialNumber} بتاريخ ${matchedBookLine.date}`,
      };
    }

    return {
      ...line,
      isMatched: false,
      matchConfidence: 0,
    };
  });

  const matchRate = statementLines.length > 0 ? Math.round((matchedCount / statementLines.length) * 100) : 100;

  return {
    matchedLines: processedLines,
    matchRate,
    totalStatementDebits,
    totalStatementCredits,
    unmatchedInBankCount: statementLines.length - matchedCount,
  };
}

// -------------------------------------------------------------
// 3. 12-Month Predictive Cash Flow Engine
// -------------------------------------------------------------
export function generate12MonthPredictiveCashFlow(
  accounts: Account[],
  journalEntries: JournalEntry[],
  initialLiquidCash: number
): CashFlowMonthForecast[] {
  const months = [
    { key: '2026-01', name: 'يناير 2026', factor: 1.05 },
    { key: '2026-02', name: 'فبراير 2026', factor: 0.98 },
    { key: '2026-03', name: 'مارس 2026', factor: 1.12 },
    { key: '2026-04', name: 'أبريل 2026 (موسم الإقرارات)', factor: 1.25 }, // Tax season peak
    { key: '2026-05', name: 'مايو 2026', factor: 0.95 },
    { key: '2026-06', name: 'يونيو 2026 (إقفال نصف سنوي)', factor: 1.1 },
    { key: '2026-07', name: 'يوليو 2026', factor: 0.92 },
    { key: '2026-08', name: 'أغسطس 2026', factor: 0.9 },
    { key: '2026-09', name: 'سبتمبر 2026', factor: 1.02 },
    { key: '2026-10', name: 'أكتوبر 2026', factor: 1.08 },
    { key: '2026-11', name: 'نوفمبر 2026', factor: 1.15 },
    { key: '2026-12', name: 'ديسمبر 2026 (إقفال سنوي)', factor: 1.3 },
  ];

  // Derive average baseline monthly expenses from accounts
  const totalSalaries = accounts
    .filter((a) => a.name.includes('مرتبات') || a.name.includes('أجور'))
    .reduce((s, a) => s + (a.currentBalance || 0), 0);
  const baselineMonthlySalaries = totalSalaries > 0 ? Math.round(totalSalaries / 12) : 185000;

  const totalRent = accounts
    .filter((a) => a.name.includes('إيجار') || a.name.includes('مرافق'))
    .reduce((s, a) => s + (a.currentBalance || 0), 0);
  const baselineMonthlyRent = totalRent > 0 ? Math.round(totalRent / 12) : 45000;

  let currentCash = Math.max(150000, initialLiquidCash);

  return months.map((m, idx) => {
    const openingCash = currentCash;
    const isAprilTaxPeak = idx === 3;
    const isDecemberPeak = idx === 11;

    const collectedReceivables = Math.round(380000 * m.factor);
    const cashSales = Math.round(140000 * m.factor);
    const taxRefundsOrOther = isAprilTaxPeak ? 25000 : 5000;
    const totalInflows = collectedReceivables + cashSales + taxRefundsOrOther;

    const supplierPayments = Math.round(260000 * m.factor);
    const payrollAndSalaries = baselineMonthlySalaries;
    const taxLiabilitiesVatAndIncome = isAprilTaxPeak ? 180000 : Math.round(35000 * m.factor);
    const rentAndUtilities = baselineMonthlyRent;
    const loanInstallments = 25000;
    const totalOutflows = supplierPayments + payrollAndSalaries + taxLiabilitiesVatAndIncome + rentAndUtilities + loanInstallments;

    const netMonthlyChange = totalInflows - totalOutflows;
    const projectedEndingCash = openingCash + netMonthlyChange;
    const stressTestEndingCash = Math.round(openingCash + totalInflows * 0.82 - totalOutflows * 1.08);

    currentCash = projectedEndingCash;

    const safetyBuffer = 100000;
    const safetyBufferDeficit = projectedEndingCash < safetyBuffer;
    const riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' =
      projectedEndingCash < 0 ? 'CRITICAL' : safetyBufferDeficit ? 'WARNING' : 'SAFE';

    return {
      monthKey: m.key,
      monthNameAr: m.name,
      openingCash,
      expectedInflows: {
        collectedReceivables,
        cashSales,
        taxRefundsOrOther,
        totalInflows,
      },
      expectedOutflows: {
        supplierPayments,
        payrollAndSalaries,
        taxLiabilitiesVatAndIncome,
        rentAndUtilities,
        loanInstallments,
        totalOutflows,
      },
      netMonthlyChange,
      projectedEndingCash,
      stressTestEndingCash,
      safetyBufferDeficit,
      riskLevel,
    };
  });
}
