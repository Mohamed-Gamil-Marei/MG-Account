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
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxTrackerView } from '../TaxTrackerView';
import { TaxExposureSimulatorView } from '../TaxExposureSimulatorView';
import { TaxPenaltySimulatorView } from '../TaxPenaltySimulatorView';
import { EtaReconciliationView } from '../EtaReconciliationView';
import { PayrollInsuranceEngineView } from '../PayrollInsuranceEngineView';
import { AuditWorkingPapersView } from '../AuditWorkingPapersView';
import { JournalAuditScannerView } from '../audit/JournalAuditScannerView';
import { FraudAuditSentinelView } from '../audit/FraudAuditSentinelView';
import { ClientSelector } from '../common/ClientSelector';
import { runAutomatedJournalAudit } from '../../services/journalAuditEngine';

export type TaxAuditSubTab =
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

  const auditScanResults = useMemo(() => {
    return runAutomatedJournalAudit(state.journalEntries, {
      clientId: state.activeClientContext?.clientId,
      fiscalYear: state.activeClientContext?.selectedFiscalYear,
    });
  }, [state.journalEntries, state.activeClientContext]);

  const anomaliesCount = auditScanResults.findings.length;

  const tabs: {
    id: TaxAuditSubTab;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'TAX_TRACKER',
      label: 'الإقرارات الضريبية',
      icon: Percent,
      badge: pendingTaxesCount > 0 ? `${pendingTaxesCount} مستحق` : undefined,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
    {
      id: 'TAX_PENALTY_SIMULATOR',
      label: 'غرامات التأخير',
      icon: Clock,
    },
    {
      id: 'FRAUD_AUDIT_SENTINEL',
      label: 'التحليل المالي والرقابي',
      icon: Activity,
    },
    {
      id: 'JOURNAL_AUDIT_SCANNER',
      label: 'فحص القيود والدفاتر',
      icon: ShieldAlert,
      badge: anomaliesCount > 0 ? `${anomaliesCount}` : undefined,
      badgeColor: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'AUDIT_WORKING_PAPERS',
      label: 'أوراق عمل المراجعة',
      icon: ShieldCheck,
      badge: 'معيار 320',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'TAX_EXPOSURE_SIMULATOR',
      label: 'المخاطر والفحص الضريبي',
      icon: AlertTriangle,
    },
    {
      id: 'ETA_RECONCILIATION',
      label: 'مطابقة منظومة الفاتورة',
      icon: FileCode2,
    },
    {
      id: 'PAYROLL_INSURANCE',
      label: 'الأجور والتأمينات',
      icon: Calculator,
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
              <Percent className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">الضرائب والمراجعة والامتثال</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  ETA & ESA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                الإقرارات الضريبية، الفحص المالي، أوراق العمل ومطابقة الفاتورة الإلكترونية
              </p>
            </div>
          </div>

          {anomaliesCount > 0 && (
            <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setActiveSubTab('JOURNAL_AUDIT_SCANNER')}
                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{anomaliesCount} ملاحظات قيود</span>
              </button>
            </div>
          )}
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
        {activeSubTab === 'TAX_TRACKER' && <TaxTrackerView state={state} />}
        {activeSubTab === 'TAX_PENALTY_SIMULATOR' && <TaxPenaltySimulatorView state={state} />}
        {activeSubTab === 'FRAUD_AUDIT_SENTINEL' && <FraudAuditSentinelView state={state} />}
        {activeSubTab === 'JOURNAL_AUDIT_SCANNER' && <JournalAuditScannerView state={state} />}
        {activeSubTab === 'AUDIT_WORKING_PAPERS' && <AuditWorkingPapersView state={state} />}
        {activeSubTab === 'TAX_EXPOSURE_SIMULATOR' && <TaxExposureSimulatorView state={state} />}
        {activeSubTab === 'ETA_RECONCILIATION' && <EtaReconciliationView state={state} />}
        {activeSubTab === 'PAYROLL_INSURANCE' && <PayrollInsuranceEngineView state={state} />}
      </div>
    </div>
  );
};
