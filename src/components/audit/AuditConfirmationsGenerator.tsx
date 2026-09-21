import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { OfficialReportHeader } from '../common/OfficialReportHeader';
import {
  FileBadge,
  Printer,
  Building,
  Mail,
  Send,
  Download,
  CheckCircle,
  Copy,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface AuditConfirmationsGeneratorProps {
  state: DatabaseState;
  selectedYear: number;
}

export type ConfirmationType = 'BANK' | 'CUSTOMER' | 'SUPPLIER' | 'LEGAL';

export const AuditConfirmationsGenerator: React.FC<AuditConfirmationsGeneratorProps> = ({
  state,
  selectedYear,
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>('BANK');
  const [selectedClientName, setSelectedClientName] = useState<string>(
    state.clients[0]?.name || 'شركة النيل للصناعات الهندسية والتجارة'
  );
  const [targetPartyName, setTargetPartyName] = useState<string>('البنك الأهلي المصري - فرع الألفي');
  const [targetPartyAddress, setTargetPartyAddress] = useState<string>('15 شارع شريف، وسط البلد، القاهرة');
  const [targetPartyAccountNo, setTargetPartyAccountNo] = useState<string>('1002348892019920');
  const [balanceAmount, setBalanceAmount] = useState<number>(1850000);
  const [confirmationDate, setConfirmationDate] = useState<string>(`${selectedYear}-12-31`);
  const [confirmationNature, setConfirmationNature] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  const [isSignApplied, setIsSignApplied] = useState<boolean>(true);

  const office = state.officeProfile || {
    firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
    auditorName: 'محمد جميل مرعي',
    licenseNumber: 'س.م.م 43122',
    title: 'محاسب قانوني وخبير ضرائب ومراقب حسابات الشركات المساهمة',
    phone: '01003335360',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-black text-slate-900">
              مولد خطابات المصادقات الخارجية المعتمدة (External Confirmations - ESA 505)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إعداد وطباعة طلبات المصادقات المباشرة للبنوك والعملاء والموردين والمستشارين القانونيين وفق معايير المراجعة المصرية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            <span>طباعة الخطاب الرسمي (A4)</span>
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs no-print">
        <div>
          <label className="font-bold text-slate-700 block mb-1">نوع المصادقة المطلوبة:</label>
          <select
            value={confirmationType}
            onChange={(e) => {
              const type = e.target.value as ConfirmationType;
              setConfirmationType(type);
              if (type === 'BANK') {
                setTargetPartyName('البنك الأهلي المصري - فرع الألفي');
                setTargetPartyAccountNo('1002348892019920');
              } else if (type === 'CUSTOMER') {
                setTargetPartyName('شركة الأهرام للتجارة والتوزيع');
                setTargetPartyAccountNo('كود عميل: CUST-402');
              } else if (type === 'SUPPLIER') {
                setTargetPartyName('شركة السويس لمواد التعبئة');
                setTargetPartyAccountNo('كود مورد: SUP-109');
              } else {
                setTargetPartyName('مكتب الأستاذ / عادل منصور - المحامي بالنقض');
                setTargetPartyAccountNo('ملف قضايا رقم 204');
              }
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
          >
            <option value="BANK">مصادقة بنكية شاملة (Bank Confirmation)</option>
            <option value="CUSTOMER">مصادقة رصيد عميل (Receivable Confirmation)</option>
            <option value="SUPPLIER">مصادقة رصيد مورد (Payable Confirmation)</option>
            <option value="LEGAL">مصادقة قضايا ومستشار قانوني (Legal Confirmation)</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">اسم العميل / الشركة محل المراجعة:</label>
          <select
            value={selectedClientName}
            onChange={(e) => setSelectedClientName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
          >
            {state.clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">الجهة المرسل إليها المصادقة:</label>
          <input
            type="text"
            value={targetPartyName}
            onChange={(e) => setTargetPartyName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">الرصيد الدفتري في تاريخ الميزانية (ج.م):</label>
          <input
            type="number"
            step="1000"
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
          />
        </div>
      </div>

      {/* Official Printable Document Container (A4 Standard) */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-lg p-8 sm:p-12 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none text-slate-900 leading-relaxed font-sans text-sm">
        {/* Document Letterhead */}
        <OfficialReportHeader
          officeProfile={office}
          clientProfile={{
            companyName: selectedClientName,
          }}
          reportTitle="طلب مصادقة تدقيق ومراجعة خارجية"
          documentReference={`CONF-${selectedYear}-042`}
          fiscalYear={selectedYear}
          issueDate={new Date().toLocaleDateString('ar-EG')}
          showTaxAndRegDetails={false}
        />

        {/* Confirmation Subject & Salutation */}
        <div className="mb-6 space-y-2">
          <div className="text-sm font-bold text-slate-800">
            السادة / {targetPartyName} المحترمين
          </div>
          <div className="text-xs text-slate-600">{targetPartyAddress}</div>
          <div className="text-xs font-bold text-slate-700 font-mono">
            رقم الحساب / الإشارة الدفترية: [{targetPartyAccountNo}]
          </div>
          <div className="pt-2 text-sm font-black text-blue-900 underline underline-offset-4">
            الموضوع: طلب مصادقة مباشرة على الأرصدة والتعاملات في تاريخ {confirmationDate}
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-4 text-xs sm:text-sm text-justify leading-relaxed">
          <p>
            تحية طيبة وبعد،،،
          </p>

          <p>
            في إطار قيامنا بأعمال المراجعة القانونية السنوية للقوائم المالية الخاصة بعميلنا: 
            <strong className="font-bold text-slate-900 mx-1">({selectedClientName})</strong>
            عن السنة المالية المنتهية في <strong>{confirmationDate}</strong> طبقاً لمعايير المراجعة المصرية (ESA 505)، 
            نرجو من سيادتكم التكرم بمطابقة الرصيد والتعاملات التالية مع سجلاتكم الدفترية وإفادتنا بردكم المباشر.
          </p>

          {/* Details Table */}
          <div className="my-4 border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5 font-mono text-left">الرصيد في دفاتر العميل</th>
                  <th className="p-2.5 text-center">طبيعة الرصيد</th>
                  <th className="p-2.5">ملاحظات التحقق</th>
                </tr>
              </thead>
              <tbody>
                <tr className="divide-x divide-slate-200">
                  <td className="p-3 font-bold">{confirmationType === 'BANK' ? 'أرصدة الحسابات الجارية والودائع والتسهيلات' : 'رصيد الحساب الجاري الدفتري'}</td>
                  <td className="p-3 font-mono font-black text-left text-sm text-blue-950">
                    {formatEgyptianCurrency(balanceAmount)}
                  </td>
                  <td className="p-3 text-center font-bold text-emerald-800">
                    {confirmationType === 'CUSTOMER' ? 'مدين (لصالح الشركة)' : 'دائن (التزام)'}
                  </td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    يرجى إيضاح أية شيكات تحت التحصيل أو فوائد أو ضمانات
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {confirmationType === 'BANK' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <strong className="block font-bold text-slate-800">بيانات مطلوبة إضافية للبنك:</strong>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                <li>بيان بكافة خطابات الضمان الصادرة (ابتدائية، نهائية، دفعة مقدمة) وشروطها.</li>
                <li>بيان بالتسهيلات الائتمانية والقروض الممنوحة والضمانات المرهونة وسعر العائد.</li>
                <li>بيان بالكمبيالات وأوراق القبض المودعة برسم التأمين أو التحصيل.</li>
                <li>أسماء المفوضين بالتوقيع ونماذج التوقيع المعتمدة لدى الفرع.</li>
              </ul>
            </div>
          )}

          <p>
            يرجى التكرم بإرسال أصل هذا الخطاب بعد توقيعه وختمه مباشرة إلى عنوان مكتبنا الكائن في: 
            <strong className="font-bold text-slate-900 mx-1">({office.firmName})</strong> 
            أو عبر البريد الإلكتروني الرسمي للمكتب، وعدم تسليمه لمندوب الشركة عملاً بمتطلبات معايير المراجعة.
          </p>

          <p className="font-bold text-slate-800 pt-2">
            وتفضلوا بقبول فائق الاحترام والتقدير،،،
          </p>
        </div>

        {/* Reply Section for the Target Party */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300">
          <div className="text-center font-bold text-xs text-slate-700 mb-3 bg-slate-100 py-1 rounded-lg">
            --- خاص برد الجهة المرسل إليها المصادقة (يرجى استيفاؤه وإعادته مباشرة للمراقب) ---
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span className="font-bold">نؤيد صحة الرصيد والبيانات الموضحة بعاليه دون أية فروق.</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="rounded text-blue-600" />
                <span>الرصيد غير مطابق وتوجد فروق بيانها كالتالي: ..............................................................</span>
              </label>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="mt-8 pt-4 flex items-center justify-between text-xs">
            <div className="text-right">
              <span className="text-slate-500 block">المسؤول المفوض لدى الجهة:</span>
              <span className="font-bold mt-1 block">الاسم: .........................................</span>
              <span className="font-bold mt-1 block">التوقيع والخاتم: ............................</span>
            </div>

            <div className="text-left">
              <span className="text-slate-500 block">مراقب الحسابات المستقل:</span>
              <strong className="text-sm font-black text-slate-900 mt-1 block">
                {office.auditorName}
              </strong>
              <span className="text-[11px] text-slate-600 font-mono block">
                {office.licenseNumber}
              </span>
              {isSignApplied && (
                <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-bold">
                  ✓ معتمد وموثق رقمياً
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
