import React, { useState } from 'react';
import {
  Award,
  Printer,
  Download,
  Plus,
  ShieldCheck,
  Building,
  UserCheck,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';

interface CertificatesGeneratorViewProps {
  state: DatabaseState;
}

export const CertificatesGeneratorView: React.FC<CertificatesGeneratorViewProps> = ({ state }) => {
  const profile = state.officeProfile;

  const [certType, setCertType] = useState<'INCOME_PROOF' | 'INVESTED_CAPITAL' | 'FINANCIAL_SOLVENCY' | 'AUDIT_COMPLIANCE'>('INCOME_PROOF');
  const [recipientOrganization, setRecipientOrganization] = useState('السادة / بنك مصر - قطاع تمويل الشركات والائتمان');
  const [beneficiaryName, setBeneficiaryName] = useState('السيد / أحمد محمود إبراهيم النجار');
  const [nationalIdOrTaxCard, setNationalIdOrTaxCard] = useState('بطاقة رقم قومي: 28509140102938 • سجل تجاري 148293');
  const [activityName, setActivityName] = useState('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
  const [certifiedAmount, setCertifiedAmount] = useState<number>(3850000);
  const [periodText, setPeriodText] = useState('عن السنة المالية المنتهية في 31 ديسمبر 2025');
  const [purpose, setPurpose] = useState('لتقديمها للبنك بناءً على طلب العميل للحصول على تسهيلات ائتمانية');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  const certNumber = `CERT-EGY-${new Date().getFullYear()}-0482`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-700" />
            <h2 className="text-lg font-bold text-slate-900">
              إصدار الشهادات المحاسبية والمهنية المعتمدة (QR Certificates)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إصدار شهادات الدخل ورأس المال والملاءة المالية بالختم الإلكتروني والتفقيط باللغة العربية.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة الرسمية</span>
          </button>
        </div>
      </div>

      {/* Certificate Controls and Inputs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">نوع الشهادة المهنية</label>
            <select
              value={certType}
              onChange={(e) => setCertType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-950"
            >
              <option value="INCOME_PROOF">1. شهادة إثبات صافي دخل سنوي / شهري</option>
              <option value="INVESTED_CAPITAL">2. شهادة رأس مال مستثمر وحجم أعمال</option>
              <option value="FINANCIAL_SOLVENCY">3. شهادة ملاءة مالية وجودة ائتمانية</option>
              <option value="AUDIT_COMPLIANCE">4. شهادة فحص ومراجعة حسابات</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">المبلغ المعتمد بالشهادة (ج.م) *</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={certifiedAmount}
              onChange={(e) => setCertifiedAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">الجهة الموجه إليها الشهادة</label>
            <input
              type="text"
              value={recipientOrganization}
              onChange={(e) => setRecipientOrganization(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">تاريخ إصدار الشهادة</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم العميل / المستفيد الصادر له</label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">الرقم القومي / السجل والبطاقة</label>
            <input
              type="text"
              value={nationalIdOrTaxCard}
              onChange={(e) => setNationalIdOrTaxCard(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم النشاط أو المنشأة</label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Printable Certificate Layout Document */}
      <div className="bg-white rounded-2xl border-2 border-emerald-900 shadow-md p-8 sm:p-14 space-y-6 text-slate-900 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black print:p-8">
        {/* Certificate Letterhead */}
        <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-black text-slate-900">{profile.firmName}</h1>
            <div className="text-xs font-bold text-emerald-800">{profile.auditorName}</div>
            <div className="text-[11px] text-slate-600 font-mono">
              محاسب ومراجع قانوني • سجل المحاسبين رقم {profile.licenseNumber}
            </div>
          </div>
          <div className="text-left font-mono text-[11px] text-slate-500">
            <div>رقم الشهادة: {certNumber}</div>
            <div>التاريخ: {issueDate}</div>
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center py-3">
          <div className="inline-block px-6 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <h2 className="text-lg sm:text-xl font-black text-emerald-950">
              {certType === 'INCOME_PROOF'
                ? 'شهـادة إثبـات صـافـي دخـل سنـوي'
                : certType === 'INVESTED_CAPITAL'
                ? 'شهـادة رأس المـال المستثمـر وحجـم الأعمـال'
                : certType === 'FINANCIAL_SOLVENCY'
                ? 'شهـادة مـلاءة مـاليـة وجودة ائتمانية'
                : 'شهـادة فحـص ومراجعـة حسـابـات'}
            </h2>
          </div>
        </div>

        {/* Salutation */}
        <div className="font-bold text-sm text-slate-900">
          إلى: {recipientOrganization}
        </div>
        <div className="text-slate-700 font-semibold">تحية طيبة وبعد،،،</div>

        {/* Body Text */}
        <div className="space-y-4 text-justify text-slate-800 leading-7 text-xs sm:text-sm">
          <p>
            بناءً على طلب العميل / <strong>{beneficiaryName}</strong> ({nationalIdOrTaxCard})، وبصفتنا المحاسب والمراجع القانوني لـ <strong>{activityName}</strong>، وبناءً على الفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة والمستندات المؤيدة والفواتير والإقرارات الضريبية المقدمة لمصلحة الضرائب المصرية:
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
            <div className="font-bold text-slate-900 text-sm">
              نشهد ونقر بأن {certType === 'INCOME_PROOF' ? 'صافي الدخل السنوي المحقق' : 'القيمة المعتمدة'}:
            </div>
            <div className="text-lg font-black text-emerald-900 font-mono">
              {formatEgyptianCurrency(certifiedAmount)}
            </div>
            <div className="font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-xs">
              فقط وقدره: {numberToArabicWords(certifiedAmount)} لا غير.
            </div>
            <div className="text-xs text-slate-600 font-medium">
              وذلك {periodText}.
            </div>
          </div>

          <p>
            وقد أُعطيت هذه الشهادة بناءً على طلب العميل لتقديمها إلى <strong>{recipientOrganization}</strong>، وذلك {purpose}، دون أدنى مسؤولية على مكتب المحاسب القانوني تجاه الغير فيما يجاوز ما تم فحصه مستندياً ومحاسبياً.
          </p>
        </div>

        {/* Closing and Signature */}
        <div className="pt-8 border-t-2 border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-right">
            <div className="text-xs text-slate-500 font-bold">المحاسب القانوني ومراقب الحسابات:</div>
            <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
            <div className="text-emerald-800 font-semibold">{profile.title}</div>
            <div className="text-slate-500 font-mono text-[11px]">
              رقم القيد بسجل المحاسبين والمراجعين: {profile.licenseNumber}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-900 p-2 text-center">
              <span>مكتب المحاسب القانوني</span>
              <span className="text-emerald-800 font-black text-[11px]">{profile.auditorName}</span>
              <span>س.م.م {profile.licenseNumber}</span>
              <span className="text-[10px] text-emerald-600 font-bold">ختم الاعتماد</span>
            </div>

            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(`CERTIFICATE|${certNumber}|${beneficiaryName}|${certifiedAmount}|MOHAMED_GAMIL_MAREI`, 96),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
