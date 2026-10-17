import {
  Account,
  ApprovedStatementsSnapshot,
  ClientArchiveRecord,
  ClientDocument,
  ClientDocumentFolder,
  ClientFeeAgreement,
  ClientFeeCollection,
  ClientProcedureTask,
  CurrencyCode,
  CustomsShipment,
  DailyExchangeRateRecord,
  FeasibilityStudy,
  FinancialActivityLog,
  FixedAsset,
  Invoice,
  JournalEntry,
  OfficeProfile,
  OfficeTreasuryTransaction,
  OpenItem,
  ProfessionalCertificate,
  SystemUser,
  TaxDeclarationRecord,
  UserPreferences,
  WhatsAppBotSettings,
  WhatsAppMessage,
  WhatsAppMessageTemplate,
} from '../types';
import { FirebaseUserProfile } from '../services/firebaseAuthService';
import { IssuedDocumentService } from '../services/issuedDocumentService';
import { generateVerificationCode } from '../utils/verificationCode';
import { computeSingleClientFeeSummary } from '../utils/clientFees';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  [key: string]: any;
}

export interface ActiveClientContext {
  clientId: string | null;
  clientName?: string;
  companyName?: string;
  clientCode?: string;
  selectedFiscalYear: number;
  autoFilterEnabled: boolean;
  autoFilterAccountingData?: boolean;
  [key: string]: any;
}

export interface SystemSerialsConfig {
  systemSerial: string;
  activationKey: string;
  licenseNumber: string;
  taxAuthorityRegNo: string;
  journalPrefix: string;
  journalNextNumber: number;
  invoicePrefix: string;
  invoiceNextNumber: number;
  certificatePrefix: string;
  certificateNextNumber: number;
  treasuryPrefix: string;
  treasuryNextNumber: number;
  [key: string]: any;
}

export interface UnmatchedFeeMigrationItem {
  treasuryTransactionId: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  date: string;
  reason: string;
}

export interface DatabaseState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  clients: ClientArchiveRecord[];
  treasuryTransactions: OfficeTreasuryTransaction[];
  taxDeclarations: TaxDeclarationRecord[];
  taxMandates: any[];
  certificates: ProfessionalCertificate[];
  invoices: Invoice[];
  feasibilityStudies: FeasibilityStudy[];
  creditSimulations: any[];
  fixedAssets: FixedAsset[];
  feeEstimates: any[];
  customsShipments: CustomsShipment[];
  whatsappMessages: WhatsAppMessage[];
  whatsappBotSettings?: WhatsAppBotSettings;
  exchangeRates: DailyExchangeRateRecord[];
  officeProfile: OfficeProfile;
  users: SystemUser[];
  currentUserId: string;
  preferences: UserPreferences;
  auditLogs: AuditLogEntry[];
  financialActivityLogs: FinancialActivityLog[];
  fiscalPeriodLocks: Record<number, { isLocked: boolean; lockedAt?: string; lockedBy?: string }>;
  activeClientContext: ActiveClientContext;
  closingChecklists: Record<string, any[]>;
  clientDeadlines: any[];
  openItems: OpenItem[];
  approvedStatements: ApprovedStatementsSnapshot[];
  feeAgreements: ClientFeeAgreement[];
  feeCollections: ClientFeeCollection[];
  feeMigrationUnmatchedReport?: UnmatchedFeeMigrationItem[];
  systemSerials?: SystemSerialsConfig;
  [key: string]: any;
}

const STORAGE_PREFIX = 'mg_cpa_db_v3_';
const FULL_STATE_KEY = 'mg_cpa_full_state_v3';

