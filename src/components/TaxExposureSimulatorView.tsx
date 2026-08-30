import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  FileSpreadsheet,
  Calculator,
  Printer,
  FileCheck,
  Building,
  Scale,
  Percent,
  Search,
  ArrowRight,
  Info,
  Layers,
  ChevronRight,
  Download,
  Flame,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface TaxExposureSimulatorProps {
  state: DatabaseState;
}

export const TaxExposureSimulatorView: React.FC<TaxExposureSimulatorProps> = ({ state }) => {
  const [selectedClient, setSelectedClient] = useState<string>(state.clients[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [auditMode, setAuditMode] = useState<'ESTIMATE' | 'ACTUAL'>('ACTUAL');

  // Input state for Books, Form 10, and ETA portal data
  const [bookSales, setBookSales] = useState<number>(14500000);
  const [form10Sales, setForm10Sales] = useState<number>(14200000);
  const [etaSales, setEtaSales] = useState<number>(14500000);

  const [bookPurchases, setBookPurchases] = useState<number>(9800000);
  const [form10Purchases, setForm10Purchases] = useState<number>(9200000);
  const [etaPurchases, setEtaPurchases] = useState<number>(8900000);

  const [grossProfitRate, setGrossProfitRate] = useState<number>(32.4);
  const [benchmarkProfitRate, setBenchmarkProfitRate] = useState<number>(35.0);

  const [unregisteredSupplierPurchases, setUnregisteredSupplierPurchases] = useState<number>(450000);
  const [withholdingTaxCollected, setWithholdingTaxCollected] = useState<number>(145000);
  const [withholdingTaxReported, setWithholdingTaxReported] = useState<number>(138000);

  const [delayMonths, setDelayMonths] = useState<number>(14);
  const [centralBankInterestRate, setCentralBankInterestRate] = useState<number>(27.25); // Central bank corridor + 2%

  const client = state.clients.find((c) => c.id === selectedClient) || state.clients[0];

  // Discrepancy calculations
  const salesDiscrepancyBookVsForm10 = bookSales - form10Sales;
  const salesDiscrepancyBookVsEta = bookSales - etaSales;
  const purchasesDiscrepancyBookVsForm10 = bookPurchases - form10Purchases;
  const purchasesDiscrepancyBookVsEta = bookPurchases - etaPurchases;

  // Potential Tax Exposure:
  // 1. VAT exposure on undeclared sales (14%)
  const vatRate = 0.14;
  const potentialVatExposure = Math.max(0, salesDiscrepancyBookVsForm10 * vatRate);

  // 2. Disallowed purchases exposure (Loss of deductible VAT 14% + Corporate Tax 22.5%)
  const disallowedVatExposure = Math.max(0, unregisteredSupplierPurchases * vatRate);
  const corporateTaxRate = 0.225;
  const corporateTaxOnDisallowedPurchases = unregisteredSupplierPurchases * corporateTaxRate;

  // 3. Profit margin deviation exposure (Estimated assessment by tax authority)
  const profitMarginGap = Math.max(0, benchmarkProfitRate - grossProfitRate);
  const estimatedDeemedProfitAddition = (profitMarginGap / 100) * bookSales;
  const potentialCorporateTaxExposure = estimatedDeemedProfitAddition * corporateTaxRate;

  // 4. Withholding tax gap (Form 41)
  const withholdingTaxGap = Math.max(0, withholdingTaxCollected - withholdingTaxReported);

  // Total Basic Exposure
  const totalPrincipalExposure =
    potentialVatExposure +
    disallowedVatExposure +
    corporateTaxOnDisallowedPurchases +
    potentialCorporateTaxExposure +
    withholdingTaxGap;

  // Article 110 Delay Penalty: (Central Bank Rate + 2%) / 12 per month
  const monthlyPenaltyRate = (centralBankInterestRate + 2) / 100 / 12;
  const totalDelayPenalties = totalPrincipalExposure * monthlyPenaltyRate * delayMonths;

  // Procedural Fines (Law 206 of 2020)
  const proceduralFines = salesDiscrepancyBookVsForm10 > 0 ? 50000 : 10000;

  const grandTotalTaxExposure = totalPrincipalExposure + totalDelayPenalties + proceduralFines;

  // Risk Score calculation (0 - 100)
  const riskScore = useMemo(() => {
    let score = 15; // baseline
    if (salesDiscrepancyBookVsForm10 > 100000) score += 25;
    else if (salesDiscrepancyBookVsForm10 > 0) score += 10;

    if (purchasesDiscrepancyBookVsEta > 200000) score += 20;
    else if (purchasesDiscrepancyBookVsEta > 0) score += 10;

    if (profitMarginGap > 4) score += 20;
    else if (profitMarginGap > 1) score += 10;

    if (unregisteredSupplierPurchases > 200000) score += 15;
    if (withholdingTaxGap > 5000) score += 10;

    return Math.min(100, score);
  }, [
    salesDiscrepancyBookVsForm10,
    purchasesDiscrepancyBookVsEta,
    profitMarginGap,
    unregisteredSupplierPurchases,
    withholdingTaxGap,
  ]);

  const riskLevel =
    riskScore >= 75
      ? { label: 'مخاطر حرجة جداً (عالية الاحتمال)', color: 'text-red-700 bg-red-50 border-red-200', icon: Flame }
      : riskScore >= 45
      ? { label: 'مخاطر متوسطة إلى مرتفعة', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle }
      : { label: 'مخاطر منخفضة وقابلة للسيطرة', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              منظومة الرقابة والتحوط الضريبي الوقائي
            </span>
            <span className="text-slate-400 text-xs font-mono">قانون 91 لسنة 2005 وقانون 206 لسنة 2020</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            محاكي الفحص الضريبي وكشف المخاطر والمطابقة الثلاثية
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            كشف الفروق بين الدفاتر المحاسبية وإقرارات القيمة المضافة وبوابة الفاتورة الإلكترونية مع حساب مقابل التأخير والغرامات
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScreenActionToolbar
            modelType="TAX_EXPOSURE"
            title="تقرير محاكي الفحص والتحوط الضريبي"
            showImport={false}
          />
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">العميل الخاضع للفحص:</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
            >
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.taxCardNo || 'ملف ضريبي'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">السنة الضريبية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
            >
              <option value={2026}>2026 (فحص دوري متوقع)</option>
              <option value={2025}>2025 (السنة المالية المنتهية)</option>
              <option value={2024}>2024 (سنوات سابقة مفتوحة)</option>
              <option value={2023}>2023</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">معدل فائدة البنك المركزي المعتمد:</span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {centralBankInterestRate}% + 2% = {(centralBankInterestRate + 2).toFixed(2)}% سنوياً
          </span>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Risk Score */}
        <div className={`p-4 rounded-xl border ${riskLevel.color} shadow-xs flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">مؤشر مخاطر الفحص (Risk Score)</span>
              <riskLevel.icon className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono">{riskScore}</span>
              <span className="text-xs font-bold">/ 100</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-current/20 text-[11px] font-bold">
            {riskLevel.label}
          </div>
        </div>

        {/* Total Principal Tax Exposure */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1 text-slate-500">
            <span className="text-xs font-semibold">فروق الضريبة الأصلية</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {formatEgyptianCurrency(totalPrincipalExposure)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            قيمة مضافة + دخل + كسب عمل/خصم
          </div>
        </div>

        {/* Delay Penalties (Article 110) */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1 text-amber-800">
            <span className="text-xs font-bold">مقابل التأخير (م. 110)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-900 mt-2">
            {formatEgyptianCurrency(totalDelayPenalties)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            عن فترة {delayMonths} شهراً بنسبة {((centralBankInterestRate + 2) / 12).toFixed(2)}% شهرياً
          </div>
        </div>

        {/* Grand Total Financial Exposure */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-600 to-rose-800 text-white shadow-md">
          <div className="flex items-center justify-between mb-1 text-red-100">
            <span className="text-xs font-bold">إجمالي المطالبة المتوقعة</span>
            <Flame className="w-4 h-4 text-red-200" />
          </div>
          <div className="text-2xl font-black font-mono mt-2">
            {formatEgyptianCurrency(grandTotalTaxExposure)}
          </div>
          <div className="text-[11px] text-red-100 mt-1">
            شامل الفروق ومقابل التأخير والغرامات
          </div>
        </div>
      </div>

      {/* Section 1: Three-Way Reconciliation Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <h2 className="font-bold text-slate-800 text-sm">
              أولاً: فحص المطابقة الثلاثية (Three-Way Tax Reconciliation)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            الدفاتر المالية vs إقرارات ق.م (نموذج 10) vs الفواتير الإلكترونية (ETA)
          </span>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">البند / البيان</th>
                <th className="p-3 text-left font-mono">الدفاتر والقوائم المالية (EGP)</th>
                <th className="p-3 text-left font-mono">إقرارات نموذج (10) ق.م (EGP)</th>
                <th className="p-3 text-left font-mono">بوابة الفاتورة الإلكترونية (EGP)</th>
                <th className="p-3 text-left font-mono text-red-700">فروق الدفاتر vs الإقرار</th>
                <th className="p-3 text-left font-mono text-red-700">فروق الدفاتر vs البوابة</th>
                <th className="p-3 text-center">حالة المطابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {/* Sales Row */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">
                  <div>إجمالي المبيعات والإيرادات</div>
                  <span className="text-[10px] text-slate-400 font-normal">خاضعة لضريبة القيمة المضافة</span>
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={bookSales}
                    onChange={(e) => setBookSales(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono"
                  />
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={form10Sales}
                    onChange={(e) => setForm10Sales(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono text-blue-800"
                  />
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={etaSales}
                    onChange={(e) => setEtaSales(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono text-emerald-800"
                  />
                </td>
                <td className={`p-3 text-left font-mono font-bold ${salesDiscrepancyBookVsForm10 !== 0 ? 'text-red-700 bg-red-50/50' : 'text-slate-700'}`}>
                  {formatEgyptianCurrency(salesDiscrepancyBookVsForm10)}
                </td>
                <td className={`p-3 text-left font-mono font-bold ${salesDiscrepancyBookVsEta !== 0 ? 'text-red-700 bg-red-50/50' : 'text-slate-700'}`}>
                  {formatEgyptianCurrency(salesDiscrepancyBookVsEta)}
                </td>
                <td className="p-3 text-center">
                  {salesDiscrepancyBookVsForm10 === 0 && salesDiscrepancyBookVsEta === 0 ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                      مطابق 100%
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">
                      يوجد فروق غير مقر عنها
                    </span>
                  )}
                </td>
              </tr>

              {/* Purchases Row */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">
                  <div>إجمالي المشتريات والتكاليف</div>
                  <span className="text-[10px] text-slate-400 font-normal">المدخلات القابلة للخصم</span>
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={bookPurchases}
                    onChange={(e) => setBookPurchases(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono"
                  />
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={form10Purchases}
                    onChange={(e) => setForm10Purchases(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono text-blue-800"
                  />
                </td>
                <td className="p-3 text-left font-mono">
                  <input
                    type="number"
                    value={etaPurchases}
                    onChange={(e) => setEtaPurchases(Number(e.target.value) || 0)}
                    className="w-32 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-left font-mono text-emerald-800"
                  />
                </td>
                <td className={`p-3 text-left font-mono font-bold ${purchasesDiscrepancyBookVsForm10 !== 0 ? 'text-amber-700 bg-amber-50/50' : 'text-slate-700'}`}>
                  {formatEgyptianCurrency(purchasesDiscrepancyBookVsForm10)}
                </td>
                <td className={`p-3 text-left font-mono font-bold ${purchasesDiscrepancyBookVsEta !== 0 ? 'text-red-700 bg-red-50/50' : 'text-slate-700'}`}>
                  {formatEgyptianCurrency(purchasesDiscrepancyBookVsEta)}
                </td>
                <td className="p-3 text-center">
                  {purchasesDiscrepancyBookVsEta > 0 ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                      مشتريات غير معتمدة إلكترونياً
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                      مطابق
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Detailed Exposure Pillars & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Benchmark & Margin Gap */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              ثانياً: فحص انحراف مجمل الربح والنسب الاسترشادية
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                نسبة مجمل ربح الدفاتر (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={grossProfitRate}
                onChange={(e) => setGrossProfitRate(Number(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                النسبة الاسترشادية للمأمورية (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={benchmarkProfitRate}
                onChange={(e) => setBenchmarkProfitRate(Number(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-900"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>فارق نسبة الربح المعرضة للتقدير:</span>
              <span className="font-mono font-bold text-amber-800">{profitMarginGap.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>تقدير الربح التقديري المضاف:</span>
              <span className="font-mono font-bold text-slate-800">{formatEgyptianCurrency(estimatedDeemedProfitAddition)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
              <span>ضريبة الدخل التقديرية (22.5%):</span>
              <span className="font-mono text-red-700">{formatEgyptianCurrency(potentialCorporateTaxExposure)}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-blue-50/70 p-3 rounded-lg border border-blue-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              في حال انخفاض نسبة مجمل الربح الدفترية عن نسبة تعليمات المصلحة لنشاط العميل، يلزم إعداد مذكرة مسبقة توضح أسباب الانخفاض (مثل ارتفاع تكلفة الخامات أو التخفيضات الترويجية).
            </span>
          </div>
        </div>

        {/* Right Column: Suppliers and Withholding Tax Form 41 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              ثالثاً: مشتريات الموردين غير المسجلين والخصم والإضافة
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                مشتريات من موردين غير مسجلين بفاتورة إلكترونية (ج.م)
              </label>
              <input
                type="number"
                value={unregisteredSupplierPurchases}
                onChange={(e) => setUnregisteredSupplierPurchases(Number(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-red-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                مخاطر استبعاد التكلفة وضياع حق خصم ضريبة القيمة المضافة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ضريبة الخصم المحتجزة (ج.م)
                </label>
                <input
                  type="number"
                  value={withholdingTaxCollected}
                  onChange={(e) => setWithholdingTaxCollected(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  المسدد بنموذج (41) ربع السنوي
                </label>
                <input
                  type="number"
                  value={withholdingTaxReported}
                  onChange={(e) => setWithholdingTaxReported(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-900"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center font-semibold text-red-900">
              <span>فروق الخصم والتحصيل تحت حساب الضريبة:</span>
              <span className="font-mono font-bold">{formatEgyptianCurrency(withholdingTaxGap)}</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-red-900">
              <span>ضريبة الدخل المستحقة عن المشتريات غير المعترف بها:</span>
              <span className="font-mono font-bold">{formatEgyptianCurrency(corporateTaxOnDisallowedPurchases)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">شهور التأخير المتوقعة حتى الفحص:</span>
            <input
              type="number"
              min="1"
              max="60"
              value={delayMonths}
              onChange={(e) => setDelayMonths(Number(e.target.value) || 1)}
              className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-center"
            />
            <span className="text-xs text-slate-500">شهراً</span>
          </div>
        </div>
      </div>

      {/* Section 3: Strategic Recommendations & Audit Defense Plan */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">
              توصيات التحوط وخطة الدفاع الضريبي قبل الفحص الميداني
            </h3>
          </div>
          <span className="text-xs px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold border border-amber-500/30">
            إجراءات فورية موصى بها لمكتب المحاسبة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>1. تقديم إقرارات ق.م معدلة</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              تقديم إقرار ضريبي معدل عن الشهور التي بها فروق مبيعات قبل بدء إجراءات الفحص للاستفادة من تخفيض غرامات المادة 110 وتجنب شبهة التهرب.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <span>2. استيفاء فواتير المشتريات الإلكترونية</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              مطالبة الموردين بإعادة إرسال الفواتير غير المعتمدة على منظومة ETA قبل تاريخ تقديم الإقرار السنوي لضمان قبول التكاليف ضريبياً.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>3. إعداد ملف تسوية الخصم والإضافة</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              مطابقة سدادات نموذج 41 مع حساب الأستاذ العام وتجهيز إشعارات الخصم المعتمدة من العملاء لتفادي الغرامات المالية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
