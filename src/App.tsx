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
} from 'lucide-react';

// Primary views and hubs loaded statically for instant tab switching and zero dynamic fetch failures
import AccountingHubView from './components/hubs/AccountingHubView';
import FinancialReportingHubView from './components/hubs/FinancialReportingHubView';
import TaxAuditHubView from './components/hubs/TaxAuditHubView';
import OfficePracticeHubView from './components/hubs/OfficePracticeHubView';
import SecurityAuditHubView from './components/hubs/SecurityAuditHubView';
import InvoicingView from './components/InvoicingView';
import CustomsHubView from './components/CustomsHubView';
import SapErpHubView from './components/sap/SapErpHubView';
import MobileFieldCompanionView from './components/mobile/MobileFieldCompanionView';

// All modals are imported statically to ensure 100% reliable opening without network chunk fetch failures in iframe
import PinAuthModal from './components/PinAuthModal';
import { GlobalCommandPalette } from './components/common/GlobalCommandPalette';
import { MgOfficePromoModal } from './components/common/MgOfficePromoModal';
import { BackupExportModal } from './components/BackupExportModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { UpdateNotificationModal } from './components/UpdateNotificationModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { UserManagementModal } from './components/UserManagementModal';
import { DeviceLockModal } from './components/DeviceLockModal';
import { PurgeDatabaseModal } from './components/PurgeDatabaseModal';
import { DocumentVerificationModal } from './components/common/DocumentVerificationModal';
import { SystemManualModal } from './components/common/SystemManualModal';
import { LogoInspectionModal } from './components/common/LogoInspectionModal';
import { AppSettingsModal } from './components/AppSettingsModal';

