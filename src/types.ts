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
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'UNPOST';
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

export interface ClientArchiveRecord {
  id: string;
  clientCode: string; // e.g. "CL-0101"
  name: string;
  clientType: 'PRIMARY' | 'CASUAL'; // عميل أساسي للمكتب / عميل عابر
  companyType: 'JOINT_STOCK' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'INDIVIDUAL';
  commercialRegistrationNo: string;
  taxCardNo: string;
  taxOffice: string; // مأمورية الضرائب المختصة
  incomeTaxFileNo: string;
  vatRegistrationNo: string;
  socialInsuranceNo: string;
  capital: number;
  partners: { name: string; sharePercentage: number; role: string; nationalId?: string }[];
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  activity: string;
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
  status: 'DRAFT' | 'READY_TO_SUBMIT' | 'SUBMITTED_TO_ETA' | 'PAID' | 'OVERDUE';
  // VAT Specifics
  salesTaxableAmount?: number;
  vatOutputTax?: number; // 14%
  purchasesTaxableAmount?: number;
  vatInputTax?: number; // ضريبة المدخلات المخصومة
  netVatPayable?: number;
  // Income / Payroll specifics
  grossTaxableIncome?: number;
  taxDue?: number;
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
  | 'AUDIT_COMPLIANCE'        // فحص ومراجعة حسابات
  | 'REAL_ESTATE_INCOME';     // إثبات إيرادات عقارية واستثمارية

export interface ProfessionalCertificate {
  id: string;
  certificateNumber: string; // e.g. "CERT-2026-089"
  certificateType: CertificateTemplateType;
  beneficiaryType: CertificateBeneficiaryType; // نوع المستفيد (شخص طبيعي أو اعتباري)
  issueDate: string;
  clientId?: string;
  clientName: string;
  beneficiaryTitle?: string; // e.g. "السيد المهندس", "الدكتور", "السيدة", "السادة"
  nationalId?: string; // الرقم القومي (14 رقم) للأشخاص الطبيعيين
  jobTitle?: string; // المهنة / الوظيفة الحالية للأشخاص الطبيعيين
  address?: string; // محل الإقامة أو المقر
  commercialRegNo?: string; // السجل التجاري (للشركات والأنشطة الفردية)
  taxCardNo?: string; // البطاقة الضريبية إن وجدت
  activityName?: string; // اسم المنشأة / جهة العمل / طبيعة النشاط
  recipientEntity: string; // e.g. "بنك مصر - قطاع التمويل العقاري والائتمان", "سفارة...", "الهيئة العامة للاستثمار"
  purpose: string;
  periodText: string; // e.g. "عن السنة المالية المنتهية في 31 ديسمبر 2025" أو "عن متوسط الدخل الشهري لعام 2025"
  certifiedAmount: number; // المبلغ المعتمد
  monthlyAmount?: number; // المعادل الشهري إن وجد
  incomeBreakdown?: { source: string; amount: number }[]; // تفصيل مصادر الدخل (مرتب، استشارات، أرباح أسهم، إيجارات)
  // Key financial parameters
  monthlyNetIncome?: number;
  annualNetIncome?: number;
  investedCapitalAmount?: number;
  workingCapitalAmount?: number;
  currentRatio?: number;
  solvencyNetWorth?: number;
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
  auditorName: string;
  title: string;
  licenseNumber: string; // رقم القيد بسجل المحاسبين والمراجعين بوزارة المالية
  taxAuthorityRegNo: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  logoUrl?: string;
  stampUrl?: string;
  notes: string;
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

export interface UserPreferences {
  themeMode: ThemeMode;
  brandColor: BrandColor;
  compactView?: boolean;
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
  | 'ACCOUNTING_HUB'
  | 'FINANCIAL_REPORTING_HUB'
  | 'TAX_AUDIT_HUB'
  | 'OFFICE_HUB'
  | 'AUDIT_SECURITY_HUB'
  | 'CHART_OF_ACCOUNTS'
  | 'JOURNAL_ENTRIES'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'FIXED_ASSETS'
  | 'FINANCIAL_STATEMENTS'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT'
  | 'AUDIT_WORKING_PAPERS'
  | 'CREDIT_SIMULATOR'
  | 'TAX_EXPOSURE_SIMULATOR'
  | 'ETA_RECONCILIATION'
  | 'PAYROLL_INSURANCE'
  | 'OFFICE_TREASURY'
  | 'CLIENTS_ARCHIVE'
  | 'TAX_TRACKER'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY'
  | 'INVOICING'
  | 'AUDIT_TRAIL';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitleArabic: string; // "مدير النظام والشريك المسؤول", "مراقب حسابات / مراجع أول", "محاسب مالي / مسجل قيود", "سكرتارية واستقبال"
  pinCode?: string; // e.g. "1234"
  avatarInitials?: string;
  canAccessTreasury: boolean;
  canAccessAuditTrail: boolean;
  canManageUsers?: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  canIssueInvoices?: boolean;
  canModifySettings?: boolean;
  restrictedTabs?: NavigationTab[] | string[];
  createdAt: string;
}

