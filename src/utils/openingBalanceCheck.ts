import { round2 } from './accountingCalculations';

export interface OpeningBalanceRow {
  mappedCode?: string;
  mappedName?: string;
  originalCode?: string;
  originalName?: string;
  debit?: number;
  credit?: number;
  openingDebit?: number;
  openingCredit?: number;
  netBalance?: number;
  category?: string;
}

export interface OpeningBalanceDiscrepancy {
  mappedCode: string;
  mappedName: string;
  priorEndingBalance: number;
  currentOpeningBalance: number;
  difference: number;
  note?: string;
}

export interface RetainedEarningsRollforward {
  priorEndingRE: number;
  currentOpeningRE: number;
  priorNetProfit: number;
  expectedOpeningRE: number;
  difference: number;
  isMatch: boolean;
}

export interface OpeningBalanceCheckResult {
  hasPriorData: boolean;
  hasOpeningColumns: boolean;
  isMatched: boolean;
  totalDifference: number;
  discrepancies: OpeningBalanceDiscrepancy[];
  retainedEarningsRollforward: RetainedEarningsRollforward | null;
}

export function isRevenueOrExpenseAccount(code: string, category?: string): boolean {
  const cleanCode = String(code || '').trim();
  const cleanCat = String(category || '').toUpperCase();

  if (cleanCat.includes('REVENUE') || cleanCat.includes('EXPENSE')) {
    return true;
  }
  if (cleanCode.startsWith('4') || cleanCode.startsWith('5')) {
    return true;
  }
  return false;
}

export function isRetainedEarningsAccount(code: string, category?: string): boolean {
  const cleanCode = String(code || '').trim();
  if (
    cleanCode === '3400' ||
    cleanCode === '3500' ||
    cleanCode === '3130' ||
    cleanCode === '3300' ||
    cleanCode.startsWith('34') ||
    cleanCode.startsWith('35') ||
    cleanCode.startsWith('313')
  ) {
    return true;
  }
  return false;
}

