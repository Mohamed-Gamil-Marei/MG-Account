/**
 * Types and interfaces for the Egyptian Accounting & Auditing System
 * منظومة المحاسب القانوني ومراقب الحسابات / محمد جميل مرعي
 */

export type AccountCategory = 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'REVENUES' | 'EXPENSES';
export type AccountNature = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  code: string; // e.g. "1110", "1210", "2110"
  name: string;
  nameEn?: string; // Standard English accounting name (IFRS/EAS)
  category: AccountCategory;
  nature: AccountNature;
  level: number; // 1 = Main, 2 = Sub, 3 = Analytical
  parentId?: string | null;
  openingBalanceDebit: number;
  openingBalanceCredit: number;
  currentDebit?: number;
  currentCredit?: number;
  currentBalance?: number;
  description?: string;
  isSystem?: boolean;
  currency?: CurrencyCode; // العملة الخاصة بالحساب (افتراضياً EGP)
}

export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'SAR' | 'AED' | 'GBP' | 'KWD' | 'QAR' | 'CNY';

export interface CurrencyRateInfo {
  code: CurrencyCode;
  nameAr: string;
  nameEn: string;
  symbol: string;
  rateToEgp: number; // e.g. 48.65 for USD
  flag: string;
  updatedAt?: string;
}

export interface DailyExchangeRateRecord {
  id: string;
  date: string; // YYYY-MM-DD
  currency: CurrencyCode;
  baseCurrency: CurrencyCode; // Usually 'EGP'
  buyRate: number; // سعر الشراء البنكي
  sellRate: number; // سعر البيع البنكي
  officialRate: number; // سعر البنك المركزي المصري (CBE Mid Rate)
  source?: 'CBE' | 'MANUAL' | 'COMMERCIAL_BANKS' | 'CUSTOM';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  currency?: CurrencyCode; // العملة الخاصة بالسطر
  exchangeRate?: number;   // سعر الصرف مقابل الجنيه المصري
  foreignDebit?: number;   // المبلغ بالعملة الأجنبية مدين
  foreignCredit?: number;  // المبلغ بالعملة الأجنبية دائن
  debit: number;           // القيمة المعيارية بالجنيه المصري (EGP)
  credit: number;          // القيمة المعيارية بالجنيه المصري (EGP)
  costCenter?: string;
  description?: string;
}

export interface AuditRecord {
  timestamp: string;
  user: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'UNPOST' | string;
  details: string;
  previousValue?: any;
  newValue?: any;
}

export interface JournalEntry {
  id: string;
  entryNumber: number;
  serialNumber: string; // e.g. "JV-2026-0001"
  date: string;
  description: string;
  currency?: CurrencyCode;     // العملة الرئيسية للقيد (افتراضياً EGP)
  clientId?: string;           // معرف العميل المرتبط بالقيد
  clientName?: string;         // اسم العميل المرتبط بالقيد
  exchangeRate?: number;       // سعر الصرف المطبق على القيد
  foreignTotalDebit?: number;  // إجمالي المدين بالعملة الأجنبية
  foreignTotalCredit?: number; // إجمالي الدائن بالعملة الأجنبية
  lines: JournalEntryLine[];
  totalDebit: number;          // إجمالي المدين بالجنيه المصري
  totalCredit: number;         // إجمالي الدائن بالجنيه المصري
  isPosted: boolean;
  entryType: 'GENERAL' | 'ADJUSTING' | 'CLOSING' | 'RECEIPT' | 'PAYMENT' | 'SALES' | 'PURCHASE';
  referenceNumber?: string;
  qrPayload?: string;
  attachedFileUrl?: string;
  attachedFileName?: string;
  auditTrail: AuditRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FiscalPeriodLock {
  id: string;
  fiscalYear: number;
  period: string; // 'ANNUAL' or 'Q1', 'Q2', 'Q3', 'Q4' or '01'..'12'
  isLocked: boolean;
  lockedAt: string;
  lockedBy: string;
  closingEntryId?: string;
  notes?: string;
}

export type ProcedureStatus =
  | 'PENDING'              // في الانتظار / قيد التجهيز
  | 'IN_PROGRESS'          // جاري العمل والتنفيذ
  | 'PENDING_CLIENT_DOCS'  // بانتظار مستندات من العميل
  | 'AT_AUTHORITY'         // لدى الجهة الحكومية / المأمورية / الاستثمار
  | 'COMPLETED'            // تم الإنجاز والاعتماد
  | 'CANCELLED';           // ملغي / معلق

export type ProcedureCategory =
  | 'TAX_AUDIT'            // فحص ضريبي
  | 'TAX_DECLARATION'      // إقرارات ضريبية
  | 'COMPANY_ESTABLISHMENT'// تأسيس وتعديل شركات
  | 'COMMERCIAL_REGISTRY'  // استخراج وتجديد سجل تجاري
  | 'FINANCIAL_AUDIT'      // مراجعة واعتماد قوائم مالية
  | 'FEASIBILITY_STUDY'    // دراسة جدوى اقتصادية
  | 'PROFESSIONAL_CERT'    // شهادة مهنية ودخل
  | 'SOCIAL_INSURANCE'     // تأمينات اجتماعية وملف عمال
  | 'GOV_FEE_PAYMENT'      // سداد رسوم ومصروفات حكومية
  | 'GENERAL_CONSULTING';  // استشارات وخدمات محاسبية

export interface ClientProcedureTask {
  id: string;
  clientId: string;
  clientName: string;
  procedureCode: string; // e.g. "PRC-2026-001"
  title: string; // e.g. "استخراج سجل تجاري محدث وتعديل السمة التجارية"
  category: ProcedureCategory;
  description?: string;
  assignedTo: string; // اسم المحاسب أو المراجع المسؤول
  status: ProcedureStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: string;
  dueDate: string;
  completedDate?: string;
  
  // Financial & Treasury Integration (رسوم وأتعاب الخزنة)
  agreedFees: number;               // إجمالي الأتعاب المتفق عليها
  collectedFees: number;            // الأتعاب المحصلة فعلياً في الخزنة
  governmentFees: number;           // الرسوم والمصروفات الحكومية المسددة من الخزنة
  
  feeTreasuryVouchers?: string[];   // أرقام سندات قبض الأتعاب بالخزنة (e.g. TR-2026-0012)
  expenseTreasuryVouchers?: string[]; // أرقام سندات صرف الرسوم من الخزنة (e.g. TR-2026-0045)
  
