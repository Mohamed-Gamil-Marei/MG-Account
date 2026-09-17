import React, { useState } from 'react';
import {
  Sliders,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  PieChart,
  Percent,
  Sparkles,
  TrendingUp,
  Repeat,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { AccountingNumberInput } from '../common/AccountingNumberInput';

export interface FiscalYearData {
  year: number;
  sales: number;
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
  // Optional explicit overrides for 2-way sync with statements and notes
  cogs?: number;
  grossProfit?: number;
  adminExp?: number;
  sellingExp?: number;
  ebit?: number;
  financeExp?: number;
  ebt?: number;
  tax?: number;
  netProfit?: number;
  cash?: number;
  receivables?: number;
  inventory?: number;
  otherDebit?: number;
  projectsInProgress?: number;
  netFixedAssets?: number;
  depreciation?: number;
  suppliers?: number;
  shortLoans?: number;
  longLoans?: number;
  otherCurrentLiab?: number;
  paidUpCapital?: number;
  legalReserve?: number;
  partnerCurrentAccount?: number;
  retainedEarningsAndProfit?: number;
}

interface CreditYearlyEditorProps {
  yearsData: Record<number, FiscalYearData>;
  activeYear: number;
  onUpdateYearData: (year: number, updated: Partial<FiscalYearData>) => void;
  sector: 'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES';
  onSectorChange: (s: 'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES') => void;
  onApplyPresetToAllYears: () => void;
  onRollForwardFromPreviousYear?: (year: number) => void;
  onRollForwardAllYears?: () => void;
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
  // Collapsed by default for a clean, non-intrusive layout
  const [isExpanded, setIsExpanded] = useState(false);
  const [ratioSection, setRatioSection] = useState<'OPERATING' | 'BALANCE_SHEET'>('OPERATING');

  const current = yearsData[activeYear] || {
    year: activeYear,
    sales: 15000000,
    cogsRatio: 75,
    adminExpRatio: 8,
    sellingExpRatio: 5,
    financeExpRatio: 3,
    taxRate: 22.5,
    cashRatio: 8,
    receivablesRatio: 22,
    inventoryRatio: 25,
    fixedAssetsRatio: 35,
    suppliersRatio: 18,
    shortLoansRatio: 12,
    longLoansRatio: 15,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden no-print">
      {/* Streamlined Compact Header / Accordion Bar */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/50 shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              محددات ونسب المحاكاة لسنة {activeYear}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono font-bold">
              المبيعات: {formatEgyptianCurrency(current.sales)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRollForwardFromPreviousYear && (
            <button
              type="button"
              onClick={() => onRollForwardFromPreviousYear(activeYear)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title={`ترحيل الثوابت ومجمع الإهلاك وحقوق الملكية من سنة ${activeYear - 1} إلى ${activeYear}`}
            >
              <Repeat className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">ترحيل من ({activeYear - 1})</span>
              <span className="sm:hidden">ترحيل</span>
            </button>
          )}

          <button
            type="button"
            onClick={onApplyPresetToAllYears}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="تعميم معايير هذا القطاع ونسبه على كافة السنوات المالية"
          >
            <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">تطبيق على كافة السنوات</span>
            <span className="sm:hidden">تعميم</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isExpanded
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>{isExpanded ? 'إخفاء المحددات' : 'تعديل المحددات والنسب'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
          {/* Main Primary Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Sales Input */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                  مبيعات وإيرادات سنة {activeYear} (ج.م)
                </label>
              </div>
              <AccountingNumberInput
                value={current.sales}
                onChange={(val) => onUpdateYearData(activeYear, { sales: val })}
                allowNegative={true}
                allowDecimals={true}
                decimalPlaces={2}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
              />
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {numberToArabicWords(current.sales)}
              </div>
            </div>

            {/* Economic Sector */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <label className="block text-slate-700 dark:text-slate-300 font-bold text-[11px] mb-1">
                القطاع والنشاط الاقتصادي
              </label>
              <select
                value={sector}
                onChange={(e) => onSectorChange(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="COMMERCIAL">نشاط تجاري وتوزيع</option>
                <option value="INDUSTRIAL">نشاط صناعي وإنتاجي</option>
                <option value="CONTRACTING">مقاولات وتشييد وبناء</option>
                <option value="SERVICES">خدمي واستشارات وتوريدات</option>
              </select>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                تحديد المعايير والنسب الاسترشادية للنشاط
              </div>
            </div>

            {/* Tax Rate */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <label className="block text-slate-700 dark:text-slate-300 font-bold text-[11px] mb-1">
                معدل ضريبة الدخل (%)
              </label>
              <div className="flex items-center gap-1.5">
                <AccountingNumberInput
                  value={current.taxRate}
                  onChange={(val) => onUpdateYearData(activeYear, { taxRate: val })}
                  allowNegative={false}
                  allowDecimals={true}
                  decimalPlaces={2}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-mono font-bold">
                  %
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                القانون 91 لسنة 2005 وتعديلاته (22.5%)
              </div>
            </div>
          </div>

          {/* Section Switcher for Ratios (Operating vs Balance Sheet) */}
          <div className="pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRatioSection('OPERATING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    ratioSection === 'OPERATING'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>نسب التشغيل وقائمة الدخل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRatioSection('BALANCE_SHEET')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    ratioSection === 'BALANCE_SHEET'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>نسب المركز المالي والسيولة</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
                تعديل النسب بالسحب أو الإدخال الرقمي
              </span>
            </div>

            {/* Operating Ratios */}
            {ratioSection === 'OPERATING' && (
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* COGS */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">تكلفة المبيعات (COGS)</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.cogsRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { cogsRatio: val })}
                        allowNegative={true}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="0.5"
                    value={current.cogsRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { cogsRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Admin Expenses */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">المصروفات الإدارية</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.adminExpRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { adminExpRatio: val })}
                        allowNegative={true}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.25"
                    value={current.adminExpRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { adminExpRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Selling Expenses */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">المصروفات البيعية</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.sellingExpRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { sellingExpRatio: val })}
                        allowNegative={true}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="0.25"
                    value={current.sellingExpRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { sellingExpRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Finance Expenses */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">أعباء التمويل والفوائد</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.financeExpRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { financeExpRatio: val })}
                        allowNegative={true}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.25"
                    value={current.financeExpRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { financeExpRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}

            {/* Balance Sheet Ratios */}
            {ratioSection === 'BALANCE_SHEET' && (
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Cash Ratio */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">النقدية وما في حكمها</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.cashRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { cashRatio: val })}
                        allowNegative={false}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={current.cashRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { cashRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Receivables */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">العملاء والمدينون</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.receivablesRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { receivablesRatio: val })}
                        allowNegative={false}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="70"
                    step="0.5"
                    value={current.receivablesRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { receivablesRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Fixed Assets */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">صافي الأصول الثابتة</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.fixedAssetsRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { fixedAssetsRatio: val })}
                        allowNegative={false}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="0.5"
                    value={current.fixedAssetsRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { fixedAssetsRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Short Loans */}
                <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">التسهيلات والقروض</span>
                    <div className="flex items-center gap-1">
                      <AccountingNumberInput
                        value={current.shortLoansRatio}
                        onChange={(val) => onUpdateYearData(activeYear, { shortLoansRatio: val })}
                        allowNegative={false}
                        allowDecimals={true}
                        className="w-12 px-1 py-0.5 text-center font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 font-bold"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="0.5"
                    value={current.shortLoansRatio}
                    onChange={(e) => onUpdateYearData(activeYear, { shortLoansRatio: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
