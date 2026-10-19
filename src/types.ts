export type AppLanguage = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';
export type BrandColor = 'emerald' | 'blue' | 'indigo' | 'amber' | 'slate';
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'KWD' | string;
export type UserRole = 'ADMIN' | 'AUDITOR' | 'ACCOUNTANT' | 'TAX_SPECIALIST' | 'SECRETARY' | 'VIEWER' | 'PENDING' | string;

export type NavigationTab =
  | 'DASHBOARD'
  | 'ACCOUNTING_HUB'
  | 'CHART_OF_ACCOUNTS'
  | 'JOURNAL_ENTRIES'
  | 'GENERAL_LEDGER'
  | 'TRIAL_BALANCE'
  | 'FILE_REVIEW'
  | 'FIXED_ASSETS'
  | 'BANK_RECONCILIATION'
  | 'CURRENCY_EXCHANGE_RATES'
  | 'OCR_INVOICE_SCANNER'
  | 'AUDIT_WORKING_PAPERS'
  | 'FINANCIAL_REPORTING_HUB'
  | 'FINANCIAL_STATEMENTS'
  | 'ANNUAL_FINANCIAL_DOSSIER'
  | 'FINANCIAL_DOSSIER_GENERATOR'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT'
  | 'FINANCIAL_SIMULATOR'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY'
  | 'CREDIT_HUB'
  | 'CREDIT_SIMULATOR'
  | 'QUICK_BANK_DOSSIER'
  | 'CREDIT_DOSSIER_REGISTRY'
  | 'FINANCIAL_PLANNING_HUB'
  | 'BUDGET_PLANNER'
  | 'BUDGET_AND_CASHFLOW'
  | 'CASH_FLOW_PREDICTOR'
  | 'AUDIT_TOOLS_HUB'
  | 'EXCEL_AUDIT_SENTINEL'
  | 'FRAUD_AUDIT_SENTINEL'
  | 'JOURNAL_AUDIT_SCANNER'
  | 'TAX_AUDIT_HUB'
  | 'TAX_TRACKER'
  | 'TAX_FILING_CELLS'
  | 'TAX_PENALTY_SIMULATOR'
  | 'TAX_EXPOSURE_SIMULATOR'
  | 'ETA_RECONCILIATION'
  | 'PAYROLL_INSURANCE'
  | 'AUDIT_CONSISTENCY_SENTINEL'
  | 'OFFICE_HUB'
  | 'CLIENTS_ARCHIVE'
  | 'PRACTICE_MANAGEMENT'
  | 'WHATSAPP_BOT'
  | 'OFFICE_TREASURY'
  | 'AUDIT_SECURITY_HUB'
  | 'AUDIT_TRAIL'
  | 'INVOICING'
  | 'SAP_ERP'
  | 'CUSTOMS_HUB'
  | 'CUSTOMS_SHIPMENTS'
  | 'CUSTOMS_LANDED_COST'
  | 'CUSTOMS_NAFEZA_ACI'
  | 'MOBILE_COMPANION'
  | 'MULTI_TENANT_WORKSPACES'
  | 'UNASSIGNED_ENTRIES'
  | 'ACCOUNT_MAPPING'
  | 'MG_DESIGNER'
  | string;

export type ClientActivityTemplate = 'COMMERCIAL' | 'INDUSTRIAL' | 'SERVICE' | 'CONTRACTING';

export type AccountCategory =
  | 'ASSETS'
  | 'LIABILITIES'
  | 'EQUITY'
  | 'REVENUES'
  | 'EXPENSES'
  | 'ASSET'
  | 'LIABILITY'
  | 'REVENUE'
  | 'EXPENSE'
  | string;

export type AccountNature = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  category: AccountCategory;
  nature: AccountNature;
  level: number;
  parentId?: string;
  parentCode?: string;
  openingBalanceDebit: number;
  openingBalanceCredit: number;
  currentDebit?: number;
  currentCredit?: number;
  currentBalance?: number;
  isSystem?: boolean;
  isActive?: boolean;
  clientId: string;
  fiscalYear?: number;
  currency?: CurrencyCode;
  subType?: string;
  notes?: string;
}