  progressPercent: number; // 0 to 100%
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDocumentFolder {
  id: string;
  clientId: string;
  name: string; // e.g. "القوائم المالية والتقارير", "المستندات القانونية والتأسيسية", "الإقرارات والفواتير الضريبية", "المراجعة والتكليفات", "العقود والاتفاقيات"
  icon?: string; // 'folder' | 'file-text' | 'shield' | 'percent' | 'scale' | 'briefcase'
  color?: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  clientId?: string;
  folderId?: string;
  folderName?: string;
  title: string;
  documentType: 'TAX_CARD' | 'COMMERCIAL_REG' | 'ARTICLES_OF_INC' | 'FINANCIAL_REPORT' | 'POWER_OF_ATTORNEY' | 'RECEIPT' | 'AUDIT_REPORT' | 'TAX_RETURN' | 'CONTRACT' | 'OTHER';
  fileDataUrl: string; // Base64 or Blob URL
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  tag?: string;
  notes?: string;
}

export type ClientRelationshipType = 'PERMANENT' | 'TEMPORARY'; // دائم (سنوي/تعاقدي) | مؤقت (استشاري/مهمة محددة)

export interface ActiveClientContext {
  clientId: string | null;
  clientName?: string;
  clientCode?: string;
  relationshipType?: ClientRelationshipType;
  selectedFiscalYear?: number;
  autoFilterAccountingData?: boolean;
  lastUpdated?: string;
}

export interface PortalCredentials {
  // منظومة الفاتورة والإيصال الإلكتروني
  etaPortal?: {
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenExpiryDate?: string;
    notes?: string;
  };
  etaEInvoicing?: {
    username?: string;
    password?: string;
    expiryDate?: string;
    portalUrl?: string;
    tokenExpiryDate?: string;
    clientId?: string;
    clientSecret?: string;
    notes?: string;
  };
  // منظومة الضرائب العامة (الساب / كبار الممولين / البوابة الإلكترونية)
  sapTaxPortal?: {
    username?: string;
    password?: string;
    pinOtp?: string;
    expiryDate?: string;
    notes?: string;
  };
  sapPortal?: {
    username?: string;
    password?: string;
    pinOtp?: string;
    expiryDate?: string;
    notes?: string;
  };
  // منظومة ضريبة المرتبات والأجور (كسب العمل)
  payrollTaxPortal?: {
    username?: string;
    password?: string;
    expiryDate?: string;
    notes?: string;
  };
  etaGeneralTax?: {
    username?: string;
    password?: string;
    pinOtp?: string;
    expiryDate?: string;
    notes?: string;
  };
  etaPayrollTax?: {
    username?: string;
    password?: string;
    expiryDate?: string;
    notes?: string;
  };
  // منظومة نافذة (الجمارك والتجارة الخارجية)
  nafezaPortal?: {
    username?: string;
    password?: string;
    tradeCode?: string;
    expiryDate?: string;
    notes?: string;
  };
  nafeza?: {
    username?: string;
    password?: string;
    tradeCode?: string;
    expiryDate?: string;
    notes?: string;
  };
  // توكن الختم والتوقيع الإلكتروني (Egypt Trust, MCDR, Delta, etc.)
  eSignatureToken?: {
    provider?: string; // شركة إيجيبت ترست / مصر للمقاصة / دلتا
    tokenType?: 'E_SEAL' | 'E_SIGNATURE'; // ختم إلكتروني / توقيع إلكتروني
    pin?: string; // الرقم السري للتوكن
    password?: string;
    serialNumber?: string;
    expiryDate?: string;
    notes?: string;
  };
  // التأمينات الاجتماعية والعمل
  socialInsurancePortal?: {
    username?: string;
    password?: string;
    facilityNumber?: string;
    expiryDate?: string;
    notes?: string;
  };
}

export type CompanyType = 'JOINT_STOCK' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'INDIVIDUAL' | 'ONE_PERSON' | 'LIMITED_LIABILITY';

export interface ClientArchiveRecord {
  id: string;
  clientCode: string; // e.g. "CL-0101"
  name: string;
  clientType: 'PRIMARY' | 'CASUAL'; // عميل أساسي للمكتب / عميل عابر
  relationshipType?: ClientRelationshipType; // تصنيف العلاقة: دائم (Permanent) أو مؤقت (Temporary)
  companyType: CompanyType;
  commercialRegistrationNo: string;
  taxCardNo: string;
  taxOffice: string; // مأمورية الضرائب المختصة
  incomeTaxFileNo: string;
  vatRegistrationNo: string;
  socialInsuranceNo: string;
  // تفاصيل الخضوع الضريبي والتأميني والمنظومة
  taxSystemType?: 'SAP' | 'OLD_PORTAL' | 'ETA_INTEGRATED'; // المنظومة: ساب المدمجة / القديمة
  isVatSubject?: boolean; // خاضع لضريبة القيمة المضافة؟
  vatStatus?: 'STANDARD_14' | 'TABLE_TAX' | 'EXEMPT' | 'NOT_SUBJECT'; // نوع الخضوع للقيمة المضافة
  isSocialInsuranceSubject?: boolean; // خاضع للتأمينات الاجتماعية؟
  socialInsuranceOffice?: string; // مكتب التأمينات المختص
  insuredWorkersCount?: number; // عدد العمالة المؤمن عليها
  eInvoicingStatus?: 'MANDATED_STAGE' | 'REGISTERED' | 'EXEMPT' | 'E_RECEIPT'; // الموقف من الفاتورة والإيصال
  eInvoicingStage?: string; // مرحلة الإلزام للفاتورة
  isPayrollSubject?: boolean; // خاضع لضريبة كسب العمل (نموذج 4)
  isWithholdingTaxSubject?: boolean; // خاضع لنظام الخصم والتحصيل تحت حساب الضريبة (نموذج 41)
  capital: number;
  partners: { name: string; sharePercentage: number; role: string; nationalId?: string }[];
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  activity: string;
  activityType?: string;
  commercialName?: string;
  legalForm?: string;
  legalStructure?: string;
  portalCredentials?: PortalCredentials; // بيانات الحسابات الحكومية والضرائب والساب ونافذة
  folders?: ClientDocumentFolder[]; // المجلدات والتصنيفات للمستندات
  documents: ClientDocument[];
  procedures?: ClientProcedureTask[]; // السجل الإداري الشامل للإجراءات والمهام
  tasksHistory?: { id: string; date: string; taskDescription: string; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'; fees: number; treasuryTxId?: string }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeTreasuryTransaction {
  id: string;
  voucherNumber: string; // e.g. "TR-2026-0045"
  date: string;
  type: 'INCOME_FEES' | 'EXPENSE_OFFICE' | 'EXPENSE_CLIENT_GOV_FEE' | 'PARTNER_DRAWINGS' | 'PETTY_CASH';
  category: string; // أتعاب فحص ضريبي، أتعاب اعتماد ميزانية، رسوم استخراج سجل تجاري، مصاريف إدارية...
  amount: number;
  clientId?: string;
  clientName?: string;
  procedureId?: string; // معرف الإجراء المرتبط
  procedureTitle?: string; // اسم الإجراء المرتبط
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'INSTAPAY' | 'CHEQUE';
  referenceNo?: string;
  description: string;
  recordedBy: string;
  qrPayload?: string;
  attachedFileUrl?: string;
  createdAt: string;
}

export interface TaxDeclarationRecord {
  id: string;
  declarationType: 'VAT_10' | 'INCOME_27_CORP' | 'INCOME_28_INDIV' | 'PAYROLL_4' | 'WHT_41' | 'ANNUAL_PAYROLL_SETTLEMENT';
  period: string; // e.g. "شهر يناير 2026", "الربع الأول 2026", "سنة 2025"
  taxYear: number;
  clientId: string;
  clientName: string;
  dueDate: string;
  submissionDate?: string;
  status: 'DRAFT' | 'READY_TO_SUBMIT' | 'SUBMITTED_TO_ETA' | 'PAID' | 'OVERDUE' | 'APPROVED' | 'LATE';
  // VAT Specifics
  salesTaxableAmount?: number;
  vatOutputTax?: number; // 14%
  purchasesTaxableAmount?: number;
  vatInputTax?: number; // ضريبة المدخلات المخصومة
  netVatPayable?: number;
  netVatDue?: number;
  // Income / Payroll specifics
  grossTaxableIncome?: number;
  taxDue?: number;
  totalTaxDue?: number;
  whtDeducted?: number; // مسدد تحت حساب الضريبة
  netTaxPayable?: number;
  receiptNumber?: string;
  paymentProofUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CertificateBeneficiaryType = 'NATURAL_PERSON' | 'LEGAL_ENTITY'; // شخص طبيعي (فرد / مهنة حرة / موظف) | شخص اعتباري (شركة / منشأة)
export type CertificateTemplateType = 
  | 'INCOME_PROOF'            // إثبات صافي دخل سنوي / شهري
  | 'FREELANCE_INCOME'        // إثبات صافي دخل مهن حرة واستشارات
  | 'EMPLOYEE_ADDITIONAL_INC' // إثبات دخول إضافية واستثمارات للأفراد
  | 'INVESTED_CAPITAL'        // رأس مال مستثمر وحجم أعمال
  | 'FINANCIAL_SOLVENCY'      // ملاءة مالية وثروة
  | 'AUDIT_COMPLIANCE'        // فحص ومراجعة حسابات وقوائم مالية
  | 'REAL_ESTATE_INCOME'      // إثبات إيرادات عقارية واستثمارية
  | 'CUSTOM_CERTIFICATE';     // شهادة مهنية عامة مخصصة الصياغة

export interface ProfessionalCertificate {
  id: string;
  certificateNumber: string; // e.g. "CERT-2026-089"
  certificateType: CertificateTemplateType;
  customCertificateHeading?: string; // عنوان مخصص للشهادة (بدل العنوان الافتراضي)
  beneficiaryType: CertificateBeneficiaryType; // نوع المستفيد (شخص طبيعي أو اعتباري)
  issueDate: string;
  clientId?: string;
  clientName: string;
  beneficiaryTitle?: string; // اللقب أو الصفة (مثل: السيد /، السيدة /، الدكتور /)
  beneficiaryGender?: 'MALE' | 'FEMALE'; // ذكر أو أنثى لضبط الصياغة والتأنيث/التذكير
  customIntroText?: string; // صيغة مخصصة للديباجة ومقدمة الشهادة
  customBodyText?: string; // صيغة مخصصة لمتن الشهادة
  customPreambleBasis?: string; // صيغة الفحص والاستناد المخصصة
  customDeclarationPhrase?: string; // عبارة الإقرار المخصصة (نشهد ونقر بأن...)

