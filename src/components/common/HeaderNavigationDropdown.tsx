import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  ChevronDown,
  Search,
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  Percent,
  Building2,
  Ship,
  Database,
  Globe2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  BookOpen,
  FileCheck2,
  TrendingUp,
  Receipt,
  Scale,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useI18n } from '../../utils/i18n';

interface NavItemDef {
  id: NavigationTab;
  labelAr: string;
  labelEn: string;
  categoryAr: string;
  categoryEn: string;
  badge?: string;
  icon?: React.ElementType;
}

const ALL_SYSTEM_SCREENS: NavItemDef[] = [
  // 1. Core Dashboard
  {
    id: 'DASHBOARD',
    labelAr: 'لوحة القيادة والمؤشرات العامة',
    labelEn: 'Executive KPI Dashboard',
    categoryAr: 'الرئيسية والمؤشرات',
    categoryEn: 'Dashboard & Core',
    icon: LayoutDashboard,
  },
  {
    id: 'MOBILE_COMPANION',
    labelAr: 'المساعد الميداني للهاتف (سداد وإجراءات)',
    labelEn: 'Mobile Field Companion',
    categoryAr: 'الرئيسية والمؤشرات',
    categoryEn: 'Dashboard & Core',
    badge: 'ميداني 📱',
    icon: Smartphone,
  },

  // 1. Accounting & Journals Hub (الواجهة الرئيسية 1)
  {
    id: 'ACCOUNTING_HUB',
    labelAr: '1. الحسابات ودفاتر اليومية (المركز الشامل)',
    labelEn: '1. Accounting & Journals Hub',
    categoryAr: 'الواجهات الرئيسية الثلاث',
    categoryEn: 'Core 3 Main Hubs',
    badge: 'Hub 1',
    icon: Layers,
  },
  {
    id: 'FINANCIAL_REPORTING_HUB',
    labelAr: '2. القوائم والتقارير المالية (المركز الشامل)',
    labelEn: '2. Financial Reporting Hub',
    categoryAr: 'الواجهات الرئيسية الثلاث',
    categoryEn: 'Core 3 Main Hubs',
    badge: 'Hub 2',
    icon: FileSpreadsheet,
  },
  {
    id: 'TAX_AUDIT_HUB',
    labelAr: '3. الفحص الضريبي والمراجعة (المركز الشامل)',
    labelEn: '3. Tax & Audit Sentinel Hub',
    categoryAr: 'الواجهات الرئيسية الثلاث',
    categoryEn: 'Core 3 Main Hubs',
    badge: 'Hub 3',
    icon: ShieldCheck,
  },
  {
    id: 'JOURNAL_ENTRIES',
    labelAr: 'قيود اليومية العامة',
    labelEn: 'General Journal Entries',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: BookOpen,
  },
  {
    id: 'OCR_INVOICE_SCANNER',
    labelAr: 'مسح واستخراج الفواتير (OCR)',
    labelEn: 'OCR Invoice Scanner',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: Sparkles,
  },
  {
    id: 'CHART_OF_ACCOUNTS',
    labelAr: 'دليل الحسابات المصري',
    labelEn: 'Egyptian Chart of Accounts',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: Layers,
  },
  {
    id: 'GENERAL_LEDGER',
    labelAr: 'دفتر الأستاذ العام',
    labelEn: 'General Ledger',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: Receipt,
  },
  {
    id: 'TRIAL_BALANCE',
    labelAr: 'ميزان المراجعة بالمجاميع والأرصدة',
    labelEn: 'Trial Balance',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: Scale,
  },
  {
    id: 'FIXED_ASSETS',
    labelAr: 'سجل الأصول الثابتة والإهلاك (معيار 10)',
    labelEn: 'Fixed Assets (EAS 10)',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: Building2,
  },
  {
    id: 'BANK_RECONCILIATION',
    labelAr: 'مذكرة التسوية البنكية',
    labelEn: 'Bank Reconciliation',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: CheckCircle2,
  },
  {
    id: 'CURRENCY_EXCHANGE_RATES',
    labelAr: 'أسعار الصرف اليومية (EAS 13)',
    labelEn: 'Daily Exchange Rates (EAS 13)',
    categoryAr: '1. الحسابات ودفاتر اليومية',
    categoryEn: '1. Accounting & Journals',
    icon: TrendingUp,
  },

  // 2. Financial Reporting & Statements Hub (الواجهة الرئيسية 2)
  {
    id: 'FINANCIAL_STATEMENTS',
    labelAr: 'القوائم المالية الختامية (EAS 1)',
    labelEn: 'Financial Statements (EAS 1)',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    badge: 'EAS 1',
    icon: FileSpreadsheet,
  },
  {
    id: 'FINANCIAL_NOTES',
    labelAr: 'الإيضاحات المتممة للقوائم',
    labelEn: 'Notes to Financial Statements',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: FileCheck2,
  },
  {
    id: 'AUDITOR_REPORT',
    labelAr: 'تقرير مراقب الحسابات المستقل (معيار 700)',
    labelEn: 'Auditor’s Report (ESA 700)',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: ShieldCheck,
  },
  {
    id: 'CREDIT_SIMULATOR',
    labelAr: 'محاكي الجدارة والملف الائتماني',
    labelEn: 'Credit Rating & Analysis',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: TrendingUp,
  },
  {
    id: 'FINANCIAL_SIMULATOR',
    labelAr: 'محاكي المؤشرات والنسب المالية',
    labelEn: 'Financial Ratios Simulator',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: TrendingUp,
  },
  {
    id: 'BUDGET_PLANNER',
    labelAr: 'الموازنة التقديرية التشغيلية',
    labelEn: 'Operational Budget Planner',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: Scale,
  },
  {
    id: 'CASH_FLOW_PREDICTOR',
    labelAr: 'التدفقات النقدية التقديرية',
    labelEn: 'Cash Flow Forecast',
    categoryAr: '2. القوائم والتقارير المالية',
    categoryEn: '2. Financial Statements & EAS',
    icon: TrendingUp,
  },

  // 3. Tax & Audit Hub (الواجهة الرئيسية 3)
  {
    id: 'EXCEL_AUDIT_SENTINEL',
    labelAr: 'مختبر مراجعة الإكسيل الذكي (XAI)',
    labelEn: 'Smart Excel Audit Sentinel (XAI)',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    badge: 'XAI',
    icon: Sparkles,
  },
  {
    id: 'TAX_TRACKER',
    labelAr: 'أجندة الإقرارات والالتزامات الضريبية',
    labelEn: 'Tax Declarations Tracker',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    badge: 'ETA',
    icon: Percent,
  },
  {
    id: 'TAX_PENALTY_SIMULATOR',
    labelAr: 'محاكي مقابل التأخير والغرامات',
    labelEn: 'Tax Delay Penalties Simulator',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: Percent,
  },
  {
    id: 'FRAUD_AUDIT_SENTINEL',
    labelAr: 'حارس الفحص الإحصائي وكشف الاحتيال',
    labelEn: 'Fraud Sentinel & Anomaly Audit',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: ShieldCheck,
  },
  {
    id: 'JOURNAL_AUDIT_SCANNER',
    labelAr: 'الفحص والتدقيق الآلي للقيود',
    labelEn: 'Automated Journal Scanner',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: CheckCircle2,
  },
  {
    id: 'AUDIT_WORKING_PAPERS',
    labelAr: 'أوراق عمل الفحص والمراجعة',
    labelEn: 'Audit Working Papers',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: FileCheck2,
  },
  {
    id: 'ETA_RECONCILIATION',
    labelAr: 'مطابقة الفاتورة الإلكترونية (ETA)',
    labelEn: 'ETA E-Invoice Reconciliation',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: Receipt,
  },
  {
    id: 'PAYROLL_INSURANCE',
    labelAr: 'كسب العمل والتأمينات الاجتماعية (قانون 148)',
    labelEn: 'Payroll Tax & Social Insurance',
    categoryAr: '3. الفحص الضريبي والمراجعة',
    categoryEn: '3. Tax Declarations & Audit',
    icon: Building2,
  },

  // 5. Office Practice Hub
  {
    id: 'CLIENTS_ARCHIVE',
    labelAr: 'أرشيف العملاء وسجلات الشركات',
    labelEn: 'Client Companies & Archive',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: Building2,
  },
  {
    id: 'PRACTICE_MANAGEMENT',
    labelAr: 'عقود المراجعة وإدارة الارتباطات',
    labelEn: 'Audit Engagements Management',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: BookOpen,
  },
  {
    id: 'OFFICE_TREASURY',
    labelAr: 'خزنة المكتب وحسابات الأتعاب والرسوم',
    labelEn: 'Office Treasury & Fees',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: Building2,
  },
  {
    id: 'CERTIFICATES',
    labelAr: 'الشهادات المهنية المعتمدة',
    labelEn: 'Certified Income Attestations',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: FileCheck2,
  },
  {
    id: 'FEASIBILITY_STUDY',
    labelAr: 'دراسات الجدوى الاقتصادية',
    labelEn: 'Feasibility Studies',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: TrendingUp,
  },
  {
    id: 'INVOICING',
    labelAr: 'الفواتير والمطالبات وأتعاب المراجعة',
    labelEn: 'Billing & Invoicing Engine',
    categoryAr: 'إدارة المكتب والعملاء',
    categoryEn: 'Practice & Clients',
    icon: CreditCard,
  },

  // 6. Customs & Global Trade Hub
  {
    id: 'CUSTOMS_SHIPMENTS',
    labelAr: 'سجل الشحنات والعمليات الجمركية',
    labelEn: 'Shipments & Customs Registry',
    categoryAr: 'الجمارك والتجارة الخارجية',
    categoryEn: 'Customs & Global Trade',
    badge: 'ACI',
    icon: Ship,
  },

  // 7. ERP & Security Hub
  {
    id: 'SAP_ERP',
    labelAr: 'منظومة ساب S/4HANA المحاسبية',
    labelEn: 'SAP S/4HANA Integration',
    categoryAr: 'الأنظمة والرقابة',
    categoryEn: 'ERP & Security',
    icon: Globe2,
  },
  {
    id: 'AUDIT_TRAIL',
    labelAr: 'سجل العمليات والرقابة والأمان',
    labelEn: 'Security Audit Trail',
    categoryAr: 'الأنظمة والرقابة',
    categoryEn: 'ERP & Security',
    icon: ShieldCheck,
  },
];

