import React from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { NavigationTab } from '../../types';
import { Sparkles, ArrowUpLeft, ShieldCheck, Calculator, Users } from 'lucide-react';
import { computeFeeSummary } from '../../utils/clientFees';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface CpaAutonomousCommandDeckProps {
  state: DatabaseState;
  onNavigate?: (tab: NavigationTab) => void;
  fiscalYear?: number;
}

export const CpaAutonomousCommandDeck: React.FC<CpaAutonomousCommandDeckProps> = ({
  state,
  onNavigate,
  fiscalYear = 2026,
}) => {
  const feeMap = computeFeeSummary(state.feeAgreements || [], state.feeCollections || []);
  const feeItems = Object.values(feeMap);
  const totalDue = feeItems.reduce((s, i) => s + i.totalDue, 0);
  const totalCollected = feeItems.reduce((s, i) => s + i.totalCollected, 0);
  const totalRemaining = feeItems.reduce((s, i) => s + i.remaining, 0);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              منصة القيادة التنفيذية للمكتب • السنة المالية {fiscalYear}
            </h3>
            <p className="text-xs text-slate-400">
              متابعة فورية للأتعاب المهنية والإقرارات الضريبية وملفات المراجعة المعتمدة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('PRACTICE_CLIENTS_HUB')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>العملاء والأتعاب</span>
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('ACCOUNTING_HUB')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            <span>مركز المحاسبة</span>
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('TAX_COMPLIANCE_HUB')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>الضرائب والتدقيق</span>
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="text-slate-400">إجمالي اتفاقيات الأتعاب النشطة</div>
          <div className="text-base font-black font-mono text-white mt-1">
            {formatEgyptianCurrency(totalDue, true)}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="text-slate-400">المحصل الفعلي بالخزنة</div>
          <div className="text-base font-black font-mono text-emerald-400 mt-1">
            {formatEgyptianCurrency(totalCollected, true)}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="text-slate-400">الرصيد المتبقي للتحصيل</div>
          <div className="text-base font-black font-mono text-amber-400 mt-1">
            {formatEgyptianCurrency(totalRemaining, true)}
          </div>
        </div>
      </div>
    </div>
  );
};
