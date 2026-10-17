import * as XLSX from 'xlsx';
import { ClientArchiveRecord } from '../types';

export interface ParsedClientImportResult {
  success: boolean;
  clients: Omit<ClientArchiveRecord, 'id'>[];
  errors: string[];
  warnings: string[];
  totalRowsRead: number;
  columnsDetected: string[];
}

export class ClientExcelEngine {
  public static downloadClientTemplate(officeName = 'مكتب_المحاسب_القانوني'): void {
    const sampleRows = [
      {
        'اسم الشركة / العميل': 'شركة النور للتجارة والتوكيلات',
        'رقم التسجيل الضريبي': '310-456-789',
        'رقم السجل التجاري': '89412',
        'الكيان القانوني': 'شركة ذات مسؤولية محدودة',
        'النشاط': 'تجارة عامة وتوريدات',
        'المأمورية المختصة': 'مأمورية ضرائب الشركات المساهمة',
        'العنوان': 'مدينة نصر - القاهرة',
        'رقم الهاتف / واتساب': '01001234567',
        'البريد الإلكتروني': 'info@elnoor.eg',
        'المسؤول عن التواصل': 'أ. محمد إبراهيم',
        'الأتعاب السنوية المتفق عليها': 36000,
        'المسدد من الأتعاب': 18000,
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج_العملاء');
    XLSX.writeFile(wb, `نموذج_استيراد_العملاء_${officeName}.xlsx`);
  }

  public static async parseExcelClientFile(
    file: File,
    existingClientsCount = 0
  ): Promise<ParsedClientImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        clients: [],
        errors: ['ملف الإكسيل لا يحتوي على أي ورقة عمل.'],
        warnings: [],
        totalRowsRead: 0,
        columnsDetected: [],
      };
    }

    const ws = wb.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rawRows.length === 0) {
      return {
        success: false,
        clients: [],
        errors: ['الورقة فارغة ولا تحتوي على صفوف بيانات.'],
        warnings: [],
        totalRowsRead: 0,
        columnsDetected: [],
      };
    }

    const columnsDetected = Object.keys(rawRows[0] || {});
    const clients: Omit<ClientArchiveRecord, 'id'>[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    rawRows.forEach((row, idx) => {
      const name = String(
        row['اسم الشركة / العميل'] ||
        row['اسم العميل'] ||
        row['اسم الشركة'] ||
        row['name'] ||
        row['Company Name'] ||
        ''
      ).trim();

      if (!name) {
        warnings.push(`صف #${idx + 2}: تم تخطيه لعدم وجود اسم العميل.`);
        return;
      }

      const taxId = String(
        row['رقم التسجيل الضريبي'] ||
        row['البطاقة الضريبية'] ||
        row['taxId'] ||
        row['Tax ID'] ||
        ''
      ).trim();

      const commercialRegister = String(
        row['رقم السجل التجاري'] ||
        row['السجل التجاري'] ||
        row['commercialRegister'] ||
        ''
      ).trim();

      const phone = String(
        row['رقم الهاتف / واتساب'] ||
        row['رقم الهاتف'] ||
        row['الهاتف'] ||
        row['phone'] ||
        ''
      ).trim();

      const annualAgreedFees = Number(row['الأتعاب السنوية المتفق عليها'] || row['annualAgreedFees'] || 0) || 0;
      const paidFees = Number(row['المسدد من الأتعاب'] || row['paidFees'] || 0) || 0;

      clients.push({
        code: `CLI-${String(existingClientsCount + clients.length + 101)}`,
        name,
        taxId: taxId || 'غير محدد',
        commercialRegister: commercialRegister || 'غير محدد',
        legalForm: 'LIMITED_LIABILITY',
        industry: String(row['النشاط'] || row['industry'] || 'نشاط تجاري وخدمي').trim(),
        taxOffice: String(row['المأمورية المختصة'] || row['taxOffice'] || '').trim(),
        address: String(row['العنوان'] || row['address'] || '').trim(),
        phone,
        email: String(row['البريد الإلكتروني'] || row['email'] || '').trim(),
        contactPerson: String(row['المسؤول عن التواصل'] || row['contactPerson'] || '').trim(),
        annualAgreedFees,
        paidFees,
        status: 'ACTIVE',
      });
    });

    return {
      success: clients.length > 0,
      clients,
      errors: clients.length === 0 ? ['لم يتم العثور على أي عملاء صالحين للاستيراد.'] : errors,
      warnings,
      totalRowsRead: rawRows.length,
      columnsDetected,
    };
  }
}