interface HeaderNavigationDropdownProps {
  activeTab: string;
  onSelectTab: (tabId: NavigationTab) => void;
}

export const HeaderNavigationDropdown: React.FC<HeaderNavigationDropdownProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { isEn, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentScreen = ALL_SYSTEM_SCREENS.find((s) => s.id === activeTab) || ALL_SYSTEM_SCREENS[0];

  const filteredScreens = ALL_SYSTEM_SCREENS.filter((s) => {
    if (!searchQuery || !searchQuery.trim()) return true;
    const q = (searchQuery || '').toLowerCase().trim();
    return (
      (s.labelAr || '').toLowerCase().includes(q) ||
      (s.labelEn || '').toLowerCase().includes(q) ||
      (s.categoryAr || '').toLowerCase().includes(q) ||
      (s.categoryEn || '').toLowerCase().includes(q)
    );
  });

  // Group by category
  const categories = Array.from(
    new Set(filteredScreens.map((s) => (isEn ? s.categoryEn || '' : s.categoryAr || '')))
  );

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-header-screens-menu"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 select-none ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700'
        }`}
        title={isEn ? 'Switch Module / Screen (Dropdown)' : 'قائمة الشاشات والأقسام المنسدلة'}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
        <span className="hidden md:inline text-xs font-bold max-w-[140px] truncate">
          {isEn ? (currentScreen?.labelEn || 'Screens') : (currentScreen?.labelAr || 'الشاشات')}
        </span>
        <span className="md:hidden text-xs font-bold">
          {isEn ? 'Screens' : 'الشاشات'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 ${
            isEn ? 'left-0' : 'right-0'
          }`}
        >
          {/* Search filter input */}
          <div className="relative mb-2">
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-2.5 ${isEn ? 'left-2.5' : 'right-2.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Filter screens & modules...' : 'تصفية الشاشات والأقسام...'}
              className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all ${
                isEn ? 'pl-8 pr-3' : 'pr-8 pl-3'
              }`}
              autoFocus
            />
          </div>

          {/* Screen Categories & Items */}
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {categories.map((cat) => {
              const items = filteredScreens.filter((s) =>
                (isEn ? s.categoryEn : s.categoryAr) === cat
              );
              if (items.length === 0) return null;

              return (
                <div key={cat} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon || Layers;
                      const label = isEn ? item.labelEn : item.labelAr;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                            isEn ? 'text-left' : 'text-right'
                          } ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredScreens.length === 0 && (
              <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                {isEn ? 'No matching screens found.' : 'لا توجد شاشات مطابقة للبحث.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