export interface OpeningBalanceEntry {
  debit: number;
  credit: number;
  accountCode?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type NestedOpeningBalancesMap = Record<
  string,
  Record<number, Record<string, OpeningBalanceEntry>>
>;

export interface ClientOpeningBalanceRecord {
  clientId: string;
  fiscalYear: number;
  accountId: string;
  accountCode: string;
  openingBalanceDebit: number;
  openingBalanceCredit: number;
  updatedAt: string;
  updatedBy: string;
}

export interface JournalEntryLine {
  id: string;
  accountId?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  currency?: CurrencyCode;
  exchangeRate?: number;
  foreignDebit?: number;
  foreignCredit?: number;
  originalAmount?: number;
  amountEgp?: number;
  taxCode?: string;
  clientId?: string;
  [key: string]: any;
}

export type InvoiceType =
  | 'SALES'
  | 'PURCHASE'
  | 'RETURN_SALES'
  | 'RETURN_PURCHASE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'OFFICE_SERVICE';

export type AccountMappingFieldKey =
  | 'cashAccountCode'
  | 'receivablesAccountCode'
  | 'payablesAccountCode'
  | 'salesAccountCode'
  | 'officeServiceRevenueAccountCode'
  | 'purchasesAccountCode'
  | 'salesReturnsAccountCode'
  | 'purchaseReturnsAccountCode'
  | 'vatOutputAccountCode'
  | 'vatInputAccountCode'
  | 'whtReceivableAccountCode'
  | 'whtPayableAccountCode'
  | 'tableTaxAccountCode'
  | 'fxGainAccountCode'
  | 'fxLossAccountCode';

export interface ClientAccountMapping {
  clientId: string;
  cashAccountCode: string;
  receivablesAccountCode: string;
  payablesAccountCode: string;
  salesAccountCode: string;
  officeServiceRevenueAccountCode: string;
  purchasesAccountCode: string;
  salesReturnsAccountCode: string;
  purchaseReturnsAccountCode: string;
  vatOutputAccountCode: string;
  vatInputAccountCode: string;
  whtReceivableAccountCode: string;
  whtPayableAccountCode: string;
  tableTaxAccountCode: string;
  fxGainAccountCode: string;
  fxLossAccountCode: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type FinancialStatementLineKey =
  // Balance Sheet (قائمة المركز المالي)
  | 'BS_CASH_EQUIVALENTS' // النقدية وما في حكمها
  | 'BS_TRADE_RECEIVABLES' // العملاء والمدينون التجاريون
  | 'BS_INVENTORY' // المخزون
  | 'BS_OTHER_CURRENT_ASSETS' // أصول متداولة وأرصدة مدينة أخرى
  | 'BS_FIXED_ASSETS' // الأصول الثابتة (بالصافي ومجمع الإهلاك)
  | 'BS_PROJECTS_UNDER_WAY' // مشروعات تحت التنفيذ
  | 'BS_INTANGIBLE_ASSETS' // أصول غير ملموسة وشهرة
  | 'BS_OTHER_NON_CURRENT_ASSETS' // أصول غير متداولة واستثمارات أخرى
  | 'BS_TRADE_PAYABLES' // الموردون والدائنون التجاريون
  | 'BS_TAX_AUTHORITY_PAYABLES' // مصلحة الضرائب والجهات السيادية
  | 'BS_OTHER_CURRENT_LIABILITIES' // التزامات متداولة وأرصدة دائنة أخرى
  | 'BS_LONG_TERM_LOANS' // قروض وتسهيلات طويلة الأجل
  | 'BS_OTHER_NON_CURRENT_LIABILITIES' // التزامات غير متداولة ومخصصات طويلة الأجل
  | 'BS_PAID_UP_CAPITAL' // رأس المال المدفوع
  | 'BS_RETAINED_EARNINGS' // الأرباح (الخسائر) المرحلة والمحتجزة
  | 'BS_RESERVES' // الاحتياطيات النظامية والقانونية
  // Income Statement (قائمة الدخل)
  | 'IS_OPERATING_REVENUE' // إيرادات النشاط والمبيعات
  | 'IS_SALES_RETURNS_ALLOWANCES' // مردودات ومسموحات وخصومات المبيعات
  | 'IS_COGS' // تكلفة المبيعات والمشتريات والخدمات
  | 'IS_SELLING_DISTRIBUTION' // مصروفات البيع والتسويق والتوزيع
  | 'IS_GENERAL_ADMIN' // المصروفات العمومية والإدارية
  | 'IS_DEPRECIATION' // إهلاك الأصول الثابتة
  | 'IS_FINANCING_COSTS' // الأعباء التمويلية والفوائد
  | 'IS_FX_GAINS_LOSSES' // أرباح وخسائر فروق العملة
  | 'IS_OTHER_REVENUES' // إيرادات وأرباح أخرى
  | 'IS_OTHER_EXPENSES'; // مصروفات وخسائر أخرى

export type ClientStatementMapping = Record<string, FinancialStatementLineKey>;

export interface JournalEntry {
  id: string;
  entryNumber: string | number;
  serialNumber?: string;
  date: string;
  description: string;
  referenceNumber?: string;
  documentType?: string;
  invoiceType?: InvoiceType | string;
  lines: JournalEntryLine[];
  totalDebit?: number;
  totalCredit?: number;
  isPosted?: boolean;
  status?: 'DRAFT' | 'POSTED' | 'CANCELLED' | string;
  postedAt?: string;
  postedBy?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  fiscalYear?: number;
  clientId: string;
  clientName?: string;
  currency?: CurrencyCode;
  exchangeRate?: number;
  source?: string;
  sourceInvoiceId?: string;
  reversalOfEntryId?: string;
  reversedByEntryId?: string;
  isAutoGenerated?: boolean;
  attachments?: string[];
  notes?: string;
}

export type CompanyType =
  | 'SOLE_PROPRIETORSHIP'
  | 'PARTNERSHIP'
  | 'LIMITED_LIABILITY'
  | 'JOINT_STOCK'
  | 'ONE_PERSON_COMPANY'
  | 'FREELANCER'
  | 'OTHER'
  | string;

export type ClientRelationshipType =
  | 'ANNUAL_CONTRACT'
  | 'MONTHLY_BOOKKEEPING'
  | 'TAX_ONLY'
  | 'CONSULTATION_CASE'
  | 'AUDIT_ONLY'
  | string;

export type ProcedureCategory =
  | 'TAX_INSPECTION'
  | 'COMPANY_INCORPORATION'
  | 'COMMERCIAL_REGISTER'
  | 'VAT_REGISTRATION'
  | 'E_INVOICING'
  | 'SOCIAL_INSURANCE'
  | 'INDUSTRIAL_REGISTER'
  | 'BANK_CREDIT_FILE'
  | 'ANNUAL_AUDIT'
  | 'OTHER'
  | string;

export type ProcedureStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED' | string;

export interface ClientProcedureTask {
  id: string;
  title: string;
  category: ProcedureCategory;
  status: ProcedureStatus;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  agreedFee?: number;
  paidFee?: number;
  governmentExpenses?: number;
  notes?: string;
  [key: string]: any;
}

export interface PortalCredentialEntry {
  username?: string;
  email?: string;
  password?: string;
  pinCode?: string;
  tokenPin?: string;
  tokenSerial?: string;
  tokenType?: string;
  expiryDate?: string;
  issuer?: string;
  registeredMobile?: string;
  notes?: string;
  [key: string]: any;
}

export interface PortalCredentials {
  id?: string;
  portalName?: string;
  portalType?: 'ETA_CORE' | 'E_INVOICE' | 'E_RECEIPT' | 'SAP_PORTAL' | 'INSURANCE' | 'GAFI' | 'OTHER' | string;
  username?: string;
  email?: string;
  password?: string;
  pinCode?: string;
  tokenPin?: string;
  tokenSerial?: string;
  tokenType?: string;
  expiryDate?: string;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | string;
  registeredMobile?: string;
  notes?: string;
  etaEInvoicing?: PortalCredentialEntry;
  eSignatureToken?: PortalCredentialEntry;
  sapPortal?: PortalCredentialEntry;
  sapTaxPortal?: PortalCredentialEntry;
  etaGeneralTax?: PortalCredentialEntry;
  etaPayrollTax?: PortalCredentialEntry;
  nafeza?: PortalCredentialEntry;
  socialInsurancePortal?: PortalCredentialEntry;
  [key: string]: any;
}

export type ClientDocumentCategory =
  | 'TAX_CARD'
  | 'COMMERCIAL_REGISTER'
  | 'COMPANY_CONTRACT'
  | 'VAT_CERTIFICATE'
  | 'TAX_RETURN'
  | 'FINANCIAL_STATEMENT'
  | 'INVOICE'
  | 'POWER_OF_ATTORNEY'
  | 'INSURANCE'
  | 'OTHER'
  | string;

export interface ClientDocumentFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  color?: string;
  icon?: string;
  [key: string]: any;
}

export interface ClientDocument {
  id: string;
  clientId?: string;
  folderId?: string | null;
  title?: string;
  name?: string;
  fileName?: string;
  category?: ClientDocumentCategory;
  documentType?: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: number | string;
  uploadDate?: string;
  uploadedAt?: string;
  expiryDate?: string;
  issueDate?: string;
  documentNumber?: string;
  dataUrl?: string;
  fileDataUrl?: string;
  fileUrl?: string;
  serverDocumentId?: string;
  notes?: string;
  tag?: string;
  tags?: string[];
  [key: string]: any;
}

export interface ClientArchiveRecord {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  taxId: string;
  taxCardNo?: string;
  taxRegistrationNumber?: string;
  commercialRegister: string;
  commercialRegNo?: string;
  incomeTaxFileNo?: string;
  vatRegNo?: string;
  legalForm?: CompanyType;
  companyType?: CompanyType;
  relationshipType?: ClientRelationshipType;
  industry?: string;
  activityType?: string;
  taxOffice?: string;
  vatTaxOffice?: string;
  address?: string;
  phone?: string;
  whatsappPhone?: string;
  email?: string;
  contactPerson?: string;
  nationalId?: string;
  capitalAmount?: number;
  paidUpCapital?: number;
  incorporationDate?: string;
  commercialRegisterExpiryDate?: string;
  taxCardIssueDate?: string;
  taxCardExpiryDate?: string;
  vatRegistrationDate?: string;
  eInvoiceRegistered?: boolean;
  eReceiptRegistered?: boolean;
  hasEsealToken?: boolean;
  tokenSerial?: string;
  tokenPin?: string;
  tokenExpiryDate?: string;
  tokenCustodyStatus?: 'IN_OFFICE' | 'WITH_CLIENT' | 'AT_AUTHORITY' | string;
  tokenCustodyDate?: string;
  tokenReceiverName?: string;
  portalCredentials?: PortalCredentials;
  taxPortalUsername?: string;
  taxPortalPassword?: string;
  eInvoicePortalEmail?: string;
  eInvoicePortalPassword?: string;
  folders?: ClientDocumentFolder[];
  documents?: ClientDocument[];
  procedures?: ClientProcedureTask[];
  annualAgreedFees?: number;
  paidFees?: number;
  openingBalanceFees?: number;
  clientCode?: string;
  taxSystemType?: 'SAP' | 'OLD_PORTAL' | string;
  isVatSubject?: boolean;
  isVatRegistered?: boolean;
  isIncomeTaxSubject?: boolean;
  isWhtSubject?: boolean;
  isWithholdingTaxSubject?: boolean;
  isStampTaxSubject?: boolean;
  hasPayroll?: boolean;
  isPayrollTaxSubject?: boolean;
  taxSubjectConfigured?: boolean;
  activityTemplate?: ClientActivityTemplate;
  fiscalYear?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  fiscalYearEndMonth?: number;
  activeFiscalYear?: number;
  assignedAccountant?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNDER_LIQUIDATION' | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ClientFeeAgreement {
  id: string;
  clientId: string;
  fiscalYear: number;
  description: string;
  amount: number;
  dueDate?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  createdAt?: string;
  notes?: string;
  [key: string]: any;
}

export interface ClientFeeCollection {
  id: string;
  agreementId: string;
  clientId: string;
  amount: number;
  paidAt: string;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'INSTAPAY' | string;
  receiptNo?: string;
  treasuryTransactionId?: string;
  notes?: string;
  createdAt?: string;
  [key: string]: any;
}

export type OpenItemKind = 'DOCUMENT' | 'INQUIRY' | 'ADJUSTMENT' | 'SIGNATURE' | string;
export type OpenItemStatus = 'OPEN' | 'RESOLVED' | 'RECEIVED' | 'CLOSED';

export interface OpenItem {
  id: string;
  clientId: string;
  fiscalYear?: number;
  kind: OpenItemKind;
  text: string;
  requestedAt: string;
  resolvedAt?: string;
  status: OpenItemStatus;
  notes?: string;
  [key: string]: any;
}

export interface ApprovedStatementsSnapshot {
  id: string;
  clientId: string;
  fiscalYear: number;
  version?: number;
  versionNo?: number;
  approvedAt: string;
  approvedBy: string;
  source: 'LEDGER' | 'EXCEL_REVIEW' | 'SIMULATOR' | string;
  trialBalanceRows: any[];
  incomeStatement: any;
  balanceSheet: any;
  cashFlow: any;
  notes?: any[];
  checklistStatus?: { ok?: boolean; ready?: boolean; missing?: string[]; items?: any[] };
  verificationCode?: string;
  notesComment?: string;
  [key: string]: any;
}

export interface OfficeTreasuryTransaction {
  id: string;
  transactionNumber?: string;
  date: string;
  type: 'INCOME_FEES' | 'EXPENSE_OFFICE' | 'CLIENT_DEPOSIT' | 'GOV_EXPENSE_ON_BEHALF' | 'INCOME' | 'EXPENSE' | string;
  category?: string;
  amount: number;
  currency?: CurrencyCode;
  exchangeRate?: number;
  foreignAmount?: number;
  clientId: string;
  clientName?: string;
  feeCollectionId?: string;
  agreementId?: string;
  procedureId?: string;
  procedureTitle?: string;
  voucherNumber?: string;
  recordedBy?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'INSTAPAY' | 'VODAFONE_CASH' | 'CHEQUE' | string;
  referenceNumber?: string;
  receiptNumber?: string;
  description: string;
  createdBy?: string;
  createdAt?: string;
  isPostedToGeneralLedger?: boolean;
  notes?: string;
}

export type InvoiceDocType = 'I' | 'C' | 'D' | string;
export type EtaDocumentType = 'I' | 'C' | 'D' | string;
export type InvoiceNatureCategory = 'GOODS' | 'SERVICES' | 'CONTRACTING' | 'CONSULTING' | 'ASSETS' | string;

export interface InvoiceItem {
  id: string;
  itemCode: string;
  gs1EgsCode?: string;
  description: string;
  unitType?: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  discountAmount?: number;
  vatRate: number;
  whtRate: number;
  tableTaxRate?: number;
  totalBeforeTax: number;
  vatAmount: number;
  whtAmount: number;
  tableTaxAmount?: number;
  netTotal: number;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  internalId?: string;
  invoiceType: InvoiceType | string;
  documentType?: InvoiceDocType;
  natureCategory?: InvoiceNatureCategory;
  date: string;
  dueDate?: string;
  clientId: string;
  partnerName: string;
  partnerTaxId?: string;
  partnerTaxNo?: string;
  partnerNationalId?: string;
  partnerAddress?: string;
  receiverType?: string;
  currency?: CurrencyCode;
  exchangeRate?: number;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalVat: number;
  totalWht: number;
  totalTableTax?: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'SUBMITTED_ETA' | string;
  paymentMethod: 'CASH' | 'CREDIT' | 'BANK_TRANSFER' | 'CHEQUE' | string;
  etaUuid?: string;
  etaSubmissionId?: string;
  etaStatus?: 'NOT_SENT' | 'SUBMITTED' | 'VALID' | 'INVALID' | 'REJECTED' | 'CANCELLED' | string;
  qrPayload?: string;
  isPosted?: boolean;
  journalEntryId?: string;
  notes?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface EtaConfig {
  environment: 'PREPROD' | 'PROD';
  clientId: string;
  clientSecret?: string;
  clientSecret1?: string;
  clientSecret2?: string;
  rin?: string;
  companyName?: string;
  branchCode?: string;
  activityCode?: string;
  issuerTaxRegNo?: string;
  issuerName?: string;
  issuerActivityCode?: string;
  branchId?: string;
  tokenPin?: string;
  tokenCommonName?: string;
  documentTypeVersion?: '0.9' | '1.0' | string;
  posSerial?: string;
  posOsVersion?: string;
  isConnected?: boolean;
  autoSubmitOnIssue?: boolean;
  lastSyncAt?: string;
  [key: string]: any;
}

export interface TaxDeclarationRecord {
  id: string;
  clientId?: string;
  clientName?: string;
  taxId?: string;
  declarationType: 'VAT_MONTHLY_10' | 'WHT_QUARTERLY_41' | 'PAYROLL_QUARTERLY_4' | 'ANNUAL_INCOME_101' | 'ANNUAL_CORP_105' | 'DIVIDENDS' | string;
  period: string;
  fiscalYear: number;
  dueDate: string;
  submissionDate?: string;
  salesOrRevenuesAmount?: number;
  purchasesOrCostsAmount?: number;
  outputTaxAmount?: number;
  inputTaxDeductible?: number;
  whtDeductedAmount?: number;
  netTaxPayable?: number;
  taxableBase?: number;
  taxAmount?: number;
  penaltiesOrAdjustments?: number;
  whtDeductions?: number;
  netPayable?: number;
  creditCarriedForward?: number;
  status: 'DRAFT' | 'READY_TO_SUBMIT' | 'SUBMITTED' | 'PAID' | 'AMENDED' | string;
  etaReceiptNumber?: string;
  paymentReference?: string;
  notes?: string;
  [key: string]: any;
}

export type CertificateTemplateType =
  | 'INCOME_PROOF'
  | 'FREELANCE_INCOME'
  | 'TAX_POSITION'
  | 'CAPITAL_VERIFICATION'
  | 'REVENUE_TURNOVER'
  | 'EXPORT_SUBSIDY'
  | 'SOLVENCY_CREDIT'
  | 'CUSTOM'
  | string;

export type CertificateBeneficiaryType = 'NATURAL_PERSON' | 'LEGAL_ENTITY' | string;

export interface ProfessionalCertificate {
  id: string;
  certificateNumber: string;
  certificateType: CertificateTemplateType;
  beneficiaryType: CertificateBeneficiaryType;
  clientId?: string;
  clientName: string;
  taxId?: string;
  commercialRegister?: string;
  nationalId?: string;
  address?: string;
  activityDescription?: string;
  recipientEntity: string;
  purpose: string;
  periodText: string;
  certifiedAmount: number;
  netProfitAmount?: number;
  totalAssetsAmount?: number;
  paidUpCapitalAmount?: number;
  currency?: CurrencyCode;
  issueDate: string;
  expiryDate?: string;
  auditorNotes: string;
  qrPayload: string;
  securityHash: string;
  verificationCode?: string;
  registryStatus?: 'PENDING' | 'RECORDED' | 'FAILED';
  printedCount: number;
  createdAt: string;
  [key: string]: any;
}

export type FixedAssetCategory =
  | 'LAND'
  | 'BUILDINGS'
  | 'MACHINERY'
  | 'VEHICLES'
  | 'COMPUTERS'
  | 'FURNITURE'
  | 'INTANGIBLE'
  | 'OTHER'
  | string;

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'TAX_ACCELERATED' | string;

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: FixedAssetCategory;
  clientId: string;
  purchaseDate: string;
  usageStartDate?: string;
  purchaseCost: number;
  capitalizedAdditions?: number;
  salvageValue: number;
  usefulLifeYears: number;
  accountingDepreciationRate?: number;
  depreciationRate?: number;
  taxDepreciationRate: number;
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  netBookValue: number;
  location?: string;
  serialNumber?: string;
  status: 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED' | 'UNDER_MAINTENANCE' | string;
  disposalDate?: string;
  disposalValue?: number;
  notes?: string;
  [key: string]: any;
}

export interface CustomsShipment {
  id: string;
  shipmentCode: string;
  acidNumber: string;
  clientId?: string;
  importerName: string;
  importerTaxId: string;
  exporterName: string;
  exporterCountry: string;
  portOfArrival: string;
  arrivalDate: string;
  freeDaysAllowed: number;
  containersCount: number;
  containerDailyDemurrageEgp: number;
  hsCode: string;
  goodsDescription: string;
  fobValueForeign: number;
  freightValueForeign: number;
  insuranceValueForeign: number;
  currency: CurrencyCode;
  customsExchangeRate: number;
  cifValueEgp: number;
  customsDutyRate: number;
  customsDutyAmountEgp: number;
  scheduleTaxRate?: number;
  scheduleTaxAmountEgp?: number;
  vatRate: number;
  vatAmountEgp: number;
  whtRate: number;
  whtAmountEgp: number;
  portAndClearanceExpensesEgp: number;
  totalLandedCostEgp: number;
  status: 'PRE_ARRIVAL_ACI' | 'AT_PORT_INSPECTION' | 'DUTIES_ASSESSED' | 'RELEASED' | 'DELIVERED_WAREHOUSE' | string;
  notes?: string;
  [key: string]: any;
}

export interface DailyExchangeRateRecord {
  id: string;
  date: string;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  buyRate: number;
  sellRate: number;
  officialRate: number;
  source: 'CBE' | 'MANUAL' | 'BANK' | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  code?: string;
  name?: string;
  rateToEgp?: number;
  isBase?: boolean;
  lastUpdated?: string;
}

export interface FeasibilityStudy {
  id: string;
  studyCode?: string;
  projectName: string;
  clientId?: string;
  clientName?: string;
  sector?: string;
  initialInvestment: number;
  workingCapital?: number;
  discountRate: number;
  taxRate?: number;
  annualRevenueYear1?: number;
  revenueGrowthRate?: number;
  operatingExpenseRatio?: number;
  npv?: number;
  irr?: number;
  paybackPeriodYears?: number;
  roiPercent?: number;
  createdAt: string;
  notes?: string;
  [key: string]: any;
}

export interface OfficeProfile {
  auditorName: string;
  auditorNameEn?: string;
  firmName: string;
  firmNameEn?: string;
  title: string;
  titleEn?: string;
  licenseNumber: string;
  taxAuthorityRegNo: string;
  efsaRegNo?: string;
  centralBankRegNo?: string;
  commercialRegisterNo?: string;
  chamberRegistrationNo?: string;
  address: string;
  addressEn?: string;
  phone: string;
  mobile: string;
  whatsappNumber?: string;
  email: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  headerRightLines?: string[];
  headerLeftLines?: string[];
  footerRightText?: string;
  footerCenterText?: string;
  footerLeftText?: string;
  defaultTaxEnabled?: boolean;
  defaultTaxRate?: number;
  includeOfficeTaxInfo?: boolean;
  sendClientDataToGemini?: boolean;
  aiDisabled?: boolean;
  showMainOfficeAddress?: boolean;
  mainOfficeAddress?: string;
  showBranchOfficeAddress?: boolean;
  branchOfficeAddress?: string;
  taxAuthorityLicense?: string;
  etaConfig?: EtaConfig;
  [key: string]: any;
}

export interface SystemUser {
  id: string;
  username?: string;
  name: string;
  email: string;
  pin?: string;
  passwordHash?: string;
  role: UserRole;
  roleTitleArabic: string;
  isActive?: boolean;
  canManageUsers?: boolean;
  canAccessTreasury: boolean;
  canAccessAuditTrail: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  canAccessCreditFiles?: boolean;
  canAccessTaxReports?: boolean;
  permittedClientIds?: string[];
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  [key: string]: any;
}

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  databaseId?: string;
  firestoreDatabaseId?: string;
  isEnabled?: boolean;
  isCustomActive?: boolean;
  [key: string]: any;
}