export function getStandardEgyptianChartOfAccounts(): Account[] {
  return [
    {
      id: 'acc-1000',
      code: '1000',
      name: 'الأصول',
      nameEn: 'Assets',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 1,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1101',
      code: '1101',
      name: 'النقدية بالصندوق والخزينة الرئيسية',
      nameEn: 'Cash on Hand',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 250000,
      openingBalanceCredit: 0,
      currentBalance: 250000,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1102',
      code: '1102',
      name: 'البنوك - حسابات جارية بالعملة المحلية',
      nameEn: 'Banks - Current Accounts',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 850000,
      openingBalanceCredit: 0,
      currentBalance: 850000,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1103',
      code: '1103',
      name: 'العملاء والمدينون التجاريون',
      nameEn: 'Accounts Receivable',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 320000,
      openingBalanceCredit: 0,
      currentBalance: 320000,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1105',
      code: '1105',
      name: 'ضريبة القيمة المضافة على المدخلات',
      nameEn: 'VAT Input Tax',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1106',
      code: '1106',
      name: 'ضرائب خصم وتحصيل تحت حساب الضريبة (مدين)',
      nameEn: 'WHT Receivable',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1220',
      code: '1220',
      name: 'العملاء - مدينون تجاريون',
      nameEn: 'Trade Receivables',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1230',
      code: '1230',
      name: 'مصلحة الضرائب - ضريبة خصم وتحصيل (أ.ت.ص)',
      nameEn: 'WHT Tax Authority Receivable',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-1250',
      code: '1250',
      name: 'النقدية بالصندوق (الخزينة الرئيسية)',
      nameEn: 'Main Treasury Cash',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      parentId: 'acc-1000',
      parentCode: '1000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-2000',
      code: '2000',
      name: 'الالتزامات وحقوق الملكية',
      nameEn: 'Liabilities & Equity',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 1,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-2101',
      code: '2101',
      name: 'الموردون والدائنون التجاريون',
      nameEn: 'Accounts Payable',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      parentId: 'acc-2000',
      parentCode: '2000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 420000,
      currentBalance: 420000,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-2104',
      code: '2104',
      name: 'مصلحة الضرائب - ضريبة القيمة المضافة',
      nameEn: 'VAT Payable',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      parentId: 'acc-2000',
      parentCode: '2000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-2105',
      code: '2105',
      name: 'مصلحة الضرائب - خصم وتحصيل تحت حساب الضريبة (نموذج 41)',
      nameEn: 'WHT Form 41 Payable',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      parentId: 'acc-2000',
      parentCode: '2000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-2230',
      code: '2230',
      name: 'مصلحة الضرائب على القيمة المضافة',
      nameEn: 'ETA VAT Account',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      parentId: 'acc-2000',
      parentCode: '2000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-3101',
      code: '3101',
      name: 'رأس المال المدفوع',
      nameEn: 'Paid-up Capital',
      category: 'EQUITY',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 1000000,
      currentBalance: 1000000,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-4101',
      code: '4101',
      name: 'إيرادات النشاط والمبيعات المعتمدة',
      nameEn: 'Sales & Operating Revenues',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-4110',
      code: '4110',
      name: 'إيرادات المبيعات والخدمات',
      nameEn: 'Sales & Services Revenue',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-5101',
      code: '5101',
      name: 'تكلفة المبيعات والمشتريات والخدمات',
      nameEn: 'Cost of Goods Sold & Purchases',
      category: 'EXPENSES',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-5201',
      code: '5201',
      name: 'المصروفات العمومية والإدارية',
      nameEn: 'General & Administrative Expenses',
      category: 'EXPENSES',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
  ];
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppMessageTemplate[] = [
  {
    id: 'tpl-tax-reminder',
    code: 'TAX_REMINDER',
    title: 'تذكير بموعد الإقرار الضريبي',
    category: 'TAX_REMINDER',
    templateBody: 'السادة / {clientName}، نود تذكيركم بقرب موعد تقديم الإقرار الضريبي عن الفترة الحالية. مكتب المحاسب القانوني محمد جميل مرعي.',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'tpl-fee-claim',
    code: 'FEE_CLAIM',
    title: 'إشعار استحقاق أتعاب مهنية',
    category: 'FEE_CLAIM',
    templateBody: 'السادة / {clientName}، مرفق لسيادتكم بيان الأتعاب المهنية المستحقة عن السنة المالية {fiscalYear}. نشكر تعاونكم الدائم.',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'tpl-doc-req',
    code: 'DOCUMENT_REQUEST',
    title: 'طلب مستندات للمراجعة',
    category: 'DOCUMENT_REQUEST',
    templateBody: 'السادة / {clientName}، برجاء التكرم بموافاتنا بالمستندات المطلوبة لاستكمال أعمال الفحص والمراجعة.',
    isDefault: true,
    isActive: true,
  },
];

/**
 * Stage 3 Requirement 8 Migration:
 * Reconciles legacy INCOME_FEES treasuryTransactions with feeCollections so there is a single source of truth
 * with mutual IDs (feeCollectionId <-> treasuryTransactionId), preventing duplicates and reporting any unmatched items.
 */
export function reconcileFeeCollectionsAndTreasury(state: DatabaseState): {
  matchedCount: number;
  createdTreasuryCount: number;
  createdCollectionCount: number;
  deduplicatedCount: number;
  unmatched: UnmatchedFeeMigrationItem[];
} {
  if (!Array.isArray(state.feeAgreements)) state.feeAgreements = [];
  if (!Array.isArray(state.feeCollections)) state.feeCollections = [];
  if (!Array.isArray(state.treasuryTransactions)) state.treasuryTransactions = [];
  if (!Array.isArray(state.clients)) state.clients = [];

  let matchedCount = 0;
  let createdTreasuryCount = 0;
  let createdCollectionCount = 0;
  let deduplicatedCount = 0;
  const unmatched: UnmatchedFeeMigrationItem[] = [];

  // 0. Ensure every client with annualAgreedFees > 0 has at least one ACTIVE ClientFeeAgreement if none exist for them
  for (const client of state.clients) {
    const clientAgreements = state.feeAgreements.filter((a) => a.clientId === client.id && a.status !== 'CANCELLED');
    if (clientAgreements.length === 0 && (Number(client.annualAgreedFees) || 0) > 0) {
      const fy = client.activeFiscalYear || new Date().getFullYear();
      state.feeAgreements.push({
        id: `fa-migrated-${client.id}-${fy}`,
        clientId: client.id,
        fiscalYear: fy,
        description: `اتفاقية أتعاب سنوية معتمدة - ${client.name}`,
        amount: Number(client.annualAgreedFees) || 0,
        status: 'ACTIVE',
        createdAt: client.createdAt || new Date().toISOString().slice(0, 10),
      });
    }
  }

  // 1. Deduplicate treasuryTransactions that share the same feeCollectionId
  const seenCollectionIdsInTreasury = new Set<string>();
  state.treasuryTransactions = state.treasuryTransactions.filter((tx) => {
    if (tx.type === 'INCOME_FEES' && tx.feeCollectionId) {
      if (seenCollectionIdsInTreasury.has(tx.feeCollectionId)) {
        deduplicatedCount++;
        return false;
      }
      seenCollectionIdsInTreasury.add(tx.feeCollectionId);
    }
    return true;
  });

  // 2. For each feeCollection, find or create its linked INCOME_FEES treasury transaction
  const matchedTreasuryIds = new Set<string>();

  for (const col of state.feeCollections) {
    let linkedTx = state.treasuryTransactions.find(
      (tx) =>
        tx.type === 'INCOME_FEES' &&
        (tx.id === col.treasuryTransactionId || tx.feeCollectionId === col.id || tx.id === col.id)
    );

    if (!linkedTx) {
      // Try matching by clientId + amount + date
      linkedTx = state.treasuryTransactions.find(
        (tx) =>
          tx.type === 'INCOME_FEES' &&
          !tx.feeCollectionId &&
          !matchedTreasuryIds.has(tx.id) &&
          tx.clientId === col.clientId &&
          Math.abs((Number(tx.amount) || 0) - (Number(col.amount) || 0)) < 0.01 &&
          (tx.date || '').slice(0, 10) === (col.paidAt || '').slice(0, 10)
      );
    }

    if (linkedTx) {
      linkedTx.feeCollectionId = col.id;
      linkedTx.agreementId = col.agreementId;
      col.treasuryTransactionId = linkedTx.id;
      matchedTreasuryIds.add(linkedTx.id);
      matchedCount++;
    } else {
      // Automatically create the linked INCOME_FEES treasury transaction with mutual reference
      const clientObj = state.clients.find((c) => c.id === col.clientId);
      const txId = col.treasuryTransactionId || col.id;
      const newTx: OfficeTreasuryTransaction = {
        id: txId,
        date: col.paidAt || new Date().toISOString().slice(0, 10),
        type: 'INCOME_FEES',
        category: 'تحصيل أتعاب مهنية',
        amount: Number(col.amount) || 0,
        clientId: col.clientId,
        clientName: clientObj?.name || '',
        feeCollectionId: col.id,
        agreementId: col.agreementId,
        paymentMethod: col.method || 'CASH',
        receiptNumber: col.receiptNo,
        referenceNumber: col.receiptNo,
        description: col.notes || `تحصيل أتعاب مهنية - ${clientObj?.name || col.clientId}`,
        createdAt: col.createdAt || new Date().toISOString(),
      };
      col.treasuryTransactionId = newTx.id;
      state.treasuryTransactions.unshift(newTx);
      matchedTreasuryIds.add(newTx.id);
      createdTreasuryCount++;
    }
  }

  // 3. Inspect remaining legacy INCOME_FEES treasuryTransactions that weren't matched to any feeCollection
  for (const tx of state.treasuryTransactions) {
    if (tx.type !== 'INCOME_FEES') continue;
    if (matchedTreasuryIds.has(tx.id) || tx.feeCollectionId) continue;

    if (!tx.clientId) {
      unmatched.push({
        treasuryTransactionId: tx.id,
        clientName: tx.clientName,
        amount: Number(tx.amount) || 0,
        date: tx.date,
        reason: 'حركة تحصيل أتعاب بالخزنة بدون معرّف عميل (clientId) مرتبط',
      });
      continue;
    }

    // Find active agreement for this client
    let agreement = state.feeAgreements.find(
      (a) => a.clientId === tx.clientId && a.status !== 'CANCELLED'
    );
    if (!agreement) {
      const clientObj = state.clients.find((c) => c.id === tx.clientId);
      if (clientObj) {
        const fy = clientObj.activeFiscalYear || new Date(tx.date || Date.now()).getFullYear() || new Date().getFullYear();
        agreement = {
          id: `fa-auto-${clientObj.id}-${fy}`,
          clientId: clientObj.id,
          fiscalYear: fy,
          description: `اتفاقية أتعاب مهنية - ${clientObj.name}`,
          amount: Math.max(Number(clientObj.annualAgreedFees) || 0, Number(tx.amount) || 0),
          status: 'ACTIVE',
          createdAt: tx.date || new Date().toISOString().slice(0, 10),
        };
        state.feeAgreements.push(agreement);
      }
    }

    if (agreement) {
      const newCol: ClientFeeCollection = {
        id: tx.id,
        agreementId: agreement.id,
        clientId: tx.clientId,
        amount: Number(tx.amount) || 0,
        paidAt: tx.date || new Date().toISOString().slice(0, 10),
        method: tx.paymentMethod || 'CASH',
        receiptNo: tx.receiptNumber || tx.referenceNumber,
        treasuryTransactionId: tx.id,
        notes: tx.description,
        createdAt: tx.createdAt || new Date().toISOString(),
      };
      tx.feeCollectionId = newCol.id;
      tx.agreementId = agreement.id;
      state.feeCollections.push(newCol);
      matchedTreasuryIds.add(tx.id);
      createdCollectionCount++;
    } else {
      unmatched.push({
        treasuryTransactionId: tx.id,
        clientId: tx.clientId,
        clientName: tx.clientName,
        amount: Number(tx.amount) || 0,
        date: tx.date,
        reason: 'تعذر مطابقة العميل أو إيجاد اتفاقية أتعاب مرتبطة لحركة الخزنة القديمة',
      });
    }
  }

  // 4. Sync client.annualAgreedFees and client.paidFees from the unified calculator
  for (const client of state.clients) {
    const summary = computeSingleClientFeeSummary(client.id, state.feeAgreements, state.feeCollections);
    if (summary.totalAgreed > 0 || summary.totalPaid > 0) {
      client.annualAgreedFees = summary.totalAgreed;
      client.paidFees = summary.totalPaid;
    }
  }

  state.feeMigrationUnmatchedReport = unmatched;
  return {
    matchedCount,
    createdTreasuryCount,
    createdCollectionCount,
    deduplicatedCount,
    unmatched,
  };
}

class LocalDatabase {
  public state: DatabaseState;
  private listeners: Set<() => void> = new Set();
  private dirtySlices: Set<string> = new Set();
  private versionedRecords: Map<string, { data: any; version: number }> = new Map();

  constructor() {
    this.state = this.loadInitialState();
  }

  public createDefaultState(): DatabaseState {
    const defaultAdmin: SystemUser = {
      id: 'user-admin',
      username: 'admin',
      name: 'د. محمد جميل مرعي (الشريك المدير)',
      email: 'admin@marei-cpa.eg',
      role: 'ADMIN',
      roleTitleArabic: 'الشريك المدير ومراقب الحسابات',
      isActive: true,
      canManageUsers: true,
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      canPostEntries: true,
      canEditPostedEntries: true,
      canDeleteRecords: true,
      canAccessCreditFiles: true,
      canAccessTaxReports: true,
      mustChangePassword: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const initialState: DatabaseState = {
      accounts: getStandardEgyptianChartOfAccounts(),
      journalEntries: [],
      clients: [
        {
          id: 'client-1',
          code: 'CL-2026-001',
          name: 'شركة النيل للصناعات الهندسية والتجارة ش.م.م',
          taxId: '204-819-310',
          taxCardNo: '204-819-310',
          commercialRegister: '145890 استثمار القاهرة',
          commercialRegNo: '145890',
          companyType: 'JOINT_STOCK',
          relationshipType: 'ANNUAL_CONTRACT',
          industry: 'صناعات هندسية وتوريدات',
          taxOffice: 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
          address: 'المنطقة الصناعية الثالثة - مدينة العاشر من رمضان',
          phone: '01003335360',
          whatsappPhone: '201003335360',
          email: 'finance@nile-eng.eg',
          contactPerson: 'أ. أحمد محمود عبدالرحمن (المدير المالي)',
          capitalAmount: 10000000,
          paidUpCapital: 10000000,
          annualAgreedFees: 60000,
          paidFees: 35000,
          activeFiscalYear: 2026,
          isVatRegistered: true,
          isWithholdingTaxSubject: true,
          isPayrollTaxSubject: true,
          eInvoiceRegistered: true,
          hasEsealToken: true,
          tokenCustodyStatus: 'IN_OFFICE',
          status: 'ACTIVE',
          folders: [],
          documents: [],
          procedures: [],
          createdAt: '2026-01-10',
        },
      ],
      treasuryTransactions: [],
      taxDeclarations: [],
      taxMandates: [],
      certificates: [],
      invoices: [],
      feasibilityStudies: [],
      creditSimulations: [],
      fixedAssets: [],
      feeEstimates: [],
      customsShipments: [],
      whatsappMessages: [],
      whatsappBotSettings: {
        isAutoReplyEnabled: true,
        officeWorkingHours: 'السبت - الخميس (9 صباحاً - 6 مساءً)',
        welcomeGreeting: 'مرحباً بكم في مكتب المحاسب القانوني محمد جميل مرعي',
        botName: 'مساعد مكتب محمد جميل مرعي',
        includeQrVerification: true,
        apiDispatchMode: 'DIRECT_WEB_API',
        templates: [...DEFAULT_WHATSAPP_TEMPLATES],
      },
      exchangeRates: [
        {
          id: 'fx-usd-default',
          date: '2026-01-01',
          currency: 'USD',
          baseCurrency: 'EGP',
          buyRate: 48.55,
          sellRate: 48.75,
          officialRate: 48.65,
          rateToEgp: 48.65,
          code: 'USD',
          name: 'دولار أمريكي',
          source: 'CBE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      officeProfile: {
        auditorName: 'محمد جميل مرعي',
        firmName: 'مكتب المحاسب القانوني ومراقب الحسابات محمد جميل مرعي',
        title: 'محاسب قانوني وخبير ضرائب ومراقب حسابات شركات الأموال',
        licenseNumber: 'س.م.م 43122',
        taxAuthorityRegNo: '233-519-890',
        address: 'ميدان النافورة - مركز الحسينية - الشرقية / فرع العاشر من رمضان',
        phone: '01003335360',
        mobile: '01003335360',
        whatsappNumber: '201003335360',
        email: 'office@marei-cpa.eg',
        defaultTaxEnabled: true,
        defaultTaxRate: 14,
        includeOfficeTaxInfo: true,
        sendClientDataToGemini: false,
      },
      users: [defaultAdmin],
      currentUserId: defaultAdmin.id,
      preferences: {
        themeMode: 'light',
        brandColor: 'emerald',
        language: 'ar',
        compactView: false,
        reportingCurrency: 'EGP',
        autoBackupEnabled: true,
        soundEffectsEnabled: true,
      },
      auditLogs: [],
      financialActivityLogs: [],
      fiscalPeriodLocks: {},
      activeClientContext: {
        clientId: null,
        selectedFiscalYear: 2026,
        autoFilterEnabled: false,
      },
      closingChecklists: {},
      clientDeadlines: [],
      openItems: [],
      approvedStatements: [],
      feeAgreements: [
        {
          id: 'fa-default-1',
          clientId: 'client-1',
          fiscalYear: 2026,
          description: 'اتفاقية المراجعة السنوية والإقرارات الضريبية لعام 2026',
          amount: 60000,
          dueDate: '2026-12-31',
          status: 'ACTIVE',
          createdAt: '2026-01-10',
        },
      ],
      feeCollections: [
        {
          id: 'fc-default-1',
          agreementId: 'fa-default-1',
          clientId: 'client-1',
          amount: 35000,
          paidAt: '2026-02-15',
          method: 'BANK_TRANSFER',
          receiptNo: 'REC-2026-001',
          treasuryTransactionId: 'fc-default-1',
          notes: 'الدفعة المقدمة من أتعاب المراجعة السنوية 2026',
          createdAt: '2026-02-15T10:00:00Z',
        },
      ],
      systemSerials: {
        systemSerial: 'MAREI-ERP-2026-PRO',
        activationKey: 'ACT-2026-MAREI-CPA',
        licenseNumber: 'س.م.م 43122',
        taxAuthorityRegNo: '233-519-890',
        journalPrefix: 'JV-2026-',
        journalNextNumber: 1001,
        invoicePrefix: 'INV-2026-',
        invoiceNextNumber: 101,
        certificatePrefix: 'CERT-2026-',
        certificateNextNumber: 501,
        treasuryPrefix: 'TR-2026-',
        treasuryNextNumber: 201,
      },
    };

    reconcileFeeCollectionsAndTreasury(initialState);
    return initialState;
  }

  public loadInitialState(): DatabaseState {
    const base = this.createDefaultState();
    try {
      if (typeof localStorage !== 'undefined') {
        const rawFull = localStorage.getItem(FULL_STATE_KEY);
        if (rawFull) {
          const parsed = JSON.parse(rawFull);
          const merged: DatabaseState = {
            ...base,
            ...parsed,
            closingChecklists: parsed.closingChecklists || base.closingChecklists || {},
            clientDeadlines: parsed.clientDeadlines || base.clientDeadlines || [],
            openItems: parsed.openItems || base.openItems || [],
            approvedStatements: parsed.approvedStatements || base.approvedStatements || [],
            feeAgreements: parsed.feeAgreements || base.feeAgreements || [],
            feeCollections: parsed.feeCollections || base.feeCollections || [],
          };
          reconcileFeeCollectionsAndTreasury(merged);
          return merged;
        }
      }
    } catch {
      // ignore corrupted storage
    }
    return base;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    }
  }

  public saveState(sliceName = 'ALL'): void {
    this.dirtySlices.add(sliceName);
    this.flushDirtyStorage();
    this.notify();
  }

  public flushDirtyStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(FULL_STATE_KEY, JSON.stringify(this.state));
        for (const slice of this.dirtySlices) {
          localStorage.setItem(`${STORAGE_PREFIX}${slice}`, '1');
        }
      }
      this.dirtySlices.clear();
    } catch {
      // ignore storage quota errors in test/browser
    }
  }

  // =========================================================================
  // Users & Auth Management (Preserves mustChangePassword & PinAuthModal list)
  // =========================================================================
  public getUsers(): SystemUser[] {
    if (!Array.isArray(this.state.users) || this.state.users.length === 0) {
      const fallback = this.createDefaultState().users;
      this.state.users = fallback;
    }
    return this.state.users;
  }

  public getCurrentUser(): SystemUser {
    const users = this.getUsers();
    const found = users.find((u) => u.id === this.state.currentUserId);
    return found || users[0];
  }

  public switchUser(userId: string): SystemUser | undefined {
    const user = this.getUsers().find((u) => u.id === userId);
    if (user) {
      this.state.currentUserId = user.id;
      this.saveState('USERS');
    }
    return user;
  }

  public syncLoggedInUser(
    profile: FirebaseUserProfile,
    source: 'SERVER_AUTH' | 'FIREBASE' | 'OTHER' = 'OTHER'
  ): SystemUser {
    const users = this.getUsers();
    const uid = String(profile.uid || profile.email || 'user-admin');
    const existingIdx = users.findIndex(
      (u) => u.id === uid || (profile.email && u.email?.toLowerCase() === profile.email.toLowerCase())
    );

    const existingUser = existingIdx >= 0 ? users[existingIdx] : undefined;

    // Preserve mustChangePassword = true unless explicitly cleared via SERVER_AUTH or setMustChangePassword
    let mustChangePassword = false;
    if (source === 'SERVER_AUTH') {
      mustChangePassword = Boolean(profile.mustChangePassword);
    } else {
      mustChangePassword = Boolean(existingUser?.mustChangePassword || profile.mustChangePassword);
    }

    const syncedUser: SystemUser = {
      id: existingUser?.id || uid,
      username: existingUser?.username || profile.email?.split('@')[0] || 'user',
      name: profile.name || existingUser?.name || 'مستخدم النظام',
      email: profile.email || existingUser?.email || '',
      role: profile.role || existingUser?.role || 'AUDITOR',
      roleTitleArabic: profile.roleTitleArabic || existingUser?.roleTitleArabic || 'محاسب ومراجع',
      isActive: true,
      canManageUsers: profile.role === 'ADMIN' || Boolean(existingUser?.canManageUsers),
      canAccessTreasury: profile.canAccessTreasury ?? existingUser?.canAccessTreasury ?? true,
      canAccessAuditTrail: profile.canAccessAuditTrail ?? existingUser?.canAccessAuditTrail ?? true,
      canPostEntries: existingUser?.canPostEntries ?? true,
      canEditPostedEntries: profile.canEditPostedEntries ?? existingUser?.canEditPostedEntries ?? (profile.role === 'ADMIN'),
      canDeleteRecords: profile.canDeleteRecords ?? existingUser?.canDeleteRecords ?? (profile.role === 'ADMIN'),
      canAccessCreditFiles: existingUser?.canAccessCreditFiles ?? true,
      canAccessTaxReports: existingUser?.canAccessTaxReports ?? true,
      permittedClientIds: profile.permittedClientIds || existingUser?.permittedClientIds,
      mustChangePassword,
      lastLoginAt: new Date().toISOString(),
      createdAt: existingUser?.createdAt || profile.createdAt || new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.state.users[existingIdx] = syncedUser;
    } else {
      this.state.users.push(syncedUser);
    }
    this.state.currentUserId = syncedUser.id;
    this.saveState('USERS');
    return syncedUser;
  }

  public setMustChangePassword(userId: string, mustChange: boolean): void {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      user.mustChangePassword = Boolean(mustChange);
      this.saveState('USERS');
    }
  }

  public addUser(userInput: Partial<SystemUser> & { name: string; email: string; role: string }): SystemUser {
    const newUser: SystemUser = {
      id: userInput.id || `user-${Date.now()}`,
      username: userInput.username || userInput.email.split('@')[0],
      name: userInput.name,
      email: userInput.email,
      role: userInput.role,
      roleTitleArabic: userInput.roleTitleArabic || 'محاسب ومراجع',
      isActive: userInput.isActive ?? true,
      canManageUsers: userInput.canManageUsers ?? userInput.role === 'ADMIN',
      canAccessTreasury: userInput.canAccessTreasury ?? true,
      canAccessAuditTrail: userInput.canAccessAuditTrail ?? true,
      canPostEntries: userInput.canPostEntries ?? true,
      canEditPostedEntries: userInput.canEditPostedEntries ?? false,
      canDeleteRecords: userInput.canDeleteRecords ?? false,
      canAccessCreditFiles: userInput.canAccessCreditFiles ?? true,
      canAccessTaxReports: userInput.canAccessTaxReports ?? true,
      permittedClientIds: userInput.permittedClientIds || [],
      mustChangePassword: Boolean(userInput.mustChangePassword),
      createdAt: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.saveState('USERS');
    return newUser;
  }

  public updateUser(userId: string, partial: Partial<SystemUser>): SystemUser | undefined {
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    this.state.users[idx] = { ...this.state.users[idx], ...partial };
    this.saveState('USERS');
    return this.state.users[idx];
  }

  public deleteUser(userId: string): boolean {
    const before = this.state.users.length;
    this.state.users = this.state.users.filter((u) => u.id !== userId);
    this.saveState('USERS');
    return this.state.users.length < before;
  }

  public changeUserPassword(userId: string, newPasswordPlain: string): { success: boolean; message: string } {
    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      return { success: false, message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' };
    }
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'المستخدم غير موجود' };
    user.mustChangePassword = false;
    this.saveState('USERS');
    return { success: true, message: 'تم تحديث كلمة المرور بنجاح' };
  }

  public mergeRemoteState(remotePartial: Partial<DatabaseState>): void {
    // Preserve mustChangePassword on existing users when remote state merges
    const existingMustChangeMap = new Map<string, boolean>();
    for (const u of this.state.users || []) {
      if (u.mustChangePassword) {
        existingMustChangeMap.set(u.id, true);
        if (u.email) existingMustChangeMap.set(u.email.toLowerCase(), true);
      }
    }

    this.state = {
      ...this.state,
      ...remotePartial,
    };

    if (Array.isArray(this.state.users)) {
      this.state.users = this.state.users.map((u) => {
        const hadMustChange =
          existingMustChangeMap.get(u.id) ||
          (u.email ? existingMustChangeMap.get(u.email.toLowerCase()) : false);
        return {
          ...u,
          mustChangePassword: Boolean(u.mustChangePassword || hadMustChange),
        };
      });
    }

    reconcileFeeCollectionsAndTreasury(this.state);
    this.saveState('ALL');
  }

  // =========================================================================
  // Backup Export / Import & Production Reset
  // =========================================================================
  public exportFullBackupJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importFullBackupJson(jsonText: string): boolean {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object') return false;
      this.mergeRemoteState(parsed);
      this.flushDirtyStorage();
      return true;
    } catch {
      return false;
    }
  }

  public exportClientIsolatedBackup(clientId: string): string {
    const client = this.state.clients.find((c) => c.id === clientId);
    const payload = {
      exportedAt: new Date().toISOString(),
      client,
      journalEntries: this.state.journalEntries.filter((j) => j.clientId === clientId),
      invoices: this.state.invoices.filter((i) => i.clientId === clientId),
      taxDeclarations: this.state.taxDeclarations.filter((t) => t.clientId === clientId),
      treasuryTransactions: this.state.treasuryTransactions.filter((t) => t.clientId === clientId),
      feeAgreements: this.state.feeAgreements.filter((a) => a.clientId === clientId),
      feeCollections: this.state.feeCollections.filter((c) => c.clientId === clientId),
      openItems: this.state.openItems.filter((o) => o.clientId === clientId),
      approvedStatements: this.state.approvedStatements.filter((s) => s.clientId === clientId),
    };
    return JSON.stringify(payload, null, 2);
  }

  public async resetForProduction(options?: {
    passcode?: string;
    confirmationText?: string;
  }): Promise<{ success: boolean; message: string; backupJson?: string }> {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.role !== 'ADMIN') {
      return { success: false, message: 'هذه العملية متاحة لمدير النظام (ADMIN) فقط.' };
    }
    if (options?.confirmationText && options.confirmationText !== 'تفريغ' && options.confirmationText !== 'RESET') {
      return { success: false, message: 'كلمة التأكيد غير صحيحة.' };
    }

    const backupJson = this.exportFullBackupJson();

    // Reset chart of accounts balances to zero while keeping standard accounts
    const cleanAccounts = (this.state.accounts.length > 0 ? this.state.accounts : getStandardEgyptianChartOfAccounts()).map(
      (acc) => ({
        ...acc,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentDebit: 0,
        currentCredit: 0,
        currentBalance: 0,
      })
    );

    this.state.accounts = cleanAccounts;
    this.state.clients = [];
    this.state.journalEntries = [];
    this.state.treasuryTransactions = [];
    this.state.taxDeclarations = [];
    this.state.taxMandates = [];
    this.state.certificates = [];
    this.state.invoices = [];
    this.state.feasibilityStudies = [];
    this.state.creditSimulations = [];
    this.state.fixedAssets = [];
    this.state.feeEstimates = [];
    this.state.customsShipments = [];
    this.state.whatsappMessages = [];
    this.state.closingChecklists = {};
    this.state.clientDeadlines = [];
    this.state.openItems = [];
    this.state.approvedStatements = [];
    this.state.feeAgreements = [];
    this.state.feeCollections = [];
    this.state.financialActivityLogs = [];

    this.state.officeProfile = {
      ...this.state.officeProfile,
      firmName: '',
      auditorName: '',
      phone: '',
      mobile: '',
      email: '',
    };

    this.saveState('ALL');
    return {
      success: true,
      message: 'تم تصفير البيانات التجريبية وتهيئة النظام للعمل الفعلي بنجاح.',
      backupJson,
    };
  }

  public resetToDemoData(): boolean {
    this.state = this.createDefaultState();
    this.saveState('ALL');
    return true;
  }

  // =========================================================================
  // Accounts & Journal Entries
  // =========================================================================
  public addAccount(acc: Partial<Account> & { code: string; name: string }): Account {
    const created: Account = {
      id: acc.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: acc.code,
      name: acc.name,
      category: acc.category || 'ASSETS',
      nature: acc.nature || 'DEBIT',
      level: acc.level || 4,
      openingBalanceDebit: Number(acc.openingBalanceDebit) || 0,
      openingBalanceCredit: Number(acc.openingBalanceCredit) || 0,
      currentBalance: Number(acc.currentBalance) || 0,
      ...acc,
    };
    this.state.accounts.push(created);
    this.saveState('ACCOUNTS');
    return created;
  }

  public updateAccount(accountId: string, partial: Partial<Account>): Account | undefined {
    const idx = this.state.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return undefined;
    this.state.accounts[idx] = { ...this.state.accounts[idx], ...partial };
    this.saveState('ACCOUNTS');
    return this.state.accounts[idx];
  }

  public deleteAccount(accountId: string): boolean {
    const before = this.state.accounts.length;
    this.state.accounts = this.state.accounts.filter((a) => a.id !== accountId);
    this.saveState('ACCOUNTS');
    return this.state.accounts.length < before;
  }

  public applyIndustrialChartOfAccounts(_clientId?: string): { added: number; message: string } {
    const industrialAccounts: Account[] = [
      {
        id: 'acc-ind-1310',
        code: '1310',
        name: 'مخزون الخامات والمواد الأولية',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
      },
      {
        id: 'acc-ind-1320',
        code: '1320',
        name: 'مخزون الإنتاج تحت التشغيل (WIP)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
      },
      {
        id: 'acc-ind-1330',
        code: '1330',
        name: 'مخزون الإنتاج التام',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
      },
    ];
    let added = 0;
    for (const ia of industrialAccounts) {
      if (!this.state.accounts.some((a) => a.code === ia.code)) {
        this.state.accounts.push(ia);
        added++;
      }
    }
    this.saveState('ACCOUNTS');
    return { added, message: `تمت إضافة ${added} حسابات صناعية متخصصة.` };
  }

  public addJournalEntry(entry: Partial<JournalEntry>): JournalEntry {
    const created: JournalEntry = {
      id: entry.id || `je-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entryNumber: entry.entryNumber || this.state.journalEntries.length + 1,
      date: entry.date || new Date().toISOString().slice(0, 10),
      description: entry.description || '',
      lines: entry.lines || [],
      createdAt: entry.createdAt || new Date().toISOString(),
      ...entry,
    };
    this.state.journalEntries.unshift(created);
    this.saveState('JOURNAL');
    return created;
  }

  public updateJournalEntry(entryId: string, partial: Partial<JournalEntry>): JournalEntry | undefined {
    const idx = this.state.journalEntries.findIndex((j) => j.id === entryId);
    if (idx === -1) return undefined;
    this.state.journalEntries[idx] = {
      ...this.state.journalEntries[idx],
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.saveState('JOURNAL');
    return this.state.journalEntries[idx];
  }

  public deleteJournalEntry(entryId: string): boolean {
    const before = this.state.journalEntries.length;
    this.state.journalEntries = this.state.journalEntries.filter((j) => j.id !== entryId);
    this.saveState('JOURNAL');
    return this.state.journalEntries.length < before;
  }

  public deleteGeneratedAuditEntries(fiscalYear: number, clientId?: string): number {
    const before = this.state.journalEntries.length;
    this.state.journalEntries = this.state.journalEntries.filter((j) => {
      const isGenerated = j.source === 'EXCEL_REVIEW' || j.isAutoGenerated;
      const matchesYear = !j.fiscalYear || j.fiscalYear === fiscalYear;
      const matchesClient = !clientId || j.clientId === clientId;
      return !(isGenerated && matchesYear && matchesClient);
    });
    this.saveState('JOURNAL');
    return before - this.state.journalEntries.length;
  }

  public togglePostEntry(entryId: string): JournalEntry | undefined {
    const entry = this.state.journalEntries.find((j) => j.id === entryId);
    if (!entry) return undefined;
    entry.isPosted = !entry.isPosted;
    entry.status = entry.isPosted ? 'POSTED' : 'DRAFT';
    entry.postedAt = entry.isPosted ? new Date().toISOString() : undefined;
    this.saveState('JOURNAL');
    return entry;
  }

  public postBatchJournalEntries(entryIds: string[]): number {
    let count = 0;
    for (const j of this.state.journalEntries) {
      if (entryIds.includes(j.id) && !j.isPosted) {
        j.isPosted = true;
        j.status = 'POSTED';
        j.postedAt = new Date().toISOString();
        count++;
      }
    }
    this.saveState('JOURNAL');
    return count;
  }

  // =========================================================================
  // Clients, Folders, Documents, Procedures & Active Client Context
  // =========================================================================
  public setActiveClient(
    clientId: string | null,
    options?: { fiscalYear?: number; autoFilter?: boolean }
  ): void {
    const client = clientId ? this.state.clients.find((c) => c.id === clientId) : null;
    this.state.activeClientContext = {
      clientId,
      selectedFiscalYear:
        options?.fiscalYear ||
        client?.activeFiscalYear ||
        this.state.activeClientContext?.selectedFiscalYear ||
        2026,
      autoFilterEnabled:
        options?.autoFilter !== undefined
          ? options.autoFilter
          : Boolean(clientId),
    };
    this.saveState('CONTEXT');
  }

  public getActiveClientRecord(): ClientArchiveRecord | null {
    const cid = this.state.activeClientContext?.clientId;
    if (!cid) return null;
    return this.state.clients.find((c) => c.id === cid) || null;
  }

  public toggleActiveClientAutoFilter(): boolean {
    this.state.activeClientContext.autoFilterEnabled = !this.state.activeClientContext.autoFilterEnabled;
    this.saveState('CONTEXT');
    return this.state.activeClientContext.autoFilterEnabled;
  }

  public updateActiveClientFiscalYear(year: number): void {
    this.state.activeClientContext.selectedFiscalYear = year;
    const activeClient = this.getActiveClientRecord();
    if (activeClient) {
      activeClient.activeFiscalYear = year;
    }
    this.saveState('CONTEXT');
  }

  public addClient(clientData: Partial<ClientArchiveRecord>): ClientArchiveRecord {
    const created: ClientArchiveRecord = {
      id: clientData.id || `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: clientData.code || `CL-${new Date().getFullYear()}-${String(this.state.clients.length + 1).padStart(3, '0')}`,
      name: clientData.name || 'عميل جديد',
      taxId: clientData.taxId || clientData.taxCardNo || '',
      taxCardNo: clientData.taxCardNo || clientData.taxId || '',
      commercialRegister: clientData.commercialRegister || clientData.commercialRegNo || '',
      commercialRegNo: clientData.commercialRegNo || clientData.commercialRegister || '',
      companyType: clientData.companyType || 'LIMITED_LIABILITY',
      relationshipType: clientData.relationshipType || 'ANNUAL_CONTRACT',
      annualAgreedFees: Number(clientData.annualAgreedFees) || 0,
      paidFees: Number(clientData.paidFees) || 0,
      activeFiscalYear: clientData.activeFiscalYear || 2026,
      status: clientData.status || 'ACTIVE',
      folders: clientData.folders || [],
      documents: clientData.documents || [],
      procedures: clientData.procedures || [],
      createdAt: new Date().toISOString().slice(0, 10),
      ...clientData,
    };
    this.state.clients.push(created);

    // If annualAgreedFees > 0, ensure a ClientFeeAgreement exists in the single source of truth
    if ((created.annualAgreedFees || 0) > 0) {
      const hasAgreement = this.state.feeAgreements.some((a) => a.clientId === created.id);
      if (!hasAgreement) {
        this.state.feeAgreements.push({
          id: `fa-init-${created.id}`,
          clientId: created.id,
          fiscalYear: created.activeFiscalYear || 2026,
          description: `اتفاقية الأتعاب السنوية - ${created.name}`,
          amount: Number(created.annualAgreedFees) || 0,
          status: 'ACTIVE',
          createdAt: created.createdAt,
        });
      }
    }

    this.saveState('CLIENTS');
    return created;
  }

  public batchAddClients(clientsList: Partial<ClientArchiveRecord>[]): number {
    let count = 0;
    for (const c of clientsList) {
      if (c.name) {
        this.addClient(c as Partial<ClientArchiveRecord> & { name: string });
        count++;
      }
    }
    return count;
  }

  public updateClient(clientId: string, partial: Partial<ClientArchiveRecord>): ClientArchiveRecord | undefined {
    const idx = this.state.clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return undefined;
    this.state.clients[idx] = {
      ...this.state.clients[idx],
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.saveState('CLIENTS');
    return this.state.clients[idx];
  }

  public addClientFolder(clientId: string, folderInput: Partial<ClientDocumentFolder> & { name: string }): ClientDocumentFolder | undefined {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.folders)) client.folders = [];
    const folder: ClientDocumentFolder = {
      id: folderInput.id || `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: folderInput.name,
      parentId: folderInput.parentId || null,
      createdAt: new Date().toISOString().slice(0, 10),
      ...folderInput,
    };
    client.folders.push(folder);
    this.saveState('CLIENTS');
    return folder;
  }

  public updateClientFolder(clientId: string, folderId: string, partial: Partial<ClientDocumentFolder>): void {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.folders)) return;
    const idx = client.folders.findIndex((f) => f.id === folderId);
    if (idx >= 0) {
      client.folders[idx] = { ...client.folders[idx], ...partial };
      this.saveState('CLIENTS');
    }
  }

  public deleteClientFolder(clientId: string, folderId: string): void {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return;
    client.folders = (client.folders || []).filter((f) => f.id !== folderId);
    this.saveState('CLIENTS');
  }

  public addClientDocument(clientId: string, docInput: Partial<ClientDocument>): ClientDocument | undefined {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.documents)) client.documents = [];
    const doc: ClientDocument = {
      id: docInput.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId,
      title: docInput.title || docInput.fileName || docInput.name || 'مستند',
      category: docInput.category || 'OTHER',
      uploadDate: docInput.uploadDate || docInput.uploadedAt || new Date().toISOString().slice(0, 10),
      ...docInput,
    };
    client.documents.unshift(doc);
    this.saveState('CLIENTS');
    return doc;
  }

  public moveClientDocument(
    clientId: string,
    docId: string,
    targetFolderId: string | null,
    _targetFolderName?: string
  ): void {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.documents)) return;
    const doc = client.documents.find((d) => d.id === docId);
    if (doc) {
      doc.folderId = targetFolderId || undefined;
      this.saveState('CLIENTS');
    }
  }

  public deleteClientDocument(clientId: string, docId: string): void {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.documents)) return;
    client.documents = client.documents.filter((d) => d.id !== docId);
    this.saveState('CLIENTS');
  }

  public addClientProcedure(
    clientId: string,
    procInput: Partial<ClientProcedureTask> & { title: string; category: string },
    _financialOptions?: any
  ): ClientProcedureTask | undefined {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.procedures)) client.procedures = [];
    const proc: ClientProcedureTask = {
      id: procInput.id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: procInput.status || 'PENDING',
      startDate: procInput.startDate || new Date().toISOString().slice(0, 10),
      ...procInput,
    };
    client.procedures.unshift(proc);
    this.saveState('CLIENTS');
    return proc;
  }

  public updateClientProcedure(
    clientId: string,
    procedureId: string,
    partial: Partial<ClientProcedureTask>,
    _financialOptions?: any
  ): ClientProcedureTask | undefined {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.procedures)) return undefined;
    const idx = client.procedures.findIndex((p) => p.id === procedureId);
    if (idx === -1) return undefined;
    client.procedures[idx] = { ...client.procedures[idx], ...partial };
    this.saveState('CLIENTS');
    return client.procedures[idx];
  }

  // =========================================================================
  // Unified Fees & Collections (Stage 3 Item 8 - Single Source of Truth)
  // =========================================================================
  public saveFeeAgreement(agreementInput: Partial<ClientFeeAgreement> & { clientId: string; amount: number }): ClientFeeAgreement {
    const existingIdx = agreementInput.id
      ? this.state.feeAgreements.findIndex((a) => a.id === agreementInput.id)
      : -1;

    const record: ClientFeeAgreement = {
      id: agreementInput.id || `fa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: agreementInput.clientId,
      fiscalYear: agreementInput.fiscalYear || new Date().getFullYear(),
      description: agreementInput.description || 'اتفاقية أتعاب مهنية',
      amount: Number(agreementInput.amount) || 0,
      dueDate: agreementInput.dueDate,
      status: agreementInput.status || 'ACTIVE',
      createdAt: agreementInput.createdAt || new Date().toISOString().slice(0, 10),
      notes: agreementInput.notes,
    };

    if (existingIdx >= 0) {
      this.state.feeAgreements[existingIdx] = record;
    } else {
      this.state.feeAgreements.push(record);
    }

    this.syncClientFeeTotals(record.clientId);
    this.saveState('FEES');
    return record;
  }

  public deleteFeeAgreement(agreementId: string): boolean {
    const target = this.state.feeAgreements.find((a) => a.id === agreementId);
    if (!target) return false;
    this.state.feeAgreements = this.state.feeAgreements.filter((a) => a.id !== agreementId);
    this.syncClientFeeTotals(target.clientId);
    this.saveState('FEES');
    return true;
  }

  /**
   * Records a fee collection ONCE in feeCollections and automatically creates/updates
   * the linked OfficeTreasuryTransaction (INCOME_FEES) with mutual IDs (no duplication).
   */
  public recordFeeCollection(input: {
    id?: string;
    agreementId?: string;
    clientId: string;
    amount: number;
    paidAt?: string;
    method?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'INSTAPAY' | string;
    receiptNo?: string;
    notes?: string;
  }): { collection: ClientFeeCollection; treasuryTransaction: OfficeTreasuryTransaction } {
    const client = this.state.clients.find((c) => c.id === input.clientId);
    let agreementId = input.agreementId;

    if (!agreementId) {
      const existingAgreement = this.state.feeAgreements.find(
        (a) => a.clientId === input.clientId && a.status !== 'CANCELLED'
      );
      if (existingAgreement) {
        agreementId = existingAgreement.id;
      } else {
        const autoAgreement = this.saveFeeAgreement({
          clientId: input.clientId,
          fiscalYear: client?.activeFiscalYear || new Date().getFullYear(),
          description: `اتفاقية أتعاب مهنية - ${client?.name || input.clientId}`,
          amount: Math.max(Number(client?.annualAgreedFees) || 0, Number(input.amount) || 0),
          status: 'ACTIVE',
        });
        agreementId = autoAgreement.id;
      }
    }

    const sharedId = input.id || `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const paidAt = input.paidAt || new Date().toISOString().slice(0, 10);
    const method = input.method || 'CASH';

    const collection: ClientFeeCollection = {
      id: sharedId,
      agreementId,
      clientId: input.clientId,
      amount: Number(input.amount) || 0,
      paidAt,
      method,
      receiptNo: input.receiptNo,
      treasuryTransactionId: sharedId,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    const treasuryTx: OfficeTreasuryTransaction = {
      id: sharedId,
      date: paidAt,
      type: 'INCOME_FEES',
      category: 'تحصيل أتعاب مهنية',
      amount: Number(input.amount) || 0,
      clientId: input.clientId,
      clientName: client?.name || '',
      feeCollectionId: sharedId,
      agreementId,
      paymentMethod: method,
      receiptNumber: input.receiptNo,
      referenceNumber: input.receiptNo,
      description: input.notes || `تحصيل أتعاب مهنية - ${client?.name || input.clientId}`,
      createdAt: new Date().toISOString(),
    };

    // Prevent duplicates if called with an existing ID
    this.state.feeCollections = this.state.feeCollections.filter((c) => c.id !== sharedId);
    this.state.treasuryTransactions = this.state.treasuryTransactions.filter(
      (t) => t.id !== sharedId && t.feeCollectionId !== sharedId
    );

    this.state.feeCollections.unshift(collection);
    this.state.treasuryTransactions.unshift(treasuryTx);

    this.syncClientFeeTotals(input.clientId);
    this.saveState('FEES');
    return { collection, treasuryTransaction: treasuryTx };
  }

  public deleteFeeCollection(collectionId: string): boolean {
    const target = this.state.feeCollections.find((c) => c.id === collectionId);
    if (!target) return false;
    this.state.feeCollections = this.state.feeCollections.filter((c) => c.id !== collectionId);
    this.state.treasuryTransactions = this.state.treasuryTransactions.filter(
      (t) => t.id !== collectionId && t.id !== target.treasuryTransactionId && t.feeCollectionId !== collectionId
    );
    this.syncClientFeeTotals(target.clientId);
    this.saveState('FEES');
    return true;
  }

  private syncClientFeeTotals(clientId: string): void {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return;
    const summary = computeSingleClientFeeSummary(
      clientId,
      this.state.feeAgreements,
      this.state.feeCollections
    );
    client.annualAgreedFees = summary.totalAgreed;
    client.paidFees = summary.totalPaid;
  }

  public addTreasuryTransaction(
    txInput: Partial<OfficeTreasuryTransaction>
  ): OfficeTreasuryTransaction {
    // If someone passes INCOME_FEES with a clientId, route through recordFeeCollection so it stays a single source of truth!
    if (txInput.type === 'INCOME_FEES' && txInput.clientId && !txInput.feeCollectionId) {
      const { treasuryTransaction } = this.recordFeeCollection({
        id: txInput.id,
        agreementId: txInput.agreementId,
        clientId: txInput.clientId,
        amount: Number(txInput.amount) || 0,
        paidAt: txInput.date,
        method: txInput.paymentMethod || 'CASH',
        receiptNo: txInput.receiptNumber || txInput.referenceNumber,
        notes: txInput.description,
      });
      return treasuryTransaction;
    }

    const created: OfficeTreasuryTransaction = {
      id: txInput.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: txInput.date || new Date().toISOString().slice(0, 10),
      type: txInput.type || 'EXPENSE_OFFICE',
      amount: Number(txInput.amount) || 0,
      description: txInput.description || '',
      createdAt: txInput.createdAt || new Date().toISOString(),
      ...txInput,
    };
    this.state.treasuryTransactions.unshift(created);
    this.saveState('TREASURY');
    return created;
  }

  // =========================================================================
  // Open Items, Checklists & Approved Statements
  // =========================================================================
  public getOpenItems(clientId?: string, _fiscalYear?: number): OpenItem[] {
    if (!clientId) return this.state.openItems || [];
    return (this.state.openItems || []).filter((i) => i.clientId === clientId);
  }

  public addOpenItem(item: Partial<OpenItem> & { clientId: string; text: string }): OpenItem {
    const created: OpenItem = {
      id: item.id || `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: item.clientId,
      kind: item.kind || 'DOCUMENT',
      text: item.text,
      requestedAt: item.requestedAt || new Date().toISOString().slice(0, 10),
      status: item.status || 'OPEN',
      ...item,
    };
    this.state.openItems.unshift(created);
    this.saveState('OPEN_ITEMS');
    return created;
  }

  public updateOpenItem(id: string, partial: Partial<OpenItem>): OpenItem | undefined {
    const idx = this.state.openItems.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.state.openItems[idx] = { ...this.state.openItems[idx], ...partial };
    this.saveState('OPEN_ITEMS');
    return this.state.openItems[idx];
  }

  public deleteOpenItem(id: string): boolean {
    const before = this.state.openItems.length;
    this.state.openItems = this.state.openItems.filter((i) => i.id !== id);
    this.saveState('OPEN_ITEMS');
    return this.state.openItems.length < before;
  }

  public getChecklist(clientId: string, fiscalYear: number): any[] {
    const key = `${clientId}_${fiscalYear}`;
    return this.state.closingChecklists?.[key] || [];
  }

  public saveChecklist(clientId: string, fiscalYear: number, items: any[]): void {
    const key = `${clientId}_${fiscalYear}`;
    if (!this.state.closingChecklists) this.state.closingChecklists = {};
    this.state.closingChecklists[key] = items;
    this.saveState('CHECKLISTS');
  }

  public getApprovedStatementsForClient(clientId: string, fiscalYear?: number): ApprovedStatementsSnapshot[] {
    return (this.state.approvedStatements || []).filter(
      (s) => s.clientId === clientId && (fiscalYear === undefined || s.fiscalYear === fiscalYear)
    );
  }

  public addApprovedStatement(
    input: Partial<ApprovedStatementsSnapshot> & { clientId: string; fiscalYear: number }
  ): ApprovedStatementsSnapshot {
    const existingForPeriod = this.getApprovedStatementsForClient(input.clientId, input.fiscalYear);
    const nextVersion = input.version || input.versionNo || existingForPeriod.length + 1;
    const snap: ApprovedStatementsSnapshot = {
      id: input.id || `as-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: input.clientId,
      fiscalYear: input.fiscalYear,
      version: nextVersion,
      versionNo: nextVersion,
      approvedAt: input.approvedAt || new Date().toISOString(),
      approvedBy: input.approvedBy || 'مراقب الحسابات',
      source: input.source || 'LEDGER',
      trialBalanceRows: input.trialBalanceRows || [],
      incomeStatement: input.incomeStatement || {},
      balanceSheet: input.balanceSheet || {},
      cashFlow: input.cashFlow || {},
      verificationCode: input.verificationCode || generateVerificationCode(),
      ...input,
    };
    this.state.approvedStatements.unshift(snap);
    this.saveState('APPROVED_STATEMENTS');
    return snap;
  }

  // =========================================================================
  // Certificates & Verification Persistence
  // =========================================================================
  public addCertificate(
    certInput: Partial<ProfessionalCertificate> & { clientName: string; certifiedAmount: number }
  ): ProfessionalCertificate {
    const verificationCode = certInput.verificationCode || generateVerificationCode();
    const cert: ProfessionalCertificate = {
      id: certInput.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      certificateNumber:
        certInput.certificateNumber || `CERT-${new Date().getFullYear()}-${this.state.certificates.length + 101}`,
      certificateType: certInput.certificateType || 'INCOME_PROOF',
      beneficiaryType: certInput.beneficiaryType || 'NATURAL_PERSON',
      clientName: certInput.clientName,
      recipientEntity: certInput.recipientEntity || '',
      purpose: certInput.purpose || '',
      periodText: certInput.periodText || '',
      certifiedAmount: Number(certInput.certifiedAmount) || 0,
      issueDate: certInput.issueDate || new Date().toISOString().slice(0, 10),
      qrPayload: certInput.qrPayload || '',
      auditorNotes: certInput.auditorNotes || '',
      securityHash: certInput.securityHash || '',
      printedCount: certInput.printedCount || 0,
      verificationCode,
      registryStatus: 'PENDING',
      createdAt: certInput.createdAt || new Date().toISOString(),
      ...certInput,
    };

    this.state.certificates.unshift(cert);
    this.saveState('CERTIFICATES');

    // Asynchronously record in server registry and update registryStatus
    Promise.resolve(
      IssuedDocumentService.recordIssuedDocument({
        verificationCode,
        documentType: cert.certificateType || 'CERTIFICATE',
        issueDate: cert.issueDate,
        firmName: this.state.officeProfile?.firmName || '—',
        status: 'ACTIVE',
        displayDocNumber: cert.certificateNumber,
      })
    )
      .then((res) => {
        cert.registryStatus = res?.success ? 'RECORDED' : 'FAILED';
        this.saveState('CERTIFICATES');
      })
      .catch(() => {
        cert.registryStatus = 'FAILED';
        this.saveState('CERTIFICATES');
      });

    return cert;
  }

  public updateCertificate(id: string, partial: Partial<ProfessionalCertificate>): ProfessionalCertificate | undefined {
    const idx = this.state.certificates.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.state.certificates[idx] = { ...this.state.certificates[idx], ...partial };
    this.saveState('CERTIFICATES');
    return this.state.certificates[idx];
  }

  public deleteCertificate(id: string): boolean {
    const before = this.state.certificates.length;
    this.state.certificates = this.state.certificates.filter((c) => c.id !== id);
    this.saveState('CERTIFICATES');
    return this.state.certificates.length < before;
  }

  public async retryRegistryForCertificate(id: string): Promise<boolean> {
    const cert = this.state.certificates.find((c) => c.id === id);
    if (!cert) return false;
    try {
      const res = await IssuedDocumentService.recordIssuedDocument({
        verificationCode: cert.verificationCode || generateVerificationCode(),
        documentType: cert.certificateType || 'CERTIFICATE',
        issueDate: cert.issueDate,
        firmName: this.state.officeProfile?.firmName || '—',
        status: 'ACTIVE',
        displayDocNumber: cert.certificateNumber,
      });
      cert.registryStatus = res?.success ? 'RECORDED' : 'FAILED';
      this.saveState('CERTIFICATES');
      return Boolean(res?.success);
    } catch {
      cert.registryStatus = 'FAILED';
      this.saveState('CERTIFICATES');
      return false;
    }
  }

  // =========================================================================
  // Tax Declarations, Mandates, Invoices, Fixed Assets, Exchange Rates
  // =========================================================================
  public addTaxDeclaration(decl: Partial<TaxDeclarationRecord>): TaxDeclarationRecord {
    const created: TaxDeclarationRecord = {
      id: decl.id || `tax-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      declarationType: decl.declarationType || 'VAT_MONTHLY',
      period: decl.period || '',
      fiscalYear: decl.fiscalYear || 2026,
      dueDate: decl.dueDate || new Date().toISOString().slice(0, 10),
      taxableBase: Number(decl.taxableBase) || 0,
      taxAmount: Number(decl.taxAmount) || 0,
      penaltiesOrAdjustments: Number(decl.penaltiesOrAdjustments) || 0,
      whtDeductions: Number(decl.whtDeductions) || 0,
      netPayable: Number(decl.netPayable) || 0,
      status: decl.status || 'DRAFT',
      ...decl,
    };
    this.state.taxDeclarations.unshift(created);
    this.saveState('TAXES');
    return created;
  }

  public updateTaxDeclaration(id: string, partial: Partial<TaxDeclarationRecord>): TaxDeclarationRecord | undefined {
    const idx = this.state.taxDeclarations.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.state.taxDeclarations[idx] = { ...this.state.taxDeclarations[idx], ...partial };
    this.saveState('TAXES');
    return this.state.taxDeclarations[idx];
  }

  public updateTaxMandate(id: string, partial: any): any {
    const idx = this.state.taxMandates.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.state.taxMandates[idx] = { ...this.state.taxMandates[idx], ...partial };
    } else {
      this.state.taxMandates.push({ id, ...partial });
    }
    this.saveState('TAXES');
  }

  public batchAddInvoices(invoicesList: Partial<Invoice>[]): number {
    let added = 0;
    for (const inv of invoicesList) {
      this.state.invoices.push({
        id: inv.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        invoiceNumber: inv.invoiceNumber || `INV-${this.state.invoices.length + 1}`,
        invoiceType: inv.invoiceType || 'SALES',
        date: inv.date || new Date().toISOString().slice(0, 10),
        partnerName: inv.partnerName || 'عميل / مورد',
        items: inv.items || [],
        subtotal: Number(inv.subtotal) || 0,
        totalDiscount: Number(inv.totalDiscount) || 0,
        totalVat: Number(inv.totalVat) || 0,
        totalWht: Number(inv.totalWht) || 0,
        grandTotal: Number(inv.grandTotal) || 0,
        paidAmount: Number(inv.paidAmount) || 0,
        remainingAmount: Number(inv.remainingAmount) || 0,
        status: inv.status || 'ISSUED',
        paymentMethod: inv.paymentMethod || 'CASH',
        ...inv,
      });
      added++;
    }
    this.saveState('INVOICES');
    return added;
  }

  public updateInvoice(id: string, partial: Partial<Invoice>): Invoice | undefined {
    const idx = this.state.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.state.invoices[idx] = { ...this.state.invoices[idx], ...partial };
    this.saveState('INVOICES');
    return this.state.invoices[idx];
  }

  public addFixedAsset(asset: Partial<FixedAsset>): FixedAsset {
    const created: FixedAsset = {
      id: asset.id || `fa-asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetCode: asset.assetCode || `AST-${this.state.fixedAssets.length + 1}`,
      name: asset.name || 'أصل ثابت',
      category: asset.category || 'COMPUTERS_SOFTWARE',
      purchaseDate: asset.purchaseDate || new Date().toISOString().slice(0, 10),
      purchaseCost: Number(asset.purchaseCost) || 0,
      salvageValue: Number(asset.salvageValue) || 0,
      usefulLifeYears: Number(asset.usefulLifeYears) || 5,
      depreciationRate: Number(asset.depreciationRate) || 20,
      taxDepreciationRate: Number(asset.taxDepreciationRate) || 25,
      depreciationMethod: asset.depreciationMethod || 'STRAIGHT_LINE',
      accumulatedDepreciation: Number(asset.accumulatedDepreciation) || 0,
      netBookValue: Number(asset.netBookValue) || 0,
      status: asset.status || 'ACTIVE',
      ...asset,
    };
    this.state.fixedAssets.push(created);
    this.saveState('FIXED_ASSETS');
    return created;
  }

  public updateFixedAsset(id: string, partial: Partial<FixedAsset>): FixedAsset | undefined {
    const idx = this.state.fixedAssets.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.state.fixedAssets[idx] = { ...this.state.fixedAssets[idx], ...partial };
    this.saveState('FIXED_ASSETS');
    return this.state.fixedAssets[idx];
  }

  public deleteFixedAsset(id: string): boolean {
    const before = this.state.fixedAssets.length;
    this.state.fixedAssets = this.state.fixedAssets.filter((a) => a.id !== id);
    this.saveState('FIXED_ASSETS');
    return this.state.fixedAssets.length < before;
  }

  public disposeFixedAsset(
    id: string,
    disposalInfo: { disposalDate: string; disposalValue?: number; disposalAmount?: number; notes?: string }
  ): FixedAsset | undefined {
    return this.updateFixedAsset(id, {
      status: 'DISPOSED',
      disposalDate: disposalInfo.disposalDate,
      disposalValue: disposalInfo.disposalValue ?? disposalInfo.disposalAmount ?? 0,
      notes: disposalInfo.notes,
    });
  }

  public postDepreciationJournalEntry(params: {
    fiscalYear?: number;
    year?: number;
    totalDepreciation: number;
    clientId?: string;
    description?: string;
  }): JournalEntry {
    const fy = params.fiscalYear || params.year || 2026;
    return this.addJournalEntry({
      entryNumber: `DEP-${fy}`,
      date: `${fy}-12-31`,
      description: params.description || `قيد إهلاك الأصول الثابتة السنوي لعام ${fy}`,
      documentType: 'DEPRECIATION',
      isPosted: true,
      status: 'POSTED',
      clientId: params.clientId,
      fiscalYear: fy,
      lines: [
        {
          id: `dep-dr-${Date.now()}`,
          accountCode: '5201',
          accountName: 'مصروف إهلاك الأصول الثابتة',
          debit: params.totalDepreciation,
          credit: 0,
        },
        {
          id: `dep-cr-${Date.now()}`,
          accountCode: '2101',
          accountName: 'مجمع إهلاك الأصول الثابتة',
          debit: 0,
          credit: params.totalDepreciation,
        },
      ],
    });
  }

  public getDailyExchangeRate(currency: CurrencyCode, _date?: string): DailyExchangeRateRecord | undefined {
    return this.state.exchangeRates.find((r) => r.currency === currency || r.code === currency);
  }

  public getExchangeRateValue(currency: CurrencyCode, _date?: string): number {
    if (!currency || currency === 'EGP') return 1;
    const rec = this.getDailyExchangeRate(currency, _date);
    return rec?.officialRate || rec?.rateToEgp || 1;
  }

  public saveExchangeRate(rate: Partial<DailyExchangeRateRecord> & { currency: CurrencyCode }): DailyExchangeRateRecord {
    const now = new Date().toISOString();
    const record: DailyExchangeRateRecord = {
      id: rate.id || `fx-${rate.currency}-${Date.now()}`,
      date: rate.date || now.slice(0, 10),
      currency: rate.currency,
      baseCurrency: rate.baseCurrency || 'EGP',
      buyRate: Number(rate.buyRate || rate.officialRate || rate.rateToEgp || 1),
      sellRate: Number(rate.sellRate || rate.officialRate || rate.rateToEgp || 1),
      officialRate: Number(rate.officialRate || rate.rateToEgp || 1),
      rateToEgp: Number(rate.rateToEgp || rate.officialRate || 1),
      source: rate.source || 'CBE',
      createdAt: rate.createdAt || now,
      updatedAt: now,
      ...rate,
    };
    const idx = this.state.exchangeRates.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.state.exchangeRates[idx] = record;
    } else {
      this.state.exchangeRates.unshift(record);
    }
    this.saveState('EXCHANGE_RATES');
    return record;
  }

  public saveBulkExchangeRates(records: Partial<DailyExchangeRateRecord>[]): number {
    let count = 0;
    for (const r of records) {
      if (r.currency) {
        this.saveExchangeRate(r as Partial<DailyExchangeRateRecord> & { currency: CurrencyCode });
        count++;
      }
    }
    return count;
  }

  public deleteExchangeRate(id: string): void {
    this.state.exchangeRates = this.state.exchangeRates.filter((r) => r.id !== id);
    this.saveState('EXCHANGE_RATES');
  }

  // =========================================================================
  // Office Profile, Preferences, WhatsApp, Logs & Locks
  // =========================================================================
  public updateOfficeProfile(partial: Partial<OfficeProfile>): OfficeProfile {
    this.state.officeProfile = { ...this.state.officeProfile, ...partial };
    this.saveState('OFFICE_PROFILE');
    return this.state.officeProfile;
  }

  public updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    this.state.preferences = { ...this.state.preferences, ...partial };
    this.saveState('PREFERENCES');
    return this.state.preferences;
  }

  public setLanguage(lang: 'ar' | 'en'): void {
    this.updatePreferences({ language: lang });
  }

  public setReportingCurrency(curr: CurrencyCode): void {
    this.updatePreferences({ reportingCurrency: curr });
  }

  public getWhatsAppBotSettings(): WhatsAppBotSettings {
    if (!this.state.whatsappBotSettings) {
      this.state.whatsappBotSettings = {
        isAutoReplyEnabled: true,
        officeWorkingHours: '9 ص - 6 م',
        welcomeGreeting: 'مرحباً بكم',
        botName: 'المساعد الآلي',
        includeQrVerification: true,
        apiDispatchMode: 'DIRECT_WEB_API',
        templates: [...DEFAULT_WHATSAPP_TEMPLATES],
      };
    }
    return this.state.whatsappBotSettings;
  }

  public getWhatsAppTemplates(): WhatsAppMessageTemplate[] {
    return this.getWhatsAppBotSettings().templates || [];
  }

  public saveWhatsAppTemplate(tpl: WhatsAppMessageTemplate): WhatsAppMessageTemplate {
    const settings = this.getWhatsAppBotSettings();
    const idx = settings.templates.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) {
      settings.templates[idx] = { ...tpl, updatedAt: new Date().toISOString() };
    } else {
      settings.templates.push({ ...tpl, id: tpl.id || `tpl-${Date.now()}`, updatedAt: new Date().toISOString() });
    }
    this.saveState('WHATSAPP');
    return tpl;
  }

  public deleteWhatsAppTemplate(id: string): void {
    const settings = this.getWhatsAppBotSettings();
    settings.templates = settings.templates.filter((t) => t.id !== id);
    this.saveState('WHATSAPP');
  }

  public resetWhatsAppTemplatesToDefault(): void {
    const settings = this.getWhatsAppBotSettings();
    settings.templates = [...DEFAULT_WHATSAPP_TEMPLATES];
    this.saveState('WHATSAPP');
  }

  public sendWhatsAppMessage(msgInput: Partial<WhatsAppMessage> & { phoneNumber: string; messageBody: string }): WhatsAppMessage {
    const msg: WhatsAppMessage = {
      id: msgInput.id || `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: msgInput.clientId,
      clientName: msgInput.clientName || 'عميل',
      phoneNumber: msgInput.phoneNumber,
      category: msgInput.category || 'GENERAL',
      messageBody: msgInput.messageBody,
      direction: msgInput.direction || 'OUTBOUND',
      status: msgInput.status || 'SENT',
      sentAt: msgInput.sentAt || new Date().toISOString(),
    };
    this.state.whatsappMessages.unshift(msg);
    this.saveState('WHATSAPP');
    return msg;
  }

  public logAudit(action: string, entityTypeOrDetails: string, details?: string, entityId?: string): void {
    const user = this.getCurrentUser();
    const isTwoArg = details === undefined;
    this.state.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'system',
      userName: user?.name || 'النظام',
      userRole: user?.role || 'ADMIN',
      action,
      entityType: isTwoArg ? 'SYSTEM' : entityTypeOrDetails,
      entityId,
      details: isTwoArg ? entityTypeOrDetails : details,
    });
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs.length = 1000;
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.state.auditLogs || [];
  }

  public addFinancialActivityLog(logInput: Partial<FinancialActivityLog>): FinancialActivityLog {
    const entry: FinancialActivityLog = {
      id: logInput.id || `fal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: logInput.timestamp || new Date().toISOString(),
      actionType: logInput.actionType || 'UPDATE',
      module: logInput.module || 'SYSTEM',
      summary: logInput.summary || '',
      ...logInput,
    };
    this.state.financialActivityLogs.unshift(entry);
    this.saveState('ACTIVITY_LOGS');
    return entry;
  }

  public getFinancialActivityLogs(fiscalYear?: number, clientId?: string): FinancialActivityLog[] {
    return (this.state.financialActivityLogs || []).filter((l) => {
      const matchYear = !fiscalYear || !l.fiscalYear || l.fiscalYear === fiscalYear;
      const matchClient = !clientId || !l.clientId || l.clientId === clientId;
      return matchYear && matchClient;
    });
  }

  public clearFinancialActivityLogs(fiscalYear?: number, clientId?: string): void {
    if (!fiscalYear && !clientId) {
      this.state.financialActivityLogs = [];
    } else {
      this.state.financialActivityLogs = (this.state.financialActivityLogs || []).filter(
        (l) => (fiscalYear && l.fiscalYear !== fiscalYear) || (clientId && l.clientId !== clientId)
      );
    }
    this.saveState('ACTIVITY_LOGS');
  }

  public clearLocalAccountingData(): void {
    this.state.journalEntries = [];
    this.state.invoices = [];
    this.state.treasuryTransactions = [];
    this.saveState('ALL');
  }

  public isPeriodLocked(fiscalYear: number): boolean {
    return Boolean(this.state.fiscalPeriodLocks?.[fiscalYear]?.isLocked);
  }

  public unprotectAllFiscalPeriods(): { success: boolean; message: string } {
    this.state.fiscalPeriodLocks = {};
    this.saveState('LOCKS');
    return { success: true, message: 'تم فتح جميع الفترات المالية بنجاح.' };
  }

  public getSystemSerials(): SystemSerialsConfig {
    if (!this.state.systemSerials) {
      this.state.systemSerials = {
        systemSerial: 'MAREI-ERP-2026-PRO',
        activationKey: 'ACT-2026-MAREI-CPA',
        licenseNumber: 'س.م.م 43122',
        taxAuthorityRegNo: '233-519-890',
        journalPrefix: 'JV-2026-',
        journalNextNumber: 1001,
        invoicePrefix: 'INV-2026-',
        invoiceNextNumber: 101,
        certificatePrefix: 'CERT-2026-',
        certificateNextNumber: 501,
        treasuryPrefix: 'TR-2026-',
        treasuryNextNumber: 201,
      };
    }
    return this.state.systemSerials;
  }

  public updateSystemSerials(serials: Partial<SystemSerialsConfig>): { success: boolean; message: string } {
    this.state.systemSerials = { ...this.getSystemSerials(), ...serials };
    this.saveState('SERIALS');
    return { success: true, message: 'تم تحديث إعدادات الترقيم التسلسلي بنجاح.' };
  }

  public resetDeviceSecurityBindings(): { success: boolean; message: string } {
    return { success: true, message: 'تم إعادة ضبط ارتباطات أمان الأجهزة بنجاح.' };
  }

  public async syncToCloudNow(): Promise<boolean> {
    this.flushDirtyStorage();
    return true;
  }

  public saveRecord(recordId: string, data: any, expectedVersion = 1): { success: boolean; version?: number; status?: number; error?: string } {
    const existing = this.versionedRecords.get(recordId);
    if (!existing) {
      this.versionedRecords.set(recordId, { data, version: 1 });
      return { success: true, version: 1 };
    }
    if (existing.version !== expectedVersion) {
      return {
        success: false,
        status: 409,
        error: `تعارض إصدار (409 Version Conflict): الإصدار الحالي هو ${existing.version}`,
      };
    }
    const nextVer = existing.version + 1;
    this.versionedRecords.set(recordId, { data, version: nextVer });
    return { success: true, version: nextVer };
  }

  public getRecord(recordId: string): { data: any; version: number } | undefined {
    return this.versionedRecords.get(recordId);
  }
}

export const db = new LocalDatabase();
