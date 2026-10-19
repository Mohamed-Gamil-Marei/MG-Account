import React from 'react';
import { Printer } from 'lucide-react';
import { PrintService } from '../../services/PrintService';

export interface ScreenActionToolbarAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  className?: string;
}

export interface ScreenActionToolbarProps {
  modelType: string;
  title: string;
  targetElementId?: string;
  printSelector?: string;
  count?: number;
  compact?: boolean;
  actions?: ScreenActionToolbarAction[];
}

export const ScreenActionToolbar: React.FC<ScreenActionToolbarProps> = ({
  title,
  targetElementId,
  count,
  compact,
  actions,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {typeof count === 'number' && (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
          العدد: {count}
        </span>
      )}
      {actions?.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            className={
              action.className ||
              `${
                compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
              } rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors`
            }
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{action.label}</span>
          </button>
        );
      })}
      {targetElementId && (
        <button
          type="button"
          onClick={() =>
            PrintService.printElementById(targetElementId, {
              documentTitle: title,
            })
          }
          className={`${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
          } rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة</span>
        </button>
      )}
    </div>
  );
};
