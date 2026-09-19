import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Filter,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../../utils/excelArabicStyler';

interface InternalControlRiskMatrixProps {
  state: DatabaseState;
  selectedYear: number;
}

export interface ControlCycleItem {
  id: string;
  cycleName: string;
  objective: string;
  identifiedRisk: string;
  inherentRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  controlActivity: string;
  controlEffectiveness: 'EFFECTIVE' | 'DEFICIENT' | 'NOT_TESTED';
  controlRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  detectionRiskStrategy: string;
  auditorRecommendation: string;
}

const DEFAULT_CYCLES: ControlCycleItem[] = [
  {
    id: 'cycle-1',
    cycleName: 'دورة المبيعات والتحصيل',
    objective: 'التأكد من إثبات كافة المبيعات المكتملة دون تكرار أو حذف وإصدار الفواتير الإلكترونية المعتمدة.',
    identifiedRisk: 'احتمالية تسجيل مبيعات وهمية لتضخيم الإيرادات أو عدم سداد ضريبة القيمة المضافة في موعدها.',
    inherentRisk: 'HIGH',
    controlActivity: 'الربط اللحظي مع منظومة الفاتورة الإلكترونية ETA ومطابقة أوامر التوريد وأذون الصرف.',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'إجراء مصادقات إيجابية للعملاء واختبار القطع الزمني للمبيعات (Cut-off testing).',
    auditorRecommendation: 'استمرار الرقابة الآلية وتفعيل متابعة أعمار الديون شهرياً.',
  },
  {
    id: 'cycle-2',
    cycleName: 'دورة المشتريات والمخازن',
    objective: 'التحقق من أن المشتريات تمت بناءً على طلبات شراء معتمدة وفواتير إلكترونية سليمة ضريبياً.',
    identifiedRisk: 'قبول فواتير شراء غير حقيقية أو تضخيم تكلفة البضاعة المباعة لتقليل صافي الربح الضريبي.',
    inherentRisk: 'HIGH',
    controlActivity: 'نظام المطابقة الثلاثية (أمر الشراء + إذن استلام المخزن + فاتورة المورد الإلكترونية).',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'فحص عينات فواتير المشتريات الكبرى ومطابقتها مع الإقرارات الضريبية الشهرية.',
    auditorRecommendation: 'إلزام إدارة المشتريات بالتحقق من صحة الرقم الضريبي للموردين قبل التعاقد.',
  },
  {
    id: 'cycle-3',
    cycleName: 'دورة النقدية والخزينة والبنوك',
    objective: 'حماية أموال الشركة ومنع الاختلاس أو الصرف غير المصرح به.',
    identifiedRisk: 'إساءة استخدام أموال الخزينة أو عدم مطابقة مذكرات تسوية البنوك في نهاية الشهر.',
    inherentRisk: 'HIGH',
    controlActivity: 'فصل المهام بين أمين الخزينة ومسؤول القيد، واعتماد الشيكات بتوقيعين مصرفيين مجتمعين.',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'إرسال مصادقات مباشرة لجميع البنوك وجرد مفاجئ للخزينة.',
    auditorRecommendation: 'تحديد سقف أقصى للنقدية السائلة بالخزينة وإيداع الزيادة فوراً بالبنوك.',
  },
  {
    id: 'cycle-4',
    cycleName: 'دورة الأجور والمرتبات',
    objective: 'صحة احتساب رواتب العاملين واستقطاعات التأمينات الاجتماعية وضريبة كسب العمل.',
    identifiedRisk: 'إدراج عمالة وهمية أو الخطأ في حساب استقطاعات ضريبة المرتبات والتأمينات.',
    inherentRisk: 'MEDIUM',
    controlActivity: 'سجلات الحضور الذكية بالبصمة وتحويل الرواتب عبر البطاقات البنكية (ATM/Payroll).',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'فحص عينات مطابقة كشوف المرتبات مع استمارة (2) تأمينات ونموذج (4) كسب عمل.',
    auditorRecommendation: 'أرشفة إقرارات كسب العمل الربع سنوية المعتمدة إلكترونياً.',
  },
  {
    id: 'cycle-5',
    cycleName: 'دورة الأصول الثابتة',
    objective: 'إثبات الملكية القانونية وتطبيق نسب الإهلاك المحاسبي السليمة ومتابعة الإضافات والاستبعادات.',
    identifiedRisk: 'عدم رسملة الأصول بشكل سليم أو إهلاك أصول مستبعدة أو عدم تسجيل عقود الملكية.',
    inherentRisk: 'MEDIUM',
    controlActivity: 'سجل أصول ثابتة مرقم ومطابقة الجرد السنوي مع السجلات الدفترية.',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'معاينة عينات إضافات الأصول الكبرى والتأكد من فواتير الشراء وترخيص السيارات.',
    auditorRecommendation: 'إجراء جرد فعلي سنوي شامل بواسطة لجنة محايدة وتكوين مخصص للأصول الراكدة.',
  },
  {
    id: 'cycle-6',
    cycleName: 'دورة الإقفال وإعداد القوائم المالية',
    objective: 'سلامة قيود التسوية والتأكد من توافق القوائم مع معايير المحاسبة المصرية.',
    identifiedRisk: 'تعديلات يدوية غير موثقة على قيود اليومية أو عدم استيفاء الإيضاحات المتممة الإلزامية.',
    inherentRisk: 'HIGH',
    controlActivity: 'حظر التعديل اليدوي في القيود بعد الترحيل وسجل تدقيق إلكتروني (Audit Trail) غير قابل للحذف.',
    controlEffectiveness: 'EFFECTIVE',
    controlRisk: 'LOW',
    detectionRiskStrategy: 'فحص ميزان المراجعة قبل وبعد التسويات واختبار قيود الإقفال السنوية.',
    auditorRecommendation: 'استكمال كافة الإيضاحات المتممة المعتمدة بالقوائم المالية المقارنة.',
  },
];

