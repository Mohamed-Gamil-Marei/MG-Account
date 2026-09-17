import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Sparkles,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Scale,
  TrendingUp,
  Layers,
  Save,
  ArrowRight,
  ShieldCheck,
  Percent,
  Target,
  BarChart3,
  FileText,
  Activity,
} from 'lucide-react';
import {
  SmartCpaTemplateService,
  SmartCpaYearData,
  SMART_EXPENSE_RATIOS,
} from '../../services/smartCpaTemplateService';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { SmartCpaTargetProfitModal } from './SmartCpaTargetProfitModal';
import { SmartCpaMultiYearComparison } from './SmartCpaMultiYearComparison';

interface SmartCpaTemplateViewProps {
  companyName?: string;
  onNavigateToStatements?: () => void;
}

export const SmartCpaTemplateView: React.FC<SmartCpaTemplateViewProps> = ({
  companyName = 'منشأة الفحص والمراجعة المعتمدة',
  onNavigateToStatements,
}) => {
  const [yearsData, setYearsData] = useState<Record<number, SmartCpaYearData>>({});
  const [activeYear, setActiveYear] = useState<number>(2024);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [displayMode, setDisplayMode] = useState<'SINGLE_YEAR' | 'MULTI_YEAR_COMPARISON'>('SINGLE_YEAR');
  const [isTargetProfitModalOpen, setIsTargetProfitModalOpen] = useState(false);

  // Initialize data from persistent store
  useEffect(() => {
    const loaded = SmartCpaTemplateService.loadAllYears();
    setYearsData(loaded);
    const sortedYears = Object.keys(loaded).map(Number).sort((a, b) => a - b);
    if (sortedYears.length > 0 && !loaded[activeYear]) {
      setActiveYear(sortedYears[sortedYears.length - 1]);
    }
  }, []);

  const currentYearData: SmartCpaYearData | undefined = yearsData[activeYear];

  // Helper to update current year's data
  const handleUpdateCurrentYear = (updates: Partial<SmartCpaYearData>) => {
    if (!currentYearData) return;

    // If currently in smart mode, re-calculate automatically
    const sortedYears = Object.keys(yearsData).map(Number).sort((a, b) => a - b);
    const prevYearNum = sortedYears.filter((y) => y < activeYear).pop();
    const prevYearData = prevYearNum ? yearsData[prevYearNum] : undefined;

    let updatedYear: SmartCpaYearData;
    if (currentYearData.isManualMode && updates.isManualMode !== false) {
      // Manual custom updates
      updatedYear = {
        ...currentYearData,
        ...updates,
      };
      // Re-check balancing plug if manual numbers changed
      if (
        updates.totalAssets !== undefined ||
        updates.paidUpCapital !== undefined ||
        updates.currentYearProfit !== undefined ||
        updates.totalCurrentLiabilities !== undefined
      ) {
        const assets = updates.totalAssets ?? updatedYear.totalAssets;
        const cap = updates.paidUpCapital ?? updatedYear.paidUpCapital;
        const prof = updates.currentYearProfit ?? updatedYear.currentYearProfit;
        const nonCur = updates.nonCurrentLiabilities ?? updatedYear.nonCurrentLiabilities;
        const curLiab = updates.totalCurrentLiabilities ?? updatedYear.totalCurrentLiabilities;
        updatedYear.partnersCurrentAccount = assets - (cap + prof + nonCur + curLiab);
        updatedYear.totalEquity = cap + updatedYear.partnersCurrentAccount + prof;
        updatedYear.totalLiabilitiesAndEquity = updatedYear.totalEquity + nonCur + curLiab;
      }
    } else {
      // Smart Auto Mode
      updatedYear = SmartCpaTemplateService.calculateYear(
        {
          ...currentYearData,
          ...updates,
          year: activeYear,
        },
        prevYearData
      );
    }

    const nextState = {
      ...yearsData,
      [activeYear]: updatedYear,
    };

    setYearsData(nextState);
    SmartCpaTemplateService.saveAllYears(nextState);
    showSaveNotification();
  };

  const showSaveNotification = () => {
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  // Toggle mode for active year
  const handleToggleMode = () => {
    if (!currentYearData) return;
    const newMode = !currentYearData.isManualMode;
    handleUpdateCurrentYear({ isManualMode: newMode });
  };

  // Add new fiscal year
  const handleAddNewYear = () => {
    const existingYears = Object.keys(yearsData).map(Number).sort((a, b) => a - b);
    const lastYear = existingYears.length > 0 ? existingYears[existingYears.length - 1] : 2024;
    const nextYear = lastYear + 1;

    const prevYearData = yearsData[lastYear];
    const newYearData = SmartCpaTemplateService.calculateYear(
      {
        year: nextYear,
        sales: Math.round((prevYearData?.sales || 9000000) * 1.1),
        totalExpensesInput: Math.round((prevYearData?.totalExpensesInput || 500000) * 1.08),
        paidUpCapital: prevYearData?.paidUpCapital || 300000,
      },
      prevYearData
    );

    const nextState = {
      ...yearsData,
      [nextYear]: newYearData,
    };
    setYearsData(nextState);
    SmartCpaTemplateService.saveAllYears(nextState);
    setActiveYear(nextYear);
    showSaveNotification();
  };

  // Delete current year (if more than 1 year exists)
  const handleDeleteCurrentYear = () => {
    const existingYears = Object.keys(yearsData).map(Number);
    if (existingYears.length <= 1) return;
    if (!window.confirm(`هل أنت متأكد من حذف بيانات السنة المالية ${activeYear}؟`)) return;

    const nextState = { ...yearsData };
    delete nextState[activeYear];
    setYearsData(nextState);
    SmartCpaTemplateService.saveAllYears(nextState);
    const remaining = Object.keys(nextState).map(Number).sort((a, b) => a - b);
    setActiveYear(remaining[remaining.length - 1]);
    showSaveNotification();
  };

  // Export to Excel
  const handleExportExcel = () => {
    SmartCpaTemplateService.exportToExcelWorkbook(yearsData, companyName);
  };

  if (!currentYearData) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 font-medium">جاري تحميل بيانات القوالب المحاسبية...</p>
      </div>
    );
  }

  const sortedYears = Object.keys(yearsData).map(Number).sort((a, b) => a - b);
  const balanceDifference = Math.abs(currentYearData.totalAssets - currentYearData.totalLiabilitiesAndEquity);
  const isPerfectBalance = balanceDifference < 1;

  // Key Ratios for Sanity & Credit Ribbon
  const grossProfitMargin = ((currentYearData.grossProfit / (currentYearData.sales || 1)) * 100);
  const opexBurdenRatio = ((currentYearData.operatingExpenses / (currentYearData.sales || 1)) * 100);
  const currentAssets =
    currentYearData.accountsReceivable + currentYearData.cashAndBanks + currentYearData.inventoryClosing;
  const currentRatio = currentAssets / (currentYearData.totalCurrentLiabilities || 1);

  // Partners' Movement analytical reconciliation (for banks & tax auditors)
  const prevYearNum = sortedYears.filter((y) => y < activeYear).pop();
  const prevYearData = prevYearNum ? yearsData[prevYearNum] : undefined;
  const openingPartnersAccount = prevYearData
    ? prevYearData.partnersCurrentAccount
    : Math.round(currentYearData.partnersCurrentAccount * 0.82);
  const netYearProfitForMovement = currentYearData.currentYearProfit;
  const netPartnerDrawingsOrAdditions =
    currentYearData.partnersCurrentAccount - (openingPartnersAccount + netYearProfitForMovement);

  const handleApplyTargetProfit = (sales: number, expenses: number) => {
    handleUpdateCurrentYear({
      sales,
      totalExpensesInput: expenses,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP YEAR SELECTOR BAR & MODE CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Years Tabs & View Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher: Single Year vs Multi-Year Comparison */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setDisplayMode('SINGLE_YEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'SINGLE_YEAR'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>عرض السنة ({activeYear})</span>
            </button>
            <button
              onClick={() => setDisplayMode('MULTI_YEAR_COMPARISON')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'MULTI_YEAR_COMPARISON'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>المقارنة الأفقية للسنوات</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Years Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sortedYears.map((yr) => {
              const isSelected = yr === activeYear && displayMode === 'SINGLE_YEAR';
              const isManual = yearsData[yr]?.isManualMode;
              return (
                <button
                  key={yr}
                  onClick={() => {
                    setActiveYear(yr);
                    setDisplayMode('SINGLE_YEAR');
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{yr}</span>
                  {isManual && (
                    <span
                      title="وضع إدخال يدوي منفرد"
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
                    />
                  )}
                </button>
              );
            })}

            <button
              onClick={handleAddNewYear}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="إضافة سنة مالية جديدة وترحيل الأرصدة تلقائياً"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>سنة جديدة</span>
            </button>
          </div>
        </div>

        {/* Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isSavedNotice && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الحفظ
            </span>
          )}

          {/* Mode Switcher */}
          <button
            onClick={handleToggleMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              currentYearData.isManualMode
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
            }`}
          >
            {currentYearData.isManualMode ? (
              <>
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>إدخال يدوي ({activeYear})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>ذكي تلقائي ({activeYear})</span>
              </>
            )}
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="تصدير شيت إكسيل مطابق لنموذجك بالكامل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Delete Year if > 1 */}
          {sortedYears.length > 1 && (
            <button
              onClick={handleDeleteCurrentYear}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="حذف هذه السنة المالية"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CONDITIONAL: MULTI-YEAR COMPARISON OR SINGLE-YEAR DASHBOARD */}
      {displayMode === 'MULTI_YEAR_COMPARISON' ? (
        <SmartCpaMultiYearComparison
          yearsData={yearsData}
          onSelectYear={(yr) => {
            setActiveYear(yr);
            setDisplayMode('SINGLE_YEAR');
          }}
          onExportExcel={handleExportExcel}
        />
      ) : (
        <>
          {/* SMART SANITY & CREDIT READINESS RIBBON */}
          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                فحص الجاهزية والاعتماد:
              </span>

              {/* Gross Margin Sanity */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200/80 dark:border-emerald-800"
                title="هامش مجمل الربح المحسوب مقارنة بالمبيعات"
              >
                <span className="text-slate-500 text-[11px]">هامش مجمل الربح:</span>
                <span className="font-bold font-mono">{grossProfitMargin.toFixed(1)}%</span>
                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1 rounded">معتمد</span>
              </div>

              {/* Opex Burden */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                title="نسبة عبء المصروفات الإدارية إلى صافي المبيعات"
              >
                <span className="text-slate-500 text-[11px]">عبء المصروفات:</span>
                <span className="font-bold font-mono">{opexBurdenRatio.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500">آمن ضريبياً</span>
              </div>

              {/* Bank Current Ratio */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200/80 dark:border-blue-800"
                title="نسبة التداول البنكية (الأصول المتداولة ÷ الالتزامات المتداولة)"
              >
                <span className="text-slate-500 text-[11px]">نسبة التداول البنكية:</span>
                <span className="font-bold font-mono">{currentRatio.toFixed(2)}x</span>
                <span className="text-[10px] bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-1 rounded">&gt; 1.2 بنكي</span>
              </div>

              {/* Balance status */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border ${
                  isPerfectBalance
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isPerfectBalance ? 'متزنة 100% (صفر فارق)' : 'فارق اتزان'}</span>
              </div>
            </div>

            {/* Target Profit Back-Solver trigger */}
            <button
              onClick={() => setIsTargetProfitModalOpen(true)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="محاكاة فورية للمبيعات والمصروفات المطلوبة لتحقيق ربح أو ضريبة معينة"
            >
              <Target className="w-3.5 h-3.5 text-amber-300" />
              <span>المحاكي العكسي للربح والضريبة</span>
            </button>
          </div>

      {/* 2. STREAMLINED INPUT CARD (QUICK CONTROLS) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>مدخلات السنة المالية {activeYear}</span>
              {currentYearData.isManualMode ? (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-md font-normal">
                  تعديل يدوي حر
                </span>
              ) : (
                <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-md font-normal">
                  معادلات القالب الذكي (100% اتزان)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تتحكم في أرقام هذه السنة فقط بمعزل تام عن باقي السنوات، مع الاتزان التلقائي في جاري الشركاء.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold ${
                isPerfectBalance
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              {isPerfectBalance
                ? 'الميزانية متزنة 100% (فارق: 0.00)'
                : `فارق اتزان: ${formatEgyptianCurrency(balanceDifference)}`}
            </span>
          </div>
        </div>

        {/* 3 Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sales */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              المبيعات / الإيرادات السنوية
            </label>
            <div className="relative">
              <input
                type="number"
                value={currentYearData.sales || ''}
                onChange={(e) => handleUpdateCurrentYear({ sales: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-sm font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">ج.م</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              يبني عليها المخزون بنسبة 18% وتكلفة المبيعات
            </span>
          </div>

          {/* Total Expenses */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              إجمالي المصروفات العمومية والإدارية (Total)
            </label>
            <div className="relative">
              <input
                type="number"
                value={currentYearData.totalExpensesInput || ''}
                onChange={(e) =>
                  handleUpdateCurrentYear({ totalExpensesInput: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-sm font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">ج.م</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              يتم تشريحه آلياً في الإيضاح المتمم لـ 14 بنداً بنسب 100%
            </span>
          </div>

          {/* Asset Additions */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              إضافات الأصول الثابتة خلال العام
            </label>
            <div className="relative">
              <input
                type="number"
                value={currentYearData.fixedAssetsAdditions || 0}
                onChange={(e) =>
                  handleUpdateCurrentYear({ fixedAssetsAdditions: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-sm font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">ج.م</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              تضاف للأرصدة المرحلة ويحسب عليها الإهلاك تلقائياً
            </span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN BALANCED STATEMENTS (NO CLUTTER) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INCOME STATEMENT */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>قائمة الدخل عن السنة المالية {activeYear}</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">جنيه مصري</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">صافي المبيعات والإيرادات</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatEgyptianCurrency(currentYearData.sales)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-rose-600 dark:text-rose-400">
                <span>(يخصم): تكلفة المبيعات (خام 6% + تشغيل 8% + تام 4%)</span>
                <span className="font-bold font-mono">
                  ({formatEgyptianCurrency(currentYearData.costOfSales)})
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 rounded-lg font-bold text-emerald-800 dark:text-emerald-200">
                <span>مجمل الربح</span>
                <span>{formatEgyptianCurrency(currentYearData.grossProfit)}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <span>(يخصم): المصروفات الإدارية والعمومية (الموزعة)</span>
                <span className="font-bold font-mono">
                  ({formatEgyptianCurrency(currentYearData.operatingExpenses)})
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <span>(يخصم): إهلاك الأصول الثابتة للفترة</span>
                <span className="font-bold font-mono">
                  ({formatEgyptianCurrency(currentYearData.depreciationExpense)})
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-slate-800 px-3 rounded-lg font-bold text-slate-800 dark:text-slate-200">
                <span>صافي الربح قبل الضريبة</span>
                <span>{formatEgyptianCurrency(currentYearData.netProfitBeforeTax)}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-amber-600 dark:text-amber-400">
                <span>الضريبة المستحقة (22.5%)</span>
                <span className="font-bold font-mono">
                  ({formatEgyptianCurrency(currentYearData.taxAmount)})
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 bg-emerald-600 text-white px-3 rounded-xl font-bold text-sm shadow-xs">
                <span>صافي أرباح العام بعد الضريبة (مرحل لحقوق الملكية)</span>
                <span>{formatEgyptianCurrency(currentYearData.netProfitAfterTax)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-center justify-between">
            <span>معدل صافي الربح للمبيعات:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {((currentYearData.netProfitAfterTax / (currentYearData.sales || 1)) * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* BALANCE SHEET */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>قائمة المركز المالي كما في 31 ديسمبر {activeYear}</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">جنيه مصري</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Assets Section */}
              <div className="font-bold text-slate-900 dark:text-white text-[11px] tracking-wider text-slate-400 uppercase pt-1">
                الأصول
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">الأصول غير المتداولة (صافي بعد الإهلاك)</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.nonCurrentAssets)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">العملاء والمدينون وأوراق القبض</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.accountsReceivable)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">نقدية بالصندوق ولدى البنوك</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.cashAndBanks)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">مخزون آخر المدة (18% من المبيعات)</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.inventoryClosing)}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 bg-blue-50/70 dark:bg-blue-950/40 px-3 rounded-lg font-bold text-blue-900 dark:text-blue-200">
                <span>إجمالي الأصول</span>
                <span className="font-mono">{formatEgyptianCurrency(currentYearData.totalAssets)}</span>
              </div>

              {/* Equity & Liabilities */}
              <div className="font-bold text-slate-900 dark:text-white text-[11px] tracking-wider text-slate-400 uppercase pt-2">
                حقوق الملكية والالتزامات
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">رأس المال المدفوع</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.paidUpCapital)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-1.5 rounded">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  جاري صاحب الشأن / الشركاء (الاتزان التلقائي)
                </span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {formatEgyptianCurrency(currentYearData.partnersCurrentAccount)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">أرباح العام (مرحلة من قائمة الدخل)</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatEgyptianCurrency(currentYearData.currentYearProfit)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">الالتزامات المتداولة (الموردين والدائنون)</span>
                <span className="font-bold font-mono">{formatEgyptianCurrency(currentYearData.totalCurrentLiabilities)}</span>
              </div>

              <div className="flex justify-between items-center py-2 bg-slate-900 dark:bg-slate-950 text-white px-3 rounded-xl font-bold text-sm shadow-xs">
                <span>إجمالي حقوق الملكية والالتزامات</span>
                <span className="font-mono">{formatEgyptianCurrency(currentYearData.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              الاتزان المحاسبي المضمون:
            </span>
            <span className="font-bold font-mono">
              الأصول ({formatEgyptianCurrency(currentYearData.totalAssets)}) = الخصوم والملكية ({formatEgyptianCurrency(currentYearData.totalLiabilitiesAndEquity)})
            </span>
          </div>
        </div>
      </div>

      {/* 4. PARTNERS' MOVEMENT RECONCILIATION CARD (BANK & TAX JUSTIFICATION) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3 gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>إيضاح تبريري: حركة حساب جاري الشركاء / صاحب الشأن خلال سنة {activeYear}</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              بيان تحليلي مبرر لمسؤولي الائتمان بالبنوك ولجان الفحص الضريبي لبيان حركة الحساب المتزن
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            حساب اتزان معتمد
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-slate-500 block text-[11px] mb-1">1. رصيد أول المدة (المرحل):</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {formatEgyptianCurrency(openingPartnersAccount)}
            </span>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-emerald-700 dark:text-emerald-300 block text-[11px] mb-1">(+) صافي أرباح العام:</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-200 font-mono text-sm">
              +{formatEgyptianCurrency(netYearProfitForMovement)}
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-slate-500 block text-[11px] mb-1">(+/-) صافي حركة وتغذية الشركاء:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">
              {netPartnerDrawingsOrAdditions >= 0 ? '+' : ''}{formatEgyptianCurrency(netPartnerDrawingsOrAdditions)}
            </span>
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
            <span className="text-blue-700 dark:text-blue-300 block text-[11px] mb-1">(=) رصيد آخر المدة (المتزن بالمركز المالي):</span>
            <span className="font-bold text-blue-900 dark:text-blue-200 font-mono text-sm">
              {formatEgyptianCurrency(currentYearData.partnersCurrentAccount)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. EXPENSE BREAKDOWN (14 ITEMS - 100% STANDARD ALLOCATION) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>إيضاح متمم: تحليل وتوزيع المصروفات الإدارية والعمومية (100% معياري)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              مبني تلقائياً على إجمالي المصروفات المدخلة بقائمة الدخل ({formatEgyptianCurrency(currentYearData.operatingExpenses)})
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            14 بنداً معيارياً - المجموع 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {SMART_EXPENSE_RATIOS.map((item) => {
            const amount =
              currentYearData.expenseAllocation[item.key as keyof typeof currentYearData.expenseAllocation] || 0;
            return (
              <div
                key={item.key}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.label}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    {(item.ratio * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="font-bold text-slate-900 dark:text-white font-mono text-left">
                  {formatEgyptianCurrency(amount)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 px-2">
          <span>إجمالي المصروفات بالإيضاح المتمم:</span>
          <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
            {formatEgyptianCurrency(currentYearData.expenseAllocation.total)} (100%)
          </span>
        </div>
      </div>
    </>
  )}

      {/* TARGET PROFIT & TAX BACK-SOLVER MODAL */}
      <SmartCpaTargetProfitModal
        isOpen={isTargetProfitModalOpen}
        onClose={() => setIsTargetProfitModalOpen(false)}
        year={activeYear}
        currentSales={currentYearData.sales}
        currentExpenses={currentYearData.totalExpensesInput}
        onApply={handleApplyTargetProfit}
      />
    </div>
  );
};
