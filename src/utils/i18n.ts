import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Comprehensive Bilingual Localization (Arabic / English)
 * with strict adherence to Egyptian Accounting Standards (EAS),
 * Egyptian Tax Authority (ETA) terminology, and professional audit conventions.
 */

export type AppLanguage = 'ar' | 'en';

export interface TranslationDict {
  // Navigation & General
  appTitle: string;
  auditorTitle: string;
  firmName: string;
  licenseNumber: string;
  standardsBadge: string;
  dashboard: string;
  accountingHub: string;
  financialReportingHub: string;
  taxAuditHub: string;
  officePracticeHub: string;
  customsHub: string;
  securityAuditHub: string;
  
  // Accounting modules
  chartOfAccounts: string;
  journalEntries: string;
  generalLedger: string;
  trialBalance: string;
  fixedAssets: string;
  currencyExchangeRates: string;
  financialStatements: string;
  financialNotes: string;
  auditorReport: string;
  creditSimulator: string;
  taxTracker: string;
  taxExposureSimulator: string;
  etaReconciliation: string;
  payrollInsurance: string;
  auditWorkingPapers: string;
  clientsArchive: string;
  officeTreasury: string;
  certificates: string;
  feasibilityStudy: string;
  invoicing: string;
  auditTrail: string;
  customsShipments: string;
  customsLandedCost: string;
  customsNafezaAci: string;

  // Egyptian Standard Tax & Regulatory terms
  eta: string;
  vat: string;
  wht: string;
  payrollTax: string;
  corporateIncomeTax: string;
  commercialRegister: string;
  taxCard: string;
  taxOffice: string;
  socialInsurance: string;
  eInvoicing: string;
  eReceipt: string;
  easStandards: string;
  cpaRegNumber: string;

  // Actions & Buttons
  exportCertifiedDoc: string;
  exportAllFormats: string;
  printDocument: string;
  printNow: string;
  printPreview: string;
  sendWhatsApp: string;
  sendEmail: string;
  copyText: string;
  copied: string;
  addClient: string;
  addProcedure: string;
  addJournalEntry: string;
  collectFees: string;
  payGovExpense: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  search: string;
  filter: string;
  all: string;
  status: string;
  inProgress: string;
  completed: string;
  pendingDocs: string;
  atAuthority: string;
  
  // Settings & Theme
  settings: string;
  language: string;
  arabic: string;
  english: string;
  themeMode: string;
  lightMode: string;
  darkMode: string;
  brandColor: string;
  userManagement: string;
  shortcuts: string;
  backupRestore: string;

  // Additional Enterprise & Navigation Keys
  oracleErp: string;
  sapErp: string;
  ocrScanner: string;
  bankReconciliation: string;
  budgetPlanner: string;
  cashFlowPredictor: string;
  financialSimulator: string;
  taxPenaltySimulator: string;
  fraudAuditSentinel: string;
  journalAuditScanner: string;
  practiceManagement: string;
  whatsappBot: string;
  allCompanies: string;
  activeFiscalYear: string;
  focusMode: string;
  exitFocusMode: string;
  lockScreen: string;
  systemManualPdf: string;
  desktopApp: string;
  keyboardShortcuts: string;
  auditStandards: string;
  version: string;
  checkUpdates: string;
  updateAvailable: string;
  switchLanguage: string;
  currentLanguage: string;
  egp: string;
  debit: string;
  credit: string;
  balance: string;
  unposted: string;
  posted: string;
  date: string;
  reference: string;
  description: string;
  amount: string;
  account: string;
  saveChanges: string;
  closeModal: string;
  screensMenu: string;
  selectScreen: string;
  tools: string;
  notifications: string;
  cloudSync: string;
  promoTitle: string;
  verifiedStamp: string;
  onlineVerification: string;
  qrVerified: string;
}

