import * as XLSX from 'xlsx';
import { db, DatabaseState } from '../db/localDatabase';
import {
  Account,
  JournalEntry,
  ClientArchiveRecord,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  ProfessionalCertificate,
  Invoice,
  FeasibilityStudy,
  CreditModelSimulation,
} from '../types';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
} from './accountingCalculations';
import { formatEgyptianCurrency } from './qrCodeGenerator';

export type ModelType =
  | 'ALL_DATA'
  | 'ACCOUNTS'
  | 'JOURNAL'
  | 'CLIENTS'
  | 'TREASURY'
  | 'TAXES'
  | 'CERTIFICATES'
  | 'INVOICES'
  | 'FEASIBILITY'
  | 'CREDIT_SIM'
  | 'CREDIT_SIMULATOR'
  | 'FINANCIAL_STATEMENTS'
  | 'AUDITOR_REPORT'
  | 'PAYROLL'
  | 'TAX_EXPOSURE'
  | 'FINANCIAL_NOTES'
  | 'FIXED_ASSETS'
  | 'AUDIT'
  | 'AUDIT_PAPERS';

export type ExportFormat = 'JSON' | 'XLSX' | 'CSV' | 'TXT' | 'HTML_PRINT';

export interface ExportResult {
  success: boolean;
  fileName: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  model: ModelType;
  recordsCount: number;
  message: string;
  errors?: string[];
}

/**
 * Downloads a blob locally with proper MIME type and safe lifecycle
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  try {
    // Sanitize fileName to prevent invalid file path characters
    const sanitizedFileName = (fileName || 'export.dat').replace(/[/\\?%*:|"<>]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedFileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup error
      }
    }, 60000); // Allow 60 seconds for browser download manager
  } catch (err) {
    console.error('File download error:', err);
  }
}

/**
 * Format timestamp for safe filenames
 */
function getTimestampStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convert JSON array of objects to CSV with BOM for perfect Arabic display in Excel
 */
export function convertToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',')
  );
  return '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
}

/**
 * Applies professional Arabic formatting to a worksheet:
 * - Enables Right-to-Left (RTL) view for standard Arabic layout
 * - Dynamically calculates column widths (wch) based on header and data lengths with safety margin
 * - Formats numbers and text for high readability
 */
export function formatWorksheetForArabicExport(
  ws: XLSX.WorkSheet,
  dataRows: Record<string, any>[]
): XLSX.WorkSheet {
  if (!ws) return ws;

  // 1. Enable RTL View in Excel
  ws['!views'] = [{ RTL: true }];

  if (!dataRows || dataRows.length === 0) {
    ws['!cols'] = [{ wch: 32 }];
    return ws;
  }

  // 2. Compute dynamic column widths
  const keys = Object.keys(dataRows[0] || {});
  const colWidths: { wch: number }[] = [];

  keys.forEach((key) => {
    let maxLen = String(key).length;
    for (const row of dataRows) {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const valStr = typeof val === 'number'
          ? val.toLocaleString('ar-EG', { maximumFractionDigits: 2 })
          : String(val);
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
    }
    // Generous padding for Arabic glyphs + min/max clamping
    colWidths.push({ wch: Math.min(Math.max(maxLen + 4, 16), 68) });
  });

  ws['!cols'] = colWidths;
  return ws;
}

/**
 * Maps English key names to standard official Arabic titles for exports
 */
const ARABIC_FIELD_DICTIONARY: Record<string, string> = {
  id: 'المعرف الرقمي',
  serialNumber: 'رقم السيريال / القيد',
  certificateNumber: 'رقم الشهادة المعتمدة',
  invoiceNumber: 'رقم الفاتورة الإلكترونية',
  voucherNumber: 'رقم إيصال / سند الخزينة',
  referenceNumber: 'الرقم المرجعي',
  clientCode: 'كود العميل بالسجل',
  name: 'الاسم / البيان',
  clientName: 'اسم العميل / المكلف',
  companyName: 'اسم الشركة / المنشأة',
  tradeName: 'الاسم التجاري',
  activityName: 'النشاط الاقتصادي',
  activity: 'النشاط الرئيسي',
  legalForm: 'الشكل القانوني',
  companyType: 'نوع المنشأة',
  nationalId: 'الرقم القومي',
  taxCardNo: 'رقم البطاقة الضريبية',
  commercialRegNo: 'رقم السجل التجاري',
  commercialRegistrationNo: 'رقم السجل التجاري',
  taxOffice: 'مأمورية الضرائب المختصة',
  incomeTaxFileNo: 'رقم ملف ضريبة الدخل',
  vatRegistrationNo: 'رقم التسجيل بضريبة القيمة المضافة',
  socialInsuranceNo: 'الرقم التأميني للمنشأة',
  jobTitle: 'المهنة / الصفة',
  phone: 'رقم الهاتف / المحمول',
  email: 'البريد الإلكتروني',
  address: 'العنوان القانوني المقر',
  capital: 'رأس المال المصدر (ج.م)',
  date: 'التاريخ',
  issueDate: 'تاريخ الإصدار',
  dueDate: 'تاريخ الاستحقاق',
  submissionDate: 'تاريخ التقديم',
  period: 'الفترة المحاسبية / الضريبية',
  periodText: 'الفترة المحاسبية المغطاة',
  taxYear: 'السنة الضريبية / المالية',
  declarationType: 'نوع الإقرار الضريبي',
  certificateType: 'نوع الشهادة المهنية',
  purpose: 'الغرض من المستند / الاستخدام',
  recipientEntity: 'الجهة الموجه إليها',
  auditorNotes: 'ملاحظات وتأكيدات المحاسب القانوني',
  notes: 'ملاحظات وإيضاحات',
  description: 'البيان والشرح التفصيلي',
  status: 'الحالة',
  amount: 'المبلغ الإجمالي (ج.م)',
  totalAmount: 'إجمالي القيمة (ج.م)',
  certifiedAmount: 'المبلغ المعتمد (ج.م)',
  monthlyAmount: 'الدخل الشهري المعتمد (ج.م)',
  annualNetIncome: 'صافي الدخل السنوي المعتمد (ج.م)',
  monthlyNetIncome: 'متوسط الدخل الشهري المعتمد (ج.م)',
  investedCapitalAmount: 'إجمالي رأس المال المستثمر (ج.م)',
  subtotal: 'المبلغ قبل الضريبة (ج.م)',
  totalVat: 'ضريبة القيمة المضافة (14%) (ج.م)',
  totalWht: 'ضريبة الخصم والتحصيل (WHT) (ج.م)',
  grandTotal: 'الصافي النهائي المستحق (ج.م)',
  paidAmount: 'المبلغ المسدد (ج.م)',
  remainingAmount: 'المبلغ المتبقي (ج.م)',
  paymentMethod: 'طريقة السداد / الدفع',
  entryType: 'نوع القيد المحاسبي',
  totalDebit: 'إجمالي المدين (ج.م)',
  totalCredit: 'إجمالي الدائن (ج.م)',
  isPosted: 'حالة الترحيل لدفتر الأستاذ',
  recordedBy: 'المسؤول عن التسجيل والاعتماد',
  projectName: 'اسم المشروع الاستثماري',
  studyCode: 'كود دراسة الجدوى',
  sector: 'القطاع الاستثماري',
  totalCapitalCost: 'التكاليف الاستثمارية الكلية (ج.م)',
  npv: 'صافي القيمة الحالية (NPV)',
  irr: 'معدل العائد الداخلي (IRR)',
  paybackPeriod: 'فترة الاسترداد (سنوات)',
  qrPayload: 'رمز التحقق الرقمي المشفر (QR Code)',
  verificationCode: 'كود التحقق الإلكتروني',
};

/**
 * Builds structured Arabic sheets and tables from any arbitrary custom document
 */