  nationalId?: string; // الرقم القومي (14 رقم) للأشخاص الطبيعيين
  jobTitle?: string; // المهنة / الوظيفة الحالية للأشخاص الطبيعيين
  address?: string; // محل الإقامة أو المقر
  commercialRegNo?: string; // السجل التجاري (للشركات والأنشطة الفردية)
  taxCardNo?: string; // البطاقة الضريبية إن وجدت
  activityName?: string; // اسم المنشأة / جهة العمل / طبيعة النشاط
  recipientEntity: string; // e.g. "بنك مصر - قطاع التمويل العقاري والائتمان", "سفارة...", "الهيئة العامة للاستثمار"
  purpose: string;
  periodText: string; // e.g. "عن السنة المالية المنتهية في 31 ديسمبر 2025" أو "عن متوسط الدخل الشهري لعام 2025"
  certifiedAmount: number; // المبلغ المعتمد الرئيسي
  monthlyAmount?: number; // المعادل الشهري إن وجد
  annualNetIncome?: number; // صافي الدخل السنوي
  monthlyNetIncome?: number; // صافي الدخل الشهري
  
  // Invested Capital & Business Size specifics
  investedCapitalAmount?: number; // إجمالي رأس المال المستثمر
  paidCapitalAmount?: number; // رأس المال المصدر والمدفوع
  authorizedCapitalAmount?: number; // رأس المال المرخص به
  annualTurnoverAmount?: number; // حجم الأعمال / الإيرادات السنوية
  fixedAssetsValue?: number; // صافي الأصول الثابتة المستثمرة
  workingCapitalAmount?: number; // رأس المال العامل
  bankDepositBank?: string; // اسم البنك المودع به رأس المال
  bankDepositAccount?: string; // رقم الحساب أو الشهادة البنكية
  shareholdersEquity?: number; // صافي حقوق الملكية

  // Financial Solvency & Audit Compliance specifics
  solvencyNetWorth?: number; // صافي الثروة / الملاءة
  totalAssets?: number; // إجمالي الأصول
  totalLiabilities?: number; // إجمالي الالتزامات
  currentRatio?: number; // نسبة التداول
  netProfitAmount?: number; // صافي الربح السنوي

  // Table options & Breakdown
  showBreakdownTable?: boolean; // إظهار أو إخفاء جدول التحليل والتفصيل
  breakdownTableTitle?: string; // عنوان جدول التحليل (مثال: بيان عناصر رأس المال المستثمر)
  breakdownColumnName?: string; // تسمية عمود البند (مثال: عنصر رأس المال / مصدر الدخل)
  breakdownAmountName?: string; // تسمية عمود المبلغ (مثال: القيمة المستثمرة / الإيراد السنوي)
  breakdownNoteName?: string; // تسمية عمود البيان أو النسبة
  incomeBreakdown?: { source: string; amount: number; monthlyEquivalent?: number; notes?: string }[]; // تفصيل عناصر الدخل أو رأس المال

  // Display toggles
  showFinancialMetricsCards?: boolean; // إظهار كروت المؤشرات الفرعية في الشهادة
  showTaxId?: boolean; // إظهار البطاقة الضريبية
  showCommercialReg?: boolean; // إظهار السجل التجاري

