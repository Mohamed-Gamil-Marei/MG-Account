import React from 'react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface FixedAssetYearValues {
  costStart: number;
  additions: number;
  disposals: number;
  accumStart: number;
  accumDisposals?: number;
  customDepExpense?: number;
}

export interface FixedAssetCategoryItem {
  id: string;
  name: string;
  depRate: number;
  valuesByYear: Record<number, FixedAssetYearValues>;
}

export const DEFAULT_ASSET_CATEGORIES: FixedAssetCategoryItem[] = [
  {
    id: 'cat-land',
    name: 'الأراضي والمواقع الصناعية',
    depRate: 0,
    valuesByYear: {
      2024: { costStart: 2000000, additions: 0, disposals: 0, accumStart: 0 },
      2025: { costStart: 2000000, additions: 0, disposals: 0, accumStart: 0 },
      2026: { costStart: 2000000, additions: 0, disposals: 0, accumStart: 0 },
    },
  },
  {
    id: 'cat-buildings',
    name: 'المباني والإنشاءات والمرافق',
    depRate: 5,
    valuesByYear: {
      2024: { costStart: 3500000, additions: 0, disposals: 0, accumStart: 350000 },
      2025: { costStart: 3500000, additions: 250000, disposals: 0, accumStart: 525000 },
      2026: { costStart: 3750000, additions: 0, disposals: 0, accumStart: 712500 },
    },
  },
  {
    id: 'cat-machinery',
    name: 'الآلات والمعدات وخطوط الإنتاج',
    depRate: 15,
    valuesByYear: {
      2024: { costStart: 4200000, additions: 300000, disposals: 0, accumStart: 840000 },
      2025: { costStart: 4500000, additions: 500000, disposals: 0, accumStart: 1515000 },
      2026: { costStart: 5000000, additions: 400000, disposals: 0, accumStart: 2265000 },
    },
  },
  {
    id: 'cat-vehicles',
    name: 'وسائل النقل والانتقال والشاحنات',
    depRate: 20,
    valuesByYear: {
      2024: { costStart: 1200000, additions: 0, disposals: 0, accumStart: 240000 },
      2025: { costStart: 1200000, additions: 300000, disposals: 0, accumStart: 480000 },
      2026: { costStart: 1500000, additions: 0, disposals: 0, accumStart: 780000 },
    },
  },
];

export interface CreditFixedAssetsTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  assetCategories: FixedAssetCategoryItem[];
  onUpdateAssetCategories: React.Dispatch<React.SetStateAction<FixedAssetCategoryItem[]>>;
  onResetAssets: () => void;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
}

export const CreditFixedAssetsTab: React.FC<CreditFixedAssetsTabProps> = ({
  yearsList,
  assetCategories,
  onResetAssets,
}) => {
  const activeYear = yearsList[yearsList.length - 1] || 2026;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            كشف الأصول الثابتة وإهلاكاتها التفصيلي (EAS 10)
          </h3>
          <p className="text-xs text-slate-500">عرض التكلفة التاريخية، الإضافات، ومجمع الإهلاك وصافي القيمة الدفترية</p>
        </div>
        <button
          type="button"
          onClick={onResetAssets}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
        >
          استعادة الفئات الافتراضية
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <th className="p-2.5 text-right border border-slate-200 dark:border-slate-700">بيان الأصل</th>
              <th className="p-2.5 text-center border border-slate-200 dark:border-slate-700">معدل الإهلاك</th>
              <th className="p-2.5 text-left border border-slate-200 dark:border-slate-700">التكلفة أول المدة</th>
              <th className="p-2.5 text-left border border-slate-200 dark:border-slate-700">الإضافات</th>
              <th className="p-2.5 text-left border border-slate-200 dark:border-slate-700">إجمالي التكلفة</th>
              <th className="p-2.5 text-left border border-slate-200 dark:border-slate-700">صافي القيمة الدفترية ({activeYear})</th>
            </tr>
          </thead>
          <tbody>
            {assetCategories.map((cat) => {
              const yr = cat.valuesByYear?.[activeYear] || { costStart: 0, additions: 0, disposals: 0, accumStart: 0 };
              const costEnd = (yr.costStart || 0) + (yr.additions || 0) - (yr.disposals || 0);
              const dep = yr.customDepExpense ?? Math.round(costEnd * ((cat.depRate || 0) / 100));
              const accumEnd = (yr.accumStart || 0) + dep - (yr.accumDisposals || 0);
              const nbv = Math.max(0, costEnd - accumEnd);
              return (
                <tr key={cat.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-2.5 font-bold text-slate-900 dark:text-white">{cat.name}</td>
                  <td className="p-2.5 text-center font-mono">{cat.depRate}%</td>
                  <td className="p-2.5 text-left font-mono">{formatEgyptianCurrency(yr.costStart)}</td>
                  <td className="p-2.5 text-left font-mono">{formatEgyptianCurrency(yr.additions)}</td>
                  <td className="p-2.5 text-left font-mono font-bold">{formatEgyptianCurrency(costEnd)}</td>
                  <td className="p-2.5 text-left font-mono font-black text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(nbv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
