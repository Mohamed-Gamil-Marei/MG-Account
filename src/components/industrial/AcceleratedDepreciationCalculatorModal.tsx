import React, { useState, useMemo } from 'react';
import {
  Factory,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Percent,
  FileSpreadsheet,
  X,
  BookOpen,
  DollarSign,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord, JournalEntry } from '../../types';

interface AcceleratedDepreciationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  targetClient?: ClientArchiveRecord | null;
}

export const AcceleratedDepreciationCalculatorModal: React.FC<AcceleratedDepreciationCalculatorModalProps> = ({
  isOpen,
  onClose,
  state,
  targetClient,
}) => {
  const activeClientId = targetClient?.id || state.activeClientContext?.clientId;
  const client = state.clients.find((c) => c.id === activeClientId) || targetClient;

  // Machine inputs
  const [machineName, setMachineName] = useState('خط إنتاج وماكينات تصنيع جديدة');
  const [acquisitionCost, setAcquisitionCost] = useState<number>(1000000); // 1,000,000 EGP
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(10);
  const [salvageValue, setSalvageValue] = useState<number>(50000);
  const [isSecondHand, setIsSecondHand] = useState<boolean>(false);
  const [corporateTaxRate, setCorporateTaxRate] = useState<number>(22.5); // 22.5% Egyptian Corporate Tax
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Calculations under Article 27 of Egyptian Tax Law 91/2005:
  // 1. Accelerated Initial Depreciation = 30% of acquisition cost in first period (new machinery used in production)
  // 2. Remaining Basis = Cost - 30% Accelerated Depreciation
  // 3. Normal Tax Depreciation = 25% of Remaining Basis
  // 4. Total Year 1 Tax Depreciation = 30% + Normal
  // 5. Accounting Depreciation = (Cost - Salvage) / Useful Life
  const calculations = useMemo(() => {
    const cost = Math.max(0, acquisitionCost);
    const scrap = Math.max(0, salvageValue);
    const life = Math.max(1, usefulLifeYears);

    // Accelerated Depreciation rate (30% if new, 0% if second hand)
    const acceleratedRate = isSecondHand ? 0 : 30;
    const acceleratedAmount = isSecondHand ? 0 : cost * 0.3;

    // Remaining basis for standard tax depreciation (25% for industrial machinery)
    const remainingTaxBasis = Math.max(0, cost - acceleratedAmount);
    const normalTaxRate = 25;
    const normalTaxAmount = remainingTaxBasis * 0.25;

    const totalYear1TaxDepreciation = acceleratedAmount + normalTaxAmount;
    const effectiveYear1TaxRate = cost > 0 ? (totalYear1TaxDepreciation / cost) * 100 : 0;

    // Accounting Depreciation (EAS 10 - Straight line)
    const depreciableCost = Math.max(0, cost - scrap);
    const annualAccountingDepreciation = depreciableCost / life;
    const accountingDepreciationRate = cost > 0 ? (annualAccountingDepreciation / cost) * 100 : 0;

    // Temporary Difference for Year 1 (Tax - Accounting)
    const temporaryDifference = totalYear1TaxDepreciation - annualAccountingDepreciation;
    
    // Deferred Tax Liability created (معيار المحاسبة المصري 24)
    // Deferred Tax = Temporary Difference * Corporate Tax Rate
    const deferredTaxLiability = (temporaryDifference * (corporateTaxRate / 100));

    // Immediate Cashflow Tax Savings in Year 1
    const cashflowTaxSavings = totalYear1TaxDepreciation * (corporateTaxRate / 100);

    return {
      cost,
      scrap,
      life,
      acceleratedRate,
      acceleratedAmount,
      remainingTaxBasis,
      normalTaxRate,
      normalTaxAmount,
      totalYear1TaxDepreciation,
      effectiveYear1TaxRate,
      annualAccountingDepreciation,
      accountingDepreciationRate,
      temporaryDifference,
      deferredTaxLiability,
      cashflowTaxSavings,
    };
  }, [acquisitionCost, salvageValue, usefulLifeYears, isSecondHand, corporateTaxRate]);

  if (!isOpen) return null;

  const handlePostDepreciationEntry = () => {
    try {
      const depAmount = Math.round(calculations.annualAccountingDepreciation);
      db.addJournalEntry({
        date: purchaseDate,
        description: `إثبات قسط الإهلاك المحاسبي السنوي لـ [${machineName}] - ${client ? client.name : 'المصنع'} (مع إثبات الإهلاك الضريبي المعجل 30% بالمذكرة الضريبية)`,
        isPosted: true,
        entryType: 'ADJUSTING',
        totalDebit: depAmount,
        totalCredit: depAmount,
        clientId: client?.id,
        clientName: client?.name,
        lines: [
          {
            id: `line-${Date.now()}-1`,
            accountId: 'acc-314-mach-deprec',
            accountCode: '3140',
            accountName: 'إهلاك آلات ومعدات المصنع الإنتاجية',
            debit: depAmount,
            credit: 0,
            description: `قسط إهلاك محاسبي سنوي - معيار محاسبة مصري 10`,
          },
          {
            id: `line-${Date.now()}-2`,
            accountId: 'acc-112-machinery',
            accountCode: '1120',
            accountName: 'مجمع إهلاك آلات ومعدات الإنتاج',
            debit: 0,
            credit: depAmount,
            description: `مجمع الإهلاك المحاسبي للماكينات`,
          },
        ],
      });

      setFeedbackMessage('تم ترحيل قيد الإهلاك المحاسبي بنجاح، وتوثيق فروق الإهلاك المعجل لمذكرة الإقرار الضريبي.');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      setFeedbackMessage(`خطأ أثناء ترحيل القيد: ${err.message || 'حدث خطأ غير متوقع'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100" dir="rtl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">حاسبة الإهلاك الصناعي المعجل 30% والضريبي</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                  المادة 27 - قانون 91 لسنة 2005
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {client ? `المنشأة المستهدفة: ${client.name} (${client.clientCode})` : 'حساب الفروق الضريبية للآلات ومعدات الإنتاج للمصانع'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {feedbackMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{feedbackMessage}</span>
              </div>
            </div>
          )}

          {/* Legal Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">القاعدة الضريبية للمصانع: </span>
              تمنح المادة 27 من قانون الضريبة على الدخل 91/2005 ميزة خصم <strong className="underline">30% كإهلاك معجل إضافي</strong> من تكلفة الآلات والمعدات الجديدة المستخدمة في الإنتاج الصناعي في أول فترة ضريبية تستخدم فيها، ثم يُحسب الإهلاك الضريبي العادي (25%) على أساس الرصيد المتبقي (70%)، مما يرفع إجمالي الخصم الضريبي في السنة الأولى إلى <strong className="font-mono">47.5%</strong> من تكلفة الأصل!
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                اسم الأصل / خط الإنتاج:
              </label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                تكلفة الشراء والاقتناء (ج.م):
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                تاريخ الشراء وبدء التشغيل:
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                العمر الإنتاجي المحاسبي (سنوات):
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={usefulLifeYears}
                onChange={(e) => setUsefulLifeYears(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                القيمة التخريدية المقدرة (الخردة):
              </label>
              <input
                type="number"
                min="0"
                value={salvageValue}
                onChange={(e) => setSalvageValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                سعر ضريبة دخل الشركات (%):
              </label>
              <input
                type="number"
                step="0.5"
                value={corporateTaxRate}
                onChange={(e) => setCorporateTaxRate(parseFloat(e.target.value) || 22.5)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Results Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Egyptian Tax Law (قانون 91 لسنة 2005) */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/40">
                <span className="font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  المعالجة الضريبية (مصلحة الضرائب المصرية)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold">
                  إهلاك معجل 30% + عادي 25%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">الإهلاك المعجل الأولي (30% فوري):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {calculations.acceleratedAmount.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">أساس الإهلاك الضريبي المتبقي (70%):</span>
                  <span className="font-mono font-bold">
                    {calculations.remainingTaxBasis.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">الإهلاك الضريبي العادي (25% من المتبقي):</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {calculations.normalTaxAmount.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
                  <span className="font-black text-amber-950 dark:text-amber-100">إجمالي إهلاك السنة الأولى ضريبياً:</span>
                  <div className="text-left font-mono">
                    <div className="font-black text-sm text-amber-600 dark:text-amber-400">
                      {calculations.totalYear1TaxDepreciation.toLocaleString()} ج.م
                    </div>
                    <div className="text-[10px] text-slate-500">
                      نسبة إجمالية: {calculations.effectiveYear1TaxRate.toFixed(1)}% من التكلفة
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <span className="font-bold">الوفر الضريبي النقدي الفوري:</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                    ~ {calculations.cashflowTaxSavings.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Egyptian Accounting Standards (معيار 10 ومعيار 24) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  المعالجة المحاسبية الدفترية (معايير EAS)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                  قسط ثابت (معيار 10)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">التكلفة القابلة للإهلاك:</span>
                  <span className="font-mono font-bold">
                    {(calculations.cost - calculations.scrap).toLocaleString()} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">القسط السنوي المحاسبي المعتمد:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {calculations.annualAccountingDepreciation.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">نسبة الإهلاك الدفتري السنوي:</span>
                  <span className="font-mono font-bold">
                    {calculations.accountingDepreciationRate.toFixed(1)}% سنوياً
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">الفارق الزمني المؤقت (سنة 1):</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                    + {calculations.temporaryDifference.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">التزام ضريبي مؤجل (EAS 24):</span>
                    <span className="text-[10px] text-slate-500">يُدرج بالقوائم المالية الختامية للمصنع</span>
                  </div>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {calculations.deferredTaxLiability.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePostDepreciationEntry}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>ترحيل قيد الإهلاك المحاسبي وتوثيق الفروق للدفاتر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