export interface UserPreferences {
  themeMode: ThemeMode;
  brandColor: BrandColor;
  language: AppLanguage;
  compactView: boolean;
  reportingCurrency?: CurrencyCode;
  autoBackupEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  customFirebaseConfig?: CustomFirebaseConfig;
  [key: string]: any;
}

export type WhatsAppEventCategory =
  | 'TAX_REMINDER'
  | 'FEE_CLAIM'
  | 'DOCUMENT_REQUEST'
  | 'REPORT_READY'
  | 'INVOICE_NOTIFICATION'
  | 'WELCOME'
  | 'GENERAL'
  | string;

export interface WhatsAppMessageTemplate {
  id: string;
  code?: string;
  title: string;
  category: WhatsAppEventCategory;
  subject?: string;
  templateBody: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string;
  [key: string]: any;
}

export interface WhatsAppBotSettings {
  isAutoReplyEnabled: boolean;
  officeWorkingHours: string;
  welcomeGreeting: string;
  botName: string;
  includeQrVerification: boolean;
  apiDispatchMode: 'DIRECT_WEB_API' | 'META_CLOUD_API' | 'BAILEYS_GATEWAY' | string;
  customApiBaseUrl?: string;
  templates: WhatsAppMessageTemplate[];
  [key: string]: any;
}

