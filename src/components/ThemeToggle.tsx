import React from 'react';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { BrandColor, ThemeMode } from '../types';

interface ThemeToggleProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  brandColor: BrandColor;
  onBrandColorChange: (color: BrandColor) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  themeMode,
  onThemeChange,
  brandColor,
  onBrandColorChange,
}) => {
  const brandOptions: { id: BrandColor; name: string; bgClass: string; activeRing: string }[] = [
    { id: 'blue', name: 'أزرق كلاسيكي', bgClass: 'bg-blue-600', activeRing: 'ring-blue-500' },
    { id: 'emerald', name: 'أخضر مالي', bgClass: 'bg-emerald-600', activeRing: 'ring-emerald-500' },
    { id: 'indigo', name: 'كحلي ملكي', bgClass: 'bg-indigo-600', activeRing: 'ring-indigo-500' },
    { id: 'slate', name: 'رمادي وقور', bgClass: 'bg-slate-700', activeRing: 'ring-slate-500' },
    { id: 'amber', name: 'ذهبي أندلسي', bgClass: 'bg-amber-600', activeRing: 'ring-amber-500' },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Theme Mode Toggle (Dark / Light) */}
      <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => onThemeChange('light')}
          title="الوضع الفاتح"
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            themeMode === 'light'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span className="hidden md:inline text-[11px]">فاتح</span>
        </button>

        <button
          type="button"
          onClick={() => onThemeChange('dark')}
          title="الوضع المظلم"
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            themeMode === 'dark'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span className="hidden md:inline text-[11px]">مظلم</span>
        </button>
      </div>

      {/* Brand Color Quick Selector */}
      <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1.5 rounded-xl border border-slate-700">
        <Palette className="w-3.5 h-3.5 text-slate-400 ml-1" />
        {brandOptions.map((opt) => {
          const isSelected = brandColor === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onBrandColorChange(opt.id)}
              title={opt.name}
              className={`w-5 h-5 rounded-full ${opt.bgClass} flex items-center justify-center transition-all cursor-pointer ${
                isSelected ? `ring-2 ${opt.activeRing} ring-offset-1 ring-offset-slate-900 scale-110` : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
