import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  Receipt,
  Scale,
  FileSpreadsheet,
  FileCheck2,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  Percent,
  Award,
  LineChart,
  History,
  X,
  ShieldCheck,
  Laptop,
  Download,
  Sparkles,
  RefreshCw,
  Keyboard,
  ShieldAlert,
  FileCode2,
  Calculator,
  FileText,
  Layers,
  Database,
  Globe2,
  Settings,
  Ship,
  Film,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { AppLanguage, OfficeProfile } from '../types';
import { CURRENT_APP_VERSION } from '../services/updateChecker';
import { MgBrandBadge } from './common/MgBrandBadge';

interface SidebarProps {
  activeTab: string;
  setActiveTab?: (tabId: string) => void;
  onSelectTab?: (tabId: string) => void;
  isOpen: boolean;
  setIsOpen?: (open: boolean) => void;
  onToggle?: () => void;
  profile?: OfficeProfile;
  currentLanguage?: AppLanguage;
  onOpenSettingsModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenDesktopModal?: () => void;
  onOpenUpdateModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenManualModal?: () => void;
  onOpenPromoModal?: () => void;
  hasUpdate?: boolean;
}

export const getParentHub = (tabId: string): string => {
  switch (tabId) {
    case 'CHART_OF_ACCOUNTS':
    case 'JOURNAL_ENTRIES':
    case 'GENERAL_LEDGER':
    case 'TRIAL_BALANCE':
    case 'FIXED_ASSETS':
    case 'BANK_RECONCILIATION':
    case 'CURRENCY_EXCHANGE_RATES':
    case 'OCR_INVOICE_SCANNER':
    case 'ACCOUNTING_HUB':
      return 'ACCOUNTING_HUB';

    case 'FINANCIAL_STATEMENTS':
    case 'BUDGET_PLANNER':
    case 'FINANCIAL_NOTES':
    case 'AUDITOR_REPORT':
    case 'FINANCIAL_SIMULATOR':
    case 'CREDIT_SIMULATOR':
    case 'CASH_FLOW_PREDICTOR':
    case 'FINANCIAL_REPORTING_HUB':
      return 'FINANCIAL_REPORTING_HUB';

    case 'TAX_TRACKER':
    case 'TAX_PENALTY_SIMULATOR':
    case 'TAX_EXPOSURE_SIMULATOR':
    case 'ETA_RECONCILIATION':
    case 'PAYROLL_INSURANCE':
    case 'AUDIT_WORKING_PAPERS':
    case 'JOURNAL_AUDIT_SCANNER':
    case 'FRAUD_AUDIT_SENTINEL':
    case 'EXCEL_AUDIT_SENTINEL':
    case 'AUDIT_CONSISTENCY_SENTINEL':
    case 'TAX_AUDIT_HUB':
      return 'TAX_AUDIT_HUB';

    case 'CLIENTS_ARCHIVE':
    case 'PRACTICE_MANAGEMENT':
    case 'WHATSAPP_BOT':
    case 'OFFICE_TREASURY':
    case 'CERTIFICATES':
    case 'FEASIBILITY_STUDY':
    case 'OFFICE_HUB':
      return 'OFFICE_HUB';

    case 'AUDIT_TRAIL':
    case 'AUDIT_SECURITY_HUB':
      return 'AUDIT_SECURITY_HUB';

    case 'SAP_ERP':
      return 'SAP_ERP';

    case 'INVOICING':
      return 'INVOICING';

    case 'CUSTOMS_HUB':
    case 'CUSTOMS_SHIPMENTS':
    case 'CUSTOMS_LANDED_COST':
    case 'CUSTOMS_NAFEZA_ACI':
      return 'CUSTOMS_HUB';

    case 'MOBILE_COMPANION':
      return 'MOBILE_COMPANION';

    case 'DASHBOARD':
    default:
      return 'DASHBOARD';
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  isOpen,
  setIsOpen,
  onToggle,
  profile,
  currentLanguage,
  onOpenSettingsModal,
  onOpenBackupModal,
  onOpenDesktopModal,
  onOpenUpdateModal,
  onOpenShortcutsModal,
  onOpenManualModal,
  onOpenPromoModal,
  hasUpdate,
}) => {
  const state: DatabaseState = db.getState();
  const officeProfile = profile || state.officeProfile;
  const currentUser = db.getCurrentUser();
  const activeLang = currentLanguage || state.preferences?.language || 'ar';
  const isEn = activeLang === 'en';

  const handleSelectTab = (tabId: string) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    } else if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    }
  };

  const handleClose = () => {
    if (typeof setIsOpen === 'function') {
      setIsOpen(false);
    } else if (typeof onToggle === 'function') {
      onToggle();
    }
  };

  const pendingTaxesCount = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  ).length;

  const unpostedEntriesCount = state.journalEntries.filter((e) => !e.isPosted).length;

  const isItemRestricted = (itemId: string) => {
    if (currentUser.role === 'ADMIN') return false;
    if (itemId === 'OFFICE_TREASURY' && !currentUser.canAccessTreasury) return true;
    if (itemId === 'AUDIT_TRAIL' && !currentUser.canAccessAuditTrail) return true;
    if (currentUser.restrictedTabs?.includes(itemId as any)) return true;
    return false;
  };

  const parentHub = getParentHub(activeTab);

  // 1. The 3 Primary Core Menus (الواجهات الرئيسية الثلاث فقط)
  const coreThreeHubs = [
    {
      id: 'ACCOUNTING_HUB',
      defaultTab: 'JOURNAL_ENTRIES',
      number: '1',
      label: 'الحسابات وقيود اليومية',
      labelEn: 'General Ledger & Journals',
      icon: Layers,
      badge: unpostedEntriesCount > 0 
        ? (isEn ? `${unpostedEntriesCount} Unposted` : `${unpostedEntriesCount} غير مرحل`) 
        : `${state.journalEntries.length}`,
      badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      subItems: [
        { id: 'JOURNAL_ENTRIES', label: 'قيود اليومية', labelEn: 'Journal Entries' },
        { id: 'OCR_INVOICE_SCANNER', label: 'مسح الفواتير (OCR)', labelEn: 'OCR Invoice Scanner' },
        { id: 'CHART_OF_ACCOUNTS', label: 'دليل الحسابات', labelEn: 'Chart of Accounts' },
        { id: 'GENERAL_LEDGER', label: 'دفتر الأستاذ العام', labelEn: 'General Ledger' },
        { id: 'TRIAL_BALANCE', label: 'ميزان المراجعة', labelEn: 'Trial Balance' },
        { id: 'FIXED_ASSETS', label: 'الأصول الثابتة والإهلاك', labelEn: 'Fixed Assets (EAS 10)' },
        { id: 'BANK_RECONCILIATION', label: 'مذكرة التسوية البنكية', labelEn: 'Bank Reconciliation' },
        { id: 'CURRENCY_EXCHANGE_RATES', label: 'أسعار الصرف اليومية (EAS 13)', labelEn: 'Daily Exchange Rates' },
      ],
    },
    {
      id: 'FINANCIAL_REPORTING_HUB',
      defaultTab: 'FINANCIAL_STATEMENTS',
      number: '2',
      label: 'القوائم والتقارير المالية',
      labelEn: 'Financial Reports & EAS',
      icon: FileSpreadsheet,
      badge: 'EAS 1',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      subItems: [
        { id: 'FINANCIAL_STATEMENTS', label: 'القوائم المالية (EAS 1)', labelEn: 'Financial Statements' },
        { id: 'FINANCIAL_NOTES', label: 'الإيضاحات المتممة', labelEn: 'Financial Notes' },
        { id: 'AUDITOR_REPORT', label: 'تقرير مراقب الحسابات (700)', labelEn: 'Auditor Report (ESA 700)' },
        { id: 'FINANCIAL_SIMULATOR', label: 'محاكي النسب المالية', labelEn: 'Financial Ratios' },
        { id: 'BUDGET_PLANNER', label: 'الموازنة التقديرية', labelEn: 'Budget Planner' },
        { id: 'CASH_FLOW_PREDICTOR', label: 'التدفقات النقدية التقديرية', labelEn: 'Cash Flow Forecast' },
        { id: 'CREDIT_SIMULATOR', label: 'التحليل والملف الائتماني', labelEn: 'Credit Rating & Analysis' },
      ],
    },
    {
      id: 'TAX_AUDIT_HUB',
      defaultTab: 'EXCEL_AUDIT_SENTINEL',
      number: '3',
      label: 'الفحص الضريبي والمراجعة',
      labelEn: 'Tax Declarations & Audit',
      icon: Percent,
      badge: pendingTaxesCount > 0 
        ? (isEn ? `${pendingTaxesCount} Due` : `${pendingTaxesCount} مستحق`) 
        : (isEn ? 'Audit' : 'فحص ومراجعة'),
      badgeColor: pendingTaxesCount > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      subItems: [
        { id: 'EXCEL_AUDIT_SENTINEL', label: 'مختبر مراجعة الإكسيل الذكي (XAI)', labelEn: 'AI Smart Excel Audit' },
        { id: 'TAX_TRACKER', label: 'أجندة الإقرارات الضريبية', labelEn: 'Tax Declarations' },
        { id: 'JOURNAL_AUDIT_SCANNER', label: 'الفحص الآلي للقيود', labelEn: 'Journal Scanner' },
        { id: 'FRAUD_AUDIT_SENTINEL', label: 'الفحص والتحليل الإحصائي', labelEn: 'Audit Sentinel' },
        { id: 'AUDIT_WORKING_PAPERS', label: 'أوراق عمل المراجعة', labelEn: 'Working Papers' },
        { id: 'ETA_RECONCILIATION', label: 'مطابقة الفاتورة الإلكترونية', labelEn: 'ETA E-Invoice Matcher' },
        { id: 'PAYROLL_INSURANCE', label: 'كسب العمل والتأمينات', labelEn: 'Payroll & Social Ins.' },
        { id: 'TAX_PENALTY_SIMULATOR', label: 'مقابل التأخير والغرامات', labelEn: 'Delay Penalties' },
        { id: 'TAX_EXPOSURE_SIMULATOR', label: 'محاكي الفحص الضريبي', labelEn: 'Tax Exposure' },
      ],
    },
  ];

  // 2. Secondary & Administrative Tools (أدوات وخدمات مساعدة)
  const secondaryHubs = [
    {
      id: 'DASHBOARD',
      label: 'لوحة المؤشرات',
      labelEn: 'Executive Dashboard',
      icon: LayoutDashboard,
      badge: null,
      subItems: [],
    },
    {
      id: 'OFFICE_HUB',
      defaultTab: 'CLIENTS_ARCHIVE',
      label: 'إدارة المكتب والعملاء',
      labelEn: 'Clients & Practice Mgmt',
      icon: Building2,
      badge: `${state.clients.length}`,
      subItems: [
        { id: 'CLIENTS_ARCHIVE', label: 'ملفات العملاء والشركات', labelEn: 'Client Companies' },
        { id: 'PRACTICE_MANAGEMENT', label: 'عقود المراجعة والارتباط', labelEn: 'Audit Engagements' },
        { id: 'WHATSAPP_BOT', label: 'مراسلات الواتساب', labelEn: 'WhatsApp Assistant' },
        { id: 'OFFICE_TREASURY', label: 'خزنة وحسابات المكتب', labelEn: 'Office Treasury' },
        { id: 'CERTIFICATES', label: 'الشهادات المهنية المعتمدة', labelEn: 'Certified Attestations' },
        { id: 'FEASIBILITY_STUDY', label: 'دراسات الجدوى المالية', labelEn: 'Feasibility Studies' },
      ],
    },
    {
      id: 'INVOICING',
      defaultTab: 'INVOICING',
      label: 'الفواتير والمبيعات',
      labelEn: 'Invoicing & Sales',
      icon: CreditCard,
      badge: `${state.invoices.length}`,
      subItems: [],
    },
    {
      id: 'CUSTOMS_HUB',
      defaultTab: 'CUSTOMS_SHIPMENTS',
      label: 'الجمارك والتجارة الخارجية',
      labelEn: 'Customs & Global Trade',
      icon: Ship,
      badge: 'ACI',
      subItems: [
        { id: 'CUSTOMS_SHIPMENTS', label: 'سجل الشحنات والعمليات', labelEn: 'Shipments Registry' },
        { id: 'CUSTOMS_LANDED_COST', label: 'حاسبة التكلفة الإنزالية', labelEn: 'Landed Cost (EAS 2)' },
        { id: 'CUSTOMS_NAFEZA_ACI', label: 'منظومة نافذة والتسجيل ACI', labelEn: 'Nafeza ACI Hub' },
      ],
    },
    {
      id: 'SAP_ERP',
      defaultTab: 'SAP_ERP',
      label: 'منظومة ساب المحاسبية',
      labelEn: 'SAP S/4HANA & B1',
      icon: Globe2,
      badge: 'SAP',
      subItems: [],
    },
    {
      id: 'AUDIT_SECURITY_HUB',
      defaultTab: 'AUDIT_TRAIL',
      label: 'سجل العمليات والرقابة',
      labelEn: 'Audit Trail & Compliance',
      icon: ShieldCheck,
      badge: `${state.auditLogs.length}`,
      subItems: [
        { id: 'AUDIT_TRAIL', label: 'سجل التدقيق والحركات', labelEn: 'Security Audit Log' },
      ],
    },
    {
      id: 'MOBILE_COMPANION',
      label: 'المساعد الميداني للهاتف',
      labelEn: 'Mobile Field Companion',
      icon: Smartphone,
      badge: '📱',
      subItems: [],
    },
  ];

  const isSecondaryActive = secondaryHubs.some(
    (h) => parentHub === h.id || h.subItems?.some((s) => s.id === activeTab)
  );
  const [showSecondaryTools, setShowSecondaryTools] = useState(isSecondaryActive);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 h-full w-64 min-w-[260px] bg-slate-900 flex flex-col shadow-xl z-50 transition-all duration-200 ease-in-out shrink-0 ${
          isEn 
            ? 'left-0 border-r border-slate-800 text-left' 
            : 'right-0 border-l border-slate-800 text-right'
        } ${
          isOpen ? 'translate-x-0' : (isEn ? '-translate-x-full lg:translate-x-0 lg:w-64' : 'translate-x-full lg:translate-x-0 lg:w-64')
        } ${!isOpen ? 'lg:hidden' : ''}`}
      >
        {/* Office Branding Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div
            onClick={onOpenPromoModal}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            title={isEn ? 'View MG Official Firm Visual Identity & Cinema Promo' : 'مشاهدة الهوية الرسمية والبرومو السينمائي للمكتب (MG Official Promo)'}
          >
            <MgBrandBadge size="md" interactive={false} hasPlayButton={true} />
            <div className="min-w-0">
              <div className="text-white font-bold text-xs truncate group-hover:text-amber-300 transition-colors">
                {officeProfile.firmName || 'MOHAMED - M GAMEEL MARIE'}
              </div>
              <div className="text-slate-400 text-[10px] truncate mt-0.5 flex items-center gap-1.5">
                <span>{isEn ? 'CPA ' : 'أ/ '}{officeProfile.auditorName || (isEn ? 'Mohamed Gameel Marie' : 'محمد جميل مرعي')}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  MG
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            title={isEn ? 'Close menu' : 'إغلاق القائمة'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items List - Focus on the 3 Core Interfaces */}
        <nav className="flex-1 py-3 px-2.5 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* Header Badge for The 3 Main Interfaces */}
          <div className="px-2 pt-0.5 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wide border-b border-slate-800/60 mb-1">
            <span className="text-slate-200">{isEn ? 'PRIMARY MENUS (3)' : 'الواجهات الرئيسية (3)'}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
              {isEn ? 'Core' : 'الأساسية'}
            </span>
          </div>

          {/* 1. The 3 Primary Interfaces (Prominent, Elegant, Direct) */}
          {coreThreeHubs.map((hub) => {
            const Icon = hub.icon;
            const isHubActive = parentHub === hub.id;
            const hasSubItems = hub.subItems && hub.subItems.length > 0;
            const hubTitle = isEn ? (hub.labelEn || hub.label) : hub.label;

            return (
              <div key={hub.id} className="space-y-0.5">
                {/* Main Hub Button */}
                <button
                  id={`nav-item-${hub.id}`}
                  title={hubTitle}
                  onClick={() => {
                    handleSelectTab(hub.defaultTab || hub.id);
                    if (window.innerWidth < 1024) handleClose();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-xl transition-all cursor-pointer group ${
                    isEn ? 'text-left' : 'text-right'
                  } ${
                    isHubActive
                      ? `bg-gradient-to-r from-blue-900/60 to-slate-800/90 text-white font-black border ${
                          isEn ? 'border-blue-500 border-l-4' : 'border-blue-500 border-r-4'
                        } shadow-sm`
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-black shrink-0 ${
                      isHubActive 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}>
                      {hub.number}
                    </div>
                    <Icon className={`w-4 h-4 shrink-0 ${isHubActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span className="text-xs font-bold leading-tight truncate">
                      {hubTitle}
                    </span>
                  </div>

                  {hub.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                        isHubActive
                          ? 'bg-blue-900/60 text-blue-200 border border-blue-500/30'
                          : hub.badgeColor || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hub.badge}
                    </span>
                  )}
                </button>

                {/* Sub-item quick pills */}
                {hasSubItems && isHubActive && (
                  <div className={`py-1 space-y-0.5 ${
                    isEn 
                      ? 'pl-6 pr-1 border-l-2 border-blue-500/40 ml-3' 
                      : 'pr-6 pl-1 border-r-2 border-blue-500/40 mr-3'
                  }`}>
                    {hub.subItems.map((sub) => {
                      const isSubActive = activeTab === sub.id;
                      const subTitle = isEn ? (sub.labelEn || sub.label) : sub.label;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            handleSelectTab(sub.id);
                            if (window.innerWidth < 1024) handleClose();
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isEn ? 'text-left' : 'text-right'
                          } ${
                            isSubActive
                              ? 'text-white bg-blue-600/30 font-bold border border-blue-500/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSubActive ? 'bg-blue-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="truncate">{subTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Secondary Tools Accordion (Discreet, Organized, Collapsed by default) */}
          <div className="pt-2 border-t border-slate-800/80 mt-2">
            <button
              onClick={() => setShowSecondaryTools(!showSecondaryTools)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Auxiliary Tools & Practice' : 'أدوات مساعدة وإدارة المكتب'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  showSecondaryTools ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            {showSecondaryTools && (
              <div className="space-y-0.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {secondaryHubs.map((hub) => {
                  const Icon = hub.icon;
                  const isHubActive = parentHub === hub.id;
                  const hasSubItems = hub.subItems && hub.subItems.length > 0;
                  const hubTitle = isEn ? (hub.labelEn || hub.label) : hub.label;

                  return (
                    <div key={hub.id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          handleSelectTab(hub.defaultTab || hub.id);
                          if (window.innerWidth < 1024) handleClose();
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                          isEn ? 'text-left' : 'text-right'
                        } ${
                          isHubActive
                            ? 'bg-slate-800 text-white font-bold shadow-2xs'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isHubActive ? 'text-blue-400' : 'text-slate-500'}`} />
                          <span className="truncate">{hubTitle}</span>
                        </div>
                        {hub.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {hub.badge}
                          </span>
                        )}
                      </button>

                      {hasSubItems && isHubActive && (
                        <div className={`py-0.5 space-y-0.5 ${
                          isEn ? 'pl-5 ml-2 border-l border-slate-700/60' : 'pr-5 mr-2 border-r border-slate-700/60'
                        }`}>
                          {hub.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                handleSelectTab(sub.id);
                                if (window.innerWidth < 1024) handleClose();
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer ${
                                activeTab === sub.id
                                  ? 'text-blue-400 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span className="w-1 h-1 rounded-full bg-slate-500" />
                              <span className="truncate">{isEn ? (sub.labelEn || sub.label) : sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Quick Utilities Dock */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/40 flex items-center justify-around gap-1">
          {onOpenSettingsModal && (
            <button
              onClick={() => {
                onOpenSettingsModal();
                if (window.innerWidth < 1024) handleClose();
              }}
              id="sidebar-btn-settings"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isEn ? 'Settings & Language' : 'إعدادات المنظومة واللغة'}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {onOpenManualModal && (
            <button
              onClick={() => {
                onOpenManualModal();
                if (window.innerWidth < 1024) handleClose();
              }}
              id="sidebar-btn-manual"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isEn ? 'System Manual (PDF)' : 'دليل المنظومة (PDF)'}
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {onOpenShortcutsModal && (
            <button
              onClick={() => {
                onOpenShortcutsModal();
                if (window.innerWidth < 1024) handleClose();
              }}
              id="sidebar-btn-shortcuts"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isEn ? 'Keyboard Shortcuts (Ctrl+K)' : 'اختصارات المفاتيح (Ctrl+K)'}
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {onOpenDesktopModal && (
            <button
              onClick={() => {
                onOpenDesktopModal();
                if (window.innerWidth < 1024) handleClose();
              }}
              id="sidebar-btn-desktop-app"
              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isEn ? 'Desktop App' : 'نسخة سطح المكتب'}
            >
              <Laptop className="w-4 h-4" />
            </button>
          )}

          {onOpenPromoModal && (
            <button
              onClick={() => {
                onOpenPromoModal();
                if (window.innerWidth < 1024) handleClose();
              }}
              id="sidebar-btn-promo-modal"
              className="p-2 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isEn ? 'MG Cinema Promo & Brand Seal' : 'البرومو السينمائي والختم الرسمي MG'}
            >
              <Film className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span>v{CURRENT_APP_VERSION}</span>
            {hasUpdate && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </div>
          <span className="text-[10px] text-slate-500">EAS & ESA</span>
        </div>
      </aside>
    </>
  );
};
