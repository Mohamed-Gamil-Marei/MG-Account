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
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { OfficeProfile, NavigationTab, SystemUser } from '../types';
import { GlobalSearchBar } from './GlobalSearchBar';
import { UserManagerModal } from './UserManagerModal';

interface HeaderProps {
  onOpenQuickJournal: () => void;
  onOpenQuickTreasury: () => void;
  onOpenBackupModal: () => void;
  onOpenDesktopModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onSelectTab: (tabId: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickJournal,
  onOpenQuickTreasury,
  onOpenBackupModal,
  onOpenDesktopModal,
  onOpenShortcutsModal,
  onSelectTab,
}) => {
  const [profile, setProfile] = useState<OfficeProfile>(db.getState().officeProfile);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<SystemUser>(db.getCurrentUser());
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);
  const [dbState, setDbState] = useState(db.getState());

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getState().officeProfile);
      setCurrentUser(db.getCurrentUser());
      setDbState(db.getState());
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
      {/* Top Professional Authority Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Auditor & Office Branding */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-inner border border-emerald-400/30 text-white font-bold text-lg">
            <span>م.م</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{profile.firmName}</span>
                <span className="text-emerald-400">/ {profile.auditorName}</span>
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {profile.licenseNumber}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Phone className="w-3 h-3 text-blue-300" />
                {profile.phone || '01003335360'}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span>{profile.title}</span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline text-slate-400">المعايير المحاسبية المصرية (EAS)</span>
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <GlobalSearchBar state={dbState} onNavigate={onSelectTab} />
        </div>

        {/* System Actions, RBAC User, & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* User Profile & Role Switcher */}
          <button
            onClick={() => setIsUserManagerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="إدارة المستخدمين وصلاحيات الوصول (RBAC)"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentUser.role === 'ADMIN' ? 'bg-amber-400 text-slate-900 font-black' : currentUser.role === 'AUDITOR' ? 'bg-blue-400 text-slate-900 font-bold' : 'bg-slate-200 text-slate-900'
            }`}>
              {currentUser.name.slice(0, 1)}
            </div>
            <div className="text-right">
              <span className="block text-xs text-slate-100">{currentUser.name}</span>
              <span className="block text-[9px] text-emerald-400 font-mono">{currentUser.roleTitleArabic}</span>
            </div>
          </button>

          {/* Shortcuts hint button */}
          {onOpenShortcutsModal && (
            <button
              onClick={onOpenShortcutsModal}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 cursor-pointer"
              title="لوحة اختصارات لوحة المفاتيح (Ctrl + K)"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-[10px] font-bold">Ctrl+K</span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenQuickJournal}
            id="btn-quick-journal-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="تسجيل قيد يومية جديد"
          >
            <PlusCircle className="w-4 h-4" />
            <span>قيد يومية</span>
          </button>

          {currentUser.canAccessTreasury && (
            <button
              onClick={onOpenQuickTreasury}
              id="btn-quick-treasury-entry"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              title="سند قبض أتعاب أو صرف خزنة المكتب"
            >
              <Building className="w-4 h-4" />
              <span>سند الخزنة</span>
            </button>
          )}

          {onOpenDesktopModal && (
            <button
              onClick={onOpenDesktopModal}
              id="header-btn-desktop-modal"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
              title="تحميل وتثبيت المنظومة لتعمل على سطح المكتب"
            >
              <Laptop className="w-4 h-4 text-emerald-200" />
              <span>للسطح المكتب</span>
            </button>
          )}

          <button
            onClick={onOpenBackupModal}
            id="btn-backup-export-modal"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="استيراد وتصدير جميع النماذج بجميع الصيغ"
          >
            <Download className="w-4 h-4 text-white" />
            <span>استيراد وتصدير</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('هل تريد إعادة تحميل البيانات المحاسبية النموذجية للمكتب؟')) {
                db.resetToDemoData();
              }
            }}
            id="btn-reset-demo-data"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg text-xs border border-slate-700/50 transition-all cursor-pointer"
            title="استرجاع البيانات التجريبية الشاملة"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بيانات نموذجية</span>
          </button>
        </div>
      </div>

      {/* User Manager Modal */}
      <UserManagerModal
        isOpen={isUserManagerOpen}
        onClose={() => setIsUserManagerOpen(false)}
        state={dbState}
      />
    </header>
  );
};

