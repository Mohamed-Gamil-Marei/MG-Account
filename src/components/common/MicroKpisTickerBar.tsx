import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MicroKpiItem {
  id?: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
}

interface MicroKpisTickerBarProps {
  items: MicroKpiItem[];
  className?: string;
}

export const MicroKpisTickerBar: React.FC<MicroKpisTickerBarProps> = ({ items, className = '' }) => {
  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'emerald':
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-emerald-700 dark:text-emerald-400',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400',
        };
      case 'amber':
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-amber-700 dark:text-amber-400',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400',
        };
      case 'rose':
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-rose-700 dark:text-rose-400',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400',
        };
      case 'purple':
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-purple-700 dark:text-purple-400',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400',
        };
      case 'blue':
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-blue-700 dark:text-blue-400',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200/80 dark:border-slate-800',
          text: 'text-slate-800 dark:text-slate-200',
          iconBg: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        };
    }
  };

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 ${className}`}
    >
      {items.map((item, idx) => {
        const style = getVariantStyles(item.variant);
        const Icon = item.icon;
        return (
          <div
            key={item.id || idx}
            className={`p-2.5 rounded-2xl border ${style.border} ${style.bg} flex items-center gap-2.5 min-w-0 shadow-2xs transition-all`}
          >
            {Icon && (
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {item.label}
              </div>
              <div className={`text-xs sm:text-sm font-mono font-black ${style.text} truncate`}>
                {item.value}
              </div>
              {item.subValue && (
                <div className="text-[9px] font-semibold text-slate-400 truncate">
                  {item.subValue}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
