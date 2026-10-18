import React from 'react';

export interface QuickRowActionItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'success' | 'danger' | 'default';
  onClick: () => void;
}

export interface QuickRowActionDropdownProps {
  title?: string;
  actions: QuickRowActionItem[];
}

export const QuickRowActionDropdown: React.FC<QuickRowActionDropdownProps> = ({ actions }) => {
  return (
    <div className="inline-flex items-center gap-1">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            type="button"
            title={action.label}
            onClick={action.onClick}
            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};
