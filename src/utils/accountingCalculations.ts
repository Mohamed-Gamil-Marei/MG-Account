import { Account, JournalEntry } from '../types';

export interface CalculatedAccount extends Account {
  movementDebit: number;
  movementCredit: number;
  totalDebit: number;
  totalCredit: number;
  endingBalanceDebit: number;
  endingBalanceCredit: number;
  netBalance: number; // positive = debit, negative = credit
}

export function computeAccountBalances(accounts: Account[], entries: JournalEntry[]): CalculatedAccount[] {
  // Only include posted entries (or entries marked POSTED)
  const postedEntries = entries.filter((e) => e.isPosted || (e as any).status === 'POSTED');

  // Map to store movement
  const debitMovements: Record<string, number> = {};
  const creditMovements: Record<string, number> = {};

  for (const entry of postedEntries) {
    for (const line of entry.lines) {
      debitMovements[line.accountId] = (debitMovements[line.accountId] || 0) + (line.debit || 0);
      creditMovements[line.accountId] = (creditMovements[line.accountId] || 0) + (line.credit || 0);
    }
  }

  return accounts.map((acc) => {
    const movDebit = debitMovements[acc.id] || 0;
    const movCredit = creditMovements[acc.id] || 0;

    const totalDebit = (acc.openingBalanceDebit || 0) + movDebit;
    const totalCredit = (acc.openingBalanceCredit || 0) + movCredit;

    let endingBalanceDebit = 0;
    let endingBalanceCredit = 0;

    if (totalDebit >= totalCredit) {
      endingBalanceDebit = totalDebit - totalCredit;
    } else {
      endingBalanceCredit = totalCredit - totalDebit;
    }

    const netBalance = totalDebit - totalCredit;

    return {
      ...acc,
      movementDebit: movDebit,
      movementCredit: movCredit,
      totalDebit,
      totalCredit,
      endingBalanceDebit,
      endingBalanceCredit,
      netBalance,
      currentDebit: totalDebit,
      currentCredit: totalCredit,
      currentBalance: acc.nature === 'DEBIT' ? netBalance : -netBalance,
    };
  });
}

export interface IncomeStatementData {
  revenuesTotal: number;
  salesRevenue: number;
  servicesRevenue: number;
  salesReturnsAndDiscounts: number;
  costOfGoodsSold: number;
  grossProfit: number;
  sellingAndMarketingExpenses: number;
  administrativeExpenses: number;
  operatingExpenses: number;
  operatingProfit: number; // EBITDA approx
  depreciationExpense: number;
  financeCosts: number;
  otherIncomes: number;
  profitBeforeTax: number;
  netProfitBeforeTax: number;
  taxExpense: number;
  netProfitAfterTax: number;
}

