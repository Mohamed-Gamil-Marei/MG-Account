import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  FolderArchive,
  ShieldAlert,
  CreditCard,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { CreditFinancialsSimulator } from '../CreditFinancialsSimulator';
import { CreditDossierRegistryView } from '../CreditDossierRegistryView';
import { ClientSelector } from '../common/ClientSelector';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';

export type CreditSubTab =
  | 'CREDIT_SIMULATOR'
  | 'QUICK_BANK_DOSSIER'
  | 'CREDIT_DOSSIER_REGISTRY';

interface CreditHubViewProps {
  state: DatabaseState;
  initialSubTab?: CreditSubTab;
}

export const CreditHubView: React.FC<CreditHubViewProps> = ({
  state,
  initialSubTab = 'CREDIT_SIMULATOR',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CreditSubTab>(initialSubTab);
  const currentUser = db.getCurrentUser();

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Permission check: respect canAccessCreditFiles
  if (currentUser && currentUser.canAccessCreditFiles === false) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-1">
          غير مصرح بالوصول إلى مركز الائتمان
        </h3>
        <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
          ليس لديك صلاحية الوصول إلى ملفات الائتمان البنكية ودراسات الملاءة المالية. يرجى مراجعة مدير النظام لمنح صلاحية (canAccessCreditFiles).
        </p>
      </div>
    );
  }

  const tabs: {
    id: CreditSubTab;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'CREDIT_SIMULATOR',
      label: 'القوائم السنوية وملف البنك التقديري',
      icon: TrendingUp,
      badge: 'EAS 1 & البنوك',
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    },
    {
      id: 'QUICK_BANK_DOSSIER',
      label: 'التحليل الائتماني السريع ونسب الجدارة',
      icon: FileSpreadsheet,
      badge: 'نسب التغطية وZ-Score',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
    {
      id: 'CREDIT_DOSSIER_REGISTRY',
      label: 'سجل وأرشيف ملفات الائتمان',
      icon: FolderArchive,
      badge: `${state.creditSimulations.length || 0} ملف`,
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
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
        onTabChange={(id) => setActiveSubTab(id as CreditSubTab)}
      />

      {/* Sub View Content */}
      <div>
        {activeSubTab === 'CREDIT_SIMULATOR' && (
          <CreditFinancialsSimulator state={state} initialMode="DEDICATED_YEAR" />
        )}
        {activeSubTab === 'QUICK_BANK_DOSSIER' && (
          <CreditFinancialsSimulator state={state} initialMode="KPIS" />
        )}
        {activeSubTab === 'CREDIT_DOSSIER_REGISTRY' && (
          <CreditDossierRegistryView state={state} />
        )}
      </div>
    </div>
  );
};

export default React.memo(CreditHubView);
