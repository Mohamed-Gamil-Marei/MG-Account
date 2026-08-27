import React, { useState } from 'react';
import {
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Building,
  CheckCircle2,
  AlertCircle,
  Percent,
  Calculator,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import * as XLSX from 'xlsx';

interface CreditFinancialsSimulatorProps {
  state: DatabaseState;
}

export const CreditFinancialsSimulator: React.FC<CreditFinancialsSimulatorProps> = ({ state }) => {
  const [targetSales, setTargetSales] = useState<number>(15000000);
  const [sector, setSector] = useState<'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES'>('COMMERCIAL');
  const [cogsRatio, setCogsRatio] = useState<number>(75); // 75%
  const [adminExpRatio, setAdminExpRatio] = useState<number>(8); // 8%
  const [sellingExpRatio, setSellingExpRatio] = useState<number>(5); // 5%
  const [financeExpRatio, setFinanceExpRatio] = useState<number>(3); // 3%
  const [growthRatePrevYear, setGrowthRatePrevYear] = useState<number>(18); // 18% growth from year N-1
  const [growthRateTwoYearsAgo, setGrowthRateTwoYearsAgo] = useState<number>(15); // 15%

  // Sector preset updater
  const handleSectorChange = (s: 'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES') => {
    setSector(s);
    if (s === 'COMMERCIAL') {
      setCogsRatio(78);
      setAdminExpRatio(7);
      setSellingExpRatio(5);
      setFinanceExpRatio(2.5);
    } else if (s === 'INDUSTRIAL') {
      setCogsRatio(70);
      setAdminExpRatio(9);
      setSellingExpRatio(6);
      setFinanceExpRatio(3.5);
    } else if (s === 'CONTRACTING') {
      setCogsRatio(82);
      setAdminExpRatio(5);
      setSellingExpRatio(3);
      setFinanceExpRatio(4);
    } else if (s === 'SERVICES') {
      setCogsRatio(55);
      setAdminExpRatio(18);
      setSellingExpRatio(8);
      setFinanceExpRatio(2);
    }
  };

  // Compute Year N (Target Year)
  const salesY0 = targetSales;
  const cogsY0 = salesY0 * (cogsRatio / 100);
  const grossProfitY0 = salesY0 - cogsY0;
  const adminY0 = salesY0 * (adminExpRatio / 100);
  const sellingY0 = salesY0 * (sellingExpRatio / 100);
  const ebitY0 = grossProfitY0 - adminY0 - sellingY0;
  const financeY0 = salesY0 * (financeExpRatio / 100);
  const ebtY0 = ebitY0 - financeY0;
  const taxY0 = Math.max(0, ebtY0 * 0.225); // 22.5% Egyptian Corporate Tax
  const netProfitY0 = ebtY0 - taxY0;

  // Proportional Balance Sheet Items for Year N
  const cashY0 = salesY0 * 0.08;
  const receivablesY0 = salesY0 * 0.22; // ~80 days collection
  const inventoryY0 = cogsY0 * 0.25; // ~90 days inventory
  const otherDebitY0 = salesY0 * 0.04;
  const totalCurrentAssetsY0 = cashY0 + receivablesY0 + inventoryY0 + otherDebitY0;
  const netFixedAssetsY0 = salesY0 * 0.35;
  const totalAssetsY0 = totalCurrentAssetsY0 + netFixedAssetsY0;

  const suppliersY0 = cogsY0 * 0.18; // ~65 days payables
  const notesPayableY0 = salesY0 * 0.05;
  const shortLoansY0 = salesY0 * 0.12;
  const otherCurrentLiabY0 = taxY0 + salesY0 * 0.02;
  const totalCurrentLiabilitiesY0 = suppliersY0 + notesPayableY0 + shortLoansY0 + otherCurrentLiabY0;

  const longLoansY0 = salesY0 * 0.15;
  const totalLiabilitiesY0 = totalCurrentLiabilitiesY0 + longLoansY0;
  const totalEquityY0 = totalAssetsY0 - totalLiabilitiesY0;
  const paidUpCapitalY0 = totalEquityY0 * 0.60;
  const retainedEarningsY0 = totalEquityY0 - paidUpCapitalY0;

  // Year N-1 Simulation (Discounted by Growth Rate)
  const factorY1 = 1 / (1 + growthRatePrevYear / 100);
  const salesY1 = salesY0 * factorY1;
  const cogsY1 = salesY1 * (cogsRatio / 100);
  const grossProfitY1 = salesY1 - cogsY1;
  const ebitY1 = grossProfitY1 - salesY1 * (adminExpRatio / 100) - salesY1 * (sellingExpRatio / 100);
  const ebtY1 = ebitY1 - salesY1 * (financeExpRatio / 100);
  const taxY1 = Math.max(0, ebtY1 * 0.225);
  const netProfitY1 = ebtY1 - taxY1;
  const totalAssetsY1 = totalAssetsY0 * factorY1;
  const totalEquityY1 = totalEquityY0 * factorY1;

  // Year N-2 Simulation
  const factorY2 = factorY1 / (1 + growthRateTwoYearsAgo / 100);
  const salesY2 = salesY0 * factorY2;
  const cogsY2 = salesY2 * (cogsRatio / 100);
  const grossProfitY2 = salesY2 - cogsY2;
  const ebitY2 = grossProfitY2 - salesY2 * (adminExpRatio / 100) - salesY2 * (sellingExpRatio / 100);
  const ebtY2 = ebitY2 - salesY2 * (financeExpRatio / 100);
  const taxY2 = Math.max(0, ebtY2 * 0.225);
  const netProfitY2 = ebtY2 - taxY2;
  const totalAssetsY2 = totalAssetsY0 * factorY2;
  const totalEquityY2 = totalEquityY0 * factorY2;

  // Bank Credit KPIs
  const currentRatio = totalCurrentAssetsY0 / (totalCurrentLiabilitiesY0 || 1);
  const quickRatio = (totalCurrentAssetsY0 - inventoryY0) / (totalCurrentLiabilitiesY0 || 1);
  const grossMargin = (grossProfitY0 / salesY0) * 100;
  const netMargin = (netProfitY0 / salesY0) * 100;
  const roe = (netProfitY0 / totalEquityY0) * 100;
  const debtToEquity = (totalLiabilitiesY0 / totalEquityY0) * 100;

  const exportExcelCreditFile = () => {
    const wb = XLSX.utils.book_new();
    const isRows = [
      { 'البند / بيان الدخل': 'إيرادات المبيعات والنشاط', 'سنة 2024': salesY2, 'سنة 2025': salesY1, 'سنة 2026 (المستهدفة)': salesY0 },
      { 'البند / بيان الدخل': 'تكلفة المبيعات', 'سنة 2024': cogsY2, 'سنة 2025': cogsY1, 'سنة 2026 (المستهدفة)': cogsY0 },
      { 'البند / بيان الدخل': 'مجمل الربح', 'سنة 2024': grossProfitY2, 'سنة 2025': grossProfitY1, 'سنة 2026 (المستهدفة)': grossProfitY0 },
      { 'البند / بيان الدخل': 'أرباح التشغيل (EBIT)', 'سنة 2024': ebitY2, 'سنة 2025': ebitY1, 'سنة 2026 (المستهدفة)': ebitY0 },
      { 'البند / بيان الدخل': 'صافي الربح قبل الضريبة', 'سنة 2024': ebtY2, 'سنة 2025': ebtY1, 'سنة 2026 (المستهدفة)': ebtY0 },
      { 'البند / بيان الدخل': 'ضريبة الدخل التقديرية (22.5%)', 'سنة 2024': taxY2, 'سنة 2025': taxY1, 'سنة 2026 (المستهدفة)': taxY0 },
      { 'البند / بيان الدخل': 'صافي الربح بعد الضريبة', 'سنة 2024': netProfitY2, 'سنة 2025': netProfitY1, 'سنة 2026 (المستهدفة)': netProfitY0 },
    ];
    const ws = XLSX.utils.json_to_sheet(isRows);
    XLSX.utils.book_append_sheet(wb, ws, 'قوائم الائتمان المقارنة');
    XLSX.writeFile(wb, `ملف_القوائم_المالية_للائتمان_البنكي_${targetSales}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              نظام محاكاة ملف القوائم المالية للائتمان البنكي (Bank Credit Files)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إعادة توزيع الأرقام والنسب المحاسبية بعدالة وتوازن بناءً على رقم المبيعات المستهدف لملفات البنوك والتسهيلات.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportExcelCreditFile}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير ملف الإكسل</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة ملف الائتمان</span>
          </button>
        </div>
      </div>

      {/* Inputs & Ratio Sliders Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Target Sales */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              رقم المبيعات المستهدف (ج.م) *
            </label>
            <input
              type="number"
              step="100000"
              value={targetSales}
              onChange={(e) => setTargetSales(Math.max(100000, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-blue-50/60 border border-blue-200 rounded-xl font-mono font-bold text-blue-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              {numberToArabicWords(targetSales)}
            </span>
          </div>

          {/* Sector Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">القطاع والنشاط الاقتصادي</label>
            <select
              value={sector}
              onChange={(e) => handleSectorChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              <option value="COMMERCIAL">نشاط تجاري وتوزيع (Commercial)</option>
              <option value="INDUSTRIAL">نشاط صناعي وإنتاجي (Industrial)</option>
              <option value="CONTRACTING">مقاولات وتشييد وبناء (Contracting)</option>
              <option value="SERVICES">خدمي واستشارات وتوريدات (Services)</option>
            </select>
          </div>

          {/* Prev Year Growth */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">معدل نمو سنة N-1 (%)</label>
            <input
              type="number"
              value={growthRatePrevYear}
              onChange={(e) => setGrowthRatePrevYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>

          {/* Two Years Ago Growth */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">معدل نمو سنة N-2 (%)</label>
            <input
              type="number"
              value={growthRateTwoYearsAgo}
              onChange={(e) => setGrowthRateTwoYearsAgo(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>
        </div>

        {/* Sliders for fair ratios */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>نسبة تكلفة المبيعات (COGS):</span>
              <span className="text-blue-900 font-mono">{cogsRatio}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={cogsRatio}
              onChange={(e) => setCogsRatio(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>نسبة المصروفات الإدارية:</span>
              <span className="text-blue-900 font-mono">{adminExpRatio}%</span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              value={adminExpRatio}
              onChange={(e) => setAdminExpRatio(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>نسبة المصروفات البيعية والتسويق:</span>
              <span className="text-blue-900 font-mono">{sellingExpRatio}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={sellingExpRatio}
              onChange={(e) => setSellingExpRatio(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>نسبة الفوائد البنكية:</span>
              <span className="text-blue-900 font-mono">{financeExpRatio}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={financeExpRatio}
              onChange={(e) => setFinanceExpRatio(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Credit Ratios Indicator Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">نسبة التداول (Current)</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {currentRatio.toFixed(2)}x
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">ممتاز (&gt; 1.30)</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">السيولة السريعة (Quick)</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {quickRatio.toFixed(2)}x
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">متوافق مع البنوك</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">هامش مجمل الربح</span>
          <div className="text-lg font-black text-emerald-800 font-mono mt-1">
            {grossMargin.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">من إجمالي المبيعات</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">هامش صافي الربح</span>
          <div className="text-lg font-black text-emerald-800 font-mono mt-1">
            {netMargin.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">بعد الضريبة 22.5%</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">العائد على الملكية (ROE)</span>
          <div className="text-lg font-black text-blue-800 font-mono mt-1">
            {roe.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">مؤشر كفاءة رأس المال</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">الرافعة (D/E Ratio)</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {debtToEquity.toFixed(0)}%
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">آمن ائتمانياً</span>
        </div>
      </div>

      {/* Comparative 3-Year Credit Statement Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm">
            القوائم المالية المقارنة المعدة لملف الائتمان البنكي (3 سنوات مالية)
          </h3>
          <span className="text-xs text-blue-300 font-mono">القيم بالجنيه المصري (EGP)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                <th className="py-3 px-4">بيان الحساب / البند المالي</th>
                <th className="py-3 px-4 text-left">سنة 2024 (الماضية N-2)</th>
                <th className="py-3 px-4 text-left">سنة 2025 (السابقة N-1)</th>
                <th className="py-3 px-4 text-left text-blue-900 bg-blue-50/50">
                  سنة 2026 (المستهدفة N)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Revenue */}
              <tr className="bg-slate-50/50 font-bold font-sans">
                <td className="py-2.5 px-4 text-slate-900">إيرادات المبيعات والنشاط التشغيلي</td>
                <td className="py-2.5 px-4 text-left font-mono">{formatEgyptianCurrency(salesY2)}</td>
                <td className="py-2.5 px-4 text-left font-mono">{formatEgyptianCurrency(salesY1)}</td>
                <td className="py-2.5 px-4 text-left font-mono text-blue-900 bg-blue-50/30 font-black">
                  {formatEgyptianCurrency(salesY0)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans text-slate-600">(يخصم): تكلفة المبيعات ({cogsRatio}%)</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(cogsY2)})</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(cogsY1)})</td>
                <td className="py-2 px-4 text-left text-red-700 bg-blue-50/30">({formatEgyptianCurrency(cogsY0)})</td>
              </tr>
              <tr className="bg-emerald-50/60 font-bold font-sans">
                <td className="py-2 px-4 text-emerald-950">مجمل الربح (Gross Profit)</td>
                <td className="py-2 px-4 text-left text-emerald-900">{formatEgyptianCurrency(grossProfitY2)}</td>
                <td className="py-2 px-4 text-left text-emerald-900">{formatEgyptianCurrency(grossProfitY1)}</td>
                <td className="py-2 px-4 text-left text-emerald-950 bg-emerald-100/50 font-black">
                  {formatEgyptianCurrency(grossProfitY0)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans text-slate-600">(يخصم): المصروفات الإدارية والعمومية</td>
                <td className="py-2 px-4 text-left text-slate-700">({formatEgyptianCurrency(salesY2 * (adminExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-slate-700">({formatEgyptianCurrency(salesY1 * (adminExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-slate-700 bg-blue-50/30">({formatEgyptianCurrency(adminY0)})</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans text-slate-600">(يخصم): المصروفات التسويقية والبيعية</td>
                <td className="py-2 px-4 text-left text-slate-700">({formatEgyptianCurrency(salesY2 * (sellingExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-slate-700">({formatEgyptianCurrency(salesY1 * (sellingExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-slate-700 bg-blue-50/30">({formatEgyptianCurrency(sellingY0)})</td>
              </tr>
              <tr className="bg-blue-50/60 font-bold font-sans">
                <td className="py-2 px-4 text-blue-950">أرباح النشاط قبل الفوائد والضرائب (EBIT)</td>
                <td className="py-2 px-4 text-left text-blue-900">{formatEgyptianCurrency(ebitY2)}</td>
                <td className="py-2 px-4 text-left text-blue-900">{formatEgyptianCurrency(ebitY1)}</td>
                <td className="py-2 px-4 text-left text-blue-950 bg-blue-100/50 font-black">{formatEgyptianCurrency(ebitY0)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans text-slate-600">(يخصم): أعباء وفوائد تمويلية مصرفية</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(salesY2 * (financeExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(salesY1 * (financeExpRatio / 100))})</td>
                <td className="py-2 px-4 text-left text-red-700 bg-blue-50/30">({formatEgyptianCurrency(financeY0)})</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans text-red-700">ضريبة الدخل التقديرية (22.5%)</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(taxY2)})</td>
                <td className="py-2 px-4 text-left text-red-700">({formatEgyptianCurrency(taxY1)})</td>
                <td className="py-2 px-4 text-left text-red-700 bg-blue-50/30">({formatEgyptianCurrency(taxY0)})</td>
              </tr>
              <tr className="bg-slate-900 text-white font-bold font-sans">
                <td className="py-3 px-4">صافي أرباح العام بعد الضريبة (Net Profit)</td>
                <td className="py-3 px-4 text-left text-emerald-400">{formatEgyptianCurrency(netProfitY2)}</td>
                <td className="py-3 px-4 text-left text-emerald-400">{formatEgyptianCurrency(netProfitY1)}</td>
                <td className="py-3 px-4 text-left text-emerald-300 font-black text-sm bg-slate-950">
                  {formatEgyptianCurrency(netProfitY0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Credit Model Stamp, Serial & QR Code */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row items-center justify-between gap-6 print:border-none print:p-0">
        <div className="space-y-1 text-center sm:text-right text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">كود نموذج الائتمان (Serial):</span>
            <span className="font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              SIM-2026-CRD-{targetSales / 1000000}M
            </span>
          </div>
          <div className="text-sm font-black text-slate-900 mt-1">
            {state.officeProfile.firmName} / {state.officeProfile.auditorName}
          </div>
          <div className="text-blue-800 font-semibold">محاسب ومراجع قانوني - خبير تمويل وائتمان مصرفي</div>
          <div className="text-slate-500 font-mono text-[11px]">
            رقم القيد بسجل المحاسبين والمراجعين: {state.officeProfile.licenseNumber}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center sm:text-left text-xs">
            <div className="text-[10px] text-slate-400 font-bold mb-1">رمز التحقق البنكي</div>
            <div className="text-[10px] text-blue-800 font-mono font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200">
              نموذج معتمد للبنوك
            </div>
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html: generateQrCodeSvg(`CREDIT_SIM|SALES_${targetSales}|PROFIT_${netProfitY0.toFixed(2)}|CPA_${state.officeProfile.auditorName}`, 85),
            }}
          />
        </div>
      </div>
    </div>
  );
};
