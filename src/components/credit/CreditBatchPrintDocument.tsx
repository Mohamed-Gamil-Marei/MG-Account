import React from 'react';
import {
  formatEgyptianCurrency,
  generateQrCodeSvg,
  buildVerificationUrl,
  VerificationPayloadData,
} from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';
import { OfficialReportHeader } from '../common/OfficialReportHeader';

export type CreditPrintScope =
  | 'SELECTED_YEAR'
  | 'ALL_YEARS_BATCH'
  | 'CUSTOM_RANGE_BATCH'
  | 'AUDITOR_ONLY'
  | 'TAX_CERT_ONLY'
  | 'PROFIT_DIST_ONLY'
  | 'FIXED_ASSETS_ONLY'
  | 'GA_EXPENSES_ONLY'
  | 'NOTES_ONLY'
  | 'COMPLETE_DOSSIER';

export interface ClientProfileData {
  companyName: string;
  legalForm: string;
  commercialRegNo: string;
  taxRegNo: string;
  taxFileNo?: string;
  taxOffice: string;
  socialInsuranceNo: string;
  address: string;
  activity: string;
  capital?: number;
  representedBy?: string;
}

interface CreditBatchPrintDocumentProps {
  printScope: CreditPrintScope;
  selectedYear: number;
  yearsList: number[];
  customYearsList?: number[];
  yearsData: Record<number, FiscalYearData>;
  computedData: Record<number, any>;
  officeProfile: any;
  assetCategories?: any[];
  adminExpenseItems?: any[];
  notesList?: any[];
  clientProfile?: ClientProfileData;
  taxCertificateItems?: any[];
}

