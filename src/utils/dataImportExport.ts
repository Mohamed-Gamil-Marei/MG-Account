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
  | 'FINANCIAL_STATEMENTS';

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
 * Downloads a blob locally with proper MIME type
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
 * Maps model data into structured tabular rows for Excel / CSV / Table view
 */
export function getModelTabularData(model: ModelType, state: DatabaseState): Record<string, any>[] {
  switch (model) {
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
  state: DatabaseState
): ExportResult {
  const timestamp = getTimestampStr();
  const auditor = state.officeProfile.auditorName || 'محمد جميل مرعي';

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
          XLSX.utils.book_append_sheet(wb, ws, sheetNames[m] || m);
        }
      }

      const fileName = `المصنف_المحاسبي_الشامل_لكافة_النماذج_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
      return { success: true, fileName, message: 'تم تصدير مصنف الإكسل الشامل لكافة النماذج والبيانات بنجاح' };
    }

    if (format === 'CSV' || format === 'TXT') {
      const textData = JSON.stringify(state, null, 2);
      const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
      const fileName = `بيانات_المكتب_الشاملة_${timestamp}.${format.toLowerCase()}`;
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
    FINANCIAL_STATEMENTS: 'القوائم_المالية',
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
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد سجلات حالية' }]);
    XLSX.utils.book_append_sheet(wb, ws, baseName.substring(0, 31));
    const fileName = `${baseName}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return { success: true, fileName, message: `تم تصدير نموذج [${baseName}] بصيغة Excel (.xlsx)` };
  }

  if (format === 'CSV') {
    const csvContent = convertToCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${baseName}_${timestamp}.csv`;
    triggerFileDownload(blob, fileName);
    return { success: true, fileName, message: `تم تصدير نموذج [${baseName}] بصيغة CSV المتوافقة مع إكسل` };
  }

  if (format === 'TXT') {
    let txtContent = `====================================================\n`;
    txtContent += `مكتب المحاسب القانوني ومراقب الحسابات: ${state.officeProfile.auditorName}\n`;
    txtContent += `رقم القيد بسجل المحاسبين والمراجعين: ${state.officeProfile.licenseNumber}\n`;
    txtContent += `تقرير تصدير نموذج: ${baseName}\n`;
    txtContent += `تاريخ ووقت التصدير: ${new Date().toLocaleString('ar-EG')}\n`;
    txtContent += `إجمالي السجلات المعتمدة: ${rows.length}\n`;
    txtContent += `====================================================\n\n`;

    rows.forEach((r, idx) => {
      txtContent += `[سجل رقم ${idx + 1}]\n`;
      Object.entries(r).forEach(([k, v]) => {
        txtContent += `  • ${k}: ${v}\n`;
      });
      txtContent += `----------------------------------------------------\n`;
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
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

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
