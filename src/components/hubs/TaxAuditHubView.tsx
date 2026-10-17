import React, { useState, useEffect, useMemo } from 'react';
import {
  Percent,
  ShieldAlert,
  FileCode2,
  Calculator,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  FileCheck2,
  Clock,
  Activity,
  Key,
  Calendar,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxTrackerView } from '../TaxTrackerView';
import { TaxFilingCredentialsGridView } from '../tax/TaxFilingCredentialsGridView';
import { UnifiedTaxFilingAgendaView } from '../tax/UnifiedTaxFilingAgendaView';
import { TaxExposureSimulatorView } from '../TaxExposureSimulatorView';
import { TaxPenaltySimulatorView } from '../TaxPenaltySimulatorView';
import { EtaReconciliationView } from '../EtaReconciliationView';
import { PayrollInsuranceEngineView } from '../PayrollInsuranceEngineView';
import { AuditWorkingPapersView } from '../AuditWorkingPapersView';
import { JournalAuditScannerView } from '../audit/JournalAuditScannerView';
import { FraudAuditSentinelView } from '../audit/FraudAuditSentinelView';
import { AuditConsistencySentinelView } from '../audit/AuditConsistencySentinelView';
import { SmartExcelAuditSentinelView } from '../audit/SmartExcelAuditSentinelView';
import { ClientSelector } from '../common/ClientSelector';
import { TaxRiskAndPenaltiesView } from '../tax/TaxRiskAndPenaltiesView';
import { TaxAppealsDefenseView } from '../tax/TaxAppealsDefenseView';
import { TaxMandateScheduler } from '../TaxMandateScheduler';
import { EInvoicingTokensRegistryView } from '../tax/EInvoicingTokensRegistryView';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';
import { Scale } from 'lucide-react';
import { runAutomatedJournalAudit } from '../../services/journalAuditEngine';

export type TaxAuditSubTab =
  | 'TAX_FILING_CELLS'
  | 'EXCEL_AUDIT_SENTINEL'
  | 'AUDIT_CONSISTENCY_SENTINEL'
  | 'TAX_TRACKER'
  | 'TAX_PENALTY_SIMULATOR'
  | 'JOURNAL_AUDIT_SCANNER'
  | 'FRAUD_AUDIT_SENTINEL'
  | 'AUDIT_WORKING_PAPERS'
  | 'TAX_EXPOSURE_SIMULATOR'
  | 'ETA_RECONCILIATION'
  | 'PAYROLL_INSURANCE'
  | 'TAX_APPEALS'
  | 'TAX_MANDATES';

interface TaxAuditHubViewProps {
  state: DatabaseState;
  initialSubTab?: TaxAuditSubTab;
  onNavigateToTab?: (tab: string) => void;
}

export const TaxAuditHubView: React.FC<TaxAuditHubViewProps> = ({
  state,
  initialSubTab = 'TAX_TRACKER',
  onNavigateToTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TaxAuditSubTab>(
    initialSubTab === 'EXCEL_AUDIT_SENTINEL' ||
      initialSubTab === 'JOURNAL_AUDIT_SCANNER' ||
      initialSubTab === 'FRAUD_AUDIT_SENTINEL'
      ? 'TAX_TRACKER'
      : initialSubTab
  );

  useEffect(() => {
    if (
      (initialSubTab === 'EXCEL_AUDIT_SENTINEL' ||
        initialSubTab === 'JOURNAL_AUDIT_SCANNER' ||
        initialSubTab === 'FRAUD_AUDIT_SENTINEL') &&
      onNavigateToTab
    ) {
      onNavigateToTab('AUDIT_TOOLS_HUB');
    } else if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, onNavigateToTab]);

  const pendingTaxesCount = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  ).length;

  const tabs: {
    id: TaxAuditSubTab;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'TAX_TRACKER',
      label: 'الإقرارات والمنظومات الضريبية (SAP وعامة)',
      icon: Percent,
      badge: pendingTaxesCount > 0 ? `${pendingTaxesCount} مستحق` : undefined,
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    },
    {
      id: 'ETA_RECONCILIATION',
      label: 'مطابقة منظومة الفاتورة (ETA)',
      icon: FileCode2,
    },
    {
      id: 'PAYROLL_INSURANCE',
      label: 'كسب العمل والتأمينات الاجتماعية',
      icon: Calculator,
    },
    {
      id: 'TAX_PENALTY_SIMULATOR',
      label: 'المخاطر وغرامات التأخير (قانون 206)',
      icon: Scale,
    },
    {
      id: 'AUDIT_WORKING_PAPERS',
      label: 'أوراق عمل المراجعة (معيار 320)',
      icon: FileCheck2,
      badge: 'ESA 320',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'TAX_APPEALS',
      label: 'الطعون والمذكرات الضريبية',
      icon: Scale,
    },
    {
      id: 'TAX_MANDATES',
      label: 'مأموريات ومواعيد الضرائب',
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Responsive Sub-Tabs Toolbar (ما يتسع وضع الباقي في زر المزيد ▾، وعلى الموبايل زر عريض) */}
      <div className="space-y-2">
        <ResponsiveSubTabBar
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: React.createElement(tab.icon, { className: 'w-4 h-4 shrink-0' }),
            badge: tab.badge !== undefined ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono ${tab.badgeColor || ''}`}>
                {tab.badge}
              </span>
            ) : undefined,
          }))}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as TaxAuditSubTab)}
          maxVisibleTabs={4}
        />

        {pendingTaxesCount > 0 && (
          <div className="flex items-center justify-end px-1">
            <button
              onClick={() => setActiveSubTab('TAX_TRACKER')}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>يوجد {pendingTaxesCount} إقرار مستحق يتطلب المتابعة</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Active Sub-View */}
      <div>
        {(activeSubTab === 'TAX_TRACKER' || activeSubTab === 'TAX_FILING_CELLS') && (
          <UnifiedTaxFilingAgendaView state={state} />
        )}
        {activeSubTab === 'EXCEL_AUDIT_SENTINEL' && <SmartExcelAuditSentinelView state={state} />}
        {activeSubTab === 'AUDIT_CONSISTENCY_SENTINEL' && (
          <AuditConsistencySentinelView
            state={state}
            fiscalYear={state.activeClientContext?.selectedFiscalYear || 2026}
          />
        )}
        {(activeSubTab === 'TAX_PENALTY_SIMULATOR' || activeSubTab === 'TAX_EXPOSURE_SIMULATOR') && (
          <TaxRiskAndPenaltiesView
            state={state}
            initialMode={activeSubTab === 'TAX_EXPOSURE_SIMULATOR' ? 'EXPOSURE' : 'PENALTIES'}
          />
        )}
        {activeSubTab === 'FRAUD_AUDIT_SENTINEL' && <FraudAuditSentinelView state={state} />}
        {activeSubTab === 'JOURNAL_AUDIT_SCANNER' && <JournalAuditScannerView state={state} />}
        {activeSubTab === 'AUDIT_WORKING_PAPERS' && <AuditWorkingPapersView state={state} />}
        {activeSubTab === 'ETA_RECONCILIATION' && <EtaReconciliationView state={state} />}
        {activeSubTab === 'PAYROLL_INSURANCE' && <PayrollInsuranceEngineView state={state} />}
        {activeSubTab === 'TAX_APPEALS' && <TaxAppealsDefenseView state={state} />}
        {activeSubTab === 'TAX_MANDATES' && <TaxMandateScheduler state={state} />}
      </div>
    </div>
  );
};

export default React.memo(TaxAuditHubView);

