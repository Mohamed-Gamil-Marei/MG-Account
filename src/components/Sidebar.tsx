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

  const pendingTaxesCount = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  ).length;

  const unpostedEntriesCount = state.journalEntries.filter((e) => !e.isPosted).length;

  const navGroups = [
    {
      groupTitle: 'العمليات المحاسبية والرقابة',
      items: [
        {
          id: 'DASHBOARD',
          label: 'لوحة التحكم الرئيسية',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'CHART_OF_ACCOUNTS',
          label: 'شجرة الحسابات المصرية',
          icon: FolderTree,
          badge: `${state.accounts.length}`,
        },
        {
          id: 'JOURNAL_ENTRIES',
          label: 'قيود اليومية والترحيل',
          icon: Receipt,
          badge: unpostedEntriesCount > 0 ? `${unpostedEntriesCount} غير مرحل` : `${state.journalEntries.length}`,
          badgeColor: unpostedEntriesCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400',
        },
        {
          id: 'GENERAL_LEDGER',
          label: 'دفتر الأستاذ العام',
          icon: BookOpen,
          badge: null,
        },
        {
          id: 'TRIAL_BALANCE',
          label: 'ميزان المراجعة بالمجاميع',
          icon: Scale,
          badge: null,
        },
      ],
    },
    {
      groupTitle: 'التقارير والقوائم المالية',
      items: [
        {
          id: 'FINANCIAL_STATEMENTS',
          label: 'التقارير والقوائم المالية',
          icon: FileSpreadsheet,
          badge: 'EAS',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        },
        {
          id: 'AUDITOR_REPORT',
          label: 'تقرير مراقب الحسابات المستقل',
          icon: FileCheck2,
          badge: 'معتمد',
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        },
        {
          id: 'CREDIT_SIMULATOR',
          label: 'ملف الائتمان ونموذج التوزيع',
          icon: TrendingUp,
          badge: 'توزيع ذكي',
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        },
        {
          id: 'INVOICING',
          label: 'الفواتير والمبيعات والمشتريات',
          icon: CreditCard,
          badge: `${state.invoices.length}`,
        },
      ],
    },
    {
      groupTitle: 'إدارة المكتب والضرائب والعملاء',
      items: [
        {
          id: 'TAX_TRACKER',
          label: 'إقرارات القيمة المضافة والضرائب',
          icon: Percent,
          badge: pendingTaxesCount > 0 ? `${pendingTaxesCount} مستحق` : 'مكتمل',
          badgeColor: pendingTaxesCount > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300',
        },
        {
          id: 'CLIENTS_ARCHIVE',
          label: 'الأرشيف وبيانات العملاء',
          icon: Users,
          badge: `${state.clients.length} عميل`,
        },
        {
          id: 'OFFICE_TREASURY',
          label: 'خزنة المكتب (مستقلة)',
          icon: Building2,
          badge: `${state.treasuryTransactions.length} حركة`,
          isTreasurySpecial: true,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        {
          id: 'CERTIFICATES',
          label: 'الشهادات المهنية الذكية (QR)',
          icon: Award,
          badge: `${state.certificates.length}`,
        },
        {
          id: 'FEASIBILITY_STUDY',
          label: 'دراسات الجدوى الاقتصادية',
          icon: LineChart,
          badge: `${state.feasibilityStudies.length}`,
        },
        {
          id: 'AUDIT_TRAIL',
          label: 'سجل التدقيق والنسخ الاحتياطي',
          icon: History,
          badge: `${state.auditLogs.length}`,
        },
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

        {/* Navigation Items List */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.groupTitle}
              </div>
              <div className="space-y-1 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isTreasury = (item as any).isTreasurySpecial;

                  if (isActive) {
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 bg-blue-600 text-white rounded-lg shadow-xs font-semibold text-right cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-blue-200 shrink-0"></span>
                          <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-700/80 text-white shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  }

                  if (isTreasury) {
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-amber-400 hover:bg-slate-800 rounded-lg transition-colors font-semibold border border-amber-500/20 text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            item.badgeColor || 'bg-slate-800 text-slate-400'
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
          ))}
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