export const InternalControlRiskMatrix: React.FC<InternalControlRiskMatrixProps> = ({
  state,
  selectedYear,
}) => {
  const [cycles, setCycles] = useState<ControlCycleItem[]>(DEFAULT_CYCLES);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const handleExportExcel = () => {
    const rows = cycles.map((c, idx) => ({
      'م': idx + 1,
      'دورة النشاط': c.cycleName,
      'الهدف الرقابي': c.objective,
      'الخطر المحتمل المحدد': c.identifiedRisk,
      'مستوى الخطر الأصيل (Inherent Risk)': c.inherentRisk === 'HIGH' ? 'مرتفع' : c.inherentRisk === 'MEDIUM' ? 'متوسط' : 'منخفض',
      'الإجراء الرقابي المطبق': c.controlActivity,
      'فاعلية الرقابة الداخلية': c.controlEffectiveness === 'EFFECTIVE' ? 'فعال وسليم' : 'قصور رقابي',
      'خطر الرقابة المقدر (Control Risk)': c.controlRisk === 'HIGH' ? 'مرتفع' : c.controlRisk === 'MEDIUM' ? 'متوسط' : 'منخفض',
      'استراتيجية التحقق والمراجعة': c.detectionRiskStrategy,
      'توصيات مراقب الحسابات': c.auditorRecommendation,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    formatWorksheetForArabicExport(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'مصفوفة تقييم الرقابة والمخاطر');
    writeArabicExcelFile(wb, `مصفوفة_تقييم_الرقابة_الداخلية_والمخاطر_${selectedYear}.xlsx`);
  };

  const filteredCycles = cycles.filter((c) => {
    if (filterRisk === 'ALL') return true;
    return c.inherentRisk === filterRisk;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-black text-slate-900">
              مصفوفة تقييم نظام الرقابة الداخلية وإدارة المخاطر (Internal Control & Risk Matrix - ESA 315)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق كامل لتقييم المخاطر الأصيلة ومخاطر الرقابة وتحديد الإجراءات التصحيحية عبر كافة دورات النشاط المالي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>تصدير المصفوفة (XLSX)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 no-print text-xs">
        <span className="font-bold text-slate-700">تصفية حسب الخطر الأصيل:</span>
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setFilterRisk(lvl)}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              filterRisk === lvl
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lvl === 'ALL' ? 'كافة الدورات (6)' : lvl === 'HIGH' ? 'خطر مرتفع' : lvl === 'MEDIUM' ? 'خطر متوسط' : 'خطر منخفض'}
          </button>
        ))}
      </div>

      {/* Risk Cycles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCycles.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h4 className="text-sm font-black text-slate-900">{c.cycleName}</h4>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.inherentRisk === 'HIGH'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  الخطر الأصيل: {c.inherentRisk === 'HIGH' ? 'مرتفع' : 'متوسط'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  الرقابة: فعالة
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">الهدف الرقابي للعملية:</span>
                <p className="text-slate-600">{c.objective}</p>
              </div>

              <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-slate-700">
                <span className="font-bold text-rose-900 block text-[11px]">الخطر المحدد (Identified Risk):</span>
                <p className="text-slate-700 text-[11px] mt-0.5">{c.identifiedRisk}</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                <span className="font-bold text-slate-800 block text-[11px]">الإجراء الرقابي المطبق (Internal Control):</span>
                <p className="text-slate-600 text-[11px] mt-0.5">{c.controlActivity}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block">إجراء المراجع الميداني:</span>
                  <p className="text-indigo-900 font-medium">{c.detectionRiskStrategy}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">توصية كتاب الإدارة:</span>
                  <p className="text-emerald-900 font-medium">{c.auditorRecommendation}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
