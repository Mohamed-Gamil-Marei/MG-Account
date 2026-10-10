import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Plus,
  LayoutDashboard,
  Users,
  Receipt,
  FileCheck2,
  Layers,
  Check,
} from 'lucide-react';
import { theme } from '../../theme';

// ==========================================
// 1. PageHeader (عنوان + وصف قصير + زر إجراء رئيسي)
// ==========================================
export interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  badge?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// ==========================================
// 2. Button (رئيسي / ثانوي / خطير)
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5 rounded-xl',
  };

  const variantStyles = {
    primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-500/20 active:scale-[0.98]',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 shadow-sm',
    outline: 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

// ==========================================
// 3. Input (حقل إدخال موحد)
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute right-3.5 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-white dark:bg-slate-900 border ${
            error ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
          } text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm rounded-xl py-2.5 px-3.5 ${
            icon ? 'pr-10' : ''
          } outline-none focus:ring-4 transition-all`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

// ==========================================
// 4. Card (بطاقة موحدة)
// ==========================================
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, actions }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// ==========================================
// 5. Badge (شارة الحالات)
// ==========================================
export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'info', children, className = '' }) => {
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    error: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    pending: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ==========================================
// 6. MoreMenu (⋯)
// ==========================================
export interface MoreMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export interface MoreMenuProps {
  items: MoreMenuItem[];
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="المزيد"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                item.danger
                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 7. Modal (نافذة منبثقة موحدة)
// ==========================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'xl',
}) => {
  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full ${maxWidthStyles[maxWidth]} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
};

// ==========================================
// 8. SidePanel (لوحة جانبية لتفاصيل الصف)
// ==========================================
export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-300">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. DataTable (رأس ثابت، صفوف متباعدة، بحث وفلاتر)
// ==========================================
export interface DataTableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filters,
  onRowClick,
  emptyMessage = 'لا توجد بيانات مطابقة',
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      {(onSearchChange || filters) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {onSearchChange && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          )}
          {filters && <div className="flex items-center gap-2 w-full sm:w-auto">{filters}</div>}
        </div>
      )}

      {/* Table Container with horizontal scroll for mobile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold">
                {columns.map((col, idx) => (
                  <th key={idx} className={`py-3.5 px-4 whitespace-nowrap ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-slate-400 font-medium">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, rIdx) => (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                    }`}
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`py-3 px-4 ${col.className || ''}`}>
                        {typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 10. ResponsiveSubTabBar (ألغِ التمرير الأفقي للأقسام الفرعية)
// ==========================================
export interface SubTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface ResponsiveSubTabBarProps {
  tabs: SubTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  maxVisibleTabs?: number;
  className?: string;
}

export const ResponsiveSubTabBar: React.FC<ResponsiveSubTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  maxVisibleTabs = 5,
  className = '',
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const activeItem = tabs.find((t) => t.id === activeTab) || tabs[0];
  const visibleTabs = tabs.slice(0, maxVisibleTabs);
  const overflowTabs = tabs.slice(maxVisibleTabs);
  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Mobile View (شاشة الموبايل: زر واحد عريض باسم القسم يفتح قائمة) */}
      <div className="sm:hidden relative" ref={mobileRef}>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 truncate">
            {activeItem?.icon && <span className="text-sky-600 dark:text-sky-400 shrink-0">{activeItem.icon}</span>}
            <span className="truncate">{activeItem?.label}</span>
            {activeItem?.badge && <span className="shrink-0">{activeItem.badge}</span>}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isMobileMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {tabs.map((tab) => {
              const isSelected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer text-right ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Desktop / Tablet View (ما يتسع وضع الباقي في زر "المزيد ▾" بدون أي تمرير أفقي) */}
      <div className="hidden sm:flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        {visibleTabs.map((tab) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span className="shrink-0">{tab.badge}</span>}
            </button>
          );
        })}

        {overflowTabs.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isOverflowActive
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>المزيد</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreOpen && (
              <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                {overflowTabs.map((tab) => {
                  const isSelected = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        onTabChange(tab.id);
                        setIsMoreOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer text-right ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 11. ResponsiveScreenToolbar (شريط أدوات الشاشة في صفين + زر + عائم وباقي الأدوات في ⋯ على الموبايل)
// ==========================================
export interface ResponsiveScreenToolbarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  secondaryActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }[];
  filters?: React.ReactNode;
  summaryStats?: React.ReactNode;
  className?: string;
}

export const ResponsiveScreenToolbar: React.FC<ResponsiveScreenToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  primaryAction,
  secondaryActions = [],
  filters,
  summaryStats,
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* الصف الأول: البحث والفلاتر والإحصائيات الملخصة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onSearchChange && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          )}
          {filters}
        </div>

        {summaryStats && <div className="flex items-center gap-2 text-xs shrink-0">{summaryStats}</div>}
      </div>

      {/* الصف الثاني: أزرار الإجراءات (على الديسكتاوب صف أزرار، وعلى الموبايل زر + عائم والأدوات في ⋯) */}
      <div className="flex items-center justify-between gap-2">
        {/* أزرار سطح المكتب والتابلت */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {secondaryActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={action.onClick}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                action.danger
                  ? 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {action.icon && <span className="shrink-0">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* قائمة ⋯ للموبايل للأدوات الفرعية */}
        <div className="sm:hidden flex items-center gap-2">
          {secondaryActions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">أدوات إضافية:</span>
              <MoreMenu items={secondaryActions} />
            </div>
          )}
        </div>

        {/* الزر الرئيسي لسطح المكتب */}
        {primaryAction && (
          <div className="hidden sm:block mr-auto">
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="min-h-[44px] px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-sky-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {primaryAction.icon || <Plus className="w-4 h-4" />}
              <span>{primaryAction.label}</span>
            </button>
          </div>
        )}
      </div>

      {/* زر + عائم (FAB) للموبايل للعمليات السريعة */}
      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          title={primaryAction.label}
          className="sm:hidden fixed bottom-20 left-4 z-40 w-13 h-13 min-h-[52px] min-w-[52px] rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-2xl flex items-center justify-center border-2 border-white dark:border-slate-900 cursor-pointer active:scale-90 transition-transform"
        >
          {primaryAction.icon || <Plus className="w-6 h-6 stroke-[2.5]" />}
        </button>
      )}
    </div>
  );
};

