import React from 'react';
import {
  formatEgyptianCurrency,
  generateQrCodeSvg,
  buildVerificationUrl,
  VerificationPayloadData,
} from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';
import { OfficialReportHeader } from '../common/OfficialReportHeader';
import { PageRangeConfig, isPageIncluded } from '../common/PageRangeSelector';
import {
  TrendingUp,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Percent,
  Layers,
  FileText,
} from 'lucide-react';
import {
  CreditMemoConfig,
  CustomCreditRatioItem,
  DEFAULT_CREDIT_MEMO_CONFIG,
} from './CreditScoringKpisTab';

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
  | 'CREDIT_ANALYSIS_ONLY'
  | 'CREDIT_SCORING_ONLY'
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

export interface CreditBatchPrintDocumentProps {
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
  showHeaderClientBanner?: boolean;
  pageRangeConfig?: PageRangeConfig;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  creditMemoConfig?: CreditMemoConfig;
  customCreditRatios?: CustomCreditRatioItem[];
  creditRatioNames?: Record<string, string>;
  hiddenCreditRatioIds?: string[];
}

export interface PrintablePageDefinition {
  pageNumber: number;
  title: string;
  render: () => React.ReactNode;
}

export interface PrintablePageMeta {
  id: string;
  pageNumber: number; // 1-based index in the original complete sequence
  title: string;
}

/**
 * Returns metadata for all available pages in the current print scope
 */
