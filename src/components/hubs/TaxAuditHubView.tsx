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
  | 'PAYROLL_INSURANCE';

interface TaxAuditHubViewProps {
  state: DatabaseState;
  initialSubTab?: TaxAuditSubTab;
}

export const TaxAuditHubView: React.FC<TaxAuditHubViewProps> = ({
  state,
  initialSubTab = 'TAX_TRACKER',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TaxAuditSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

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
      id: 'EXCEL_AUDIT_SENTINEL',
      label: 'مختبر مراجعة الإكسيل (XAI)',
      icon: Sparkles,
      badge: 'فحص ذكي',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    },
    {
      id: 'JOURNAL_AUDIT_SCANNER',
      label: 'فحص القيود والدفاتر',
      icon: ShieldAlert,
    },
    {
      id: 'AUDIT_WORKING_PAPERS',
      label: 'أوراق عمل المراجعة (معيار 320)',
      icon: FileCheck2,
      badge: 'ESA 320',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Compact Sub-Tabs Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar flex-1 min-w-0">
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

        {pendingTaxesCount > 0 && (
          <div className="flex items-center gap-2 text-xs shrink-0 pl-1">
            <button
              onClick={() => setActiveSubTab('TAX_TRACKER')}
              className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            >
              <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>{pendingTaxesCount} مستحق</span>
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
      </div>
    </div>
  );
};

export default React.memo(TaxAuditHubView);

