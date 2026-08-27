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

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
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
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
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

export interface ClientDocument {
  id: string;
  title: string;
  documentType: 'TAX_CARD' | 'COMMERCIAL_REG' | 'ARTICLES_OF_INC' | 'FINANCIAL_REPORT' | 'POWER_OF_ATTORNEY' | 'RECEIPT' | 'OTHER';
  fileDataUrl: string; // Base64 or Blob URL
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
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

export interface ProfessionalCertificate {
  id: string;
  certificateNumber: string; // e.g. "CERT-2026-089"
  certificateType: 'INCOME_PROOF' | 'INVESTED_CAPITAL' | 'WORKING_CAPITAL' | 'FINANCIAL_SOLVENCY';
  issueDate: string;
  clientId: string;
  clientName: string;
  recipientEntity: string; // e.g. "بنك مصر - قطاع الائتمان", "سفارة...", "الهيئة العامة للاستثمار"
  purpose: string;
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
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountRate: number; // %
  vatRate: number; // usually 14%
  whtRate: number; // usually 1% or 0%
  totalBeforeTax: number;
  vatAmount: number;
  whtAmount: number;
  netTotal: number;
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
  partnerCommercialReg?: string;
  partnerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalVat: number;
  totalWht: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CREDIT' | 'BANK';
  qrPayload: string;
  notes?: string;
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
