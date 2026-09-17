import React from 'react';
import {
  TrendingUp,
  Scale,
  ShieldCheck,
  Percent,
  Edit3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from 'lucide-react';
import { SmartCpaYearData } from '../../services/smartCpaTemplateService';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface SmartCpaMultiYearComparisonProps {
  yearsData: Record<number, SmartCpaYearData>;
  onSelectYear: (year: number) => void;
  onExportExcel: () => void;
}

export const SmartCpaMultiYearComparison: React.FC<SmartCpaMultiYearComparisonProps> = ({
  yearsData,
  onSelectYear,
  onExportExcel,
}) => {
  const sortedYears = Object.keys(yearsData)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedYears.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        لا توجد سنوات مسجلة للعرض المقارن.
      </div>
    );
  }

  // Calculate year-over-year sales growth
  const getSalesGrowth = (currYear: number, prevYear?: number) => {
    if (!prevYear || !yearsData[prevYear] || !yearsData[currYear]) return null;
    const prevSales = yearsData[prevYear].sales;
    const currSales = yearsData[currYear].sales;
    if (!prevSales || prevSales === 0) return null;
    return ((currSales - prevSales) / prevSales) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>عرض المقارنة الأفقية الشاملة للسنوات المالية ({sortedYears.join(' - ')})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            مقارنة أفقية متكاملة لجميع القوائم والنسب المالية ونمو المبيعات بأسلوب واضح ومريح للعين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير إكسيل المقارن</span>
          </button>
        </div>
      </div>

      {/* Main Comparative Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 w-1/4">
                  البيان / البند المالي
                </th>
                {sortedYears.map((yr, idx) => {
                  const isManual = yearsData[yr]?.isManualMode;
                  return (
                    <th
                      key={yr}
                      className="py-3 px-4 font-bold text-slate-800 dark:text-white text-center border-r border-slate-200/60 dark:border-slate-700/60"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm">{yr}</span>
                        {isManual ? (
                          <span
                            title="إدخال يدوي"
                            className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded"
                          >
                            يدوي
                          </span>
                        ) : (
                          <span
                            title="ذكي تلقائي"
                            className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded"
                          >
                            ذكي
                          </span>
                        )}
                        <button
                          onClick={() => onSelectYear(yr)}
                          title={`الانتقال لتعديل سنة ${yr}`}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* SECTION: INCOME STATEMENT */}
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-emerald-900 dark:text-emerald-200">
                <td colSpan={sortedYears.length + 1} className="py-2.5 px-4 text-xs">
                  أولاً: قائمة الدخل والأرباح المقارنة
                </td>
              </tr>

              {/* Sales */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  صافي المبيعات والإيرادات
                </td>
                {sortedYears.map((yr, idx) => {
                  const d = yearsData[yr];
                  const growth = idx > 0 ? getSalesGrowth(yr, sortedYears[idx - 1]) : null;
                  return (
                    <td
                      key={yr}
                      className="py-2.5 px-4 text-center font-bold font-mono text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800"
                    >
                      <div>{formatEgyptianCurrency(d.sales)}</div>
                      {growth !== null && (
                        <div
                          className={`text-[10px] inline-flex items-center gap-0.5 font-bold mt-0.5 ${
                            growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {growth >= 0 ? (
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          ) : (
                            <ArrowDownRight className="w-2.5 h-2.5" />
                          )}
                          <span>{growth.toFixed(1)}% نمو سنوي</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Cost of Sales */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-rose-600 dark:text-rose-400">
                <td className="py-2 px-4">
                  تكلفة المبيعات (خام + تشغيل + تام)
                </td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    ({formatEgyptianCurrency(yearsData[yr].costOfSales)})
                  </td>
                ))}
              </tr>

              {/* Gross Profit */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-950/10 font-bold text-emerald-800 dark:text-emerald-300">
                <td className="py-2.5 px-4">مجمل الربح (وهامش الربح %)</td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const margin = ((d.grossProfit / (d.sales || 1)) * 100).toFixed(1);
                  return (
                    <td
                      key={yr}
                      className="py-2.5 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                    >
                      <div>{formatEgyptianCurrency(d.grossProfit)}</div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                        هامش {margin}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Operating Expenses */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                <td className="py-2 px-4">المصروفات الإدارية والعمومية (الموزعة)</td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const expRatio = ((d.operatingExpenses / (d.sales || 1)) * 100).toFixed(1);
                  return (
                    <td
                      key={yr}
                      className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                    >
                      <div>({formatEgyptianCurrency(d.operatingExpenses)})</div>
                      <span className="text-[10px] text-slate-400 block">
                        عبء {expRatio}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Depreciation */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-500">
                <td className="py-2 px-4">إهلاك الأصول الثابتة</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    ({formatEgyptianCurrency(yearsData[yr].depreciationExpense)})
                  </td>
                ))}
              </tr>

              {/* Profit Before Tax */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-semibold">
                <td className="py-2 px-4">صافي الربح قبل الضريبة</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].netProfitBeforeTax)}
                  </td>
                ))}
              </tr>

              {/* Tax */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-amber-600 dark:text-amber-400">
                <td className="py-2 px-4">ضريبة الدخل المستحقة (22.5%)</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    ({formatEgyptianCurrency(yearsData[yr].taxAmount)})
                  </td>
                ))}
              </tr>

              {/* Net Profit After Tax */}
              <tr className="bg-emerald-600 text-white font-bold">
                <td className="py-2.5 px-4">صافي أرباح العام بعد الضريبة</td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const netMargin = ((d.netProfitAfterTax / (d.sales || 1)) * 100).toFixed(1);
                  return (
                    <td
                      key={yr}
                      className="py-2.5 px-4 text-center font-mono border-r border-emerald-500/40"
                    >
                      <div className="text-sm">{formatEgyptianCurrency(d.netProfitAfterTax)}</div>
                      <span className="text-[10px] text-emerald-100 font-semibold block">
                        صافي هامش {netMargin}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* SECTION: BALANCE SHEET */}
              <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-blue-900 dark:text-blue-200">
                <td colSpan={sortedYears.length + 1} className="py-2.5 px-4 text-xs">
                  ثانياً: قائمة المركز المالي المقارنة (كما في 31 ديسمبر)
                </td>
              </tr>

              {/* Non-current Assets */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">الأصول غير المتداولة (صافي بعد الإهلاك)</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].nonCurrentAssets)}
                  </td>
                ))}
              </tr>

              {/* Receivables */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">العملاء والمدينون</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].accountsReceivable)}
                  </td>
                ))}
              </tr>

              {/* Cash */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">نقدية بالصندوق والبنوك</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].cashAndBanks)}
                  </td>
                ))}
              </tr>

              {/* Inventory */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">مخزون آخر المدة (18%)</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].inventoryClosing)}
                  </td>
                ))}
              </tr>

              {/* Total Assets */}
              <tr className="bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-900 dark:text-blue-200">
                <td className="py-2.5 px-4">إجمالي الأصول</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2.5 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800 text-sm"
                  >
                    {formatEgyptianCurrency(yearsData[yr].totalAssets)}
                  </td>
                ))}
              </tr>

              {/* Paid-up capital */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">رأس المال المدفوع</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].paidUpCapital)}
                  </td>
                ))}
              </tr>

              {/* Partners current account */}
              <tr className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 font-semibold text-emerald-800 dark:text-emerald-300">
                <td className="py-2 px-4">جاري صاحب الشأن / الشركاء (الاتزان)</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].partnersCurrentAccount)}
                  </td>
                ))}
              </tr>

              {/* Year Profit */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">أرباح العام المرحلة</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].currentYearProfit)}
                  </td>
                ))}
              </tr>

              {/* Total Equity */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-semibold">
                <td className="py-2 px-4">إجمالي حقوق الملكية</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].totalEquity)}
                  </td>
                ))}
              </tr>

              {/* Current Liabilities */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                <td className="py-2 px-4">الالتزامات المتداولة (الموردين والدائنون)</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                  >
                    {formatEgyptianCurrency(yearsData[yr].totalCurrentLiabilities)}
                  </td>
                ))}
              </tr>

              {/* Total Liabilities & Equity */}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="py-2.5 px-4">إجمالي حقوق الملكية والالتزامات</td>
                {sortedYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2.5 px-4 text-center font-mono border-r border-slate-700 text-sm"
                  >
                    {formatEgyptianCurrency(yearsData[yr].totalLiabilitiesAndEquity)}
                  </td>
                ))}
              </tr>

              {/* Balance Check */}
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <td className="py-2 px-4 font-bold text-slate-600 dark:text-slate-400">
                  حالة الاتزان المحاسبي
                </td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const diff = Math.abs(d.totalAssets - d.totalLiabilitiesAndEquity);
                  return (
                    <td
                      key={yr}
                      className="py-2 px-4 text-center border-r border-slate-100 dark:border-slate-800"
                    >
                      {diff < 1 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          متزنة 100% (صفر)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600">
                          فارق {formatEgyptianCurrency(diff)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* SECTION: RATIOS */}
              <tr className="bg-purple-50/50 dark:bg-purple-950/20 font-bold text-purple-900 dark:text-purple-200">
                <td colSpan={sortedYears.length + 1} className="py-2.5 px-4 text-xs">
                  ثالثاً: المؤشرات المالية والائتمانية البنكية المقارنة
                </td>
              </tr>

              {/* Current Ratio */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">
                  نسبة التداول (Current Ratio) - المعيار الآمن &gt; 1.2
                </td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const curAssets = d.accountsReceivable + d.cashAndBanks + d.inventoryClosing;
                  const ratio = curAssets / (d.totalCurrentLiabilities || 1);
                  return (
                    <td
                      key={yr}
                      className="py-2 px-4 text-center font-bold font-mono border-r border-slate-100 dark:border-slate-800"
                    >
                      <span className={ratio >= 1.2 ? 'text-emerald-600' : 'text-amber-600'}>
                        {ratio.toFixed(2)}x
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Debt to Equity */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2 px-4">
                  نسبة المديونية لحقوق الملكية (Debt to Equity)
                </td>
                {sortedYears.map((yr) => {
                  const d = yearsData[yr];
                  const deRatio = (d.totalCurrentLiabilities / (d.totalEquity || 1)) * 100;
                  return (
                    <td
                      key={yr}
                      className="py-2 px-4 text-center font-mono border-r border-slate-100 dark:border-slate-800"
                    >
                      {deRatio.toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
