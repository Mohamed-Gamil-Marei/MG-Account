import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Search, X, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
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
