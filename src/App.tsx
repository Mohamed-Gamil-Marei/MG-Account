import React, { useState, useEffect, Suspense, lazy } from 'react';
import { db, DatabaseState } from './db/localDatabase';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { AccessRestrictedGate } from './components/AccessRestrictedGate';
import { ThemeToggle } from './components/ThemeToggle';
import { SecurityAuthService } from './services/securityAuth';
import { NavigationTab, SystemUser, BrandColor, ThemeMode } from './types';
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
  Lock,
  Trash2,
} from 'lucide-react';

// Lazy load Hubs and Modals for instant startup and lightweight memory footprint
const AccountingHubView = lazy(() => import('./components/hubs/AccountingHubView').then(m => ({ default: m.AccountingHubView })));
const FinancialReportingHubView = lazy(() => import('./components/hubs/FinancialReportingHubView').then(m => ({ default: m.FinancialReportingHubView })));
const TaxAuditHubView = lazy(() => import('./components/hubs/TaxAuditHubView').then(m => ({ default: m.TaxAuditHubView })));
const OfficePracticeHubView = lazy(() => import('./components/hubs/OfficePracticeHubView').then(m => ({ default: m.OfficePracticeHubView })));
const SecurityAuditHubView = lazy(() => import('./components/hubs/SecurityAuditHubView').then(m => ({ default: m.SecurityAuditHubView })));
const InvoicingView = lazy(() => import('./components/InvoicingView').then(m => ({ default: m.InvoicingView })));