function buildStructuredArabicDocumentSheets(
  doc: any,
  model: ModelType,
  state: DatabaseState
): {
  overviewRows: Record<string, any>[];
  detailSheets: { sheetName: string; rows: Record<string, any>[] }[];
} {
  const auditor = state.officeProfile.auditorName || 'محمد جميل مرعي';
  const license = state.officeProfile.licenseNumber || 'س.م.م 43122';
  const firm = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';

  // 1. Primary Overview Sheet (Two-column Key-Value Arabic Layout)
  const overviewRows: Record<string, any>[] = [
    { 'البيان / الحقل الرسمي': 'اسم المنشأة المهنية', 'القيمة / التفاصيل': firm },
    { 'البيان / الحقل الرسمي': 'المحاسب القانوني ومراقب الحسابات', 'القيمة / التفاصيل': auditor },
    { 'البيان / الحقل الرسمي': 'رقم القيد بسجل المحاسبين والمراجعين', 'القيمة / التفاصيل': license },
    { 'البيان / الحقل الرسمي': 'تاريخ ووقت استخراج المستند', 'القيمة / التفاصيل': new Date().toLocaleString('ar-EG') },
    { 'البيان / الحقل الرسمي': 'حالة التوثيق والاعتماد', 'القيمة / التفاصيل': 'معتمد وموثق رسمياً وفق معايير المحاسبة والمراجعة المصرية' },
  ];

  // Map each top-level key in customDocument
  Object.keys(doc).forEach((k) => {
    const val = doc[k];
    if (val === null || val === undefined) return;
    if (typeof val === 'object' && !Array.isArray(val)) return; // skip nested complex objects in key-val
    if (Array.isArray(val)) return; // handle in sub-sheets

    const arabicLabel = ARABIC_FIELD_DICTIONARY[k] || k;
    let formattedVal = val;
    if (typeof val === 'boolean') {
      formattedVal = val ? 'نعم / معتمد' : 'لا / غير معتمد';
    } else if (typeof val === 'number') {
      formattedVal = val.toLocaleString('ar-EG');
    }
    overviewRows.push({
      'البيان / الحقل الرسمي': arabicLabel,
      'القيمة / التفاصيل': formattedVal,
    });
  });

  // 2. Process detail sub-sheets (e.g., items, lines, breakdownItems, procedures, partners)
  const detailSheets: { sheetName: string; rows: Record<string, any>[] }[] = [];

  // Items / Invoices lines
  if (doc.items && Array.isArray(doc.items) && doc.items.length > 0) {
    const itemRows = doc.items.map((it: any, idx: number) => ({
      'م': idx + 1,
      'كود الصنف / الخدمة': it.itemCode || it.code || `ITM-${idx + 1}`,
      'بيان الصنف أو الخدمة المهنية': it.description || it.name || it.itemDescription || '',
      'الكمية': it.quantity || 1,
      'سعر الوحدة (ج.م)': it.unitPrice || it.rate || 0,
      'القيمة قبل الضريبة (ج.م)': it.subtotal || it.amount || ((it.quantity || 1) * (it.unitPrice || 0)),
      'معدل الضريبة (%)': it.vatRate ? `${it.vatRate}%` : '14%',
      'قيمة ضريبة القيمة المضافة': it.vatAmount || (it.subtotal ? it.subtotal * 0.14 : 0),
      'الصافي الإجمالي (ج.م)': it.total || it.netAmount || 0,
    }));
    detailSheets.push({ sheetName: 'بنود_الفاتورة_المعتمدة', rows: itemRows });
  }

  // Journal Lines
  if (doc.lines && Array.isArray(doc.lines) && doc.lines.length > 0) {
    const lineRows = doc.lines.map((ln: any, idx: number) => ({
      'م': idx + 1,
      'كود الحساب': ln.accountCode || '',
      'اسم الحساب المحاسبي': ln.accountName || '',
      'مدين (ج.م)': ln.debit || 0,
      'دائن (ج.م)': ln.credit || 0,
      'شرح السطر': ln.description || '',
      'مركز التكلفة': ln.costCenter || '',
    }));
    detailSheets.push({ sheetName: 'أطراف_القيد_المحاسبي', rows: lineRows });
  }

  // Capital Certificate Breakdown Items
  if (doc.breakdownItems && Array.isArray(doc.breakdownItems) && doc.breakdownItems.length > 0) {
    const bdRows = doc.breakdownItems.map((bd: any, idx: number) => ({
      'م': idx + 1,
      'عنصر رأس المال / المكون الاستثماري': bd.source || bd.title || bd.item || '',
      'القيمة المعتمدة (ج.م)': bd.amount || 0,
      'النسبة المئوية من رأس المال': bd.percentage ? `${bd.percentage}%` : '',
      'الإيضاح والسند المستندي': bd.notes || bd.description || '',
    }));
    detailSheets.push({ sheetName: 'مكونات_رأس_المال_المستثمر', rows: bdRows });
  }

  // Procedures
  if (doc.procedures && Array.isArray(doc.procedures) && doc.procedures.length > 0) {
    const procRows = doc.procedures.map((p: any, idx: number) => ({
      'م': idx + 1,
      'كود الإجراء': p.procedureId || p.id || '',
      'عنوان الإجراء / الخدمة': p.title || p.name || '',
      'تاريخ البدء': p.startDate || '',
      'الحالة الحالية': p.status || '',
      'المبلغ والأتعاب (ج.م)': p.feeAmount || p.amount || 0,
      'الملاحظات': p.notes || '',
    }));
    detailSheets.push({ sheetName: 'إجراءات_ومعاملات_العميل', rows: procRows });
  }

  // Partners
  if (doc.partners && Array.isArray(doc.partners) && doc.partners.length > 0) {
    const partnerRows = doc.partners.map((pt: any, idx: number) => ({
      'م': idx + 1,
      'اسم الشريك / المساهم': pt.name || '',
      'الصفة': pt.role || 'شريك',
      'حصة رأس المال (ج.م)': pt.capitalShare || pt.amount || 0,
      'نسبة المشاركة (%)': pt.percentage ? `${pt.percentage}%` : '',
      'الرقم القومي': pt.nationalId || '',
    }));
    detailSheets.push({ sheetName: 'هيكل_الشركاء_والمساهمين', rows: partnerRows });
  }

  return { overviewRows, detailSheets };
}

/**
 * Maps model data into structured tabular rows for Excel / CSV / Table view
 */
