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
  Factory,
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
    case 'EXCEL_AUDIT_SENTINEL':
    case 'JOURNAL_AUDIT_SCANNER':
    case 'AUDIT_WORKING_PAPERS':
    case 'ACCOUNTING_HUB':
      return 'ACCOUNTING_HUB';

    case 'FINANCIAL_STATEMENTS':
    case 'ANNUAL_FINANCIAL_DOSSIER':
    case 'FINANCIAL_DOSSIER_GENERATOR':
    case 'BUDGET_PLANNER':
    case 'BUDGET_AND_CASHFLOW':
    case 'FINANCIAL_NOTES':
    case 'AUDITOR_REPORT':
    case 'FINANCIAL_SIMULATOR':
    case 'CREDIT_SIMULATOR':
    case 'CASH_FLOW_PREDICTOR':
    case 'CERTIFICATES':
    case 'FEASIBILITY_STUDY':
    case 'FINANCIAL_REPORTING_HUB':
      return 'FINANCIAL_REPORTING_HUB';

    case 'TAX_TRACKER':
    case 'TAX_FILING_CELLS':
    case 'TAX_PENALTY_SIMULATOR':
    case 'TAX_EXPOSURE_SIMULATOR':
    case 'ETA_RECONCILIATION':
    case 'PAYROLL_INSURANCE':
    case 'FRAUD_AUDIT_SENTINEL':
    case 'AUDIT_CONSISTENCY_SENTINEL':
    case 'TAX_AUDIT_HUB':
      return 'TAX_AUDIT_HUB';

    case 'CLIENTS_ARCHIVE':
    case 'PRACTICE_MANAGEMENT':
    case 'WHATSAPP_BOT':
    case 'OFFICE_TREASURY':
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

    case 'MULTI_TENANT_WORKSPACES':
      return 'MULTI_TENANT_WORKSPACES';

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

  // 1. The 4 Unified Primary Workspaces (محطات العمل الأربعة الرئيسية الموحدة)
  const coreFourHubs = [
    {
      id: 'ACCOUNTING_HUB',
      defaultTab: 'JOURNAL_ENTRIES',
      number: '1',
      label: 'الحسابات والقوائم المالية المعتمدة',
      labelEn: 'Accounting & Financial Statements',
      icon: Layers,
      description: 'دورة الحسابات كاملة: القيود، الدليل، الأستاذ، الميزان، والقوائم المالية EAS',
      badge: unpostedEntriesCount > 0 
        ? (isEn ? `${unpostedEntriesCount} Unposted` : `${unpostedEntriesCount} غير مرحل`) 
        : `${state.journalEntries.length}`,
      badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    },
    {
      id: 'TAX_AUDIT_HUB',
      defaultTab: 'TAX_TRACKER',
      number: '2',
      label: 'الضرائب والفحص والمراجعة',
      labelEn: 'Tax & Audit Hub',
      icon: Percent,
      description: 'الإقرارات (SAP)، فحص الإكسيل XAI، كسب العمل، والفاتورة ETA',
      badge: pendingTaxesCount > 0 
        ? (isEn ? `${pendingTaxesCount} Due` : `${pendingTaxesCount} مستحق`) 
        : (isEn ? 'Audit' : 'فحص ومراجعة'),
      badgeColor: pendingTaxesCount > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'FINANCIAL_REPORTING_HUB',
      defaultTab: 'CREDIT_SIMULATOR',
      number: '3',
      label: 'الائتمان ودراسات الجدوى والاستشارات',
      labelEn: 'Credit, Feasibility & Advisory',
      icon: TrendingUp,
      description: 'ملف الائتمان للبنوك، دراسات الجدوى، شهادات الدخل، والموازنات التقديرية',
      badge: 'ائتمان وبنوك',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'OFFICE_HUB',
      defaultTab: 'CLIENTS_ARCHIVE',
      number: '4',
      label: 'إدارة المكتب والعملاء',
      labelEn: 'Clients & Practice Mgmt',
      icon: Building2,
      description: 'ملفات الشركات، الفواتير، الخزينة، والمراسلات',
      badge: `${state.clients.length} منشأة`,
      badgeColor: 'bg-slate-700 text-slate-300',
    },
  ];

  // 2. Quick Essential Tools (أدوات سريعة مساندة)
  const secondaryTools = [
    {
      id: 'MULTI_TENANT_WORKSPACES',
      defaultTab: 'MULTI_TENANT_WORKSPACES',
      label: 'بيئات الشركات والمصانع',
      labelEn: 'Multi-Tenant Hub',
      icon: Factory,
      badge: `${state.clients.length} منشأة`,
    },
    {
      id: 'INVOICING',
      defaultTab: 'INVOICING',
      label: 'الفواتير والمبيعات',
      labelEn: 'Invoicing & Sales',
      icon: CreditCard,
      badge: `${state.invoices.length}`,
    },
    {
      id: 'CUSTOMS_HUB',
      defaultTab: 'CUSTOMS_SHIPMENTS',
      label: 'الجمارك والتجارة الخارجية (ACI)',
      labelEn: 'Customs & Global Trade',
      icon: Ship,
      badge: 'ACI',
    },
    {
      id: 'AUDIT_SECURITY_HUB',
      defaultTab: 'AUDIT_TRAIL',
      label: 'سجل العمليات والرقابة',
      labelEn: 'Audit Trail & Compliance',
      icon: ShieldCheck,
      badge: `${state.auditLogs.length}`,
    },
    {
      id: 'MOBILE_COMPANION',
      label: 'المساعد الميداني للهاتف',
      labelEn: 'Mobile Field Companion',
      icon: Smartphone,
      badge: '📱',
    },
  ];

  const isSecondaryActive = secondaryTools.some(
    (h) => parentHub === h.id || activeTab === h.id || (h.defaultTab && activeTab === h.defaultTab)
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

        {/* Navigation Items List - 4 Core Powerhouses + Dashboard */}
        <nav className="flex-1 py-3 px-2.5 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* Dashboard Button */}
          <button
            id="nav-item-DASHBOARD"
            title={isEn ? 'Executive Dashboard' : 'لوحة المؤشرات التنفيذية'}
            onClick={() => {
              handleSelectTab('DASHBOARD');
              if (window.innerWidth < 1024) handleClose();
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              isEn ? 'text-left' : 'text-right'
            } ${
              activeTab === 'DASHBOARD'
                ? `bg-gradient-to-r from-blue-900/60 to-slate-800/90 text-white font-black border ${
                    isEn ? 'border-blue-500 border-l-4' : 'border-blue-500 border-r-4'
                  } shadow-sm`
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'DASHBOARD' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="text-xs font-bold leading-tight truncate">
                {isEn ? 'Executive Dashboard' : 'لوحة المؤشرات'}
              </span>
            </div>
          </button>

          {/* Header Badge for The 4 Main Hubs */}
          <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wide border-b border-slate-800/60 mb-1">
            <span className="text-slate-200">{isEn ? 'CORE HUBS (4)' : 'محطات العمل الرئيسية (4)'}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
              {isEn ? 'Integrated' : 'الموحدة'}
            </span>
          </div>

          {/* 1. The 4 Primary Interfaces (Prominent, Direct, Clean) */}
          {coreFourHubs.map((hub) => {
            const Icon = hub.icon;
            const isHubActive = parentHub === hub.id;
            const hubTitle = isEn ? (hub.labelEn || hub.label) : hub.label;

            return (
              <div key={hub.id} className="space-y-0.5">
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
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight truncate">
                        {hubTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate font-normal">
                        {hub.description}
                      </div>
                    </div>
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
              </div>
            );
          })}

          {/* Prominent Enterprise Multi-Tenant Workspace Switcher */}
          <div className="pt-2 px-0.5">
            <button
              id="nav-item-MULTI_TENANT_WORKSPACES"
              title={isEn ? 'Multi-Tenant Workspaces & Factory Management' : 'بيئات عمل الشركات والمصانع المتعددة (Multi-Tenant)'}
              onClick={() => {
                handleSelectTab('MULTI_TENANT_WORKSPACES');
                if (window.innerWidth < 1024) handleClose();
              }}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                activeTab === 'MULTI_TENANT_WORKSPACES'
                  ? 'bg-amber-500/20 border-amber-500 text-white font-bold shadow-xs'
                  : 'bg-slate-800/70 hover:bg-slate-800 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Factory className="w-4 h-4 text-amber-400 shrink-0" />
                <div className={isEn ? 'text-left min-w-0' : 'text-right min-w-0'}>
                  <div className="text-xs font-bold text-white truncate">
                    {isEn ? 'Multi-Tenant Workspaces' : 'بيئات الشركات والمصانع'}
                  </div>
                  <div className="text-[10px] text-amber-300/80 truncate">
                    {state.activeClientContext?.clientName || state.activeClientContext?.companyName || (isEn ? 'Isolate Records & Balances' : 'فصل الأرصدة والقيود 100%')}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold shrink-0">
                {state.clients.length} {isEn ? 'Entities' : 'كيان'}
              </span>
            </button>
          </div>

          {/* 2. Secondary Tools Accordion (Discreet, Organized, Collapsed by default) */}
          <div className="pt-2 border-t border-slate-800/80 mt-2">
            <button
              onClick={() => setShowSecondaryTools(!showSecondaryTools)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Auxiliary Tools & Companion' : 'أدوات مساندة ومساعد الميدان'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  showSecondaryTools ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            {showSecondaryTools && (
              <div className="space-y-0.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {secondaryTools.map((tool) => {
                  const Icon = tool.icon;
                  const isToolActive = activeTab === tool.id || (tool.defaultTab && activeTab === tool.defaultTab);
                  const toolTitle = isEn ? (tool.labelEn || tool.label) : tool.label;

                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        handleSelectTab(tool.defaultTab || tool.id);
                        if (window.innerWidth < 1024) handleClose();
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                        isEn ? 'text-left' : 'text-right'
                      } ${
                        isToolActive
                          ? 'bg-slate-800 text-white font-bold shadow-2xs'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isToolActive ? 'text-blue-400' : 'text-slate-500'}`} />
                        <span className="truncate">{toolTitle}</span>
                      </div>
                      {tool.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {tool.badge}
                        </span>
                      )}
                    </button>
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
