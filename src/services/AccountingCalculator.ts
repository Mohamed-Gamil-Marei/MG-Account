import { Account, FinancialStatementLineKey, JournalEntry, ClientStatementMapping } from '../types';

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: Account['category'];
  nature: Account['nature'];
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface OrphanJournalLine {
  entryId: string;
  entryNumber: string | number;
  date: string;
  lineId: string;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  amountEgp: number;
  description?: string;
}

export interface TrialBalanceSummary {
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalMovementDebit: number;
  totalMovementCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
  difference: number;
  unmatchedLines: OrphanJournalLine[];
}

export interface ComputeTrialBalanceOptions {
  clientId?: string;
  fiscalYear?: number;
  fromDate?: string;
  toDate?: string;
  postedOnly?: boolean;
  openingBalances?: Record<string, Record<string | number, Record<string, { debit?: number; credit?: number }>>>;
}

export interface StatementItemDetail {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  lineKey: FinancialStatementLineKey;
}

export interface GeneratedFinancialStatements {
  balanceSheet: {
    currentAssets: { items: StatementItemDetail[]; total: number };
    nonCurrentAssets: { items: StatementItemDetail[]; total: number };
    totalAssets: number;
    currentLiabilities: { items: StatementItemDetail[]; total: number };
    nonCurrentLiabilities: { items: StatementItemDetail[]; total: number };
    totalLiabilities: number;
    equity: { items: StatementItemDetail[]; total: number };
    totalEquity: number;
    netProfitFromIncomeStatement: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
    difference: number;
  };
  incomeStatement: {
    operatingRevenue: { items: StatementItemDetail[]; total: number };
    salesReturns: { items: StatementItemDetail[]; total: number };
    netRevenue: number;
    cogs: { items: StatementItemDetail[]; total: number };
    grossProfit: number;
    sellingExpenses: { items: StatementItemDetail[]; total: number };
    generalAdminExpenses: { items: StatementItemDetail[]; total: number };
    depreciationExpenses: { items: StatementItemDetail[]; total: number };
    totalOperatingExpenses: number;
    operatingProfit: number;
    financingCosts: { items: StatementItemDetail[]; total: number };
    fxGainsLosses: { items: StatementItemDetail[]; total: number };
    otherRevenues: { items: StatementItemDetail[]; total: number };
    otherExpenses: { items: StatementItemDetail[]; total: number };
    netProfitBeforeTax: number;
  };
  unmappedAccounts: TrialBalanceRow[];
}

