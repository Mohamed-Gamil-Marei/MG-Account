import { OfficeProfile, SystemUser, UserPreferences, WhatsAppBotSettings } from '../types';

export const DEFAULT_OFFICE_PROFILE: OfficeProfile = {
  auditorName: 'محمد جميل مرعي',
  firmName: 'مكتب المحاسب القانوني ومراقب الحسابات / محمد جميل مرعي',
  title: 'محاسب قانوني ومراجع حسابات',
  licenseNumber: 'س.م.م 43122',
  taxAuthorityRegNo: '120-489-890',
  address: '32 شارع مصطفى النحاس - مدينة نصر - القاهرة - مصر',
  phone: '0552777332',
  mobile: '01003335360',
  email: 'info@marei-cpa.com',
  logoUrl: '',
  commercialRegisterNo: '98412',
  chamberRegistrationNo: 'CPA-EG-43122',
  defaultTaxEnabled: true,
  defaultTaxRate: 14,
  includeOfficeTaxInfo: true,
  sendClientDataToGemini: false,
} as any;

export const DEFAULT_CLIENT_FOLDERS = [
  'المستندات الدائمة والبطاقة الضريبية',
  'الفواتير والإشعارات الإلكترونية',
  'الإقرارات الضريبية المعتمدة',
  'مذكرات الفحص والطعون الضريبية',
  'مستندات كسب العمل والتأمينات',
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'system',
  brandColor: 'emerald',
  language: 'ar',
  compactView: false,
};

export const DEFAULT_WHATSAPP_BOT_SETTINGS: WhatsAppBotSettings = {
  isAutoReplyEnabled: true,
  officeWorkingHours: '09:00 - 17:00',
  welcomeGreeting: 'مرحباً بك في مكتب المحاسب القانوني ومراقب الحسابات د. محمد جميل مرعي',
  botName: 'مساعد المكتب الذكي',
  includeQrVerification: true,
  apiDispatchMode: 'DIRECT_WEB_API',
  customApiBaseUrl: 'https://api.whatsapp.com/send',
  templates: [
    {
      id: 'tmpl-1',
      code: 'VERIFICATION_CODE',
      title: 'رمز التحقق الرقمي المعتمد',
      category: 'GENERAL' as any,
      subject: 'رمز التوثيق',
      templateBody: 'رمز التأكيد الخاص ببيانات الاعتماد لمكتب المحاسب القانوني هو: {code}. للاستفسار اتصل على 01003335360.',
    },
    {
      id: 'tmpl-2',
      code: 'INVOICE_NOTIFY',
      title: 'إشعار إصدَار فاتورة إلكترونية',
      category: 'GENERAL' as any,
      subject: 'فاتورة إلكترونية جديدة',
      templateBody: 'عزيزي العميل {clientName}، تم إصدار الفاتورة رقم {invoiceNo} بمبلغ {amount} ج.م.',
    },
  ],
};

export const SAMPLE_WHATSAPP_MESSAGES = [];

export const SAMPLE_SYSTEM_USERS: SystemUser[] = [
  {
    id: 'user-admin',
    name: 'المدير الرئيسي - محمد جميل مرعي',
    email: 'admin@marei-cpa.com',
    role: 'ADMIN',
    roleTitleArabic: 'مدير المنظومة والشريك المسؤول',
    isActive: true,
    canManageUsers: true,
    canAccessTreasury: true,
    canAccessAuditTrail: true,
    canPostEntries: true,
    canEditPostedEntries: true,
    canDeleteRecords: true,
    canAccessCreditFiles: true,
    canAccessTaxReports: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-accountant',
    name: 'محاسب عام - أحمد محمود',
    email: 'accountant@marei-cpa.com',
    role: 'ACCOUNTANT',
    roleTitleArabic: 'محاسب رئيسي بالمنظومة',
    isActive: true,
    canManageUsers: false,
    canAccessTreasury: true,
    canAccessAuditTrail: false,
    canPostEntries: true,
    canEditPostedEntries: false,
    canDeleteRecords: false,
    canAccessCreditFiles: true,
    canAccessTaxReports: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

export const SAMPLE_CLIENTS = [
  {
    id: 'client-1',
    code: 'CLI-101',
    name: 'شركة النيل للتقنية والتجارة',
    taxId: '310-984-123',
    commercialRegister: '54321',
    incomeTaxFileNo: '120/489/أموال',
    legalForm: 'SOLE_PROPRIETORSHIP' as const,
    industry: 'تكنولوجيا المعلومات والبرمجيات',
    address: 'المنطقة التكنولوجية - المعادي - القاهرة',
    phone: '01001234567',
    email: 'finance@nile-tech.eg',
    contactPerson: 'م. أحمد حسن',
    isWithholdingTaxSubject: true,
    fiscalYearEndMonth: 12,
  },
  {
    id: 'client-2',
    code: 'CLI-102',
    name: 'شركة الأهرام للصناعات الهندسية',
    taxId: '421-876-543',
    commercialRegister: '98765',
    incomeTaxFileNo: '312/980/صناعي',
    legalForm: 'JOINT_STOCK' as const,
    industry: 'الصناعات الهندسية والمعدنية',
    address: 'المنطقة الصناعية السادسة - 6 أكتوبر - الجيزة',
    phone: '01122334455',
    email: 'info@ahram-eng.com',
    contactPerson: 'أ. محمود عبد الرحمن',
    isWithholdingTaxSubject: true,
    fiscalYearEndMonth: 12,
  },
];

export const SAMPLE_JOURNAL_ENTRIES = [
  {
    id: 'je-1',
    entryNumber: 'JE-2026-001',
    date: '2026-01-15',
    description: 'اثبات مبيعات استشارية نقداً بموجب فاتورة إلكترونية رقم 1001',
    lines: [
      { id: 'jel-1', accountCode: '1101', accountName: 'الربط المباشر مع الخزينة الرئيسية', debit: 114000, credit: 0 },
      { id: 'jel-2', accountCode: '4101', accountName: 'إيرادات النشاط الرئيسي (المبيعات)', debit: 0, credit: 100000 },
      { id: 'jel-3', accountCode: '2103', accountName: 'مصلحة الضرائب - ضريبة القيمة المضافة', debit: 0, credit: 14000 },
    ],
    status: 'POSTED' as const,
    postedAt: '2026-01-15T10:30:00Z',
    postedBy: 'محمد جميل مرعي',
    fiscalYear: 2026,
  },
];

export const SAMPLE_INVOICES = [];
export const SAMPLE_INVENTORIES = [];
export const SAMPLE_CREDIT_DOSSIERS = [];
export const SAMPLE_FEASIBILITY_STUDIES = [];
export const SAMPLE_CUSTOMS_DECLARATIONS = [];
export const SAMPLE_BANK_STATEMENTS = [];
export const SAMPLE_TAX_DECLARATIONS = [];
export const SAMPLE_TAX_MANDATES = [];
export const SAMPLE_AUDIT_PAPERS = [];
export const SAMPLE_TREASURY_TRANSACTIONS = [];
export const SAMPLE_CERTIFICATES = [];
export const SAMPLE_FIXED_ASSETS = [];
export const SAMPLE_FEASIBILITY_STUDY = {};
export const SAMPLE_CREDIT_SIMULATION = {};
export const SAMPLE_FEE_ESTIMATES = [];