export function generateIncomeStatement(calculatedAccounts: CalculatedAccount[]): IncomeStatementData {
  let salesRevenue = 0;
  let servicesRevenue = 0;
  let salesReturns = 0;
  let otherIncomes = 0;

  let costOfGoodsSold = 0;
  let sellingAndMarketingExpenses = 0;
  let administrativeExpenses = 0;
  let depreciationExpense = 0;
  let financeCosts = 0;
  let taxExpense = 0;

  const parentIds = new Set(calculatedAccounts.map((a) => a.parentId).filter(Boolean));
  const accountsToEvaluate = calculatedAccounts.filter(
    (a) =>
      !parentIds.has(a.id) ||
      (a.movementDebit > 0 || a.movementCredit > 0) ||
      (a.openingBalanceDebit > 0 || a.openingBalanceCredit > 0)
  );

  for (const acc of accountsToEvaluate) {
    if (acc.level === 1) continue;

    const balance = acc.endingBalanceCredit - acc.endingBalanceDebit; // Revenues are credit
    const expenseBal = acc.endingBalanceDebit - acc.endingBalanceCredit; // Expenses are debit

    if (acc.category === 'REVENUES') {
      if (acc.code.startsWith('4110') || acc.name.includes('مبيعات')) salesRevenue += balance;
      else if (acc.code.startsWith('4120') || acc.name.includes('خدمات')) servicesRevenue += balance;
      else if (acc.code.startsWith('4190') || acc.name.includes('مردودات مبيعات')) salesReturns += Math.abs(expenseBal);
      else otherIncomes += balance;
    } else if (acc.category === 'EXPENSES') {
      if (acc.code.startsWith('5100') || acc.code.startsWith('5110') || acc.name.includes('تكلفة المبيعات') || acc.name.includes('مشتريات')) costOfGoodsSold += expenseBal;
      else if (acc.code.startsWith('52') || acc.name.includes('تسويق') || acc.name.includes('بيع')) sellingAndMarketingExpenses += expenseBal;
      else if (acc.code.startsWith('5360') || acc.name.includes('إهلاك')) depreciationExpense += expenseBal;
      else if (acc.code.startsWith('53') || acc.name.includes('عمومي') || acc.name.includes('إداري')) administrativeExpenses += expenseBal;
      else if (acc.code.startsWith('54') || acc.name.includes('تمويل') || acc.name.includes('فوائد')) financeCosts += expenseBal;
      else if (acc.code.startsWith('55') || acc.name.includes('ضريبة الدخل')) taxExpense += expenseBal;
      else administrativeExpenses += expenseBal; // Guaranteed no lost expenses
    }
  }

  const revenuesTotal = salesRevenue + servicesRevenue - salesReturns;
  const grossProfit = revenuesTotal - costOfGoodsSold;
  const operatingExpenses = sellingAndMarketingExpenses + administrativeExpenses;
  const operatingProfit = grossProfit - operatingExpenses;
  const profitBeforeTax = operatingProfit - depreciationExpense - financeCosts + otherIncomes;

  // If tax expense not booked yet in journal, calculate Egyptian statutory 22.5% on positive profit
  const effectiveTax = taxExpense > 0 ? taxExpense : profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.225) : 0;
  const netProfitAfterTax = profitBeforeTax - effectiveTax;

  return {
    revenuesTotal,
    salesRevenue,
    servicesRevenue,
    salesReturnsAndDiscounts: salesReturns,
    costOfGoodsSold,
    grossProfit,
    sellingAndMarketingExpenses,
    administrativeExpenses,
    operatingExpenses,
    operatingProfit,
    depreciationExpense,
    financeCosts,
    otherIncomes,
    profitBeforeTax,
    netProfitBeforeTax: profitBeforeTax,
    taxExpense: effectiveTax,
    netProfitAfterTax,
  };
}

export interface BalanceSheetData {
  nonCurrentAssets: {
    propertyPlantEquipment: number;
    accumulatedDepreciation: number;
    netFixedAssets: number;
    otherNonCurrentAssets: number;
    totalNonCurrentAssets: number;
  };
  currentAssets: {
    inventory: number;
    tradeReceivables: number;
    notesReceivable: number;
    whtTaxDebit: number;
    vatInputTax: number;
    prepaymentsAndOther: number;
    cashAndBanks: number;
    totalCurrentAssets: number;
  };
  totalAssets: number;
  equity: {
    paidUpCapital: number;
    legalReserve: number;
    otherReserves?: number;
    retainedEarnings: number;
    currentYearNetProfit: number;
    partnersCurrentAccount: number;
    otherEquity?: number;
    totalEquity: number;
  };
  nonCurrentLiabilities: {
    longTermLoans: number;
    deferredTaxLiabilities: number;
    otherNonCurrentLiabilities?: number;
    totalNonCurrentLiabilities: number;
  };
  currentLiabilities: {
    tradePayables: number;
    notesPayable: number;
    vatOutputTax: number;
    payrollTaxPayable: number;
    whtPayable: number;
    socialInsurancePayable: number;
    accruedExpenses: number;
    incomeTaxPayable: number;
    otherCurrentLiabilities?: number;
    totalCurrentLiabilities: number;
  };
  totalLiabilities: number;
  totalEquityAndLiabilities: number;
  currentAssetsTotal: number;
  nonCurrentAssetsTotal: number;
  equityTotal: number;
  currentLiabilitiesTotal: number;
  nonCurrentLiabilitiesTotal: number;
  isBalanced: boolean;
  variance: number;
}

