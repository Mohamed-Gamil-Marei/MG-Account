import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  DollarSign,
  PieChart,
  Layers,
  ArrowDownCircle,
  HelpCircle,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';

export interface BankCriteriaPreset {
  id: string;
  name: string;
  maxDebtToEquity: number;
  minDscr: number;
  minCurrentRatio: number;
  maxTurnoverToLoan: number; // loan cannot exceed e.g. 35% of annual turnover
  preferredCollateralCoverage: number; // e.g. 120%
  description: string;
}

export const EGYPTIAN_BANKS_PRESETS: BankCriteriaPreset[] = [
  {
    id: 'NBE',
    name: 'البنك الأهلي المصري (NBE)',
    maxDebtToEquity: 1.8,
    minDscr: 1.35,
    minCurrentRatio: 1.25,
    maxTurnoverToLoan: 0.35,
    preferredCollateralCoverage: 1.25,
    description: 'تركيز صارم على تدفقات النشاط التشغيلي ومعدل تغطية خدمة الدين وكفاية الضمانات العينية.',
  },
  {
    id: 'BANQUE_MISR',
    name: 'بنك مصر (BM)',
    maxDebtToEquity: 2.0,
    minDscr: 1.30,
    minCurrentRatio: 1.20,
    maxTurnoverToLoan: 0.40,
    preferredCollateralCoverage: 1.20,
    description: 'مرونة في هيكل رأس المال العامل مع اشتراط انتظام الإيداعات البنكية المباشرة.',
  },
  {
    id: 'CIB',
    name: 'البنك التجاري الدولي (CIB)',
    maxDebtToEquity: 1.5,
    minDscr: 1.40,
    minCurrentRatio: 1.30,
    maxTurnoverToLoan: 0.30,
    preferredCollateralCoverage: 1.30,
    description: 'معايير إدارة مخاطر دولية متشددة مع فحص تفصيلي لدورة تحويل النقدية وجودة العملاء.',
  },
  {
    id: 'QNB',
    name: 'بنك قطر الوطني الأهلي (QNB)',
    maxDebtToEquity: 1.8,
    minDscr: 1.30,
    minCurrentRatio: 1.25,
    maxTurnoverToLoan: 0.35,
    preferredCollateralCoverage: 1.20,
    description: 'تقييم شامل للضمانات التضامنية وأوامر التوريد والقدرة التوسعية للمنشأة.',
  },
  {
    id: 'IDB',
    name: 'بنك التنمية الصناعية (IDB)',
    maxDebtToEquity: 2.2,
    minDscr: 1.25,
    minCurrentRatio: 1.15,
    maxTurnoverToLoan: 0.45,
    preferredCollateralCoverage: 1.15,
    description: 'تسهيلات ميسرة للمصانع والقطاع الإنتاجي مع فترات سماح وتمويل آلات ومعدات.',
  },
  {
    id: 'MSMEDA',
    name: 'جهاز تنمية المشروعات (MSMEDA)',
    maxDebtToEquity: 2.5,
    minDscr: 1.20,
    minCurrentRatio: 1.10,
    maxTurnoverToLoan: 0.50,
    preferredCollateralCoverage: 1.00,
    description: 'مبادرات تمويل المشروعات الصغيرة والمتوسطة بفوائد مدعومة وضمانات مرنة.',
  },
];

interface SmartCreditSuiteProps {
  yearsData: Record<number, FiscalYearData>;
  yearsList: number[];
  computedData: Record<number, any>;
  onApplyEngineeredNumbers: (engineeredData: Record<number, Partial<FiscalYearData>>) => void;
  clientName?: string;
}

