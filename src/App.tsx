import React, { useState, useEffect, Suspense } from 'react';
import { db, DatabaseState } from './db/localDatabase';
import { Sidebar, getParentHub } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { AccessRestrictedGate } from './components/AccessRestrictedGate';
import { ThemeToggle } from './components/ThemeToggle';
import { SecurityAuthService } from './services/securityAuth';
import { AppLanguage, NavigationTab, SystemUser, BrandColor, ThemeMode } from './types';
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
  Maximize2,
  BookOpen,
  Play,
  Settings,
  Smartphone,
  Monitor,
  QrCode,
  Layers,
  FileSpreadsheet,
  Percent,
  Calculator,
  FolderTree,
  Factory,
  X,
} from 'lucide-react';

// Primary view loaded directly for immediate startup render
import AccountingHubView from './components/hubs/AccountingHubView';

// Resilient dynamic loader that safely handles both default and named exports with network retry
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>
): React.LazyExoticComponent<any> {
  return React.lazy(async () => {
    try {
      const res = await factory();
      if (res && res.default) return res;
      const comp = Object.values(res).find(
        (v: any) => typeof v === 'function' || (typeof v === 'object' && v !== null && !Array.isArray(v))
      );
      return { default: comp || res };
    } catch (err) {
      console.warn('Retrying dynamic import:', err);
      await new Promise((r) => setTimeout(r, 250));
      const res = await factory();
      if (res && res.default) return res;
      const comp = Object.values(res).find(
        (v: any) => typeof v === 'function' || (typeof v === 'object' && v !== null && !Array.isArray(v))
      );
      return { default: comp || res };
    }
  });
}

// Secondary hubs loaded on demand to make initial startup instantaneous
const FinancialReportingHubView = lazyWithRetry(() => import('./components/hubs/FinancialReportingHubView'));
const TaxAuditHubView = lazyWithRetry(() => import('./components/hubs/TaxAuditHubView'));
const OfficePracticeHubView = lazyWithRetry(() => import('./components/hubs/OfficePracticeHubView'));
const SecurityAuditHubView = lazyWithRetry(() => import('./components/hubs/SecurityAuditHubView'));
const InvoicingView = lazyWithRetry(() => import('./components/InvoicingView'));
const CustomsHubView = lazyWithRetry(() => import('./components/CustomsHubView'));
const SapErpHubView = lazyWithRetry(() => import('./components/sap/SapErpHubView'));
const MobileFieldCompanionView = lazyWithRetry(() => import('./components/mobile/MobileFieldCompanionView'));
const FinancialDossierGeneratorView = lazyWithRetry(() => import('./components/financial/FinancialDossierGeneratorView'));
const MultiTenantWorkspacesView = lazyWithRetry(() => import('./components/workspaces/MultiTenantWorkspacesView').then(m => ({ default: m.MultiTenantWorkspacesView })));