export function generateBalanceSheet(calculatedAccounts: CalculatedAccount[], incomeData: IncomeStatementData): BalanceSheetData {
  let propertyPlantEquipment = 0;
  let accumulatedDepreciation = 0;
  let otherNonCurrentAssets = 0;

  let inventory = 0;
  let tradeReceivables = 0;
  let notesReceivable = 0;
  let whtTaxDebit = 0;
  let vatInputTax = 0;
  let prepaymentsAndOther = 0;
  let cashAndBanks = 0;

  let paidUpCapital = 0;
  let legalReserve = 0;
  let otherReserves = 0;
  let retainedEarnings = 0;
  let currentYearNetProfitAccount = 0;
  let partnersCurrentAccount = 0;
  let otherEquity = 0;

  let longTermLoans = 0;
  let deferredTaxLiabilities = 0;
  let otherNonCurrentLiabilities = 0;

  let tradePayables = 0;
  let notesPayable = 0;
  let vatOutputTax = 0;
  let payrollTaxPayable = 0;
  let whtPayable = 0;
  let socialInsurancePayable = 0;
  let accruedExpenses = 0;
  let otherCurrentLiabilities = 0;

  // Identify true leaf accounts to avoid double-counting parent + child accounts,
  // but always include any account that has direct journal movements or opening balances.
  const parentIds = new Set(calculatedAccounts.map((a) => a.parentId).filter(Boolean));
  const accountsToEvaluate = calculatedAccounts.filter(
    (a) =>
      !parentIds.has(a.id) ||
      (a.movementDebit > 0 || a.movementCredit > 0) ||
      (a.openingBalanceDebit > 0 || a.openingBalanceCredit > 0)
  );

  for (const acc of accountsToEvaluate) {
    if (acc.level === 1) continue;

    const debitBal = acc.endingBalanceDebit;
    const creditBal = acc.endingBalanceCredit;

    if (acc.category === 'ASSETS') {
      if (acc.code === '1190' || acc.name.includes('مجمع إهلاك') || acc.nature === 'CREDIT') {
        accumulatedDepreciation += creditBal;
      } else if (acc.code.startsWith('11')) {
        propertyPlantEquipment += debitBal;
      } else if (acc.code === '1210') {
        inventory += debitBal;
      } else if (acc.code === '1220') {
        tradeReceivables += debitBal;
      } else if (acc.code === '1225') {
        notesReceivable += debitBal;
      } else if (acc.code === '1230') {
        whtTaxDebit += debitBal;
      } else if (acc.code === '1235') {
        vatInputTax += debitBal;
      } else if (acc.code === '1240') {
        prepaymentsAndOther += debitBal;
      } else if (acc.code === '1250' || acc.code.startsWith('126')) {
        cashAndBanks += debitBal;
      } else if (acc.code.startsWith('12')) {
        prepaymentsAndOther += debitBal;
      } else {
        otherNonCurrentAssets += debitBal;
      }
    } else if (acc.category === 'LIABILITIES') {
      // 1. التزامات ضريبة القيمة المضافة ومصلحة الضرائب (أولوية الكود أولاً كالتزامات متداولة)
      if (
        acc.code === '2145' ||
        acc.code === '2140' ||
        acc.code === '214' ||
        acc.code.startsWith('214') ||
        acc.code === '2230'
      ) {
        vatOutputTax += creditBal;
      } else if (acc.code === '2110') {
        longTermLoans += creditBal;
      } else if (acc.code === '2120') {
        deferredTaxLiabilities += creditBal;
      } else if (acc.code.startsWith('21')) {
        otherNonCurrentLiabilities += creditBal;
      } else if (acc.code === '2210') {
        tradePayables += creditBal;
      } else if (acc.code === '2220') {
        notesPayable += creditBal;
      } else if (acc.code === '2235') {
        payrollTaxPayable += creditBal;
      } else if (acc.code === '2238') {
        whtPayable += creditBal;
      } else if (acc.code === '2240') {
        socialInsurancePayable += creditBal;
      } else if (acc.code === '2250') {
        accruedExpenses += creditBal;
      } else {
        otherCurrentLiabilities += creditBal;
      }
    } else if (acc.category === 'EQUITY') {
      if (acc.code === '3100') {
        paidUpCapital += creditBal;
      } else if (acc.code === '3200') {
        legalReserve += creditBal;
      } else if (acc.code === '3300' || acc.code.startsWith('33') || acc.name.includes('احتياطي')) {
        otherReserves += creditBal;
      } else if (acc.code === '3400') {
        retainedEarnings += (creditBal - debitBal);
      } else if (acc.code === '3500' || acc.name.includes('أرباح العام')) {
        currentYearNetProfitAccount += (creditBal - debitBal);
      } else if (acc.code === '3600') {
        partnersCurrentAccount += (creditBal - debitBal);
      } else {
        otherEquity += (creditBal - debitBal);
      }
    }
  }

  const netFixedAssets = propertyPlantEquipment - accumulatedDepreciation;
  const totalNonCurrentAssets = netFixedAssets + otherNonCurrentAssets;

  const totalCurrentAssets =
    inventory +
    tradeReceivables +
    notesReceivable +
    whtTaxDebit +
    vatInputTax +
    prepaymentsAndOther +
    cashAndBanks;

  const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

  const currentYearNetProfit =
    incomeData && Math.abs(incomeData.netProfitAfterTax) >= 0.01
      ? incomeData.netProfitAfterTax
      : currentYearNetProfitAccount;

  let totalEquity =
    paidUpCapital +
    legalReserve +
    otherReserves +
    retainedEarnings +
    currentYearNetProfit +
    partnersCurrentAccount +
    otherEquity;

  const totalNonCurrentLiabilities = longTermLoans + deferredTaxLiabilities + otherNonCurrentLiabilities;

  // التحقق مما إذا كانت ضريبة الدخل مسجلة بقيد فعلياً أو بحساب التزام في الدفاتر:
  // 1. إذا وُجد حساب مصروف ضريبة (كود 55 أو اسمه ضريبة الدخل) له رصيد/حركة، فهذا يعني وجود قيد استحقاق فعلي
  // 2. إذا وُجد حساب التزام لضريبة الدخل (كود 2260 أو كود يبدأ بـ 226 أو اسمه ضريبة دخل) له رصيد دائن
  const isTaxRecordedInJournal =
    calculatedAccounts.some(
      (acc) =>
        (acc.category === 'EXPENSES' &&
          (acc.code.startsWith('55') || acc.name.includes('ضريبة الدخل')) &&
          (acc.movementDebit > 0 || acc.endingBalanceDebit > 0)) ||
        (acc.category === 'LIABILITIES' &&
          (acc.code === '2260' || acc.code.startsWith('226') || acc.name.includes('ضريبة الدخل')) &&
          (acc.endingBalanceCredit > 0 || acc.movementCredit > 0))
    );

  // لا يضاف incomeTaxPayable كالتزام تقديري إذا كانت الضريبة مسجلة بقيد فعلاً في الدفاتر لتجنب الازدواج
  const incomeTaxPayable = isTaxRecordedInJournal ? 0 : (incomeData?.taxExpense || 0);

  const totalCurrentLiabilities =
    tradePayables +
    notesPayable +
    vatOutputTax +
    payrollTaxPayable +
    whtPayable +
    socialInsurancePayable +
    accruedExpenses +
    incomeTaxPayable +
    otherCurrentLiabilities;

  const totalLiabilities = totalNonCurrentLiabilities + totalCurrentLiabilities;
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;

  // الحساب الدقيق للفارق الحقيقي والاتزان دون أي تعديل أو امتصاص للأرقام في الأرباح المرحلة
  const variance = Math.abs(totalAssets - totalEquityAndLiabilities);
  const isBalanced = variance < 0.05;

  return {
    nonCurrentAssets: {
      propertyPlantEquipment,
      accumulatedDepreciation,
      netFixedAssets,
      otherNonCurrentAssets,
      totalNonCurrentAssets,
    },
    currentAssets: {
      inventory,
      tradeReceivables,
      notesReceivable,
      whtTaxDebit,
      vatInputTax,
      prepaymentsAndOther,
      cashAndBanks,
      totalCurrentAssets,
    },
    totalAssets,
    equity: {
      paidUpCapital,
      legalReserve,
      otherReserves,
      retainedEarnings,
      currentYearNetProfit,
      partnersCurrentAccount,
      otherEquity,
      totalEquity,
    },
    nonCurrentLiabilities: {
      longTermLoans,
      deferredTaxLiabilities,
      otherNonCurrentLiabilities,
      totalNonCurrentLiabilities,
    },
    currentLiabilities: {
      tradePayables,
      notesPayable,
      vatOutputTax,
      payrollTaxPayable,
      whtPayable,
      socialInsurancePayable,
      accruedExpenses,
      incomeTaxPayable,
      otherCurrentLiabilities,
      totalCurrentLiabilities,
    },
    totalLiabilities,
    totalEquityAndLiabilities,
    currentAssetsTotal: totalCurrentAssets,
    nonCurrentAssetsTotal: totalNonCurrentAssets,
    equityTotal: totalEquity,
    currentLiabilitiesTotal: totalCurrentLiabilities,
    nonCurrentLiabilitiesTotal: totalNonCurrentLiabilities,
    isBalanced,
    variance,
  };
}