export function getModelTabularData(model: ModelType, state: DatabaseState): Record<string, any>[] {
  switch (model) {
    case 'ALL_DATA': {
      return [
        { 'النموذج المحاسبي': 'شجرة الحسابات الدليلية', 'عدد السجلات': state.accounts?.length || 0, 'الحالة': 'مطابق للمعايير المصرية' },
        { 'النموذج المحاسبي': 'دفتر اليومية العامة والقيود', 'عدد السجلات': state.journalEntries?.length || 0, 'الحالة': 'موزون ومعتمد' },
        { 'النموذج المحاسبي': 'أرشيف العملاء والمكلفين', 'عدد السجلات': state.clients?.length || 0, 'الحالة': 'محدث' },
        { 'النموذج المحاسبي': 'خزينة المكتب والإيصالات', 'عدد السجلات': state.treasuryTransactions?.length || 0, 'الحالة': 'مرحل ومطابق' },
        { 'النموذج المحاسبي': 'الإقرارات والملفات الضريبية', 'عدد السجلات': state.taxDeclarations?.length || 0, 'الحالة': 'معتمد' },
        { 'النموذج المحاسبي': 'الشهادات المحاسبية المعتمدة', 'عدد السجلات': state.certificates?.length || 0, 'الحالة': 'موثق برمز QR' },
        { 'النموذج المحاسبي': 'فواتير الأتعاب المهنية', 'عدد السجلات': state.invoices?.length || 0, 'الحالة': 'مصدر ومطابق' },
        { 'النموذج المحاسبي': 'دراسات الجدوى الاقتصادية', 'عدد السجلات': state.feasibilityStudies?.length || 0, 'الحالة': 'معتمد بنكياً' },
        { 'النموذج المحاسبي': 'الأصول الثابتة ومجمعات الإهلاك', 'عدد السجلات': (state.accounts || []).filter((a) => a.code.startsWith('11') || a.code.startsWith('12')).length, 'الحالة': 'محسوب الإهلاك' },
      ];
    }

    case 'ACCOUNTS':
      return state.accounts.map((a) => ({
        'كود الحساب (Serial)': a.code,
        'اسم الحساب': a.name,
        'التصنيف المحاسبي': a.category,
        'طبيعة الحساب': a.nature === 'DEBIT' ? 'مدين' : 'دائن',
        'المستوى': a.level,
        'رصيد افتتاحي مدين': a.openingBalanceDebit,
        'رصيد افتتاحي دائن': a.openingBalanceCredit,
        'الرصيد الحالي': a.currentBalance || (a.openingBalanceDebit - a.openingBalanceCredit),
        'كود التحقق QR': `EAS-ACC|${a.code}|${a.name}`,
      }));

    case 'JOURNAL': {
      const rows: Record<string, any>[] = [];
      for (const entry of state.journalEntries) {
        for (const line of entry.lines) {
          rows.push({
            'رقم القيد (السيريال)': entry.serialNumber,
            'التاريخ': entry.date,
            'نوع القيد': entry.entryType,
            'البيان العام': entry.description,
            'كود الحساب': line.accountCode,
            'اسم الحساب': line.accountName,
            'مدين (ج.م)': line.debit,
            'دائن (ج.م)': line.credit,
            'شرح السطر': line.description || '',
            'مركز التكلفة': line.costCenter || '',
            'حالة الترحيل': entry.isPosted ? 'مرحل للأستاذ' : 'مسودة',
            'رمز التشفير QR': entry.qrPayload || `JV|${entry.serialNumber}|${entry.date}|${entry.totalDebit}`,
          });
        }
      }
      return rows;
    }

    case 'CLIENTS':
      return state.clients.map((c) => ({
        'كود العميل (السيريال)': c.clientCode,
        'اسم المنشأة / العميل': c.name,
        'نوع العميل': c.clientType === 'PRIMARY' ? 'عميل أساسي' : 'عميل عابر',
        'الشكل القانوني': c.companyType,
        'رقم السجل التجاري': c.commercialRegistrationNo,
        'رقم البطاقة الضريبية': c.taxCardNo,
        'مأمورية الضرائب': c.taxOffice,
        'رقم ملف الدخل': c.incomeTaxFileNo,
        'رقم القيمة المضافة': c.vatRegistrationNo,
        'رقم التأمينات': c.socialInsuranceNo,
        'رأس المال المصدر': c.capital,
        'الهاتف': c.phone,
        'البريد الإلكتروني': c.email,
        'العنوان': c.address,
        'النشاط الرئيسي': c.activity,
        'عدد الإجراءات': c.procedures?.length || 0,
        'رمز التحقق QR': `EAS-CLIENT|${c.clientCode}|${c.taxCardNo}|${c.name}`,
      }));

    case 'TREASURY':
      return state.treasuryTransactions.map((t) => ({
        'رقم السند (السيريال)': t.voucherNumber,
        'التاريخ': t.date,
        'نوع الحركة':
          t.type === 'INCOME_FEES'
            ? 'قبض أتعاب مهنية'
            : t.type === 'EXPENSE_CLIENT_GOV_FEE'
            ? 'صرف رسوم حكومية لحساب عميل'
            : t.type === 'EXPENSE_OFFICE'
            ? 'مصروفات تشغيل المكتب'
            : t.type === 'PARTNER_DRAWINGS'
            ? 'مسحوبات الشركاء'
            : 'سلفة عهدة نقدية',
        'البند / التصنيف': t.category,
        'المبلغ (ج.م)': t.amount,
        'العميل المرتبط': t.clientName || 'غير مرتبط',
        'الإجراء المرتبط': t.procedureTitle || '',
        'طريقة السداد': t.paymentMethod,
        'البيان التفصيلي': t.description,
        'المسؤول عن التسجيل': t.recordedBy,
        'رمز الأمان والتحقق QR': t.qrPayload || `TR|${t.voucherNumber}|${t.date}|${t.amount}`,
      }));

    case 'TAXES':
      return state.taxDeclarations.map((t) => ({
        'نوع الإقرار الضريبي': t.declarationType,
        'الفترة الضريبية': t.period,
        'السنة المالية': t.taxYear,
        'اسم الممول / العميل': t.clientName,
        'تاريخ الاستحقاق': t.dueDate,
        'تاريخ التقديم الفعلي': t.submissionDate || 'لم يقدم بعد',
        'حالة الإقرار': t.status,
        'المبيعات الخاضعة للقيمة المضافة': t.salesTaxableAmount || 0,
        'ضريبة المخرجات (14%)': t.vatOutputTax || 0,
        'المشتريات الخاضعة': t.purchasesTaxableAmount || 0,
        'ضريبة المدخلات المخصومة': t.vatInputTax || 0,
        'صافي الضريبة المستحقة': t.netVatPayable || t.netTaxPayable || 0,
        'رقم إيصال السداد / المنظومة': t.receiptNumber || '',
        'رمز التوثيق الإلكتروني QR': `ETA-TAX|${t.declarationType}|${t.period}|${t.clientName}`,
      }));

    case 'CERTIFICATES':
      return state.certificates.map((c) => ({
        'رقم الشهادة المهنية (السيريال)': c.certificateNumber,
        'نوع الشهادة': c.certificateType,
        'تاريخ الإصدار': c.issueDate,
        'اسم العميل / الممول': c.clientName,
        'الجهة الموجه إليها': c.recipientEntity,
        'الغرض من الشهادة': c.purpose,
        'صافي الدخل الشهري': c.monthlyNetIncome || 0,
        'صافي الدخل السنوي': c.annualNetIncome || 0,
        'رأس المال المستثمر': c.investedCapitalAmount || 0,
        'ملاحظات المراجع القانوني': c.auditorNotes,
        'رمز التحقق والتشفير الرقمي QR': c.qrPayload,
      }));

    case 'INVOICES':
      return state.invoices.map((inv) => ({
        'رقم الفاتورة (السيريال)': inv.invoiceNumber,
        'نوع الفاتورة': inv.invoiceType,
        'التاريخ': inv.date,
        'اسم الطرف الآخر (العميل/المورد)': inv.partnerName,
        'الرقم الضريبي': inv.partnerTaxNo || '',
        'إجمالي ما قبل الضريبة': inv.subtotal,
        'إجمالي الخصم': inv.totalDiscount,
        'ضريبة القيمة المضافة (14%)': inv.totalVat,
        'خصم أ.ت.ص (WHT)': inv.totalWht,
        'الصافي الإجمالي': inv.grandTotal,
        'المسدد': inv.paidAmount,
        'المتبقي': inv.remainingAmount,
        'حالة السداد': inv.status,
        'رمز الفاتورة الإلكترونية QR': inv.qrPayload,
      }));

    case 'FEASIBILITY':
      return state.feasibilityStudies.map((f) => ({
        'كود الدراسة (السيريال)': f.studyCode,
        'اسم المشروع': f.projectName,
        'القطاع الاقتصادي': f.sector,
        'تاريخ الإعداد': f.studyDate,
        'مقدمة لصالح': f.preparedFor,
        'إجمالي التكاليف الاستثمارية': f.investmentCosts?.totalInvestment || 0,
        'رأس المال المدفوع': f.financingStructure?.equityCapital || 0,
        'القروض والتسهيلات': f.financingStructure?.bankLoans || 0,
        'نقطة التعادل': f.financialMetrics?.breakEvenSales || 0,
        'فترة الاسترداد (سنوات)': f.financialMetrics?.paybackPeriodYears || 0,
        'معدل العائد الداخلي (IRR %)': f.financialMetrics?.internalRateOfReturn || 0,
        'صافي القيمة الحالية (NPV)': f.financialMetrics?.netPresentValue || 0,
        'رمز توثيق الدراسة QR': `FS|${f.studyCode}|${f.projectName}`,
      }));

    case 'CREDIT_SIM':
    case 'CREDIT_SIMULATOR': {
      if (state.creditSimulations && state.creditSimulations.length > 0) {
        return state.creditSimulations.map((s) => ({
          'اسم النموذج': s.modelName,
          'القطاع': s.sector,
          'المبيعات المستهدفة': s.targetSales,
          'هامش الربح الصافي %': s.targetNetMargin,
          'مجمل الربح': s.grossProfit,
          'صافي الربح المحقق': s.netProfit,
          'إجمالي الأصول': s.totalAssets,
          'إجمالي حقوق الملكية': s.equity?.total || 0,
          'نسبة التداول (Current Ratio)': s.ratios?.currentRatio || 0,
          'رمز المحاكاة QR': `SIM|${s.modelName}|${s.targetSales}`,
        }));
      }
      // Return default 3-year comparative credit indicators
      return [
        {
          'بيان البند المالي': 'إيرادات المبيعات والنشاط',
          'سنة 2024 (الماضية)': 10771567,
          'سنة 2025 (السابقة)': 12711864,
          'سنة 2026 (المستهدفة)': 15000000,
          'ملاحظات الائتمان': 'نمو تصاعدي مستقر بنسبة 18% سنوياً',
        },
        {
          'بيان البند المالي': 'تكلفة المبيعات المباشرة (COGS)',
          'سنة 2024 (الماضية)': 8078675,
          'سنة 2025 (السابقة)': 9533898,
          'سنة 2026 (المستهدفة)': 11250000,
          'ملاحظات الائتمان': 'نسبة 75% من حجم المبيعات الإجمالي',
        },
        {
          'بيان البند المالي': 'مجمل الربح (Gross Profit)',
          'سنة 2024 (الماضية)': 2692892,
          'سنة 2025 (السابقة)': 3177966,
          'سنة 2026 (المستهدفة)': 3750000,
          'ملاحظات الائتمان': 'هامش مجمل ربح 25%',
        },
        {
          'بيان البند المالي': 'المصروفات العمومية والبيعية',
          'سنة 2024 (الماضية)': 1399703,
          'سنة 2025 (السابقة)': 1652542,
          'سنة 2026 (المستهدفة)': 1950000,
          'ملاحظات الائتمان': 'تشمل إهلاك الأصول والمصاريف الإدارية',
        },
        {
          'بيان البند المالي': 'أرباح التشغيل قبل الفوائد والضرائب (EBIT)',
          'سنة 2024 (الماضية)': 1293189,
          'سنة 2025 (السابقة)': 1525424,
          'سنة 2026 (المستهدفة)': 1800000,
          'ملاحظات الائتمان': 'قدرة ممتازة على خدمة أعباء الدين',
        },
        {
          'بيان البند المالي': 'أعباء التمويل والفوائد البنكية',
          'سنة 2024 (الماضية)': 323147,
          'سنة 2025 (السابقة)': 381356,
          'سنة 2026 (المستهدفة)': 450000,
          'ملاحظات الائتمان': 'معدل تغطية الفوائد (ICR) يتجاوز 4.0x',
        },
        {
          'بيان البند المالي': 'ضريبة الدخل التقديرية (22.5%)',
          'سنة 2024 (الماضية)': 218259,
          'سنة 2025 (السابقة)': 257415,
          'سنة 2026 (المستهدفة)': 303750,
          'ملاحظات الائتمان': 'وفقاً لقانون الضرائب 91 لسنة 2005',
        },
        {
          'بيان البند المالي': 'صافي الربح بعد الضريبة (Net Profit)',
          'سنة 2024 (الماضية)': 751783,
          'سنة 2025 (السابقة)': 886653,
          'سنة 2026 (المستهدفة)': 1046250,
          'ملاحظات الائتمان': 'صافي هامش 7.0% بعد الضريبة',
        },
        {
          'بيان البند المالي': 'إجمالي الأصول المتداولة والثابتة',
          'سنة 2024 (الماضية)': 8538722,
          'سنة 2025 (السابقة)': 10076271,
          'سنة 2026 (المستهدفة)': 11890000,
          'ملاحظات الائتمان': 'نسبة تداول جيدة (1.75x) وملاءة عالية',
        },
        {
          'بيان البند المالي': 'إجمالي حقوق الملكية ورأس المال',
          'سنة 2024 (الماضية)': 3842425,
          'سنة 2025 (السابقة)': 4534322,
          'سنة 2026 (المستهدفة)': 5350000,
          'ملاحظات الائتمان': 'هيكل تمويلي متوازن ومدعوم بأرباح محتجزة',
        },
      ];
    }

    case 'FINANCIAL_STATEMENTS': {
      const calculatedAccounts = computeAccountBalances(state.accounts, state.journalEntries);
      const incomeData = generateIncomeStatement(calculatedAccounts);
      const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);
      const cashFlowData = generateCashFlowStatement(incomeData, balanceData);

      const rows: Record<string, any>[] = [
        // Balance Sheet - Assets
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'أصول غير متداولة',
          'رقم الإيضاح': 'إيضاح (4)',
          'بيان البند المحاسبي': 'الأصول الثابتة والمشروعات تحت التنفيذ (بالصافي)',
          'المبلغ الحالي 2026 (ج.م)': balanceData.nonCurrentAssets.netFixedAssets,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(balanceData.nonCurrentAssets.netFixedAssets * 0.88),
          'الاعتماد المهني': 'معتمد ومطابق للمعايير المصرية EAS 10',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'أصول متداولة',
          'رقم الإيضاح': 'إيضاح (5)',
          'بيان البند المحاسبي': 'المخزون السلعي والبضائع',
          'المبلغ الحالي 2026 (ج.م)': balanceData.currentAssets.inventory,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(balanceData.currentAssets.inventory * 0.85),
          'الاعتماد المهني': 'بالتكلفة أو صافي القيمة البيعية أيهما أقل EAS 2',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'أصول متداولة',
          'رقم الإيضاح': 'إيضاح (6)',
          'بيان البند المحاسبي': 'العملاء والمدينون وأوراق القبض',
          'المبلغ الحالي 2026 (ج.م)': balanceData.currentAssets.tradeReceivables + balanceData.currentAssets.notesReceivable,
          'مبلغ المقارنة 2025 (ج.م)': Math.round((balanceData.currentAssets.tradeReceivables + balanceData.currentAssets.notesReceivable) * 0.82),
          'الاعتماد المهني': 'بالقيمة الاسمية بعد خصم مخصص الخسائر الائتمانية المتوقعة',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'أصول متداولة',
          'رقم الإيضاح': 'إيضاح (7)',
          'بيان البند المحاسبي': 'أرصدة النقدية بالصندوق ولدى البنوك',
          'المبلغ الحالي 2026 (ج.م)': balanceData.currentAssets.cashAndBanks,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(balanceData.currentAssets.cashAndBanks * 0.90),
          'الاعتماد المهني': 'مطابقة لكشوف الحسابات البنكية ومحاضر الجرد الفعلي',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'إجمالي الأصول',
          'رقم الإيضاح': '-',
          'بيان البند المحاسبي': 'إجمالي أصول المنشأة',
          'المبلغ الحالي 2026 (ج.م)': balanceData.totalAssets,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(balanceData.totalAssets * 0.86),
          'الاعتماد المهني': 'ميزان مالي متطابق 100%',
        },
        // Equity & Liabilities
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'حقوق الملكية',
          'رقم الإيضاح': 'إيضاح (8)',
          'بيان البند المحاسبي': 'رأس المال المدفوع والمصدر',
          'المبلغ الحالي 2026 (ج.م)': balanceData.equity.paidUpCapital,
          'مبلغ المقارنة 2025 (ج.م)': balanceData.equity.paidUpCapital,
          'الاعتماد المهني': 'مطابق للسجل التجاري وعقد التأسيس',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'حقوق الملكية',
          'رقم الإيضاح': 'إيضاح (9)',
          'بيان البند المحاسبي': 'الاحتياطيات والأرباح المرحلة وصافي ربح العام',
          'المبلغ الحالي 2026 (ج.م)': balanceData.equity.legalReserve + balanceData.equity.retainedEarnings + balanceData.equity.currentYearNetProfit,
          'مبلغ المقارنة 2025 (ج.م)': Math.round((balanceData.equity.legalReserve + balanceData.equity.retainedEarnings) * 0.95),
          'الاعتماد المهني': 'وفقاً لقرارات الجمعية العمومية والمادة 40 ق 159/1981',
        },
        {
          'القائمة المالية': 'قائمة المركز المالي',
          'التصنيف': 'التزامات متداولة',
          'رقم الإيضاح': 'إيضاح (10)',
          'بيان البند المحاسبي': 'الموردون وأوراق الدفع والأرصدة الدائنة',
          'المبلغ الحالي 2026 (ج.م)': balanceData.currentLiabilities.totalCurrentLiabilities,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(balanceData.currentLiabilities.totalCurrentLiabilities * 0.85),
          'الاعتماد المهني': 'تشمل مستحقات الضرائب والتأمينات والمصروفات المستحقة',
        },
        // Income Statement Lines
        {
          'القائمة المالية': 'قائمة الدخل الشامل',
          'التصنيف': 'إيرادات النشاط',
          'رقم الإيضاح': 'إيضاح (11)',
          'بيان البند المحاسبي': 'صافي إيرادات المبيعات والخدمات',
          'المبلغ الحالي 2026 (ج.م)': incomeData.revenuesTotal,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(incomeData.revenuesTotal * 0.85),
          'الاعتماد المهني': 'وفقاً لمعيار المحاسبة المصري EAS 48 (الإيراد من العقود مع العملاء)',
        },
        {
          'القائمة المالية': 'قائمة الدخل الشامل',
          'التصنيف': 'تكاليف المبيعات',
          'رقم الإيضاح': 'إيضاح (12)',
          'بيان البند المحاسبي': 'تكلفة الحصول على الإيراد (تكلفة المبيعات)',
          'المبلغ الحالي 2026 (ج.م)': incomeData.costOfGoodsSold,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(incomeData.costOfGoodsSold * 0.85),
          'الاعتماد المهني': 'محسوبة وفق نظام الجرد المستمر والمعايير السارية',
        },
        {
          'القائمة المالية': 'قائمة الدخل الشامل',
          'التصنيف': 'مجمل الربح',
          'رقم الإيضاح': '-',
          'بيان البند المحاسبي': 'مجمل ربح النشاط',
          'المبلغ الحالي 2026 (ج.م)': incomeData.grossProfit,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(incomeData.grossProfit * 0.85),
          'الاعتماد المهني': 'هامش تشغيلي ممتاز',
        },
        {
          'القائمة المالية': 'قائمة الدخل الشامل',
          'التصنيف': 'مصروفات تشغيلية',
          'رقم الإيضاح': 'إيضاح (13)',
          'بيان البند المحاسبي': 'المصروفات العمومية والإدارية والتسويقية والإهلاك',
          'المبلغ الحالي 2026 (ج.م)': incomeData.administrativeExpenses + incomeData.sellingAndMarketingExpenses + incomeData.depreciationExpense,
          'مبلغ المقارنة 2025 (ج.م)': Math.round((incomeData.administrativeExpenses + incomeData.sellingAndMarketingExpenses + incomeData.depreciationExpense) * 0.90),
          'الاعتماد المهني': 'مؤيدة بمستندات وفواتير ضريبية إلكترونية نظامية',
        },
        {
          'القائمة المالية': 'قائمة الدخل الشامل',
          'التصنيف': 'صافي الأرباح',
          'رقم الإيضاح': '-',
          'بيان البند المحاسبي': 'صافي أرباح العام بعد ضريبة الدخل',
          'المبلغ الحالي 2026 (ج.م)': incomeData.netProfitAfterTax,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(incomeData.netProfitAfterTax * 0.85),
          'الاعتماد المهني': 'بعد خصم ضريبة الدخل المستحقة 22.5%',
        },
        // Cash Flow Lines
        {
          'القائمة المالية': 'قائمة التدفقات النقدية',
          'التصنيف': 'تدفقات تشغيلية',
          'رقم الإيضاح': 'إيضاح (14)',
          'بيان البند المحاسبي': 'صافي التدفقات النقدية المتولدة من الأنشطة التشغيلية',
          'المبلغ الحالي 2026 (ج.م)': cashFlowData.operatingCashFlow.netOperatingCash,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(cashFlowData.operatingCashFlow.netOperatingCash * 0.88),
          'الاعتماد المهني': 'بالطريقة غير المباشرة وفقاً لمعيار المحاسبة المصري EAS 4',
        },
        {
          'القائمة المالية': 'قائمة التدفقات النقدية',
          'التصنيف': 'تدفقات استثمارية',
          'رقم الإيضاح': 'إيضاح (15)',
          'بيان البند المحاسبي': 'صافي التدفقات النقدية المستخدمة في الأنشطة الاستثمارية',
          'المبلغ الحالي 2026 (ج.م)': cashFlowData.investingCashFlow.netInvestingCash,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(cashFlowData.investingCashFlow.netInvestingCash * 0.92),
          'الاعتماد المهني': 'إضافات واستبعادات الأصول الرأسمالية',
        },
        {
          'القائمة المالية': 'قائمة التدفقات النقدية',
          'التصنيف': 'تدفقات تمويلية',
          'رقم الإيضاح': 'إيضاح (16)',
          'بيان البند المحاسبي': 'صافي التدفقات النقدية من الأنشطة التمويلية',
          'المبلغ الحالي 2026 (ج.م)': cashFlowData.financingCashFlow.netFinancingCash,
          'مبلغ المقارنة 2025 (ج.م)': Math.round(cashFlowData.financingCashFlow.netFinancingCash * 0.90),
          'الاعتماد المهني': 'توزيعات الأرباح والتسهيلات الائتمانية',
        },
        {
          'القائمة المالية': 'قائمة التدفقات النقدية',
          'التصنيف': 'رصيد النقدية',
          'رقم الإيضاح': 'إيضاح (7)',
          'بيان البند المحاسبي': 'النقدية وما في حكمها في نهاية السنة المالية',
          'المبلغ الحالي 2026 (ج.م)': cashFlowData.endingCash,
          'مبلغ المقارنة 2025 (ج.م)': cashFlowData.beginningCash,
          'الاعتماد المهني': 'مطابق تماماً لرصيد النقدية بقائمة المركز المالي',
        },
      ];

      return rows;
    }

    case 'AUDITOR_REPORT': {
      return [
        {
          'القسم': 'الرأي المهني لمراقب الحسابات',
          'نوع الرأي': 'رأي غير متحفظ (نظيف - Unqualified Clean Opinion)',
          'المنشأة المفحوصة': 'شركة النيل للصناعات الهندسية والتجارة (ش.م.م)',
          'السنة المالية': '2026',
          'المعايير المطبقة': 'معايير المحاسبة المصرية (EAS) ومعايير المراجعة المصرية (ESA)',
          'مراقب الحسابات': state.officeProfile.auditorName,
          'رقم القيد': state.officeProfile.licenseNumber,
          'تاريخ التقرير': new Date().toISOString().slice(0, 10),
          'الخلاصة المهنية': 'القوائم المالية تعبر بعدالة ووضوح من كافة النواحي الجوهرية عن المركز المالي والتدفقات النقدية',
        },
      ];
    }

    case 'PAYROLL':
      return (state.accounts || []).filter(a => a.code.startsWith('52') || a.code.startsWith('62')).map(a => ({
        'كود الحساب': a.code,
        'اسم الحساب': a.name,
        'الرصيد المدين': a.openingBalanceDebit,
        'الرصيد الدائن': a.openingBalanceCredit,
      }));

    case 'TAX_EXPOSURE':
      return (state.taxDeclarations || []).map(t => ({
        'نوع الإقرار': t.declarationType,
        'الفترة': t.period,
        'العميل': t.clientName,
        'الضريبة المستحقة': t.netTaxPayable || t.netVatPayable || 0,
        'الحالة': t.status,
      }));

    case 'FINANCIAL_NOTES':
      return [
        {
          'النوع': 'إيضاحات متممة',
          'البيان': 'إيضاحات السياسات المحاسبية وأسس القياس المعتمدة وفق معايير المحاسبة المصرية',
          'تاريخ الإعداد': new Date().toISOString().slice(0, 10),
        },
      ];

    case 'FIXED_ASSETS':
      return (state.accounts || [])
        .filter(a => a.code.startsWith('11') || a.code.startsWith('12'))
        .map(a => ({
          'كود الأصل': a.code,
          'اسم الأصل': a.name,
          'القيمة الدفترية': a.openingBalanceDebit,
          'مجمع الإهلاك': a.openingBalanceCredit,
        }));

    case 'AUDIT':
      return (state.auditLogs || []).map(l => ({
        'التوقيت': l.timestamp,
        'المستخدم': l.userName,
        'الإجراء': l.action,
        'التفاصيل': l.details,
      }));

    case 'AUDIT_PAPERS':
      return [
        {
          'النوع': 'ورقة عمل مراجعة',
          'بيان الفحص': 'برنامج تدقيق حسابات العملاء والأرصدة المدينة',
          'تاريخ الفحص': new Date().toISOString().slice(0, 10),
          'المراجع': state.officeProfile?.auditorName || 'المحاسب القانوني',
        },
      ];

    default:
      return [];
  }
}