  auditorNotes: string;
  qrPayload: string;
  securityHash: string;
  printedCount: number;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  itemType?: 'EGS' | 'GS1'; // نظام التكويد المصري أو الدولي
  itemCode: string; // e.g. "EG-100200300-ITM01" or "6221234567890"
  description: string;
  unitType?: string; // EA (قطعة), C62 (وحدة), KGM (كجم), MTR (متر), JOB (خدمة/عملية), HUR (ساعة)
  quantity: number;
  unitPrice: number;
  discountRate: number; // %
  discountAmount?: number;
  vatRate: number; // usually 14%
  whtRate: number; // usually 1% or 0%
  totalBeforeTax: number;
  salesTotal?: number;
  vatAmount: number;
  whtAmount: number;
  netTotal: number;
}

export type EtaDocumentType = 'I' | 'C' | 'D' | 'R'; // Invoice (I), Credit Note (C), Debit Note (D), Receipt (R)
export type EtaEnvironment = 'PREPROD' | 'PROD';
export type EtaReceiverType = 'B' | 'P' | 'F'; // Business (B), Person/Individual (P), Foreigner (F)
export type EtaSubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'VALID' | 'INVALID' | 'CANCELLED' | 'REJECTED';

export interface EtaConfig {
  environment: EtaEnvironment;
  clientId: string;
  clientSecret: string;
  posSerial?: string; // لمعاملات الإيصال الإلكتروني POS
  posOsVersion?: string;
  issuerTaxRegNo: string; // الرقم الضريبي للمصدر
  issuerName: string;
  issuerActivityCode: string; // e.g. "6920" أنشطة المحاسبة والمراجعة القانونية
  branchId: string; // "0" الفرع الرئيسي
  country: string; // "EG"
  governate: string; // "Cairo", "Giza", "Alexandria"...
  regionCity: string;
  street: string;
  buildingNumber: string;
  postalCode?: string;
  tokenPin?: string;
  tokenType: 'USB_TOKEN' | 'HSM' | 'SOFT_CERT' | 'SIMULATED';
  tokenSubject?: string;
  autoSubmitOnIssue: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-012"
  invoiceType: 'SALES' | 'PURCHASE' | 'OFFICE_SERVICE';
  date: string;
  dueDate?: string;
  partnerId?: string;
  clientId?: string;
  partnerName: string;
  partnerTaxNo?: string;
  partnerNationalId?: string;
  partnerCommercialReg?: string;
  partnerAddress?: string;
  receiverType?: EtaReceiverType;
  receiverCountry?: string;
  receiverGovernate?: string;
  receiverCity?: string;
  receiverStreet?: string;
  receiverBuildingNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalVat: number;
  totalWht: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CREDIT' | 'BANK' | 'INSTAPAY';
  qrPayload: string;
  notes?: string;
  
  // ETA Electronic Invoicing & e-Receipt SDK specific fields
  isReceipt?: boolean; // هل هو إيصال إلكتروني B2C
  etaDocumentType?: EtaDocumentType; // 'I' | 'C' | 'D' | 'R'
  etaDocumentVersion?: '1.0' | '0.9';
  etaStatus?: EtaSubmissionStatus;
  etaUuid?: string; // المعرف الفريد الصادر من مصلحة الضرائب
  etaLongId?: string;
  etaSubmissionId?: string;
  etaSubmissionDate?: string;
  etaValidationErrors?: string[];
  etaCanonicalHash?: string; // بصمة التشفير المعيارية SHA-256
  etaSignatureValue?: string; // التوقيع الرقمي CAdES-BES
  etaPublicUrl?: string; // رابط التحقق من المستند على بوابة المصلحة
  
