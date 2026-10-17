import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { AuditEngagementContract } from '../../types';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface FeeEstimatorViewProps {
  state: DatabaseState;
  onConvertToContract?: (contract: AuditEngagementContract) => void;
}

export const FeeEstimatorView: React.FC<FeeEstimatorViewProps> = ({ state, onConvertToContract }) => {
  const [clientName, setClientName] = useState(state.clients[0]?.name || 'شركة جديدة');
  const [partnerHours, setPartnerHours] = useState(12);
  const [seniorHours, setSeniorHours] = useState(40);
  const [juniorHours, setJuniorHours] = useState(80);

  const estimatedTotal = partnerHours * 1500 + seniorHours * 750 + juniorHours * 350;

  const handleConvert = () => {
    if (!onConvertToContract) return;
    onConvertToContract({
      id: `eng-${Date.now()}`,
      contractCode: `ENG-2026-${Math.floor(100 + Math.random() * 900)}`,
      clientId: state.clients[0]?.id || 'client-1',
      clientName,
      fiscalYear: 2026,
      scopeOfWork: ['مراجعة القوائم المالية السنوية', 'فحص الإقرارات الضريبية'],
      agreedFeeAmount: estimatedTotal,
      paidAmount: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black">حاسبة تقدير الأتعاب المهنية وساعات العمل</h3>
        </div>
        {onConvertToContract && (
          <button
            type="button"
            onClick={handleConvert}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تحويل إلى عقد ارتباط</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">اسم المنشأة / العميل</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">ساعات الشريك المراجع</label>
          <input
            type="number"
            value={partnerHours}
            onChange={(e) => setPartnerHours(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">ساعات المراجع الأول</label>
          <input
            type="number"
            value={seniorHours}
            onChange={(e) => setSeniorHours(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">ساعات مساعدي المراجع</label>
          <input
            type="number"
            value={juniorHours}
            onChange={(e) => setJuniorHours(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">إجمالي الأتعاب التقديرية المقترحة:</span>
        <span className="text-lg font-black font-mono text-emerald-400">
          {formatEgyptianCurrency(estimatedTotal, true)}
        </span>
      </div>
    </div>
  );
};
