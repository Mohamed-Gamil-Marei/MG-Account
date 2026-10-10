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
  LineChart,
  Layers,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { FinancialStatementsView } from '../FinancialStatementsView';
import { UnifiedFinancialReportsView } from '../UnifiedFinancialReportsView';
import { FinancialNotesBuilderView } from '../FinancialNotesBuilderView';
import { AuditorReportView } from '../AuditorReportView';
import { CreditFinancialsSimulator } from '../CreditFinancialsSimulator';
import { FinancialSimulatorView } from '../FinancialSimulatorView';
import { CashFlowPredictorView } from '../financial/CashFlowPredictorView';
import { BudgetPlannerView } from '../financial/BudgetPlannerView';
import { ExchangeRatesManagerView } from '../ExchangeRatesManagerView';
import { CertificatesGeneratorView } from '../CertificatesGeneratorView';
import { FeasibilityStudyView } from '../FeasibilityStudyView';
import { ClientSelector } from '../common/ClientSelector';
import { AuditConsistencySentinelModal } from '../audit/AuditConsistencySentinelModal';
import { ShieldCheck } from 'lucide-react';

export type FinancialReportingSubTab =
  | 'ANNUAL_FINANCIAL_DOSSIER'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY'
  | 'CREDIT_SIMULATOR'
  | 'BUDGET_AND_CASHFLOW'
  | 'CURRENCY_RATES'
  | 'FINANCIAL_STATEMENTS'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT';

interface FinancialReportingHubViewProps {
  state: DatabaseState;
  initialSubTab?: FinancialReportingSubTab;
  fiscalYear?: number;
}

export const FinancialReportingHubView: React.FC<FinancialReportingHubViewProps> = ({
  state,
  initialSubTab = 'ANNUAL_FINANCIAL_DOSSIER',
  fiscalYear = 2026,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialReportingSubTab>(initialSubTab);
  const [dossierSection, setDossierSection] = useState<'STATEMENTS' | 'NOTES' | 'AUDITOR_REPORT'>('STATEMENTS');
  const [budgetSection, setBudgetSection] = useState<'BUDGET' | 'CASH_FLOW'>('BUDGET');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'FINANCIAL_STATEMENTS') {
        setActiveSubTab('ANNUAL_FINANCIAL_DOSSIER');
        setDossierSection('STATEMENTS');
      } else if (initialSubTab === 'FINANCIAL_NOTES') {
        setActiveSubTab('ANNUAL_FINANCIAL_DOSSIER');
        setDossierSection('NOTES');
      } else if (initialSubTab === 'AUDITOR_REPORT') {
        setActiveSubTab('ANNUAL_FINANCIAL_DOSSIER');
        setDossierSection('AUDITOR_REPORT');
      } else {
        setActiveSubTab(initialSubTab);
      }
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
      id: 'ANNUAL_FINANCIAL_DOSSIER',
      label: 'الملف المالي السنوي المعتمد (القوائم + الإيضاحات + تقرير المراقب)',
      icon: FileSpreadsheet,
      badge: 'الملف الكامل EAS 1 & 700',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
    {
      id: 'CERTIFICATES',
      label: 'الشهادات المهنية المعتمدة (شهادات بنكية ودخل)',
      icon: Award,
      badge: 'باركود معتمد',
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    },
    {
      id: 'FEASIBILITY_STUDY',
      label: 'دراسات الجدوى المالية والاقتصادية',
      icon: LineChart,
      badge: 'تحليل مالي',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    },
    {
      id: 'CREDIT_SIMULATOR',
      label: 'ملف الائتمان والتحليل المالي للبنوك',
      icon: TrendingUp,
      badge: 'تسهيلات بنكية',
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    },
    {
      id: 'BUDGET_AND_CASHFLOW',
      label: 'الموازنة التقديرية وتوقعات السيولة النقدية',
      icon: Calculator,
      badge: 'تخطيط مالي',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Sub-Tabs Action Buttons Deck - Clean Visible Buttons (No Horizontal Drag Bar) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
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

        <div className="hidden sm:flex items-center gap-2 text-xs shrink-0 pl-1">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>فحص الاتساق</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'ANNUAL_FINANCIAL_DOSSIER' && (
          <UnifiedFinancialReportsView
            state={state}
            fiscalYear={fiscalYear}
            initialMode={
              dossierSection === 'NOTES'
                ? 'NOTES'
                : dossierSection === 'AUDITOR_REPORT'
                ? 'AUDITOR_REPORT'
                : 'BALANCE_SHEET'
            }
            onNavigateToExchangeRates={() => setActiveSubTab('CURRENCY_RATES')}
            onNavigateToCreditSimulator={() => setActiveSubTab('CREDIT_SIMULATOR')}
          />
        )}

        {activeSubTab === 'CERTIFICATES' && (
          <CertificatesGeneratorView state={state} />
        )}

        {activeSubTab === 'FEASIBILITY_STUDY' && (
          <FeasibilityStudyView state={state} />
        )}

        {activeSubTab === 'CREDIT_SIMULATOR' && (
          <CreditFinancialsSimulator state={state} />
        )}

        {activeSubTab === 'BUDGET_AND_CASHFLOW' && (
          <div className="space-y-3">
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 max-w-md">
              <button
                type="button"
                onClick={() => setBudgetSection('BUDGET')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  budgetSection === 'BUDGET'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>الموازنة التقديرية للعام</span>
              </button>

              <button
                type="button"
                onClick={() => setBudgetSection('CASH_FLOW')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  budgetSection === 'CASH_FLOW'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>توقعات التدفقات النقدية</span>
              </button>
            </div>

            {budgetSection === 'BUDGET' ? (
              <BudgetPlannerView state={state} fiscalYear={fiscalYear} />
            ) : (
              <CashFlowPredictorView state={state} />
            )}
          </div>
        )}

        {activeSubTab === 'CURRENCY_RATES' && (
          <ExchangeRatesManagerView
            state={state}
            onNavigateToFinancialStatements={() => {
              setActiveSubTab('ANNUAL_FINANCIAL_DOSSIER');
              setDossierSection('STATEMENTS');
            }}
          />
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

export default React.memo(FinancialReportingHubView);