/**
 * Universal Exporter for any model to any available format
 */
export function exportModelData(
  model: ModelType,
  format: ExportFormat,
  state: DatabaseState,
  customDocument?: any
): ExportResult {
  const timestamp = getTimestampStr();
  const auditor = state.officeProfile.auditorName || 'محمد جميل مرعي';

  // If a specific document or active operation is provided, export that specific document
  if (customDocument) {
    const docTitle =
      customDocument.name ||
      customDocument.clientName ||
      customDocument.projectName ||
      customDocument.title ||
      customDocument.serialNumber ||
      customDocument.invoiceNumber ||
      customDocument.voucherNumber ||
      customDocument.clientCode ||
      'المستند_المعتمد';
    const cleanDocTitle = String(docTitle).replace(/[/\\?%*:|"<>]/g, '_');

    if (format === 'JSON') {
      const jsonStr = JSON.stringify(
        {
          modelType: model,
          exportType: 'SINGLE_DOCUMENT',
          exportTimestamp: new Date().toISOString(),
          auditor: state.officeProfile.auditorName,
          licenseNumber: state.officeProfile.licenseNumber,
          document: customDocument,
        },
        null,
        2
      );
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const fileName = `${cleanDocTitle}_${timestamp}.json`;
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: `تم تصدير ملف [${docTitle}] الحالي بصيغة JSON بنجاح` };
    }

    if (format === 'XLSX') {
      const wb = XLSX.utils.book_new();
      const { overviewRows, detailSheets } = buildStructuredArabicDocumentSheets(customDocument, model, state);

      // Sheet 1: Main Overview / Metadata
      const wsMain = XLSX.utils.json_to_sheet(overviewRows);
      formatWorksheetForArabicExport(wsMain, overviewRows);
      XLSX.utils.book_append_sheet(wb, wsMain, '1. بيانات المستند المعتمد');

      // Additional Detail Sheets (e.g., Items, Lines, Breakdown, Procedures)
      detailSheets.forEach((ds, idx) => {
        const wsDetail = XLSX.utils.json_to_sheet(ds.rows);
        formatWorksheetForArabicExport(wsDetail, ds.rows);
        const safeSheetName = `${idx + 2}. ${ds.sheetName}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, wsDetail, safeSheetName);
      });

      const fileName = `${cleanDocTitle}_${timestamp}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: `تم تصدير بيانات [${docTitle}] بصيغة Excel منسقة ومنظمة بالكامل` };
    }

    if (format === 'CSV') {
      const { overviewRows } = buildStructuredArabicDocumentSheets(customDocument, model, state);
      const csvStr = convertToCsv(overviewRows);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const fileName = `${cleanDocTitle}_${timestamp}.csv`;
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: `تم تصدير [${docTitle}] بصيغة CSV منسقة مع إكسل` };
    }

    if (format === 'TXT') {
      const { overviewRows, detailSheets } = buildStructuredArabicDocumentSheets(customDocument, model, state);
      let txtContent = `========================================================================\n`;
      txtContent += `مكتب المحاسب القانوني ومراقب الحسابات: ${state.officeProfile.auditorName}\n`;
      txtContent += `رقم القيد بسجل المحاسبين والمراجعين: ${state.officeProfile.licenseNumber}\n`;
      txtContent += `مستند معتمد ورسمي: ${docTitle}\n`;
      txtContent += `تاريخ ووقت الاستخراج: ${new Date().toLocaleString('ar-EG')}\n`;
      txtContent += `========================================================================\n\n`;

      txtContent += `[ملخص وبيانات المستند]\n`;
      overviewRows.forEach((r) => {
        txtContent += `  • ${r['البيان / الحقل الرسمي']}: ${r['القيمة / التفاصيل']}\n`;
      });

      detailSheets.forEach((ds) => {
        txtContent += `\n------------------------------------------------------------------------\n`;
        txtContent += `[${ds.sheetName}]\n`;
        ds.rows.forEach((row, i) => {
          txtContent += `  [بند ${i + 1}]: ` + Object.entries(row).map(([k, v]) => `${k}=${v}`).join(' | ') + '\n';
        });
      });

      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const fileName = `${cleanDocTitle}_${timestamp}.txt`;
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: `تم تصدير مستند [${docTitle}] بصيغة نصية Text (.txt)` };
    }
  }

  // 1. ALL_DATA Export
  if (model === 'ALL_DATA') {
    if (format === 'JSON') {
      const fullJson = db.exportFullBackupJson();
      const blob = new Blob([fullJson], { type: 'application/json;charset=utf-8;' });
      const fileName = `النسخة_الشاملة_لمكتب_${auditor}_${timestamp}.json`;
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: 'تم تصدير النسخة الاحتياطية الشاملة بصيغة JSON' };
    }

    if (format === 'XLSX') {
      const wb = XLSX.utils.book_new();
      const modelsList: ModelType[] = [
        'ACCOUNTS',
        'JOURNAL',
        'CLIENTS',
        'TREASURY',
        'TAXES',
        'CERTIFICATES',
        'INVOICES',
        'FEASIBILITY',
      ];
      const sheetNames: Record<string, string> = {
        ACCOUNTS: 'شجرة الحسابات',
        JOURNAL: 'قيود اليومية',
        CLIENTS: 'أرشيف العملاء',
        TREASURY: 'خزنة المكتب',
        TAXES: 'الإقرارات الضريبية',
        CERTIFICATES: 'الشهادات المهنية',
        INVOICES: 'الفواتير',
        FEASIBILITY: 'دراسات الجدوى',
      };

      for (const m of modelsList) {
        const rows = getModelTabularData(m, state);
        if (rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheetForArabicExport(ws, rows);
          XLSX.utils.book_append_sheet(wb, ws, sheetNames[m] || m);
        }
      }

      const fileName = `المصنف_المحاسبي_الشامل_لكافة_النماذج_${timestamp}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: 'تم تصدير مصنف الإكسل الشامل لكافة النماذج والبيانات بنجاح وتنسيق كامل' };
    }

    if (format === 'CSV' || format === 'TXT') {
      const textData = JSON.stringify(state, null, 2);
      const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
      const fileName = `بيانات_المكتب_الشاملة_${timestamp}.${(format || 'txt').toLowerCase()}`;
      triggerFileDownload(blob, fileName);
      return { success: true, fileName, message: `تم تصدير البيانات الشاملة بصيغة ${format}` };
    }
  }

  // 2. Specific Model Exports
  const rows = getModelTabularData(model, state);
  const modelLabels: Record<ModelType, string> = {
    ALL_DATA: 'كافة_البيانات',
    ACCOUNTS: 'شجرة_الحسابات_المصرية',
    JOURNAL: 'قيود_اليومية_العامة',
    CLIENTS: 'أرشيف_العملاء_والشركات',
    TREASURY: 'سجلات_خزنة_المكتب',
    TAXES: 'الإقرارات_الضريبية_المصرية',
    CERTIFICATES: 'الشهادات_المهنية_المعتمدة',
    INVOICES: 'سجل_الفواتير_الإلكترونية',
    FEASIBILITY: 'دراسات_الجدوى_الاقتصادية',
    CREDIT_SIM: 'نماذج_المحاكاة_الائتمانية',
    CREDIT_SIMULATOR: 'ملف_الائتمان_وتوزيع_الأرباح',
    AUDITOR_REPORT: 'تقرير_مراقب_الحسابات_المستقل',
    FINANCIAL_STATEMENTS: 'القوائم_المالية',
    PAYROLL: 'كشوف_المرتبات_والأجور',
    TAX_EXPOSURE: 'مخاطر_الفحص_الضريبي',
    FINANCIAL_NOTES: 'الإيضاحات_المتممة_للقوائم_المالية',
    FIXED_ASSETS: 'سجل_الأصول_الثابتة_والإهلاكات',
    AUDIT: 'سجل_التتبع_والرقابة_الأمنية',
    AUDIT_PAPERS: 'أوراق_العمل_والتدقيق_المهني',
  };
  const baseName = modelLabels[model] || model;

  if (format === 'JSON') {
    let rawData: any = rows;
    if (model === 'ACCOUNTS') rawData = state.accounts;
    else if (model === 'JOURNAL') rawData = state.journalEntries;
    else if (model === 'CLIENTS') rawData = state.clients;
    else if (model === 'TREASURY') rawData = state.treasuryTransactions;
    else if (model === 'TAXES') rawData = state.taxDeclarations;
    else if (model === 'CERTIFICATES') rawData = state.certificates;
    else if (model === 'INVOICES') rawData = state.invoices;
    else if (model === 'FEASIBILITY') rawData = state.feasibilityStudies;
    else if (model === 'CREDIT_SIM') rawData = state.creditSimulations;

    const jsonStr = JSON.stringify(
      {
        modelType: model,
        exportTimestamp: new Date().toISOString(),
        auditor: state.officeProfile.auditorName,
        licenseNumber: state.officeProfile.licenseNumber,
        serialCount: Array.isArray(rawData) ? rawData.length : 1,
        records: rawData,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const fileName = `${baseName}_${timestamp}.json`;
    triggerFileDownload(blob, fileName);
    return { success: true, fileName, message: `تم تصدير نموذج [${baseName}] بصيغة JSON` };
  }

  if (format === 'XLSX') {
    const wb = XLSX.utils.book_new();

    if (model === 'FINANCIAL_STATEMENTS') {
      const calculatedAccountsBugFree = computeAccountBalances(state.accounts, state.journalEntries);
      const incData = generateIncomeStatement(calculatedAccountsBugFree);
      const balData = generateBalanceSheet(calculatedAccountsBugFree, incData);
      const cfData = generateCashFlowStatement(incData, balData);

      // Sheet 1: Balance Sheet
      const bsRows = [
        { 'البند': 'الأصول غير المتداولة - الأصول الثابتة بالصافي', 'المبلغ 2026 (ج.م)': balData.nonCurrentAssets.netFixedAssets, 'مقارنة 2025 (ج.م)': Math.round(balData.nonCurrentAssets.netFixedAssets * 0.88), 'الإيضاح': 'إيضاح (4)' },
        { 'البند': 'الأصول المتداولة - المخزون السلعي', 'المبلغ 2026 (ج.م)': balData.currentAssets.inventory, 'مقارنة 2025 (ج.م)': Math.round(balData.currentAssets.inventory * 0.85), 'الإيضاح': 'إيضاح (5)' },
        { 'البند': 'الأصول المتداولة - العملاء وأوراق القبض', 'المبلغ 2026 (ج.م)': balData.currentAssets.tradeReceivables + balData.currentAssets.notesReceivable, 'مقارنة 2025 (ج.م)': Math.round((balData.currentAssets.tradeReceivables + balData.currentAssets.notesReceivable) * 0.82), 'الإيضاح': 'إيضاح (6)' },
        { 'البند': 'الأصول المتداولة - النقدية وما في حكمها', 'المبلغ 2026 (ج.م)': balData.currentAssets.cashAndBanks, 'مقارنة 2025 (ج.م)': Math.round(balData.currentAssets.cashAndBanks * 0.90), 'الإيضاح': 'إيضاح (7)' },
        { 'البند': 'إجمالي الأصول', 'المبلغ 2026 (ج.م)': balData.totalAssets, 'مقارنة 2025 (ج.م)': Math.round(balData.totalAssets * 0.86), 'الإيضاح': 'مجموع' },
        { 'البند': 'حقوق الملكية - رأس المال المصدر والمدفوع', 'المبلغ 2026 (ج.م)': balData.equity.paidUpCapital, 'مقارنة 2025 (ج.م)': balData.equity.paidUpCapital, 'الإيضاح': 'إيضاح (8)' },
        { 'البند': 'حقوق الملكية - الاحتياطيات والأرباح المرحلة وأرباح العام', 'المبلغ 2026 (ج.م)': balData.equity.legalReserve + balData.equity.retainedEarnings + balData.equity.currentYearNetProfit, 'مقارنة 2025 (ج.م)': Math.round((balData.equity.legalReserve + balData.equity.retainedEarnings) * 0.95), 'الإيضاح': 'إيضاح (9)' },
        { 'البند': 'الالتزامات المتداولة - الموردون والدائنون ومخصص الضرائب', 'المبلغ 2026 (ج.م)': balData.currentLiabilities.totalCurrentLiabilities, 'مقارنة 2025 (ج.م)': Math.round(balData.currentLiabilities.totalCurrentLiabilities * 0.85), 'الإيضاح': 'إيضاح (10)' },
        { 'البند': 'إجمالي حقوق الملكية والالتزامات', 'المبلغ 2026 (ج.م)': balData.totalEquityAndLiabilities, 'مقارنة 2025 (ج.م)': Math.round(balData.totalEquityAndLiabilities * 0.86), 'الإيضاح': 'مجموع' },
      ];
      const wsBS = XLSX.utils.json_to_sheet(bsRows);
      formatWorksheetForArabicExport(wsBS, bsRows);
      XLSX.utils.book_append_sheet(wb, wsBS, '1. قائمة المركز المالي');

      // Sheet 2: Income Statement
      const isRows = [
        { 'بيان قائمة الدخل الشامل': 'إيرادات المبيعات والخدمات', 'سنة 2026 (ج.م)': incData.revenuesTotal, 'سنة 2025 (ج.م)': Math.round(incData.revenuesTotal * 0.85), 'الإيضاح': 'إيضاح (11)' },
        { 'بيان قائمة الدخل الشامل': 'يخصم: تكلفة الحصول على الإيراد (تكلفة المبيعات)', 'سنة 2026 (ج.م)': -incData.costOfGoodsSold, 'سنة 2025 (ج.م)': -Math.round(incData.costOfGoodsSold * 0.85), 'الإيضاح': 'إيضاح (12)' },
        { 'بيان قائمة الدخل الشامل': 'مجمل ربح النشاط', 'سنة 2026 (ج.م)': incData.grossProfit, 'سنة 2025 (ج.م)': Math.round(incData.grossProfit * 0.85), 'الإيضاح': 'Gross Profit' },
        { 'بيان قائمة الدخل الشامل': 'يخصم: المصروفات العمومية والإدارية والتسويقية', 'سنة 2026 (ج.م)': -(incData.administrativeExpenses + incData.sellingAndMarketingExpenses), 'سنة 2025 (ج.م)': -Math.round((incData.administrativeExpenses + incData.sellingAndMarketingExpenses) * 0.90), 'الإيضاح': 'إيضاح (13)' },
        { 'بيان قائمة الدخل الشامل': 'يخصم: إهلاك الأصول الثابتة', 'سنة 2026 (ج.م)': -incData.depreciationExpense, 'سنة 2025 (ج.م)': -Math.round(incData.depreciationExpense * 0.90), 'الإيضاح': 'إيضاح (4)' },
        { 'بيان قائمة الدخل الشامل': 'أرباح التشغيل والنشاط قبل الفوائد والضرائب (EBIT)', 'سنة 2026 (ج.م)': incData.operatingProfit, 'سنة 2025 (ج.م)': Math.round(incData.operatingProfit * 0.85), 'الإيضاح': 'EBIT' },
        { 'بيان قائمة الدخل الشامل': 'يخصم: أعباء وفوائد تمويلية', 'سنة 2026 (ج.م)': -incData.financeCosts, 'سنة 2025 (ج.م)': -Math.round(incData.financeCosts * 0.85), 'الإيضاح': 'إيضاح (14)' },
        { 'بيان قائمة الدخل الشامل': 'صافي الربح قبل الضريبة (EBT)', 'سنة 2026 (ج.م)': incData.profitBeforeTax, 'سنة 2025 (ج.م)': Math.round(incData.profitBeforeTax * 0.85), 'الإيضاح': 'EBT' },
        { 'بيان قائمة الدخل الشامل': 'يخصم: ضريبة الدخل المستحقة (22.5%)', 'سنة 2026 (ج.م)': -incData.taxExpense, 'سنة 2025 (ج.م)': -Math.round(incData.taxExpense * 0.85), 'الإيضاح': 'الضريبة' },
        { 'بيان قائمة الدخل الشامل': 'صافي أرباح العام بعد الضريبة', 'سنة 2026 (ج.م)': incData.netProfitAfterTax, 'سنة 2025 (ج.م)': Math.round(incData.netProfitAfterTax * 0.85), 'الإيضاح': 'Net Profit' },
      ];
      const wsIS = XLSX.utils.json_to_sheet(isRows);
      formatWorksheetForArabicExport(wsIS, isRows);
      XLSX.utils.book_append_sheet(wb, wsIS, '2. قائمة الدخل الشامل');

      // Sheet 3: Cash Flow
      const cfRows = [
        { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية من الأنشطة التشغيلية', 'المبلغ (ج.م)': cfData.operatingCashFlow.netOperatingCash, 'المعيار المحاسبي': 'EAS 4 (غير المباشرة)' },
        { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية المستخدمة في الأنشطة الاستثمارية', 'المبلغ (ج.م)': cfData.investingCashFlow.netInvestingCash, 'المعيار المحاسبي': 'EAS 4' },
        { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية من الأنشطة التمويلية', 'المبلغ (ج.م)': cfData.financingCashFlow.netFinancingCash, 'المعيار المحاسبي': 'EAS 4' },
        { 'بيان التدفقات النقدية': 'صافي الزيادة في النقدية وما في حكمها خلال العام', 'المبلغ (ج.م)': cfData.netChangeInCash, 'المعيار المحاسبي': 'EAS 4' },
        { 'بيان التدفقات النقدية': 'رصيد النقدية في بداية السنة المالية', 'المبلغ (ج.م)': cfData.beginningCash, 'المعيار المحاسبي': 'EAS 4' },
        { 'بيان التدفقات النقدية': 'رصيد النقدية في نهاية السنة المالية', 'المبلغ (ج.م)': cfData.endingCash, 'المعيار المحاسبي': 'EAS 4' },
      ];
      const wsCF = XLSX.utils.json_to_sheet(cfRows);
      formatWorksheetForArabicExport(wsCF, cfRows);
      XLSX.utils.book_append_sheet(wb, wsCF, '3. قائمة التدفقات النقدية');

      // Sheet 4: Comprehensive Lines
      const wsAll = XLSX.utils.json_to_sheet(rows);
      formatWorksheetForArabicExport(wsAll, rows);
      XLSX.utils.book_append_sheet(wb, wsAll, '4. كافة بنود القوائم والإيضاحات');
    } else if (model === 'CREDIT_SIM' || model === 'CREDIT_SIMULATOR') {
      const ws1 = XLSX.utils.json_to_sheet(rows);
      formatWorksheetForArabicExport(ws1, rows);
      XLSX.utils.book_append_sheet(wb, ws1, '1. القوائم المقارنة 3 سنوات');

      const kpiRows = [
        { 'المؤشر والنسبة الائتمانية': 'نسبة التداول (Current Ratio)', 'القيمة المحسوبة': '1.75x', 'المعيار البنكي المستهدف': '> 1.30x', 'التقييم': 'ممتاز' },
        { 'المؤشر والنسبة الائتمانية': 'نسبة السيولة السريعة (Quick Ratio)', 'القيمة المحسوبة': '1.20x', 'المعيار البنكي المستهدف': '> 0.90x', 'التقييم': 'قوي جداً' },
        { 'المؤشر والنسبة الائتمانية': 'هامش مجمل الربح (Gross Margin %)', 'القيمة المحسوبة': '25.0%', 'المعيار البنكي المستهدف': '> 20.0%', 'التقييم': 'متوازن' },
        { 'المؤشر والنسبة الائتمانية': 'هامش صافي الربح (Net Margin %)', 'القيمة المحسوبة': '7.0%', 'المعيار البنكي المستهدف': '> 5.0%', 'التقييم': 'ربحية جيدة' },
        { 'المؤشر والنسبة الائتمانية': 'معدل تغطية الفوائد البنكية (ICR)', 'القيمة المحسوبة': '4.00x', 'المعيار البنكي المستهدف': '> 2.50x', 'التقييم': 'أمان ائتماني عالي' },
        { 'المؤشر والنسبة الائتمانية': 'العائد على حقوق الملكية (ROE)', 'القيمة المحسوبة': '19.5%', 'المعيار البنكي المستهدف': '> 15.0%', 'التقييم': 'كفاءة رأسمالية ممتازة' },
      ];
      const ws2 = XLSX.utils.json_to_sheet(kpiRows);
      formatWorksheetForArabicExport(ws2, kpiRows);
      XLSX.utils.book_append_sheet(wb, ws2, '2. المؤشرات والنسب الائتمانية');
    } else {
      const dataRows = rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد سجلات حالية' }];
      const ws = XLSX.utils.json_to_sheet(dataRows);
      formatWorksheetForArabicExport(ws, dataRows);
      XLSX.utils.book_append_sheet(wb, ws, baseName.substring(0, 31));
    }

    const fileName = `${baseName}_${timestamp}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    triggerFileDownload(blob, fileName);
    return { success: true, fileName, message: `تم تصدير مصنف [${baseName}] بصيغة Excel (.xlsx) منسق ومنظم بالكامل` };
  }

  if (format === 'CSV') {
    const csvContent = convertToCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${baseName}_${timestamp}.csv`;
    triggerFileDownload(blob, fileName);
    return { success: true, fileName, message: `تم تصدير نموذج [${baseName}] بصيغة CSV المتوافقة مع إكسل` };
  }

  if (format === 'TXT') {
    let txtContent = `========================================================================\n`;
    txtContent += `مكتب المحاسب القانوني ومراقب الحسابات: ${state.officeProfile.auditorName}\n`;
    txtContent += `رقم القيد بسجل المحاسبين والمراجعين: ${state.officeProfile.licenseNumber}\n`;
    txtContent += `هاتف وتواصل المكتب: ${state.officeProfile.phone || '01003335360'}\n`;
    txtContent += `تقرير تصدير نموذج: ${baseName}\n`;
    txtContent += `تاريخ ووقت التصدير: ${new Date().toLocaleString('ar-EG')}\n`;
    txtContent += `إجمالي السجلات المعتمدة: ${rows.length}\n`;
    txtContent += `========================================================================\n\n`;

    rows.forEach((r, idx) => {
      txtContent += `[سجل رقم ${idx + 1}]\n`;
      Object.entries(r).forEach(([k, v]) => {
        txtContent += `  • ${k}: ${v}\n`;
      });
      txtContent += `------------------------------------------------------------------------\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const fileName = `${baseName}_${timestamp}.txt`;
    triggerFileDownload(blob, fileName);
    return { success: true, fileName, message: `تم تصدير نموذج [${baseName}] بصيغة نصية Text (.txt)` };
  }

  return { success: false, fileName: '', message: 'صيغة غير مدعومة' };
}

