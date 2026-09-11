import React, { useState, useMemo } from 'react';
import {
  Sliders,
  TrendingUp,
  Scale,
  DollarSign,
  Layers,
  FileSpreadsheet,
  Printer,
  Download,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  PieChart,
  ShieldCheck,
  Building,
  Calendar,
  Percent,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Check,
  RefreshCw,
  Gauge,
  Calculator,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../utils/accountingCalculations';
import {
  SimulationScenario,
  SimulationBalanceSheet,
  SimulationIncomeStatement,
  calculateSimulationRatios,
  createDefaultSimulationScenarios,
  SimulationRatios,
  RatioEvaluation,
} from '../utils/financialSimulatorCalculations';
import {
  formatEgyptianCurrency,
  generateCode128Svg,
  generateQrCodeSvg,
  buildVerificationQrText,
  VerificationPayloadData,
} from '../utils/qrCodeGenerator';
import { exportElementToPdf, exportElementToImage } from '../utils/certifiedDocumentExporter';
import { DocumentVerificationModal } from './common/DocumentVerificationModal';

interface FinancialSimulatorViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

export const FinancialSimulatorView: React.FC<FinancialSimulatorViewProps> = ({
  state,
  fiscalYear = 2026,
}) => {
  const profile = state.officeProfile;

  // 1. Extract Base Reality Accounting Data from current DB state
  const baseActuals = useMemo(() => {
    const calcAccounts = computeAccountBalances(state.accounts, state.journalEntries);
    const inc = generateIncomeStatement(calcAccounts);
    const bal = generateBalanceSheet(calcAccounts, inc);

    // Fallbacks if user is on empty database so simulator is fully interactive with realistic numbers
    const actualBs: SimulationBalanceSheet = {
      cashAndBanks: bal.currentAssets.cashAndBanks || 1450000,
      tradeReceivables: bal.currentAssets.tradeReceivables || 2850000,
      notesReceivable: bal.currentAssets.notesReceivable || 650000,
      inventory: bal.currentAssets.inventory || 3200000,
      prepaymentsAndOther: bal.currentAssets.prepaymentsAndOther || 480000,

      netFixedAssets: bal.nonCurrentAssets.netFixedAssets || 5800000,
      projectsUnderConstruction: 450000,
      longTermInvestments: 350000,
      otherNonCurrentAssets: bal.nonCurrentAssets.otherNonCurrentAssets || 120000,

      tradePayables: bal.currentLiabilities.tradePayables || 2150000,
      shortTermLoans: 1400000,
      notesPayable: bal.currentLiabilities.notesPayable || 550000,
      accruedAndOtherPayables: bal.currentLiabilities.accruedExpenses || 620000,

      longTermLoans: bal.nonCurrentLiabilities.longTermLoans || 2800000,
      deferredTaxLiabilities: bal.nonCurrentLiabilities.deferredTaxLiabilities || 380000,

      paidUpCapital: bal.equity.paidUpCapital || 5000000,
      legalReserve: bal.equity.legalReserve || 650000,
      retainedEarnings: bal.equity.retainedEarnings || 1150000,
      currentPeriodNetProfit: inc.netProfitAfterTax || 800000,
    };

    const actualIs: SimulationIncomeStatement = {
      revenues: inc.revenuesTotal || 16500000,
      costOfGoodsSold: inc.costOfGoodsSold || 11800000,
      administrativeExpenses: inc.administrativeExpenses || 1250000,
      sellingAndMarketingExpenses: inc.sellingAndMarketingExpenses || 820000,
      depreciationExpense: inc.depreciationExpense || 580000,
      financeCosts: inc.financeCosts || 450000,
      otherIncomes: inc.otherIncomes || 120000,
      taxRate: 22.5,
    };

    return { actualBs, actualIs };
  }, [state.accounts, state.journalEntries]);

  // 2. Scenarios State
  const [scenarios, setScenarios] = useState<SimulationScenario[]>(() =>
    createDefaultSimulationScenarios(baseActuals.actualBs, baseActuals.actualIs)
  );

  const [activeScenarioId, setActiveScenarioId] = useState<string>('SCENARIO_EXPANSION');
  const [viewMode, setViewMode] = useState<'SIMULATOR' | 'COMPARISON' | 'REPORT_PREVIEW'>('SIMULATOR');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'LIQUIDITY' | 'PROFITABILITY' | 'SOLVENCY' | 'ACTIVITY'>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [verifyModalData, setVerifyModalData] = useState<VerificationPayloadData | null>(null);

  // Active Scenario object
  const activeScenario = useMemo(() => {
    return scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  // Base Scenario object (for comparisons)
  const baseScenario = useMemo(() => {
    return scenarios.find((s) => s.isBase) || scenarios[0];
  }, [scenarios]);

  // Calculated Ratios
  const activeRatios = useMemo(() => {
    return calculateSimulationRatios(activeScenario);
  }, [activeScenario]);

  const baseRatios = useMemo(() => {
    return calculateSimulationRatios(baseScenario);
  }, [baseScenario]);

  // Handlers to modify active scenario
  const handleUpdateBalanceSheet = (key: keyof SimulationBalanceSheet, value: number) => {
    const safeVal = isNaN(value) ? 0 : Math.max(0, value);
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeScenarioId) return sc;
        return {
          ...sc,
          balanceSheet: {
            ...sc.balanceSheet,
            [key]: safeVal,
          },
        };
      })
    );
  };

  const handleUpdateIncomeStatement = (key: keyof SimulationIncomeStatement, value: number) => {
    const safeVal = isNaN(value) ? 0 : Math.max(0, value);
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeScenarioId) return sc;
        return {
          ...sc,
          incomeStatement: {
            ...sc.incomeStatement,
            [key]: safeVal,
          },
        };
      })
    );
  };

  const handleUpdateScenarioMeta = (field: 'name' | 'description' | 'notes', value: string) => {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeScenarioId) return sc;
        return {
          ...sc,
          [field]: value,
        };
      })
    );
  };

  // Quick Action Shock Triggers (One-Click Financial Levers)
  const handleApplyShock = (action: string) => {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeScenarioId) return sc;
        const bs = { ...sc.balanceSheet };
        const is = { ...sc.incomeStatement };

        switch (action) {
          case 'SALES_PLUS_10':
            is.revenues = Math.round(is.revenues * 1.1);
            is.costOfGoodsSold = Math.round(is.costOfGoodsSold * 1.08);
            bs.tradeReceivables = Math.round(bs.tradeReceivables * 1.05);
            break;
          case 'SALES_MINUS_15':
            is.revenues = Math.round(is.revenues * 0.85);
            is.costOfGoodsSold = Math.round(is.costOfGoodsSold * 0.9);
            break;
          case 'IMPROVE_GROSS_MARGIN':
            is.costOfGoodsSold = Math.round(is.costOfGoodsSold * 0.93); // 7% cost reduction
            break;
          case 'COLLECT_RECEIVABLES_30': {
            const collected = Math.round(bs.tradeReceivables * 0.3);
            bs.tradeReceivables -= collected;
            bs.cashAndBanks += collected;
            break;
          }
          case 'PAY_SHORT_DEBT_50': {
            const payAmt = Math.round(bs.shortTermLoans * 0.5);
            bs.shortTermLoans -= payAmt;
            bs.cashAndBanks = Math.max(0, bs.cashAndBanks - payAmt);
            is.financeCosts = Math.round(is.financeCosts * 0.7);
            break;
          }
          case 'INJECT_EQUITY_1M':
            bs.paidUpCapital += 1000000;
            bs.cashAndBanks += 1000000;
            break;
          case 'RESET_TO_ACTUALS':
            return {
              ...sc,
              balanceSheet: { ...baseActuals.actualBs },
              incomeStatement: { ...baseActuals.actualIs },
            };
          default:
            break;
        }

        return {
          ...sc,
          balanceSheet: bs,
          incomeStatement: is,
        };
      })
    );
  };

  // Auto-Balance Balance Sheet assistant
  const handleAutoBalance = () => {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeScenarioId) return sc;
        const currentRatios = calculateSimulationRatios(sc);
        const variance = currentRatios.balanceVariance;
        if (Math.abs(variance) < 1) return sc;

        const bs = { ...sc.balanceSheet };
        if (variance > 0) {
          // Assets > Liabilities + Equity -> Increase Retained Earnings or Cash adjustment
          bs.retainedEarnings += variance;
        } else {
          // Assets < Liabilities + Equity -> Increase Cash
          bs.cashAndBanks += Math.abs(variance);
        }

        return {
          ...sc,
          balanceSheet: bs,
        };
      })
    );
  };

  // Scenario Management
  const handleCreateNewScenario = () => {
    const newId = `SCENARIO_${Date.now()}`;
    const newScenario: SimulationScenario = {
      id: newId,
      name: `سيناريو مخصص جديد (${scenarios.length + 1})`,
      description: 'سيناريو افتراضي مخصص لاختبار أثر القرارات الإدارية والاستثمارية.',
      isBase: false,
      createdAt: new Date().toISOString().slice(0, 10),
      balanceSheet: { ...activeScenario.balanceSheet },
      incomeStatement: { ...activeScenario.incomeStatement },
      autoSyncProfitToEquity: true,
      plugAccount: 'CASH',
      notes: '',
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newId);
  };

  const handleDuplicateScenario = () => {
    const newId = `SCENARIO_${Date.now()}`;
    const duplicated: SimulationScenario = {
      ...activeScenario,
      id: newId,
      name: `نسخة من - ${activeScenario.name}`,
      isBase: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setScenarios((prev) => [...prev, duplicated]);
    setActiveScenarioId(newId);
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    const target = scenarios.find((s) => s.id === id);
    if (target?.isBase) {
      alert('لا يمكن حذف السيناريو الفعلي الأساسي.');
      return;
    }
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios[0].id);
    }
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(
        '#financial-simulator-report',
        `تقرير_المحاكي_المالي_${activeScenario.name.replace(/\s+/g, '_')}_${fiscalYear}.pdf`
      );
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: RatioEvaluation['status']) => {
    switch (status) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'GOOD':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'WARNING':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'DANGER':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Variance calculator for side-by-side
  const getVariance = (actualVal: number, simVal: number, isPercent = false) => {
    const diff = simVal - actualVal;
    const pct = actualVal !== 0 ? (diff / Math.abs(actualVal)) * 100 : 0;
    const isPositive = diff > 0;
    const isNeutral = Math.abs(diff) < 0.01;

    return {
      diff,
      pct,
      isPositive,
      isNeutral,
      formattedDiff: isPercent ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : formatEgyptianCurrency(diff),
      formattedPct: `${diff > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    };
  };

  const reportDocNumber = `SIM-EAS-${fiscalYear}-${activeScenario.id.slice(-4)}`;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900">
                  محاكي الميزانية والقرارات المالية (Financial Simulator & What-If Engine)
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  تعديل افتراضي لحظي
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  تصدير PDF معتمد
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تعديل بنود المركز المالي وقائمة الدخل افتراضياً ومشاهدة الأثر الفوري على نسب السيولة، الربحية، الرافعة، ومؤشر Altman Z-Score.
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCreateNewScenario}
              className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>سيناريو جديد</span>
            </button>

            <button
              onClick={handleDuplicateScenario}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ السيناريو</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'جاري تصدير PDF...' : 'تصدير تقرير PDF معتمد'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مباشرة</span>
            </button>
          </div>
        </div>

        {/* Scenarios Tabs Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 shrink-0">السيناريو النشط:</span>
            {scenarios.map((sc) => {
              const isActive = sc.id === activeScenarioId;
              return (
                <div
                  key={sc.id}
                  onClick={() => setActiveScenarioId(sc.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-purple-900 text-white border-purple-950 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {sc.isBase ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  )}
                  <span>{sc.name}</span>
                  {!sc.isBase && scenarios.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScenario(sc.id);
                      }}
                      className="text-purple-300 hover:text-white p-0.5 rounded"
                      title="حذف هذا السيناريو"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              onClick={() => setViewMode('SIMULATOR')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'SIMULATOR' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>لوحة المحاكاة</span>
            </button>
            <button
              onClick={() => setViewMode('COMPARISON')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'COMPARISON' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>مقارنة التباين (Variance)</span>
            </button>
            <button
              onClick={() => setViewMode('REPORT_PREVIEW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'REPORT_PREVIEW' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>المستند المعتمد (A4)</span>
            </button>
          </div>
        </div>

        {/* Active Scenario Description & Balance Status Bar */}
        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-950">وصف السيناريو:</span>
              <input
                type="text"
                value={activeScenario.description}
                onChange={(e) => handleUpdateScenarioMeta('description', e.target.value)}
                className="bg-white border border-purple-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium w-72 sm:w-96 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Balance Sheet Equality Gauge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-xl border font-mono font-bold flex items-center gap-2 ${
                activeRatios.isBalanced
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {activeRatios.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>الميزانية متوازنة تماماً: الأصول = الالتزامات + الملكية ({formatEgyptianCurrency(activeRatios.totalAssets)})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>فارق الميزانية: {formatEgyptianCurrency(Math.abs(activeRatios.balanceVariance))}</span>
                </>
              )}
            </div>

            {!activeRatios.isBalanced && (
              <button
                onClick={handleAutoBalance}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="موازنة الفارق تلقائياً في حساب الأرباح المحتجزة / النقدية"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>موازنة تلقائية</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 TOP HERO RATIOS CARDS                                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* 1. Current Ratio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>نسبة التداول (Current Ratio)</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${getStatusBadge(activeRatios.currentRatio.status)}`}>
              {activeRatios.currentRatio.benchmark}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-purple-950">
              {activeRatios.currentRatio.formatted}
            </div>
            <div className="text-[11px] font-bold text-slate-500 font-mono">
              الأساس الفعلي: {baseRatios.currentRatio.formatted}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight">
            {activeRatios.currentRatio.interpretation}
          </p>
        </div>

        {/* 2. Net Working Capital */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>صافي رأس المال العامل (NWC)</span>
            <span className="px-2 py-0.5 rounded-full border text-[10px] bg-indigo-50 text-indigo-800 border-indigo-200">
              {activeRatios.workingCapitalToAssets.formatted} من الأصول
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-indigo-950">
              {formatEgyptianCurrency(activeRatios.netWorkingCapital)}
            </div>
            <div className="text-[11px] font-bold text-slate-500 font-mono">
              الأساس: {formatEgyptianCurrency(baseRatios.netWorkingCapital)}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight">
            {activeRatios.netWorkingCapital >= 0
              ? 'فائض سيولة تشغيلية كافٍ لتغطية التزامات النشاط قصيرة الأجل.'
              : 'عجز في رأس المال العامل؛ الالتزامات قصيرة الأجل تفوق الأصول المتداولة.'}
          </p>
        </div>

        {/* 3. Return on Equity (ROE) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>العائد على حقوق الملكية (ROE)</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${getStatusBadge(activeRatios.returnOnEquity.status)}`}>
              {activeRatios.returnOnEquity.benchmark}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-emerald-950">
              {activeRatios.returnOnEquity.formatted}
            </div>
            <div className="text-[11px] font-bold text-slate-500 font-mono">
              الأساس: {baseRatios.returnOnEquity.formatted}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight">
            صافي الربح: {formatEgyptianCurrency(activeRatios.netProfit)} (هامش {activeRatios.netProfitMargin.toFixed(1)}%)
          </p>
        </div>

        {/* 4. Altman Z-Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>مؤشر التنبؤ بالتعثر (Altman Z)</span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                activeRatios.altmanZScore.zone === 'SAFE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : activeRatios.altmanZScore.zone === 'GREY'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-red-100 text-red-900 border-red-300'
              }`}
            >
              {activeRatios.altmanZScore.zone === 'SAFE'
                ? 'أمان مالي'
                : activeRatios.altmanZScore.zone === 'GREY'
                ? 'منطقة رمادية'
                : 'مخاطر تعثر'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-slate-900">
              {activeRatios.altmanZScore.score.toFixed(2)}
            </div>
            <div className="text-[11px] font-bold text-slate-500 font-mono">
              الأساس: {baseRatios.altmanZScore.score.toFixed(2)}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight line-clamp-1">
            {activeRatios.altmanZScore.title}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: INTERACTIVE SIMULATOR (INPUTS & RATIOS)                           */}
      {/* ========================================================================= */}
      {viewMode === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Input Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Sensitivity Shocks / Triggers */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span>محفزات الصدمات والحساسية السريعة (One-Click Sensitivity Triggers):</span>
                </div>
                <span className="text-[11px] text-slate-500">تطبيق لحظي على أرقام السيناريو</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyShock('SALES_PLUS_10')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  +10% مبيعات
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('SALES_MINUS_15')}
                  className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  -15% مبيعات
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('IMPROVE_GROSS_MARGIN')}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  تحسين الهامش (خفض التكلفة 7%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('COLLECT_RECEIVABLES_30')}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  تحصيل 30% من العملاء نقدًا
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('PAY_SHORT_DEBT_50')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  سداد 50% تسهيلات بنكية
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('INJECT_EQUITY_1M')}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  +1 مليون زيادة رأس مال
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyShock('RESET_TO_ACTUALS')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة للفعلي</span>
                </button>
              </div>
            </div>

            {/* 1. CURRENT ASSETS (الأصول المتداولة) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-emerald-50/70 border-b border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>1. الأصول المتداولة (Current Assets)</span>
                </div>
                <span className="font-mono font-black text-emerald-950 text-xs">
                  الإجمالي: {formatEgyptianCurrency(activeRatios.totalCurrentAssets)}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">النقدية وما في حكمها بالبنوك والخزينة:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.cashAndBanks}
                    onChange={(e) => handleUpdateBalanceSheet('cashAndBanks', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-emerald-950 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">العملاء والمدينون التجاريون:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.tradeReceivables}
                    onChange={(e) => handleUpdateBalanceSheet('tradeReceivables', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المخزون السلعي والبضاعة:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.inventory}
                    onChange={(e) => handleUpdateBalanceSheet('inventory', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">أوراق قبض وأرصدة مدينة أخرى:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.notesReceivable + activeScenario.balanceSheet.prepaymentsAndOther}
                    onChange={(e) => handleUpdateBalanceSheet('prepaymentsAndOther', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 2. NON-CURRENT ASSETS (الأصول غير المتداولة) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-blue-50/70 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                  <Building className="w-4 h-4 text-blue-700" />
                  <span>2. الأصول غير المتداولة (Non-Current Assets)</span>
                </div>
                <span className="font-mono font-black text-blue-950 text-xs">
                  الإجمالي: {formatEgyptianCurrency(activeRatios.totalNonCurrentAssets)}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الأصول الثابتة بالصافي (PPE):</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.netFixedAssets}
                    onChange={(e) => handleUpdateBalanceSheet('netFixedAssets', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مشروعات تحت التنفيذ واستثمارات:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.projectsUnderConstruction + activeScenario.balanceSheet.longTermInvestments}
                    onChange={(e) => handleUpdateBalanceSheet('projectsUnderConstruction', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. CURRENT LIABILITIES (الالتزامات المتداولة) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                  <Scale className="w-4 h-4 text-amber-700" />
                  <span>3. الالتزامات المتداولة (Current Liabilities)</span>
                </div>
                <span className="font-mono font-black text-amber-950 text-xs">
                  الإجمالي: {formatEgyptianCurrency(activeRatios.totalCurrentLiabilities)}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الموردون والدائنون التجاريون:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.tradePayables}
                    onChange={(e) => handleUpdateBalanceSheet('tradePayables', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تسهيلات بنكية وقروض قصيرة الأجل:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.shortTermLoans}
                    onChange={(e) => handleUpdateBalanceSheet('shortTermLoans', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-amber-950 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">أوراق دفع ومصروفات مستحقة:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.accruedAndOtherPayables + activeScenario.balanceSheet.notesPayable}
                    onChange={(e) => handleUpdateBalanceSheet('accruedAndOtherPayables', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">قروض طويلة الأجل (غير متداولة):</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.longTermLoans}
                    onChange={(e) => handleUpdateBalanceSheet('longTermLoans', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>
            </div>

            {/* 4. EQUITY & INCOME STATEMENT (حقوق الملكية وقائمة الدخل) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-purple-50/70 border-b border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-purple-950">
                  <Layers className="w-4 h-4 text-purple-700" />
                  <span>4. حقوق الملكية وقائمة الدخل (Equity & Income Statement)</span>
                </div>
                <span className="font-mono font-black text-purple-950 text-xs">
                  حقوق الملكية: {formatEgyptianCurrency(activeRatios.totalEquity)}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رأس المال المدفوع:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.paidUpCapital}
                    onChange={(e) => handleUpdateBalanceSheet('paidUpCapital', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الاحتياطيات والأرباح المرحلة:</label>
                  <input
                    type="number"
                    value={activeScenario.balanceSheet.retainedEarnings + activeScenario.balanceSheet.legalReserve}
                    onChange={(e) => handleUpdateBalanceSheet('retainedEarnings', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">إجمالي المبيعات / الإيرادات:</label>
                  <input
                    type="number"
                    value={activeScenario.incomeStatement.revenues}
                    onChange={(e) => handleUpdateIncomeStatement('revenues', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-emerald-950 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة المبيعات (COGS):</label>
                  <input
                    type="number"
                    value={activeScenario.incomeStatement.costOfGoodsSold}
                    onChange={(e) => handleUpdateIncomeStatement('costOfGoodsSold', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المصروفات الإدارية والبيعية:</label>
                  <input
                    type="number"
                    value={activeScenario.incomeStatement.administrativeExpenses + activeScenario.incomeStatement.sellingAndMarketingExpenses}
                    onChange={(e) => handleUpdateIncomeStatement('administrativeExpenses', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة التمويل والفوائد:</label>
                  <input
                    type="number"
                    value={activeScenario.incomeStatement.financeCosts}
                    onChange={(e) => handleUpdateIncomeStatement('financeCosts', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-red-950 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right / Live Financial Ratios & DuPont Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Category Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setActiveCategoryFilter('LIQUIDITY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === 'LIQUIDITY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                السيولة
              </button>
              <button
                onClick={() => setActiveCategoryFilter('PROFITABILITY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === 'PROFITABILITY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الربحية
              </button>
              <button
                onClick={() => setActiveCategoryFilter('SOLVENCY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === 'SOLVENCY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الرافعة والديون
              </button>
              <button
                onClick={() => setActiveCategoryFilter('ACTIVITY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === 'ACTIVITY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكفاءة
              </button>
            </div>

            {/* Ratios Breakdown List */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>مصفوفة النسب والمؤشرات المالية اللحظية:</span>
                <span className="text-[10px] text-slate-500">محدثة فوراً مع أي تعديل</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {/* 1. Liquidity */}
                {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'LIQUIDITY') && (
                  <div className="py-2.5 space-y-2">
                    <div className="font-bold text-emerald-900 text-[11px]">مؤشرات السيولة ورأس المال العامل:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">نسبة السيولة السريعة (Quick):</div>
                        <div className="text-sm font-black font-mono text-slate-900">{activeRatios.quickRatio.formatted}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(activeRatios.quickRatio.status)}`}>
                          {activeRatios.quickRatio.benchmark}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">نسبة السيولة النقدية (Cash):</div>
                        <div className="text-sm font-black font-mono text-slate-900">{activeRatios.cashRatio.formatted}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(activeRatios.cashRatio.status)}`}>
                          {activeRatios.cashRatio.benchmark}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Profitability */}
                {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'PROFITABILITY') && (
                  <div className="py-2.5 space-y-2">
                    <div className="font-bold text-purple-900 text-[11px]">مؤشرات الربحية وهوامش العائد:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[10px]">هامش مجمل الربح:</div>
                        <div className="text-xs font-black font-mono text-slate-900">{activeRatios.grossProfitMargin.toFixed(1)}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[10px]">هامش التشغيل (EBIT):</div>
                        <div className="text-xs font-black font-mono text-slate-900">{activeRatios.operatingMargin.toFixed(1)}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[10px]">العائد على الأصول (ROA):</div>
                        <div className="text-xs font-black font-mono text-emerald-950">{activeRatios.returnOnAssets.formatted}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Solvency & Debt */}
                {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'SOLVENCY') && (
                  <div className="py-2.5 space-y-2">
                    <div className="font-bold text-amber-900 text-[11px]">مؤشرات الرافعة المالية والديون:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">نسبة الديون للملكية (D/E):</div>
                        <div className="text-sm font-black font-mono text-slate-900">{activeRatios.debtToEquityRatio.formatted}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(activeRatios.debtToEquityRatio.status)}`}>
                          {activeRatios.debtToEquityRatio.benchmark}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">تغطية الفوائد (Interest Cov):</div>
                        <div className="text-sm font-black font-mono text-slate-900">{activeRatios.interestCoverageRatio.formatted}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(activeRatios.interestCoverageRatio.status)}`}>
                          {activeRatios.interestCoverageRatio.benchmark}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Activity & CCC */}
                {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'ACTIVITY') && (
                  <div className="py-2.5 space-y-2">
                    <div className="font-bold text-blue-900 text-[11px]">مؤشرات دورة التشغيل والكفاءة:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-slate-500 text-[10px]">فترة العملاء (DSO)</div>
                        <div className="text-xs font-black font-mono text-slate-900">{activeRatios.daysSalesOutstanding.formatted}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-slate-500 text-[10px]">فترة المخزون (DSI)</div>
                        <div className="text-xs font-black font-mono text-slate-900">{activeRatios.daysInInventory.formatted}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-slate-500 text-[10px]">دورة النقد (CCC)</div>
                        <div className="text-xs font-black font-mono text-indigo-950">{activeRatios.cashConversionCycle.formatted}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DuPont 3-Point Interactive Visualization */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Activity className="w-4 h-4 text-purple-300" />
                  <span>تحليل ديبونت ثلاثي المحاور (DuPont Analysis):</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 font-bold">
                  ROE = {activeRatios.duPont.calculatedRoe.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                  <div className="text-slate-300 text-[10px]">هامش صافي الربح</div>
                  <div className="text-sm font-black font-mono text-white mt-0.5">
                    {activeRatios.duPont.netProfitMargin.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-purple-200">الربحية التشغيلية</span>
                </div>

                <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                  <div className="text-slate-300 text-[10px]">دوران الأصول</div>
                  <div className="text-sm font-black font-mono text-white mt-0.5">
                    {activeRatios.duPont.assetTurnover.toFixed(2)}x
                  </div>
                  <span className="text-[9px] text-indigo-200">كفاءة الأصول</span>
                </div>

                <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                  <div className="text-slate-300 text-[10px]">مضاعف الرافعة</div>
                  <div className="text-sm font-black font-mono text-white mt-0.5">
                    {activeRatios.duPont.equityMultiplier.toFixed(2)}x
                  </div>
                  <span className="text-[9px] text-teal-200">الهيكل التمويلي</span>
                </div>
              </div>

              <p className="text-[10px] text-purple-200 text-center leading-relaxed">
                معادلة ديبونت: العائد على الملكية ({activeRatios.duPont.calculatedRoe.toFixed(1)}%) = هامش الربح ({activeRatios.duPont.netProfitMargin.toFixed(1)}%) × دوران الأصول ({activeRatios.duPont.assetTurnover.toFixed(2)}) × مضاعف الرافعة ({activeRatios.duPont.equityMultiplier.toFixed(2)}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SIDE-BY-SIDE VARIANCE MATRIX                                      */}
      {/* ========================================================================= */}
      {viewMode === 'COMPARISON' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-900">
                مصفوفة مقارنة التباين: {baseScenario.name} ⟷ {activeScenario.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توضح هذه المصفوفة الفارق المطلق ونسبة التغير لكل بند مالي ونسبة سيولة أو ربحية.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 font-mono">
              السنة المالية: {fiscalYear}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">البند المالي / المؤشر</th>
                  <th className="py-2.5 px-3 text-center font-mono w-40">الأساس الفعلي (Base)</th>
                  <th className="py-2.5 px-3 text-center font-mono w-40">السيناريو الافتراضي (Simulated)</th>
                  <th className="py-2.5 px-3 text-center font-mono w-36">الفارق (Variance)</th>
                  <th className="py-2.5 px-3 text-center font-mono w-28">نسبة التغير %</th>
                  <th className="py-2.5 px-3 text-center w-36">الأثر المالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Revenues */}
                {(() => {
                  const v = getVariance(baseScenario.incomeStatement.revenues, activeScenario.incomeStatement.revenues);
                  return (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">إجمالي المبيعات / الإيرادات</td>
                      <td className="py-2 px-3 text-center font-mono">{formatEgyptianCurrency(baseScenario.incomeStatement.revenues)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-purple-950">{formatEgyptianCurrency(activeScenario.incomeStatement.revenues)}</td>
                      <td className={`py-2 px-3 text-center font-mono font-bold ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.formattedDiff}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.isPositive ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
                          {v.isPositive ? 'زيادة حجم الأعمال' : 'انكماش مبيعات'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 2. Net Profit */}
                {(() => {
                  const v = getVariance(baseRatios.netProfit, activeRatios.netProfit);
                  return (
                    <tr className="hover:bg-slate-50 bg-purple-50/20">
                      <td className="py-2 px-3 font-bold text-slate-900">صافي الربح بعد الضريبة</td>
                      <td className="py-2 px-3 text-center font-mono">{formatEgyptianCurrency(baseRatios.netProfit)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-950">{formatEgyptianCurrency(activeRatios.netProfit)}</td>
                      <td className={`py-2 px-3 text-center font-mono font-bold ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.formattedDiff}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.isPositive ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
                          {v.isPositive ? 'تحسن الربحية' : 'تراجع الربحية'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 3. Cash & Banks */}
                {(() => {
                  const v = getVariance(baseScenario.balanceSheet.cashAndBanks, activeScenario.balanceSheet.cashAndBanks);
                  return (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">النقدية وما في حكمها</td>
                      <td className="py-2 px-3 text-center font-mono">{formatEgyptianCurrency(baseScenario.balanceSheet.cashAndBanks)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{formatEgyptianCurrency(activeScenario.balanceSheet.cashAndBanks)}</td>
                      <td className={`py-2 px-3 text-center font-mono font-bold ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.formattedDiff}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.isPositive ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {v.isPositive ? 'وفرة سيولة' : 'سحب نقدي'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 4. Current Ratio */}
                {(() => {
                  const v = getVariance(baseRatios.currentRatio.value, activeRatios.currentRatio.value, false);
                  return (
                    <tr className="hover:bg-slate-50 font-bold bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-900">نسبة التداول (Current Ratio)</td>
                      <td className="py-2 px-3 text-center font-mono">{baseRatios.currentRatio.formatted}</td>
                      <td className="py-2 px-3 text-center font-mono text-purple-950">{activeRatios.currentRatio.formatted}</td>
                      <td className={`py-2 px-3 text-center font-mono ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.diff > 0 ? '+' : ''}{v.diff.toFixed(2)}x</td>
                      <td className="py-2 px-3 text-center font-mono">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(activeRatios.currentRatio.status)}`}>
                          {activeRatios.currentRatio.status === 'EXCELLENT' ? 'ملاءة ممتازة' : 'مقبول'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 5. Quick Ratio */}
                {(() => {
                  const v = getVariance(baseRatios.quickRatio.value, activeRatios.quickRatio.value, false);
                  return (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">نسبة السيولة السريعة (Quick Ratio)</td>
                      <td className="py-2 px-3 text-center font-mono">{baseRatios.quickRatio.formatted}</td>
                      <td className="py-2 px-3 text-center font-mono text-purple-950">{activeRatios.quickRatio.formatted}</td>
                      <td className={`py-2 px-3 text-center font-mono ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.diff > 0 ? '+' : ''}{v.diff.toFixed(2)}x</td>
                      <td className="py-2 px-3 text-center font-mono">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(activeRatios.quickRatio.status)}`}>
                          {activeRatios.quickRatio.benchmark}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 6. Net Working Capital */}
                {(() => {
                  const v = getVariance(baseRatios.netWorkingCapital, activeRatios.netWorkingCapital);
                  return (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">صافي رأس المال العامل (NWC)</td>
                      <td className="py-2 px-3 text-center font-mono">{formatEgyptianCurrency(baseRatios.netWorkingCapital)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-indigo-950">{formatEgyptianCurrency(activeRatios.netWorkingCapital)}</td>
                      <td className={`py-2 px-3 text-center font-mono font-bold ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.formattedDiff}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.isPositive ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {v.isPositive ? 'تحسن رأس المال العامل' : 'انكماش'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 7. Return on Equity (ROE) */}
                {(() => {
                  const v = getVariance(baseRatios.returnOnEquity.value, activeRatios.returnOnEquity.value, true);
                  return (
                    <tr className="hover:bg-slate-50 bg-emerald-50/20 font-bold">
                      <td className="py-2 px-3 text-slate-900">العائد على حقوق الملكية (ROE)</td>
                      <td className="py-2 px-3 text-center font-mono">{baseRatios.returnOnEquity.formatted}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-950">{activeRatios.returnOnEquity.formatted}</td>
                      <td className={`py-2 px-3 text-center font-mono ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.formattedDiff}</td>
                      <td className="py-2 px-3 text-center font-mono">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(activeRatios.returnOnEquity.status)}`}>
                          {activeRatios.returnOnEquity.benchmark}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 8. Debt to Equity */}
                {(() => {
                  const v = getVariance(baseRatios.debtToEquityRatio.value, activeRatios.debtToEquityRatio.value, false);
                  const isDeImprovement = v.diff < 0; // lower D/E is safer
                  return (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">نسبة الديون للملكية (D/E)</td>
                      <td className="py-2 px-3 text-center font-mono">{baseRatios.debtToEquityRatio.formatted}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-900">{activeRatios.debtToEquityRatio.formatted}</td>
                      <td className={`py-2 px-3 text-center font-mono ${isDeImprovement ? 'text-emerald-700' : 'text-amber-700'}`}>{v.diff > 0 ? '+' : ''}{v.diff.toFixed(2)}x</td>
                      <td className="py-2 px-3 text-center font-mono">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDeImprovement ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {isDeImprovement ? 'خفض المديونية' : 'زيادة الرافعة'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

                {/* 9. Altman Z-Score */}
                {(() => {
                  const v = getVariance(baseRatios.altmanZScore.score, activeRatios.altmanZScore.score, false);
                  return (
                    <tr className="hover:bg-slate-50 font-bold">
                      <td className="py-2 px-3 text-slate-900">مؤشر السلامة المالية (Altman Z-Score)</td>
                      <td className="py-2 px-3 text-center font-mono">{baseRatios.altmanZScore.score.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-purple-950">{activeRatios.altmanZScore.score.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-center font-mono ${v.isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{v.diff > 0 ? '+' : ''}{v.diff.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono">{v.formattedPct}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeRatios.altmanZScore.zone === 'SAFE' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {activeRatios.altmanZScore.zone === 'SAFE' ? 'منطقة أمان' : 'مراقبة'}
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: CERTIFIED OFFICIAL PRINTABLE REPORT (A4 DOCUMENT)                 */}
      {/* ========================================================================= */}
      {(viewMode === 'REPORT_PREVIEW' || isExportingPdf) && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>معاينة المستند الرسمي المعتمد لتقرير السيناريو الافتراضي (جاهز للتصدير كـ PDF):</span>
            </div>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل ملف PDF الآن</span>
            </button>
          </div>

          {/* Printable Official Document */}
          <div
            id="financial-simulator-report"
            className="bg-white rounded-xl border-2 border-emerald-900 shadow-lg p-7 sm:p-10 text-slate-900 text-xs leading-relaxed max-w-4xl mx-auto space-y-4"
          >
            {/* Header */}
            <div className="border-b-2 border-emerald-900 pb-3.5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <h1 className="text-base sm:text-lg font-black text-slate-900">{profile.firmName}</h1>
                <div className="text-sm font-bold text-emerald-900">{profile.auditorName}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  سجل المحاسبين والمراجعين: <strong>{profile.licenseNumber || 'س.م.م / 43122 - وزارة المالية'}</strong>
                </div>
              </div>
              <div className="text-left font-mono text-[11px] text-slate-700 space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/70">
                <div>كود التقرير: <strong className="text-emerald-950 font-bold">{reportDocNumber}</strong></div>
                <div>تاريخ المحاكاة: <strong>{new Date().toISOString().slice(0, 10)}</strong></div>
                <div>السنة المالية المستهدفة: <strong>{fiscalYear}</strong></div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-1">
              <div className="inline-block px-8 py-2 rounded-xl bg-emerald-50/90 border-2 border-emerald-800 shadow-2xs">
                <h2 className="text-sm sm:text-base font-black text-emerald-950">
                  تقرير محاكاة السيناريوهات المالية وتحليل الحساسية الافتراضية
                </h2>
              </div>
              <div className="text-xs font-bold text-emerald-900 mt-1">
                اسم السيناريو المعتمد: {activeScenario.name}
              </div>
            </div>

            {/* Summary Note */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <strong>وصف ومنهجية السيناريو:</strong> {activeScenario.description || 'تم إعداد هذا التحليل الافتراضي لتقييم كفاءة القرارات الإدارية، وهيكل السيولة، والقدرة على خدمة الالتزامات وفقاً لمعايير المحاسبة المصرية.'}
            </div>

            {/* Comparative Summary Table */}
            <div className="space-y-1.5">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>جدول المقارنة المالية ومؤشرات الأداء الرئيسية:</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-right border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5">المؤشر / البند المالي</th>
                      <th className="py-2 px-2.5 text-center font-mono">الأساس الفعلي</th>
                      <th className="py-2 px-2.5 text-center font-mono">السيناريو الافتراضي</th>
                      <th className="py-2 px-2.5 text-center font-mono">الفارق</th>
                      <th className="py-2 px-2.5 text-center">التقييم المهني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">إجمالي المبيعات / الإيرادات</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{formatEgyptianCurrency(baseScenario.incomeStatement.revenues)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{formatEgyptianCurrency(activeScenario.incomeStatement.revenues)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseScenario.incomeStatement.revenues, activeScenario.incomeStatement.revenues).formattedDiff}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">حجم النشاط التشغيلي</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">صافي الربح بعد الضريبة</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{formatEgyptianCurrency(baseRatios.netProfit)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{formatEgyptianCurrency(activeRatios.netProfit)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.netProfit, activeRatios.netProfit).formattedDiff}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">هامش صافي {activeRatios.netProfitMargin.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">نسبة التداول (Current Ratio)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{baseRatios.currentRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{activeRatios.currentRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.currentRatio.value, activeRatios.currentRatio.value).diff > 0 ? '+' : ''}{getVariance(baseRatios.currentRatio.value, activeRatios.currentRatio.value).diff.toFixed(2)}x</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">{activeRatios.currentRatio.benchmark}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">نسبة السيولة السريعة (Quick Ratio)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{baseRatios.quickRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{activeRatios.quickRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.quickRatio.value, activeRatios.quickRatio.value).diff > 0 ? '+' : ''}{getVariance(baseRatios.quickRatio.value, activeRatios.quickRatio.value).diff.toFixed(2)}x</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">{activeRatios.quickRatio.benchmark}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">صافي رأس المال العامل (NWC)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{formatEgyptianCurrency(baseRatios.netWorkingCapital)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{formatEgyptianCurrency(activeRatios.netWorkingCapital)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.netWorkingCapital, activeRatios.netWorkingCapital).formattedDiff}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">أمان تشغيلي</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">العائد على حقوق الملكية (ROE)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{baseRatios.returnOnEquity.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{activeRatios.returnOnEquity.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.returnOnEquity.value, activeRatios.returnOnEquity.value, true).formattedDiff}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">مردود استثماري</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">نسبة الديون لحقوق الملكية (D/E)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{baseRatios.debtToEquityRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{activeRatios.debtToEquityRatio.formatted}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.debtToEquityRatio.value, activeRatios.debtToEquityRatio.value).diff > 0 ? '+' : ''}{getVariance(baseRatios.debtToEquityRatio.value, activeRatios.debtToEquityRatio.value).diff.toFixed(2)}x</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">الرافعة المالية</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-bold">مؤشر التنبؤ المالي (Altman Z)</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{baseRatios.altmanZScore.score.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-950">{activeRatios.altmanZScore.score.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{getVariance(baseRatios.altmanZScore.score, activeRatios.altmanZScore.score).diff > 0 ? '+' : ''}{getVariance(baseRatios.altmanZScore.score, activeRatios.altmanZScore.score).diff.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold text-emerald-800">{activeRatios.altmanZScore.title}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* DuPont Breakdown Box */}
            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-slate-800 space-y-1">
              <div className="font-bold text-emerald-950">تفكيك ديبونت للعائد على حقوق الملكية (DuPont Decomposition):</div>
              <div className="text-[11px] text-slate-700">
                العائد على الملكية ({activeRatios.duPont.calculatedRoe.toFixed(1)}%) = هامش صافي الربح ({activeRatios.duPont.netProfitMargin.toFixed(1)}%) × معدل دوران الأصول ({activeRatios.duPont.assetTurnover.toFixed(2)} مرة) × مضاعف الرافعة المالية ({activeRatios.duPont.equityMultiplier.toFixed(2)} مرة).
              </div>
            </div>

            {/* Footer with Code 128 Barcode & Stamp */}
            <div className="pt-4 border-t-2 border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-right">
                <div className="text-xs text-slate-500 font-bold">المحاسب القانوني ومراقب الحسابات:</div>
                <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
                <div className="text-slate-600 font-mono text-[11px]">
                  رقم القيد: <strong>{profile.licenseNumber || 'س.م.م / 43122 - ترخيص وزارة المالية'}</strong>
                </div>
                <div className="text-emerald-950 font-mono font-bold text-[11px]">
                  هاتف المكتب: <strong>{profile.phone || '01003335360'}</strong>
                </div>
              </div>

              {/* Barcode and Stamp */}
              <div className="flex items-center gap-3">
                {/* Code 128 Linear Barcode */}
                <div
                  onClick={() => {
                    const verificationPayload: VerificationPayloadData = {
                      docType: 'تقرير محاكاة السيناريوهات المالية وتحليل الحساسية',
                      docNumber: reportDocNumber,
                      clientName: 'شركة النيل للصناعات الهندسية والتجارة (ش.م.م)',
                      amount: activeRatios.netProfit,
                      auditorName: profile.auditorName,
                      licenseNumber: profile.licenseNumber || 'س.م.م 43122',
                      date: new Date().toISOString().slice(0, 10),
                      recipient: 'الإدارة والجمعية العامة والجهات التمويلية',
                      purpose: `محاكاة سيناريو: ${activeScenario.name}`,
                      firmName: profile.firmName,
                    };
                    setVerifyModalData(verificationPayload);
                  }}
                  className="barcode-print-container cursor-pointer text-center bg-white p-2 rounded-lg border border-slate-300 shadow-2xs hover:border-emerald-600 transition-all inline-block"
                  data-barcode-container="true"
                  title="الباركود الخطي المصرفي المعتمد (Code 128)"
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateCode128Svg(reportDocNumber, { height: 42, moduleWidth: 1.8, showText: true }),
                    }}
                  />
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-1 px-1 no-print">
                    <span>كود: {reportDocNumber}</span>
                    <span className="text-emerald-800 font-bold">🔍 تحقق</span>
                  </div>
                </div>

                {/* Stamp */}
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[8.5px] font-bold text-emerald-950 p-1 text-center shadow-2xs bg-emerald-50/20">
                  <span>مكتب المحاسب القانوني</span>
                  <span className="text-emerald-800 font-black text-[10px]">{profile.auditorName}</span>
                  <span className="font-mono text-[8px]">{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</span>
                  <span className="text-[8.5px] text-emerald-700 font-bold">ختم الاعتماد الرسمي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyModalData && (
        <DocumentVerificationModal
          data={verifyModalData}
          onClose={() => setVerifyModalData(null)}
        />
      )}
    </div>
  );
};
