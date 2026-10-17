import React from 'react';
import { FiscalYearData } from './CreditYearlyEditor';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface DedicatedYearWorkspaceProps {
  yearsData: Record<number, FiscalYearData>;
  yearsList: number[];
  computedData: Record<number, any>;
  customItems: any[];
  itemNames: Record<string, string>;
  hiddenItemIds: string[];
  supplementaryNotes: any[];
  onUpdateNotesList: React.Dispatch<React.SetStateAction<any[]>>;
  assetCategories: FixedAssetCategoryItem[];
  adminExpenses: any[];
  officeProfile: any;
  onAutoBalanceYear: (year: number) => void;
  onAutoBalanceAllYears: () => void;
  onUpdateYearDataPartial?: (year: number, partial: Partial<FiscalYearData>) => void;
  initialYear: number;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  [key: string]: any;
}

export const DedicatedYearWorkspace: React.FC<DedicatedYearWorkspaceProps> = ({
  computedData,
  initialYear,
  onAutoBalanceYear,
  onAutoBalanceAllYears,
  periodLabel,
}) => {
  const yr = computedData[initialYear] || {};

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            مساحة العمل المخصصة للسنة المالية ({initialYear}) {periodLabel ? `• ${periodLabel}` : ''}
          </h3>
          <p className="text-xs text-slate-500">مراجعة توازن قائمة المركز المالي وقائمة الدخل للعام المحدد</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAutoBalanceYear(initialYear)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            موازنة تلقائية لعام {initialYear}
          </button>
          <button
            type="button"
            onClick={onAutoBalanceAllYears}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
          >
            موازنة كافة السنوات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">إجمالي الأصول ({initialYear})</div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatEgyptianCurrency(yr.totalAssets || 0, true)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">إجمالي الالتزامات وحقوق الملكية</div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatEgyptianCurrency(yr.totalLiabilitiesAndEquity || 0, true)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">صافي ربح العام</div>
          <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
            {formatEgyptianCurrency(yr.netProfit || 0, true)}
          </div>
        </div>
      </div>
    </div>
  );
};
