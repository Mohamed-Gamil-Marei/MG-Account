import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from './excelArabicStyler';
import { ClientArchiveRecord, CompanyType, ClientRelationshipType } from '../types';

export interface ClientExcelRow {
  clientCode?: string;
  name: string;
  companyType?: string;
  commercialRegistrationNo?: string;
  taxCardNo?: string;
  taxOffice?: string;
  incomeTaxFileNo?: string;
  vatRegistrationNo?: string;
  socialInsuranceNo?: string;
  capital?: number | string;
  activity?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  etaUsername?: string;
  etaPassword?: string;
  generalTaxUsername?: string;
  generalTaxPassword?: string;
  sapUsername?: string;
  sapPassword?: string;
  nafezaUsername?: string;
  nafezaPassword?: string;
  notes?: string;
}

export interface ParsedClientImportResult {
  success: boolean;
  clients: Omit<ClientArchiveRecord, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
  errors: string[];
  totalRowsRead: number;
  columnsDetected: string[];
}

/**
 * Standard Arabic Column Headers for the Client Excel Template
 */
export const CLIENT_EXCEL_HEADERS = [
  'كود العميل',
  'اسم المنشأة / الشركة (إلزامي)',
  'الشكل القانوني',
  'رقم السجل التجاري',
  'رقم التسجيل الضريبي (البطاقة الضريبية)',
  'مأمورية الضرائب المختصة',
  'رقم الملف الضريبي',
  'رقم التسجيل بالقيمة المضافة',
  'الرقم التأميني للمنشأة',
  'رأس المال (ج.م)',
  'النشاط التجاري / الصناعي',
  'اسم المسؤول / المفوض',
  'هاتف التواصل والواتساب',
  'البريد الإلكتروني',
  'العنوان ومقر الشركة',
  'اسم مستخدم بوابة الفاتورة (ETA)',
  'كلمة مرور بوابة الفاتورة',
  'اسم مستخدم الضرائب العامة',
  'كلمة مرور الضرائب العامة',
  'اسم مستخدم منظومة ساب (SAP)',
  'كلمة مرور منظومة ساب',
  'اسم مستخدم نافذة الجمارك',
  'كلمة مرور نافذة الجمارك',
  'ملاحظات إدارية',
];

/**
 * Realistic Egyptian Sample Rows for the Template
 */