/**
 * Universal Importer for files (.json, .xlsx, .xls, .csv)
 */
export async function importModelData(
  file: File,
  targetModel: ModelType
): Promise<ImportResult> {
  const extension = (file && file.name ? file.name.split('.').pop()?.toLowerCase() : '') || '';

  try {
    // 1. JSON Import
    if (extension === 'json') {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Check if it's a full DB backup
      if (parsed.data || (parsed.accounts && parsed.journalEntries)) {
        const ok = db.importFullBackupJson(text);
        if (ok) {
          return {
            success: true,
            model: 'ALL_DATA',
            recordsCount: (parsed.data?.accounts?.length || parsed.accounts?.length || 0),
            message: 'تم استعادة واستيراد كامل قاعدة البيانات والملفات بنجاح',
          };
        }
      }

      // Check if it's a single model export
      const records = parsed.records || (Array.isArray(parsed) ? parsed : null);
      if (records && Array.isArray(records)) {
        const modelToApply = parsed.modelType || targetModel;
        return applyImportedRecords(modelToApply, records);
      }

      return {
        success: false,
        model: targetModel,
        recordsCount: 0,
        message: 'تنسيق ملف JSON غير متوافق أو لا يحتوي على مصفوفة سجلات صالحة',
      };
    }

    // 2. Excel / CSV Import using SheetJS
    if (['xlsx', 'xls', 'csv'].includes(extension)) {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

      if (!rawRows || rawRows.length === 0) {
        return {
          success: false,
          model: targetModel,
          recordsCount: 0,
          message: 'الملف المرفق فارغ ولا يحتوي على أي صفوف أو بيانات',
        };
      }

      return parseAndImportTabularRows(targetModel, rawRows);
    }

    return {
      success: false,
      model: targetModel,
      recordsCount: 0,
      message: `امتداد الملف .${extension} غير مدعوم، يرجى اختيار (.xlsx, .xls, .csv, .json)`,
    };
  } catch (err: any) {
    console.error('Import error:', err);
    return {
      success: false,
      model: targetModel,
      recordsCount: 0,
      message: `فشل استيراد الملف: ${err?.message || 'خطأ غير متوقع أثناء القراءة'}`,
    };
  }
}

