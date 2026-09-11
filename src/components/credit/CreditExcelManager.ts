import * as XLSX from 'xlsx';
import { FiscalYearData } from './CreditYearlyEditor';

export interface CreditExcelTemplateData {
  clientInfo: {
    companyName: string;
    commercialRegNo: string;
    taxRegNo: string;
    legalForm: string;
    activity: string;
    targetBank: string;
    requestedLoanAmount: number;
    interestRate: number;
    repaymentYears: number;
    facilityType: string;
    annualBankDeposits: number;
    collateralType: string;
    collateralMarketValue: number;
  };
  yearsData: Record<number, FiscalYearData>;
}

/**
 * Generates an annotated, highly readable Excel workbook template
 * designed for accountants and financial analysts to fill in credit dossier numbers.
 */
export function generateCreditDossierTemplate(
  yearsList: number[] = [2024, 2025, 2026],
  existingData?: Record<number, FiscalYearData>,
  clientName: string = 'شركة النيل للصناعات والتوريدات'
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: البيانات الأساسية والتسهيل المطلوب (Client & Loan Data)
  // -------------------------------------------------------------
  const clientRows = [
    { 'البيان الائتماني والبنكي': 'اسم المنشأة / الشركة', 'القيمة المدخلة': clientName, 'ملاحظات وتوجيهات': 'الاسم الرسمي المسجل بالسجل التجاري' },
    { 'البيان الائتماني والبنكي': 'الشكل القانوني', 'القيمة المدخلة': 'شركة مساهمة مصرية (ش.م.م)', 'ملاحظات وتوجيهات': 'مساهمة / ذات مسؤولية محدودة / فردية' },
    { 'البيان الائتماني والبنكي': 'رقم السجل التجاري', 'القيمة المدخلة': '109482', 'ملاحظات وتوجيهات': 'الرقم المعتمد' },
    { 'البيان الائتماني والبنكي': 'رقم التسجيل الضريبي', 'القيمة المدخلة': '492-817-302', 'ملاحظات وتوجيهات': '9 أرقام ضريبية' },
    { 'البيان الائتماني والبنكي': 'النشاط الرئيسي', 'القيمة المدخلة': 'تجاري وصناعي وتوريدات عامة', 'ملاحظات وتوجيهات': 'النشاط وفقاً للسجل والبطاقة' },
    { 'البيان الائتماني والبنكي': 'البنك المستهدف لطلب التمويل', 'القيمة المدخلة': 'البنك الأهلي المصري', 'ملاحظات وتوجيهات': 'الأهلي / مصر / CIB / QNB / التنمية الصناعية' },
    { 'البيان الائتماني والبنكي': 'نوع التسهيل المطلوب', 'القيمة المدخلة': 'حساب جاري مدين + اعتمادات مستندية', 'ملاحظات وتوجيهات': 'جاري مدين / قرض متوسط الأجل / مرابحة' },
    { 'البيان الائتماني والبنكي': 'مبلغ القرض / التسهيل المطلوب (ج.م)', 'القيمة المدخلة': 10000000, 'ملاحظات وتوجيهات': 'القيمة الكلية للتسهيل المطلوب بالجنيه' },
    { 'البيان الائتماني والبنكي': 'سعر الفائدة السنوي المتوقع %', 'القيمة المدخلة': 24.5, 'ملاحظات وتوجيهات': 'معدل الكوريدور أو فائدة المبادرة' },
    { 'البيان الائتماني والبنكي': 'مدة السداد بالسنوات', 'القيمة المدخلة': 3, 'ملاحظات وتوجيهات': 'للقروض متوسطة الأجل أو دورة التسهيل' },
    { 'البيان الائتماني والبنكي': 'إجمالي إيداعات كشف الحساب البنكي السنوي (ج.م)', 'القيمة المدخلة': 28500000, 'ملاحظات وتوجيهات': 'مجموع الحركات الدائنة بجميع البنوك لآخر 12 شهر' },
    { 'البيان الائتماني والبنكي': 'نوع الضمانة المعروضة للبنك', 'القيمة المدخلة': 'رهن عقاري وتجاري + التنازل عن مستحقات أوامر توريد', 'ملاحظات وتوجيهات': 'عقار / وديعة / آلات ومعدات / أوامر توريد' },
    { 'البيان الائتماني والبنكي': 'القيمة السوقية التقديرية للضمانة (ج.م)', 'القيمة المدخلة': 18000000, 'ملاحظات وتوجيهات': 'تقييم خبير معتمد أو مقيم عقاري' },
  ];
  const wsClient = XLSX.utils.json_to_sheet(clientRows);
  wsClient['!cols'] = [{ wch: 40 }, { wch: 35 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsClient, '1. بيانات التسهيل والضمانات');

  // -------------------------------------------------------------
  // Sheet 2: قائمة الدخل التقديرية والتاريخية (Income Statement)
  // -------------------------------------------------------------
  const isRows: any[] = [
    { 'بند قائمة الدخل': 'إيرادات المبيعات والنشاط', 'كود الربط': 'sales' },
    { 'بند قائمة الدخل': 'تكلفة المبيعات المباشرة (COGS)', 'كود الربط': 'cogs' },
    { 'بند قائمة الدخل': 'المصروفات الإدارية والعمومية', 'كود الربط': 'adminExp' },
    { 'بند قائمة الدخل': 'المصروفات البيعية والتسويقية', 'كود الربط': 'sellingExp' },
    { 'بند قائمة الدخل': 'إهلاك الأصول الثابتة السنوي', 'كود الربط': 'depreciation' },
    { 'بند قائمة الدخل': 'أعباء التمويل والفوائد البنكية', 'كود الربط': 'financeExp' },
    { 'بند قائمة الدخل': 'ضريبة الدخل المستحقة', 'كود الربط': 'tax' },
    { 'بند قائمة الدخل': 'صافي الأرباح بعد الضريبة', 'كود الربط': 'netProfit' },
  ];

  isRows.forEach((row) => {
    yearsList.forEach((yr) => {
      const yrData = existingData?.[yr];
      const key = row['كود الربط'] as keyof FiscalYearData;
      row[`سنة ${yr}`] = yrData && yrData[key] !== undefined ? yrData[key] : 0;
    });
  });

  const wsIS = XLSX.utils.json_to_sheet(isRows);
  wsIS['!cols'] = [{ wch: 38 }, { wch: 15 }, ...yearsList.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, wsIS, '2. قائمة الدخل');

  // -------------------------------------------------------------
  // Sheet 3: قائمة المركز المالي (Balance Sheet)
  // -------------------------------------------------------------
  const bsRows: any[] = [
    { 'بند المركز المالي': 'صافي الأصول الثابتة', 'كود الربط': 'netFixedAssets', 'التبويب': 'أصول غير متداولة' },
    { 'بند المركز المالي': 'مشروعات تحت التنفيذ', 'كود الربط': 'projectsInProgress', 'التبويب': 'أصول غير متداولة' },
    { 'بند المركز المالي': 'المخزون السلعي والبضاعة', 'كود الربط': 'inventory', 'التبويب': 'أصول متداولة' },
    { 'بند المركز المالي': 'العملاء وأوراق القبض', 'كود الربط': 'receivables', 'التبويب': 'أصول متداولة' },
    { 'بند المركز المالي': 'أرصدة مدينة أخرى وتأمينات', 'كود الربط': 'otherDebit', 'التبويب': 'أصول متداولة' },
    { 'بند المركز المالي': 'النقدية بالصندوق والبنوك', 'كود الربط': 'cash', 'التبويب': 'أصول متداولة' },
    { 'بند المركز المالي': 'رأس المال المدفوع', 'كود الربط': 'paidUpCapital', 'التبويب': 'حقوق الملكية' },
    { 'بند المركز المالي': 'الاحتياطي القانوني والنظامي', 'كود الربط': 'legalReserve', 'التبويب': 'حقوق الملكية' },
    { 'بند المركز المالي': 'الأرباح المرحلة وصافي ربح العام', 'كود الربط': 'retainedEarningsAndProfit', 'التبويب': 'حقوق الملكية' },
    { 'بند المركز المالي': 'قروض وتسهيلات طويلة الأجل', 'كود الربط': 'longLoans', 'التبويب': 'التزامات غير متداولة' },
    { 'بند المركز المالي': 'الموردون وأوراق الدفع', 'كود الربط': 'suppliers', 'التبويب': 'التزامات متداولة' },
    { 'بند المركز المالي': 'تسهيلات بنكية قصيرة الأجل (سحب على المكشوف)', 'كود الربط': 'shortLoans', 'التبويب': 'التزامات متداولة' },
    { 'بند المركز المالي': 'أرصدة دائنة ومخصصات أخرى', 'كود الربط': 'otherCurrentLiab', 'التبويب': 'التزامات متداولة' },
  ];

  bsRows.forEach((row) => {
    yearsList.forEach((yr) => {
      const yrData = existingData?.[yr];
      const key = row['كود الربط'] as keyof FiscalYearData;
      row[`سنة ${yr}`] = yrData && yrData[key] !== undefined ? yrData[key] : 0;
    });
  });

  const wsBS = XLSX.utils.json_to_sheet(bsRows);
  wsBS['!cols'] = [{ wch: 42 }, { wch: 20 }, { wch: 22 }, ...yearsList.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, wsBS, '3. المركز المالي');

  // -------------------------------------------------------------
  // Sheet 4: دليل إرشادات وتوجيهات المحاسب القانوني (Guidelines)
  // -------------------------------------------------------------
  const guideRows = [
    { 'الإرشاد المحاسبي': '1. عمود كود الربط', 'الشرح والتوضيح': 'يرجى عدم تغيير أسماء كود الربط بالإنجليزية لأن البرنامج يستخدمه لقراءة الأرقام آلياً وبسرعة فائقة دون أخطاء.' },
    { 'الإرشاد المحاسبي': '2. توازن الميزانية', 'الشرح والتوضيح': 'يجب التأكد من أن (الأصول = الالتزامات + حقوق الملكية). إذا وجد فارق سيقوم البرنامج بتنبيهك أو موازنته عبر الأرباح المرحلة.' },
    { 'الإرشاد المحاسبي': '3. استيراد الملف', 'الشرح والتوضيح': 'بعد حفظ التعديلات على ملف الإكسيل، اضغط على زر (استيراد ملف إكسيل) في الملف الائتماني وسيتم تحديث كافة التحليلات والمذكرات فوراً.' },
    { 'الإرشاد المحاسبي': '4. إضافة سنوات إضافية', 'الشرح والتوضيح': 'يمكنك إضافة أعمدة لسنوات قادمة مثل (سنة 2027) أو (سنة 2028) وسيقوم البرنامج باكتشافها وإضافتها تلقائياً.' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 28 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, '4. إرشادات الاستيراد');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

/**
 * Parses uploaded Excel or CSV file arrayBuffer and returns structured financial data
 */
export function parseUploadedCreditExcel(fileBuffer: ArrayBuffer): {
  success: boolean;
  yearsDetected: number[];
  parsedYearsData: Record<number, Partial<FiscalYearData>>;
  clientMetadata?: Partial<CreditExcelTemplateData['clientInfo']>;
  error?: string;
} {
  try {
    const wb = XLSX.read(fileBuffer, { type: 'array' });
    const sheetNames = wb.SheetNames;

    if (!sheetNames.length) {
      return { success: false, yearsDetected: [], parsedYearsData: {}, error: 'الملف المرفوع فارغ ولا يحتوي على أوراق عمل.' };
    }

    const parsedYearsData: Record<number, Partial<FiscalYearData>> = {};
    const detectedYearsSet = new Set<number>();
    const clientMetadata: Partial<CreditExcelTemplateData['clientInfo']> = {};

    // 1. Check Sheet 1 (Client & Loan Info)
    const clientSheet = wb.Sheets['1. بيانات التسهيل والضمانات'] || wb.Sheets[sheetNames[0]];
    if (clientSheet) {
      const clientJson: any[] = XLSX.utils.sheet_to_json(clientSheet);
      clientJson.forEach((row) => {
        const key = String(row['البيان الائتماني والبنكي'] || row['البيان'] || row['بيان'] || '').trim();
        const val = row['القيمة المدخلة'] || row['القيمة'] || row['البيانات'] || '';

        if (key.includes('اسم المنشأة') || key.includes('اسم الشركة')) clientMetadata.companyName = String(val).trim();
        if (key.includes('السجل التجاري')) clientMetadata.commercialRegNo = String(val).trim();
        if (key.includes('التسجيل الضريبي')) clientMetadata.taxRegNo = String(val).trim();
        if (key.includes('الشكل القانوني')) clientMetadata.legalForm = String(val).trim();
        if (key.includes('النشاط')) clientMetadata.activity = String(val).trim();
        if (key.includes('البنك المستهدف')) clientMetadata.targetBank = String(val).trim();
        if (key.includes('مبلغ القرض') || key.includes('التسهيل المطلوب')) clientMetadata.requestedLoanAmount = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
        if (key.includes('سعر الفائدة')) clientMetadata.interestRate = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
        if (key.includes('مدة السداد')) clientMetadata.repaymentYears = parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 3;
        if (key.includes('إيداعات كشف الحساب')) clientMetadata.annualBankDeposits = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
        if (key.includes('الضمانة المعروضة')) clientMetadata.collateralType = String(val).trim();
        if (key.includes('القيمة السوقية للضمانة')) clientMetadata.collateralMarketValue = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
      });
    }

    // Helper to process Income Statement & Balance Sheet rows
    const processFinancialSheet = (sheet: XLSX.WorkSheet) => {
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      rows.forEach((row) => {
        // Find property name either via 'كود الربط' or Arabic name
        let propKey: keyof FiscalYearData | null = null;
        const code = String(row['كود الربط'] || '').trim();
        const arabicDesc = String(row['بند قائمة الدخل'] || row['بند المركز المالي'] || row['البيان'] || row['البند'] || '').trim();

        if (code && code in FIELD_MAPPING_REVERSE) {
          propKey = code as keyof FiscalYearData;
        } else {
          propKey = resolveFieldByArabic(arabicDesc);
        }

        if (!propKey) return;

        // Iterate over columns to find year columns e.g. "سنة 2026" or "2026"
        Object.keys(row).forEach((colName) => {
          const yearMatch = colName.match(/(\d{4})/);
          if (yearMatch) {
            const yr = parseInt(yearMatch[1], 10);
            if (yr >= 2000 && yr <= 2050) {
              detectedYearsSet.add(yr);
              if (!parsedYearsData[yr]) {
                parsedYearsData[yr] = { year: yr };
              }

              const numVal = parseFloat(String(row[colName]).replace(/,/g, ''));
              if (!isNaN(numVal)) {
                (parsedYearsData[yr] as any)[propKey!] = Math.abs(numVal);
              }
            }
          }
        });
      });
    };

    // Scan all sheets for financial tables
    sheetNames.forEach((name) => {
      if (name.includes('قائمة الدخل') || name.includes('المركز المالي') || name.includes('2.') || name.includes('3.') || name.includes('قوائم')) {
        processFinancialSheet(wb.Sheets[name]);
      }
    });

    const yearsDetected = Array.from(detectedYearsSet).sort((a, b) => a - b);

    if (!yearsDetected.length) {
      // Fallback: try parsing every sheet
      sheetNames.forEach((name) => processFinancialSheet(wb.Sheets[name]));
    }

    const finalYears = Array.from(detectedYearsSet).sort((a, b) => a - b);

    return {
      success: finalYears.length > 0,
      yearsDetected: finalYears.length > 0 ? finalYears : [2024, 2025, 2026],
      parsedYearsData,
      clientMetadata,
    };
  } catch (err: any) {
    return {
      success: false,
      yearsDetected: [],
      parsedYearsData: {},
      error: `فشل قراءة ملف الإكسيل: ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}

const FIELD_MAPPING_REVERSE: Record<string, keyof FiscalYearData> = {
  sales: 'sales',
  cogs: 'cogs',
  grossProfit: 'grossProfit',
  adminExp: 'adminExp',
  sellingExp: 'sellingExp',
  depreciation: 'depreciation',
  financeExp: 'financeExp',
  tax: 'tax',
  netProfit: 'netProfit',
  netFixedAssets: 'netFixedAssets',
  projectsInProgress: 'projectsInProgress',
  inventory: 'inventory',
  receivables: 'receivables',
  otherDebit: 'otherDebit',
  cash: 'cash',
  paidUpCapital: 'paidUpCapital',
  legalReserve: 'legalReserve',
  retainedEarningsAndProfit: 'retainedEarningsAndProfit',
  longLoans: 'longLoans',
  suppliers: 'suppliers',
  shortLoans: 'shortLoans',
  otherCurrentLiab: 'otherCurrentLiab',
};

function resolveFieldByArabic(text: string): keyof FiscalYearData | null {
  const t = text.trim();
  if (t.includes('مبيعات') || t.includes('إيراد')) return 'sales';
  if (t.includes('تكلفة المبيعات') || t.includes('تكلفة النشاط') || t.includes('COGS')) return 'cogs';
  if (t.includes('مجمل الربح')) return 'grossProfit';
  if (t.includes('إدارية') || t.includes('عمومية')) return 'adminExp';
  if (t.includes('تسويقية') || t.includes('بيعية')) return 'sellingExp';
  if (t.includes('إهلاك')) return 'depreciation';
  if (t.includes('تمويل') || t.includes('فوائد بنكية') || t.includes('أعباء تمويل')) return 'financeExp';
  if (t.includes('ضريبة')) return 'tax';
  if (t.includes('صافي الربح') || t.includes('صافي أرباح')) return 'netProfit';
  if (t.includes('أصول ثابتة') || t.includes('صافي الأصول')) return 'netFixedAssets';
  if (t.includes('مشروعات تحت التنفيذ')) return 'projectsInProgress';
  if (t.includes('مخزون') || t.includes('بضائع')) return 'inventory';
  if (t.includes('عملاء') || t.includes('أوراق قبض') || t.includes('مدينون')) return 'receivables';
  if (t.includes('أرصدة مدينة')) return 'otherDebit';
  if (t.includes('نقدية') || t.includes('صندوق') || t.includes('بنوك')) return 'cash';
  if (t.includes('رأس المال المدفوع') || t.includes('رأس المال المصدر')) return 'paidUpCapital';
  if (t.includes('احتياطي')) return 'legalReserve';
  if (t.includes('أرباح مرحلة')) return 'retainedEarningsAndProfit';
  if (t.includes('طويلة الأجل') || t.includes('قروض طويلة')) return 'longLoans';
  if (t.includes('موردون') || t.includes('أوراق دفع') || t.includes('دائنون')) return 'suppliers';
  if (t.includes('قصيرة الأجل') || t.includes('سحب على المكشوف') || t.includes('جاري مدين')) return 'shortLoans';
  if (t.includes('أرصدة دائنة') || t.includes('مخصصات')) return 'otherCurrentLiab';
  return null;
}
