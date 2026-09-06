import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  TrendingUp,
  Wallet,
  Scale,
  Sparkles,
  Edit3,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Info,
  DollarSign,
  Layers,
  ArrowRightLeft,
  Globe,
  Lock,
  Unlock,
  Languages,
  Coins,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { CurrencyCode } from '../types';
import { currencyService, formatFinancialCurrency, SUPPORTED_CURRENCIES } from '../utils/currencyService';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
} from '../utils/accountingCalculations';
import {
  generateQrCodeSvg,
  buildFinancialStatementsQrText,
  parseFlexibleNumber,
} from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { numberToEnglishWords } from '../utils/numberToWordsEnglish';
import { FINANCIAL_TERMS } from '../utils/financialBilingualDictionary';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { CompanyHeaderSelector } from './common/CompanyHeaderSelector';
import { ActionButton } from './common/ActionButton';
import { ActionMenu } from './common/ActionMenu';
import { BalanceSheetTable } from './financial/BalanceSheetTable';
import { CurrencyRevaluationWizardModal } from './accounting/CurrencyRevaluationWizardModal';
import { YearEndClosingWizardModal } from './accounting/YearEndClosingWizardModal';
import { AutoArchiverService } from '../services/AutoArchiver';

interface FinancialStatementsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  onNavigateToExchangeRates?: () => void;
}