export class AccountingCalculator {
  /**
   * Computes the Trial Balance for a client and period.
   * Requirement 1:
   * - Balance = Opening balance of the year + movement of posted entries within the period.
   * - Matching by account ID ONLY (not id then code).
   * - Any journal entry line pointing to a missing/unmatched account appears in unmatchedLines.
   * - Column totals for every column and balance difference (فرق التوازن).
   */
  public static computeTrialBalance(
    accounts: Account[],
    journalEntries: JournalEntry[],
    arg3?: number | ComputeTrialBalanceOptions,
    arg4 = true
  ): TrialBalanceSummary {
    const options: ComputeTrialBalanceOptions =
      typeof arg3 === 'number'
        ? { fiscalYear: arg3, postedOnly: arg4 }
        : arg3 || { postedOnly: true };

    const postedOnly = options.postedOnly !== false;
    const clientId = options.clientId;
    const fiscalYear = options.fiscalYear;
    const fromDate = options.fromDate;
    const toDate = options.toDate;

    // Strict account map by account ID ONLY
    const accountsById = new Map<string, Account>();
    for (const acc of accounts || []) {
      accountsById.set(acc.id, acc);
    }

    const movById = new Map<string, { debit: number; credit: number }>();
    for (const acc of accounts || []) {
      movById.set(acc.id, { debit: 0, credit: 0 });
    }

    const unmatchedLines: OrphanJournalLine[] = [];

    for (const je of journalEntries || []) {
      if (postedOnly && !je.isPosted && je.status !== 'POSTED') continue;
      if (clientId && je.clientId && je.clientId !== clientId) continue;
      if (fiscalYear && je.fiscalYear && je.fiscalYear !== fiscalYear) continue;

      const jeDate = je.date ? je.date.slice(0, 10) : '';
      if (fromDate && jeDate && jeDate < fromDate) continue;
      if (toDate && jeDate && jeDate > toDate) continue;

      for (const line of je.lines || []) {
        const lineAccId = line.accountId;
        const lineDr = Number(line.debit) || 0;
        const lineCr = Number(line.credit) || 0;

        if (!lineAccId || !accountsById.has(lineAccId)) {
          // Line references an account not found in the client's accounts!
          unmatchedLines.push({
            entryId: je.id,
            entryNumber: je.entryNumber,
            date: je.date,
            lineId: line.id,
            accountId: line.accountId,
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: lineDr,
            credit: lineCr,
            amountEgp: Number(line.amountEgp || lineDr || lineCr) || 0,
            description: line.description || je.description,
          });
          continue;
        }

        const prev = movById.get(lineAccId) || { debit: 0, credit: 0 };
        prev.debit += lineDr;
        prev.credit += lineCr;
        movById.set(lineAccId, prev);
      }
    }

    const rows: TrialBalanceRow[] = [];
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;
    let totalMovementDebit = 0;
    let totalMovementCredit = 0;
    let totalClosingDebit = 0;
    let totalClosingCredit = 0;

    for (const acc of accounts || []) {
      const isSummaryParent =
        (acc.level !== undefined && acc.level <= 2 && acc.code.length <= 4 && acc.code.endsWith('00')) ||
        accounts.some(
          (child) =>
            child.id !== acc.id &&
            (child.parentId === acc.id || child.parentCode === acc.code)
        );

      let opDebit = Number((Number(acc.openingBalanceDebit) || 0).toFixed(2));
      let opCredit = Number((Number(acc.openingBalanceCredit) || 0).toFixed(2));

      if (options.openingBalances && clientId && fiscalYear) {
        const clientYearMap = options.openingBalances[clientId]?.[fiscalYear];
        const nestedEntry = clientYearMap?.[acc.id] || clientYearMap?.[acc.code];
        if (nestedEntry) {
          opDebit = Number((Number(nestedEntry.debit) || 0).toFixed(2));
          opCredit = Number((Number(nestedEntry.credit) || 0).toFixed(2));
        }
      }

      const mov = movById.get(acc.id) || { debit: 0, credit: 0 };
      const mvDebit = Number(mov.debit.toFixed(2));
      const mvCredit = Number(mov.credit.toFixed(2));

      if (isSummaryParent && opDebit === 0 && opCredit === 0 && mvDebit === 0 && mvCredit === 0) {
        continue;
      }

      // Closing balance = Opening + Movements
      const net = opDebit + mvDebit - (opCredit + mvCredit);
      const clDebit = net > 0.001 ? Number(net.toFixed(2)) : 0;
      const clCredit = net < -0.001 ? Number(Math.abs(net).toFixed(2)) : 0;

      if (
        opDebit === 0 &&
        opCredit === 0 &&
        mvDebit === 0 &&
        mvCredit === 0 &&
        clDebit === 0 &&
        clCredit === 0
      ) {
        continue;
      }

      rows.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        category: acc.category,
        nature: acc.nature,
        openingDebit: opDebit,
        openingCredit: opCredit,
        movementDebit: mvDebit,
        movementCredit: mvCredit,
        closingDebit: clDebit,
        closingCredit: clCredit,
      });

      totalOpeningDebit = Number((totalOpeningDebit + opDebit).toFixed(2));
      totalOpeningCredit = Number((totalOpeningCredit + opCredit).toFixed(2));
      totalMovementDebit = Number((totalMovementDebit + mvDebit).toFixed(2));
      totalMovementCredit = Number((totalMovementCredit + mvCredit).toFixed(2));
      totalClosingDebit = Number((totalClosingDebit + clDebit).toFixed(2));
      totalClosingCredit = Number((totalClosingCredit + clCredit).toFixed(2));
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    const difference = Number(Math.abs(totalClosingDebit - totalClosingCredit).toFixed(2));