export const translations: Record<AppLanguage, TranslationDict> = {
  ar: {
    appTitle: 'منظومة المحاسب القانوني ومراقب الحسابات',
    auditorTitle: 'محاسب قانوني ومراقب حسابات - خبير ضرائب',
    firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
    licenseNumber: 'س.م.م / 43122 - ترخيص وزارة المالية',
    standardsBadge: 'المعايير المحاسبية المصرية (EAS)',
    dashboard: 'لوحة القيادة والمؤشرات العامة',
    accountingHub: 'الإدارة المحاسبية ودفاتر اليومية',
    financialReportingHub: 'القوائم المالية وتقارير المراجعة',
    taxAuditHub: 'الضرائب والفحص والفاتورة الإلكترونية',
    officePracticeHub: 'أرشيف العملاء وخزنة المكتب والشهادات',
    customsHub: 'الجمارك والتجارة الخارجية وحساب التكلفة',
    securityAuditHub: 'الأمان والرقابة وسجل العمليات (Audit Trail)',
    
    chartOfAccounts: 'شجرة الحسابات المصرية',
    journalEntries: 'قيود اليومية العامة',
    generalLedger: 'دفتر الأستاذ العام',
    trialBalance: 'ميزان المراجعة بالمجاميع والأرصدة',
    fixedAssets: 'سجل الأصول الثابتة والإهلاك (معيار 10)',
    currencyExchangeRates: 'أسعار الصرف اليومية (EAS 13)',
    financialStatements: 'القوائم المالية الختامية (EAS 1)',
    financialNotes: 'الإيضاحات المتممة للقوائم',
    auditorReport: 'تقرير مراقب الحسابات المستقل (معيار 700)',
    creditSimulator: 'محاكي الجدارة الائتمانية والتمويل',
    taxTracker: 'أجندة الإقرارات والالتزامات الضريبية',
    taxExposureSimulator: 'محاكي المخاطر والفحص الضريبي',
    etaReconciliation: 'مطابقة الفاتورة الإلكترونية (ETA)',
    payrollInsurance: 'محرك ضريبة المرتبات والتأمينات (قانون 148)',
    auditWorkingPapers: 'أوراق عمل الفحص والمراجعة التحليلية',
    clientsArchive: 'أرشيف العملاء وسجل الإجراءات',
    officeTreasury: 'خزنة المكتب وحسابات الأتعاب والرسوم',
    certificates: 'الشهادات المهنية المعتمدة',
    feasibilityStudy: 'دراسات الجدوى الاقتصادية',
    invoicing: 'الفواتير والمطالبات وأتعاب المراجعة',
    auditTrail: 'سجل الرقابة والأمان (Audit Trail)',
    customsShipments: 'سجل الشحنات والعمليات الجمركية',
    customsLandedCost: 'حاسبة التكلفة الإنزالية المستوردة',
    customsNafezaAci: 'منظومة نافذة والتسجيل المسبق ACI',

    eta: 'مصلحة الضرائب المصرية (ETA)',
    vat: 'ضريبة القيمة المضافة (VAT - قانون 67)',
    wht: 'ضريبة الخصم والتحصيل (WHT - نموذج 41)',
    payrollTax: 'ضريبة كسب العمل والمرتبات',
    corporateIncomeTax: 'ضريبة الأرباح التجارية والصناعية (قانون 91)',
    commercialRegister: 'السجل التجاري',
    taxCard: 'البطاقة الضريبية',
    taxOffice: 'مأمورية الضرائب المختصة',
    socialInsurance: 'الهيئة القومية للتأمين الاجتماعي (NOSI)',
    eInvoicing: 'منظومة الفاتورة الإلكترونية المصرية',
    eReceipt: 'منظومة الإيصال الإلكتروني',
    easStandards: 'معايير المحاسبة المصرية المعدلة',
    cpaRegNumber: 'رقم القيد بسجل المحاسبين والمراجعين',

    exportCertifiedDoc: 'تصدير المستند المعتمد',
    exportAllFormats: 'تصدير بجميع الصيغ (PDF, Word, PNG, Excel)',
    printDocument: 'طباعة المستند',
    printNow: 'طباعة الشهادة الآن',
    printPreview: 'معاينة الطباعة وتخصيص الهوامش',
    sendWhatsApp: 'إرسال عبر واتساب',
    sendEmail: 'إرسال عبر البريد الإلكتروني',
    copyText: 'نسخ النص',
    copied: 'تم النسخ',
    addClient: 'إضافة شركة / عميل جديد',
    addProcedure: 'إضافة إجراء / عملية',
    addJournalEntry: '+ قيد يومية',
    collectFees: 'تحصيل أتعاب',
    payGovExpense: 'سداد رسوم حكومية',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    search: 'بحث سريع...',
    filter: 'تصفية',
    all: 'الكل',
    status: 'الحالة',
    inProgress: 'جاري العمل',
    completed: 'مكتمل ومعتمد',
    pendingDocs: 'بانتظار مستندات',
    atAuthority: 'لدى الجهة الحكومية',

    settings: 'الإعدادات واللغة',
    language: 'لغة واجهة البرنامج',
    arabic: 'العربية (Arabic)',
    english: 'الإنجليزية (English)',
    themeMode: 'وضع العرض',
    lightMode: 'فاتح',
    darkMode: 'مظلم',
    brandColor: 'لون السمة',
    userManagement: 'إدارة المستخدمين والصلاحيات',
    shortcuts: 'اختصارات لوحة المفاتيح',
    backupRestore: 'النسخ الاحتياطي والاستعادة',

    oracleErp: 'منظومة أوراكل ERP المالية',
    sapErp: 'منظومة ساب S/4HANA المحاسبية',
    ocrScanner: 'مسح واستخراج الفواتير (OCR)',
    bankReconciliation: 'مذكرة التسوية البنكية',
    budgetPlanner: 'الموازنة التقديرية التخطيطية',
    cashFlowPredictor: 'محاكي التدفقات النقدية المتوقعة',
    financialSimulator: 'محاكي المؤشرات والنسب المالية',
    taxPenaltySimulator: 'محاكي مقابل التأخير والغرامات',
    fraudAuditSentinel: 'حارس كشف الاحتيال والمخاطر',
    journalAuditScanner: 'الفحص الآلي لقيود اليومية',
    practiceManagement: 'إدارة عقود وارتباطات المكتب',
    whatsappBot: 'المساعد الآلي لواتساب العملاء',
    allCompanies: 'كافة الشركات والقيود',
    activeFiscalYear: 'السنة المالية النشطة',
    focusMode: 'وضع التركيز',
    exitFocusMode: 'إنهاء وضع التركيز',
    lockScreen: 'قفل الشاشة (PIN)',
    systemManualPdf: 'دليل المنظومة (PDF)',
    desktopApp: 'تطبيق سطح المكتب',
    keyboardShortcuts: 'اختصارات لوحة المفاتيح',
    auditStandards: 'معايير المحاسبة والمراجعة المصرية (EAS / ESA)',
    version: 'الإصدار',
    checkUpdates: 'فحص التحديثات',
    updateAvailable: 'تحديث متاح',
    switchLanguage: 'تبديل لغة الواجهة',
    currentLanguage: 'اللغة الحالية: العربية',
    egp: 'ج.م',
    debit: 'مدين',
    credit: 'دائن',
    balance: 'الرصيد',
    unposted: 'غير مرحل',
    posted: 'مرحل',
    date: 'التاريخ',
    reference: 'رقم المرجع / القيد',
    description: 'البيان / الوصف',
    amount: 'المبلغ',
    account: 'الحساب',
    saveChanges: 'حفظ التغييرات',
    closeModal: 'إغلاق',
    screensMenu: 'شاشات وأقسام المنظومة',
    selectScreen: 'الانتقال إلى شاشة أو قسم...',
    tools: 'الأدوات',
    notifications: 'الإشعارات والمواعيد',
    cloudSync: 'المزامنة السحابية',
    promoTitle: 'برومو المكتب',
    verifiedStamp: 'معتمد وموثق رقمياً',
    onlineVerification: 'التحقق الإلكتروني بالباركود',
    qrVerified: 'رمز الاستجابة السريعة QR صالح ومفعل',
  },
  en: {
    appTitle: 'Egyptian CPA & Auditor Practice Management System',
    auditorTitle: 'Certified Public Accountant & Statutory Auditor',
    firmName: 'CPA & Statutory Auditor Practice',
    licenseNumber: 'Reg. No. 43122 - Egyptian Ministry of Finance',
    standardsBadge: 'Egyptian Accounting Standards (EAS)',
    dashboard: 'Executive Dashboard & KPI Analytics',
    accountingHub: 'Accounting & Journal Entries Hub',
    financialReportingHub: 'Financial Statements & Audit Reporting Hub',
    taxAuditHub: 'Tax, Audit & E-Invoicing (ETA) Hub',
    officePracticeHub: 'Clients, Treasury & Certified Documents Hub',
    customsHub: 'Customs, Global Trade & Landed Cost Hub',
    securityAuditHub: 'Security, Compliance & Audit Trail Hub',

    chartOfAccounts: 'Egyptian Standard Chart of Accounts',
    journalEntries: 'General Journal Entries',
    generalLedger: 'General Ledger',
    trialBalance: 'Trial Balance (Sums & Balances)',
    fixedAssets: 'Fixed Assets & Depreciation (EAS 10)',
    currencyExchangeRates: 'Daily Exchange Rates (EAS 13)',
    financialStatements: 'Financial Statements (EAS 1)',
    financialNotes: 'Notes to Financial Statements',
    auditorReport: 'Independent Auditor’s Report (ESA 700)',
    creditSimulator: 'Credit Rating & Bank Financing Simulator',
    taxTracker: 'Tax Declarations & Statutory Deadlines',
    taxExposureSimulator: 'Tax Exposure & Audit Risk Simulator',
    etaReconciliation: 'Egyptian Tax Authority (ETA) E-Invoice Reconciliation',
    payrollInsurance: 'Payroll Tax & Social Insurance Engine (Law 148)',
    auditWorkingPapers: 'Audit Working Papers & Analytical Review',
    clientsArchive: 'Client Archive & Procedure Registry',
    officeTreasury: 'Office Treasury & Professional Fees Ledger',
    certificates: 'Certified Income & Solvency Certificates',
    feasibilityStudy: 'Economic Feasibility Studies',
    invoicing: 'Invoicing & Audit Billing Engine',
    auditTrail: 'System Security & Audit Trail',
    customsShipments: 'Shipments & Customs Registry',
    customsLandedCost: 'Imported Landed Cost Calculator',
    customsNafezaAci: 'Nafeza ACI Advanced Registration',

    eta: 'Egyptian Tax Authority (ETA)',
    vat: 'Value Added Tax (VAT - Law 67)',
    wht: 'Withholding Tax (WHT - Form 41)',
    payrollTax: 'Payroll & Wage Income Tax',
    corporateIncomeTax: 'Corporate Income Tax (CIT - Law 91)',
    commercialRegister: 'Commercial Register (CR)',
    taxCard: 'Tax Card Number',
    taxOffice: 'Competent Tax Office',
    socialInsurance: 'National Organization for Social Insurance (NOSI)',
    eInvoicing: 'Egyptian E-Invoicing System',
    eReceipt: 'Egyptian E-Receipt System',
    easStandards: 'Egyptian Accounting Standards (EAS)',
    cpaRegNumber: 'General Register of Accountants and Auditors',

    exportCertifiedDoc: 'Export Certified Document',
    exportAllFormats: 'Export All Formats (PDF, Word, PNG, Excel)',
    printDocument: 'Print Document',
    printNow: 'Print Certificate Now',
    printPreview: 'Print Preview & Margin Setup',
    sendWhatsApp: 'Send via WhatsApp',
    sendEmail: 'Send via Email',
    copyText: 'Copy Text',
    copied: 'Copied',
    addClient: 'Add New Client / Company',
    addProcedure: 'Add New Task / Procedure',
    addJournalEntry: '+ New Journal Entry',
    collectFees: 'Collect Professional Fees',
    payGovExpense: 'Disburse Gov. Fees',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Quick Search...',
    filter: 'Filter',
    all: 'All',
    status: 'Status',
    inProgress: 'In Progress',
    completed: 'Completed & Certified',
    pendingDocs: 'Pending Client Docs',
    atAuthority: 'At Government Authority',

    settings: 'Settings & Language',
    language: 'Interface Language',
    arabic: 'Arabic (العربية)',
    english: 'English (الإنجليزية)',
    themeMode: 'Display Mode',
    lightMode: 'Light',
    darkMode: 'Dark',
    brandColor: 'Brand Accent',
    userManagement: 'User Management & RBAC',
    shortcuts: 'Keyboard Shortcuts',
    backupRestore: 'Backup & Restore',

    oracleErp: 'Oracle Fusion ERP Financials',
    sapErp: 'SAP S/4HANA & B1 Integration',
    ocrScanner: 'OCR Invoice Scanner',
    bankReconciliation: 'Bank Reconciliation',
    budgetPlanner: 'Budget & Financial Planning',
    cashFlowPredictor: 'Cash Flow Forecast Predictor',
    financialSimulator: 'Financial Ratios Simulator',
    taxPenaltySimulator: 'Tax Penalties & Delay Calculator',
    fraudAuditSentinel: 'Fraud Sentinel & Anomaly Audit',
    journalAuditScanner: 'Automated Journal Scanner',
    practiceManagement: 'Practice & Engagement Management',
    whatsappBot: 'WhatsApp Client Assistant',
    allCompanies: 'All Companies & Records',
    activeFiscalYear: 'Active Fiscal Year',
    focusMode: 'Focus Mode',
    exitFocusMode: 'Exit Focus Mode',
    lockScreen: 'Lock Screen (PIN)',
    systemManualPdf: 'System Manual (PDF)',
    desktopApp: 'Desktop App',
    keyboardShortcuts: 'Keyboard Shortcuts',
    auditStandards: 'Egyptian Accounting Standards (EAS / ESA)',
    version: 'Version',
    checkUpdates: 'Check for Updates',
    updateAvailable: 'Update Available',
    switchLanguage: 'Switch Language',
    currentLanguage: 'Current: English',
    egp: 'EGP',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
    unposted: 'Unposted',
    posted: 'Posted',
    date: 'Date',
    reference: 'Reference No.',
    description: 'Description',
    amount: 'Amount',
    account: 'Account',
    saveChanges: 'Save Changes',
    closeModal: 'Close',
    screensMenu: 'Modules & Screens',
    selectScreen: 'Navigate to module or screen...',
    tools: 'Tools',
    notifications: 'Notifications & Deadlines',
    cloudSync: 'Cloud Sync',
    promoTitle: 'Office Promo',
    verifiedStamp: 'Certified & Digitally Verified',
    onlineVerification: 'Online QR Code Verification',
    qrVerified: 'QR Code Valid and Online Active',
  },
};