export interface WhatsAppMessage {
  id: string;
  clientId?: string;
  clientName: string;
  phoneNumber: string;
  category: WhatsAppEventCategory;
  messageBody: string;
  direction: 'OUTBOUND' | 'INBOUND' | 'OUTGOING' | 'INCOMING';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'QUEUED';
  sentAt: string;
  sentBy?: string;
  referenceId?: string;
  [key: string]: any;
}

export interface FinancialActivityLog {
  id: string;
  timestamp: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'UNPOST' | 'IMPORT' | 'EXPORT' | 'PRINT' | 'ARCHIVE' | string;
  module: 'JOURNAL' | 'ACCOUNTS' | 'STATEMENTS' | 'CLIENTS' | 'TREASURY' | 'TAX' | 'INVOICES' | 'SYSTEM' | string;
  recordId?: string;
  recordCode?: string;
  clientId?: string;
  clientName?: string;
  fiscalYear?: number;
  summary: string;
  details?: string;
  amountImpact?: number;
  userId?: string;
  userName?: string;
  [key: string]: any;
}

export type StandardReportType =
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'EQUITY_CHANGES'
  | 'TRIAL_BALANCE'
  | 'GENERAL_LEDGER'
  | 'AUDITOR_REPORT'
  | 'TAX_DECLARATION'
  | 'CERTIFICATE'
  | 'CLIENT_DOSSIER'
  | string;

