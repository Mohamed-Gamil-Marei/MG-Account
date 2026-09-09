import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  PlusCircle,
  Clock,
  ShieldCheck,
  Building,
  Phone,
  Printer,
  Sparkles,
  Laptop,
  Users,
  Shield,
  Keyboard,
  Search,
  Settings,
  Globe,
  Lock,
  Globe2,
  BookOpen,
  Smartphone,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { cloudSync, SyncStatus } from '../lib/cloudSync';
import { OfficeProfile, NavigationTab, SystemUser, AppLanguage } from '../types';
import { GlobalSearchBar } from './GlobalSearchBar';
import { UserManagementModal } from './UserManagementModal';
import { AppSettingsModal } from './AppSettingsModal';
import { SystemManualModal } from './common/SystemManualModal';
import { SmartNotificationCenter } from './SmartNotificationCenter';
import { HeaderSystemDropdown } from './common/HeaderSystemDropdown';
import { HeaderNavigationDropdown } from './common/HeaderNavigationDropdown';
import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '../utils/i18n';

interface HeaderProps {
  onOpenQuickJournal: () => void;
  onOpenQuickTreasury: () => void;
  onOpenBackupModal: () => void;
  onOpenDesktopModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenPinAuthModal?: () => void;
  onSelectTab: (tabId: NavigationTab) => void;
  activeTab: NavigationTab;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickJournal,
  onOpenQuickTreasury,
  onOpenBackupModal,
  onOpenDesktopModal,
  onOpenShortcutsModal,
  onOpenPinAuthModal,
  onSelectTab,
  activeTab,
}) => {
  const { language, isAr, isEn, t, setLanguage } = useI18n();
  const [profile, setProfile] = useState<OfficeProfile>(db.getState().officeProfile);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<SystemUser>(db.getCurrentUser());
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync.getStatus());
  const [dbState, setDbState] = useState(db.getState());

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getState().officeProfile);
      setCurrentUser(db.getCurrentUser());
      setDbState(db.getState());
    });
    const unsubSync = cloudSync.subscribe((status) => {
      setSyncStatus(status);
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      unsub();
      unsubSync();
      clearInterval(timer);
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
      {/* Top Professional Authority Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Auditor & Office Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-inner border border-emerald-400/30 text-white font-bold text-sm sm:text-base shrink-0">
            <span>{isAr ? 'م.م' : 'CPA'}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1">
                <span>{isEn ? (profile.firmNameEnglish || profile.firmName) : profile.firmName}</span>
                <span className="text-emerald-400">/ {profile.auditorName}</span>
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {profile.licenseNumber}
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Phone className="w-3 h-3 text-blue-300" />
                {profile.phone || '01003335360'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <span>{isEn ? 'Certified Public Accountant & Statutory Auditor' : profile.title}</span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline text-slate-400 font-medium">
                {t.standardsBadge}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Global Screen Dropdown & Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xl mx-1 sm:mx-2 min-w-[200px]">
          {/* Quick Screen Navigation Dropdown */}
          <HeaderNavigationDropdown
            activeTab={activeTab}
            onSelectTab={onSelectTab}
          />

          {/* Global Search Bar */}
          <div className="flex-1 min-w-0">
            <GlobalSearchBar state={dbState} onNavigate={onSelectTab} />
          </div>
        </div>

        {/* System Actions, Language Toggle, RBAC User, & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Language Toggle Switcher */}
          <LanguageToggle
            currentLanguage={language}
            onLanguageChange={(l) => {
              setLanguage(l);
              db.setLanguage(l);
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Cloud Sync Pulse Indicator */}
          <button
            onClick={() => setIsUserManagerOpen(true)}
            id="cloud-sync-status-indicator"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
            title={isEn ? 'Realtime Cloud Sync active across office workstations' : 'حالة المزامنة السحابية اللحظية مع أجهزة المكتب'}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Globe2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.cloudSync}</span>
          </button>

          {/* User Profile & Role Switcher */}
          <button
            onClick={() => setIsUserManagerOpen(true)}
            id="btn-user-manager"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title={isEn ? 'User RBAC, Roles & Hardware Binding' : 'إدارة الموظفين وصلاحيات الوصول وتزامن الأجهزة'}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentUser.role === 'ADMIN'
                  ? 'bg-amber-400 text-slate-900 font-black'
                  : currentUser.role === 'AUDITOR'
                  ? 'bg-blue-400 text-slate-900 font-bold'
                  : 'bg-slate-200 text-slate-900'
              }`}
            >
              {currentUser.name.slice(0, 1)}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <span className="block text-xs text-slate-100 max-w-[80px] sm:max-w-none truncate">
                {currentUser.name}
              </span>
              <span className="block text-[9px] text-emerald-400 font-mono">
                {isEn ? currentUser.role : currentUser.roleTitleArabic.split('(')[0]}
              </span>
            </div>
          </button>

          {/* Smart Notification Center */}
          <SmartNotificationCenter
            state={dbState}
            onNavigate={onSelectTab}
          />

          {/* Mobile Field Companion Switcher */}
          <button
            onClick={() => onSelectTab && onSelectTab('MOBILE_COMPANION')}
            id="btn-mobile-companion-switch"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
            title={isEn ? 'Switch to Mobile Field Companion (Optimized for phones & field work)' : 'التبديل إلى المساعد الميداني للهاتف (سداد، تحصيل، إثبات إجراءات)'}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEn ? 'Mobile Field' : 'وضع الهاتف'}</span>
            <span className="hidden xl:inline-block px-1 rounded-full bg-white/20 text-[10px] font-mono">⚡</span>
          </button>

          {/* Quick Action Button: New Journal Entry */}
          <button
            onClick={onOpenQuickJournal}
            id="btn-quick-journal-entry"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title={t.addJournalEntry}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.addJournalEntry}</span>
          </button>

          {/* Treasury Action Button */}
          {currentUser.canAccessTreasury && (
            <button
              onClick={onOpenQuickTreasury}
              id="btn-quick-treasury-entry"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Treasury & Fee Receipt' : 'سند قبض أتعاب أو صرف خزنة المكتب'}
            >
              <Building className="w-3.5 h-3.5" />
              <span>{isEn ? 'Treasury' : 'سند الخزنة'}</span>
            </button>
          )}

          {/* Unified System Tools & Settings Dropdown */}
          <HeaderSystemDropdown
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenBackup={onOpenBackupModal}
            onOpenDesktop={onOpenDesktopModal}
            onOpenShortcuts={onOpenShortcutsModal}
            onOpenPinAuth={onOpenPinAuthModal}
          />
        </div>
      </div>

      {/* User Management & Cloud Sync Modal */}
      <UserManagementModal
        isOpen={isUserManagerOpen}
        onClose={() => setIsUserManagerOpen(false)}
      />

      {/* App Settings & Language Modal */}
      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={dbState}
      />

      {/* Complete Illustrated System Manual PDF Modal */}
      <SystemManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </header>
  );
};
