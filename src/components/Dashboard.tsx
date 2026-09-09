import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  Receipt,
  Scale,
  Building2,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck2,
  Award,
  ShieldCheck,
  Gauge,
  AlertOctagon,
  Zap,
  Layers,
  Calculator,
  Landmark,
  BookOpen,
  Network,
  Printer,
  FileSpreadsheet,
  ExternalLink,
  Search,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { ActionMenu, ActionMenuItem } from './common/ActionMenu';
import { DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

export type KpiCategory = 'ALL' | 'FINANCIAL' | 'LIQUIDITY' | 'TAX' | 'OPERATIONS';

interface DashboardProps {
  state: DatabaseState;
  onNavigate?: (tabId: string) => void;
  onSelectTab?: (tabId: string) => void;
  onOpenQuickJournal?: () => void;
  onOpenQuickTreasury?: () => void;
  onOpenDesktopModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenPromoModal?: () => void;
  fiscalYear?: number;
}

interface KpiCardItem {
  id: string;
  title: string;
  value: string | number;
  badge: string;
  badgeVariant: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'slate';
  category: KpiCategory;
  targetTab: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  actions: ActionMenuItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onNavigate,
  onSelectTab,
  onOpenQuickJournal,
  onOpenQuickTreasury,
  fiscalYear = 2026,
}) => {
  const navigate = onNavigate || onSelectTab || (() => {});
  const [selectedCategory, setSelectedCategory] = useState<KpiCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Accounting Calculations
  const calculatedAccounts = useMemo(() => {
    return computeAccountBalances(state.accounts, state.journalEntries);
  }, [state.accounts, state.journalEntries]);

  const incomeData = useMemo(() => {
    return generateIncomeStatement(calculatedAccounts);
  }, [calculatedAccounts]);

  const balanceData = useMemo(() => {
    return generateBalanceSheet(calculatedAccounts, incomeData);
  }, [calculatedAccounts, incomeData]);

  // Office treasury summary
  const treasuryIncome = state.treasuryTransactions
    .filter((t) => t.type === 'INCOME_FEES')
    .reduce((sum, t) => sum + t.amount, 0);

  const treasuryExpense = state.treasuryTransactions
    .filter((t) => t.type === 'EXPENSE_OFFICE' || t.type === 'PARTNER_DRAWINGS')
    .reduce((sum, t) => sum + t.amount, 0);

  const treasuryNetBalance = treasuryIncome - treasuryExpense;

  // Tax alerts
  const urgentTaxes = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  );

  // Real-Time Liquidity vs Scheduled Tax Liabilities
  const { liquidCash, scheduledTaxLiabilities, taxCoverageRatio, isCriticalTaxCoverage } = useMemo(() => {
    const cashAccounts = calculatedAccounts.filter(
      (a) =>
        a.code.startsWith('11') ||
        a.name.includes('خزينة') ||
        a.name.includes('بنك') ||
        a.name.includes('صندوق') ||
        a.name.includes('نقدية')
    );
    const accountsCashSum = cashAccounts.reduce(
      (acc, a) => acc + (a.endingBalanceDebit - a.endingBalanceCredit),
      0
    );
    const totalLiquid = Math.max(0, accountsCashSum + Math.max(0, treasuryNetBalance));

    const taxDecsTotal = state.taxDeclarations
      .filter((t) => t.status !== 'PAID' && t.status !== 'APPROVED')
      .reduce((sum, t) => sum + (t.netVatDue || t.totalTaxDue || 0), 0);

    const taxAccounts = calculatedAccounts.filter(
      (a) =>
        a.code.startsWith('22') ||
        a.name.includes('ضريبة') ||
        a.name.includes('مصلحة الضرائب') ||
        a.name.includes('كسب عمل') ||
        a.name.includes('قيمة مضافة')
    );
    const taxAccSum = taxAccounts.reduce(
      (acc, a) => acc + (a.endingBalanceCredit - a.endingBalanceDebit),
      0
    );
    const totalTaxDue = Math.max(1, Math.max(taxDecsTotal, taxAccSum, 35000));

    const coverage = totalTaxDue > 0 ? (totalLiquid / totalTaxDue) * 100 : 100;
    const isCritical = coverage < 15;

    return {
      liquidCash: totalLiquid,
      scheduledTaxLiabilities: totalTaxDue,
      taxCoverageRatio: Number(coverage.toFixed(1)),
      isCriticalTaxCoverage: isCritical,
    };
  }, [calculatedAccounts, treasuryNetBalance, state.taxDeclarations]);

  // Build the list of Square KPI cards
  const kpis: KpiCardItem[] = useMemo(() => {
    return [
      {
        id: 'kpi-net-income',
        title: 'صافي الربح العام',
        value: formatEgyptianCurrency(incomeData.netIncome),
        badge: incomeData.netIncome >= 0 ? '+ربح تشغيلي' : '-عجز مالي',
        badgeVariant: incomeData.netIncome >= 0 ? 'emerald' : 'rose',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: TrendingUp,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-view-inc',
            label: 'عرض قائمة الدخل الشامل',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
          {
            id: 'act-print-inc',
            label: 'طباعة القوائم المالية',
            icon: Printer,
            onClick: () => window.print(),
          },
        ],
      },
      {
        id: 'kpi-revenues',
        title: 'إجمالي إيرادات النشاط',
        value: formatEgyptianCurrency(incomeData.revenuesTotal),
        badge: 'نشاط جاري',
        badgeVariant: 'blue',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: ArrowUpRight,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        actions: [
          {
            id: 'act-view-rev',
            label: 'كشف حساب الإيرادات',
            icon: ExternalLink,
            onClick: () => navigate('GENERAL_LEDGER'),
          },
          {
            id: 'act-invoicing',
            label: 'فواتير المبيعات',
            icon: Zap,
            onClick: () => navigate('INVOICING'),
          },
        ],
      },
      {
        id: 'kpi-cogs',
        title: 'تكلفة النشاط والإنتاج',
        value: formatEgyptianCurrency(incomeData.costOfGoodsSold),
        badge: `${
          incomeData.revenuesTotal > 0
            ? ((incomeData.costOfGoodsSold / incomeData.revenuesTotal) * 100).toFixed(0)
            : 0
        }% من الإيراد`,
        badgeVariant: 'amber',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: Receipt,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        actions: [
          {
            id: 'act-cogs-details',
            label: 'عرض إيضاح تكلفة النشاط',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
        ],
      },
      {
        id: 'kpi-gross-profit',
        title: 'مجمل الربح التجاري',
        value: formatEgyptianCurrency(incomeData.grossProfit),
        badge: 'هامش مساهمة',
        badgeVariant: 'emerald',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: Award,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-gross-view',
            label: 'تحليل هامش الربح',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
        ],
      },
      {
        id: 'kpi-opex',
        title: 'المصروفات التشغيلية',
        value: formatEgyptianCurrency(incomeData.operatingExpenses),
        badge: 'إدارية وعمومية',
        badgeVariant: 'slate',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: ArrowDownLeft,
        iconColor: 'text-slate-600 dark:text-slate-400',
        iconBg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        actions: [
          {
            id: 'act-opex-view',
            label: 'كشف المصروفات العامة',
            icon: ExternalLink,
            onClick: () => navigate('GENERAL_LEDGER'),
          },
        ],
      },
      {
        id: 'kpi-assets',
        title: 'إجمالي الأصول',
        value: formatEgyptianCurrency(balanceData.assetsTotal),
        badge: 'متداولة وثابتة',
        badgeVariant: 'indigo',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: Landmark,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
        actions: [
          {
            id: 'act-bs-view',
            label: 'عرض قائمة المركز المالي',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
          {
            id: 'act-tb-assets',
            label: 'مراجعة الأصول بالميزان',
            icon: Scale,
            onClick: () => navigate('TRIAL_BALANCE'),
          },
        ],
      },
      {
        id: 'kpi-current-assets',
        title: 'الأصول المتداولة',
        value: formatEgyptianCurrency(balanceData.currentAssetsTotal),
        badge: 'قصيرة الأجل',
        badgeVariant: 'blue',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: Layers,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        actions: [
          {
            id: 'act-ca-view',
            label: 'عرض الأصول المتداولة',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
        ],
      },
      {
        id: 'kpi-equity',
        title: 'حقوق الملكية',
        value: formatEgyptianCurrency(balanceData.equityTotal),
        badge: 'رأس المال والأرباح',
        badgeVariant: 'emerald',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: ShieldCheck,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-eq-view',
            label: 'عرض حقوق المساهمين',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
        ],
      },
      {
        id: 'kpi-liabilities',
        title: 'إجمالي الالتزامات',
        value: formatEgyptianCurrency(balanceData.liabilitiesTotal),
        badge: 'خصوم ومطلوبات',
        badgeVariant: 'amber',
        category: 'FINANCIAL',
        targetTab: 'FINANCIAL_STATEMENTS',
        icon: AlertOctagon,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        actions: [
          {
            id: 'act-liab-view',
            label: 'كشف التزامات المركز المالي',
            icon: ExternalLink,
            onClick: () => navigate('FINANCIAL_STATEMENTS'),
          },
        ],
      },
      {
        id: 'kpi-liquid-cash',
        title: 'السيولة النقدية الفورية',
        value: formatEgyptianCurrency(liquidCash),
        badge: 'خزائن وبنوك',
        badgeVariant: 'emerald',
        category: 'LIQUIDITY',
        targetTab: 'OFFICE_TREASURY',
        icon: Wallet,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-cash-treasury',
            label: 'عرض حركة الخزينة',
            icon: ExternalLink,
            onClick: () => navigate('OFFICE_TREASURY'),
          },
          {
            id: 'act-quick-receipt',
            label: 'إضافة سند قبض/صرف',
            icon: Receipt,
            onClick: () => (onOpenQuickTreasury ? onOpenQuickTreasury() : navigate('OFFICE_TREASURY')),
          },
        ],
      },
      {
        id: 'kpi-office-treasury',
        title: 'خزينة المكتب المستقلة',
        value: formatEgyptianCurrency(treasuryNetBalance),
        badge: 'رصيد متاح',
        badgeVariant: 'blue',
        category: 'LIQUIDITY',
        targetTab: 'OFFICE_TREASURY',
        icon: Building2,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        actions: [
          {
            id: 'act-treasury-view',
            label: 'سجل الخزينة والمصروفات',
            icon: ExternalLink,
            onClick: () => navigate('OFFICE_TREASURY'),
          },
        ],
      },
      {
        id: 'kpi-tax-liabilities',
        title: 'الالتزامات الضريبية',
        value: formatEgyptianCurrency(scheduledTaxLiabilities),
        badge: 'مستحق السداد',
        badgeVariant: 'rose',
        category: 'TAX',
        targetTab: 'TAX_TRACKER',
        icon: AlertTriangle,
        iconColor: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
        actions: [
          {
            id: 'act-tax-tracker',
            label: 'متابعة جدول الضرائب',
            icon: ExternalLink,
            onClick: () => navigate('TAX_TRACKER'),
          },
          {
            id: 'act-tax-sim',
            label: 'محاكي التعرض الضريبي',
            icon: Gauge,
            onClick: () => navigate('TAX_EXPOSURE_SIMULATOR'),
          },
        ],
      },
      {
        id: 'kpi-tax-coverage',
        title: 'تغطية السيولة للضرائب',
        value: `${taxCoverageRatio}%`,
        badge: isCriticalTaxCoverage ? 'حرج < 15%' : 'آمن ومغطى',
        badgeVariant: isCriticalTaxCoverage ? 'rose' : 'emerald',
        category: 'TAX',
        targetTab: 'TAX_TRACKER',
        icon: Gauge,
        iconColor: isCriticalTaxCoverage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
        iconBg: isCriticalTaxCoverage
          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
          : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-coverage-view',
            label: 'فحص سيولة الالتزامات',
            icon: ExternalLink,
            onClick: () => navigate('TAX_TRACKER'),
          },
        ],
      },
      {
        id: 'kpi-urgent-tax',
        title: 'الإقرارات العاجلة',
        value: `${urgentTaxes.length} إقرار`,
        badge: 'مصلحة الضرائب',
        badgeVariant: 'amber',
        category: 'TAX',
        targetTab: 'TAX_TRACKER',
        icon: FileCheck2,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        actions: [
          {
            id: 'act-urgent-view',
            label: 'جدول مواعيد الإقرارات',
            icon: ExternalLink,
            onClick: () => navigate('TAX_TRACKER'),
          },
        ],
      },
      {
        id: 'kpi-clients',
        title: 'الموكلين والشركات',
        value: `${state.clients.length} عميل`,
        badge: 'سجل نشط',
        badgeVariant: 'blue',
        category: 'OPERATIONS',
        targetTab: 'CLIENTS_ARCHIVE',
        icon: Users,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        actions: [
          {
            id: 'act-clients-view',
            label: 'فتح أرشيف الموكلين',
            icon: ExternalLink,
            onClick: () => navigate('CLIENTS_ARCHIVE'),
          },
        ],
      },
      {
        id: 'kpi-journals',
        title: 'قيود اليومية العامة',
        value: `${state.journalEntries.length} قيد`,
        badge: 'مرحلة بالكامل',
        badgeVariant: 'emerald',
        category: 'OPERATIONS',
        targetTab: 'JOURNAL_ENTRIES',
        icon: BookOpen,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        actions: [
          {
            id: 'act-journal-view',
            label: 'عرض دفتر القيود',
            icon: ExternalLink,
            onClick: () => navigate('JOURNAL_ENTRIES'),
          },
          {
            id: 'act-new-entry',
            label: 'إضافة قيد جديد',
            icon: Receipt,
            onClick: () => (onOpenQuickJournal ? onOpenQuickJournal() : navigate('JOURNAL_ENTRIES')),
          },
        ],
      },
      {
        id: 'kpi-accounts',
        title: 'شجرة ودليل الحسابات',
        value: `${state.accounts.length} حساب`,
        badge: 'هرمي معتمد',
        badgeVariant: 'indigo',
        category: 'OPERATIONS',
        targetTab: 'CHART_OF_ACCOUNTS',
        icon: Network,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
        actions: [
          {
            id: 'act-coa-view',
            label: 'عرض شجرة الحسابات',
            icon: ExternalLink,
            onClick: () => navigate('CHART_OF_ACCOUNTS'),
          },
        ],
      },
      {
        id: 'kpi-trial-balance',
        title: 'اتزان ميزان المراجعة',
        value: balanceData.isBalanced ? 'متزن 100%' : 'فارق توازن',
        badge: balanceData.isBalanced ? 'مدين = دائن' : 'يحتاج تسوية',
        badgeVariant: balanceData.isBalanced ? 'emerald' : 'rose',
        category: 'OPERATIONS',
        targetTab: 'TRIAL_BALANCE',
        icon: Scale,
        iconColor: balanceData.isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
        iconBg: balanceData.isBalanced
          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
          : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
        actions: [
          {
            id: 'act-tb-view',
            label: 'فتح ميزان المراجعة',
            icon: ExternalLink,
            onClick: () => navigate('TRIAL_BALANCE'),
          },
        ],
      },
    ];
  }, [
    incomeData,
    balanceData,
    liquidCash,
    treasuryNetBalance,
    scheduledTaxLiabilities,
    taxCoverageRatio,
    isCriticalTaxCoverage,
    urgentTaxes.length,
    state.clients.length,
    state.journalEntries.length,
    state.accounts.length,
    navigate,
  ]);

  // Filter KPIs by Category and Search Term
  const filteredKpis = useMemo(() => {
    return kpis.filter((kpi) => {
      const matchesCat = selectedCategory === 'ALL' || kpi.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        kpi.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(kpi.value).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [kpis, selectedCategory, searchQuery]);

  const getBadgeClass = (variant: KpiCardItem['badgeVariant']) => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'rose':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'amber':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'indigo':
        return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const dashboardHeaderActions: ActionMenuItem[] = [
    {
      id: 'act-mobile-companion',
      label: 'المساعد الميداني للهاتف (سداد وإجراءات)',
      icon: Smartphone,
      onClick: () => navigate('MOBILE_COMPANION'),
    },
    {
      id: 'act-new-j-entry',
      label: 'تسجيل قيد يومية جديد',
      icon: Receipt,
      onClick: () => (onOpenQuickJournal ? onOpenQuickJournal() : navigate('JOURNAL_ENTRIES')),
    },
    {
      id: 'act-treasury-doc',
      label: 'سند حركة خزينة',
      icon: Wallet,
      onClick: () => (onOpenQuickTreasury ? onOpenQuickTreasury() : navigate('OFFICE_TREASURY')),
    },
    {
      isDivider: true,
      label: '',
      onClick: () => {},
    },
    {
      id: 'act-print-kpis',
      label: 'طباعة لوحة المؤشرات',
      icon: Printer,
      onClick: () => window.print(),
    },
    {
      id: 'act-export-excel-kpi',
      label: 'تصدير المؤشرات (Excel)',
      icon: FileSpreadsheet,
      onClick: () => {
        const csvContent =
          'data:text/csv;charset=utf-8,\uFEFF' +
          'المؤشر,القيمة,الحالة,التصنيف\n' +
          kpis.map((k) => `"${k.title}","${k.value}","${k.badge}","${k.category}"`).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `kpi_dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    },
  ];

  return (
    <UnifiedScreenCard
      title="لوحة مؤشرات الأداء المالي والمحاسبي"
      subtitle={`المؤشرات التنفيذية المباشرة • السنة المالية ${fiscalYear}`}
      icon={Gauge}
      badge={`${filteredKpis.length} مؤشر نشط`}
      badgeVariant="emerald"
      actionMenuItems={dashboardHeaderActions}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="بحث في مؤشرات الأداء والقيم..."
      filterButtons={[
        {
          id: 'ALL',
          label: 'كافة المؤشرات',
          active: selectedCategory === 'ALL',
          onClick: () => setSelectedCategory('ALL'),
          count: kpis.length,
        },
        {
          id: 'FINANCIAL',
          label: 'المالية والقوائم',
          active: selectedCategory === 'FINANCIAL',
          onClick: () => setSelectedCategory('FINANCIAL'),
        },
        {
          id: 'LIQUIDITY',
          label: 'السيولة والخزينة',
          active: selectedCategory === 'LIQUIDITY',
          onClick: () => setSelectedCategory('LIQUIDITY'),
        },
        {
          id: 'TAX',
          label: 'الضرائب والفحص',
          active: selectedCategory === 'TAX',
          onClick: () => setSelectedCategory('TAX'),
        },
        {
          id: 'OPERATIONS',
          label: 'العمليات والموكلين',
          active: selectedCategory === 'OPERATIONS',
          onClick: () => setSelectedCategory('OPERATIONS'),
        },
      ]}
    >
      {/* Equal-sized Square KPI Cards Grid - Seamless CSS Grid across all screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              onClick={() => navigate(kpi.targetTab)}
              className="aspect-square rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-all p-3 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              title={`انقر للانتقال إلى تفاصيل ${kpi.title}`}
            >
              {/* Card Top: Icon & ActionsMenu */}
              <div className="flex items-center justify-between gap-1">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${kpi.iconBg}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${kpi.iconColor}`} />
                </div>

                {/* Stop propagation so clicking the menu button doesn't trigger card navigation */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                >
                  <ActionMenu
                    items={kpi.actions}
                    title="خيارات المؤشر"
                    triggerType="three_dots_vertical"
                    size="xs"
                    buttonVariant="ghost"
                    align="left"
                  />
                </div>
              </div>

              {/* Card Center: Clean Value & Title (Without anatomical descriptive fluff) */}
              <div className="my-auto text-right min-w-0">
                <div className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate tracking-tight">
                  {kpi.value}
                </div>
                <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {kpi.title}
                </h3>
              </div>

              {/* Card Bottom: Concise Badge Indicator */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border truncate ${getBadgeClass(
                    kpi.badgeVariant
                  )}`}
                >
                  {kpi.badge}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  عرض ↵
                </span>
              </div>
            </div>
          );
        })}

        {filteredKpis.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            لا توجد مؤشرات تطابق معايير البحث أو التصفية الحالية.
          </div>
        )}
      </div>
    </UnifiedScreenCard>
  );
};

export default Dashboard;