    return {
      rows,
      totalOpeningDebit,
      totalOpeningCredit,
      totalMovementDebit,
      totalMovementCredit,
      totalClosingDebit,
      totalClosingCredit,
      isBalanced: difference < 0.01,
      difference,
      unmatchedLines,
    };
  }

  /**
   * Generates Balance Sheet and Income Statement strictly from the exact same Trial Balance rows,
   * grouped by the client's statement line mapping.
   * Reports any unmapped accounts with non-zero balances in unmappedAccounts.
   */
  public static generateFinancialStatementsFromTrialBalance(
    tb: TrialBalanceSummary,
    _clientAccounts: Account[],
    statementMapping: ClientStatementMapping = {}
  ): GeneratedFinancialStatements {
    const unmappedAccounts: TrialBalanceRow[] = [];
    const groupedItems: Record<FinancialStatementLineKey, StatementItemDetail[]> = {
      BS_CASH_EQUIVALENTS: [],
      BS_TRADE_RECEIVABLES: [],
      BS_INVENTORY: [],
      BS_OTHER_CURRENT_ASSETS: [],
      BS_FIXED_ASSETS: [],
      BS_PROJECTS_UNDER_WAY: [],
      BS_INTANGIBLE_ASSETS: [],
      BS_OTHER_NON_CURRENT_ASSETS: [],
      BS_TRADE_PAYABLES: [],
      BS_TAX_AUTHORITY_PAYABLES: [],
      BS_OTHER_CURRENT_LIABILITIES: [],
      BS_LONG_TERM_LOANS: [],
      BS_OTHER_NON_CURRENT_LIABILITIES: [],
      BS_PAID_UP_CAPITAL: [],
      BS_RETAINED_EARNINGS: [],
      BS_RESERVES: [],
      IS_OPERATING_REVENUE: [],
      IS_SALES_RETURNS_ALLOWANCES: [],
      IS_COGS: [],
      IS_SELLING_DISTRIBUTION: [],
      IS_GENERAL_ADMIN: [],
      IS_DEPRECIATION: [],
      IS_FINANCING_COSTS: [],
      IS_FX_GAINS_LOSSES: [],
      IS_OTHER_REVENUES: [],
      IS_OTHER_EXPENSES: [],
    };

    for (const row of tb.rows) {
      const hasBalance = row.closingDebit > 0 || row.closingCredit > 0;
      if (!hasBalance) continue;

      const mappedKey = statementMapping[row.accountId] || statementMapping[row.accountCode];

      if (!mappedKey || !groupedItems[mappedKey]) {
        unmappedAccounts.push(row);
        continue;
      }

      // Compute balance according to nature / statement category
      let amount = 0;
      if (mappedKey.startsWith('BS_')) {
        if (
          mappedKey === 'BS_CASH_EQUIVALENTS' ||
          mappedKey === 'BS_TRADE_RECEIVABLES' ||
          mappedKey === 'BS_INVENTORY' ||
          mappedKey === 'BS_OTHER_CURRENT_ASSETS' ||
          mappedKey === 'BS_PROJECTS_UNDER_WAY' ||
          mappedKey === 'BS_INTANGIBLE_ASSETS' ||
          mappedKey === 'BS_OTHER_NON_CURRENT_ASSETS'
        ) {
          amount = Number((row.closingDebit - row.closingCredit).toFixed(2));
        } else if (mappedKey === 'BS_FIXED_ASSETS') {
          // Fixed assets debit minus credit (accumulated depreciation 2102 is credit, so it subtracts)
          amount = Number((row.closingDebit - row.closingCredit).toFixed(2));
        } else {
          // Liabilities & Equity: Credit - Debit
          amount = Number((row.closingCredit - row.closingDebit).toFixed(2));
        }
      } else {
        // Income statement
        if (mappedKey === 'IS_OPERATING_REVENUE' || mappedKey === 'IS_OTHER_REVENUES') {
          amount = Number((row.closingCredit - row.closingDebit).toFixed(2));
        } else if (mappedKey === 'IS_FX_GAINS_LOSSES') {
          amount = Number((row.closingCredit - row.closingDebit).toFixed(2));
        } else {
          // Expenses, COGS, Returns: Debit - Credit
          amount = Number((row.closingDebit - row.closingCredit).toFixed(2));
        }
      }

      groupedItems[mappedKey].push({
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        amount,
        lineKey: mappedKey,
      });
    }

    const sumSection = (key: FinancialStatementLineKey): number =>
      Number(groupedItems[key].reduce((s, it) => s + it.amount, 0).toFixed(2));

    // Income Statement
    const opRevenueTotal = sumSection('IS_OPERATING_REVENUE');
    const salesReturnsTotal = sumSection('IS_SALES_RETURNS_ALLOWANCES');
    const netRevenue = Number((opRevenueTotal - salesReturnsTotal).toFixed(2));

    const cogsTotal = sumSection('IS_COGS');
    const grossProfit = Number((netRevenue - cogsTotal).toFixed(2));

    const sellingTotal = sumSection('IS_SELLING_DISTRIBUTION');
    const genAdminTotal = sumSection('IS_GENERAL_ADMIN');
    const deprTotal = sumSection('IS_DEPRECIATION');
    const totalOperatingExpenses = Number((sellingTotal + genAdminTotal + deprTotal).toFixed(2));

    const operatingProfit = Number((grossProfit - totalOperatingExpenses).toFixed(2));

    const financingTotal = sumSection('IS_FINANCING_COSTS');
    const fxTotal = sumSection('IS_FX_GAINS_LOSSES');
    const otherRevTotal = sumSection('IS_OTHER_REVENUES');
    const otherExpTotal = sumSection('IS_OTHER_EXPENSES');

    const netProfitBeforeTax = Number(
      (operatingProfit + fxTotal + otherRevTotal - financingTotal - otherExpTotal).toFixed(2)
    );

    // Balance Sheet
    const currentAssetsTotal = Number(
      (
        sumSection('BS_CASH_EQUIVALENTS') +
        sumSection('BS_TRADE_RECEIVABLES') +
        sumSection('BS_INVENTORY') +
        sumSection('BS_OTHER_CURRENT_ASSETS')
      ).toFixed(2)
    );

    const nonCurrentAssetsTotal = Number(
      (
        sumSection('BS_FIXED_ASSETS') +
        sumSection('BS_PROJECTS_UNDER_WAY') +
        sumSection('BS_INTANGIBLE_ASSETS') +
        sumSection('BS_OTHER_NON_CURRENT_ASSETS')
      ).toFixed(2)
    );

    const totalAssets = Number((currentAssetsTotal + nonCurrentAssetsTotal).toFixed(2));

    const currentLiabTotal = Number(
      (
        sumSection('BS_TRADE_PAYABLES') +
        sumSection('BS_TAX_AUTHORITY_PAYABLES') +
        sumSection('BS_OTHER_CURRENT_LIABILITIES')
      ).toFixed(2)
    );

    const nonCurrentLiabTotal = Number(
      (
        sumSection('BS_LONG_TERM_LOANS') +
        sumSection('BS_OTHER_NON_CURRENT_LIABILITIES')
      ).toFixed(2)
    );

    const totalLiabilities = Number((currentLiabTotal + nonCurrentLiabTotal).toFixed(2));

    const equityTotal = Number(
      (
        sumSection('BS_PAID_UP_CAPITAL') +
        sumSection('BS_RETAINED_EARNINGS') +
        sumSection('BS_RESERVES')
      ).toFixed(2)
    );

    // If year has NOT been closed via YEAR_END_CLOSING, netProfitBeforeTax is added to Equity to balance the balance sheet.
    // If year HAS been closed, revenue/expense accounts are zero, and Retained Earnings already contains the net profit!
    const totalLiabilitiesAndEquity = Number(
      (totalLiabilities + equityTotal + (netRevenue !== 0 || cogsTotal !== 0 ? netProfitBeforeTax : 0)).toFixed(2)
    );

    const bsDifference = Number(Math.abs(totalAssets - totalLiabilitiesAndEquity).toFixed(2));

    return {
      balanceSheet: {
        currentAssets: {
          items: [
            ...groupedItems.BS_CASH_EQUIVALENTS,
            ...groupedItems.BS_TRADE_RECEIVABLES,
            ...groupedItems.BS_INVENTORY,
            ...groupedItems.BS_OTHER_CURRENT_ASSETS,
          ],
          total: currentAssetsTotal,
        },
        nonCurrentAssets: {
          items: [
            ...groupedItems.BS_FIXED_ASSETS,
            ...groupedItems.BS_PROJECTS_UNDER_WAY,
            ...groupedItems.BS_INTANGIBLE_ASSETS,
            ...groupedItems.BS_OTHER_NON_CURRENT_ASSETS,
          ],
          total: nonCurrentAssetsTotal,
        },
        totalAssets,
        currentLiabilities: {
          items: [
            ...groupedItems.BS_TRADE_PAYABLES,
            ...groupedItems.BS_TAX_AUTHORITY_PAYABLES,
            ...groupedItems.BS_OTHER_CURRENT_LIABILITIES,
          ],
          total: currentLiabTotal,
        },
        nonCurrentLiabilities: {
          items: [
            ...groupedItems.BS_LONG_TERM_LOANS,
            ...groupedItems.BS_OTHER_NON_CURRENT_LIABILITIES,
          ],
          total: nonCurrentLiabTotal,
        },
        totalLiabilities,
        equity: {
          items: [
            ...groupedItems.BS_PAID_UP_CAPITAL,
            ...groupedItems.BS_RETAINED_EARNINGS,
            ...groupedItems.BS_RESERVES,
          ],
          total: equityTotal,
        },
        totalEquity: equityTotal,
        netProfitFromIncomeStatement: netRevenue !== 0 || cogsTotal !== 0 ? netProfitBeforeTax : 0,
        totalLiabilitiesAndEquity,
        isBalanced: bsDifference < 0.02,
        difference: bsDifference,
      },
      incomeStatement: {
        operatingRevenue: {
          items: groupedItems.IS_OPERATING_REVENUE,
          total: opRevenueTotal,
        },
        salesReturns: {
          items: groupedItems.IS_SALES_RETURNS_ALLOWANCES,
          total: salesReturnsTotal,
        },
        netRevenue,
        cogs: {
          items: groupedItems.IS_COGS,
          total: cogsTotal,
        },
        grossProfit,
        sellingExpenses: {
          items: groupedItems.IS_SELLING_DISTRIBUTION,
          total: sellingTotal,
        },
        generalAdminExpenses: {
          items: groupedItems.IS_GENERAL_ADMIN,
          total: genAdminTotal,
        },
        depreciationExpenses: {
          items: groupedItems.IS_DEPRECIATION,
          total: deprTotal,
        },
        totalOperatingExpenses,
        operatingProfit,
        financingCosts: {
          items: groupedItems.IS_FINANCING_COSTS,
          total: financingTotal,
        },
        fxGainsLosses: {
          items: groupedItems.IS_FX_GAINS_LOSSES,
          total: fxTotal,
        },
        otherRevenues: {
          items: groupedItems.IS_OTHER_REVENUES,
          total: otherRevTotal,
        },
        otherExpenses: {
          items: groupedItems.IS_OTHER_EXPENSES,
          total: otherExpTotal,
        },
        netProfitBeforeTax,
      },
      unmappedAccounts,
    };
  }
}