  createdAt: string;
}

export interface FeasibilityStudy {
  id: string;
  studyCode: string;
  projectName: string;
  sector: string;
  studyDate: string;
  preparedFor: string;
  investmentCosts: {
    landAndBuildings: number;
    machineryAndEquipment: number;
    vehiclesAndTransportation: number;
    furnitureAndFixtures: number;
    preOperatingExpenses: number;
    initialWorkingCapital: number;
    contingencyReserve: number;
    totalInvestment: number;
  };
  financingStructure: {
    equityCapital: number;
    bankLoans: number;
    loanInterestRate: number; // %
    loanRepaymentYears: number;
  };
  operatingCostsAnnual: {
    rawMaterials: number;
    salariesAndWages: number;
    utilitiesAndEnergy: number;
    maintenance: number;
    marketingAndSales: number;
    generalAndAdministrative: number;
    annualDepreciation: number;
    totalOperatingCosts: number;
  };
  expectedRevenuesAnnual: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
  };
  financialMetrics: {
    breakEvenSales: number;
    breakEvenPercentage: number;
    paybackPeriodYears: number;
    netPresentValue: number; // NPV
    internalRateOfReturn: number; // IRR %
    averageNetProfitMargin: number; // %
    averageRoi: number; // %
  };
  conclusionsAndRecommendations: string;
  createdAt: string;
}

export interface CreditModelSimulation {
  id: string;
  modelName: string;
  targetSales: number;
  sector: string;
  targetNetMargin: number; // %
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  depreciation: number;
  financeCosts: number;
  incomeTax: number;
  netProfit: number;
  currentAssets: {
    cashAndBanks: number;
    accountsReceivable: number;
    inventory: number;
    prepayments: number;
    total: number;
  };
  nonCurrentAssets: {
    fixedAssetsNet: number;
    projectsUnderConstruction: number;
    total: number;
  };
  totalAssets: number;
  currentLiabilities: {
    accountsPayable: number;
    shortTermBankFacilities: number;
    accrualsAndTaxLiabilities: number;
    total: number;
  };
  longTermLiabilities: {
    longTermBankLoans: number;
    total: number;
  };
  equity: {
    paidCapital: number;
    legalReserve: number;
    retainedEarnings: number;
    currentNetIncome: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  ratios: {
    grossMarginPct: number;
    netMarginPct: number;
    currentRatio: number;
    quickRatio: number;
    debtToEquity: number;
    receivablesTurnoverDays: number;
    inventoryTurnoverDays: number;
  };
  auditorOpinion: string;
  createdAt: string;
}

export interface OfficeProfile {
  firmName: string;
  name?: string; // alias for firmName
  officeName?: string; // alias for firmName
  firmNameArabic?: string; // alias for firmName
  auditorName: string;
  title: string;
  licenseNumber: string; // رقم القيد بسجل المحاسبين والمراجعين بوزارة المالية
  taxAuthorityLicense?: string;
  taxAuthorityRegNo: string;
  phone: string;
  mobile: string;
  email: string;
  address: string; // العنوان المجمع أو الافتراضي
  mainOfficeAddress?: string; // عنوان المكتب الرئيسي (ميدان النافورة الدور الرابع مركز الحسينية الشرقية)
  showMainOfficeAddress?: boolean; // خيار إظهار أو إخفاء عنوان المكتب الرئيسي
  branchOfficeAddress?: string; // عنوان الفرع (المباركية مول مدينة العاشر من رمضان الشرقية)
  showBranchOfficeAddress?: boolean; // خيار إظهار أو إخفاء عنوان الفرع
  logoUrl?: string;
  stampUrl?: string;
  publicDomainUrl?: string; // رابط النطاق العام للتحقق المباشر من الـ QR
  notes?: string;
}

// Tax Mandates & Task Scheduler Types
export type TaxMandateType =
  | 'VAT_10'
  | 'INCOME_27_CORP'
  | 'INCOME_28_INDIV'
  | 'PAYROLL_4'
  | 'ANNUAL_PAYROLL'
  | 'WHT_41'
  | 'STAMP_TAX'
  | 'REAL_ESTATE_TAX'
  | 'TAX_AUDIT_SESSION'
  | 'OTHER';

export type TaxMandateStatus =
  | 'NOT_STARTED'
  | 'COLLECTING_DOCS'
  | 'RECONCILING'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'PAID'
  | 'OVERDUE';

export interface TaxMandateTask {
  id: string;
  mandateCode: string; // e.g. "TAX-MAND-2026-001"
  clientId: string;
  clientName: string;
  mandateTitle: string; // e.g. "إقرار ضريبة القيمة المضافة لشهر يناير 2026"
  taxType: TaxMandateType;
  periodName: string; // "شهر يناير 2026", "الربع الأول 2026"
  taxYear: number;
  deadlineDate: string; // YYYY-MM-DD
  reminderDaysBefore: number;
  assignedTo: string;
  status: TaxMandateStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTaxAmount?: number;
  actualTaxAmount?: number;
  receiptNumber?: string;
  etaSubmissionRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Multi-User Access Control (RBAC)
export type UserRole = 'ADMIN' | 'AUDITOR' | 'ACCOUNTANT' | 'SECRETARY';

export type BrandColor = 'blue' | 'emerald' | 'indigo' | 'slate' | 'amber';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLanguage = 'ar' | 'en';

export interface PrintSettings {
  paperSize: 'A4' | 'LETTER' | 'LEGAL';
  orientation: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  quality: 'HIGH' | 'DRAFT';
  margins: 'DEFAULT' | 'NARROW' | 'WIDE' | 'NONE';
  includeLetterhead: boolean;
  includeOfficeTaxInfo: boolean;
  includeQrVerification: boolean;
  includeSignatureStamp: boolean;
  autoPrintDelayMs: number; // تأخير زمني بالملي ثانية للتأكد من ريندر الـ DOM كاملاً قبل الطباعة
  showPreviewModalByDefault: boolean;
}

export interface SapApiConfig {
  id: string;
  companyId?: string;
  companyName: string;
  hostUrl: string; // e.g. https://sap.example.com:50000
  odataServicePath: string; // e.g. /sap/opu/odata/sap/API_FINANCIAL_POSTING_SRV
  clientNumber?: string; // e.g. 100
  username: string;
  password?: string;
  apiToken?: string;
  companyCode: string; // e.g. 1000
  chartOfAccountsCode?: string;
  isActive: boolean;
  autoSyncIntervalMinutes?: number;
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'NEVER';
  lastSyncMessage?: string;
}

export interface ExcelImportAuditLog {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize?: string;
  importType: 'JOURNAL_ENTRIES' | 'GENERAL_LEDGER' | 'CHART_OF_ACCOUNTS' | 'TRIAL_BALANCE' | 'BANK_STATEMENT';
  importedBy: string;
  entriesAddedCount: number;
  linesCount: number;
  totalAmount: number;
  companyId?: string;
  companyName?: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  details?: string;
}

export interface CustomFirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  isCustomActive: boolean;
}

export interface UserPreferences {
  themeMode: ThemeMode;
  brandColor: BrandColor;
  language?: AppLanguage;
  reportingCurrency?: CurrencyCode; // عملة التقرير والعرض (افتراضياً EGP)
  baseCurrency?: CurrencyCode;      // العملة الوظيفية للمنشأة (افتراضياً EGP)
  compactView?: boolean;
  securityAuthEnabled?: boolean; // تفعيل أو إلغاء التحقق بالرقم السري عند التعديل
  customEditPassword?: string;   // كلمة المرور المخصصة للتعديل (الافتراضية: Mg120)
  defaultSettlementAccountId?: string; // حساب التسوية / الفروق المعلقة للإصلاح التلقائي للقيد
  printSettings?: PrintSettings;
  sapConfigs?: SapApiConfig[];
  excelImportLogs?: ExcelImportAuditLog[];
  customFirebaseConfig?: CustomFirebaseConfig;
}

export type FixedAssetCategory =
  | 'BUILDINGS'              // مباني وإنشاءات (5% قسط ثابت)
  | 'MACHINERY_EQUIPMENT'   // آلات ومعدات وماكينات (أساس إهلاك 25% مع إمكانية 30% معجل)
  | 'VEHICLES'              // سيارات ووسائل نقل وانتقال (أساس إهلاك 25%)
  | 'FURNITURE_FIXTURES'    // أثاث وتجهيزات ومفروشات مكتبية (أساس إهلاك 25%)
  | 'COMPUTERS_SOFTWARE'    // حواسب آلية وبرامج ونظم معلومات (أساس إهلاك 50%)
  | 'INTANGIBLE_ASSETS'     // أصول غير ملموسة وشهرة وبراءات (10% قسط ثابت)
  | 'LANDS';                // أراضي (لا تهلك)

export type DepreciationMethod =
  | 'STRAIGHT_LINE'         // القسط الثابت
  | 'DECLINING_BALANCE'     // القسط المتناقص
  | 'SUM_OF_YEARS_DIGITS'   // مجموع أرقام السنوات
  | 'TAX_LAW_91';           // معايير مصلحة الضرائب المصرية (قانون 91 لسنة 2005)

export type AssetStatus = 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED' | 'UNDER_MAINTENANCE';

export interface DepreciationHistoryRecord {
  year: number;
  month?: number;
  periodLabel: string;
  openingBookValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  closingBookValue: number;
  taxDepreciationAmount?: number;
  temporaryTaxDifference?: number;
  isPostedToJournal?: boolean;
  journalEntryId?: string;
  date: string;
}

export interface FixedAsset {
  id: string;
  assetCode: string; // e.g. "AST-2026-001"
  name: string;      // e.g. "خادم رئيسي Dell PowerEdge + خوادم سحابية"
  category: FixedAssetCategory;
  purchaseDate: string; // YYYY-MM-DD
  operationDate: string; // YYYY-MM-DD (تاريخ بدء الاستخدام والتشغيل)
  acquisitionCost: number; // تكلفة الاقتناء والشراء
  scrapValue: number; // القيمة التخريدية المقدرة (الخردة)
  usefulLifeYears: number; // العمر الإنتاجي بالسنوات
  accountingDepreciationRate: number; // نسبة الإهلاك المحاسبي السنوية %
  depreciationMethod: DepreciationMethod;
  
  // Egyptian Tax Law (قانون 91 لسنة 2005)
  taxDepreciationRate: number; // نسبة الإهلاك الضريبي القانونية %
  isEligibleForAcceleratedDepreciation?: boolean; // إهلاك معجل 30% للآلات والمعدات الجديدة
  acceleratedDepreciationClaimed?: boolean;
  
