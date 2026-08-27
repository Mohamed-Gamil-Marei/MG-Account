import React, { useState } from 'react';
import {
  FileCheck2,
  Printer,
  Download,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { generateQrCodeSvg } from '../utils/qrCodeGenerator';

interface AuditorReportViewProps {
  state: DatabaseState;
}

export const AuditorReportView: React.FC<AuditorReportViewProps> = ({ state }) => {
  const profile = state.officeProfile;
  const [reportType, setReportType] = useState<'UNQUALIFIED' | 'QUALIFIED' | 'DISCLAIMER'>('UNQUALIFIED');
  const [clientCompanyName, setClientCompanyName] = useState('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [governanceDate, setGovernanceDate] = useState('2026-03-15');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              تقرير مراقب الحسابات المستقل (Independent Auditor's Report)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صياغة مهنية وفقاً لمعايير المراجعة المصرية والقانون 159 لسنة 1981 باعتماد المحاسب والمراجع القانوني محمد جميل مرعي.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير المعتمد</span>
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">نوع رأي المراجع:</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900"
          >
            <option value="UNQUALIFIED">رأي غير متحفظ (نظيف - Unqualified Clean Opinion)</option>
            <option value="QUALIFIED">رأي متحفظ (مع لفت انتباه / تحفظ - Qualified)</option>
            <option value="DISCLAIMER">تقرير خاص بزيادة رأس المال والاندماج</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">تاريخ إعداد التقرير:</span>
          <input
            type="date"
            value={governanceDate}
            onChange={(e) => setGovernanceDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
          />
        </div>
      </div>

      {/* Official Certificate Paper Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-12 space-y-6 text-slate-800 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
        {/* Auditor Official Top Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-black text-slate-900">{profile.firmName}</h1>
            <div className="text-xs font-bold text-emerald-800">{profile.auditorName} - {profile.title}</div>
            <div className="text-[11px] text-slate-500 font-mono">
              سجل المحاسبين والمراجعين رقم: {profile.licenseNumber} • سجل خبراء الضرائب رقم: {profile.taxAuthorityLicense}
            </div>
          </div>
          <div className="text-left font-mono text-[11px] text-slate-500">
            <div>التاريخ: {governanceDate}</div>
            <div>الرقم المرجعي: AUD-EGY-{fiscalYear}-8821</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-2">
          <h2 className="text-lg font-black text-slate-900 underline underline-offset-8">
            تقرير مراقب الحسابات المستقل
          </h2>
          <div className="text-xs font-bold text-slate-600 mt-2">
            إلى السادة / مساهمي {clientCompanyName}
          </div>
        </div>

        {/* Section: Opinion */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            أولاً: الرأي المهني (Opinion)
          </h3>
          <p className="text-justify text-slate-700 leading-6">
            راجعنا القوائم المالية المرفقة لـ <strong>{clientCompanyName}</strong>، والمتمثلة في قائمة المركز المالي كما في 31 ديسمبر {fiscalYear}، وكذا قوائم الدخل الشامل، والتغير في حقوق الملكية، والتدفقات النقدية عن السنة المالية المنتهية في ذلك التاريخ، وملخصاً لأهم السياسات المحاسبية والإيضاحات المتممة الأخرى.
          </p>
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium leading-6">
            وفي رأينا، فإن القوائم المالية المشار إليها أعلاه تعبر بوضوح وعدالة، من كافة النواحي الجوهرية، عن المركز المالي للشركة كما في 31 ديسمبر {fiscalYear}، وعن أدائها المالي وتدفقاتها النقدية عن السنة المنتهية في ذلك التاريخ، وذلك وفقاً <strong>لمعايير المحاسبة المصرية (EAS)</strong> وفي ضوء القوانين واللوائح المصرية ذات الصلة المنظمة لعمل الشركات.
          </div>
        </div>

        {/* Section: Basis of Opinion */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            ثانياً: أساس الرأي (Basis for Opinion)
          </h3>
          <p className="text-justify text-slate-700 leading-6">
            تمت مراجعتنا وفقاً لـ <strong>معايير المراجعة المصرية</strong>، ومسؤولياتنا محددة تفصيلاً في قسم "مسؤوليات مراقب الحسابات". ونحن مستقلون تماماً عن الشركة وفقاً لقواعد وآداب وسلوكيات المهنة الصادرة عن جمعية المحاسبين والمراجعين المصرية وميثاق الشرف المهني، ونعتقد أن أدلة المراجعة التي حصلنا عليها كافية ومناسبة لتوفير أساس متين لإبداء رأينا المهني.
          </p>
        </div>

        {/* Section: Management Responsibility */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            ثالثاً: مسؤولية الإدارة عن القوائم المالية
          </h3>
          <p className="text-justify text-slate-700 leading-6">
            إن إدارة الشركة مسؤولة عن إعداد هذه القوائم المالية وعرضها بوضوح وعدالة وفقاً لمعايير المحاسبة المصرية، وعن نظام الرقابة الداخلية الذي تراه ضرورياً لإعداد قوائم مالية خالية من أي تحريف هام ومؤثر، سواء كان ناتجاً عن غش أو خطأ.
          </p>
        </div>

        {/* Section: Legal and Regulatory Requirements */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            رابعاً: تقرير عن المتطلبات القانونية والتنظيمية الأخرى
          </h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700 leading-6">
            <li>تمسك الشركة حسابات مالية منتظمة تتضمن كل ما نص عليه القانون ونظام الشركة الأساسي، وتتفق القوائم المالية مع ما هو وارد بتلك الحسابات.</li>
            <li>قام مجلس إدارة الشركة بجرد المخزون وفقاً للأصول المرعية وحضرنا عملية الجرد أو تحققنا من وجوده الفعلي.</li>
            <li>البيانات المالية الواردة بتقرير مجلس إدارة الشركة تتفق مع ما هو وارد بدفاتر الشركة في الحدود المنصوص عليها بقانون الشركات رقم 159 لسنة 1981.</li>
          </ul>
        </div>

        {/* Official Signature and Stamp Box */}
        <div className="pt-8 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-right">
            <div className="text-xs text-slate-500 font-bold">مراقب الحسابات والمراجع القانوني:</div>
            <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
            <div className="text-emerald-800 font-semibold">{profile.title}</div>
            <div className="text-slate-500 font-mono text-[11px]">
              رقم القيد بسجل المحاسبين: {profile.licenseNumber}
            </div>
            <div className="text-slate-500 text-[11px]">
              عضو جمعية المحاسبين والمراجعين المصرية (ESAA)
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-900 p-2 text-center">
              <span>مكتب المحاسب القانوني</span>
              <span className="text-emerald-800 font-black text-[11px]">{profile.auditorName}</span>
              <span>س.م.م {profile.licenseNumber}</span>
              <span className="text-xs text-emerald-600 font-bold">معتمد وموثق</span>
            </div>

            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(`AUDITOR_REPORT|${clientCompanyName}|${fiscalYear}|MOHAMED_GAMIL_MAREI|LIC_${profile.licenseNumber}`, 96),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