export const SmartCreditSuite: React.FC<SmartCreditSuiteProps> = ({
  yearsData,
  yearsList,
  computedData,
  onApplyEngineeredNumbers,
  clientName,
}) => {
  const [selectedBankId, setSelectedBankId] = useState<string>('NBE');
  const [targetLoanAmount, setTargetLoanAmount] = useState<number>(10000000);
  const [interestRate, setInterestRate] = useState<number>(24);
  const [repaymentYears, setRepaymentYears] = useState<number>(3);
  const [bankTurnoverDeposits, setBankTurnoverDeposits] = useState<number>(29000000);
  const [collateralValue, setCollateralValue] = useState<number>(16000000);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'REVERSE_ENGINEERING' | 'BANK_SIMULATOR' | 'TURNOVER_RECON'>('REVERSE_ENGINEERING');

  const selectedBank = useMemo(() => {
    return EGYPTIAN_BANKS_PRESETS.find((b) => b.id === selectedBankId) || EGYPTIAN_BANKS_PRESETS[0];
  }, [selectedBankId]);

  const latestYear = useMemo(() => Math.max(...yearsList), [yearsList]);
  const latestCalculations = computedData[latestYear] || {};
  const currentSales = latestCalculations.sales || 20000000;
  const currentNetProfit = latestCalculations.netProfit || 3000000;
  const currentEquity = latestCalculations.totalEquity || 15000000;
  const currentDebt = (latestCalculations.shortLoans || 0) + (latestCalculations.longLoans || 0);

  // -------------------------------------------------------------
  // 1. REVERSE ENGINEERING CALCULATIONS
  // -------------------------------------------------------------
  // What should the minimum sales, profit, and equity be to comfortably qualify for this loan?
  const requiredAnnualSales = useMemo(() => {
    return Math.round(targetLoanAmount / selectedBank.maxTurnoverToLoan);
  }, [targetLoanAmount, selectedBank]);

  // Loan annual installment + interest
  const annualLoanService = useMemo(() => {
    const principalPerYear = targetLoanAmount / repaymentYears;
    const avgAnnualInterest = (targetLoanAmount * (interestRate / 100)) * 0.7; // amortizing average
    return principalPerYear + avgAnnualInterest;
  }, [targetLoanAmount, repaymentYears, interestRate]);

  // Required Operating Profit (EBITDA / Operating Cashflow) to meet bank DSCR
  const requiredMinOperatingCashflow = useMemo(() => {
    return Math.round(annualLoanService * selectedBank.minDscr);
  }, [annualLoanService, selectedBank]);

  // Required Minimum Equity to meet max Debt-to-Equity
  const requiredMinEquity = useMemo(() => {
    const totalFutureDebt = currentDebt + targetLoanAmount;
    return Math.round(totalFutureDebt / selectedBank.maxDebtToEquity);
  }, [currentDebt, targetLoanAmount, selectedBank]);

  // Required Collateral
  const requiredMinCollateral = useMemo(() => {
    return Math.round(targetLoanAmount * selectedBank.preferredCollateralCoverage);
  }, [targetLoanAmount, selectedBank]);

  // -------------------------------------------------------------
  // 2. BANK SIMULATOR STATUS & METRICS
  // -------------------------------------------------------------
  const simMetrics = useMemo(() => {
    const totalDebt = currentDebt + targetLoanAmount;
    const debtToEquity = currentEquity > 0 ? totalDebt / currentEquity : 99;
    const currentRatio = latestCalculations.currentRatio || 1.35;
    const dscr = annualLoanService > 0 ? (latestCalculations.operatingCashFlow || currentNetProfit * 1.3) / annualLoanService : 2.0;
    const turnoverCoverage = currentSales > 0 ? targetLoanAmount / currentSales : 1;
    const collateralCoverage = targetLoanAmount > 0 ? collateralValue / targetLoanAmount : 0;

    const d2eStatus = debtToEquity <= selectedBank.maxDebtToEquity;
    const dscrStatus = dscr >= selectedBank.minDscr;
    const crStatus = currentRatio >= selectedBank.minCurrentRatio;
    const turnoverStatus = turnoverCoverage <= selectedBank.maxTurnoverToLoan;
    const colStatus = collateralCoverage >= selectedBank.preferredCollateralCoverage;

    const scoreArr = [d2eStatus, dscrStatus, crStatus, turnoverStatus, colStatus];
    const passCount = scoreArr.filter(Boolean).length;

    let overallDecision: 'APPROVED' | 'CONDITIONAL' | 'RISKY' = 'APPROVED';
    if (passCount === 5) overallDecision = 'APPROVED';
    else if (passCount >= 3) overallDecision = 'CONDITIONAL';
    else overallDecision = 'RISKY';

    return {
      debtToEquity,
      dscr,
      currentRatio,
      turnoverCoverage,
      collateralCoverage,
      d2eStatus,
      dscrStatus,
      crStatus,
      turnoverStatus,
      colStatus,
      passCount,
      overallDecision,
    };
  }, [currentDebt, targetLoanAmount, currentEquity, latestCalculations, annualLoanService, currentNetProfit, currentSales, collateralValue, selectedBank]);

  // -------------------------------------------------------------
  // 3. BANK STATEMENT TURNOVER RECONCILIATION
  // -------------------------------------------------------------
  const turnoverRatio = useMemo(() => {
    if (!currentSales) return 0;
    return (bankTurnoverDeposits / currentSales) * 100;
  }, [bankTurnoverDeposits, currentSales]);

  // Handle Apply Reverse Engineering
  const handleApplyEngineeredPlan = () => {
    setIsApplying(true);
    try {
      // Calculate balanced target fiscal structure
      const targetSales = Math.max(currentSales, requiredAnnualSales);
      const targetCogs = Math.round(targetSales * 0.65);
      const targetGrossProfit = targetSales - targetCogs;
      const targetAdmin = Math.round(targetSales * 0.08);
      const targetFinance = Math.round(annualLoanService * 0.4);
      const targetEbit = targetGrossProfit - targetAdmin;
      const targetNetProfit = Math.round(targetEbit - targetFinance);

      const targetCash = Math.round(targetSales * 0.08);
      const targetReceivables = Math.round(targetSales * 0.22);
      const targetInventory = Math.round(targetSales * 0.25);
      const targetFixedAssets = Math.max(requiredMinCollateral, Math.round(targetSales * 0.7));

      const totalTargetAssets = targetCash + targetReceivables + targetInventory + targetFixedAssets;
      const targetShortLoans = Math.round(targetLoanAmount * 0.6);
      const targetLongLoans = Math.round(targetLoanAmount * 0.4);
      const targetSuppliers = Math.round(targetSales * 0.12);
      const totalLiabilities = targetShortLoans + targetLongLoans + targetSuppliers;
      const targetEquity = Math.max(requiredMinEquity, totalTargetAssets - totalLiabilities);

      const updatedYearData: Partial<FiscalYearData> = {
        sales: targetSales,
        cogs: targetCogs,
        grossProfit: targetGrossProfit,
        adminExp: targetAdmin,
        financeExp: targetFinance,
        ebit: targetEbit,
        netProfit: targetNetProfit,
        cash: targetCash,
        receivables: targetReceivables,
        inventory: targetInventory,
        netFixedAssets: targetFixedAssets,
        shortLoans: targetShortLoans,
        longLoans: targetLongLoans,
        suppliers: targetSuppliers,
        paidUpCapital: Math.round(targetEquity * 0.4),
        legalReserve: Math.round(targetEquity * 0.1),
        retainedEarningsAndProfit: Math.round(targetEquity * 0.5),
      };

      onApplyEngineeredNumbers({
        [latestYear]: updatedYearData,
      });
    } finally {
      setTimeout(() => setIsApplying(false), 500);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-slate-100 rounded-2xl border border-indigo-500/30 p-4 sm:p-6 shadow-xl mb-6 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>المحرك الائتماني الذكي ومحاكي قرارات البنوك المصرية</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-600 font-mono">
                Bank Intelligence v3.5
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              هندسة عكسية لمتطلبات الائتمان، مطابقة حركة كشف الحساب، وفحص معايير قبول البنك في ثوانٍ.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('REVERSE_ENGINEERING')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REVERSE_ENGINEERING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>الهندسة العكسية للقرض</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BANK_SIMULATOR')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BANK_SIMULATOR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>محاكي قبول البنوك</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TURNOVER_RECON')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TURNOVER_RECON'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>مطابقة كشف الحساب (Turnover)</span>
          </button>
        </div>
      </div>

      {/* Global Quick Inputs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">البنك المستهدف:</label>
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-bold focus:border-indigo-500 focus:outline-hidden"
          >
            {EGYPTIAN_BANKS_PRESETS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">مبلغ التسهيل المطلوب (ج.م):</label>
          <input
            type="number"
            value={targetLoanAmount}
            onChange={(e) => setTargetLoanAmount(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono font-bold focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">سعر الفائدة المتوقع %:</label>
          <input
            type="number"
            step="0.5"
            value={interestRate}
            onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">مدة السداد (سنوات):</label>
          <input
            type="number"
            value={repaymentYears}
            onChange={(e) => setRepaymentYears(parseInt(e.target.value, 10) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">إيداعات كشف الحساب (ج.م):</label>
          <input
            type="number"
            value={bankTurnoverDeposits}
            onChange={(e) => setBankTurnoverDeposits(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-mono focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">قيمة الضمانات المقدرة (ج.م):</label>
          <input
            type="number"
            value={collateralValue}
            onChange={(e) => setCollateralValue(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-300 font-mono focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: REVERSE CREDIT ENGINEERING                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'REVERSE_ENGINEERING' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white">
                  المعادلة العكسية: كم تحتاج المنشأة لتأمين موافقة بنك [{selectedBank.name}] على {formatEgyptianCurrency(targetLoanAmount)}؟
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                يقوم النظام بحساب الحد الأدنى من الإيرادات، والتدفق النقدي، وصافي الأصول، ثم يقوم بضبط وتوزيع القوائم المالية التقديرية بضغطة زر.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyEngineeredPlan}
              disabled={isApplying}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>{isApplying ? 'جاري الضبط والموازنة...' : 'تطبيق الأرقام المتزنة على القوائم فوراً'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Target 1: Sales */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>الحد الأدنى لمبيعات النشاط:</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-lg font-black font-mono text-white">
                {formatEgyptianCurrency(requiredAnnualSales)}
              </div>
              <p className="text-[11px] text-slate-400">
                الوضع الحالي: <span className="font-mono text-slate-300">{formatEgyptianCurrency(currentSales)}</span>{' '}
                {currentSales >= requiredAnnualSales ? (
                  <span className="text-emerald-400 font-bold">✓ كافٍ</span>
                ) : (
                  <span className="text-amber-400 font-bold">▲ يحتاج رفع {Math.round(((requiredAnnualSales - currentSales) / currentSales) * 100)}%</span>
                )}
              </p>
            </div>

            {/* Target 2: Operating Cash Flow */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>التدفق النقدي التشغيلي المطلوب:</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-black font-mono text-emerald-300">
                {formatEgyptianCurrency(requiredMinOperatingCashflow)}
              </div>
              <p className="text-[11px] text-slate-400">
                لتغطية القسط السنوي والفوائد البالغة <strong className="text-slate-200">{formatEgyptianCurrency(annualLoanService)}</strong> بمعامل DSCR {selectedBank.minDscr}x.
              </p>
            </div>

            {/* Target 3: Minimum Equity */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>الحد الأدنى لحقوق الملكية:</span>
                <PieChart className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-black font-mono text-purple-300">
                {formatEgyptianCurrency(requiredMinEquity)}
              </div>
              <p className="text-[11px] text-slate-400">
                للحفاظ على نسبة رافعة مالية D/E لا تتعدى <strong className="text-slate-200">{selectedBank.maxDebtToEquity}x</strong> كما يشترط البنك.
              </p>
            </div>

            {/* Target 4: Collateral */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>الضمانات العينية المطلوبة:</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-black font-mono text-amber-300">
                {formatEgyptianCurrency(requiredMinCollateral)}
              </div>
              <p className="text-[11px] text-slate-400">
                بنسبة تغطية <strong className="text-slate-200">{selectedBank.preferredCollateralCoverage * 100}%</strong> من أصل القرض لضمان القرار الائتماني.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: BANK APPROVAL SIMULATOR                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'BANK_SIMULATOR' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${
                  simMetrics.overallDecision === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : simMetrics.overallDecision === 'CONDITIONAL'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                }`}
              >
                {simMetrics.passCount}/5
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>نتيجة المحاكاة في بنك [{selectedBank.name}]:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      simMetrics.overallDecision === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : simMetrics.overallDecision === 'CONDITIONAL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : 'bg-rose-950 text-rose-300 border border-rose-600'
                    }`}
                  >
                    {simMetrics.overallDecision === 'APPROVED'
                      ? 'موافقة ائتمانية مؤكدة (Low Risk)'
                      : simMetrics.overallDecision === 'CONDITIONAL'
                      ? 'موافقة مشروطة بضمانات إضافية (Moderate Risk)'
                      : 'احتمالية تحفظ من لجنة الائتمان (High Risk)'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">{selectedBank.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
            {/* Condition 1: D/E */}
            <div className={`p-3 rounded-xl border ${simMetrics.d2eStatus ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/30 border-rose-800/80 text-rose-200'}`}>
              <div className="font-bold flex items-center justify-between mb-1">
                <span>الرافعة المالية D/E:</span>
                {simMetrics.d2eStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-base font-mono font-black">{simMetrics.debtToEquity.toFixed(2)}x</div>
              <div className="text-[10px] text-slate-400 mt-1">الحد الأقصى للبنك: {selectedBank.maxDebtToEquity}x</div>
            </div>

            {/* Condition 2: DSCR */}
            <div className={`p-3 rounded-xl border ${simMetrics.dscrStatus ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/30 border-rose-800/80 text-rose-200'}`}>
              <div className="font-bold flex items-center justify-between mb-1">
                <span>تغطية خدمة الدين DSCR:</span>
                {simMetrics.dscrStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-base font-mono font-black">{simMetrics.dscr.toFixed(2)}x</div>
              <div className="text-[10px] text-slate-400 mt-1">الحد الأدنى للبنك: {selectedBank.minDscr}x</div>
            </div>

            {/* Condition 3: Current Ratio */}
            <div className={`p-3 rounded-xl border ${simMetrics.crStatus ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/30 border-rose-800/80 text-rose-200'}`}>
              <div className="font-bold flex items-center justify-between mb-1">
                <span>نسبة التداول والسيولة:</span>
                {simMetrics.crStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-base font-mono font-black">{simMetrics.currentRatio.toFixed(2)}x</div>
              <div className="text-[10px] text-slate-400 mt-1">الحد الأدنى للبنك: {selectedBank.minCurrentRatio}x</div>
            </div>

            {/* Condition 4: Turnover to Loan */}
            <div className={`p-3 rounded-xl border ${simMetrics.turnoverStatus ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/30 border-rose-800/80 text-rose-200'}`}>
              <div className="font-bold flex items-center justify-between mb-1">
                <span>القرض إلى المبيعات:</span>
                {simMetrics.turnoverStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-base font-mono font-black">{(simMetrics.turnoverCoverage * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400 mt-1">الحد الأقصى للبنك: {selectedBank.maxTurnoverToLoan * 100}%</div>
            </div>

            {/* Condition 5: Collateral Coverage */}
            <div className={`p-3 rounded-xl border ${simMetrics.colStatus ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/30 border-rose-800/80 text-rose-200'}`}>
              <div className="font-bold flex items-center justify-between mb-1">
                <span>تغطية الضمانات:</span>
                {simMetrics.colStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-base font-mono font-black">{(simMetrics.collateralCoverage * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-slate-400 mt-1">المطلوب بالبنك: {selectedBank.preferredCollateralCoverage * 100}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BANK STATEMENT TURNOVER RECONCILIATION                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'TURNOVER_RECON' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 text-xs block">إجمالي إيداعات كشف الحساب البنكي السنوي:</span>
              <div className="text-xl font-mono font-black text-cyan-300">
                {formatEgyptianCurrency(bankTurnoverDeposits)}
              </div>
              <span className="text-[11px] text-slate-500 block">إجمالي الحركات الدائنة بجميع الحسابات</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 text-xs block">مبيعات المنشأة بالقوائم المالية:</span>
              <div className="text-xl font-mono font-black text-white">
                {formatEgyptianCurrency(currentSales)}
              </div>
              <span className="text-[11px] text-slate-500 block">المثبتة بسنة {latestYear}</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 text-xs block">نسبة تغطية الحساب البنكي للمبيعات (Turnover %):</span>
              <div className={`text-xl font-mono font-black ${turnoverRatio >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {turnoverRatio.toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-400 block">
                {turnoverRatio >= 70 ? '✓ نسبة ممتازة تقنع مسؤولي الائتمان بالبنك' : 'تنبيه: يفضل ألا تقل النسبة عن 70% من المبيعات الدفترية'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
            <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>الصياغة التبريرية الجاهزة للمذكرة الائتمانية أمام البنك:</span>
            </h5>
            <p className="bg-slate-900 p-3 rounded-lg border border-slate-750 font-serif text-slate-200">
              «تؤكد حركة الحسابات المصرفية للمنشأة على مدار آخر 12 شهراً سلامة وقوة التدفقات النقدية؛ حيث بلغت إجمالي الإيداعات المصرفية المنفذة مبلغ{' '}
              <strong>{formatEgyptianCurrency(bankTurnoverDeposits)}</strong> تمثل ما نسبته <strong>{turnoverRatio.toFixed(1)}%</strong> من إجمالي مبيعات النشاط الدفترية،
              ويُعزى الفارق إلى المبيعات الآجلة المستحقة مع كبار العملاء بشروط دفع 60 إلى 90 يوماً بالإضافة إلى التحصيلات النقدية الموجهة لدورات الشراء المباشرة، مما يبرهن على حيوية الدورة التشغيلية وقدرتها على سداد التسهيل المطلوب بموثوقية كاملة.»
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
