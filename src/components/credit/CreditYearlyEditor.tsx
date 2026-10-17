import React from 'react';
import { Sliders, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface FiscalYearData {
  year: number;
  dataSource?: 'SIMULATION' | 'LEDGER' | 'EXCEL_IMPORT' | string;
  sales: number;
  cogs: number;
  grossProfit: number;
  adminExp: number;
  sellingExp: number;
  financeExp: number;
  ebit?: number;
  depreciation: number;
  netProfit: number;
  netFixedAssets: number;
  projectsInProgress: number;
  inventory: number;
  receivables: number;
  otherDebit: number;
  cash: number;
  suppliers: number;
  shortLoans: number;
  otherCurrentLiab: number;
  longLoans: number;
  paidUpCapital: number;
  legalReserve: number;
  retainedEarningsAndProfit: number;
  cogsRatio: number;
  adminExpRatio: number;
  sellingExpRatio: number;
  financeExpRatio: number;
  taxRate: number;
  cashRatio: number;
  receivablesRatio: number;
  inventoryRatio: number;
  fixedAssetsRatio: number;
  suppliersRatio: number;
  shortLoansRatio: number;
  longLoansRatio: number;
  [key: string]: any;
}

export interface CreditYearlyEditorProps {
  yearsData: Record<number, FiscalYearData>;
  activeYear?: number;
  selectedYear?: number;
  onUpdateYearData: ((year: number, field: any, value?: any) => void) | any;
  sector?: 'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES' | string;
  onSectorChange?: (sector: any) => void;
  onApplyPresetToAllYears?: () => void;
  onRollForwardFromPreviousYear?: (targetYear: number) => void;
  onRollForwardAllYears?: () => void;
  [key: string]: any;
}

export const CreditYearlyEditor: React.FC<CreditYearlyEditorProps> = ({
  yearsData,
  activeYear,
  onUpdateYearData,
  sector,
  onSectorChange,
  onApplyPresetToAllYears,
  onRollForwardFromPreviousYear,
  onRollForwardAllYears,
}) => {
  const current = yearsData[activeYear] || ({ sales: 0, paidUpCapital: 0 } as FiscalYearData);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              معايرة المؤشرات والافتراضات المالية للسنة ({activeYear})
            </h3>
            <p className="text-[11px] text-slate-500">
              تعديل المبيعات ورأس المال ونسب التكلفة والربحية القطاعية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="COMMERCIAL">القطاع التجاري والتوزيع</option>
            <option value="INDUSTRIAL">القطاع الصناعي والإنتاجي</option>
            <option value="CONTRACTING">قطاع المقاولات والتشييد</option>
            <option value="SERVICES">قطاع الخدمات والاستشارات</option>
          </select>

          {onApplyPresetToAllYears && (
            <button
              type="button"
              onClick={onApplyPresetToAllYears}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تطبيق نسب القطاع</span>
            </button>
          )}

          {onRollForwardFromPreviousYear && (
            <button
              type="button"
              onClick={() => onRollForwardFromPreviousYear(activeYear)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>ترحيل أرصدة افتتاحية من العام السابق</span>
            </button>
          )}

          {onRollForwardAllYears && (
            <button
              type="button"
              onClick={onRollForwardAllYears}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold cursor-pointer"
            >
              ربط تسلسلي لكافة السنوات
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
            صافي المبيعات والإيرادات ({formatEgyptianCurrency(current.sales)})
          </label>
          <input
            type="number"
            value={current.sales || 0}
            onChange={(e) => onUpdateYearData(activeYear, 'sales', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
            رأس المال المدفوع ({formatEgyptianCurrency(current.paidUpCapital)})
          </label>
          <input
            type="number"
            value={current.paidUpCapital || 0}
            onChange={(e) => onUpdateYearData(activeYear, 'paidUpCapital', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
            نسبة تكلفة المبيعات ({current.cogsRatio || 0}%)
          </label>
          <input
            type="number"
            step="0.5"
            value={current.cogsRatio || 0}
            onChange={(e) => onUpdateYearData(activeYear, 'cogsRatio', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
            النقدية والأرصدة البنكية ({formatEgyptianCurrency(current.cash)})
          </label>
          <input
            type="number"
            value={current.cash || 0}
            onChange={(e) => onUpdateYearData(activeYear, 'cash', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
          />
        </div>
      </div>
    </div>
  );
};