// Modals loaded on demand only when opened
const PinAuthModal = lazyWithRetry(() => import('./components/PinAuthModal'));
const GlobalCommandPalette = lazyWithRetry(() => import('./components/common/GlobalCommandPalette').then(m => ({ default: m.GlobalCommandPalette })));
const MgOfficePromoModal = lazyWithRetry(() => import('./components/common/MgOfficePromoModal'));
const BackupExportModal = lazyWithRetry(() => import('./components/BackupExportModal').then(m => ({ default: m.BackupExportModal })));
const DesktopAppModal = lazyWithRetry(() => import('./components/DesktopAppModal').then(m => ({ default: m.DesktopAppModal })));
const UpdateNotificationModal = lazyWithRetry(() => import('./components/UpdateNotificationModal').then(m => ({ default: m.UpdateNotificationModal })));
const KeyboardShortcutsModal = lazyWithRetry(() => import('./components/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const UserManagementModal = lazyWithRetry(() => import('./components/UserManagementModal').then(m => ({ default: m.UserManagementModal })));
const DeviceLockModal = lazyWithRetry(() => import('./components/DeviceLockModal').then(m => ({ default: m.DeviceLockModal })));
const PurgeDatabaseModal = lazyWithRetry(() => import('./components/PurgeDatabaseModal').then(m => ({ default: m.PurgeDatabaseModal })));
const DocumentVerificationModal = lazyWithRetry(() => import('./components/common/DocumentVerificationModal').then(m => ({ default: m.DocumentVerificationModal })));
const SystemManualModal = lazyWithRetry(() => import('./components/common/SystemManualModal').then(m => ({ default: m.SystemManualModal })));
const LogoInspectionModal = lazyWithRetry(() => import('./components/common/LogoInspectionModal').then(m => ({ default: m.LogoInspectionModal })));
const AppSettingsModal = lazyWithRetry(() => import('./components/AppSettingsModal').then(m => ({ default: m.AppSettingsModal })));
const QuickAccountingToolsDrawer = lazyWithRetry(() => import('./components/common/QuickAccountingToolsDrawer').then(m => ({ default: m.QuickAccountingToolsDrawer })));

import { LanguageToggle } from './components/LanguageToggle';
import { CloudSyncHeaderWidget } from './components/CloudSyncHeaderWidget';
import { HeaderNavigationDropdown } from './components/common/HeaderNavigationDropdown';
import { MobileBottomNavigation } from './components/common/ThemeUIComponents';
import { I18nProvider, getTranslation } from './utils/i18n';
import { parseVerificationFromUrl, VerificationPayloadData } from './utils/qrCodeGenerator';
import { firebaseAuth, FirebaseUserProfile } from './services/firebaseAuthService';
import { FirebaseAuthGate } from './components/auth/FirebaseAuthGate';
import { cloudSync } from './lib/cloudSync';

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

  // User View Mode: 'DESKTOP' vs 'MOBILE' with auto-detection & persistence
  const [viewMode, setViewMode] = useState<'DESKTOP' | 'MOBILE'>(() => {
    try {
      const saved = localStorage.getItem('mg_app_view_mode');
      if (saved === 'mobile') return 'MOBILE';
      if (saved === 'desktop') return 'DESKTOP';
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return 'MOBILE';
      }
    } catch {
      // Safe fallback
    }
    return 'DESKTOP';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mg_app_view_mode');
      if (saved === 'mobile') return 'MOBILE_COMPANION';
      const savedTab = localStorage.getItem('mg_active_tab');
      if (savedTab && savedTab !== 'DASHBOARD') return savedTab;
    } catch {
      // Fallback
    }
    return 'JOURNAL_ENTRIES';
  });

  const handleSwitchToMobileMode = () => {
    setViewMode('MOBILE');
    try {
      localStorage.setItem('mg_app_view_mode', 'mobile');
    } catch {
      // Safe fallback
    }
    setActiveTab('MOBILE_COMPANION');
  };

  const handleSwitchToDesktopMode = (targetTab: string = 'JOURNAL_ENTRIES') => {
    setViewMode('DESKTOP');
    try {
      localStorage.setItem('mg_app_view_mode', 'desktop');
    } catch {
      // Safe fallback
    }
    setActiveTab(targetTab === 'MOBILE_COMPANION' ? 'JOURNAL_ENTRIES' : targetTab);
  };

  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2026);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isSystemManualOpen, setIsSystemManualOpen] = useState<boolean>(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [allowPinCancel, setAllowPinCancel] = useState<boolean>(true);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isDeviceEnforcedLocked, setIsDeviceEnforcedLocked] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [unlockedTabs, setUnlockedTabs] = useState<string[]>([]);
  const [verificationData, setVerificationData] = useState<VerificationPayloadData | null>(null);
  const [isMgPromoModalOpen, setIsMgPromoModalOpen] = useState<boolean>(false);
  const [isLogoInspectionModalOpen, setIsLogoInspectionModalOpen] = useState<boolean>(false);
  const [isMobileMoreSheetOpen, setIsMobileMoreSheetOpen] = useState<boolean>(false);

  const [firebaseProfile, setFirebaseProfile] = useState<FirebaseUserProfile | null>(() => firebaseAuth.getCurrentProfile());
  const [authResolved, setAuthResolved] = useState<boolean>(false);

  // Mandatory Firebase Authentication & Firestore Partitioned Sync Listener
  useEffect(() => {
    const unsubAuth = firebaseAuth.subscribe((profile) => {
      setFirebaseProfile(profile);
      setAuthResolved(true);
      if (profile) {
        cloudSync.initRealtimeSync((remote) => {
          db.mergeRemoteState(remote);
        });
      }
    });
    return unsubAuth;
  }, []);

  // Non-blocking initialization of print header injection
  useEffect(() => {
    import('./services/printHeaderInjector')
      .then((m) => {
        m.initPrintHeaderInjection();
      })
      .catch(() => {});
  }, []);

  // Check if user set promo as welcome screen on startup
  useEffect(() => {
    try {
      const showStartupIntro = localStorage.getItem('mg_show_welcome_intro') === 'true';
      if (showStartupIntro) {
        setIsMgPromoModalOpen(true);
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  // Update check states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateBannerVisible, setUpdateBannerVisible] = useState<boolean>(false);

  // User Theme and Brand Color Preferences
  const [themeMode, setThemeModeState] = useState<ThemeMode>(state.preferences?.themeMode || 'light');
  const [brandColor, setBrandColorState] = useState<BrandColor>(state.preferences?.brandColor || 'blue');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isQuickToolsDrawerOpen, setIsQuickToolsDrawerOpen] = useState<boolean>(false);

  // Active Interface Language & Dynamic RTL/LTR Direction
  const currentLanguage: AppLanguage = state.preferences?.language || 'ar';
  const isRtl = currentLanguage === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRtl]);

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    if (!isFocusMode) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  };

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
    // Check if user arrived via QR Code scanning or verification link
    const checkVerification = () => {
      const parsed = parseVerificationFromUrl();
      if (parsed) {
        setVerificationData(parsed);
      }
    };

    checkVerification();
    window.addEventListener('hashchange', checkVerification);
    return () => window.removeEventListener('hashchange', checkVerification);
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
      if (!e.key) return;
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

      // Ctrl + K: Toggle shortcuts command palette / quick launcher
      if (key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
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
        case 'c': // Ctrl + Shift + C -> Customs Hub, or Ctrl + C -> Clients Archive
          if (e.shiftKey) {
            e.preventDefault();
            setActiveTab('CUSTOMS_HUB');
            setIsShortcutsModalOpen(false);
          } else if (!hasTextSelection && !isInput) {
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
        case 's': // Ctrl + S -> Financial Notes
          e.preventDefault();
          setActiveTab('FINANCIAL_NOTES');
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

  // Automatic periodic check for updates on app mount
  useEffect(() => {
    const checkOnStart = async () => {
      try {
        const update = await UpdateCheckerService.checkForUpdates();
        if (update && update.hasUpdate) {
          setAvailableUpdate(update.latestVersionInfo);
          setUpdateBannerVisible(true);
        }
      } catch {
        // Fallback silently if offline
      }
    };

    const timer = setTimeout(checkOnStart, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const update = await UpdateCheckerService.checkForUpdates();
      if (update && update.hasUpdate) {
        setAvailableUpdate(update.latestVersionInfo);
        setIsUpdateModalOpen(true);
      } else {
        alert(`أنت تستخدم أحدث إصدار معتمد من المنظومة (v${CURRENT_APP_VERSION})`);
      }
    } catch {
      alert('تعذر التحقق من التحديثات. يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const currentUser: SystemUser = db.getCurrentUser();

  const handleUnlockTab = (tabId: string) => {
    if (!unlockedTabs.includes(tabId)) {
      setUnlockedTabs([...unlockedTabs, tabId]);
    }
  };

  const isTabAccessible = (tab: string): boolean => {
    if (currentUser.role === 'ADMIN') return true;
    if (unlockedTabs.includes(tab)) return true;

    if (currentUser.restrictedTabs && currentUser.restrictedTabs.includes(tab as any)) {
      return false;
    }

    if (tab === 'OFFICE_TREASURY' && !currentUser.canAccessTreasury) return false;
    if (tab === 'AUDIT_TRAIL' && !currentUser.canAccessAuditTrail) return false;
    if (tab === 'CREDIT_SIMULATOR' && currentUser.canAccessCreditFiles === false) return false;
    if ((tab === 'TAX_TRACKER' || tab === 'TAX_PENALTY_SIMULATOR' || tab === 'TAX_EXPOSURE_SIMULATOR' || tab === 'ETA_RECONCILIATION' || tab === 'PAYROLL_INSURANCE' || tab === 'TAX_AUDIT_HUB') && currentUser.canAccessTaxReports === false) return false;

    return true;
  };

  const renderViewForTab = (tabToRender: string, onClose?: () => void) => {
    if (!isTabAccessible(tabToRender)) {
      return (
        <AccessRestrictedGate
          tabTitle={tabToRender}
          currentUser={currentUser}
          onUnlock={() => handleUnlockTab(tabToRender)}
          onGoBack={() => {
            if (onClose) {
              onClose();
            } else {
              setActiveTab('DASHBOARD');
            }
          }}
        />
      );
    }

    const handleNavigate = (tab: string) => {
      setActiveTab(tab);
    };

    switch (tabToRender) {
      case 'DASHBOARD':
        return (
          <Dashboard
            state={state}
            onNavigate={handleNavigate}
            fiscalYear={selectedFiscalYear}
            onOpenPromoModal={() => setIsMgPromoModalOpen(true)}
          />
        );

      // 1. Accounting & Financial Statements Hub (الحسابات والقوائم المالية المعتمدة)
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
      case 'FINANCIAL_STATEMENTS':
      case 'FINANCIAL_DOSSIER_GENERATOR':
      case 'FINANCIAL_NOTES':
      case 'AUDITOR_REPORT':
        return <AccountingHubView state={state} initialSubTab="FINANCIAL_STATEMENTS" fiscalYear={selectedFiscalYear} />;
      case 'FIXED_ASSETS':
        return <AccountingHubView state={state} initialSubTab="FIXED_ASSETS" fiscalYear={selectedFiscalYear} />;
      case 'BANK_RECONCILIATION':
        return <AccountingHubView state={state} initialSubTab="BANK_RECONCILIATION" fiscalYear={selectedFiscalYear} />;
      case 'OCR_INVOICE_SCANNER':
        return <AccountingHubView state={state} initialSubTab="OCR_INVOICE_SCANNER" fiscalYear={selectedFiscalYear} />;
      case 'CURRENCY_EXCHANGE_RATES':
        return <AccountingHubView state={state} initialSubTab="CURRENCY_EXCHANGE_RATES" fiscalYear={selectedFiscalYear} />;

      // 2. Credit, Feasibility & Advisory Hub (الائتمان ودراسات الجدوى والاستشارات)
      case 'FINANCIAL_REPORTING_HUB':
      case 'CREDIT_SIMULATOR':
        return <FinancialReportingHubView state={state} initialSubTab="CREDIT_SIMULATOR" fiscalYear={selectedFiscalYear} />;
      case 'BUDGET_PLANNER':
      case 'CASH_FLOW_PREDICTOR':
      case 'BUDGET_AND_CASHFLOW':
        return <FinancialReportingHubView state={state} initialSubTab="BUDGET_AND_CASHFLOW" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_SIMULATOR':
        return <FinancialReportingHubView state={state} initialSubTab="CREDIT_SIMULATOR" fiscalYear={selectedFiscalYear} />;
      case 'CERTIFICATES':
        return <FinancialReportingHubView state={state} initialSubTab="CERTIFICATES" fiscalYear={selectedFiscalYear} />;
      case 'FEASIBILITY_STUDY':
        return <FinancialReportingHubView state={state} initialSubTab="FEASIBILITY_STUDY" fiscalYear={selectedFiscalYear} />;

      // 3. Tax & Audit Hub (الضرائب والمراجعة والامتثال)
      case 'TAX_AUDIT_HUB':
      case 'TAX_FILING_CELLS':
      case 'TAX_TRACKER':
        return <TaxAuditHubView state={state} initialSubTab="TAX_TRACKER" />;
      case 'EXCEL_AUDIT_SENTINEL':
        return <TaxAuditHubView state={state} initialSubTab="EXCEL_AUDIT_SENTINEL" />;
      case 'TAX_PENALTY_SIMULATOR':
        return <TaxAuditHubView state={state} initialSubTab="TAX_PENALTY_SIMULATOR" />;
      case 'FRAUD_AUDIT_SENTINEL':
        return <TaxAuditHubView state={state} initialSubTab="FRAUD_AUDIT_SENTINEL" />;
      case 'JOURNAL_AUDIT_SCANNER':
        return <TaxAuditHubView state={state} initialSubTab="JOURNAL_AUDIT_SCANNER" />;
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
      case 'CLIENTS_ARCHIVE':
      case 'PRACTICE_MANAGEMENT':
      case 'WHATSAPP_BOT':
      case 'OFFICE_TREASURY':
        return (
          <OfficePracticeHubView
            state={state}
            initialSubTab={activeTab === 'OFFICE_HUB' ? 'CLIENTS_ARCHIVE' : (activeTab as any)}
            onOpenPromoModal={() => setIsMgPromoModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        );

      // Multi-Tenant Workspaces & Industrial Hub (بيئات عمل الشركات والمصانع)
      case 'MULTI_TENANT_WORKSPACES':
        return <MultiTenantWorkspacesView state={state} onNavigateToTab={(tab) => setActiveTab(tab)} />;

      // 5. Invoicing Hub
      case 'INVOICING':
        return <InvoicingView state={state} />;

      // 6. Security & Audit Hub
      case 'AUDIT_SECURITY_HUB':
        return (
          <SecurityAuditHubView
            state={state}
            initialSubTab="AUDIT_TRAIL"
            onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
            onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
          />
        );
      case 'AUDIT_TRAIL':
        return (
          <SecurityAuditHubView
            state={state}
            initialSubTab="AUDIT_TRAIL"
            onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
            onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
          />
        );

      // 7. SAP S/4HANA & Business One Integration Suite
      case 'SAP_ERP':
        return (
          <SapErpHubView
            state={state}
            fiscalYear={selectedFiscalYear}
            onReturnToStandardMode={() => setActiveTab('DASHBOARD')}
          />
        );

      // 9. Customs, Global Trade & Landed Cost Hub
      case 'CUSTOMS_HUB':
      case 'CUSTOMS_SHIPMENTS':
      case 'CUSTOMS_LANDED_COST':
      case 'CUSTOMS_NAFEZA_ACI':
        return <CustomsHubView state={state} onNavigateToTab={(tab) => setActiveTab(tab)} />;

      case 'MOBILE_COMPANION':
        return (
          <MobileFieldCompanionView
            state={state}
            onExitMobileMode={() => setActiveTab('DASHBOARD')}
            onNavigateToFullAppTab={(tab) => setActiveTab(tab)}
          />
        );

      default:
        return (
          <Dashboard
            state={state}
            onNavigate={handleNavigate}
            fiscalYear={selectedFiscalYear}
          />
        );
    }
  };

  const memoizedActiveView = React.useMemo(() => {
    return renderViewForTab(activeTab);
  }, [activeTab, state, selectedFiscalYear, currentUser]);

  const renderActiveView = () => memoizedActiveView;

  const isDark = themeMode === 'dark';

  const renderCommonModals = () => (
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

      {/* User Management & Cloud Sync Modal */}
      {isUserManagerOpen && (
        <UserManagementModal
          isOpen={isUserManagerOpen}
          onClose={() => setIsUserManagerOpen(false)}
        />
      )}

      {/* Complete System Settings & Auditor Profile Modal (Theme, Language, Passwords, EAS) */}
      {isSettingsModalOpen && (
        <AppSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          state={state}
        />
      )}

      {/* Quick Accounting & Tax Calculators Drawer (كسب العمل، الإهلاك الضريبي، القيمة المضافة، وأعمار الديون) */}
      {isQuickToolsDrawerOpen && (
        <QuickAccountingToolsDrawer
          isOpen={isQuickToolsDrawerOpen}
          onClose={() => setIsQuickToolsDrawerOpen(false)}
          state={state}
        />
      )}

      {/* PIN Authentication & Screen Lock Modal */}
      {isPinModalOpen && (
        <PinAuthModal
          isOpen={isPinModalOpen}
          allowCancel={allowPinCancel}
          onSuccess={(user) => {
            setIsPinModalOpen(false);
            setAllowPinCancel(true);
          }}
          onCancel={() => {
            if (allowPinCancel) {
              setIsPinModalOpen(false);
            }
          }}
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

      {/* Document Verification Modal (Triggered by QR Code Scan or Link) */}
      {verificationData && (
        <DocumentVerificationModal
          data={verificationData}
          onClose={() => {
            setVerificationData(null);
            // Clean verification hash if present
            if (window.location.hash.includes('verify')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
        />
      )}

      {/* Complete Illustrated System Manual PDF Modal */}
      {isSystemManualOpen && (
        <SystemManualModal
          isOpen={isSystemManualOpen}
          onClose={() => setIsSystemManualOpen(false)}
        />
      )}

      {/* MG Office Official Cinematic Promo & Visual Identity Modal */}
      {isMgPromoModalOpen && (
        <MgOfficePromoModal
          isOpen={isMgPromoModalOpen}
          onClose={() => setIsMgPromoModalOpen(false)}
          officeProfile={state.officeProfile}
        />
      )}

      {/* Mohamed Gamil Marei - Official Logo & Seal Cutout Inspection Modal */}
      {isLogoInspectionModalOpen && (
        <LogoInspectionModal
          isOpen={isLogoInspectionModalOpen}
          onClose={() => setIsLogoInspectionModalOpen(false)}
        />
      )}

      {/* Global Command Palette (Ctrl + K) */}
      {isCommandPaletteOpen && (
        <GlobalCommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
          onOpenPromoModal={() => setIsMgPromoModalOpen(true)}
        />
      )}
    </Suspense>
  );

  // 1. If verificationData is present (#verify), allow public access without login
  if (verificationData) {
    return (
      <I18nProvider language={currentLanguage} onLanguageChange={(l) => db.setLanguage(l)}>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4" dir="rtl">
          <Suspense fallback={<HubLoadingFallback />}>
            <DocumentVerificationModal
              initialData={verificationData}
              onClose={() => setVerificationData(null)}
            />
          </Suspense>
        </div>
      </I18nProvider>
    );
  }

  // 2. If auth not resolved yet, show loading
  if (!authResolved) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">جاري التحقق من المصادقة...</span>
        </div>
      </div>
    );
  }

  // 3. If not logged in, show FirebaseAuthGate
  if (!firebaseProfile) {
    return <FirebaseAuthGate onAuthenticated={(profile) => setFirebaseProfile(profile)} />;
  }

  // 4. If logged in but role is PENDING
  if (firebaseProfile.role === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white">حسابك بانتظار تفعيل المدير</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            تم استلام طلب تسجيل حسابك بنجاح. يرجى انتظار قيام مدير المنظومة بمراجعة وتفعيل صلاحيات حسابك (دور PENDING).
          </p>
          <div className="pt-2">
            <button
              onClick={async () => {
                await firebaseAuth.signOut();
                setFirebaseProfile(null);
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer text-xs"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is in Mobile Field Companion mode or activeTab is MOBILE_COMPANION, render a clean full-screen mobile app
  if (viewMode === 'MOBILE' || activeTab === 'MOBILE_COMPANION') {
    return (
      <I18nProvider language={currentLanguage} onLanguageChange={(l) => db.setLanguage(l)}>
        <div
          className={`min-h-screen w-full flex flex-col ${
            isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <Suspense fallback={<HubLoadingFallback />}>
            <MobileFieldCompanionView
              state={state}
              onExitMobileMode={() => handleSwitchToDesktopMode('DASHBOARD')}
              onNavigateToFullAppTab={(tab) => handleSwitchToDesktopMode(tab)}
            />
          </Suspense>
          {renderCommonModals()}
        </div>
      </I18nProvider>
    );
  }

  const currentParentHub = getParentHub(activeTab);

  return (
    <I18nProvider language={currentLanguage} onLanguageChange={(l) => db.setLanguage(l)}>
      <div
        className={`h-screen w-full flex flex-col lg:flex-row overflow-hidden transition-colors duration-200 ${
          isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tabId) => setActiveTab(tabId)}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentLanguage={currentLanguage}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onOpenManualModal={() => setIsSystemManualOpen(true)}
          onOpenPromoModal={() => setIsMgPromoModalOpen(true)}
          hasUpdate={!!availableUpdate}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Header Bar - Professional, Focused & Clean */}
          <header
            className={`h-14 border-b px-3 sm:px-5 lg:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs gap-2 sm:gap-3 transition-colors ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            {/* Left Side: Sidebar Toggle + Office & Auditor Title */}
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer border shrink-0 ${
                  isDark
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                }`}
                title={!isRtl ? 'Toggle Sidebar Navigation' : 'إظهار / إخفاء القائمة الجانبية'}
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Auditor & Office Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 border shrink-0 ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-200'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    CPA
                  </span>
                </div>

                <div className="hidden sm:block min-w-0">
                  <h1 className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {!isRtl ? 'Auditor / ' : 'أ/ '}{state.officeProfile.auditorName}
                  </h1>
                  <span className="text-[9.5px] text-slate-400 block truncate font-medium">
                    محاسب قانوني وخبير ضرائب
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Clean Direct Navigation Tabs & Quick Calculators */}
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1 min-w-0 mx-2">
              {[
                { id: 'JOURNAL_ENTRIES', label: 'قيود اليومية', icon: Layers },
                { id: 'CHART_OF_ACCOUNTS', label: 'دليل الحسابات', icon: FolderTree },
                { id: 'FINANCIAL_STATEMENTS', label: 'القوائم المالية والميزان (EAS)', icon: FileSpreadsheet },
                { id: 'MULTI_TENANT_WORKSPACES', label: 'بيئات الشركات والمصانع', icon: Factory },
                { id: 'TAX_TRACKER', label: 'الفحص والضرائب', icon: Percent },
                { id: 'CLIENTS_ARCHIVE', label: 'الشركات والعملاء', icon: Building },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      try {
                        localStorage.setItem('mg_active_tab', tab.id);
                      } catch {}
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : isDark
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/80'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* Quick Accountant Calculators Drawer Trigger */}
              <button
                onClick={() => setIsQuickToolsDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isQuickToolsDrawerOpen
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : isDark
                    ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border-amber-800/80'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300/80 shadow-2xs'
                }`}
                title="حاسبات فورية: كسب العمل والتأمينات، الإهلاك الضريبي (قانون 91)، القيمة المضافة العكسية مع ترحيل آلي"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>حاسبات فورية</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold font-mono">
                  ⚡ قيد آلي
                </span>
              </button>
            </nav>

            {/* Right Side: Clean Control Suite */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Active Client Context Pill - Clickable to open workspaces manager */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('MULTI_TENANT_WORKSPACES');
                  try {
                    localStorage.setItem('mg_active_tab', 'MULTI_TENANT_WORKSPACES');
                  } catch {}
                }}
                title="اضغط للتنقل السريع بين بيئات عمل الشركات والمصانع (Multi-Tenant Hub)"
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold shrink-0 cursor-pointer transition-all hover:scale-102 ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[130px]">
                  {state.activeClientContext?.companyName || 'الشركة الحالية'}
                </span>
                <Factory className="w-3 h-3 text-amber-500 shrink-0" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle
                themeMode={themeMode}
                onThemeChange={handleThemeChange}
                brandColor={brandColor}
                onBrandColorChange={handleBrandColorChange}
              />

              {/* Consolidated Tools & Options Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                  id="btn-app-tools-dropdown"
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isToolsMenuOpen
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={!isRtl ? 'System Tools & Quick Options' : 'أدوات المنظومة والخيارات السريعة'}
                >
                  <Settings className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline text-xs">{!isRtl ? 'Tools' : 'الأدوات'}</span>
                </button>

                {isToolsMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsToolsMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-40 p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800">
                      <div className="py-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsSettingsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-blue-500" />
                          <span>{!isRtl ? 'Settings & Office Profile' : 'إعدادات المنظومة والمكتب'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsSystemManualOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          <span>{!isRtl ? 'Comprehensive System Manual (PDF)' : 'دليل المستخدم الشامل (PDF)'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsBackupModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-emerald-500" />
                          <span>{!isRtl ? 'Backup & Data Export' : 'النسخ الاحتياطي وتصدير البيانات'}</span>
                        </button>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            toggleFocusMode();
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Maximize2 className="w-4 h-4 text-slate-500" />
                            <span>{!isRtl ? 'Wide Focus Mode' : 'وضع التركيز العريض'}</span>
                          </div>
                          {isFocusMode && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                              {!isRtl ? 'Active' : 'مفعّل'}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsShortcutsModalOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Keyboard className="w-4 h-4 text-slate-500" />
                            <span>{!isRtl ? 'Keyboard Shortcuts' : 'اختصارات المفاتيح'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                            Ctrl+K
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsDesktopModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <Laptop className="w-4 h-4 text-emerald-500" />
                          <span>{!isRtl ? 'Desktop Edition App' : 'نسخة سطح المكتب (Desktop)'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsMgPromoModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <Play className="w-4 h-4 text-amber-500" />
                          <span>{!isRtl ? 'MG Office Identity & Promo' : 'برومو وهوية المكتب MG'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setVerificationData({
                              docNumber: `AUD-DOC-${selectedFiscalYear}-${Date.now().toString().slice(-4)}`,
                              docType: 'FINANCIAL_REPORT',
                              clientName: state.activeClientContext?.companyName || 'شركة مساهمة مصرية',
                              auditorName: state.officeProfile?.auditorName || 'محاسب قانوني معتمد',
                              licenseNo: state.officeProfile?.licenseNumber || '998877',
                              amount: 0,
                              date: new Date().toISOString().slice(0, 10),
                            });
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer"
                        >
                          <QrCode className="w-4 h-4 text-emerald-500" />
                          <span>{!isRtl ? 'Digital Verification & QR Seal' : 'بوابة التوثيق والتحقق الرقمي (QR)'}</span>
                        </button>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsPinModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-right cursor-pointer font-semibold"
                        >
                          <Lock className="w-4 h-4 text-amber-500" />
                          <span>{!isRtl ? 'Lock Screen / PIN Code' : 'قفل الشاشة / تغيير الرمز PIN'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Profile & Role Switcher */}
              <button
                onClick={() => setIsUserManagerOpen(true)}
                id="btn-open-user-management"
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
                title={!isRtl ? 'User Roles & Access Control' : 'إدارة الموظفين وصلاحيات الوصول'}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
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
                <span className={`hidden xl:inline text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            </div>
          </header>

        {/* Scrollable Main Content Container */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 pb-24 md:pb-6 transition-colors min-w-0 ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
          }`}
        >
          <div
            className={`w-full transition-all duration-200 ${
              isFocusMode ? 'max-w-full px-1 sm:px-2' : 'max-w-7xl mx-auto'
            } space-y-5 sm:space-y-6 min-w-0`}
          >
            <Suspense fallback={<HubLoadingFallback />}>
              {renderActiveView()}
            </Suspense>
          </div>
        </main>

        {/* Mobile Quick Return Floating Badge when viewing Desktop mode on mobile screens */}
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-30 flex justify-center pointer-events-none">
          <button
            onClick={handleSwitchToMobileMode}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xl border border-emerald-400/40 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-3"
          >
            <Smartphone className="w-4 h-4" />
            <span>التبديل إلى وضع الهاتف الميداني 📱</span>
          </button>
        </div>

        {/* Mobile Fixed Bottom Navigation Bar (أقل من 768px: شريط تنقل سفلي ثابت بـ 5 أزرار) */}
        <MobileBottomNavigation
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenMore={() => setIsMobileMoreSheetOpen(true)}
        />

        {/* Mobile 'More' Sheet Modal (ورقة بباقي الأقسام حسب الصلاحيات) */}
        {isMobileMoreSheetOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
            onClick={() => setIsMobileMoreSheetOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-600" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">أقسام وموديولات النظام المتاحة</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMoreSheetOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sections list grouped and filtered by isTabAccessible */}
              <div className="space-y-4">
                {[
                  {
                    category: 'الحسابات والقوائم المالية المعتمدة',
                    items: [
                      { id: 'CHART_OF_ACCOUNTS', label: 'دليل الحسابات الشامل' },
                      { id: 'GENERAL_LEDGER', label: 'دفتر الأستاذ العام' },
                      { id: 'TRIAL_BALANCE', label: 'ميزان المراجعة' },
                      { id: 'FINANCIAL_STATEMENTS', label: 'القوائم المالية (EAS)' },
                      { id: 'FIXED_ASSETS', label: 'الأصول الثابتة والإهلاك' },
                    ],
                  },
                  {
                    category: 'الضرائب والفحص والامتثال',
                    items: [
                      { id: 'TAX_PENALTY_SIMULATOR', label: 'الفحص وغرامات الضرائب' },
                      { id: 'ETA_RECONCILIATION', label: 'مطابقة الفاتورة الإلكترونية ETA' },
                      { id: 'AUDIT_WORKING_PAPERS', label: 'أوراق عمل المراجعة' },
                      { id: 'TAX_EXPOSURE_SIMULATOR', label: 'كشف ومخاطر الفحص' },
                      { id: 'PAYROLL_INSURANCE', label: 'كسب العمل والتأمينات' },
                    ],
                  },
                  {
                    category: 'إدارة المكتب والخدمات المهنية',
                    items: [
                      { id: 'OFFICE_TREASURY', label: 'خزنة ونقدية المكتب' },
                      { id: 'INVOICING', label: 'فواتير الأتعاب والمبيعات' },
                      { id: 'CERTIFICATES', label: 'الشهادات والاعتمادات الرسمية' },
                      { id: 'FEASIBILITY_STUDY', label: 'دراسات الجدوى' },
                      { id: 'CREDIT_SIMULATOR', label: 'محاكي الائتمان والملاءة' },
                      { id: 'CUSTOMS_HUB', label: 'الجمارك وسلاسل الإمداد' },
                      { id: 'AUDIT_TRAIL', label: 'سجل العمليات والرقابة' },
                      { id: 'MULTI_TENANT_WORKSPACES', label: 'بيئات عمل الشركات' },
                    ],
                  },
                ].map((group, gIdx) => {
                  const accessibleItems = group.items.filter((item) => isTabAccessible(item.id));
                  if (accessibleItems.length === 0) return null;
                  return (
                    <div key={gIdx} className="space-y-1.5">
                      <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 block px-1">
                        {group.category}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {accessibleItems.map((item) => {
                          const isCurrent = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMoreSheetOpen(false);
                              }}
                              className={`min-h-[44px] px-3 py-2 text-right text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Status / Footer info */}
        <footer
          className={`border-t px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              قاعدة البيانات المحلية مشفرة وآمنة
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">المعايير: EAS 2026 المحدثة</span>
            <span>•</span>
            <span>الإصدار: v{CURRENT_APP_VERSION}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span>المستخدم: <strong className="text-slate-700 dark:text-slate-200">{currentUser.name}</strong></span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden md:inline">{state.officeProfile.firmName}</span>
          </div>
        </footer>
      </div>

      {renderCommonModals()}
    </div>
    </I18nProvider>
  );
}