export interface ReportLayoutConfig {
  reportType?: StandardReportType;
  paperSize: 'A4' | 'A3' | 'LETTER' | string;
  orientation: 'portrait' | 'landscape' | 'PORTRAIT' | 'LANDSCAPE' | string;
  marginsMm?: { top: number; right: number; bottom: number; left: number };
  margins?: 'DEFAULT' | 'NARROW' | 'WIDE' | 'NONE' | string;
  fontScalePercent?: number;
  showLogo?: boolean;
  showWatermark?: boolean;
  showQrVerification?: boolean;
  showBarcode?: boolean;
  showSignatureBlock?: boolean;
  showComparativeFigures?: boolean;
  includeLetterhead?: boolean;
  includeStamp?: boolean;
  [key: string]: any;
}

export interface PrintSettings {
  paperSize: 'A4' | 'A3' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'narrow' | 'wide' | 'custom';
  customMarginsMm?: { top: number; right: number; bottom: number; left: number };
  scalePercent: number;
  fontFamily: string;
  baseFontSizePx: number;
  headerStyle: 'OFFICIAL_BOXED' | 'MODERN_MINIMAL' | 'CLASSIC_DUAL_LANG';
  showOfficeHeader: boolean;
  showClientBanner: boolean;
  showFooterSignatures: boolean;
  showPageNumbers: boolean;
  showPrintTimestamp: boolean;
  showQrCode: boolean;
  showCode128Barcode: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  useAccountingParentheses: boolean;
  hideZeroBalances: boolean;
  colorMode: 'COLOR' | 'GRAYSCALE' | 'BLACK_AND_WHITE';
  tableDensity: 'COMPACT' | 'NORMAL' | 'SPACIOUS';
  reportDefaults?: Partial<Record<StandardReportType, Partial<ReportLayoutConfig>>>;
  [key: string]: any;
}

