import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

export interface ActionDropdownItem {
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  description?: string;
  badge?: string;
  variant?: 'default' | 'danger' | 'success' | 'primary' | 'warning';
  disabled?: boolean;
  isDivider?: boolean;
}

export interface ActionButtonProps {
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  dropdownItems?: ActionDropdownItem[];
  dropdownTitle?: string;
  dropdownHeaderBadge?: string;
  dropdownWidth?: string;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
  className?: string;
  allowPrint?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  id,
  label,
  icon: Icon,
  onClick,
  variant = 'primary',
  size = 'md',
  dropdownItems,
  dropdownTitle,
  dropdownHeaderBadge,
  dropdownWidth = 'w-64',
  disabled = false,
  isLoading = false,
  title,
  className = '',
  allowPrint = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Esc key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Unified variant styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs active:scale-95';
      case 'dark':
        return 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs active:scale-95';
      case 'secondary':
        return 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95';
      case 'outline':
        return 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 active:scale-95';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs active:scale-95';
      case 'success':
        return 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-2xs active:scale-95';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95';
      default:
        return 'bg-emerald-600 hover:bg-emerald-500 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1 text-xs gap-1.5 rounded-lg';
      case 'lg':
        return 'px-5 py-2.5 text-sm gap-2 rounded-xl font-black';
      case 'md':
      default:
        return 'px-3.5 py-2 text-xs gap-1.5 rounded-xl font-bold';
    }
  };

  const hasDropdown = dropdownItems && dropdownItems.length > 0;

  const handleMainClick = (e: React.MouseEvent) => {
    if (disabled || isLoading) return;
    if (onClick) {
      onClick();
    } else if (hasDropdown) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const printClass = allowPrint ? 'allow-print' : '';

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* If button has separate dropdown toggle split button */}
      {hasDropdown && onClick ? (
        <div className={`inline-flex rounded-xl shadow-2xs overflow-hidden ${printClass}`}>
          <button
            id={id}
            type="button"
            onClick={handleMainClick}
            disabled={disabled || isLoading}
            title={title}
            className={`flex items-center cursor-pointer transition-all ${getSizeClasses()} ${getVariantClasses()} rounded-l-none border-l border-white/20 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="whitespace-nowrap">{label}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`px-2 py-2 flex items-center justify-center cursor-pointer transition-all ${getVariantClasses()} rounded-r-none hover:opacity-90 disabled:opacity-50`}
            title="خيارات إضافية"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        /* Single combined button (either purely action or opens dropdown) */
        <button
          id={id}
          type="button"
          onClick={handleMainClick}
          disabled={disabled || isLoading}
          title={title}
          className={`flex items-center cursor-pointer transition-all ${getSizeClasses()} ${getVariantClasses()} ${printClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
          <span className="whitespace-nowrap">{label}</span>
          {hasDropdown && (
            <ChevronDown className={`w-3 h-3 text-current opacity-70 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
      )}

      {/* Dropdown Menu Container */}
      {hasDropdown && isDropdownOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 ${dropdownWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 space-y-0.5 no-print`}
        >
          {(dropdownTitle || dropdownHeaderBadge) && (
            <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
              <span>{dropdownTitle || 'الخيارات المتاحة'}</span>
              {dropdownHeaderBadge && (
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  {dropdownHeaderBadge}
                </span>
              )}
            </div>
          )}

          {dropdownItems.map((item, index) => {
            if (item.isDivider) {
              return <div key={index} className="my-1 border-t border-slate-100 dark:border-slate-800" />;
            }

            const ItemIcon = item.icon;
            let itemColors = 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200';
            if (item.variant === 'danger') {
              itemColors = 'hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300';
            } else if (item.variant === 'success') {
              itemColors = 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
            } else if (item.variant === 'primary') {
              itemColors = 'hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300';
            }

            return (
              <button
                key={item.id || index}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setIsDropdownOpen(false);
                  if (item.onClick) item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${itemColors}`}
              >
                {ItemIcon && <ItemIcon className="w-4 h-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
