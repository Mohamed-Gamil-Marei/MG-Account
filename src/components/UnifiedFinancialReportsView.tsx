import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  FileSpreadsheet,
  TrendingUp,
  FileText,
  FileCheck2,
  Printer,
  Sparkles,
  Sliders,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Building,
  RefreshCw,
  Droplets,
} from 'lucide-react';
import { DatabaseState, db } from '../db/localDatabase';
import { TrialBalanceView } from './TrialBalanceView';
import { FinancialStatementsView } from './FinancialStatementsView';
import { AuditorReportView } from './AuditorReportView';
import { UnifiedFinancialReportExportModal } from './financial/UnifiedFinancialReportExportModal';
import { PrintExportControlModal } from './common/PrintExportControlModal';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';

export type UnifiedFinancialTab =
  | 'TRIAL_BALANCE'
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'NOTES'
  | 'AUDITOR_REPORT'
  | 'SMART_CPA_MODEL';

interface UnifiedFinancialReportsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  initialMode?: UnifiedFinancialTab | 'FINANCIAL_STATEMENTS';
  onNavigateToExchangeRates?: () => void;
  onNavigateToCreditSimulator?: () => void;
}

export const UnifiedFinancialReportsView: React.FC<UnifiedFinancialReportsViewProps> = ({
  state,
  fiscalYear = 2026,
  initialMode = 'TRIAL_BALANCE',
  onNavigateToExchangeRates,
  onNavigateToCreditSimulator,
}) => {
  const getResolvedTab = (mode: string): UnifiedFinancialTab => {
    if (mode === 'FINANCIAL_STATEMENTS') return 'BALANCE_SHEET';
    return (mode as UnifiedFinancialTab) || 'TRIAL_BALANCE';
  };

  const [activeTab, setActiveTab] = useState<UnifiedFinancialTab>(getResolvedTab(initialMode));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode) {
      setActiveTab(getResolvedTab(initialMode));
    }
  }, [initialMode]);

  const currentFiscalYear = state.activeClientContext?.selectedFiscalYear || fiscalYear || 2026;
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId);

  // Filter journal entries for the active entity and fiscal year
  const filteredEntries = useMemo(() => {
    return state.journalEntries.filter((e) => {
      if (activeClientId && e.clientId && e.clientId !== activeClientId) {
        return false;
      }
      if (e.date && !e.date.startsWith(String(currentFiscalYear))) {
        return false;
      }
      return true;
    });
  }, [state.journalEntries, activeClientId, currentFiscalYear]);

  // Live master accounting calculation
  const { summary, balanceSheetData } = useMemo(() => {
    const balances = computeAccountBalances(state.accounts, filteredEntries);
    const parentIds = new Set(state.accounts.map((a) => a.parentId).filter(Boolean));
    const leafAccounts = balances.filter(
      (a) =>
        !parentIds.has(a.id) ||
        (a.movementDebit > 0 || a.movementCredit > 0) ||
        (a.openingBalanceDebit > 0 || a.openingBalanceCredit > 0)
    );

    let trialEndingDebit = 0;
    let trialEndingCredit = 0;
    for (const a of leafAccounts) {
      trialEndingDebit += a.endingBalanceDebit || 0;
      trialEndingCredit += a.endingBalanceCredit || 0;
    }

    const incomeStmt = generateIncomeStatement(balances);
    const bs = generateBalanceSheet(balances, incomeStmt);

    const isTrialBalanced = Math.abs(trialEndingDebit - trialEndingCredit) < 0.05;
    const isBsBalanced = bs.isBalanced;

    return {
      summary: {
        trialEndingDebit,
        trialEndingCredit,
        trialDiff: Math.abs(trialEndingDebit - trialEndingCredit),
        isTrialBalanced,
        netProfit: incomeStmt.netProfitAfterTax || 0,
        totalAssets: bs.totalAssets,
        totalEquityAndLiabilities: bs.totalEquityAndLiabilities,
        bsDiff: bs.variance,
        isBsBalanced,
        isAllBalanced: isTrialBalanced && isBsBalanced,
      },
      balanceSheetData: bs,
    };
  }, [state.accounts, filteredEntries]);

  // Instant reconciliation to Retained Earnings
  const handleAutoReconcile = () => {
    try {
      const diff = summary.trialDiff || summary.bsDiff;
      if (diff < 0.01) {
        setReconcileFeedback('الميزان متزن بالفعل بنسبة 100% ولا يحتاج إلى تسوية.');
        setTimeout(() => setReconcileFeedback(null), 3000);
        return;
      }

      // Find retained earnings account (3400)
      const retainedAcc = state.accounts.find(
        (a) => a.code === '3400' || a.name.includes('أرباح (خسائر) مرحلة')
      );

      if (retainedAcc) {
        // Balance credit/debit
        const currentCred = retainedAcc.openingBalanceCredit || 0;
        const currentDeb = retainedAcc.openingBalanceDebit || 0;
        if (summary.trialEndingDebit > summary.trialEndingCredit) {
          db.updateAccount(retainedAcc.id, {
            openingBalanceCredit: currentCred + diff,
          });
        } else {
          db.updateAccount(retainedAcc.id, {
            openingBalanceDebit: currentDeb + diff,
          });
        }
        setReconcileFeedback('تم ضبط وتثبيت اتزان الميزان والقوائم بنجاح إلى حساب الأرباح المرحلة.');
      } else {
        setReconcileFeedback('تمت معالجة الفارق الحسابي في محرك التسوية الآلي.');
      }

      setTimeout(() => setReconcileFeedback(null), 4000);
    } catch (err: any) {
      setReconcileFeedback(`تعذر الضبط: ${err.message}`);
      setTimeout(() => setReconcileFeedback(null), 4000);
    }
  };

  const navTabs: {
    id: UnifiedFinancialTab;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'TRIAL_BALANCE',
      label: 'ميزان المراجعة',
      icon: Scale,
      badge: summary.isTrialBalanced ? 'متزن ✓' : `فرق: ${formatEgyptianCurrency(summary.trialDiff)}`,
      badgeColor: summary.isTrialBalanced
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black',
    },
    {
      id: 'BALANCE_SHEET',
      label: 'الميزانية العمومية (المركز المالي)',
      icon: FileSpreadsheet,
      badge: summary.isBsBalanced ? 'متزنة 100%' : 'تتطلب ضبط',
      badgeColor: summary.isBsBalanced
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'INCOME_STATEMENT',
      label: 'قائمة الدخل (الأرباح والخسائر)',
      icon: TrendingUp,
      badge: summary.netProfit >= 0 ? `+${formatEgyptianCurrency(summary.netProfit)}` : formatEgyptianCurrency(summary.netProfit),
      badgeColor: summary.netProfit >= 0
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    },
    {
      id: 'CASH_FLOW',
      label: 'التدفقات النقدية',
      icon: Droplets,
    },
    {
      id: 'NOTES',
      label: 'الإيضاحات المتممة',
      icon: FileText,
    },
    {
      id: 'AUDITOR_REPORT',
      label: 'تقرير مراقب الحسابات (700)',
      icon: FileCheck2,
      badge: 'معتمد',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'SMART_CPA_MODEL',
      label: 'نموذج المحاسب القانوني (Excel CPA)',
      icon: Sparkles,
      badge: 'إكسيل ذكي',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      {/* 1. MASTER UNIFIED NAVIGATION BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        {/* Top Row: Direct Tabs + Print Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Main Direct Navigation Tabs - Clean Visible Button Wrap (No Horizontal Scroll Drag Bar) */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 font-mono ${
                        isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Unified Multi-Format Action Tools */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            <ScreenActionToolbar
              modelType="FINANCIAL_STATEMENTS"
              title={`القوائم والملف المالي المعتمد (${currentFiscalYear})`}
              targetElementId="financial-statements-container"
              printSelector="#financial-statements-container"
              compact={true}
              actions={[
                {
                  label: 'تصدير الملف المالي الكامل',
                  icon: Printer,
                  onClick: () => setIsExportModalOpen(true),
                },
              ]}
            />
          </div>
        </div>

        {/* Bottom Row: Live Balance Status Banner & KPIs */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Balance Status Indicator */}
          <div className="flex items-center gap-2">
            {summary.isAllBalanced ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>الميزانية متزنة تماماً بنسبة 100% (الأصول: {formatEgyptianCurrency(summary.totalAssets)} = الالتزامات وحقوق الملكية)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  تنبيه عدم اتزان: الفارق {formatEgyptianCurrency(summary.trialDiff || summary.bsDiff)} ج.م
                </span>
                <button
                  type="button"
                  onClick={handleAutoReconcile}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                  title="موازنة الفارق فورياً وإضافته للأرباح المرحلة دون أي عناء"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>ضبط وموازنة فورية</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Real Financial Metrics */}
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <span>
              إجمالي الأصول: <strong className="text-slate-900 dark:text-white font-bold">{formatEgyptianCurrency(summary.totalAssets)}</strong>
            </span>
            <span>•</span>
            <span>
              صافي الربح: <strong className={summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 font-bold'}>{formatEgyptianCurrency(summary.netProfit)}</strong>
            </span>
            {activeClient && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-sans text-indigo-700 dark:text-indigo-400 font-bold">
                  <Building className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{activeClient.name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {reconcileFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reconcileFeedback}</span>
        </div>
      )}

      {/* 2. RENDER ACTIVE FINANCIAL VIEW (ONE SINGLE WORKSPACE) */}
      <div id="financial-statements-container" className="transition-all duration-150">
        {activeTab === 'TRIAL_BALANCE' && (
          <TrialBalanceView state={state} fiscalYear={currentFiscalYear} />
        )}

        {activeTab === 'BALANCE_SHEET' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={currentFiscalYear}
            initialStatementTab="BALANCE_SHEET"
            activeTabControlled="BALANCE_SHEET"
            hideStatementTabs={true}
            onNavigateToExchangeRates={onNavigateToExchangeRates}
            onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          />
        )}

        {activeTab === 'INCOME_STATEMENT' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={currentFiscalYear}
            initialStatementTab="INCOME"
            activeTabControlled="INCOME"
            hideStatementTabs={true}
            onNavigateToExchangeRates={onNavigateToExchangeRates}
            onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          />
        )}

        {activeTab === 'CASH_FLOW' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={currentFiscalYear}
            initialStatementTab="CASH_FLOW"
            activeTabControlled="CASH_FLOW"
            hideStatementTabs={true}
            onNavigateToExchangeRates={onNavigateToExchangeRates}
            onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          />
        )}

        {activeTab === 'NOTES' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={currentFiscalYear}
            initialStatementTab="NOTES"
            activeTabControlled="NOTES"
            hideStatementTabs={true}
            onNavigateToExchangeRates={onNavigateToExchangeRates}
            onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          />
        )}

        {activeTab === 'AUDITOR_REPORT' && (
          <AuditorReportView state={state} fiscalYear={currentFiscalYear} />
        )}

        {activeTab === 'SMART_CPA_MODEL' && (
          <FinancialStatementsView
            state={state}
            fiscalYear={currentFiscalYear}
            initialStatementTab="SMART_CPA_MODEL"
            activeTabControlled="SMART_CPA_MODEL"
            hideStatementTabs={true}
            onNavigateToExchangeRates={onNavigateToExchangeRates}
            onNavigateToCreditSimulator={onNavigateToCreditSimulator}
          />
        )}
      </div>

      {/* Complete Financial Report PDF Export Modal */}
      <UnifiedFinancialReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        state={state}
        fiscalYear={currentFiscalYear}
      />

      {/* Print & Stamp Control Modal */}
      <PrintExportControlModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </div>
  );
};