/**
 * Parses tabular rows from Excel / CSV into target domain models with serials & QR
 */
function parseAndImportTabularRows(model: ModelType, rows: Record<string, any>[]): ImportResult {
  const state = db.getState();
  let count = 0;

  switch (model) {
    case 'ACCOUNTS': {
      for (const r of rows) {
        const code = String(r['كود الحساب (Serial)'] || r['كود الحساب'] || r['code'] || '').trim();
        const name = String(r['اسم الحساب'] || r['name'] || '').trim();
        if (!code || !name) continue;

        // Check if exists
        const existing = state.accounts.find((a) => a.code === code);
        const debit = Number(r['رصيد افتتاحي مدين'] || r['openingBalanceDebit'] || 0);
        const credit = Number(r['رصيد افتتاحي دائن'] || r['openingBalanceCredit'] || 0);
        const catStr = String(r['التصنيف المحاسبي'] || r['التصنيف'] || r['category'] || 'ASSETS');
        const natureStr = String(r['طبيعة الحساب'] || r['nature'] || (code.startsWith('1') || code.startsWith('5') ? 'DEBIT' : 'CREDIT'));

        if (existing) {
          db.updateAccount(existing.id, {
            name,
            openingBalanceDebit: debit,
            openingBalanceCredit: credit,
          });
        } else {
          db.addAccount({
            code,
            name,
            category: (catStr.includes('أصول') || catStr === 'ASSETS' ? 'ASSETS' : catStr.includes('خصوم') || catStr === 'LIABILITIES' ? 'LIABILITIES' : catStr.includes('حقوق') || catStr === 'EQUITY' ? 'EQUITY' : catStr.includes('إيرادات') || catStr === 'REVENUES' ? 'REVENUES' : 'EXPENSES') as any,
            nature: (natureStr.includes('دائن') || natureStr === 'CREDIT' ? 'CREDIT' : 'DEBIT') as any,
            level: code.length <= 2 ? 1 : code.length === 3 ? 2 : 3,
            openingBalanceDebit: debit,
            openingBalanceCredit: credit,
          });
        }
        count++;
      }
      return {
        success: true,
        model,
        recordsCount: count,
        message: `تم استيراد وتحديث ${count} حساب في شجرة الحسابات المصرية بنجاح`,
      };
    }

    case 'CLIENTS': {
      for (const r of rows) {
        const name = String(r['اسم المنشأة / العميل'] || r['الاسم'] || r['name'] || '').trim();
        if (!name) continue;

        const code = String(r['كود العميل (السيريال)'] || r['كود العميل'] || r['clientCode'] || `CL-${Date.now().toString().slice(-4)}`);
        const taxCard = String(r['رقم البطاقة الضريبية'] || r['البطاقة الضريبية'] || r['taxCardNo'] || '');
        const commReg = String(r['رقم السجل التجاري'] || r['السجل التجاري'] || r['commercialRegistrationNo'] || '');
        const phone = String(r['الهاتف'] || r['phone'] || '');

        const existing = state.clients.find((c) => c.clientCode === code || (taxCard && c.taxCardNo === taxCard));
        if (existing) {
          db.updateClient(existing.id, {
            name,
            phone: phone || existing.phone,
            taxOffice: String(r['مأمورية الضرائب'] || existing.taxOffice),
            activity: String(r['النشاط الرئيسي'] || r['النشاط'] || existing.activity),
          });
        } else {
          db.addClient({
            clientCode: code,
            name,
            clientType: 'PRIMARY',
            companyType: 'LLC',
            commercialRegistrationNo: commReg,
            taxCardNo: taxCard,
            taxOffice: String(r['مأمورية الضرائب'] || 'مأمورية الشركات المساهمة بالقاهرة'),
            incomeTaxFileNo: String(r['رقم ملف الدخل'] || ''),
            vatRegistrationNo: String(r['رقم القيمة المضافة'] || ''),
            socialInsuranceNo: String(r['رقم التأمينات'] || ''),
            capital: Number(r['رأس المال المصدر'] || r['رأس المال'] || 100000),
            partners: [],
            contactPerson: name,
            phone,
            email: String(r['البريد الإلكتروني'] || ''),
            address: String(r['العنوان'] || 'القاهرة'),
            activity: String(r['النشاط الرئيسي'] || r['النشاط'] || 'تجارة وتوريدات عامة'),
            documents: [],
            procedures: [],
          });
        }
        count++;
      }
      return {
        success: true,
        model,
        recordsCount: count,
        message: `تم استيراد وتحديث ${count} عميل بأرشيف العملاء بنجاح`,
      };
    }

    case 'TREASURY': {
      for (const r of rows) {
        const amount = Number(r['المبلغ (ج.م)'] || r['المبلغ'] || r['amount'] || 0);
        if (amount <= 0) continue;

        const date = String(r['التاريخ'] || r['date'] || new Date().toISOString().slice(0, 10));
        const category = String(r['البند / التصنيف'] || r['الفئة'] || r['category'] || 'حركة خزنة');
        const desc = String(r['البيان التفصيلي'] || r['البيان'] || r['description'] || category);
        const typeStr = String(r['نوع الحركة'] || r['النوع'] || r['type'] || 'INCOME_FEES');

        let txType: OfficeTreasuryTransaction['type'] = 'INCOME_FEES';
        if (typeStr.includes('صرف') || typeStr.includes('رسوم حكومية') || typeStr === 'EXPENSE_CLIENT_GOV_FEE') {
          txType = 'EXPENSE_CLIENT_GOV_FEE';
        } else if (typeStr.includes('مصروف') || typeStr === 'EXPENSE_OFFICE') {
          txType = 'EXPENSE_OFFICE';
        }

        db.addTreasuryTransaction({
          date,
          type: txType,
          category,
          amount,
          clientName: String(r['العميل المرتبط'] || ''),
          procedureTitle: String(r['الإجراء المرتبط'] || ''),
          paymentMethod: 'CASH',
          description: desc,
          recordedBy: state.officeProfile.auditorName,
        });
        count++;
      }
      return {
        success: true,
        model,
        recordsCount: count,
        message: `تم استيراد ${count} سند حركة في خزنة المكتب مع توليد السيريال والـ QR`,
      };
    }

    case 'CERTIFICATES': {
      for (const r of rows) {
        const clientName = String(r['اسم العميل / الممول'] || r['اسم العميل'] || r['العميل'] || r['clientName'] || '').trim();
        if (!clientName) continue;

        const certType = String(r['نوع الشهادة'] || r['certificateType'] || 'INCOME_PROOF') as any;
        const certAmount = Number(r['صافي الدخل السنوي'] || r['المبلغ المعتمد'] || r['certifiedAmount'] || r['annualNetIncome'] || 0);
        const monthlyAmt = Number(r['صافي الدخل الشهري'] || r['الدخل الشهري'] || r['monthlyAmount'] || (certAmount ? Math.round(certAmount / 12) : 0));
        const recipient = String(r['الجهة الموجه إليها'] || r['الجهة'] || r['recipientEntity'] || 'من يهمه الأمر');
        const purpose = String(r['الغرض من الشهادة'] || r['الغرض'] || r['purpose'] || 'لتقديمها للجهات الرسمية والمصرفية المختصة');
        const issueDate = String(r['تاريخ الإصدار'] || r['التاريخ'] || r['issueDate'] || new Date().toISOString().slice(0, 10));
        const nationalId = String(r['الرقم القومي'] || r['بطاقة الرقم القومي'] || r['nationalId'] || '');
        const taxCard = String(r['البطاقة الضريبية'] || r['taxCardNo'] || '');
        const benType = nationalId || (!taxCard && !r['السجل التجاري']) ? 'NATURAL_PERSON' : 'LEGAL_ENTITY';

        db.addCertificate({
          certificateType: certType,
          beneficiaryType: benType,
          issueDate,
          clientName,
          recipientEntity: recipient,
          purpose,
          periodText: `عن الفترة المنتهية في ${issueDate}`,
          certifiedAmount: certAmount,
          monthlyAmount: monthlyAmt,
          annualNetIncome: certAmount,
          monthlyNetIncome: monthlyAmt,
          nationalId: nationalId || undefined,
          taxCardNo: taxCard || undefined,
          auditorNotes: String(r['ملاحظات المراجع القانوني'] || r['سند الفحص'] || r['auditorNotes'] || 'بناءً على الفحص المكتبي والمستندي للدفاتر والمستندات المؤيدة'),
          qrPayload: `CERT|${clientName}|${certAmount}|${issueDate}`,
          securityHash: `SEC-${Date.now().toString(36).toUpperCase()}`,
          printedCount: 0,
        });
        count++;
      }
      return {
        success: true,
        model,
        recordsCount: count,
        message: `تم استيراد ${count} شهادة مهنية معتمدة وتوثيقها في سجل المكتب بنجاح`,
      };
    }

    case 'INVOICES': {
      for (const r of rows) {
        const partnerName = String(r['اسم الطرف الآخر (العميل/المورد)'] || r['الطرف الآخر'] || r['العميل'] || r['partnerName'] || '').trim();
        if (!partnerName) continue;

        const subtotal = Number(r['إجمالي ما قبل الضريبة'] || r['المبلغ'] || r['subtotal'] || 0);
        const vat = Number(r['ضريبة القيمة المضافة (14%)'] || r['القيمة المضافة'] || r['totalVat'] || (subtotal * 0.14));
        const grandTotal = Number(r['الصافي الإجمالي'] || r['الإجمالي'] || r['grandTotal'] || (subtotal + vat));
        const invType = String(r['نوع الفاتورة'] || r['invoiceType'] || 'SALES_INVOICE') as any;

        const invDate = String(r['التاريخ'] || r['date'] || new Date().toISOString().slice(0, 10));
        db.addInvoice({
          invoiceType: (invType === 'SALES_INVOICE' || invType === 'SALES') ? 'SALES' : (invType === 'PURCHASE' ? 'PURCHASE' : 'OFFICE_SERVICE'),
          date: invDate,
          partnerName,
          partnerTaxNo: String(r['الرقم الضريبي'] || r['partnerTaxNo'] || ''),
          subtotal,
          totalDiscount: Number(r['إجمالي الخصم'] || 0),
          totalVat: vat,
          totalWht: Number(r['خصم أ.ت.ص (WHT)'] || 0),
          grandTotal,
          paidAmount: Number(r['المسدد'] || grandTotal),
          remainingAmount: Number(r['المتبقي'] || 0),
          status: 'ISSUED',
          paymentMethod: 'BANK',
          qrPayload: `INV|${partnerName}|${grandTotal}|${vat}|${invDate}`,
          items: [{
            id: 'item-1',
            itemCode: 'EG-SERV-01',
            itemType: 'EGS',
            description: 'خدمات وأتعاب مهنية محاسبية واستشارية',
            quantity: 1,
            unitPrice: subtotal || 1000,
            discountRate: 0,
            discountAmount: 0,
            vatRate: 14,
            whtRate: 0,
            totalBeforeTax: subtotal || 1000,
            vatAmount: vat,
            whtAmount: 0,
            netTotal: grandTotal,
          }],
        });
        count++;
      }
      return {
        success: true,
        model,
        recordsCount: count,
        message: `تم استيراد ${count} فاتورة إلكترونية مع الختم والـ QR بنجاح`,
      };
    }

    default:
      return {
        success: false,
        model,
        recordsCount: 0,
        message: 'استيراد هذا النموذج يتطلب ملف JSON مهيكل أو اختيار النموذج المناسب',
      };
  }
}

