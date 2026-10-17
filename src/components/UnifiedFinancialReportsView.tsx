import React, { useState } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { FinancialStatementsView } from './FinancialStatementsView';
import { AuditorReportView } from './AuditorReportView';
import { FileSpreadsheet, Award } from 'lucide-react';

export interface UnifiedFinancialReportsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  initialMode?: 'BALANCE_SHEET' | 'INCOME' | 'CASH_FLOW' | 'NOTES' | 'AUDITOR_REPORT' | string;
  onNavigateToExchangeRates?: () => void;
  onNavigateToCreditSimulator?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const UnifiedFinancialReportsView: React.FC<UnifiedFinancialReportsViewProps> = ({
  state,
  fiscalYear = 2026,
  initialMode = 'BALANCE_SHEET',
  onNavigateToExchangeRates,
  onNavigateToCreditSimulator,
  onNavigateToTab,
}) => {
  const [mode, setMode] = useState<string>(initialMode);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setMode('BALANCE_SHEET')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            mode !== 'AUDITOR_REPORT'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>القوائم المالية والإيضاحات المتممة</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('AUDITOR_REPORT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            mode === 'AUDITOR_REPORT'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>تقرير مراقب الحسابات المعتمد</span>
        </button>
      </div>

      {mode === 'AUDITOR_REPORT' ? (
        <AuditorReportView state={state} />
      ) : (
        <FinancialStatementsView
          state={state}
          fiscalYear={fiscalYear}
          initialStatementTab={mode === 'NOTES' ? 'NOTES' : 'BALANCE_SHEET'}
          onNavigateToExchangeRates={onNavigateToExchangeRates}
          onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
