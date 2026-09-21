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
import { generateQrCodeSvg, buildAuditorReportQrText } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { OfficialReportHeader } from './common/OfficialReportHeader';

interface AuditorReportViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

export const AuditorReportView: React.FC<AuditorReportViewProps> = ({ state, fiscalYear: initialFiscalYear }) => {
  const profile = state.officeProfile;
  const activeClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);

  const [reportType, setReportType] = useState<'UNQUALIFIED' | 'QUALIFIED' | 'DISCLAIMER'>('UNQUALIFIED');
  const [clientCompanyName, setClientCompanyName] = useState(
    activeClient?.name || 'شركة النيل للصناعات الهندسية والتجارة (ش.م.م)'
  );
  const [fiscalYear, setFiscalYear] = useState(String(initialFiscalYear || '2026'));
  const [governanceDate, setGovernanceDate] = useState('2026-03-15');

  // Auto-sync client company name if activeClient changes
  React.useEffect(() => {
    if (activeClient?.name) {
      setClientCompanyName(activeClient.name);
    }
  }, [activeClient?.name]);

  const opinionText =
    reportType === 'UNQUALIFIED'
      ? 'رأي غير متحفظ (نظيف)'
      : reportType === 'QUALIFIED'
      ? 'رأي متحفظ (مع لفت انتباه)'
      : 'تقرير خاص بزيادة رأس المال والاندماج';

  const qrPayload = buildAuditorReportQrText({
    auditorName: profile.auditorName,
    licenseNumber: profile.licenseNumber,
    companyName: clientCompanyName,
    fiscalYear,
    opinion: opinionText,
    refNumber: `AUD-EGY-${fiscalYear}-8821`,
  });

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
            صياغة مهنية وفقاً لمعايير المراجعة المصرية والقانون 159 لسنة 1981 باعتماد المحاسب والمراجع القانوني {profile.auditorName}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ScreenActionToolbar
            modelType="AUDITOR_REPORT"
            title="تقرير مراقب الحسابات المستقل"
            targetElementId="auditor-report-paper"
            showImport={false}
          />
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs no-print">
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
      <div
        id="auditor-report-paper"
        data-printable="true"
        dir="rtl"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-12 space-y-6 text-slate-800 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 font-['Cairo',sans-serif]"
        style={{ letterSpacing: 'normal' }}
      >
        {/* Auditor Official Top Letterhead */}
        <OfficialReportHeader
          officeProfile={profile}
          clientProfile={{
            companyName: clientCompanyName,
          }}
          reportTitle="تقرير مراقب الحسابات المستقل"
          documentReference={`AUD-EGY-${fiscalYear}-8821`}
          fiscalYear={fiscalYear}
          issueDate={governanceDate}
          showTaxAndRegDetails={false}
        />

        {/* Title */}
        <div className="text-center py-1">
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
          <p className="text-right text-slate-700 leading-6">
            راجعنا القوائم المالية المرفقة لـ <strong>{clientCompanyName}</strong>، والمتمثلة في قائمة المركز المالي كما في 31 ديسمبر {fiscalYear}، وكذا قوائم الدخل الشامل، والتغير في حقوق الملكية، والتدفقات النقدية عن السنة المالية المنتهية في ذلك التاريخ، وملخصاً لأهم السياسات المحاسبية والإيضاحات المتممة الأخرى.
          </p>
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium leading-6 text-right">
            وفي رأينا، فإن القوائم المالية المشار إليها أعلاه تعبر بوضوح وعدالة، من كافة النواحي الجوهرية، عن المركز المالي للشركة كما في 31 ديسمبر {fiscalYear}، وعن أدائها المالي وتدفقاتها النقدية عن السنة المنتهية في ذلك التاريخ، وذلك وفقاً <strong>لمعايير المحاسبة المصرية (EAS)</strong> وفي ضوء القوانين واللوائح المصرية ذات الصلة المنظمة لعمل الشركات.
          </div>
        </div>

        {/* Section: Basis of Opinion */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            ثانياً: أساس الرأي (Basis for Opinion)
          </h3>
          <p className="text-right text-slate-700 leading-6">
            تمت مراجعتنا وفقاً لـ <strong>معايير المراجعة المصرية</strong>، ومسؤولياتنا محددة تفصيلاً في قسم "مسؤوليات مراقب الحسابات". ونحن مستقلون تماماً عن الشركة وفقاً لقواعد وآداب وسلوكيات المهنة الصادرة عن جمعية المحاسبين والمراجعين المصرية وميثاق الشرف المهني، ونعتقد أن أدلة المراجعة التي حصلنا عليها كافية ومناسبة لتوفير أساس متين لإبداء رأينا المهني.
          </p>
        </div>

        {/* Section: Management Responsibility */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            ثالثاً: مسؤولية الإدارة عن القوائم المالية
          </h3>
          <p className="text-right text-slate-700 leading-6">
            إن إدارة الشركة مسؤولة عن إعداد هذه القوائم المالية وعرضها بوضوح وعدالة وفقاً لمعايير المحاسبة المصرية، وعن نظام الرقابة الداخلية الذي تراه ضرورياً لإعداد قوائم مالية خالية من أي تحريف هام ومؤثر، سواء كان ناتجاً عن غش أو خطأ.
          </p>
        </div>

        {/* Section: Legal and Regulatory Requirements */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900 border-r-4 border-emerald-700 pr-2">
            رابعاً: تقرير عن المتطلبات القانونية والتنظيمية الأخرى
          </h3>
          <ul className="list-disc pr-6 space-y-1 text-slate-700 leading-6 text-right">
            <li>تمسك الشركة حسابات مالية منتظمة تتضمن كل ما نص عليه القانون ونظام الشركة الأساسي، وتتفق القوائم المالية مع ما هو وارد بتلك الحسابات.</li>
            <li>قام مجلس إدارة الشركة بجرد المخزون وفقاً للأصول المرعية وحضرنا عملية الجرد أو تحققنا من وجوده الفعلي.</li>
            <li>البيانات المالية الواردة بتقرير مجلس إدارة الشركة تتفق مع ما هو وارد بدفاتر الشركة في الحدود المنصوص عليها بقانون الشركات رقم 159 لسنة 1981.</li>
          </ul>
        </div>

        {/* Official Signature and Stamp Box */}
        <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-right">
            <div className="text-xs text-slate-500 font-bold">مراقب الحسابات والمراجع القانوني:</div>
            <div className="text-base font-black text-slate-950">{profile.auditorName}</div>
            <div className="text-emerald-850 font-bold text-xs">{profile.title}</div>
            <div className="text-slate-600 font-mono text-[11px]">
              رقم القيد بسجل المحاسبين: {profile.licenseNumber}
            </div>
            {profile.phone && (
              <div className="text-emerald-900 font-mono font-bold text-[11px]">
                هاتف وتواصل المكتب: {profile.phone}
              </div>
            )}
            <div className="text-slate-500 text-[10.5px]">
              عضو جمعية المحاسبين والمراجعين المصرية (ESAA)
            </div>

            {/* Handwritten Signature Target Area */}
            <div className="pt-2">
              <div className="text-[10px] text-slate-600 font-bold mb-1">التوقيع والاعتماد المهني (بخط اليد):</div>
              <div className="w-56 h-10 border-b-2 border-dotted border-slate-700 flex items-end pb-1 text-slate-400 text-[10px]">
                <span>توقيع المحاسب القانوني: ............................</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Designated Physical Stamp Area */}
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-800 bg-emerald-50/30 flex flex-col items-center justify-center text-[8.5px] font-bold text-emerald-950 p-2 text-center select-none shadow-2xs">
              <span className="text-[8px] font-black">★ موضع خاتم المكتب ★</span>
              <span className="text-emerald-900 font-black text-[10px] my-0.5">{profile.auditorName}</span>
              <span className="font-mono text-[8px]">{profile.licenseNumber}</span>
              <span className="text-[7px] text-slate-500 mt-1 font-sans">(بصمة الختم الحي)</span>
            </div>

            <div
              data-qr-container="true"
              className="qr-print-container bg-white p-1 rounded-lg border border-slate-200"
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(qrPayload, 105),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
