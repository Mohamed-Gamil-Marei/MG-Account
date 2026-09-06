import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { AppLanguage } from '../types';

interface LanguageToggleProps {
  currentLanguage: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onOpenSettings?: () => void;
  variant?: 'compact' | 'full';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLanguage,
  onLanguageChange,
  onOpenSettings,
  variant = 'compact',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAr = currentLanguage === 'ar';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: AppLanguage) => {
    onLanguageChange(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        id="btn-language-toggle"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 select-none ${
          isAr
            ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            : 'bg-blue-50/90 hover:bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-700 ring-1 ring-blue-500/20'
        }`}
        title={isAr ? 'تبديل اللغة (Language: Arabic / English)' : 'Switch Language (Arabic / English)'}
        aria-label="Language selection"
      >
        <Globe className={`w-3.5 h-3.5 shrink-0 ${isAr ? 'text-slate-500 dark:text-slate-400' : 'text-blue-600 dark:text-blue-400'}`} />
        <span className="font-sans font-black tracking-wide text-[11px]">
          {isAr ? 'AR' : 'EN'}
        </span>
        <span className="hidden sm:inline text-[10px] opacity-75 font-medium">
          {isAr ? 'عربي' : 'English'}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {/* Language Selection Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            isAr ? 'left-0' : 'right-0'
          } top-full mt-2 w-64 p-2 rounded-2xl shadow-xl border z-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-top-1 duration-150`}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isAr ? 'اختر لغة الواجهة' : 'Select UI Language'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono font-bold">
              i18n
            </span>
          </div>

          <div className="space-y-1">
            {/* Arabic Option */}
            <button
              type="button"
              onClick={() => handleSelect('ar')}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-right transition-colors cursor-pointer ${
                isAr
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  ع
                </span>
                <div className="text-right">
                  <div className="text-xs font-bold">العربية (Arabic)</div>
                  <div className="text-[10px] text-slate-400">المعايير والضرائب المصرية الرسمية</div>
                </div>
              </div>
              {isAr && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </button>

            {/* English Option */}
            <button
              type="button"
              onClick={() => handleSelect('en')}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                !isAr
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs font-mono">
                  EN
                </span>
                <div className="text-left">
                  <div className="text-xs font-bold">English (International)</div>
                  <div className="text-[10px] text-slate-400">EAS / IFRS Accounting Terminology</div>
                </div>
              </div>
              {!isAr && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </button>
          </div>

          {onOpenSettings && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full py-1 px-2 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 text-center font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{isAr ? 'فتح جميع خيارات الإعدادات' : 'Open Full System Settings'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