export const SAMPLE_CLIENT_EXCEL_DATA = [
  {
    'كود العميل': 'CL-101',
    'اسم المنشأة / الشركة (إلزامي)': 'شركة النور للتجارة والتوريدات العامة (ش.ذ.م.م)',
    'الشكل القانوني': 'ذات مسؤولية محدودة',
    'رقم السجل التجاري': '129480',
    'رقم التسجيل الضريبي (البطاقة الضريبية)': '482-938-102',
    'مأمورية الضرائب المختصة': 'مأمورية ضرائب كبار الممولين',
    'رقم الملف الضريبي': '12/450/99',
    'رقم التسجيل بالقيمة المضافة': '482938102',
    'الرقم التأميني للمنشأة': '8492019',
    'رأس المال (ج.م)': 500000,
    'النشاط التجاري / الصناعي': 'تجارة وتوريدات الأجهزة الكهربائية والمعدات',
    'اسم المسؤول / المفوض': 'م. طارق عبد الرحمن',
    'هاتف التواصل والواتساب': '01012345678',
    'البريد الإلكتروني': 'info@elnoor-trade.com',
    'العنوان ومقر الشركة': '15 شارع الثورة، مصر الجديدة، القاهرة',
    'اسم مستخدم بوابة الفاتورة (ETA)': 'elnoor_eta_admin',
    'كلمة مرور بوابة الفاتورة': 'Noor@Pass2026',
    'اسم مستخدم الضرائب العامة': 'elnoor_tax_portal',
    'كلمة مرور الضرائب العامة': 'Tax#Secure2026',
    'اسم مستخدم منظومة ساب (SAP)': 'elnoor_sap',
    'كلمة مرور منظومة ساب': 'SapPass!2026',
    'اسم مستخدم نافذة الجمارك': 'elnoor_nafeza',
    'كلمة مرور نافذة الجمارك': 'Naf@2026',
    'ملاحظات إدارية': 'عميل سنوي منتظم - خاضع للفاتورة الإلكترونية المرحلة الخامسة',
  },
  {
    'كود العميل': 'CL-102',
    'اسم المنشأة / الشركة (إلزامي)': 'المجموعة الهندسية للصناعات المتطورة (ش.م.م)',
    'الشكل القانوني': 'مساهمة',
    'رقم السجل التجاري': '85412',
    'رقم التسجيل الضريبي (البطاقة الضريبية)': '391-049-582',
    'مأمورية الضرائب المختصة': 'مأمورية ضرائب الاستثمار بالقاهرة',
    'رقم الملف الضريبي': '33/190/04',
    'رقم التسجيل بالقيمة المضافة': '391049582',
    'الرقم التأميني للمنشأة': '3920193',
    'رأس المال (ج.م)': 2500000,
    'النشاط التجاري / الصناعي': 'تصنيع وتجميع اللوحات الكهربائية وقطع الغيار',
    'اسم المسؤول / المفوض': 'أ. كريم سامي مرزوق',
    'هاتف التواصل والواتساب': '01223344556',
    'البريد الإلكتروني': 'contact@advanced-eng.eg',
    'العنوان ومقر الشركة': 'المنطقة الصناعية الثالثة، السادس من أكتوبر، الجيزة',
    'اسم مستخدم بوابة الفاتورة (ETA)': 'adveng_eta',
    'كلمة مرور بوابة الفاتورة': 'AdvEta@2026',
    'اسم مستخدم الضرائب العامة': 'adveng_general',
    'كلمة مرور الضرائب العامة': 'General#2026',
    'اسم مستخدم منظومة ساب (SAP)': 'adveng_sap_user',
    'كلمة مرور منظومة ساب': 'SapAdvPass99',
    'اسم مستخدم نافذة الجمارك': 'adveng_import',
    'كلمة مرور نافذة الجمارك': 'NafezaImport12',
    'ملاحظات إدارية': 'تم اعتماد ميزانية 2024 وجاري فحص ضرائب كسب العمل',
  },
  {
    'كود العميل': 'CL-103',
    'اسم المنشأة / الشركة (إلزامي)': 'مؤسسة الأمل للمقاولات العامة (فردي)',
    'الشكل القانوني': 'فردي',
    'رقم السجل التجاري': '62194',
    'رقم التسجيل الضريبي (البطاقة الضريبية)': '519-382-710',
    'مأمورية الضرائب المختصة': 'مأمورية ضرائب النزهة',
    'رقم الملف الضريبي': '08/712/55',
    'رقم التسجيل بالقيمة المضافة': '519382710',
    'الرقم التأميني للمنشأة': '7102938',
    'رأس المال (ج.م)': 300000,
    'النشاط التجاري / الصناعي': 'مقاولات عمومية وأعمال تشطيبات وديكور',
    'اسم المسؤول / المفوض': 'الحاج / أحمد عبد المنعم',
    'هاتف التواصل والواتساب': '01112223344',
    'البريد الإلكتروني': 'amal_contracting@yahoo.com',
    'العنوان ومقر الشركة': '28 شارع النصر، المعادي، القاهرة',
    'اسم مستخدم بوابة الفاتورة (ETA)': 'amal_contracting_eta',
    'كلمة مرور بوابة الفاتورة': 'AmalPass@2026',
    'اسم مستخدم الضرائب العامة': 'amal_tax_user',
    'كلمة مرور الضرائب العامة': 'TaxAmal#2026',
    'اسم مستخدم منظومة ساب (SAP)': '',
    'كلمة مرور منظومة ساب': '',
    'اسم مستخدم نافذة الجمارك': '',
    'كلمة مرور نافذة الجمارك': '',
    'ملاحظات إدارية': 'مطلوب تقديم نموذج 41 ربع سنوي وإقرار القيمة المضافة شهرياً',
  },
];

/**
 * Maps legal structure text in Arabic to CompanyType enum
 */
export function parseLegalForm(value: string | undefined): CompanyType {
  if (!value) return 'LLC';
  const v = value.trim().toLowerCase();
  if (v.includes('مساهمة') || v.includes('joint')) return 'JOINT_STOCK';
  if (v.includes('محدودة') || v.includes('ذات') || v.includes('llc') || v.includes('ذ.م.م')) return 'LLC';
  if (v.includes('شخص واحد') || v.includes('one person') || v.includes('واحد')) return 'ONE_PERSON';
  if (v.includes('فردي') || v.includes('فردية') || v.includes('منشأة فردية')) return 'INDIVIDUAL';
  if (v.includes('تضامن') || v.includes('توصية') || v.includes('partnership')) return 'PARTNERSHIP';
  return 'LLC';
}

/**
 * Normalizes phone numbers
 */
export function normalizePhoneNumber(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim().replace(/[^0-9]/g, '');
  if (s.startsWith('20') && s.length === 12) {
    return '0' + s.slice(2);
  }
  return s;
}

export class ClientExcelEngine {
  /**
   * Generates and downloads the official Excel template with 3 sample rows
   */
  public static downloadClientTemplate(officeName?: string): void {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_CLIENT_EXCEL_DATA, {
      header: CLIENT_EXCEL_HEADERS,
    });

    formatWorksheetForArabicExport(ws, SAMPLE_CLIENT_EXCEL_DATA);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دليل استيراد العملاء');

