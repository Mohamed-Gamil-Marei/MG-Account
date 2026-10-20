import {
  Account,
  ApprovedStatementsSnapshot,
  ClientStatementMapping,
  FinancialStatementLineKey,
  JournalEntry,
  ManagerAdjustmentLayer,
  ManagerStatementAdjustment,
  StatementAdjustmentImpactRow,
  StatementAdjustmentPeriod,
  StatementLineValue,
  StatementModel,
  StatementNoteRecord,
  StatementReconciliationSummary,
} from '../types';

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
  clientId?: string;
  fiscalYear?: number;
  fromDate?: string;
  toDate?: string;
}

export interface ComputeTrialBalanceOptions {
  clientId?: string;
  fiscalYear?: number;
  fromDate?: string;
  toDate?: string;
  fiscalYearBounds?: any;
  postedOnly?: boolean;
  includeDrafts?: boolean;
  strictClientScope?: boolean;
  openingBalances?: Record<string, Record<string | number, Record<string, { debit?: number; credit?: number }>>>;
  [key: string]: any;
}

export interface GeneralLedgerMovementLine {
  entryId: string;
  entryNumber: string | number;
  date: string;
  description: string;
  referenceNumber?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerAccountReport {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: Account['category'];
  nature: Account['nature'];
  openingDebit: number;
  openingCredit: number;
  openingNet: number;
  movements: GeneralLedgerMovementLine[];
  totalMovementDebit: number;
  totalMovementCredit: number;
  closingDebit: number;
  closingCredit: number;
  closingNet: number;
}

export interface GeneralLedgerSummary {
  clientId: string;
  fiscalYear?: number;
  fromDate?: string;
  toDate?: string;
  accounts: GeneralLedgerAccountReport[];
}

export interface StatementItemDetail {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  openingAmount?: number;
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

export interface FiscalYearBoundsInfo {
  startDate: string;
  endDate: string;
  startMonth: number;
  labelAr: string;
}

export interface StatementModelDataSource {
  getClientById: (clientId: string) => { id: string; name: string; taxId?: string; commercialRegister?: string; fiscalYearStart?: string; fiscalYearEndMonth?: number } | undefined;
  getClientFiscalYearBounds: (clientId: string, fiscalYear: number) => FiscalYearBoundsInfo;
  getClientAccounts: (clientId: string, fiscalYear?: number) => Account[];
  getClientJournalEntries: (clientId: string, fiscalYear?: number) => JournalEntry[];
  getClientStatementMapping: (clientId: string) => ClientStatementMapping;
  getOpeningBalancesMap: () => Record<string, Record<string | number, Record<string, { debit?: number; credit?: number }>>>;
  getManagerAdjustmentLayer: (clientId: string, fiscalYear: number, version?: number) => ManagerAdjustmentLayer;
  getStoredStatementNotes: (clientId: string, fiscalYear: number) => Record<string, { manualParagraph?: string; customTitle?: string; baselineNumbers?: Record<string, number>; lastConfirmedAt?: string; lastConfirmedBy?: string; updatedAt?: string; updatedBy?: string }>;
  getApprovedStatementSnapshot: (clientId: string, fiscalYear: number, version?: number) => ApprovedStatementsSnapshot | undefined;
  getLatestApprovedStatementSnapshot: (clientId: string, fiscalYear: number) => ApprovedStatementsSnapshot | undefined;
}

export const STATEMENT_LINE_LABELS_AR: Record<string, { labelAr: string; section: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'EQUITY' }> = {
  IS_OPERATING_REVENUE: { labelAr: 'إيرادات النشاط والمبيعات', section: 'INCOME_STATEMENT' },
  IS_SALES_RETURNS_ALLOWANCES: { labelAr: 'مردودات ومسموحات وخصومات المبيعات', section: 'INCOME_STATEMENT' },
  IS_COGS: { labelAr: 'تكلفة المبيعات والمشتريات والخدمات', section: 'INCOME_STATEMENT' },
  IS_SELLING_DISTRIBUTION: { labelAr: 'مصروفات البيع والتسويق والتوزيع', section: 'INCOME_STATEMENT' },
  IS_GENERAL_ADMIN: { labelAr: 'المصروفات العمومية والإدارية', section: 'INCOME_STATEMENT' },
  IS_DEPRECIATION: { labelAr: 'إهلاك الأصول الثابتة', section: 'INCOME_STATEMENT' },
  IS_FINANCING_COSTS: { labelAr: 'الأعباء التمويلية والفوائد', section: 'INCOME_STATEMENT' },
  IS_FX_GAINS_LOSSES: { labelAr: 'أرباح وخسائر فروق العملة', section: 'INCOME_STATEMENT' },
  IS_OTHER_REVENUES: { labelAr: 'إيرادات وأرباح أخرى', section: 'INCOME_STATEMENT' },
  IS_OTHER_EXPENSES: { labelAr: 'مصروفات وخسائر أخرى', section: 'INCOME_STATEMENT' },
  IS_INCOME_TAX: { labelAr: 'ضريبة الدخل المقدرة عن العام', section: 'INCOME_STATEMENT' },
  BS_CASH_EQUIVALENTS: { labelAr: 'النقدية بالصندوق ولدى البنوك', section: 'BALANCE_SHEET' },
  BS_TRADE_RECEIVABLES: { labelAr: 'العملاء والمدينون التجاريون', section: 'BALANCE_SHEET' },
  BS_INVENTORY: { labelAr: 'المخزون السلعي والخامات', section: 'BALANCE_SHEET' },
  BS_OTHER_CURRENT_ASSETS: { labelAr: 'أصول متداولة وأرصدة مدينة أخرى', section: 'BALANCE_SHEET' },
  BS_FIXED_ASSETS: { labelAr: 'صافي الأصول الثابتة (بعد مجمع الإهلاك)', section: 'BALANCE_SHEET' },
  BS_PROJECTS_UNDER_WAY: { labelAr: 'مشروعات تحت التنفيذ', section: 'BALANCE_SHEET' },
  BS_INTANGIBLE_ASSETS: { labelAr: 'أصول غير ملموسة وشهرة', section: 'BALANCE_SHEET' },
  BS_OTHER_NON_CURRENT_ASSETS: { labelAr: 'أصول غير متداولة واستثمارات أخرى', section: 'BALANCE_SHEET' },
  BS_TRADE_PAYABLES: { labelAr: 'الموردون والدائنون التجاريون', section: 'BALANCE_SHEET' },
  BS_TAX_AUTHORITY_PAYABLES: { labelAr: 'مصلحة الضرائب والجهات السيادية', section: 'BALANCE_SHEET' },
  BS_OTHER_CURRENT_LIABILITIES: { labelAr: 'التزامات متداولة وأرصدة دائنة أخرى', section: 'BALANCE_SHEET' },
  BS_LONG_TERM_LOANS: { labelAr: 'قروض وتسهيلات طويلة الأجل', section: 'BALANCE_SHEET' },
  BS_OTHER_NON_CURRENT_LIABILITIES: { labelAr: 'التزامات غير متداولة ومخصصات طويلة الأجل', section: 'BALANCE_SHEET' },
  BS_PAID_UP_CAPITAL: { labelAr: 'رأس المال المدفوع', section: 'BALANCE_SHEET' },
  BS_RESERVES: { labelAr: 'الاحتياطيات النظامية والقانونية', section: 'BALANCE_SHEET' },
  BS_RETAINED_EARNINGS: { labelAr: 'الأرباح (الخسائر) المرحلة والمحتجزة', section: 'BALANCE_SHEET' },
  CF_NET_PROFIT: { labelAr: 'صافي الربح قبل الضرائب (أساس التدفقات التشغيلية)', section: 'CASH_FLOW' },
  CF_DEPRECIATION: { labelAr: 'إضافة: إهلاك الأصول الثابتة (بند غير نقدي)', section: 'CASH_FLOW' },
  CF_WORKING_CAPITAL_CHANGES: { labelAr: 'صافي التغير في رأس المال العامل (عملاء/مخزون/موردين)', section: 'CASH_FLOW' },
  CF_INVESTING_CASH_FLOW: { labelAr: 'صافي التدفقات النقدية من أنشطة الاستثمار', section: 'CASH_FLOW' },
  CF_FINANCING_CASH_FLOW: { labelAr: 'صافي التدفقات النقدية من أنشطة التمويل', section: 'CASH_FLOW' },
  CF_OPENING_CASH: { labelAr: 'رصيد النقدية وما في حكمها في بداية السنة', section: 'CASH_FLOW' },
  EQ_OPENING_CAPITAL: { labelAr: 'رصيد رأس المال في بداية السنة', section: 'EQUITY' },
  EQ_CAPITAL_CHANGE: { labelAr: 'الزيادة / (التخفيض) في رأس المال خلال العام', section: 'EQUITY' },
  EQ_OPENING_RESERVES: { labelAr: 'رصيد الاحتياطيات في بداية السنة', section: 'EQUITY' },
  EQ_RESERVES_CHANGE: { labelAr: 'المحول إلى الاحتياطيات خلال العام', section: 'EQUITY' },
  EQ_OPENING_RETAINED_EARNINGS: { labelAr: 'رصيد الأرباح المرحلة في بداية السنة', section: 'EQUITY' },
  EQ_PRIOR_RETAINED_CHANGE: { labelAr: 'تسويات سنوات سابقة على الأرباح المحتجزة', section: 'EQUITY' },
  EQ_NET_PROFIT_FOR_YEAR: { labelAr: 'صافي ربح (خسارة) العام بقائمة حقوق الملكية', section: 'EQUITY' },
  EQ_DIVIDENDS_DISTRIBUTIONS: { labelAr: 'التوزيعات النقدية والمسحوبات المعتمدة', section: 'EQUITY' },
};

function round2(n: number): number {
  return Number((Number(n) || 0).toFixed(2));
}

let registeredBoundsResolver: ((clientId: string, fiscalYear: number) => FiscalYearBoundsInfo) | null = null;
let registeredDataSource: StatementModelDataSource | null = null;

export function computeFiscalYearBoundsByStartMonth(
  fiscalYear: number,
  startMonth = 1
): FiscalYearBoundsInfo {
  const yr = Number(fiscalYear) || new Date().getFullYear();
  const m = Math.min(12, Math.max(1, Number(startMonth) || 1));
  const firstDay = String(1).padStart(2, '0');
  if (m === 1) {
    const startMonthStr = String(m).padStart(2, '0');
    const lastDayDate = new Date(Date.UTC(yr + 1, 0, 0));
    const endMonthStr = String(lastDayDate.getUTCMonth() + 1).padStart(2, '0');
    const endDayStr = String(lastDayDate.getUTCDate()).padStart(2, '0');
    return {
      startDate: `${yr}-${startMonthStr}-${firstDay}`,
      endDate: `${yr}-${endMonthStr}-${endDayStr}`,
      startMonth: 1,
      labelAr: `السنة المالية ${yr}`,
    };
  }
  const startYear = yr - 1;
  const endYear = yr;
  const endMonth = m - 1;
  const endLastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const startDate = `${startYear}-${String(m).padStart(2, '0')}-${firstDay}`;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endLastDay).padStart(2, '0')}`;
  return {
    startDate,
    endDate,
    startMonth: m,
    labelAr: `السنة المالية ${startYear}/${endYear} (${startDate} إلى ${endDate})`,
  };
}

export class AccountingCalculator {
  public static registerFiscalYearBoundsResolver(
    resolver: (clientId: string, fiscalYear: number) => FiscalYearBoundsInfo
  ): void {
    registeredBoundsResolver = resolver;
  }

  public static registerStatementModelDataSource(source: StatementModelDataSource): void {
    registeredDataSource = source;
  }

  public static resolveFiscalYearBounds(
    clientId: string | undefined,
    fiscalYear: number
  ): FiscalYearBoundsInfo {
    if (clientId && registeredBoundsResolver) {
      return registeredBoundsResolver(clientId, fiscalYear);
    }
    return computeFiscalYearBoundsByStartMonth(fiscalYear, 1);
  }

  /**
   * Computes the Trial Balance for a client and period.
   * - Requires a resolved clientId (prevents any query without a client).
   * - Filters strictly by (clientId + fiscal year date bounds).
   * - Excludes any unassigned record (missing clientId).
   * - Matches lines by account ID ONLY.
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

    const postedOnly =
      options.includeDrafts !== undefined
        ? !options.includeDrafts
        : options.postedOnly !== false;

    const explicitClientIdProvided =
      typeof arg3 === 'object' && arg3 !== null && 'clientId' in arg3;
    const explicitClientId = explicitClientIdProvided
      ? String(options.clientId || '').trim()
      : '';

    if (explicitClientIdProvided && !explicitClientId) {
      throw new Error(
        'منع الاستعلام بدون عميل: يجب تحديد العميل (clientId) لاستخراج ميزان المراجعة.'
      );
    }

    const inferredClientId =
      explicitClientId ||
      (accounts &&
      accounts.length > 0 &&
      accounts[0]?.clientId &&
      accounts.every((a) => a.clientId && a.clientId === accounts[0]?.clientId)
        ? String(accounts[0].clientId).trim()
        : '');

    if (
      !inferredClientId &&
      (options.strictClientScope ||
        (accounts && accounts.length > 0) ||
        (journalEntries && journalEntries.length > 0))
    ) {
      throw new Error(
        'منع الاستعلام بدون عميل: لا يمكن حساب ميزان المراجعة بدون تحديد العميل (clientId) أو مع وجود حسابات غير منسوبة لعميل واحد.'
      );
    }

    const clientId = inferredClientId || undefined;
    const fiscalYear = options.fiscalYear;

    let fromDate = options.fromDate;
    let toDate = options.toDate;
    if (fiscalYear && (!fromDate || !toDate)) {
      const bounds = AccountingCalculator.resolveFiscalYearBounds(clientId, fiscalYear);
      if (!fromDate) fromDate = bounds.startDate;
      if (!toDate) toDate = bounds.endDate;
    }

    // Filter accounts strictly by clientId
    const scopedAccounts = (accounts || []).filter((acc) => {
      if (!acc || !acc.clientId || !String(acc.clientId).trim()) return false;
      if (clientId && acc.clientId !== clientId) return false;
      return true;
    });

    // Strict account map by account ID ONLY
    const accountsById = new Map<string, Account>();
    for (const acc of scopedAccounts) {
      accountsById.set(acc.id, acc);
    }

    const movById = new Map<string, { debit: number; credit: number }>();
    for (const acc of scopedAccounts) {
      movById.set(acc.id, { debit: 0, credit: 0 });
    }

    const unmatchedLines: OrphanJournalLine[] = [];

    for (const je of journalEntries || []) {
      if (!je) continue;
      // Exclude unassigned entries (missing clientId) unconditionally
      const jeClientId = String(je.clientId || '').trim();
      if (!jeClientId) continue;
      if (clientId && jeClientId !== clientId) continue;
      if (postedOnly && !je.isPosted && je.status !== 'POSTED') continue;

      const jeDate = je.date ? je.date.slice(0, 10) : '';
      if (fromDate && jeDate && jeDate < fromDate) continue;
      if (toDate && jeDate && jeDate > toDate) continue;
      if (!fromDate && !toDate && fiscalYear && je.fiscalYear && je.fiscalYear !== fiscalYear) {
        continue;
      }
      if (
        fiscalYear &&
        je.fiscalYear &&
        je.fiscalYear !== fiscalYear &&
        (!jeDate || jeDate < (fromDate || '') || jeDate > (toDate || ''))
      ) {
        continue;
      }

      for (const line of je.lines || []) {
        const lineAccId = line.accountId;
        const lineDr = Number(line.debit) || 0;
        const lineCr = Number(line.credit) || 0;

        if (!lineAccId || !accountsById.has(lineAccId)) {
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

    for (const acc of scopedAccounts) {
      const isSummaryParent =
        (acc.level !== undefined && acc.level <= 2 && acc.code.length <= 4 && acc.code.endsWith('00')) ||
        scopedAccounts.some(
          (child) =>
            child.id !== acc.id &&
            (child.parentId === acc.id || child.parentCode === acc.code)
        );

      let opDebit = round2(Number(acc.openingBalanceDebit) || 0);
      let opCredit = round2(Number(acc.openingBalanceCredit) || 0);

      if (options.openingBalances && clientId && fiscalYear) {
        const clientYearMap = options.openingBalances[clientId]?.[fiscalYear];
        const nestedEntry = clientYearMap?.[acc.id] || clientYearMap?.[acc.code];
        if (nestedEntry) {
          opDebit = round2(Number(nestedEntry.debit) || 0);
          opCredit = round2(Number(nestedEntry.credit) || 0);
        }
      }

      const mov = movById.get(acc.id) || { debit: 0, credit: 0 };
      const mvDebit = round2(mov.debit);
      const mvCredit = round2(mov.credit);

      if (isSummaryParent && opDebit === 0 && opCredit === 0 && mvDebit === 0 && mvCredit === 0) {
        continue;
      }

      const net = opDebit + mvDebit - (opCredit + mvCredit);
      const clDebit = net > 0.001 ? round2(net) : 0;
      const clCredit = net < -0.001 ? round2(Math.abs(net)) : 0;

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

      totalOpeningDebit = round2(totalOpeningDebit + opDebit);
      totalOpeningCredit = round2(totalOpeningCredit + opCredit);
      totalMovementDebit = round2(totalMovementDebit + mvDebit);
      totalMovementCredit = round2(totalMovementCredit + mvCredit);
      totalClosingDebit = round2(totalClosingDebit + clDebit);
      totalClosingCredit = round2(totalClosingCredit + clCredit);
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    const difference = round2(Math.abs(totalClosingDebit - totalClosingCredit));

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
      clientId,
      fiscalYear,
      fromDate,
      toDate,
    };
  }

  /**
   * Computes the General Ledger (دفتر الأستاذ العام) strictly filtered by clientId and fiscal year bounds.
   * Prevents any query without a clientId.
   */
  public static computeGeneralLedger(
    accounts: Account[],
    journalEntries: JournalEntry[],
    options: ComputeTrialBalanceOptions & { accountId?: string; accountCode?: string }
  ): GeneralLedgerSummary {
    const clientId = String(options?.clientId || '').trim();
    if (!clientId) {
      throw new Error(
        'منع الاستعلام بدون عميل: يجب تحديد العميل (clientId) لاستخراج دفتر الأستاذ العام.'
      );
    }

    const fiscalYear = options.fiscalYear;
    let fromDate = options.fromDate;
    let toDate = options.toDate;
    if (fiscalYear && (!fromDate || !toDate)) {
      const bounds = AccountingCalculator.resolveFiscalYearBounds(clientId, fiscalYear);
      if (!fromDate) fromDate = bounds.startDate;
      if (!toDate) toDate = bounds.endDate;
    }

    const postedOnly =
      options.includeDrafts !== undefined
        ? !options.includeDrafts
        : options.postedOnly !== false;

    const scopedAccounts = (accounts || []).filter((acc) => {
      if (!acc || acc.clientId !== clientId) return false;
      if (options.accountId && acc.id !== options.accountId) return false;
      if (options.accountCode && acc.code !== options.accountCode) return false;
      return true;
    });

    const accountsById = new Map<string, Account>();
    const movementsByAccId = new Map<string, GeneralLedgerMovementLine[]>();
    for (const acc of scopedAccounts) {
      accountsById.set(acc.id, acc);
      movementsByAccId.set(acc.id, []);
    }

    const sortedEntries = [...(journalEntries || [])]
      .filter((je) => {
        if (!je || !je.clientId || je.clientId !== clientId) return false;
        if (postedOnly && !je.isPosted && je.status !== 'POSTED') return false;
        const jeDate = je.date ? je.date.slice(0, 10) : '';
        if (fromDate && jeDate && jeDate < fromDate) return false;
        if (toDate && jeDate && jeDate > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    for (const je of sortedEntries) {
      for (const line of je.lines || []) {
        if (!line.accountId || !accountsById.has(line.accountId)) continue;
        const arr = movementsByAccId.get(line.accountId)!;
        arr.push({
          entryId: je.id,
          entryNumber: je.entryNumber,
          date: je.date,
          description: line.description || je.description,
          referenceNumber: je.referenceNumber,
          debit: round2(Number(line.debit) || 0),
          credit: round2(Number(line.credit) || 0),
          runningBalance: 0,
        });
      }
    }

    const reports: GeneralLedgerAccountReport[] = [];
    for (const acc of scopedAccounts) {
      let opDebit = round2(Number(acc.openingBalanceDebit) || 0);
      let opCredit = round2(Number(acc.openingBalanceCredit) || 0);
      if (options.openingBalances && fiscalYear) {
        const clientYearMap = options.openingBalances[clientId]?.[fiscalYear];
        const nestedEntry = clientYearMap?.[acc.id] || clientYearMap?.[acc.code];
        if (nestedEntry) {
          opDebit = round2(Number(nestedEntry.debit) || 0);
          opCredit = round2(Number(nestedEntry.credit) || 0);
        }
      }
      const openingNet = round2(opDebit - opCredit);
      let running = openingNet;
      let totalMovementDebit = 0;
      let totalMovementCredit = 0;

      const movs = movementsByAccId.get(acc.id) || [];
      for (const m of movs) {
        totalMovementDebit = round2(totalMovementDebit + m.debit);
        totalMovementCredit = round2(totalMovementCredit + m.credit);
        running = round2(running + m.debit - m.credit);
        m.runningBalance = running;
      }

      const closingDebit = running > 0.001 ? round2(running) : 0;
      const closingCredit = running < -0.001 ? round2(Math.abs(running)) : 0;

      reports.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        category: acc.category,
        nature: acc.nature,
        openingDebit: opDebit,
        openingCredit: opCredit,
        openingNet,
        movements: movs,
        totalMovementDebit,
        totalMovementCredit,
        closingDebit,
        closingCredit,
        closingNet: running,
      });
    }

    return {
      clientId,
      fiscalYear,
      fromDate,
      toDate,
      accounts: reports,
    };
  }

  /**
   * Resolves a fallback FinancialStatementLineKey from an account's code/category when not explicitly in statementMapping.
   */
  public static inferStatementLineKey(
    row: Pick<TrialBalanceRow, 'accountCode' | 'accountName' | 'category'>
  ): FinancialStatementLineKey | undefined {
    const code = String(row.accountCode || '').trim();
    const name = String(row.accountName || '').trim();
    const cat = String(row.category || '').toUpperCase();

    if (code.startsWith('1101') || code.startsWith('1102') || code.startsWith('111') || name.includes('نقدية') || name.includes('صندوق') || name.includes('بنك')) {
      return 'BS_CASH_EQUIVALENTS';
    }
    if (code.startsWith('1103') || code.startsWith('112') || name.includes('عملاء') || name.includes('مدينون')) {
      return 'BS_TRADE_RECEIVABLES';
    }
    if (code.startsWith('1104') || code.startsWith('113') || name.includes('مخزون') || name.includes('بضاعة')) {
      return 'BS_INVENTORY';
    }
    if (code.startsWith('11')) {
      return 'BS_OTHER_CURRENT_ASSETS';
    }
    if (code.startsWith('1201') || code.startsWith('121') || code === '2102' || name.includes('أصول ثابتة') || name.includes('مجمع إهلاك')) {
      return 'BS_FIXED_ASSETS';
    }
    if (code.startsWith('1202') || name.includes('مشروعات تحت التنفيذ')) {
      return 'BS_PROJECTS_UNDER_WAY';
    }
    if (code.startsWith('1203') || name.includes('غير ملموسة') || name.includes('شهرة')) {
      return 'BS_INTANGIBLE_ASSETS';
    }
    if (code.startsWith('12') || cat === 'ASSETS' || cat === 'ASSET') {
      return 'BS_OTHER_NON_CURRENT_ASSETS';
    }
    if (code.startsWith('2101') || code.startsWith('2201') || name.includes('موردين') || name.includes('موردون') || name.includes('دائنون')) {
      return 'BS_TRADE_PAYABLES';
    }
    if (code.startsWith('2103') || code.startsWith('2202') || code.startsWith('2203') || name.includes('ضرائب') || name.includes('ضريبة')) {
      return 'BS_TAX_AUTHORITY_PAYABLES';
    }
    if (code.startsWith('23') || name.includes('قروض طويلة')) {
      return 'BS_LONG_TERM_LOANS';
    }
    if (code.startsWith('21') || code.startsWith('22') || cat === 'LIABILITIES' || cat === 'LIABILITY') {
      return 'BS_OTHER_CURRENT_LIABILITIES';
    }
    if (code.startsWith('3101') || code.startsWith('2101_CAP') || name.includes('رأس المال')) {
      return 'BS_PAID_UP_CAPITAL';
    }
    if (code.startsWith('3102') || name.includes('احتياط')) {
      return 'BS_RESERVES';
    }
    if (code.startsWith('3103') || code.startsWith('3') || cat === 'EQUITY' || name.includes('أرباح مرحلة') || name.includes('أرباح محتجزة')) {
      return 'BS_RETAINED_EARNINGS';
    }
    if (code.startsWith('4102') || name.includes('مردودات') || name.includes('خصم مسموح')) {
      return 'IS_SALES_RETURNS_ALLOWANCES';
    }
    if (code.startsWith('41') || code.startsWith('4') || cat === 'REVENUES' || cat === 'REVENUE') {
      if (code.startsWith('42') || name.includes('إيرادات أخرى')) return 'IS_OTHER_REVENUES';
      return 'IS_OPERATING_REVENUE';
    }
    if (code.startsWith('51') || name.includes('تكلفة المبيعات') || name.includes('مشتريات')) {
      return 'IS_COGS';
    }
    if (code.startsWith('5201') || name.includes('بيع') || name.includes('تسويق')) {
      return 'IS_SELLING_DISTRIBUTION';
    }
    if (code.startsWith('5203') || code.startsWith('5301') || name.includes('قسط إهلاك') || name.includes('مصروف إهلاك')) {
      return 'IS_DEPRECIATION';
    }
    if (code.startsWith('54') || name.includes('فوائد') || name.includes('تمويل')) {
      return 'IS_FINANCING_COSTS';
    }
    if (name.includes('فروق عملة')) {
      return 'IS_FX_GAINS_LOSSES';
    }
    if (code.startsWith('52') || code.startsWith('5') || cat === 'EXPENSES' || cat === 'EXPENSE') {
      return 'IS_GENERAL_ADMIN';
    }
    return undefined;
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
      const hasBalance =
        row.closingDebit > 0 ||
        row.closingCredit > 0 ||
        row.openingDebit > 0 ||
        row.openingCredit > 0;
      if (!hasBalance) continue;

      const mappedKey = statementMapping[row.accountId] || statementMapping[row.accountCode];

      if (!mappedKey || !groupedItems[mappedKey]) {
        if (row.closingDebit > 0 || row.closingCredit > 0) {
          unmappedAccounts.push(row);
        }
        continue;
      }

      let amount = 0;
      let openingAmount = 0;
      if (mappedKey.startsWith('BS_')) {
        if (
          mappedKey === 'BS_CASH_EQUIVALENTS' ||
          mappedKey === 'BS_TRADE_RECEIVABLES' ||
          mappedKey === 'BS_INVENTORY' ||
          mappedKey === 'BS_OTHER_CURRENT_ASSETS' ||
          mappedKey === 'BS_PROJECTS_UNDER_WAY' ||
          mappedKey === 'BS_INTANGIBLE_ASSETS' ||
          mappedKey === 'BS_OTHER_NON_CURRENT_ASSETS' ||
          mappedKey === 'BS_FIXED_ASSETS'
        ) {
          amount = round2(row.closingDebit - row.closingCredit);
          openingAmount = round2(row.openingDebit - row.openingCredit);
        } else {
          amount = round2(row.closingCredit - row.closingDebit);
          openingAmount = round2(row.openingCredit - row.openingDebit);
        }
      } else {
        if (
          mappedKey === 'IS_OPERATING_REVENUE' ||
          mappedKey === 'IS_OTHER_REVENUES' ||
          mappedKey === 'IS_FX_GAINS_LOSSES'
        ) {
          amount = round2(row.closingCredit - row.closingDebit);
          openingAmount = round2(row.openingCredit - row.openingDebit);
        } else {
          amount = round2(row.closingDebit - row.closingCredit);
          openingAmount = round2(row.openingDebit - row.openingCredit);
        }
      }

      if (amount !== 0 || openingAmount !== 0) {
        groupedItems[mappedKey].push({
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          amount,
          openingAmount,
          lineKey: mappedKey,
        });
      }
    }

    const sumSection = (key: FinancialStatementLineKey): number =>
      round2(groupedItems[key].reduce((s, it) => s + it.amount, 0));

    // Income Statement
    const opRevenueTotal = sumSection('IS_OPERATING_REVENUE');
    const salesReturnsTotal = sumSection('IS_SALES_RETURNS_ALLOWANCES');
    const netRevenue = round2(opRevenueTotal - salesReturnsTotal);

    const cogsTotal = sumSection('IS_COGS');
    const grossProfit = round2(netRevenue - cogsTotal);

    const sellingTotal = sumSection('IS_SELLING_DISTRIBUTION');
    const genAdminTotal = sumSection('IS_GENERAL_ADMIN');
    const deprTotal = sumSection('IS_DEPRECIATION');
    const totalOperatingExpenses = round2(sellingTotal + genAdminTotal + deprTotal);

    const operatingProfit = round2(grossProfit - totalOperatingExpenses);

    const financingTotal = sumSection('IS_FINANCING_COSTS');
    const fxTotal = sumSection('IS_FX_GAINS_LOSSES');
    const otherRevTotal = sumSection('IS_OTHER_REVENUES');
    const otherExpTotal = sumSection('IS_OTHER_EXPENSES');

    const netProfitBeforeTax = round2(
      operatingProfit + fxTotal + otherRevTotal - financingTotal - otherExpTotal
    );

    // Balance Sheet
    const currentAssetsTotal = round2(
      sumSection('BS_CASH_EQUIVALENTS') +
        sumSection('BS_TRADE_RECEIVABLES') +
        sumSection('BS_INVENTORY') +
        sumSection('BS_OTHER_CURRENT_ASSETS')
    );

    const nonCurrentAssetsTotal = round2(
      sumSection('BS_FIXED_ASSETS') +
        sumSection('BS_PROJECTS_UNDER_WAY') +
        sumSection('BS_INTANGIBLE_ASSETS') +
        sumSection('BS_OTHER_NON_CURRENT_ASSETS')
    );

    const totalAssets = round2(currentAssetsTotal + nonCurrentAssetsTotal);

    const currentLiabTotal = round2(
      sumSection('BS_TRADE_PAYABLES') +
        sumSection('BS_TAX_AUTHORITY_PAYABLES') +
        sumSection('BS_OTHER_CURRENT_LIABILITIES')
    );

    const nonCurrentLiabTotal = round2(
      sumSection('BS_LONG_TERM_LOANS') + sumSection('BS_OTHER_NON_CURRENT_LIABILITIES')
    );

    const totalLiabilities = round2(currentLiabTotal + nonCurrentLiabTotal);

    const equityTotal = round2(
      sumSection('BS_PAID_UP_CAPITAL') +
        sumSection('BS_RETAINED_EARNINGS') +
        sumSection('BS_RESERVES')
    );

    const hasIncomeStatementActivity =
      opRevenueTotal !== 0 ||
      salesReturnsTotal !== 0 ||
      cogsTotal !== 0 ||
      totalOperatingExpenses !== 0 ||
      financingTotal !== 0 ||
      fxTotal !== 0 ||
      otherRevTotal !== 0 ||
      otherExpTotal !== 0;

    const netProfitFromIncomeStatement = hasIncomeStatementActivity ? netProfitBeforeTax : 0;

    const totalLiabilitiesAndEquity = round2(
      totalLiabilities + equityTotal + netProfitFromIncomeStatement
    );

    const bsDifference = round2(Math.abs(totalAssets - totalLiabilitiesAndEquity));

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
        netProfitFromIncomeStatement,
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

  /**
   * Builds the unified StatementModel for (clientId, fiscalYear, version?)
   * All totals, retained earnings, cash flows, equity changes, notes, ratios,
   * auditor report figures, credit summary, simulator baseline, and QR payload
   * are computed dynamically from the statement lines + ManagerAdjustmentLayer.
   */
  public static buildStatementModel(
    clientIdOrParams: string | any,
    fiscalYear?: number,
    version?: number,
    customSource?: StatementModelDataSource
  ): StatementModel {
    const isObjectParam = typeof clientIdOrParams === 'object' && clientIdOrParams !== null;
    const cleanClientId = String(
      (isObjectParam ? clientIdOrParams.clientId : clientIdOrParams) || ''
    ).trim();
    if (!cleanClientId) {
      throw new Error(
        'منع الاستعلام بدون عميل: يجب تحديد العميل (clientId) لبناء نموذج القوائم المالية (buildStatementModel).'
      );
    }
    const targetYear = Number(isObjectParam ? clientIdOrParams.fiscalYear : fiscalYear);
    if (!Number.isFinite(targetYear) || targetYear < 1900) {
      throw new Error('يجب تحديد سنة مالية صحيحة لبناء نموذج القوائم المالية.');
    }

    const source = customSource || registeredDataSource;
    const resolvedVersion = isObjectParam ? clientIdOrParams.version : version;

    const client =
      (isObjectParam && clientIdOrParams.client) ||
      (source ? source.getClientById(cleanClientId) : undefined);
    const currentBounds =
      (isObjectParam && clientIdOrParams.fiscalBounds) ||
      (source
        ? source.getClientFiscalYearBounds(cleanClientId, targetYear)
        : computeFiscalYearBoundsByStartMonth(targetYear, 1));
    const comparativeYear = targetYear - 1;
    const comparativeBounds =
      (isObjectParam && clientIdOrParams.comparativeFiscalBounds) ||
      (source
        ? source.getClientFiscalYearBounds(cleanClientId, comparativeYear)
        : computeFiscalYearBoundsByStartMonth(comparativeYear, 1));

    const snapshotForVersion =
      resolvedVersion !== undefined && resolvedVersion > 0
        ? source?.getApprovedStatementSnapshot(cleanClientId, targetYear, resolvedVersion)
        : source?.getLatestApprovedStatementSnapshot(cleanClientId, targetYear);

    const versionNum =
      resolvedVersion !== undefined
        ? resolvedVersion
        : snapshotForVersion?.version ?? snapshotForVersion?.versionNo ?? 0;

    const adjustmentLayer =
      (isObjectParam && clientIdOrParams.adjustmentLayer) ||
      (source
        ? source.getManagerAdjustmentLayer(cleanClientId, targetYear, resolvedVersion)
        : {
            id: `layer-${cleanClientId}-${targetYear}`,
            clientId: cleanClientId,
            fiscalYear: targetYear,
            version: versionNum || 1,
            status: 'DRAFT',
            createdAt: '',
            updatedAt: '',
            adjustments: [],
          });

    const currentAccounts =
      (isObjectParam && clientIdOrParams.accounts) ||
      (source ? source.getClientAccounts(cleanClientId, targetYear) : []);
    const comparativeAccounts =
      (isObjectParam && clientIdOrParams.comparativeAccounts) ||
      (source ? source.getClientAccounts(cleanClientId, comparativeYear) : []);
    const allClientEntries =
      (isObjectParam && clientIdOrParams.entries) ||
      (source ? source.getClientJournalEntries(cleanClientId) : []);
    const rawMapping =
      (isObjectParam && clientIdOrParams.statementMapping) ||
      (source ? source.getClientStatementMapping(cleanClientId) : {}) ||
      {};
    const openingBalancesMap = source ? source.getOpeningBalancesMap() : {};

    // Build effective mapping (explicit mapping + fallback inference so no standard account is left behind unless truly unmappable)
    const buildEffectiveMapping = (tbRows: TrialBalanceRow[]): ClientStatementMapping => {
      const m: ClientStatementMapping = { ...rawMapping };
      for (const r of tbRows) {
        if (!m[r.accountId] && !m[r.accountCode]) {
          const inferred = AccountingCalculator.inferStatementLineKey(r);
          if (inferred) {
            m[r.accountId] = inferred;
            m[r.accountCode] = inferred;
          }
        }
      }
      return m;
    };

    const currentTB = AccountingCalculator.computeTrialBalance(
      currentAccounts,
      allClientEntries,
      {
        clientId: cleanClientId,
        fiscalYear: targetYear,
        fromDate: currentBounds.startDate,
        toDate: currentBounds.endDate,
        postedOnly: true,
        openingBalances: openingBalancesMap,
      }
    );

    const comparativeTB = AccountingCalculator.computeTrialBalance(
      comparativeAccounts,
      allClientEntries,
      {
        clientId: cleanClientId,
        fiscalYear: comparativeYear,
        fromDate: comparativeBounds.startDate,
        toDate: comparativeBounds.endDate,
        postedOnly: true,
        openingBalances: openingBalancesMap,
      }
    );

    const currentEffectiveMapping = buildEffectiveMapping(currentTB.rows);
    const comparativeEffectiveMapping = buildEffectiveMapping(comparativeTB.rows);

    // Raw generated statements (pure ledger)
    const rawCurrentStatements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
      currentTB,
      currentAccounts,
      rawMapping
    );
    const mappedCurrentStatements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
      currentTB,
      currentAccounts,
      currentEffectiveMapping
    );
    const mappedComparativeStatements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
      comparativeTB,
      comparativeAccounts,
      comparativeEffectiveMapping
    );

    // Helper to extract pure ledger closing & opening amounts per lineKey
    const sumItems = (items: StatementItemDetail[], field: 'amount' | 'openingAmount' = 'amount'): number =>
      round2((items || []).reduce((s, it) => s + (Number(it[field]) || 0), 0));

    const filterKey = (items: StatementItemDetail[], key: FinancialStatementLineKey): StatementItemDetail[] =>
      (items || []).filter((it) => it.lineKey === key);

    const extractBaseLedgerMap = (
      gen: GeneratedFinancialStatements
    ): { closing: Record<string, number>; opening: Record<string, number> } => {
      const allBsItems = [
        ...gen.balanceSheet.currentAssets.items,
        ...gen.balanceSheet.nonCurrentAssets.items,
        ...gen.balanceSheet.currentLiabilities.items,
        ...gen.balanceSheet.nonCurrentLiabilities.items,
        ...gen.balanceSheet.equity.items,
      ];
      const closing: Record<string, number> = {
        IS_OPERATING_REVENUE: gen.incomeStatement.operatingRevenue.total,
        IS_SALES_RETURNS_ALLOWANCES: gen.incomeStatement.salesReturns.total,
        IS_COGS: gen.incomeStatement.cogs.total,
        IS_SELLING_DISTRIBUTION: gen.incomeStatement.sellingExpenses.total,
        IS_GENERAL_ADMIN: gen.incomeStatement.generalAdminExpenses.total,
        IS_DEPRECIATION: gen.incomeStatement.depreciationExpenses.total,
        IS_FINANCING_COSTS: gen.incomeStatement.financingCosts.total,
        IS_FX_GAINS_LOSSES: gen.incomeStatement.fxGainsLosses.total,
        IS_OTHER_REVENUES: gen.incomeStatement.otherRevenues.total,
        IS_OTHER_EXPENSES: gen.incomeStatement.otherExpenses.total,
        IS_INCOME_TAX: 0,
        BS_CASH_EQUIVALENTS: sumItems(filterKey(allBsItems, 'BS_CASH_EQUIVALENTS'), 'amount'),
        BS_TRADE_RECEIVABLES: sumItems(filterKey(allBsItems, 'BS_TRADE_RECEIVABLES'), 'amount'),
        BS_INVENTORY: sumItems(filterKey(allBsItems, 'BS_INVENTORY'), 'amount'),
        BS_OTHER_CURRENT_ASSETS: sumItems(filterKey(allBsItems, 'BS_OTHER_CURRENT_ASSETS'), 'amount'),
        BS_FIXED_ASSETS: sumItems(filterKey(allBsItems, 'BS_FIXED_ASSETS'), 'amount'),
        BS_PROJECTS_UNDER_WAY: sumItems(filterKey(allBsItems, 'BS_PROJECTS_UNDER_WAY'), 'amount'),
        BS_INTANGIBLE_ASSETS: sumItems(filterKey(allBsItems, 'BS_INTANGIBLE_ASSETS'), 'amount'),
        BS_OTHER_NON_CURRENT_ASSETS: sumItems(filterKey(allBsItems, 'BS_OTHER_NON_CURRENT_ASSETS'), 'amount'),
        BS_TRADE_PAYABLES: sumItems(filterKey(allBsItems, 'BS_TRADE_PAYABLES'), 'amount'),
        BS_TAX_AUTHORITY_PAYABLES: sumItems(filterKey(allBsItems, 'BS_TAX_AUTHORITY_PAYABLES'), 'amount'),
        BS_OTHER_CURRENT_LIABILITIES: sumItems(filterKey(allBsItems, 'BS_OTHER_CURRENT_LIABILITIES'), 'amount'),
        BS_LONG_TERM_LOANS: sumItems(filterKey(allBsItems, 'BS_LONG_TERM_LOANS'), 'amount'),
        BS_OTHER_NON_CURRENT_LIABILITIES: sumItems(filterKey(allBsItems, 'BS_OTHER_NON_CURRENT_LIABILITIES'), 'amount'),
        BS_PAID_UP_CAPITAL: sumItems(filterKey(allBsItems, 'BS_PAID_UP_CAPITAL'), 'amount'),
        BS_RESERVES: sumItems(filterKey(allBsItems, 'BS_RESERVES'), 'amount'),
        BS_RETAINED_EARNINGS: sumItems(filterKey(allBsItems, 'BS_RETAINED_EARNINGS'), 'amount'),
      };

      const opening: Record<string, number> = {
        BS_CASH_EQUIVALENTS: sumItems(filterKey(allBsItems, 'BS_CASH_EQUIVALENTS'), 'openingAmount'),
        BS_TRADE_RECEIVABLES: sumItems(filterKey(allBsItems, 'BS_TRADE_RECEIVABLES'), 'openingAmount'),
        BS_INVENTORY: sumItems(filterKey(allBsItems, 'BS_INVENTORY'), 'openingAmount'),
        BS_OTHER_CURRENT_ASSETS: sumItems(filterKey(allBsItems, 'BS_OTHER_CURRENT_ASSETS'), 'openingAmount'),
        BS_FIXED_ASSETS: sumItems(filterKey(allBsItems, 'BS_FIXED_ASSETS'), 'openingAmount'),
        BS_PROJECTS_UNDER_WAY: sumItems(filterKey(allBsItems, 'BS_PROJECTS_UNDER_WAY'), 'openingAmount'),
        BS_INTANGIBLE_ASSETS: sumItems(filterKey(allBsItems, 'BS_INTANGIBLE_ASSETS'), 'openingAmount'),
        BS_OTHER_NON_CURRENT_ASSETS: sumItems(filterKey(allBsItems, 'BS_OTHER_NON_CURRENT_ASSETS'), 'openingAmount'),
        BS_TRADE_PAYABLES: sumItems(filterKey(allBsItems, 'BS_TRADE_PAYABLES'), 'openingAmount'),
        BS_TAX_AUTHORITY_PAYABLES: sumItems(filterKey(allBsItems, 'BS_TAX_AUTHORITY_PAYABLES'), 'openingAmount'),
        BS_OTHER_CURRENT_LIABILITIES: sumItems(filterKey(allBsItems, 'BS_OTHER_CURRENT_LIABILITIES'), 'openingAmount'),
        BS_LONG_TERM_LOANS: sumItems(filterKey(allBsItems, 'BS_LONG_TERM_LOANS'), 'openingAmount'),
        BS_OTHER_NON_CURRENT_LIABILITIES: sumItems(filterKey(allBsItems, 'BS_OTHER_NON_CURRENT_LIABILITIES'), 'openingAmount'),
        BS_PAID_UP_CAPITAL: sumItems(filterKey(allBsItems, 'BS_PAID_UP_CAPITAL'), 'openingAmount'),
        BS_RESERVES: sumItems(filterKey(allBsItems, 'BS_RESERVES'), 'openingAmount'),
        BS_RETAINED_EARNINGS: sumItems(filterKey(allBsItems, 'BS_RETAINED_EARNINGS'), 'openingAmount'),
      };

      return { closing, opening };
    };

    const currentBase = extractBaseLedgerMap(mappedCurrentStatements);
    const comparativeBase = extractBaseLedgerMap(mappedComparativeStatements);

    // Index manager adjustments by `${period}::${lineKey}`
    const adjMap = new Map<string, ManagerStatementAdjustment>();
    for (const adj of adjustmentLayer?.adjustments || []) {
      if (!adj || !adj.lineKey) continue;
      const p: StatementAdjustmentPeriod = adj.period === 'COMPARATIVE' ? 'COMPARATIVE' : 'CURRENT';
      adjMap.set(`${p}::${adj.lineKey}`, adj);
    }

    const resolveVal = (
      period: StatementAdjustmentPeriod,
      lineKey: string,
      ledgerAmt: number
    ): { amount: number; ledgerAmount: number; adj?: ManagerStatementAdjustment } => {
      const cleanLedger = round2(ledgerAmt);
      const adj = adjMap.get(`${period}::${lineKey}`);
      if (adj && Number.isFinite(Number(adj.overrideAmount))) {
        return {
          amount: round2(Number(adj.overrideAmount)),
          ledgerAmount: cleanLedger,
          adj: {
            ...adj,
            ledgerAmount: cleanLedger,
            overrideAmount: round2(Number(adj.overrideAmount)),
          },
        };
      }
      return { amount: cleanLedger, ledgerAmount: cleanLedger };
    };

    const linesRecord: Record<string, StatementLineValue> = {};

    const buildPeriodDerived = (
      period: StatementAdjustmentPeriod,
      base: { closing: Record<string, number>; opening: Record<string, number> }
    ) => {
      const g = (lineKey: string): number => {
        const res = resolveVal(period, lineKey, base.closing[lineKey] || 0);
        if (period === 'CURRENT') {
          const meta = STATEMENT_LINE_LABELS_AR[lineKey] || {
            labelAr: lineKey,
            section: 'BALANCE_SHEET' as const,
          };
          const compRes = resolveVal('COMPARATIVE', lineKey, comparativeBase.closing[lineKey] || 0);
          linesRecord[lineKey] = {
            lineKey,
            labelAr: meta.labelAr,
            section: meta.section,
            currentLedgerAmount: res.ledgerAmount,
            currentAmount: res.amount,
            comparativeLedgerAmount: compRes.ledgerAmount,
            comparativeAmount: compRes.amount,
            isCurrentAdjusted: Boolean(res.adj),
            isComparativeAdjusted: Boolean(compRes.adj),
            currentAdjustment: res.adj,
            comparativeAdjustment: compRes.adj,
          };
        }
        return res.amount;
      };

      // 1. Income Statement (all totals computed dynamically from lines)
      const operatingRevenue = g('IS_OPERATING_REVENUE');
      const salesReturns = g('IS_SALES_RETURNS_ALLOWANCES');
      const netSales = round2(operatingRevenue - salesReturns);
      const cogs = g('IS_COGS');
      const grossProfit = round2(netSales - cogs);
      const sellingAndDistribution = g('IS_SELLING_DISTRIBUTION');
      const generalAndAdmin = g('IS_GENERAL_ADMIN');
      const depreciation = g('IS_DEPRECIATION');
      const totalOperatingExpenses = round2(sellingAndDistribution + generalAndAdmin + depreciation);
      const operatingProfit = round2(grossProfit - totalOperatingExpenses);
      const financingCosts = g('IS_FINANCING_COSTS');
      const fxGainsLosses = g('IS_FX_GAINS_LOSSES');
      const otherRevenues = g('IS_OTHER_REVENUES');
      const otherExpenses = g('IS_OTHER_EXPENSES');
      const netProfitBeforeTax = round2(
        operatingProfit - financingCosts + fxGainsLosses + otherRevenues - otherExpenses
      );
      const incomeTax = g('IS_INCOME_TAX');
      const netProfitAfterTax = round2(netProfitBeforeTax - incomeTax);
      const totalExpenses = round2(
        salesReturns + cogs + totalOperatingExpenses + financingCosts + otherExpenses + incomeTax - fxGainsLosses
      );

      // 2. Balance Sheet (all totals and retained earnings computed dynamically from lines)
      const cashAndEquivalents = g('BS_CASH_EQUIVALENTS');
      const tradeReceivables = g('BS_TRADE_RECEIVABLES');
      const inventory = g('BS_INVENTORY');
      const otherCurrentAssets = g('BS_OTHER_CURRENT_ASSETS');
      const totalCurrentAssets = round2(
        cashAndEquivalents + tradeReceivables + inventory + otherCurrentAssets
      );

      const fixedAssetsNet = g('BS_FIXED_ASSETS');
      const projectsUnderWay = g('BS_PROJECTS_UNDER_WAY');
      const intangibleAssets = g('BS_INTANGIBLE_ASSETS');
      const otherNonCurrentAssets = g('BS_OTHER_NON_CURRENT_ASSETS');
      const totalNonCurrentAssets = round2(
        fixedAssetsNet + projectsUnderWay + intangibleAssets + otherNonCurrentAssets
      );

      const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets);

      const tradePayables = g('BS_TRADE_PAYABLES');
      const taxAuthorityPayables = g('BS_TAX_AUTHORITY_PAYABLES');
      const otherCurrentLiabilities = g('BS_OTHER_CURRENT_LIABILITIES');
      const totalCurrentLiabilities = round2(
        tradePayables + taxAuthorityPayables + otherCurrentLiabilities
      );

      const longTermLoans = g('BS_LONG_TERM_LOANS');
      const otherNonCurrentLiabilities = g('BS_OTHER_NON_CURRENT_LIABILITIES');
      const totalNonCurrentLiabilities = round2(longTermLoans + otherNonCurrentLiabilities);

      const totalLiabilities = round2(totalCurrentLiabilities + totalNonCurrentLiabilities);

      const paidUpCapital = g('BS_PAID_UP_CAPITAL');
      const reserves = g('BS_RESERVES');
      const retainedEarningsPrior = g('BS_RETAINED_EARNINGS');

      const hasISActivity =
        operatingRevenue !== 0 ||
        salesReturns !== 0 ||
        cogs !== 0 ||
        totalOperatingExpenses !== 0 ||
        financingCosts !== 0 ||
        fxGainsLosses !== 0 ||
        otherRevenues !== 0 ||
        otherExpenses !== 0 ||
        incomeTax !== 0;

      const currentYearNetProfit = hasISActivity ? netProfitAfterTax : 0;
      const totalRetainedAndProfit = round2(retainedEarningsPrior + currentYearNetProfit);
      const totalEquity = round2(paidUpCapital + reserves + totalRetainedAndProfit);
      const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity);
      const balanceDifference = round2(totalAssets - totalLiabilitiesAndEquity);
      const isBalanced = Math.abs(balanceDifference) < 0.02;

      // 3. Indirect Cash Flow Statement (derived from opening vs closing movements + overridable per line)
      const openCashBase = base.opening.BS_CASH_EQUIVALENTS || 0;
      const openReceivables = base.opening.BS_TRADE_RECEIVABLES || 0;
      const openInventory = base.opening.BS_INVENTORY || 0;
      const openOtherCA = base.opening.BS_OTHER_CURRENT_ASSETS || 0;
      const openPayables = base.opening.BS_TRADE_PAYABLES || 0;
      const openTaxPayables = base.opening.BS_TAX_AUTHORITY_PAYABLES || 0;
      const openOtherCL = base.opening.BS_OTHER_CURRENT_LIABILITIES || 0;

      const openNCA = round2(
        (base.opening.BS_FIXED_ASSETS || 0) +
          (base.opening.BS_PROJECTS_UNDER_WAY || 0) +
          (base.opening.BS_INTANGIBLE_ASSETS || 0) +
          (base.opening.BS_OTHER_NON_CURRENT_ASSETS || 0)
      );
      const openNCL = round2(
        (base.opening.BS_LONG_TERM_LOANS || 0) +
          (base.opening.BS_OTHER_NON_CURRENT_LIABILITIES || 0)
      );
      const openEquityExProfit = round2(
        (base.opening.BS_PAID_UP_CAPITAL || 0) +
          (base.opening.BS_RESERVES || 0) +
          (base.opening.BS_RETAINED_EARNINGS || 0)
      );

      const derivedWorkingCapitalChanges = round2(
        -(
          tradeReceivables -
          openReceivables +
          (inventory - openInventory) +
          (otherCurrentAssets - openOtherCA)
        ) +
          (tradePayables -
            openPayables +
            (taxAuthorityPayables - openTaxPayables) +
            (otherCurrentLiabilities - openOtherCL))
      );

      // Change in net non-current assets before current year depreciation charge
      const derivedInvestingCashFlow = round2(
        -(totalNonCurrentAssets - openNCA + depreciation)
      );

      const derivedFinancingCashFlow = round2(
        totalNonCurrentLiabilities -
          openNCL +
          (paidUpCapital + reserves + retainedEarningsPrior - openEquityExProfit) -
          incomeTax
      );

      const registerSpecialLine = (key: string, defaultLedgerVal: number): number => {
        const res = resolveVal(period, key, defaultLedgerVal);
        if (period === 'CURRENT') {
          const meta = STATEMENT_LINE_LABELS_AR[key] || {
            labelAr: key,
            section: 'CASH_FLOW' as const,
          };
          linesRecord[key] = {
            lineKey: key,
            labelAr: meta.labelAr,
            section: meta.section,
            currentLedgerAmount: res.ledgerAmount,
            currentAmount: res.amount,
            comparativeLedgerAmount: 0,
            comparativeAmount: 0,
            isCurrentAdjusted: Boolean(res.adj),
            isComparativeAdjusted: false,
            currentAdjustment: res.adj,
          };
        }
        return res.amount;
      };

      const cfNetProfit = registerSpecialLine('CF_NET_PROFIT', currentYearNetProfit ? netProfitBeforeTax : 0);
      const cfDepreciation = registerSpecialLine('CF_DEPRECIATION', depreciation);
      const cfWorkingCapital = registerSpecialLine(
        'CF_WORKING_CAPITAL_CHANGES',
        derivedWorkingCapitalChanges
      );
      const operatingCashFlow = round2(cfNetProfit + cfDepreciation + cfWorkingCapital);
      const investingCashFlow = registerSpecialLine(
        'CF_INVESTING_CASH_FLOW',
        derivedInvestingCashFlow
      );
      const financingCashFlow = registerSpecialLine(
        'CF_FINANCING_CASH_FLOW',
        derivedFinancingCashFlow
      );
      const openingCash = registerSpecialLine('CF_OPENING_CASH', openCashBase);
      const netCashFlow = round2(operatingCashFlow + investingCashFlow + financingCashFlow);
      const endingCash = round2(openingCash + netCashFlow);

      // 4. Statement of Changes in Equity
      const eqOpeningCapital = registerSpecialLine(
        'EQ_OPENING_CAPITAL',
        base.opening.BS_PAID_UP_CAPITAL || 0
      );
      const eqCapitalChange = registerSpecialLine(
        'EQ_CAPITAL_CHANGE',
        round2(paidUpCapital - (base.opening.BS_PAID_UP_CAPITAL || 0))
      );
      const eqOpeningReserves = registerSpecialLine(
        'EQ_OPENING_RESERVES',
        base.opening.BS_RESERVES || 0
      );
      const eqReservesChange = registerSpecialLine(
        'EQ_RESERVES_CHANGE',
        round2(reserves - (base.opening.BS_RESERVES || 0))
      );
      const eqOpeningRetained = registerSpecialLine(
        'EQ_OPENING_RETAINED_EARNINGS',
        base.opening.BS_RETAINED_EARNINGS || 0
      );
      const eqPriorRetainedChange = registerSpecialLine(
        'EQ_PRIOR_RETAINED_CHANGE',
        round2(retainedEarningsPrior - (base.opening.BS_RETAINED_EARNINGS || 0))
      );
      const eqNetProfitForYear = registerSpecialLine(
        'EQ_NET_PROFIT_FOR_YEAR',
        currentYearNetProfit
      );
      const eqDividends = registerSpecialLine('EQ_DIVIDENDS_DISTRIBUTIONS', 0);

      const closingCapital = round2(eqOpeningCapital + eqCapitalChange);
      const closingReserves = round2(eqOpeningReserves + eqReservesChange);
      const closingRetainedEarnings = round2(
        eqOpeningRetained + eqPriorRetainedChange + eqNetProfitForYear - Math.abs(eqDividends)
      );
      const totalOpeningEquity = round2(
        eqOpeningCapital + eqOpeningReserves + eqOpeningRetained
      );
      const totalClosingEquity = round2(
        closingCapital + closingReserves + closingRetainedEarnings
      );

      // 5. Financial Ratios (always derived from adjusted statement figures)
      const grossProfitMarginPct = netSales > 0 ? round2((grossProfit / netSales) * 100) : 0;
      const operatingProfitMarginPct =
        netSales > 0 ? round2((operatingProfit / netSales) * 100) : 0;
      const netProfitMarginPct =
        netSales > 0 ? round2((netProfitAfterTax / netSales) * 100) : 0;
      const currentRatio =
        totalCurrentLiabilities > 0
          ? round2(totalCurrentAssets / totalCurrentLiabilities)
          : 0;
      const quickRatio =
        totalCurrentLiabilities > 0
          ? round2((totalCurrentAssets - inventory) / totalCurrentLiabilities)
          : 0;
      const cashRatio =
        totalCurrentLiabilities > 0
          ? round2(cashAndEquivalents / totalCurrentLiabilities)
          : 0;
      const debtToAssetsPct =
        totalAssets > 0 ? round2((totalLiabilities / totalAssets) * 100) : 0;
      const debtToEquityPct =
        totalEquity !== 0 ? round2((totalLiabilities / Math.abs(totalEquity)) * 100) : 0;
      const returnOnAssetsPct =
        totalAssets > 0 ? round2((netProfitAfterTax / totalAssets) * 100) : 0;
      const returnOnEquityPct =
        totalEquity !== 0 ? round2((netProfitAfterTax / Math.abs(totalEquity)) * 100) : 0;
      const workingCapital = round2(totalCurrentAssets - totalCurrentLiabilities);

      return {
        incomeStatement: {
          operatingRevenue,
          salesReturns,
          netSales,
          netRevenue: netSales,
          cogs,
          grossProfit,
          sellingAndDistribution,
          generalAndAdmin,
          depreciation,
          totalOperatingExpenses,
          operatingProfit,
          financingCosts,
          fxGainsLosses,
          otherRevenues,
          otherExpenses,
          netProfitBeforeTax,
          incomeTax,
          netProfitAfterTax,
          netProfit: netProfitAfterTax,
          netIncome: netProfitAfterTax,
          totalRevenues: round2(netSales + otherRevenues + (fxGainsLosses > 0 ? fxGainsLosses : 0)),
          totalExpenses,
        },
        balanceSheet: {
          cashAndEquivalents,
          tradeReceivables,
          inventory,
          otherCurrentAssets,
          totalCurrentAssets,
          fixedAssetsNet,
          projectsUnderWay,
          intangibleAssets,
          otherNonCurrentAssets,
          totalNonCurrentAssets,
          totalAssets,
          tradePayables,
          taxAuthorityPayables,
          otherCurrentLiabilities,
          totalCurrentLiabilities,
          longTermLoans,
          otherNonCurrentLiabilities,
          totalNonCurrentLiabilities,
          totalLiabilities,
          paidUpCapital,
          reserves,
          retainedEarnings: retainedEarningsPrior,
          currentYearNetProfit,
          totalRetainedAndProfit,
          totalEquity,
          totalLiabilitiesAndEquity,
          balanceDifference,
          isBalanced,
          totals: {
            totalAssets,
            currentAssets: totalCurrentAssets,
            nonCurrentAssets: totalNonCurrentAssets,
            totalCurrentAssets,
            totalNonCurrentAssets,
            totalLiabilities,
            currentLiabilities: totalCurrentLiabilities,
            nonCurrentLiabilities: totalNonCurrentLiabilities,
            totalCurrentLiabilities,
            totalNonCurrentLiabilities,
            totalEquity,
            retainedEarnings: totalRetainedAndProfit,
            totalLiabilitiesAndEquity,
            balanceDifference,
            isBalanced,
          },
        },
        cashFlow: {
          netProfitBeforeTax: cfNetProfit,
          depreciationAddBack: cfDepreciation,
          workingCapitalChanges: cfWorkingCapital,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          netCashFlow,
          openingCash,
          endingCash,
          closingCash: endingCash,
          operatingActivities: {
            netIncome: cfNetProfit,
            depreciation: cfDepreciation,
            workingCapitalChanges: cfWorkingCapital,
            total: operatingCashFlow,
          },
          investingActivities: { total: investingCashFlow },
          financingActivities: { total: financingCashFlow },
        },
        equityStatement: {
          openingCapital: eqOpeningCapital,
          capitalChange: eqCapitalChange,
          closingCapital,
          openingReserves: eqOpeningReserves,
          reservesChange: eqReservesChange,
          closingReserves,
          openingRetainedEarnings: eqOpeningRetained,
          priorRetainedChange: eqPriorRetainedChange,
          netProfitForYear: eqNetProfitForYear,
          dividendsAndDistributions: eqDividends,
          closingRetainedEarnings,
          endingRetainedEarnings: closingRetainedEarnings,
          totalOpeningEquity,
          totalClosingEquity,
        },
        ratios: {
          grossProfitMarginPct,
          operatingProfitMarginPct,
          netProfitMarginPct,
          currentRatio,
          quickRatio,
          cashRatio,
          debtToAssetsPct,
          debtToEquityPct,
          returnOnAssetsPct,
          returnOnEquityPct,
          workingCapital,
        },
      };
    };

    const currentDerived = buildPeriodDerived('CURRENT', currentBase);
    const comparativeDerived = buildPeriodDerived('COMPARATIVE', comparativeBase);

    // Reconciliation panel metrics (Requirement ج-4: no hidden plug or auto-balancing)
    const assetsVsLiabilitiesEquityDiff = round2(
      currentDerived.balanceSheet.totalAssets -
        currentDerived.balanceSheet.totalLiabilitiesAndEquity
    );
    const isBalanceSheetBalanced = Math.abs(assetsVsLiabilitiesEquityDiff) < 0.02;

    const netProfitIncomeVsEquityDiff = round2(
      currentDerived.incomeStatement.netProfitAfterTax -
        currentDerived.equityStatement.netProfitForYear
    );
    const isNetProfitConsistent = Math.abs(netProfitIncomeVsEquityDiff) < 0.02;

    const cashFlowVsBalanceSheetCashDiff = round2(
      currentDerived.balanceSheet.cashAndEquivalents - currentDerived.cashFlow.endingCash
    );
    const isCashConsistent = Math.abs(cashFlowVsBalanceSheetCashDiff) < 0.02;

    // Build adjustment impact rows for internal report (Requirement ج-5)
    const adjustmentImpactReport: StatementAdjustmentImpactRow[] = [];
    let manualAdjustmentsNetImpact = 0;
    let manualAdjustmentsTotalAbsDelta = 0;

    for (const adj of adjustmentLayer?.adjustments || []) {
      if (!adj || !adj.lineKey) continue;
      const period: StatementAdjustmentPeriod =
        adj.period === 'COMPARATIVE' ? 'COMPARATIVE' : 'CURRENT';
      const baseMap = period === 'COMPARATIVE' ? comparativeBase.closing : currentBase.closing;
      const ledgerAmt = round2(
        adj.ledgerAmount !== undefined ? adj.ledgerAmount : baseMap[adj.lineKey] || 0
      );
      const overrideAmt = round2(Number(adj.overrideAmount) || 0);
      const delta = round2(overrideAmt - ledgerAmt);
      if (Math.abs(delta) < 0.001) continue;

      manualAdjustmentsNetImpact = round2(manualAdjustmentsNetImpact + delta);
      manualAdjustmentsTotalAbsDelta = round2(manualAdjustmentsTotalAbsDelta + Math.abs(delta));

      const meta = STATEMENT_LINE_LABELS_AR[adj.lineKey] || {
        labelAr: adj.lineKey,
        section: 'BALANCE_SHEET' as const,
      };

      let impactSummaryAr = `تأثير بمقدار ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} ج.م`;
      if (adj.lineKey.startsWith('IS_')) {
        const profitSign =
          adj.lineKey === 'IS_OPERATING_REVENUE' ||
          adj.lineKey === 'IS_OTHER_REVENUES' ||
          adj.lineKey === 'IS_FX_GAINS_LOSSES'
            ? delta
            : -delta;
        impactSummaryAr = `أثر على صافي الربح وحقوق الملكية: ${profitSign >= 0 ? '+' : ''}${profitSign.toLocaleString('en-US')} ج.م`;
      } else if (
        adj.lineKey === 'BS_CASH_EQUIVALENTS' ||
        adj.lineKey === 'BS_TRADE_RECEIVABLES' ||
        adj.lineKey === 'BS_INVENTORY' ||
        adj.lineKey === 'BS_OTHER_CURRENT_ASSETS' ||
        adj.lineKey === 'BS_FIXED_ASSETS' ||
        adj.lineKey === 'BS_PROJECTS_UNDER_WAY' ||
        adj.lineKey === 'BS_INTANGIBLE_ASSETS' ||
        adj.lineKey === 'BS_OTHER_NON_CURRENT_ASSETS'
      ) {
        impactSummaryAr = `أثر على إجمالي الأصول: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} ج.م`;
      } else if (adj.lineKey.startsWith('BS_')) {
        impactSummaryAr = `أثر على الالتزامات وحقوق الملكية: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} ج.م`;
      } else if (adj.lineKey.startsWith('CF_')) {
        impactSummaryAr = `أثر على رصيد النقدية بالتدفقات: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} ج.م`;
      } else if (adj.lineKey.startsWith('EQ_')) {
        impactSummaryAr = `أثر على إجمالي حقوق الملكية: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} ج.م`;
      }

      adjustmentImpactReport.push({
        lineKey: adj.lineKey,
        labelAr: meta.labelAr,
        section: meta.section,
        period,
        ledgerAmount: ledgerAmt,
        overrideAmount: overrideAmt,
        delta,
        diff: delta,
        reason: adj.reason || 'تعديل يدوي بمعرفة المدير',
        by: adj.by || 'مدير النظام',
        at: adj.at || adjustmentLayer.updatedAt,
        impactSummaryAr,
      });
    }

    const warnings: string[] = [];
    if (!isBalanceSheetBalanced) {
      warnings.push(
        `تحذير عدم تطابق الميزانية: إجمالي الأصول يختلف عن (الالتزامات + حقوق الملكية) بمقدار ${assetsVsLiabilitiesEquityDiff.toLocaleString('en-US')} ج.م.`
      );
    }
    if (!isNetProfitConsistent) {
      warnings.push(
        `تحذير عدم تطابق صافي الربح: صافي الربح بقائمة الدخل يختلف عن صافي الربح بقائمة حقوق الملكية بمقدار ${netProfitIncomeVsEquityDiff.toLocaleString('en-US')} ج.م.`
      );
    }
    if (!isCashConsistent) {
      warnings.push(
        `تحذير عدم تطابق النقدية: رصيد النقدية بالمركز المالي يختلف عن رصيد النقدية الختامي بقائمة التدفقات النقدية بمقدار ${cashFlowVsBalanceSheetCashDiff.toLocaleString('en-US')} ج.م.`
      );
    }

    const isAllMatched = Boolean(
      isBalanceSheetBalanced && isNetProfitConsistent && isCashConsistent
    );

    const reconciliation: StatementReconciliationSummary = {
      assetsVsLiabilitiesAndEquityDiff: assetsVsLiabilitiesEquityDiff,
      assetsVsLiabilitiesEquityDiff,
      balanceSheetDifference: assetsVsLiabilitiesEquityDiff,
      isBalanceSheetBalanced,

      netProfitIncomeVsEquityDiff,
      netProfitDifference: netProfitIncomeVsEquityDiff,
      isNetProfitConsistent,
      isNetProfitMatched: isNetProfitConsistent,

      cashFlowVsBalanceSheetCashDiff,
      cashDifference: cashFlowVsBalanceSheetCashDiff,
      isCashConsistent,
      isCashMatched: isCashConsistent,

      manualAdjustmentsCount: adjustmentImpactReport.length,
      manualAdjustmentsNetImpact,
      manualAdjustmentsTotalDelta: manualAdjustmentsNetImpact,
      manualAdjustmentsTotalAbsDelta,
      manualAdjustmentsTotalAbsolute: manualAdjustmentsTotalAbsDelta,
      manualAdjustmentsTotalAbsValue: manualAdjustmentsTotalAbsDelta,

      hasDiscrepancy: !isAllMatched,
      hasAnyDiscrepancy: !isAllMatched,
      isAllMatched,
      warnings,
    };

    // 6. Financial Notes (الإيضاحات المتممة) - linked by keys to StatementModel (Requirement د-5)
    const storedNotes = source.getStoredStatementNotes(cleanClientId, targetYear) || {};
    const noteTemplates: Array<{
      id: string;
      noteNumber: number;
      title: string;
      linkedLineKeys: string[];
      buildTemplate: (nums: Record<string, number>) => string;
    }> = [
      {
        id: 'NOTE_CASH',
        noteNumber: 4,
        title: 'النقدية بالصندوق ولدى البنوك',
        linkedLineKeys: ['BS_CASH_EQUIVALENTS'],
        buildTemplate: (nums) =>
          `بلغ رصيد النقدية بالصندوق والحسابات الجارية والودائع لدى البنوك في نهاية الفترة المالية (${currentBounds.endDate}) مبلغ ${(nums.BS_CASH_EQUIVALENTS || 0).toLocaleString('en-US')} ج.م (مقارنة بمبلغ ${(nums.COMP_BS_CASH_EQUIVALENTS || 0).toLocaleString('en-US')} ج.م عن الفترة المقارنة).`,
      },
      {
        id: 'NOTE_RECEIVABLES',
        noteNumber: 5,
        title: 'العملاء والمدينون والأرصدة المدينة الأخرى',
        linkedLineKeys: ['BS_TRADE_RECEIVABLES', 'BS_OTHER_CURRENT_ASSETS'],
        buildTemplate: (nums) =>
          `يتكون هذا البند من صافي مديونية العملاء التجاريين بمبلغ ${(nums.BS_TRADE_RECEIVABLES || 0).toLocaleString('en-US')} ج.م، بالإضافة إلى الأرصدة المدينة والأصول المتداولة الأخرى بمبلغ ${(nums.BS_OTHER_CURRENT_ASSETS || 0).toLocaleString('en-US')} ج.م ليصل الإجمالي إلى ${round2((nums.BS_TRADE_RECEIVABLES || 0) + (nums.BS_OTHER_CURRENT_ASSETS || 0)).toLocaleString('en-US')} ج.م.`,
      },
      {
        id: 'NOTE_INVENTORY',
        noteNumber: 6,
        title: 'المخزون السلعي والخامات',
        linkedLineKeys: ['BS_INVENTORY'],
        buildTemplate: (nums) =>
          `يُقاس المخزون في نهاية الفترة بالتكلفة أو صافي القيمة الاستردادية أيهما أقل طبقاً لمعيار المحاسبة المصري رقم (2)، وبلغ رصيد المخزون في ${currentBounds.endDate} مبلغ ${(nums.BS_INVENTORY || 0).toLocaleString('en-US')} ج.م.`,
      },
      {
        id: 'NOTE_FIXED_ASSETS',
        noteNumber: 7,
        title: 'الأصول الثابتة ومشروعات تحت التنفيذ والإهلاك',
        linkedLineKeys: ['BS_FIXED_ASSETS', 'BS_PROJECTS_UNDER_WAY', 'IS_DEPRECIATION'],
        buildTemplate: (nums) =>
          `بلغ صافي القيمة الدفترية للأصول الثابتة بعد خصم مجمع الإهلاك مبلغ ${(nums.BS_FIXED_ASSETS || 0).toLocaleString('en-US')} ج.م، ومشروعات تحت التنفيذ بمبلغ ${(nums.BS_PROJECTS_UNDER_WAY || 0).toLocaleString('en-US')} ج.م، وقد بلغ عبء إهلاك العام المحمّل على قائمة الدخل مبلغ ${(nums.IS_DEPRECIATION || 0).toLocaleString('en-US')} ج.م.`,
      },
      {
        id: 'NOTE_PAYABLES_TAX',
        noteNumber: 8,
        title: 'الموردون والدائنون ومصلحة الضرائب والالتزامات المتداولة',
        linkedLineKeys: [
          'BS_TRADE_PAYABLES',
          'BS_TAX_AUTHORITY_PAYABLES',
          'BS_OTHER_CURRENT_LIABILITIES',
        ],
        buildTemplate: (nums) =>
          `يشمل البند أرصدة الموردين والدائنين التجاريين بمبلغ ${(nums.BS_TRADE_PAYABLES || 0).toLocaleString('en-US')} ج.م، ومستحقات مصلحة الضرائب والجهات السيادية بمبلغ ${(nums.BS_TAX_AUTHORITY_PAYABLES || 0).toLocaleString('en-US')} ج.م، والتزامات متداولة أخرى بمبلغ ${(nums.BS_OTHER_CURRENT_LIABILITIES || 0).toLocaleString('en-US')} ج.م.`,
      },
      {
        id: 'NOTE_CAPITAL_EQUITY',
        noteNumber: 9,
        title: 'رأس المال المدفوع وحقوق الملكية والأرباح المحتجزة',
        linkedLineKeys: [
          'BS_PAID_UP_CAPITAL',
          'BS_RESERVES',
          'BS_RETAINED_EARNINGS',
          'EQ_NET_PROFIT_FOR_YEAR',
        ],
        buildTemplate: (nums) =>
          `بلغ رأس المال المدفوع ${(nums.BS_PAID_UP_CAPITAL || 0).toLocaleString('en-US')} ج.م، والاحتياطيات ${(nums.BS_RESERVES || 0).toLocaleString('en-US')} ج.م، والأرباح المرحلة ${(nums.BS_RETAINED_EARNINGS || 0).toLocaleString('en-US')} ج.م، وصافي نتيجة العام ${(nums.EQ_NET_PROFIT_FOR_YEAR || 0).toLocaleString('en-US')} ج.م، ليبلغ إجمالي حقوق الملكية ${currentDerived.balanceSheet.totalEquity.toLocaleString('en-US')} ج.م.`,
      },
      {
        id: 'NOTE_REVENUES_COGS',
        noteNumber: 10,
        title: 'إيرادات النشاط وتكلفة المبيعات ومجمل الربح',
        linkedLineKeys: [
          'IS_OPERATING_REVENUE',
          'IS_SALES_RETURNS_ALLOWANCES',
          'IS_COGS',
        ],
        buildTemplate: (nums) =>
          `بلغ إجمالي إيرادات النشاط ${(nums.IS_OPERATING_REVENUE || 0).toLocaleString('en-US')} ج.م، وصافي المبيعات بعد المردودات والخصومات ${currentDerived.incomeStatement.netSales.toLocaleString('en-US')} ج.م، وتكلفة المبيعات ${(nums.IS_COGS || 0).toLocaleString('en-US')} ج.م، ليبلغ مجمل الربح ${currentDerived.incomeStatement.grossProfit.toLocaleString('en-US')} ج.م (${currentDerived.ratios.grossProfitMarginPct}%).`,
      },
      {
        id: 'NOTE_EXPENSES',
        noteNumber: 11,
        title: 'المصروفات العمومية والإدارية والبيعية والأعباء التمويلية',
        linkedLineKeys: [
          'IS_SELLING_DISTRIBUTION',
          'IS_GENERAL_ADMIN',
          'IS_FINANCING_COSTS',
          'IS_OTHER_EXPENSES',
        ],
        buildTemplate: (nums) =>
          `بلغت المصروفات العمومية والإدارية ${(nums.IS_GENERAL_ADMIN || 0).toLocaleString('en-US')} ج.م، ومصروفات البيع والتوزيع ${(nums.IS_SELLING_DISTRIBUTION || 0).toLocaleString('en-US')} ج.م، والأعباء التمويلية ${(nums.IS_FINANCING_COSTS || 0).toLocaleString('en-US')} ج.م، والمصروفات الأخرى ${(nums.IS_OTHER_EXPENSES || 0).toLocaleString('en-US')} ج.م.`,
      },
    ];

    const notes: StatementNoteRecord[] = noteTemplates.map((tpl) => {
      const computedNumbers: Record<string, number> = {};
      for (const key of tpl.linkedLineKeys) {
        computedNumbers[key] = round2(linesRecord[key]?.currentAmount || 0);
        computedNumbers[`COMP_${key}`] = round2(linesRecord[key]?.comparativeAmount || 0);
      }

      const saved = storedNotes[tpl.id] || {};
      const manualParagraph = saved.manualParagraph || '';
      const baseline = saved.baselineNumbers;
      let needsReview = false;

      if (baseline && Object.keys(baseline).length > 0) {
        for (const key of tpl.linkedLineKeys) {
          if (Math.abs((computedNumbers[key] || 0) - (baseline[key] || 0)) > 0.01) {
            needsReview = true;
            break;
          }
        }
      } else if (manualParagraph.trim().length > 0) {
        // If there is a manual paragraph without confirmed baseline and one of the linked keys has a manual adjustment
        for (const key of tpl.linkedLineKeys) {
          if (linesRecord[key]?.isCurrentAdjusted) {
            needsReview = true;
            break;
          }
        }
      } else {
        // Even if no manual paragraph was edited yet, if a linked line was manually adjusted after last confirmation
        for (const key of tpl.linkedLineKeys) {
          const adjAt = linesRecord[key]?.currentAdjustment?.at;
          if (adjAt && (!saved.lastConfirmedAt || adjAt > saved.lastConfirmedAt)) {
            needsReview = true;
            break;
          }
        }
      }

      return {
        id: tpl.id,
        noteNumber: tpl.noteNumber,
        title: saved.customTitle || tpl.title,
        linkedLineKeys: tpl.linkedLineKeys,
        renderedTemplateText: tpl.buildTemplate(computedNumbers),
        manualParagraph,
        computedNumbers,
        baselineNumbers: baseline,
        needsReview,
        lastConfirmedAt: saved.lastConfirmedAt,
        lastConfirmedBy: saved.lastConfirmedBy,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
      };
    });

    const auditorReportNumbers = {
      totalAssets: currentDerived.balanceSheet.totalAssets,
      totalLiabilities: currentDerived.balanceSheet.totalLiabilities,
      totalEquity: currentDerived.balanceSheet.totalEquity,
      totalRevenues: currentDerived.incomeStatement.totalRevenues,
      netSales: currentDerived.incomeStatement.netSales,
      grossProfit: currentDerived.incomeStatement.grossProfit,
      netProfitBeforeTax: currentDerived.incomeStatement.netProfitBeforeTax,
      netProfit: currentDerived.incomeStatement.netProfitAfterTax,
      operatingCashFlow: currentDerived.cashFlow.operatingCashFlow,
      endingCash: currentDerived.cashFlow.endingCash,
      comparativeTotalAssets: comparativeDerived.balanceSheet.totalAssets,
      comparativeTotalRevenues: comparativeDerived.incomeStatement.totalRevenues,
      comparativeNetProfit: comparativeDerived.incomeStatement.netProfitAfterTax,
      fiscalYearStart: currentBounds.startDate,
      fiscalYearEnd: currentBounds.endDate,
      comparativeYear,
    };

    return {
      clientId: cleanClientId,
      clientName: client?.name || '',
      fiscalYear: targetYear,
      comparativeYear,
      version: resolvedVersion,
      status: snapshotForVersion?.status || 'DRAFT',
      fiscalYearBounds: currentBounds,
      comparativeBounds,
      adjustmentLayer,
      lines: Object.values(linesRecord) as StatementLineValue[],
      linesRecord,
      linesMap: linesRecord,
      incomeStatement: currentDerived.incomeStatement,
      balanceSheet: currentDerived.balanceSheet,
      cashFlow: currentDerived.cashFlow,
      equityStatement: currentDerived.equityStatement,
      comparative: {
        fiscalYear: comparativeYear,
        incomeStatement: comparativeDerived.incomeStatement,
        balanceSheet: comparativeDerived.balanceSheet,
        cashFlow: comparativeDerived.cashFlow,
        equityStatement: comparativeDerived.equityStatement,
        ratios: comparativeDerived.ratios,
      },
      ratios: currentDerived.ratios,
      reconciliation,
      notes,
      auditorReportNumbers,
      adjustmentImpactReport,
      adjustmentsImpactReport: adjustmentImpactReport,
      trialBalance: currentTB,
      comparativeTrialBalance: comparativeTB,
      unmappedAccounts: rawCurrentStatements.unmappedAccounts,
    };
  }
}

export function buildStatementModel(
  clientId: string,
  fiscalYear: number,
  version?: number,
  customSource?: StatementModelDataSource
): StatementModel {
  return AccountingCalculator.buildStatementModel(clientId, fiscalYear, version, customSource);
}

