import React, { useState, useMemo } from 'react';
import {
  Scale,
  FileSpreadsheet,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { TrialBalanceView } from './TrialBalanceView';
import { FinancialStatementsView } from './FinancialStatementsView';
import { UnifiedFinancialReportExportModal } from './financial/UnifiedFinancialReportExportModal';
import { PrintExportControlModal } from './common/PrintExportControlModal';
import { computeAccountBalances, generateIncomeStatement } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface UnifiedFinancialReportsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  initialMode?: 'TRIAL_BALANCE' | 'FINANCIAL_STATEMENTS';
  onNavigateToExchangeRates?: () => void;
  onNavigateToCreditSimulator?: () => void;
}

export const UnifiedFinancialReportsView: React.FC<UnifiedFinancialReportsViewProps> = ({
  state,
  fiscalYear = 2026,
  initialMode = 'TRIAL_BALANCE',
  onNavigateToExchangeRates,
  onNavigateToCreditSimulator,
}) => {
  const [activeMode, setActiveMode] = useState<'TRIAL_BALANCE' | 'FINANCIAL_STATEMENTS'>(initialMode);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);

  const currentFiscalYear = state.activeClientContext?.selectedFiscalYear || fiscalYear || 2026;
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId);

  // Filter journal entries for quick KPI computation
  const filteredEntries = useMemo(() => {
    return state.journalEntries.filter((e) => {
      if (activeClientId && e.clientId && e.clientId !== activeClientId) {
        return false;
      }
      if (e.date && !e.date.startsWith(String(currentFiscalYear))) {
        return false;
      }
      return true;
    });
  }, [state.journalEntries, activeClientId, currentFiscalYear]);

  // Quick summary calculations for Trial Balance and Net Income
  const summary = useMemo(() => {
    const balances = computeAccountBalances(state.accounts, filteredEntries);
    let totalDebit = 0;
    let totalCredit = 0;

    balances
      .filter((a) => a.level >= 2)
      .forEach((a) => {
        totalDebit += a.totalDebit || 0;
        totalCredit += a.totalCredit || 0;
      });

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const diff = Math.abs(totalDebit - totalCredit);

    const incomeStmt = generateIncomeStatement(balances);
    const netProfit = incomeStmt.netProfitAfterTax || 0;

    return {
      totalDebit,
      totalCredit,
      isBalanced,
      diff,
      netProfit,
      accountsCount: balances.filter((a) => a.level >= 2).length,
    };
  }, [state.accounts, filteredEntries]);

  return (
    <div className="space-y-2.5">
      {/* Compact Switcher & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Switcher & Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Instant Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode('TRIAL_BALANCE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeMode === 'TRIAL_BALANCE'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>ميزان المراجعة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('FINANCIAL_STATEMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeMode === 'FINANCIAL_STATEMENTS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>القوائم المالية الختامية</span>
            </button>
          </div>

          {/* Quick Metrics Inline */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono border-r border-slate-200 dark:border-slate-700 pr-3">
            <span className="text-slate-500">
              مدين: <strong className="text-slate-800 dark:text-slate-200">{formatEgyptianCurrency(summary.totalDebit)}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-500">
              دائن: <strong className="text-slate-800 dark:text-slate-200">{formatEgyptianCurrency(summary.totalCredit)}</strong>
            </span>
            <span>•</span>
            <span className={summary.isBalanced ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {summary.isBalanced ? 'موزون ✓' : `فرق: ${formatEgyptianCurrency(summary.diff)}`}
            </span>
            <span>•</span>
            <span className="text-slate-500">
              الربح: <strong className={summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatEgyptianCurrency(summary.netProfit)}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPrintSettingsOpen(true)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            title="التحكم في أساليب الطباعة، إظهار/إخفاء الـ QR، شكل الختم، والهوامش"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>إعدادات الطباعة</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
            title="تصدير ميزان المراجعة والقوائم المالية في ملف PDF مجمع بختم المكتب"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>تصدير وطباعة PDF</span>
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      <div className="transition-all duration-150">
        {activeMode === 'TRIAL_BALANCE' ? (
          <div className="space-y-3">
            <TrialBalanceView state={state} fiscalYear={currentFiscalYear} />
          </div>
        ) : (
          <div className="space-y-3">
            <FinancialStatementsView
              state={state}
              fiscalYear={currentFiscalYear}
              onNavigateToExchangeRates={onNavigateToExchangeRates}
              onNavigateToCreditSimulator={onNavigateToCreditSimulator}
            />
          </div>
        )}
      </div>

      {/* Unified Financial Report Export & Print Modal */}
      <UnifiedFinancialReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        state={state}
        fiscalYear={currentFiscalYear}
      />

      {/* Print, Export & QR Code Settings Modal */}
      <PrintExportControlModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </div>
  );
};
