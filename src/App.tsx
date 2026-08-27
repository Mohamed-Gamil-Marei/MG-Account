import React, { useState, useEffect } from 'react';
import { db, DatabaseState } from './db/localDatabase';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChartOfAccountsView } from './components/ChartOfAccountsView';
import { JournalEntriesView } from './components/JournalEntriesView';
import { GeneralLedgerView } from './components/GeneralLedgerView';
import { TrialBalanceView } from './components/TrialBalanceView';
import { FinancialStatementsView } from './components/FinancialStatementsView';
import { AuditorReportView } from './components/AuditorReportView';
import { CreditFinancialsSimulator } from './components/CreditFinancialsSimulator';
import { OfficeTreasuryView } from './components/OfficeTreasuryView';
import { ClientsArchiveView } from './components/ClientsArchiveView';
import { TaxTrackerView } from './components/TaxTrackerView';
import { CertificatesGeneratorView } from './components/CertificatesGeneratorView';
import { FeasibilityStudyView } from './components/FeasibilityStudyView';
import { InvoicingView } from './components/InvoicingView';
import { AuditTrailView } from './components/AuditTrailView';
import { BackupExportModal } from './components/BackupExportModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { UpdateNotificationModal } from './components/UpdateNotificationModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { UserManagerModal } from './components/UserManagerModal';
import { AccessRestrictedGate } from './components/AccessRestrictedGate';
import { NavigationTab, SystemUser } from './types';
import {
  UpdateCheckerService,
  AppVersionInfo,
  CURRENT_APP_VERSION,
} from './services/updateChecker';
import {
  Menu,
  ShieldCheck,
  PlusCircle,
  Building,
  Download,
  Calendar,
  Sparkles,
  Laptop,
  RefreshCw,
  Zap,
  Keyboard,
  Shield,
  Users,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<DatabaseState>(db.getState());
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2026);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState<boolean>(false);
  const [unlockedTabs, setUnlockedTabs] = useState<string[]>([]);

  // Update check states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateBannerVisible, setUpdateBannerVisible] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setState(db.getState());
    });
    return unsubscribe;
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+J, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Check if user is typing in an input/textarea/select
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Escape: close open dialogs
      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        setIsBackupModalOpen(false);
        setIsDesktopModalOpen(false);
        setIsUpdateModalOpen(false);
        return;
      }

      // '?' key when not in an input -> toggle shortcuts modal
      if (!isModifier && e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      if (!isModifier) return;

      // Ctrl + K: Toggle shortcuts command palette / cheat sheet
      if (key === 'k') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // If user is editing text in input, preserve normal clipboard/selection actions
      if (isInput && ['c', 'v', 'x', 'a', 'z', 'y'].includes(key)) {
        return;
      }

      // Check if text is currently highlighted in document
      const hasTextSelection = Boolean(window.getSelection()?.toString().length);
      if (hasTextSelection && ['c', 'x', 'a'].includes(key)) {
        return;
      }

      switch (key) {
        case 'j': // Ctrl + J -> Journal Entries
          e.preventDefault();
          setActiveTab('JOURNAL_ENTRIES');
          setIsShortcutsModalOpen(false);
          break;
        case 'd': // Ctrl + D -> Dashboard
          e.preventDefault();
          setActiveTab('DASHBOARD');
          setIsShortcutsModalOpen(false);
          break;
        case 'l': // Ctrl + L -> General Ledger
          e.preventDefault();
          setActiveTab('GENERAL_LEDGER');
          setIsShortcutsModalOpen(false);
          break;
        case 't': // Ctrl + T -> Trial Balance
          e.preventDefault();
          setActiveTab('TRIAL_BALANCE');
          setIsShortcutsModalOpen(false);
          break;
        case 'f': // Ctrl + F -> Financial Statements
          if (!isInput) {
            e.preventDefault();
            setActiveTab('FINANCIAL_STATEMENTS');
            setIsShortcutsModalOpen(false);
          }
          break;
        case 'i': // Ctrl + I -> Invoicing
          e.preventDefault();
          setActiveTab('INVOICING');
          setIsShortcutsModalOpen(false);
          break;
        case 'c': // Ctrl + C -> Clients Archive (if no text selected)
          if (!hasTextSelection && !isInput) {
            e.preventDefault();
            setActiveTab('CLIENTS_ARCHIVE');
            setIsShortcutsModalOpen(false);
          }
          break;
        case 'x': // Ctrl + X -> Tax Tracker (if no text selected)
          if (!hasTextSelection && !isInput) {
            e.preventDefault();
            setActiveTab('TAX_TRACKER');
            setIsShortcutsModalOpen(false);
          }
          break;
        case 'm': // Ctrl + M -> Treasury
          e.preventDefault();
          setActiveTab('OFFICE_TREASURY');
          setIsShortcutsModalOpen(false);
          break;
        case 'o': // Ctrl + O -> Chart of Accounts
          e.preventDefault();
          setActiveTab('CHART_OF_ACCOUNTS');
          setIsShortcutsModalOpen(false);
          break;
        case 'a': // Ctrl + A -> Auditor Report (if no text selected)
          if (!hasTextSelection && !isInput) {
            e.preventDefault();
            setActiveTab('AUDITOR_REPORT');
            setIsShortcutsModalOpen(false);
          }
          break;
        case 'r': // Ctrl + R -> Credit Simulator
          if (!isInput) {
            e.preventDefault();
            setActiveTab('CREDIT_SIMULATOR');
            setIsShortcutsModalOpen(false);
          }
          break;
        case 'q': // Ctrl + Q -> Certificates
          e.preventDefault();
          setActiveTab('CERTIFICATES');
          setIsShortcutsModalOpen(false);
          break;
        case 'e': // Ctrl + E -> Feasibility Study
          e.preventDefault();
          setActiveTab('FEASIBILITY_STUDY');
          setIsShortcutsModalOpen(false);
          break;
        case 's': // Ctrl + S -> Audit Trail
          e.preventDefault();
          setActiveTab('AUDIT_TRAIL');
          setIsShortcutsModalOpen(false);
          break;
        case 'b': // Ctrl + B -> Backup Modal
          e.preventDefault();
          setIsBackupModalOpen(true);
          setIsShortcutsModalOpen(false);
          break;
        case 'u': // Ctrl + U -> Check Update
          e.preventDefault();
          handleManualCheckUpdate();
          setIsShortcutsModalOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Automatic update check upon opening the application
  useEffect(() => {
    const performUpdateCheck = async () => {
      try {
        setIsCheckingUpdate(true);
        const result = await UpdateCheckerService.checkForUpdates();
        if (result.hasUpdate) {
          setAvailableUpdate(result.latestVersionInfo);
          setUpdateBannerVisible(true);
          // Show popup modal automatically if user hasn't dismissed this version
          if (!UpdateCheckerService.isVersionDismissed(result.latestVersionInfo.version)) {
            setIsUpdateModalOpen(true);
          }
        }
      } catch (err) {
        console.error('Update check error:', err);
      } finally {
        setIsCheckingUpdate(false);
      }
    };

    // Trigger check on load after 1.2s delay for smooth UI hydration
    const timer = setTimeout(() => {
      performUpdateCheck();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await UpdateCheckerService.checkForUpdates();
      if (result.hasUpdate) {
        setAvailableUpdate(result.latestVersionInfo);
        setIsUpdateModalOpen(true);
        setUpdateBannerVisible(true);
      } else {
        alert(`أنت تستخدم أحدث إصدار من منظومة المحاسب والمراجع القانوني (v${CURRENT_APP_VERSION}).`);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const currentUser = db.getCurrentUser();

  const isTabRestricted = (tab: string): { restricted: boolean; name: string } => {
    if (unlockedTabs.includes(tab)) return { restricted: false, name: '' };
    if (currentUser.role === 'ADMIN') return { restricted: false, name: '' };

    if (tab === 'OFFICE_TREASURY' && !currentUser.canAccessTreasury) {
      return { restricted: true, name: 'خزنة المكتب وحسابات الأتعاب والمصروفات' };
    }
    if (tab === 'AUDIT_TRAIL' && !currentUser.canAccessAuditTrail) {
      return { restricted: true, name: 'سجل المراجعة والرقابة والتدقيق (Audit Trail)' };
    }
    if (currentUser.restrictedTabs?.includes(tab as any)) {
      return { restricted: true, name: tab };
    }
    return { restricted: false, name: '' };
  };

  const renderActiveView = () => {
    const restrictionCheck = isTabRestricted(activeTab);
    if (restrictionCheck.restricted) {
      return (
        <AccessRestrictedGate
          currentUser={currentUser}
          targetTabName={restrictionCheck.name}
          onOverrideSuccess={() => setUnlockedTabs((prev) => [...prev, activeTab])}
          onNavigateHome={() => setActiveTab('DASHBOARD')}
        />
      );
    }

    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <Dashboard
            state={state}
            onNavigate={setActiveTab}
            onOpenQuickJournal={() => setActiveTab('JOURNAL_ENTRIES')}
            onOpenQuickTreasury={() => setActiveTab('OFFICE_TREASURY')}
            onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          />
        );
      case 'CHART_OF_ACCOUNTS':
        return <ChartOfAccountsView state={state} />;
      case 'JOURNAL_ENTRIES':
        return <JournalEntriesView state={state} />;
      case 'GENERAL_LEDGER':
        return <GeneralLedgerView state={state} />;
      case 'TRIAL_BALANCE':
        return <TrialBalanceView state={state} fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_STATEMENTS':
        return <FinancialStatementsView state={state} fiscalYear={selectedFiscalYear} />;
      case 'AUDITOR_REPORT':
        return <AuditorReportView state={state} fiscalYear={selectedFiscalYear} />;
      case 'CREDIT_SIMULATOR':
        return <CreditFinancialsSimulator state={state} />;
      case 'OFFICE_TREASURY':
        return <OfficeTreasuryView state={state} />;
      case 'CLIENTS_ARCHIVE':
        return <ClientsArchiveView state={state} />;
      case 'TAX_TRACKER':
        return <TaxTrackerView state={state} />;
      case 'CERTIFICATES':
        return <CertificatesGeneratorView state={state} />;
      case 'FEASIBILITY_STUDY':
        return <FeasibilityStudyView state={state} />;
      case 'INVOICING':
        return <InvoicingView state={state} />;
      case 'AUDIT_TRAIL':
        return <AuditTrailView state={state} />;
      default:
        return (
          <Dashboard
            state={state}
            onNavigate={setActiveTab}
            onOpenQuickJournal={() => setActiveTab('JOURNAL_ENTRIES')}
            onOpenQuickTreasury={() => setActiveTab('OFFICE_TREASURY')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-['Cairo',sans-serif] text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        profile={state.officeProfile}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        hasUpdate={!!availableUpdate}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Update Alert Banner (if update available) */}
        {updateBannerVisible && availableUpdate && (
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-emerald-700/50 shrink-0 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0">
                NEW
              </div>
              <span className="font-semibold text-white">
                يوجد تحديث وإصدار جديد متاح للمنظومة:
              </span>
              <span className="font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-300 border border-emerald-700">
                v{availableUpdate.version}
              </span>
              <span className="hidden md:inline text-slate-200 text-[11px]">
                ({availableUpdate.changelog.title})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                id="banner-btn-view-update"
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-slate-950" />
                <span>تفاصيل وتثبيت التحديث</span>
              </button>
              <button
                onClick={() => setUpdateBannerVisible(false)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="إغلاق التنبيه"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar - Professional Polish style */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10 shrink-0 shadow-xs gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
              title="إظهار / إخفاء القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Authority / Profile snippet */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-1.5 px-2.5 rounded-lg hidden sm:flex items-center gap-2 border border-slate-200">
                <div className="w-6 h-6 bg-slate-800 grid place-items-center text-[9px] text-white font-mono rounded font-bold">
                  EAS
                </div>
                <div className="text-[11px] font-mono text-slate-600 font-bold">
                  SN: M-2026-0931-J
                </div>
              </div>

              <div className="hidden lg:block">
                <h1 className="text-sm font-bold text-slate-900 line-clamp-1">
                  أ/ {state.officeProfile.auditorName}
                </h1>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  المعايير المحاسبية المصرية (EAS)
                </span>
              </div>
            </div>
          </div>

          {/* Center: Multi-record Global Search Bar */}
          <div className="flex-1 max-w-lg mx-2 hidden sm:block">
            <GlobalSearchBar
              state={state}
              onNavigate={(tab, recordId) => {
                setActiveTab(tab);
              }}
            />
          </div>

          {/* Header Quick Actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* User Profile & Role Switcher */}
            <button
              onClick={() => setIsUserManagerOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="إدارة المستخدمين وصلاحيات الوصول (Multi-User RBAC)"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-amber-500 text-white'
                    : currentUser.role === 'AUDITOR'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {currentUser.name.slice(0, 1)}
              </div>
              <div className="text-right hidden md:block">
                <span className="block text-xs text-slate-900 font-bold leading-tight">{currentUser.name}</span>
                <span className="block text-[9px] text-slate-500 font-mono leading-tight">{currentUser.roleTitleArabic}</span>
              </div>
            </button>

            {/* Fiscal Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium text-[11px] hidden xl:inline">السنة:</span>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                className="bg-transparent font-bold font-mono text-slate-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              id="header-btn-shortcuts"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold transition-all cursor-pointer border border-indigo-200"
              title="اختصارات لوحة المفاتيح والتنقل السريع (Ctrl+K)"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">اختصارات</span>
              <kbd className="font-mono text-[10px] bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-300 shadow-2xs">
                Ctrl+K
              </kbd>
            </button>

            {/* Update Check Action Button */}
            <button
              onClick={handleManualCheckUpdate}
              disabled={isCheckingUpdate}
              id="header-btn-check-update"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200"
              title="فحص التحديثات والإصدارات الجديدة"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">فحص التحديثات</span>
              {availableUpdate && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>

            {/* Desktop App Download Button */}
            <button
              onClick={() => setIsDesktopModalOpen(true)}
              id="header-btn-desktop-app"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer border border-emerald-400/30"
              title="تحميل وتثبيت البرنامج ليعمل على سطح المكتب"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-200" />
              <span>تحميل للديسكتوب</span>
            </button>

            {/* Quick Action Button: New Journal */}
            <button
              onClick={() => setActiveTab('JOURNAL_ENTRIES')}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="إضافة قيد يومية جديد"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>قيد جديد</span>
            </button>

            {/* Quick Action Button: Treasury */}
            {currentUser.canAccessTreasury && (
              <button
                onClick={() => setActiveTab('OFFICE_TREASURY')}
                className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="حركة بخزنة المكتب"
              >
                <Building className="w-3.5 h-3.5" />
                <span>خزنة المكتب</span>
              </button>
            )}

            {/* Backup / Export Button */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer"
              title="النسخ الاحتياطي وتصدير البيانات"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">النسخ والترحيل</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>

        {/* Bottom Status & Footer Bar */}
        <footer className="h-9 bg-white border-t border-slate-200 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="truncate">
              النظام المحاسبي المتكامل وفق معايير المحاسبة المصرية (EAS) • قاعدة بيانات محلية مؤمنة
            </span>
          </div>
          <div className="text-slate-600 font-medium hidden sm:inline-block shrink-0">
            إعداد المراجع القانوني: أ/ {state.officeProfile.auditorName} ({state.officeProfile.licenseNumber})
          </div>
        </footer>
      </div>

      {/* Backup & Export Modal */}
      {isBackupModalOpen && (
        <BackupExportModal
          state={state}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}

      {/* Desktop App Installation / Download Modal */}
      {isDesktopModalOpen && (
        <DesktopAppModal
          state={state}
          onClose={() => setIsDesktopModalOpen(false)}
        />
      )}

      {/* Update Notification Modal */}
      {isUpdateModalOpen && availableUpdate && (
        <UpdateNotificationModal
          versionInfo={availableUpdate}
          onClose={() => setIsUpdateModalOpen(false)}
          onOpenDesktopModal={() => {
            setIsUpdateModalOpen(false);
            setIsDesktopModalOpen(true);
          }}
        />
      )}

      {/* Keyboard Shortcuts Command Palette Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        onNavigate={(tabId) => setActiveTab(tabId)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
        onCheckUpdate={handleManualCheckUpdate}
      />

      {/* User Manager RBAC Modal */}
      <UserManagerModal
        isOpen={isUserManagerOpen}
        onClose={() => setIsUserManagerOpen(false)}
        state={state}
      />
    </div>
  );
}