const BackupExportModal = lazy(() => import('./components/BackupExportModal').then(m => ({ default: m.BackupExportModal })));
const DesktopAppModal = lazy(() => import('./components/DesktopAppModal').then(m => ({ default: m.DesktopAppModal })));
const UpdateNotificationModal = lazy(() => import('./components/UpdateNotificationModal').then(m => ({ default: m.UpdateNotificationModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const UserManagerModal = lazy(() => import('./components/UserManagerModal').then(m => ({ default: m.UserManagerModal })));
const DeviceLockModal = lazy(() => import('./components/DeviceLockModal').then(m => ({ default: m.DeviceLockModal })));
const PurgeDatabaseModal = lazy(() => import('./components/PurgeDatabaseModal').then(m => ({ default: m.PurgeDatabaseModal })));

function HubLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-600">جاري تحميل الوحدة بسرعة وسلاسة...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<DatabaseState>(db.getState());
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2026);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isDeviceEnforcedLocked, setIsDeviceEnforcedLocked] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [unlockedTabs, setUnlockedTabs] = useState<string[]>([]);

  // Update check states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateBannerVisible, setUpdateBannerVisible] = useState<boolean>(false);

  // User Theme and Brand Color Preferences
  const [themeMode, setThemeModeState] = useState<ThemeMode>(state.preferences?.themeMode || 'light');
  const [brandColor, setBrandColorState] = useState<BrandColor>(state.preferences?.brandColor || 'blue');

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeModeState(mode);
    db.setThemeMode(mode);
  };

  const handleBrandColorChange = (color: BrandColor) => {
    setBrandColorState(color);
    db.setBrandColor(color);
  };

  useEffect(() => {
    if (state.preferences?.themeMode && state.preferences.themeMode !== themeMode) {
      setThemeModeState(state.preferences.themeMode);
    }
    if (state.preferences?.brandColor && state.preferences.brandColor !== brandColor) {
      setBrandColorState(state.preferences.brandColor);
    }
  }, [state.preferences?.themeMode, state.preferences?.brandColor]);

  useEffect(() => {
    // Validate Hardware & Device Binding (Anti-theft protection)
    const validation = SecurityAuthService.validateCurrentDevice();
    if (!validation.isValid) {
      setIsDeviceEnforcedLocked(true);
      setIsDeviceModalOpen(true);
    }
  }, []);

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

      // 1. Accounting Hub (الدورة المحاسبية العامة)
      case 'ACCOUNTING_HUB':
        return <AccountingHubView state={state} initialSubTab="JOURNAL_ENTRIES" fiscalYear={selectedFiscalYear} />;
      case 'CHART_OF_ACCOUNTS':
        return <AccountingHubView state={state} initialSubTab="CHART_OF_ACCOUNTS" fiscalYear={selectedFiscalYear} />;
      case 'JOURNAL_ENTRIES':
        return <AccountingHubView state={state} initialSubTab="JOURNAL_ENTRIES" fiscalYear={selectedFiscalYear} />;
      case 'GENERAL_LEDGER':
        return <AccountingHubView state={state} initialSubTab="GENERAL_LEDGER" fiscalYear={selectedFiscalYear} />;
      case 'TRIAL_BALANCE':
        return <AccountingHubView state={state} initialSubTab="TRIAL_BALANCE" fiscalYear={selectedFiscalYear} />;
      case 'FIXED_ASSETS':
        return <AccountingHubView state={state} initialSubTab="FIXED_ASSETS" fiscalYear={selectedFiscalYear} />;

      // 2. Financial Reporting Hub (القوائم والتقارير المالية)
      case 'FINANCIAL_REPORTING_HUB':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_STATEMENTS" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_STATEMENTS':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_STATEMENTS" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_NOTES':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_NOTES" fiscalYear={selectedFiscalYear} />;
      case 'AUDITOR_REPORT':
        return <FinancialReportingHubView state={state} initialSubTab="AUDITOR_REPORT" fiscalYear={selectedFiscalYear} />;
      case 'CREDIT_SIMULATOR':
        return <FinancialReportingHubView state={state} initialSubTab="CREDIT_SIMULATOR" fiscalYear={selectedFiscalYear} />;

      // 3. Tax & Audit Hub (الضرائب والمراجعة والامتثال)
      case 'TAX_AUDIT_HUB':
        return <TaxAuditHubView state={state} initialSubTab="TAX_TRACKER" />;
      case 'TAX_TRACKER':
        return <TaxAuditHubView state={state} initialSubTab="TAX_TRACKER" />;
      case 'TAX_EXPOSURE_SIMULATOR':
        return <TaxAuditHubView state={state} initialSubTab="TAX_EXPOSURE_SIMULATOR" />;
      case 'ETA_RECONCILIATION':
        return <TaxAuditHubView state={state} initialSubTab="ETA_RECONCILIATION" />;
      case 'PAYROLL_INSURANCE':
        return <TaxAuditHubView state={state} initialSubTab="PAYROLL_INSURANCE" />;
      case 'AUDIT_WORKING_PAPERS':
        return <TaxAuditHubView state={state} initialSubTab="AUDIT_WORKING_PAPERS" />;

      // 4. Office Practice Hub (إدارة المكتب والعملاء)
      case 'OFFICE_HUB':
        return <OfficePracticeHubView state={state} initialSubTab="CLIENTS_ARCHIVE" />;
      case 'CLIENTS_ARCHIVE':
        return <OfficePracticeHubView state={state} initialSubTab="CLIENTS_ARCHIVE" />;
      case 'OFFICE_TREASURY':
        return <OfficePracticeHubView state={state} initialSubTab="OFFICE_TREASURY" />;
      case 'CERTIFICATES':
        return <OfficePracticeHubView state={state} initialSubTab="CERTIFICATES" />;
      case 'FEASIBILITY_STUDY':
        return <OfficePracticeHubView state={state} initialSubTab="FEASIBILITY_STUDY" />;

      // 5. Invoicing Hub (مركز الفواتير والمبيعات)
      case 'INVOICING':
        return <InvoicingView state={state} />;

      // 6. Security & Audit Hub (الرقابة والأمان والنسخ الاحتياطي)
      case 'AUDIT_SECURITY_HUB':
        return <SecurityAuditHubView state={state} initialSubTab="AUDIT_TRAIL" />;
      case 'AUDIT_TRAIL':
        return <SecurityAuditHubView state={state} initialSubTab="AUDIT_TRAIL" />;

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

  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex h-screen overflow-hidden font-['Cairo',sans-serif] antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
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
        <header
          className={`h-16 border-b px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10 shrink-0 shadow-xs gap-3 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
              }`}
              title="إظهار / إخفاء القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Authority / Profile snippet */}
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 px-2.5 rounded-lg hidden sm:flex items-center gap-2 border ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="w-6 h-6 bg-slate-800 grid place-items-center text-[9px] text-white font-mono rounded font-bold">
                  EAS
                </div>
                <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  SN: M-2026-0931-J
                </div>
              </div>

              <div className="hidden lg:block">
                <h1 className={`text-sm font-bold line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
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
            {/* Theme & Brand Color Quick Switcher */}
            <ThemeToggle
              themeMode={themeMode}
              onThemeChange={handleThemeChange}
              brandColor={brandColor}
              onBrandColorChange={handleBrandColorChange}
            />

            {/* User Profile & Role Switcher */}
            <button
              onClick={() => setIsUserManagerOpen(true)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
              title="إدارة المستخدمين وصلاحيات الوصول (Multi-User RBAC)"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-amber-500 text-white'
                    : currentUser.role === 'AUDITOR'
                    ? 'bg-blue-600 text-white'
                    : currentUser.role === 'SECRETARY'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {currentUser.name.slice(0, 1)}
              </div>
              <div className="text-right hidden md:block">
                <span className={`block text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.name}
                </span>
                <span className={`block text-[9px] font-mono leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentUser.roleTitleArabic}
                </span>
              </div>
            </button>

            {/* Fiscal Year Selector */}
            <div
              className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium text-[11px] hidden xl:inline">السنة:</span>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                className={`bg-transparent font-bold font-mono focus:outline-none cursor-pointer text-xs ${
                  isDark ? 'text-white' : 'text-slate-800'
                }`}
              >
                <option value={2026} className={isDark ? 'bg-slate-900 text-white' : ''}>2026</option>
                <option value={2025} className={isDark ? 'bg-slate-900 text-white' : ''}>2025</option>
                <option value={2024} className={isDark ? 'bg-slate-900 text-white' : ''}>2024</option>
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
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="فحص التحديثات والإصدارات الجديدة"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">فحص التحديثات</span>
              {availableUpdate && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>

            {/* Anti-theft Device Lock & Security Button */}
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              id="header-btn-device-lock"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-900/50'
                  : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
              }`}
              title="إدارة وتعدد الأجهزة المصرح بها وقفل الحماية (Device Whitelist)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">الأجهزة المصرحة</span>
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
        <main
          className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 transition-colors ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-6">
            <Suspense fallback={<HubLoadingFallback />}>
              {renderActiveView()}
            </Suspense>
          </div>
        </main>

        {/* Bottom Status & Footer Bar */}
        <footer
          className={`h-9 border-t px-4 sm:px-6 flex items-center justify-between text-[11px] shrink-0 transition-colors ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-400'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="truncate">
              النظام المحاسبي المتكامل وفق معايير المحاسبة المصرية (EAS) • قاعدة بيانات محلية مؤمنة
            </span>
          </div>
          <div className={`font-medium hidden sm:inline-block shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            إعداد المراجع القانوني: أ/ {state.officeProfile.auditorName} ({state.officeProfile.licenseNumber})
          </div>
        </footer>
      </div>

      <Suspense fallback={null}>
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
        {isShortcutsModalOpen && (
          <KeyboardShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
            onNavigate={(tabId) => setActiveTab(tabId)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
            onCheckUpdate={handleManualCheckUpdate}
          />
        )}

        {/* User Manager RBAC Modal */}
        {isUserManagerOpen && (
          <UserManagerModal
            isOpen={isUserManagerOpen}
            onClose={() => setIsUserManagerOpen(false)}
            state={state}
          />
        )}

        {/* Anti-Theft Device Lock & Binding Modal */}
        {(isDeviceModalOpen || isDeviceEnforcedLocked) && (
          <DeviceLockModal
            isOpen={isDeviceModalOpen || isDeviceEnforcedLocked}
            isEnforced={isDeviceEnforcedLocked}
            onClose={() => {
              setIsDeviceModalOpen(false);
              setIsDeviceEnforcedLocked(false);
            }}
          />
        )}

        {/* Complete Data Purge Modal (Protected by Mgacc120) */}
        {isPurgeModalOpen && (
          <PurgeDatabaseModal
            isOpen={isPurgeModalOpen}
            onClose={() => setIsPurgeModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
