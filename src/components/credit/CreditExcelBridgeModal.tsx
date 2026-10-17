import React from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import { FiscalYearData } from './CreditYearlyEditor';

export interface CreditExcelBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearsList: number[];
  yearsData: Record<number, FiscalYearData>;
  clientName: string;
  onImportSuccess: (importedYearsData: Record<number, Partial<FiscalYearData>>) => void;
}

export const CreditExcelBridgeModal: React.FC<CreditExcelBridgeModalProps> = ({
  isOpen,
  onClose,
  clientName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              جسر الربط الثنائي مع مصنفات Excel ({clientName})
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          يمكنك تصدير مصنف القوائم المالية المقارنة إلى Excel أو استيراد الأرصدة التاريخية مباشرة لتحديث سنوات المقارنة.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
