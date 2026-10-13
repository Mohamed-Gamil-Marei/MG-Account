import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Award,
  LineChart,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { UnifiedFinancialReportsView } from '../UnifiedFinancialReportsView';
import { ExchangeRatesManagerView } from '../ExchangeRatesManagerView';
import { CertificatesGeneratorView } from '../CertificatesGeneratorView';
import { FeasibilityStudyView } from '../FeasibilityStudyView';
import { ClientSelector } from '../common/ClientSelector';
import { AuditConsistencySentinelModal } from '../audit/AuditConsistencySentinelModal';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';
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
  onNavigateToTab?: (tab: string) => void;
}

export const FinancialReportingHubView: React.FC<FinancialReportingHubViewProps> = ({
  state,
  initialSubTab = 'ANNUAL_FINANCIAL_DOSSIER',
  fiscalYear = 2026,
  onNavigateToTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialReportingSubTab>(
    initialSubTab === 'CREDIT_SIMULATOR' || initialSubTab === 'BUDGET_AND_CASHFLOW'
      ? 'ANNUAL_FINANCIAL_DOSSIER'
      : initialSubTab
  );
  const [dossierSection, setDossierSection] = useState<'STATEMENTS' | 'NOTES' | 'AUDITOR_REPORT'>('STATEMENTS');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'CREDIT_SIMULATOR' && onNavigateToTab) {
        onNavigateToTab('CREDIT_HUB');
      } else if (initialSubTab === 'BUDGET_AND_CASHFLOW' && onNavigateToTab) {
        onNavigateToTab('FINANCIAL_PLANNING_HUB');
      } else if (initialSubTab === 'FINANCIAL_STATEMENTS') {
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
  }, [initialSubTab, onNavigateToTab]);

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
  ];

  return (
    <div className="space-y-2.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Sub-Tabs Action Buttons Deck - Responsive Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <ResponsiveSubTabBar
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: React.createElement(tab.icon, { className: 'w-4 h-4 shrink-0' }),
            badge: tab.badge !== undefined ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${tab.badgeColor || ''}`}>
                {tab.badge}
              </span>
            ) : undefined,
          }))}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as FinancialReportingSubTab)}
          maxVisibleTabs={4}
          className="flex-1"
        />

        <div className="hidden sm:flex items-center gap-2 text-xs shrink-0 pl-1">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>فحص الاتساق (ESA)</span>
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
            onNavigateToCreditSimulator={() => {
              if (onNavigateToTab) {
                onNavigateToTab('CREDIT_HUB');
              }
            }}
            onNavigateToTab={onNavigateToTab}
          />
        )}

        {activeSubTab === 'CERTIFICATES' && (
          <CertificatesGeneratorView state={state} />
        )}

        {activeSubTab === 'FEASIBILITY_STUDY' && (
          <FeasibilityStudyView state={state} />
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

