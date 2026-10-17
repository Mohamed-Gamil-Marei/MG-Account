import React from 'react';
import { AppLanguage } from '../types';
import { Globe, Settings } from 'lucide-react';

export interface LanguageToggleProps {
  currentLanguage: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onOpenSettings?: () => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLanguage,
  onLanguageChange,
  onOpenSettings,
}) => {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onLanguageChange(currentLanguage === 'ar' ? 'en' : 'ar')}
        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
        title="تغيير اللغة"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400" />
        <span>{currentLanguage === 'ar' ? 'EN' : 'عربي'}</span>
      </button>
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="إعدادات المكتب"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
