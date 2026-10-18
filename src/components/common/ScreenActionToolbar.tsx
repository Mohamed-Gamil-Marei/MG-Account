import React from 'react';
import { Printer } from 'lucide-react';
import { PrintService } from '../../services/PrintService';

export interface ScreenActionToolbarProps {
  modelType: string;
  title: string;
  targetElementId?: string;
  printSelector?: string;
  count?: number;
}

export const ScreenActionToolbar: React.FC<ScreenActionToolbarProps> = ({
  title,
  targetElementId,
  count,
}) => {
  return (
    <div className="flex items-center gap-2">
      {typeof count === 'number' && (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
          العدد: {count}
        </span>
      )}
      {targetElementId && (
        <button
          type="button"
          onClick={() =>
            PrintService.printElementById(targetElementId, {
              documentTitle: title,
            })
          }
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة</span>
        </button>
      )}
    </div>
  );
};
