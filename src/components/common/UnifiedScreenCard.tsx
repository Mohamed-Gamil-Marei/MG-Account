import React from 'react';
import { LucideIcon, Zap, LayoutGrid, ListFilter } from 'lucide-react';
import { ActionButton, ActionDropdownItem } from './ActionButton';
import { ActionMenu, ActionMenuItem } from './ActionMenu';
import { ScreenActionToolbar, ScreenActionButtonItem } from './ScreenActionToolbar';
import { useDensity } from './CompactDensityContext';

export interface FilterTabOption {
  id: string;
  label: string;
}

export interface FilterButtonOption {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate' | 'rose';
}

export interface PrimaryActionConfig {
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'amber' | 'sky';
  onClick: () => void;
}

export interface UnifiedScreenCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate' | 'rose';
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  primaryAction?: PrimaryActionConfig;
  actionMenuItems?: ActionMenuItem[];
  actionsSlot?: React.ReactNode;
  actionsDropdown?: ActionDropdownItem[] | { label?: string; items: ActionDropdownItem[] };
  actionsDropdownLabel?: string;
  screenActions?: ScreenActionButtonItem[] | { modelType?: string; title?: string; count?: number; showImport?: boolean; showExport?: boolean; showPrint?: boolean };
  modelType?: string;
  printSelector?: string;
  targetElementId?: string;
  showToolbar?: boolean;
  showDensityToggle?: boolean;
  headerControls?: React.ReactNode;
  headerActions?: React.ReactNode;
  extraHeaderControls?: React.ReactNode;
  searchValue?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterTabs?: FilterTabOption[];
  activeFilterTab?: string;
  onFilterTabChange?: (tabId: string) => void;
  filterButtons?: FilterButtonOption[];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const UnifiedScreenCard: React.FC<UnifiedScreenCardProps> = ({
  id,
  title,
  subtitle,
  description,
  badge,
  badgeVariant = 'blue',
  icon: Icon,
  primaryAction,
  actionMenuItems,
  actionsSlot,
  actionsDropdown,
  actionsDropdownLabel = 'إجراءات',
  screenActions,
  modelType,
  printSelector,
  targetElementId,
  showToolbar = false,
  showDensityToggle = true,
  headerControls,
  headerActions,
  extraHeaderControls,
  searchValue,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  filterButtons,
  children,
  className = '',
  contentClassName = '',
}) => {
  const { density, toggleDensity, isFocusMode } = useDensity();
  const effectiveSubtitle = subtitle || description;
  const effectiveSearchVal = searchValue !== undefined ? searchValue : (searchTerm !== undefined ? searchTerm : '');

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'slate':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const resolvedDropdownItems: ActionDropdownItem[] = Array.isArray(actionsDropdown)
    ? actionsDropdown
    : actionsDropdown && typeof actionsDropdown === 'object' && 'items' in actionsDropdown
    ? actionsDropdown.items
    : [];

  const resolvedDropdownLabel = (actionsDropdown && typeof actionsDropdown === 'object' && 'label' in actionsDropdown && actionsDropdown.label)
    ? actionsDropdown.label
    : actionsDropdownLabel;

  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* Compact Minimal Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                {title}
              </h1>
              {badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeStyle()}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {effectiveSubtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {effectiveSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls & Unified Action Point */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {actionsSlot}
          {headerActions}
          {headerControls}
          {extraHeaderControls}

          {/* Table Density Mode Toggle */}
          {showDensityToggle && (
            <button
              type="button"
              onClick={toggleDensity}
              className={`p-1 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                density === 'compact'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title={density === 'compact' ? 'العرض: مضغوط' : 'العرض: مريح'}
            >
              <Zap className={`w-3 h-3 ${density === 'compact' ? 'text-blue-600 dark:text-blue-400 fill-blue-500/20' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[10px]">
                {density === 'compact' ? 'مضغوط' : 'مريح'}
              </span>
            </button>
          )}

          {/* Primary Action Button */}
          {primaryAction && (
            <button
              id={primaryAction.id}
              onClick={primaryAction.onClick}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {primaryAction.icon && <primaryAction.icon className="w-3 h-3" />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {/* Unified ActionMenu (3-dots compact icon button) */}
          {actionMenuItems && actionMenuItems.length > 0 && (
            <ActionMenu
              items={actionMenuItems}
              title="إجراءات"
              triggerType="three_dots_vertical"
              size="sm"
              buttonVariant="outline"
              align="left"
            />
          )}

          {/* Consolidated Actions Dropdown (legacy compatibility) */}
          {resolvedDropdownItems.length > 0 && !actionMenuItems && (
            <ActionButton
              label={resolvedDropdownLabel}
              variant="outline"
              size="sm"
              dropdownItems={resolvedDropdownItems}
            />
          )}

          {/* Optional Screen Action Toolbar for export/print */}
          {showToolbar && (
            <ScreenActionToolbar
              modelType={modelType}
              title={title}
              printSelector={printSelector}
              targetElementId={targetElementId}
              compact={true}
            />
          )}
        </div>
      </div>

      {/* Sub-Header Toolbar (Search and Filter Tabs if present) */}
      {(onSearchChange || (filterTabs && filterTabs.length > 0) || (filterButtons && filterButtons.length > 0)) && (
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          {onSearchChange && (
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <input
                type="text"
                value={effectiveSearchVal}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-3 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {filterTabs && filterTabs.length > 0 && onFilterTabChange && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onFilterTabChange(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilterTab === tab.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {filterButtons && filterButtons.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {filterButtons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    btn.active
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Single-Card Content Area */}
      <div className={`p-4 md:p-5 ${contentClassName}`}>{children}</div>
    </div>
  );
};
