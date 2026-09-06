import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import {
  calculateTaxPenalty,
  calculateEarlySettlementComparison,
  TaxObligationType,
  CalculationMethod,
  TaxPenaltyInput,
  TaxPenaltyResult,
  OBLIGATION_TYPE_LABELS,
} from '../utils/taxPenaltyCalculator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import {
  Clock,
  Calculator,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Percent,
  FileText,
  FileSpreadsheet,
  Printer,
  Download,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Info,
  Scale,
  ShieldCheck,
  Building,
  ArrowRight,
  TrendingUp,
  Coins,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface TaxPenaltySimulatorViewProps {
  state: DatabaseState;
}

export const TaxPenaltySimulatorView: React.FC<TaxPenaltySimulatorViewProps> = ({ state }) => {
  const activeClient = state.activeClientContext;
  const initialClientId = activeClient?.clientId || state.clients[0]?.id || '';

  // Mode Selection
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'BATCH' | 'EARLY_SETTLEMENT' | 'GUIDE'>('SINGLE');

  // Single Invoice Simulator State
  const [obligationType, setObligationType] = useState<TaxObligationType>('VAT');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026/0142');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [principalAmount, setPrincipalAmount] = useState<number>(150000);
  const [dueDate, setDueDate] = useState<string>('2025-12-31');
  const [paymentDate, setPaymentDate] = useState<string>('2026-06-30');
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('LAW_206_DAILY');
  const [cbeDiscountRate, setCbeDiscountRate] = useState<number>(27.75);
  const [cbeLegalMargin, setCbeLegalMargin] = useState<number>(2.0);
  const [customAnnualRate, setCustomAnnualRate] = useState<number>(25.0);
  const [waiverPercentage, setWaiverPercentage] = useState<number>(0);
  const [copiedJournal, setCopiedJournal] = useState<boolean>(false);

  // Batch Multi-Invoice State
  const [batchInvoices, setBatchInvoices] = useState<TaxPenaltyInput[]>([
    {
      id: 'B1',
      invoiceOrDeclarationNumber: 'إقرار ق.م 10/2025',
      obligationType: 'VAT',
      principalAmount: 85000,
      dueDate: '2025-11-30',
      paymentDate: '2026-03-31',
      calculationMethod: 'VAT_MONTHLY_1_5',
      cbeDiscountRate: 27.75,
      cbeLegalMargin: 2.0,
      waiverPercentage: 0,
    },
    {
      id: 'B2',
      invoiceOrDeclarationNumber: 'نموذج 41 ضرائب ربع 4/2025',
      obligationType: 'WITHHOLDING_TAX',
      principalAmount: 42000,
      dueDate: '2026-01-31',
      paymentDate: '2026-04-30',
      calculationMethod: 'LAW_206_DAILY',
      cbeDiscountRate: 27.75,
      cbeLegalMargin: 2.0,
      waiverPercentage: 0,
    },
    {
      id: 'B3',
      invoiceOrDeclarationNumber: 'إقرار دخل سنوي 2024 (فروق فحص)',
      obligationType: 'TAX_AUDIT_EXPOSURE',
      principalAmount: 220000,
      dueDate: '2025-04-30',
      paymentDate: '2026-05-15',
      calculationMethod: 'LAW_206_DAILY',
      cbeDiscountRate: 27.75,
      cbeLegalMargin: 2.0,
      waiverPercentage: 65, // خاضع لقانون التجاوز 65%
    },
  ]);

  // Current client info
  const client = state.clients.find((c) => c.id === selectedClientId) || state.clients[0];

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'VAT_LAST_MONTH' | 'INCOME_TAX_ANNUAL' | 'WHT_Q4' | 'PAYROLL') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'VAT_LAST_MONTH') {
      setObligationType('VAT');
      setCalculationMethod('VAT_MONTHLY_1_5');
      setInvoiceNumber(`VAT-DECL-${today.getFullYear()}/${today.getMonth() || 12}`);
      setDueDate('2025-12-31');
      setPaymentDate(todayStr);
      setPrincipalAmount(75000);
    } else if (preset === 'INCOME_TAX_ANNUAL') {
      setObligationType('CORPORATE_INCOME_TAX');
      setCalculationMethod('LAW_206_DAILY');
      setInvoiceNumber(`CIT-${today.getFullYear() - 1}-ANNUAL`);
      setDueDate(`${today.getFullYear() - 1}-04-30`);
      setPaymentDate(todayStr);
      setPrincipalAmount(180000);
    } else if (preset === 'WHT_Q4') {
      setObligationType('WITHHOLDING_TAX');
      setCalculationMethod('LAW_206_DAILY');
      setInvoiceNumber(`WHT-Q4-${today.getFullYear() - 1}`);
      setDueDate(`${today.getFullYear()}-01-31`);
      setPaymentDate(todayStr);
      setPrincipalAmount(35000);
    } else if (preset === 'PAYROLL') {
      setObligationType('PAYROLL_TAX');
      setCalculationMethod('LAW_206_DAILY');
      setInvoiceNumber(`PAYROLL-${today.getFullYear()}/M1`);
      setDueDate(`${today.getFullYear()}-02-15`);
      setPaymentDate(todayStr);
      setPrincipalAmount(28000);
    }
  };

  // Import unpaid declarations from system
  const handleImportSystemDeclarations = () => {
    const unpaid = (state.taxDeclarations || []).filter(
      (d) => d.status === 'READY_TO_SUBMIT' || d.status === 'DRAFT' || d.status === 'LATE'
    );

    if (unpaid.length === 0) {
      alert('لا توجد إقرارات معلقة أو متأخرة في النظام للاستيراد حالياً.');
      return;
    }

    const imported: TaxPenaltyInput[] = unpaid.map((d, index) => {
      const type: TaxObligationType = d.declarationType.startsWith('VAT') ? 'VAT' : 'CORPORATE_INCOME_TAX';
      const amount = d.netTaxPayable || d.netVatPayable || d.salesTaxableAmount * 0.14 || 50000;
      return {
        id: `IMP-${d.id || index}-${Date.now()}`,
        invoiceOrDeclarationNumber: `${d.declarationType} - ${d.period}`,
        obligationType: type,
        clientName: d.clientName,
        clientId: d.clientId,
        principalAmount: amount,
        dueDate: d.dueDate || '2025-12-31',
        paymentDate: new Date().toISOString().split('T')[0],
        calculationMethod: type === 'VAT' ? 'VAT_MONTHLY_1_5' : 'LAW_206_DAILY',
        cbeDiscountRate: 27.75,
        cbeLegalMargin: 2.0,
        waiverPercentage: 0,
      };
    });

    setBatchInvoices((prev) => [...prev, ...imported]);
    setActiveTab('BATCH');
  };

  // Add empty invoice to batch
  const handleAddBatchRow = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newRow: TaxPenaltyInput = {
      id: `BATCH-${Date.now()}`,
      invoiceOrDeclarationNumber: `فاتورة ضريبية ${batchInvoices.length + 1}`,
      obligationType: 'VAT',
      principalAmount: 50000,
      dueDate: '2026-01-31',
      paymentDate: todayStr,
      calculationMethod: 'LAW_206_DAILY',
      cbeDiscountRate: 27.75,
      cbeLegalMargin: 2.0,
      waiverPercentage: 0,
    };
    setBatchInvoices((prev) => [...prev, newRow]);
  };

  // Update batch row
  const handleUpdateBatchRow = (id: string, field: keyof TaxPenaltyInput, value: any) => {
    setBatchInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Remove batch row
  const handleRemoveBatchRow = (id: string) => {
    setBatchInvoices((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculate Single Result
  const singleInput: TaxPenaltyInput = {
    invoiceOrDeclarationNumber: invoiceNumber,
    obligationType,
    clientName: client?.name,
    clientId: selectedClientId,
    principalAmount,
    dueDate,
    paymentDate,
    calculationMethod,
    cbeDiscountRate,
    cbeLegalMargin,
    customAnnualRate,
    waiverPercentage,
  };

  const singleResult: TaxPenaltyResult = useMemo(() => {
    return calculateTaxPenalty(singleInput);
  }, [singleInput]);

  // Calculate Early Settlement Scenarios
  const earlySettlementScenarios = useMemo(() => {
    return calculateEarlySettlementComparison(singleInput);
  }, [singleInput]);

  // Calculate Batch Results
  const batchResults: TaxPenaltyResult[] = useMemo(() => {
    return batchInvoices.map((inv) => calculateTaxPenalty(inv));
  }, [batchInvoices]);

  const batchTotals = useMemo(() => {
    return batchResults.reduce(
      (acc, curr) => ({
        principal: acc.principal + curr.principalAmount,
        grossPenalty: acc.grossPenalty + curr.grossPenaltyAmount,
        waiverDiscount: acc.waiverDiscount + curr.waiverDiscountAmount,
        netPenalty: acc.netPenalty + curr.netPenaltyPayable,
        totalSettlement: acc.totalSettlement + curr.totalSettlementAmount,
      }),
      { principal: 0, grossPenalty: 0, waiverDiscount: 0, netPenalty: 0, totalSettlement: 0 }
    );
  }, [batchResults]);

  // Copy Journal Entry to Clipboard
  const handleCopyJournal = () => {
    const text = `قيد إثبات غرامات ومقابل تأخير سداد الضرائب:
من حـ/ ${singleResult.suggestedJournalEntry.debitAccount} : ${formatEgyptianCurrency(singleResult.suggestedJournalEntry.debitAmount)}
إلى حـ/ ${singleResult.suggestedJournalEntry.creditAccount} : ${formatEgyptianCurrency(singleResult.suggestedJournalEntry.creditAmount)}
البيان: ${singleResult.suggestedJournalEntry.description}
ملاحظة مهنية: ${singleResult.suggestedJournalEntry.legalReference}`;

    navigator.clipboard.writeText(text);
    setCopiedJournal(true);
    setTimeout(() => setCopiedJournal(false), 2500);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <ScreenActionToolbar
        screenTitle="محاكي مقابل التأخير والضريبة الإضافية"
        state={state}
        actions={[
          {
            label: 'استيراد فواتير وإقرارات النظام',
            icon: RefreshCw,
            onClick: handleImportSystemDeclarations,
            variant: 'outline',
          },
          {
            label: 'طباعة تقرير المحاكاة',
            icon: Printer,
            onClick: handlePrint,
            variant: 'primary',
          },
        ]}
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-amber-500/30 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black">محاكي مقابل التأخير والضريبة الإضافية للفواتير الضريبية</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  قانون 206 / 2020 & قانون 67 / 2016
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                حساب دقيق لغرامات ومقابل تأخير السداد للفواتير الضريبية، إقرارات القيمة المضافة، ضريبة الدخل، وكسب العمل، بناءً على تاريخ الاستحقاق وتاريخ السداد الفعلي مع دعم نسب التجاوز ومبادرات الإعفاء الحكومية.
              </p>
            </div>
          </div>

          {/* Quick Stats in Banner */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-amber-300 font-bold">سعر البنك المركزي المعتمد</div>
              <div className="text-lg font-black font-mono text-white">
                {cbeDiscountRate}% <span className="text-xs font-normal text-slate-300">+ {cbeLegalMargin}% هامش</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-white/10 text-xs">
          <span className="font-bold text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> قوالب سريعة شائعة:
          </span>
          <button
            onClick={() => handleApplyPreset('VAT_LAST_MONTH')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
          >
            إقرار ق.م (1.5% شهرياً)
          </button>
          <button
            onClick={() => handleApplyPreset('INCOME_TAX_ANNUAL')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
          >
            ضريبة الدخل السنوية (30 أبريل)
          </button>
          <button
            onClick={() => handleApplyPreset('WHT_Q4')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
          >
            خصم وتحصيل نموذج 41
          </button>
          <button
            onClick={() => handleApplyPreset('PAYROLL')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
          >
            ضريبة المرتبات (كسب العمل)
          </button>
        </div>
      </div>

      {/* Mode Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('SINGLE')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'SINGLE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>محاكاة فاتورة / إقرار مفرد</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCH')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'BATCH'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>جدول الفواتير المتعددة ({batchInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EARLY_SETTLEMENT')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'EARLY_SETTLEMENT'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>مصفوفة وفورات السداد المبكر</span>
        </button>

        <button
          onClick={() => setActiveTab('GUIDE')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'GUIDE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>الدليل القانوني والمعالجة المحاسبية</span>
        </button>
      </div>

      {/* TAB 1: SINGLE INVOICE SIMULATOR */}
      {activeTab === 'SINGLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inputs Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>بيانات الفاتورة والالتزام الضريبي</span>
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                مدخلات المحاكاة
              </span>
            </div>

            {/* Client Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العميل / المنشأة الضريبية:</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none focus:border-amber-600"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.commercialName || c.legalForm || 'ممول'})
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Obligation Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الالتزام / الضريبة:</label>
              <select
                value={obligationType}
                onChange={(e) => {
                  const val = e.target.value as TaxObligationType;
                  setObligationType(val);
                  setCalculationMethod(OBLIGATION_TYPE_LABELS[val]?.defaultMethod || 'LAW_206_DAILY');
                }}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-amber-50/50 text-amber-950 focus:bg-white outline-none focus:border-amber-600"
              >
                {Object.entries(OBLIGATION_TYPE_LABELS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-600 shrink-0" />
                <span>الموعد القانوني المعتاد: {OBLIGATION_TYPE_LABELS[obligationType]?.standardDueDateNote}</span>
              </div>
            </div>

            {/* Invoice / Reference Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الفاتورة / الإقرار / المطالبة:</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026/01..."
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none focus:border-amber-600 font-mono"
              />
            </div>

            {/* Principal Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                أصل مبلغ الضريبة غير المسددة (ج.م):
              </label>
              <input
                type="number"
                step="any"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-black text-slate-900 border border-slate-300 rounded-xl px-3 py-2 bg-amber-50/30 focus:bg-white outline-none focus:border-amber-600 font-mono"
              />
              <div className="text-[10px] text-slate-500 mt-1 font-mono text-left">
                {formatEgyptianCurrency(principalAmount)}
              </div>
            </div>

            {/* Dates Grid: Due Date vs Actual Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>تاريخ الاستحقاق القانوني:</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  <span>تاريخ السداد الفعلي / المستهدف:</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-red-600 font-mono"
                />
              </div>
            </div>

            {/* Calculation Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الحساب القانونية:</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="calcMethod"
                    checked={calculationMethod === 'LAW_206_DAILY'}
                    onChange={() => setCalculationMethod('LAW_206_DAILY')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800">قانون 206 لسنة 2020 (حساب يومي)</span>
                    <p className="text-[10px] text-slate-500">سعر الائتمان والخصم للبنك المركزي + 2% سنوياً</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="calcMethod"
                    checked={calculationMethod === 'VAT_MONTHLY_1_5'}
                    onChange={() => setCalculationMethod('VAT_MONTHLY_1_5')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800">قانون القيمة المضافة 67 لسنة 2016</span>
                    <p className="text-[10px] text-slate-500">1.5% عن كل شهر أو جزء من الشهر (ضريبة إضافية)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="calcMethod"
                    checked={calculationMethod === 'CUSTOM_ANNUAL_RATE'}
                    onChange={() => setCalculationMethod('CUSTOM_ANNUAL_RATE')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800">معدل سنوي مخصص</span>
                    <p className="text-[10px] text-slate-500">تحديد نسبة مئوية سنوية خاصة</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Central Bank Rates Config */}
            {calculationMethod === 'LAW_206_DAILY' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">سعر البنك المركزي (%):</label>
                  <input
                    type="number"
                    step="any"
                    value={cbeDiscountRate}
                    onChange={(e) => setCbeDiscountRate(parseFloat(e.target.value) || 0)}
                    className="w-full font-mono font-bold text-center border border-amber-300 rounded px-2 py-1 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-950 mb-1">الهامش القانوني (+%):</label>
                  <input
                    type="number"
                    step="any"
                    value={cbeLegalMargin}
                    onChange={(e) => setCbeLegalMargin(parseFloat(e.target.value) || 0)}
                    className="w-full font-mono font-bold text-center border border-amber-300 rounded px-2 py-1 bg-white outline-none"
                  />
                </div>
              </div>
            )}

            {calculationMethod === 'CUSTOM_ANNUAL_RATE' && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs">
                <label className="block font-bold text-indigo-950 mb-1">المعدل السنوي المخصص (%):</label>
                <input
                  type="number"
                  step="any"
                  value={customAnnualRate}
                  onChange={(e) => setCustomAnnualRate(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold text-center border border-indigo-300 rounded px-2 py-1 bg-white outline-none"
                />
              </div>
            )}

            {/* Amnesty / Waiver Percentage */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
              <div className="flex justify-between items-center mb-1.5 font-bold text-emerald-950">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نسبة التجاوز / الإعفاء الحكومي:</span>
                </span>
                <span className="font-mono text-emerald-800 font-black">{waiverPercentage}%</span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {[0, 50, 65, 85, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setWaiverPercentage(pct)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      waiverPercentage === pct
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {pct === 0 ? 'بدون' : `${pct}%`}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={waiverPercentage}
                onChange={(e) => setWaiverPercentage(parseFloat(e.target.value) || 0)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-emerald-800 mt-1">
                تطبق نسب التجاوز (مثل 65% أو 85%) بموجب قوانين ومبادرات التجاوز عن مقابل التأخير والضريبة الإضافية الصادرة من وزارة المالية.
              </p>
            </div>
          </div>

          {/* Right Column: Simulation Results & Analytics (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Status & Hero KPI Card */}
            <div
              className={`rounded-2xl p-5 border shadow-xs transition-all ${
                singleResult.isDelayed
                  ? 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-amber-300'
                  : 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-emerald-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    نتيجة فحص الالتزام الضريبي
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {singleResult.isDelayed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        متأخر عن الموعد القانوني بمقدار {singleResult.daysOverdue} يوم ({singleResult.monthsCount} شهر)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        مسدد في الموعد القانوني (بدون غرامات)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[11px] text-slate-500">المعدل الفعال السنوي</span>
                  <div className="text-base font-black text-amber-900">{singleResult.effectiveAnnualRate}%</div>
                </div>
              </div>

              {/* 4 Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3 bg-white/90 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">أصل الضريبة المستحقة</span>
                  <div className="text-sm sm:text-base font-black font-mono text-slate-900">
                    {formatEgyptianCurrency(singleResult.principalAmount)}
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 block mb-0.5">مقابل التأخير الإجمالي</span>
                  <div className="text-sm sm:text-base font-black font-mono text-amber-950">
                    {formatEgyptianCurrency(singleResult.grossPenaltyAmount)}
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                    وفر التجاوز ({singleResult.waiverPercentage}%)
                  </span>
                  <div className="text-sm sm:text-base font-black font-mono text-emerald-800">
                    -{formatEgyptianCurrency(singleResult.waiverDiscountAmount)}
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-red-200">
                  <span className="text-[10px] font-bold text-red-800 block mb-0.5">صافي الغرامة واجبة السداد</span>
                  <div className="text-sm sm:text-base font-black font-mono text-red-900">
                    {formatEgyptianCurrency(singleResult.netPenaltyPayable)}
                  </div>
                </div>
              </div>

              {/* Total Settlement Amount Banner */}
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-amber-300 font-bold block">
                    إجمالي المبلغ الكلي الواجب سداده لمصلحة الضرائب:
                  </span>
                  <span className="text-[11px] text-slate-300">
                    (أصل الضريبة: {formatEgyptianCurrency(singleResult.principalAmount)} + صافي مقابل التأخير:{' '}
                    {formatEgyptianCurrency(singleResult.netPenaltyPayable)})
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 text-left">
                  {formatEgyptianCurrency(singleResult.totalSettlementAmount)}
                </div>
              </div>

              {/* Visual Proportion Bar */}
              {singleResult.totalSettlementAmount > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                    <span>نسبة أصل الضريبة: {((singleResult.principalAmount / singleResult.totalSettlementAmount) * 100).toFixed(1)}%</span>
                    <span>نسبة الغرامة: {((singleResult.netPenaltyPayable / singleResult.totalSettlementAmount) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                    <div
                      style={{ width: `${(singleResult.principalAmount / singleResult.totalSettlementAmount) * 100}%` }}
                      className="bg-blue-600 h-full"
                      title="أصل الضريبة"
                    />
                    <div
                      style={{ width: `${(singleResult.netPenaltyPayable / singleResult.totalSettlementAmount) * 100}%` }}
                      className="bg-red-500 h-full"
                      title="مقابل التأخير"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Breakdown Table */}
            {singleResult.monthlyBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>التدرج الزمني لتراكم مقابل التأخير على الفترات:</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {singleResult.monthlyBreakdown.length} فترات زمنية
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-2.5">الفترة الزمنية</th>
                        <th className="py-2 px-2.5">من تاريخ</th>
                        <th className="py-2 px-2.5">إلى تاريخ</th>
                        <th className="py-2 px-2.5 text-center">الأيام / الشهور</th>
                        <th className="py-2 px-2.5 text-center">النسبة (%)</th>
                        <th className="py-2 px-2.5 text-left">فائدة الفترة</th>
                        <th className="py-2 px-2.5 text-left">المتراكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {singleResult.monthlyBreakdown.map((period) => (
                        <tr key={period.periodIndex} className="hover:bg-slate-50/80">
                          <td className="py-2 px-2.5 font-sans font-bold text-slate-800">{period.periodLabel}</td>
                          <td className="py-2 px-2.5 text-slate-600">{period.startDate}</td>
                          <td className="py-2 px-2.5 text-slate-600">{period.endDate}</td>
                          <td className="py-2 px-2.5 text-center font-bold">{period.daysInPeriod} يوم</td>
                          <td className="py-2 px-2.5 text-center text-amber-800 font-bold">
                            {period.periodInterestRate.toFixed(2)}%
                          </td>
                          <td className="py-2 px-2.5 text-left font-bold text-slate-900">
                            {formatEgyptianCurrency(period.periodInterestAmount)}
                          </td>
                          <td className="py-2 px-2.5 text-left font-black text-red-900">
                            {formatEgyptianCurrency(period.cumulativeInterest)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suggested Accounting Journal Entry Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>التوجيه المحاسبي والقيد اليومي المقترح لإثبات الغرامة:</span>
                </h4>
                <button
                  onClick={handleCopyJournal}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedJournal ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ القيد</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 font-mono space-y-2">
                <div className="flex justify-between items-center text-slate-800">
                  <span className="font-bold">من حـ/ {singleResult.suggestedJournalEntry.debitAccount}</span>
                  <span className="font-black text-indigo-900 font-mono">
                    {formatEgyptianCurrency(singleResult.suggestedJournalEntry.debitAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-800 pr-6">
                  <span className="font-bold">إلى حـ/ {singleResult.suggestedJournalEntry.creditAccount}</span>
                  <span className="font-black text-slate-900 font-mono">
                    {formatEgyptianCurrency(singleResult.suggestedJournalEntry.creditAmount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-sans">
                  <span className="font-bold">البيان:</span> {singleResult.suggestedJournalEntry.description}
                </div>
              </div>

              {/* Tax Law Notice */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">تحذير مهني وضريبي معتمد:</span>
                  <span>{singleResult.suggestedJournalEntry.legalReference}.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-INVOICES BATCH CALCULATOR */}
      {activeTab === 'BATCH' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>جدول فواتير وإقرارات الضرائب المجمعة</span>
              </h3>
              <p className="text-xs text-slate-500">
                حساب مقابل التأخير لقائمة فواتير متعددة مع حساب الإجماليات والتجاوزات لكل بند دفعة واحدة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleImportSystemDeclarations}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>استيراد إقرارات النظام</span>
              </button>
              <button
                onClick={handleAddBatchRow}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة فاتورة / إقرار</span>
              </button>
            </div>
          </div>

          {/* Batch Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">رقم الفاتورة / الإقرار</th>
                  <th className="py-2.5 px-3">نوع الالتزام</th>
                  <th className="py-2.5 px-3 text-center">تاريخ الاستحقاق</th>
                  <th className="py-2.5 px-3 text-center">تاريخ السداد</th>
                  <th className="py-2.5 px-3 text-center">أيام التأخير</th>
                  <th className="py-2.5 px-3 text-left">أصل الضريبة</th>
                  <th className="py-2.5 px-3 text-center">التجاوز (%)</th>
                  <th className="py-2.5 px-3 text-left">صافي الغرامة</th>
                  <th className="py-2.5 px-3 text-left">المبلغ الكلي</th>
                  <th className="py-2.5 px-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchResults.map((res, index) => {
                  const rawRow = batchInvoices[index];
                  return (
                    <tr key={rawRow.id || index} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={rawRow.invoiceOrDeclarationNumber}
                          onChange={(e) => handleUpdateBatchRow(rawRow.id!, 'invoiceOrDeclarationNumber', e.target.value)}
                          className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-amber-600 outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={rawRow.obligationType}
                          onChange={(e) => handleUpdateBatchRow(rawRow.id!, 'obligationType', e.target.value as TaxObligationType)}
                          className="text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 bg-white outline-none"
                        >
                          {Object.entries(OBLIGATION_TYPE_LABELS).map(([k, meta]) => (
                            <option key={k} value={k}>
                              {meta.label.split('(')[0]}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="date"
                          value={rawRow.dueDate}
                          onChange={(e) => handleUpdateBatchRow(rawRow.id!, 'dueDate', e.target.value)}
                          className="text-[11px] font-mono border border-slate-200 rounded px-1 py-0.5 bg-white outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="date"
                          value={rawRow.paymentDate}
                          onChange={(e) => handleUpdateBatchRow(rawRow.id!, 'paymentDate', e.target.value)}
                          className="text-[11px] font-mono border border-slate-200 rounded px-1 py-0.5 bg-white outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {res.isDelayed ? (
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            {res.daysOverdue} يوم
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            0 (سليم)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-left">
                        <input
                          type="number"
                          step="any"
                          value={rawRow.principalAmount}
                          onChange={(e) =>
                            handleUpdateBatchRow(rawRow.id!, 'principalAmount', parseFloat(e.target.value) || 0)
                          }
                          className="w-28 text-left font-mono font-bold border border-slate-200 rounded px-1.5 py-0.5 bg-white outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rawRow.waiverPercentage}
                          onChange={(e) =>
                            handleUpdateBatchRow(rawRow.id!, 'waiverPercentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-14 text-center font-mono font-bold border border-slate-200 rounded px-1 py-0.5 bg-white outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-black text-red-900">
                        {formatEgyptianCurrency(res.netPenaltyPayable)}
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-black text-amber-950">
                        {formatEgyptianCurrency(res.totalSettlementAmount)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveBatchRow(rawRow.id!)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Batch Totals Footer */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-mono font-bold border-t-2 border-amber-500">
                  <td colSpan={5} className="py-3 px-3 font-sans text-right font-black text-amber-300">
                    الإجمالي العام للفواتير والالتزامات الضريبية:
                  </td>
                  <td className="py-3 px-3 text-left font-black text-white">
                    {formatEgyptianCurrency(batchTotals.principal)}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-300 text-xs font-sans">
                    وفر: {formatEgyptianCurrency(batchTotals.waiverDiscount)}
                  </td>
                  <td className="py-3 px-3 text-left font-black text-red-300">
                    {formatEgyptianCurrency(batchTotals.netPenalty)}
                  </td>
                  <td className="py-3 px-3 text-left font-black text-amber-400 text-sm">
                    {formatEgyptianCurrency(batchTotals.totalSettlement)}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EARLY SETTLEMENT SCENARIOS */}
      {activeTab === 'EARLY_SETTLEMENT' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>مصفوفة وفورات السداد المبكر ومقارنة المهل الزمنية</span>
            </h3>
            <p className="text-xs text-slate-500">
              توضيح الفارق المالي وحجم الغرامات المتزايدة في حالة تأجيل السداد، وحساب ما يمكن توفيره بالسداد الفوري لمصلحة الضرائب.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {earlySettlementScenarios.map((sc, idx) => {
              const diffFromImmediate = sc.penaltyAmount - (earlySettlementScenarios[0]?.penaltyAmount || 0);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    sc.isImmediate
                      ? 'bg-gradient-to-b from-emerald-50 to-teal-50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-900">{sc.label}</span>
                      {sc.isImmediate && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                          الأوفر
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mb-2">التاريخ: {sc.targetDate}</div>
                    <div className="text-[11px] text-slate-600">
                      أيام التأخير: <span className="font-bold font-mono text-slate-900">{sc.daysOverdue} يوم</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-500 block">صافي الغرامة:</span>
                    <div className="text-sm font-black font-mono text-red-900">
                      {formatEgyptianCurrency(sc.penaltyAmount)}
                    </div>
                    {!sc.isImmediate && diffFromImmediate > 0 && (
                      <div className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>زيادة {formatEgyptianCurrency(diffFromImmediate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LEGAL & ACCOUNTING GUIDE */}
      {activeTab === 'GUIDE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Guide Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-600" />
              <span>الأطر التشريعية المنظمة لمقابل التأخير في مصر</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-amber-900 block mb-1">
                  1. قانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020:
                </span>
                <p>
                  يُحسب مقابل التأخير على مبالغ الضرائب غير المسددة على أساس سعر الائتمان والخصم المعلن من البنك المركزي المصري في الأول من يناير أو يوليو السابق لتاريخ الاستحقاق مضافاً إليه 2% سنوياً، ويُحسب على أساس يومي حتى تاريخ السداد الفعلي.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-amber-900 block mb-1">
                  2. قانون الضريبة على القيمة المضافة رقم 67 لسنة 2016:
                </span>
                <p>
                  تُفرض ضريبة إضافية بنسبة 1.5% عن كل شهر أو جزء من الشهر يبدأ من نهاية المهلة المحددة للسداد حتى تاريخ السداد الفعلي لمصلحة الضرائب المصرية.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <span className="font-bold block mb-1">3. قوانين التجاوز عن مقابل التأخير والضريبة الإضافية:</span>
                <p>
                  تصدر الدولة مبادرات تمنح إعفاءات بنسب متفاوتة (مثل 65% أو 85% أو 100%) من مقابل التأخير لمن يبادر بسداد أصل دين الضريبة كاملاً خلال فترات المبادرة المحددة.
                </p>
              </div>
            </div>
          </div>

          {/* Accounting & Tax Treatment Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>المعالجة المحاسبية والأثر على إقرار الدخل السنوي</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-indigo-900 block mb-1">
                  المعالجة في قائمة الدخل ودفاتر اليومية:
                </span>
                <p>
                  تُثبت غرامات ومقابل تأخير سداد الضرائب في بند مستقل ضمن المصروفات الأخرى / المصروفات العمومية والإدارية (حـ/ مصروفات وغرامات تأخير ضرائب)، ويتم إقفالها في نهاية السنة المالية في حساب الأرباح والخسائر.
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-950">
                <span className="font-bold block mb-1">
                  المادة 24 بند 5 من قانون الضريبة على الدخل 91 لسنة 2005:
                </span>
                <p>
                  <strong>تنبيه مالي حاسم:</strong> لا تُعد غرامات التأخير والتعويضات والفوائد المستحقة على التأخير في سداد الضرائب والمستحقات الحكومية من التكاليف واجبة الخصم ضريبياً. لذا يتعين على المحاسب القانوني إضافتها إلى صافي الربح المحاسبي في الإقرار السنوي لضريبة الدخل لتحديد الوعاء الضريبي الخاضع للضريبة.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
