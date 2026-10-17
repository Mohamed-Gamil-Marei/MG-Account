import React from 'react';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export interface SmartCpaTemplateViewProps {
  companyName?: string;
}

export const SmartCpaTemplateView: React.FC<SmartCpaTemplateViewProps> = ({
  companyName = 'الشركة المعتمدة',
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              نموذج القوائم المالية الذكي المعتمد — {companyName}
            </h3>
            <p className="text-xs text-slate-500">
              قالب متوافق مع معايير المحاسبة المصرية (EAS) لربط ميزان المراجعة بالقوائم الختامية والإيضاحات المتممة
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" /> متوازن ومربوط تلقائياً
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="font-black text-slate-900 dark:text-white mb-1">1. قائمة المركز المالي</div>
          <p className="text-slate-600 dark:text-slate-400">تبويب الأصول غير المتداولة والمتداولة وحقوق الملكية والالتزامات وفق EAS 1.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="font-black text-slate-900 dark:text-white mb-1">2. قائمة الدخل الشامل</div>
          <p className="text-slate-600 dark:text-slate-400">تحليل مجمل الربح وتكلفة المبيعات والمصروفات العمومية والتمويلية والضرائب.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="font-black text-slate-900 dark:text-white mb-1">3. التدفقات النقدية والإيضاحات</div>
          <p className="text-slate-600 dark:text-slate-400">الطريقة غير المباشرة (EAS 4) مع ربط آلي بجداول الإهلاك والضرائب.</p>
        </div>
      </div>
    </div>
  );
};