export function checkOpeningBalances(
  priorClosingRows: OpeningBalanceRow[] | null | undefined,
  currentOpeningRows: OpeningBalanceRow[] | null | undefined,
  hasOpeningColumns: boolean = true
): OpeningBalanceCheckResult {
  if (!priorClosingRows || priorClosingRows.length === 0) {
    return {
      hasPriorData: false,
      hasOpeningColumns,
      isMatched: false,
      totalDifference: 0,
      discrepancies: [],
      retainedEarningsRollforward: null,
    };
  }

  if (!hasOpeningColumns || !currentOpeningRows || currentOpeningRows.length === 0) {
    return {
      hasPriorData: true,
      hasOpeningColumns: false,
      isMatched: false,
      totalDifference: 0,
      discrepancies: [],
      retainedEarningsRollforward: null,
    };
  }

  // Group prior ending balances by mappedCode
  const priorMap = new Map<string, { name: string; balance: number; category?: string }>();
  let priorRevenuesCreditSum = 0;
  let priorExpensesDebitSum = 0;

  for (const r of priorClosingRows) {
    const code = String(r.mappedCode || '').trim();
    if (!code || code === 'UNMAPPED') continue;

    let rowNet = 0;
    if (r.debit !== undefined || r.credit !== undefined) {
      rowNet = (Number(r.debit) || 0) - (Number(r.credit) || 0);
    } else if (r.netBalance !== undefined) {
      rowNet = Number(r.netBalance) || 0;
    }

    const name = r.mappedName || r.originalName || code;
    const existing = priorMap.get(code);
    if (existing) {
      existing.balance += rowNet;
    } else {
      priorMap.set(code, { name, balance: rowNet, category: r.category });
    }

    // Track revenues and expenses for prior net profit calculation
    if (isRevenueOrExpenseAccount(code, r.category)) {
      const debitVal = Number(r.debit) || 0;
      const creditVal = Number(r.credit) || 0;
      if (code.startsWith('4') || r.category?.toUpperCase().includes('REVENUE')) {
        priorRevenuesCreditSum += creditVal - debitVal;
      } else {
        priorExpensesDebitSum += debitVal - creditVal;
      }
    }
  }

  const priorNetProfit = round2(priorRevenuesCreditSum - priorExpensesDebitSum);

  // Group current opening balances by mappedCode
  const currentOpeningMap = new Map<string, { name: string; balance: number; category?: string }>();

  for (const r of currentOpeningRows) {
    const code = String(r.mappedCode || '').trim();
    if (!code || code === 'UNMAPPED') continue;

    let opNet = 0;
    if (r.openingDebit !== undefined || r.openingCredit !== undefined) {
      opNet = (Number(r.openingDebit) || 0) - (Number(r.openingCredit) || 0);
    } else if (r.netBalance !== undefined) {
      opNet = Number(r.netBalance) || 0;
    }

    const name = r.mappedName || r.originalName || code;
    const existing = currentOpeningMap.get(code);
    if (existing) {
      existing.balance += opNet;
    } else {
      currentOpeningMap.set(code, { name, balance: opNet, category: r.category });
    }
  }

  // Retained Earnings Rollforward check
  let priorEndingRE = 0;
  let currentOpeningRE = 0;
  let hasREAccount = false;

  priorMap.forEach((val, code) => {
    if (isRetainedEarningsAccount(code, val.category)) {
      priorEndingRE += val.balance;
      hasREAccount = true;
    }
  });

  currentOpeningMap.forEach((val, code) => {
    if (isRetainedEarningsAccount(code, val.category)) {
      currentOpeningRE += val.balance;
      hasREAccount = true;
    }
  });

  priorEndingRE = round2(priorEndingRE);
  currentOpeningRE = round2(currentOpeningRE);

  const expectedOpeningRE = round2(priorEndingRE - priorNetProfit);
  const reDiff = round2(currentOpeningRE - expectedOpeningRE);
  const isREMatch = Math.abs(reDiff) < 0.01;

  let retainedEarningsRollforward: RetainedEarningsRollforward | null = null;
  if (hasREAccount || priorNetProfit !== 0) {
    retainedEarningsRollforward = {
      priorEndingRE,
      currentOpeningRE,
      priorNetProfit,
      expectedOpeningRE,
      difference: reDiff,
      isMatch: isREMatch,
    };
  }

  const allCodes = new Set<string>([
    ...Array.from(priorMap.keys()),
    ...Array.from(currentOpeningMap.keys()),
  ]);

  const discrepancies: OpeningBalanceDiscrepancy[] = [];

  allCodes.forEach((code) => {
    const priorObj = priorMap.get(code);
    const currObj = currentOpeningMap.get(code);
    const category = priorObj?.category || currObj?.category;

    if (isRevenueOrExpenseAccount(code, category)) {
      return;
    }

    if (isRetainedEarningsAccount(code, category)) {
      return;
    }

    const priorEnd = priorObj ? round2(priorObj.balance) : 0;
    const currOp = currObj ? round2(currObj.balance) : 0;
    const diff = round2(currOp - priorEnd);

    if (Math.abs(diff) >= 0.01) {
      discrepancies.push({
        mappedCode: code,
        mappedName: (currObj?.name || priorObj?.name) || code,
        priorEndingBalance: priorEnd,
        currentOpeningBalance: currOp,
        difference: diff,
        note: !priorObj
          ? 'حساب جديد لا يملك رصيداً إغلاقياً سابقاً'
          : !currObj
          ? 'حساب سابق لم يظهر له رصيد افتتاحي حالي'
          : 'عدم تطابق بين رصيد آخر المدة وأول المدة',
      });
    }
  });

  if (retainedEarningsRollforward && !retainedEarningsRollforward.isMatch) {
    discrepancies.push({
      mappedCode: '3400/3500',
      mappedName: 'تسوية الأرباح المرحلة والنتائج',
      priorEndingBalance: retainedEarningsRollforward.expectedOpeningRE,
      currentOpeningBalance: retainedEarningsRollforward.currentOpeningRE,
      difference: retainedEarningsRollforward.difference,
      note: `فرق أرباح مرحلة: المتوقع بعد أثر أرباح السنة السابقة هو ${retainedEarningsRollforward.expectedOpeningRE.toLocaleString('ar-EG')} ج.م بينما الفعلي ${retainedEarningsRollforward.currentOpeningRE.toLocaleString('ar-EG')} ج.م`,
    });
  }

  const totalDifference = round2(
    discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0)
  );

  const isMatched = discrepancies.length === 0;

  return {
    hasPriorData: true,
    hasOpeningColumns: true,
    isMatched,
    totalDifference,
    discrepancies,
    retainedEarningsRollforward,
  };
}
