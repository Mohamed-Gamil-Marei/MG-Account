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
  FileSpreadsheet,
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
import { UnifiedFinancialReportsView } from '../UnifiedFinancialReportsView';
import { ClientSelector } from '../common/ClientSelector';
import { ShieldCheck, ShieldAlert, Factory, Percent } from 'lucide-react';
import { MultiTenantWorkspacesModal } from '../common/MultiTenantWorkspacesModal';
import { AcceleratedDepreciationCalculatorModal } from '../industrial/AcceleratedDepreciationCalculatorModal';
import { IndustrialCostManagerModal } from '../industrial/IndustrialCostManagerModal';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';

export type AccountingSubTab =
  | 'JOURNAL_ENTRIES'
  | 'CHART_OF_ACCOUNTS'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'FINANCIAL_STATEMENTS'
  | 'OCR_INVOICE_SCANNER'
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
  const [isWorkspacesModalOpen, setIsWorkspacesModalOpen] = useState(false);
  const [isDeprecModalOpen, setIsDeprecModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);

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
      badge: 'فحص الاتزان',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
    {
      id: 'FINANCIAL_STATEMENTS',
      label: 'القوائم المالية والملف المعتمد',
      icon: FileSpreadsheet,
      badge: 'EAS 1 معتمد',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold',
    },
    {
      id: 'OCR_INVOICE_SCANNER',
      label: 'مسح الفواتير (OCR)',
      icon: Sparkles,
      badge: 'قيد فوري',
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
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
      label: 'أسعار الصرف (EAS 13)',
      icon: DollarSign,
      badge: 'متعدد العملات',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Clear Direct Navigation Buttons Deck (بدون أي شريط جر أو سحب جانبي - أزرار واضحة مباشرة) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              نظام الحسابات والقوائم المالية المعتمدة:
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              اضغط على أي زر للتنقل المباشر بين أقسام الدورة المحاسبية
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setIsWorkspacesModalOpen(true)}
              title="إدارة بيئات عمل الشركات والمصانع المتعددة (Multi-Tenant Hub)"
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Factory className="w-3.5 h-3.5 text-amber-600" />
              <span>بيئات الكيانات</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCostModalOpen(true)}
              title="محاسبة التكاليف ومراكز التكلفة الصناعية FOH"
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>تكاليف FOH</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeprecModalOpen(true)}
              title="الإهلاك الصناعي المعجل 30% - المادة 27 قانون 91/2005"
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              <span>إهلاك 30%</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono mr-1">
              مرحل: <strong className="text-emerald-600">{postedEntriesCount}</strong>
              {unpostedEntriesCount > 0 && (
                <> | غير مرحل: <strong className="text-amber-600">{unpostedEntriesCount}</strong></>
              )}
            </span>
          </div>
        </div>

        {/* Responsive Navigation Buttons Deck (ما يتسع وضع الباقي في زر المزيد ▾، وعلى الموبايل زر عريض) */}
        <ResponsiveSubTabBar
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: React.createElement(tab.icon, { className: 'w-4 h-4 shrink-0' }),
            badge: tab.badge !== undefined ? (
              <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md font-mono ${tab.badgeColor || ''}`}>
                {tab.badge}
              </span>
            ) : undefined,
          }))}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as AccountingSubTab)}
          maxVisibleTabs={5}
        />
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'JOURNAL_ENTRIES' && <JournalEntriesView state={state} />}
        {activeSubTab === 'CHART_OF_ACCOUNTS' && <ChartOfAccountsView state={state} />}
        {activeSubTab === 'GENERAL_LEDGER' && <GeneralLedgerView state={state} />}
        {activeSubTab === 'TRIAL_BALANCE' && (
          <TrialBalanceView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'FINANCIAL_STATEMENTS' && (
          <UnifiedFinancialReportsView
            state={state}
            fiscalYear={fiscalYear}
            initialMode="BALANCE_SHEET"
            onNavigateToExchangeRates={() => setActiveSubTab('CURRENCY_EXCHANGE_RATES')}
          />
        )}
        {activeSubTab === 'OCR_INVOICE_SCANNER' && (
          <InvoiceOcrScannerView
            onNavigateToJournal={() => setActiveSubTab('JOURNAL_ENTRIES')}
          />
        )}
        {activeSubTab === 'FIXED_ASSETS' && <FixedAssetsView state={state} fiscalYear={fiscalYear} />}
        {activeSubTab === 'BANK_RECONCILIATION' && <BankReconciliationView state={state} />}
        {activeSubTab === 'CURRENCY_EXCHANGE_RATES' && <ExchangeRatesManagerView state={state} />}
      </div>

      {/* Industrial & Multi-Tenant Modals */}
      <MultiTenantWorkspacesModal
        isOpen={isWorkspacesModalOpen}
        onClose={() => setIsWorkspacesModalOpen(false)}
        state={state}
      />

      <AcceleratedDepreciationCalculatorModal
        isOpen={isDeprecModalOpen}
        onClose={() => setIsDeprecModalOpen(false)}
        state={state}
      />

      <IndustrialCostManagerModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        state={state}
      />
    </div>
  );
};

export default React.memo(AccountingHubView);