export interface OcrSuggestedJournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  notes?: string;
  [key: string]: any;
}

export interface OcrInvoiceResult {
  vendorName?: string;
  vendorTaxId?: string;
  counterparty?: string;
  taxNumber?: string;
  commercialRegister?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  date?: string;
  invoiceType?: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  vatAmount?: number;
  withholdingTaxRate?: number;
  whtAmount?: number;
  totalAmount: number;
  currency?: CurrencyCode;
  confidenceScore?: number;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
  suggestedLines?: OcrSuggestedJournalLine[];
  suggestedJournalEntry?: any;
  rawImagePreviewUrl?: string;
  rawText?: string;
  [key: string]: any;
}

export interface BankStatementLine {
  id: string;
  date: string;
  valueDate?: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
  isMatched: boolean;
  matchedJournalEntryId?: string;
  matchedJournalNumber?: string;
  matchedEntryRef?: string;
  matchConfidence?: number;
  notes?: string;
  category?: 'MATCHED' | 'BANK_CHARGES' | 'UNPRESENTED_CHEQUE' | 'DEPOSIT_IN_TRANSIT' | 'UNMATCHED';
  [key: string]: any;
}

export interface BankReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccountCode: string;
  bankAccountName: string;
  periodEndDate: string;
  statementEndingBalance: number;
  ledgerEndingBalance: number;
  adjustedBankBalance: number;
  adjustedLedgerBalance: number;
  unreconciledDifference: number;
  lines: BankStatementLine[];
  status: 'DRAFT' | 'RECONCILED';
  createdAt: string;
}

