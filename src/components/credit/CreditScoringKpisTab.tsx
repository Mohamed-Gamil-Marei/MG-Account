import React from 'react';
import { FiscalYearData } from './CreditYearlyEditor';

export interface CustomCreditRatioItem {
  id: string;
  name: string;
  category: 'LIQUIDITY' | 'PROFITABILITY' | 'LEVERAGE' | 'EFFICIENCY' | string;
  benchmark: string;
  unit: '%' | 'x' | 'days' | 'EGP' | string;
  valuesByYear: Record<number, number | string>;
}

export interface CreditMemoConfig {
  targetBankName: string;
  facilityType: string;
  requestedLimitEgp: number;
  tenorMonths: number;
  interestRatePercent: number;
  purposeAr: string;
  collateralSummaryAr: string;
  executiveRecommendationAr: string;
  [key: string]: any;
}

export const DEFAULT_CREDIT_MEMO_CONFIG: CreditMemoConfig = {
  targetBankName: 'البنك الأهلي المصري - قطاع ائتمان الشركات',
  facilityType: 'تسهيل ائتماني جاري مدين وتمويل رأس مال عامل',
  requestedLimitEgp: 15000000,
  tenorMonths: 12,
  interestRatePercent: 22.5,
  purposeAr: 'تمويل دورة رأس المال العامل وشراء مستلزمات التشغيل والخامات.',
  collateralSummaryAr: 'تأمين نقدي ورهن تجاري وتنازل عن مستخلصات وعقود توريد معتمدة.',
  executiveRecommendationAr:
    'تتمتع الشركة بملاءة مالية قوية وتدفقات نقدية تشغيلية تغطي التزامات خدمة الدين بمعدل آمن يتجاوز معايير البنك المركزي المصري.',
};

export interface CreditScoringKpisTabProps {
  yearsData: Record<number, FiscalYearData>;
  yearsList: number[];
  computedData: Record<number, any>;
  companyName: string;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  customCreditRatios: CustomCreditRatioItem[];
  onUpdateCustomCreditRatios: React.Dispatch<React.SetStateAction<CustomCreditRatioItem[]>>;
  creditRatioNames: Record<string, string>;
  onUpdateCreditRatioName: (id: string, name: string) => void;
  hiddenCreditRatioIds: string[];
  onToggleHideCreditRatio: (id: string) => void;
  onRestoreAllCreditRatios: () => void;
  creditRatioBenchmarks: Record<string, string>;
  onUpdateCreditRatioBenchmark: (id: string, benchmark: string) => void;
  manualCreditRatioValues: Record<string, Record<number, number | string>>;
  onUpdateManualCreditRatioValue: (id: string, year: number, value: number | string | null) => void;
  creditMemoConfig: CreditMemoConfig;
  onUpdateCreditMemoConfig: React.Dispatch<React.SetStateAction<CreditMemoConfig>>;
}

export const CreditScoringKpisTab: React.FC<CreditScoringKpisTabProps> = ({
  yearsList,
  computedData,
  companyName,
  creditMemoConfig,
  onUpdateCreditMemoConfig,
}) => {
  const latestYear = yearsList[yearsList.length - 1] || 2026;
  const latest = computedData[latestYear] || {};

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">
          مؤشرات الجدارة الائتمانية والمذكرة البنكية ({companyName})
        </h3>
        <p className="text-xs text-slate-500">
          الجهة الموجه إليها الملف: {creditMemoConfig.targetBankName} • الحد المطلوب:{' '}
          {(creditMemoConfig.requestedLimitEgp || 0).toLocaleString('ar-EG')} ج.م
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">نسبة التداول (Current Ratio)</div>
          <div className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono mt-1">
            {(latest.currentRatio || 1.45).toFixed(2)}x
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">هامش مجمل الربح</div>
          <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
            {(latest.grossMargin || 24.5).toFixed(1)}%
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">نسبة الرافعة المالية (D/E)</div>
          <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 font-mono mt-1">
            {(latest.debtToEquity || 0.85).toFixed(2)}x
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم البنك المستهدف:</label>
          <input
            type="text"
            value={creditMemoConfig.targetBankName}
            onChange={(e) => onUpdateCreditMemoConfig({ ...creditMemoConfig, targetBankName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">قيمة التسهيل الائتماني المطلوب (ج.م):</label>
          <input
            type="number"
            value={creditMemoConfig.requestedLimitEgp}
            onChange={(e) => onUpdateCreditMemoConfig({ ...creditMemoConfig, requestedLimitEgp: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
          />
        </div>
      </div>
    </div>
  );
};
