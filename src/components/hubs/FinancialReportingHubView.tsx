import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCheck2,
  TrendingUp,
  Award,
  Sparkles,
  Sliders,
  Calendar,
  Calculator,
  DollarSign,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { FinancialStatementsView } from '../FinancialStatementsView';
import { FinancialNotesBuilderView } from '../FinancialNotesBuilderView';
import { AuditorReportView } from '../AuditorReportView';
import { CreditFinancialsSimulator } from '../CreditFinancialsSimulator';
import { FinancialSimulatorView } from '../FinancialSimulatorView';
import { CashFlowPredictorView } from '../financial/CashFlowPredictorView';
import { BudgetPlannerView } from '../financial/BudgetPlannerView';
import { ExchangeRatesManagerView } from '../ExchangeRatesManagerView';
import { ClientSelector } from '../common/ClientSelector';
import { AuditConsistencySentinelModal } from '../audit/AuditConsistencySentinelModal';
import { ShieldCheck } from 'lucide-react';

export type FinancialReportingSubTab =
  | 'FINANCIAL_STATEMENTS'
  | 'CURRENCY_RATES'
  | 'BUDGET_PLANNER'
  | 'CASH_FLOW_PREDICTOR'
  | 'FINANCIAL_SIMULATOR'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT'
  | 'CREDIT_SIMULATOR';

interface FinancialReportingHubViewProps {
  state: DatabaseState;
  initialSubTab?: FinancialReportingSubTab;
  fiscalYear?: number;
}

export const FinancialReportingHubView: React.FC<FinancialReportingHubViewProps> = ({
  state,
  initialSubTab = 'FINANCIAL_STATEMENTS',
  fiscalYear = 2026,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialReportingSubTab>(initialSubTab);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs: {
    id: FinancialReportingSubTab;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'FINANCIAL_STATEMENTS',
      label: 'القوائم المالية',
      icon: FileSpreadsheet,
    },
    {
      id: 'CURRENCY_RATES',
      label: 'أسعار الصرف والعملات (EAS 13)',
      icon: DollarSign,
      badge: 'متعدد العملات',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
    {
      id: 'BUDGET_PLANNER',
      label: 'الموازنة التقديرية',
      icon: Calculator,
    },
    {
      id: 'CASH_FLOW_PREDICTOR',
      label: 'التدفقات النقدية التقديرية',
      icon: Calendar,
    },
    {
      id: 'FINANCIAL_SIMULATOR',
      label: 'محاكي القوائم والنسب',
      icon: Sliders,
    },
    {
      id: 'FINANCIAL_NOTES',
      label: 'الإيضاحات المتممة',
      icon: FileText,
      badge: 'معيار 1',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'AUDITOR_REPORT',
      label: 'تقرير مراقب الحسابات',
      icon: FileCheck2,
    },
    {
      id: 'CREDIT_SIMULATOR',
      label: 'الائتمان وتوزيع الأرباح',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Hub Top Navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/50">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">القوائم والتقارير المالية</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  EAS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                المركز المالي، الدخل، التدفقات النقدية، الإيضاحات المتممة وتقرير مراقب الحسابات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>فحص الاتساق والنزاهة</span>
            </button>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
              السنة المالية: {fiscalYear}
            </span>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'FINANCIAL_STATEMENTS' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={fiscalYear}
            onNavigateToExchangeRates={() => setActiveSubTab('CURRENCY_RATES')}
            onNavigateToCreditSimulator={() => setActiveSubTab('CREDIT_SIMULATOR')}
          />
        )}
        {activeSubTab === 'CURRENCY_RATES' && (
          <ExchangeRatesManagerView
            state={state}
            onNavigateToFinancialStatements={() => setActiveSubTab('FINANCIAL_STATEMENTS')}
          />
        )}
        {activeSubTab === 'BUDGET_PLANNER' && (
          <BudgetPlannerView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'CASH_FLOW_PREDICTOR' && (
          <CashFlowPredictorView state={state} />
        )}
        {activeSubTab === 'FINANCIAL_SIMULATOR' && (
          <FinancialSimulatorView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'FINANCIAL_NOTES' && (
          <FinancialNotesBuilderView state={state} />
        )}
        {activeSubTab === 'AUDITOR_REPORT' && (
          <AuditorReportView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'CREDIT_SIMULATOR' && (
          <CreditFinancialsSimulator state={state} />
        )}
      </div>

      {/* Audit Consistency Sentinel Modal */}
      <AuditConsistencySentinelModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        state={state}
        fiscalYear={fiscalYear}
      />
    </div>
  );
};
