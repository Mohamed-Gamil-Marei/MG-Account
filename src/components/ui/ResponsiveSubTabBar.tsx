import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

export interface SubTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

export interface ResponsiveSubTabBarProps {
  tabs: SubTabItem[];
  activeId?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  onTabChange?: (id: string) => void;
  maxVisible?: number;
  maxVisibleTabs?: number;
  className?: string;
}

export const ResponsiveSubTabBar: React.FC<ResponsiveSubTabBarProps> = ({
  tabs,
  activeId,
  activeTab,
  onChange,
  onTabChange,
  maxVisible = 5,
  maxVisibleTabs,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveActiveId = activeId ?? activeTab ?? (tabs[0]?.id || '');
  const handleChange = onChange ?? onTabChange ?? (() => {});
  const effectiveMaxVisible = maxVisibleTabs ?? maxVisible ?? 5;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!tabs || tabs.length === 0) return null;

  const activeIndex = tabs.findIndex((t) => t.id === effectiveActiveId);
  const isOverflowActive = activeIndex >= effectiveMaxVisible;

  let visibleTabs: SubTabItem[] = [];
  let dropdownTabs: SubTabItem[] = [];

  if (tabs.length <= effectiveMaxVisible) {
    visibleTabs = tabs;
    dropdownTabs = [];
  } else if (!isOverflowActive) {
    visibleTabs = tabs.slice(0, effectiveMaxVisible);
    dropdownTabs = tabs.slice(effectiveMaxVisible);
  } else {
    const currentActiveTab = tabs[activeIndex] || tabs[0];
    visibleTabs = [...tabs.slice(0, effectiveMaxVisible - 1), currentActiveTab];
    dropdownTabs = tabs.filter((t) => !visibleTabs.some((vt) => vt.id === t.id));
  }

  const renderIcon = (icon?: React.ReactNode | React.ComponentType<{ className?: string }>) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4 shrink-0" />;
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 pt-1 text-xs select-none ${className}`}
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.id === effectiveActiveId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium text-xs border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {renderIcon(tab.icon)}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="mr-1">{tab.badge}</span>
            )}
          </button>
        );
      })}

      {dropdownTabs.length > 0 && (
        <div className="relative my-0.5" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-2 font-medium text-xs border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>المزيد ⋯</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              {dropdownTabs.map((tab) => {
                const isActive = tab.id === effectiveActiveId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      handleChange(tab.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs transition-colors text-right cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {renderIcon(tab.icon)}
                    <span className="flex-1 text-right">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="mr-1">{tab.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