export const getTranslation = (lang: AppLanguage = 'ar'): TranslationDict => {
  return translations[lang] || translations.ar;
};

/**
 * Format currency according to active language conventions
 */
export const formatCurrency = (amount: number, lang: AppLanguage = 'ar'): string => {
  const formatted = Math.abs(amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currencySymbol = lang === 'ar' ? 'ج.م' : 'EGP';

  if (amount < 0) {
    return lang === 'ar' ? `(${formatted}) ${currencySymbol}` : `(${currencySymbol} ${formatted})`;
  }
  return lang === 'ar' ? `${formatted} ${currencySymbol}` : `${currencySymbol} ${formatted}`;
};

/**
 * Format numbers with locale
 */
export const formatNumber = (num: number, lang: AppLanguage = 'ar', decimals = 2): string => {
  return num.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format date according to active language
 */
export const formatDate = (dateStr: string, lang: AppLanguage = 'ar'): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

interface I18nContextType {
  language: AppLanguage;
  isAr: boolean;
  isEn: boolean;
  t: TranslationDict;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number, decimals?: number) => string;
  formatDate: (dateStr: string) => string;
  setLanguage: (lang: AppLanguage) => void;
}

const I18nContext = createContext<I18nContextType>({
  language: 'ar',
  isAr: true,
  isEn: false,
  t: translations.ar,
  formatCurrency: (amount: number) => formatCurrency(amount, 'ar'),
  formatNumber: (num: number, decimals?: number) => formatNumber(num, 'ar', decimals),
  formatDate: (dateStr: string) => formatDate(dateStr, 'ar'),
  setLanguage: () => {},
});

export const I18nProvider: React.FC<{
  language: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
  children: React.ReactNode;
}> = ({ language, onLanguageChange, children }) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const t = getTranslation(language);

  const handleSetLanguage = (lang: AppLanguage) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  return React.createElement(
    I18nContext.Provider,
    {
      value: {
        language,
        isAr,
        isEn,
        t,
        formatCurrency: (amount: number) => formatCurrency(amount, language),
        formatNumber: (num: number, decimals?: number) => formatNumber(num, language, decimals),
        formatDate: (dateStr: string) => formatDate(dateStr, language),
        setLanguage: handleSetLanguage,
      },
    },
    children
  );
};

export const useI18n = () => useContext(I18nContext);
