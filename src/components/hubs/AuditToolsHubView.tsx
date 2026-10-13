import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldAlert, ShieldCheck, Scale, FileSpreadsheet } from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { SmartExcelAuditSentinelView } from '../audit/SmartExcelAuditSentinelView';
import { FraudAuditSentinelView } from '../audit/FraudAuditSentinelView';
import { JournalAuditScannerView } from '../audit/JournalAuditScannerView';
import { ClientSelector } from '../common/ClientSelector';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';

export type AuditToolsSubTab =
  | 'EXCEL_AUDIT_SENTINEL'
  | 'FRAUD_AUDIT_SENTINEL'
  | 'JOURNAL_AUDIT_SCANNER';

interface AuditToolsHubViewProps {
  state: DatabaseState;
  initialSubTab?: AuditToolsSubTab;
}

export const AuditToolsHubView: React.FC<AuditToolsHubViewProps> = ({
  state,
  initialSubTab = 'EXCEL_AUDIT_SENTINEL',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AuditToolsSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs = [
    {
      id: 'EXCEL_AUDIT_SENTINEL' as AuditToolsSubTab,
      label: 'مختبر مراجعة الإكسيل والميزان (XAI)',
      icon: Sparkles,
      badge: 'فحص ذكي',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    },
    {
      id: 'FRAUD_AUDIT_SENTINEL' as AuditToolsSubTab,
      label: 'كشف الاحتيال وقانون بنفورد',
      icon: ShieldAlert,
      badge: 'Benford Law',
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    },
    {
      id: 'JOURNAL_AUDIT_SCANNER' as AuditToolsSubTab,
      label: 'فحص وتدقيق قيود اليومية',
      icon: ShieldCheck,
      badge: 'شذوذ القيود',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Sub Tabs Bar */}
      <ResponsiveSubTabBar
        tabs={tabs.map((t) => ({
          id: t.id,
          label: t.label,
          icon: React.createElement(t.icon, { className: 'w-4 h-4 shrink-0' }),
          badge: t.badge ? (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.badgeColor || ''}`}>
              {t.badge}
            </span>
          ) : undefined,
        }))}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as AuditToolsSubTab)}
      />

      {/* Sub View Content */}
      <div>
        {activeSubTab === 'EXCEL_AUDIT_SENTINEL' && (
          <SmartExcelAuditSentinelView state={state} />
        )}
        {activeSubTab === 'FRAUD_AUDIT_SENTINEL' && (
          <FraudAuditSentinelView state={state} />
        )}
        {activeSubTab === 'JOURNAL_AUDIT_SCANNER' && (
          <JournalAuditScannerView state={state} />
        )}
      </div>
    </div>
  );
};

export default React.memo(AuditToolsHubView);
