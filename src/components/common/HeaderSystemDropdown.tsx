import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Settings,
  BookOpen,
  Laptop,
  Download,
  Keyboard,
  Lock,
  ChevronDown,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface HeaderSystemDropdownProps {
  onOpenSettings: () => void;
  onOpenManual: () => void;
  onOpenBackup: () => void;
  onOpenDesktop?: () => void;
  onOpenShortcuts?: () => void;
  onOpenPinAuth?: () => void;
}

export const HeaderSystemDropdown: React.FC<HeaderSystemDropdownProps> = ({
  onOpenSettings,
  onOpenManual,
  onOpenBackup,
  onOpenDesktop,
  onOpenShortcuts,
  onOpenPinAuth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (actionFn?: () => void) => {
    setIsOpen(false);
    if (actionFn) actionFn();
  };

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center">
      <button
        id="btn-header-system-menu"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
        title="أدوات وإعدادات النظام"
      >
        <Settings className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">أدوات النظام</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800/80">
          <div className="p-1 space-y-0.5">
            <button
              onClick={() => handleAction(onOpenSettings)}
              id="menu-btn-settings"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer group"
            >
              <Settings className="w-4 h-4 text-emerald-400 shrink-0 group-hover:rotate-45 transition-transform" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs">إعدادات المنظومة واللغة</div>
                <div className="text-[10px] text-slate-400">تخصيص الهوية، الضرائب واللغة</div>
              </div>
            </button>

            <button
              onClick={() => handleAction(onOpenBackup)}
              id="menu-btn-backup"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer group"
            >
              <Download className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs">استيراد وتصدير النماذج</div>
                <div className="text-[10px] text-slate-400">نسخ احتياطي واستيراد إكسل/JSON</div>
              </div>
            </button>

            <button
              onClick={() => handleAction(onOpenManual)}
              id="menu-btn-manual"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer group"
            >
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs">دليل المستخدم المحاسبي (PDF)</div>
                <div className="text-[10px] text-slate-400">شرح الشاشات ودورة العمل المهنية</div>
              </div>
            </button>
          </div>

          <div className="p-1 space-y-0.5">
            {onOpenDesktop && (
              <button
                onClick={() => handleAction(onOpenDesktop)}
                id="menu-btn-desktop"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer group"
              >
                <Laptop className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs">تطبيق سطح المكتب</div>
                  <div className="text-[10px] text-slate-400">تثبيت المنظومة للعمل بدون إنترنت</div>
                </div>
              </button>
            )}

            {onOpenShortcuts && (
              <button
                onClick={() => handleAction(onOpenShortcuts)}
                id="menu-btn-shortcuts"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-xs">اختصارات لوحة المفاتيح</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 border border-slate-700">
                  Ctrl+K
                </span>
              </button>
            )}

            {onOpenPinAuth && (
              <button
                onClick={() => handleAction(onOpenPinAuth)}
                id="menu-btn-lock"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right hover:bg-slate-800 text-rose-300 hover:text-rose-200 transition-all cursor-pointer group"
              >
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs">قفل الشاشة السريع</div>
                  <div className="text-[10px] text-slate-400">حماية البيانات بكلمة المرور</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