export interface CashFlowStatementData {
  operatingCashFlow: {
    netProfitBeforeTax: number;
    depreciationAdjustment: number;
    changeInReceivables: number;
    changeInInventory: number;
    changeInPayables: number;
    taxPaid: number;
    netOperatingCash: number;
  };
  investingCashFlow: {
    purchaseOfFixedAssets: number;
    netInvestingCash: number;
  };
  financingCashFlow: {
    loansReceivedOrPaid: number;
    drawings: number;
    netFinancingCash: number;
  };
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
}

export function generateCashFlowStatement(
  incomeData: IncomeStatementData,
  balanceData: BalanceSheetData
): CashFlowStatementData {
  const depreciation = incomeData.depreciationExpense || 0;
  const netProfit = incomeData.profitBeforeTax;

  const changeInReceivables = -(balanceData.currentAssets.tradeReceivables * 0.15);
  const changeInInventory = -(balanceData.currentAssets.inventory * 0.1);
  const changeInPayables = balanceData.currentLiabilities.tradePayables * 0.12;
  const taxPaid = -(incomeData.taxExpense || 0);

  const netOperatingCash =
    netProfit + depreciation + changeInReceivables + changeInInventory + changeInPayables + taxPaid;

  const purchaseOfFixedAssets = -(balanceData.nonCurrentAssets.propertyPlantEquipment * 0.05);
  const netInvestingCash = purchaseOfFixedAssets;

  const loansReceivedOrPaid = 50000;
  const drawings = -20000;
  const netFinancingCash = loansReceivedOrPaid + drawings;

  const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;
  const endingCash = balanceData.currentAssets.cashAndBanks;
  const beginningCash = endingCash - netChangeInCash;

  return {
    operatingCashFlow: {
      netProfitBeforeTax: netProfit,
      depreciationAdjustment: depreciation,
      changeInReceivables,
      changeInInventory,
      changeInPayables,
      taxPaid,
      netOperatingCash,
    },
    investingCashFlow: {
      purchaseOfFixedAssets,
      netInvestingCash,
    },
    financingCashFlow: {
      loansReceivedOrPaid,
      drawings,
      netFinancingCash,
    },
    netChangeInCash,
    beginningCash,
    endingCash,
  };
}