export const CreditBatchPrintDocument: React.FC<CreditBatchPrintDocumentProps> = ({
  printScope,
  selectedYear,
  yearsList,
  customYearsList,
  yearsData,
  computedData,
  officeProfile,
  assetCategories = [],
  adminExpenseItems = [],
  notesList = [],
  clientProfile = {
    companyName: 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)',
    legalForm: 'شركة مساهمة مصرية (ش.م.م)',
    commercialRegNo: '109482',
    taxRegNo: '492-817-302',
    taxFileNo: '204/918',
    taxOffice: 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
    socialInsuranceNo: '10948201 / مكتب مصر الجديدة',
    address: 'المنطقة الصناعية - مدينة السادس من أكتوبر - الجيزة',
    activity: 'تصنيع وتوريد المعدات الهندسية والمستلزمات الصناعية والمقاولات المتخصصة',
    capital: 25000000,
    representedBy: 'رئيس مجلس الإدارة والعضو المنتدب',
  },
  taxCertificateItems,
}) => {
  const yearsToPrint =
    printScope === 'CUSTOM_RANGE_BATCH' && customYearsList && customYearsList.length > 0
      ? customYearsList
      : printScope === 'ALL_YEARS_BATCH'
      ? yearsList
      : [selectedYear];

  const defaultTaxItems = [
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
  ];

  const activeTaxItems = taxCertificateItems || defaultTaxItems;

  const renderOfficialHeader = (title: string, year?: number) => (
    <OfficialReportHeader
      officeProfile={officeProfile}
      clientProfile={clientProfile}
      documentTitle={title}
      fiscalYear={year}
      documentSubtitle="ملف القوائم المالية المعتمدة والتوثيق الائتماني والبنكي الرسمي"
    />
  );

  const renderOfficialFooter = (documentType: string, year: number) => {
    const docNumber = `EGY-CRD-${year}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const payload: VerificationPayloadData = {
      docNumber,
      docType: documentType,
      auditorName: officeProfile.auditorName,
      licenseNumber: officeProfile.licenseNumber,
      clientName: clientProfile.companyName,
      taxCardNo: clientProfile.taxRegNo,
      fiscalYear: year,
      amount: computedData[year]?.sales || 0,
      date: new Date().toISOString().slice(0, 10),
      notes: `معتمد وموثق - صافي أصول: ${formatEgyptianCurrency(computedData[year]?.totalAssets || 0)}`,
    };

    const qrSvg = generateQrCodeSvg(buildVerificationUrl(payload), 88);

    return (
      <div className="official-footer border-t-2 border-slate-900 pt-3 mt-4 flex items-center justify-between text-[10px]">
        <div className="space-y-1 text-right">
          <div className="font-bold text-slate-900">
            اعتماد وخاتم مراقب الحسابات القانوني:
          </div>
          <div className="text-slate-700 font-bold">{officeProfile.auditorName}</div>
          <div className="text-slate-500 font-mono text-[9px]">
            كود التوثيق الإلكتروني: {docNumber}
          </div>
        </div>

        <div
          className="bg-white p-1 rounded border border-slate-300 shadow-xs"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
          title="مسح رمز التحقق الرقمي المعتمد"
        />

        <div className="space-y-1 text-left">
          <div className="font-bold text-slate-900">مراقب الحسابات والمراجع القانوني</div>
          <div className="font-mono text-slate-700">{officeProfile.phone || '01003335360'}</div>
          <div className="text-emerald-700 font-bold text-[9px]">مطابق لمعايير المحاسبة المصرية (EAS)</div>
        </div>
      </div>
    );
  };

  return (
    <div id="credit-printable-dossier" className="space-y-12 print:space-y-0 bg-slate-200 p-4 print:p-0 print:bg-white text-slate-900 w-full">
      {/* 0. COMPLETE DOSSIER COVER PAGE (Only in complete dossier mode) */}
      {printScope === 'COMPLETE_DOSSIER' && (
        <div
          className="page-break border-4 border-double border-slate-900 rounded-2xl print:rounded-none p-12 print:p-8 space-y-8 bg-white min-h-[980px] print:min-h-0 flex flex-col justify-between text-center"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          <div className="border-b-2 border-slate-900 pb-6 space-y-2">
            <h1 className="text-xl font-black text-slate-950">
              {officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}
            </h1>
            <p className="text-sm font-bold text-slate-800">{officeProfile.auditorName}</p>
            <p className="text-xs text-slate-600 font-mono">عضو جمعية المحاسبين والمراجعين المصرية - سجل محاسبين رقم: {officeProfile.licenseNumber}</p>
          </div>

          <div className="my-auto space-y-6 py-8">
            <div className="inline-block px-6 py-2 bg-blue-900 text-white font-black text-sm rounded-full">
              الملف الائتماني والمحاسبي والضريبي الشامل
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-950">{clientProfile.companyName}</h2>
              <p className="text-sm font-bold text-slate-700">{clientProfile.legalForm}</p>
              <div className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed font-mono">
                سجل تجاري: {clientProfile.commercialRegNo} | بطاقة ضريبية: {clientProfile.taxRegNo} | ملف: {clientProfile.taxFileNo || '204/918'}
              </div>
              <div className="text-xs text-slate-600">{clientProfile.taxOffice}</div>
            </div>

            <div className="pt-6 border-t border-slate-300 max-w-md mx-auto">
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-right text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">السنة المالية المعنية:</span>
                  <span className="text-blue-900 font-black">{selectedYear} م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">رأس المال المصدر والمدفوع:</span>
                  <span className="font-mono font-bold">{formatEgyptianCurrency(clientProfile.capital || 25000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">النشاط الرئيسي:</span>
                  <span className="font-bold">{clientProfile.activity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">الرقم التأميني:</span>
                  <span className="font-mono font-bold">{clientProfile.socialInsuranceNo}</span>
                </div>
              </div>
            </div>
          </div>

          {renderOfficialFooter('غلاف الملف الائتماني والمالي المتكامل', selectedYear)}
        </div>
      )}

      {/* 1. FINANCIAL STATEMENTS PAGES */}
      {(printScope === 'SELECTED_YEAR' ||
        printScope === 'ALL_YEARS_BATCH' ||
        printScope === 'CUSTOM_RANGE_BATCH' ||
        printScope === 'COMPLETE_DOSSIER') &&
        yearsToPrint.map((yr) => {
          const d = computedData[yr] || {};

          return (
            <div
              key={yr}
              className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              {renderOfficialHeader('القوائم المالية المدققة المعتمدة', yr)}

              <div className="space-y-4 flex-1">
                {/* Balance Sheet Summary */}
                <div>
                  <h4 className="font-black text-xs text-blue-900 mb-1 border-r-2 border-blue-800 pr-1.5">
                    1. قائمة المركز المالي كما في 31 ديسمبر {yr}
                  </h4>
                  <table className="w-full text-[11px] border border-slate-300 divide-y divide-slate-300">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-1.5 font-bold">الأصول غير المتداولة (الأصول الثابتة بالصافي)</td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.totalNonCurrentAssets || 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">الأصول المتداولة (المخزون والعملاء والنقدية)</td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.totalCurrentAssets || 0)}</td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="p-1.5">إجمالي الأصول</td>
                        <td className="p-1.5 text-left font-mono text-emerald-900">{formatEgyptianCurrency(d.totalAssets || 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">
                          {(d.totalEquity || 0) >= 0
                            ? 'إجمالي حقوق الملكية (رأس المال والاحتياطيات والأرباح)'
                            : 'إجمالي حقوق الملكية (عجز / خسائر مرحلة)'}
                        </td>
                        <td className="p-1.5 text-left font-mono">
                          {formatEgyptianCurrency(d.totalEquity || 0, true)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">الالتزامات (الموردون والتسهيلات البنكية والقروض)</td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.totalLiabilities || 0, true)}</td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="p-1.5">إجمالي حقوق الملكية والالتزامات</td>
                        <td className="p-1.5 text-left font-mono text-emerald-900">{formatEgyptianCurrency(d.totalEquityAndLiabilities || 0, true)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Income Statement Summary */}
                <div>
                  <h4 className="font-black text-xs text-blue-900 mb-1 border-r-2 border-blue-800 pr-1.5">
                    2. قائمة الدخل عن السنة المالية المنتهية في 31 ديسمبر {yr}
                  </h4>
                  <table className="w-full text-[11px] border border-slate-300 divide-y divide-slate-300">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-1.5 font-bold">صافي المبيعات والإيرادات</td>
                        <td className="p-1.5 text-left font-mono font-bold text-blue-900">{formatEgyptianCurrency(d.sales || 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-red-700">يخصم: تكلفة المبيعات المباشرة</td>
                        <td className="p-1.5 text-left font-mono text-red-700">({formatEgyptianCurrency(d.cogs || 0)})</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td className="p-1.5">مجمل الربح</td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.grossProfit || 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">المصروفات الإدارية والعمومية والبيعية</td>
                        <td className="p-1.5 text-left font-mono">({formatEgyptianCurrency((d.adminExp || 0) + (d.sellingExp || 0))})</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">أعباء التمويل والفوائد البنكية</td>
                        <td className="p-1.5 text-left font-mono text-purple-900">({formatEgyptianCurrency(d.financeExp || 0)})</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">ضريبة الدخل المستحقة (22.5%)</td>
                        <td className="p-1.5 text-left font-mono text-red-700">({formatEgyptianCurrency(d.tax || 0)})</td>
                      </tr>
                      <tr className={(d.netProfit || 0) >= 0 ? "bg-emerald-50 font-black text-emerald-950" : "bg-rose-50 font-black text-rose-950"}>
                        <td className="p-1.5">
                          {(d.netProfit || 0) >= 0
                            ? 'صافي ربح العام بعد الضريبة'
                            : 'صافي خسارة العام بعد الضريبة (عجز)'}
                        </td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.netProfit || 0, true)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Key Financial KPIs */}
                <div className="grid grid-cols-4 gap-2 text-[10px] text-center font-mono bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-sans block">نسبة التداول:</span>
                    <strong className="text-blue-900">{d.currentRatio?.toFixed(2)}x</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">هامش الربح:</span>
                    <strong className="text-emerald-900">{d.netMargin?.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">تغطية الفوائد:</span>
                    <strong className="text-indigo-900">{d.icr?.toFixed(2)}x</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">العائد على الملكية ROE:</span>
                    <strong className="text-purple-900">{d.roe?.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              {renderOfficialFooter('قوائم مالية معتمدة', yr)}
            </div>
          );
        })}

      {/* 2. AUDITOR REPORT PRINT VIEW */}
      {(printScope === 'AUDITOR_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('تقرير مراقب الحسابات المعتمد')}
          <div className="space-y-4 leading-relaxed">
            <h3 className="font-black text-center text-sm">تقرير مراقب حسابات مستقل</h3>
            <p className="font-bold">إلى السادة / مساهمي الشركة وإدارات الائتمان بالبنوك</p>
            <p className="text-right text-slate-800 text-[11px] leading-relaxed">
              لقد راجعنا القوائم المالية المقارنة لـ <strong>{clientProfile.companyName || 'الشركة'} ({clientProfile.legalForm || 'شركة مساهمة مصرية'})</strong> عن السنوات المالية الممتدة، والمعدة وفقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين واللوائح المصرية ذات الصلة.
            </p>
            <div className="p-3.5 bg-emerald-50 rounded border border-emerald-300 text-emerald-950 font-bold text-[11px] text-right leading-relaxed">
              <strong>الرأي المهني:</strong> في رأينا، تعبر القوائم المالية بعدالة ووضوح من كافة النواحي الجوهرية عن المركز المالي للشركة ونتائج أعمالها وتدفقاتها النقدية وفقاً لمعايير المحاسبة والقوانين المصرية السارية.
            </div>
          </div>
          {renderOfficialFooter('تقرير مراقب حسابات مستقل', selectedYear)}
        </div>
      )}

      {/* 3. PROFIT DISTRIBUTION MEMO PRINT VIEW */}
      {(printScope === 'PROFIT_DIST_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('مشروع ومذكرة توزيع الأرباح القانوني', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">مشروع توزيع الأرباح المقترح لسنة {selectedYear}</h3>
            {(computedData[selectedYear]?.netProfit || 0) > 0 ? (
              <table className="w-full text-[11px] border border-slate-300 divide-y divide-slate-300">
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-purple-50 font-black">
                    <td className="p-2">صافي ربح العام بعد الضريبة</td>
                    <td className="p-2 text-left font-mono">{formatEgyptianCurrency(computedData[selectedYear]?.netProfit || 0, true)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">يخصم: الاحتياطي القانوني (5%)</td>
                    <td className="p-2 text-left font-mono">({formatEgyptianCurrency(Math.round((computedData[selectedYear]?.netProfit || 0) * 0.05))})</td>
                  </tr>
                  <tr>
                    <td className="p-2">يخصم: حصة العاملين في الأرباح (10%)</td>
                    <td className="p-2 text-left font-mono">({formatEgyptianCurrency(Math.round((computedData[selectedYear]?.netProfit || 0) * 0.095))})</td>
                  </tr>
                  <tr>
                    <td className="p-2">يخصم: توزيعات المساهمين والشركاء (60%)</td>
                    <td className="p-2 text-left font-mono">({formatEgyptianCurrency(Math.round((computedData[selectedYear]?.netProfit || 0) * 0.57))})</td>
                  </tr>
                  <tr className="bg-emerald-50 font-black text-emerald-950">
                    <td className="p-2">الأرباح المرحلة للعام المالي القادم</td>
                    <td className="p-2 text-left font-mono">{formatEgyptianCurrency(Math.round((computedData[selectedYear]?.netProfit || 0) * 0.285), true)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[11px] border border-slate-300 divide-y divide-slate-300">
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-rose-50 font-black text-rose-950">
                    <td className="p-2">صافي خسارة العام بعد الضريبة (عجز)</td>
                    <td className="p-2 text-left font-mono">{formatEgyptianCurrency(computedData[selectedYear]?.netProfit || 0, true)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-500">الاحتياطي القانوني وتوزيعات الأرباح وحصة العاملين</td>
                    <td className="p-2 text-left font-mono text-slate-500">لا يجوز التوزيع قانوناً في حالة الخسارة</td>
                  </tr>
                  <tr className="bg-rose-100/70 font-black text-rose-950">
                    <td className="p-2">الخسائر المرحلة للعام المالي القادم</td>
                    <td className="p-2 text-left font-mono">{formatEgyptianCurrency(computedData[selectedYear]?.netProfit || 0, true)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          {renderOfficialFooter('مشروع توزيع الأرباح', selectedYear)}
        </div>
      )}

      {/* 5. FIXED ASSETS DEPRECIATION PRINT VIEW */}
      {(printScope === 'FIXED_ASSETS_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('جدول حركة وإهلاك الأصول الثابتة (معيار 10)', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">جدول إهلاك الأصول الثابتة المعتمد لسنة {selectedYear}</h3>
            <table className="w-full text-[10px] border border-slate-300 divide-y divide-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-1.5 text-right">بيان الأصل</th>
                  <th className="p-1.5 text-center">النسبة</th>
                  <th className="p-1.5 text-left font-mono">تكلفة أول العام</th>
                  <th className="p-1.5 text-left font-mono">إضافات</th>
                  <th className="p-1.5 text-left font-mono">إجمالي التكلفة</th>
                  <th className="p-1.5 text-left font-mono">مجمع الإهلاك</th>
                  <th className="p-1.5 text-left font-mono">صافي القيمة الدفترية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assetCategories.length > 0 ? (
                  assetCategories.map((cat) => {
                    const yrData = cat.valuesByYear?.[selectedYear] || {
                      costStart: 100000,
                      additions: 0,
                      disposals: 0,
                      accumStart: 20000,
                    };
                    const costEnd = (yrData.costStart || 0) + (yrData.additions || 0) - (yrData.disposals || 0);
                    const depExpense = Math.round(costEnd * (cat.depRate / 100));
                    const accumEnd = (yrData.accumStart || 0) + depExpense;
                    const netBookValue = Math.max(0, costEnd - accumEnd);

                    return (
                      <tr key={cat.id}>
                        <td className="p-1.5 font-bold">{cat.name}</td>
                        <td className="p-1.5 text-center">{cat.depRate}%</td>
                        <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(yrData.costStart || 0)}</td>
                        <td className="p-1.5 text-left font-mono text-emerald-800">+{formatEgyptianCurrency(yrData.additions || 0)}</td>
                        <td className="p-1.5 text-left font-mono font-bold">{formatEgyptianCurrency(costEnd)}</td>
                        <td className="p-1.5 text-left font-mono text-red-700">({formatEgyptianCurrency(accumEnd)})</td>
                        <td className="p-1.5 text-left font-mono font-black text-emerald-950">{formatEgyptianCurrency(netBookValue)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-slate-500">
                      لا توجد بيانات أصول مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderOfficialFooter('جدول إهلاك الأصول الثابتة', selectedYear)}
        </div>
      )}

      {/* 6. G&A EXPENSES SCHEDULE PRINT VIEW */}
      {(printScope === 'GA_EXPENSES_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('جدول تفصيلي بالمصروفات العمومية والإدارية', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">كشف المصروفات العمومية والإدارية المعتمد لسنة {selectedYear}</h3>
            <table className="w-full text-[10px] border border-slate-300 divide-y divide-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-1.5 text-right">بيان المصروف الإداري والعمومي</th>
                  <th className="p-1.5 text-center">التصنيف</th>
                  <th className="p-1.5 text-left font-mono">القيمة السنوية (ج.م)</th>
                  <th className="p-1.5 text-center">النسبة من الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adminExpenseItems.map((item) => {
                  const amount = item.valuesByYear?.[selectedYear] ?? item.amountByYear?.[selectedYear] ?? 0;
                  return (
                    <tr key={item.id}>
                      <td className="p-1.5 font-bold">{item.name}</td>
                      <td className="p-1.5 text-center">{item.category}</td>
                      <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(amount)}</td>
                      <td className="p-1.5 text-center font-mono">
                        {(
                          (amount /
                            Math.max(1, computedData[selectedYear]?.adminExp || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-900 text-white font-black">
                  <td className="p-1.5">إجمالي المصروفات العمومية والإدارية</td>
                  <td className="p-1.5 text-center">-</td>
                  <td className="p-1.5 text-left font-mono text-emerald-400">
                    {formatEgyptianCurrency(computedData[selectedYear]?.adminExp || 0)}
                  </td>
                  <td className="p-1.5 text-center font-mono">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          {renderOfficialFooter('كشف المصروفات العمومية والإدارية', selectedYear)}
        </div>
      )}

      {/* 7. SUPPLEMENTARY NOTES PRINT VIEW */}
      {(printScope === 'NOTES_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('الإيضاحات المتممة للقوائم المالية (EAS)', selectedYear)}
          <div className="space-y-3">
            <h3 className="font-black text-center text-sm">الإيضاحات المتممة للقوائم المالية لسنة {selectedYear}</h3>
            <div className="space-y-3 text-[10px] text-right leading-relaxed">
              {notesList.map((note, idx) => (
                <div key={note.id} className="border-b border-slate-200 pb-2">
                  <strong className="text-blue-900 block font-bold mb-0.5">
                    إيضاح ({note.noteNumber || idx + 1}): {note.title}
                  </strong>
                  <div
                    className="text-slate-700 leading-normal"
                    dangerouslySetInnerHTML={{ __html: note.content || '' }}
                  />
                </div>
              ))}
            </div>
          </div>
          {renderOfficialFooter('الإيضاحات المتممة للقوائم المالية', selectedYear)}
        </div>
      )}

      {/* 8. TAX & SOCIAL INSURANCE INTEGRATED CERTIFICATE VIEW */}
      {(printScope === 'TAX_CERT_ONLY' || printScope === 'COMPLETE_DOSSIER') && (
        <div
          className="page-break border-2 border-slate-900 rounded-xl print:rounded-none p-8 print:p-6 space-y-4 bg-white min-h-[950px] print:min-h-0 flex flex-col justify-between"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {renderOfficialHeader('شهادة الموقف الضريبي والتأميني المعتمدة', selectedYear)}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-black text-sm text-slate-950">
                شهادة محاسب قانوني ومراقب حسابات بشأن الموقف الضريبي والتأميني
              </h3>
              <p className="text-[11px] text-slate-600 font-bold">
                عن السنة المالية المنتهية في 31 ديسمبر {selectedYear} م
              </p>
            </div>

            {/* Client Tax Identification Box */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-[10px]">
              <div>
                <span className="text-slate-500 block">اسم الممول / الشركة:</span>
                <span className="font-bold text-slate-950 text-xs">{clientProfile.companyName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الشكل القانوني:</span>
                <span className="font-bold text-slate-800">{clientProfile.legalForm}</span>
              </div>
              <div>
                <span className="text-slate-500 block">رقم التسجيل الضريبي:</span>
                <span className="font-mono font-bold text-blue-900">{clientProfile.taxRegNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block">المأمورية المختصة:</span>
                <span className="font-bold text-slate-800">{clientProfile.taxOffice}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الرقم التأميني للمنشأة:</span>
                <span className="font-mono font-bold text-slate-900">{clientProfile.socialInsuranceNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block">رقم السجل التجاري:</span>
                <span className="font-mono font-bold text-slate-900">{clientProfile.commercialRegNo}</span>
              </div>
            </div>

            {/* Tax items checklist table */}
            <table className="w-full text-[10px] border border-slate-300 divide-y divide-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-2 text-right w-1/3">النوع / الوعاء الضريبي والتأميني</th>
                  <th className="p-2 text-center w-24">حالة الخضوع</th>
                  <th className="p-2 text-right">بيان الموقف القانوني والتسوية وسداد المستحقات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeTaxItems.map((tax) => (
                  <tr key={tax.id}>
                    <td className="p-2 font-bold text-slate-900">{tax.title}</td>
                    <td className="p-2 text-center font-bold">
                      {tax.isSubject ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300 text-[9px]">
                          خاضع ومنتظم
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-300 text-[9px]">
                          غير خاضع / معفى
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-slate-700 leading-relaxed">{tax.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-[10px] text-blue-950 leading-relaxed font-medium text-right">
              <strong>إقرار واعتماد مراقب الحسابات:</strong> نشهد نحن المحاسب القانوني ومراقب الحسابات المقيد بسجل المحاسبين والمراجعين، بعد مراجعة الدفاتر والسجلات والمستندات المؤيدة والإقرارات الإلكترونية المقدمة لمصلحة الضرائب المصرية والهيئة القومية للتأمين الاجتماعي حتى نهاية السنة المالية {selectedYear}، بصحة وانتظام البيانات الموضحة بعاليه ودون وجود أي مستحقات ضريبية أو تأمينية واجبة السداد متأخرة أو نزاعات قضائية تؤثر على سلامة المركز المالي والائتماني للمنشأة.
            </div>
          </div>
          {renderOfficialFooter('شهادة الموقف الضريبي والتأميني', selectedYear)}
        </div>
      )}
    </div>
  );
};
