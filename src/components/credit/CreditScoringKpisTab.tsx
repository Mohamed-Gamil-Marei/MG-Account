import React, { useState } from 'react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  TrendingUp,
  Percent,
  Layers,
  Scale,
  Download,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CreditScoringKpisTabProps {
  yearsData: Record<number, any>;
  yearsList: number[];
  computedData: Record<number, any>;
  companyName?: string;
}

export const CreditScoringKpisTab: React.FC<CreditScoringKpisTabProps> = ({
  yearsData,
  yearsList,
  computedData,
  companyName = 'شركة العميل',
}) => {
  const [modelType, setModelType] = useState<'MANUFACTURING' | 'NON_MANUFACTURING'>('NON_MANUFACTURING');
  const [annualDebtPrincipalRate, setAnnualDebtPrincipalRate] = useState<number>(20); // 20% of long term debt paid per year

  // Calculate Altman Z-score & Banking Ratios for all years
  const metricsByYear = yearsList.reduce((acc, yr) => {
    const c = computedData[yr] || {};
    const sales = c.sales || 1;
    const totalAssets = c.totalAssets || 1;
    const currentAssets = c.currentAssets || 0;
    const currentLiab = c.currentLiabilities || 1;
    const workingCapital = currentAssets - currentLiab;
    const netProfit = c.netProfit || 0;
    const ebit = c.ebit || 0;
    const ebitda = c.ebitda || 0;
    const financeExp = c.financeExp || 1;
    const totalLiab = c.totalLiabilities || 1;
    const equity = c.equity || 1;
    const inventory = c.inventory || 0;
    const cash = c.cash || 0;
    const receivables = c.receivables || 0;

    // Altman variables
    const x1 = workingCapital / totalAssets; // Working Capital / Total Assets
    const x2 = (netProfit * 1.5) / totalAssets; // Retained Earnings / Total Assets
    const x3 = ebit / totalAssets; // EBIT / Total Assets
    const x4 = equity / totalLiab; // Book Value Equity / Total Liabilities
    const x5 = sales / totalAssets; // Sales / Total Assets

    let zScore = 0;
    let safeMin = 2.99;
    let distressMax = 1.81;

    if (modelType === 'MANUFACTURING') {
      // Original Altman Z-score formula (Manufacturing)
      zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
      safeMin = 2.99;
      distressMax = 1.81;
    } else {
      // Altman Z'-Score for Private / Services / Non-manufacturing
      // Z' = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4
      zScore = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
      safeMin = 2.60;
      distressMax = 1.10;
    }

    // Springate Model: S = 1.03*A + 3.07*B + 0.66*C + 0.4*D
    const springateScore = 1.03 * x1 + 3.07 * (ebit / totalAssets) + 0.66 * (c.ebt / currentLiab) + 0.4 * x5;

    // Banking Debt Ratios
    const estimatedAnnualPrincipal = (c.longLoans || 0) * (annualDebtPrincipalRate / 100);
    const totalDebtService = estimatedAnnualPrincipal + financeExp;
    const dscr = totalDebtService > 0 ? ebitda / totalDebtService : ebitda / (financeExp || 1);
    const icr = financeExp > 0 ? ebit / financeExp : 99;
    const currentRatio = currentLiab > 0 ? currentAssets / currentLiab : 0;
    const quickRatio = currentLiab > 0 ? (currentAssets - inventory) / currentLiab : 0;
    const debtToEquity = equity > 0 ? totalLiab / equity : 0;
    const roe = equity > 0 ? (netProfit / equity) * 100 : 0;
    const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
    const dso = sales > 0 ? (receivables / sales) * 365 : 0;

    // Qualitative Zone
    let zone: 'SAFE' | 'GRAY' | 'DISTRESS' = 'SAFE';
    if (zScore >= safeMin) {
      zone = 'SAFE';
    } else if (zScore >= distressMax) {
      zone = 'GRAY';
    } else {
      zone = 'DISTRESS';
    }

    // Bank Credit Grade
    let grade = 'BBB';
    let gradeDescription = 'جدارة ائتمانية متوسطة ومقبولة مصرفياً';
    if (zScore >= 4.0 && dscr >= 1.8 && currentRatio >= 1.8) {
      grade = 'AAA';
      gradeDescription = 'جدارة استثنائية من الدرجة الأولى (مخاطر معدومة)';
    } else if (zScore >= safeMin && dscr >= 1.4 && currentRatio >= 1.4) {
      grade = 'AA';
      gradeDescription = 'جدارة ائتمانية ممتازة وملاءة مالية قوية';
    } else if (zScore >= safeMin && dscr >= 1.2) {
      grade = 'A';
      gradeDescription = 'جدارة جيدة وتدفقات نقدية مطمئنة';
    } else if (zScore >= distressMax && dscr >= 1.1) {
      grade = 'BBB';
      gradeDescription = 'جدارة مقبولة تتطلب متابعة دورية ومستندات تعزيز';
    } else if (zScore >= distressMax) {
      grade = 'BB';
      gradeDescription = 'جدارة حذرة ذات مخاطر مضاربة معتدلة';
    } else {
      grade = 'CCC';
      gradeDescription = 'عالية المخاطر - احتمالية تعثر مالي مرتفعة';
    }

    acc[yr] = {
      x1,
      x2,
      x3,
      x4,
      x5,
      zScore,
      safeMin,
      distressMax,
      zone,
      springateScore,
      dscr,
      icr,
      currentRatio,
      quickRatio,
      debtToEquity,
      roe,
      roa,
      dso,
      grade,
      gradeDescription,
    };
    return acc;
  }, {} as Record<number, any>);

  const handleExportExcel = () => {
    const rows: any[] = [];
    yearsList.forEach((yr) => {
      const m = metricsByYear[yr];
      const c = computedData[yr];
      rows.push({
        'السنة المالية': yr,
        'مبيعات الشركة (ج.م)': c.sales,
        'إجمالي الأصول (ج.م)': c.totalAssets,
        'حقوق الملكية (ج.م)': c.equity,
        'صافي الربح (ج.م)': c.netProfit,
        'Altman Z-Score': m.zScore.toFixed(2),
        'نطاق السلامة المالية': m.zone === 'SAFE' ? 'منطقة آمنة (Safe)' : m.zone === 'GRAY' ? 'المنطقة الرمادية (Gray)' : 'منطقة الخطر (Distress)',
        'مؤشر تغطية خدمة الدين (DSCR)': `${m.dscr.toFixed(2)}x`,
        'مؤشر تغطية الفوائد (ICR)': `${m.icr.toFixed(2)}x`,
        'نسبة التداول (Current Ratio)': `${m.currentRatio.toFixed(2)}x`,
        'نسبة السيولة السريعة (Quick Ratio)': `${m.quickRatio.toFixed(2)}x`,
        'نسبة الرافعة المالية (D/E)': `${m.debtToEquity.toFixed(2)}x`,
        'العائد على حقوق الملكية (ROE)': `${m.roe.toFixed(1)}%`,
        'العائد على الأصول (ROA)': `${m.roa.toFixed(1)}%`,
        'التصنيف الائتماني المصرفي': m.grade,
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقييم الائتماني والمصرفي');
    XLSX.writeFile(wb, `تقرير_التقييم_الائتماني_المصرفي_Altman_Z.xlsx`);
  };

  const latestYear = yearsList[yearsList.length - 1] || 2026;
  const latestMetric = metricsByYear[latestYear] || {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                منظومة التقييم الائتماني المصرفي والتنبؤ بالتعثر المالي (Altman Z-Score & Banking Ratios)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحليل رياضي معتمد لقرارات لجان الائتمان بالبنوك المصرية ومطابقة معايير الملاءة والتصنيف الائتماني.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setModelType('NON_MANUFACTURING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modelType === 'NON_MANUFACTURING'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              خدمي / تجاري (Z'-Score)
            </button>
            <button
              type="button"
              onClick={() => setModelType('MANUFACTURING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modelType === 'MANUFACTURING'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              صناعي وإنتاجي (Z-Score)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>تصدير إكسيل</span>
          </button>
        </div>
      </div>

      {/* Primary Latest Year Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Altman Z-Score Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">مؤشر Altman Z-Score ({latestYear})</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-slate-900">
              {latestMetric.zScore?.toFixed(2) || '0.00'}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                latestMetric.zone === 'SAFE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : latestMetric.zone === 'GRAY'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {latestMetric.zone === 'SAFE' ? 'منطقة آمنة (Safe)' : latestMetric.zone === 'GRAY' ? 'منطقة رمادية (Gray)' : 'منطقة تعثر (Distress)'}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            حد الأمان المصرفي: {latestMetric.safeMin} | حد التعثر: {latestMetric.distressMax}
          </div>
        </div>

        {/* DSCR Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">تغطية خدمة الدين (DSCR)</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-blue-950">
              {latestMetric.dscr?.toFixed(2)}x
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                latestMetric.dscr >= 1.3
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {latestMetric.dscr >= 1.3 ? 'تغطية كافية ✓' : 'تغطية حرجة'}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            المعيار المصرفي المستهدف: ≥ 1.30x (EBITDA / أعباء الدين)
          </div>
        </div>

        {/* Current Ratio Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">نسبة التداول (Current Ratio)</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-emerald-950">
              {latestMetric.currentRatio?.toFixed(2)}x
            </span>
            <span className="text-xs font-bold text-slate-500">
              سيولة سريعة: {latestMetric.quickRatio?.toFixed(2)}x
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            المعيار المصرفي: 1.50x - 2.00x للأصول والخصوم المتداولة
          </div>
        </div>

        {/* Bank Rating Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-1">
            <span className="font-bold">التصنيف المصرفي المقدر</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-amber-400">
              {latestMetric.grade}
            </span>
            <span className="text-xs font-bold text-indigo-200">
              تصنيف استثماري
            </span>
          </div>
          <div className="mt-3 text-[11px] text-indigo-200 leading-tight">
            {latestMetric.gradeDescription}
          </div>
        </div>
      </div>

      {/* Comparative Multi-Year Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-700" />
            <span>جدول مقارنة مؤشرات الجدارة والنسب المصرفية للسنوات ({yearsList.join(' - ')})</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            النموذج النشط: {modelType === 'MANUFACTURING' ? 'صناعي وإنتاجي' : 'تجاري وخدمي'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">المؤشر المالي / النسبة المصرفية</th>
                <th className="py-3 px-3 text-center">المعيار المصرفي المستهدف</th>
                {yearsList.map((yr) => (
                  <th key={yr} className="py-3 px-3 font-mono text-left">
                    سنة {yr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Altman Z-Score */}
              <tr className="bg-indigo-50/40 font-bold">
                <td className="py-3 px-4 text-indigo-950">مؤشر Altman Z-Score النهائي</td>
                <td className="py-3 px-3 text-center text-[11px] text-indigo-800">&gt; 2.99 آمن / &lt; 1.81 تعثر</td>
                {yearsList.map((yr) => {
                  const m = metricsByYear[yr];
                  return (
                    <td key={yr} className="py-3 px-3 font-mono text-left text-sm">
                      <span
                        className={`px-2 py-0.5 rounded font-black ${
                          m.zone === 'SAFE'
                            ? 'text-emerald-800 bg-emerald-100'
                            : m.zone === 'GRAY'
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-rose-800 bg-rose-100'
                        }`}
                      >
                        {m.zScore.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Components Breakdown */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">X1: رأس المال العامل / إجمالي الأصول (WC / TA)</td>
                <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">&gt; 0.20</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-700">
                    {(metricsByYear[yr].x1 * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-600">X2: الأرباح المحتجزة / إجمالي الأصول (RE / TA)</td>
                <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">&gt; 0.15</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-700">
                    {(metricsByYear[yr].x2 * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-600">X3: الأرباح التشغيلية / إجمالي الأصول (EBIT / TA)</td>
                <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">&gt; 0.10</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-700">
                    {(metricsByYear[yr].x3 * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-600">X4: القيمة الدفترية للملكية / إجمالي الخصوم (Equity / Liabilities)</td>
                <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">&gt; 0.60</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-700">
                    {(metricsByYear[yr].x4 * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {modelType === 'MANUFACTURING' && (
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">X5: المبيعات / إجمالي الأصول (معدل دوران الأصول)</td>
                  <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">&gt; 1.00x</td>
                  {yearsList.map((yr) => (
                    <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-700">
                      {metricsByYear[yr].x5.toFixed(2)}x
                    </td>
                  ))}
                </tr>
              )}

              {/* Banking DSCR & Ratios Section */}
              <tr className="bg-slate-50 font-bold text-slate-800">
                <td colSpan={2 + yearsList.length} className="py-2 px-4 text-xs">
                  مؤشرات الملاءة وخدمة الدين المصرفية (Bank Lending & Coverage Ratios)
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-bold text-slate-800">مؤشر تغطية خدمة الدين (DSCR)</td>
                <td className="py-2.5 px-3 text-center text-emerald-800 font-bold text-[11px]">≥ 1.30x</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono font-bold text-left text-blue-900">
                    {metricsByYear[yr].dscr.toFixed(2)}x
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">مؤشر تغطية الفوائد التمويلية (ICR)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">≥ 3.00x</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-800">
                    {metricsByYear[yr].icr.toFixed(2)}x
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">نسبة التداول الحالية (Current Ratio)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">1.50x - 2.00x</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-800">
                    {metricsByYear[yr].currentRatio.toFixed(2)}x
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">نسبة السيولة السريعة (Quick Ratio)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">≥ 1.00x</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-800">
                    {metricsByYear[yr].quickRatio.toFixed(2)}x
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">نسبة الرافعة المالية والمديونية (D/E)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">≤ 1.50x</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-800">
                    {metricsByYear[yr].debtToEquity.toFixed(2)}x
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">العائد على حقوق الملكية (ROE)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">&gt; 15%</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-emerald-800 font-bold">
                    {metricsByYear[yr].roe.toFixed(1)}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-4 text-slate-700">متوسط فترة التحصيل بالأيام (DSO)</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">≤ 90 يوم</td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-2.5 px-3 font-mono text-left text-slate-800">
                    {Math.round(metricsByYear[yr].dso)} يوم
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Committee Recommendation Box */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-base font-black">
              مذكرة التوصية الائتمانية للجنة التسهيلات المصرفية (Bank Credit Committee Memo)
            </h4>
          </div>
          <span className="text-xs bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-800">
            توصية إيجابية: مؤهلة للحصول على تسهيلات ائتمانية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-1">
            <span className="font-bold text-amber-400 block text-xs">سقف التسهيل المقترح (Borrowing Limit):</span>
            <p className="text-slate-200">
              تصل الطاقة الاقتراضية الآمنة إلى <strong className="font-bold text-white">{(computedData[latestYear]?.sales * 0.3).toLocaleString('ar-EG')} ج.م</strong> بنسبة 30% من المبيعات السنوية، مدعومة بمؤشر تغطية دين قوي ({latestMetric.dscr?.toFixed(2)}x).
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-1">
            <span className="font-bold text-emerald-400 block text-xs">هيكل التسهيل الائتماني المقترح:</span>
            <p className="text-slate-200">
              - 60% سحب على المكشوف أو جاري مدين لتمويل دورة رأس المال العامل والمشتريات.
              <br />
              - 40% اعتمادات مستندية وخطابات ضمان ابتدائية ونهائية للعمليات والمناقصات.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-1">
            <span className="font-bold text-blue-400 block text-xs">الضمانات والتعهدات المصرفية المطلوبة:</span>
            <p className="text-slate-200">
              - كفالة تضامنية وشخصية من الشركاء الرئيسيين.
              <br />
              - التنازل عن مستحقات أوامر التوريد والعقود لصالح البنك.
              <br />
              - تقديم قوائم مالية سنوية مدققة من محاسب قانوني معتمد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
