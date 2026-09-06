import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Check, ChevronDown } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = themeMode === 'dark';

  const brandOptions: { id: BrandColor; name: string; bgClass: string; activeRing: string }[] = [
    { id: 'blue', name: 'أزرق كلاسيكي', bgClass: 'bg-blue-600', activeRing: 'ring-blue-500' },
    { id: 'emerald', name: 'أخضر مالي', bgClass: 'bg-emerald-600', activeRing: 'ring-emerald-500' },
    { id: 'indigo', name: 'كحلي ملكي', bgClass: 'bg-indigo-600', activeRing: 'ring-indigo-500' },
    { id: 'slate', name: 'رمادي وقور', bgClass: 'bg-slate-700', activeRing: 'ring-slate-500' },
    { id: 'amber', name: 'ذهبي أندلسي', bgClass: 'bg-amber-600', activeRing: 'ring-amber-500' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColorObj = brandOptions.find((b) => b.id === brandColor) || brandOptions[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="تخصيص المظهر (الوضع المظلم/الفاتح ولون السمة)"
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className={`w-2.5 h-2.5 rounded-full ${activeColorObj.bgClass} inline-block`} />
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Elegant Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-2 w-56 p-3 rounded-2xl shadow-xl border z-50 animate-fadeIn ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Light / Dark Mode Segmented Switch */}
          <div className="mb-3">
            <span className={`text-[11px] font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              وضع الإضاءة
            </span>
            <div
              className={`grid grid-cols-2 p-1 rounded-xl border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>فاتح</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>مظلم</span>
              </button>
            </div>
          </div>

          {/* Brand Color Theme Palette */}
          <div>
            <span className={`text-[11px] font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              لون الواجهة والسمة
            </span>
            <div className="space-y-1">
              {brandOptions.map((opt) => {
                const isSelected = brandColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onBrandColorChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-800 text-white font-bold'
                          : 'bg-slate-100 text-slate-900 font-bold'
                        : isDark
                        ? 'hover:bg-slate-800/50 text-slate-300'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${opt.bgClass} shadow-2xs`} />
                      <span>{opt.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