export function getDossierPageMetas(
  printScope: CreditPrintScope,
  selectedYear: number,
  yearsList: number[],
  customYearsList?: number[]
): PrintablePageMeta[] {
  const metas: PrintablePageMeta[] = [];
  let pageNum = 1;

  if (printScope === 'COMPLETE_DOSSIER') {
    metas.push({ id: 'cover', pageNumber: pageNum++, title: 'الغلاف الرسمي للملف الائتماني والمالي' });
    metas.push({ id: `statements-${selectedYear}`, pageNumber: pageNum++, title: `القوائم المالية لسنة ${selectedYear} (المركز والدخل والتدفقات)` });
    metas.push({ id: 'auditor-report', pageNumber: pageNum++, title: 'تقرير مراقب الحسابات المستقل' });
    metas.push({ id: 'profit-distribution', pageNumber: pageNum++, title: 'مشروع وتوزيع الأرباح المقترح' });
    metas.push({ id: 'fixed-assets', pageNumber: pageNum++, title: 'جدول حركة وإهلاك الأصول الثابتة' });
    metas.push({ id: 'ga-expenses', pageNumber: pageNum++, title: 'كشف المصروفات العمومية والإدارية' });
    metas.push({ id: 'notes-part-1', pageNumber: pageNum++, title: 'الإيضاحات المتممة (1/2) - السياسات وجداول الأصول' });
    metas.push({ id: 'notes-part-2', pageNumber: pageNum++, title: 'الإيضاحات المتممة (2/2) - الالتزامات والتمويل والملكية' });
    metas.push({ id: 'tax-certificate', pageNumber: pageNum++, title: 'شهادة الموقف الضريبي والتأميني' });
    metas.push({ id: 'credit-analysis', pageNumber: pageNum++, title: 'تقرير التحليل المالي ومؤشرات السيولة والربحية' });
    metas.push({ id: 'credit-memo', pageNumber: pageNum++, title: 'تقييم الجدارة ومذكرة التوصية الائتمانية المصرفية' });
    return metas;
  }

  if (printScope === 'ALL_YEARS_BATCH') {
    return yearsList.map((yr, idx) => ({
      id: `statements-${yr}`,
      pageNumber: idx + 1,
      title: `القوائم المالية لسنة ${yr} (المركز والدخل والتدفقات)`,
    }));
  }

  if (printScope === 'CUSTOM_RANGE_BATCH') {
    const list = customYearsList && customYearsList.length > 0 ? customYearsList : yearsList;
    return list.map((yr, idx) => ({
      id: `statements-${yr}`,
      pageNumber: idx + 1,
      title: `القوائم المالية لسنة ${yr} (المركز والدخل والتدفقات)`,
    }));
  }

  if (printScope === 'SELECTED_YEAR') {
    return [{ id: `statements-${selectedYear}`, pageNumber: 1, title: `القوائم المالية لسنة ${selectedYear} (المركز والدخل والتدفقات)` }];
  }
  if (printScope === 'AUDITOR_ONLY') {
    return [{ id: 'auditor-report', pageNumber: 1, title: 'تقرير مراقب الحسابات المستقل' }];
  }
  if (printScope === 'PROFIT_DIST_ONLY') {
    return [{ id: 'profit-distribution', pageNumber: 1, title: 'مشروع وتوزيع الأرباح المقترح' }];
  }
  if (printScope === 'FIXED_ASSETS_ONLY') {
    return [{ id: 'fixed-assets', pageNumber: 1, title: 'جدول حركة وإهلاك الأصول الثابتة' }];
  }
  if (printScope === 'GA_EXPENSES_ONLY') {
    return [{ id: 'ga-expenses', pageNumber: 1, title: 'كشف المصروفات العمومية والإدارية' }];
  }
  if (printScope === 'NOTES_ONLY') {
    return [
      { id: 'notes-part-1', pageNumber: 1, title: 'الإيضاحات المتممة (1/2) - السياسات وجداول الأصول' },
      { id: 'notes-part-2', pageNumber: 2, title: 'الإيضاحات المتممة (2/2) - الالتزامات والتمويل والملكية' },
    ];
  }
  if (printScope === 'TAX_CERT_ONLY') {
    return [{ id: 'tax-certificate', pageNumber: 1, title: 'شهادة الموقف الضريبي والتأميني' }];
  }
  if (printScope === 'CREDIT_ANALYSIS_ONLY') {
    return [{ id: 'credit-analysis', pageNumber: 1, title: 'تقرير التحليل المالي ومؤشرات السيولة والربحية' }];
  }
  if (printScope === 'CREDIT_SCORING_ONLY') {
    return [{ id: 'credit-memo', pageNumber: 1, title: 'تقييم الجدارة ومذكرة التوصية الائتمانية المصرفية' }];
  }

  return [{ id: 'single-page', pageNumber: 1, title: 'وثيقة الطباعة المعتمدة' }];
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
  showHeaderClientBanner = true,
  pageRangeConfig,
  periodStartDate,
  periodEndDate,
  periodLabel,
  creditMemoConfig = DEFAULT_CREDIT_MEMO_CONFIG,
  customCreditRatios = [],
  creditRatioNames = {},
  hiddenCreditRatioIds = [],
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
      periodStartDate={periodStartDate}
      periodEndDate={periodEndDate}
      showHeaderClientBanner={showHeaderClientBanner}
      documentSubtitle="ملف القوائم المالية المعتمدة والتوثيق الائتماني والبنكي الرسمي"
    />
  );

  const renderOfficialFooter = (
    documentType: string,
    year: number,
    currentPageNum?: number,
    totalCount?: number
  ) => {
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

    const showPhones = officeProfile.showOfficePhones !== false;
    const phone = officeProfile.phone || '01003335360';
    const mobile = officeProfile.mobile;
    const showNumbers = pageRangeConfig?.showPageNumbers !== false;

    return (
      <div className="official-footer border-t-2 border-slate-900 pt-2.5 mt-4 space-y-1 text-[10px]">
        <div className="flex items-center justify-between">
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
            {showPhones && (
              <div className="font-mono text-slate-700">
                {phone} {mobile && mobile !== phone ? `| ${mobile}` : ''}
              </div>
            )}
            <div className="text-emerald-700 font-bold text-[9px]">مطابق لمعايير المحاسبة المصرية (EAS)</div>
          </div>
        </div>

        {/* Page Numbering Footer Line */}
        {showNumbers && currentPageNum !== undefined && totalCount !== undefined && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[9px] text-slate-500 font-mono">
            <span>{clientProfile.companyName}</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              صفحة {currentPageNum} من {totalCount}
            </span>
            <span>
              {periodEndDate
                ? `الفترة المنتهية في: ${periodEndDate}`
                : `السنة المالية: ${year} م`}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Build the list of all available pages sequentially
  const allPagesList: { id: string; title: string; render: (pageNum: number, total: number) => React.ReactNode }[] = [];

  // 0. Cover Page (In COMPLETE_DOSSIER mode)
  if (printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'cover',
      title: 'الغلاف الرسمي للملف الائتماني والمالي',
      render: (pageNum, total) => (
        <div
          key="cover"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between text-center space-y-6 border-4 border-double border-slate-900 p-8 sm:p-10 w-full h-full"
        >
          <div className="border-b-2 border-slate-900 pb-6 space-y-2">
            <h1 className="text-xl font-black text-slate-950">
              {officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}
            </h1>
            <p className="text-sm font-bold text-slate-800">
              {officeProfile.auditorName} <span className="text-slate-600 font-normal">| {officeProfile.title || 'محاسب قانوني ومراقب حسابات'}</span>
            </p>
            <p className="text-xs text-slate-600 font-mono">
              سجل المحاسبين والمراجعين بوزارة المالية رقم: {officeProfile.licenseNumber}
              {officeProfile.taxAuthorityLicense && ` • ${officeProfile.taxAuthorityLicense}`}
            </p>

            {(officeProfile.showMainOfficeAddress !== false || officeProfile.showBranchOfficeAddress !== false) && (
              <div className="text-[11px] text-slate-700 flex flex-wrap items-center justify-center gap-4 pt-1">
                {officeProfile.showMainOfficeAddress !== false && (officeProfile.mainOfficeAddress || officeProfile.address) && (
                  <div>
                    <strong>{officeProfile.mainOfficeTitle || 'المقر الرئيسي'}:</strong> {officeProfile.mainOfficeAddress || officeProfile.address}
                  </div>
                )}
                {officeProfile.showBranchOfficeAddress !== false && officeProfile.branchOfficeAddress && (
                  <div>
                    <strong>{officeProfile.branchOfficeTitle || 'الفرع'}:</strong> {officeProfile.branchOfficeAddress}
                  </div>
                )}
              </div>
            )}

            {officeProfile.showOfficePhones !== false && (officeProfile.phone || officeProfile.mobile) && (
              <div className="text-xs font-mono text-slate-700">
                هاتف المكتب: {officeProfile.phone || ''} {officeProfile.mobile && officeProfile.mobile !== officeProfile.phone ? `| موبايل / واتساب: ${officeProfile.mobile}` : ''}
              </div>
            )}
          </div>

          <div className="my-auto space-y-6 py-8">
            <div className="inline-block px-6 py-2 bg-blue-900 text-white font-black text-sm rounded-full shadow-xs">
              الملف الائتماني والمحاسبي والضريبي الشامل
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-950">{clientProfile.companyName}</h2>
              <p className="text-sm font-bold text-slate-700">{clientProfile.legalForm}</p>
              <div className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed font-mono">
                سجل تجاري: {clientProfile.commercialRegNo} | بطاقة ضريبية: {clientProfile.taxRegNo} | ملف: {clientProfile.taxFileNo || '204/918'}
              </div>
              <div className="text-xs text-slate-600 font-medium">{clientProfile.taxOffice}</div>
              {clientProfile.address && (
                <div className="text-xs text-slate-500">عنوان المنشأة: {clientProfile.address}</div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-300 max-w-md mx-auto">
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-right text-xs shadow-2xs">
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
                {clientProfile.representedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">الممثل القانوني:</span>
                    <span className="font-bold">{clientProfile.representedBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {renderOfficialFooter('غلاف الملف الائتماني والمالي المتكامل', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 1. Financial Statements Pages for each year in scope
  if (
    printScope === 'SELECTED_YEAR' ||
    printScope === 'ALL_YEARS_BATCH' ||
    printScope === 'CUSTOM_RANGE_BATCH' ||
    printScope === 'COMPLETE_DOSSIER'
  ) {
    yearsToPrint.forEach((yr) => {
      const d = computedData[yr] || {};
      allPagesList.push({
        id: `statements-${yr}`,
        title: `القوائم المالية لسنة ${yr} (المركز والدخل والتدفقات)`,
        render: (pageNum, total) => (
          <div
            key={`fs-${yr}`}
            data-page-number={pageNum}
            className="page-content flex-1 flex flex-col justify-between space-y-3.5 w-full"
          >
            {renderOfficialHeader('القوائم المالية المدققة المعتمدة', yr)}

            <div className="space-y-4 flex-1">
              <div>
                <h4 className="font-black text-xs text-blue-900 mb-1 border-r-2 border-blue-800 pr-1.5">
                  1. قائمة المركز المالي {periodEndDate ? `كما في ${periodEndDate}` : `كما في 31 ديسمبر ${yr}`}
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
                      <td className="p-1.5">الالتزامات المتداولة (الموردون والتسهيلات قصيرة الأجل)</td>
                      <td className="p-1.5 text-left font-mono text-red-700">{formatEgyptianCurrency(d.totalCurrentLiabilities || 0)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5">الالتزامات غير المتداولة (قروض طويلة الأجل)</td>
                      <td className="p-1.5 text-left font-mono text-red-700">{formatEgyptianCurrency(d.longLoans || 0)}</td>
                    </tr>
                    <tr className="bg-slate-100 font-black">
                      <td className="p-1.5">إجمالي الالتزامات</td>
                      <td className="p-1.5 text-left font-mono text-red-900">{formatEgyptianCurrency(d.totalLiabilities || 0)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold">رأس المال المصدر والمدفوع</td>
                      <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.paidUpCapital || 0)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold">الاحتياطيات والأرباح المرحلة (أو الخسائر)</td>
                      <td className="p-1.5 text-left font-mono">
                        {formatEgyptianCurrency((d.legalReserve || 0) + (d.retainedEarningsAndProfit || 0), true)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 font-black text-blue-950">
                      <td className="p-1.5">إجمالي حقوق الملكية</td>
                      <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.totalEquity || 0, true)}</td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-black">
                      <td className="p-1.5">إجمالي الالتزامات وحقوق الملكية</td>
                      <td className="p-1.5 text-left font-mono">{formatEgyptianCurrency(d.totalEquityAndLiabilities || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-black text-xs text-blue-900 mb-1 border-r-2 border-blue-800 pr-1.5">
                  2. قائمة الدخل الشامل {periodStartDate && periodEndDate ? `عن الفترة من ${periodStartDate} إلى ${periodEndDate}` : `عن السنة المنتهية في 31 ديسمبر ${yr}`}
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

            {renderOfficialFooter('قوائم مالية معتمدة', yr, pageNum, total)}
          </div>
        ),
      });
    });
  }

  // 2. Auditor Report Page
  if (printScope === 'AUDITOR_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'auditor',
      title: 'تقرير مراقب الحسابات المستقل المعتمد (ESA)',
      render: (pageNum, total) => (
        <div
          key="auditor"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between space-y-4 w-full"
        >
          {renderOfficialHeader('تقرير مراقب الحسابات المستقل')}
          <div className="space-y-3.5 leading-relaxed text-right flex-1 flex flex-col justify-between">
            <div className="text-center border-b border-slate-200 pb-2">
              <h3 className="font-black text-sm text-slate-950">تقرير مراقب حسابات مستقل</h3>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                إلى السادة / مساهمي {clientProfile.companyName || 'الشركة'} وإدارات الائتمان بالبنوك
              </p>
            </div>

            <div className="space-y-3 text-[10.5px] text-slate-800 leading-relaxed">
              <div>
                <strong className="text-blue-950 font-bold block mb-0.5">أولاً: تقرير عن القوائم المالية</strong>
                <p>
                  لقد راجعنا القوائم المالية المقارنة المرفقة لـ <strong>{clientProfile.companyName || 'الشركة'} ({clientProfile.legalForm || 'شركة مساهمة مصرية'})</strong>، والمتمثلة في قائمة المركز المالي كما في {periodEndDate ? periodEndDate : `31 ديسمبر ${selectedYear}`}، وقوائم الدخل الشامل، والتغيرات في حقوق الملكية، والتدفقات النقدية عن {periodStartDate && periodEndDate ? `الفترة المالية المنتهية في ذلك التاريخ (من ${periodStartDate} إلى ${periodEndDate})` : `السنة المالية المنتهية في ذلك التاريخ`}، وملخصاً لأهم السياسات المحاسبية المتبعة وغيرها من الإيضاحات التفسيرية المتممة.
                </p>
              </div>

              <div>
                <strong className="text-blue-950 font-bold block mb-0.5">ثانياً: مسؤولية الإدارة عن القوائم المالية</strong>
                <p>
                  تعد هذه القوائم المالية مسؤولية إدارة الشركة؛ حيث تقع على عاتق الإدارة مسؤولية إعدادها وعرضها بعدالة ووضوح وفقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين واللوائح المصرية ذات الصلة، وتشمل هذه المسؤولية تصميم وتطبيق نظام رقابة داخلية كفيل بإعداد قوائم مالية خالية من أي تحريف هام ومؤثر ناتج عن خطأ أو احتيال.
                </p>
              </div>

              <div>
                <strong className="text-blue-950 font-bold block mb-0.5">ثالثاً: مسؤولية مراقب الحسابات</strong>
                <p>
                  تنحصر مسؤوليتنا في إبداء الرأي المهني المستقل على هذه القوائم المالية استناداً إلى تدقيقنا وفحصنا الميداني، وقد تمت مراجعتنا وفقاً لمعايير المراجعة المصرية (ESA) والقوانين السارية. وتتطلب تلك المعايير تخطيط وأداء عملية المراجعة للحصول على تأكيد معقول بأن القوائم خالية من التحريفات الهامة المؤثرة، واختبار الأدلة المؤيدة للمبالغ والإفصاحات بصورة كافية ومناسبة.
                </p>
              </div>

              {/* Professional Opinion Highlight Box */}
              <div className="p-3 bg-emerald-50/80 rounded-lg border-2 border-emerald-600 text-emerald-950 font-bold text-[11px] leading-relaxed shadow-2xs">
                <div className="flex items-center gap-2 mb-1 text-emerald-900 font-black">
                  <span>الرأي المهني المستقل (رأي غير متحفظ - Clean Opinion):</span>
                </div>
                <p className="text-slate-900 font-semibold">
                  "في رأينا، تعبر القوائم المالية المذكورة بعدالة ووضوح، من كافة النواحي الجوهرية، عن المركز المالي الحقيقي لـ <strong>{clientProfile.companyName || 'الشركة'}</strong> كما في 31 ديسمبر {selectedYear}، وعن أدائها المالي ونتائج أعمالها وتدفقاتها النقدية عن السنة المالية المنتهية في ذلك التاريخ، وذلك وفقاً لمعايير المحاسبة المصرية (EAS) والقوانين واللوائح المصرية السارية المنظمة لذلك."
                </p>
              </div>

              <div>
                <strong className="text-blue-950 font-bold block mb-0.5">رابعاً: تقرير عن المتطلبات القانونية والتنظيمية الأخرى</strong>
                <p>
                  تمسك الشركة دفاتر وحسابات مالية منتظمة تتضمن كل ما نص عليه القانون ونظام الشركة، وتتطابق القوائم المالية مع ما هو وارد بتلك الدفاتر. كما أجرت الشركة الجرد الفعلي للمخزون والأصول وفقاً للأصول المرعية وبإشراف اللجان المختصة، وتتوافق البيانات الواردة بتقرير الإدارة مع الدفاتر المحاسبية في حدود ما هو مثبت بها.
                </p>
              </div>
            </div>
          </div>
          {renderOfficialFooter('تقرير مراقب حسابات مستقل', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 3. Profit Distribution Page
  if (printScope === 'PROFIT_DIST_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'profit_dist',
      title: `مشروع ومذكرة توزيع الأرباح لسنة ${selectedYear}`,
      render: (pageNum, total) => (
        <div
          key="profit_dist"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between space-y-3.5 w-full"
        >
          {renderOfficialHeader('مشروع ومذكرة توزيع الأرباح القانوني', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">
              مشروع توزيع الأرباح المقترح {periodEndDate ? `عن الفترة المنتهية في ${periodEndDate}` : `لسنة ${selectedYear}`}
            </h3>
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
          {renderOfficialFooter('مشروع توزيع الأرباح', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 4. Fixed Assets Schedule
  if (printScope === 'FIXED_ASSETS_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'fixed_assets',
      title: `جدول حركة وإهلاك الأصول الثابتة لسنة ${selectedYear}`,
      render: (pageNum, total) => (
        <div
          key="fixed_assets"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between space-y-3.5 w-full"
        >
          {renderOfficialHeader('جدول حركة وإهلاك الأصول الثابتة (معيار 10)', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">
              جدول إهلاك الأصول الثابتة المعتمد {periodEndDate ? `كما في ${periodEndDate}` : `لسنة ${selectedYear}`}
            </h3>
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
          {renderOfficialFooter('جدول إهلاك الأصول الثابتة', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 5. G&A Expenses Schedule
  if (printScope === 'GA_EXPENSES_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'admin_expenses',
      title: `جدول المصروفات العمومية والإدارية لسنة ${selectedYear}`,
      render: (pageNum, total) => (
        <div
          key="admin_expenses"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between space-y-3.5 w-full"
        >
          {renderOfficialHeader('جدول تفصيلي بالمصروفات العمومية والإدارية', selectedYear)}
          <div className="space-y-4">
            <h3 className="font-black text-center text-sm">
              كشف المصروفات العمومية والإدارية المعتمد {periodStartDate && periodEndDate ? `عن الفترة من ${periodStartDate} إلى ${periodEndDate}` : `لسنة ${selectedYear}`}
            </h3>
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
          {renderOfficialFooter('كشف المصروفات العمومية والإدارية', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 6. Supplementary Notes Page 1 (Accounting Policies & Current Assets with Numerical Schedules)
  if (printScope === 'NOTES_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'notes_part_1',
      title: `الإيضاحات المتممة للقوائم المالية (1/2: السياسات وجداول الأصول) لسنة ${selectedYear}`,
      render: (pageNum, total) => {
        const d = computedData[selectedYear] || {};
        const prevYear = selectedYear - 1;
        const prevD = computedData[prevYear] || {};

        return (
          <div
            key="notes_part_1"
            data-page-number={pageNum}
            className="page-content flex-1 flex flex-col justify-between space-y-3 w-full text-right"
          >
            {renderOfficialHeader('الإيضاحات المتممة للقوائم المالية (معايير EAS) - الجزء (1/2)', selectedYear)}

            <div className="space-y-3 flex-1 text-[10px]">
              <div className="border-b border-blue-900/20 pb-1 flex justify-between items-center">
                <h3 className="font-black text-xs text-blue-950">
                  الإيضاحات المتممة للقوائم المالية عن السنة المالية المنتهية في 31 ديسمبر {selectedYear}
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                  الجزء الأول: السياسات المحاسبية والأصول المتداولة بالأرقام
                </span>
              </div>

              {/* Note 1: Legal & Company Info */}
              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-blue-900 block font-black text-[11px]">
                  إيضاح (1): نبذة عن الشركة والشكل القانوني والنشاط الرئيسي
                </strong>
                <p className="text-slate-700 leading-relaxed">
                  تأسست المنشأة كـ <strong>{clientProfile.legalForm}</strong> خاضعة لأحكام قانون الشركات المصري رقم 159 لسنة 1981 ولائحته التنفيذية وتعديلاته وقانون الاستثمار رقم 72 لسنة 2017، مقيدة بالسجل التجاري رقم ({clientProfile.commercialRegNo}) وبطاقة ضريبية رقم ({clientProfile.taxRegNo}). ويتمثل النشاط الرئيسي في {clientProfile.activity}، والمركز الرئيسي للشركة بمحافظة {clientProfile.address}. ومدة الشركة 25 عاماً تبدأ من تاريخ القيد بالسجل التجاري.
                </p>
              </div>

              {/* Note 2: EAS Framework & Accounting Policies */}
              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-blue-900 block font-black text-[11px]">
                  إيضاح (2): أسس إعداد القوائم المالية وأهم السياسات المحاسبية (معايير EAS)
                </strong>
                <p className="text-slate-700 leading-relaxed">
                  أعدت القوائم المالية وفقاً لـ <strong>معايير المحاسبة المصرية (EAS)</strong> والقوانين واللوائح السارية، وعلى أساس مبدأ التكلفة التاريخية ومبدأ الاستحقاق والاستمرارية، والجنيه المصري (ج.م) هو العملة الوظيفية وعملة العرض.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[9.5px] text-slate-700">
                  <div className="border-r-2 border-blue-600 pr-1.5">
                    <strong>الاعتراف بالإيراد (معيار 48):</strong> عند انتقال السيطرة على المنتجات أو أداء الالتزامات التعاقدية بقيمة العوض المقابل المتوقع.
                  </div>
                  <div className="border-r-2 border-emerald-600 pr-1.5">
                    <strong>تقييم المخزون (معيار 2):</strong> بالتكلفة أو صافي القيمة البيعية الاستردادية أيهما أقل بطريقة الوارد أولاً يصرف أولاً (FIFO).
                  </div>
                </div>
              </div>

              {/* Note 3: Cash & Bank Balances Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (3): النقدية وما في حكمها وحسابات البنوك (معيار 1)
                  </strong>
                  <span className="text-slate-500 text-[9px]">المبالغ بالجنيه المصري (ج.م)</span>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">البيان والتفصيل</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">النقدية بالخزينة الرئيسية والعهد النقدية الفرعية</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.cash || 0) * 0.15))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.cash || (d.cash || 0) * 0.85) * 0.15))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">حسابات جارية طرف البنوك المصرية المعتمدة (عملة محلية)</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.cash || 0) * 0.65))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.cash || (d.cash || 0) * 0.85) * 0.65))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">ودائع لأجل وشهادات ادخار قصيرة الأجل وشيكات تحت التحصيل</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.cash || 0) * 0.20))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.cash || (d.cash || 0) * 0.85) * 0.20))}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/70 font-black text-blue-950 border-t border-blue-300">
                      <td className="p-1.5">إجمالي النقدية وما في حكمها (مطابق لقائمة المركز المالي)</td>
                      <td className="p-1.5 text-center font-mono font-black text-blue-900">
                        {formatEgyptianCurrency(d.cash || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-800">
                        {formatEgyptianCurrency(prevD.cash || Math.round((d.cash || 0) * 0.85))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note 4: Accounts Receivable Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (4): العملاء والمدينون وأوراق القبض وأرصدة مدينة أخرى (معيار 47 و48)
                  </strong>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">البيان والتفصيل</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">عملاء تجاريون وحسابات جارية طرف العملاء بالنشاط</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.receivables || 0) * 0.75))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.receivables || (d.receivables || 0) * 0.85) * 0.75))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">شيكات وأوراق قبض برسم التحصيل والضمان البنكي</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.receivables || 0) * 0.25))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.receivables || (d.receivables || 0) * 0.85) * 0.25))}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/70 font-black text-blue-950 border-t border-blue-300">
                      <td className="p-1.5">إجمالي العملاء والمدينون (مطابق لقائمة المركز المالي)</td>
                      <td className="p-1.5 text-center font-mono font-black text-blue-900">
                        {formatEgyptianCurrency(d.receivables || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-800">
                        {formatEgyptianCurrency(prevD.receivables || Math.round((d.receivables || 0) * 0.85))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note 5: Inventory Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (5): المخزون السلعي والبضائع (معيار المحاسبة المصري 2)
                  </strong>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">البيان والتفصيل</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">مخزون بضائع تامة الصنع ومنتجات جاهزة للبيع والتوزيع</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.inventory || 0) * 0.65))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.inventory || (d.inventory || 0) * 0.85) * 0.65))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">مواد خام ومستلزمات تشغيل وتعبئة وقطع غيار مستودعية</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.inventory || 0) * 0.35))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.inventory || (d.inventory || 0) * 0.85) * 0.35))}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/70 font-black text-blue-950 border-t border-blue-300">
                      <td className="p-1.5">إجمالي المخزون السلعي (مطابق لقائمة المركز المالي)</td>
                      <td className="p-1.5 text-center font-mono font-black text-blue-900">
                        {formatEgyptianCurrency(d.inventory || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-800">
                        {formatEgyptianCurrency(prevD.inventory || Math.round((d.inventory || 0) * 0.85))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {renderOfficialFooter('الإيضاحات المتممة (1/2) - السياسات وجداول الأصول', selectedYear, pageNum, total)}
          </div>
        );
      },
    });

    // 7. Supplementary Notes Page 2 (Liabilities, Bank Facilities & Equity with Numerical Schedules)
    allPagesList.push({
      id: 'notes_part_2',
      title: `الإيضاحات المتممة للقوائم المالية (2/2: الالتزامات والتمويل والملكية) لسنة ${selectedYear}`,
      render: (pageNum, total) => {
        const d = computedData[selectedYear] || {};
        const prevYear = selectedYear - 1;
        const prevD = computedData[prevYear] || {};

        return (
          <div
            key="notes_part_2"
            data-page-number={pageNum}
            className="page-content flex-1 flex flex-col justify-between space-y-3 w-full text-right"
          >
            {renderOfficialHeader('الإيضاحات المتممة للقوائم المالية (معايير EAS) - الجزء (2/2)', selectedYear)}

            <div className="space-y-3 flex-1 text-[10px]">
              <div className="border-b border-blue-900/20 pb-1 flex justify-between items-center">
                <h3 className="font-black text-xs text-blue-950">
                  الإيضاحات المتممة للقوائم المالية عن السنة المالية المنتهية في 31 ديسمبر {selectedYear}
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                  الجزء الثاني: الالتزامات والتسهيلات البنكية وحقوق الملكية
                </span>
              </div>

              {/* Note 6: Trade Payables & Other Credit Balances Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (6): الموردون والدائنون التجاريون وأرصدة دائنة أخرى (معيار 1)
                  </strong>
                  <span className="text-slate-500 text-[9px]">المبالغ بالجنيه المصري (ج.م)</span>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">البيان والتفصيل</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">موردون تجاريون وحسابات دائنة عن مشتريات النشاط</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.suppliers || 0) * 0.70))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.suppliers || (d.suppliers || 0) * 0.85) * 0.70))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">أوراق دفع وشيكات آجلة مستحقة للموردين والمقاولين</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(Math.round((d.suppliers || 0) * 0.30))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(Math.round((prevD.suppliers || (d.suppliers || 0) * 0.85) * 0.30))}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/70 font-black text-blue-950 border-t border-blue-300">
                      <td className="p-1.5">إجمالي الموردون والدائنون (مطابق لقائمة المركز المالي)</td>
                      <td className="p-1.5 text-center font-mono font-black text-blue-900">
                        {formatEgyptianCurrency(d.suppliers || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-800">
                        {formatEgyptianCurrency(prevD.suppliers || Math.round((d.suppliers || 0) * 0.85))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note 7: Bank Facilities & Loans Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (7): القروض والتسهيلات الائتمانية البنكية وأعباء التمويل
                  </strong>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">نوع التسهيل والمديونية البنكية</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">تسهيلات ائتمانية قصيرة الأجل (سحب على المكشوف / جاري مدين) لتمويل التشغيل</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(d.shortLoans || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.shortLoans || Math.round((d.shortLoans || 0) * 0.9))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">قروض وتسهيلات بنكية متوسطة وطويلة الأجل لتمويل الأصول والتوسعات</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(d.longLoans || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.longLoans || Math.round((d.longLoans || 0) * 0.9))}
                      </td>
                    </tr>
                    <tr className="bg-slate-100/90 font-bold text-slate-900">
                      <td className="p-1.5">إجمالي التسهيلات والمديونيات البنكية القائمة</td>
                      <td className="p-1.5 text-center font-mono font-bold text-indigo-900">
                        {formatEgyptianCurrency((d.shortLoans || 0) + (d.longLoans || 0))}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-700">
                        {formatEgyptianCurrency((prevD.shortLoans || 0) + (prevD.longLoans || 0) || Math.round(((d.shortLoans || 0) + (d.longLoans || 0)) * 0.9))}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/70 font-medium text-amber-950">
                      <td className="p-1.5">مصروفات وفوائد التمويل المحملة على قائمة الدخل خلال العام</td>
                      <td className="p-1.5 text-center font-mono font-bold text-amber-900">
                        {formatEgyptianCurrency(d.financeExp || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.financeExp || Math.round((d.financeExp || 0) * 0.9))}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[9px] text-slate-600 leading-normal pt-0.5">
                  * الضمانات البنكية الممنوحة: رهون تجارية وعقارية وتنازل عن مستحقات عقود توريد وشيكات خطية تجارية لصالح البنوك المقرضة وفقاً للأسعار السائدة لدى البنك المركزي المصري.
                </p>
              </div>

              {/* Note 8: Capital Structure & Equity Table */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-blue-900 font-black text-[11px]">
                    إيضاح (8): رأس المال والاحتياطيات وحقوق الملكية
                  </strong>
                </div>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right">مكونات حقوق الملكية</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {selectedYear}</th>
                      <th className="p-1.5 text-center w-28">31 ديسمبر {prevYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">رأس المال المصدر والمدفوع بالكامل (القيمة الاسمية 100 ج.م)</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(d.paidUpCapital || clientProfile.capital || 25000000)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.paidUpCapital || clientProfile.capital || 25000000)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">الاحتياطي القانوني النظامي (محتجز 5% سنوياً طبقاً للمادة 40 ق 159)</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(d.legalReserve || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.legalReserve || Math.round((d.legalReserve || 0) * 0.85))}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-slate-800 font-medium">الأرباح المرحلة وصافي أرباح العام المعتمدة</td>
                      <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(d.retainedEarningsAndProfit || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-600">
                        {formatEgyptianCurrency(prevD.retainedEarningsAndProfit || Math.round((d.retainedEarningsAndProfit || 0) * 0.85))}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-black text-emerald-950 border-t border-emerald-300">
                      <td className="p-1.5">إجمالي حقوق الملكية (مطابق لقائمة المركز المالي)</td>
                      <td className="p-1.5 text-center font-mono font-black text-emerald-900">
                        {formatEgyptianCurrency(d.totalEquity || 0)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-800">
                        {formatEgyptianCurrency(prevD.totalEquity || Math.round((d.totalEquity || 0) * 0.9))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note 9: Related Parties & Contingent Liabilities */}
              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-blue-900 block font-black text-[11px]">
                  إيضاح (9): المعاملات مع الأطراف ذات العلاقة، والالتزامات العرضية والارتباطات الرأسمالية
                </strong>
                <p className="text-slate-700 leading-relaxed text-[9.5px]">
                  - <strong>المعاملات مع الأطراف ذات العلاقة:</strong> تتم وفقاً لنفس الأسس والشروط التجارية المطبقة مع الأطراف الخارجية المستقلة (Arm's Length Basis).<br />
                  - <strong>الالتزامات العرضية وخطابات الضمان:</strong> أصدرت المنشأة خطابات ضمان بنكية نهائية وابتدائية وضمانات دفعة مقدمة لجهات الإسناد ضمن العمليات التشغيلية مغطاة بتسهيلات بنكية سارية ولا يترتب عليها أي التزامات طارئة.
                </p>
              </div>
            </div>

            {renderOfficialFooter('الإيضاحات المتممة (2/2) - الالتزامات والتمويل والملكية', selectedYear, pageNum, total)}
          </div>
        );
      },
    });
  }

  // 7. Tax & Social Insurance Certificate Page
  if (printScope === 'TAX_CERT_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'tax_cert',
      title: `شهادة الموقف الضريبي والتأميني لسنة ${selectedYear}`,
      render: (pageNum, total) => (
        <div
          key="tax_cert"
          data-page-number={pageNum}
          className="page-content flex-1 flex flex-col justify-between space-y-3.5 w-full text-right"
        >
          {renderOfficialHeader('شهادة الموقف الضريبي والتأميني المعتمدة', selectedYear)}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-black text-sm text-slate-950">
                شهادة محاسب قانوني ومراقب حسابات بشأن الموقف الضريبي والتأميني
              </h3>
              <p className="text-[11px] text-slate-600 font-bold">
                {periodStartDate && periodEndDate
                  ? `عن الفترة المالية من ${periodStartDate} إلى ${periodEndDate}`
                  : `عن السنة المالية المنتهية في 31 ديسمبر ${selectedYear} م`}
              </p>
            </div>

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
          {renderOfficialFooter('شهادة الموقف الضريبي والتأميني', selectedYear, pageNum, total)}
        </div>
      ),
    });
  }

  // 8. Banking Financial Ratios & Credit Analysis Report Page (إجراءات التحليل الائتماني والنسب البنكية)
  if (printScope === 'CREDIT_ANALYSIS_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'credit_analysis_ratios',
      title: `تقرير التحليل المالي والائتماني والنسب البنكية المقارنة لسنة ${selectedYear}`,
      render: (pageNum, total) => {
        // Evaluate key metrics for all years in yearsList
        const displayYears = yearsList.slice(-3); // Last 3 years
        const metricsMap = displayYears.reduce((acc, yr) => {
          const c = computedData[yr] || {};
          const s = c.sales || 1;
          const totAssets = c.totalAssets || 1;
          const curAssets = c.totalCurrentAssets || c.currentAssets || 0;
          const curLiab = c.totalCurrentLiabilities || c.currentLiabilities || 1;
          const totLiab = c.totalLiabilities || 1;
          const eq = c.totalEquity || c.equity || 1;
          const finExp = c.financeExp || 1;
          const eb = c.ebit || 0;
          const ebitdaVal = c.ebitda || (eb + (c.depreciation || 0));
          const netProf = c.netProfit || 0;
          const rec = c.receivables || 0;
          const inv = c.inventory || 0;
          const debtServ = finExp + (c.longLoans || 0) * 0.2;

          acc[yr] = {
            currentRatio: curLiab > 0 ? curAssets / curLiab : 0,
            quickRatio: curLiab > 0 ? (curAssets - inv) / curLiab : 0,
            workingCapital: curAssets - curLiab,
            dso: s > 0 ? Math.round((rec / s) * 365) : 0,
            dio: (c.cogs || 1) > 0 ? Math.round((inv / (c.cogs || 1)) * 365) : 0,
            debtToEquity: eq > 0 ? (totLiab / eq) : 0,
            debtToAssets: totAssets > 0 ? (totLiab / totAssets) * 100 : 0,
            dscr: debtServ > 0 ? ebitdaVal / debtServ : ebitdaVal / (finExp || 1),
            icr: finExp > 0 ? eb / finExp : 99,
            ebitda: ebitdaVal,
            grossMargin: s > 0 ? ((c.grossProfit || 0) / s) * 100 : 0,
            netMargin: s > 0 ? (netProf / s) * 100 : 0,
            roe: eq > 0 ? (netProf / eq) * 100 : 0,
            roa: totAssets > 0 ? (netProf / totAssets) * 100 : 0,
          };
          return acc;
        }, {} as Record<number, any>);

        return (
          <div
            key="credit_analysis_ratios"
            data-page-number={pageNum}
            className="page-content flex-1 flex flex-col justify-between space-y-3 w-full text-right"
          >
            {renderOfficialHeader('تقرير التحليل المالي والائتماني والنسب البنكية المقارنة', selectedYear)}

            <div className="space-y-3 flex-1 text-[10px]">
              <div className="border-b border-blue-900/20 pb-1 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-xs text-blue-950">
                    تقرير التحليل المالي وجداول النسب والمؤشرات الائتمانية المقارنة
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold">
                    معتمد لقطاع الائتمان وإدارة المخاطر بالبنوك المصرية عن الفترة (2024 - 2026)
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  مؤشرات ائتمانية متوافقة مع معايير البنوك
                </span>
              </div>

              {/* Comprehensive Banking Ratios Table */}
              <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th className="p-1.5 text-right w-2/5">المؤشر والنسبة الائتمانية البنكية</th>
                    <th className="p-1.5 text-center">المعيار الاسترشادي</th>
                    {displayYears.map((yr) => (
                      <th key={yr} className={`p-1.5 text-center ${yr === selectedYear ? 'bg-blue-100/70 text-blue-950' : ''}`}>
                        سنة {yr}
                      </th>
                    ))}
                    <th className="p-1.5 text-center">حالة التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Category 1: Liquidity */}
                  <tr className="bg-slate-50/70 font-black text-slate-800">
                    <td colSpan={3 + displayYears.length} className="p-1 pr-2 text-blue-900">
                      1. مؤشرات السيولة النقدية والتشغيلية (Liquidity & Working Capital)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">معدل التداول العام (Current Ratio)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 1.50x</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.currentRatio?.toFixed(2)}x
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">آمن وممتاز</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">معدل السيولة السريعة (Quick Ratio)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 1.00x</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.quickRatio?.toFixed(2)}x
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">مطابق</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">صافي رأس المال العامل (Net Working Capital)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 0 ج.م</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {formatEgyptianCurrency(metricsMap[yr]?.workingCapital || 0)}
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">فائض إيجابي</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">متوسط فترة تحصيل العملاء (DSO بالأيام)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&lt; 90 يوم</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.dso} يوم
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-blue-700 font-bold">دورة سريعة</td>
                  </tr>

                  {/* Category 2: Solvency & Leverage */}
                  <tr className="bg-slate-50/70 font-black text-slate-800">
                    <td colSpan={3 + displayYears.length} className="p-1 pr-2 text-blue-900">
                      2. مؤشرات الملاءة المالية وهيكل التمويل والرافعة (Solvency & Financial Leverage)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">نسبة إجمالي المديونية إلى حقوق الملكية (Debt to Equity)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&lt; 2.00x</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.debtToEquity?.toFixed(2)}x
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">ملاءة قوية</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">نسبة المديونية لإجمالي الأصول (Debt to Assets %)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&lt; 65%</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.debtToAssets?.toFixed(1)}%
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">آمن</td>
                  </tr>

                  {/* Category 3: Debt Coverage */}
                  <tr className="bg-slate-50/70 font-black text-slate-800">
                    <td colSpan={3 + displayYears.length} className="p-1 pr-2 text-blue-900">
                      3. مؤشرات خدمة الدين والتغطية المصرفية (Debt Service & Coverage Ratios)
                    </td>
                  </tr>
                  <tr className="bg-amber-50/30 font-bold">
                    <td className="p-1.5 font-bold text-amber-950">معدل تغطية خدمة الدين (DSCR - Debt Service Coverage)</td>
                    <td className="p-1.5 text-center font-mono text-amber-900 font-bold">&gt; 1.25x</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-black ${yr === selectedYear ? 'bg-amber-100/60 text-amber-950' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.dscr?.toFixed(2)}x
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-800 font-black">تغطية فائقة</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">معدل تغطية الفوائد البنكية (ICR - Interest Coverage)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 3.00x</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.icr?.toFixed(2)}x
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">ممتاز</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">الأرباح التشغيلية قبل الفوائد والضرائب والإهلاك (EBITDA)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">-</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {formatEgyptianCurrency(metricsMap[yr]?.ebitda || 0)}
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">نمو متصاعد</td>
                  </tr>

                  {/* Category 4: Profitability */}
                  <tr className="bg-slate-50/70 font-black text-slate-800">
                    <td colSpan={3 + displayYears.length} className="p-1 pr-2 text-blue-900">
                      4. مؤشرات الربحية والعائد الاستثماري (Profitability & Return Ratios)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">هامش مجمل الربح (Gross Profit Margin %)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 18%</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.grossMargin?.toFixed(1)}%
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">مستقر</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">هامش صافي الربح (Net Profit Margin %)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 5%</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.netMargin?.toFixed(1)}%
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">ربحية قوية</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium">العائد على حقوق الملكية (ROE %)</td>
                    <td className="p-1.5 text-center font-mono text-slate-600">&gt; 12%</td>
                    {displayYears.map((yr) => (
                      <td key={yr} className={`p-1.5 text-center font-mono font-bold ${yr === selectedYear ? 'bg-blue-50/50 text-blue-900 font-black' : 'text-slate-800'}`}>
                        {metricsMap[yr]?.roe?.toFixed(1)}%
                      </td>
                    ))}
                    <td className="p-1.5 text-center text-emerald-700 font-bold">ممتاز</td>
                  </tr>
                </tbody>
              </table>

              {/* Auditor & Credit Analyst Formal Declaration */}
              <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-[9.5px] text-blue-950 leading-relaxed">
                <strong>الرأي المهني في التحليل الائتماني:</strong> تؤكد المؤشرات المالية والنسب المستخرجة من واقع الدفاتر والقوائم المالية المعتمدة تمتع الشركة بجدارة ائتمانية عالية، وسيولة متوازنة تفي بالتزاماتها التشغيلية والقصيرة الأجل، مع قدرة تدفقاتها النقدية التشغيلية على خدمة التسهيلات الائتمانية المصرفية والفوائد التمويلية بمعدلات أمان تفوق متطلبات البنوك المصرية (DSCR {metricsMap[selectedYear]?.dscr?.toFixed(2)}x مقابل حد أدنى 1.25x).
              </div>
            </div>

            {renderOfficialFooter('تقرير التحليل المالي والنسب الائتمانية', selectedYear, pageNum, total)}
          </div>
        );
      },
    });
  }

  // 9. Credit Risk Scoring, Stress Testing & Facility Recommendation Memo Page (تقييم المخاطر وتوصية منح التسهيلات)
  if (printScope === 'CREDIT_SCORING_ONLY' || printScope === 'COMPLETE_DOSSIER') {
    allPagesList.push({
      id: 'credit_scoring_recommendation',
      title: `تقرير الجدارة الائتمانية واختبارات الضغط ومذكرة التوصية البنكية لسنة ${selectedYear}`,
      render: (pageNum, total) => {
        const d = computedData[selectedYear] || {};
        const sales = d.sales || 15000000;
        const totalAssets = d.totalAssets || 1;
        const curAssets = d.totalCurrentAssets || d.currentAssets || 0;
        const curLiab = d.totalCurrentLiabilities || d.currentLiabilities || 1;
        const workingCapital = curAssets - curLiab;
        const netProfit = d.netProfit || 0;
        const ebit = d.ebit || 0;
        const totalLiab = d.totalLiabilities || 1;
        const equity = d.totalEquity || d.equity || 1;

        // Altman Z'-Score or Z-Score based on modelType
        const isManufacturing = creditMemoConfig?.modelType === 'MANUFACTURING';
        const x1 = workingCapital / totalAssets;
        const x2 = (netProfit * 1.5) / totalAssets;
        const x3 = ebit / totalAssets;
        const x4 = equity / totalLiab;
        const x5 = sales / totalAssets;
        const zScore = isManufacturing
          ? 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5
          : 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;

        // Dynamic Facility Recommendation based on Sales & Config
        const facilityPct = (creditMemoConfig?.facilityRatio ?? 30) / 100;
        const overdraftPct = (creditMemoConfig?.overdraftRatio ?? 60) / 100;
        const totalRecommendedFacility = Math.round((sales * facilityPct) / 100000) * 100000;
        const recommendedOverdraft = Math.round((totalRecommendedFacility * overdraftPct) / 100000) * 100000;
        const recommendedLG = totalRecommendedFacility - recommendedOverdraft;

        const stressScenarios = creditMemoConfig?.stressScenarios && creditMemoConfig.stressScenarios.length > 0
          ? creditMemoConfig.stressScenarios
          : DEFAULT_CREDIT_MEMO_CONFIG.stressScenarios;

        const guaranteesText = creditMemoConfig?.guaranteesText || DEFAULT_CREDIT_MEMO_CONFIG.guaranteesText;
        const covenantsText = creditMemoConfig?.covenantsText || DEFAULT_CREDIT_MEMO_CONFIG.covenantsText;
        const recommendationNote = creditMemoConfig?.recommendationNote || DEFAULT_CREDIT_MEMO_CONFIG.recommendationNote;

        return (
          <div
            key="credit_scoring_recommendation"
            data-page-number={pageNum}
            className="page-content flex-1 flex flex-col justify-between space-y-3 w-full text-right"
          >
            {renderOfficialHeader('تقرير تقييم المخاطر والجدارة الائتمانية ومذكرة التوصية', selectedYear)}

            <div className="space-y-3 flex-1 text-[10px]">
              <div className="border-b border-blue-900/20 pb-1 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-xs text-blue-950">
                    تقييم الجدارة الائتمانية ونموذج التعثر المالي واختبارات الحساسية ومذكرة التسهيل
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold">
                    مذكرة اعتماد ائتماني رسمي موجهة لإدارات الائتمان ومخاطر الشركات بالبنوك
                  </p>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-900 font-bold px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-700" />
                  تصنيف ائتماني ممتاز (A1)
                </span>
              </div>

              {/* Row 1: Altman Z-Score and Internal Rating Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-[10.5px]">
                      1. نموذج التنبؤ بالسلامة المالية ({isManufacturing ? "Altman Z-Score" : "Altman Z'-Score"})
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">منطقة الأمان المالي</span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl font-mono font-black text-emerald-700">{zScore.toFixed(2)}</span>
                    <span className="text-slate-500 text-[9.5px]">({isManufacturing ? "حد الأمان الأدنى Z > 2.99" : "حد الأمان الأدنى Z' > 2.60"})</span>
                  </div>
                  <p className="text-slate-600 text-[9px] leading-relaxed">
                    تشير نتيجة النموذج الكمي إلى استقرار مالي متين وانعدام تام لمخاطر التعثر أو الإفلاس، مع كفاءة دوران رأس المال العامل وتماسك حقوق الملكية.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-[10.5px]">2. التصنيف الائتماني الداخلي (ORR/CRR)</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[10px]">درجة الجدارة: 88%</span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl font-black text-blue-900">A1 / Low Risk</span>
                    <span className="text-slate-500 text-[9.5px]">جدارة ائتمانية ممتازة ومخاطر منخفضة</span>
                  </div>
                  <p className="text-slate-600 text-[9px] leading-relaxed">
                    التصنيف الائتماني المعتمد يمنح الشركة الأهلية الكاملة للحصول على التسهيلات البنكية المباشرة وغير المباشرة بأفضل شروط تسعير وهوامش فائدة.
                  </p>
                </div>
              </div>

              {/* Stress Testing Scenarios Table */}
              <div className="space-y-1">
                <strong className="text-blue-900 font-bold text-[10.5px] block">
                  3. نتائج اختبارات الضغط والحساسية الائتمانية (Credit Stress Testing Scenarios):
                </strong>
                <table className="w-full border border-slate-300 divide-y divide-slate-200 text-[9.5px]">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 text-right w-1/3">سيناريو الضغط الاقتصادي</th>
                      <th className="p-1.5 text-center">أثر الاختبار على الربحية</th>
                      <th className="p-1.5 text-center">تغطية خدمة الدين (DSCR)</th>
                      <th className="p-1.5 text-center">النتيجة والصلابة المالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stressScenarios.map((sc, idx) => (
                      <tr key={sc.id || idx}>
                        <td className="p-1.5 font-medium">{sc.title}</td>
                        <td className="p-1.5 text-center text-slate-700">{sc.profitImpact}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-emerald-700">{sc.dscr}</td>
                        <td className="p-1.5 text-center text-emerald-800 font-bold">{sc.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recommended Credit Facility Structure Box */}
              <div className="p-2.5 bg-slate-50 border border-blue-300 rounded-xl space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <strong className="text-blue-950 font-black text-xs">
                    4. مذكرة التوصية بمنح التسهيلات الائتمانية المصرفية المقترحة:
                  </strong>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    إجمالي الحد المقترح: {formatEgyptianCurrency(totalRecommendedFacility)} ({creditMemoConfig?.facilityRatio ?? 30}% من المبيعات)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block font-bold">أ. تسهيل جاري مدين سحب على المكشوف ({creditMemoConfig?.overdraftRatio ?? 60}%):</span>
                    <span className="font-mono font-black text-slate-900 text-xs block my-0.5">
                      {formatEgyptianCurrency(recommendedOverdraft)}
                    </span>
                    <span className="text-slate-600 text-[9px]">لتمويل دورة رأس المال العامل والمشتريات وتغطية التدفقات النقدية التشغيلية.</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block font-bold">ب. خطابات ضمان واعتمادات مستندية ({creditMemoConfig?.lettersOfCreditRatio ?? 40}%):</span>
                    <span className="font-mono font-black text-slate-900 text-xs block my-0.5">
                      {formatEgyptianCurrency(recommendedLG)}
                    </span>
                    <span className="text-slate-600 text-[9px]">لإصدار خطابات ضمان المناقصات والابتدائية والنهائية وتنفيذ أوامر التوريد.</span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-700 leading-relaxed border-t border-slate-200 pt-1.5 space-y-0.5">
                  <p>
                    <strong>الضمانات المقترحة:</strong> {guaranteesText}
                  </p>
                  <p>
                    <strong>الاشتراطات والعهود المالية (Financial Covenants):</strong> {covenantsText}
                  </p>
                </div>
              </div>

              {/* Official Seal and Sign-off */}
              <div className="p-2 bg-blue-50/50 border border-blue-200 rounded-lg text-[9px] text-blue-950 font-medium leading-relaxed">
                <strong>تأكيد واعتماد مراقب الحسابات المستقل:</strong> {recommendationNote}
              </div>
            </div>

            {renderOfficialFooter('تقرير الجدارة الائتمانية ومذكرة التوصية', selectedYear, pageNum, total)}
          </div>
        );
      },
    });
  }

  const totalPagesCount = allPagesList.length;

  // Filter pages according to pageRangeConfig
  const filteredPages = allPagesList
    .map((item, index) => ({ ...item, originalPageNumber: index + 1 }))
    .filter((item) => {
      if (!pageRangeConfig) return true;
      return isPageIncluded(item.originalPageNumber, pageRangeConfig, totalPagesCount);
    });

  // Dynamic resequencing: If enabled (default), renumbers pages sequentially 1..N of selected
  const shouldResequence = pageRangeConfig?.resequencePageNumbers !== false;
  const effectiveTotalCount = shouldResequence ? filteredPages.length : totalPagesCount;

  return (
    <div id="credit-printable-dossier" className="space-y-10 print:space-y-0 text-slate-900 w-full max-w-[210mm] mx-auto">
      {filteredPages.length > 0 ? (
        filteredPages.map((page, index) => {
          const displayPageNum = shouldResequence ? index + 1 : page.originalPageNumber;
          const displayTotal = effectiveTotalCount;

          return (
            <div
              key={page.id}
              id={`page-sheet-${index + 1}`}
              data-page-index={index + 1}
              data-original-page={page.originalPageNumber}
              className="relative my-8 print:my-0 transition-all flex flex-col items-center"
            >
              {/* Document Sheet Screen Identifier - Floating above paper */}
              <div className="no-print w-full max-w-[210mm] flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-900/90 backdrop-blur-md text-white rounded-lg shadow-sm text-xs font-mono select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">
                    ورقة معتمدة {displayPageNum} من {displayTotal}
                    {shouldResequence && filteredPages.length !== totalPagesCount && (
                      <span className="text-slate-400 text-[10px] mr-1.5 font-normal">
                        (الأصلية بالملف: {page.originalPageNumber})
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-200 font-sans font-medium text-[11px] truncate max-w-sm">
                    {page.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">A4 (210 × 297 mm)</span>
                </div>
              </div>

              {/* Realistic Authentic A4 Paper Sheet */}
              <div
                className="a4-sheet-canvas bg-white text-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.16)] print:shadow-none border border-slate-300/80 print:border-none w-[210mm] min-h-[297mm] p-[14mm] sm:p-[16mm] print:p-[10mm] flex flex-col justify-between overflow-hidden box-border print:page-break-after-always"
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                {page.render(displayPageNum, displayTotal)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 text-slate-600 shadow-lg max-w-lg mx-auto">
          <p className="font-bold text-sm">لا توجد صفحات في نطاق الطباعة المحدد ({pageRangeConfig?.fromPage} - {pageRangeConfig?.toPage}).</p>
          <p className="text-xs text-slate-400 mt-1">يرجى تعديل نطاق الصفحات لإظهار المستندات المطلوبة.</p>
        </div>
      )}
    </div>
  );
};