    const fileName = `قالب_استيراد_العملاء_مكتب_${(officeName || 'محمد_جميل_مرعي').replace(/\s+/g, '_')}.xlsx`;
    writeArabicExcelFile(wb, fileName);
  }

  /**
   * Parses an uploaded Excel / CSV file containing bulk client records
   */
  public static async parseExcelClientFile(
    file: File,
    existingClientsCount: number = 0
  ): Promise<ParsedClientImportResult> {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('الملف لا يحتوي على أوراق عمل (Sheets).');
    }

    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];

    // Read rows as array of objects
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        clients: [],
        warnings: [],
        errors: ['ورقة العمل فارغة، لم يتم العثور على أي صفوف بيانات.'],
        totalRowsRead: 0,
        columnsDetected: [],
      };
    }

    const columnsDetected = Object.keys(rawRows[0] || {});
    const parsedClients: Omit<ClientArchiveRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Helper to find value from row by fuzzy column name
    const getValue = (row: any, ...keys: string[]): string => {
      for (const key of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase().includes((key || '').toLowerCase())) {
            const val = row[rowKey];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    let clientSequence = existingClientsCount + 1;

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const name = getValue(row, 'اسم المنشأة', 'اسم الشركة', 'اسم العميل', 'الاسم', 'company', 'name');

      if (!name) {
        // Skip empty rows silently or warn if partial data exists
        const hasOtherData = Object.values(row).some((v) => String(v).trim() !== '');
        if (hasOtherData) {
          warnings.push(`الصف ${rowNum}: تم تخطيه لعدم وجود اسم للشركة.`);
        }
        return;
      }

      // Extract details
      const customCode = getValue(row, 'كود العميل', 'كود', 'code');
      const clientCode = customCode || `CL-${String(clientSequence++).padStart(3, '0')}`;

      const legalFormRaw = getValue(row, 'الشكل القانوني', 'نوع الشركة', 'legal', 'company type');
      const companyType = parseLegalForm(legalFormRaw);

      const commercialRegistrationNo = getValue(row, 'السجل التجاري', 'سجل تجاري', 'cr');
      const taxCardNo = getValue(row, 'البطاقة الضريبية', 'التسجيل الضريبي', 'رقم التسجيل', 'tax');
      const taxOffice = getValue(row, 'مأمورية الضرائب', 'المأمورية', 'tax office') || 'مأمورية ضرائب كبار الممولين';
      const incomeTaxFileNo = getValue(row, 'الملف الضريبي', 'ملف ضريبي');
      const vatRegistrationNo = getValue(row, 'القيمة المضافة', 'vat');
      const socialInsuranceNo = getValue(row, 'التأميني', 'تأمينات', 'insurance');

      const capitalRaw = getValue(row, 'رأس المال', 'capital');
      const capital = Number(String(capitalRaw).replace(/[^0-9.]/g, '')) || 0;

      const activity = getValue(row, 'النشاط', 'activity') || 'أنشطة تجارية واستثمارية';
      const contactPerson = getValue(row, 'المسؤول', 'المفوض', 'contact') || '';
      const rawPhone = getValue(row, 'الهاتف', 'موبايل', 'واتساب', 'phone', 'mobile');
      const phone = normalizePhoneNumber(rawPhone);
      const email = getValue(row, 'البريد', 'الإيميل', 'email');
      const address = getValue(row, 'العنوان', 'المقر', 'address') || '';
      const notes = getValue(row, 'ملاحظات', 'notes');

      // Portal Credentials
      const etaUsername = getValue(row, 'مستخدم بوابة الفاتورة', 'مستخدم الفاتورة', 'eta user');
      const etaPassword = getValue(row, 'مرور بوابة الفاتورة', 'مرور الفاتورة', 'eta pass');

      const generalTaxUsername = getValue(row, 'مستخدم الضرائب العامة', 'مستخدم البوابة الإلكترونية');
      const generalTaxPassword = getValue(row, 'مرور الضرائب العامة', 'مرور البوابة الإلكترونية');

      const sapUsername = getValue(row, 'مستخدم منظومة ساب', 'مستخدم ساب', 'sap user');
      const sapPassword = getValue(row, 'مرور منظومة ساب', 'مرور ساب', 'sap pass');

      const nafezaUsername = getValue(row, 'مستخدم نافذة', 'مستخدم الجمارك', 'nafeza user');
      const nafezaPassword = getValue(row, 'مرور نافذة', 'مرور الجمارك', 'nafeza pass');

      parsedClients.push({
        clientCode,
        name,
        clientType: 'PRIMARY',
        relationshipType: 'PERMANENT',
        companyType,
        commercialRegistrationNo,
        taxCardNo,
        taxOffice,
        incomeTaxFileNo,
        vatRegistrationNo,
        socialInsuranceNo,
        capital,
        partners: [],
        contactPerson,
        phone,
        email,
        address,
        activity,
        documents: [],
        folders: [],
        procedures: [],
        notes,
        portalCredentials: {
          etaEInvoicing: {
            username: etaUsername,
            password: etaPassword,
            portalUrl: 'https://invoicing.eta.gov.eg',
          },
          etaGeneralTax: {
            username: generalTaxUsername,
            password: generalTaxPassword,
          },
          sapPortal: {
            username: sapUsername,
            password: sapPassword,
          },
          nafeza: {
            username: nafezaUsername,
            password: nafezaPassword,
          },
        },
      });
    });

    if (parsedClients.length === 0) {
      errors.push('لم يتم العثور على أي سجلات عملاء صالحة في الملف المرفق.');
    }

    return {
      success: parsedClients.length > 0,
      clients: parsedClients,
      warnings,
      errors,
      totalRowsRead: rawRows.length,
      columnsDetected,
    };
  }
}
