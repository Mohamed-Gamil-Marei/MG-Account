import React from 'react';
import { X } from 'lucide-react';

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate' | 'rose';
  width?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  badgeVariant = 'blue',
  width = 'max-w-xl',
  children,
  footerActions,
}) => {
  if (!isOpen) return null;

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container (Slides from Left in RTL / Right in LTR) */}
      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 rtl:pl-0 rtl:right-auto rtl:left-0 ltr:left-auto ltr:right-0">
        <div
          className={`w-screen ${width} bg-white dark:bg-slate-900 shadow-2xl border-r rtl:border-r-0 rtl:border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-left rtl:slide-in-from-left ltr:slide-in-from-right duration-250`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
            <div className="min-w-0 flex-1 pl-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                  {title}
                </h2>
                {badge && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getBadgeStyle()}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">{children}</div>

          {/* Optional Footer */}
          {footerActions && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-end gap-2">
              {footerActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
