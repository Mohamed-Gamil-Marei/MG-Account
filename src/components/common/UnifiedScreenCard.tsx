import React from 'react';
import { Search } from 'lucide-react';

export interface FilterTabItem {
  id: string;
  label: string;
}

export interface UnifiedScreenCardProps {
  id?: string;
  targetElementId?: string;
  printSelector?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterTabs?: FilterTabItem[];
  activeFilterTab?: string;
  onFilterTabChange?: (tabId: string) => void;
  children: React.ReactNode;
}

export const UnifiedScreenCard: React.FC<UnifiedScreenCardProps> = ({
  id,
  title,
  description,
  icon: Icon,
  headerActions,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  children,
}) => {
  return (
    <div
      id={id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {headerActions && <div>{headerActions}</div>}
      </div>

      {(onSearchChange || (filterTabs && filterTabs.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          )}

          {filterTabs && filterTabs.length > 0 && onFilterTabChange && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onFilterTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeFilterTab === tab.id
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
};
