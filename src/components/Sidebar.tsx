import React from 'react';
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
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { OfficeProfile } from '../types';
import { CURRENT_APP_VERSION } from '../services/updateChecker';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile?: OfficeProfile;
  onOpenDesktopModal?: () => void;
  onOpenUpdateModal?: () => void;
  onOpenShortcutsModal?: () => void;
  hasUpdate?: boolean;
}

export const getParentHub = (tabId: string): string => {
  switch (tabId) {
    case 'CHART_OF_ACCOUNTS':
    case 'JOURNAL_ENTRIES':
    case 'GENERAL_LEDGER':
    case 'TRIAL_BALANCE':
    case 'FIXED_ASSETS':
    case 'ACCOUNTING_HUB':
      return 'ACCOUNTING_HUB';

    case 'FINANCIAL_STATEMENTS':
    case 'FINANCIAL_NOTES':
    case 'AUDITOR_REPORT':
    case 'CREDIT_SIMULATOR':
    case 'FINANCIAL_REPORTING_HUB':
      return 'FINANCIAL_REPORTING_HUB';

    case 'TAX_TRACKER':
    case 'TAX_EXPOSURE_SIMULATOR':
    case 'ETA_RECONCILIATION':
    case 'PAYROLL_INSURANCE':
    case 'AUDIT_WORKING_PAPERS':
    case 'TAX_AUDIT_HUB':
      return 'TAX_AUDIT_HUB';

    case 'CLIENTS_ARCHIVE':
    case 'OFFICE_TREASURY':
    case 'CERTIFICATES':
    case 'FEASIBILITY_STUDY':
    case 'OFFICE_HUB':
      return 'OFFICE_HUB';

    case 'AUDIT_TRAIL':
    case 'AUDIT_SECURITY_HUB':
      return 'AUDIT_SECURITY_HUB';

    case 'INVOICING':
      return 'INVOICING';

    case 'DASHBOARD':
    default:
      return 'DASHBOARD';
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  profile,
  onOpenDesktopModal,
  onOpenUpdateModal,
  onOpenShortcutsModal,
  hasUpdate,
}) => {
  const state: DatabaseState = db.getState();
  const officeProfile = profile || state.officeProfile;
  const currentUser = db.getCurrentUser();

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

  const hubItems = [
    {
      id: 'DASHBOARD',
      label: 'لوحة التحكم الرئيسية',
      subtitle: 'نظرة شاملة ومؤشرات أداء لحظية',
      icon: LayoutDashboard,
      badge: null,
      subItems: [],
    },
    {
      id: 'ACCOUNTING_HUB',
      defaultTab: 'JOURNAL_ENTRIES',
      label: 'مركز الدورة المحاسبية',
      subtitle: 'القيود، الأستاذ، الشجرة، وميزان المراجعة',
      icon: Layers,
      badge: unpostedEntriesCount > 0 ? `${unpostedEntriesCount} غير مرحل` : `${state.journalEntries.length}`,
      badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400',
      subItems: [
        { id: 'JOURNAL_ENTRIES', label: 'قيود اليومية' },
        { id: 'CHART_OF_ACCOUNTS', label: 'شجرة الحسابات' },
        { id: 'GENERAL_LEDGER', label: 'الأستاذ العام' },
        { id: 'TRIAL_BALANCE', label: 'ميزان المراجعة' },
        { id: 'FIXED_ASSETS', label: 'إهلاك الأصول' },
      ],
    },
    {
      id: 'FINANCIAL_REPORTING_HUB',
      defaultTab: 'FINANCIAL_STATEMENTS',
      label: 'مركز القوائم والتقارير المالية',
      subtitle: 'القوائم المعتمدة، الإيضاحات، وتقرير المراقب',
      icon: FileSpreadsheet,
      badge: 'EAS',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      subItems: [
        { id: 'FINANCIAL_STATEMENTS', label: 'القوائم الختامية' },
        { id: 'FINANCIAL_NOTES', label: 'الإيضاحات (معيار 1)' },
        { id: 'AUDITOR_REPORT', label: 'تقرير المراقب' },
        { id: 'CREDIT_SIMULATOR', label: 'ملف الائتمان' },
      ],
    },
    {
      id: 'TAX_AUDIT_HUB',
      defaultTab: 'TAX_TRACKER',
      label: 'مركز الضرائب والمراجعة',
      subtitle: 'الإقرارات، فحص المخاطر، ETA، وكسب العمل',
      icon: Percent,
      badge: pendingTaxesCount > 0 ? `${pendingTaxesCount} مستحق` : 'مكتمل',
      badgeColor: pendingTaxesCount > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300',
      subItems: [
        { id: 'TAX_TRACKER', label: 'إقرارات الضرائب' },
        { id: 'TAX_EXPOSURE_SIMULATOR', label: 'محاكي الفحص' },
        { id: 'ETA_RECONCILIATION', label: 'مطابقة ETA' },
        { id: 'PAYROLL_INSURANCE', label: 'كسب العمل والتأمينات' },
        { id: 'AUDIT_WORKING_PAPERS', label: 'أوراق العمل (320)' },
      ],
    },
    {
      id: 'INVOICING',
      defaultTab: 'INVOICING',
      label: 'مركز الفواتير والمبيعات',
      subtitle: 'الفاتورة والإيصال الإلكتروني ETA SDK v1.0',
      icon: CreditCard,
      badge: `${state.invoices.length}`,
      subItems: [],
    },
    {
      id: 'OFFICE_HUB',
      defaultTab: 'CLIENTS_ARCHIVE',
      label: 'مركز إدارة المكتب والعملاء',
      subtitle: 'الأرشيف، الخزنة المستقلة، الشهادات، والجدوى',
      icon: Building2,
      badge: `${state.clients.length} عميل`,
      badgeColor: 'bg-indigo-500/20 text-indigo-300',
      subItems: [
        { id: 'CLIENTS_ARCHIVE', label: 'أرشيف العملاء' },
        { id: 'OFFICE_TREASURY', label: 'خزنة المكتب' },
        { id: 'CERTIFICATES', label: 'الشهادات QR' },
        { id: 'FEASIBILITY_STUDY', label: 'دراسات الجدوى' },
      ],
    },
    {
      id: 'AUDIT_SECURITY_HUB',
      defaultTab: 'AUDIT_TRAIL',
      label: 'مركز الرقابة والأمان والنسخ',
      subtitle: 'سجل التدقيق، الترحيل، والأجهزة المعتمدة',
      icon: ShieldCheck,
      badge: `${state.auditLogs.length}`,
      subItems: [
        { id: 'AUDIT_TRAIL', label: 'سجل التدقيق' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 right-0 h-full w-64 bg-[#1E293B] flex flex-col border-l border-slate-700 shadow-xl z-50 transition-transform duration-300 ease-in-out shrink-0 text-right ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-64'
        } ${!isOpen ? 'lg:hidden' : ''}`}
      >
        {/* Branding Header */}
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                جم
              </div>
              <div>
                <div className="text-white font-bold text-base leading-tight">
                  {officeProfile.firmName.replace('مكتب ', '') || 'جميل مرعي'}
                </div>
                <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-0.5">
                  للمحاسبة والمراجعة القانونية
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List - Unified Hubs */}
        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
          <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
            مراكز العمل والرقابة المالية
          </div>

          {hubItems.map((hub) => {
            const Icon = hub.icon;
            const isHubActive = parentHub === hub.id;
            const hasSubItems = hub.subItems && hub.subItems.length > 0;

            return (
              <div key={hub.id} className="space-y-1">
                {/* Main Hub Button */}
                <button
                  id={`nav-item-${hub.id}`}
                  onClick={() => {
                    setActiveTab(hub.defaultTab || hub.id);
                    if (window.innerWidth < 1024) setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-right cursor-pointer group ${
                    isHubActive
                      ? 'bg-blue-600 text-white shadow-md font-bold ring-1 ring-blue-400/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isHubActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate leading-tight">{hub.label}</div>
                      <div
                        className={`text-[10px] truncate leading-tight mt-0.5 ${
                          isHubActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {hub.subtitle}
                      </div>
                    </div>
                  </div>

                  {hub.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isHubActive
                          ? 'bg-blue-800 text-white border border-blue-400/30'
                          : hub.badgeColor || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hub.badge}
                    </span>
                  )}
                </button>

                {/* Sub-item quick pills (displayed when hub is active or accessible) */}
                {hasSubItems && isHubActive && (
                  <div className="pr-10 pl-2 py-1 space-y-0.5">
                    {hub.subItems.map((sub) => {
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveTab(sub.id);
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-right text-[11px] transition-colors cursor-pointer ${
                            isSubActive
                              ? 'text-white font-bold bg-blue-500/20 border-r-2 border-blue-400'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSubActive ? 'bg-blue-400 ring-2 ring-blue-400/30' : 'bg-slate-600'
                            }`}
                          />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Quick Utilities: Shortcuts & Desktop */}
        <div className="p-3 border-t border-slate-700/80 bg-slate-800/40 space-y-2">
          {onOpenShortcutsModal && (
            <button
              onClick={() => {
                onOpenShortcutsModal();
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              id="sidebar-btn-shortcuts"
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all border border-slate-600/50 text-right cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">اختصارات لوحة المفاتيح</span>
              </div>
              <span className="text-[10px] bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                Ctrl+K
              </span>
            </button>
          )}

          {/* Desktop App Download / Install Action */}
          {onOpenDesktopModal && (
            <button
              onClick={() => {
                onOpenDesktopModal();
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              id="sidebar-btn-desktop-app"
              className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all shadow-xs border border-emerald-500/30 text-right cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">تحميل لسطح المكتب</span>
              </div>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                App
              </span>
            </button>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>إصدار النظام v{CURRENT_APP_VERSION}</span>
              {hasUpdate && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </div>
            {onOpenUpdateModal && (
              <button
                onClick={onOpenUpdateModal}
                className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                title="فحص التحديثات"
              >
                <Sparkles className="w-3 h-3" />
                <span>{hasUpdate ? 'تحديث متاح!' : 'فحص'}</span>
              </button>
            )}
          </div>
          <div className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مطابق لمعايير المحاسبة المصرية (EAS)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
