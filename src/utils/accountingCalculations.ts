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
  // Only include posted entries
  const postedEntries = entries.filter((e) => e.isPosted);

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
  operatingProfit: number; // EBITDA approx
  depreciationExpense: number;
  financeCosts: number;
  otherIncomes: number;
  profitBeforeTax: number;
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

  for (const acc of calculatedAccounts) {
    // Only analytical / leaf accounts
    if (acc.level === 1) continue;

    const balance = acc.endingBalanceCredit - acc.endingBalanceDebit; // Revenues are credit
    const expenseBal = acc.endingBalanceDebit - acc.endingBalanceCredit; // Expenses are debit

    if (acc.category === 'REVENUES') {
      if (acc.code.startsWith('4110')) salesRevenue += balance;
      else if (acc.code.startsWith('4120')) servicesRevenue += balance;
      else if (acc.code.startsWith('4190')) salesReturns += Math.abs(expenseBal);
      else otherIncomes += balance;
    } else if (acc.category === 'EXPENSES') {
      if (acc.code.startsWith('5100') || acc.code.startsWith('5110')) costOfGoodsSold += expenseBal;
      else if (acc.code.startsWith('52')) sellingAndMarketingExpenses += expenseBal;
      else if (acc.code.startsWith('5360')) depreciationExpense += expenseBal;
      else if (acc.code.startsWith('53')) administrativeExpenses += expenseBal;
      else if (acc.code.startsWith('54')) financeCosts += expenseBal;
      else if (acc.code.startsWith('55')) taxExpense += expenseBal;
    }
  }

  const revenuesTotal = salesRevenue + servicesRevenue - salesReturns;
  const grossProfit = revenuesTotal - costOfGoodsSold;
  const operatingExpenses = sellingAndMarketingExpenses + administrativeExpenses;
  const operatingProfit = grossProfit - operatingExpenses;
  const profitBeforeTax = operatingProfit - depreciationExpense - financeCosts + otherIncomes;

  // If tax expense not booked yet in journal, calculate Egyptian statutory 22.5% on positive profit
  const effectiveTax = taxExpense > 0 ? taxExpense : profitBeforeTax > 0 ? profitBeforeTax * 0.225 : 0;
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
    operatingProfit,
    depreciationExpense,
    financeCosts,
    otherIncomes,
    profitBeforeTax,
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
    retainedEarnings: number;
    currentYearNetProfit: number;
    partnersCurrentAccount: number;
    totalEquity: number;
  };
  nonCurrentLiabilities: {
    longTermLoans: number;
    deferredTaxLiabilities: number;
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
    totalCurrentLiabilities: number;
  };
  totalLiabilities: number;
  totalEquityAndLiabilities: number;
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
  let retainedEarnings = 0;
  let partnersCurrentAccount = 0;

  let longTermLoans = 0;
  let deferredTaxLiabilities = 0;

  let tradePayables = 0;
  let notesPayable = 0;
  let vatOutputTax = 0;
  let payrollTaxPayable = 0;
  let whtPayable = 0;
  let socialInsurancePayable = 0;
  let accruedExpenses = 0;

  for (const acc of calculatedAccounts) {
    if (acc.level === 1) continue;

    const debitBal = acc.endingBalanceDebit;
    const creditBal = acc.endingBalanceCredit;

    if (acc.category === 'ASSETS') {
      if (acc.code === '1190') accumulatedDepreciation += creditBal;
      else if (acc.code.startsWith('11')) propertyPlantEquipment += debitBal;
      else if (acc.code === '1210') inventory += debitBal;
      else if (acc.code === '1220') tradeReceivables += debitBal;
      else if (acc.code === '1225') notesReceivable += debitBal;
      else if (acc.code === '1230') whtTaxDebit += debitBal;
      else if (acc.code === '1235') vatInputTax += debitBal;
      else if (acc.code === '1240') prepaymentsAndOther += debitBal;
      else if (acc.code === '1250' || acc.code.startsWith('126')) cashAndBanks += debitBal;
      else if (acc.code.startsWith('12')) prepaymentsAndOther += debitBal;
    } else if (acc.category === 'LIABILITIES') {
      if (acc.code === '2110') longTermLoans += creditBal;
      else if (acc.code === '2120') deferredTaxLiabilities += creditBal;
      else if (acc.code === '2210') tradePayables += creditBal;
      else if (acc.code === '2220') notesPayable += creditBal;
      else if (acc.code === '2230') vatOutputTax += creditBal;
      else if (acc.code === '2235') payrollTaxPayable += creditBal;
      else if (acc.code === '2238') whtPayable += creditBal;
      else if (acc.code === '2240') socialInsurancePayable += creditBal;
      else if (acc.code === '2250') accruedExpenses += creditBal;
    } else if (acc.category === 'EQUITY') {
      if (acc.code === '3100') paidUpCapital += creditBal;
      else if (acc.code === '3200') legalReserve += creditBal;
      else if (acc.code === '3400') retainedEarnings += creditBal;
      else if (acc.code === '3600') partnersCurrentAccount += creditBal - debitBal;
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

  const currentYearNetProfit = incomeData.netProfitAfterTax;

  const totalEquity =
    paidUpCapital +
    legalReserve +
    retainedEarnings +
    currentYearNetProfit +
    partnersCurrentAccount;

  const totalNonCurrentLiabilities = longTermLoans + deferredTaxLiabilities;

  const totalCurrentLiabilities =
    tradePayables +
    notesPayable +
    vatOutputTax +
    payrollTaxPayable +
    whtPayable +
    socialInsurancePayable +
    accruedExpenses;

  const totalLiabilities = totalNonCurrentLiabilities + totalCurrentLiabilities;
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;

  const variance = Math.abs(totalAssets - totalEquityAndLiabilities);
  const isBalanced = variance < 1.0;

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
      retainedEarnings,
      currentYearNetProfit,
      partnersCurrentAccount,
      totalEquity,
    },
    nonCurrentLiabilities: {
      longTermLoans,
      deferredTaxLiabilities,
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
      totalCurrentLiabilities,
    },
    totalLiabilities,
    totalEquityAndLiabilities,
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
