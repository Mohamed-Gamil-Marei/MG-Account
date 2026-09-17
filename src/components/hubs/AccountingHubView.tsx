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
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { ChartOfAccountsView } from '../ChartOfAccountsView';
import { JournalEntriesView } from '../JournalEntriesView';
import { GeneralLedgerView } from '../GeneralLedgerView';
import { TrialBalanceView } from '../TrialBalanceView';
import { FixedAssetsView } from '../FixedAssetsView';
import { BankReconciliationView } from '../accounting/BankReconciliationView';
import { InvoiceOcrScannerView } from '../accounting/InvoiceOcrScannerView';
import { ExchangeRatesManagerView } from '../ExchangeRatesManagerView';
import { JournalEntryNotesAuditorView } from '../accounting/JournalEntryNotesAuditorView';
import { ClientSelector } from '../common/ClientSelector';

export type AccountingSubTab =
  | 'JOURNAL_ENTRIES'
  | 'JOURNAL_AUDITOR'
  | 'OCR_INVOICE_SCANNER'
  | 'CHART_OF_ACCOUNTS'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'FIXED_ASSETS'
  | 'BANK_RECONCILIATION'
  | 'CURRENCY_EXCHANGE_RATES';

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
    icon: any;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'JOURNAL_ENTRIES',
      label: 'قيود اليومية',
      icon: Receipt,
      badge: unpostedEntriesCount > 0 ? `${unpostedEntriesCount} غير مرحل` : `${state.journalEntries.length}`,
      badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'JOURNAL_AUDITOR',
      label: 'فاحص ومُصحّح توجيه القيود (Notes Audit)',
      icon: Sparkles,
      badge: 'ذكي',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    },
    {
      id: 'OCR_INVOICE_SCANNER',
      label: 'مسح الفواتير (OCR)',
      icon: Sparkles,
    },
    {
      id: 'CHART_OF_ACCOUNTS',
      label: 'دليل الحسابات',
      icon: FolderTree,
      badge: state.accounts.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'GENERAL_LEDGER',
      label: 'دفتر الأستاذ',
      icon: BookOpen,
    },
    {
      id: 'TRIAL_BALANCE',
      label: 'ميزان المراجعة',
      icon: Scale,
    },
    {
      id: 'FIXED_ASSETS',
      label: 'الأصول والإهلاك',
      icon: Building,
      badge: fixedAssetsCount > 0 ? `${fixedAssetsCount}` : undefined,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'BANK_RECONCILIATION',
      label: 'مذكرة التسوية البنكية',
      icon: CreditCard,
    },
    {
      id: 'CURRENCY_EXCHANGE_RATES',
      label: 'أسعار الصرف اليومية (EAS 13)',
      icon: DollarSign,
      badge: 'متعدد العملات',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
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
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">الدورة المحاسبية العامة</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  EAS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                قيود اليومية، دليل الحسابات، دفتر الأستاذ وميزان المراجعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto">
            <div className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">مرحل:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {postedEntriesCount}
              </span>
            </div>
            {unpostedEntriesCount > 0 && (
              <div className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1.5 text-[11px]">
                <span className="text-amber-700 dark:text-amber-400">غير مرحل:</span>
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {unpostedEntriesCount}
                </span>
              </div>
            )}
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
                {tab.badge !== undefined && (
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
        {activeSubTab === 'JOURNAL_ENTRIES' && <JournalEntriesView state={state} />}
        {activeSubTab === 'JOURNAL_AUDITOR' && (
          <JournalEntryNotesAuditorView
            state={state}
            onNavigateToJournal={() => setActiveSubTab('JOURNAL_ENTRIES')}
          />
        )}
        {activeSubTab === 'OCR_INVOICE_SCANNER' && (
          <InvoiceOcrScannerView
            onNavigateToJournal={() => setActiveSubTab('JOURNAL_ENTRIES')}
          />
        )}
        {activeSubTab === 'CHART_OF_ACCOUNTS' && <ChartOfAccountsView state={state} />}
        {activeSubTab === 'GENERAL_LEDGER' && <GeneralLedgerView state={state} />}
        {activeSubTab === 'TRIAL_BALANCE' && <TrialBalanceView state={state} fiscalYear={fiscalYear} />}
        {activeSubTab === 'FIXED_ASSETS' && <FixedAssetsView state={state} fiscalYear={fiscalYear} />}
        {activeSubTab === 'BANK_RECONCILIATION' && <BankReconciliationView state={state} />}
        {activeSubTab === 'CURRENCY_EXCHANGE_RATES' && <ExchangeRatesManagerView state={state} />}
      </div>
    </div>
  );
};

export default React.memo(AccountingHubView);

