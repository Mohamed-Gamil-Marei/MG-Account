import React, { useMemo, useState } from 'react';
import { DatabaseState, db, createDefaultClientStatementMapping } from '../db/localDatabase';
import { AccountingCalculator } from '../services/AccountingCalculator';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import {
  FileSpreadsheet,
  Printer,
  AlertCircle,
  TrendingUp,
  Scale,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Link2,
} from 'lucide-react';
import { PrintService } from '../services/PrintService';
import { FinancialStatementLineKey, ClientStatementMapping } from '../types';

export const STATEMENT_LINE_LABELS_AR: Record<FinancialStatementLineKey, { labelAr: string; sectionAr: string }> = {
  // Balance Sheet - Current Assets
  BS_CASH_EQUIVALENTS: { labelAr: 'النقدية وما في حكمها', sectionAr: 'أصول متداولة' },
  BS_TRADE_RECEIVABLES: { labelAr: 'العملاء والمدينون التجاريون', sectionAr: 'أصول متداولة' },
  BS_INVENTORY: { labelAr: 'المخزون السلعي وتكلفة البضاعة', sectionAr: 'أصول متداولة' },
  BS_OTHER_CURRENT_ASSETS: { labelAr: 'أصول متداولة وأرصدة مدينة أخرى', sectionAr: 'أصول متداولة' },

  // Balance Sheet - Non-Current Assets
  BS_FIXED_ASSETS: { labelAr: 'الأصول الثابتة (بالصافي ومجمع الإهلاك)', sectionAr: 'أصول غير متداولة' },
  BS_PROJECTS_UNDER_WAY: { labelAr: 'مشروعات تحت التنفيذ والتجهيز', sectionAr: 'أصول غير متداولة' },
  BS_INTANGIBLE_ASSETS: { labelAr: 'أصول غير ملموسة وشهرة', sectionAr: 'أصول غير متداولة' },
  BS_OTHER_NON_CURRENT_ASSETS: { labelAr: 'أصول غير متداولة واستثمارات أخرى', sectionAr: 'أصول غير متداولة' },

  // Balance Sheet - Current Liabilities
  BS_TRADE_PAYABLES: { labelAr: 'الموردون والدائنون التجاريون', sectionAr: 'التزامات متداولة' },
  BS_TAX_AUTHORITY_PAYABLES: { labelAr: 'مصلحة الضرائب والجهات السيادية', sectionAr: 'التزامات متداولة' },
  BS_OTHER_CURRENT_LIABILITIES: { labelAr: 'التزامات متداولة وأرصدة دائنة أخرى', sectionAr: 'التزامات متداولة' },

  // Balance Sheet - Non-Current Liabilities
  BS_LONG_TERM_LOANS: { labelAr: 'قروض وتسهيلات بنكية طويلة الأجل', sectionAr: 'التزامات غير متداولة' },
  BS_OTHER_NON_CURRENT_LIABILITIES: { labelAr: 'التزامات ومخصصات غير متداولة', sectionAr: 'التزامات غير متداولة' },

  // Balance Sheet - Equity
  BS_PAID_UP_CAPITAL: { labelAr: 'رأس المال المدفوع', sectionAr: 'حقوق الملكية' },
  BS_RETAINED_EARNINGS: { labelAr: 'الأرباح (الخسائر) المرحلة والمحتجزة', sectionAr: 'حقوق الملكية' },
  BS_RESERVES: { labelAr: 'الاحتياطيات النظامية والقانونية', sectionAr: 'حقوق الملكية' },

  // Income Statement
  IS_OPERATING_REVENUE: { labelAr: 'إيرادات النشاط والمبيعات والخدمات', sectionAr: 'قائمة الدخل - إيرادات' },
  IS_SALES_RETURNS_ALLOWANCES: { labelAr: 'مردودات ومسموحات وخصومات المبيعات', sectionAr: 'قائمة الدخل - إيرادات' },
  IS_COGS: { labelAr: 'تكلفة المبيعات والمشتريات والخدمات', sectionAr: 'قائمة الدخل - تكاليف' },
  IS_SELLING_DISTRIBUTION: { labelAr: 'مصروفات البيع والتسويق والتوزيع', sectionAr: 'قائمة الدخل - مصروفات' },
  IS_GENERAL_ADMIN: { labelAr: 'المصروفات العمومية والإدارية', sectionAr: 'قائمة الدخل - مصروفات' },
  IS_DEPRECIATION: { labelAr: 'إهلاك الأصول الثابتة', sectionAr: 'قائمة الدخل - مصروفات' },
  IS_FINANCING_COSTS: { labelAr: 'الأعباء التمويلية والفوائد البنكية', sectionAr: 'قائمة الدخل - بنود أخرى' },
  IS_FX_GAINS_LOSSES: { labelAr: 'أرباح وخسائر فروق تقييم العملات', sectionAr: 'قائمة الدخل - بنود أخرى' },
  IS_OTHER_REVENUES: { labelAr: 'إيرادات وأرباح عرضية أخرى', sectionAr: 'قائمة الدخل - بنود أخرى' },
  IS_OTHER_EXPENSES: { labelAr: 'مصروفات وخسائر عرضية أخرى', sectionAr: 'قائمة الدخل - بنود أخرى' },
};

