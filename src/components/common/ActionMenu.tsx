import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  MoreHorizontal,
  LucideIcon,
  Printer,
  Download,
  Edit,
  Trash2,
  Eye,
  Send,
  FileSpreadsheet,
  FileText,
  Copy,
  Plus,
  RefreshCw,
  Share2,
  CheckCircle2,
  Settings,
  ChevronDown,
} from 'lucide-react';

export type ActionMenuPreset =
  | 'print'
  | 'export'
  | 'export_excel'
  | 'export_pdf'
  | 'edit'
  | 'delete'
  | 'view'
  | 'send'
  | 'copy'
  | 'add'
  | 'refresh'
  | 'share'
  | 'settings';

export interface ActionMenuItem {
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  preset?: ActionMenuPreset;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'primary' | 'success' | 'indigo' | 'amber';
  disabled?: boolean;
  isDivider?: boolean;
  badge?: string;
  description?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  title?: string;
  triggerType?: 'three_dots_vertical' | 'three_dots_horizontal' | 'button_with_dots' | 'button_text';
  buttonLabel?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'dark';
  align?: 'left' | 'right';
  className?: string;
  menuWidth?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  title = 'إجراءات',
  triggerType = 'three_dots_vertical',
  buttonLabel,
  size = 'sm',
  buttonVariant = 'outline',
  align = 'left',
  className = '',
  menuWidth = 'w-48',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Resolve preset icon if icon is not explicitly supplied
  const resolveIcon = (item: ActionMenuItem) => {
    if (item.icon) return item.icon;
    switch (item.preset) {
      case 'print':
        return Printer;
      case 'export':
      case 'export_pdf':
        return Download;
      case 'export_excel':
        return FileSpreadsheet;
      case 'edit':
        return Edit;
      case 'delete':
        return Trash2;
      case 'view':
        return Eye;
      case 'send':
        return Send;
      case 'copy':
        return Copy;
      case 'add':
        return Plus;
      case 'refresh':
        return RefreshCw;
      case 'share':
        return Share2;
      case 'settings':
        return Settings;
      default:
        return undefined;
    }
  };

  const getButtonStyles = () => {
    let base =
      'inline-flex items-center justify-center font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ';
    
    // Variant styling
    switch (buttonVariant) {
      case 'primary':
        base += 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 ';
        break;
      case 'secondary':
        base += 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 ';
        break;
      case 'dark':
        base += 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 ';
        break;
      case 'ghost':
        base += 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 ';
        break;
      case 'outline':
      default:
        base += 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 ';
        break;
    }

    // Compact icon-first sizing
    const isIconOnly = !buttonLabel && (triggerType === 'three_dots_vertical' || triggerType === 'three_dots_horizontal');

    if (isIconOnly) {
      switch (size) {
        case 'xs':
          base += 'w-6 h-6 p-0 rounded-md text-xs';
          break;
        case 'lg':
          base += 'w-9 h-9 p-0 rounded-xl text-base';
          break;
        case 'md':
          base += 'w-8 h-8 p-0 rounded-lg text-sm';
          break;
        case 'sm':
        default:
          base += 'w-7 h-7 p-0 rounded-lg text-xs';
          break;
      }
    } else {
      switch (size) {
        case 'xs':
          base += 'px-2 py-0.5 text-[11px] gap-1 rounded-md';
          break;
        case 'lg':
          base += 'px-3.5 py-1.5 text-sm gap-1.5 rounded-xl';
          break;
        case 'md':
          base += 'px-3 py-1.5 text-xs gap-1.5 rounded-xl';
          break;
        case 'sm':
        default:
          base += 'px-2.5 py-1 text-xs gap-1.5 rounded-lg';
          break;
      }
    }

    return base;
  };

  const isIconOnly = !buttonLabel && (triggerType === 'three_dots_vertical' || triggerType === 'three_dots_horizontal');

  return (
    <div className={`relative inline-block text-right no-print ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={getButtonStyles()}
        title={title}
        aria-expanded={isOpen}
      >
        {triggerType === 'three_dots_horizontal' && <MoreHorizontal className="w-3.5 h-3.5" />}
        {triggerType === 'three_dots_vertical' && <MoreVertical className="w-3.5 h-3.5" />}
        {triggerType === 'button_with_dots' && (
          <>
            <MoreHorizontal className="w-3.5 h-3.5" />
            {buttonLabel && <span>{buttonLabel}</span>}
          </>
        )}
        {triggerType === 'button_text' && (
          <>
            {buttonLabel && <span>{buttonLabel}</span>}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-1.5 ${menuWidth} bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 space-y-0.5`}
        >
          {items.map((act, i) => {
            if (act.isDivider) {
              return (
                <div
                  key={`div-${i}`}
                  className="my-1 border-t border-slate-100 dark:border-slate-800"
                />
              );
            }

            const Icon = resolveIcon(act);
            let colorClass =
              'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80';
            let iconColorClass = 'text-slate-500 dark:text-slate-400';

            if (act.variant === 'danger' || act.preset === 'delete') {
              colorClass =
                'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40';
              iconColorClass = 'text-rose-600 dark:text-rose-400';
            } else if (act.variant === 'warning') {
              colorClass =
                'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40';
              iconColorClass = 'text-amber-600 dark:text-amber-400';
            } else if (act.variant === 'success' || act.preset === 'export_excel') {
              colorClass =
                'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40';
              iconColorClass = 'text-emerald-600 dark:text-emerald-400';
            } else if (act.variant === 'primary' || act.preset === 'print') {
              colorClass =
                'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40';
              iconColorClass = 'text-blue-600 dark:text-blue-400';
            } else if (act.variant === 'indigo' || act.preset === 'edit') {
              colorClass =
                'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40';
              iconColorClass = 'text-indigo-600 dark:text-indigo-400';
            }

            return (
              <button
                key={act.id || i}
                type="button"
                disabled={act.disabled}
                onClick={() => {
                  setIsOpen(false);
                  act.onClick();
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-right font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${colorClass}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />}
                  <span className="truncate">{act.label}</span>
                </div>
                {act.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    {act.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ActionsMenu = ActionMenu;
