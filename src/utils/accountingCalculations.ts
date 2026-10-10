import { Account, JournalEntry } from '../types';

/**
 * دالة تقريب موحدة لمنع الأخطاء العائمة والتراكمية (Floating-point precision)
 */
export function round2(num: number): number {
  if (num === 0 || !num || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

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
      debitMovements[line.accountId] = round2((debitMovements[line.accountId] || 0) + (line.debit || 0));
      creditMovements[line.accountId] = round2((creditMovements[line.accountId] || 0) + (line.credit || 0));
    }
  }

  return accounts.map((acc) => {
    const movDebit = round2(debitMovements[acc.id] || 0);
    const movCredit = round2(creditMovements[acc.id] || 0);

    const totalDebit = round2((acc.openingBalanceDebit || 0) + movDebit);
    const totalCredit = round2((acc.openingBalanceCredit || 0) + movCredit);

    let endingBalanceDebit = 0;
    let endingBalanceCredit = 0;

    if (totalDebit >= totalCredit) {
      endingBalanceDebit = round2(totalDebit - totalCredit);
    } else {
      endingBalanceCredit = round2(totalCredit - totalDebit);
    }

    const netBalance = round2(totalDebit - totalCredit);

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
      currentBalance: round2(acc.nature === 'DEBIT' ? netBalance : -netBalance),
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
  hasTaxRecorded: boolean;
}

export function generateIncomeStatement(
  calculatedAccounts: CalculatedAccount[],
  estimateTaxIfMissing: boolean = true
): IncomeStatementData {
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
  let hasTaxRecorded = false;

  const parentIds = new Set(calculatedAccounts.map((a) => a.parentId).filter(Boolean));
  const accountsToEvaluate = calculatedAccounts.filter(
    (a) =>
      !parentIds.has(a.id) ||
      (a.movementDebit > 0 || a.movementCredit > 0) ||
      (a.openingBalanceDebit > 0 || a.openingBalanceCredit > 0)
  );

  for (const acc of accountsToEvaluate) {
    if (acc.level === 1) continue;

    const balance = round2(acc.endingBalanceCredit - acc.endingBalanceDebit); // Revenues are credit
    const expenseBal = round2(acc.endingBalanceDebit - acc.endingBalanceCredit); // Expenses are debit

    if (acc.category === 'REVENUES') {
      if (acc.code.startsWith('4110') || acc.name.includes('مبيعات')) salesRevenue += balance;
      else if (acc.code.startsWith('4120') || acc.name.includes('خدمات')) servicesRevenue += balance;
      else if (acc.code.startsWith('4190') || acc.name.includes('مردودات مبيعات')) salesReturns += Math.abs(expenseBal);
      else otherIncomes += balance;
    } else if (acc.category === 'EXPENSES') {
      if (acc.code.startsWith('5100') || acc.code.startsWith('5110') || acc.name.includes('تكلفة المبيعات') || acc.name.includes('مشتريات')) costOfGoodsSold += expenseBal;
      else if (acc.code.startsWith('5360') || acc.name.includes('إهلاك')) depreciationExpense += expenseBal;
      else if (acc.code.startsWith('52') || acc.name.includes('تسويق') || acc.name.includes('بيع')) sellingAndMarketingExpenses += expenseBal;
      else if (acc.code.startsWith('53') || acc.name.includes('عمومي') || acc.name.includes('إداري')) administrativeExpenses += expenseBal;
      else if (acc.code.startsWith('54') || acc.name.includes('تمويل') || acc.name.includes('فوائد')) financeCosts += expenseBal;
      else if (acc.code.startsWith('55') || acc.name.includes('ضريبة الدخل')) {
        taxExpense += expenseBal;
        hasTaxRecorded = true;
      }
      else administrativeExpenses += expenseBal; // Guaranteed no lost expenses
    }
  }

  salesRevenue = round2(salesRevenue);
  servicesRevenue = round2(servicesRevenue);
  salesReturns = round2(salesReturns);
  otherIncomes = round2(otherIncomes);
  costOfGoodsSold = round2(costOfGoodsSold);
  sellingAndMarketingExpenses = round2(sellingAndMarketingExpenses);
  administrativeExpenses = round2(administrativeExpenses);
  depreciationExpense = round2(depreciationExpense);
  financeCosts = round2(financeCosts);
  taxExpense = round2(taxExpense);

  const revenuesTotal = round2(salesRevenue + servicesRevenue - salesReturns);
  const grossProfit = round2(revenuesTotal - costOfGoodsSold);
  const operatingExpenses = round2(sellingAndMarketingExpenses + administrativeExpenses);
  const operatingProfit = round2(grossProfit - operatingExpenses);
  const profitBeforeTax = round2(operatingProfit - depreciationExpense - financeCosts + otherIncomes);

  // If tax expense not booked yet in journal, calculate Egyptian statutory 22.5% on positive profit
  const effectiveTax = round2(
    taxExpense > 0 
      ? taxExpense 
      : (estimateTaxIfMissing && profitBeforeTax > 0 ? profitBeforeTax * 0.225 : 0)
  );
  const netProfitAfterTax = round2(profitBeforeTax - effectiveTax);

  return {
    revenuesTotal: round2(revenuesTotal),
    salesRevenue: round2(salesRevenue),
    servicesRevenue: round2(servicesRevenue),
    salesReturnsAndDiscounts: round2(salesReturns),
    costOfGoodsSold: round2(costOfGoodsSold),
    grossProfit: round2(grossProfit),
    sellingAndMarketingExpenses: round2(sellingAndMarketingExpenses),
    administrativeExpenses: round2(administrativeExpenses),
    operatingExpenses: round2(operatingExpenses),
    operatingProfit: round2(operatingProfit),
    depreciationExpense: round2(depreciationExpense),
    financeCosts: round2(financeCosts),
    otherIncomes: round2(otherIncomes),
    profitBeforeTax: round2(profitBeforeTax),
    netProfitBeforeTax: round2(profitBeforeTax),
    taxExpense: round2(effectiveTax),
    netProfitAfterTax: round2(netProfitAfterTax),
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

  const netFixedAssets = round2(propertyPlantEquipment - accumulatedDepreciation);
  const totalNonCurrentAssets = round2(netFixedAssets + otherNonCurrentAssets);

  const totalCurrentAssets = round2(
    inventory +
    tradeReceivables +
    notesReceivable +
    whtTaxDebit +
    vatInputTax +
    prepaymentsAndOther +
    cashAndBanks
  );

  const totalAssets = round2(totalNonCurrentAssets + totalCurrentAssets);

  const currentYearNetProfit = round2(
    incomeData && Math.abs(incomeData.netProfitAfterTax) >= 0.01
      ? incomeData.netProfitAfterTax
      : currentYearNetProfitAccount
  );

  let totalEquity = round2(
    paidUpCapital +
    legalReserve +
    otherReserves +
    retainedEarnings +
    currentYearNetProfit +
    partnersCurrentAccount +
    otherEquity
  );

  const totalNonCurrentLiabilities = round2(longTermLoans + deferredTaxLiabilities + otherNonCurrentLiabilities);

  // التحقق مما إذا كانت ضريبة الدخل مسجلة بقيد فعلياً أو بحساب التزام في الدفاتر:
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

  const incomeTaxPayable = round2(isTaxRecordedInJournal ? 0 : (incomeData?.taxExpense || 0));

  const totalCurrentLiabilities = round2(
    tradePayables +
    notesPayable +
    vatOutputTax +
    payrollTaxPayable +
    whtPayable +
    socialInsurancePayable +
    accruedExpenses +
    incomeTaxPayable +
    otherCurrentLiabilities
  );

  const totalLiabilities = round2(totalNonCurrentLiabilities + totalCurrentLiabilities);
  const totalEquityAndLiabilities = round2(totalEquity + totalLiabilities);

  // الحساب الدقيق للفارق الحقيقي والاتزان دون أي تعديل أو امتصاص للأرقام في الأرباح المرحلة
  const variance = round2(Math.abs(totalAssets - totalEquityAndLiabilities));
  const isBalanced = variance < 0.05;

  return {
    nonCurrentAssets: {
      propertyPlantEquipment: round2(propertyPlantEquipment),
      accumulatedDepreciation: round2(accumulatedDepreciation),
      netFixedAssets: round2(netFixedAssets),
      otherNonCurrentAssets: round2(otherNonCurrentAssets),
      totalNonCurrentAssets: round2(totalNonCurrentAssets),
    },
    currentAssets: {
      inventory: round2(inventory),
      tradeReceivables: round2(tradeReceivables),
      notesReceivable: round2(notesReceivable),
      whtTaxDebit: round2(whtTaxDebit),
      vatInputTax: round2(vatInputTax),
      prepaymentsAndOther: round2(prepaymentsAndOther),
      cashAndBanks: round2(cashAndBanks),
      totalCurrentAssets: round2(totalCurrentAssets),
    },
    totalAssets: round2(totalAssets),
    equity: {
      paidUpCapital: round2(paidUpCapital),
      legalReserve: round2(legalReserve),
      otherReserves: round2(otherReserves),
      retainedEarnings: round2(retainedEarnings),
      currentYearNetProfit: round2(currentYearNetProfit),
      partnersCurrentAccount: round2(partnersCurrentAccount),
      otherEquity: round2(otherEquity),
      totalEquity: round2(totalEquity),
    },
    nonCurrentLiabilities: {
      longTermLoans: round2(longTermLoans),
      deferredTaxLiabilities: round2(deferredTaxLiabilities),
      otherNonCurrentLiabilities: round2(otherNonCurrentLiabilities),
      totalNonCurrentLiabilities: round2(totalNonCurrentLiabilities),
    },
    currentLiabilities: {
      tradePayables: round2(tradePayables),
      notesPayable: round2(notesPayable),
      vatOutputTax: round2(vatOutputTax),
      payrollTaxPayable: round2(payrollTaxPayable),
      whtPayable: round2(whtPayable),
      socialInsurancePayable: round2(socialInsurancePayable),
      accruedExpenses: round2(accruedExpenses),
      incomeTaxPayable: round2(incomeTaxPayable),
      otherCurrentLiabilities: round2(otherCurrentLiabilities),
      totalCurrentLiabilities: round2(totalCurrentLiabilities),
    },
    totalLiabilities: round2(totalLiabilities),
    totalEquityAndLiabilities: round2(totalEquityAndLiabilities),
    currentAssetsTotal: round2(totalCurrentAssets),
    nonCurrentAssetsTotal: round2(totalNonCurrentAssets),
    equityTotal: round2(totalEquity),
    currentLiabilitiesTotal: round2(totalCurrentLiabilities),
    nonCurrentLiabilitiesTotal: round2(totalNonCurrentLiabilities),
    isBalanced,
    variance: round2(variance),
  };
}

export interface CashFlowStatementData {
  hasComparativeData: boolean;
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
  balanceData: BalanceSheetData,
  priorBalanceData?: BalanceSheetData | null
): CashFlowStatementData {
  const depreciation = round2(incomeData.depreciationExpense || 0);
  const netProfit = round2(incomeData.profitBeforeTax);

  if (!priorBalanceData) {
    const endingCash = round2(balanceData.currentAssets.cashAndBanks);
    return {
      hasComparativeData: false,
      operatingCashFlow: {
        netProfitBeforeTax: round2(netProfit),
        depreciationAdjustment: round2(depreciation),
        changeInReceivables: 0,
        changeInInventory: 0,
        changeInPayables: 0,
        taxPaid: 0,
        netOperatingCash: round2(netProfit + depreciation),
      },
      investingCashFlow: {
        purchaseOfFixedAssets: 0,
        netInvestingCash: 0,
      },
      financingCashFlow: {
        loansReceivedOrPaid: 0,
        drawings: 0,
        netFinancingCash: 0,
      },
      netChangeInCash: 0,
      beginningCash: endingCash,
      endingCash: endingCash,
    };
  }

  // Indirect method cash flow calculations based on changes in balance sheet accounts:
  const priorReceivables = priorBalanceData.currentAssets.tradeReceivables + priorBalanceData.currentAssets.notesReceivable;
  const currReceivables = balanceData.currentAssets.tradeReceivables + balanceData.currentAssets.notesReceivable;
  const changeInReceivables = round2(-(currReceivables - priorReceivables));

  const priorInventory = priorBalanceData.currentAssets.inventory;
  const currInventory = balanceData.currentAssets.inventory;
  const changeInInventory = round2(-(currInventory - priorInventory));

  const priorPayables = priorBalanceData.currentLiabilities.tradePayables + priorBalanceData.currentLiabilities.notesPayable + priorBalanceData.currentLiabilities.accruedExpenses;
  const currPayables = balanceData.currentLiabilities.tradePayables + balanceData.currentLiabilities.notesPayable + balanceData.currentLiabilities.accruedExpenses;
  const changeInPayables = round2(currPayables - priorPayables);

  const taxPaid = round2(-(incomeData.taxExpense || 0));

  const netOperatingCash = round2(
    netProfit + depreciation + changeInReceivables + changeInInventory + changeInPayables + taxPaid
  );

  const priorPPE = priorBalanceData.nonCurrentAssets.propertyPlantEquipment;
  const currPPE = balanceData.nonCurrentAssets.propertyPlantEquipment;
  const purchaseOfFixedAssets = round2(-(currPPE - priorPPE));
  const netInvestingCash = purchaseOfFixedAssets;

  const priorLoans = priorBalanceData.nonCurrentLiabilities.longTermLoans;
  const currLoans = balanceData.nonCurrentLiabilities.longTermLoans;
  const loansReceivedOrPaid = round2(currLoans - priorLoans);

  const priorEquityExcludingProfit = priorBalanceData.equity.paidUpCapital + priorBalanceData.equity.partnersCurrentAccount + priorBalanceData.equity.legalReserve + priorBalanceData.equity.otherReserves + priorBalanceData.equity.otherEquity;
  const currEquityExcludingProfit = balanceData.equity.paidUpCapital + balanceData.equity.partnersCurrentAccount + balanceData.equity.legalReserve + balanceData.equity.otherReserves + balanceData.equity.otherEquity;
  const drawings = round2(currEquityExcludingProfit - priorEquityExcludingProfit);

  const netFinancingCash = round2(loansReceivedOrPaid + drawings);

  const beginningCash = round2(priorBalanceData.currentAssets.cashAndBanks);
  const endingCash = round2(balanceData.currentAssets.cashAndBanks);
  const netChangeInCash = round2(endingCash - beginningCash);

  return {
    hasComparativeData: true,
    operatingCashFlow: {
      netProfitBeforeTax: round2(netProfit),
      depreciationAdjustment: round2(depreciation),
      changeInReceivables: round2(changeInReceivables),
      changeInInventory: round2(changeInInventory),
      changeInPayables: round2(changeInPayables),
      taxPaid: round2(taxPaid),
      netOperatingCash: round2(netOperatingCash),
    },
    investingCashFlow: {
      purchaseOfFixedAssets: round2(purchaseOfFixedAssets),
      netInvestingCash: round2(netInvestingCash),
    },
    financingCashFlow: {
      loansReceivedOrPaid: round2(loansReceivedOrPaid),
      drawings: round2(drawings),
      netFinancingCash: round2(netFinancingCash),
    },
    netChangeInCash: round2(netChangeInCash),
    beginningCash: round2(beginningCash),
    endingCash: round2(endingCash),
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