export interface FinancialStatementsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  initialStatementTab?: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'MAPPING' | string;
  onNavigateToExchangeRates?: () => void;
  onNavigateToCreditSimulator?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  state,
  fiscalYear = 2026,
  initialStatementTab = 'BALANCE_SHEET',
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialStatementTab);
  const activeClientId = state.activeClientContext?.clientId || state.clients[0]?.id || '';
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;

  const targetYear =
    state.activeClientContext?.selectedFiscalYear ||
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    fiscalYear;

  const fiscalBounds = useMemo(() => {
    return db.getClientFiscalYearBounds(activeClientId, targetYear);
  }, [activeClientId, targetYear]);

  const unassignedEntries = db.getUnassignedJournalEntries();

  // Load client's statement mapping
  const clientStatementMapping = useMemo(() => {
    if (!activeClientId) return {};
    return db.getClientStatementMapping(activeClientId);
  }, [activeClientId, state.statementMappings]);

  // Compute Trial Balance for statements
  const tb = useMemo(() => {
    if (!activeClientId) {
      return AccountingCalculator.computeTrialBalance([], []);
    }
    const clientAccounts = db.getClientAccounts(activeClientId, targetYear);
    const clientEntries = state.journalEntries.filter((j) => j.clientId === activeClientId);

    return AccountingCalculator.computeTrialBalance(clientAccounts, clientEntries, {
      clientId: activeClientId,
      fiscalYear: targetYear,
      fromDate: fiscalBounds.startDate,
      toDate: fiscalBounds.endDate,
      postedOnly: true,
      openingBalances: state.openingBalances,
    });
  }, [
    activeClientId,
    targetYear,
    fiscalBounds.startDate,
    fiscalBounds.endDate,
    state.accounts,
    state.journalEntries,
    state.openingBalances,
  ]);

  // Generate Statements from the exact same Trial Balance
  const statements = useMemo(() => {
    const clientAccounts = activeClientId ? db.getClientAccounts(activeClientId, targetYear) : [];
    return AccountingCalculator.generateFinancialStatementsFromTrialBalance(
      tb,
      clientAccounts,
      clientStatementMapping
    );
  }, [tb, activeClientId, targetYear, clientStatementMapping]);

  // Local state for mapping editor
  const [editingMapping, setEditingMapping] = useState<ClientStatementMapping>({});
  const [mappingSaveSuccess, setMappingSaveSuccess] = useState(false);

  // Initialize editing mapping
  React.useEffect(() => {
    setEditingMapping({ ...clientStatementMapping });
  }, [clientStatementMapping]);

  const handleSaveMapping = () => {
    if (!activeClientId) return;
    db.setClientStatementMapping(activeClientId, editingMapping);
    setMappingSaveSuccess(true);
    setTimeout(() => setMappingSaveSuccess(false), 3000);
  };

  const handleResetDefaultMapping = () => {
    if (!activeClientId) return;
    const def = createDefaultClientStatementMapping(activeClientId);
    setEditingMapping(def);
    db.setClientStatementMapping(activeClientId, def, 'استعادة التخطيط القياسي المصري لبنود القوائم');
    setMappingSaveSuccess(true);
    setTimeout(() => setMappingSaveSuccess(false), 3000);
  };

  const handleQuickMapAccount = (accountCode: string, lineKey: FinancialStatementLineKey) => {
    if (!activeClientId) return;
    const updated = { ...clientStatementMapping, [accountCode]: lineKey };
    db.setClientStatementMapping(activeClientId, updated);
  };

  if (!activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار المنشأة (العميل) لعرض القوائم المالية</p>
          <p className="mt-1">كل منشأة لها قوائم مالية وتخطيط حسابات مستقل لكل سنة مالية.</p>
        </div>
      </div>
    );
  }

  if (unassignedEntries.length > 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-900 text-xs flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-700" />
          <div>
            <p className="font-black text-sm">
              لا يمكن استخراج القوائم المالية قبل معالجة القيود غير المنسوبة ({unassignedEntries.length} قيد)
            </p>
            <p className="mt-1">
              يلزم نسب القيود التاريخية المعلقة للمنشأة المختصة لضمان تكامل وموثوقية القوائم المالية.
            </p>
          </div>
        </div>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('UNASSIGNED_ENTRIES')}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold shrink-0 hover:bg-rose-700"
          >
            فتح شاشة قيود غير منسوبة
          </button>
        )}
      </div>
    );
  }

  const { balanceSheet, incomeStatement, unmappedAccounts } = statements;

  return (
    <div id="financial-statements-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 text-xs" dir="rtl">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              القوائم المالية المعتمدة • {activeClient.name}
            </h2>
            <p className="text-xs text-slate-500">
              السنة المالية: <strong>{targetYear}</strong> • من {fiscalBounds.startDate} حتى {fiscalBounds.endDate} ({fiscalBounds.labelAr})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('BALANCE_SHEET')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'BALANCE_SHEET'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>قائمة المركز المالي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INCOME_STATEMENT')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'INCOME_STATEMENT'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>قائمة الدخل</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MAPPING')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'MAPPING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>تخطيط بنود القوائم</span>
          </button>
          <button
            type="button"
            onClick={() =>
              PrintService.printElementById('financial-statements-printable', {
                documentTitle: `القوائم المالية - ${activeClient.name} - ${targetYear}`,
              })
            }
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-1.5 hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Warning Alert: Unmapped Accounts with Balances */}
      {unmappedAccounts && unmappedAccounts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-amber-950 dark:text-amber-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-black text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                تنبيه: يوجد ({unmappedAccounts.length}) حساب له رصيد في ميزان المراجعة غير مربوط بأي بند من بنود القوائم المالية!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('MAPPING')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shrink-0"
            >
              فتح شاشة التخطيط الكاملة
            </button>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            الحسابات غير المربوطة لا تظهر في قائمة المركز المالي أو قائمة الدخل؛ اربطها فوراً لتجنب اختلال توازن القوائم:
          </p>

          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs text-right border-collapse bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  <th className="p-2 border">كود الحساب</th>
                  <th className="p-2 border">اسم الحساب</th>
                  <th className="p-2 border">رصيد ختامي مدين</th>
                  <th className="p-2 border">رصيد ختامي دائن</th>
                  <th className="p-2 border">ربط سريع ببند القوائم</th>
                </tr>
              </thead>
              <tbody>
                {unmappedAccounts.map((acc) => (
                  <tr key={acc.accountId} className="border-b border-amber-100 dark:border-amber-950 font-mono">
                    <td className="p-2 border font-bold text-indigo-700 dark:text-indigo-400 font-sans">{acc.accountCode}</td>
                    <td className="p-2 border font-sans">{acc.accountName}</td>
                    <td className="p-2 border text-emerald-700">{acc.closingDebit > 0 ? formatEgyptianCurrency(acc.closingDebit) : '-'}</td>
                    <td className="p-2 border text-rose-700">{acc.closingCredit > 0 ? formatEgyptianCurrency(acc.closingCredit) : '-'}</td>
                    <td className="p-2 border font-sans">
                      <select
                        onChange={(e) => handleQuickMapAccount(acc.accountCode, e.target.value as FinancialStatementLineKey)}
                        defaultValue=""
                        className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-sans w-full"
                      >
                        <option value="" disabled>اختر بند القوائم المالية...</option>
                        {Object.entries(STATEMENT_LINE_LABELS_AR).map(([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.sectionAr}: {meta.labelAr}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: BALANCE SHEET (قائمة المركز المالي) */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                قائمة المركز المالي في {fiscalBounds.labelAr}
              </h3>
              <p className="text-slate-500 text-[11px]">
                مستخرجة مباشرة من ميزان المراجعة بالمجاميع والأرصدة لنفس السنة المالية
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                  balanceSheet.isBalanced
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                }`}
              >
                {balanceSheet.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>
                  {balanceSheet.isBalanced ? 'الميزانية متزنة تماماً' : `فارق عدم التوازن: ${formatEgyptianCurrency(balanceSheet.difference)}`}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800">
                <h4 className="font-black text-sm text-blue-900 dark:text-blue-100">الأصول (Assets)</h4>
              </div>

              {/* Current Assets */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>الأصول المتداولة</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(balanceSheet.currentAssets.total)}
                  </span>
                </div>
                {balanceSheet.currentAssets.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs py-1">
                    <span>{it.accountName} ({it.accountCode})</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(it.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Non-Current Assets */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>الأصول غير المتداولة</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(balanceSheet.nonCurrentAssets.total)}
                  </span>
                </div>
                {balanceSheet.nonCurrentAssets.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs py-1">
                    <span>{it.accountName} ({it.accountCode})</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(it.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Total Assets Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center font-black text-sm">
                <span>إجمالي الأصول (Total Assets)</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-100">الالتزامات وحقوق الملكية</h4>
              </div>

              {/* Current Liabilities */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>الالتزامات المتداولة</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400">
                    {formatEgyptianCurrency(balanceSheet.currentLiabilities.total)}
                  </span>
                </div>
                {balanceSheet.currentLiabilities.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs py-1">
                    <span>{it.accountName} ({it.accountCode})</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(it.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Non-Current Liabilities */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>الالتزامات غير المتداولة</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400">
                    {formatEgyptianCurrency(balanceSheet.nonCurrentLiabilities.total)}
                  </span>
                </div>
                {balanceSheet.nonCurrentLiabilities.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs py-1">
                    <span>{it.accountName} ({it.accountCode})</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(it.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Equity */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>حقوق الملكية (Equity)</span>
                  <span className="font-mono text-indigo-700 dark:text-indigo-400">
                    {formatEgyptianCurrency(balanceSheet.totalEquity)}
                  </span>
                </div>
                {balanceSheet.equity.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs py-1">
                    <span>{it.accountName} ({it.accountCode})</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(it.amount)}</span>
                  </div>
                ))}
                {balanceSheet.netProfitFromIncomeStatement !== 0 && (
                  <div className="flex justify-between text-xs py-1.5 border-t border-slate-100 dark:border-slate-800 font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      صافي أرباح (خسائر) العام من قائمة الدخل
                    </span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(balanceSheet.netProfitFromIncomeStatement)}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Liabilities & Equity Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center font-black text-sm">
                <span>إجمالي الالتزامات وحقوق الملكية</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCOME STATEMENT (قائمة الدخل) */}
      {activeTab === 'INCOME_STATEMENT' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              قائمة الدخل عن الفترة من {fiscalBounds.startDate} حتى {fiscalBounds.endDate}
            </h3>
            <p className="text-slate-500 text-[11px]">
              مستخرجة مباشرة من ميزان المراجعة وفق معايير المحاسبة المصرية
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 bg-white dark:bg-slate-900 shadow-xs">
            {/* Revenue */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">إيرادات النشاط والمبيعات والخدمات</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{formatEgyptianCurrency(incomeStatement.operatingRevenue.total)}</span>
            </div>

            {/* Returns & Allowances */}
            {incomeStatement.salesReturns.total > 0 && (
              <div className="flex justify-between items-center py-1.5 text-slate-600 dark:text-slate-400">
                <span>يخصم: مردودات ومسموحات المبيعات</span>
                <span className="font-mono text-rose-600">({formatEgyptianCurrency(incomeStatement.salesReturns.total)})</span>
              </div>
            )}

            {/* Net Revenue */}
            <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3 rounded-xl font-bold">
              <span>صافي إيرادات النشاط</span>
              <span className="font-mono text-blue-800 dark:text-blue-200">{formatEgyptianCurrency(incomeStatement.netRevenue)}</span>
            </div>

            {/* COGS */}
            <div className="flex justify-between items-center py-1.5 text-slate-600 dark:text-slate-400">
              <span>يخصم: تكلفة المبيعات والمشتريات (COGS)</span>
              <span className="font-mono text-rose-600">({formatEgyptianCurrency(incomeStatement.cogs.total)})</span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-2.5 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 rounded-xl font-black text-emerald-900 dark:text-emerald-100">
              <span>مجمل الربح (Gross Profit)</span>
              <span className="font-mono">{formatEgyptianCurrency(incomeStatement.grossProfit)}</span>
            </div>

            {/* Operating Expenses */}
            <div className="pt-2 space-y-1 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between py-1">
                <span>مصروفات البيع والتوزيع</span>
                <span className="font-mono">({formatEgyptianCurrency(incomeStatement.sellingExpenses.total)})</span>
              </div>
              <div className="flex justify-between py-1">
                <span>المصروفات العمومية والإدارية</span>
                <span className="font-mono">({formatEgyptianCurrency(incomeStatement.generalAdminExpenses.total)})</span>
              </div>
              <div className="flex justify-between py-1">
                <span>إهلاك الأصول الثابتة</span>
                <span className="font-mono">({formatEgyptianCurrency(incomeStatement.depreciationExpenses.total)})</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-1">
                <span>إجمالي المصروفات التشغيلية</span>
                <span className="font-mono text-rose-600">({formatEgyptianCurrency(incomeStatement.totalOperatingExpenses)})</span>
              </div>
            </div>

            {/* Operating Profit */}
            <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3 rounded-xl font-bold">
              <span>صافي الربح التشغيلي (Operating Profit)</span>
              <span className="font-mono">{formatEgyptianCurrency(incomeStatement.operatingProfit)}</span>
            </div>

            {/* Other Items */}
            <div className="pt-2 space-y-1 text-slate-600 dark:text-slate-400">
              {incomeStatement.fxGainsLosses.total !== 0 && (
                <div className="flex justify-between py-1">
                  <span>أرباح (خسائر) فروق تقييم العملات الأجنبية</span>
                  <span className={`font-mono font-bold ${incomeStatement.fxGainsLosses.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatEgyptianCurrency(incomeStatement.fxGainsLosses.total)}
                  </span>
                </div>
              )}
              {incomeStatement.otherRevenues.total > 0 && (
                <div className="flex justify-between py-1">
                  <span>إيرادات وأرباح عرضية أخرى</span>
                  <span className="font-mono text-emerald-600">+{formatEgyptianCurrency(incomeStatement.otherRevenues.total)}</span>
                </div>
              )}
              {incomeStatement.financingCosts.total > 0 && (
                <div className="flex justify-between py-1">
                  <span>تكاليف تمويلية وأعباء بنكية</span>
                  <span className="font-mono text-rose-600">({formatEgyptianCurrency(incomeStatement.financingCosts.total)})</span>
                </div>
              )}
            </div>

            {/* Net Profit Before Tax */}
            <div className={`p-4 rounded-2xl flex justify-between items-center font-black text-sm mt-3 ${
              incomeStatement.netProfitBeforeTax >= 0
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-rose-600 text-white shadow-md'
            }`}>
              <span>{incomeStatement.netProfitBeforeTax >= 0 ? 'صافي الربح قبل الضريبة' : 'صافي الخسارة قبل الضريبة'}</span>
              <span className="font-mono text-base">{formatEgyptianCurrency(incomeStatement.netProfitBeforeTax)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAPPING EDITOR (تخطيط بنود القوائم المالية) */}
      {activeTab === 'MAPPING' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800">
            <div>
              <h3 className="font-black text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                <span>تخطيط بنود القوائم المالية للمنشأة ({activeClient.name})</span>
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                تحديد البند الذي يصب فيه كل حساب تحليلي في قائمة المركز المالي أو قائمة الدخل
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultMapping}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة التخطيط القياسي المصري</span>
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-indigo-700 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التخطيط</span>
              </button>
            </div>
          </div>

          {mappingSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم حفظ تخطيط بنود القوائم المالية للمنشأة وتحديث التقارير بنجاح.</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="p-2.5 border">كود الحساب</th>
                  <th className="p-2.5 border">اسم الحساب</th>
                  <th className="p-2.5 border">طبيعة الحساب</th>
                  <th className="p-2.5 border">رصيد ميزان المراجعة</th>
                  <th className="p-2.5 border w-1/3">بند القائمة المالية المستهدف</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((row) => {
                  const currentMappedKey =
                    editingMapping[row.accountCode] ||
                    editingMapping[row.accountId] ||
                    '';

                  return (
                    <tr key={row.accountId} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 border font-mono font-bold text-indigo-700 dark:text-indigo-400">{row.accountCode}</td>
                      <td className="p-2.5 border font-bold">{row.accountName}</td>
                      <td className="p-2.5 border text-slate-500 text-[11px] font-mono">
                        {row.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </td>
                      <td className="p-2.5 border font-mono">
                        {row.closingDebit > 0 ? (
                          <span className="text-emerald-700 font-bold">{formatEgyptianCurrency(row.closingDebit)} (مدين)</span>
                        ) : row.closingCredit > 0 ? (
                          <span className="text-rose-700 font-bold">{formatEgyptianCurrency(row.closingCredit)} (دائن)</span>
                        ) : (
                          <span className="text-slate-400">0.00</span>
                        )}
                      </td>
                      <td className="p-2.5 border">
                        <select
                          value={currentMappedKey}
                          onChange={(e) => {
                            const val = e.target.value as FinancialStatementLineKey;
                            setEditingMapping((prev) => ({
                              ...prev,
                              [row.accountCode]: val,
                            }));
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                            currentMappedKey
                              ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                              : 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                          }`}
                        >
                          <option value="">-- غير مربوط بأي بند (تنبيه عدم ربط) --</option>
                          {Object.entries(STATEMENT_LINE_LABELS_AR).map(([key, meta]) => (
                            <option key={key} value={key}>
                              {meta.sectionAr}: {meta.labelAr}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
