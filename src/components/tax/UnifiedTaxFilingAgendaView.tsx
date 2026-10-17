import React from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxDeclarationRecord } from '../../types';
import { Calendar, FileText, ArrowRightLeft } from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface UnifiedTaxFilingAgendaViewProps {
  state: DatabaseState;
  onOpenPdfModal?: (decl: TaxDeclarationRecord) => void;
  onOpenInvoicesHarmonizer?: (clientId?: string) => void;
}

export const UnifiedTaxFilingAgendaView: React.FC<UnifiedTaxFilingAgendaViewProps> = ({
  state,
  onOpenPdfModal,
  onOpenInvoicesHarmonizer,
}) => {
  const declarations = state.taxDeclarations || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              الأجندة الموحدة للإقرارات الضريبية وبيانات الدخول للبوابات
            </h2>
            <p className="text-xs text-slate-500">
              متابعة مواعيد تقديم الإقرارات الضريبية الشهرية والربع سنوية والسنوية لكافة الممولين
            </p>
          </div>
        </div>
        {onOpenInvoicesHarmonizer && (
          <button
            type="button"
            onClick={() => onOpenInvoicesHarmonizer(state.activeClientContext?.clientId || undefined)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>مطابقة فواتير البوابة</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3">الممول / الشركة</th>
              <th className="p-3">نوع الإقرار</th>
              <th className="p-3">الفترة الضريبية</th>
              <th className="p-3">تاريخ الاستحقاق</th>
              <th className="p-3 text-center">صافي الضريبة</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {declarations.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 font-bold">{d.clientName || 'ممول مسجل'}</td>
                <td className="p-3 font-mono">{d.declarationType}</td>
                <td className="p-3">{d.period}</td>
                <td className="p-3 font-mono">{d.dueDate}</td>
                <td className="p-3 text-center font-mono font-bold text-emerald-700">
                  {formatEgyptianCurrency(d.netPayable, true)}
                </td>
                <td className="p-3 text-center">
                  {onOpenPdfModal && (
                    <button
                      type="button"
                      onClick={() => onOpenPdfModal(d)}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>معاينة الإقرار</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
