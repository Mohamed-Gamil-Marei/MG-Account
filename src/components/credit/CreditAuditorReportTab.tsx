import React, { useState } from 'react';
import { FileCheck2, ShieldCheck, CheckCircle2, Award, Printer } from 'lucide-react';
import { formatEgyptianCurrency, generateQrCodeSvg, buildAuditorReportQrText } from '../../utils/qrCodeGenerator';
import { OfficialReportHeader } from '../common/OfficialReportHeader';

interface CreditAuditorReportTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  officeProfile: any;
  clientProfile?: any;
}

export const CreditAuditorReportTab: React.FC<CreditAuditorReportTabProps> = ({
  yearsList,
  computedData,
  officeProfile,
  clientProfile,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(yearsList[yearsList.length - 1] || 2026);
  const [companyName, setCompanyName] = useState<string>(clientProfile?.companyName || 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)');
  const [commercialRegNo, setCommercialRegNo] = useState<string>(clientProfile?.commercialRegNo || '184920 - استثمار القاهرة');
  const [taxCardNo, setTaxCardNo] = useState<string>(clientProfile?.taxRegNo || '492-817-302');
  const [opinionType, setOpinionType] = useState<'CLEAN' | 'QUALIFIED' | 'EMPHASIS'>('CLEAN');

  const activeData = computedData[selectedYear] || {};

  return (
    <div className="space-y-6">
      {/* Configuration Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-700" />
            <h3 className="font-black text-slate-900 text-sm">
              تقرير مراقب الحسابات المعتمد للملف الائتماني (وفقاً لمعايير المراجعة المصرية ESA)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">السنة المالية:</label>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {yearsList.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedYear === y
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم الشركة / المنشأة المفحوصة:</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">السجل التجاري والمركز الرئيسي:</label>
            <input
              type="text"
              value={commercialRegNo}
              onChange={(e) => setCommercialRegNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">نوع الرأي المهني الصادر:</label>
            <select
              value={opinionType}
              onChange={(e) => setOpinionType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="CLEAN">رأي غير متحفظ نظيف (Unqualified Opinion)</option>
              <option value="EMPHASIS">رأي غير متحفظ مع فقرة لفت انتباه (Emphasis of Matter)</option>
              <option value="QUALIFIED">رأي متحفظ مهني (Qualified Opinion)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Official Report Document Canvas */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-md p-8 sm:p-12 space-y-6 text-slate-900 leading-relaxed text-xs sm:text-sm">
        {/* Official Header with Office Logo & Client Info */}
        <OfficialReportHeader
          officeProfile={officeProfile}
          clientProfile={{
            companyName,
            commercialRegNo,
            taxRegNo: taxCardNo,
            legalForm: clientProfile?.legalForm,
            taxOffice: clientProfile?.taxOffice,
          }}
          documentTitle="تقرير مراقب الحسابات المستقل"
          fiscalYear={selectedYear}
          documentSubtitle="طبقاً لمعايير المراجعة المصرية (ESA) وأحكام قانون الشركات المساهمة رقم 159 لسنة 1981"
        />

        {/* Recipient */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900">
          إلى السادة / السادة المساهمين والشركاء وإدارات الائتمان بالبنوك المانحة
          <div className="text-xs font-normal text-slate-600 mt-0.5">
            بشأن القوائم المالية لـ {companyName} عن السنة المالية المنتهية في 31 ديسمبر {selectedYear}
          </div>
        </div>

        {/* Section 1: Opinion */}
        <div className="space-y-2">
          <h4 className="font-black text-slate-950 text-sm border-r-4 border-blue-700 pr-2">
            أولاً: تقرير عن القوائم المالية (رأي مراقب الحسابات)
          </h4>
          <p className="text-right text-slate-800 leading-relaxed">
            لقد راجعنا القوائم المالية المرفقة لـ <strong>{companyName}</strong>، والمتمثلة في قائمة المركز المالي كما في 31 ديسمبر {selectedYear}، وقوائم الدخل الشامل، والتغير في حقوق الملكية، والتدفقات النقدية عن السنة المالية المنتهية في ذلك التاريخ، وملخصاً لأهم السياسات المحاسبية والإيضاحات التفسيرية الأخرى.
          </p>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-950 font-medium text-right leading-relaxed">
            <strong>وفي رأينا:</strong> تعبر القوائم المالية المرفقة بعدالة ووضوح، من كافة النواحي الجوهرية، عن المركز المالي للشركة كما في 31 ديسمبر {selectedYear}، وعن أدائها المالي وتدفقاتها النقدية عن السنة المالية المنتهية في ذلك التاريخ، وذلك وفقاً لمعايير المحاسبة المصرية وفي ضوء القوانين واللوائح المصرية ذات الصلة.
          </div>
        </div>

        {/* Section 2: Basis for Opinion */}
        <div className="space-y-2">
          <h4 className="font-black text-slate-950 text-sm border-r-4 border-blue-700 pr-2">
            ثانياً: أساس الرأي المهني
          </h4>
          <p className="text-right text-slate-800 leading-relaxed">
            تمت مراجعتنا وفقاً لمعايير المراجعة المصرية والقوانين السارية. وتحدد مسؤولياتنا بموجب تلك المعايير في قسم "مسؤوليات مراقب الحسابات عن مراجعة القوائم المالية" الوارد بتقريرنا. ونحن مستقلون عن الشركة وفقاً لقواعد وآداب وسلوكيات المهنة المطبقة بجمهورية مصر العربية، وقد حصلنا على أدلة مراجعة كافية ومناسبة تقدم أساساً صالحاً لإبداء رأينا.
          </p>
        </div>

        {/* Section 3: Summary of Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">إجمالي الإيرادات:</span>
            <strong className="text-blue-900 text-xs">{formatEgyptianCurrency(activeData.sales || 0)}</strong>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">صافي أرباح العام:</span>
            <strong className="text-emerald-900 text-xs">{formatEgyptianCurrency(activeData.netProfit || 0)}</strong>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">إجمالي الأصول:</span>
            <strong className="text-slate-900 text-xs">{formatEgyptianCurrency(activeData.totalAssets || 0)}</strong>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">إجمالي حقوق الملكية:</span>
            <strong className="text-purple-900 text-xs">{formatEgyptianCurrency(activeData.totalEquity || 0)}</strong>
          </div>
        </div>

        {/* Section 4: Legal and Regulatory Requirements */}
        <div className="space-y-2">
          <h4 className="font-black text-slate-950 text-sm border-r-4 border-blue-700 pr-2">
            ثالثاً: تقرير عن المتطلبات القانونية والمهنية الأخرى
          </h4>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-xs pr-2">
            <li>تمسك الشركة حسابات مالية منتظمة ومقيدة بدفاتر تجارية نظامية تتفق وأحكام القانون رقم 159 لسنة 1981 وقانون التجارة رقم 17 لسنة 1999.</li>
            <li>جرد الأصول والمخزون تم بمعرفة إدارة الشركة ووفقاً للأصول المحاسبية المتعارف عليها وتحت إشرافنا.</li>
            <li>البيانات المالية الواردة بتقرير مجلس الإدارة متفقة مع دفاتر الشركة وسجلاتها المحاسبية.</li>
          </ul>
        </div>

        {/* Footer & Signatures */}
        <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-600">مراقب الحسابات المعتمد:</div>
            <div className="text-sm font-black text-slate-950">{officeProfile.auditorName}</div>
            <div className="text-xs text-blue-950 font-bold font-mono">{officeProfile.licenseNumber}</div>
            <div className="text-[11px] text-slate-500 font-mono">سجل المحاسبين والمراجعين / هيئة الرقابة المالية</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-900 flex flex-col items-center justify-center text-[8px] font-bold text-slate-900 text-center p-1">
              <span>خاتم الاعتماد المهني</span>
              <span className="font-black text-[9px] text-blue-900">{officeProfile.auditorName}</span>
              <span>محاسب قانوني ومراجع حسابات</span>
            </div>

            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(
                  buildAuditorReportQrText({
                    auditorName: officeProfile.auditorName,
                    licenseNumber: officeProfile.licenseNumber,
                    companyName,
                    fiscalYear: selectedYear,
                    opinion: opinionType === 'CLEAN' ? 'رأي نظيف' : 'رأي متحفظ',
                    refNumber: `CREDIT-AUD-${selectedYear}-991`,
                  }),
                  85
                ),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