  // Tracking & Custody (العهدة والموقع)
  location?: string; // e.g. "الفرع الرئيسي - غرفة السيرفرات"
  custodian?: string; // e.g. "م. حسام الدين عبد المجيد"
  costCenter?: string; // e.g. "الإدارة العامة وتقنية المعلومات"
  invoiceRef?: string; // رقم الفاتورة أو المستند
  serialNumber?: string; // الرقم التسلسلي للأصل
  
  // Accounts Mapping (ربط الحسابات المصرية)
  assetAccountId: string; // كود حساب الأصل (e.g. "122" أصول ثابتة)
  depreciationExpenseAccountId: string; // كود حساب مصروف الإهلاك (e.g. "334")
  accumulatedDepreciationAccountId: string; // كود حساب مجمع الإهلاك (e.g. "231" أو الحساب المقابل)
  
  // Current Balances (الأرصدة اللحظية)
  currentAccumulatedDepreciation: number; // مجمع الإهلاك الحالي
  currentBookValue: number; // صافي القيمة الدفترية الحالية
  status: AssetStatus;
  
  // Disposal Info (في حالة البيع أو الاستبعاد أو التكهين)
  disposalDate?: string;
  disposalAmount?: number;
  disposalReason?: string;
  capitalGainLoss?: number;
  
  depreciationSchedule?: DepreciationHistoryRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NavigationTab =
  | 'DASHBOARD'
  | 'MOBILE_COMPANION'
  | 'ACCOUNTING_HUB'
  | 'FINANCIAL_REPORTING_HUB'
  | 'TAX_AUDIT_HUB'
  | 'OFFICE_HUB'
  | 'AUDIT_SECURITY_HUB'
  | 'CHART_OF_ACCOUNTS'
  | 'JOURNAL_ENTRIES'
  | 'CURRENCY_EXCHANGE_RATES'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'FIXED_ASSETS'
  | 'BANK_RECONCILIATION'
  | 'OCR_INVOICE_SCANNER'
  | 'FINANCIAL_STATEMENTS'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT'
  | 'FINANCIAL_SIMULATOR'
  | 'AUDIT_WORKING_PAPERS'
  | 'JOURNAL_AUDIT_SCANNER'
  | 'FRAUD_AUDIT_SENTINEL'
  | 'CASH_FLOW_PREDICTOR'
  | 'CREDIT_SIMULATOR'
  | 'TAX_EXPOSURE_SIMULATOR'
  | 'TAX_PENALTY_SIMULATOR'
  | 'ETA_RECONCILIATION'
  | 'PAYROLL_INSURANCE'
  | 'OFFICE_TREASURY'
  | 'CLIENTS_ARCHIVE'
  | 'PRACTICE_MANAGEMENT'
  | 'WHATSAPP_BOT'
  | 'TAX_TRACKER'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY'
  | 'INVOICING'
  | 'CUSTOMS_SHIPMENTS'
  | 'SAP_ERP'
  | 'AUDIT_TRAIL';

// Bank Reconciliation Interfaces
export interface BankStatementLine {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number; // سحب أو مصروف بنكي
  credit: number; // إيداع أو تحويل وارد
  balance?: number;
  isMatched?: boolean;
  matchedEntryId?: string;
  matchedEntryRef?: string;
  matchConfidence?: number; // 0 to 100%
  notes?: string;
}

export interface BankReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  statementStartDate: string;
  statementEndDate: string;
  statementOpeningBalance: number;
  statementEndingBalance: number;
  bookBalance: number;
  statementLines: BankStatementLine[];
  status: 'IN_PROGRESS' | 'RECONCILED' | 'APPROVED';
  reconciledAt?: string;
  reconciledBy?: string;
  notes?: string;
}

// Fraud & Forensic Audit Sentinel Interfaces
export interface BenfordDigitStat {
  digit: number;
  actualCount: number;
  actualPercentage: number;
  expectedPercentage: number; // Benford's Law theoretical (Log10(1 + 1/d))
  deviation: number;
  isAnomalous: boolean;
}

export interface AnomalyAlert {
  id: string;
  entryId: string;
  entryNumber: number;
  entryDate: string;
  accountName: string;
  amount: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'BENFORD_DEVIATION' | 'ROUND_NUMBER' | 'AFTER_HOURS' | 'WEEKEND' | 'DUPLICATE_SPLIT' | 'LARGE_CASH_DRAWS' | 'RAPID_REVERSAL';
  title: string;
  description: string;
  recommendation: string;
  isAudited?: boolean;
  auditorNotes?: string;
}

// 12-Month Predictive Cash Flow Interfaces
export interface CashFlowMonthForecast {
  monthKey: string; // "2026-01"
  monthNameAr: string; // "يناير 2026"
  openingCash: number;
  expectedInflows: {
    collectedReceivables: number;
    cashSales: number;
    taxRefundsOrOther: number;
    totalInflows: number;
  };
  expectedOutflows: {
    supplierPayments: number;
    payrollAndSalaries: number;
    taxLiabilitiesVatAndIncome: number;
    rentAndUtilities: number;
    loanInstallments: number;
    totalOutflows: number;
  };
  netMonthlyChange: number;
  projectedEndingCash: number;
  stressTestEndingCash: number; // سيناريو الضغط الشديد
  safetyBufferDeficit: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
}

// Practice Management & Audit Engagements
export interface AuditEngagementContract {
  id: string;
  contractCode: string;
  clientId: string;
  clientName: string;
  engagementType: 'ANNUAL_AUDIT' | 'TAX_INSPECTION_DEFENSE' | 'ETA_COMPLIANCE' | 'COMPANY_FORMATION' | 'FEASIBILITY_STUDY';
  fiscalYear: number;
  contractDate: string;
  startDate: string;
  endDate: string;
  totalAgreedFee: number;
  paidAmount: number;
  remainingAmount: number;
  billingSchedule: {
    milestoneName: string;
    dueDate: string;
    amount: number;
    isBilled: boolean;
    isPaid: boolean;
    receiptId?: string;
  }[];
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'RENEWAL_DUE';
  assignedAuditor: string;
  notes?: string;
}

// Fee Estimator & Quotation Generator Interfaces
export type EntityLegalType =
  | 'JOINT_STOCK' // شركة مساهمة مصرية
  | 'LLC' // شركة ذات مسؤولية محدودة
  | 'ONE_PERSON' // شركة الشخص الواحد
  | 'PARTNERSHIP' // شركة تضامن أو توصية
  | 'SOLE_PROPRIETORSHIP' // منشأة فردية
  | 'FOREIGN_BRANCH' // فرع شركة أجنبية
  | 'NGO'; // جمعية أو مؤسسة أهلية

export type LegalComplexityLevel =
  | 'LOW' // بسيط / نشاط خدمي محدد (1.0x)
  | 'MEDIUM' // متوسط / نشاط تجاري وصناعي عادي (1.25x)
  | 'HIGH' // متقدم / استيراد وتصدير وفروع متعددة وفحص ضريبي (1.6x)
  | 'VERY_HIGH'; // معقد جداً / إعادة هيكلة، لجان طعن، دمج وتصفية (2.0x)

export type AccountingSystemQuality =
  | 'REGULAR_ERP' // نظام محاسبي إلكتروني منتظم وموثق (1.0x)
  | 'MANUAL_BOOKS' // دفاتر ورقية يدوية تحتاج مراجعة مكثفة (1.3x)
  | 'NO_SYSTEM'; // عدم وجود نظام محاسبي / فوضى مستندية (1.7x)

export type ProcedureServiceType =
  | 'ANNUAL_AUDIT' // مراجعة وتدقيق القوائم المالية السنوية
  | 'TAX_INSPECTION_DEFENSE' // حضور لجان الفحص والطعن الضريبي
  | 'COMPANY_FORMATION' // تأسيس شركات واستخراج التراخيص والسجل
  | 'ETA_COMPLIANCE' // تأهيل وتكامل منظومة الفاتورة والإيصال
  | 'FEASIBILITY_STUDY' // دراسة جدوى وتقييم مالي وائتماني
  | 'RESTRUCTURING_CAPITAL' // زيادة رأس مال وتعديل عقد وتصفية
  | 'MONTHLY_RETAINER'; // استشارات ومتابعة محاسبية وضريبية شهرية

export interface FeeHourlyBreakdown {
  partnerHours: number;
  partnerHourlyRate: number;
  managerHours: number;
  managerHourlyRate: number;
  seniorAuditorHours: number;
  seniorAuditorHourlyRate: number;
}

export interface FeeQuotationEstimate {
  id: string;
  quotationNumber: string; // e.g. "QUO-2026-1045"
  date: string;
  validUntil: string;
  clientId?: string;
  clientName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  
  // Criteria
  procedureType: ProcedureServiceType;
  procedureTitle: string;
  legalType: EntityLegalType;
  complexityLevel: LegalComplexityLevel;
  accountingQuality: AccountingSystemQuality;
  annualTurnoverBracket: string;
  branchesCount: number;
  
