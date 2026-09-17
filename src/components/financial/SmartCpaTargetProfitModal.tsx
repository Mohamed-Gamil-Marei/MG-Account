import React, { useState } from 'react';
import {
  X,
  Target,
  Sparkles,
  ArrowDownRight,
  TrendingUp,
  Check,
  Percent,
  Calculator,
} from 'lucide-react';
import { SmartCpaTemplateService } from '../../services/smartCpaTemplateService';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface SmartCpaTargetProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  currentSales: number;
  currentExpenses: number;
  onApply: (sales: number, expenses: number) => void;
}

export const SmartCpaTargetProfitModal: React.FC<SmartCpaTargetProfitModalProps> = ({
  isOpen,
  onClose,
  year,
  currentSales,
  currentExpenses,
  onApply,
}) => {
  const [targetNetProfit, setTargetNetProfit] = useState<number>(600000);
  const [grossMarginPercent, setGrossMarginPercent] = useState<number>(17.5);
  const [expenseRatioPercent, setExpenseRatioPercent] = useState<number>(5.0);

  if (!isOpen) return null;

  // Run the back solver
  const solution = SmartCpaTemplateService.backSolveTargetProfit(
    targetNetProfit,
    grossMarginPercent,
    expenseRatioPercent,
    40000
  );

  const handleApply = () => {
    onApply(solution.estimatedSales, solution.estimatedExpenses);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      dir="rtl"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                المحاكي العكسي للربح والضريبة المستهدفة
              </h3>
              <p className="text-[11px] text-slate-500">
                احتساب المبيعات والمصروفات المتوافقة مع متطلبات البنك أو مصلحة الضرائب لسنة {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Profit Input */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              صافي الربح السنوي المستهدف بعد الضريبة (ج.م)
            </label>
            <div className="relative">
              <input
                type="number"
                value={targetNetProfit}
                onChange={(e) => setTargetNetProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 rounded-xl text-base font-bold text-purple-700 dark:text-purple-300 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">ج.م</span>
            </div>
            {/* Quick Profit Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
              {[300000, 500000, 800000, 1000000, 1500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetNetProfit(amt)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                    targetNetProfit === amt
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {(amt / 1000).toFixed(0)} ألف
                </button>
              ))}
            </div>
          </div>

          {/* Margins Selection (Presets) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                هامش مجمل الربح المقترح %
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={grossMarginPercent}
                  onChange={(e) => setGrossMarginPercent(parseFloat(e.target.value) || 10)}
                  className="w-full bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                المعيار الشائع: 15% إلى 20%
              </span>
            </div>

            <div className="bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                نسبة المصروفات العمومية %
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={expenseRatioPercent}
                  onChange={(e) => setExpenseRatioPercent(parseFloat(e.target.value) || 2)}
                  className="w-full bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                المعيار الآمن: 4% إلى 6%
              </span>
            </div>
          </div>

          {/* Real-time Calculated Solution */}
          <div className="bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-2">
            <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>النتيجة الرياضية المحسوبة تلقائياً:</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-500 block text-[11px]">المبيعات المقدرة:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatEgyptianCurrency(solution.estimatedSales)}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-500 block text-[11px]">المصروفات المقدرة (توزع 100%):</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatEgyptianCurrency(solution.estimatedExpenses)}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-500 block text-[11px]">تكلفة المبيعات المقدرة:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatEgyptianCurrency(solution.estimatedCostOfSales)}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <span className="text-slate-500 block text-[11px]">ضريبة الدخل التقديرية (22.5%):</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">
                  {formatEgyptianCurrency(solution.estimatedTax)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تطبيق على سنة {year} مع الاتزان التام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
