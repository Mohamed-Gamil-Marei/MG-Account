import React, { useState } from 'react';
import {
  LineChart,
  Printer,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { FeasibilityStudy } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../utils/excelArabicStyler';

interface FeasibilityStudyViewProps {
  state: DatabaseState;
}

export const FeasibilityStudyView: React.FC<FeasibilityStudyViewProps> = ({ state }) => {
  const profile = state.officeProfile;

  const [projectName, setProjectName] = useState('مشروع مصنع لإنتاج اللوحات الكهروميكانيكية الذكية');
  const [initialInvestment, setInitialInvestment] = useState<number>(12000000);
  const [discountRate, setDiscountRate] = useState<number>(18); // 18% Egyptian Central Bank Benchmark
  const [annualRevenuesY1, setAnnualRevenuesY1] = useState<number>(16000000);
  const [revenueGrowthRate, setRevenueGrowthRate] = useState<number>(15); // 15%
  const [operatingCostRatio, setOperatingCostRatio] = useState<number>(65); // 65%

  // 5-Year Financial Projection
  const years = [1, 2, 3, 4, 5];
  let cumulativeCashFlow = -initialInvestment;
  let paybackYear = 0;

  const projections = years.map((y) => {
    const rev = annualRevenuesY1 * Math.pow(1 + revenueGrowthRate / 100, y - 1);
    const opex = rev * (operatingCostRatio / 100);
    const grossProfit = rev - opex;
    const adminExp = rev * 0.08;
    const ebt = grossProfit - adminExp;
    const tax = ebt * 0.225;
    const netProfit = ebt - tax;
    const cashFlow = netProfit + (initialInvestment * 0.1); // Add back 10% depreciation
    const discountFactor = 1 / Math.pow(1 + discountRate / 100, y);
    const presentValue = cashFlow * discountFactor;

    if (cumulativeCashFlow < 0 && cumulativeCashFlow + cashFlow >= 0) {
      paybackYear = y;
    }
    cumulativeCashFlow += cashFlow;

    return {
      year: `السنة ${y}`,
      revenue: rev,
      opex,
      netProfit,
      cashFlow,
      presentValue,
      cumulativeCashFlow,
    };
  });

  const totalNPV = projections.reduce((s, p) => s + p.presentValue, 0) - initialInvestment;
  const breakEvenSales = (initialInvestment * 0.1 + annualRevenuesY1 * 0.08) / (1 - operatingCostRatio / 100);

  const exportExcelFeasibility = () => {
    const wb = XLSX.utils.book_new();
    const rows = projections.map((p) => ({
      'السنة التقديرية': p.year,
      'إيرادات المبيعات': p.revenue,
      'التكاليف التشغيلية': p.opex,
      'صافي الربح بعد الضريبة': p.netProfit,
      'صافي التدفق النقدي': p.cashFlow,
      'القيمة الحالية (PV)': p.presentValue,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    formatWorksheetForArabicExport(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, 'دراسة الجدوى المالية');
    writeArabicExcelFile(wb, `دراسة_جدوى_${projectName.slice(0, 20)}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              قوالب ونماذج دراسات الجدوى الاقتصادية والمالية (Feasibility Studies)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إعداد التدفقات النقدية المتوقعة، فترة الاسترداد، صافي القيمة الحالية (NPV)، ونقطة التعادل الاستثمارية.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ScreenActionToolbar
            modelType="FEASIBILITY"
            title="دراسات الجدوى الاقتصادية والمالية"
            showImport={false}
          />
        </div>
      </div>

      {/* Input Parameters Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
        <div>
          <label className="block text-slate-700 font-bold mb-1">اسم المشروع المقترح / النشاط الاستثماري</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">رأس المال الاستثماري المبدئي (ج.م)</label>
            <input
              type="number"
              min="100000"
              step="100000"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(Number(e.target.value))}
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">مبيعات السنة الأولى المتوقعة (ج.م)</label>
            <input
              type="number"
              min="100000"
              step="100000"
              value={annualRevenuesY1}
              onChange={(e) => setAnnualRevenuesY1(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">معدل النمو السنوي للإيراد (%)</label>
            <input
              type="number"
              value={revenueGrowthRate}
              onChange={(e) => setRevenueGrowthRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">معدل الخصم البنكي المقترح (%)</label>
            <input
              type="number"
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Feasibility KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-bold block">صافي القيمة الحالية (NPV)</span>
          <div className={`text-xl font-black font-mono mt-1 ${totalNPV >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatEgyptianCurrency(totalNPV)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            {totalNPV > 0 ? '✓ المشروع مجدي استثمارياً' : 'غير مجدي مالياً'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-bold block">فترة استرداد رأس المال (Payback)</span>
          <div className="text-xl font-black text-blue-900 font-mono mt-1">
            {paybackYear > 0 ? `${paybackYear} سنوات` : 'أكثر من 5 سنوات'}
          </div>
          <span className="text-[10px] text-slate-500">مدة استرجاع التكلفة المبدئية</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-bold block">نقطة التعادل السنوية للمبيعات</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatEgyptianCurrency(breakEvenSales)}
          </div>
          <span className="text-[10px] text-slate-500">المبيعات لتغطية كافة التكاليف</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-bold block">متوسط صافي الربح السنوي</span>
          <div className="text-xl font-black text-emerald-800 font-mono mt-1">
            {formatEgyptianCurrency(projections.reduce((s, p) => s + p.netProfit, 0) / 5)}
          </div>
          <span className="text-[10px] text-slate-500">بعد استقطاع الضريبة 22.5%</span>
        </div>
      </div>

      {/* 5-Year Cash Flow Projection Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm">
            جدول التدفقات النقدية والأرباح التقديرية للخمس سنوات الأولى
          </h3>
          <span className="text-xs text-emerald-400 font-mono">القيم بالجنيه المصري (EGP)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-sans">
                <th className="py-3 px-4">السنة التقديرية</th>
                <th className="py-3 px-4 text-left">إيرادات المبيعات</th>
                <th className="py-3 px-4 text-left">التكاليف التشغيلية</th>
                <th className="py-3 px-4 text-left">صافي الربح بعد الضريبة</th>
                <th className="py-3 px-4 text-left">صافي التدفق النقدي</th>
                <th className="py-3 px-4 text-left">القيمة الحالية (PV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projections.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">{p.year}</td>
                  <td className="py-3 px-4 text-left font-bold text-blue-900">{formatEgyptianCurrency(p.revenue)}</td>
                  <td className="py-3 px-4 text-left text-slate-600">({formatEgyptianCurrency(p.opex)})</td>
                  <td className="py-3 px-4 text-left text-emerald-800 font-bold">{formatEgyptianCurrency(p.netProfit)}</td>
                  <td className="py-3 px-4 text-left font-black text-slate-900">{formatEgyptianCurrency(p.cashFlow)}</td>
                  <td className="py-3 px-4 text-left text-emerald-700 font-bold">{formatEgyptianCurrency(p.presentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Accreditation Footer with Serial & QR Code */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row items-center justify-between gap-6 print:border-none print:p-0">
        <div className="space-y-1 text-center sm:text-right text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">كود الدراسة المعتمد (Serial):</span>
            <span className="font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              FS-2026-088
            </span>
          </div>
          <div className="text-sm font-black text-slate-900 mt-1">
            {profile.firmName} / {profile.auditorName}
          </div>
          <div className="text-emerald-800 font-semibold">{profile.title}</div>
          <div className="text-slate-500 font-mono text-[11px]">
            سجل المحاسبين والمراجعين بوزارة المالية رقم: {profile.licenseNumber}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center sm:text-left text-xs">
            <div className="text-[10px] text-slate-400 font-bold mb-1">رمز التحقق الإلكتروني</div>
            <div className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              دراسة جدوى موثقة
            </div>
          </div>
          <div
            data-qr-container="true"
            className="qr-print-container bg-white p-1 rounded-lg border border-slate-200"
            dangerouslySetInnerHTML={{
              __html: generateQrCodeSvg(`FEASIBILITY|FS-2026-088|${projectName}|${totalNPV.toFixed(2)}|${profile.auditorName}`, 96),
            }}
          />
        </div>
      </div>
    </div>
  );
};
