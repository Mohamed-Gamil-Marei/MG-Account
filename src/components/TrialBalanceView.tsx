import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { AccountingCalculator } from '../services/AccountingCalculator';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Printer,
  AlertCircle,
  Calendar,
  Building2,
  RotateCcw,
  Search,
  Filter,
} from 'lucide-react';
import { PrintService } from '../services/PrintService';

export interface TrialBalanceViewProps {
  state: DatabaseState;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  onDrillDownAccount?: (accountCode: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  state,
  selectedYear = 2026,
  onDrillDownAccount,
  onNavigateToTab,
}) => {
  const initialClientId = state.activeClientContext?.clientId || state.clients[0]?.id || '';
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);

  const activeClient = useMemo(() => {
    return state.clients.find((c) => c.id === selectedClientId) || null;
  }, [state.clients, selectedClientId]);

  const defaultYear =
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    state.activeClientContext?.selectedFiscalYear ||
    selectedYear;

  const [fiscalYear, setFiscalYear] = useState<number>(defaultYear);

  // Sync defaultYear when active client changes
  useEffect(() => {
    if (activeClient) {
      const yr =
        activeClient.fiscalYear ||
        activeClient.activeFiscalYear ||
        state.activeClientContext?.selectedFiscalYear ||
        2026;
      setFiscalYear(yr);
    }
  }, [selectedClientId, activeClient]);

  const officialBounds = useMemo(() => {
    return db.getClientFiscalYearBounds(selectedClientId || null, fiscalYear);
  }, [selectedClientId, fiscalYear]);

  const [fromDate, setFromDate] = useState<string>(officialBounds.startDate);
  const [toDate, setToDate] = useState<string>(officialBounds.endDate);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Update dates when bounds change
  useEffect(() => {
    setFromDate(officialBounds.startDate);
    setToDate(officialBounds.endDate);
  }, [officialBounds.startDate, officialBounds.endDate]);

  const unassignedEntries = db.getUnassignedJournalEntries();

  const handleResetToOfficialDates = () => {
    setFromDate(officialBounds.startDate);
    setToDate(officialBounds.endDate);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    try {
      db.setActiveClientContext({ clientId, selectedFiscalYear: fiscalYear });
    } catch {
      // ignore
    }
  };

  // Compute Trial Balance: strictly matching by account ID only, opening + period movements only
  const summary = useMemo(() => {
    if (!selectedClientId) {
      return {
        rows: [],
        totalOpeningDebit: 0,
        totalOpeningCredit: 0,
        totalMovementDebit: 0,
        totalMovementCredit: 0,
        totalClosingDebit: 0,
        totalClosingCredit: 0,
        isBalanced: true,
        difference: 0,
        unmatchedLines: [],
      };
    }

    const clientAccounts = db.getClientAccounts(selectedClientId, fiscalYear);
    const clientEntries = state.journalEntries.filter((e) => {
      if (e.clientId !== selectedClientId) return false;
      return true;
    });

    return AccountingCalculator.computeTrialBalance(
      clientAccounts,
      clientEntries,
      {
        clientId: selectedClientId,
        fiscalYear,
        fromDate,
        toDate,
        postedOnly: true,
        openingBalances: state.openingBalances,
      }
    );
  }, [
    state.accounts,
    state.journalEntries,
    state.openingBalances,
    state.clientOpeningBalances,
    selectedClientId,
    fiscalYear,
    fromDate,
    toDate,
  ]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return summary.rows;
    const q = searchTerm.trim().toLowerCase();
    return summary.rows.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q) ||
        r.accountName.toLowerCase().includes(q)
    );
  }, [summary.rows, searchTerm]);

  if (!selectedClientId || !activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار المنشأة (العميل) لعرض ميزان المراجعة</p>
          <p className="mt-1">كل منشأة لها ميزان مراجعة مستقل بحساباته وأرصدته الافتتاحية المعتمدة.</p>
        </div>
      </div>
    );
  }

  if (unassignedEntries.length > 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 text-xs flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-700" />
          <div>
            <p className="font-black text-sm">
              لا يمكن عرض أو تصدير ميزان المراجعة قبل نسب القيود المعلقة ({unassignedEntries.length} قيد)
            </p>
            <p className="mt-1">
              يوجد قيود غير منسوبة لعميل محدد. يرجى فتح شاشة &quot;قيود غير منسوبة&quot; ونسبتها للمنشأة المختصة أولاً لضمان سلامة الأرصدة.
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

  return (
    <div id="trial-balance-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              ميزان المراجعة بالمجاميع والأرصدة • {activeClient.name}
            </h2>
            <p className="text-xs text-slate-500">
              السنة المالية: <strong>{fiscalYear}</strong> • الفترة من{' '}
              <span className="font-mono">{fromDate}</span> إلى <span className="font-mono">{toDate}</span>{' '}
              ({officialBounds.labelAr})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              summary.isBalanced
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
            }`}
          >
            {summary.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{summary.isBalanced ? 'الميزان متزن تماماً' : `فارق التوازن: ${formatEgyptianCurrency(summary.difference)}`}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              PrintService.printElementById('trial-balance-printable', {
                documentTitle: `ميزان المراجعة - ${activeClient.name} - ${toDate}`,
              })
            }
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Client, Fiscal Year, From Date, To Date */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-indigo-500" />
          <span>فلاتر ميزان المراجعة (Client, Year & Date Range):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-500" />
              <span>المنشأة (العميل)</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
            >
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal Year */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>السنة المالية</span>
            </label>
            <input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value) || 2026)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
            />
          </div>

          {/* Quick Reset & Search */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleResetToOfficialDates}
              title="إعادة ضبط التواريخ إلى نطاق السنة المالية الرسمية للعميل"
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 hover:bg-slate-100 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>نطاق السنة</span>
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="بحث بكود أو اسم الحساب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards: Column Totals & Balance Difference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Opening Totals */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 block font-sans">الأرصدة الافتتاحية للسنة</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-slate-600 dark:text-slate-400 font-sans">مدين:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(summary.totalOpeningDebit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-sans">دائن:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatEgyptianCurrency(summary.totalOpeningCredit)}</span>
          </div>
        </div>

        {/* Movement Totals */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <span className="text-[11px] text-blue-700 dark:text-blue-400 block font-sans">حركة القيود المرحّلة للفترة</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-blue-600 dark:text-blue-300 font-sans">مدين:</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">{formatEgyptianCurrency(summary.totalMovementDebit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-blue-600 dark:text-blue-300 font-sans">دائن:</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">{formatEgyptianCurrency(summary.totalMovementCredit)}</span>
          </div>
        </div>

        {/* Closing Totals */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">الأرصدة الختامية</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-emerald-600 dark:text-emerald-300 font-sans">مدين:</span>
            <span className="font-bold text-emerald-900 dark:text-emerald-100">{formatEgyptianCurrency(summary.totalClosingDebit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-300 font-sans">دائن:</span>
            <span className="font-bold text-emerald-900 dark:text-emerald-100">{formatEgyptianCurrency(summary.totalClosingCredit)}</span>
          </div>
        </div>

        {/* Equilibrium Difference */}
        <div className={`p-3.5 rounded-2xl border ${
          summary.isBalanced
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
        }`}>
          <span className="text-[11px] text-slate-500 block font-sans">فرق التوازن (Equilibrium)</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-sans font-bold">الحالة:</span>
            <span className={`font-bold ${summary.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {summary.isBalanced ? 'متزن (0.00)' : 'غير متزن!'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-sans text-slate-500">الفارق:</span>
            <span className={`font-black text-sm ${summary.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatEgyptianCurrency(summary.difference)}
            </span>
          </div>
        </div>
      </div>

      {/* Red Alert Banner: Orphan Journal Lines Referencing Missing Accounts */}
      {summary.unmatchedLines && summary.unmatchedLines.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-3">
          <div className="flex items-center gap-2.5 font-black text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              تنبيه أحمر: يوجد ({summary.unmatchedLines.length}) سطر قيد محاسبي يشير إلى حسابات غير موجودة في دليل حسابات المنشأة!
            </span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-200">
            هذه السطور لم يتم إخفاؤها بل عُزلت في هذا التنبيه لضمان المراجعة وتصحيح التوجيه المحاسبي:
          </p>

          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-xs text-right border-collapse bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
              <thead>
                <tr className="bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                  <th className="p-2 border">رقم القيد</th>
                  <th className="p-2 border">التاريخ</th>
                  <th className="p-2 border">معرّف الحساب المفقود (accountId)</th>
                  <th className="p-2 border">كود الحساب</th>
                  <th className="p-2 border">اسم الحساب المذكور</th>
                  <th className="p-2 border">مدين (ج.م)</th>
                  <th className="p-2 border">دائن (ج.م)</th>
                  <th className="p-2 border">البيان</th>
                </tr>
              </thead>
              <tbody>
                {summary.unmatchedLines.map((line, idx) => (
                  <tr key={idx} className="border-b border-rose-100 dark:border-rose-950 hover:bg-rose-50/50 font-mono">
                    <td className="p-2 border font-bold text-rose-700 font-sans">#{line.entryNumber}</td>
                    <td className="p-2 border text-slate-600 dark:text-slate-300">{line.date}</td>
                    <td className="p-2 border text-rose-600 font-bold">{line.accountId || 'غير محدد'}</td>
                    <td className="p-2 border">{line.accountCode || '-'}</td>
                    <td className="p-2 border font-sans">{line.accountName || '-'}</td>
                    <td className="p-2 border text-emerald-700">{line.debit > 0 ? formatEgyptianCurrency(line.debit) : '-'}</td>
                    <td className="p-2 border text-rose-700">{line.credit > 0 ? formatEgyptianCurrency(line.credit) : '-'}</td>
                    <td className="p-2 border font-sans text-slate-500">{line.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Trial Balance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <th className="p-2.5 border">كود الحساب</th>
              <th className="p-2.5 border">اسم الحساب</th>
              <th className="p-2.5 border">طبيعة الحساب</th>
              <th className="p-2.5 border">افتتاحي مدين</th>
              <th className="p-2.5 border">افتتاحي دائن</th>
              <th className="p-2.5 border">حركة مدين</th>
              <th className="p-2.5 border">حركة دائن</th>
              <th className="p-2.5 border">ختامي مدين</th>
              <th className="p-2.5 border">ختامي دائن</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-400">
                  لا توجد حسابات أو حركات مطابقة لشروط البحث والفترة المحددة.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr
                  key={r.accountId}
                  onClick={() => onDrillDownAccount?.(r.accountCode)}
                  className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <td className="p-2.5 border font-mono font-bold text-indigo-700 dark:text-indigo-400">{r.accountCode}</td>
                  <td className="p-2.5 border font-bold text-slate-900 dark:text-white">{r.accountName}</td>
                  <td className="p-2.5 border text-slate-500 text-[11px]">
                    {r.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                  </td>
                  <td className="p-2.5 border font-mono">{r.openingDebit > 0 ? formatEgyptianCurrency(r.openingDebit) : '-'}</td>
                  <td className="p-2.5 border font-mono">{r.openingCredit > 0 ? formatEgyptianCurrency(r.openingCredit) : '-'}</td>
                  <td className="p-2.5 border font-mono text-blue-700 dark:text-blue-300 font-semibold">
                    {r.movementDebit > 0 ? formatEgyptianCurrency(r.movementDebit) : '-'}
                  </td>
                  <td className="p-2.5 border font-mono text-blue-700 dark:text-blue-300 font-semibold">
                    {r.movementCredit > 0 ? formatEgyptianCurrency(r.movementCredit) : '-'}
                  </td>
                  <td className="p-2.5 border font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {r.closingDebit > 0 ? formatEgyptianCurrency(r.closingDebit) : '-'}
                  </td>
                  <td className="p-2.5 border font-mono font-bold text-rose-700 dark:text-rose-400">
                    {r.closingCredit > 0 ? formatEgyptianCurrency(r.closingCredit) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black text-xs">
              <td colSpan={3} className="p-3 border">الإجمالي العام لميزان المراجعة</td>
              <td className="p-3 border font-mono">{formatEgyptianCurrency(summary.totalOpeningDebit)}</td>
              <td className="p-3 border font-mono">{formatEgyptianCurrency(summary.totalOpeningCredit)}</td>
              <td className="p-3 border font-mono text-blue-300">{formatEgyptianCurrency(summary.totalMovementDebit)}</td>
              <td className="p-3 border font-mono text-blue-300">{formatEgyptianCurrency(summary.totalMovementCredit)}</td>
              <td className="p-3 border font-mono text-emerald-300">{formatEgyptianCurrency(summary.totalClosingDebit)}</td>
              <td className="p-3 border font-mono text-rose-300">{formatEgyptianCurrency(summary.totalClosingCredit)}</td>
            </tr>
            <tr className="bg-slate-800 text-slate-200 font-bold text-xs">
              <td colSpan={7} className="p-2.5 border text-right">
                فارق توازن الأرصدة الختامية (|مدين - دائن|):
              </td>
              <td colSpan={2} className={`p-2.5 border font-mono font-black text-center ${
                summary.isBalanced ? 'text-emerald-400' : 'text-rose-400 bg-rose-950'
              }`}>
                {summary.isBalanced ? 'الميزان متزن (0.00 ج.م)' : `غير متزن: ${formatEgyptianCurrency(summary.difference)}`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