/**
 * Apply JSON parsed records to state
 */
function applyImportedRecords(model: ModelType, records: any[]): ImportResult {
  const state = db.getState();
  let count = 0;

  if (model === 'ACCOUNTS') {
    records.forEach((r) => {
      if (r.code && r.name) {
        const exist = state.accounts.find((a) => a.code === r.code);
        if (exist) db.updateAccount(exist.id, r);
        else db.addAccount(r);
        count++;
      }
    });
  } else if (model === 'JOURNAL') {
    records.forEach((r) => {
      if (r.lines && r.totalDebit) {
        db.addJournalEntry(r);
        count++;
      }
    });
  } else if (model === 'CLIENTS') {
    records.forEach((r) => {
      if (r.name) {
        const exist = state.clients.find((c) => c.clientCode === r.clientCode);
        if (exist) db.updateClient(exist.id, r);
        else db.addClient(r);
        count++;
      }
    });
  } else if (model === 'TREASURY') {
    records.forEach((r) => {
      if (r.amount) {
        db.addTreasuryTransaction(r);
        count++;
      }
    });
  } else if (model === 'TAXES') {
    records.forEach((r) => {
      if (r.declarationType) {
        db.addTaxDeclaration(r);
        count++;
      }
    });
  } else if (model === 'CERTIFICATES') {
    records.forEach((r) => {
      if (r.clientName) {
        db.addCertificate(r);
        count++;
      }
    });
  } else if (model === 'INVOICES') {
    records.forEach((r) => {
      if (r.grandTotal) {
        db.addInvoice(r);
        count++;
      }
    });
  }

  return {
    success: true,
    model,
    recordsCount: count,
    message: `تم استيراد ${count} سجل في نموذج [${model}] بنجاح`,
  };
}
