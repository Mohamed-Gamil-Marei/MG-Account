import React from 'react';
import { AlertTriangle, FileCheck2, Printer, X } from 'lucide-react';

export interface FinalizationWarningModalProps {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  fiscalYear: number | string;
  missingItems?: string[];
  onClose: () => void;
  onProceedDraftPrint: () => void;
}

export const FinalizationWarningModal: React.FC<FinalizationWarningModalProps> = ({
  isOpen,
  clientName,
  fiscalYear,
  missingItems = [],
  onClose,
  onProceedDraftPrint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تنبيه قبل طباعة القوائم المالية النهائية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {clientName} • السنة المالية {fiscalYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          لم يتم استكمال كافة بنود قائمة فحص الإقفال أو اعتماد النسخة النهائية بعد. يمكنك المتابعة بطباعة نسخة مسودة للمراجعة أو إغلاق النافذة لاستكمال الاعتماد.
        </p>

        {missingItems.length > 0 && (
          <ul className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-1 text-xs text-amber-900 dark:text-amber-200">
            {missingItems.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            العودة لاستكمال الاعتماد
          </button>
          <button
            type="button"
            onClick={onProceedDraftPrint}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>متابعة الطباعة كمسودة (Draft)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
