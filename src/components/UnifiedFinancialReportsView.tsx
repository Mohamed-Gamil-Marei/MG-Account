import React from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { AccountingCalculator } from '../services/AccountingCalculator';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { FolderKanban, Printer, AlertCircle } from 'lucide-react';
import { PrintService } from '../services/PrintService';

export interface UnifiedFinancialReportsViewProps {
  state: DatabaseState;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const UnifiedFinancialReportsView: React.FC<UnifiedFinancialReportsViewProps> = ({
  state,
  selectedYear = 2026,
  onNavigateToTab,
}) => {
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;
  const targetYear =
    state.activeClientContext?.selectedFiscalYear ||
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    selectedYear;
  const fiscalBounds = db.getClientFiscalYearBounds(activeClientId, targetYear);
  const unassignedEntries = db.getUnassignedJournalEntries();

  if (!activeClientId || !activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار العميل (المنشأة) لعرض الحافظة الموحدة للتقارير المالية</p>
          <p className="mt-1">كل منشأة مستقلة بالكامل في حساباتها وأرصدتها الافتتاحية وقيودها وسنتها المالية.</p>
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
              لا يمكن إصدار الحافظة الموحدة للتقارير المالية قبل نسب القيود المعلقة ({unassignedEntries.length} قيد)
            </p>
            <p className="mt-1">
              يرجى الانتقال إلى شاشة &quot;قيود غير منسوبة&quot; ونسب القيود إلى المنشأة المختصة أولاً.
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

  const clientAccounts = db.getClientAccounts(activeClientId, targetYear);
  const filteredEntries = state.journalEntries.filter((e) => {
    if (e.clientId !== activeClientId) return false;
    if (e.fiscalYear) return e.fiscalYear === targetYear;
    return e.date >= fiscalBounds.startDate && e.date <= fiscalBounds.endDate;
  });

  const tb = AccountingCalculator.computeTrialBalance(
    clientAccounts,
    filteredEntries,
    targetYear,
    true
  );

  return (
    <div id="unified-reports-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 text-xs" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              الحافظة الموحدة للتقارير والقوائم المالية ({activeClient.name} • {fiscalBounds.labelAr})
            </h2>
            <p className="text-xs text-slate-500">
              تقرير شامل يربط ميزان المراجعة بالقوائم المالية عن الفترة من {fiscalBounds.startDate} حتى {fiscalBounds.endDate}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            PrintService.printElementById('unified-reports-printable', {
              documentTitle: `الحافظة المالية الموحدة - ${activeClient.name} - ${fiscalBounds.endDate}`,
            })
          }
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الحافظة الموحدة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500">إجمالي الأرصدة الافتتاحية (مدين)</p>
          <p className="text-base font-black font-mono mt-1">{formatEgyptianCurrency(tb.totalOpeningDebit)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500">إجمالي حركات العام (مدين)</p>
          <p className="text-base font-black font-mono mt-1 text-blue-700">{formatEgyptianCurrency(tb.totalMovementDebit)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500">إجمالي الأرصدة الختامية في {fiscalBounds.endDate}</p>
          <p className="text-base font-black font-mono mt-1 text-emerald-700">{formatEgyptianCurrency(tb.totalClosingDebit)}</p>
        </div>
      </div>

      {onNavigateToTab && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('TRIAL_BALANCE')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold"
          >
            فتح ميزان المراجعة التفصيلي
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('FINANCIAL_STATEMENTS')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold"
          >
            فتح القوائم المالية التفصيلية
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('AUDITOR_REPORT')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
          >
            فتح تقرير مراقب الحسابات
          </button>
        </div>
      )}
    </div>
  );
};