import { LanguageToggle } from './components/LanguageToggle';
import { CloudSyncHeaderWidget } from './components/CloudSyncHeaderWidget';
import { HeaderNavigationDropdown } from './components/common/HeaderNavigationDropdown';
import { I18nProvider, getTranslation } from './utils/i18n';
import { parseVerificationFromUrl, VerificationPayloadData } from './utils/qrCodeGenerator';

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
      if (saved === 'desktop') return 'DASHBOARD';
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return 'MOBILE_COMPANION';
      }
    } catch {
      // Fallback
    }
    return 'DASHBOARD';
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

  const handleSwitchToDesktopMode = (targetTab: string = 'DASHBOARD') => {
    setViewMode('DESKTOP');
    try {
      localStorage.setItem('mg_app_view_mode', 'desktop');
    } catch {
      // Safe fallback
    }
    setActiveTab(targetTab === 'MOBILE_COMPANION' ? 'DASHBOARD' : targetTab);
  };

  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2026);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    return true;
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isSystemManualOpen, setIsSystemManualOpen] = useState<boolean>(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(true);
  const [allowPinCancel, setAllowPinCancel] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isDeviceEnforcedLocked, setIsDeviceEnforcedLocked] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [unlockedTabs, setUnlockedTabs] = useState<string[]>([]);
  const [verificationData, setVerificationData] = useState<VerificationPayloadData | null>(null);
  const [isMgPromoModalOpen, setIsMgPromoModalOpen] = useState<boolean>(false);
  const [isLogoInspectionModalOpen, setIsLogoInspectionModalOpen] = useState<boolean>(true);

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
      case 'BANK_RECONCILIATION':
        return <AccountingHubView state={state} initialSubTab="BANK_RECONCILIATION" fiscalYear={selectedFiscalYear} />;
      case 'OCR_INVOICE_SCANNER':
        return <AccountingHubView state={state} initialSubTab="OCR_INVOICE_SCANNER" fiscalYear={selectedFiscalYear} />;
      case 'CURRENCY_EXCHANGE_RATES':
        return <AccountingHubView state={state} initialSubTab="CURRENCY_EXCHANGE_RATES" fiscalYear={selectedFiscalYear} />;

      // 2. Financial Reporting Hub (القوائم والتقارير المالية)
      case 'FINANCIAL_REPORTING_HUB':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_STATEMENTS" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_STATEMENTS':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_STATEMENTS" fiscalYear={selectedFiscalYear} />;
      case 'BUDGET_PLANNER':
        return <FinancialReportingHubView state={state} initialSubTab="BUDGET_PLANNER" fiscalYear={selectedFiscalYear} />;
      case 'CASH_FLOW_PREDICTOR':
        return <FinancialReportingHubView state={state} initialSubTab="CASH_FLOW_PREDICTOR" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_NOTES':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_NOTES" fiscalYear={selectedFiscalYear} />;
      case 'AUDITOR_REPORT':
        return <FinancialReportingHubView state={state} initialSubTab="AUDITOR_REPORT" fiscalYear={selectedFiscalYear} />;
      case 'FINANCIAL_SIMULATOR':
        return <FinancialReportingHubView state={state} initialSubTab="FINANCIAL_SIMULATOR" fiscalYear={selectedFiscalYear} />;
      case 'CREDIT_SIMULATOR':
        return <FinancialReportingHubView state={state} initialSubTab="CREDIT_SIMULATOR" fiscalYear={selectedFiscalYear} />;

      // 3. Tax & Audit Hub (الضرائب والمراجعة والامتثال)
      case 'TAX_AUDIT_HUB':
        return <TaxAuditHubView state={state} initialSubTab="EXCEL_AUDIT_SENTINEL" />;
      case 'EXCEL_AUDIT_SENTINEL':
        return <TaxAuditHubView state={state} initialSubTab="EXCEL_AUDIT_SENTINEL" />;
      case 'TAX_TRACKER':
        return <TaxAuditHubView state={state} initialSubTab="TAX_TRACKER" />;
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
        return <OfficePracticeHubView state={state} initialSubTab="CLIENTS_ARCHIVE" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'CLIENTS_ARCHIVE':
        return <OfficePracticeHubView state={state} initialSubTab="CLIENTS_ARCHIVE" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'PRACTICE_MANAGEMENT':
        return <OfficePracticeHubView state={state} initialSubTab="PRACTICE_MANAGEMENT" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'WHATSAPP_BOT':
        return <OfficePracticeHubView state={state} initialSubTab="WHATSAPP_BOT" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'OFFICE_TREASURY':
        return <OfficePracticeHubView state={state} initialSubTab="OFFICE_TREASURY" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'CERTIFICATES':
        return <OfficePracticeHubView state={state} initialSubTab="CERTIFICATES" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;
      case 'FEASIBILITY_STUDY':
        return <OfficePracticeHubView state={state} initialSubTab="FEASIBILITY_STUDY" onOpenPromoModal={() => setIsMgPromoModalOpen(true)} />;

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
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
        onOpenPromoModal={() => setIsMgPromoModalOpen(true)}
      />
    </Suspense>
  );

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
          {/* Top Update Alert Banner (if update available) */}
          {updateBannerVisible && availableUpdate && (
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-emerald-700/50 shrink-0 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0">
                  NEW
                </div>
                <span className="font-semibold text-white truncate text-[11px] sm:text-xs">
                  {!isRtl ? 'New System Update Available:' : 'يوجد تحديث وإصدار جديد متاح للمنظومة:'}
                </span>
                <span className="font-mono font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-700 text-[10px] sm:text-xs shrink-0">
                  v{availableUpdate.version}
                </span>
                <span className="hidden md:inline text-slate-200 text-[11px] truncate">
                  ({availableUpdate.changelog.title})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 mr-2">
                <button
                  onClick={() => setIsUpdateModalOpen(true)}
                  id="banner-btn-view-update"
                  className="px-2.5 sm:px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>{!isRtl ? 'Install Update' : 'تثبيت التحديث'}</span>
                </button>
                <button
                  onClick={() => setUpdateBannerVisible(false)}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                  title={!isRtl ? 'Close' : 'إغلاق التنبيه'}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Top Header Bar - Clean, Minimalist & Focused with Navigation Dropdown */}
          <header
            className={`h-14 border-b px-3 sm:px-5 lg:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs gap-2 sm:gap-3 transition-colors ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            {/* Left Side: Sidebar Toggle + Office & Auditor Badge */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
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

              {/* Authority / Auditor Profile Snippet */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`px-2 py-0.5 rounded-md hidden sm:flex items-center gap-1.5 border shrink-0 ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    EAS
                  </span>
                </div>

                <div className="hidden md:block min-w-0">
                  <h1 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {!isRtl ? 'Auditor / ' : 'أ/ '}{state.officeProfile.auditorName}
                  </h1>
                </div>

                {/* Instant 1-Click MG Promo & Brand Badge */}
                <button
                  onClick={() => setIsMgPromoModalOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 hover:border-amber-400 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shrink-0 text-xs font-bold shadow-2xs"
                  title={!isRtl ? 'View MG Office Cinematic Promo' : 'عرض البرومو السينمائي والهوية الرسمية لمكتب MG'}
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-900 to-slate-950 border border-amber-400/80 flex items-center justify-center text-[10px] font-serif font-black text-amber-300 shrink-0">
                    MG
                  </div>
                  <span className="hidden xl:inline text-[11px] text-amber-300">
                    {!isRtl ? 'Promo' : 'برومو المكتب'}
                  </span>
                </button>

                {/* Instant Inspection of Isolated Logo & Seal */}
                <button
                  onClick={() => setIsLogoInspectionModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-400 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shrink-0 text-xs font-bold shadow-2xs"
                  title="معاينة تجربة تفريغ الشعار والختم الرسمي (أ/ محمد جميل مرعي)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline text-[11px] text-amber-200">
                    معاينة تفريغ الشعار والختم
                  </span>
                  <span className="sm:hidden text-[10px] text-amber-200">
                    تفريغ الشعار
                  </span>
                </button>
              </div>
            </div>

            {/* Center: Quick Screen Navigation Dropdown & Global Search Bar */}
            <div className="flex items-center gap-2 flex-1 max-w-xl mx-1 sm:mx-2 min-w-0">
              {/* Screen Dropdown Switcher (Simplifies UI) */}
              <HeaderNavigationDropdown
                activeTab={activeTab as NavigationTab}
                onSelectTab={(tab) => setActiveTab(tab)}
              />

              {/* Expansive Global Search Bar */}
              <div className="flex-1 min-w-0">
                <GlobalSearchBar
                  state={state}
                  onNavigate={(tab) => {
                    setActiveTab(tab);
                  }}
                />
              </div>
            </div>

            {/* Right Side: Clean Control Suite */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Device View Mode Switcher: Desktop vs Mobile Field */}
              <button
                onClick={handleSwitchToMobileMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 shadow-2xs active:scale-95"
                title={!isRtl ? 'Switch to Mobile Field Mode' : 'التبديل إلى وضع الهاتف الميداني (سداد وإجراءات)'}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{!isRtl ? 'Mobile Field Mode' : 'وضع الهاتف الميداني'}</span>
                <span className="md:hidden text-[11px]">ميداني 📱</span>
              </button>

              {/* CPA Office Practice Badge: Replaces global company/year selector with office multi-client identity */}
              <div
                className={`hidden xl:flex items-center gap-2 px-3 py-1.5 border rounded-xl shrink-0 transition-colors shadow-2xs ${
                  isDark ? 'bg-slate-800/80 border-slate-700/70' : 'bg-slate-50 border-slate-200'
                }`}
                title={!isRtl ? 'CPA Practice Office Suite • Auditing Multiple Client Companies' : 'منظومة مكتب المحاسب القانوني • مراجعة وتدقيق حسابات الشركات المتعددة'}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                      {!isRtl ? 'CPA Audit Practice' : 'مكتب المحاسبة والمراجعة'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title={!isRtl ? 'Active Firm Suite' : 'منظومة مهنية نشطة'}></span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {!isRtl ? `${state.clients.length} Registered Clients` : `مراجعة ${state.clients.length} شركة ومنشأة`}
                  </span>
                </div>
              </div>

              {/* Theme & Brand Color Dropdown */}
              <ThemeToggle
                themeMode={themeMode}
                onThemeChange={handleThemeChange}
                brandColor={brandColor}
                onBrandColorChange={handleBrandColorChange}
              />

              {/* Cloud Real-Time Sync Indicator & Quick Controls */}
              <CloudSyncHeaderWidget isDark={isDark} />

              {/* Language Switcher */}
              <LanguageToggle
                currentLanguage={currentLanguage}
                onLanguageChange={(lang) => db.setLanguage(lang)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
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

          {/* ========================================================================= */}
          {/* THE 3 CORE PRIMARY INTERFACES RIBBON (شريط الواجهات الرئيسية الثلاث)       */}
          {/* ========================================================================= */}
          <div
            id="app-core-three-hubs-bar"
            className={`px-3 sm:px-5 lg:px-6 py-2 border-b flex items-center justify-between gap-2 sm:gap-3 shrink-0 transition-colors z-20 ${
              isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-xs' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 min-w-0">
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-400 pl-1 shrink-0">
                <span>{!isRtl ? 'Core Interfaces:' : 'الواجهات الرئيسية:'}</span>
              </div>

              {/* Hub 1: Accounting & Journals */}
              <button
                onClick={() => setActiveTab('ACCOUNTING_HUB')}
                id="top-nav-accounting-hub"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  currentParentHub === 'ACCOUNTING_HUB'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/80'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                }`}
                title={!isRtl ? 'Accounting & Journal Entries Core' : 'الحسابات ودفاتر اليومية والدورة المحاسبية العامة'}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-black ${
                  currentParentHub === 'ACCOUNTING_HUB' ? 'bg-black/25 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  1
                </span>
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>{!isRtl ? 'General Ledger & Journals' : 'الحسابات وقيود اليومية'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  currentParentHub === 'ACCOUNTING_HUB'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {state.journalEntries.length}
                </span>
              </button>

              {/* Hub 2: Financial Reporting */}
              <button
                onClick={() => setActiveTab('FINANCIAL_REPORTING_HUB')}
                id="top-nav-financial-hub"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  currentParentHub === 'FINANCIAL_REPORTING_HUB'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/80'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                }`}
                title={!isRtl ? 'Financial Statements & EAS Compliance' : 'القوائم والتقارير المالية المعتمدة (EAS 1)'}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-black ${
                  currentParentHub === 'FINANCIAL_REPORTING_HUB' ? 'bg-black/25 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  2
                </span>
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span>{!isRtl ? 'Financial Statements & Reports' : 'القوائم والتقارير المالية'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  currentParentHub === 'FINANCIAL_REPORTING_HUB'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}>
                  EAS 1
                </span>
              </button>

              {/* Hub 3: Tax & Audit Hub */}
              <button
                onClick={() => setActiveTab('TAX_AUDIT_HUB')}
                id="top-nav-tax-audit-hub"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  currentParentHub === 'TAX_AUDIT_HUB'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/80'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                }`}
                title={!isRtl ? 'Tax Declarations & ESA Audit Sentinel' : 'الفحص الضريبي والمراجعة والامتثال المهني'}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-black ${
                  currentParentHub === 'TAX_AUDIT_HUB' ? 'bg-black/25 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}>
                  3
                </span>
                <Percent className="w-3.5 h-3.5 shrink-0" />
                <span>{!isRtl ? 'Tax & Audit Sentinel' : 'الفحص الضريبي والمراجعة'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  currentParentHub === 'TAX_AUDIT_HUB'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                }`}>
                  XAI
                </span>
              </button>
            </div>

            {/* Quick Hub State / Client Context Pill */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                isDark ? 'bg-slate-800/70 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="truncate max-w-[160px] font-bold">
                  {state.activeClientContext?.companyName || 'الشركة الحالية'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {state.activeClientContext?.selectedFiscalYear || selectedFiscalYear}
                </span>
              </div>
            </div>
          </div>

        {/* Scrollable Main Content Container */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 transition-colors min-w-0 ${
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
        <div className="md:hidden fixed bottom-14 left-4 right-4 z-40 flex justify-center pointer-events-none">
          <button
            onClick={handleSwitchToMobileMode}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xl border border-emerald-400/40 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-3"
          >
            <Smartphone className="w-4 h-4" />
            <span>التبديل إلى وضع الهاتف الميداني 📱</span>
          </button>
        </div>

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