  // Time & Effort
  hourlyBreakdown: FeeHourlyBreakdown;
  totalEstimatedHours: number;
  
  // Cost & Calculation
  baseLaborCost: number;
  complexityMultiplier: number;
  qualityMultiplier: number;
  calculatedProfessionalFee: number;
  discountPercentage: number;
  netProfessionalFee: number;
  estimatedGovFees: number;
  taxVatFee: number;
  totalQuotationAmount: number;
  
  // Scope & Terms
  scopeItems: string[];
  clientDeliverables: string[];
  paymentTerms: {
    milestoneName: string;
    percentage: number;
    amount: number;
  }[];
  executionDurationDays: number;
  notes?: string;
  verificationCode: string;
  status: 'DRAFT' | 'SENT_WHATSAPP' | 'SENT_EMAIL' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED_TO_CONTRACT';
  createdAt: string;
}

export type WhatsAppMessageDirection = 'INCOMING' | 'OUTGOING';
export type WhatsAppMessageSender = 'CLIENT' | 'OFFICE_BOT' | 'AUDITOR';
export type WhatsAppMessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
export type WhatsAppEventCategory =
  | 'GENERAL'
  | 'INVOICE'
  | 'TREASURY_RECEIPT'
  | 'TAX_DECLARATION'
  | 'TAX_DEADLINE_REMINDER'
  | 'CERTIFICATE'
  | 'PROCEDURE_UPDATE'
  | 'INTERACTIVE_BOT_MENU'
  | 'BOT_AUTO_REPLY';

export interface WhatsAppMessage {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  direction: WhatsAppMessageDirection;
  sender: WhatsAppMessageSender;
  text: string;
  timestamp: string;
  status: WhatsAppMessageStatus;
  category?: WhatsAppEventCategory;
  mediaPayload?: {
    type?: 'INVOICE' | 'RECEIPT' | 'TAX_DECLARATION' | 'CERTIFICATE' | 'DOCUMENT';
    title?: string;
    referenceCode?: string;
    amount?: number;
    receiptNumber?: string;
    qrUrl?: string;
    verificationLink?: string;
  };
}

export interface WhatsAppMessageTemplate {
  id: string;
  code: string;
  title: string;
  category: WhatsAppEventCategory;
  subject: string;
  templateBody: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string;
}

export interface WhatsAppBotSettings {
  isAutoReplyEnabled: boolean;
  officeWorkingHours: string;
  welcomeGreeting: string;
  botName: string;
  includeQrVerification: boolean;
  apiDispatchMode?: 'DIRECT_WEB_API' | 'META_CLOUD_API' | 'CUSTOM_GATEWAY';
  customApiBaseUrl?: string; // e.g. 'https://api.whatsapp.com/send' or 'https://wa.me'
  defaultCountryCode?: string; // e.g. '20'
  autoFormatEgyptianNumbers?: boolean;
  autoAppendOfficeSignature?: boolean;
  metaCloudApiConfig?: {
    phoneNumberId?: string;
    wabaId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
  };
  customGatewayConfig?: {
    endpointUrl?: string;
    apiKey?: string;
    instanceId?: string;
  };
  templates?: WhatsAppMessageTemplate[];
}

export interface SystemUser {
  id: string;
  name: string;
  username?: string;
  employeeCode?: string;
  email: string;
  role: UserRole;
  roleTitleArabic: string; // "مدير النظام والشريك المسؤول", "مراقب حسابات / مراجع أول", "محاسب مالي / مسجل قيود", "سكرتارية واستقبال"
  pinCode?: string; // e.g. "1234"
  avatarInitials?: string;
  canAccessTreasury: boolean;
  canAccessAuditTrail: boolean;
  canAccessCreditFiles?: boolean;
  canAccessTaxReports?: boolean;
  canManageUsers?: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  canIssueInvoices?: boolean;
  canModifySettings?: boolean;
  restrictedTabs?: NavigationTab[] | string[];
  createdAt: string;
}

// OCR Smart Invoice & Paper Receipt Scanner Interfaces
export interface OcrInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OcrSuggestedJournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  notes: string;
}

export interface OcrInvoiceResult {
  invoiceNumber: string;
  date: string;
  counterparty: string;
  taxNumber?: string;
  commercialRegister?: string;
  invoiceType: 'PURCHASE' | 'SALES' | 'EXPENSE' | 'ASSET' | 'SERVICE';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  paymentMethod: 'CASH' | 'BANK' | 'PAYABLE' | 'RECEIVABLE' | 'PETTY_CASH';
  lineItems: OcrInvoiceLineItem[];
  detectedTextSummary: string;
  confidence: number;
  suggestedJournalEntry: {
    description: string;
    lines: OcrSuggestedJournalLine[];
    taxDirective: string;
  };
  rawImagePreviewUrl?: string;
}

// ============================================================================
// Customs, Global Trade & Landed Cost Management (منظومة الجمارك والتجارة الخارجية)
// ============================================================================

export type CustomsShipmentType =
  | 'IMPORT'              // استيراد تجاري أو صناعي
  | 'EXPORT'              // تصدير بضائع للخارج
  | 'DRAWBACK'            // استرداد جمركي (دروباك)
  | 'TEMPORARY_ADMISSION' // سماح مؤقت لتصنيع وإعادة تصدير
  | 'FREE_ZONE'           // مناطق حرة واستثمارية
  | 'TRANSIT';            // ترانزيت عبور دولي

export type CustomsShipmentStatus =
  | 'PLANNED'             // قيد التخطيط والتفاوض
  | 'ACI_ISSUED'          // تم استخراج رقم ACID وشهادة الشحن
  | 'SAILED'              // أبحرت السفينة في الطريق
  | 'ARRIVED_PORT'        // وصلت الميناء وتفريغ الحاويات
  | 'UNDER_CLEARANCE'     // قيد التخليص الجمركي والفحص الرقابي
  | 'INSPECTION'          // كشف ومعاينة وسحب عينات
  | 'CUSTOMS_PAID'        // تم سداد الرسوم والضرائب الجمركية
  | 'RELEASED'            // تم الإفراج الجمركي النهائي
  | 'RECEIVED_WAREHOUSE'  // استلام البضاعة في المخازن وإقفال التكلفة
  | 'CANCELLED';          // ملغاة

export type IncotermCode = 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'DDP' | 'CIP' | 'FCA' | 'CPT' | 'DAP';

export type TradePaymentMethod =
  | 'LETTER_OF_CREDIT'    // اعتماد مستندي (L/C)
  | 'COLLECTION_DOCS'     // مستندات تحصيل (CAD)
  | 'ADVANCE_TRANSFER'    // تحويل بنكي مقدماً (T/T)
  | 'SUPPLIER_CREDIT'     // تسهيلات موردين
  | 'OPEN_ACCOUNT';       // حساب مفتوح

export interface CustomsShipmentItem {
  id: string;
  itemCode: string;
  hsCode: string; // كود البند الجمركي (e.g. "8471.30.00.00")
  description: string;
  quantity: number;
  unit: string; // قطعة, كرتونة, طن, كجم, متر
  unitPriceForeign: number;
  totalPriceForeign: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  customsDutyRatePct: number; // نسبة الضريبة الجمركية المقررة %
  dutyAmountEgp: number; // قيمة الضريبة الجمركية المحتسبة
  apportionedOtherCostEgp: number; // نصيب الصنف من المصاريف الإنزالية المشتركة
  totalItemLandedCostEgp: number; // التكلفة الإنزالية الإجمالية للصنف بالمخزن
  unitLandedCostEgp: number; // تكلفة الوحدة الواحدة في المخزن (EGP)
}

export interface CustomsShipment {
  id: string;
  shipmentCode: string; // e.g. "IMP-2026-0041"
  shipmentType: CustomsShipmentType;
  title: string; // بيان الشحنة
  clientId: string;
  clientName: string;
  status: CustomsShipmentStatus;