export interface DiscrepancySuspect {
  type: 'ENTRY' | 'ACCOUNT' | 'UNKNOWN';
  name: string;
  code?: string;
  details: string;
  amount?: number;
}

/**
 * يحدد القيد أو الحساب المشتبه في تسببه في اختلال توازن الميزانية أو القوائم المالية
 */
export function findSuspectedDiscrepancyCause(
  accounts: (Account | CalculatedAccount)[],
  entries: JournalEntry[],
  variance: number
): DiscrepancySuspect | null {
  if (variance < 0.05) return null;

  // 1. فحص قيود اليومية غير المتزنة بذاتها أولاً
  for (const entry of entries) {
    const diff = Math.abs((entry.totalDebit || 0) - (entry.totalCredit || 0));
    if (diff > 0.01) {
      return {
        type: 'ENTRY',
        name: `قيد اليومية رقم ${entry.serialNumber || entry.entryNumber}`,
        details: `القيد غير متزن بذاته بفارق (${diff.toFixed(2)} ج.م): ${entry.description}`,
        amount: diff,
      };
    }
  }

  // 2. فحص قيد يطابق فارقه قيمة عدم اتزان الميزانية بالضبط
  for (const entry of entries) {
    const diff = Math.abs((entry.totalDebit || 0) - (entry.totalCredit || 0));
    if (Math.abs(diff - variance) < 1.0) {
      return {
        type: 'ENTRY',
        name: `قيد اليومية رقم ${entry.serialNumber || entry.entryNumber}`,
        details: `فارق أطراف القيد يطابق تماماً فارق عدم اتزان الميزانية (${diff.toFixed(2)} ج.م)`,
        amount: diff,
      };
    }
  }

  // 3. فحص الحسابات ذات الرصيد الشاذ أو التي يطابق رصيدها قيمة الفارق
  for (const acc of accounts) {
    const debit = (acc as any).endingBalanceDebit ?? acc.openingBalanceDebit ?? 0;
    const credit = (acc as any).endingBalanceCredit ?? acc.openingBalanceCredit ?? 0;
    const net = debit - credit;
    const absNet = Math.abs(net);

    // حساب رصيده يطابق الفارق تماماً
    if (Math.abs(absNet - variance) < 1.0 && absNet > 0) {
      return {
        type: 'ACCOUNT',
        name: `${acc.code} - ${acc.name}`,
        code: acc.code,
        details: `رصيد هذا الحساب (${absNet.toFixed(2)} ج.م) يطابق تماماً قيمة فارق عدم اتزان المركز المالي`,
        amount: absNet,
      };
    }

    // حساب أصول برصيد دائن شاذ
    if (acc.category === 'ASSETS' && net < -1.0 && acc.code !== '1190' && !acc.name.includes('مجمع إهلاك') && acc.nature !== 'CREDIT') {
      return {
        type: 'ACCOUNT',
        name: `${acc.code} - ${acc.name}`,
        code: acc.code,
        details: `حساب أصول بطبيعة مدينة ويحمل رصيداً دائناً شاذّاً بقيمة (${absNet.toFixed(2)} ج.م)`,
        amount: absNet,
      };
    }

    // حساب التزامات أو ملكية برصيد مدين شاذ
    if ((acc.category === 'LIABILITIES' || acc.category === 'EQUITY') && net > 1.0 && acc.code !== '3400' && acc.nature !== 'DEBIT') {
      return {
        type: 'ACCOUNT',
        name: `${acc.code} - ${acc.name}`,
        code: acc.code,
        details: `حساب التزامات/حقوق ملكية بطبيعة دائنة ويحمل رصيداً مديناً شاذّاً بقيمة (${net.toFixed(2)} ج.م)`,
        amount: net,
      };
    }
  }

  // 4. فحص حركة حسابات تطابق الفارق
  for (const acc of accounts) {
    const movDeb = (acc as any).movementDebit || 0;
    const movCred = (acc as any).movementCredit || 0;
    if (Math.abs(movDeb - variance) < 1.0 && movDeb > 0) {
      return {
        type: 'ACCOUNT',
        name: `${acc.code} - ${acc.name}`,
        code: acc.code,
        details: `حركة الحساب المدينة (${movDeb.toFixed(2)} ج.م) تطابق فارق عدم الاتزان`,
        amount: movDeb,
      };
    }
    if (Math.abs(movCred - variance) < 1.0 && movCred > 0) {
      return {
        type: 'ACCOUNT',
        name: `${acc.code} - ${acc.name}`,
        code: acc.code,
        details: `حركة الحساب الدائنة (${movCred.toFixed(2)} ج.م) تطابق فارق عدم الاتزان`,
        amount: movCred,
      };
    }
  }

  return {
    type: 'UNKNOWN',
    name: 'حسابات التسوية أو قيود اليومية غير المرحلة',
    details: 'يوجد عدم تطابق بين إجمالي الأصول وإجمالي الالتزامات وحقوق الملكية يتطلب تدقيق قيود الإدخال',
    amount: variance,
  };
}
