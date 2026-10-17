import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface InternalControlRiskMatrixProps {
  state: DatabaseState;
  selectedYear?: number;
}

export const InternalControlRiskMatrix: React.FC<InternalControlRiskMatrixProps> = ({
  selectedYear = 2026,
}) => {
  const [cycles] = useState([
    {
      id: 'cyc-rev',
      cycle: 'دورة الإيرادات والمتحصلات والعملاء',
      inherentRisk: 'HIGH',
      controlRisk: 'MEDIUM',
      detectionRisk: 'LOW',
      keyControl: 'فصل مهام الفوترة الإلكترونية عن التحصيل النقدي ومطابقة بوابة ETA شهرياً',
      evaluation: 'EFFECTIVE',
    },
    {
      id: 'cyc-pur',
      cycle: 'دورة المشتريات والمدفوعات والموردين',
      inherentRisk: 'MEDIUM',
      controlRisk: 'LOW',
      detectionRisk: 'MEDIUM',
      keyControl: 'المطابقة الثلاثية (أمر الشراء + إذن الاستلام + الفاتورة الضريبية)',
      evaluation: 'EFFECTIVE',
    },
    {
      id: 'cyc-inv',
      cycle: 'دورة المخزون والتكاليف الصناعية',
      inherentRisk: 'HIGH',
      controlRisk: 'MEDIUM',
      detectionRisk: 'LOW',
      keyControl: 'الجرد الدوري والمفاجئ ومطابقة كروت الصنف مع حسابات المراقبة',
      evaluation: 'NEEDS_IMPROVEMENT',
    },
    {
      id: 'cyc-cash',
      cycle: 'دورة الخزينة والبنوك والتسويات',
      inherentRisk: 'HIGH',
      controlRisk: 'LOW',
      detectionRisk: 'LOW',
      keyControl: 'مذكرات تسوية بنكية شهرية معتمدة وتوقيع ثنائي على الشيكات والتحويلات',
      evaluation: 'EFFECTIVE',
    },
  ]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              مصفوفة تقييم الرقابة الداخلية ومخاطر المراجعة (ESA 315)
            </h3>
            <p className="text-xs text-slate-500">
              تقييم المخاطر المتأصلة ومخاطر الرقابة ومخاطر الاكتشاف للسنة المالية {selectedYear}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3">الدورة المستندية / التشغيلة</th>
              <th className="p-3 text-center">المخاطر المتأصلة</th>
              <th className="p-3 text-center">مخاطر الرقابة</th>
              <th className="p-3 text-center">مخاطر الاكتشاف</th>
              <th className="p-3">الضابط الرقابي الرئيسي</th>
              <th className="p-3 text-center">تقييم الكفاءة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cycles.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">{c.cycle}</td>
                <td className="p-3 text-center font-mono font-bold text-rose-700">{c.inherentRisk}</td>
                <td className="p-3 text-center font-mono font-bold text-amber-700">{c.controlRisk}</td>
                <td className="p-3 text-center font-mono font-bold text-indigo-700">{c.detectionRisk}</td>
                <td className="p-3 text-slate-600">{c.keyControl}</td>
                <td className="p-3 text-center">
                  {c.evaluation === 'EFFECTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> فعّال
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> يحتاج تحسين
                    </span>
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