export type ExcelAuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ExcelAnomalyCategory =
  | 'UNBALANCED_ROW'
  | 'DUPLICATE_ENTRY'
  | 'ABNORMAL_NATURE'
  | 'WEEKEND_OR_HOLIDAY'
  | 'ROUND_NUMBER_BIAS'
  | 'BENFORD_DEVIATION'
  | 'MISSING_ACCOUNT_CODE'
  | 'OUTLIER_ZSCORE'
  | 'TAX_DISCREPANCY'
  | string;

export interface ExcelAuditRow {
  id?: string;
  rowIndex: number;
  originalRowData?: Record<string, any>;
  accountCode?: string;
  accountName?: string;
  account?: string;
  entity?: string;
  docNo?: string;
  date?: string;
  reference?: string;
  description?: string;
  amount: number;
  debit: number;
  credit: number;
  category?: string;
  hasWarnings?: boolean;
  openingDebit?: number;
  openingCredit?: number;
  movementDebit?: number;
  movementCredit?: number;
  endingDebit?: number;
  endingCredit?: number;
  netBalance?: number;
  mappedCategory?: AccountCategory;
  anomalies?: {
    category: ExcelAnomalyCategory;
    severity: ExcelAuditSeverity;
    messageAr: string;
    recommendationAr?: string;
  }[];
  riskScore?: number;
  [key: string]: any;
}

export interface BenfordDigitMetric {
  digit: number;
  expectedPct?: number;
  actualPct?: number;
  count?: number;
  deviationPct?: number;
  isSuspicious?: boolean;
  actualCount: number;
  actualPercentage: number;
  expectedPercentage: number;
  deviation: number;
  zScore?: number;
  isAnomalous: boolean;
  [key: string]: any;
}

export type BenfordDigitStat = BenfordDigitMetric;

export interface BenfordAnalysisResult {
  totalSampleSize?: number;
  validNumbersCount?: number;
  madScore?: number;
  meanAbsoluteDeviation: number;
  conformityLevel: 'CLOSE' | 'ACCEPTABLE' | 'MARGINAL' | 'NON_CONFORMING' | 'CLOSE_CONFORMITY' | 'ACCEPTABLE_CONFORMITY' | 'MARGINAL_CONFORMITY' | 'NON_CONFORMITY' | string;
  conformitySummaryAr?: string;
  digits?: BenfordDigitMetric[];
  digitStats: BenfordDigitMetric[];
  flaggedDigits?: number[];
  distortedDigits: number[];
  [key: string]: any;
}

export interface AuditClusterSummary {
  clusterId?: string;
  clusterName?: string;
  clusterLabelAr?: string;
  labelAr?: string;
  count: number;
  minAmount: number;
  maxAmount: number;
  totalSum: number;
  totalAmount?: number;
  meanAmount: number;
  outliersCount: number;
  avgRiskScore?: number;
  [key: string]: any;
}

export interface UnsupervisedMlAnomaly {
  id: string;
  rowIndex: number;
  row: ExcelAuditRow;
  reference?: string;
  description?: string;
  amount?: number;
  score: number;
  zScore?: number;
  isolationScore?: number;
  severity: ExcelAuditSeverity;
  category: ExcelAnomalyCategory;
  title: string;
  reasonAr?: string;
  mathematicalReason: string;
  auditingInterpretation: string;
  mandatoryManualAuditStep: string;
  verificationVerdict?: 'UNCHECKED' | 'VERIFIED_SAFE' | 'CONFIRMED_ISSUE' | string;
  isManuallyVerified?: boolean;
  auditorComment?: string;
  [key: string]: any;
}

