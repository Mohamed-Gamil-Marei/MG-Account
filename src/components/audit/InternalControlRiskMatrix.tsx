import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface InternalControlRiskMatrixProps {
  state: DatabaseState;
  selectedYear?: number;
}

export type RiskLevelOption = '' | 'LOW' | 'MEDIUM' | 'HIGH';
export type ControlEvaluationOption = '' | 'EFFECTIVE' | 'NEEDS_IMPROVEMENT' | 'WEAK';

export interface ControlCycleAssessment {
  id: string;
  cycle: string;
  inherentRisk: RiskLevelOption;
  controlRisk: RiskLevelOption;
  detectionRisk: RiskLevelOption;
  keyControl: string;
  evaluation: ControlEvaluationOption;
}

const INITIAL_EMPTY_CYCLES: ControlCycleAssessment[] = [
  {
    id: 'cyc-rev',
    cycle: 'دورة الإيرادات والمتحصلات والعملاء',
    inherentRisk: '',
    controlRisk: '',
    detectionRisk: '',
    keyControl: '',
    evaluation: '',
  },
  {
    id: 'cyc-pur',
    cycle: 'دورة المشتريات والمدفوعات والموردين',
    inherentRisk: '',
    controlRisk: '',
    detectionRisk: '',
    keyControl: '',
    evaluation: '',
  },
  {
    id: 'cyc-inv',
    cycle: 'دورة المخزون والتكاليف الصناعية',
    inherentRisk: '',
    controlRisk: '',
    detectionRisk: '',
    keyControl: '',
    evaluation: '',
  },
  {
    id: 'cyc-cash',
    cycle: 'دورة الخزينة والبنوك والتسويات',
    inherentRisk: '',
    controlRisk: '',
    detectionRisk: '',
    keyControl: '',
    evaluation: '',
  },
];

export const InternalControlRiskMatrix: React.FC<InternalControlRiskMatrixProps> = ({
  state,
  selectedYear = 2026,
}) => {
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;
  const targetYear = state.activeClientContext?.selectedFiscalYear || selectedYear;

  // Principle 8: No default professional conclusions; assessments start empty per client until entered by auditor
  const [assessmentsByClient, setAssessmentsByClient] = useState<Record<string, ControlCycleAssessment[]>>({});

  if (!activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار العميل (المنشأة) أولاً</p>
          <p className="mt-1">تقييم الرقابة الداخلية خاص بكل منشأة وسنة مالية ولا يحتوي على تقييمات افتراضية مسبقة.</p>
        </div>
      </div>
    );
  }

  const clientKey = `${activeClient.id}_${targetYear}`;
  const cycles = assessmentsByClient[clientKey] || INITIAL_EMPTY_CYCLES;

  const updateCycle = (cycleId: string, field: keyof ControlCycleAssessment, value: string) => {
    setAssessmentsByClient((prev) => {
      const currentList = prev[clientKey] || INITIAL_EMPTY_CYCLES.map((c) => ({ ...c }));
      const nextList = currentList.map((item) =>
        item.id === cycleId ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        [clientKey]: nextList,
      };
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              مصفوفة تقييم الرقابة الداخلية ومخاطر المراجعة (ESA 315) • {activeClient.name}
            </h3>
            <p className="text-xs text-slate-500">
              السنة المالية {targetYear} • يتم إدخال تقييم المخاطر والرقابة يدوياً بواسطة المراجع دون قيم افتراضية مسبقة
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3">الدورة المستندية / التشغيلية</th>
              <th className="p-3 text-center">المخاطر المتأصلة</th>
              <th className="p-3 text-center">مخاطر الرقابة</th>
              <th className="p-3 text-center">مخاطر الاكتشاف</th>
              <th className="p-3">الضابط الرقابي الرئيسي الملاحَظ</th>
              <th className="p-3 text-center">تقييم المراجع للكفاءة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cycles.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">{c.cycle}</td>
                <td className="p-3 text-center">
                  <select
                    value={c.inherentRisk}
                    onChange={(e) => updateCycle(c.id, 'inherentRisk', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                  >
                    <option value="">-- غير مقيّم --</option>
                    <option value="LOW">منخفض (LOW)</option>
                    <option value="MEDIUM">متوسط (MEDIUM)</option>
                    <option value="HIGH">مرتفع (HIGH)</option>
                  </select>
                </td>
                <td className="p-3 text-center">
                  <select
                    value={c.controlRisk}
                    onChange={(e) => updateCycle(c.id, 'controlRisk', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                  >
                    <option value="">-- غير مقيّم --</option>
                    <option value="LOW">منخفض (LOW)</option>
                    <option value="MEDIUM">متوسط (MEDIUM)</option>
                    <option value="HIGH">مرتفع (HIGH)</option>
                  </select>
                </td>
                <td className="p-3 text-center">
                  <select
                    value={c.detectionRisk}
                    onChange={(e) => updateCycle(c.id, 'detectionRisk', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                  >
                    <option value="">-- غير مقيّم --</option>
                    <option value="LOW">منخفض (LOW)</option>
                    <option value="MEDIUM">متوسط (MEDIUM)</option>
                    <option value="HIGH">مرتفع (HIGH)</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    value={c.keyControl}
                    onChange={(e) => updateCycle(c.id, 'keyControl', e.target.value)}
                    placeholder="أدخل الضابط الرقابي الفعلي لدى العميل..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </td>
                <td className="p-3 text-center">
                  <select
                    value={c.evaluation}
                    onChange={(e) => updateCycle(c.id, 'evaluation', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                  >
                    <option value="">-- اختر التقييم --</option>
                    <option value="EFFECTIVE">فعّال</option>
                    <option value="NEEDS_IMPROVEMENT">يحتاج تحسين</option>
                    <option value="WEAK">ضعيف (قصور جوهري)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
