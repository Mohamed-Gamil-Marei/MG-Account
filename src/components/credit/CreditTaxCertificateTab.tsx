import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, FileBadge, Building2, Printer, Edit3, CheckSquare, Square } from 'lucide-react';
import { formatEgyptianCurrency, generateQrCodeSvg, buildTaxDeclarationQrText } from '../../utils/qrCodeGenerator';
import { OfficialReportHeader } from '../common/OfficialReportHeader';

interface TaxItemStatus {
  id: string;
  title: string;
  isSubject: boolean;
  notes: string;
}

interface CreditTaxCertificateTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  officeProfile: any;
  clientProfile?: any;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
}

export const CreditTaxCertificateTab: React.FC<CreditTaxCertificateTabProps> = ({
  yearsList,
  computedData,
  officeProfile,
  clientProfile,
  periodStartDate,
  periodEndDate,
  periodLabel,
}) => {
  const [taxRegNumber, setTaxRegNumber] = useState<string>(clientProfile?.taxRegNo || '492-817-302');
  const [vatRegNumber, setVatRegNumber] = useState<string>(clientProfile?.taxRegNo || '492-817-302');
  const [socialInsuranceNo, setSocialInsuranceNo] = useState<string>(clientProfile?.socialInsuranceNo || '10948201 / مكتب مصر الجديدة');
  const [taxOffice, setTaxOffice] = useState<string>(clientProfile?.taxOffice || 'مأمورية ضرائب الشركات المساهمة بالقاهرة');
  const [companyName, setCompanyName] = useState<string>(clientProfile?.companyName || 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)');
  const [statusYear, setStatusYear] = useState<number>(yearsList[yearsList.length - 1] || 2026);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  const [taxItems, setTaxItems] = useState<TaxItemStatus[]>([
    {
      id: 'corp',
      title: '1. ضرائب الدخل والأرباح التجارية والصناعية (قانون 91 لسنة 2005)',
      isSubject: true,
      notes: 'تم تقديم الإقرارات الضريبية الإلكترونية السنوية بانتظام حتى السنة المالية، وسداد الضرائب المستحقة في مواعيدها القانونية ودون متأخرات.',
    },
    {
      id: 'vat',
      title: '2. ضريبة القيمة المضافة وضريبة الجدول (قانون 67 لسنة 2016)',
      isSubject: true,
      notes: 'الشركة مسجلة بضريبة القيمة المضافة وتقدم إقراراتها الشهرية بانتظام على المنظومة الإلكترونية لمصلحة الضرائب المصرية وسداد المستحق.',
    },
    {
      id: 'payroll',
      title: '3. ضريبة المرتبات وما في حكمها (كسب العمل)',
      isSubject: true,
      notes: 'يتم استقطاع وسداد ضريبة المرتبات شهرياً، وتقديم الإقرارات الربع سنوية ونماذج التسوية السنوية (نموذج 4 مرتبات) بانتظام.',
    },
    {
      id: 'withholding',
      title: '4. الخصم والتحصيل تحت حساب الضريبة (نموذج 41)',
      isSubject: true,
      notes: 'تقوم الشركة بتطبيق قواعد الخصم والتحصيل وتوريد المبالغ المحصول عليها للمأمورية المختصة في المواعيد المقررة قانوناً.',
    },
    {
      id: 'social',
      title: '5. موقف التأمينات الاجتماعية (قانون 148 لسنة 2019)',
      isSubject: true,
      notes: 'المنشأة منتظمة في سداد اشتراكات التأمينات الاجتماعية الشهرية عن العاملين المؤمن عليهم حتى تاريخه، ولا توجد أي متأخرات أو نزاعات.',
    },
    {
      id: 'eta',
      title: '6. منظومة الفاتورة والإيصال الإلكتروني (ETA)',
      isSubject: true,
      notes: 'الحساب مفعل ومتصل بمنظومة الفاتورة الإلكترونية لمصلحة الضرائب المصرية ويتم اصدار الفواتير إلكترونياً بالتكامل اللحظي.',
    },
  ]);

  const handleUpdateTaxItem = (id: string, field: 'isSubject' | 'notes', val: any) => {
    setTaxItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Settings Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-emerald-700" />
            <h3 className="font-black text-slate-900 text-sm">
              بيانات شهادة الموقف الضريبي والتأميني المرن (Tax & Social Insurance Clearance)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingNotes((prev) => !prev)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingNotes ? 'إنهاء وتثبيت النصوص' : 'تعديل النصوص المرنة للبنود'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم المنشأة / الشركة:</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">رقم التسجيل الضريبي (البطاقة الضريبية):</label>
            <input
              type="text"
              value={taxRegNumber}
              onChange={(e) => setTaxRegNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">الرقم التأميني ومكتب التأمينات:</label>
            <input
              type="text"
              value={socialInsuranceNo}
              onChange={(e) => setSocialInsuranceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">المأمورية الضريبية التابع لها:</label>
            <input
              type="text"
              value={taxOffice}
              onChange={(e) => setTaxOffice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">شهادة الموقف حتى السنة المالية:</label>
            <select
              value={statusYear}
              onChange={(e) => setStatusYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  السنة المالية {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Flexible Note Editor Box */}
        {isEditingNotes && (
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3 mt-4">
            <h4 className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-700" />
              تخصيص بنود الموقف الضريبي والتأميني (اختر الخضوع وعدل النصوص بحرية):
            </h4>
            <div className="space-y-3">
              {taxItems.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTaxItem(item.id, 'isSubject', !item.isSubject)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        item.isSubject ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.isSubject ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span>{item.isSubject ? 'خاضع ومنتظم' : 'غير خاضع / مستثنى'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={item.notes}
                    onChange={(e) => handleUpdateTaxItem(item.id, 'notes', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                    placeholder="اكتب الملاحظات والتفاصيل الضريبية هنا..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Formal Clearance Certificate Document */}
      <div className="bg-white rounded-2xl border-2 border-emerald-900 shadow-md p-8 sm:p-12 space-y-6 text-slate-900 leading-relaxed text-xs sm:text-sm">
        {/* Official Header */}
        <OfficialReportHeader
          officeProfile={officeProfile}
          clientProfile={{
            companyName,
            commercialRegNo: clientProfile?.commercialRegNo || '184920 - استثمار القاهرة',
            taxRegNo: taxRegNumber,
            legalForm: clientProfile?.legalForm,
            taxOffice,
          }}
          documentTitle="شهادة الموقف الضريبي والتأميني"
          fiscalYear={statusYear}
          periodStartDate={periodStartDate}
          periodEndDate={periodEndDate}
          documentReference={`TAX-CERT-${statusYear}`}
          documentSubtitle="شهادة مهنية معتمدة وموثقة صادرة عن مراقب الحسابات المقيد بسجل المحاسبين والمراجعين"
        />

        {/* Certificate Title */}
        <div className="text-center space-y-1 py-2">
          <h3 className="text-base sm:text-lg font-black text-slate-950 underline decoration-emerald-600 underline-offset-8">
            شهادة بالموقف الضريبي والتأميني للمنشأة
          </h3>
          <p className="text-xs text-slate-500">
            صادرة بناءً على طلب الشركة لتقديمها إلى القطاع المصرفي وإدارات الائتمان بالبنوك
          </p>
        </div>

        {/* Certificate Body */}
        <div className="space-y-4">
          <p className="text-right text-slate-800 leading-loose">
            يشهد مكتب المحاسب القانوني ومراقب الحسابات <strong>{officeProfile.auditorName}</strong>، وبصفتنا مراقب حسابات ومستشار الضرائب لـ <strong>{companyName}</strong> (رقم التسجيل الضريبي: <span className="font-mono font-bold text-emerald-900">{taxRegNumber}</span>، والتابع لمأمورية: <strong>{taxOffice}</strong>، والرقم التأميني: <span className="font-mono font-bold text-emerald-900">{socialInsuranceNo}</span>)، بأنه بعد فحص ومراجعة الدفاتر والسجلات والمستندات والإقرارات الضريبية وسدادات التأمينات الاجتماعية {periodStartDate && periodEndDate ? `عن الفترة المالية من ${periodStartDate} إلى ${periodEndDate}` : `للسنة المالية المنتهية في ${statusYear}/12/31`}، تبين الآتي:
          </p>

          {/* Tax Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {taxItems.map((item, idx) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border space-y-1 ${
                  item.isSubject
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-emerald-950">
                  <CheckCircle2 className={`w-4 h-4 ${item.isSubject ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${item.isSubject ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>
                    {item.isSubject ? 'خاضع ومنتظم' : 'مستثنى'}
                  </span>
                </div>
                <p className="text-slate-700 pr-5 text-[11px] leading-relaxed">
                  {item.notes}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs font-medium">
            <strong>إقرار نهائي:</strong> لا توجد أي قضايا تهرب ضريبي أو نزاعات قضائية أو حجوزات إدارية موقعة على الشركة من أي مأمورية ضريبية أو تأمينية حتى تاريخ إصدار هذه الشهادة.
          </div>
        </div>

        {/* Footer & Stamps */}
        <div className="pt-6 border-t-2 border-emerald-900 flex items-center justify-between">
          <div className="space-y-1 text-right">
            <div className="text-xs font-bold text-slate-600">المحاسب القانوني المعتمد:</div>
            <div className="text-sm font-black text-slate-950">{officeProfile.auditorName}</div>
            <div className="text-xs text-emerald-900 font-bold font-mono">{officeProfile.licenseNumber}</div>
            <div className="text-[11px] text-slate-500 font-mono">عضو جمعية الضرائب المصرية</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-900 flex flex-col items-center justify-center text-[8px] font-bold text-emerald-950 text-center p-1">
              <span>خاتم الاعتماد الضريبي</span>
              <span className="font-black text-[9px]">{officeProfile.auditorName}</span>
              <span>خبير ضرائب ومحاسب قانوني</span>
            </div>

            <div
              data-qr-container="true"
              className="qr-print-container bg-white p-1 rounded-lg border border-slate-200"
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(
                  buildTaxDeclarationQrText({
                    taxpayerName: companyName,
                    taxCardNumber: taxRegNumber,
                    fiscalYear: statusYear,
                    declarationType: 'شهادة الموقف الضريبي والتأميني المعتمدة',
                    netTaxDue: 0,
                    auditorName: officeProfile.auditorName,
                  }),
                  100
                ),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