  // منظومة نافذة والتسجيل المسبق (ACI)
  acidNumber: string; // 19 رقم
  acidIssueDate?: string;
  acidExpiryDate?: string;
  foreignExporterName: string;
  foreignExporterCountry: string;
  foreignExporterCode?: string;

  // وثائق النقل والجمارك
  blNumber: string; // بوليصة الشحن (B/L أو AWB)
  shippingLine: string; // الخط الملاحي (Maersk, MSC, etc.)
  vesselName?: string;
  portOfLoading: string; // ميناء الشحن
  customsPortOfArrival: string; // ميناء الإفراج (الإسكندرية، السخنة، بورسعيد، دمياط، مطار القاهرة)
  customsDeclarationNumber?: string; // رقم الشهادة الجمركية (الإفراج)
  customsDeclarationDate?: string;
  arrivalDate?: string;
  releaseDate?: string;
  incoterm: IncotermCode;
  paymentMethod: TradePaymentMethod;
  bankForm4Number?: string; // استمارة 4 بنكية
  bankName?: string;
  containersCount?: number;
  containerNumbers?: string[];
  demurrageFreeDays?: number; // أيام السماح المجانية للحاويات
  demurrageDailyFeePerContainer?: number;

  // القيم والعملات وسعر الصرف الجمركي
  invoiceCurrency: CurrencyCode;
  invoiceAmountForeign: number;
  customsExchangeRate: number; // سعر الدولار الجمركي المعتمد
  freightForeign?: number; // نولون الشحن الخارجي
  insuranceForeign?: number; // التأمين الملاحي
  cifValueForeign: number; // إجمالي القيمة سيف بالعملة الأجنبية
  cifValueEgp: number; // القيمة المقدرة جمركياً بالجنيه المصري (وعاء الاحتساب)

  // الرسوم والضرائب الجمركية المباشرة
  customsDutyAmount: number; // الضريبة الجمركية الواردة
  developmentFeeAmount: number; // رسم التنمية
  vatAmount: number; // ضريبة القيمة المضافة الجمركية 14%
  tableTaxAmount?: number; // ضريبة الجدول إن وجدت
  withholdingTaxAmount?: number; // خصم وإضافة استيراد 1% أو 0.5%
  inspectionAndLabFees?: number; // رسوم الفحص والمعامل (سلامة الغذاء / الرقابة)
  totalCustomsDutiesAndTaxes: number; // إجمالي ما تم سداده للجمارك

  // المصاريف والتكاليف الإضافية (Landed Costs)
  customsBrokerFees: number; // أتعاب المخلص الجمركي وضريبتها
  portStorageAndHandlingFees: number; // أرضيات وحراسة ومصاريف موانئ
  demurrageFeesPaid: number; // غرامات تأخير حاويات
  inlandFreightFees: number; // نقل وشحن داخلي وتعتيق
  bankCommissionsAndLcExpenses: number; // عمولات بنكية وفتح اعتماد ونموذج 4
  otherExpenses: number; // مصاريف نثرية وفحص أخرى
  totalAdditionalExpenses: number; // إجمالي المصاريف الإضافية

  // إجمالي التكلفة الإنزالية النهائية ومعامل التكلفة
  totalLandedCostEgp: number; // التكلفة الإنزالية الكلية للرسملة على المخزون
  costMultiplierRatio: number; // معامل التكلفة (Total Landed Cost / CIF EGP)

  // الأصناف والبنود
  items: CustomsShipmentItem[];

  // الروابط والتكامل (اليومية، الخزينة، الأرشيف)
  linkedJournalEntryIds?: string[];
  linkedTreasuryTransactionIds?: string[];
  archiveDocumentIds?: string[];
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface HsTariffCode {
  code: string;
  titleAr: string;
  titleEn: string;
  dutyRatePct: number;
  vatRatePct: number;
  regulatoryAuthority?: string;
  category: string;
}


