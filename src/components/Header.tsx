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
  Printer,
  Sparkles,
  Laptop,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { OfficeProfile } from '../types';

interface HeaderProps {
  onOpenQuickJournal: () => void;
  onOpenQuickTreasury: () => void;
  onOpenBackupModal: () => void;
  onOpenDesktopModal?: () => void;
  onSelectTab: (tabId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickJournal,
  onOpenQuickTreasury,
  onOpenBackupModal,
  onOpenDesktopModal,
  onSelectTab,
}) => {
  const [profile, setProfile] = useState<OfficeProfile>(db.getState().officeProfile);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getState().officeProfile);
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
  const dateString = currentTime.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span>{profile.title}</span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline text-slate-400">المعايير المحاسبية المصرية (EAS)</span>
            </p>
          </div>
        </div>

        {/* System Actions & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Realtime Local DB indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>قاعدة البيانات المحلية (متصلة وآمنة)</span>
            <span className="text-slate-500">|</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-200">{timeString}</span>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenQuickJournal}
            id="btn-quick-journal-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="تسجيل قيد يومية جديد"
          >
            <PlusCircle className="w-4 h-4" />
            <span>قيد يومية جديد</span>
          </button>

          <button
            onClick={onOpenQuickTreasury}
            id="btn-quick-treasury-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="سند قبض أتعاب أو صرف خزنة المكتب"
          >
            <Building className="w-4 h-4" />
            <span>سند خزنة المكتب</span>
          </button>

          {onOpenDesktopModal && (
            <button
              onClick={onOpenDesktopModal}
              id="header-btn-desktop-modal"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
              title="تحميل وتثبيت المنظومة لتعمل على سطح المكتب"
            >
              <Laptop className="w-4 h-4 text-emerald-200" />
              <span>تحميل لسطح المكتب</span>
            </button>
          )}

          <button
            onClick={onOpenBackupModal}
            id="btn-backup-export-modal"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="استيراد وتصدير جميع النماذج بجميع الصيغ"
          >
            <Download className="w-4 h-4 text-white" />
            <span>استيراد وتصدير النماذج</span>
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
    </header>
  );
};