export interface ExcelAuditDatasetSummary {
  fileName: string;
  sheetName?: string;
  auditDate?: string;
  totalRows?: number;
  validRows?: number;
  validRowsCount: number;
  totalGrossAmount: number;
  totalDebit: number;
  totalCredit: number;
  meanAmount: number;
  medianAmount: number;
  stdDeviation: number;
  overallRiskScore: number;
  anomaliesCount: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  rows?: ExcelAuditRow[];
  benford?: BenfordAnalysisResult;
  mlAnomalies?: UnsupervisedMlAnomaly[];
  clusters?: AuditClusterSummary[];
  [key: string]: any;
}

export interface ColumnDetectionField {
  detectedColumn: string | null;
  confidence: number;
  isManualOverride: boolean;
}

export interface ColumnMappingConfig {
  dateCol: ColumnDetectionField;
  amountCol: ColumnDetectionField;
  debitCol: ColumnDetectionField;
  creditCol: ColumnDetectionField;
  descriptionCol: ColumnDetectionField;
  docNoCol: ColumnDetectionField;
  accountCol: ColumnDetectionField;
  entityCol: ColumnDetectionField;
  categoryCol: ColumnDetectionField;
  [key: string]: any;
}

export interface ExcelImportAuditLog {
  id: string;
  timestamp?: string;
  fileName: string;
  importedAt?: string;
  importedBy?: string;
  rowsImported?: number;
  totalDebit?: number;
  totalCredit?: number;
  status?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | string;
  notes?: string;
  [key: string]: any;
}

export interface AnomalyAlert {
  id: string;
  entryId?: string;
  entryNumber?: string | number;
  date?: string;
  entryDate?: string;
  type?: string;
  category?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  title: string;
  description: string;
  amount?: number;
  accountCode?: string;
  accountName?: string;
  recommendation?: string;
  [key: string]: any;
}

export interface AuditEngagementContract {
  id: string;
  contractCode: string;
  clientId: string;
  clientName: string;
  engagementType?: 'ANNUAL_AUDIT' | 'TAX_INSPECTION_DEFENSE' | 'ETA_COMPLIANCE' | 'BOOKKEEPING' | 'FEASIBILITY_ADVISORY' | string;
  fiscalYear: number;
  scopeOfWork?: string[];
  agreedFeeAmount?: number;
  contractDate?: string;
  startDate: string;
  endDate?: string;
  totalAgreedFee?: number;
  paidAmount: number;
  remainingAmount?: number;
  assignedAuditor?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
  billingSchedule?: {
    milestoneName: string;
    dueDate: string;
    amount: number;
    isBilled: boolean;
    isPaid: boolean;
  }[];
  notes?: string;
}

export interface CashFlowMonthForecast {
  monthIndex?: number;
  monthLabel?: string;
  monthKey: string;
  monthNameAr: string;
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
  stressTestEndingCash: number;
  safetyBufferDeficit: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  expectedCollections?: number;
  expectedVendorPayments?: number;
  expectedPayrollAndRent?: number;
  expectedTaxAndVat?: number;
  expectedCapexOrLoans?: number;
  netCashFlow?: number;
  closingCash?: number;
  isDeficit?: boolean;
  [key: string]: any;
}

export interface HarmonizedTaxInvoice {
  id: string;
  clientId?: string;
  invoiceNumber: string;
  date?: string;
  invoiceDate: string;
  docType?: 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | string;
  category?: InvoiceNatureCategory | string;
  partyName?: string;
  partyTaxId?: string;
  partnerName: string;
  partnerTaxId: string;
  itemDescription?: string;
  taxableAmount: number;
  taxRate?: number;
  vatAmount: number;
  whtAmount?: number;
  totalAmount: number;
  type?: 'SALES' | 'PURCHASE' | string;
  bookNetAmount?: number;
  bookVatAmount?: number;
  etaNetAmount?: number;
  etaVatAmount?: number;
  varianceNet?: number;
  varianceVat?: number;
  matchStatus?: 'MATCHED' | 'MISSING_IN_ETA' | 'MISSING_IN_BOOKS' | 'VALUE_MISMATCH' | string;
  source?: string;
  etaUuid?: string;
  notes?: string;
  [key: string]: any;
}

export interface SapApiConfig {
  id?: string;
  companyCode?: string;
  companyName?: string;
  hostUrl?: string;
  odataServicePath?: string;
  clientNumber?: string;
  baseUrl?: string;
  companyDb?: string;
  username: string;
  password?: string;
  systemType?: 'SAP_B1_SERVICE_LAYER' | 'SAP_S4HANA_ODATA' | 'ODOO_XMLRPC' | string;
  isActive?: boolean;
  isConnected?: boolean;
  autoSyncJournal?: boolean;
  autoSyncCoa?: boolean;
  lastSyncTime?: string;
  lastSyncTimestamp?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    electronDesktop?: {
      isDesktop?: boolean;
      saveBackupFile?: (fileName: string, content: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      openBackupFile?: () => Promise<{ success: boolean; content?: string; fileName?: string; error?: string }>;
      getAppVersion?: () => Promise<string>;
      [key: string]: any;
    };
  }
}