export interface CustomFinancialLine {
  id: string;
  name: string;
  noteRef: string;
  section:
    | 'NON_CURRENT_ASSETS'
    | 'CURRENT_ASSETS'
    | 'EQUITY'
    | 'NON_CURRENT_LIAB'
    | 'CURRENT_LIAB'
    | 'IS_REVENUE'
    | 'IS_COGS'
    | 'IS_EXPENSES'
    | 'IS_OTHER_REV'
    | 'CF_OPERATING'
    | 'CF_INVESTING'
    | 'CF_FINANCING';
  amount: number;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  state,
  fiscalYear: initialFiscalYear,
  onNavigateToExchangeRates,
}) => {
  const [statementTab, setStatementTab] = useState<'BALANCE_SHEET' | 'INCOME' | 'CASH_FLOW' | 'NOTES'>('BALANCE_SHEET');
  const [fiscalYear, setFiscalYear] = useState(initialFiscalYear || 2026);
  const [statementLanguage, setStatementLanguage] = useState<'ar' | 'en'>('ar');
  const [isFxRevaluationModalOpen, setIsFxRevaluationModalOpen] = useState(false);
  const [isYearClosingModalOpen, setIsYearClosingModalOpen] = useState(false);

  // Fiscal period lock status for the selected year
  const isPeriodLocked = useMemo(() => {
    return db.isPeriodLocked(fiscalYear);
  }, [fiscalYear, state.fiscalPeriodLocks]);
  
  // Multi-Currency & Reporting Currency State (EAS 13 / IAS 21)
  const [reportingCurrency, setReportingCurrency] = useState<CurrencyCode>(
    state.preferences.reportingCurrency || 'EGP'
  );
  const [currencyDisplayMode, setCurrencyDisplayMode] = useState<'REPORTING' | 'ORIGINAL' | 'DUAL'>('REPORTING');

  // Active exchange rate for fiscal year closing date
  const reportingExchangeRate = useMemo(() => {
    if (reportingCurrency === 'EGP') return 1;
    const closingDate = `${fiscalYear}-12-31`;
    return db.getExchangeRateValue(reportingCurrency, closingDate);
  }, [reportingCurrency, fiscalYear, state.exchangeRates]);

  const currencyInfo = currencyService.getCurrencyInfo(reportingCurrency);

  // Dynamic currency-aware formatter for Income Statement & Cash Flows
  const formatEgyptianCurrency = (amount: number | undefined | null, useParen: boolean = false): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return formatFinancialCurrency(0, currencyDisplayMode === 'ORIGINAL' ? 'EGP' : reportingCurrency, useParen);
    }
    const val = currencyDisplayMode === 'ORIGINAL' || reportingCurrency === 'EGP' ? amount : amount / reportingExchangeRate;
    return formatFinancialCurrency(val, currencyDisplayMode === 'ORIGINAL' ? 'EGP' : reportingCurrency, useParen);
  };

  // Flexibility & In-place number editing states
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [customLines, setCustomLines] = useState<CustomFinancialLine[]>([]);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [archivedSuccessNotice, setArchivedSuccessNotice] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Add line modal state
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineSection, setNewLineSection] = useState<CustomFinancialLine['section']>('CURRENT_ASSETS');
  const [newLineAmount, setNewLineAmount] = useState<string>('50000.00');
  const [newLineNoteRef, setNewLineNoteRef] = useState('إيضاح متمم');

  const activeClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);

  // Compute base ledger figures
  const relevantEntries = useMemo(() => {
    return state.activeClientContext?.clientId
      ? state.journalEntries.filter((e) => !e.clientId || e.clientId === state.activeClientContext?.clientId)
      : state.journalEntries;
  }, [state.journalEntries, state.activeClientContext]);

  const calculatedAccounts = useMemo(() => computeAccountBalances(state.accounts, relevantEntries), [state.accounts, relevantEntries]);
  const baseIncomeData = useMemo(() => generateIncomeStatement(calculatedAccounts), [calculatedAccounts]);
  const baseBalanceData = useMemo(() => generateBalanceSheet(calculatedAccounts, baseIncomeData), [calculatedAccounts, baseIncomeData]);
  const baseCashFlowData = useMemo(() => generateCashFlowStatement(baseIncomeData, baseBalanceData), [baseIncomeData, baseBalanceData]);

  // Helper to get value: either overridden or from base calculation
  const getVal = (key: string, defaultVal: number): number => {
    if (overrides[key] !== undefined) {
      return overrides[key];
    }
    return defaultVal;
  };

  const setVal = (key: string, rawVal: string | number) => {
    const num = parseFlexibleNumber(rawVal);
    setOverrides((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  // Helper to get custom items for a given section
  const getSectionCustomItems = (section: CustomFinancialLine['section']) => {
    return customLines.filter((l) => l.section === section);
  };

  const getSectionCustomSum = (section: CustomFinancialLine['section']) => {
    return getSectionCustomItems(section).reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // 1. RECALCULATED INCOME STATEMENT FIGURES
  const computedIncome = useMemo(() => {
    const revenues = getVal('is_revenues', baseIncomeData.revenuesTotal) + getSectionCustomSum('IS_REVENUE');
    const cogs = getVal('is_cogs', baseIncomeData.costOfGoodsSold) + getSectionCustomSum('IS_COGS');
    const grossProfit = revenues - cogs;

    const sellingExp = getVal('is_sellingExp', baseIncomeData.sellingAndMarketingExpenses);
    const adminExp = getVal('is_adminExp', baseIncomeData.administrativeExpenses);
    const depExp = getVal('is_depExp', baseIncomeData.depreciationExpense);
    const customExp = getSectionCustomSum('IS_EXPENSES');
    const totalOperatingExp = sellingExp + adminExp + depExp + customExp;

    const operatingProfit = grossProfit - totalOperatingExp;
    const financeCosts = getVal('is_financeCosts', baseIncomeData.financeCosts);
    const otherIncomes = getVal('is_otherIncomes', baseIncomeData.otherIncomes) + getSectionCustomSum('IS_OTHER_REV');

    const profitBeforeTax = operatingProfit - financeCosts + otherIncomes;
    const taxExpense = getVal('is_taxExpense', baseIncomeData.taxExpense);
    const netProfitAfterTax = profitBeforeTax - taxExpense;

    return {
      revenues,
      cogs,
      grossProfit,
      sellingExp,
      adminExp,
      depExp,
      customExp,
      totalOperatingExp,
      operatingProfit,
      financeCosts,
      otherIncomes,
      profitBeforeTax,
      taxExpense,
      netProfitAfterTax,
    };
  }, [overrides, customLines, baseIncomeData]);

  // 2. RECALCULATED BALANCE SHEET FIGURES
  const computedBalance = useMemo(() => {
    // Non-Current Assets
    const ppe = getVal('bs_ppe', baseBalanceData.nonCurrentAssets.propertyPlantEquipment);
    const accDep = getVal('bs_accDep', baseBalanceData.nonCurrentAssets.accumulatedDepreciation);
    const customNonCurrentAssets = getSectionCustomSum('NON_CURRENT_ASSETS');
    const totalNonCurrentAssets = ppe - accDep + customNonCurrentAssets;

    // Current Assets
    const inventory = getVal('bs_inventory', baseBalanceData.currentAssets.inventory);
    const receivables = getVal('bs_receivables', baseBalanceData.currentAssets.tradeReceivables);
    const notesReceivable = getVal('bs_notesReceivable', baseBalanceData.currentAssets.notesReceivable);
    const taxDebit = getVal('bs_taxDebit', baseBalanceData.currentAssets.whtTaxDebit + baseBalanceData.currentAssets.vatInputTax);
    const prepayments = getVal('bs_prepayments', baseBalanceData.currentAssets.prepaymentsAndOther);
    const cashAndBanks = getVal('bs_cash', baseBalanceData.currentAssets.cashAndBanks);
    const customCurrentAssets = getSectionCustomSum('CURRENT_ASSETS');
    const totalCurrentAssets = inventory + receivables + notesReceivable + taxDebit + prepayments + cashAndBanks + customCurrentAssets;

    const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

    // Equity
    const capital = getVal('bs_capital', baseBalanceData.equity.paidUpCapital);
    const legalReserve = getVal('bs_legalReserve', baseBalanceData.equity.legalReserve);
    const retainedEarnings = getVal('bs_retainedEarnings', baseBalanceData.equity.retainedEarnings);
    const currentProfit = getVal('bs_currentProfit', computedIncome.netProfitAfterTax);
    const partnersCurrent = getVal('bs_partnersCurrent', baseBalanceData.equity.partnersCurrentAccount);
    const customEquity = getSectionCustomSum('EQUITY');
    const totalEquity = capital + legalReserve + retainedEarnings + currentProfit + partnersCurrent + customEquity;

    // Non-Current Liabilities
    const longTermLoans = getVal('bs_longLoans', baseBalanceData.nonCurrentLiabilities.longTermLoans);
    const customNonCurrentLiab = getSectionCustomSum('NON_CURRENT_LIAB');
    const totalNonCurrentLiabilities = longTermLoans + customNonCurrentLiab;

    // Current Liabilities
    const payables = getVal('bs_payables', baseBalanceData.currentLiabilities.tradePayables);
    const notesPayable = getVal('bs_notesPayable', baseBalanceData.currentLiabilities.notesPayable);
    const taxesPayable = getVal('bs_taxesPayable', baseBalanceData.currentLiabilities.vatOutputTax + baseBalanceData.currentLiabilities.payrollTaxPayable + baseBalanceData.currentLiabilities.whtPayable);
    const socialInsurance = getVal('bs_socialInsurance', baseBalanceData.currentLiabilities.socialInsurancePayable);
    const accruedExpenses = getVal('bs_accruedExpenses', baseBalanceData.currentLiabilities.accruedExpenses);
    const customCurrentLiab = getSectionCustomSum('CURRENT_LIAB');
    const totalCurrentLiabilities = payables + notesPayable + taxesPayable + socialInsurance + accruedExpenses + customCurrentLiab;

    const totalEquityAndLiabilities = totalEquity + totalNonCurrentLiabilities + totalCurrentLiabilities;
    const balanceDifference = totalAssets - totalEquityAndLiabilities;

    return {
      nonCurrentAssets: {
        ppe,
        accDep,
        totalNonCurrentAssets,
      },
      currentAssets: {
        inventory,
        receivables,
        notesReceivable,
        taxDebit,
        prepayments,
        cashAndBanks,
        totalCurrentAssets,
      },
      totalAssets,
      equity: {
        capital,
        legalReserve,
        retainedEarnings,
        currentProfit,
        partnersCurrent,
        totalEquity,
      },
      nonCurrentLiabilities: {
        longTermLoans,
        totalNonCurrentLiabilities,
      },
      currentLiabilities: {
        payables,
        notesPayable,
        taxesPayable,
        socialInsurance,
        accruedExpenses,
        totalCurrentLiabilities,
      },
      totalEquityAndLiabilities,
      balanceDifference,
    };
  }, [overrides, customLines, baseBalanceData, computedIncome.netProfitAfterTax]);

  // 3. RECALCULATED CASH FLOW FIGURES
  const computedCashFlow = useMemo(() => {
    const netProfit = getVal('cf_netProfit', computedIncome.profitBeforeTax);
    const depAdj = getVal('cf_depAdj', computedIncome.depExp);
    const chgReceivables = getVal('cf_chgRec', baseCashFlowData.operatingCashFlow.changeInReceivables);
    const chgInventory = getVal('cf_chgInv', baseCashFlowData.operatingCashFlow.changeInInventory);
    const chgPayables = getVal('cf_chgPay', baseCashFlowData.operatingCashFlow.changeInPayables);
    const taxPaid = getVal('cf_taxPaid', baseCashFlowData.operatingCashFlow.taxPaid);
    const customOp = getSectionCustomSum('CF_OPERATING');

    const netOperatingCash = netProfit + depAdj + chgReceivables + chgInventory + chgPayables + taxPaid + customOp;

    const purchaseAssets = getVal('cf_purchaseAssets', baseCashFlowData.investingCashFlow.purchaseOfFixedAssets);
    const customInv = getSectionCustomSum('CF_INVESTING');
    const netInvestingCash = purchaseAssets + customInv;

    const financingCash = getVal('cf_financingCash', baseCashFlowData.financingCashFlow.netFinancingCash);
    const customFin = getSectionCustomSum('CF_FINANCING');
    const netFinancingCash = financingCash + customFin;

    const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;
    const beginningCash = getVal('cf_beginningCash', baseCashFlowData.beginningCash);
    const endingCash = beginningCash + netChangeInCash;

    return {
      netProfit,
      depAdj,
      chgReceivables,
      chgInventory,
      chgPayables,
      taxPaid,
      netOperatingCash,
      purchaseAssets,
      netInvestingCash,
      netFinancingCash,
      netChangeInCash,
      beginningCash,
      endingCash,
    };
  }, [overrides, customLines, computedIncome, baseCashFlowData]);

  // Handle adding custom line
  const handleAddCustomLine = () => {
    if (!newLineName.trim()) return;
    const item: CustomFinancialLine = {
      id: `c_${Date.now()}`,
      name: newLineName.trim(),
      section: newLineSection,
      noteRef: newLineNoteRef.trim() || 'إيضاح متمم',
      amount: parseFlexibleNumber(newLineAmount),
    };
    setCustomLines((prev) => [...prev, item]);
    setNewLineName('');
    setNewLineAmount('50000.00');
    setNewLineNoteRef('إيضاح متمم');
    setIsAddLineModalOpen(false);
  };

  // Reset to original ledger
  const handleResetToLedger = () => {
    if (window.confirm('هل تريد استعادة جميع القيم الأصلية المحسوبة تلقائياً من دفاتر القيود والحسابات؟')) {
      setOverrides({});
      setCustomLines([]);
    }
  };

  const handleAutoArchiveFinancials = () => {
    setIsArchiving(true);
    try {
      const activeClientId = activeClient?.id || state.clients[0]?.id;
      const res = AutoArchiverService.archiveDocument({
        clientId: activeClientId,
        fiscalYear,
        category: 'FINANCIAL_STATEMENTS',
        documentType: 'FINANCIAL_REPORT',
        title: `قوائم مالية وحسابات ختامية معتمدة لسنة ${fiscalYear}`,
        dataPayload: {
          fiscalYear,
          currency: reportingCurrency,
          incomeStatement: computedIncome,
          balanceSheet: computedBalance,
          cashFlowStatement: computedCashFlow,
          customLines,
          overrides,
          certifiedAt: new Date().toISOString(),
        },
        summary: {
          totalAssets: computedBalance.totalAssets,
          totalLiabilities: computedBalance.totalLiabilities,
          totalEquity: computedBalance.totalEquity,
          netProfit: computedIncome.netProfitAfterTax,
          revenues: computedIncome.revenues,
          currency: reportingCurrency,
        },
        notes: `أرشفة آلية معتمدة للقوائم المالية لسنة ${fiscalYear} للعميل: ${activeClient?.name || 'الشركة المصرية'}`,
      });

      if (res.success && res.timestampCode) {
        setArchivedSuccessNotice(
          `تمت الأرشفة الآلية للقوائم المالية بنجاح في أرشيف العميل! كود التوثيق المعتمد: [${res.timestampCode}]`
        );
        setTimeout(() => setArchivedSuccessNotice(null), 8000);
      } else {
        alert('تعذر إتمام الأرشفة: ' + (res.error || 'خطأ غير متوقع'));
      }
    } catch (e: any) {
      alert('خطأ أثناء الأرشفة: ' + e?.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const profile = state.officeProfile;
  const displayCompanyName = activeClient?.name || 'شركة النيل للصناعات الهندسية والتجارة (ش.م.م)';
  const displayCR = activeClient?.commercialRegistrationNo || '148293 جنوب القاهرة';
  const displayTaxCard = activeClient?.taxCardNo || '489-201-987';
  const displayTaxOffice = activeClient?.taxOffice || 'مأمورية ضرائب كبار الممولين / شركات الأموال';

  const qrPayload = buildFinancialStatementsQrText({
    auditorName: profile.auditorName,
    licenseNumber: profile.licenseNumber,
    companyName: displayCompanyName,
    fiscalYear,
    totalAssets: computedBalance.totalAssets,
    netProfit: computedIncome.netProfitAfterTax,
  });

  const hasModifications = Object.keys(overrides).length > 0 || customLines.length > 0;

  return (
    <>
      <UnifiedScreenCard
        id="financial-statements-unified-card"
        title="القوائم المالية والحسابات الختامية"
        badge="معايير EAS / IFRS"
        badgeVariant="emerald"
        actionsSlot={
          <div className="flex items-center gap-1.5 flex-wrap">
            <CompanyHeaderSelector
              state={state}
              title="الشركة:"
              allOptionLabel="شركة النيل للصناعات الهندسية"
            />

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="text-[11px] text-slate-500">السنة:</span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="bg-transparent font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>

            {/* Unified ActionMenu for Financial Statements */}
            <ActionMenu
              title="إجراءات"
              triggerType="three_dots_vertical"
              size="sm"
              align="left"
              items={[
                {
                  id: 'toggle-edit',
                  label: isEditMode ? 'إيقاف التعديل' : 'تعديل الأرقام',
                  icon: Edit3,
                  onClick: () => setIsEditMode(!isEditMode),
                },
                ...(isEditMode
                  ? [
                      {
                        id: 'add-line',
                        label: 'إضافة بند مالي مخصص',
                        icon: Plus,
                        onClick: () => setIsAddLineModalOpen(true),
                      },
                    ]
                  : []),
                ...(hasModifications
                  ? [
                      {
                        id: 'reset-ledger',
                        label: 'استعادة أرقام الدفاتر الأصلية',
                        icon: RotateCcw,
                        variant: 'danger' as const,
                        onClick: handleResetToLedger,
                      },
                    ]
                  : []),
                {
                  id: 'auto-archive',
                  label: isArchiving ? 'جاري الأرشفة...' : 'أرشفة القوائم المالية',
                  icon: ShieldCheck,
                  onClick: handleAutoArchiveFinancials,
                },
                {
                  id: 'fx-wizard',
                  label: 'فروق العملة (EAS 13)',
                  icon: Coins,
                  onClick: () => setIsFxRevaluationModalOpen(true),
                },
                {
                  id: 'year-closing',
                  label: isPeriodLocked ? 'إدارة إقفال السنة' : 'الإقفال السنوي',
                  icon: isPeriodLocked ? Unlock : Lock,
                  onClick: () => setIsYearClosingModalOpen(true),
                },
              ]}
            />
          </div>
        }
      >
        <div className="space-y-3.5">
          {/* AutoArchive Success Notice */}
          {archivedSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl shadow-sm flex items-center justify-between text-emerald-900 font-bold text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{archivedSuccessNotice}</span>
              </div>
              <button
                onClick={() => setArchivedSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Streamlined Multi-Currency & Language Ribbon */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>العملة:</span>
              </div>

              {/* Compact Currency Dropdown / Quick Buttons */}
              <div className="flex items-center gap-1">
                {(['EGP', 'USD', 'EUR', 'SAR'] as CurrencyCode[]).map((code) => {
                  const info = currencyService.getCurrencyInfo(code);
                  const isSelected = reportingCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setReportingCurrency(code)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{info.flag}</span>
                      <span>{code}</span>
                    </button>
                  );
                })}

                <select
                  value={reportingCurrency}
                  onChange={(e) => setReportingCurrency(e.target.value as CurrencyCode)}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="" disabled>باقي العملات...</option>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {reportingCurrency !== 'EGP' && (
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  1 {reportingCurrency} = {reportingExchangeRate.toFixed(2)} ج.م
                </span>
              )}
            </div>

            {/* Language Toggle & Period Lock Pill */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatementLanguage('ar')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statementLanguage === 'ar'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  عربي
                </button>
                <button
                  type="button"
                  onClick={() => setStatementLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statementLanguage === 'en'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>

              {isPeriodLocked && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>السنة مقفلة</span>
                </span>
              )}
            </div>
          </div>

      {/* Tabs Selector */}
      <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setStatementTab('BALANCE_SHEET')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            statementTab === 'BALANCE_SHEET'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>1. المركز المالي (Balance Sheet)</span>
        </button>

        <button
          onClick={() => setStatementTab('INCOME')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            statementTab === 'INCOME'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>2. الدخل الشامل (Income Statement)</span>
        </button>

        <button
          onClick={() => setStatementTab('CASH_FLOW')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            statementTab === 'CASH_FLOW'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>3. التدفقات النقدية (Cash Flows)</span>
        </button>

        <button
          onClick={() => setStatementTab('NOTES')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            statementTab === 'NOTES'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>4. الإيضاحات والسياسات المحاسبية</span>
        </button>
      </div>

      {/* Main Statement Document Container */}
      <div
        id="financial-statements-container"
        data-printable="true"
        dir={statementLanguage === 'en' ? 'ltr' : 'rtl'}
        style={{ letterSpacing: 'normal' }}
        className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:shadow-none print:border-none ${
          statementLanguage === 'en' ? 'font-sans text-left' : "font-['Cairo',sans-serif] text-right"
        }`}
      >
        {/* Official Header with Auditor & Client Name */}
        <div className={`border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${statementLanguage === 'en' ? 'text-left' : 'text-center sm:text-right'}`}>
          <div>
            <div className="text-xs text-slate-600 font-bold" style={{ letterSpacing: 'normal' }}>
              {statementLanguage === 'en' ? 'Auditor / Accounting Firm: ' : ''}{profile.firmName} / {profile.auditorName}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {displayCompanyName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {statementLanguage === 'en'
                ? `CR: ${displayCR} • Tax Card: ${displayTaxCard} • Tax Authority Office: ${displayTaxOffice}`
                : `سجل تجاري: ${displayCR} • بطاقة ضريبية: ${displayTaxCard} • المأمورية: ${displayTaxOffice}`}
            </p>
          </div>

          <div className={statementLanguage === 'en' ? 'text-right' : 'text-center sm:text-left'}>
            <div className="inline-block bg-slate-100 border border-slate-300 rounded-xl px-4 py-2">
              <div className="text-[11px] font-bold text-slate-500">
                {statementLanguage === 'en' ? 'Audited Financial Statements' : 'القوائم المالية المدققة'}
              </div>
              <div className="text-sm font-black text-emerald-900">
                {statementLanguage === 'en'
                  ? `For the Year Ended 31 Dec ${fiscalYear}`
                  : `عن السنة المنتهية في 31 ديسمبر ${fiscalYear}`}
              </div>
              <div className="text-[10px] text-slate-500 font-bold">
                {currencyDisplayMode === 'ORIGINAL'
                  ? (statementLanguage === 'en' ? 'Values in Egyptian Pounds (EGP)' : 'القيم بالجنيه المصري (EGP)')
                  : (statementLanguage === 'en'
                      ? `Values in ${currencyInfo.nameEn} (${reportingCurrency} ${currencyInfo.symbol})`
                      : `القيم بـ ${currencyInfo.nameAr} (${reportingCurrency} ${currencyInfo.symbol})`)}
              </div>
              {reportingCurrency !== 'EGP' && currencyDisplayMode !== 'ORIGINAL' && (
                <div className="text-[9px] text-blue-700 font-mono mt-0.5">
                  1 {reportingCurrency} = {reportingExchangeRate.toFixed(2)} EGP (EAS 13 / IAS 21)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 1. BALANCE SHEET */}
        {statementTab === 'BALANCE_SHEET' && (
          <BalanceSheetTable
            isEditMode={isEditMode}
            fiscalYear={fiscalYear}
            computedBalance={computedBalance}
            baseBalanceData={baseBalanceData}
            overrides={overrides}
            setVal={setVal}
            getSectionCustomItems={getSectionCustomItems}
            setCustomLines={setCustomLines}
            reportingCurrency={reportingCurrency}
            reportingExchangeRate={reportingExchangeRate}
            currencyDisplayMode={currencyDisplayMode}
            language={statementLanguage}
          />
        )}

        {/* 2. INCOME STATEMENT */}
        {statementTab === 'INCOME' && (
          <div className="space-y-6 text-xs max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
                {statementLanguage === 'en'
                  ? `STATEMENT OF COMPREHENSIVE INCOME FOR THE YEAR ENDED 31 DECEMBER ${fiscalYear}`
                  : `قائمة الدخل الشامل عن السنة المالية المنتهية في 31 ديسمبر ${fiscalYear}`}
              </h2>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden divide-y divide-slate-200 shadow-xs">
              {/* Revenues */}
              <div className="p-3.5 bg-slate-50 flex items-center justify-between font-bold text-slate-900 text-sm">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.REVENUES.en : FINANCIAL_TERMS.REVENUES.ar}:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['is_revenues'] !== undefined ? overrides['is_revenues'] : baseIncomeData.revenuesTotal}
                    onChange={(e) => setVal('is_revenues', e.target.value)}
                    className="w-40 text-left px-2.5 py-1 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                  />
                ) : (
                  <span className="font-mono font-black text-emerald-950">{formatEgyptianCurrency(computedIncome.revenues)}</span>
                )}
              </div>

              {/* COGS */}
              <div className="p-3.5 flex items-center justify-between text-slate-700">
                <span className="text-red-900 font-bold">
                  {statementLanguage === 'en' ? `Less: ${FINANCIAL_TERMS.COST_OF_GOODS_SOLD.en}` : `(يخصم): ${FINANCIAL_TERMS.COST_OF_GOODS_SOLD.ar}`}:
                </span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['is_cogs'] !== undefined ? overrides['is_cogs'] : baseIncomeData.costOfGoodsSold}
                    onChange={(e) => setVal('is_cogs', e.target.value)}
                    className="w-40 text-left px-2.5 py-1 bg-red-50 border border-red-300 rounded font-mono font-bold text-red-900 text-xs"
                  />
                ) : (
                  <span className="font-mono text-red-700">({formatEgyptianCurrency(computedIncome.cogs)})</span>
                )}
              </div>

              {/* Gross Profit */}
              <div className="p-3.5 bg-emerald-50/70 flex justify-between items-center font-black text-emerald-950 text-sm">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.GROSS_PROFIT.en : FINANCIAL_TERMS.GROSS_PROFIT.ar}:</span>
                <span className="font-mono font-black">{formatEgyptianCurrency(computedIncome.grossProfit, true)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="p-3.5 space-y-2.5">
                <div className="font-bold text-slate-800">
                  {statementLanguage === 'en' ? 'Less: Operating, Selling & Administrative Expenses:' : '(يخصم): المصروفات التشغيلية والبيعية والإدارية:'}
                </div>
                <div className="pr-4 space-y-2 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.SELLING_AND_MARKETING_EXPENSES.en : FINANCIAL_TERMS.SELLING_AND_MARKETING_EXPENSES.ar}:</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={overrides['is_sellingExp'] !== undefined ? overrides['is_sellingExp'] : baseIncomeData.sellingAndMarketingExpenses}
                        onChange={(e) => setVal('is_sellingExp', e.target.value)}
                        className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono">({formatEgyptianCurrency(computedIncome.sellingExp)})</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.GENERAL_AND_ADMIN_EXPENSES.en : FINANCIAL_TERMS.GENERAL_AND_ADMIN_EXPENSES.ar}:</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={overrides['is_adminExp'] !== undefined ? overrides['is_adminExp'] : baseIncomeData.administrativeExpenses}
                        onChange={(e) => setVal('is_adminExp', e.target.value)}
                        className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono">({formatEgyptianCurrency(computedIncome.adminExp)})</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.DEPRECIATION_AND_AMORTISATION.en : FINANCIAL_TERMS.DEPRECIATION_AND_AMORTISATION.ar}:</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={overrides['is_depExp'] !== undefined ? overrides['is_depExp'] : baseIncomeData.depreciationExpense}
                        onChange={(e) => setVal('is_depExp', e.target.value)}
                        className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono">({formatEgyptianCurrency(computedIncome.depExp)})</span>
                    )}
                  </div>

                  {getSectionCustomItems('IS_EXPENSES').map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-blue-900 font-bold bg-blue-50/50 p-1.5 rounded">
                      <span>• {item.name}:</span>
                      <span className="font-mono">({formatEgyptianCurrency(item.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operating Profit */}
              <div className="p-3.5 bg-blue-50/70 flex justify-between items-center font-bold text-blue-950">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.OPERATING_PROFIT.en : FINANCIAL_TERMS.OPERATING_PROFIT.ar}:</span>
                <span className="font-mono font-black">{formatEgyptianCurrency(computedIncome.operatingProfit, true)}</span>
              </div>

              {/* Finance Costs */}
              <div className="p-3.5 flex items-center justify-between text-slate-700">
                <span>{statementLanguage === 'en' ? `Less: ${FINANCIAL_TERMS.FINANCING_COSTS.en}` : `(يخصم): ${FINANCIAL_TERMS.FINANCING_COSTS.ar}`}:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['is_financeCosts'] !== undefined ? overrides['is_financeCosts'] : baseIncomeData.financeCosts}
                    onChange={(e) => setVal('is_financeCosts', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-red-900"
                  />
                ) : (
                  <span className="font-mono text-red-700">({formatEgyptianCurrency(computedIncome.financeCosts)})</span>
                )}
              </div>

              {/* Other Incomes */}
              <div className="p-3.5 flex items-center justify-between text-slate-700">
                <span>{statementLanguage === 'en' ? `Add: ${FINANCIAL_TERMS.FINANCING_INCOME.en}` : `يضاف: ${FINANCIAL_TERMS.FINANCING_INCOME.ar}`}:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['is_otherIncomes'] !== undefined ? overrides['is_otherIncomes'] : baseIncomeData.otherIncomes}
                    onChange={(e) => setVal('is_otherIncomes', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono">+{formatEgyptianCurrency(computedIncome.otherIncomes)}</span>
                )}
              </div>

              {/* EBT */}
              <div className="p-3.5 flex justify-between items-center font-bold text-slate-900">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.PROFIT_BEFORE_INCOME_TAX.en : FINANCIAL_TERMS.PROFIT_BEFORE_INCOME_TAX.ar}:</span>
                <span className="font-mono font-black">{formatEgyptianCurrency(computedIncome.profitBeforeTax, true)}</span>
              </div>

              {/* Tax Expense */}
              <div className="p-3.5 flex items-center justify-between text-red-800 font-semibold bg-red-50/40">
                <span>{statementLanguage === 'en' ? `Less: ${FINANCIAL_TERMS.INCOME_TAX_EXPENSE.en}` : `(يخصم): ${FINANCIAL_TERMS.INCOME_TAX_EXPENSE.ar}`}:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['is_taxExpense'] !== undefined ? overrides['is_taxExpense'] : baseIncomeData.taxExpense}
                    onChange={(e) => setVal('is_taxExpense', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-white border border-red-300 rounded font-mono text-xs text-red-900"
                  />
                ) : (
                  <span className="font-mono">({formatEgyptianCurrency(computedIncome.taxExpense)})</span>
                )}
              </div>

              {/* Net Profit After Tax */}
              <div className="p-4 bg-emerald-900 text-white flex justify-between items-center font-black text-base">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.NET_PROFIT_FOR_PERIOD.en : FINANCIAL_TERMS.NET_PROFIT_FOR_PERIOD.ar}:</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(computedIncome.netProfitAfterTax, true)}</span>
              </div>
            </div>

            {/* Bilingual Tafqeet */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold leading-relaxed">
              <span className="text-slate-500 font-bold">
                {statementLanguage === 'en' ? 'Net Profit / Loss in Words:' : 'التفقيط الرسمي للأرباح:'}{' '}
              </span>
              <span className="font-bold text-emerald-950">
                {statementLanguage === 'en'
                  ? numberToEnglishWords(
                      currencyDisplayMode === 'ORIGINAL' || reportingCurrency === 'EGP'
                        ? computedIncome.netProfitAfterTax
                        : computedIncome.netProfitAfterTax / reportingExchangeRate,
                      currencyDisplayMode === 'ORIGINAL' ? 'EGP' : reportingCurrency
                    )
                  : currencyDisplayMode === 'ORIGINAL' || reportingCurrency === 'EGP'
                  ? numberToArabicWords(computedIncome.netProfitAfterTax, 'جنيه مصري', 'قرش')
                  : numberToArabicWords(
                      computedIncome.netProfitAfterTax / reportingExchangeRate,
                      currencyInfo.nameAr,
                      reportingCurrency === 'USD' || reportingCurrency === 'EUR' ? 'سنت' : 'قرش/هللة'
                    )}
              </span>
            </div>
          </div>
        )}

        {/* 3. CASH FLOW */}
        {statementTab === 'CASH_FLOW' && (
          <div className="space-y-6 text-xs max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
                {statementLanguage === 'en'
                  ? `STATEMENT OF CASH FLOWS FOR THE YEAR ENDED 31 DECEMBER ${fiscalYear}`
                  : `قائمة التدفقات النقدية عن السنة المالية المنتهية في 31 ديسمبر ${fiscalYear}`}
              </h2>
            </div>

            <div className="border border-slate-300 rounded-2xl overflow-hidden divide-y divide-slate-200">
              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                {statementLanguage === 'en' ? FINANCIAL_TERMS.CF_OPERATING_ACTIVITIES.en : 'أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)'}
              </div>
              <div className="p-3.5 space-y-2 text-slate-700 pr-4">
                <div className="flex items-center justify-between font-bold">
                  <span>{statementLanguage === 'en' ? 'Net profit before income tax:' : 'صافي الربح المحاسبي قبل الضريبة:'}</span>
                  <span className="font-mono">{formatEgyptianCurrency(computedCashFlow.netProfit, true)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{statementLanguage === 'en' ? 'Add: Depreciation of fixed assets (non-cash):' : 'يضاف: إهلاك الأصول الثابتة (بند غير نقدي):'}</span>
                  <span className="font-mono">+{formatEgyptianCurrency(computedCashFlow.depAdj)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{statementLanguage === 'en' ? 'Change in trade receivables & debtors:' : 'التغير في المدينين والعملاء:'}</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={overrides['cf_chgRec'] !== undefined ? overrides['cf_chgRec'] : baseCashFlowData.operatingCashFlow.changeInReceivables}
                      onChange={(e) => setVal('cf_chgRec', e.target.value)}
                      className="w-32 text-left px-2 py-0.5 bg-slate-50 border rounded font-mono text-xs"
                    />
                  ) : (
                    <span className="font-mono">{formatEgyptianCurrency(computedCashFlow.chgReceivables, true)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>{statementLanguage === 'en' ? 'Change in inventories:' : 'التغير في المخزون السلعي:'}</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={overrides['cf_chgInv'] !== undefined ? overrides['cf_chgInv'] : baseCashFlowData.operatingCashFlow.changeInInventory}
                      onChange={(e) => setVal('cf_chgInv', e.target.value)}
                      className="w-32 text-left px-2 py-0.5 bg-slate-50 border rounded font-mono text-xs"
                    />
                  ) : (
                    <span className="font-mono">{formatEgyptianCurrency(computedCashFlow.chgInventory, true)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>{statementLanguage === 'en' ? 'Change in trade payables & creditors:' : 'التغير في الموردين والدائنين:'}</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={overrides['cf_chgPay'] !== undefined ? overrides['cf_chgPay'] : baseCashFlowData.operatingCashFlow.changeInPayables}
                      onChange={(e) => setVal('cf_chgPay', e.target.value)}
                      className="w-32 text-left px-2 py-0.5 bg-slate-50 border rounded font-mono text-xs"
                    />
                  ) : (
                    <span className="font-mono">+{formatEgyptianCurrency(computedCashFlow.chgPayables)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-red-700">
                  <span>{statementLanguage === 'en' ? 'Income tax paid:' : 'ضرائب دخل مسددة:'}</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={overrides['cf_taxPaid'] !== undefined ? overrides['cf_taxPaid'] : baseCashFlowData.operatingCashFlow.taxPaid}
                      onChange={(e) => setVal('cf_taxPaid', e.target.value)}
                      className="w-32 text-left px-2 py-0.5 bg-red-50 border border-red-300 rounded font-mono text-xs text-red-900"
                    />
                  ) : (
                    <span className="font-mono">({formatEgyptianCurrency(Math.abs(computedCashFlow.taxPaid))})</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 flex justify-between items-center font-bold text-emerald-900">
                <span>{statementLanguage === 'en' ? 'Net cash generated from operating activities:' : 'صافي التدفق النقدي من الأنشطة التشغيلية:'}</span>
                <span className="font-mono font-black">{formatEgyptianCurrency(computedCashFlow.netOperatingCash, true)}</span>
              </div>

              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                {statementLanguage === 'en' ? FINANCIAL_TERMS.CF_INVESTING_ACTIVITIES.en : 'ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)'}
              </div>
              <div className="p-3.5 flex items-center justify-between text-slate-700 pr-4">
                <span>{statementLanguage === 'en' ? 'Payments for purchase of property, plant & equipment:' : 'مدفوعات لشراء أصول ثابتة ومعدات:'}</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['cf_purchaseAssets'] !== undefined ? overrides['cf_purchaseAssets'] : baseCashFlowData.investingCashFlow.purchaseOfFixedAssets}
                    onChange={(e) => setVal('cf_purchaseAssets', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-slate-50 border border-red-300 rounded font-mono text-xs text-red-900"
                  />
                ) : (
                  <span className="font-mono text-red-700">({formatEgyptianCurrency(Math.abs(computedCashFlow.purchaseAssets))})</span>
                )}
              </div>
              <div className="p-3 bg-slate-50 flex justify-between items-center font-bold text-slate-900">
                <span>{statementLanguage === 'en' ? 'Net cash used in investing activities:' : 'صافي التدفق النقدي المستخدم في الأنشطة الاستثمارية:'}</span>
                <span className="font-mono font-bold">{formatEgyptianCurrency(computedCashFlow.netInvestingCash, true)}</span>
              </div>

              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                {statementLanguage === 'en' ? FINANCIAL_TERMS.CF_FINANCING_ACTIVITIES.en : 'ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)'}
              </div>
              <div className="p-3.5 flex items-center justify-between text-slate-700 pr-4">
                <span>{statementLanguage === 'en' ? 'Net movements in borrowings & dividends:' : 'صافي حركة القروض والتمويل وتوزيعات الأرباح:'}</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['cf_financingCash'] !== undefined ? overrides['cf_financingCash'] : baseCashFlowData.financingCashFlow.netFinancingCash}
                    onChange={(e) => setVal('cf_financingCash', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-slate-50 border rounded font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono">+{formatEgyptianCurrency(computedCashFlow.netFinancingCash)}</span>
                )}
              </div>

              <div className="p-4 bg-slate-900 text-white flex justify-between items-center font-black text-sm">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.NET_CHANGE_IN_CASH.en : 'صافي الزيادة (النقص) في النقدية وما في حكمها خلال العام'}:</span>
                <span className="font-mono text-emerald-400">{formatEgyptianCurrency(computedCashFlow.netChangeInCash, true)}</span>
              </div>
              <div className="p-3.5 bg-slate-100 flex justify-between items-center font-bold text-slate-900">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.CASH_AT_BEGINNING_OF_YEAR.en : 'رصيد النقدية في أول العام'}:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={overrides['cf_beginningCash'] !== undefined ? overrides['cf_beginningCash'] : baseCashFlowData.beginningCash}
                    onChange={(e) => setVal('cf_beginningCash', e.target.value)}
                    className="w-36 text-left px-2 py-0.5 bg-white border border-slate-300 rounded font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono">{formatEgyptianCurrency(computedCashFlow.beginningCash)}</span>
                )}
              </div>
              <div className="p-4 bg-emerald-900 text-white flex justify-between items-center font-black text-base">
                <span>{statementLanguage === 'en' ? FINANCIAL_TERMS.CASH_AT_END_OF_YEAR.en : 'رصيد النقدية في نهاية العام (كما بالمركز المالي)'}:</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(computedCashFlow.endingCash)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTES */}
        {statementTab === 'NOTES' && (
          <div className="space-y-5 text-xs text-slate-800 leading-relaxed max-w-3xl mx-auto">
            <div className="text-center pb-2 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900">
                الإيضاحات المتممة للقوائم المالية والسياسات المحاسبية الهامة
              </h2>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-sm text-emerald-900">1. الكيان القانوني ونشاط المنشأة:</h3>
              <p className="pr-3 text-slate-700">
                تأسست شركة {displayCompanyName} كشركة مساهمة مصرية (ش.م.م) خاضعة لأحكام القانون رقم 159 لسنة 1981 ولائحته التنفيذية وتعديلاته وقانون الاستثمار رقم 72 لسنة 2017، وغرضها تصنيع وتوزيع وتوريد المعدات واللوحات الكهروميكانيكية والتجارية.
              </p>

              <h3 className="font-bold text-sm text-emerald-900">2. أسس إعداد القوائم المالية والامتثال:</h3>
              <p className="pr-3 text-slate-700">
                أعدت القوائم المالية المرفقة طبقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين والقرارات الوزارية المصرية ذات الصلة. تم إعداد القوائم على أساس مبدأ الاستحقاق ومفهوم المنشأة المستمرة (Going Concern).
              </p>

              <h3 className="font-bold text-sm text-emerald-900">3. أهم السياسات المحاسبية المطبقة:</h3>
              <ul className="list-disc pr-6 space-y-1.5 text-slate-700">
                <li><strong>الأصول الثابتة وإهلاكها:</strong> تثبت الأصول الثابتة بالتكلفة التاريخية مخصوماً منها مجمع الإهلاك وخسائر الاضمحلال، وتهلك بطريقة القسط الثابت بنسب (مباني 5%، آلات ومعدات 10%، سيارات ونقل 20%، أجهزة حاسب 25%).</li>
                <li><strong>المخزون السلعي:</strong> يقيم المخزون بالتكلفة أو صافي القيمة البيعية أيهما أقل، وتحدد التكلفة وفقاً لطريقة المتوسط المرجح.</li>
                <li><strong>الاعتراف بالإيراد:</strong> يتم الاعتراف بالإيراد وفقاً لمعيار المحاسبة المصري رقم (48) "الإيراد من العقود مع العملاء" عند انتقال السيطرة على السلع والخدمات.</li>
                <li><strong>الضرائب والتأمينات:</strong> تحسب ضريبة الدخل بواقع 22.5% وفقاً لقانون الضريبة على الدخل رقم 91 لسنة 2005، وتورد ضريبة القيمة المضافة 14% وفقاً للقانون رقم 67 لسنة 2016.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Auditor Stamp & Signature Footer */}
        <div className="pt-6 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="space-y-1 text-center sm:text-right">
            <div className="font-bold text-slate-500">إعداد ومراجعة المحاسب القانوني ومراقب الحسابات:</div>
            <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
            <div className="text-emerald-800 font-semibold">{profile.title}</div>
            <div className="text-slate-500 font-mono text-[11px]">{profile.licenseNumber}</div>
          </div>

          {/* QR Code and Official Stamp */}
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[10px] text-slate-400 font-bold mb-1">الختم الإلكتروني المعتمد</div>
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-900 p-1 text-center">
                <span>مكتب المحاسب القانوني</span>
                <span className="text-emerald-700 font-black">{profile.auditorName || 'محمد جميل مرعي'}</span>
                <span>{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</span>
                <span className="text-[8px] text-slate-500">معتمد</span>
              </div>
            </div>

            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(qrPayload, 90),
              }}
            />
          </div>
        </div>
      </div>

      </div>
    </UnifiedScreenCard>

      {/* Currency Revaluation Wizard Modal (EAS 13 / IAS 21) */}
      <CurrencyRevaluationWizardModal
        isOpen={isFxRevaluationModalOpen}
        onClose={() => setIsFxRevaluationModalOpen(false)}
        state={state}
        onSuccess={() => {
          // Success callback
        }}
      />

      {/* Year-End Closing & Period Lock Wizard Modal */}
      <YearEndClosingWizardModal
        isOpen={isYearClosingModalOpen}
        onClose={() => setIsYearClosingModalOpen(false)}
        state={state}
        onSuccess={() => {
          handleAutoArchiveFinancials();
        }}
      />
    </>
  );
};
