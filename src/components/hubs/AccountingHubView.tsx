import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Receipt,
  BookOpen,
  Scale,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { ChartOfAccountsView } from '../ChartOfAccountsView';
import { JournalEntriesView } from '../JournalEntriesView';
import { GeneralLedgerView } from '../GeneralLedgerView';
import { TrialBalanceView } from '../TrialBalanceView';
import { FixedAssetsView } from '../FixedAssetsView';

export type AccountingSubTab = 'JOURNAL_ENTRIES' | 'CHART_OF_ACCOUNTS' | 'GENERAL_LEDGER' | 'TRIAL_BALANCE' | 'FIXED_ASSETS';

interface AccountingHubViewProps {
  state: DatabaseState;
  initialSubTab?: AccountingSubTab;
  fiscalYear?: number;
}

export const AccountingHubView: React.FC<AccountingHubViewProps> = ({
  state,
  initialSubTab = 'JOURNAL_ENTRIES',
  fiscalYear = 2026,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AccountingSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const unpostedEntriesCount = state.journalEntries.filter((e) => !e.isPosted).length;
  const postedEntriesCount = state.journalEntries.filter((e) => e.isPosted).length;
  const fixedAssetsCount = state.fixedAssets?.length || 0;

  const tabs: {
    id: AccountingSubTab;
    label: string;
    description: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'JOURNAL_ENTRIES',
      label: 'قيود اليومية والترحيل',
      description: 'تسجيل القيود وتعدد العملات والترحيل الآلي',
      icon: Receipt,
      badge: unpostedEntriesCount > 0 ? `${unpostedEntriesCount} غير مرحل` : `${state.journalEntries.length}`,
      badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'CHART_OF_ACCOUNTS',
      label: 'شجرة الحسابات المصرية',
      description: 'دليل الحسابات الموحد والتكويد الشجري',
      icon: FolderTree,
      badge: state.accounts.length,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'GENERAL_LEDGER',
      label: 'دفتر الأستاذ العام',
      description: 'كشوف الحسابات والأرصدة المتحركة اللحظية',
      icon: BookOpen,
    },
    {
      id: 'TRIAL_BALANCE',
      label: 'ميزان المراجعة بالمجاميع',
      description: 'التحقق من توازن الأرصدة والمجاميع الختامية',
      icon: Scale,
    },
    {
      id: 'FIXED_ASSETS',
      label: 'سجل وإهلاك الأصول (معيار 10)',
      description: 'حساب الإهلاك المحاسبي والضريبي (قانون 91) والترحيل الآلي',
      icon: Building,
      badge: `${fixedAssetsCount} أصل`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Top Navigation Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مركز الدورة المحاسبية العامة</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  EAS Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة متكاملة لشجرة الحسابات، قيود اليومية، الترحيل الآلي، دفتر الأستاذ، وميزان المراجعة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <span className="text-slate-500">القيود المرحلة:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {postedEntriesCount}
              </span>
            </div>
            {unpostedEntriesCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                <span className="text-amber-700">تحت المراجعة:</span>
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {unpostedEntriesCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tab.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'JOURNAL_ENTRIES' && <JournalEntriesView state={state} />}
        {activeSubTab === 'CHART_OF_ACCOUNTS' && <ChartOfAccountsView state={state} />}
        {activeSubTab === 'GENERAL_LEDGER' && <GeneralLedgerView state={state} />}
        {activeSubTab === 'TRIAL_BALANCE' && <TrialBalanceView state={state} fiscalYear={fiscalYear} />}
        {activeSubTab === 'FIXED_ASSETS' && <FixedAssetsView state={state} fiscalYear={fiscalYear} />}
      </div>
    </div>
  );
};