// ==========================================
// 12. MobileBottomNavigation (شريط تنقل سفلي ثابت بـ 5 أزرار)
// ==========================================
export interface MobileBottomNavigationProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  onOpenMore: () => void;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeTab,
  onNavigate,
  onOpenMore,
}) => {
  const isDashboard = activeTab === 'DASHBOARD';
  const isClients = activeTab === 'CLIENTS_ARCHIVE' || activeTab === 'OFFICE_HUB';
  const isEntries = activeTab === 'JOURNAL_ENTRIES' || activeTab === 'ACCOUNTING_HUB';
  const isTaxes = activeTab === 'TAX_TRACKER' || activeTab === 'TAX_AUDIT_HUB';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl h-16 flex items-center justify-around px-2"
      aria-label="شريط التنقل الميداني السريع"
    >
      <button
        type="button"
        onClick={() => onNavigate('DASHBOARD')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
          isDashboard ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 shrink-0" />
        <span className="text-[10px]">الرئيسية</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('CLIENTS_ARCHIVE')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
          isClients ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
        }`}
      >
        <Users className="w-5 h-5 shrink-0" />
        <span className="text-[10px]">العملاء</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('JOURNAL_ENTRIES')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
          isEntries ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
        }`}
      >
        <Receipt className="w-5 h-5 shrink-0" />
        <span className="text-[10px]">القيود</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('TAX_TRACKER')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
          isTaxes ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
        }`}
      >
        <FileCheck2 className="w-5 h-5 shrink-0" />
        <span className="text-[10px]">الإقرارات</span>
      </button>

      <button
        type="button"
        onClick={onOpenMore}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors cursor-pointer"
      >
        <Layers className="w-5 h-5 shrink-0" />
        <span className="text-[10px]">المزيد</span>
      </button>
    </nav>
  );
};
