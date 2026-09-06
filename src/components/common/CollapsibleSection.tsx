import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  id?: string;
  title: string;
  summaryText?: string;
  badge?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate' | 'rose';
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  summaryText,
  badge,
  badgeVariant = 'blue',
  icon: Icon,
  defaultOpen = false,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
    }
  };

  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-2xs ${className}`}
    >
      {/* Clickable Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {title}
            </span>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeStyle()}`}>
                {badge}
              </span>
            )}
            {summaryText && !isOpen && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden md:inline">
                • {summaryText}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-400">
            {isOpen ? 'إخفاء' : 'عرض التفاصيل'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Expandable Content Area */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
