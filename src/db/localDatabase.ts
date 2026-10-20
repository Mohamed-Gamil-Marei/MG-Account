import {
  Account,
  AccountMappingFieldKey,
  ApprovedStatementsSnapshot,
  ClientAccountMapping,
  ClientActivityTemplate,
  ClientArchiveRecord,
  ClientDocument,
  ClientDocumentFolder,
  ClientFeeAgreement,
  ClientFeeCollection,
  ClientOpeningBalanceRecord,
  ClientProcedureTask,
  ClientStatementMapping,
  CurrencyCode,
  CustomsShipment,
  DailyExchangeRateRecord,
  FeasibilityStudy,
  FinancialActivityLog,
  FinancialStatementLineKey,
  FixedAsset,
  Invoice,
  InvoiceType,
  JournalEntry,
  JournalEntryLine,
  NestedOpeningBalancesMap,
  OfficeProfile,
  OfficeTreasuryTransaction,
  OpenItem,
  OpeningBalanceEntry,
  ProfessionalCertificate,
  SystemUser,
  TaxDeclarationRecord,
  UserPreferences,
  WhatsAppBotSettings,
  WhatsAppMessage,
  WhatsAppMessageTemplate,
  SystemKind,
  SystemRegistrationStatus,
  ClientSystemCredentials,
  ClientSystemRegistration,
  ClientSystemAction,
  SystemPortalUrlsConfig,
  DEFAULT_SYSTEM_PORTAL_URLS,
  ManagerAdjustmentLayer,
  ManagerStatementAdjustment,
  StatementAdjustmentPeriod,
  StatementModel,
  StatementNoteRecord,
  StatementVersionDiffItem,
} from '../types';
import { FirebaseUserProfile } from '../services/firebaseAuthService';
import { IssuedDocumentService } from '../services/issuedDocumentService';
import { generateVerificationCode } from '../utils/verificationCode';
import { buildFinancialStatementsQrText } from '../utils/qrCodeGenerator';
import { computeSingleClientFeeSummary } from '../utils/clientFees';
import { getCairoCurrentYear, getCairoDateString, getCairoTimestamp } from '../utils/cairoTime';
import {
  AccountingCalculator,
  TrialBalanceSummary,
  TrialBalanceRow,
  GeneratedFinancialStatements,
  GeneralLedgerSummary,
  computeFiscalYearBoundsByStartMonth,
  STATEMENT_LINE_LABELS_AR,
} from '../services/AccountingCalculator';
import {
  decryptBackupData,
  encryptBackupData,
  sanitizeStateForBackup,
  EncryptedBackupPackage,
} from '../utils/backupEncryption';
import { migrateClientTaxSubjectFlagsOnce } from '../config/screenScope';
import {
  assertCan as guardAssertCan,
  canPerform as guardCanPerform,
  PermissionError,
  PeriodLockError,
  StorageWriteError,
  registerAccessGuardResolvers,
  AccessGuardAction,
  AccessGuardContext,
} from '../services/accessGuard';

export {
  PermissionError,
  PeriodLockError,
  StorageWriteError,
  guardAssertCan as assertCan,
  guardCanPerform as canPerform,
};
export type { AccessGuardAction, AccessGuardContext };

if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage === 'undefined') {
  const memoryStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    clear: () => {
      memoryStore.clear();
    },
    key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    get length() {
      return memoryStore.size;
    },
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  clientId?: string;
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
  details: string;
  prevHash: string;
  hash: string;
}

export interface AuditChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  brokenAtIndex?: number;
  brokenEntryId?: string;
  message: string;
}

export interface FiscalPeriodLockRecord {
  clientId: string;
  fiscalYear: number;
  periodKey?: string;
  level?: 'SUB_PERIOD' | 'ANNUAL';
  scope?: 'YEAR' | 'MONTH' | 'QUARTER';
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  reason?: string;
}

export type PermissionAction = AccessGuardAction;

export type PermissionContext = AccessGuardContext;

/**
 * Pure TypeScript synchronous SHA-256 (FIPS 180-4) implementation for tamper-evident audit hash chains
 */
export function computeSha256Hex(message: string): string {
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const rotr = (n: number, x: number): number => (x >>> n) | (x << (32 - n));
  const utf8Bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let code = message.charCodeAt(i);
    if (code < 0x80) {
      utf8Bytes.push(code);
    } else if (code < 0x800) {
      utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bitLen = utf8Bytes.length * 8;
  utf8Bytes.push(0x80);
  while ((utf8Bytes.length % 64) !== 56) {
    utf8Bytes.push(0);
  }

  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  for (let i = 3; i >= 0; i--) utf8Bytes.push((highBits >>> (i * 8)) & 0xff);
  for (let i = 3; i >= 0; i--) utf8Bytes.push((lowBits >>> (i * 8)) & 0xff);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const W = new Array<number>(64);

  for (let offset = 0; offset < utf8Bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      W[i] =
        ((utf8Bytes[j] << 24) |
          (utf8Bytes[j + 1] << 16) |
          (utf8Bytes[j + 2] << 8) |
          utf8Bytes[j + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10)) >>> 0;
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

export function computeAuditEntryHash(
  entry: Omit<AuditLogEntry, 'hash' | 'prevHash'>,
  prevHash: string
): string {
  const canonicalPayload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    userId: entry.userId,
    userName: entry.userName,
    userRole: entry.userRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    clientId: entry.clientId ?? null,
    beforeValue: entry.beforeValue ?? null,
    afterValue: entry.afterValue ?? null,
    reason: entry.reason ?? null,
    details: entry.details,
  });
  return computeSha256Hex(`${canonicalPayload}|${prevHash}`);
}

export interface ActiveClientContext {
  clientId: string | null;
  clientName?: string;
  companyName?: string;
  clientCode?: string;
  selectedFiscalYear: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  activityTemplate?: ClientActivityTemplate;
  autoFilterEnabled: boolean;
  autoFilterAccountingData?: boolean;
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
  clientYearJournalCounters?: Record<string, number>;
  clientYearInvoiceCounters?: Record<string, number>;
}

export interface UnmatchedFeeMigrationItem {
  treasuryTransactionId: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  date: string;
  reason: string;
}

export interface OpeningBalanceRolloverMetadata {
  clientId: string;
  fromYear: number;
  toYear: number;
  rolledOverAt: string;
  rolledOverBy: string;
  postRolloverModifiedAt?: string;
  postRolloverModifiedBy?: string;
  postRolloverWarning?: string;
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
  fiscalPeriodLocks: Record<string, FiscalPeriodLockRecord>;
  activeClientContext: ActiveClientContext;
  closingChecklists: Record<string, any[]>;
  clientDeadlines: any[];
  openItems: OpenItem[];
  approvedStatements: ApprovedStatementsSnapshot[];
  managerAdjustmentLayers?: Record<string, ManagerAdjustmentLayer>;
  statementNotes?: Record<
    string,
    Record<
      string,
      {
        manualParagraph?: string;
        customTitle?: string;
        baselineNumbers?: Record<string, number>;
        lastConfirmedAt?: string;
        lastConfirmedBy?: string;
        updatedAt?: string;
        updatedBy?: string;
      }
    >
  >;
  openingBalanceRollovers?: Record<string, OpeningBalanceRolloverMetadata>;
  feeAgreements: ClientFeeAgreement[];
  feeCollections: ClientFeeCollection[];
  openingBalances: NestedOpeningBalancesMap;
  clientOpeningBalances?: ClientOpeningBalanceRecord[];
  accountMappings?: Record<string, ClientAccountMapping>;
  statementMappings?: Record<string, ClientStatementMapping>;
  feeMigrationUnmatchedReport?: UnmatchedFeeMigrationItem[];
  systemSerials?: SystemSerialsConfig;
  taxSubjectMigrationDone?: boolean;
  migrationDone?: boolean;
  lastTaxSubjectMigrationCount?: number;
  taxSubjectMigrationNotificationPending?: boolean;
  clientSystemRegistrations: ClientSystemRegistration[];
  clientSystemActions: ClientSystemAction[];
  systemRegistrationsMigrationDone?: boolean;
  systemPortalUrls?: Partial<SystemPortalUrlsConfig>;
}

export function createDefaultClientAccountMapping(clientId: string): ClientAccountMapping {
  return {
    clientId,
    cashAccountCode: '1101',
    receivablesAccountCode: '1103',
    payablesAccountCode: '2101',
    salesAccountCode: '4101',
    officeServiceRevenueAccountCode: '4120',
    purchasesAccountCode: '5101',
    salesReturnsAccountCode: '4102',
    purchaseReturnsAccountCode: '5102',
    vatOutputAccountCode: '2104',
    vatInputAccountCode: '1105',
    whtReceivableAccountCode: '1106',
    whtPayableAccountCode: '2105',
    tableTaxAccountCode: '2106',
    fxGainAccountCode: '4201',
    fxLossAccountCode: '5301',
    updatedAt: getCairoTimestamp(),
    updatedBy: 'system',
  };
}

export function createDefaultClientStatementMapping(clientId: string): ClientStatementMapping {
  return {
    // Current Assets (النقدية والأصول المتداولة)
    '1101': 'BS_CASH_EQUIVALENTS',
    '1102': 'BS_CASH_EQUIVALENTS',
    '1250': 'BS_CASH_EQUIVALENTS',
    '1103': 'BS_TRADE_RECEIVABLES',
    '1220': 'BS_TRADE_RECEIVABLES',
    '1301': 'BS_INVENTORY',
    '1310': 'BS_INVENTORY',
    '1320': 'BS_INVENTORY',
    '1330': 'BS_INVENTORY',
    '1105': 'BS_OTHER_CURRENT_ASSETS',
    '1106': 'BS_OTHER_CURRENT_ASSETS',
    '1230': 'BS_OTHER_CURRENT_ASSETS',
    // Non-Current Assets (الأصول غير المتداولة والثابتة)
    '1201': 'BS_FIXED_ASSETS',
    '1202': 'BS_PROJECTS_UNDER_WAY',
    '1203': 'BS_INTANGIBLE_ASSETS',
    '1204': 'BS_OTHER_NON_CURRENT_ASSETS',
    '2102': 'BS_FIXED_ASSETS', // Accumulated Depreciation offsets Fixed Assets
    // Current Liabilities (الالتزامات المتداولة)
    '2101': 'BS_TRADE_PAYABLES',
    '2110': 'BS_TRADE_PAYABLES',
    '2104': 'BS_TAX_AUTHORITY_PAYABLES',
    '2105': 'BS_TAX_AUTHORITY_PAYABLES',
    '2106': 'BS_TAX_AUTHORITY_PAYABLES',
    '2230': 'BS_TAX_AUTHORITY_PAYABLES',
    '2103': 'BS_OTHER_CURRENT_LIABILITIES',
    '2120': 'BS_OTHER_CURRENT_LIABILITIES',
    // Non-Current Liabilities (الالتزامات غير المتداولة)
    '2201': 'BS_LONG_TERM_LOANS',
    '2202': 'BS_OTHER_NON_CURRENT_LIABILITIES',
    // Equity (حقوق الملكية)
    '3101': 'BS_PAID_UP_CAPITAL',
    '3102': 'BS_RETAINED_EARNINGS',
    '3103': 'BS_RESERVES',
    '3999': 'BS_RETAINED_EARNINGS',
    // Income Statement: Revenues (الإيرادات)
    '4101': 'IS_OPERATING_REVENUE',
    '4110': 'IS_OPERATING_REVENUE',
    '4120': 'IS_OPERATING_REVENUE',
    '4102': 'IS_SALES_RETURNS_ALLOWANCES',
    '4201': 'IS_FX_GAINS_LOSSES',
    '4202': 'IS_OTHER_REVENUES',
    // Income Statement: Expenses & COGS (التكاليف والمصروفات)
    '5101': 'IS_COGS',
    '5102': 'IS_COGS', // Purchase Returns offset COGS
    '5201': 'IS_GENERAL_ADMIN',
    '5202': 'IS_SELLING_DISTRIBUTION',
    '5203': 'IS_DEPRECIATION',
    '5204': 'IS_FINANCING_COSTS',
    '5301': 'IS_FX_GAINS_LOSSES',
    '5302': 'IS_OTHER_EXPENSES',
  };
}

const STORAGE_PREFIX = 'mg_cpa_db_v3_';
const FULL_STATE_KEY = 'mg_cpa_full_state_v3';

export interface ClientFiscalYearBounds {
  fiscalYear: number;
  startDate: string;
  endDate: string;
  start: string;
  end: string;
  labelAr: string;
}

export function inferActivityTemplateFromText(text?: string): ClientActivityTemplate {
  const s = (text || '').trim();
  if (/صناع|مصنع|إنتاج|توريد.*هندس/i.test(s)) return 'INDUSTRIAL';
  if (/مقاول|إنشاء|تشييد|مبان/i.test(s)) return 'CONTRACTING';
  if (/خدم|استشار|برمج|طب|مكتب/i.test(s)) return 'SERVICE';
  return 'COMMERCIAL';
}

const ARABIC_MONTH_NAMES: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

export function formatFiscalDateArabic(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  if (!m) return dateStr;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const monthName = ARABIC_MONTH_NAMES[month] || m[2];
  return `${day} ${monthName} ${year}`;
}

export function computeClientFiscalYearBounds(
  clientOrYear: Partial<ClientArchiveRecord> | number | null | undefined,
  targetFiscalYearOrEndMonth?: number,
  explicitStart?: string,
  explicitEnd?: string
): ClientFiscalYearBounds {
  const isNumberFirst = typeof clientOrYear === 'number';
  const client = isNumberFirst ? null : clientOrYear;
  const baseYear = isNumberFirst
    ? clientOrYear || getCairoCurrentYear()
    : targetFiscalYearOrEndMonth ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();

  const hasExplicitBounds = Boolean(explicitStart && explicitEnd);
  const rawStart =
    explicitStart ||
    (client as any)?.fiscalYearStartDate ||
    (client as any)?.fiscalYearStart ||
    '';
  const rawEnd =
    explicitEnd ||
    (client as any)?.fiscalYearEndDate ||
    (client as any)?.fiscalYearEnd ||
    '';
  const clientStartMonth =
    client && typeof (client as any).fiscalYearStartMonth === 'number'
      ? Number((client as any).fiscalYearStartMonth)
      : undefined;
  const clientEndMonth =
    client && typeof client.fiscalYearEndMonth === 'number'
      ? Number(client.fiscalYearEndMonth)
      : undefined;
  const hasCustomFiscalMonth =
    (clientStartMonth !== undefined && clientStartMonth >= 1 && clientStartMonth <= 12 && clientStartMonth !== 1) ||
    (clientEndMonth !== undefined && clientEndMonth >= 1 && clientEndMonth <= 12 && clientEndMonth !== 12);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(rawStart) &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) &&
    (hasExplicitBounds || !hasCustomFiscalMonth || !rawStart.endsWith('-01-01'))
  ) {
    const startYearParsed = parseInt(rawStart.slice(0, 4), 10);
    const endYearParsed = parseInt(rawEnd.slice(0, 4), 10);
    const yearSpan = Math.max(0, endYearParsed - startYearParsed);
    const startMonthDay = rawStart.slice(5);
    const endMonthDay = rawEnd.slice(5);
    const computedEndYear = baseYear;
    const computedStartYear = computedEndYear - yearSpan;
    const startDate = `${computedStartYear}-${startMonthDay}`;
    const endDate = `${computedEndYear}-${endMonthDay}`;
    return {
      fiscalYear: baseYear,
      startDate,
      endDate,
      start: startDate,
      end: endDate,
      labelAr: formatFiscalDateArabic(endDate),
    };
  }

  let resolvedStartMonth = 1;
  if (clientStartMonth !== undefined && clientStartMonth >= 1 && clientStartMonth <= 12) {
    resolvedStartMonth = clientStartMonth;
  } else if (clientEndMonth !== undefined && clientEndMonth >= 1 && clientEndMonth <= 12) {
    resolvedStartMonth = clientEndMonth === 12 ? 1 : clientEndMonth + 1;
  } else if (rawStart) {
    const startMatch = /^(?:\d{4}-)?(\d{2})-\d{2}$/.exec(rawStart);
    if (startMatch) {
      const sm = parseInt(startMatch[1], 10);
      if (sm >= 1 && sm <= 12) resolvedStartMonth = sm;
    }
  } else {
    const rawEndMonth = isNumberFirst ? targetFiscalYearOrEndMonth : client?.fiscalYearEndMonth;
    const endMonth = rawEndMonth && rawEndMonth >= 1 && rawEndMonth <= 12 ? rawEndMonth : 12;
    resolvedStartMonth = endMonth === 12 ? 1 : endMonth + 1;
  }

  const computedBounds = computeFiscalYearBoundsByStartMonth(baseYear, resolvedStartMonth);
  return {
    fiscalYear: baseYear,
    startDate: computedBounds.startDate,
    endDate: computedBounds.endDate,
    start: computedBounds.startDate,
    end: computedBounds.endDate,
    labelAr: formatFiscalDateArabic(computedBounds.endDate),
  };
}

/**
 * Standard Egyptian Chart of Accounts Template.
 * Requirement 1 & 3: All template accounts start with ZERO opening balances (0 debit, 0 credit),
 * are scoped to clientId, and support activity templates: COMMERCIAL, INDUSTRIAL, SERVICE, CONTRACTING.
 */
export function getStandardEgyptianChartOfAccounts(
  clientId = 'client-1',
  activityTemplate: ClientActivityTemplate = 'COMMERCIAL'
): Account[] {
  const baseAccounts: Omit<Account, 'clientId'>[] = [
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
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
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
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
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
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
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
      openingBalanceCredit: 0,
      currentBalance: 0,
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
      parentId: 'acc-2000',
      parentCode: '2000',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
    },
    {
      id: 'acc-3102',
      code: '3102',
      name: 'الأرباح المحتجزة / المرحلة من سنوات سابقة',
      nameEn: 'Retained Earnings',
      category: 'EQUITY',
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
      id: 'acc-3999',
      code: '3999',
      name: 'ملخص الدخل (حساب الأرباح والخسائر الختامي)',
      nameEn: 'Income Summary',
      category: 'EQUITY',
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
      id: 'acc-2102',
      code: '2102',
      name: 'مجمع إهلاك الأصول الثابتة',
      nameEn: 'Accumulated Depreciation',
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
      id: 'acc-2106',
      code: '2106',
      name: 'مصلحة الضرائب - ضريبة الجدول',
      nameEn: 'Schedule / Table Tax Payable',
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
      id: 'acc-4102',
      code: '4102',
      name: 'مردودات ومسموحات المبيعات',
      nameEn: 'Sales Returns & Allowances',
      category: 'REVENUES',
      nature: 'DEBIT',
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
      id: 'acc-4120',
      code: '4120',
      name: 'إيرادات أتعاب المكتب والخدمات المهنية',
      nameEn: 'Office Professional Service Revenues',
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
      id: 'acc-4201',
      code: '4201',
      name: 'أرباح فروق تقييم العملات الأجنبية',
      nameEn: 'Foreign Exchange Gains',
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
      id: 'acc-5102',
      code: '5102',
      name: 'مردودات ومسموحات المشتريات',
      nameEn: 'Purchase Returns & Allowances',
      category: 'EXPENSES',
      nature: 'CREDIT',
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
    {
      id: 'acc-5301',
      code: '5301',
      name: 'خسائر فروق تقييم العملات الأجنبية',
      nameEn: 'Foreign Exchange Losses',
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

  const activityAccountsMap: Record<ClientActivityTemplate, Omit<Account, 'clientId'>[]> = {
    COMMERCIAL: [
      {
        id: 'acc-1301',
        code: '1301',
        name: 'مخزون البضاعة بغرض البيع (تجاري)',
        nameEn: 'Merchandise Inventory',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-4102',
        code: '4102',
        name: 'مردودات ومسموحات المبيعات التجارية',
        nameEn: 'Sales Returns & Allowances',
        category: 'REVENUES',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
    ],
    INDUSTRIAL: [
      {
        id: 'acc-1310',
        code: '1310',
        name: 'مخزون الخامات والمواد الأولية',
        nameEn: 'Raw Materials Inventory',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-1320',
        code: '1320',
        name: 'مخزون الإنتاج تحت التشغيل (WIP)',
        nameEn: 'Work in Process Inventory',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-1330',
        code: '1330',
        name: 'مخزون الإنتاج التام الصنع',
        nameEn: 'Finished Goods Inventory',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-5110',
        code: '5110',
        name: 'تكاليف التشغيل والتصنيع المباشرة',
        nameEn: 'Direct Manufacturing & Factory Costs',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
    ],
    SERVICE: [
      {
        id: 'acc-1140',
        code: '1140',
        name: 'إيرادات خدمات وأتعاب مستحقة التحصيل',
        nameEn: 'Accrued Service Revenue',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-4120',
        code: '4120',
        name: 'إيرادات الخدمات والاستشارات المهنية',
        nameEn: 'Professional & Service Revenues',
        category: 'REVENUES',
        nature: 'CREDIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-5120',
        code: '5120',
        name: 'تكلفة تأدية الخدمات المباشرة',
        nameEn: 'Direct Cost of Services',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
    ],
    CONTRACTING: [
      {
        id: 'acc-1340',
        code: '1340',
        name: 'أعمال مقاولات تحت التنفيذ (مستخلصات جارية)',
        nameEn: 'Construction in Progress (WIP)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-1150',
        code: '1150',
        name: 'تأمينات أعمال ومحتجزات ضمان لدى العملاء (Retentions)',
        nameEn: 'Contract Retentions Receivable',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        parentId: 'acc-1000',
        parentCode: '1000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-2140',
        code: '2140',
        name: 'دفعات مقدمة من العملاء عن عقود مقاولات',
        nameEn: 'Advances from Contracting Clients',
        category: 'LIABILITIES',
        nature: 'CREDIT',
        level: 4,
        parentId: 'acc-2000',
        parentCode: '2000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-2150',
        code: '2150',
        name: 'مقاولو الباطن ومستحقاتهم ومحتجزات الضمان',
        nameEn: 'Subcontractors Payable & Retentions',
        category: 'LIABILITIES',
        nature: 'CREDIT',
        level: 4,
        parentId: 'acc-2000',
        parentCode: '2000',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-4130',
        code: '4130',
        name: 'إيرادات المستخلصات وعقود المقاولات المعتمدة',
        nameEn: 'Contracting & Progress Billing Revenues',
        category: 'REVENUES',
        nature: 'CREDIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
      {
        id: 'acc-5130',
        code: '5130',
        name: 'تكاليف تنفيذ عقود المقاولات (مواد وعمالة ومعدات)',
        nameEn: 'Contracting Execution Costs',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
      },
    ],
  };

  const extras = activityAccountsMap[activityTemplate] || [];
  const combined = [...baseAccounts];
  for (const extra of extras) {
    if (!combined.some((a) => a.code === extra.code)) {
      combined.push(extra);
    }
  }

  return combined.map((acc) => ({
    ...acc,
    id: clientId === 'client-1' ? acc.id : `${clientId}-${acc.id}`,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    currentBalance: 0,
    clientId,
  }));
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
      const fy = client.activeFiscalYear || getCairoCurrentYear();
      state.feeAgreements.push({
        id: `fa-migrated-${client.id}-${fy}`,
        clientId: client.id,
        fiscalYear: fy,
        description: `اتفاقية أتعاب سنوية معتمدة - ${client.name}`,
        amount: Number(client.annualAgreedFees) || 0,
        status: 'ACTIVE',
        createdAt: client.createdAt || getCairoDateString(),
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
        date: col.paidAt || getCairoDateString(),
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
        createdAt: col.createdAt || getCairoTimestamp(),
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
        const fy = clientObj.activeFiscalYear || (tx.date ? parseInt(tx.date.slice(0, 4), 10) : getCairoCurrentYear()) || getCairoCurrentYear();
        agreement = {
          id: `fa-auto-${clientObj.id}-${fy}`,
          clientId: clientObj.id,
          fiscalYear: fy,
          description: `اتفاقية أتعاب مهنية - ${clientObj.name}`,
          amount: Math.max(Number(clientObj.annualAgreedFees) || 0, Number(tx.amount) || 0),
          status: 'ACTIVE',
          createdAt: tx.date || getCairoDateString(),
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
        paidAt: tx.date || getCairoDateString(),
        method: tx.paymentMethod || 'CASH',
        receiptNo: tx.receiptNumber || tx.referenceNumber,
        treasuryTransactionId: tx.id,
        notes: tx.description,
        createdAt: tx.createdAt || getCairoTimestamp(),
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
  private lastStorageWriteError: string | null = null;
  private lastStorageSaveSuccessAt: string | null = null;
  private userPasswords: Map<string, string> = new Map();

  constructor() {
    this.state = this.loadInitialState();
    registerAccessGuardResolvers(
      () => this.getCurrentUser(),
      () => this.state?.activeClientContext?.clientId || null
    );
    AccountingCalculator.registerFiscalYearBoundsResolver((cId, fy) => {
      const b = this.getClientFiscalYearBounds(cId, fy);
      const startMonth = parseInt((b.startDate || '').slice(5, 7), 10) || 1;
      return {
        startDate: b.startDate,
        endDate: b.endDate,
        startMonth,
        labelAr: b.labelAr,
      };
    });
    AccountingCalculator.registerStatementModelDataSource({
      getClientById: (cId) => this.state.clients.find((c) => c.id === cId),
      getClientFiscalYearBounds: (cId, fy) => {
        const b = this.getClientFiscalYearBounds(cId, fy);
        const startMonth = parseInt((b.startDate || '').slice(5, 7), 10) || 1;
        return {
          startDate: b.startDate,
          endDate: b.endDate,
          startMonth,
          labelAr: b.labelAr,
        };
      },
      getClientAccounts: (cId, fy) => this.getClientAccounts(cId, fy),
      getClientJournalEntries: (cId) =>
        (this.state.journalEntries || []).filter((j) => j && j.clientId === cId),
      getClientStatementMapping: (cId) => this.getClientStatementMapping(cId),
      getOpeningBalancesMap: () => this.state.openingBalances || {},
      getManagerAdjustmentLayer: (cId, fy, ver) => this.getManagerAdjustmentLayer(cId, fy, ver),
      getStoredStatementNotes: (cId, fy) =>
        this.state.statementNotes?.[`${cId}:${fy}`] || {},
      getApprovedStatementSnapshot: (cId, fy, ver) =>
        (this.state.approvedStatements || []).find(
          (s) => s.clientId === cId && s.fiscalYear === fy && (s.version === ver || s.versionNo === ver)
        ),
      getLatestApprovedStatementSnapshot: (cId, fy) =>
        this.getLatestApprovedStatementForClient(cId, fy),
    });
  }

  public createDefaultState(): DatabaseState {
    const defaultFyBounds = computeFiscalYearBoundsByStartMonth(2026, 1);
    const defaultStartTs = `${defaultFyBounds.startDate}T00:00:00.000Z`;
    const defaultAdminSalt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
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
      canEditFinalStatements: true,
      mustChangePassword: false,
      passwordSalt: defaultAdminSalt,
      passwordHash: this.computeSaltedPasswordHash('Admin@1234', defaultAdminSalt),
      failedLoginAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      createdAt: defaultStartTs,
    };

    const initialState: DatabaseState = {
      accounts: getStandardEgyptianChartOfAccounts('client-1', 'INDUSTRIAL'),
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
          activityTemplate: 'INDUSTRIAL',
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
          fiscalYear: 2026,
          activeFiscalYear: 2026,
          fiscalYearStart: defaultFyBounds.startDate,
          fiscalYearEnd: defaultFyBounds.endDate,
          fiscalYearEndMonth: 12,
          isVatRegistered: true,
          isVatSubject: true,
          isIncomeTaxSubject: true,
          isWithholdingTaxSubject: true,
          isWhtSubject: true,
          isStampTaxSubject: true,
          isPayrollTaxSubject: true,
          hasPayroll: true,
          taxSubjectConfigured: true,
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
          id: 'fx-usd-default-1',
          date: defaultFyBounds.startDate,
          currency: 'USD',
          baseCurrency: 'EGP',
          buyRate: 48.55,
          sellRate: 48.75,
          officialRate: 48.65,
          rateToEgp: 48.65,
          code: 'USD',
          name: 'دولار أمريكي',
          source: 'CBE',
          createdAt: defaultStartTs,
          updatedAt: defaultStartTs,
        },
        {
          id: 'fx-usd-2026-02-01',
          date: '2026-02-01',
          currency: 'USD',
          baseCurrency: 'EGP',
          buyRate: 49.1,
          sellRate: 49.3,
          officialRate: 49.2,
          rateToEgp: 49.2,
          code: 'USD',
          name: 'دولار أمريكي',
          source: 'CBE',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: 'fx-eur-default-1',
          date: defaultFyBounds.startDate,
          currency: 'EUR',
          baseCurrency: 'EGP',
          buyRate: 52.4,
          sellRate: 52.6,
          officialRate: 52.5,
          rateToEgp: 52.5,
          code: 'EUR',
          name: 'يورو أوروبي',
          source: 'CBE',
          createdAt: defaultStartTs,
          updatedAt: defaultStartTs,
        },
        {
          id: 'fx-sar-default-1',
          date: defaultFyBounds.startDate,
          currency: 'SAR',
          baseCurrency: 'EGP',
          buyRate: 12.95,
          sellRate: 13.05,
          officialRate: 13.0,
          rateToEgp: 13.0,
          code: 'SAR',
          name: 'ريال سعودي',
          source: 'CBE',
          createdAt: defaultStartTs,
          updatedAt: defaultStartTs,
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
        clientId: 'client-1',
        selectedFiscalYear: 2026,
        autoFilterEnabled: true,
      },
      closingChecklists: {},
      clientDeadlines: [],
      openItems: [],
      approvedStatements: [],
      managerAdjustmentLayers: {},
      statementNotes: {},
      openingBalanceRollovers: {},
      openingBalances: {
        'client-1': {
          2026: {
            'acc-1101': { debit: 250000, credit: 0, accountCode: '1101', updatedAt: defaultStartTs, updatedBy: 'system' },
            'acc-1102': { debit: 850000, credit: 0, accountCode: '1102', updatedAt: defaultStartTs, updatedBy: 'system' },
            'acc-1103': { debit: 320000, credit: 0, accountCode: '1103', updatedAt: defaultStartTs, updatedBy: 'system' },
            'acc-2101': { debit: 0, credit: 420000, accountCode: '2101', updatedAt: defaultStartTs, updatedBy: 'system' },
            'acc-3101': { debit: 0, credit: 1000000, accountCode: '3101', updatedAt: defaultStartTs, updatedBy: 'system' },
          },
        },
      },
      clientOpeningBalances: [
        { clientId: 'client-1', fiscalYear: 2026, accountId: 'acc-1101', accountCode: '1101', openingBalanceDebit: 250000, openingBalanceCredit: 0, updatedAt: defaultStartTs, updatedBy: 'system' },
        { clientId: 'client-1', fiscalYear: 2026, accountId: 'acc-1102', accountCode: '1102', openingBalanceDebit: 850000, openingBalanceCredit: 0, updatedAt: defaultStartTs, updatedBy: 'system' },
        { clientId: 'client-1', fiscalYear: 2026, accountId: 'acc-1103', accountCode: '1103', openingBalanceDebit: 320000, openingBalanceCredit: 0, updatedAt: defaultStartTs, updatedBy: 'system' },
        { clientId: 'client-1', fiscalYear: 2026, accountId: 'acc-2101', accountCode: '2101', openingBalanceDebit: 0, openingBalanceCredit: 420000, updatedAt: defaultStartTs, updatedBy: 'system' },
        { clientId: 'client-1', fiscalYear: 2026, accountId: 'acc-3101', accountCode: '3101', openingBalanceDebit: 0, openingBalanceCredit: 1000000, updatedAt: defaultStartTs, updatedBy: 'system' },
      ],
      feeAgreements: [
        {
          id: 'fa-default-1',
          clientId: 'client-1',
          fiscalYear: 2026,
          description: 'اتفاقية المراجعة السنوية والإقرارات الضريبية لعام 2026',
          amount: 60000,
          dueDate: defaultFyBounds.endDate,
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
      clientSystemRegistrations: [],
      clientSystemActions: [],
      systemRegistrationsMigrationDone: false,
      systemPortalUrls: { ...DEFAULT_SYSTEM_PORTAL_URLS },
    };

    this.migrateMultiEntityState(initialState);
    this.migrateSystemRegistrationsOnce(initialState);
    reconcileFeeCollectionsAndTreasury(initialState);
    return initialState;
  }

  public migrateMultiEntityState(state: DatabaseState): void {
    if (!state.openingBalances || typeof state.openingBalances !== 'object') {
      state.openingBalances = {};
    }
    if (!Array.isArray(state.clientOpeningBalances)) {
      state.clientOpeningBalances = [];
    }
    if (!Array.isArray(state.clients)) {
      state.clients = [];
    }
    if (!Array.isArray(state.accounts)) {
      state.accounts = [];
    }
    if (!Array.isArray(state.journalEntries)) {
      state.journalEntries = [];
    }

    // 1. Ensure every client has fiscalYear, fiscalYearStart, fiscalYearEnd, activityTemplate, and isolated accounts
    for (const client of state.clients) {
      const fy = client.fiscalYear || client.activeFiscalYear || getCairoCurrentYear();
      client.fiscalYear = fy;
      client.activeFiscalYear = fy;
      if (!client.activityTemplate) {
        client.activityTemplate = client.id === 'client-1' ? 'INDUSTRIAL' : 'COMMERCIAL';
      }
      const bounds = computeClientFiscalYearBounds(client, fy);
      if (!client.fiscalYearStart) client.fiscalYearStart = bounds.startDate;
      if (!client.fiscalYearEnd) client.fiscalYearEnd = bounds.endDate;

      const hasAccounts = state.accounts.some((a) => a.clientId === client.id);
      if (!hasAccounts) {
        const templateAccounts = getStandardEgyptianChartOfAccounts(client.id, client.activityTemplate);
        state.accounts.push(...templateAccounts);
      }
      if (!state.openingBalances[client.id]) {
        state.openingBalances[client.id] = {};
      }
      if (!state.openingBalances[client.id][fy]) {
        state.openingBalances[client.id][fy] = {};
      }
    }

    // 2. Migrate any legacy opening balances stored on Account records into openingBalances[clientId][fiscalYear][accountId]
    // and zero out the raw Account openingBalanceDebit / openingBalanceCredit
    for (const acc of state.accounts) {
      if (!acc.clientId) {
        acc.clientId = state.clients[0]?.id || 'client-1';
      }
      const clientObj = state.clients.find((c) => c.id === acc.clientId);
      const fy = acc.fiscalYear || clientObj?.fiscalYear || clientObj?.activeFiscalYear || 2026;
      if (!state.openingBalances[acc.clientId]) {
        state.openingBalances[acc.clientId] = {};
      }
      if (!state.openingBalances[acc.clientId][fy]) {
        state.openingBalances[acc.clientId][fy] = {};
      }

      const rawDr = Number(acc.openingBalanceDebit) || 0;
      const rawCr = Number(acc.openingBalanceCredit) || 0;
      if ((rawDr > 0 || rawCr > 0) && !state.openingBalances[acc.clientId][fy][acc.id]) {
        state.openingBalances[acc.clientId][fy][acc.id] = {
          debit: rawDr,
          credit: rawCr,
          accountCode: acc.code,
          updatedAt: getCairoTimestamp(),
          updatedBy: 'migration',
        };
      }
      // Opening balances are stored strictly in openingBalances[clientId][fiscalYear][accountId], not on Account
      acc.openingBalanceDebit = 0;
      acc.openingBalanceCredit = 0;
      acc.currentBalance = 0;
    }

    // 3. Sync any flat clientOpeningBalances records into openingBalances[clientId][fiscalYear][accountId]
    for (const flat of state.clientOpeningBalances) {
      if (!flat.clientId || !flat.fiscalYear) continue;
      if (!state.openingBalances[flat.clientId]) {
        state.openingBalances[flat.clientId] = {};
      }
      if (!state.openingBalances[flat.clientId][flat.fiscalYear]) {
        state.openingBalances[flat.clientId][flat.fiscalYear] = {};
      }
      const matchedAcc = state.accounts.find(
        (a) => a.clientId === flat.clientId && (a.id === flat.accountId || a.code === flat.accountCode)
      );
      const targetAccId = matchedAcc?.id || flat.accountId;
      if (!state.openingBalances[flat.clientId][flat.fiscalYear][targetAccId]) {
        state.openingBalances[flat.clientId][flat.fiscalYear][targetAccId] = {
          debit: Number(flat.openingBalanceDebit) || 0,
          credit: Number(flat.openingBalanceCredit) || 0,
          accountCode: matchedAcc?.code || flat.accountCode,
          updatedAt: flat.updatedAt || getCairoTimestamp(),
          updatedBy: flat.updatedBy || 'migration',
        };
      }
    }

    // 4. Rebuild flat clientOpeningBalances mirror from nested openingBalances
    const mirroredFlat: ClientOpeningBalanceRecord[] = [];
    for (const [cid, yearMap] of Object.entries(state.openingBalances)) {
      for (const [yrStr, accMap] of Object.entries(yearMap || {})) {
        const yr = Number(yrStr);
        for (const [accId, entry] of Object.entries(accMap || {})) {
          const accObj = state.accounts.find((a) => a.clientId === cid && a.id === accId);
          mirroredFlat.push({
            clientId: cid,
            fiscalYear: yr,
            accountId: accId,
            accountCode: entry.accountCode || accObj?.code || accId,
            openingBalanceDebit: Number(entry.debit) || 0,
            openingBalanceCredit: Number(entry.credit) || 0,
            updatedAt: entry.updatedAt || getCairoTimestamp(),
            updatedBy: entry.updatedBy || 'system',
          });
        }
      }
    }
    state.clientOpeningBalances = mirroredFlat;

    // 5. Ensure every client has all required base analytical accounts and an explicit accountMapping
    if (!state.accountMappings || typeof state.accountMappings !== 'object') {
      state.accountMappings = {};
    }
    for (const client of state.clients) {
      const tplAccounts = getStandardEgyptianChartOfAccounts(client.id, client.activityTemplate || 'COMMERCIAL');
      for (const tplAcc of tplAccounts) {
        const exists = state.accounts.some((a) => a.clientId === client.id && a.code === tplAcc.code);
        if (!exists) {
          state.accounts.push(tplAcc);
        }
      }
      if (!state.accountMappings[client.id]) {
        state.accountMappings[client.id] = createDefaultClientAccountMapping(client.id);
      }
      if (!state.statementMappings || typeof state.statementMappings !== 'object') {
        state.statementMappings = {};
      }
      if (!state.statementMappings[client.id]) {
        state.statementMappings[client.id] = createDefaultClientStatementMapping(client.id);
      }
    }

    // 6. Initialize per-(clientId + fiscalYear) sequential journal counters in systemSerials
    if (!state.systemSerials) {
      state.systemSerials = {
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
        clientYearJournalCounters: {},
      };
    }
    if (!state.systemSerials.clientYearJournalCounters) {
      state.systemSerials.clientYearJournalCounters = {};
    }
    for (const je of state.journalEntries) {
      if (!je.clientId) continue;
      const fy = je.fiscalYear || this.extractYearFromDate(je.date);
      const key = `${je.clientId}:${fy}`;
      const numMatch = typeof je.entryNumber === 'number'
        ? je.entryNumber
        : /^\d+$/.test(String(je.entryNumber || '').trim())
        ? parseInt(String(je.entryNumber).trim(), 10)
        : 0;
      const currentMax = state.systemSerials.clientYearJournalCounters[key] || 0;
      if (numMatch > currentMax) {
        state.systemSerials.clientYearJournalCounters[key] = numMatch;
      }
    }

    // Note on Requirement 5: Journal entries without clientId are NEVER deleted automatically;
    // they remain in state.journalEntries so getUnassignedJournalEntries() surfaces them in the UI.
  }

  public migrateSystemRegistrationsOnce(state: DatabaseState): void {
    if (state.systemRegistrationsMigrationDone) {
      return;
    }
    if (!Array.isArray(state.clientSystemRegistrations)) {
      state.clientSystemRegistrations = [];
    }
    if (!Array.isArray(state.clientSystemActions)) {
      state.clientSystemActions = [];
    }
    if (!state.systemPortalUrls) {
      state.systemPortalUrls = { ...DEFAULT_SYSTEM_PORTAL_URLS };
    }

    const existingMap = new Map<string, ClientSystemRegistration>();
    for (const reg of state.clientSystemRegistrations) {
      existingMap.set(`${reg.clientId}:${reg.kind}`, reg);
    }

    const nowTimestamp = getCairoTimestamp();
    const nowCairoDate = getCairoDateString();

    for (const client of state.clients || []) {
      const creds = client.portalCredentials || {};

      // 1. SAP
      const sapKey = `${client.id}:SAP`;
      if (!existingMap.has(sapKey)) {
        const sapCredEntry = creds.sapPortal || creds.sapTaxPortal;
        const isClientSap = (client as any).taxSystemType === 'SAP';
        const hasSapCreds = !!(sapCredEntry?.username || (isClientSap && (client.taxPortalUsername || (client as any).portalUsername)));
        const sapUsername = sapCredEntry?.username || (isClientSap ? client.taxPortalUsername : '') || '';
        const sapPassword = sapCredEntry?.password || (isClientSap ? client.taxPortalPassword : '') || '';
        const isRegistered = hasSapCreds || isClientSap;

        const sapReg: ClientSystemRegistration = {
          id: `reg-${client.id}-SAP`,
          clientId: client.id,
          kind: 'SAP',
          status: isRegistered ? 'REGISTERED' : 'NOT_REGISTERED',
          registeredAt: isRegistered ? (sapCredEntry?.updatedAt || client.createdAt || nowCairoDate) : undefined,
          credentials: {
            username: sapUsername,
            password: sapPassword,
            email: sapCredEntry?.email || client.email || '',
            registeredMobile: sapCredEntry?.registeredMobile || client.phone || client.whatsappPhone || '',
            notes: sapCredEntry?.notes || '',
            pinOtp: sapCredEntry?.pinOtp || '',
            portalUrl: sapCredEntry?.portalUrl || '',
          },
          extra: {
            isClientPreferred: isClientSap,
          },
          createdBy: 'migration',
          updatedAt: nowTimestamp,
        };
        state.clientSystemRegistrations.push(sapReg);
        existingMap.set(sapKey, sapReg);
      }

      // 2. GENERAL_TAX
      const genKey = `${client.id}:GENERAL_TAX`;
      if (!existingMap.has(genKey)) {
        const genCredEntry = creds.etaGeneralTax;
        const isOldPortal = (client as any).taxSystemType === 'OLD_PORTAL';
        const hasGenCreds = !!(genCredEntry?.username || (isOldPortal && (client.taxPortalUsername || (client as any).portalUsername)));
        const genUsername = genCredEntry?.username || (isOldPortal ? client.taxPortalUsername : '') || '';
        const genPassword = genCredEntry?.password || (isOldPortal ? client.taxPortalPassword : '') || '';
        const isRegistered = hasGenCreds || isOldPortal;

        const genReg: ClientSystemRegistration = {
          id: `reg-${client.id}-GENERAL_TAX`,
          clientId: client.id,
          kind: 'GENERAL_TAX',
          status: isRegistered ? 'REGISTERED' : 'NOT_REGISTERED',
          registeredAt: isRegistered ? (genCredEntry?.updatedAt || client.createdAt || nowCairoDate) : undefined,
          credentials: {
            username: genUsername,
            password: genPassword,
            email: genCredEntry?.email || client.email || '',
            registeredMobile: genCredEntry?.registeredMobile || client.phone || client.whatsappPhone || '',
            notes: genCredEntry?.notes || '',
            pinOtp: genCredEntry?.pinOtp || '',
            portalUrl: genCredEntry?.portalUrl || '',
          },
          extra: {},
          createdBy: 'migration',
          updatedAt: nowTimestamp,
        };
        state.clientSystemRegistrations.push(genReg);
        existingMap.set(genKey, genReg);
      }

      // 3. E_INVOICE
      const einvKey = `${client.id}:E_INVOICE`;
      if (!existingMap.has(einvKey)) {
        const einvCredEntry = creds.etaEInvoicing;
        const esigCredEntry = creds.eSignatureToken;
        const isRegistered = !!(client.eInvoiceRegistered || einvCredEntry?.username || client.eInvoicePortalEmail);
        const hasToken = !!(client.hasEsealToken || client.tokenSerial || esigCredEntry?.tokenSerial || creds.tokenSerial);

        const einvReg: ClientSystemRegistration = {
          id: `reg-${client.id}-E_INVOICE`,
          clientId: client.id,
          kind: 'E_INVOICE',
          status: isRegistered ? 'REGISTERED' : 'NOT_REGISTERED',
          registeredAt: isRegistered ? (client.createdAt || nowCairoDate) : undefined,
          credentials: {
            username: einvCredEntry?.username || client.eInvoicePortalEmail || '',
            password: einvCredEntry?.password || client.eInvoicePortalPassword || '',
            email: einvCredEntry?.email || client.eInvoicePortalEmail || client.email || '',
            registeredMobile: einvCredEntry?.registeredMobile || client.phone || '',
            notes: einvCredEntry?.notes || '',
          },
          extra: {
            eInvoiceRegistered: isRegistered,
            hasToken: hasToken,
            tokenIssuer: esigCredEntry?.issuer || client.tokenIssuer || 'شركة مصر للمقاصة والإيداع والقيد المركزي (MCDR)',
            tokenSerial: esigCredEntry?.tokenSerial || client.tokenSerial || creds.tokenSerial || '',
            tokenPin: esigCredEntry?.tokenPin || client.tokenPin || creds.tokenPin || '',
            tokenExpiryDate: esigCredEntry?.expiryDate || client.tokenExpiryDate || creds.expiryDate || '',
            issuerUsername: esigCredEntry?.issuerUsername || '',
            issuerPassword: esigCredEntry?.issuerPassword || '',
          },
          createdBy: 'migration',
          updatedAt: nowTimestamp,
        };
        state.clientSystemRegistrations.push(einvReg);
        existingMap.set(einvKey, einvReg);
      }

      // 4. NAFEZA
      const nafezaKey = `${client.id}:NAFEZA`;
      if (!existingMap.has(nafezaKey)) {
        const nafezaCredEntry = creds.nafeza;
        const isRegistered = !!(nafezaCredEntry?.username || (client as any).nafezaRegistered);

        const nafezaReg: ClientSystemRegistration = {
          id: `reg-${client.id}-NAFEZA`,
          clientId: client.id,
          kind: 'NAFEZA',
          status: isRegistered ? 'REGISTERED' : 'NOT_REGISTERED',
          registeredAt: isRegistered ? (nafezaCredEntry?.updatedAt || client.createdAt || nowCairoDate) : undefined,
          credentials: {
            username: nafezaCredEntry?.username || '',
            password: nafezaCredEntry?.password || '',
            email: nafezaCredEntry?.email || client.email || '',
            registeredMobile: nafezaCredEntry?.registeredMobile || client.phone || '',
            notes: nafezaCredEntry?.notes || '',
          },
          extra: {
            eSignatureEnabled: !!(nafezaCredEntry?.eSignatureEnabled || client.hasEsealToken),
            registrantType: nafezaCredEntry?.registrantType || 'IMPORTER',
            importerRegistrationNumber: nafezaCredEntry?.importerRegistrationNumber || '',
            authMethod: nafezaCredEntry?.authMethod || (client.hasEsealToken ? 'TOKEN' : 'ACCOUNT'),
          },
          createdBy: 'migration',
          updatedAt: nowTimestamp,
        };
        state.clientSystemRegistrations.push(nafezaReg);
        existingMap.set(nafezaKey, nafezaReg);
      }

      // 5. PAYROLL_NEW
      const payrollKey = `${client.id}:PAYROLL_NEW`;
      if (!existingMap.has(payrollKey)) {
        const payrollCredEntry = creds.etaPayrollTax;
        const isRegistered = !!(payrollCredEntry?.username || (client as any).payrollRegistered);

        const payrollReg: ClientSystemRegistration = {
          id: `reg-${client.id}-PAYROLL_NEW`,
          clientId: client.id,
          kind: 'PAYROLL_NEW',
          status: isRegistered ? 'REGISTERED' : 'NOT_REGISTERED',
          registeredAt: isRegistered ? (payrollCredEntry?.updatedAt || client.createdAt || nowCairoDate) : undefined,
          credentials: {
            username: payrollCredEntry?.username || '',
            password: payrollCredEntry?.password || '',
            email: payrollCredEntry?.email || client.email || '',
            registeredMobile: payrollCredEntry?.registeredMobile || client.phone || '',
            notes: payrollCredEntry?.notes || '',
          },
          extra: {
            enrolledStatus: isRegistered ? 'ENROLLED' : 'NOT_ENROLLED',
            enrolledDate: payrollCredEntry?.updatedAt || '',
            facilityNumber: payrollCredEntry?.facilityNumber || (client as any).facilityNumber || '',
          },
          createdBy: 'migration',
          updatedAt: nowTimestamp,
        };
        state.clientSystemRegistrations.push(payrollReg);
        existingMap.set(payrollKey, payrollReg);
      }
    }

    state.systemRegistrationsMigrationDone = true;
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
            openingBalances: parsed.openingBalances || base.openingBalances || {},
            closingChecklists: parsed.closingChecklists || base.closingChecklists || {},
            clientDeadlines: parsed.clientDeadlines || base.clientDeadlines || [],
            openItems: parsed.openItems || base.openItems || [],
            approvedStatements: parsed.approvedStatements || base.approvedStatements || [],
            managerAdjustmentLayers: parsed.managerAdjustmentLayers || base.managerAdjustmentLayers || {},
            statementNotes: parsed.statementNotes || base.statementNotes || {},
            openingBalanceRollovers: parsed.openingBalanceRollovers || base.openingBalanceRollovers || {},
            feeAgreements: parsed.feeAgreements || base.feeAgreements || [],
            feeCollections: parsed.feeCollections || base.feeCollections || [],
            clientSystemRegistrations: parsed.clientSystemRegistrations || base.clientSystemRegistrations || [],
            clientSystemActions: parsed.clientSystemActions || base.clientSystemActions || [],
            systemRegistrationsMigrationDone: parsed.systemRegistrationsMigrationDone ?? base.systemRegistrationsMigrationDone ?? false,
            systemPortalUrls: parsed.systemPortalUrls || base.systemPortalUrls || { ...DEFAULT_SYSTEM_PORTAL_URLS },
          };
          this.migrateMultiEntityState(merged);
          migrateClientTaxSubjectFlagsOnce(merged);
          this.migrateSystemRegistrationsOnce(merged);
          reconcileFeeCollectionsAndTreasury(merged);
          try {
            localStorage.setItem(FULL_STATE_KEY, JSON.stringify(merged));
          } catch {
            // ignore storage errors
          }
          return merged;
        }
      }
    } catch {
      // ignore corrupted storage
    }
    migrateClientTaxSubjectFlagsOnce(base);
    this.migrateSystemRegistrationsOnce(base);
    return base;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // @public-readonly-safe: دالة تهيئة داخلية للاختبارات فقط (Testing Harness Reset)
  public resetToInitialStateForTesting(): void {
    this.state = this.createDefaultState();
    this.migrateSystemRegistrationsOnce(this.state);
    this.dirtySlices.clear();
    this.lastStorageWriteError = null;
    this.lastStorageSaveSuccessAt = getCairoTimestamp();
    this.userPasswords.clear();
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

  public hasStorageWriteFailure(): boolean {
    return this.lastStorageWriteError !== null;
  }

  public getLastStorageWriteError(): string | null {
    return this.lastStorageWriteError;
  }

  public getLastStorageSaveSuccessAt(): string | null {
    return this.lastStorageSaveSuccessAt;
  }

  public getStorageStatusLabel(): string {
    if (this.lastStorageWriteError) {
      return this.lastStorageWriteError;
    }
    if (this.lastStorageSaveSuccessAt) {
      return `تم الحفظ (${this.lastStorageSaveSuccessAt})`;
    }
    return 'بانتظار الحفظ الفعلي';
  }

  // @public-readonly-safe: دالة حفظ الحالة في التخزين المحلي وإطلاق حدث StorageWriteError عند امتلاء المساحة
  public saveState(sliceName = 'ALL'): void {
    this.dirtySlices.add(sliceName);
    this.flushDirtyStorage();
    this.notify();
  }

  public flushDirtyStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const isBulkAuditOnly =
          this.dirtySlices.size === 1 &&
          this.dirtySlices.has('AUDIT') &&
          (this.state.auditLogs?.length || 0) > 25 &&
          (this.state.auditLogs?.length || 0) % 50 !== 0;

        if (isBulkAuditOnly) {
          const lastAudit = this.state.auditLogs[this.state.auditLogs.length - 1];
          localStorage.setItem(`${STORAGE_PREFIX}AUDIT`, JSON.stringify(lastAudit || '1'));
        } else {
          localStorage.setItem(FULL_STATE_KEY, JSON.stringify(this.state));
          for (const slice of this.dirtySlices) {
            localStorage.setItem(`${STORAGE_PREFIX}${slice}`, '1');
          }
        }
      }
      this.dirtySlices.clear();
      this.lastStorageWriteError = null;
      this.lastStorageSaveSuccessAt = getCairoTimestamp();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('mg:storage-write-success', {
            detail: { timestamp: this.lastStorageSaveSuccessAt },
          })
        );
      }
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? `فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن (${err.name}: ${err.message})`
          : 'فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن';
      this.lastStorageWriteError = errMsg;
      this.lastStorageSaveSuccessAt = null;
      console.error('[StorageWriteError] فشل حفظ حالة قاعدة البيانات في localStorage:', err);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('mg:storage-write-error', {
            detail: {
              message: 'فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن',
              error: err,
              timestamp: getCairoTimestamp(),
            },
          })
        );
      }
      throw new StorageWriteError('فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن', {
        cause: err,
        sliceName: Array.from(this.dirtySlices).join(','),
      });
    }
  }

  // =========================================================================
  // Users & Auth Management (getCurrentUser returns null when no user is active; getUsers never recreates default admin when empty)
  // =========================================================================
  public getUsers(): SystemUser[] {
    if (!Array.isArray(this.state.users)) {
      this.state.users = [];
    }
    return this.state.users;
  }

  public isStrongPassword(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
  }

  public generatePasswordSalt(): string {
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private sha256BytesToHex(data: Uint8Array): string {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    const bitLen = data.length * 8;
    const totalLen = (((data.length + 8) >> 6) + 1) << 6;
    const padded = new Uint8Array(totalLen);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(totalLen - 4, bitLen >>> 0, false);

    const w = new Uint32Array(64);
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

    for (let offset = 0; offset < totalLen; offset += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = view.getUint32(offset + i * 4, false);
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;

      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map((v) => (v >>> 0).toString(16).padStart(8, '0'))
      .join('');
  }

  public computeSaltedPasswordHash(password: string, saltHex: string): string {
    const inputBytes = new TextEncoder().encode(`${saltHex}:${password}`);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle?.digest) {
      void globalThis.crypto.subtle.digest('SHA-256', inputBytes).catch(() => {});
    }
    return this.sha256BytesToHex(inputBytes);
  }

  public async hashUserPasswordWithSubtle(
    password: string,
    saltHex?: string
  ): Promise<{ hash: string; salt: string }> {
    const salt = saltHex || this.generatePasswordSalt();
    const inputBytes = new TextEncoder().encode(`${salt}:${password}`);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle?.digest) {
      const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', inputBytes);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return { hash, salt };
    }
    return { hash: this.sha256BytesToHex(inputBytes), salt };
  }

  private constantTimeEqualHex(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  public setupFirstAdmin(input: {
    name: string;
    email?: string;
    username?: string;
    password: string;
  }): SystemUser {
    if (this.getUsers().length > 0) {
      throw new PermissionError(
        'عملية مرفوضة: يوجد مستخدمون مسجلون بالفعل؛ لا يمكن تشغيل إعداد أول أدمن إلا عند فراغ قائمة المستخدمين.',
        { action: 'MANAGE_USERS', entityType: 'USER' }
      );
    }
    const cleanName = (input.name || '').trim();
    if (!cleanName) {
      throw new Error('يرجى إدخال اسم المدير العام (الأدمن الأول).');
    }
    if (!this.isStrongPassword(input.password)) {
      throw new Error('كلمة المرور غير قوية: يجب ألا تقل عن 8 أحرف وتجمع بين الحروف والأرقام.');
    }
    const salt = this.generatePasswordSalt();
    const passwordHash = this.computeSaltedPasswordHash(input.password, salt);
    const firstAdmin: SystemUser = {
      id: 'user-admin',
      username: input.username || (input.email ? input.email.split('@')[0] : 'admin'),
      name: cleanName,
      email: input.email || 'admin@office.eg',
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
      passwordSalt: salt,
      passwordHash,
      failedLoginAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      createdAt: getCairoTimestamp(),
    };
    this.state.users = [firstAdmin];
    this.state.currentUserId = firstAdmin.id;
    this.userPasswords.delete(firstAdmin.id);
    this.recordAuditMutation({
      action: 'SETUP_FIRST_ADMIN',
      entityType: 'USER',
      entityId: firstAdmin.id,
      beforeValue: null,
      afterValue: firstAdmin,
      details: `إعداد أول أدمن للنظام (${firstAdmin.name}) بكلمة مرور قوية مملحة`,
    });
    this.saveState('USERS');
    return firstAdmin;
  }

  public getCurrentUser(): SystemUser | null {
    if (!this.state.currentUserId) return null;
    const users = this.getUsers();
    const found = users.find((u) => u.id === this.state.currentUserId);
    return found || null;
  }

  public setCurrentUser(user: Partial<SystemUser> & { id: string; name: string }): void {
    const existing = this.state.users.find((u) => u.id === user.id);
    if (!existing) {
      const newUser: SystemUser = {
        id: user.id,
        name: user.name,
        email: user.email || `${user.id}@example.com`,
        role: user.role || 'AUDITOR',
        roleTitleArabic: (user as any).roleTitleArabic || 'مستخدم النظام',
        canAccessTreasury: (user as any).canAccessTreasury !== false,
        canAccessAuditTrail: (user as any).canAccessAuditTrail !== false,
        permissions: user.permissions || ['VIEW'],
        permittedClientIds: user.permittedClientIds,
        isActive: user.isActive !== false,
        createdAt: getCairoTimestamp(),
        ...user,
      };
      this.state.users.push(newUser);
    } else {
      Object.assign(existing, user);
    }
    this.state.currentUserId = user.id;
  }

  public switchUser(
    userId: string | null,
    authOptions?: { password?: string } | string
  ): SystemUser | null {
    if (!userId) {
      this.state.currentUserId = '';
      this.saveState('USERS');
      return null;
    }
    const targetUser = this.getUsers().find((u) => u.id === userId) || null;
    if (!targetUser) {
      this.state.currentUserId = '';
      this.saveState('USERS');
      return null;
    }

    const currentUser = this.getCurrentUser();
    const providedPassword =
      typeof authOptions === 'string' ? authOptions : authOptions?.password;
    const isCurrentAdmin = currentUser?.role === 'ADMIN' && currentUser?.isActive !== false;

    const now = Date.now();
    if (targetUser.lockedUntil && now < targetUser.lockedUntil) {
      const remainingSec = Math.ceil((targetUser.lockedUntil - now) / 1000);
      this.logAudit({
        action: 'USER_LOGIN_BLOCKED_LOCKED',
        entityType: 'USER',
        entityId: targetUser.id,
        details: `رفض تبديل/دخول المستخدم (${targetUser.name}) لأن الحساب مقفل مؤقتاً (متبقي ${remainingSec} ثانية)`,
      });
      this.saveState('USERS');
      throw new PermissionError(
        `عملية مرفوضة: حساب المستخدم (${targetUser.name}) مقفل مؤقتاً بسبب محاولات دخول فاشلة متتالية (متبقي ${remainingSec} ثانية).`,
        { action: 'MANAGE_USERS', entityType: 'USER' }
      );
    }

    const hasSaltedPassword = Boolean(targetUser.passwordHash && targetUser.passwordSalt);
    const legacyPlainPassword =
      this.userPasswords.get(targetUser.id) ||
      (typeof (targetUser as any).password === 'string' && (targetUser as any).password
        ? (targetUser as any).password
        : undefined);
    const hasAnyStoredPassword = hasSaltedPassword || Boolean(legacyPlainPassword);

    // إذا لم يكن المستخدم الحالي ADMIN أو تم تمرير كلمة مرور صراحةً للتحقق، يجب إثبات الهوية بكلمة مرور المستخدم الهدف
    if (!isCurrentAdmin || providedPassword !== undefined) {
      if (!hasAnyStoredPassword) {
        this.logAudit({
          action: 'LOGIN_REJECTED_NO_PASSWORD',
          entityType: 'USER',
          entityId: targetUser.id,
          details: `رفض التبديل للمستخدم (${targetUser.name}) لعدم وجود كلمة مرور مخزنة له (لا يُسمح بالدخول بلا كلمة مرور)`,
        });
        this.saveState('USERS');
        throw new PermissionError(
          'عملية مرفوضة: لا يُسمح بالدخول بلا كلمة مرور — يجب تعيين كلمة مرور للمستخدم الهدف أولًا قبل تبديل الحساب.',
          { action: 'MANAGE_USERS', entityType: 'USER' }
        );
      }

      if (!providedPassword) {
        this.logAudit({
          action: 'LOGIN_REJECTED_MISSING_PASSWORD',
          entityType: 'USER',
          entityId: targetUser.id,
          details: `رفض التبديل للمستخدم (${targetUser.name}) لعدم إدخال كلمة المرور المطلوبة لإثبات الهوية`,
        });
        this.saveState('USERS');
        throw new PermissionError(
          'عملية مرفوضة: تبديل المستخدم يتطلب صلاحية المدير العام (ADMIN) أو إدخال كلمة مرور المستخدم الهدف لإثبات الهوية.',
          { action: 'MANAGE_USERS', entityType: 'USER' }
        );
      }

      let passwordValid = false;
      if (hasSaltedPassword && targetUser.passwordSalt && targetUser.passwordHash) {
        const candidateHash = this.computeSaltedPasswordHash(
          providedPassword,
          targetUser.passwordSalt
        );
        passwordValid = this.constantTimeEqualHex(candidateHash, targetUser.passwordHash);
      } else if (legacyPlainPassword) {
        const tempSalt = this.generatePasswordSalt();
        const candidateHash = this.computeSaltedPasswordHash(providedPassword, tempSalt);
        const expectedLegacyHash = this.computeSaltedPasswordHash(legacyPlainPassword, tempSalt);
        passwordValid = this.constantTimeEqualHex(candidateHash, expectedLegacyHash);
      }

      if (!passwordValid) {
        const attempts = (targetUser.failedLoginAttempts || 0) + 1;
        targetUser.failedLoginAttempts = attempts;

        if (attempts >= 5) {
          const nextLockoutCount = (targetUser.lockoutCount || 0) + 1;
          targetUser.lockoutCount = nextLockoutCount;
          const lockDurationMinutes = Math.pow(2, nextLockoutCount - 1);
          const lockDurationMs = lockDurationMinutes * 60 * 1000;
          targetUser.lockedUntil = Date.now() + lockDurationMs;

          this.logAudit({
            action: 'USER_LOCKED_OUT',
            entityType: 'USER',
            entityId: targetUser.id,
            details: `قفل حساب المستخدم (${targetUser.name}) لمدة ${lockDurationMinutes} دقيقة بعد (${attempts}) محاولات دخول فاشلة متتالية`,
          });
          this.saveState('USERS');
          throw new PermissionError(
            `عملية مرفوضة: تم قفل حساب المستخدم (${targetUser.name}) لمدة ${lockDurationMinutes} دقيقة بعد 5 محاولات دخول فاشلة متتالية.`,
            { action: 'MANAGE_USERS', entityType: 'USER' }
          );
        }

        this.logAudit({
          action: 'LOGIN_FAILED',
          entityType: 'USER',
          entityId: targetUser.id,
          details: `محاولة دخول فاشلة للمستخدم (${targetUser.name}) — المحاولة الفاشلة رقم (${attempts}) من 5`,
        });
        this.saveState('USERS');
        throw new PermissionError(
          'عملية مرفوضة: كلمة مرور المستخدم الهدف غير صحيحة.',
          { action: 'MANAGE_USERS', entityType: 'USER' }
        );
      }

      // ترحيل كلمة المرور النصية القديمة إلى بصمة مملّحة (SHA-256 + salt) عند أول تسجيل دخول ناجح وحذف النسخة النصية
      if (!hasSaltedPassword || legacyPlainPassword || 'password' in targetUser) {
        const newSalt = targetUser.passwordSalt || this.generatePasswordSalt();
        targetUser.passwordSalt = newSalt;
        targetUser.passwordHash = this.computeSaltedPasswordHash(providedPassword, newSalt);
        delete (targetUser as any).password;
        this.userPasswords.delete(targetUser.id);
      }

      targetUser.failedLoginAttempts = 0;
      targetUser.lockoutCount = 0;
      targetUser.lockedUntil = null;
    }

    this.state.currentUserId = targetUser.id;
    this.saveState('USERS');
    return targetUser;
  }

  public logout(): void {
    this.switchUser(null);
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

    let mustChangePassword = false;
    if (source === 'SERVER_AUTH') {
      mustChangePassword = Boolean(profile.mustChangePassword);
    } else {
      mustChangePassword = Boolean(existingUser?.mustChangePassword || profile.mustChangePassword);
    }

    const isAdmin = (profile.role || existingUser?.role) === 'ADMIN';
    const syncedUser: SystemUser = {
      id: existingUser?.id || uid,
      username: existingUser?.username || profile.email?.split('@')[0] || 'user',
      name: profile.name || existingUser?.name || 'مستخدم النظام',
      email: profile.email || existingUser?.email || '',
      role: profile.role || existingUser?.role || 'AUDITOR',
      roleTitleArabic: profile.roleTitleArabic || existingUser?.roleTitleArabic || 'محاسب ومراجع',
      isActive: true,
      canManageUsers: isAdmin || Boolean(existingUser?.canManageUsers),
      canAccessTreasury: profile.canAccessTreasury ?? existingUser?.canAccessTreasury ?? isAdmin,
      canAccessAuditTrail: profile.canAccessAuditTrail ?? existingUser?.canAccessAuditTrail ?? true,
      canPostEntries: existingUser?.canPostEntries ?? isAdmin,
      canEditPostedEntries: profile.canEditPostedEntries ?? existingUser?.canEditPostedEntries ?? isAdmin,
      canDeleteRecords: profile.canDeleteRecords ?? existingUser?.canDeleteRecords ?? isAdmin,
      canAccessCreditFiles: existingUser?.canAccessCreditFiles ?? isAdmin,
      canAccessTaxReports: existingUser?.canAccessTaxReports ?? isAdmin,
      permittedClientIds: profile.permittedClientIds || existingUser?.permittedClientIds,
      mustChangePassword,
      lastLoginAt: getCairoTimestamp(),
      createdAt: existingUser?.createdAt || profile.createdAt || getCairoTimestamp(),
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
    this.assertCan('MANAGE_USERS', { allowWithoutClient: true, entityType: 'USER' });
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      const before = { ...user };
      user.mustChangePassword = Boolean(mustChange);
      this.recordAuditMutation({
        action: 'SET_MUST_CHANGE_PASSWORD',
        entityType: 'USER',
        entityId: userId,
        beforeValue: before,
        afterValue: user,
        details: `تحديث إلزامية تغيير كلمة المرور للمستخدم (${user.name})`,
      });
      this.saveState('USERS');
    }
  }

  public addUser(
    userInput: Partial<SystemUser> & { name: string; email: string; role: string; password?: string }
  ): SystemUser {
    const actingUser = this.assertCan('MANAGE_USERS', { allowWithoutClient: true, entityType: 'USER' });
    if (userInput.role === 'ADMIN' && actingUser.role !== 'ADMIN') {
      throw new PermissionError(
        'عملية مرفوضة: لا يمكن لمستخدم غير أدمن إنشاء حساب بدور المدير العام (ADMIN).',
        { action: 'MANAGE_USERS', entityType: 'USER' }
      );
    }
    const isAdmin = userInput.role === 'ADMIN';
    const newUser: SystemUser = {
      id: userInput.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: userInput.username || userInput.email.split('@')[0],
      name: userInput.name,
      email: userInput.email,
      role: userInput.role,
      roleTitleArabic: userInput.roleTitleArabic || (isAdmin ? 'المدير العام' : 'محاسب ومراجع'),
      isActive: userInput.isActive ?? true,
      canManageUsers: userInput.canManageUsers ?? isAdmin,
      canAccessTreasury: userInput.canAccessTreasury ?? isAdmin,
      canAccessAuditTrail: userInput.canAccessAuditTrail ?? isAdmin,
      canPostEntries: userInput.canPostEntries ?? isAdmin,
      canEditPostedEntries: userInput.canEditPostedEntries ?? isAdmin,
      canDeleteRecords: userInput.canDeleteRecords ?? isAdmin,
      canAccessCreditFiles: userInput.canAccessCreditFiles ?? isAdmin,
      canAccessTaxReports: userInput.canAccessTaxReports ?? isAdmin,
      permittedClientIds: userInput.permittedClientIds ?? (isAdmin ? undefined : []),
      mustChangePassword: Boolean(userInput.mustChangePassword),
      createdAt: getCairoTimestamp(),
    };
    if (userInput.password) {
      const salt = this.generatePasswordSalt();
      newUser.passwordSalt = salt;
      newUser.passwordHash = this.computeSaltedPasswordHash(userInput.password, salt);
      delete (newUser as any).password;
      this.userPasswords.delete(newUser.id);
    }
    this.state.users.push(newUser);
    this.recordAuditMutation({
      action: 'ADD_USER',
      entityType: 'USER',
      entityId: newUser.id,
      beforeValue: null,
      afterValue: newUser,
      details: `إضافة مستخدم جديد (${newUser.name}) بدور (${newUser.role})`,
    });
    this.saveState('USERS');
    return newUser;
  }

  public updateUser(userId: string, partial: Partial<SystemUser>): SystemUser | undefined {
    const actingUser = this.assertCan('MANAGE_USERS', { allowWithoutClient: true, entityType: 'USER' });
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    const before = { ...this.state.users[idx] };

    // منع المستخدم من رفع دوره أو صلاحياته بنفسه
    if (actingUser.id === userId) {
      const isRoleEscalated = partial.role !== undefined && partial.role !== before.role;
      const isPermEscalated =
        (partial.canManageUsers === true && !before.canManageUsers) ||
        (partial.canPostEntries === true && !before.canPostEntries) ||
        (partial.canEditPostedEntries === true && !before.canEditPostedEntries) ||
        (partial.canDeleteRecords === true && !before.canDeleteRecords) ||
        (partial.canAccessTreasury === true && !before.canAccessTreasury) ||
        (partial.canAccessAuditTrail === true && !before.canAccessAuditTrail) ||
        (Array.isArray(partial.permittedClientIds) &&
          Array.isArray(before.permittedClientIds) &&
          partial.permittedClientIds.some((cid) => !before.permittedClientIds!.includes(cid)));

      if (isRoleEscalated || isPermEscalated) {
        throw new PermissionError(
          'عملية مرفوضة: يُمنع على المستخدم رفع دوره أو توسيع صلاحياته بنفسه.',
          { action: 'MANAGE_USERS', entityType: 'USER' }
        );
      }
    }

    // منع غير الأدمن من ترقية أي مستخدم إلى ADMIN
    if (partial.role === 'ADMIN' && before.role !== 'ADMIN' && actingUser.role !== 'ADMIN') {
      throw new PermissionError(
        'عملية مرفوضة: ترقية مستخدم إلى دور المدير العام (ADMIN) تقتصر على المدير العام فقط.',
        { action: 'MANAGE_USERS', entityType: 'USER' }
      );
    }

    // منع تعطيل أو خفض دور آخر أدمن نشط
    if (before.role === 'ADMIN' && before.isActive !== false) {
      const willNotBeActiveAdmin =
        (partial.role !== undefined && partial.role !== 'ADMIN') || partial.isActive === false;
      if (willNotBeActiveAdmin) {
        const otherActiveAdmins = this.state.users.filter(
          (u) => u.id !== userId && u.role === 'ADMIN' && u.isActive !== false
        );
        if (otherActiveAdmins.length === 0) {
          throw new PermissionError(
            'عملية مرفوضة: لا يمكن تعطيل أو خفض دور آخر مدير عام (ADMIN) نشط في النظام.',
            { action: 'MANAGE_USERS', entityType: 'USER' }
          );
        }
      }
    }

    this.state.users[idx] = { ...this.state.users[idx], ...partial };
    this.recordAuditMutation({
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: userId,
      beforeValue: before,
      afterValue: this.state.users[idx],
      details: `تعديل صلاحيات/بيانات المستخدم (${before.name})`,
    });
    this.saveState('USERS');
    return this.state.users[idx];
  }

  public deleteUser(userId: string): boolean {
    this.assertCan('MANAGE_USERS', { allowWithoutClient: true, entityType: 'USER' });
    const target = this.state.users.find((u) => u.id === userId);
    if (!target) return false;

    // منع حذف آخر أدمن نشط
    if (target.role === 'ADMIN' && target.isActive !== false) {
      const remainingActiveAdmins = this.state.users.filter(
        (u) => u.id !== userId && u.role === 'ADMIN' && u.isActive !== false
      );
      if (remainingActiveAdmins.length === 0) {
        throw new PermissionError(
          'عملية مرفوضة: يُمنع حذف آخر مدير عام (ADMIN) نشط في النظام.',
          { action: 'MANAGE_USERS', entityType: 'USER' }
        );
      }
    }

    const before = this.state.users.length;
    this.state.users = this.state.users.filter((u) => u.id !== userId);
    this.userPasswords.delete(userId);
    this.recordAuditMutation({
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: userId,
      beforeValue: target,
      afterValue: null,
      details: `حذف المستخدم (${target.name})`,
    });
    this.saveState('USERS');
    return this.state.users.length < before;
  }

  public changeUserPassword(userId: string, newPasswordPlain: string): { success: boolean; message: string } {
    this.assertCan('MANAGE_USERS', { allowWithoutClient: true, entityType: 'USER' });
    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      return { success: false, message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' };
    }
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'المستخدم غير موجود' };
    const before = { ...user };
    user.mustChangePassword = false;
    const salt = this.generatePasswordSalt();
    user.passwordSalt = salt;
    user.passwordHash = this.computeSaltedPasswordHash(newPasswordPlain, salt);
    user.failedLoginAttempts = 0;
    user.lockoutCount = 0;
    user.lockedUntil = null;
    delete (user as any).password;
    this.userPasswords.delete(userId);
    this.recordAuditMutation({
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: userId,
      beforeValue: { mustChangePassword: before.mustChangePassword },
      afterValue: { mustChangePassword: false },
      details: `تغيير كلمة المرور للمستخدم (${user.name}) وتحديث البصمة المملحة`,
    });
    this.saveState('USERS');
    return { success: true, message: 'تم تحديث كلمة المرور بنجاح' };
  }

  public mergeRemoteState(remotePartial: Partial<DatabaseState>): void {
    const existingMustChangeMap = new Map<string, boolean>();
    for (const u of this.state.users || []) {
      if (u.mustChangePassword) {
        existingMustChangeMap.set(u.id, true);
        if (u.email) existingMustChangeMap.set(u.email.toLowerCase(), true);
      }
    }

    // Preserve append-only auditLogs if remotePartial tries to wipe them
    const preservedAuditLogs =
      Array.isArray(remotePartial.auditLogs) && remotePartial.auditLogs.length >= (this.state.auditLogs?.length || 0)
        ? remotePartial.auditLogs
        : this.state.auditLogs;

    this.state = {
      ...this.state,
      ...remotePartial,
      auditLogs: preservedAuditLogs,
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
    this.migrateMultiEntityState(this.state);
    this.saveState('ALL');
  }

  // =========================================================================
  // Backup Export / Import & Production Reset
  // =========================================================================
  public async exportFullBackupJson(options?: {
    includeTaxSecrets?: boolean;
    encryptPassword?: string;
  }): Promise<string> {
    this.assertCan('EXPORT_BACKUP', { requireAdmin: true, allowWithoutClient: true, entityType: 'BACKUP' });

    // 1. التطهير الأمني للضرائب: لا يحتوي بيانات بوابات الضرائب إلا بخيار صريح مشفر بكلمة مرور
    const isEncrypted = Boolean(options?.encryptPassword && options.encryptPassword.trim().length >= 6);
    const sanitized = sanitizeStateForBackup(this.state, {
      includeTaxSecrets: options?.includeTaxSecrets,
      isEncrypted,
    });

    const exportMetadata = {
      systemVersion: '2.0.0',
      exportedAt: getCairoTimestamp(),
      clientsCount: this.state.clients.length,
      entriesCount: this.state.journalEntries.length,
      hasTaxSecrets: Boolean(options?.includeTaxSecrets && isEncrypted),
    };

    let resultString: string;
    if (isEncrypted && options?.encryptPassword) {
      const encryptedPkg = await encryptBackupData(sanitized, options.encryptPassword, {
        includeTaxSecrets: options?.includeTaxSecrets,
        metadata: exportMetadata,
      });
      resultString = JSON.stringify(encryptedPkg, null, 2);
    } else {
      resultString = JSON.stringify(
        {
          mgBackupType: 'FULL_BACKUP',
          version: 2,
          schema: 'MG_ACCOUNTING_v2',
          ...exportMetadata,
          data: sanitized,
        },
        null,
        2
      );
    }

    this.logAudit({
      action: 'EXPORT_FULL_BACKUP',
      entityType: 'BACKUP',
      beforeValue: { clientsCount: this.state.clients.length, entriesCount: this.state.journalEntries.length },
      afterValue: {
        exportedAt: getCairoTimestamp(),
        isEncrypted,
        hasTaxSecrets: Boolean(options?.includeTaxSecrets && isEncrypted),
      },
      details: isEncrypted
        ? 'تصدير نسخة احتياطية كاملة مشفرة بكلمة مرور AES-GCM'
        : 'تصدير نسخة احتياطية كاملة (بدون بيانات بوابات الضرائب)',
    });

    return resultString;
  }

  public async restoreFullBackupJson(
    payloadOrText: string | object,
    options?: {
      password?: string;
      importUsersAndPermissions?: boolean;
      confirmAdminUserImport?: boolean;
      reason?: string;
    }
  ): Promise<{ success: boolean; message: string; clientsRestored: number; entriesRestored: number }> {
    const adminUser = this.assertCan('IMPORT_BACKUP', { requireAdmin: true, allowWithoutClient: true, entityType: 'BACKUP' });

    // 1. قبل الاستبدال: أخذ نسخة احتياطية تلقائية للطوارئ وحفظها في التخزين
    const autoSnapshot = JSON.stringify(this.state);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mg_backup_auto_pre_restore_snapshot', autoSnapshot);
        localStorage.setItem('mg_backup_auto_pre_restore_time', getCairoTimestamp());
      }
    } catch {
      // ignore storage quota errors
    }

    let rawData: any;
    if (typeof payloadOrText === 'string') {
      try {
        rawData = JSON.parse(payloadOrText);
      } catch {
        throw new Error('ملف النسخة الاحتياطية غير صالح: النص لا يمثل تنسيق JSON صحيح.');
      }
    } else {
      rawData = payloadOrText;
    }

    // 2. التحقق مما إذا كانت الحزمة مشفرة وفك تشفيرها عبر WebCrypto AES-GCM
    if (rawData && rawData.mgBackupType === 'ENCRYPTED_BACKUP') {
      if (!options?.password) {
        throw new Error('النسخة الاحتياطية مشفرة بكلمة مرور (AES-GCM). يرجى إدخال كلمة المرور لفك التشفير والاستعادة.');
      }
      const decryptedJson = await decryptBackupData(rawData, options.password);
      rawData = JSON.parse(decryptedJson);
    }

    // 3. التحقق من الـ Schema والـ Version
    if (rawData && typeof rawData === 'object') {
      if (rawData.schema && typeof rawData.schema === 'string' && !rawData.schema.toUpperCase().startsWith('MG_ACCOUNTING')) {
        throw new Error(`مخطط النسخة الاحتياطية (${rawData.schema}) غير متوافق مع نظام الحسابات المعتمد.`);
      }
      if (rawData.version !== undefined && (typeof rawData.version !== 'number' || rawData.version < 1 || rawData.version > 20)) {
        throw new Error(`إصدار النسخة الاحتياطية (${rawData.version}) غير متوافق.`);
      }
    }

    let stateToRestore: any = null;
    if (rawData && typeof rawData === 'object') {
      if (rawData.data && typeof rawData.data === 'object' && Array.isArray(rawData.data.clients)) {
        stateToRestore = rawData.data;
      } else if (
        Array.isArray(rawData.clients) &&
        (Array.isArray(rawData.accounts) || Array.isArray(rawData.journalEntries))
      ) {
        stateToRestore = rawData;
      }
    }

    if (!stateToRestore || !Array.isArray(stateToRestore.clients) || !Array.isArray(stateToRestore.accounts)) {
      throw new Error(
        'ملف النسخة الاحتياطية غير صالح: فشل التحقق من هيكل البيانات (Schema) أو إصدار النسخة الاحتياطية غير متوافق.'
      );
    }

    const beforeSummary = {
      clientsCount: this.state.clients.length,
      journalEntriesCount: this.state.journalEntries.length,
      accountsCount: this.state.accounts.length,
    };

    // 4. حماية المستخدمين والصلاحيات: لا تسمح باستيراد مستخدمين أو صلاحيات إلا بصلاحية ADMIN وتأكيد صريح
    if (options?.importUsersAndPermissions) {
      if (adminUser.role !== 'ADMIN') {
        throw new Error('رفض استيراد المستخدمين والصلاحيات: هذه العملية تتطلب صلاحية المدير العام (ADMIN).');
      }
      if (!options?.confirmAdminUserImport) {
        throw new Error('رفض استيراد المستخدمين والصلاحيات: يلزم تقديم تأكيد صريح من المدير العام.');
      }
    }

    const currentUsers = [...(this.state.users || [])];
    const currentActiveUserId = this.state.currentUserId;
    const allowUserImport = Boolean(
      options?.importUsersAndPermissions && options?.confirmAdminUserImport && adminUser.role === 'ADMIN'
    );

    const nextUsers =
      allowUserImport && Array.isArray(stateToRestore.users) && stateToRestore.users.length > 0
        ? stateToRestore.users
        : currentUsers;

    // الحفاظ على سجل المراجعة التراكمي (Append-Only)
    const preservedAuditLogs =
      Array.isArray(stateToRestore.auditLogs) && stateToRestore.auditLogs.length >= (this.state.auditLogs?.length || 0)
        ? stateToRestore.auditLogs
        : [...(this.state.auditLogs || [])];

    // 5. استعادة نظيفة (RESTORE وليست مجرد MERGE)
    this.state = {
      ...this.createDefaultState(),
      ...stateToRestore,
      users: nextUsers,
      currentUserId: currentActiveUserId,
      auditLogs: preservedAuditLogs,
    };

    this.migrateMultiEntityState(this.state);
    reconcileFeeCollectionsAndTreasury(this.state);

    const restoreReason = options?.reason?.trim() || 'استعادة نسخة احتياطية كاملة (Restore)';

    this.logAudit({
      action: 'RESTORE_BACKUP',
      entityType: 'BACKUP',
      beforeValue: beforeSummary,
      afterValue: {
        clientsCount: this.state.clients.length,
        journalEntriesCount: this.state.journalEntries.length,
        accountsCount: this.state.accounts.length,
        usersImported: allowUserImport,
      },
      reason: restoreReason,
      details: `استعادة قاعدة البيانات بالكامل مع أخذ نسخة طوارئ تلقائية استباقية - السبب: ${restoreReason}`,
    });

    this.saveState('ALL');

    return {
      success: true,
      message: `تمت استعادة النسخة الاحتياطية بنجاح بنظام Restore بعدد (${this.state.clients.length}) منشأة و (${this.state.journalEntries.length}) قيد.`,
      clientsRestored: this.state.clients.length,
      entriesRestored: this.state.journalEntries.length,
    };
  }

  public async importFullBackupJson(
    jsonText: string,
    options?: {
      password?: string;
      importUsersAndPermissions?: boolean;
      confirmAdminUserImport?: boolean;
      reason?: string;
    }
  ): Promise<boolean> {
    this.assertCan('IMPORT_BACKUP', { requireAdmin: true, allowWithoutClient: true, entityType: 'BACKUP' });
    try {
      const res = await this.restoreFullBackupJson(jsonText, options);
      return res.success;
    } catch {
      return false;
    }
  }

  public exportClientIsolatedBackup(clientId: string): string {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    this.assertCan('EXPORT_BACKUP', { clientId: resolvedClientId, entityType: 'BACKUP' });
    this.assertNoUnassignedEntriesForReport();

    const client = this.state.clients.find((c) => c.id === resolvedClientId);
    const targetFiscalYear =
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      getCairoCurrentYear();
    const clientOpeningMap = this.state.openingBalances?.[resolvedClientId] || {};

    const payload = {
      exportedAt: getCairoTimestamp(),
      client,
      fiscalYear: targetFiscalYear,
      fiscalYearBounds: this.getClientFiscalYearBounds(resolvedClientId, targetFiscalYear),
      accounts: this.getClientAccounts(resolvedClientId, targetFiscalYear),
      openingBalances: {
        [resolvedClientId]: clientOpeningMap,
      },
      journalEntries: this.state.journalEntries.filter((j) => j.clientId === resolvedClientId),
      invoices: this.state.invoices.filter((i) => i.clientId === resolvedClientId),
      taxDeclarations: this.state.taxDeclarations.filter((t) => t.clientId === resolvedClientId),
      treasuryTransactions: this.state.treasuryTransactions.filter((t) => t.clientId === resolvedClientId),
      feeAgreements: this.state.feeAgreements.filter((a) => a.clientId === resolvedClientId),
      feeCollections: this.state.feeCollections.filter((c) => c.clientId === resolvedClientId),
      openItems: this.state.openItems.filter((o) => o.clientId === resolvedClientId),
      approvedStatements: this.state.approvedStatements.filter((s) => s.clientId === resolvedClientId),
      fixedAssets: this.state.fixedAssets.filter((a) => a.clientId === resolvedClientId),
    };
    this.recordAuditMutation({
      action: 'EXPORT_CLIENT_BACKUP',
      entityType: 'BACKUP',
      entityId: resolvedClientId,
      clientId: resolvedClientId,
      beforeValue: { clientId: resolvedClientId },
      afterValue: {
        exportedAt: payload.exportedAt,
        accountsCount: payload.accounts.length,
        entriesCount: payload.journalEntries.length,
      },
      details: `تصدير نسخة احتياطية معزولة للعميل (${client?.name || resolvedClientId})`,
    });
    return JSON.stringify(payload, null, 2);
  }

  public async resetForProduction(options?: {
    passcode?: string;
    confirmationText?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; backupJson?: string }> {
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true, entityType: 'SYSTEM' });
    if (options?.confirmationText && options.confirmationText !== 'تفريغ' && options.confirmationText !== 'RESET') {
      return { success: false, message: 'كلمة التأكيد غير صحيحة.' };
    }

    const beforeSnapshot = {
      clientsCount: this.state.clients.length,
      journalEntriesCount: this.state.journalEntries.length,
      invoicesCount: this.state.invoices.length,
    };
    const backupJson = JSON.stringify(this.state, null, 2);

    this.state.accounts = [];
    this.state.openingBalances = {};
    this.state.clientOpeningBalances = [];
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

    this.recordAuditMutation({
      action: 'RESET_FOR_PRODUCTION',
      entityType: 'SYSTEM',
      beforeValue: beforeSnapshot,
      afterValue: { clientsCount: 0, journalEntriesCount: 0, invoicesCount: 0 },
      reason: options?.reason || 'تهيئة النظام للعمل الفعلي',
      details: 'تصفير البيانات التجريبية وتهيئة النظام للعمل الفعلي',
    });

    this.saveState('ALL');
    return {
      success: true,
      message: 'تم تصفير البيانات التجريبية وتهيئة النظام للعمل الفعلي بنجاح.',
      backupJson,
    };
  }

  public resetToDemoData(options?: {
    reason?: string;
    confirmReset?: boolean;
    doubleConfirmText?: string;
  }): boolean {
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true, entityType: 'SYSTEM' });
    const cleanReason = options?.reason?.trim();
    if (!cleanReason) {
      throw new Error('عملية مرفوضة: استعادة البيانات التجريبية تتطلب إدخال سبب مكتوب.');
    }

    const hasRealData =
      this.state.journalEntries.length > 0 ||
      this.state.invoices.length > 0 ||
      this.state.taxDeclarations.length > 0 ||
      this.state.approvedStatements.length > 0 ||
      this.state.treasuryTransactions.length > 0 ||
      this.state.clients.some((c) => c.id !== 'client-1');

    let autoBackupJson: string | undefined;
    if (hasRealData) {
      const isDoubleConfirmed =
        options?.confirmReset === true &&
        (options?.doubleConfirmText === 'تأكيد المسح' || options?.doubleConfirmText === 'CONFIRM_RESET');
      if (!isDoubleConfirmed) {
        throw new Error(
          'عملية مرفوضة: توجد بيانات محاسبية حقيقية مسجلة. يلزم تأكيد مزدوج (confirmReset: true و doubleConfirmText: "تأكيد المسح" أو "CONFIRM_RESET") قبل استعادة البيانات التجريبية.'
        );
      }
      // تصدير نسخة احتياطية آليًا قبل إعادة الضبط
      autoBackupJson = JSON.stringify(this.state, null, 2);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mg_auto_backup_before_demo_reset', autoBackupJson);
        }
      } catch {
        // ignore quota during emergency pre-reset snapshot
      }
      this.recordAuditMutation({
        action: 'AUTO_EXPORT_BACKUP_BEFORE_DEMO_RESET',
        entityType: 'BACKUP',
        beforeValue: {
          clientsCount: this.state.clients.length,
          journalEntriesCount: this.state.journalEntries.length,
          invoicesCount: this.state.invoices.length,
        },
        afterValue: { autoBackupSaved: true, backupLength: autoBackupJson.length },
        reason: cleanReason,
        details: 'تصدير نسخة احتياطية تلقائية قبل إعادة الضبط إلى البيانات التجريبية',
      });
    }

    const preservedAuditLogs = [...(this.state.auditLogs || [])];
    const beforeSummary = {
      clientsCount: this.state.clients.length,
      journalEntriesCount: this.state.journalEntries.length,
      invoicesCount: this.state.invoices.length,
    };
    this.state = this.createDefaultState();
    this.state.auditLogs = preservedAuditLogs;
    this.recordAuditMutation({
      action: 'RESET_TO_DEMO_DATA',
      entityType: 'SYSTEM',
      beforeValue: beforeSummary,
      afterValue: {
        clientsCount: this.state.clients.length,
        journalEntriesCount: this.state.journalEntries.length,
        autoBackupExported: Boolean(autoBackupJson),
      },
      reason: cleanReason,
      details: `إعادة ضبط النظام إلى البيانات التجريبية مع الحفاظ على سجل المراجعة - السبب: ${cleanReason}`,
    });
    this.saveState('ALL');
    return true;
  }

  // =========================================================================
  // Permission Enforcement, Two-Level Period Locking & Append-Only SHA-256 Audit Chain
  // =========================================================================
  public assertCan(
    action: AccessGuardAction,
    ctx?: AccessGuardContext | string,
    userOverride?: SystemUser | null
  ): SystemUser {
    const context: AccessGuardContext =
      typeof ctx === 'string'
        ? { clientId: ctx, activeClientId: this.state.activeClientContext?.clientId }
        : { ...(ctx || {}), activeClientId: this.state.activeClientContext?.clientId };
    return guardAssertCan(action, context, userOverride !== undefined ? userOverride : this.getCurrentUser());
  }

  public assertPermission(
    action: PermissionAction,
    ctx?: PermissionContext | string
  ): SystemUser {
    return this.assertCan(action, ctx);
  }

  private resolveMandatoryClientId(explicitClientId?: string): string {
    const resolved = explicitClientId || this.state.activeClientContext?.clientId || '';
    if (!resolved.trim()) {
      throw new Error('ممنوع تسجيل قيد أو حركة أو حساب بدون تحديد العميل (clientId إلزامي).');
    }
    return resolved.trim();
  }

  private normalizeClientAndYear(
    arg1: string | number,
    arg2?: string | number
  ): { clientId: string; fiscalYear: number; periodKey: string; level: 'SUB_PERIOD' | 'ANNUAL' } {
    if (typeof arg1 === 'number') {
      const clientId =
        typeof arg2 === 'string' && arg2.trim()
          ? arg2.trim()
          : this.resolveMandatoryClientId();
      return { clientId, fiscalYear: arg1, periodKey: String(arg1), level: 'ANNUAL' };
    }

    const arg1Str = String(arg1 || '').trim();
    const arg2Str = arg2 !== undefined ? String(arg2).trim() : '';

    // Check if arg1 is a date/period string like '2026', '2026-03', '2026-Q1', '2026-03-15' and arg2 is clientId
    const isArg1DateOrPeriod = /^\d{4}(-\d{2}(-\d{2})?|-Q[1-4])?$/i.test(arg1Str);
    const isArg2DateOrPeriod = /^\d{4}(-\d{2}(-\d{2})?|-Q[1-4])?$/i.test(arg2Str);

    let clientId: string;
    let rawPeriod: string;

    if (isArg1DateOrPeriod && !isArg2DateOrPeriod) {
      clientId = this.resolveMandatoryClientId(arg2Str || undefined);
      rawPeriod = arg1Str.toUpperCase();
    } else {
      clientId = this.resolveMandatoryClientId(arg1Str);
      rawPeriod =
        arg2Str
          ? arg2Str.toUpperCase()
          : String(this.state.activeClientContext?.selectedFiscalYear || getCairoCurrentYear());
    }

    const yearMatch = rawPeriod.match(/^(\d{4})/);
    const fiscalYear = yearMatch
      ? parseInt(yearMatch[1], 10)
      : this.state.activeClientContext?.selectedFiscalYear || getCairoCurrentYear();

    if (/^\d{4}-Q[1-4]$/i.test(rawPeriod) || /^\d{4}-\d{2}$/.test(rawPeriod)) {
      return {
        clientId,
        fiscalYear,
        periodKey: rawPeriod.toUpperCase(),
        level: 'SUB_PERIOD',
      };
    }

    return {
      clientId,
      fiscalYear,
      periodKey: String(fiscalYear),
      level: 'ANNUAL',
    };
  }

  private extractYearFromDate(dateStr?: string, fallbackYear?: number): number {
    if (dateStr && /^\d{4}/.test(dateStr.trim())) {
      const parsed = parseInt(dateStr.trim().slice(0, 4), 10);
      if (!isNaN(parsed) && parsed > 1900 && parsed < 2200) {
        return parsed;
      }
    }
    return fallbackYear || this.state.activeClientContext?.selectedFiscalYear || getCairoCurrentYear();
  }

  private resolvePeriodLockDetails(
    clientId: string,
    dateOrPeriod?: string | number,
    explicitFiscalYear?: number
  ): { isLocked: boolean; periodKey: string; periodLabel: string; level?: 'SUB_PERIOD' | 'ANNUAL' } {
    const locks = this.state.fiscalPeriodLocks || {};
    const rawStr = dateOrPeriod !== undefined ? String(dateOrPeriod).trim().toUpperCase() : '';

    const checkLockKey = (pKey: string): FiscalPeriodLockRecord | undefined => {
      const k1 = `${clientId}_${pKey}`;
      const k2 = `${pKey}_${clientId}`;
      if (locks[k1]?.isLocked) return locks[k1];
      if (locks[k2]?.isLocked) return locks[k2];
      if ((locks as Record<string, FiscalPeriodLockRecord>)[pKey]?.isLocked && (!locks[pKey].clientId || locks[pKey].clientId === clientId)) {
        return locks[pKey];
      }
      return undefined;
    };

    const year = this.extractYearFromDate(rawStr, explicitFiscalYear);
    const yearsToCheck = new Set<number>([year]);
    if (explicitFiscalYear && explicitFiscalYear !== year) {
      yearsToCheck.add(explicitFiscalYear);
    }

    // 1. فحص المستوى الثاني: قفل السنة المالية الكاملة (ANNUAL)
    for (const yr of yearsToCheck) {
      const annualRec = checkLockKey(String(yr));
      if (annualRec?.isLocked) {
        return {
          isLocked: true,
          periodKey: String(yr),
          periodLabel: `السنة المالية (${yr})`,
          level: 'ANNUAL',
        };
      }
    }

    // 2. إذا كان المدخل ربع سنة مباشرة مثل 2026-Q1
    const quarterDirectMatch = rawStr.match(/^(\d{4})-Q([1-4])$/i);
    if (quarterDirectMatch) {
      const qKey = `${quarterDirectMatch[1]}-Q${quarterDirectMatch[2]}`;
      const qRec = checkLockKey(qKey);
      if (qRec?.isLocked) {
        return {
          isLocked: true,
          periodKey: qKey,
          periodLabel: `الفترة الربع سنوية (${qKey})`,
          level: 'SUB_PERIOD',
        };
      }
    }

    // 3. إذا كان المدخل تاريخاً (YYYY-MM-DD) أو شهراً (YYYY-MM): نفحص قفل الربع وقفل الشهر
    const monthMatch = rawStr.match(/^(\d{4})-(\d{2})/);
    if (monthMatch) {
      const yrStr = monthMatch[1];
      const moStr = monthMatch[2];
      const moNum = parseInt(moStr, 10);
      if (moNum >= 1 && moNum <= 12) {
        const quarterNum = Math.ceil(moNum / 3);
        const quarterKey = `${yrStr}-Q${quarterNum}`;
        const monthKey = `${yrStr}-${moStr}`;

        const qRec = checkLockKey(quarterKey);
        if (qRec?.isLocked) {
          return {
            isLocked: true,
            periodKey: quarterKey,
            periodLabel: `الفترة الربع سنوية (${quarterKey})`,
            level: 'SUB_PERIOD',
          };
        }

        const mRec = checkLockKey(monthKey);
        if (mRec?.isLocked) {
          return {
            isLocked: true,
            periodKey: monthKey,
            periodLabel: `الفترة الشهرية (${monthKey})`,
            level: 'SUB_PERIOD',
          };
        }
      }
    }

    return {
      isLocked: false,
      periodKey: rawStr || String(year),
      periodLabel: rawStr || String(year),
    };
  }

  public getPeriodLockDetails(
    clientId: string,
    dateOrPeriod?: string | number,
    explicitFiscalYear?: number
  ): { locked: boolean; isLocked: boolean; periodKey: string; periodLabel: string; level?: 'SUB_PERIOD' | 'ANNUAL' } {
    if (!clientId || !String(clientId).trim()) {
      return {
        locked: false,
        isLocked: false,
        periodKey: String(dateOrPeriod || explicitFiscalYear || ''),
        periodLabel: String(dateOrPeriod || explicitFiscalYear || ''),
      };
    }
    const details = this.resolvePeriodLockDetails(clientId, dateOrPeriod, explicitFiscalYear);
    return {
      ...details,
      locked: details.isLocked,
    };
  }

  /**
   * فحص قفل الفترة على مستويين (شهر/ربع سنة + سنة مالية كاملة)
   * يدعم الاستدعاء بـ isPeriodLocked(clientId, dateOrPeriod, explicitFiscalYear) أو isPeriodLocked(fiscalYear, clientId)
   */
  public isPeriodLocked(arg1: number | string, arg2?: string | number, explicitFiscalYear?: number): boolean {
    if (typeof arg1 === 'number') {
      const clientId =
        typeof arg2 === 'string' && arg2.trim()
          ? arg2.trim()
          : this.resolveMandatoryClientId();
      return this.resolvePeriodLockDetails(clientId, arg1, arg1).isLocked;
    }

    const arg1Str = String(arg1 || '').trim();
    const arg2Str = arg2 !== undefined ? String(arg2).trim() : '';
    const isArg1DateOrPeriod = /^\d{4}(-\d{2}(-\d{2})?|-Q[1-4])?$/i.test(arg1Str);
    const isArg2DateOrPeriod = /^\d{4}(-\d{2}(-\d{2})?|-Q[1-4])?$/i.test(arg2Str);

    if (isArg1DateOrPeriod && !isArg2DateOrPeriod) {
      const clientId = this.resolveMandatoryClientId(arg2Str || undefined);
      return this.resolvePeriodLockDetails(clientId, arg1Str, explicitFiscalYear).isLocked;
    }

    const clientId = this.resolveMandatoryClientId(arg1Str);
    return this.resolvePeriodLockDetails(clientId, arg2 !== undefined ? arg2 : undefined, explicitFiscalYear).isLocked;
  }

  /**
   * قفل فترة محاسبية (شهر YYYY-MM، أو ربع سنة YYYY-Q1..Q4، أو سنة مالية كاملة YYYY)
   */
  public lockFiscalPeriod(
    arg1: string | number,
    arg2?: number | string,
    reason = 'إقفال الفترة المحاسبية'
  ): FiscalPeriodLockRecord {
    const { clientId, fiscalYear, periodKey, level } = this.normalizeClientAndYear(arg1, arg2);
    const user = this.assertCan('POST_ENTRY', { clientId, fiscalYear, entityType: 'FISCAL_PERIOD' });
    if (!this.state.fiscalPeriodLocks) {
      this.state.fiscalPeriodLocks = {};
    }
    const key = `${clientId}_${periodKey}`;
    const before = this.state.fiscalPeriodLocks[key] ? { ...this.state.fiscalPeriodLocks[key] } : null;
    const record: FiscalPeriodLockRecord = {
      clientId,
      fiscalYear,
      periodKey,
      level,
      isLocked: true,
      lockedAt: getCairoTimestamp(),
      lockedBy: user.name,
      reason,
    };
    this.state.fiscalPeriodLocks[key] = record;
    this.logAudit({
      action: level === 'SUB_PERIOD' ? 'LOCK_SUB_PERIOD' : 'LOCK_FISCAL_PERIOD',
      entityType: 'FISCAL_PERIOD',
      entityId: key,
      clientId,
      beforeValue: before,
      afterValue: record,
      reason,
      details: `قفل الفترة المحاسبية (${periodKey}) [${level === 'SUB_PERIOD' ? 'شهر/ربع' : 'سنة مالية'}] للعميل (${clientId})`,
    });
    this.saveState('LOCKS');
    return record;
  }

  // @public-readonly-safe: دالة تفويض فرعية لقفل الفترة المحاسبية (محمية ومفحوصة بالكامل داخل lockFiscalPeriod)
  public lockPeriod(
    clientId: string,
    periodKey: string | number,
    reason = 'إقفال الفترة المحاسبية'
  ): FiscalPeriodLockRecord {
    return this.lockFiscalPeriod(clientId, periodKey, reason);
  }

  // @public-readonly-safe: دالة تفويض فرعية لقفل الفترة الشهرية (محمية ومفحوصة بالكامل داخل lockFiscalPeriod)
  public lockMonthlyPeriod(
    clientId: string,
    fiscalYear: number,
    month: number,
    reason = 'إقفال الفترة الشهرية'
  ): FiscalPeriodLockRecord {
    const cleanMonth = Math.max(1, Math.min(12, Math.floor(Number(month) || 1)));
    const periodKey = `${fiscalYear}-${String(cleanMonth).padStart(2, '0')}`;
    const rec = this.lockFiscalPeriod(clientId, periodKey, reason);
    rec.scope = 'MONTH';
    return rec;
  }

  // @public-readonly-safe: دالة تفويض فرعية لقفل الفترة الربع سنوية (محمية ومفحوصة بالكامل داخل lockFiscalPeriod)
  public lockQuarterlyPeriod(
    clientId: string,
    fiscalYear: number,
    quarter: 1 | 2 | 3 | 4,
    reason = 'إقفال الفترة الربع سنوية'
  ): FiscalPeriodLockRecord {
    const cleanQuarter = Math.max(1, Math.min(4, Math.floor(Number(quarter) || 1))) as 1 | 2 | 3 | 4;
    const periodKey = `${fiscalYear}-Q${cleanQuarter}`;
    const rec = this.lockFiscalPeriod(clientId, periodKey, reason);
    rec.scope = 'QUARTER';
    return rec;
  }

  public unlockFiscalPeriod(
    arg1: string | number,
    arg2: number | string,
    reason?: string
  ): FiscalPeriodLockRecord {
    let clientId: string;
    let fiscalYear: number;
    let periodKey: string;
    let level: 'SUB_PERIOD' | 'ANNUAL';
    let unlockReason = reason;

    if (typeof arg1 === 'number' && typeof arg2 === 'string' && reason === undefined) {
      // Called as unlockFiscalPeriod(2026, 'سبب فتح الفترة')
      clientId = this.resolveMandatoryClientId();
      fiscalYear = arg1;
      periodKey = String(arg1);
      level = 'ANNUAL';
      unlockReason = arg2;
    } else {
      const norm = this.normalizeClientAndYear(arg1, arg2);
      clientId = norm.clientId;
      fiscalYear = norm.fiscalYear;
      periodKey = norm.periodKey;
      level = norm.level;
    }

    const user = this.assertCan('ADMIN', { clientId, fiscalYear, requireAdmin: true, entityType: 'FISCAL_PERIOD' });
    if (!unlockReason || !unlockReason.trim()) {
      throw new Error('عملية مرفوضة: يجب إدخال سبب إلزامي لفتح الفترة المالية المقفولة.');
    }

    // في حالة فتح فترة فرعية (شهر/ربع) بينما السنة المالية نفسها مقفلة، يُرفض فتح الفرعية قبل فتح السنة
    if (level === 'SUB_PERIOD') {
      const annualKey = `${clientId}_${fiscalYear}`;
      if (this.state.fiscalPeriodLocks?.[annualKey]?.isLocked) {
        throw new PeriodLockError(
          `عملية مرفوضة: لا يمكن فتح الفترة الفرعية (${periodKey}) لأن السنة المالية (${fiscalYear}) للعميل (${clientId}) مقفولة بالكامل.`,
          {
            clientId,
            periodKey: String(fiscalYear),
            fiscalYear,
            entityType: 'FISCAL_PERIOD',
          }
        );
      }
    }

    if (!this.state.fiscalPeriodLocks) {
      this.state.fiscalPeriodLocks = {};
    }
    const key = `${clientId}_${periodKey}`;
    const before = this.state.fiscalPeriodLocks[key] ? { ...this.state.fiscalPeriodLocks[key] } : null;
    const record: FiscalPeriodLockRecord = {
      clientId,
      fiscalYear,
      periodKey,
      level,
      isLocked: false,
      lockedAt: before?.lockedAt,
      lockedBy: before?.lockedBy,
      unlockedAt: getCairoTimestamp(),
      unlockedBy: user.name,
      reason: unlockReason.trim(),
    };
    this.state.fiscalPeriodLocks[key] = record;
    // Also clear any legacy year-only key if present
    if (level === 'ANNUAL' && this.state.fiscalPeriodLocks[String(fiscalYear)]) {
      this.state.fiscalPeriodLocks[String(fiscalYear)] = {
        ...this.state.fiscalPeriodLocks[String(fiscalYear)],
        isLocked: false,
      };
    }

    this.logAudit({
      action: level === 'SUB_PERIOD' ? 'UNLOCK_SUB_PERIOD' : 'UNLOCK_FISCAL_PERIOD',
      entityType: 'FISCAL_PERIOD',
      entityId: key,
      clientId,
      beforeValue: before,
      afterValue: record,
      reason: unlockReason.trim(),
      details: `فتح الفترة المحاسبية (${periodKey}) للعميل (${clientId}) - السبب: ${unlockReason.trim()}`,
    });
    this.saveState('LOCKS');
    return record;
  }

  // @public-readonly-safe: دالة تفويض فرعية لفك قفل الفترة المحاسبية (محمية ومفحوصة بالكامل داخل unlockFiscalPeriod)
  public unlockPeriod(
    clientId: string,
    periodKey: string | number,
    reason: string
  ): FiscalPeriodLockRecord {
    return this.unlockFiscalPeriod(clientId, periodKey, reason);
  }

  public assertPeriodOpen(
    clientId: string,
    dateStr?: string,
    explicitFiscalYear?: number,
    entityType = 'JOURNAL_ENTRY'
  ): void {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const lockDetails = this.resolvePeriodLockDetails(resolvedClientId, dateStr, explicitFiscalYear);
    if (lockDetails.isLocked) {
      const yearFromDate = this.extractYearFromDate(dateStr, explicitFiscalYear);
      throw new PeriodLockError(
        `عملية مرفوضة: ${lockDetails.periodLabel} للعميل (${resolvedClientId}) مقفولة ولا يمكن إنشاء أو تعديل أو حذف أو عكس أي قيد أو فاتورة أو حركة خزنة بتاريخ (${dateStr || yearFromDate}) داخل فترة مقفولة.`,
        {
          clientId: resolvedClientId,
          periodKey: lockDetails.periodKey,
          fiscalYear: yearFromDate,
          targetDate: dateStr,
          entityType,
        }
      );
    }
  }

  public logAudit(
    actionOrParams:
      | string
      | {
          action: string;
          entityType: string;
          entityId?: string;
          clientId?: string;
          beforeValue?: unknown;
          afterValue?: unknown;
          reason?: string;
          details: string;
        },
    entityTypeOrDetails?: string,
    details?: string,
    entityId?: string,
    extra?: {
      clientId?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
      reason?: string;
    }
  ): AuditLogEntry {
    const user = this.getCurrentUser();
    if (!Array.isArray(this.state.auditLogs)) {
      this.state.auditLogs = [];
    }

    let action: string;
    let entityType: string;
    let resolvedEntityId: string | undefined;
    let clientId: string | undefined;
    let beforeValueStr: string | undefined;
    let afterValueStr: string | undefined;
    let reason: string | undefined;
    let resolvedDetails: string;

    if (typeof actionOrParams !== 'string') {
      action = actionOrParams.action;
      entityType = actionOrParams.entityType;
      resolvedEntityId = actionOrParams.entityId;
      clientId = actionOrParams.clientId;
      beforeValueStr =
        actionOrParams.beforeValue !== undefined ? JSON.stringify(actionOrParams.beforeValue) : undefined;
      afterValueStr =
        actionOrParams.afterValue !== undefined ? JSON.stringify(actionOrParams.afterValue) : undefined;
      reason = actionOrParams.reason || 'إجراء محاسبي معتمد';
      resolvedDetails = actionOrParams.details;
    } else {
      const isTwoArg = details === undefined;
      action = actionOrParams;
      entityType = isTwoArg ? 'SYSTEM' : entityTypeOrDetails || 'SYSTEM';
      resolvedEntityId = entityId;
      clientId = extra?.clientId;
      beforeValueStr = extra?.beforeValue !== undefined ? JSON.stringify(extra.beforeValue) : undefined;
      afterValueStr = extra?.afterValue !== undefined ? JSON.stringify(extra.afterValue) : undefined;
      reason = extra?.reason || 'إجراء محاسبي معتمد';
      resolvedDetails = (isTwoArg ? entityTypeOrDetails : details) || action;
    }

    const prevHash = this.state.auditLogs.length > 0 ? this.state.auditLogs[0].hash || 'GENESIS' : 'GENESIS';
    const baseEntry: Omit<AuditLogEntry, 'hash' | 'prevHash'> = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getCairoTimestamp(),
      userId: user?.id || 'unauthenticated',
      userName: user?.name || 'غير مسجل',
      userRole: user?.role || 'NONE',
      action,
      entityType,
      entityId: resolvedEntityId,
      clientId,
      beforeValue: beforeValueStr,
      afterValue: afterValueStr,
      reason,
      details: resolvedDetails,
    };

    const hash = computeAuditEntryHash(baseEntry, prevHash);
    const fullEntry: AuditLogEntry = Object.freeze({
      ...baseEntry,
      prevHash,
      hash,
    });

    // Append-only: never truncate (no 1000-item limit) and never delete
    this.state.auditLogs.unshift(fullEntry);
    this.saveState('AUDIT_LOGS');
    return fullEntry;
  }

  public clearAuditLogs(): never {
    throw new PermissionError(
      'عملية مرفوضة: سجل المراجعة (Audit Trail) محمي للإضافة فقط (Append-Only) ولا يُسمح بحذفه أو تصفيره تحت أي ظرف.',
      {
        action: 'DELETE_RECORD',
        entityType: 'AUDIT_TRAIL',
      }
    );
  }

  public recordAuditMutation(params: {
    action: string;
    entityType: string;
    entityId?: string;
    clientId?: string;
    beforeValue?: unknown;
    afterValue?: unknown;
    reason?: string;
    details: string;
  }): AuditLogEntry {
    return this.logAudit(params);
  }

  public verifyAuditChain(): AuditChainVerificationResult {
    const logs = this.state.auditLogs || [];
    if (logs.length === 0) {
      return {
        valid: true,
        totalRecords: 0,
        message: 'سلسلة التدقيق سليمة (لا توجد سجلات بعد).',
      };
    }

    // Determine chronological order (oldest first)
    const isOldestFirst = logs.length > 1 && logs[0]?.prevHash === 'GENESIS' && logs[logs.length - 1]?.prevHash !== 'GENESIS';
    const chronological = isOldestFirst ? [...logs] : [...logs].reverse();

    for (let i = 0; i < chronological.length; i++) {
      const entry = chronological[i];
      const expectedPrevHash = i === 0 ? 'GENESIS' : chronological[i - 1].hash;

      if (!entry.hash || !entry.prevHash || entry.prevHash !== expectedPrevHash) {
        const displayIdx = isOldestFirst ? i : logs.length - 1 - i;
        return {
          valid: false,
          totalRecords: logs.length,
          brokenAtIndex: displayIdx,
          brokenEntryId: entry.id,
          message: `تحذير أمني: تم كشف كسر في ارتباط سلسلة التدقيق عند السجل (${entry.id}).`,
        };
      }

      const recomputedHash = computeAuditEntryHash(entry, expectedPrevHash);
      if (entry.hash !== recomputedHash) {
        const displayIdx = isOldestFirst ? i : logs.length - 1 - i;
        return {
          valid: false,
          totalRecords: logs.length,
          brokenAtIndex: displayIdx,
          brokenEntryId: entry.id,
          message: `تحذير أمني: تم كشف تلاعب بمحتوى سجل المراجعة (${entry.id}) — البصمة الرقمية SHA-256 غير مطابقة.`,
        };
      }
    }

    return {
      valid: true,
      totalRecords: logs.length,
      message: `سلسلة التدقيق SHA-256 موثقة وسليمة بالكامل (${logs.length} سجل).`,
    };
  }

  public convertAmountToEgp(
    amount: number,
    currency: CurrencyCode = 'EGP',
    date: string = getCairoDateString()
  ): { amountEgp: number; exchangeRate: number } {
    if (!currency || currency === 'EGP') {
      return { amountEgp: Number(amount) || 0, exchangeRate: 1 };
    }
    const rate = this.getExchangeRateValue(currency, date);
    return {
      amountEgp: Number(((Number(amount) || 0) * rate).toFixed(2)),
      exchangeRate: rate,
    };
  }

  public getClientFiscalYearBounds(
    clientId?: string | null,
    fiscalYear?: number
  ): {
    fiscalYear: number;
    startDate: string;
    endDate: string;
    start: string;
    end: string;
    endMonth: number;
    endDay: number;
    labelAr: string;
    isCalendarYear: boolean;
  } {
    const resolvedClientId = clientId || this.state.activeClientContext?.clientId || '';
    const client = this.state.clients.find((c) => c.id === resolvedClientId);
    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();

    const monthNamesAr = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];

    const computed = computeClientFiscalYearBounds(client || targetYear, targetYear);
    const endParts = computed.end.split('-').map(Number);
    const eMonth = endParts[1] || 12;
    const eDay = endParts[2] || 31;
    const monthLabel = monthNamesAr[(eMonth - 1 + 12) % 12] || 'ديسمبر';

    return {
      fiscalYear: targetYear,
      startDate: computed.start,
      endDate: computed.end,
      start: computed.start,
      end: computed.end,
      endMonth: eMonth,
      endDay: eDay,
      labelAr: `${eDay} ${monthLabel} ${endParts[0] || targetYear}`,
      isCalendarYear: eMonth === 12 && eDay === 31,
    };
  }

  public resolveClientFiscalYearForDate(clientId: string, dateStr?: string): number {
    const cleanDate = (dateStr || getCairoDateString()).trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
    if (!m) {
      const client = this.state.clients.find((c) => c.id === clientId);
      return (
        this.state.activeClientContext?.selectedFiscalYear ||
        client?.fiscalYear ||
        client?.activeFiscalYear ||
        getCairoCurrentYear()
      );
    }
    const calYear = parseInt(m[1], 10);
    const calMonth = parseInt(m[2], 10);
    const sampleBounds = this.getClientFiscalYearBounds(clientId, calYear);
    const startMonth = parseInt((sampleBounds.startDate || '').slice(5, 7), 10) || 1;
    if (startMonth === 1) {
      return calYear;
    }
    return calMonth >= startMonth ? calYear + 1 : calYear;
  }

  public getClientAccounts(clientId: string, fiscalYear?: number): Account[] {
    if (!clientId || !clientId.trim()) return [];
    const user = this.getCurrentUser();
    if (
      user &&
      user.role !== 'ADMIN' &&
      Array.isArray(user.permittedClientIds) &&
      !user.permittedClientIds.includes(clientId)
    ) {
      throw new Error(`عملية مرفوضة: المستخدم (${user.name}) غير مصرح له بالوصول إلى بيانات العميل (${clientId}).`);
    }

    const client = this.state.clients.find((c) => c.id === clientId);
    let clientAccounts = this.state.accounts.filter((a) => a.clientId === clientId);
    if (clientAccounts.length === 0) {
      const template: ClientActivityTemplate =
        client?.activityTemplate || inferActivityTemplateFromText(client?.industrySector);
      const cloned = getStandardEgyptianChartOfAccounts(clientId, template);
      this.state.accounts.push(...cloned);
      clientAccounts = cloned;
    }

    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();
    const yearKey = String(targetYear);

    const nestedClientYearMap = this.state.openingBalances?.[clientId]?.[yearKey] || {};
    const openingRecords = (this.state.clientOpeningBalances || []).filter(
      (r) => r.clientId === clientId && r.fiscalYear === targetYear
    );
    const legacyOpeningMap = new Map<string, ClientOpeningBalanceRecord>();
    for (const rec of openingRecords) {
      legacyOpeningMap.set(rec.accountId, rec);
      legacyOpeningMap.set(rec.accountCode, rec);
    }

    return clientAccounts.map((acc) => {
      const canonicalId = acc.id;
      const nestedEntry = nestedClientYearMap[canonicalId] || nestedClientYearMap[acc.code];
      const legacyEntry = legacyOpeningMap.get(canonicalId) || legacyOpeningMap.get(acc.code);

      const resolvedDebit = nestedEntry
        ? Number(nestedEntry.debit) || 0
        : legacyEntry
        ? Number(legacyEntry.openingBalanceDebit) || 0
        : 0;
      const resolvedCredit = nestedEntry
        ? Number(nestedEntry.credit) || 0
        : legacyEntry
        ? Number(legacyEntry.openingBalanceCredit) || 0
        : 0;

      return {
        ...acc,
        clientId,
        openingBalanceDebit: resolvedDebit,
        openingBalanceCredit: resolvedCredit,
        currentBalance: Number((resolvedDebit - resolvedCredit).toFixed(2)),
      };
    });
  }

  public setClientAccountOpeningBalance(
    clientId: string,
    fiscalYear: number,
    accountCode: string,
    debit: number,
    credit: number,
    reason = 'تحديث الرصيد الافتتاحي للسنة المالية'
  ): ClientOpeningBalanceRecord & { postRolloverWarning?: string } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('EDIT', { clientId: resolvedClientId });
    this.assertPeriodOpen(resolvedClientId, undefined, fiscalYear);

    if (!Array.isArray(this.state.clientOpeningBalances)) {
      this.state.clientOpeningBalances = [];
    }
    if (!this.state.openingBalances || typeof this.state.openingBalances !== 'object') {
      this.state.openingBalances = {};
    }
    if (!this.state.openingBalances[resolvedClientId]) {
      this.state.openingBalances[resolvedClientId] = {};
    }
    const yearKey = String(fiscalYear);
    if (!this.state.openingBalances[resolvedClientId][yearKey]) {
      this.state.openingBalances[resolvedClientId][yearKey] = {};
    }

    const clientAccs = this.state.accounts.filter((a) => a.clientId === resolvedClientId);
    const targetAcc = clientAccs.find((a) => a.code === accountCode || a.id === accountCode);
    const accountId = targetAcc?.id || `${resolvedClientId}-acc-${accountCode}`;
    const resolvedCode = targetAcc?.code || accountCode;

    const cleanDebit = Math.max(0, Number(debit) || 0);
    const cleanCredit = Math.max(0, Number(credit) || 0);

    const beforeNested = this.state.openingBalances[resolvedClientId][yearKey][accountId] || null;
    this.state.openingBalances[resolvedClientId][yearKey][accountId] = {
      debit: cleanDebit,
      credit: cleanCredit,
    };

    const existingIdx = this.state.clientOpeningBalances.findIndex(
      (r) =>
        r.clientId === resolvedClientId &&
        r.fiscalYear === fiscalYear &&
        (r.accountId === accountId || r.accountCode === resolvedCode)
    );

    const rolloverKey = `${resolvedClientId}:${fiscalYear}`;
    const currentYearRollover = this.state.openingBalanceRollovers?.[rolloverKey];
    const subsequentRollover = Object.values(this.state.openingBalanceRollovers || {}).find(
      (r) => r.clientId === resolvedClientId && r.fromYear === fiscalYear
    );
    const existingRollover = currentYearRollover || subsequentRollover;
    const hasSubsequentRolloverWarning = Boolean(existingRollover);
    let postRolloverWarning: string | undefined;
    if (existingRollover) {
      const fromYr = existingRollover.fromYear;
      const toYr = existingRollover.toYear;
      postRolloverWarning = `تحذير: تم تعديل الرصيد الافتتاحي للحساب (${resolvedCode}) في السنة (${fiscalYear}) بعد ترحيل الأرصدة (من ${fromYr} إلى ${toYr}). سيؤثر هذا التعديل على مطابقة الأرصدة مع إقفال السنة السابقة وعلى الأرصدة التراكمية للسنوات المالية اللاحقة (${toYr} وما بعدها).`;
      existingRollover.postRolloverModifiedAt = getCairoTimestamp();
      existingRollover.postRolloverModifiedBy = user.name;
      existingRollover.postRolloverWarning = postRolloverWarning;
    }

    const record: ClientOpeningBalanceRecord & {
      postRolloverWarning?: string;
      hasSubsequentRolloverWarning?: boolean;
    } = {
      clientId: resolvedClientId,
      fiscalYear,
      accountId,
      accountCode: resolvedCode,
      openingBalanceDebit: cleanDebit,
      openingBalanceCredit: cleanCredit,
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
      hasSubsequentRolloverWarning,
      ...(postRolloverWarning ? { postRolloverWarning } : {}),
    };

    if (existingIdx >= 0) {
      this.state.clientOpeningBalances[existingIdx] = record;
    } else {
      this.state.clientOpeningBalances.push(record);
    }

    // Requirement 2: Keep opening balances off the Account object itself
    const accIdx = this.state.accounts.findIndex(
      (a) => a.clientId === resolvedClientId && (a.id === accountId || a.code === resolvedCode)
    );
    if (accIdx >= 0) {
      this.state.accounts[accIdx] = {
        ...this.state.accounts[accIdx],
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
      };
    }

    this.recordAuditMutation({
      action: postRolloverWarning ? 'UPDATE_OPENING_BALANCE_POST_ROLLOVER' : 'UPDATE_OPENING_BALANCE',
      entityType: 'ACCOUNT',
      entityId: accountId,
      clientId: resolvedClientId,
      beforeValue: beforeNested,
      afterValue: {
        accountId,
        accountCode: resolvedCode,
        debit: cleanDebit,
        credit: cleanCredit,
        fiscalYear,
        ...(postRolloverWarning ? { postRolloverWarning } : {}),
      },
      reason,
      details: postRolloverWarning
        ? `${postRolloverWarning} — السبب: ${reason}`
        : `تعديل الرصيد الافتتاحي للحساب (${resolvedCode}) للعميل (${resolvedClientId}) للسنة (${fiscalYear}) في مصفوفة الأرصدة الافتتاحية المستقلة`,
    });

    this.saveState('ACCOUNTS');
    return record;
  }

  public getOpeningBalanceRolloverMetadata(
    clientId: string,
    fiscalYear: number
  ): OpeningBalanceRolloverMetadata | undefined {
    return this.state.openingBalanceRollovers?.[`${clientId}:${fiscalYear}`];
  }

  /**
   * Alias for previewRolloverClosingBalancesToNextYear (Requirement أ-4).
   */
  public previewRolloverClosingBalances(clientId?: string, closedFiscalYear?: number) {
    return this.previewRolloverClosingBalancesToNextYear(clientId, closedFiscalYear);
  }

  /**
   * Preview of year-end closing balances rollover into next fiscal year before execution (Requirement أ-4).
   */
  public previewRolloverClosingBalancesToNextYear(
    clientId?: string,
    closedFiscalYear?: number
  ): {
    clientId: string;
    fromFiscalYear: number;
    toFiscalYear: number;
    alreadyRolledOver: boolean;
    previousRollover?: OpeningBalanceRolloverMetadata;
    rolledAccountsCount: number;
    totalOpeningDebit: number;
    totalOpeningCredit: number;
    netIncomeTransferred: number;
    previewRows: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      category: Account['category'];
      closingDebit: number;
      closingCredit: number;
      currentNextYearOpeningDebit: number;
      currentNextYearOpeningCredit: number;
    }>;
  } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const clientObj = this.state.clients.find((c) => c.id === resolvedClientId);
    const fromYear =
      closedFiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      clientObj?.fiscalYear ||
      clientObj?.activeFiscalYear ||
      getCairoCurrentYear();
    const toYear = fromYear + 1;

    const bounds = this.getClientFiscalYearBounds(resolvedClientId, fromYear);
    const accountsWithOpening = this.getClientAccounts(resolvedClientId, fromYear);
    const nextYearAccounts = this.getClientAccounts(resolvedClientId, toYear);
    const nextYearMapById = new Map(nextYearAccounts.map((a) => [a.id, a]));

    const clientYearEntries = this.state.journalEntries.filter((e) => {
      if (e.clientId !== resolvedClientId) return false;
      if (!e.isPosted && e.status !== 'POSTED') return false;
      if (e.fiscalYear) return e.fiscalYear === fromYear;
      return e.date >= bounds.startDate && e.date <= bounds.endDate;
    });

    const hasClosingEntry = clientYearEntries.some((e) => e.documentType === 'YEAR_END_CLOSING');

    const movementByAccountId: Record<string, { debit: number; credit: number }> = {};
    const accountByCode = new Map<string, Account>();
    const accountById = new Map<string, Account>();
    for (const acc of accountsWithOpening) {
      accountByCode.set(acc.code, acc);
      accountById.set(acc.id, acc);
      movementByAccountId[acc.id] = { debit: 0, credit: 0 };
    }

    for (const entry of clientYearEntries) {
      for (const line of entry.lines || []) {
        const matched =
          (line.accountId && accountById.get(line.accountId)) ||
          (line.accountCode && accountByCode.get(line.accountCode));
        if (!matched) continue;
        movementByAccountId[matched.id].debit += Number(line.debit) || 0;
        movementByAccountId[matched.id].credit += Number(line.credit) || 0;
      }
    }

    let unclosedNetIncome = 0;
    if (!hasClosingEntry) {
      for (const acc of accountsWithOpening) {
        if (
          acc.category === 'REVENUE' ||
          acc.category === 'REVENUES' ||
          acc.category === 'EXPENSE' ||
          acc.category === 'EXPENSES' ||
          acc.category === 'COGS'
        ) {
          const opDebit = Number(acc.openingBalanceDebit) || 0;
          const opCredit = Number(acc.openingBalanceCredit) || 0;
          const mov = movementByAccountId[acc.id] || { debit: 0, credit: 0 };
          const totalDebit = opDebit + mov.debit;
          const totalCredit = opCredit + mov.credit;
          unclosedNetIncome += totalCredit - totalDebit;
        }
      }
    }

    const retainedEarningsAcc =
      accountsWithOpening.find((a) => a.code === '3102') ||
      accountsWithOpening.find((a) => a.code === '3200') ||
      accountsWithOpening.find((a) => a.category === 'EQUITY' && a.level > 1) ||
      accountsWithOpening.find((a) => a.category === 'EQUITY');

    let rolledAccountsCount = 0;
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;
    const previewRows: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      category: Account['category'];
      closingDebit: number;
      closingCredit: number;
      currentNextYearOpeningDebit: number;
      currentNextYearOpeningCredit: number;
    }> = [];

    for (const acc of accountsWithOpening) {
      if (
        acc.category === 'REVENUE' ||
        acc.category === 'REVENUES' ||
        acc.category === 'EXPENSE' ||
        acc.category === 'EXPENSES' ||
        acc.category === 'COGS'
      ) {
        continue;
      }

      const opDebit = Number(acc.openingBalanceDebit) || 0;
      const opCredit = Number(acc.openingBalanceCredit) || 0;
      const mov = movementByAccountId[acc.id] || { debit: 0, credit: 0 };

      let net = opDebit - opCredit + (mov.debit - mov.credit);
      if (!hasClosingEntry && retainedEarningsAcc && acc.id === retainedEarningsAcc.id) {
        net -= unclosedNetIncome;
      }

      const roundedNet = Math.round(net * 100) / 100;
      const nextDebit = roundedNet > 0.009 ? Number(roundedNet.toFixed(2)) : 0;
      const nextCredit = roundedNet < -0.009 ? Number(Math.abs(roundedNet).toFixed(2)) : 0;

      if (nextDebit > 0 || nextCredit > 0) {
        rolledAccountsCount += 1;
        totalOpeningDebit += nextDebit;
        totalOpeningCredit += nextCredit;
        const nextAcc = nextYearMapById.get(acc.id);
        previewRows.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          category: acc.category,
          closingDebit: nextDebit,
          closingCredit: nextCredit,
          currentNextYearOpeningDebit: Number(nextAcc?.openingBalanceDebit) || 0,
          currentNextYearOpeningCredit: Number(nextAcc?.openingBalanceCredit) || 0,
        });
      }
    }

    const rolloverKey = `${resolvedClientId}:${toYear}`;
    const previousRollover = this.state.openingBalanceRollovers?.[rolloverKey];

    return {
      clientId: resolvedClientId,
      fromFiscalYear: fromYear,
      toFiscalYear: toYear,
      alreadyRolledOver: Boolean(previousRollover),
      previousRollover,
      rolledAccountsCount,
      totalOpeningDebit: Number(totalOpeningDebit.toFixed(2)),
      totalOpeningCredit: Number(totalOpeningCredit.toFixed(2)),
      netIncomeTransferred: Number(unclosedNetIncome.toFixed(2)),
      previewRows,
    };
  }

  /**
   * Requirement أ-4: Rollover year-end closing balances of Balance Sheet accounts (Assets, Liabilities, Equity + Net Profit/Loss)
   * into openingBalances[clientId][closedFiscalYear + 1][accountId].
   * Prevents duplicate execution unless confirmRepeat is true, supports preview, and logs to audit trail.
   */
  public rolloverClosingBalancesToNextYear(
    clientId?: string,
    closedFiscalYear?: number,
    reasonOrOptions?:
      | string
      | boolean
      | { reason?: string; confirmRepeat?: boolean },
    options?: boolean | string | { confirmRepeat?: boolean; reason?: string }
  ): {
    clientId: string;
    fromFiscalYear: number;
    toFiscalYear: number;
    targetYear: number;
    count: number;
    rolledAccountsCount: number;
    totalOpeningDebit: number;
    totalOpeningCredit: number;
    netIncomeTransferred: number;
    previewRows: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      category: Account['category'];
      closingDebit: number;
      closingCredit: number;
      currentNextYearOpeningDebit: number;
      currentNextYearOpeningCredit: number;
    }>;
  } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('POST', { clientId: resolvedClientId });

    const confirmRepeat =
      typeof reasonOrOptions === 'boolean'
        ? reasonOrOptions
        : typeof options === 'boolean'
        ? options
        : typeof reasonOrOptions === 'object' && reasonOrOptions !== null
        ? Boolean(reasonOrOptions.confirmRepeat)
        : typeof options === 'object' && options !== null
        ? Boolean(options.confirmRepeat)
        : false;

    const reason =
      typeof reasonOrOptions === 'string'
        ? reasonOrOptions
        : typeof options === 'string'
        ? options
        : typeof reasonOrOptions === 'object' && reasonOrOptions !== null && reasonOrOptions.reason
        ? reasonOrOptions.reason
        : typeof options === 'object' && options !== null && options.reason
        ? options.reason
        : 'ترحيل أرصدة آخر المدة كأرصدة افتتاحية للسنة المالية التالية بعد الإقفال';

    const preview = this.previewRolloverClosingBalancesToNextYear(resolvedClientId, closedFiscalYear);
    const { fromFiscalYear: fromYear, toFiscalYear: toYear } = preview;

    this.assertPeriodOpen(resolvedClientId, undefined, toYear);

    const rolloverKey = `${resolvedClientId}:${toYear}`;
    if (!this.state.openingBalanceRollovers || typeof this.state.openingBalanceRollovers !== 'object') {
      this.state.openingBalanceRollovers = {};
    }
    const existingRollover = this.state.openingBalanceRollovers[rolloverKey];
    if (existingRollover && !confirmRepeat) {
      throw new Error(
        `تم ترحيل الأرصدة الافتتاحية للسنة (${toYear}) مسبقاً بتاريخ (${existingRollover.rolledOverAt}) بواسطة (${existingRollover.rolledOverBy}). يُمنع تكرار الترحيل إلا بتأكيد صريح (confirmRepeat: true).`
      );
    }

    const accountsWithOpening = this.getClientAccounts(resolvedClientId, fromYear);

    if (!this.state.openingBalances || typeof this.state.openingBalances !== 'object') {
      this.state.openingBalances = {};
    }
    if (!this.state.openingBalances[resolvedClientId]) {
      this.state.openingBalances[resolvedClientId] = {};
    }
    const nextYearKey = String(toYear);
    const beforeNextYearBalances = {
      ...(this.state.openingBalances[resolvedClientId][nextYearKey] || {}),
    };
    const nextYearMap: Record<string, OpeningBalanceEntry> = {};

    if (!Array.isArray(this.state.clientOpeningBalances)) {
      this.state.clientOpeningBalances = [];
    }

    const previewByAccountId = new Map(preview.previewRows.map((r) => [r.accountId, r]));

    for (const acc of accountsWithOpening) {
      const pRow = previewByAccountId.get(acc.id);
      const nextDebit = pRow ? pRow.closingDebit : 0;
      const nextCredit = pRow ? pRow.closingCredit : 0;

      nextYearMap[acc.id] = { debit: nextDebit, credit: nextCredit };

      const existingIdx = this.state.clientOpeningBalances.findIndex(
        (r) => r.clientId === resolvedClientId && r.fiscalYear === toYear && r.accountId === acc.id
      );
      const flatRecord: ClientOpeningBalanceRecord = {
        clientId: resolvedClientId,
        fiscalYear: toYear,
        accountId: acc.id,
        accountCode: acc.code,
        openingBalanceDebit: nextDebit,
        openingBalanceCredit: nextCredit,
        updatedAt: getCairoTimestamp(),
        updatedBy: user.name,
      };
      if (existingIdx >= 0) {
        this.state.clientOpeningBalances[existingIdx] = flatRecord;
      } else if (nextDebit > 0 || nextCredit > 0) {
        this.state.clientOpeningBalances.push(flatRecord);
      }
    }

    this.state.openingBalances[resolvedClientId][nextYearKey] = nextYearMap;
    this.state.openingBalanceRollovers[rolloverKey] = {
      clientId: resolvedClientId,
      fromYear,
      toYear,
      rolledOverAt: getCairoTimestamp(),
      rolledOverBy: user.name,
    };

    this.recordAuditMutation({
      action: existingRollover ? 'RE_ROLLOVER_OPENING_BALANCES_CONFIRMED' : 'ROLLOVER_OPENING_BALANCES_NEXT_YEAR',
      entityType: 'ACCOUNT',
      entityId: `${resolvedClientId}:${fromYear}->${toYear}`,
      clientId: resolvedClientId,
      beforeValue: beforeNextYearBalances,
      afterValue: {
        fromFiscalYear: fromYear,
        toFiscalYear: toYear,
        rolledAccountsCount: preview.rolledAccountsCount,
        totalOpeningDebit: preview.totalOpeningDebit,
        totalOpeningCredit: preview.totalOpeningCredit,
        netIncomeTransferred: preview.netIncomeTransferred,
        confirmRepeat,
      },
      reason,
      details: `ترحيل أرصدة آخر المدة للسنة (${fromYear}) كأرصدة افتتاحية للسنة (${toYear}) للعميل (${resolvedClientId}) بعدد (${preview.rolledAccountsCount}) حساب`,
    });

    this.saveState('ACCOUNTS');

    return {
      clientId: resolvedClientId,
      fromFiscalYear: fromYear,
      toFiscalYear: toYear,
      targetYear: toYear,
      count: preview.rolledAccountsCount,
      rolledAccountsCount: preview.rolledAccountsCount,
      totalOpeningDebit: preview.totalOpeningDebit,
      totalOpeningCredit: preview.totalOpeningCredit,
      netIncomeTransferred: preview.netIncomeTransferred,
      previewRows: preview.previewRows,
    };
  }

  public applyActivityTemplateToClient(
    clientId?: string,
    template: ClientActivityTemplate = 'COMMERCIAL',
    reason = 'تطبيق قالب دليل الحسابات حسب النشاط'
  ): { added: number; template: ClientActivityTemplate; message: string } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });

    const templateAccounts = getStandardEgyptianChartOfAccounts(resolvedClientId, template);
    const addedAccounts: Account[] = [];

    for (const tplAcc of templateAccounts) {
      const exists = this.state.accounts.some(
        (a) => a.clientId === resolvedClientId && a.code === tplAcc.code
      );
      if (!exists) {
        this.state.accounts.push(tplAcc);
        addedAccounts.push(tplAcc);
      }
    }

    const clientIdx = this.state.clients.findIndex((c) => c.id === resolvedClientId);
    if (clientIdx !== -1) {
      this.state.clients[clientIdx].activityTemplate = template;
    }

    this.logAudit({
      action: 'APPLY_ACTIVITY_CHART_TEMPLATE',
      entityType: 'ACCOUNT',
      entityId: `${resolvedClientId}:${template}`,
      clientId: resolvedClientId,
      beforeValue: { countBefore: this.state.accounts.length - addedAccounts.length },
      afterValue: { template, addedCount: addedAccounts.length, codes: addedAccounts.map((a) => a.code) },
      reason,
      details: `تطبيق قالب النشاط (${template}) للعميل (${resolvedClientId}) وإضافة (${addedAccounts.length}) حسابات بأرصدة صفرية`,
    });

    this.saveState('ACCOUNTS');
    this.saveState('CLIENTS');
    return {
      added: addedAccounts.length,
      template,
      message: `تم تطبيق قالب النشاط (${template}) وإضافة ${addedAccounts.length} حساباً جديداً بأرصدة صفرية.`,
    };
  }

  // =========================================================================
  // Requirement 5: Unassigned Journal Entries (Non-Destructive Migration)
  // =========================================================================
  public getUnassignedJournalEntries(): JournalEntry[] {
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    return this.state.journalEntries.filter(
      (j) => !j.clientId || !j.clientId.trim() || !validClientIds.has(j.clientId)
    );
  }

  public getUnassignedInvoices(): Invoice[] {
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    return (this.state.invoices || []).filter(
      (i) => !i.clientId || !i.clientId.trim() || !validClientIds.has(i.clientId)
    );
  }

  public getUnassignedTreasuryTransactions(): OfficeTreasuryTransaction[] {
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    return (this.state.treasuryTransactions || []).filter(
      (t) => !t.clientId || !t.clientId.trim() || !validClientIds.has(t.clientId)
    );
  }

  public getUnassignedFixedAssets(): FixedAsset[] {
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    return (this.state.fixedAssets || []).filter(
      (a) => !a.clientId || !a.clientId.trim() || !validClientIds.has(a.clientId)
    );
  }

  public getUnassignedTaxDeclarations(): TaxDeclarationRecord[] {
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    return (this.state.taxDeclarations || []).filter(
      (d) => !d.clientId || !d.clientId.trim() || !validClientIds.has(d.clientId)
    );
  }

  public getUnassignedRecordsSummary(): {
    journalEntriesCount: number;
    invoicesCount: number;
    treasuryTransactionsCount: number;
    fixedAssetsCount: number;
    taxDeclarationsCount: number;
    totalCount: number;
  } {
    const journalEntriesCount = this.getUnassignedJournalEntries().length;
    const invoicesCount = this.getUnassignedInvoices().length;
    const treasuryTransactionsCount = this.getUnassignedTreasuryTransactions().length;
    const fixedAssetsCount = this.getUnassignedFixedAssets().length;
    const taxDeclarationsCount = this.getUnassignedTaxDeclarations().length;
    return {
      journalEntriesCount,
      invoicesCount,
      treasuryTransactionsCount,
      fixedAssetsCount,
      taxDeclarationsCount,
      totalCount:
        journalEntriesCount +
        invoicesCount +
        treasuryTransactionsCount +
        fixedAssetsCount +
        taxDeclarationsCount,
    };
  }

  public hasUnassignedJournalEntries(): boolean {
    return this.getUnassignedRecordsSummary().totalCount > 0;
  }

  public assertNoUnassignedEntriesForReport(): void {
    const summary = this.getUnassignedRecordsSummary();
    if (summary.totalCount > 0) {
      throw new Error(
        `يوجد (${summary.totalCount}) سجل غير منسوب لعميل محدد (قيود: ${summary.journalEntriesCount}، فواتير: ${summary.invoicesCount}، خزنة: ${summary.treasuryTransactionsCount}، أصول: ${summary.fixedAssetsCount}، إقرارات: ${summary.taxDeclarationsCount}). يرجى الانتقال إلى شاشة "قيود غير منسوبة" ونسبتها إلى المنشأة المختصة قبل استخراج أو تصدير أي تقرير.`
      );
    }
  }

  public assignJournalEntryToClient(
    entryId: string,
    targetClientId: string,
    reason = 'نسب قيد مرحّل من البيانات التاريخية إلى العميل المختص'
  ): JournalEntry {
    if (!targetClientId || !targetClientId.trim()) {
      throw new Error('يجب اختيار المنشأة (العميل) المراد نسب القيد إليها.');
    }
    this.assertCan('EDIT', { clientId: targetClientId });
    const client = this.state.clients.find((c) => c.id === targetClientId);
    if (!client) {
      throw new Error('العميل المختار غير موجود في قاعدة البيانات.');
    }

    const idx = this.state.journalEntries.findIndex((j) => j.id === entryId);
    if (idx === -1) {
      throw new Error('القيد المطلوب نسبه غير موجود.');
    }

    const existing = this.state.journalEntries[idx];
    const before = { ...existing };
    const resolvedFy =
      existing.fiscalYear ||
      this.resolveClientFiscalYearForDate(targetClientId, existing.date) ||
      client.fiscalYear ||
      client.activeFiscalYear ||
      getCairoCurrentYear();
    const clientAccounts = this.getClientAccounts(targetClientId, resolvedFy);
    const accByCode = new Map(clientAccounts.map((a) => [a.code, a]));

    const remappedLines = (existing.lines || []).map((line) => {
      const matchedAcc = line.accountCode ? accByCode.get(line.accountCode) : undefined;
      return {
        ...line,
        accountId: matchedAcc ? matchedAcc.id : line.accountId,
        clientId: targetClientId,
      };
    });

    this.state.journalEntries[idx] = {
      ...existing,
      clientId: targetClientId,
      clientName: client.name,
      fiscalYear: resolvedFy,
      lines: remappedLines,
      updatedAt: getCairoTimestamp(),
    };

    this.recordAuditMutation({
      action: 'ASSIGN_UNASSIGNED_JOURNAL_TO_CLIENT',
      entityType: 'JOURNAL_ENTRY',
      entityId: entryId,
      clientId: targetClientId,
      beforeValue: before,
      afterValue: this.state.journalEntries[idx],
      reason,
      details: `نسب القيد رقم (${existing.entryNumber}) إلى العميل (${client.name}) للسنة المالية (${resolvedFy})`,
    });

    this.saveState('JOURNAL');
    return this.state.journalEntries[idx];
  }

  public assignUnassignedRecordToClient(
    entityType: 'JOURNAL_ENTRY' | 'INVOICE' | 'TREASURY' | 'FIXED_ASSET' | 'TAX_DECLARATION',
    recordId: string,
    targetClientId: string,
    reason = 'نسب سجل غير منسوب إلى المنشأة المختصة'
  ): void {
    if (!targetClientId || !targetClientId.trim()) {
      throw new Error('يجب اختيار المنشأة (العميل) المراد نسب السجل إليها.');
    }
    this.assertCan('EDIT', { clientId: targetClientId });
    const client = this.state.clients.find((c) => c.id === targetClientId);
    if (!client) {
      throw new Error('العميل المختار غير موجود في قاعدة البيانات.');
    }

    if (entityType === 'JOURNAL_ENTRY') {
      this.assignJournalEntryToClient(recordId, targetClientId, reason);
      return;
    }

    if (entityType === 'INVOICE') {
      const idx = this.state.invoices.findIndex((i) => i.id === recordId);
      if (idx === -1) throw new Error('الفاتورة المطلوب نسبها غير موجودة.');
      const before = { ...this.state.invoices[idx] };
      const fy = before.fiscalYear || this.resolveClientFiscalYearForDate(targetClientId, before.date);
      this.state.invoices[idx] = { ...before, clientId: targetClientId, fiscalYear: fy };
      this.recordAuditMutation({
        action: 'ASSIGN_UNASSIGNED_INVOICE_TO_CLIENT',
        entityType: 'INVOICE',
        entityId: recordId,
        clientId: targetClientId,
        beforeValue: before,
        afterValue: this.state.invoices[idx],
        reason,
        details: `نسب الفاتورة رقم (${before.invoiceNumber}) إلى العميل (${client.name})`,
      });
      this.saveState('INVOICES');
      return;
    }

    if (entityType === 'TREASURY') {
      const idx = this.state.treasuryTransactions.findIndex((t) => t.id === recordId);
      if (idx === -1) throw new Error('حركة الخزنة المطلوب نسبها غير موجودة.');
      const before = { ...this.state.treasuryTransactions[idx] };
      const fy = before.fiscalYear || this.resolveClientFiscalYearForDate(targetClientId, before.date);
      this.state.treasuryTransactions[idx] = {
        ...before,
        clientId: targetClientId,
        clientName: client.name,
        fiscalYear: fy,
      };
      this.recordAuditMutation({
        action: 'ASSIGN_UNASSIGNED_TREASURY_TO_CLIENT',
        entityType: 'TREASURY',
        entityId: recordId,
        clientId: targetClientId,
        beforeValue: before,
        afterValue: this.state.treasuryTransactions[idx],
        reason,
        details: `نسب حركة الخزنة (${recordId}) إلى العميل (${client.name})`,
      });
      this.saveState('TREASURY');
      return;
    }

    if (entityType === 'FIXED_ASSET') {
      const idx = this.state.fixedAssets.findIndex((a) => a.id === recordId);
      if (idx === -1) throw new Error('الأصل الثابت المطلوب نسبه غير موجود.');
      const before = { ...this.state.fixedAssets[idx] };
      const fy = before.fiscalYear || this.resolveClientFiscalYearForDate(targetClientId, before.purchaseDate);
      this.state.fixedAssets[idx] = { ...before, clientId: targetClientId, fiscalYear: fy };
      this.recordAuditMutation({
        action: 'ASSIGN_UNASSIGNED_ASSET_TO_CLIENT',
        entityType: 'FIXED_ASSET',
        entityId: recordId,
        clientId: targetClientId,
        beforeValue: before,
        afterValue: this.state.fixedAssets[idx],
        reason,
        details: `نسب الأصل الثابت (${before.name}) إلى العميل (${client.name})`,
      });
      this.saveState('FIXED_ASSETS');
      return;
    }

    if (entityType === 'TAX_DECLARATION') {
      const idx = this.state.taxDeclarations.findIndex((d) => d.id === recordId);
      if (idx === -1) throw new Error('الإقرار الضريبي المطلوب نسبه غير موجود.');
      const before = { ...this.state.taxDeclarations[idx] };
      const fy = before.fiscalYear || this.resolveClientFiscalYearForDate(targetClientId, before.dueDate);
      this.state.taxDeclarations[idx] = { ...before, clientId: targetClientId, fiscalYear: fy };
      this.recordAuditMutation({
        action: 'ASSIGN_UNASSIGNED_TAX_TO_CLIENT',
        entityType: 'TAX_DECLARATION',
        entityId: recordId,
        clientId: targetClientId,
        beforeValue: before,
        afterValue: this.state.taxDeclarations[idx],
        reason,
        details: `نسب الإقرار الضريبي (${before.declarationType}) إلى العميل (${client.name})`,
      });
      this.saveState('TAXES');
    }
  }

  public assignAllUnassignedEntriesToClient(
    targetClientId: string,
    reason = 'نسب كافة السجلات غير المنسوبة إلى المنشأة المختارة'
  ): number {
    if (!targetClientId || !targetClientId.trim()) {
      throw new Error('يجب اختيار المنشأة (العميل) المراد نسب القيود إليها.');
    }
    this.assertCan('EDIT', { clientId: targetClientId });
    let count = 0;
    for (const entry of this.getUnassignedJournalEntries()) {
      this.assignJournalEntryToClient(entry.id, targetClientId, reason);
      count += 1;
    }
    for (const inv of this.getUnassignedInvoices()) {
      this.assignUnassignedRecordToClient('INVOICE', inv.id, targetClientId, reason);
      count += 1;
    }
    for (const tx of this.getUnassignedTreasuryTransactions()) {
      this.assignUnassignedRecordToClient('TREASURY', tx.id, targetClientId, reason);
      count += 1;
    }
    for (const ast of this.getUnassignedFixedAssets()) {
      this.assignUnassignedRecordToClient('FIXED_ASSET', ast.id, targetClientId, reason);
      count += 1;
    }
    for (const decl of this.getUnassignedTaxDeclarations()) {
      this.assignUnassignedRecordToClient('TAX_DECLARATION', decl.id, targetClientId, reason);
      count += 1;
    }
    return count;
  }

  // =========================================================================
  // Accounts & Journal Entries
  // =========================================================================
  public addAccount(acc: Partial<Account> & { code: string; name: string }): Account {
    const resolvedClientId = this.resolveMandatoryClientId(acc.clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });

    const codeClean = String(acc.code || '').trim();
    if (!codeClean) {
      throw new Error('رفض إضافة الحساب: كود الحساب إلزامي ولا يمكن تركه فارغاً.');
    }
    const nameClean = String(acc.name || '').trim();
    if (!nameClean) {
      throw new Error('رفض إضافة الحساب: اسم الحساب إلزامي ولا يمكن تركه فارغاً.');
    }

    // 1. رفض أكواد مكررة داخل نفس العميل
    const duplicateExists = this.state.accounts.some(
      (a) => a.clientId === resolvedClientId && a.code.trim().toLowerCase() === codeClean.toLowerCase()
    );
    if (duplicateExists) {
      throw new Error(
        `رفض إضافة الحساب: كود الحساب (${codeClean}) مكرر بالفعل لدى العميل (${resolvedClientId}). لا يُسمح بتكرار الأكواد لنفس العميل.`
      );
    }

    // 2. التحقق من category و nature
    const validCategories = new Set([
      'ASSETS',
      'LIABILITIES',
      'EQUITY',
      'REVENUE',
      'REVENUES',
      'EXPENSE',
      'EXPENSES',
      'COGS',
    ]);
    const validNatures = new Set(['DEBIT', 'CREDIT']);

    const rawCategory = String(acc.category || 'ASSETS').toUpperCase().trim();
    const rawNature = String(acc.nature || 'DEBIT').toUpperCase().trim();

    if (!validCategories.has(rawCategory)) {
      throw new Error(
        `رفض إضافة الحساب: تصنيف الحساب (${acc.category}) غير صالح. التصنيفات المقبولة: ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSE, COGS.`
      );
    }
    if (!validNatures.has(rawNature)) {
      throw new Error(
        `رفض إضافة الحساب: طبيعة الحساب (${acc.nature}) غير صالحة. الطبيعة المقبولة: DEBIT (مدين) أو CREDIT (دائن).`
      );
    }

    // 3. عدم السماح بتجاوز id أو isSystem
    // الحسابات المضافة أو المستوردة تُعين دائماً بـ isSystem: false وتأخذ معرّفاً فريداً مرتبطاً بالعميل
    const safeId = `${resolvedClientId}-acc-${codeClean}`;
    const idConflict = this.state.accounts.some((a) => a.id === safeId);
    const finalId = idConflict ? `${safeId}-${Date.now().toString(36)}` : safeId;

    const clientObj = this.state.clients.find((c) => c.id === resolvedClientId);
    const targetFiscalYear =
      this.state.activeClientContext?.selectedFiscalYear ||
      clientObj?.fiscalYear ||
      clientObj?.activeFiscalYear ||
      getCairoCurrentYear();
    const initialDebit = Math.max(0, Number(acc.openingBalanceDebit) || 0);
    const initialCredit = Math.max(0, Number(acc.openingBalanceCredit) || 0);

    const created: Account = {
      ...acc,
      id: finalId,
      code: codeClean,
      name: nameClean,
      category: rawCategory as any,
      nature: rawNature as any,
      level: acc.level || (codeClean.length <= 1 ? 1 : codeClean.length === 2 ? 2 : codeClean.length === 3 ? 3 : 4),
      clientId: resolvedClientId,
      isSystem: false, // لا يُسمح بتجاوز isSystem من الاستيراد أو الإدخال
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      currentBalance: 0,
    };
    this.state.accounts.push(created);

    if (initialDebit > 0 || initialCredit > 0) {
      this.setClientAccountOpeningBalance(
        resolvedClientId,
        targetFiscalYear,
        created.code,
        initialDebit,
        initialCredit,
        'تسجيل رصيد افتتاحي عند إنشاء الحساب'
      );
    }

    this.logAudit({
      action: 'CREATE_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: { ...created, openingBalanceDebit: initialDebit, openingBalanceCredit: initialCredit },
      reason: 'إضافة حساب جديد لدليل حسابات العميل',
      details: `إضافة حساب (${created.code} - ${created.name}) للعميل (${resolvedClientId})`,
    });

    this.saveState('ACCOUNTS');
    return {
      ...created,
      openingBalanceDebit: initialDebit,
      openingBalanceCredit: initialCredit,
    };
  }

  public batchImportAccounts(
    accountsList: Array<any>,
    options?: { clientId?: string; reason?: string }
  ): { imported: number; failed: number; errors: string[]; accounts: Account[] } {
    const defaultClientId = this.resolveMandatoryClientId(options?.clientId);
    this.assertCan('EDIT', { clientId: defaultClientId });

    const errors: string[] = [];
    const addedAccounts: Account[] = [];
    const seenCodesInBatch = new Set<string>();

    const validCategories = new Set([
      'ASSETS',
      'LIABILITIES',
      'EQUITY',
      'REVENUE',
      'REVENUES',
      'EXPENSE',
      'EXPENSES',
      'COGS',
    ]);
    const validNatures = new Set(['DEBIT', 'CREDIT']);

    for (let i = 0; i < accountsList.length; i++) {
      const row = accountsList[i];
      const rowNum = i + 1;
      const targetClientId = this.resolveMandatoryClientId(row.clientId || defaultClientId);
      const codeClean = String(row.code || '').trim();
      const nameClean = String(row.name || '').trim();

      if (!codeClean) {
        errors.push(`عنصر (${rowNum}): كود الحساب إلزامي.`);
        continue;
      }
      if (!nameClean) {
        errors.push(`عنصر (${rowNum}) [كود ${codeClean}]: اسم الحساب إلزامي.`);
        continue;
      }

      // 1. فحص التكرار داخل نفس العميل وفي نفس الدفعة المستوردة
      const duplicateKey = `${targetClientId}:::${codeClean.toLowerCase()}`;
      if (seenCodesInBatch.has(duplicateKey)) {
        errors.push(`عنصر (${rowNum}) [كود ${codeClean}]: كود الحساب مكرر في ملف الاستيراد لنفس العميل.`);
        continue;
      }

      const duplicateInDb = this.state.accounts.some(
        (a) => a.clientId === targetClientId && a.code.trim().toLowerCase() === codeClean.toLowerCase()
      );
      if (duplicateInDb) {
        errors.push(`عنصر (${rowNum}) [كود ${codeClean}]: كود الحساب مسجل بالفعل مسبقاً لدى العميل (${targetClientId}).`);
        continue;
      }

      // 2. التحقق من category و nature
      const rawCategory = String(row.category || 'ASSETS').toUpperCase().trim();
      const rawNature = String(row.nature || 'DEBIT').toUpperCase().trim();

      if (!validCategories.has(rawCategory)) {
        errors.push(
          `عنصر (${rowNum}) [كود ${codeClean}]: تصنيف الحساب (${row.category}) غير صالح. التصنيفات المقبولة: ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSE, COGS.`
        );
        continue;
      }
      if (!validNatures.has(rawNature)) {
        errors.push(
          `عنصر (${rowNum}) [كود ${codeClean}]: طبيعة الحساب (${row.nature}) غير صالحة. الطبيعة المقبولة: DEBIT أو CREDIT.`
        );
        continue;
      }

      // 3. عدم السماح بتجاوز id أو isSystem
      const safeId = `${targetClientId}-acc-${codeClean}`;
      const idConflict = this.state.accounts.some((a) => a.id === safeId);
      const finalId = idConflict ? `${safeId}-${Date.now().toString(36)}-${i}` : safeId;

      const initialDebit = Math.max(0, Number(row.openingBalanceDebit) || 0);
      const initialCredit = Math.max(0, Number(row.openingBalanceCredit) || 0);

      const clientObj = this.state.clients.find((c) => c.id === targetClientId);
      const targetFiscalYear =
        this.state.activeClientContext?.selectedFiscalYear ||
        clientObj?.fiscalYear ||
        clientObj?.activeFiscalYear ||
        getCairoCurrentYear();

      const created: Account = {
        id: finalId, // لا يُسمح بتجاوز المعرف المخصص
        code: codeClean,
        name: nameClean,
        category: rawCategory as any,
        nature: rawNature as any,
        level: Number(row.level) || (codeClean.length <= 1 ? 1 : codeClean.length === 2 ? 2 : codeClean.length === 3 ? 3 : 4),
        parentId: row.parentId ? String(row.parentId) : undefined,
        clientId: targetClientId,
        isSystem: false, // لا يُسمح بتجاوز isSystem إطلاقاً
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        currentBalance: 0,
      };

      this.state.accounts.push(created);
      seenCodesInBatch.add(duplicateKey);
      addedAccounts.push(created);

      if (initialDebit > 0 || initialCredit > 0) {
        this.setClientAccountOpeningBalance(
          targetClientId,
          targetFiscalYear,
          created.code,
          initialDebit,
          initialCredit,
          'تسجيل رصيد افتتاحي عند استيراد الحساب'
        );
      }
    }

    if (addedAccounts.length > 0) {
      this.logAudit({
        action: 'BATCH_IMPORT_ACCOUNTS',
        entityType: 'ACCOUNT',
        entityId: defaultClientId,
        clientId: defaultClientId,
        beforeValue: null,
        afterValue: {
          importedCount: addedAccounts.length,
          failedCount: errors.length,
          accountCodes: addedAccounts.map((a) => a.code),
        },
        reason: options?.reason || 'استيراد جماعي لحسابات دليل الحسابات',
        details: `استيراد (${addedAccounts.length}) حساب للعميل (${defaultClientId}) مع تخطي أو رفض (${errors.length}) عنصر غير صالح.`,
      });
      this.saveState('ACCOUNTS');
    }

    return {
      imported: addedAccounts.length,
      failed: errors.length,
      errors,
      accounts: addedAccounts,
    };
  }

  public updateAccount(accountId: string, partial: Partial<Account>, reason = 'تحديث بيانات الحساب'): Account | undefined {
    const idx = this.state.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) {
      this.assertCan('EDIT');
      return undefined;
    }
    const before = { ...this.state.accounts[idx] };
    this.assertCan('EDIT', { clientId: before.clientId });

    this.state.accounts[idx] = {
      ...this.state.accounts[idx],
      ...partial,
      clientId: before.clientId,
    };

    this.logAudit({
      action: 'UPDATE_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: accountId,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.accounts[idx],
      reason,
      details: `تعديل الحساب (${before.code} - ${before.name})`,
    });

    this.saveState('ACCOUNTS');
    return this.state.accounts[idx];
  }

  public deleteAccount(accountId: string, reason = 'حذف حساب غير مستخدم'): boolean {
    const target = this.state.accounts.find((a) => a.id === accountId);
    if (!target) {
      this.assertCan('DELETE');
      return false;
    }
    this.assertCan('DELETE', { clientId: target.clientId });

    // 1. يُرفض لحسابات النظام الأساسية
    if (target.isSystem) {
      throw new Error(
        `رفض حذف الحساب: الحساب (${target.code} - ${target.name}) هو حساب نظام أساسي (isSystem) ولا يمكن حذفه.`
      );
    }

    // 2. يُرفض إذا للحساب حسابات فرعية تندرج تحته
    const hasChildren = this.state.accounts.some(
      (a) =>
        a.clientId === target.clientId &&
        a.id !== target.id &&
        (a.parentId === target.id ||
          a.parentCode === target.code ||
          (a.code.startsWith(target.code) && a.code !== target.code && (target.level || 1) < (a.level || 4)))
    );
    if (hasChildren) {
      throw new Error(
        `رفض حذف الحساب: الحساب (${target.code} - ${target.name}) هو حساب رئيسي تندرج تحته حسابات فرعية. يجب حذف أو نقل الحسابات الفرعية أولاً.`
      );
    }

    // 3. يُرفض إذا للحساب حركات قيود محاسبية
    const isUsedInJournal = this.state.journalEntries.some(
      (j) =>
        (j.clientId === target.clientId || !j.clientId) &&
        (j.lines || []).some(
          (l) =>
            l.accountId === accountId ||
            (l.accountCode === target.code && (!l.clientId || l.clientId === target.clientId))
        )
    );
    if (isUsedInJournal) {
      throw new Error(
        `رفض حذف الحساب: الحساب (${target.code} - ${target.name}) مرتبط بقيود محاسبية مسجلة وله حركات في دفتر اليومية.`
      );
    }

    // 4. يُرفض إذا للحساب أرصدة (رصيد افتتاحي أو رصيد دفتري حالي)
    const clientOpening = this.state.openingBalances?.[target.clientId] || {};
    let hasOpeningInNested = false;
    for (const yearKey of Object.keys(clientOpening)) {
      const yearMap = clientOpening[yearKey] || {};
      const entry = yearMap[target.id] || yearMap[target.code];
      if (entry && ((entry.debit && entry.debit > 0) || (entry.credit && entry.credit > 0))) {
        hasOpeningInNested = true;
        break;
      }
    }

    const legacyOpening = (this.state.clientOpeningBalances || []).some(
      (r) =>
        r.clientId === target.clientId &&
        (r.accountId === target.id || r.accountCode === target.code) &&
        ((r.openingBalanceDebit && r.openingBalanceDebit > 0) ||
          (r.openingBalanceCredit && r.openingBalanceCredit > 0))
    );

    const hasAccountBalance =
      (target.openingBalanceDebit && target.openingBalanceDebit > 0) ||
      (target.openingBalanceCredit && target.openingBalanceCredit > 0) ||
      (target.currentBalance && Math.abs(target.currentBalance) > 0.005);

    if (hasOpeningInNested || legacyOpening || hasAccountBalance) {
      throw new Error(
        `رفض حذف الحساب: الحساب (${target.code} - ${target.name}) يحتوي على رصيد افتتاحي أو رصيد دفتري حالي غير صفري. يجب تصفير الأرصدة أولاً.`
      );
    }

    const before = this.state.accounts.length;
    this.state.accounts = this.state.accounts.filter((a) => a.id !== accountId);

    this.logAudit({
      action: 'DELETE_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: accountId,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      reason,
      details: `حذف الحساب (${target.code} - ${target.name})`,
    });

    this.saveState('ACCOUNTS');
    return this.state.accounts.length < before;
  }

  public applyIndustrialChartOfAccounts(clientId?: string): { added: number; message: string } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });

    const industrialAccounts: Account[] = [
      {
        id: `${resolvedClientId}-acc-ind-1310`,
        code: '1310',
        name: 'مخزون الخامات والمواد الأولية',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
        clientId: resolvedClientId,
      },
      {
        id: `${resolvedClientId}-acc-ind-1320`,
        code: '1320',
        name: 'مخزون الإنتاج تحت التشغيل (WIP)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
        clientId: resolvedClientId,
      },
      {
        id: `${resolvedClientId}-acc-ind-1330`,
        code: '1330',
        name: 'مخزون الإنتاج التام',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
        clientId: resolvedClientId,
      },
    ];
    const addedAccounts: Account[] = [];
    for (const ia of industrialAccounts) {
      if (!this.state.accounts.some((a) => a.clientId === resolvedClientId && a.code === ia.code)) {
        this.state.accounts.push(ia);
        addedAccounts.push(ia);
      }
    }
    this.logAudit({
      action: 'APPLY_INDUSTRIAL_COA',
      entityType: 'ACCOUNT',
      clientId: resolvedClientId,
      beforeValue: { countBefore: this.state.accounts.length - addedAccounts.length },
      afterValue: addedAccounts,
      details: `إدراج ${addedAccounts.length} حسابات تكاليف صناعية للعميل (${resolvedClientId})`,
    });
    this.saveState('ACCOUNTS');
    return { added: addedAccounts.length, message: `تمت إضافة ${addedAccounts.length} حسابات صناعية متخصصة للعميل.` };
  }

  public getClientAccountMapping(clientId?: string): ClientAccountMapping {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    if (!this.state.accountMappings || typeof this.state.accountMappings !== 'object') {
      this.state.accountMappings = {};
    }
    if (!this.state.accountMappings[resolvedClientId]) {
      this.state.accountMappings[resolvedClientId] = createDefaultClientAccountMapping(resolvedClientId);
    }
    return this.state.accountMappings[resolvedClientId];
  }

  public setClientAccountMapping(
    clientId: string,
    mappingUpdate: Partial<Omit<ClientAccountMapping, 'clientId'>>,
    reason = 'تحديث ربط الحسابات المحاسبية للعميل'
  ): ClientAccountMapping {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('EDIT', { clientId: resolvedClientId });

    if (!this.state.accountMappings || typeof this.state.accountMappings !== 'object') {
      this.state.accountMappings = {};
    }
    const existing =
      this.state.accountMappings[resolvedClientId] || createDefaultClientAccountMapping(resolvedClientId);
    const before = { ...existing };

    // Validate that any non-empty mapped accountCode exists for this client, is active, and is analytical
    const clientAccounts = this.state.accounts.filter((a) => a.clientId === resolvedClientId);
    const mappingFields: AccountMappingFieldKey[] = [
      'cashAccountCode',
      'receivablesAccountCode',
      'payablesAccountCode',
      'salesAccountCode',
      'officeServiceRevenueAccountCode',
      'purchasesAccountCode',
      'salesReturnsAccountCode',
      'purchaseReturnsAccountCode',
      'vatOutputAccountCode',
      'vatInputAccountCode',
      'whtReceivableAccountCode',
      'whtPayableAccountCode',
      'tableTaxAccountCode',
      'fxGainAccountCode',
      'fxLossAccountCode',
    ];

    for (const key of mappingFields) {
      if (mappingUpdate[key] !== undefined) {
        const code = String(mappingUpdate[key] || '').trim();
        if (code) {
          const acc = clientAccounts.find((a) => a.code === code);
          if (!acc) {
            throw new Error(
              `رفض ربط الحساب: الكود (${code}) غير موجود في دليل حسابات العميل (${resolvedClientId}).`
            );
          }
          if (acc.isActive === false) {
            throw new Error(`رفض ربط الحساب: الحساب (${acc.code} - ${acc.name}) غير فعّال.`);
          }
          const isSummaryParent =
            (acc.level !== undefined && acc.level <= 2) ||
            clientAccounts.some(
              (child) => child.id !== acc.id && (child.parentId === acc.id || child.parentCode === acc.code)
            );
          if (isSummaryParent) {
            throw new Error(
              `رفض ربط الحساب: الحساب (${acc.code} - ${acc.name}) حساب رئيسي/تجميعي وليس حساباً تحليلياً.`
            );
          }
        }
      }
    }

    const updated: ClientAccountMapping = {
      ...existing,
      ...mappingUpdate,
      clientId: resolvedClientId,
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    this.state.accountMappings[resolvedClientId] = updated;
    this.logAudit({
      action: 'UPDATE_CLIENT_ACCOUNT_MAPPING',
      entityType: 'ACCOUNT_MAPPING',
      entityId: resolvedClientId,
      clientId: resolvedClientId,
      beforeValue: before,
      afterValue: updated,
      reason,
      details: `تحديث ربط الحسابات المحاسبية للعميل (${resolvedClientId})`,
    });
    this.saveState('ACCOUNTS');
    return updated;
  }

  public getClientStatementMapping(clientId?: string): ClientStatementMapping {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    if (!this.state.statementMappings || typeof this.state.statementMappings !== 'object') {
      this.state.statementMappings = {};
    }
    if (!this.state.statementMappings[resolvedClientId]) {
      this.state.statementMappings[resolvedClientId] = createDefaultClientStatementMapping(resolvedClientId);
    }
    return this.state.statementMappings[resolvedClientId];
  }

  public setClientStatementMapping(
    clientId: string,
    mappingUpdate: Partial<ClientStatementMapping>,
    reason = 'تحديث تخطيط بنود القوائم المالية للعميل'
  ): ClientStatementMapping {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('EDIT', { clientId: resolvedClientId });

    if (!this.state.statementMappings || typeof this.state.statementMappings !== 'object') {
      this.state.statementMappings = {};
    }
    const existing = this.getClientStatementMapping(resolvedClientId);
    const before = { ...existing };
    const updated: ClientStatementMapping = {
      ...existing,
      ...mappingUpdate,
    };
    this.state.statementMappings[resolvedClientId] = updated;

    this.logAudit({
      action: 'UPDATE_CLIENT_STATEMENT_MAPPING',
      entityType: 'STATEMENT_MAPPING',
      entityId: resolvedClientId,
      clientId: resolvedClientId,
      beforeValue: before,
      afterValue: updated,
      reason,
      details: `تحديث تخطيط بنود القوائم المالية للعميل (${resolvedClientId})`,
    });

    this.saveState('ACCOUNTS');
    return updated;
  }

  public previewYearEndClosing(
    clientId?: string,
    fiscalYear?: number
  ): {
    canClose: boolean;
    errors: string[];
    warnings: string[];
    isCurrentlyLocked: boolean;
    targetYear: number;
    startDate: string;
    endDate: string;
    draftEntriesCount: number;
    isBalancedBeforeClosing: boolean;
    differenceBeforeClosing: number;
    revenueRows: { accountId: string; accountCode: string; accountName: string; netCredit: number }[];
    expenseRows: { accountId: string; accountCode: string; accountName: string; netDebit: number }[];
    totalRevenues: number;
    totalExpenses: number;
    netIncome: number;
    isProfit: boolean;
    incomeSummaryAccount: Account | null;
    retainedEarningsAccount: Account | null;
    proposedClosingEntryLines: JournalEntryLine[];
    proposedRetainedEarningsLines: JournalEntryLine[];
  } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const client = this.state.clients.find((c) => c.id === resolvedClientId);
    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();

    const bounds = this.getClientFiscalYearBounds(resolvedClientId, targetYear);
    const lockKey = `${resolvedClientId}_${targetYear}`;
    const isCurrentlyLocked = Boolean(this.state.fiscalPeriodLocks?.[lockKey]?.isLocked);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (isCurrentlyLocked) {
      errors.push(`السنة المالية (${targetYear}) مقفلة بالفعل للمنشأة. لا يمكن إعادة الإقفال إلا بعد فك إقفال الفترة.`);
    }

    const clientEntries = this.state.journalEntries.filter((j) => {
      if (j.clientId !== resolvedClientId) return false;
      if (j.fiscalYear) return j.fiscalYear === targetYear;
      return j.date >= bounds.startDate && j.date <= bounds.endDate;
    });

    const drafts = clientEntries.filter((j) => !j.isPosted || j.status === 'DRAFT');
    if (drafts.length > 0) {
      errors.push(
        `يوجد (${drafts.length}) قيد في حالة مسودة غير مرحّل للسنة المالية (${targetYear}). يجب ترحيل جميع القيود أو حذف المسودات قبل الإقفال.`
      );
    }

    const clientAccounts = this.getClientAccounts(resolvedClientId, targetYear);
    const tbBefore = AccountingCalculator.computeTrialBalance(
      clientAccounts,
      clientEntries,
      { clientId: resolvedClientId, fiscalYear: targetYear, fromDate: bounds.startDate, toDate: bounds.endDate, postedOnly: true }
    );

    if (!tbBefore.isBalanced || tbBefore.difference > 0.01) {
      errors.push(
        `ميزان المراجعة قبل الإقفال غير متوازن (فارق التوازن: ${tbBefore.difference.toFixed(2)} ج.م). يجب معالجة عدم التوازن قبل الإقفال.`
      );
    }

    const incomeSummaryAccount =
      clientAccounts.find((a) => a.code === '3999') || null;
    const retainedEarningsAccount =
      clientAccounts.find((a) => a.code === '3102') ||
      clientAccounts.find((a) => a.code === '3200') ||
      clientAccounts.find((a) => a.category === 'EQUITY' && a.level > 1) ||
      null;

    const revenueRows: { accountId: string; accountCode: string; accountName: string; netCredit: number }[] = [];
    const expenseRows: { accountId: string; accountCode: string; accountName: string; netDebit: number }[] = [];

    let totalRevenues = 0;
    let totalExpenses = 0;

    for (const row of tbBefore.rows) {
      const isRevenue = row.category === 'REVENUE' || row.category === 'REVENUES';
      const isExpense = row.category === 'EXPENSE' || row.category === 'EXPENSES' || row.category === 'COGS';

      if (isRevenue) {
        const netCr = Number((row.closingCredit - row.closingDebit).toFixed(2));
        if (Math.abs(netCr) > 0.005) {
          revenueRows.push({
            accountId: row.accountId,
            accountCode: row.accountCode,
            accountName: row.accountName,
            netCredit: netCr,
          });
          totalRevenues += netCr;
        }
      } else if (isExpense) {
        const netDr = Number((row.closingDebit - row.closingCredit).toFixed(2));
        if (Math.abs(netDr) > 0.005) {
          expenseRows.push({
            accountId: row.accountId,
            accountCode: row.accountCode,
            accountName: row.accountName,
            netDebit: netDr,
          });
          totalExpenses += netDr;
        }
      }
    }

    totalRevenues = Number(totalRevenues.toFixed(2));
    totalExpenses = Number(totalExpenses.toFixed(2));
    const netIncome = Number((totalRevenues - totalExpenses).toFixed(2));
    const isProfit = netIncome >= 0;

    // Build proposed lines for Entry 1 (Revenues & Expenses -> Income Summary 3999)
    const proposedClosingEntryLines: JournalEntryLine[] = [];
    let lineIdx = 1;

    for (const rev of revenueRows) {
      if (rev.netCredit > 0) {
        // Debit Revenue account, credit Income Summary
        proposedClosingEntryLines.push({
          id: `line-rev-${lineIdx++}`,
          accountId: rev.accountId,
          accountCode: rev.accountCode,
          accountName: rev.accountName,
          debit: rev.netCredit,
          credit: 0,
          originalAmount: rev.netCredit,
          amountEgp: rev.netCredit,
          currency: 'EGP',
          exchangeRate: 1,
          description: `إقفال حساب ${rev.accountName} في ملخص الدخل`,
          clientId: resolvedClientId,
        });
      } else if (rev.netCredit < 0) {
        // Sales returns (Debit nature): credit account, debit Income Summary
        const amt = Math.abs(rev.netCredit);
        proposedClosingEntryLines.push({
          id: `line-rev-${lineIdx++}`,
          accountId: rev.accountId,
          accountCode: rev.accountCode,
          accountName: rev.accountName,
          debit: 0,
          credit: amt,
          originalAmount: amt,
          amountEgp: amt,
          currency: 'EGP',
          exchangeRate: 1,
          description: `إقفال مردودات المبيعات في ملخص الدخل`,
          clientId: resolvedClientId,
        });
      }
    }

    for (const exp of expenseRows) {
      if (exp.netDebit > 0) {
        // Credit expense account
        proposedClosingEntryLines.push({
          id: `line-exp-${lineIdx++}`,
          accountId: exp.accountId,
          accountCode: exp.accountCode,
          accountName: exp.accountName,
          debit: 0,
          credit: exp.netDebit,
          originalAmount: exp.netDebit,
          amountEgp: exp.netDebit,
          currency: 'EGP',
          exchangeRate: 1,
          description: `إقفال حساب ${exp.accountName} في ملخص الدخل`,
          clientId: resolvedClientId,
        });
      } else if (exp.netDebit < 0) {
        // Purchase returns (Credit nature): debit account
        const amt = Math.abs(exp.netDebit);
        proposedClosingEntryLines.push({
          id: `line-exp-${lineIdx++}`,
          accountId: exp.accountId,
          accountCode: exp.accountCode,
          accountName: exp.accountName,
          debit: amt,
          credit: 0,
          originalAmount: amt,
          amountEgp: amt,
          currency: 'EGP',
          exchangeRate: 1,
          description: `إقفال مردودات المشتريات في ملخص الدخل`,
          clientId: resolvedClientId,
        });
      }
    }

    // Balancing line on Income Summary 3999
    const sumDr = Number(proposedClosingEntryLines.reduce((s, l) => s + l.debit, 0).toFixed(2));
    const sumCr = Number(proposedClosingEntryLines.reduce((s, l) => s + l.credit, 0).toFixed(2));
    const incDiff = Number((sumDr - sumCr).toFixed(2));

    const incSummaryId = incomeSummaryAccount?.id || `${resolvedClientId}-acc-3999`;
    const incSummaryCode = incomeSummaryAccount?.code || '3999';
    const incSummaryName = incomeSummaryAccount?.name || 'ملخص الدخل (حساب الأرباح والخسائر الختامي)';

    if (Math.abs(incDiff) > 0.005) {
      if (incDiff > 0) {
        // Debits exceed credits: Income summary gets credit
        proposedClosingEntryLines.push({
          id: `line-inc-sum`,
          accountId: incSummaryId,
          accountCode: incSummaryCode,
          accountName: incSummaryName,
          debit: 0,
          credit: incDiff,
          originalAmount: incDiff,
          amountEgp: incDiff,
          currency: 'EGP',
          exchangeRate: 1,
          description: 'رصيد ملخص الدخل من إقفال الإيرادات والمصروفات (صافي ربح)',
          clientId: resolvedClientId,
        });
      } else {
        // Credits exceed debits: Income summary gets debit
        const amt = Math.abs(incDiff);
        proposedClosingEntryLines.push({
          id: `line-inc-sum`,
          accountId: incSummaryId,
          accountCode: incSummaryCode,
          accountName: incSummaryName,
          debit: amt,
          credit: 0,
          originalAmount: amt,
          amountEgp: amt,
          currency: 'EGP',
          exchangeRate: 1,
          description: 'رصيد ملخص الدخل من إقفال الإيرادات والمصروفات (صافي خسارة)',
          clientId: resolvedClientId,
        });
      }
    }

    // Build proposed lines for Entry 2 (Income Summary 3999 -> Retained Earnings 3102)
    const proposedRetainedEarningsLines: JournalEntryLine[] = [];
    const retId = retainedEarningsAccount?.id || `${resolvedClientId}-acc-3102`;
    const retCode = retainedEarningsAccount?.code || '3102';
    const retName = retainedEarningsAccount?.name || 'الأرباح المحتجزة / المرحلة من سنوات سابقة';

    if (Math.abs(netIncome) > 0.005) {
      if (isProfit) {
        // Profit: Debit Income Summary, Credit Retained Earnings
        proposedRetainedEarningsLines.push(
          {
            id: `line-close-inc-dr`,
            accountId: incSummaryId,
            accountCode: incSummaryCode,
            accountName: incSummaryName,
            debit: netIncome,
            credit: 0,
            originalAmount: netIncome,
            amountEgp: netIncome,
            currency: 'EGP',
            exchangeRate: 1,
            description: `ترحيل صافي أرباح العام (${targetYear}) من ملخص الدخل`,
            clientId: resolvedClientId,
          },
          {
            id: `line-close-ret-cr`,
            accountId: retId,
            accountCode: retCode,
            accountName: retName,
            debit: 0,
            credit: netIncome,
            originalAmount: netIncome,
            amountEgp: netIncome,
            currency: 'EGP',
            exchangeRate: 1,
            description: `إثبات صافي أرباح العام (${targetYear}) في الأرباح المحتجزة`,
            clientId: resolvedClientId,
          }
        );
      } else {
        // Loss: Credit Income Summary, Debit Retained Earnings/Losses
        const absLoss = Math.abs(netIncome);
        proposedRetainedEarningsLines.push(
          {
            id: `line-close-ret-dr`,
            accountId: retId,
            accountCode: retCode,
            accountName: retName,
            debit: absLoss,
            credit: 0,
            originalAmount: absLoss,
            amountEgp: absLoss,
            currency: 'EGP',
            exchangeRate: 1,
            description: `إثبات صافي خسائر العام (${targetYear}) في الخسائر المرحلة`,
            clientId: resolvedClientId,
          },
          {
            id: `line-close-inc-cr`,
            accountId: incSummaryId,
            accountCode: incSummaryCode,
            accountName: incSummaryName,
            debit: 0,
            credit: absLoss,
            originalAmount: absLoss,
            amountEgp: absLoss,
            currency: 'EGP',
            exchangeRate: 1,
            description: `إقفال رصيد ملخص الدخل المدين في الخسائر المرحلة`,
            clientId: resolvedClientId,
          }
        );
      }
    }

    return {
      canClose: errors.length === 0,
      errors,
      warnings,
      isCurrentlyLocked,
      targetYear,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      draftEntriesCount: drafts.length,
      isBalancedBeforeClosing: tbBefore.isBalanced,
      differenceBeforeClosing: tbBefore.difference,
      revenueRows,
      expenseRows,
      totalRevenues,
      totalExpenses,
      netIncome,
      isProfit,
      incomeSummaryAccount,
      retainedEarningsAccount,
      proposedClosingEntryLines,
      proposedRetainedEarningsLines,
    };
  }

  public executeYearEndClosing(
    clientId?: string,
    fiscalYear?: number,
    options?: {
      reason?: string;
      rolloverToNextYear?: boolean;
      lockPeriod?: boolean;
    }
  ): {
    success: boolean;
    closingEntryId: string;
    closingEntryNumber: string | number;
    incomeSummaryEntryId: string;
    netIncome: number;
    isProfit: boolean;
    rolledAccountsCount: number;
    postClosingTrialBalance: TrialBalanceSummary;
  } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('POST', { clientId: resolvedClientId });

    const preview = this.previewYearEndClosing(resolvedClientId, fiscalYear);
    if (!preview.canClose) {
      throw new Error(`عملية الإقفال مرفوضة: ${preview.errors[0]}`);
    }

    const targetYear = preview.targetYear;
    const client = this.state.clients.find((c) => c.id === resolvedClientId);

    // Ensure incomeSummary account (3999) exists in client accounts
    let incomeSummaryAcc = this.state.accounts.find(
      (a) => a.clientId === resolvedClientId && a.code === '3999'
    );
    if (!incomeSummaryAcc) {
      incomeSummaryAcc = this.addAccount({
        clientId: resolvedClientId,
        code: '3999',
        name: 'ملخص الدخل (حساب الأرباح والخسائر الختامي)',
        category: 'EQUITY',
        nature: 'CREDIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
      });
    }

    // Ensure retainedEarnings account (3102) exists
    let retainedEarningsAcc = this.state.accounts.find(
      (a) => a.clientId === resolvedClientId && (a.code === '3102' || a.code === '3200')
    );
    if (!retainedEarningsAcc) {
      retainedEarningsAcc = this.addAccount({
        clientId: resolvedClientId,
        code: '3102',
        name: 'الأرباح المحتجزة / المرحلة من سنوات سابقة',
        category: 'EQUITY',
        nature: 'CREDIT',
        level: 4,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
      });
    }

    // Update lines with exact accountId in case they were newly created
    const entry1Lines = preview.proposedClosingEntryLines.map((l) => {
      if (l.accountCode === '3999') {
        return { ...l, accountId: incomeSummaryAcc!.id };
      }
      return l;
    });

    let closingEntry1: JournalEntry | null = null;
    let closingEntry2: JournalEntry | null = null;

    if (entry1Lines.length >= 2) {
      closingEntry1 = this.addJournalEntry({
        clientId: resolvedClientId,
        clientName: client?.name,
        date: preview.endDate,
        fiscalYear: targetYear,
        description: `قيد إقفال الإيرادات والمصروفات السنوية في حساب ملخص الدخل للسنة (${targetYear})`,
        documentType: 'YEAR_END_CLOSING',
        isPosted: true,
        status: 'POSTED',
        lines: entry1Lines,
      });
    }

    const entry2Lines = preview.proposedRetainedEarningsLines.map((l) => {
      if (l.accountCode === '3999') {
        return { ...l, accountId: incomeSummaryAcc!.id };
      }
      if (l.accountCode === '3102' || l.accountCode === '3200') {
        return { ...l, accountId: retainedEarningsAcc!.id };
      }
      return l;
    });

    if (entry2Lines.length >= 2) {
      closingEntry2 = this.addJournalEntry({
        clientId: resolvedClientId,
        clientName: client?.name,
        date: preview.endDate,
        fiscalYear: targetYear,
        description:
          preview.netIncome >= 0
            ? `قيد إقفال ملخص الدخل (صافي الربح ${preview.netIncome.toFixed(2)} ج.م) في الأرباح المحتجزة للسنة (${targetYear})`
            : `قيد إقفال ملخص الدخل (صافي الخسارة ${Math.abs(preview.netIncome).toFixed(2)} ج.م) في الخسائر المرحلة للسنة (${targetYear})`,
        documentType: 'YEAR_END_CLOSING',
        isPosted: true,
        status: 'POSTED',
        lines: entry2Lines,
      });
    }

    // Verify post-closing Trial Balance
    const updatedClientAccounts = this.getClientAccounts(resolvedClientId, targetYear);
    const updatedClientEntries = this.state.journalEntries.filter((j) => {
      if (j.clientId !== resolvedClientId) return false;
      if (j.fiscalYear) return j.fiscalYear === targetYear;
      return j.date >= preview.startDate && j.date <= preview.endDate;
    });

    const postClosingTB = AccountingCalculator.computeTrialBalance(
      updatedClientAccounts,
      updatedClientEntries,
      { clientId: resolvedClientId, fiscalYear: targetYear, fromDate: preview.startDate, toDate: preview.endDate, postedOnly: true }
    );

    // Rollover balances to next year
    let rolledAccountsCount = 0;
    if (options?.rolloverToNextYear !== false) {
      const rollRes = this.rolloverClosingBalancesToNextYear(
        resolvedClientId,
        targetYear,
        {
          reason: options?.reason || `ترحيل الأرصدة الختامية بعد الإقفال للسنة (${targetYear}) كافتتاحية للسنة (${targetYear + 1})`,
          confirmRepeat: true,
        }
      );
      rolledAccountsCount = rollRes.rolledAccountsCount;
    }

    // Lock the fiscal period
    if (options?.lockPeriod !== false) {
      this.lockFiscalPeriod(
        resolvedClientId,
        targetYear,
        options?.reason || `إقفال الفترة المالية السنوية (${targetYear}) وترحيل الأرصدة للسنة (${targetYear + 1})`
      );
    }

    this.logAudit({
      action: 'YEAR_END_CLOSING_EXECUTED',
      entityType: 'FISCAL_PERIOD',
      entityId: `${resolvedClientId}:${targetYear}`,
      clientId: resolvedClientId,
      beforeValue: { isLocked: false, netIncome: preview.netIncome },
      afterValue: {
        isLocked: true,
        closingEntry1Id: closingEntry1?.id,
        closingEntry2Id: closingEntry2?.id,
        netIncome: preview.netIncome,
        isProfit: preview.isProfit,
        rolledAccountsCount,
      },
      reason: options?.reason || 'إقفال السنة المالية وترحيل الأرصدة',
      details: `تنفيذ إقفال السنة المالية (${targetYear}) للمنشأة (${client?.name || resolvedClientId}) بصافي دخل (${preview.netIncome} ج.م)`,
    });

    this.saveState('JOURNAL');
    this.saveState('LOCKS');
    this.saveState('ACCOUNTS');

    return {
      success: true,
      closingEntryId: closingEntry1?.id || '',
      closingEntryNumber: closingEntry1?.entryNumber || '',
      incomeSummaryEntryId: closingEntry2?.id || '',
      netIncome: preview.netIncome,
      isProfit: preview.isProfit,
      rolledAccountsCount,
      postClosingTrialBalance: postClosingTB,
    };
  }

  public peekNextJournalEntryNumber(clientId: string, fiscalYear: number): number {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const serials = this.getSystemSerials();
    if (!serials.clientYearJournalCounters) {
      serials.clientYearJournalCounters = {};
    }
    const key = `${resolvedClientId}:${fiscalYear}`;
    let maxExisting = serials.clientYearJournalCounters[key] || 0;

    for (const je of this.state.journalEntries) {
      if (je.clientId !== resolvedClientId) continue;
      const jeYear = je.fiscalYear || this.extractYearFromDate(je.date);
      if (jeYear !== fiscalYear) continue;
      const rawNum =
        typeof je.entryNumber === 'number'
          ? je.entryNumber
          : /^\d+$/.test(String(je.entryNumber || '').trim())
          ? parseInt(String(je.entryNumber).trim(), 10)
          : 0;
      if (rawNum > maxExisting) {
        maxExisting = rawNum;
      }
    }
    return maxExisting + 1;
  }

  public getNextJournalEntryNumber(clientId: string, fiscalYear: number): number {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const nextNum = this.peekNextJournalEntryNumber(resolvedClientId, fiscalYear);
    const serials = this.getSystemSerials();
    if (!serials.clientYearJournalCounters) {
      serials.clientYearJournalCounters = {};
    }
    const key = `${resolvedClientId}:${fiscalYear}`;
    serials.clientYearJournalCounters[key] = nextNum;
    serials.journalNextNumber = Math.max((serials.journalNextNumber || 1000) + 1, nextNum + 1000);
    return nextNum;
  }

  private validateAndNormalizeJournalLines(
    rawLines: JournalEntryLine[],
    resolvedClientId: string,
    entryCurrency: CurrencyCode,
    entryRate: number,
    entryDate: string
  ): { lines: JournalEntryLine[]; totalDebit: number; totalCredit: number } {
    if (!Array.isArray(rawLines) || rawLines.length < 2) {
      throw new Error('رفض حفظ القيد: يجب أن يحتوي القيد المحاسبي على سطرين على الأقل.');
    }

    const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
    const clientAccounts = this.state.accounts.filter((a) => a.clientId === resolvedClientId);

    const normalizedLines: JournalEntryLine[] = rawLines.map((line, idx) => {
      if (line.clientId && line.clientId.trim() && line.clientId.trim() !== resolvedClientId) {
        throw new Error(
          `رفض حفظ القيد: السطر رقم (${idx + 1}) مرتبط بعميل (${line.clientId}) مختلف عن عميل القيد (${resolvedClientId}).`
        );
      }

      if (line.accountId) {
        const crossClientAcc = this.state.accounts.find(
          (a) => a.id === line.accountId && a.clientId !== resolvedClientId
        );
        if (crossClientAcc) {
          throw new Error(
            `رفض حفظ القيد: الحساب (${crossClientAcc.code}) في السطر (${idx + 1}) يخص عميلاً آخر (${crossClientAcc.clientId}).`
          );
        }
      }

      const acc = clientAccounts.find(
        (a) =>
          (line.accountId && a.id === line.accountId) ||
          (line.accountCode && a.code === String(line.accountCode).trim())
      );
      if (!acc) {
        throw new Error(
          `رفض حفظ القيد: الحساب (${line.accountCode || line.accountId || 'غير محدد'}) غير موجود في دليل حسابات العميل (${resolvedClientId}).`
        );
      }
      if (acc.isActive === false) {
        throw new Error(
          `رفض حفظ القيد: الحساب (${acc.code} - ${acc.name}) غير فعّال (موقوف) ولا يقبل القيد عليه.`
        );
      }

      const isSummaryParent =
        (acc.level !== undefined && acc.level <= 2) ||
        clientAccounts.some(
          (child) => child.id !== acc.id && (child.parentId === acc.id || child.parentCode === acc.code)
        );
      if (isSummaryParent) {
        throw new Error(
          `رفض حفظ القيد: الحساب (${acc.code} - ${acc.name}) هو حساب رئيسي/تجميعي وليس حساباً تحليلياً.`
        );
      }

      const lineCurrency = line.currency || entryCurrency || 'EGP';
      const lineRate =
        lineCurrency === 'EGP'
          ? 1
          : line.exchangeRate && line.exchangeRate > 0
          ? line.exchangeRate
          : entryRate > 0
          ? entryRate
          : this.getExchangeRateValue(lineCurrency, entryDate);

      if (lineCurrency !== 'EGP' && (!lineRate || lineRate <= 0)) {
        throw new Error(`رفض حفظ القيد: سعر الصرف للعملة (${lineCurrency}) بتاريخ (${entryDate}) غير صالح.`);
      }

      const rawDebit = Number(line.debit ?? 0);
      const rawCredit = Number(line.credit ?? 0);
      const rawForeignDebit = line.foreignDebit !== undefined ? Number(line.foreignDebit) : undefined;
      const rawForeignCredit = line.foreignCredit !== undefined ? Number(line.foreignCredit) : undefined;

      if (
        rawDebit < 0 ||
        rawCredit < 0 ||
        (rawForeignDebit !== undefined && rawForeignDebit < 0) ||
        (rawForeignCredit !== undefined && rawForeignCredit < 0)
      ) {
        throw new Error(`رفض حفظ القيد: المبالغ السالبة غير مسموح بها في السطر (${idx + 1}).`);
      }

      if (
        (rawDebit > 0 && rawCredit > 0) ||
        (rawForeignDebit !== undefined && rawForeignCredit !== undefined && rawForeignDebit > 0 && rawForeignCredit > 0)
      ) {
        throw new Error(
          `رفض حفظ القيد: السطر رقم (${idx + 1}) للحساب (${acc.code}) لا يجوز أن يكون مديناً ودائناً في آن واحد.`
        );
      }

      let debitEgp = 0;
      let creditEgp = 0;
      let foreignDebitVal: number | undefined = undefined;
      let foreignCreditVal: number | undefined = undefined;
      let originalAmount = 0;

      if (lineCurrency !== 'EGP') {
        if (rawForeignDebit !== undefined || rawForeignCredit !== undefined) {
          foreignDebitVal = round2(rawForeignDebit || 0);
          foreignCreditVal = round2(rawForeignCredit || 0);
          originalAmount = foreignDebitVal > 0 ? foreignDebitVal : foreignCreditVal;
          debitEgp = rawDebit > 0 ? round2(rawDebit) : round2(foreignDebitVal * lineRate);
          creditEgp = rawCredit > 0 ? round2(rawCredit) : round2(foreignCreditVal * lineRate);
        } else {
          debitEgp = round2(rawDebit);
          creditEgp = round2(rawCredit);
          originalAmount =
            line.originalAmount !== undefined && Number(line.originalAmount) > 0
              ? round2(Number(line.originalAmount))
              : round2((debitEgp > 0 ? debitEgp : creditEgp) / lineRate);
          foreignDebitVal = debitEgp > 0 ? originalAmount : 0;
          foreignCreditVal = creditEgp > 0 ? originalAmount : 0;
        }
      } else {
        debitEgp = round2(rawDebit);
        creditEgp = round2(rawCredit);
        originalAmount = debitEgp > 0 ? debitEgp : creditEgp;
      }

      if ((debitEgp > 0 && creditEgp > 0) || (debitEgp === 0 && creditEgp === 0)) {
        throw new Error(
          `رفض حفظ القيد: كل سطر يجب أن يكون مديناً أو دائناً بقيمة أكبر من الصفر (السطر ${idx + 1} - حساب ${acc.code}).`
        );
      }

      const amountEgp = debitEgp > 0 ? debitEgp : creditEgp;

      return {
        ...line,
        id: line.id || `jl-${Date.now()}-${idx}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: debitEgp,
        credit: creditEgp,
        foreignDebit: foreignDebitVal,
        foreignCredit: foreignCreditVal,
        originalAmount,
        amountEgp,
        currency: lineCurrency,
        exchangeRate: lineRate,
        clientId: resolvedClientId,
      };
    });

    let totalDebit = round2(normalizedLines.reduce((s, l) => s + l.debit, 0));
    let totalCredit = round2(normalizedLines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(Math.abs(totalDebit - totalCredit));

    if (diff > 0.01) {
      throw new Error(
        `رفض حفظ القيد: القيد غير متوازن؛ مجموع المدين (${totalDebit.toFixed(2)}) لا يساوي مجموع الدائن (${totalCredit.toFixed(2)}) بفارق (${diff.toFixed(2)} ج.م).`
      );
    }

    // Requirement 3: Allow up to 1 piastre (0.01 EGP) rounding difference and align exact 2-decimal balance
    if (diff > 0 && diff <= 0.01) {
      if (totalDebit < totalCredit) {
        let maxDrIdx = 0;
        for (let i = 1; i < normalizedLines.length; i++) {
          if (normalizedLines[i].debit > normalizedLines[maxDrIdx].debit) maxDrIdx = i;
        }
        normalizedLines[maxDrIdx].debit = round2(normalizedLines[maxDrIdx].debit + diff);
        normalizedLines[maxDrIdx].amountEgp = normalizedLines[maxDrIdx].debit;
        totalDebit = totalCredit;
      } else {
        let maxCrIdx = 0;
        for (let i = 1; i < normalizedLines.length; i++) {
          if (normalizedLines[i].credit > normalizedLines[maxCrIdx].credit) maxCrIdx = i;
        }
        normalizedLines[maxCrIdx].credit = round2(normalizedLines[maxCrIdx].credit + diff);
        normalizedLines[maxCrIdx].amountEgp = normalizedLines[maxCrIdx].credit;
        totalCredit = totalDebit;
      }
    }

    return { lines: normalizedLines, totalDebit, totalCredit };
  }

  public addJournalEntry(
    entry: Partial<JournalEntry> & { relocateOutOfBoundsDate?: boolean }
  ): JournalEntry {
    if (entry.clientId !== undefined && !String(entry.clientId).trim()) {
      throw new Error('ممنوع تسجيل قيد بدون تحديد العميل (clientId إلزامي).');
    }
    const resolvedClientId = this.resolveMandatoryClientId(entry.clientId);
    if (entry.isPosted || entry.status === 'POSTED') {
      this.assertCan('POST', { clientId: resolvedClientId });
    } else {
      this.assertCan('EDIT', { clientId: resolvedClientId });
    }

    const entryDate = (entry.date || getCairoDateString()).trim().slice(0, 10);
    const derivedFiscalYear = this.resolveClientFiscalYearForDate(resolvedClientId, entryDate);
    let entryFiscalYear = derivedFiscalYear;
    let relocatedFiscalYearWarning: string | undefined = entry.relocatedFiscalYearWarning;

    const hasExplicitFiscalYear =
      entry.fiscalYear !== undefined &&
      entry.fiscalYear !== null &&
      Number.isFinite(Number(entry.fiscalYear));

    if (hasExplicitFiscalYear) {
      const requestedFy = Number(entry.fiscalYear);
      const reqBounds = this.getClientFiscalYearBounds(resolvedClientId, requestedFy);
      if (entryDate < reqBounds.startDate || entryDate > reqBounds.endDate) {
        if (entry.relocateOutOfBoundsDate) {
          entryFiscalYear = derivedFiscalYear;
          relocatedFiscalYearWarning = `تنبيه: تاريخ القيد (${entryDate}) يقع خارج حدود السنة المالية المختارة (${requestedFy}: من ${reqBounds.startDate} إلى ${reqBounds.endDate})؛ تم نقل القيد تلقائياً إلى سنته المالية الصحيحة (${derivedFiscalYear}).`;
        } else {
          throw new Error(
            `رفض حفظ القيد: تاريخ القيد (${entryDate}) يقع خارج حدود السنة المالية (${requestedFy}) المعتمدة للعميل (${reqBounds.startDate} إلى ${reqBounds.endDate}). يرجى تصحيح التاريخ أو نقله للسنة المالية الصحيحة (${derivedFiscalYear}).`
          );
        }
      } else {
        entryFiscalYear = requestedFy;
      }
    }

    this.assertPeriodOpen(resolvedClientId, entryDate, entryFiscalYear);

    const entryCurrency = entry.currency || 'EGP';
    const rate =
      entryCurrency === 'EGP'
        ? 1
        : entry.exchangeRate && entry.exchangeRate > 0
        ? entry.exchangeRate
        : this.getExchangeRateValue(entryCurrency, entryDate);

    const { lines: normalizedLines, totalDebit, totalCredit } = this.validateAndNormalizeJournalLines(
      entry.lines || [],
      resolvedClientId,
      entryCurrency,
      rate,
      entryDate
    );

    // Requirement 5: Sequential entryNumber per (clientId + fiscalYear) from systemSerials, without duplicates or gaps
    let assignedEntryNumber: string | number;
    const nextSeq = this.getNextJournalEntryNumber(resolvedClientId, entryFiscalYear);
    if (entry.entryNumber !== undefined && String(entry.entryNumber).trim() !== '') {
      const candidate = entry.entryNumber;
      const isDuplicate = this.state.journalEntries.some(
        (j) =>
          j.clientId === resolvedClientId &&
          (j.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, j.date)) === entryFiscalYear &&
          String(j.entryNumber) === String(candidate)
      );
      if (isDuplicate) {
        throw new Error(
          `رفض حفظ القيد: رقم القيد (${candidate}) مستخدم مسبقاً لنفس العميل (${resolvedClientId}) في السنة المالية (${entryFiscalYear}).`
        );
      }
      assignedEntryNumber = candidate;
      const numericCandidate =
        typeof candidate === 'number'
          ? candidate
          : /^\d+$/.test(String(candidate).trim())
          ? parseInt(String(candidate).trim(), 10)
          : 0;
      const serials = this.getSystemSerials();
      const key = `${resolvedClientId}:${entryFiscalYear}`;
      if (numericCandidate > (serials.clientYearJournalCounters?.[key] || 0)) {
        serials.clientYearJournalCounters![key] = numericCandidate;
      }
    } else {
      assignedEntryNumber = nextSeq;
    }

    const serialFormatted = `JV-${entryFiscalYear}-${String(nextSeq).padStart(4, '0')}`;

    const created: JournalEntry = {
      ...entry,
      id: entry.id || `je-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entryNumber: assignedEntryNumber,
      serialNumber: entry.serialNumber || serialFormatted,
      date: entryDate,
      fiscalYear: entryFiscalYear,
      description: entry.description || '',
      lines: normalizedLines,
      totalDebit,
      totalCredit,
      currency: entryCurrency,
      exchangeRate: rate,
      createdAt: entry.createdAt || getCairoTimestamp(),
      clientId: resolvedClientId,
      ...(relocatedFiscalYearWarning ? { relocatedFiscalYearWarning } : {}),
    };

    this.state.journalEntries.unshift(created);

    this.logAudit({
      action: created.isPosted ? 'CREATE_AND_POST_JOURNAL' : 'CREATE_JOURNAL',
      entityType: 'JOURNAL_ENTRY',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: created,
      reason: created.description || 'إدخال قيد يومية',
      details: `تسجيل قيد يومية رقم (${created.entryNumber}) للعميل (${resolvedClientId}) بتاريخ (${created.date})`,
    });

    this.saveState('JOURNAL');
    this.saveState('SERIALS');
    return created;
  }

  public updateJournalEntry(
    entryIdOrEntry: string | (Partial<JournalEntry> & { id: string }),
    partialInput?: Partial<JournalEntry> | string,
    reasonInput = 'تعديل مسودة قيد يومية'
  ): JournalEntry | undefined {
    const entryId = typeof entryIdOrEntry === 'string' ? entryIdOrEntry : entryIdOrEntry.id;
    const partial: Partial<JournalEntry> =
      typeof entryIdOrEntry === 'string'
        ? (typeof partialInput === 'object' && partialInput ? partialInput : {})
        : entryIdOrEntry;
    const reason =
      typeof partialInput === 'string' && partialInput.trim()
        ? partialInput.trim()
        : reasonInput;

    const idx = this.state.journalEntries.findIndex((j) => j.id === entryId);
    if (idx === -1) {
      this.assertCan('EDIT');
      return undefined;
    }
    const existing = this.state.journalEntries[idx];
    this.assertCan('EDIT', { clientId: existing.clientId });

    // Principle 3: Posted entries cannot be edited
    if (existing.isPosted || existing.status === 'POSTED') {
      this.assertCan('EDIT_POSTED', {
        clientId: existing.clientId,
        fiscalYear: existing.fiscalYear,
        entityType: 'JOURNAL_ENTRY',
      });
      throw new PermissionError(
        'القيود المرحّلة لا تُعدَّل ولا تُحذف. التصحيح يتم بقيد عكسي فقط.',
        {
          action: 'EDIT_POSTED',
          clientId: existing.clientId,
          fiscalYear: existing.fiscalYear,
          entityType: 'JOURNAL_ENTRY',
        }
      );
    }

    this.assertPeriodOpen(existing.clientId, existing.date, existing.fiscalYear, 'JOURNAL_ENTRY');
    if (partial.date || partial.fiscalYear) {
      this.assertPeriodOpen(existing.clientId, partial.date || existing.date, partial.fiscalYear || existing.fiscalYear, 'JOURNAL_ENTRY');
    }

    let updatedLines = existing.lines;
    let totalDebit = existing.totalDebit;
    let totalCredit = existing.totalCredit;
    if (partial.lines) {
      const targetDate = partial.date || existing.date;
      const targetCurr = partial.currency || existing.currency || 'EGP';
      const targetRate =
        targetCurr === 'EGP'
          ? 1
          : partial.exchangeRate || existing.exchangeRate || this.getExchangeRateValue(targetCurr, targetDate);
      const validated = this.validateAndNormalizeJournalLines(
        partial.lines,
        existing.clientId,
        targetCurr,
        targetRate,
        targetDate
      );
      updatedLines = validated.lines;
      totalDebit = validated.totalDebit;
      totalCredit = validated.totalCredit;
    }

    const before = { ...existing };
    this.state.journalEntries[idx] = {
      ...existing,
      ...partial,
      lines: updatedLines,
      totalDebit,
      totalCredit,
      clientId: existing.clientId,
      updatedAt: getCairoTimestamp(),
    };

    this.logAudit({
      action: 'UPDATE_JOURNAL_ENTRY',
      entityType: 'JOURNAL_ENTRY',
      entityId: entryId,
      clientId: existing.clientId,
      beforeValue: before,
      afterValue: this.state.journalEntries[idx],
      reason,
      details: `تعديل مسودة القيد رقم (${existing.entryNumber})`,
    });

    this.saveState('JOURNAL');
    return this.state.journalEntries[idx];
  }

  public deleteJournalEntry(entryId: string, reason = 'حذف مسودة قيد غير مرحّل'): boolean {
    const existing = this.state.journalEntries.find((j) => j.id === entryId);
    if (!existing) {
      this.assertCan('DELETE_RECORD', { entityType: 'JOURNAL_ENTRY' });
      return false;
    }
    this.assertCan('DELETE_RECORD', {
      clientId: existing.clientId,
      fiscalYear: existing.fiscalYear,
      entityType: 'JOURNAL_ENTRY',
    });

    // Principle 3: Posted entries cannot be deleted
    if (existing.isPosted || existing.status === 'POSTED') {
      throw new PermissionError(
        'القيود المرحّلة لا تُعدَّل ولا تُحذف. التصحيح يتم بقيد عكسي فقط.',
        {
          action: 'DELETE_RECORD',
          clientId: existing.clientId,
          fiscalYear: existing.fiscalYear,
          entityType: 'JOURNAL_ENTRY',
        }
      );
    }

    this.assertPeriodOpen(existing.clientId, existing.date, existing.fiscalYear, 'JOURNAL_ENTRY');

    const before = this.state.journalEntries.length;
    this.state.journalEntries = this.state.journalEntries.filter((j) => j.id !== entryId);

    this.logAudit({
      action: 'DELETE_JOURNAL_ENTRY',
      entityType: 'JOURNAL_ENTRY',
      entityId: entryId,
      clientId: existing.clientId,
      beforeValue: existing,
      afterValue: null,
      reason,
      details: `حذف مسودة القيد رقم (${existing.entryNumber})`,
    });

    this.saveState('JOURNAL');
    return this.state.journalEntries.length < before;
  }

  public reverseJournalEntry(
    entryId: string,
    reason: string,
    reversalDate?: string
  ): JournalEntry {
    const original = this.state.journalEntries.find((j) => j.id === entryId);
    if (!original) {
      this.assertCan('EDIT_POSTED', { entityType: 'JOURNAL_ENTRY' });
      throw new Error('القيد الأصلي المطلوب عكسه غير موجود.');
    }
    const effectiveReversalDate = reversalDate || original.date || getCairoDateString();
    const revFiscalYear = this.extractYearFromDate(effectiveReversalDate, original.fiscalYear);

    const user = this.assertCan('EDIT_POSTED', {
      clientId: original.clientId,
      fiscalYear: revFiscalYear,
      entityType: 'JOURNAL_ENTRY',
    });

    if (!reason || !reason.trim()) {
      throw new Error('يلزم إدخال سبب واضح لإصدار القيد العكسي.');
    }
    if (!original.isPosted && original.status !== 'POSTED') {
      throw new Error('القيد غير مرحّل؛ يمكن تعديله مباشرة دون الحاجة لقيد عكسي.');
    }
    if (original.reversedByEntryId) {
      throw new Error(`تم عكس هذا القيد مسبقاً بالقيد رقم (${original.reversedByEntryId}).`);
    }

    this.assertPeriodOpen(original.clientId, original.date, original.fiscalYear, 'JOURNAL_ENTRY');
    this.assertPeriodOpen(original.clientId, effectiveReversalDate, revFiscalYear, 'JOURNAL_ENTRY');
    reversalDate = effectiveReversalDate;

    const beforeOriginal = { ...original };
    const reversalLines = (original.lines || []).map((line, idx) => ({
      ...line,
      id: `rev-line-${Date.now()}-${idx}`,
      debit: Number(line.credit) || 0,
      credit: Number(line.debit) || 0,
      foreignDebit: line.foreignCredit,
      foreignCredit: line.foreignDebit,
      description: `عكس: ${line.description || original.description}`,
      clientId: original.clientId,
    }));

    const reversalEntry: JournalEntry = {
      id: `je-rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entryNumber: `REV-${original.entryNumber}`,
      date: reversalDate,
      description: `قيد عكسي للقيد رقم (${original.entryNumber}) - السبب: ${reason.trim()}`,
      documentType: 'REVERSAL',
      lines: reversalLines,
      isPosted: true,
      status: 'POSTED',
      postedAt: getCairoTimestamp(),
      postedBy: user.name,
      createdBy: user.name,
      createdAt: getCairoTimestamp(),
      fiscalYear: revFiscalYear,
      clientId: original.clientId,
      clientName: original.clientName,
      currency: original.currency || 'EGP',
      exchangeRate: original.exchangeRate || 1,
      reversalOfEntryId: original.id,
      notes: reason.trim(),
    };

    original.reversedByEntryId = reversalEntry.id;
    this.state.journalEntries.unshift(reversalEntry);

    this.logAudit({
      action: 'REVERSE_POSTED_JOURNAL_ENTRY',
      entityType: 'JOURNAL_ENTRY',
      entityId: reversalEntry.id,
      clientId: original.clientId,
      beforeValue: beforeOriginal,
      afterValue: reversalEntry,
      reason: reason.trim(),
      details: `إصدار قيد عكسي (${reversalEntry.entryNumber}) لإلغاء أثر القيد المرحّل (${original.entryNumber})`,
    });

    this.saveState('JOURNAL');
    return reversalEntry;
  }

  public createReversalJournalEntry(
    originalEntryId: string,
    reason: string,
    reversalDate: string = getCairoDateString()
  ): JournalEntry {
    return this.reverseJournalEntry(originalEntryId, reason, reversalDate);
  }

  public deleteGeneratedAuditEntries(fiscalYear: number, clientId?: string): number {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    this.assertCan('DELETE', { clientId: resolvedClientId });
    this.assertPeriodOpen(resolvedClientId, undefined, fiscalYear);

    const removedEntries = this.state.journalEntries.filter((j) => {
      if (j.isPosted || j.status === 'POSTED') return false;
      const isGenerated = j.source === 'EXCEL_REVIEW' || j.isAutoGenerated;
      const matchesYear = !j.fiscalYear || j.fiscalYear === fiscalYear;
      const matchesClient = j.clientId === resolvedClientId;
      return isGenerated && matchesYear && matchesClient;
    });

    this.state.journalEntries = this.state.journalEntries.filter((j) => !removedEntries.includes(j));
    this.logAudit({
      action: 'DELETE_GENERATED_AUDIT_ENTRIES',
      entityType: 'JOURNAL_ENTRY',
      clientId: resolvedClientId,
      beforeValue: { count: removedEntries.length, ids: removedEntries.map((e) => e.id) },
      afterValue: { count: 0 },
      details: `حذف ${removedEntries.length} قيود مسودة مولدة آلياً للسنة (${fiscalYear})`,
    });
    this.saveState('JOURNAL');
    return removedEntries.length;
  }

  public togglePostEntry(entryId: string, reason = 'ترحيل القيد للأستاذ العام'): JournalEntry | undefined {
    const entry = this.state.journalEntries.find((j) => j.id === entryId);
    if (!entry) {
      this.assertCan('POST');
      return undefined;
    }
    const user = this.assertCan('POST', { clientId: entry.clientId });

    if (entry.isPosted || entry.status === 'POSTED') {
      throw new Error('القيود المرحّلة لا يجوز فك ترحيلها أو تعديلها. التصحيح يتم بقيد عكسي فقط.');
    }

    this.assertPeriodOpen(entry.clientId, entry.date, entry.fiscalYear);

    const before = { ...entry };
    entry.isPosted = true;
    entry.status = 'POSTED';
    entry.postedAt = getCairoTimestamp();
    entry.postedBy = user.name;

    this.logAudit({
      action: 'POST_JOURNAL_ENTRY',
      entityType: 'JOURNAL_ENTRY',
      entityId: entry.id,
      clientId: entry.clientId,
      beforeValue: before,
      afterValue: entry,
      reason,
      details: `ترحيل القيد رقم (${entry.entryNumber}) للعميل (${entry.clientId})`,
    });

    this.saveState('JOURNAL');
    return entry;
  }

  public postBatchJournalEntries(entryIds: string[], reason = 'ترحيل جماعي للقيود'): number {
    this.assertCan('POST');
    let count = 0;
    for (const j of this.state.journalEntries) {
      if (entryIds.includes(j.id) && !j.isPosted) {
        const user = this.assertCan('POST', { clientId: j.clientId });
        this.assertPeriodOpen(j.clientId, j.date, j.fiscalYear);
        const before = { ...j };
        j.isPosted = true;
        j.status = 'POSTED';
        j.postedAt = getCairoTimestamp();
        j.postedBy = user.name;
        this.logAudit({
          action: 'POST_JOURNAL_ENTRY',
          entityType: 'JOURNAL_ENTRY',
          entityId: j.id,
          clientId: j.clientId,
          beforeValue: before,
          afterValue: j,
          reason,
          details: `ترحيل القيد رقم (${j.entryNumber}) ضمن دفعة ترحيل`,
        });
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
    const user = this.getCurrentUser();
    if (clientId && user && user.role !== 'ADMIN') {
      const allowed = user.permittedClientIds || [];
      if (!allowed.includes(clientId)) {
        throw new Error(`عملية مرفوضة: المستخدم (${user.name}) غير مصرح له بالوصول إلى بيانات هذا العميل.`);
      }
    }
    const client = clientId ? this.state.clients.find((c) => c.id === clientId) : null;
    const selectedFiscalYear =
      options?.fiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      getCairoCurrentYear();
    const bounds = clientId ? this.getClientFiscalYearBounds(clientId, selectedFiscalYear) : undefined;

    this.state.activeClientContext = {
      clientId,
      clientName: client?.name,
      companyName: client?.name,
      clientCode: client?.code,
      selectedFiscalYear,
      fiscalYearStart: bounds?.startDate,
      fiscalYearEnd: bounds?.endDate,
      activityTemplate: client?.activityTemplate,
      autoFilterEnabled:
        options?.autoFilter !== undefined
          ? options.autoFilter
          : Boolean(clientId),
    };
    this.saveState('CONTEXT');
  }

  public setActiveClientContext(
    contextOrClientId:
      | string
      | null
      | {
          clientId: string | null;
          selectedFiscalYear?: number;
          autoFilter?: boolean;
        },
    selectedFiscalYear?: number
  ): void {
    if (contextOrClientId === null) {
      this.setActiveClient(null, {
        fiscalYear: selectedFiscalYear,
      });
      return;
    }
    if (typeof contextOrClientId === 'string') {
      this.setActiveClient(contextOrClientId, {
        fiscalYear: selectedFiscalYear,
      });
      return;
    }
    this.setActiveClient(contextOrClientId.clientId, {
      fiscalYear: contextOrClientId.selectedFiscalYear,
      autoFilter: contextOrClientId.autoFilter,
    });
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
      activeClient.fiscalYear = year;
      const bounds = computeClientFiscalYearBounds(activeClient, year);
      activeClient.fiscalYearStart = bounds.start;
      activeClient.fiscalYearEnd = bounds.end;
      this.state.activeClientContext.fiscalYearStart = bounds.start;
      this.state.activeClientContext.fiscalYearEnd = bounds.end;
    }
    this.saveState('CONTEXT');
  }

  public addClient(clientData: Partial<ClientArchiveRecord>): ClientArchiveRecord {
    const user = this.assertCan('EDIT', { allowWithoutClient: true });
    const newId = clientData.id || `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const targetFiscalYear = clientData.fiscalYear || clientData.activeFiscalYear || getCairoCurrentYear();
    const rawStartMonth =
      typeof (clientData as any).fiscalYearStartMonth === 'number'
        ? Number((clientData as any).fiscalYearStartMonth)
        : undefined;
    const targetEndMonth =
      clientData.fiscalYearEndMonth ||
      (rawStartMonth && rawStartMonth >= 1 && rawStartMonth <= 12
        ? rawStartMonth === 1
          ? 12
          : rawStartMonth - 1
        : 12);
    const computedBounds = computeClientFiscalYearBounds(
      { ...clientData, fiscalYear: targetFiscalYear, fiscalYearEndMonth: targetEndMonth },
      targetFiscalYear
    );
    const resolvedTemplate: ClientActivityTemplate =
      clientData.activityTemplate || inferActivityTemplateFromText(clientData.industrySector);

    let maxClientSeq = this.state.clients.length;
    for (const existingClient of this.state.clients) {
      const m = /(\d+)$/.exec(String(existingClient.code || '').trim());
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxClientSeq) maxClientSeq = n;
      }
    }

    const created: ClientArchiveRecord = {
      code: clientData.code || `CL-${getCairoCurrentYear()}-${String(maxClientSeq + 1).padStart(3, '0')}`,
      name: clientData.name || 'عميل جديد',
      taxId: clientData.taxId || clientData.taxCardNo || '',
      taxCardNo: clientData.taxCardNo || clientData.taxId || '',
      commercialRegister: clientData.commercialRegister || clientData.commercialRegNo || '',
      commercialRegNo: clientData.commercialRegNo || clientData.commercialRegister || '',
      companyType: clientData.companyType || 'LIMITED_LIABILITY',
      relationshipType: clientData.relationshipType || 'ANNUAL_CONTRACT',
      annualAgreedFees: Number(clientData.annualAgreedFees) || 0,
      paidFees: Number(clientData.paidFees) || 0,
      status: clientData.status || 'ACTIVE',
      folders: clientData.folders || [],
      documents: clientData.documents || [],
      procedures: clientData.procedures || [],
      createdAt: getCairoDateString(),
      isVatSubject: clientData.isVatSubject ?? clientData.isVatRegistered ?? false,
      isVatRegistered: clientData.isVatRegistered ?? clientData.isVatSubject ?? false,
      isIncomeTaxSubject: clientData.isIncomeTaxSubject ?? true,
      isWhtSubject: clientData.isWhtSubject ?? clientData.isWithholdingTaxSubject ?? false,
      isWithholdingTaxSubject: clientData.isWithholdingTaxSubject ?? clientData.isWhtSubject ?? false,
      isStampTaxSubject: clientData.isStampTaxSubject ?? false,
      hasPayroll: clientData.hasPayroll ?? clientData.isPayrollTaxSubject ?? false,
      isPayrollTaxSubject: clientData.isPayrollTaxSubject ?? clientData.hasPayroll ?? false,
      ...clientData,
      id: newId,
      activeFiscalYear: targetFiscalYear,
      fiscalYear: targetFiscalYear,
      fiscalYearEndMonth: targetEndMonth,
      fiscalYearStart: clientData.fiscalYearStart || computedBounds.start,
      fiscalYearEnd: clientData.fiscalYearEnd || computedBounds.end,
      activityTemplate: resolvedTemplate,
    };
    this.state.clients.push(created);

    // Ensure non-admin creator has access to the newly created client
    if (user.role !== 'ADMIN' && Array.isArray(user.permittedClientIds) && !user.permittedClientIds.includes(newId)) {
      user.permittedClientIds.push(newId);
    }

    // Requirement 1 & 3: Clone activity-specific Chart of Accounts template with ZERO opening balances
    const hasClientAccounts = this.state.accounts.some((a) => a.clientId === newId);
    if (!hasClientAccounts) {
      const clonedTemplate = getStandardEgyptianChartOfAccounts(newId, resolvedTemplate);
      this.state.accounts.push(...clonedTemplate);
    }

    // Requirement 2: Initialize openingBalances[clientId][fiscalYear] = {} and accountMappings[clientId]
    if (!this.state.openingBalances || typeof this.state.openingBalances !== 'object') {
      this.state.openingBalances = {};
    }
    if (!this.state.openingBalances[newId]) {
      this.state.openingBalances[newId] = {};
    }
    if (!this.state.openingBalances[newId][String(targetFiscalYear)]) {
      this.state.openingBalances[newId][String(targetFiscalYear)] = {};
    }
    if (!this.state.accountMappings || typeof this.state.accountMappings !== 'object') {
      this.state.accountMappings = {};
    }
    if (!this.state.accountMappings[newId]) {
      this.state.accountMappings[newId] = createDefaultClientAccountMapping(newId);
    }

    if ((created.annualAgreedFees || 0) > 0) {
      const hasAgreement = this.state.feeAgreements.some((a) => a.clientId === created.id);
      if (!hasAgreement) {
        this.state.feeAgreements.push({
          id: `fa-init-${created.id}`,
          clientId: created.id,
          fiscalYear: targetFiscalYear,
          description: `اتفاقية الأتعاب السنوية - ${created.name}`,
          amount: Number(created.annualAgreedFees) || 0,
          status: 'ACTIVE',
          createdAt: created.createdAt,
        });
      }
    }

    this.logAudit({
      action: 'ADD_CLIENT',
      entityType: 'CLIENT',
      entityId: created.id,
      clientId: created.id,
      beforeValue: null,
      afterValue: created,
      details: `إضافة ملف عميل جديد (${created.name}) مع نسخ قالب دليل الحسابات (${resolvedTemplate}) بأرصدة افتتاحية صفرية`,
    });

    this.saveState('CLIENTS');
    this.saveState('ACCOUNTS');
    return created;
  }

  public batchAddClients(clientsList: Partial<ClientArchiveRecord>[]): number {
    this.assertCan('EDIT', { allowWithoutClient: true });
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
    this.assertCan('EDIT', { clientId });
    const idx = this.state.clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return undefined;
    const before = { ...this.state.clients[idx] };

    const targetYear =
      partial.fiscalYear ??
      partial.activeFiscalYear ??
      before.fiscalYear ??
      before.activeFiscalYear ??
      getCairoCurrentYear();
    const rawStartMonth =
      typeof (partial as any).fiscalYearStartMonth === 'number'
        ? Number((partial as any).fiscalYearStartMonth)
        : typeof (before as any).fiscalYearStartMonth === 'number'
        ? Number((before as any).fiscalYearStartMonth)
        : undefined;
    const targetEndMonth =
      partial.fiscalYearEndMonth ??
      (rawStartMonth && rawStartMonth >= 1 && rawStartMonth <= 12
        ? rawStartMonth === 1
          ? 12
          : rawStartMonth - 1
        : before.fiscalYearEndMonth ?? 12);
    const recomputedBounds = computeClientFiscalYearBounds(
      { ...before, ...partial, fiscalYear: targetYear, fiscalYearEndMonth: targetEndMonth },
      targetYear
    );

    const nextStart =
      partial.fiscalYearStart ||
      (partial.fiscalYear !== undefined ||
      partial.activeFiscalYear !== undefined ||
      partial.fiscalYearEndMonth !== undefined ||
      (partial as any).fiscalYearStartMonth !== undefined
        ? recomputedBounds.start
        : before.fiscalYearStart || recomputedBounds.start);
    const nextEnd =
      partial.fiscalYearEnd ||
      (partial.fiscalYear !== undefined ||
      partial.activeFiscalYear !== undefined ||
      partial.fiscalYearEndMonth !== undefined
        ? recomputedBounds.end
        : before.fiscalYearEnd || recomputedBounds.end);

    const prevTemplate = before.activityTemplate;
    const nextTemplate: ClientActivityTemplate =
      partial.activityTemplate ||
      before.activityTemplate ||
      inferActivityTemplateFromText(partial.industrySector || before.industrySector);

    this.state.clients[idx] = {
      ...this.state.clients[idx],
      ...partial,
      activeFiscalYear: targetYear,
      fiscalYear: targetYear,
      fiscalYearEndMonth: targetEndMonth,
      fiscalYearStart: nextStart,
      fiscalYearEnd: nextEnd,
      activityTemplate: nextTemplate,
      updatedAt: getCairoTimestamp(),
    };

    if (partial.activityTemplate && partial.activityTemplate !== prevTemplate) {
      this.applyActivityTemplateToClient(clientId, partial.activityTemplate, 'تحديث قالب النشاط لملف العميل');
    }

    if (this.state.activeClientContext?.clientId === clientId) {
      this.state.activeClientContext = {
        ...this.state.activeClientContext,
        clientName: this.state.clients[idx].name,
        companyName: this.state.clients[idx].name,
        clientCode: this.state.clients[idx].code,
        selectedFiscalYear: targetYear,
        fiscalYearStart: nextStart,
        fiscalYearEnd: nextEnd,
        activityTemplate: nextTemplate,
      };
    }

    this.logAudit({
      action: 'UPDATE_CLIENT',
      entityType: 'CLIENT',
      entityId: clientId,
      clientId,
      beforeValue: before,
      afterValue: this.state.clients[idx],
      details: `تعديل بيانات العميل (${before.name})`,
    });
    this.saveState('CLIENTS');
    return this.state.clients[idx];
  }

  public addClientFolder(clientId: string, folderInput: Partial<ClientDocumentFolder> & { name: string }): ClientDocumentFolder | undefined {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.folders)) client.folders = [];
    const folder: ClientDocumentFolder = {
      id: folderInput.id || `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: folderInput.name,
      parentId: folderInput.parentId || null,
      createdAt: getCairoDateString(),
      ...folderInput,
    };
    client.folders.push(folder);
    this.logAudit({
      action: 'ADD_CLIENT_FOLDER',
      entityType: 'CLIENT_FOLDER',
      entityId: folder.id,
      clientId,
      beforeValue: null,
      afterValue: folder,
      details: `إنشاء مجلد مستندات (${folder.name}) للعميل (${client.name})`,
    });
    this.saveState('CLIENTS');
    return folder;
  }

  public updateClientFolder(clientId: string, folderId: string, partial: Partial<ClientDocumentFolder>): void {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.folders)) return;
    const idx = client.folders.findIndex((f) => f.id === folderId);
    if (idx >= 0) {
      const before = { ...client.folders[idx] };
      client.folders[idx] = { ...client.folders[idx], ...partial };
      this.logAudit({
        action: 'UPDATE_CLIENT_FOLDER',
        entityType: 'CLIENT_FOLDER',
        entityId: folderId,
        clientId,
        beforeValue: before,
        afterValue: client.folders[idx],
        details: `تعديل مجلد المستندات (${before.name})`,
      });
      this.saveState('CLIENTS');
    }
  }

  public deleteClientFolder(clientId: string, folderId: string): void {
    this.assertCan('DELETE', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return;
    const target = (client.folders || []).find((f) => f.id === folderId);
    client.folders = (client.folders || []).filter((f) => f.id !== folderId);
    this.logAudit({
      action: 'DELETE_CLIENT_FOLDER',
      entityType: 'CLIENT_FOLDER',
      entityId: folderId,
      clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف مجلد المستندات (${target?.name || folderId})`,
    });
    this.saveState('CLIENTS');
  }

  public addClientDocument(clientId: string, docInput: Partial<ClientDocument>): ClientDocument | undefined {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.documents)) client.documents = [];
    const doc: ClientDocument = {
      id: docInput.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId,
      title: docInput.title || docInput.fileName || docInput.name || 'مستند',
      category: docInput.category || 'OTHER',
      uploadDate: docInput.uploadDate || docInput.uploadedAt || getCairoDateString(),
      ...docInput,
    };
    client.documents.unshift(doc);
    this.logAudit({
      action: 'ADD_CLIENT_DOCUMENT',
      entityType: 'CLIENT_DOCUMENT',
      entityId: doc.id,
      clientId,
      beforeValue: null,
      afterValue: doc,
      details: `إرفاق مستند (${doc.title}) بأرشيف العميل (${client.name})`,
    });
    this.saveState('CLIENTS');
    return doc;
  }

  public moveClientDocument(
    clientId: string,
    docId: string,
    targetFolderId: string | null,
    _targetFolderName?: string
  ): void {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.documents)) return;
    const doc = client.documents.find((d) => d.id === docId);
    if (doc) {
      const before = { ...doc };
      doc.folderId = targetFolderId || undefined;
      this.logAudit({
        action: 'MOVE_CLIENT_DOCUMENT',
        entityType: 'CLIENT_DOCUMENT',
        entityId: docId,
        clientId,
        beforeValue: before,
        afterValue: doc,
        details: `نقل المستند (${doc.title})`,
      });
      this.saveState('CLIENTS');
    }
  }

  public deleteClientDocument(clientId: string, docId: string): void {
    this.assertCan('DELETE', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.documents)) return;
    const target = client.documents.find((d) => d.id === docId);
    client.documents = client.documents.filter((d) => d.id !== docId);
    this.logAudit({
      action: 'DELETE_CLIENT_DOCUMENT',
      entityType: 'CLIENT_DOCUMENT',
      entityId: docId,
      clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف المستند (${target?.title || docId}) من أرشيف العميل`,
    });
    this.saveState('CLIENTS');
  }

  public addClientProcedure(
    clientId: string,
    procInput: Partial<ClientProcedureTask> & { title: string; category: string },
    _financialOptions?: any
  ): ClientProcedureTask | undefined {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!Array.isArray(client.procedures)) client.procedures = [];
    const proc: ClientProcedureTask = {
      id: procInput.id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: procInput.status || 'PENDING',
      startDate: procInput.startDate || getCairoDateString(),
      ...procInput,
    };
    client.procedures.unshift(proc);
    this.logAudit({
      action: 'ADD_CLIENT_PROCEDURE',
      entityType: 'CLIENT_PROCEDURE',
      entityId: proc.id,
      clientId,
      beforeValue: null,
      afterValue: proc,
      details: `إضافة إجراء مهني (${proc.title}) للعميل (${client.name})`,
    });
    this.saveState('CLIENTS');
    return proc;
  }

  public updateClientProcedure(
    clientId: string,
    procedureId: string,
    partial: Partial<ClientProcedureTask>,
    _financialOptions?: any
  ): ClientProcedureTask | undefined {
    this.assertCan('EDIT', { clientId });
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !Array.isArray(client.procedures)) return undefined;
    const idx = client.procedures.findIndex((p) => p.id === procedureId);
    if (idx === -1) return undefined;
    const before = { ...client.procedures[idx] };
    client.procedures[idx] = { ...client.procedures[idx], ...partial };
    this.logAudit({
      action: 'UPDATE_CLIENT_PROCEDURE',
      entityType: 'CLIENT_PROCEDURE',
      entityId: procedureId,
      clientId,
      beforeValue: before,
      afterValue: client.procedures[idx],
      details: `تحديث الإجراء المهني (${before.title})`,
    });
    this.saveState('CLIENTS');
    return client.procedures[idx];
  }

  // =========================================================================
  // Unified Fees & Collections (Single Source of Truth)
  // =========================================================================
  public saveFeeAgreement(agreementInput: Partial<ClientFeeAgreement> & { clientId: string; amount: number }): ClientFeeAgreement {
    const resolvedClientId = this.resolveMandatoryClientId(agreementInput.clientId);
    this.assertCan('TREASURY', { clientId: resolvedClientId });

    const existingIdx = agreementInput.id
      ? this.state.feeAgreements.findIndex((a) => a.id === agreementInput.id)
      : -1;
    const before = existingIdx >= 0 ? { ...this.state.feeAgreements[existingIdx] } : null;

    const record: ClientFeeAgreement = {
      id: agreementInput.id || `fa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: resolvedClientId,
      fiscalYear: agreementInput.fiscalYear || getCairoCurrentYear(),
      description: agreementInput.description || 'اتفاقية أتعاب مهنية',
      amount: Number(agreementInput.amount) || 0,
      dueDate: agreementInput.dueDate,
      status: agreementInput.status || 'ACTIVE',
      createdAt: agreementInput.createdAt || getCairoDateString(),
      notes: agreementInput.notes,
    };

    if (existingIdx >= 0) {
      this.state.feeAgreements[existingIdx] = record;
    } else {
      this.state.feeAgreements.push(record);
    }

    this.syncClientFeeTotals(record.clientId);
    this.logAudit({
      action: existingIdx >= 0 ? 'UPDATE_FEE_AGREEMENT' : 'CREATE_FEE_AGREEMENT',
      entityType: 'FEE_AGREEMENT',
      entityId: record.id,
      clientId: resolvedClientId,
      beforeValue: before,
      afterValue: record,
      details: `حفظ اتفاقية أتعاب (${record.description}) بمبلغ ${record.amount} ج.م`,
    });
    this.saveState('FEES');
    return record;
  }

  public deleteFeeAgreement(agreementId: string): boolean {
    const target = this.state.feeAgreements.find((a) => a.id === agreementId);
    if (!target) {
      this.assertCan('DELETE');
      return false;
    }
    this.assertCan('DELETE', { clientId: target.clientId });
    this.state.feeAgreements = this.state.feeAgreements.filter((a) => a.id !== agreementId);
    this.syncClientFeeTotals(target.clientId);
    this.logAudit({
      action: 'DELETE_FEE_AGREEMENT',
      entityType: 'FEE_AGREEMENT',
      entityId: agreementId,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف اتفاقية الأتعاب (${target.description})`,
    });
    this.saveState('FEES');
    return true;
  }

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
    const resolvedClientId = this.resolveMandatoryClientId(input.clientId);
    this.assertCan('TREASURY', { clientId: resolvedClientId });

    const client = this.state.clients.find((c) => c.id === resolvedClientId);
    let agreementId = input.agreementId;

    if (!agreementId) {
      const existingAgreement = this.state.feeAgreements.find(
        (a) => a.clientId === resolvedClientId && a.status !== 'CANCELLED'
      );
      if (existingAgreement) {
        agreementId = existingAgreement.id;
      } else {
        const autoAgreement = this.saveFeeAgreement({
          clientId: resolvedClientId,
          fiscalYear: client?.activeFiscalYear || getCairoCurrentYear(),
          description: `اتفاقية أتعاب مهنية - ${client?.name || resolvedClientId}`,
          amount: Math.max(Number(client?.annualAgreedFees) || 0, Number(input.amount) || 0),
          status: 'ACTIVE',
        });
        agreementId = autoAgreement.id;
      }
    }

    const sharedId = input.id || `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const paidAt = input.paidAt || getCairoDateString();
    this.assertPeriodOpen(resolvedClientId, paidAt, undefined, 'TREASURY');
    const method = input.method || 'CASH';

    const collection: ClientFeeCollection = {
      id: sharedId,
      agreementId,
      clientId: resolvedClientId,
      amount: Number(input.amount) || 0,
      paidAt,
      method,
      receiptNo: input.receiptNo,
      treasuryTransactionId: sharedId,
      notes: input.notes,
      createdAt: getCairoTimestamp(),
    };

    const txFiscalYear = this.resolveClientFiscalYearForDate(resolvedClientId, paidAt);
    const treasuryTx: OfficeTreasuryTransaction = {
      id: sharedId,
      date: paidAt,
      fiscalYear: txFiscalYear,
      type: 'INCOME_FEES',
      category: 'تحصيل أتعاب مهنية',
      amount: Number(input.amount) || 0,
      clientId: resolvedClientId,
      clientName: client?.name || '',
      feeCollectionId: sharedId,
      agreementId,
      paymentMethod: method,
      receiptNumber: input.receiptNo,
      referenceNumber: input.receiptNo,
      description: input.notes || `تحصيل أتعاب مهنية - ${client?.name || resolvedClientId}`,
      createdAt: getCairoTimestamp(),
    };

    this.state.feeCollections = this.state.feeCollections.filter((c) => c.id !== sharedId);
    this.state.treasuryTransactions = this.state.treasuryTransactions.filter(
      (t) => t.id !== sharedId && t.feeCollectionId !== sharedId
    );

    this.state.feeCollections.unshift(collection);
    this.state.treasuryTransactions.unshift(treasuryTx);

    this.syncClientFeeTotals(resolvedClientId);
    this.logAudit({
      action: 'RECORD_FEE_COLLECTION',
      entityType: 'FEE_COLLECTION',
      entityId: sharedId,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: collection,
      details: `تحصيل أتعاب مهنية بمبلغ ${collection.amount} ج.م للعميل (${client?.name || resolvedClientId})`,
    });
    this.saveState('FEES');
    return { collection, treasuryTransaction: treasuryTx };
  }

  public deleteFeeCollection(collectionId: string): boolean {
    const target = this.state.feeCollections.find((c) => c.id === collectionId);
    if (!target) {
      this.assertCan('DELETE_RECORD', { entityType: 'FEE_COLLECTION' });
      return false;
    }
    this.assertCan('DELETE_RECORD', { clientId: target.clientId, entityType: 'FEE_COLLECTION' });
    this.assertPeriodOpen(target.clientId, target.paidAt, undefined, 'TREASURY');
    this.state.feeCollections = this.state.feeCollections.filter((c) => c.id !== collectionId);
    this.state.treasuryTransactions = this.state.treasuryTransactions.filter(
      (t) => t.id !== collectionId && t.id !== target.treasuryTransactionId && t.feeCollectionId !== collectionId
    );
    this.syncClientFeeTotals(target.clientId);
    this.logAudit({
      action: 'DELETE_FEE_COLLECTION',
      entityType: 'FEE_COLLECTION',
      entityId: collectionId,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف تحصيل أتعاب بمبلغ ${target.amount} ج.م`,
    });
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
    if (txInput.clientId !== undefined && !String(txInput.clientId).trim()) {
      throw new Error('ممنوع تسجيل حركة خزنة بدون تحديد العميل (clientId إلزامي).');
    }
    const resolvedClientId = this.resolveMandatoryClientId(txInput.clientId);
    const txDate = (txInput.date || getCairoDateString()).trim().slice(0, 10);
    const txFiscalYear = txInput.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, txDate);
    this.assertCan('TREASURY', {
      clientId: resolvedClientId,
      fiscalYear: txFiscalYear,
      entityType: 'TREASURY',
      date: txDate,
    });
    this.assertPeriodOpen(resolvedClientId, txDate, txFiscalYear, 'TREASURY');

    if (txInput.type === 'INCOME_FEES' && !txInput.feeCollectionId) {
      const { treasuryTransaction } = this.recordFeeCollection({
        id: txInput.id,
        agreementId: txInput.agreementId,
        clientId: resolvedClientId,
        amount: Number(txInput.amount) || 0,
        paidAt: txDate,
        method: txInput.paymentMethod || 'CASH',
        receiptNo: txInput.receiptNumber || txInput.referenceNumber,
        notes: txInput.description,
      });
      treasuryTransaction.fiscalYear = txFiscalYear;
      return treasuryTransaction;
    }

    const txCurrency = (txInput.currency as CurrencyCode) || 'EGP';
    const rawAmount =
      txCurrency !== 'EGP' && txInput.foreignAmount !== undefined
        ? Number(txInput.foreignAmount)
        : Number(txInput.amount) || 0;
    const { amountEgp, exchangeRate } =
      txCurrency !== 'EGP' && txInput.exchangeRate && txInput.exchangeRate > 0
        ? { amountEgp: Number((rawAmount * Number(txInput.exchangeRate)).toFixed(2)), exchangeRate: Number(txInput.exchangeRate) }
        : this.convertAmountToEgp(rawAmount, txCurrency, txDate);

    const created: OfficeTreasuryTransaction = {
      id: txInput.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: txDate,
      fiscalYear: txFiscalYear,
      type: txInput.type || 'EXPENSE_OFFICE',
      amount: txCurrency !== 'EGP' && txInput.foreignAmount !== undefined ? amountEgp : Number(txInput.amount) || amountEgp,
      currency: txCurrency,
      exchangeRate,
      foreignAmount: txCurrency !== 'EGP' ? (txInput.foreignAmount ?? Number(txInput.amount)) : undefined,
      description: txInput.description || '',
      createdAt: txInput.createdAt || getCairoTimestamp(),
      ...txInput,
      clientId: resolvedClientId,
    };
    this.state.treasuryTransactions.unshift(created);

    this.logAudit({
      action: 'ADD_TREASURY_TRANSACTION',
      entityType: 'TREASURY',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: created,
      reason: created.description || 'حركة خزينة',
      details: `تسجيل حركة خزينة (${created.type}) بمبلغ ${created.amount} ج.م للعميل (${resolvedClientId}) للسنة (${txFiscalYear})`,
    });

    this.saveState('TREASURY');
    return created;
  }

  public updateTreasuryTransaction(
    txId: string,
    partial: Partial<OfficeTreasuryTransaction>,
    reason = 'تعديل حركة خزينة'
  ): OfficeTreasuryTransaction | undefined {
    const idx = this.state.treasuryTransactions.findIndex((t) => t.id === txId);
    if (idx === -1) {
      this.assertCan('TREASURY', { entityType: 'TREASURY' });
      return undefined;
    }
    const before = { ...this.state.treasuryTransactions[idx] };
    this.assertCan('TREASURY', { clientId: before.clientId, entityType: 'TREASURY' });
    this.assertPeriodOpen(before.clientId, before.date, undefined, 'TREASURY');
    if (partial.date) {
      this.assertPeriodOpen(before.clientId, partial.date, undefined, 'TREASURY');
    }
    this.state.treasuryTransactions[idx] = {
      ...before,
      ...partial,
      clientId: before.clientId,
    };
    this.logAudit({
      action: 'UPDATE_TREASURY_TRANSACTION',
      entityType: 'TREASURY',
      entityId: txId,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.treasuryTransactions[idx],
      reason,
      details: `تعديل حركة الخزينة (${before.description || txId})`,
    });
    this.saveState('TREASURY');
    return this.state.treasuryTransactions[idx];
  }

  public deleteTreasuryTransaction(txId: string, reason = 'حذف حركة خزينة'): boolean {
    const target = this.state.treasuryTransactions.find((t) => t.id === txId);
    if (!target) {
      this.assertCan('DELETE_RECORD', { entityType: 'TREASURY' });
      return false;
    }
    this.assertCan('DELETE_RECORD', { clientId: target.clientId, entityType: 'TREASURY' });
    this.assertPeriodOpen(target.clientId, target.date, undefined, 'TREASURY');
    const before = this.state.treasuryTransactions.length;
    this.state.treasuryTransactions = this.state.treasuryTransactions.filter((t) => t.id !== txId);
    this.logAudit({
      action: 'DELETE_TREASURY_TRANSACTION',
      entityType: 'TREASURY',
      entityId: txId,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      reason,
      details: `حذف حركة الخزينة (${target.description || txId})`,
    });
    this.saveState('TREASURY');
    return this.state.treasuryTransactions.length < before;
  }

  // =========================================================================
  // Open Items, Checklists & Approved Statements
  // =========================================================================
  public getOpenItems(clientId?: string, _fiscalYear?: number): OpenItem[] {
    if (!clientId) return this.state.openItems || [];
    return (this.state.openItems || []).filter((i) => i.clientId === clientId);
  }

  public addOpenItem(item: Partial<OpenItem> & { clientId: string; text: string }): OpenItem {
    const resolvedClientId = this.resolveMandatoryClientId(item.clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });
    const created: OpenItem = {
      id: item.id || `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: resolvedClientId,
      kind: item.kind || 'DOCUMENT',
      text: item.text,
      requestedAt: item.requestedAt || getCairoDateString(),
      status: item.status || 'OPEN',
      ...item,
    };
    this.state.openItems.unshift(created);
    this.logAudit({
      action: 'ADD_OPEN_ITEM',
      entityType: 'OPEN_ITEM',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: created,
      details: `إضافة بند معلق (${created.text}) للعميل (${resolvedClientId})`,
    });
    this.saveState('OPEN_ITEMS');
    return created;
  }

  public updateOpenItem(id: string, partial: Partial<OpenItem>): OpenItem | undefined {
    const idx = this.state.openItems.findIndex((i) => i.id === id);
    if (idx === -1) {
      this.assertCan('EDIT');
      return undefined;
    }
    const before = { ...this.state.openItems[idx] };
    this.assertCan('EDIT', { clientId: before.clientId });
    this.state.openItems[idx] = { ...before, ...partial };
    this.logAudit({
      action: 'UPDATE_OPEN_ITEM',
      entityType: 'OPEN_ITEM',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.openItems[idx],
      details: `تحديث البند المعلق (${before.text})`,
    });
    this.saveState('OPEN_ITEMS');
    return this.state.openItems[idx];
  }

  public deleteOpenItem(id: string): boolean {
    const target = this.state.openItems.find((i) => i.id === id);
    if (!target) {
      this.assertCan('DELETE');
      return false;
    }
    this.assertCan('DELETE', { clientId: target.clientId });
    const before = this.state.openItems.length;
    this.state.openItems = this.state.openItems.filter((i) => i.id !== id);
    this.logAudit({
      action: 'DELETE_OPEN_ITEM',
      entityType: 'OPEN_ITEM',
      entityId: id,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف البند المعلق (${target.text})`,
    });
    this.saveState('OPEN_ITEMS');
    return this.state.openItems.length < before;
  }

  public getChecklist(clientId: string, fiscalYear: number): any[] {
    const key = `${clientId}_${fiscalYear}`;
    return this.state.closingChecklists?.[key] || [];
  }

  public saveChecklist(clientId: string, fiscalYear: number, items: any[]): void {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });
    const key = `${resolvedClientId}_${fiscalYear}`;
    if (!this.state.closingChecklists) this.state.closingChecklists = {};
    const before = this.state.closingChecklists[key] || [];
    this.state.closingChecklists[key] = items;
    this.logAudit({
      action: 'SAVE_CHECKLIST',
      entityType: 'CHECKLIST',
      entityId: key,
      clientId: resolvedClientId,
      beforeValue: before,
      afterValue: items,
      details: `تحديث قائمة فحص الإقفال للعميل (${resolvedClientId}) للسنة (${fiscalYear})`,
    });
    this.saveState('CHECKLISTS');
  }

  public getApprovedStatementsForClient(clientId: string, fiscalYear?: number): ApprovedStatementsSnapshot[] {
    return (this.state.approvedStatements || []).filter(
      (s) => s.clientId === clientId && (fiscalYear === undefined || s.fiscalYear === fiscalYear)
    );
  }

  public getLatestApprovedStatementForClient(
    clientId: string,
    fiscalYear: number
  ): ApprovedStatementsSnapshot | undefined {
    const list = this.getApprovedStatementsForClient(clientId, fiscalYear).filter(
      (s) => s.status !== 'SUPERSEDED'
    );
    if (list.length === 0) return undefined;
    return list.reduce((best, cur) => ((cur.version || 0) >= (best.version || 0) ? cur : best), list[0]);
  }

  public addApprovedStatement(
    input: Partial<ApprovedStatementsSnapshot> & { clientId: string; fiscalYear: number }
  ): ApprovedStatementsSnapshot {
    const resolvedClientId = this.resolveMandatoryClientId(input.clientId);
    const existingForPeriod = this.getApprovedStatementsForClient(resolvedClientId, input.fiscalYear);
    const isReissue = existingForPeriod.length > 0;

    if (isReissue) {
      this.assertCan('EDIT_FINAL_STATEMENTS', {
        clientId: resolvedClientId,
        fiscalYear: input.fiscalYear,
        entityType: 'APPROVED_STATEMENT',
      });
    } else {
      this.assertCan('APPROVE_STATEMENT', {
        clientId: resolvedClientId,
        fiscalYear: input.fiscalYear,
        entityType: 'APPROVED_STATEMENT',
      });
    }

    const maxExistingVersion = existingForPeriod.reduce(
      (maxV, s) => Math.max(maxV, Number(s.version || s.versionNo || 0)),
      0
    );
    const nextVersion = input.version || input.versionNo || maxExistingVersion + 1;
    const verificationCode = input.verificationCode || generateVerificationCode();
    const nowTs = input.approvedAt || getCairoTimestamp();
    const user = this.getCurrentUser();
    const client = this.state.clients.find((c) => c.id === resolvedClientId);

    const canonicalFingerprintInput = JSON.stringify({
      clientId: resolvedClientId,
      fiscalYear: input.fiscalYear,
      version: nextVersion,
      verificationCode,
      incomeStatement: input.incomeStatement || {},
      balanceSheet: input.balanceSheet || {},
      cashFlow: input.cashFlow || {},
      adjustmentLayer: input.adjustmentLayer || null,
    });
    const sha256Fingerprint = input.sha256Fingerprint || computeSha256Hex(canonicalFingerprintInput);

    const snap: ApprovedStatementsSnapshot = {
      id: input.id || `as-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: resolvedClientId,
      fiscalYear: input.fiscalYear,
      version: nextVersion,
      versionNo: nextVersion,
      status: input.status || 'APPROVED',
      approvedAt: nowTs,
      approvedBy: input.approvedBy || user?.name || this.state.officeProfile?.auditorName || 'مراقب الحسابات',
      source: input.source || 'LEDGER',
      trialBalanceRows: input.trialBalanceRows || [],
      incomeStatement: input.incomeStatement || {},
      balanceSheet: input.balanceSheet || {},
      cashFlow: input.cashFlow || {},
      verificationCode,
      sha256Fingerprint,
      ...input,
    };

    // Mark any prior active versions for the same (clientId, fiscalYear) as SUPERSEDED (never deleted)
    for (const prev of existingForPeriod) {
      if (prev.status !== 'SUPERSEDED' && prev.id !== snap.id) {
        prev.status = 'SUPERSEDED';
        prev.supersededById = snap.id;
        prev.supersededByVersion = nextVersion;
        prev.supersededAt = nowTs;
        if (input.reissueReason) {
          prev.reissueReason = input.reissueReason;
        }
        if (prev.verificationCode) {
          IssuedDocumentService.markDocumentSuperseded(prev.verificationCode, {
            supersededAt: nowTs,
            supersededByVersion: nextVersion,
            supersededByVerificationCode: verificationCode,
            supersededByDocNumber: `FS-${input.fiscalYear}-V${nextVersion}`,
          } as any);
        }
      }
    }

    this.state.approvedStatements.unshift(snap);

    Promise.resolve(
      IssuedDocumentService.recordIssuedDocument({
        verificationCode,
        documentType: 'FINANCIAL_STATEMENTS',
        issueDate: nowTs.slice(0, 10),
        firmName: this.state.officeProfile?.firmName || client?.name || '—',
        status: 'ACTIVE',
        displayDocNumber: `FS-${input.fiscalYear}-V${nextVersion}`,
        version: nextVersion,
        clientId: resolvedClientId,
        fiscalYear: input.fiscalYear,
        sha256Fingerprint,
      } as any)
    ).catch(() => {
      // ignore registry sync error
    });

    this.recordAuditMutation({
      action: isReissue ? 'REISSUE_APPROVED_FINANCIAL_STATEMENT' : 'APPROVE_FINANCIAL_STATEMENT',
      entityType: 'APPROVED_STATEMENT',
      entityId: snap.id,
      clientId: resolvedClientId,
      beforeValue: isReissue ? existingForPeriod[0] : null,
      afterValue: snap,
      reason: input.reissueReason || `اعتماد الإصدار (${nextVersion}) للقوائم المالية`,
      details: isReissue
        ? `إعادة إصدار واعتماد القوائم المالية للعميل (${resolvedClientId}) للسنة (${input.fiscalYear}) - الإصدار (${nextVersion}) مع وسم الإصدار السابق SUPERSEDED. السبب: ${input.reissueReason || '—'}`
        : `اعتماد القوائم المالية للعميل (${resolvedClientId}) للسنة (${input.fiscalYear}) - الإصدار (${nextVersion})`,
    });
    this.saveState('APPROVED_STATEMENTS');
    return snap;
  }

  // =========================================================================
  // Certificates & Verification Persistence
  // =========================================================================
  public addCertificate(
    certInput: Partial<ProfessionalCertificate> & { clientName: string; certifiedAmount: number }
  ): ProfessionalCertificate {
    this.assertCan('ISSUE_CERTIFICATE', {
      clientId: certInput.clientId,
      entityType: 'CERTIFICATE',
      allowWithoutClient: !certInput.clientId,
    });
    const verificationCode = certInput.verificationCode || generateVerificationCode();
    const serials = this.getSystemSerials();
    const nextCertSeq = Math.max(serials.certificateNextNumber || 501, 101);
    serials.certificateNextNumber = nextCertSeq + 1;
    const cert: ProfessionalCertificate = {
      id: certInput.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      certificateNumber:
        certInput.certificateNumber || `CERT-${getCairoCurrentYear()}-${nextCertSeq}`,
      certificateType: certInput.certificateType || 'INCOME_PROOF',
      beneficiaryType: certInput.beneficiaryType || 'NATURAL_PERSON',
      clientName: certInput.clientName,
      recipientEntity: certInput.recipientEntity || '',
      purpose: certInput.purpose || '',
      periodText: certInput.periodText || '',
      certifiedAmount: Number(certInput.certifiedAmount) || 0,
      issueDate: certInput.issueDate || getCairoDateString(),
      qrPayload: certInput.qrPayload || '',
      auditorNotes: certInput.auditorNotes || '',
      securityHash: certInput.securityHash || '',
      printedCount: certInput.printedCount || 0,
      verificationCode,
      registryStatus: 'PENDING',
      createdAt: certInput.createdAt || getCairoTimestamp(),
      ...certInput,
    };

    this.state.certificates.unshift(cert);
    this.logAudit({
      action: 'ISSUE_CERTIFICATE',
      entityType: 'CERTIFICATE',
      entityId: cert.id,
      clientId: cert.clientId,
      beforeValue: null,
      afterValue: cert,
      details: `إصدار شهادة مهنية رقم (${cert.certificateNumber}) للعميل (${cert.clientName})`,
    });
    this.saveState('CERTIFICATES');

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
    if (idx === -1) {
      this.assertCan('EDIT_RECORD', { entityType: 'CERTIFICATE' });
      return undefined;
    }
    const before = { ...this.state.certificates[idx] };
    this.assertCan('EDIT_RECORD', {
      clientId: before.clientId,
      entityType: 'CERTIFICATE',
      allowWithoutClient: !before.clientId,
    });
    this.state.certificates[idx] = { ...before, ...partial };
    this.logAudit({
      action: 'UPDATE_CERTIFICATE',
      entityType: 'CERTIFICATE',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.certificates[idx],
      details: `تعديل الشهادة المهنية رقم (${before.certificateNumber})`,
    });
    this.saveState('CERTIFICATES');
    return this.state.certificates[idx];
  }

  public deleteCertificate(id: string): boolean {
    const target = this.state.certificates.find((c) => c.id === id);
    if (!target) {
      this.assertCan('DELETE_RECORD', { entityType: 'CERTIFICATE' });
      return false;
    }
    this.assertCan('DELETE_RECORD', {
      clientId: target.clientId,
      entityType: 'CERTIFICATE',
      allowWithoutClient: !target.clientId,
    });
    const before = this.state.certificates.length;
    this.state.certificates = this.state.certificates.filter((c) => c.id !== id);
    this.logAudit({
      action: 'DELETE_CERTIFICATE',
      entityType: 'CERTIFICATE',
      entityId: id,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف الشهادة المهنية رقم (${target.certificateNumber})`,
    });
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
    if (decl.clientId !== undefined && !String(decl.clientId).trim()) {
      throw new Error('ممنوع تسجيل إقرار ضريبي بدون تحديد العميل (clientId إلزامي).');
    }
    const resolvedClientId = this.resolveMandatoryClientId(decl.clientId);
    const dueDate = (decl.dueDate || getCairoDateString()).trim().slice(0, 10);
    const fy = decl.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, dueDate);
    this.assertCan('TAX', { clientId: resolvedClientId, fiscalYear: fy, entityType: 'TAX_DECLARATION' });

    const created: TaxDeclarationRecord = {
      id: decl.id || `tax-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      declarationType: decl.declarationType || 'VAT_MONTHLY',
      period: decl.period || '',
      dueDate,
      taxableBase: Number(decl.taxableBase) || 0,
      taxAmount: Number(decl.taxAmount) || 0,
      penaltiesOrAdjustments: Number(decl.penaltiesOrAdjustments) || 0,
      whtDeductions: Number(decl.whtDeductions) || 0,
      netPayable: Number(decl.netPayable) || 0,
      status: decl.status || 'DRAFT',
      ...decl,
      clientId: resolvedClientId,
      fiscalYear: fy,
    };
    this.state.taxDeclarations.unshift(created);
    this.logAudit({
      action: 'ADD_TAX_DECLARATION',
      entityType: 'TAX_DECLARATION',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: created,
      details: `إضافة إقرار ضريبي (${created.declarationType}) للفترة (${created.period}) للعميل (${resolvedClientId}) للسنة (${fy})`,
    });
    this.saveState('TAXES');
    return created;
  }

  public updateTaxDeclaration(id: string, partial: Partial<TaxDeclarationRecord>): TaxDeclarationRecord | undefined {
    const idx = this.state.taxDeclarations.findIndex((t) => t.id === id);
    if (idx === -1) {
      this.assertCan('TAX', { entityType: 'TAX_DECLARATION' });
      return undefined;
    }
    const before = { ...this.state.taxDeclarations[idx] };
    this.assertCan('TAX', {
      clientId: before.clientId,
      fiscalYear: before.fiscalYear,
      entityType: 'TAX_DECLARATION',
    });
    this.state.taxDeclarations[idx] = { ...before, ...partial };
    this.logAudit({
      action: 'UPDATE_TAX_DECLARATION',
      entityType: 'TAX_DECLARATION',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.taxDeclarations[idx],
      details: `تحديث الإقرار الضريبي (${before.declarationType} - ${before.period})`,
    });
    this.saveState('TAXES');
    return this.state.taxDeclarations[idx];
  }

  public deleteTaxDeclaration(id: string): boolean {
    const idx = this.state.taxDeclarations.findIndex((t) => t.id === id);
    if (idx === -1) {
      this.assertCan('DELETE_RECORD', { allowWithoutClient: true, entityType: 'TAX_DECLARATION' });
      return false;
    }
    const target = this.state.taxDeclarations[idx];
    this.assertCan('DELETE_RECORD', {
      clientId: target.clientId,
      fiscalYear: target.fiscalYear,
      allowWithoutClient: !target.clientId,
      entityType: 'TAX_DECLARATION',
    });
    this.state.taxDeclarations.splice(idx, 1);
    this.logAudit({
      action: 'DELETE_TAX_DECLARATION',
      entityType: 'TAX_DECLARATION',
      entityId: id,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      details: `حذف الإقرار الضريبي (${target.declarationType} - ${target.period})`,
    });
    this.saveState('TAXES');
    return true;
  }

  public updateTaxMandate(id: string, partial: any): any {
    this.assertCan('TAX', {
      clientId: partial?.clientId,
      allowWithoutClient: !partial?.clientId,
      entityType: 'TAX_MANDATE',
    });
    const idx = this.state.taxMandates.findIndex((m) => m.id === id);
    const before = idx >= 0 ? { ...this.state.taxMandates[idx] } : null;
    if (idx >= 0) {
      this.state.taxMandates[idx] = { ...this.state.taxMandates[idx], ...partial };
    } else {
      this.state.taxMandates.push({ id, ...partial });
    }
    const after = idx >= 0 ? this.state.taxMandates[idx] : { id, ...partial };
    this.logAudit({
      action: 'UPDATE_TAX_MANDATE',
      entityType: 'TAX_MANDATE',
      entityId: id,
      clientId: partial?.clientId,
      beforeValue: before,
      afterValue: after,
      details: `تحديث سجل الفحص الضريبي (${id})`,
    });
    this.saveState('TAXES');
    return after;
  }

  public peekNextInvoiceNumber(clientId: string, fiscalYear: number): string {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const serials = this.getSystemSerials();
    if (!serials.clientYearInvoiceCounters) {
      serials.clientYearInvoiceCounters = {};
    }
    const key = `${resolvedClientId}:${fiscalYear}`;
    let maxExisting = serials.clientYearInvoiceCounters[key] || 0;

    for (const inv of this.state.invoices) {
      if (inv.clientId !== resolvedClientId) continue;
      const invFy = inv.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, inv.date);
      if (invFy !== fiscalYear) continue;
      const m = /(\d+)$/.exec(String(inv.invoiceNumber || '').trim());
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxExisting) {
          maxExisting = num;
        }
      }
    }
    const nextSeq = maxExisting + 1;
    return `INV-${fiscalYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  public getNextInvoiceNumber(clientId: string, fiscalYear: number): string {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const formatted = this.peekNextInvoiceNumber(resolvedClientId, fiscalYear);
    const m = /(\d+)$/.exec(formatted);
    const nextNum = m ? parseInt(m[1], 10) : 1;
    const serials = this.getSystemSerials();
    if (!serials.clientYearInvoiceCounters) {
      serials.clientYearInvoiceCounters = {};
    }
    const key = `${resolvedClientId}:${fiscalYear}`;
    serials.clientYearInvoiceCounters[key] = nextNum;
    serials.invoiceNextNumber = Math.max((serials.invoiceNextNumber || 100) + 1, nextNum + 100);
    return formatted;
  }

  public addInvoice(inv: Partial<Invoice>): Invoice {
    if (inv.clientId !== undefined && !String(inv.clientId).trim()) {
      throw new Error('ممنوع تسجيل فاتورة بدون تحديد العميل (clientId إلزامي).');
    }
    const resolvedClientId = this.resolveMandatoryClientId(inv.clientId);
    const invDate = (inv.date || getCairoDateString()).trim().slice(0, 10);
    const invYear = inv.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, invDate);
    this.assertCan(inv.isPosted ? 'POST_ENTRY' : 'EDIT_RECORD', {
      clientId: resolvedClientId,
      fiscalYear: invYear,
      entityType: 'INVOICE',
      date: invDate,
    });
    this.assertPeriodOpen(resolvedClientId, invDate, invYear, 'INVOICE');

    this.batchAddInvoices([{ ...inv, clientId: resolvedClientId, date: invDate, fiscalYear: invYear }]);
    const created = this.state.invoices[this.state.invoices.length - 1];
    return created;
  }

  public batchAddInvoices(invoicesList: Partial<Invoice>[]): number {
    if (invoicesList.length === 0) {
      this.assertCan('EDIT_RECORD', { entityType: 'INVOICE' });
      return 0;
    }
    let added = 0;
    for (const inv of invoicesList) {
      if (inv.clientId !== undefined && !String(inv.clientId).trim()) {
        throw new Error('ممنوع تسجيل فاتورة بدون تحديد العميل (clientId إلزامي).');
      }
      const resolvedClientId = this.resolveMandatoryClientId(inv.clientId);
      const invDate = (inv.date || getCairoDateString()).trim().slice(0, 10);
      const invYear = inv.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, invDate);
      this.assertCan(inv.isPosted ? 'POST_ENTRY' : 'EDIT_RECORD', {
        clientId: resolvedClientId,
        fiscalYear: invYear,
        entityType: 'INVOICE',
        date: invDate,
      });
      this.assertPeriodOpen(resolvedClientId, invDate, invYear, 'INVOICE');

      const rawInvNum = (inv.invoiceNumber || '').trim();
      const invNumClean = rawInvNum || this.getNextInvoiceNumber(resolvedClientId, invYear);

      // منع استيراد أو تسجيل فاتورة مكررة لنفس العميل ونوع الفاتورة (clientId + invoiceNumber + invoiceType)
      const invType = inv.invoiceType || 'SALES';
      const duplicateExists = this.state.invoices.some(
        (existing) =>
          existing.clientId === resolvedClientId &&
          existing.invoiceNumber.trim().toLowerCase() === invNumClean.toLowerCase() &&
          (existing.invoiceType || 'SALES') === invType
      );
      if (duplicateExists) {
        throw new Error(
          `رفض إضافة/استيراد الفاتورة: الفاتورة رقم (${invNumClean}) مسجلة بالفعل لدى العميل (${resolvedClientId}).`
        );
      }

      // Advance sequential counter if explicit invoiceNumber ends with digits
      const seqMatch = /(\d+)$/.exec(invNumClean);
      if (seqMatch) {
        const numericSeq = parseInt(seqMatch[1], 10);
        const serials = this.getSystemSerials();
        if (!serials.clientYearInvoiceCounters) {
          serials.clientYearInvoiceCounters = {};
        }
        const counterKey = `${resolvedClientId}:${invYear}`;
        if (numericSeq > (serials.clientYearInvoiceCounters[counterKey] || 0)) {
          serials.clientYearInvoiceCounters[counterKey] = numericSeq;
        }
      }

      const invCurrency = inv.currency || 'EGP';
      const rate =
        invCurrency === 'EGP'
          ? 1
          : inv.exchangeRate && inv.exchangeRate > 0
          ? inv.exchangeRate
          : this.getExchangeRateValue(invCurrency, invDate);

      const created: Invoice = {
        id: inv.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        invoiceType: inv.invoiceType || 'SALES',
        date: invDate,
        partnerName: inv.partnerName || 'عميل / مورد',
        items: inv.items || [],
        subtotal: Number(inv.subtotal) || 0,
        totalDiscount: Number(inv.totalDiscount) || 0,
        totalVat: Number(inv.totalVat) || 0,
        totalWht: Number(inv.totalWht) || 0,
        grandTotal: Number(inv.grandTotal) || 0,
        paidAmount: Number(inv.paidAmount) || 0,
        remainingAmount: Number(inv.remainingAmount) || 0,
        currency: invCurrency,
        exchangeRate: rate,
        status: inv.status || 'ISSUED',
        paymentMethod: inv.paymentMethod || 'CASH',
        createdAt: inv.createdAt || getCairoTimestamp(),
        ...inv,
        invoiceNumber: invNumClean,
        clientId: resolvedClientId,
        fiscalYear: invYear,
      };
      this.state.invoices.push(created);

      this.logAudit({
        action: 'CREATE_INVOICE',
        entityType: 'INVOICE',
        entityId: created.id,
        clientId: resolvedClientId,
        beforeValue: null,
        afterValue: created,
        reason: `إصدار فاتورة (${created.invoiceNumber})`,
        details: `إضافة فاتورة رقم (${created.invoiceNumber}) للعميل (${resolvedClientId}) للسنة (${invYear}) بإجمالي ${created.grandTotal} ج.م`,
      });
      added++;
    }
    this.saveState('INVOICES');
    this.saveState('SERIALS');
    return added;
  }

  public updateInvoice(id: string, partial: Partial<Invoice>, reason = 'تحديث بيانات الفاتورة'): Invoice | undefined {
    const idx = this.state.invoices.findIndex((i) => i.id === id);
    if (idx === -1) {
      this.assertCan('EDIT_RECORD', { entityType: 'INVOICE' });
      return undefined;
    }
    const before = { ...this.state.invoices[idx] };
    const invYear = this.extractYearFromDate(before.date);
    this.assertCan(before.isPosted ? 'EDIT_POSTED' : 'EDIT_RECORD', {
      clientId: before.clientId,
      fiscalYear: invYear,
      entityType: 'INVOICE',
    });
    this.assertPeriodOpen(before.clientId, before.date, invYear, 'INVOICE');
    if (partial.date) {
      this.assertPeriodOpen(before.clientId, partial.date, this.extractYearFromDate(partial.date), 'INVOICE');
    }

    this.state.invoices[idx] = {
      ...before,
      ...partial,
      clientId: before.clientId,
    };

    this.logAudit({
      action: 'UPDATE_INVOICE',
      entityType: 'INVOICE',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.invoices[idx],
      reason,
      details: `تعديل الفاتورة رقم (${before.invoiceNumber}) للعميل (${before.clientId})`,
    });

    this.saveState('INVOICES');
    return this.state.invoices[idx];
  }

  public deleteInvoice(id: string, reason = 'حذف فاتورة غير مرحّلة'): boolean {
    const target = this.state.invoices.find((i) => i.id === id);
    if (!target) {
      this.assertCan('DELETE_RECORD', { entityType: 'INVOICE' });
      return false;
    }
    const invYear = this.extractYearFromDate(target.date);
    this.assertCan('DELETE_RECORD', {
      clientId: target.clientId,
      fiscalYear: invYear,
      entityType: 'INVOICE',
    });
    this.assertPeriodOpen(target.clientId, target.date, invYear, 'INVOICE');
    if (target.isPosted) {
      throw new PermissionError(
        'عملية مرفوضة: الفاتورة المرحّلة لا تُحذف؛ يجب إلغاؤها (VOID_RECORD) أو إصدار قيد عكسي لها.',
        {
          action: 'DELETE_RECORD',
          clientId: target.clientId,
          fiscalYear: invYear,
          entityType: 'INVOICE',
        }
      );
    }
    const before = this.state.invoices.length;
    this.state.invoices = this.state.invoices.filter((i) => i.id !== id);
    this.logAudit({
      action: 'DELETE_INVOICE',
      entityType: 'INVOICE',
      entityId: id,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      reason,
      details: `حذف الفاتورة رقم (${target.invoiceNumber}) للعميل (${target.clientId})`,
    });
    this.saveState('INVOICES');
    return this.state.invoices.length < before;
  }

  public voidInvoice(id: string, reason = 'إلغاء فاتورة'): Invoice | undefined {
    const idx = this.state.invoices.findIndex((i) => i.id === id);
    if (idx === -1) {
      this.assertCan('VOID_RECORD', { entityType: 'INVOICE' });
      return undefined;
    }
    const before = { ...this.state.invoices[idx] };
    const invYear = this.extractYearFromDate(before.date);
    this.assertCan('VOID_RECORD', {
      clientId: before.clientId,
      fiscalYear: invYear,
      entityType: 'INVOICE',
    });
    this.assertPeriodOpen(before.clientId, before.date, invYear, 'INVOICE');

    this.state.invoices[idx] = {
      ...before,
      status: 'CANCELLED',
    };
    this.logAudit({
      action: 'VOID_INVOICE',
      entityType: 'INVOICE',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.invoices[idx],
      reason,
      details: `إلغاء/إبطال الفاتورة رقم (${before.invoiceNumber}) للعميل (${before.clientId})`,
    });
    this.saveState('INVOICES');
    return this.state.invoices[idx];
  }

  public postInvoice(invoiceId: string, actingUser?: SystemUser): JournalEntry {
    const invoice = this.state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      this.assertCan('POST_ENTRY', { entityType: 'INVOICE' }, actingUser);
      throw new Error('الفاتورة المطلوب ترحيلها غير موجودة في قاعدة البيانات.');
    }
    const resolvedClientId = this.resolveMandatoryClientId(invoice.clientId);
    const invDate = (invoice.date || getCairoDateString()).slice(0, 10);
    const fiscalYear = this.extractYearFromDate(invDate);

    const user = this.assertCan(
      'POST_ENTRY',
      {
        clientId: resolvedClientId,
        fiscalYear,
        entityType: 'INVOICE',
        date: invDate,
      },
      actingUser
    );
    this.assertPeriodOpen(resolvedClientId, invDate, fiscalYear, 'INVOICE');

    if (invoice.isPosted && invoice.journalEntryId) {
      const existingJe = this.state.journalEntries.find((j) => j.id === invoice.journalEntryId);
      if (existingJe) {
        throw new Error(`تم ترحيل هذه الفاتورة مسبقاً (${invoice.invoiceNumber}) بالقيد رقم (${existingJe.entryNumber}).`);
      }
    }

    const mapping = this.getClientAccountMapping(resolvedClientId);
    const invType = String(invoice.invoiceType || 'SALES').toUpperCase();
    const isPurchaseLike = invType === 'PURCHASE' || invType === 'RETURN_SALES' || invType === 'CREDIT_NOTE';
    const subtotal = Number(invoice.subtotal) || 0;
    const discount = Number(invoice.totalDiscount) || 0;
    const netTaxable = Math.max(0, subtotal - discount);
    const vat = Number(invoice.totalVat) || 0;
    const wht = Number(invoice.totalWht) || 0;
    const grandTotal = Number(invoice.grandTotal) || Math.max(0, netTaxable + vat - wht);

    const lines: JournalEntryLine[] = [];
    if (!isPurchaseLike) {
      const arCode = invoice.paymentMethod === 'CASH' ? mapping.cashAccountCode || '1101' : mapping.receivablesAccountCode || '1103';
      const revCode = invType === 'OFFICE_SERVICE' ? mapping.officeServiceRevenueAccountCode || '4120' : mapping.salesAccountCode || '4101';
      lines.push({
        id: `inv-dr-${Date.now()}-1`,
        accountCode: arCode,
        accountName: 'العملاء / النقدية',
        debit: grandTotal,
        credit: 0,
      });
      if (wht > 0) {
        lines.push({
          id: `inv-dr-${Date.now()}-2`,
          accountCode: mapping.whtReceivableAccountCode || '1106',
          accountName: 'ضريبة خصم وتحصيل مدينة',
          debit: wht,
          credit: 0,
        });
      }
      lines.push({
        id: `inv-cr-${Date.now()}-1`,
        accountCode: revCode,
        accountName: 'إيرادات المبيعات / النشاط',
        debit: 0,
        credit: netTaxable,
      });
      if (vat > 0) {
        lines.push({
          id: `inv-cr-${Date.now()}-2`,
          accountCode: mapping.vatOutputAccountCode || '2104',
          accountName: 'ضريبة القيمة المضافة مخرجات',
          debit: 0,
          credit: vat,
        });
      }
    } else {
      const expCode = mapping.purchasesAccountCode || '5101';
      const apCode = invoice.paymentMethod === 'CASH' ? mapping.cashAccountCode || '1101' : mapping.payablesAccountCode || '2101';
      lines.push({
        id: `inv-dr-${Date.now()}-1`,
        accountCode: expCode,
        accountName: 'المشتريات / التكاليف',
        debit: netTaxable,
        credit: 0,
      });
      if (vat > 0) {
        lines.push({
          id: `inv-dr-${Date.now()}-2`,
          accountCode: mapping.vatInputAccountCode || '1105',
          accountName: 'ضريبة القيمة المضافة مدخلات',
          debit: vat,
          credit: 0,
        });
      }
      lines.push({
        id: `inv-cr-${Date.now()}-1`,
        accountCode: apCode,
        accountName: 'الموردون / النقدية',
        debit: 0,
        credit: grandTotal,
      });
      if (wht > 0) {
        lines.push({
          id: `inv-cr-${Date.now()}-2`,
          accountCode: mapping.whtPayableAccountCode || '2105',
          accountName: 'ضريبة خصم وتحصيل دائنة',
          debit: 0,
          credit: wht,
        });
      }
    }

    const beforeInv = { ...invoice };
    const savedEntry = this.addJournalEntry({
      clientId: resolvedClientId,
      date: invDate,
      fiscalYear,
      description: `ترحيل فاتورة (${invoice.invoiceNumber}) - ${invoice.partnerName}`,
      referenceNumber: invoice.invoiceNumber,
      documentType: 'INVOICE',
      invoiceType: invoice.invoiceType || 'SALES',
      sourceInvoiceId: invoice.id,
      currency: invoice.currency || 'EGP',
      exchangeRate: invoice.exchangeRate || 1,
      isPosted: true,
      status: 'POSTED',
      postedAt: getCairoTimestamp(),
      postedBy: user.name,
      lines,
    });

    invoice.journalEntryId = savedEntry.id;
    invoice.isPosted = true;

    this.logAudit({
      action: 'POST_INVOICE',
      entityType: 'INVOICE',
      entityId: invoice.id,
      clientId: resolvedClientId,
      beforeValue: beforeInv,
      afterValue: invoice,
      details: `ترحيل الفاتورة رقم (${invoice.invoiceNumber}) إلى القيد المحاسبي رقم (${savedEntry.entryNumber})`,
    });

    this.saveState('INVOICES');
    return savedEntry;
  }

  public addFixedAsset(asset: Partial<FixedAsset>): FixedAsset {
    if (asset.clientId !== undefined && !String(asset.clientId).trim()) {
      throw new Error('ممنوع تسجيل أصل ثابت بدون تحديد العميل (clientId إلزامي).');
    }
    const resolvedClientId = this.resolveMandatoryClientId(asset.clientId);
    this.assertCan('EDIT', { clientId: resolvedClientId });

    const purchaseDate = (asset.purchaseDate || getCairoDateString()).trim().slice(0, 10);
    const assetFiscalYear = asset.fiscalYear || this.resolveClientFiscalYearForDate(resolvedClientId, purchaseDate);

    let maxAssetSeq = 0;
    for (const fa of this.state.fixedAssets) {
      if (fa.clientId !== resolvedClientId) continue;
      const m = /(\d+)$/.exec(String(fa.assetCode || '').trim());
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxAssetSeq) maxAssetSeq = n;
      }
    }

    const created: FixedAsset = {
      id: asset.id || `fa-asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetCode: asset.assetCode || `AST-${assetFiscalYear}-${String(maxAssetSeq + 1).padStart(3, '0')}`,
      name: asset.name || 'أصل ثابت',
      category: asset.category || 'COMPUTERS_SOFTWARE',
      purchaseDate,
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
      clientId: resolvedClientId,
      fiscalYear: assetFiscalYear,
    };
    this.state.fixedAssets.push(created);

    this.logAudit({
      action: 'ADD_FIXED_ASSET',
      entityType: 'FIXED_ASSET',
      entityId: created.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: created,
      reason: `إضافة أصل ثابت (${created.name})`,
      details: `إضافة الأصل (${created.assetCode} - ${created.name}) للعميل (${resolvedClientId}) للسنة (${assetFiscalYear}) بتكلفة ${created.purchaseCost} ج.م`,
    });

    this.saveState('FIXED_ASSETS');
    return created;
  }

  public updateFixedAsset(id: string, partial: Partial<FixedAsset>, reason = 'تحديث بيانات أصل ثابت'): FixedAsset | undefined {
    const idx = this.state.fixedAssets.findIndex((a) => a.id === id);
    if (idx === -1) {
      this.assertCan('EDIT');
      return undefined;
    }
    const before = { ...this.state.fixedAssets[idx] };
    this.assertCan('EDIT', { clientId: before.clientId });

    this.state.fixedAssets[idx] = {
      ...before,
      ...partial,
      clientId: before.clientId,
    };

    this.logAudit({
      action: 'UPDATE_FIXED_ASSET',
      entityType: 'FIXED_ASSET',
      entityId: id,
      clientId: before.clientId,
      beforeValue: before,
      afterValue: this.state.fixedAssets[idx],
      reason,
      details: `تعديل الأصل الثابت (${before.assetCode} - ${before.name}) للعميل (${before.clientId})`,
    });

    this.saveState('FIXED_ASSETS');
    return this.state.fixedAssets[idx];
  }

  public deleteFixedAsset(id: string, reason = 'حذف أصل ثابت'): boolean {
    const target = this.state.fixedAssets.find((a) => a.id === id);
    if (!target) {
      this.assertCan('DELETE');
      return false;
    }
    this.assertCan('DELETE', { clientId: target.clientId });

    const before = this.state.fixedAssets.length;
    this.state.fixedAssets = this.state.fixedAssets.filter((a) => a.id !== id);

    this.logAudit({
      action: 'DELETE_FIXED_ASSET',
      entityType: 'FIXED_ASSET',
      entityId: id,
      clientId: target.clientId,
      beforeValue: target,
      afterValue: null,
      reason,
      details: `حذف الأصل الثابت (${target.assetCode} - ${target.name}) للعميل (${target.clientId})`,
    });

    this.saveState('FIXED_ASSETS');
    return this.state.fixedAssets.length < before;
  }

  public disposeFixedAsset(
    id: string,
    disposalInfo: { disposalDate: string; disposalValue?: number; disposalAmount?: number; notes?: string }
  ): FixedAsset | undefined {
    const asset = this.state.fixedAssets.find((a) => a.id === id);
    if (!asset) return undefined;
    this.assertCan('EDIT_RECORD', {
      clientId: asset.clientId,
      entityType: 'أصل ثابت',
      date: disposalInfo.disposalDate,
    });
    this.assertPeriodOpen(asset.clientId, disposalInfo.disposalDate, undefined, 'أصل ثابت');

    const updated = this.updateFixedAsset(
      id,
      {
        status: 'DISPOSED',
        disposalDate: disposalInfo.disposalDate,
        disposalValue: disposalInfo.disposalValue ?? disposalInfo.disposalAmount ?? 0,
        notes: disposalInfo.notes,
      },
      disposalInfo.notes || 'استبعاد وتخريد أصل ثابت'
    );

    this.recordAuditMutation({
      action: 'DISPOSE_FIXED_ASSET',
      entityType: 'FIXED_ASSET',
      entityId: id,
      clientId: asset.clientId,
      beforeValue: { status: asset.status },
      afterValue: { status: 'DISPOSED', disposalDate: disposalInfo.disposalDate },
      details: `استبعاد وتخريد الأصل الثابت (${asset.assetName || asset.assetCode}) بقيمة تخريد (${disposalInfo.disposalValue ?? 0})`,
    });

    return updated;
  }

  public postDepreciationJournalEntry(params: {
    fiscalYear?: number;
    year?: number;
    totalDepreciation: number;
    clientId?: string;
    description?: string;
  }): JournalEntry {
    const fy = params.fiscalYear || params.year || getCairoCurrentYear();
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const fyBounds = this.getClientFiscalYearBounds(resolvedClientId, fy);
    this.assertCan('POST_ENTRY', {
      clientId: resolvedClientId,
      fiscalYear: fy,
      entityType: 'قيد إهلاك أصول ثابتة',
    });
    this.assertPeriodOpen(resolvedClientId, fyBounds.endDate, fy, 'قيد إهلاك');

    const entry = this.addJournalEntry({
      entryNumber: `DEP-${fy}`,
      date: fyBounds.endDate,
      description: params.description || `قيد إهلاك الأصول الثابتة السنوي لعام ${fy}`,
      documentType: 'DEPRECIATION',
      isPosted: true,
      status: 'POSTED',
      clientId: resolvedClientId,
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
          accountCode: '2102',
          accountName: 'مجمع إهلاك الأصول الثابتة',
          debit: 0,
          credit: params.totalDepreciation,
        },
      ],
    });

    this.recordAuditMutation({
      action: 'POST_DEPRECIATION_ENTRY',
      entityType: 'JOURNAL_ENTRY',
      entityId: entry.id,
      clientId: resolvedClientId,
      beforeValue: null,
      afterValue: { entryNumber: entry.entryNumber, totalDepreciation: params.totalDepreciation },
      details: `ترحيل قيد إهلاك الأصول الثابتة السنوي (${entry.entryNumber}) بمبلغ إجمالي (${params.totalDepreciation})`,
    });

    return entry;
  }

  public getDailyExchangeRate(currency: CurrencyCode, date?: string): DailyExchangeRateRecord | undefined {
    const normCurr = String(currency || '').trim().toUpperCase();
    const normDate = date ? String(date).trim().slice(0, 10) : '';
    const currencyRates = (this.state.exchangeRates || []).filter(
      (r) => String(r.currency || r.code || '').trim().toUpperCase() === normCurr
    );
    if (currencyRates.length === 0) return undefined;

    if (normDate) {
      const exactMatch = currencyRates.find((r) => String(r.date || '').slice(0, 10) === normDate);
      if (exactMatch) return exactMatch;

      const priorOrEqual = currencyRates
        .filter((r) => String(r.date || '').slice(0, 10) <= normDate)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      if (priorOrEqual.length > 0) return priorOrEqual[0];
    }

    const sortedLatest = [...currencyRates].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || ''))
    );
    return sortedLatest[0];
  }

  public getExchangeRateValue(currency: CurrencyCode, date?: string): number {
    if (!currency || String(currency).toUpperCase() === 'EGP') return 1;
    const rec = this.getDailyExchangeRate(currency, date);
    if (!rec) {
      throw new Error(
        `لا يوجد سعر صرف مسجل للعملة (${currency}) بتاريخ (${date || getCairoDateString()}). يرجى تسجيل سعر الصرف في جدول أسعار الصرف اليومية أولاً.`
      );
    }
    return Number(rec.officialRate || rec.rateToEgp || 0);
  }

  public saveExchangeRate(rate: Partial<DailyExchangeRateRecord> & { currency: CurrencyCode }): DailyExchangeRateRecord {
    this.assertCan('EDIT', { allowWithoutClient: true });
    const now = getCairoTimestamp();
    const normCurr = String(rate.currency).trim().toUpperCase();
    const normDate = (rate.date || getCairoDateString()).slice(0, 10);

    const existingIdx = this.state.exchangeRates.findIndex(
      (r) =>
        (rate.id && r.id === rate.id) ||
        (String(r.currency || r.code || '').trim().toUpperCase() === normCurr &&
          String(r.date || '').slice(0, 10) === normDate)
    );

    const record: DailyExchangeRateRecord = {
      id: existingIdx >= 0 ? this.state.exchangeRates[existingIdx].id : rate.id || `fx-${normCurr}-${normDate}`,
      baseCurrency: rate.baseCurrency || 'EGP',
      buyRate: Number(rate.buyRate || rate.officialRate || rate.rateToEgp || 1),
      sellRate: Number(rate.sellRate || rate.officialRate || rate.rateToEgp || 1),
      officialRate: Number(rate.officialRate || rate.rateToEgp || 1),
      rateToEgp: Number(rate.rateToEgp || rate.officialRate || 1),
      source: rate.source || 'CBE',
      createdAt: existingIdx >= 0 ? this.state.exchangeRates[existingIdx].createdAt : rate.createdAt || now,
      updatedAt: now,
      ...rate,
      date: normDate,
      currency: normCurr,
    };

    const before = existingIdx >= 0 ? { ...this.state.exchangeRates[existingIdx] } : null;
    if (existingIdx >= 0) {
      this.state.exchangeRates[existingIdx] = record;
    } else {
      this.state.exchangeRates.unshift(record);
    }
    this.logAudit({
      action: existingIdx >= 0 ? 'UPDATE_EXCHANGE_RATE' : 'ADD_EXCHANGE_RATE',
      entityType: 'EXCHANGE_RATE',
      entityId: record.id,
      beforeValue: before,
      afterValue: record,
      details: `حفظ سعر صرف العملة (${record.currency}) بتاريخ (${record.date}) مقابل الجنيه المصري (${record.officialRate} ج.م)`,
    });
    this.saveState('EXCHANGE_RATES');
    return record;
  }

  public saveBulkExchangeRates(records: Partial<DailyExchangeRateRecord>[]): number {
    this.assertCan('EDIT', { allowWithoutClient: true });
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
    this.assertCan('DELETE', { allowWithoutClient: true });
    const target = this.state.exchangeRates.find((r) => r.id === id);
    this.state.exchangeRates = this.state.exchangeRates.filter((r) => r.id !== id);
    this.logAudit({
      action: 'DELETE_EXCHANGE_RATE',
      entityType: 'EXCHANGE_RATE',
      entityId: id,
      beforeValue: target,
      afterValue: null,
      details: `حذف سعر صرف العملة (${target?.currency || id})`,
    });
    this.saveState('EXCHANGE_RATES');
  }

  // =========================================================================
  // Office Profile, Preferences, WhatsApp, Logs & Locks
  // =========================================================================
  public updateOfficeProfile(partial: Partial<OfficeProfile>): OfficeProfile {
    this.assertCan('EDIT', { allowWithoutClient: true });
    const before = { ...this.state.officeProfile };
    this.state.officeProfile = { ...this.state.officeProfile, ...partial };
    this.logAudit({
      action: 'UPDATE_OFFICE_PROFILE',
      entityType: 'OFFICE_PROFILE',
      beforeValue: before,
      afterValue: this.state.officeProfile,
      details: 'تحديث البيانات الأساسية لمكتب المحاسبة والمراجعة',
    });
    this.saveState('OFFICE_PROFILE');
    return this.state.officeProfile;
  }

  public updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    this.assertCan('EDIT', { allowWithoutClient: true });
    const before = { ...this.state.preferences };
    this.state.preferences = { ...this.state.preferences, ...partial };
    this.logAudit({
      action: 'UPDATE_PREFERENCES',
      entityType: 'PREFERENCES',
      beforeValue: before,
      afterValue: this.state.preferences,
      details: 'تحديث تفضيلات العرض والواجهة',
    });
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
    this.assertCan('EDIT', { allowWithoutClient: true });
    const settings = this.getWhatsAppBotSettings();
    const idx = settings.templates.findIndex((t) => t.id === tpl.id);
    const before = idx >= 0 ? { ...settings.templates[idx] } : null;
    if (idx >= 0) {
      settings.templates[idx] = { ...tpl, updatedAt: getCairoTimestamp() };
    } else {
      settings.templates.push({ ...tpl, id: tpl.id || `tpl-${Date.now()}`, updatedAt: getCairoTimestamp() });
    }
    this.logAudit({
      action: idx >= 0 ? 'UPDATE_WHATSAPP_TEMPLATE' : 'ADD_WHATSAPP_TEMPLATE',
      entityType: 'WHATSAPP_TEMPLATE',
      entityId: tpl.id,
      beforeValue: before,
      afterValue: tpl,
      details: `حفظ قالب رسائل واتساب (${tpl.title || tpl.id})`,
    });
    this.saveState('WHATSAPP');
    return tpl;
  }

  public deleteWhatsAppTemplate(id: string): void {
    this.assertCan('DELETE', { allowWithoutClient: true });
    const settings = this.getWhatsAppBotSettings();
    const target = settings.templates.find((t) => t.id === id);
    settings.templates = settings.templates.filter((t) => t.id !== id);
    this.logAudit({
      action: 'DELETE_WHATSAPP_TEMPLATE',
      entityType: 'WHATSAPP_TEMPLATE',
      entityId: id,
      beforeValue: target,
      afterValue: null,
      details: `حذف قالب رسائل واتساب (${target?.title || id})`,
    });
    this.saveState('WHATSAPP');
  }

  public resetWhatsAppTemplatesToDefault(): void {
    this.assertCan('EDIT', { allowWithoutClient: true });
    const settings = this.getWhatsAppBotSettings();
    const before = [...settings.templates];
    settings.templates = [...DEFAULT_WHATSAPP_TEMPLATES];
    this.logAudit({
      action: 'RESET_WHATSAPP_TEMPLATES',
      entityType: 'WHATSAPP_TEMPLATE',
      beforeValue: { count: before.length },
      afterValue: { count: settings.templates.length },
      details: 'إعادة ضبط قوالب رسائل واتساب إلى القوالب الافتراضية',
    });
    this.saveState('WHATSAPP');
  }

  public sendWhatsAppMessage(msgInput: Partial<WhatsAppMessage> & { phoneNumber: string; messageBody: string }): WhatsAppMessage {
    this.assertCan('EDIT', { clientId: msgInput.clientId, allowWithoutClient: !msgInput.clientId });
    const msg: WhatsAppMessage = {
      id: msgInput.id || `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: msgInput.clientId,
      clientName: msgInput.clientName || 'عميل',
      phoneNumber: msgInput.phoneNumber,
      category: msgInput.category || 'GENERAL',
      messageBody: msgInput.messageBody,
      direction: msgInput.direction || 'OUTBOUND',
      status: msgInput.status || 'SENT',
      sentAt: msgInput.sentAt || getCairoTimestamp(),
    };
    this.state.whatsappMessages.unshift(msg);
    this.logAudit({
      action: 'SEND_WHATSAPP_MESSAGE',
      entityType: 'WHATSAPP_MESSAGE',
      entityId: msg.id,
      clientId: msg.clientId,
      beforeValue: null,
      afterValue: msg,
      details: `إرسال رسالة واتساب إلى (${msg.phoneNumber})`,
    });
    this.saveState('WHATSAPP');
    return msg;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.state.auditLogs || [];
  }

  public addFinancialActivityLog(logInput: Partial<FinancialActivityLog>): FinancialActivityLog {
    this.assertCan('EDIT', { clientId: logInput.clientId, allowWithoutClient: !logInput.clientId });
    const entry: FinancialActivityLog = {
      id: logInput.id || `fal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: logInput.timestamp || getCairoTimestamp(),
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

  public clearFinancialActivityLogs(
    fiscalYear?: number,
    clientId?: string,
    options?: { confirmationText?: string; reason?: string }
  ): void {
    this.assertCan('ADMIN', { clientId, requireAdmin: true, allowWithoutClient: true });
    if (
      !options?.confirmationText ||
      (options.confirmationText !== 'تأكيد' && options.confirmationText !== 'CONFIRM') ||
      !options.reason?.trim()
    ) {
      throw new Error(
        'عملية مرفوضة: مسح سجل النشاط المالي يتطلب صلاحية ADMIN مع كلمة التأكيد ("تأكيد" أو "CONFIRM") وإدخال سبب واضح.'
      );
    }
    const beforeCount = (this.state.financialActivityLogs || []).length;
    if (!fiscalYear && !clientId) {
      this.state.financialActivityLogs = [];
    } else {
      this.state.financialActivityLogs = (this.state.financialActivityLogs || []).filter(
        (l) => (fiscalYear && l.fiscalYear !== fiscalYear) || (clientId && l.clientId !== clientId)
      );
    }
    this.logAudit({
      action: 'CLEAR_FINANCIAL_ACTIVITY_LOGS',
      entityType: 'ACTIVITY_LOGS',
      clientId,
      beforeValue: { count: beforeCount },
      afterValue: { count: this.state.financialActivityLogs.length },
      reason: options.reason.trim(),
      details: `مسح سجل النشاط المالي بواسطة ADMIN - السبب: ${options.reason.trim()}`,
    });
    this.saveState('ACTIVITY_LOGS');
  }

  public clearLocalAccountingData(options?: { confirmationText?: string; reason?: string }): void {
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true });
    if (
      !options?.confirmationText ||
      (options.confirmationText !== 'تأكيد' && options.confirmationText !== 'CONFIRM') ||
      !options.reason?.trim()
    ) {
      throw new Error(
        'عملية مرفوضة: تفريغ البيانات المحاسبية المحلية يتطلب صلاحية ADMIN مع كلمة التأكيد ("تأكيد" أو "CONFIRM") وإدخال سبب واضح.'
      );
    }
    const hasPosted = this.state.journalEntries.some((j) => j.isPosted || j.status === 'POSTED');
    if (hasPosted) {
      throw new Error('عملية مرفوضة: لا يمكن مسح القيود المرحّلة. القيود المرحّلة لا تُحذف.');
    }

    const beforeSnapshot = {
      journalEntriesCount: this.state.journalEntries.length,
      invoicesCount: this.state.invoices.length,
      treasuryCount: this.state.treasuryTransactions.length,
    };
    this.state.journalEntries = [];
    this.state.invoices = [];
    this.state.treasuryTransactions = [];

    this.logAudit({
      action: 'CLEAR_LOCAL_ACCOUNTING_DATA',
      entityType: 'SYSTEM',
      beforeValue: beforeSnapshot,
      afterValue: { journalEntriesCount: 0, invoicesCount: 0, treasuryCount: 0 },
      reason: options.reason.trim(),
      details: `تفريغ المسودات والبيانات المحاسبية المحلية - السبب: ${options.reason.trim()}`,
    });
    this.saveState('ALL');
  }

  public unprotectAllFiscalPeriods(options?: {
    confirmationText?: string;
    reason?: string;
  }): { success: boolean; message: string } {
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true });
    if (
      !options?.confirmationText ||
      (options.confirmationText !== 'تأكيد' && options.confirmationText !== 'CONFIRM') ||
      !options.reason?.trim()
    ) {
      throw new Error(
        'عملية مرفوضة: فتح جميع الفترات المالية المقفولة يتطلب صلاحية ADMIN مع كلمة التأكيد ("تأكيد" أو "CONFIRM") وإدخال سبب إلزامي.'
      );
    }
    const beforeLocks = { ...(this.state.fiscalPeriodLocks || {}) };
    this.state.fiscalPeriodLocks = {};
    this.logAudit({
      action: 'UNPROTECT_ALL_FISCAL_PERIODS',
      entityType: 'FISCAL_PERIOD',
      beforeValue: beforeLocks,
      afterValue: {},
      reason: options.reason.trim(),
      details: `فتح جميع الفترات المالية بواسطة ADMIN - السبب: ${options.reason.trim()}`,
    });
    this.saveState('LOCKS');
    return { success: true, message: 'تم فتح جميع الفترات المالية بنجاح وتوثيق السبب في سجل المراجعة.' };
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
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true });
    const before = { ...this.getSystemSerials() };
    this.state.systemSerials = { ...before, ...serials };
    this.logAudit({
      action: 'UPDATE_SYSTEM_SERIALS',
      entityType: 'SYSTEM_SERIALS',
      beforeValue: before,
      afterValue: this.state.systemSerials,
      details: 'تحديث إعدادات الترقيم التسلسلي للنظام',
    });
    this.saveState('SERIALS');
    return { success: true, message: 'تم تحديث إعدادات الترقيم التسلسلي بنجاح.' };
  }

  public resetDeviceSecurityBindings(): { success: boolean; message: string } {
    this.assertCan('ADMIN', { requireAdmin: true, allowWithoutClient: true });
    this.logAudit({
      action: 'RESET_DEVICE_SECURITY_BINDINGS',
      entityType: 'SECURITY',
      beforeValue: { status: 'BOUND' },
      afterValue: { status: 'RESET' },
      details: 'إعادة ضبط ارتباطات أمان الأجهزة بواسطة مدير النظام',
    });
    return { success: true, message: 'تم إعادة ضبط ارتباطات أمان الأجهزة بنجاح.' };
  }

  public async syncToCloudNow(): Promise<boolean> {
    this.flushDirtyStorage();
    return true;
  }

  // @public-readonly-safe: ذاكرة مؤقتة داخلية (In-Memory Optimistic Concurrency Scratchpad) لا تعدل السجلات الدائمة
  public saveRecord(recordId: string, data: any, expectedVersion = 1): { success: boolean; version?: number; status?: number; error?: string } {
    this.assertCan('EDIT_RECORD', { allowWithoutClient: true, entityType: 'VERSIONED_RECORD' });
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

  public RevealAndAuditTaxSecrets(clientId: string, details?: string): void {
    this.assertCan('VIEW_PORTAL_SECRETS', {
      clientId,
      entityType: 'بيانات دخول المنظومة السرية',
    });
    this.logAudit({
      action: 'REVEAL_TAX_PORTAL_SECRETS',
      entityType: 'CLIENT_TAX_SECRETS',
      entityId: clientId,
      clientId,
      details: details || `كشف بيانات الدخول السرية لبوابات الضرائب والفاتورة الإلكترونية للعميل (${clientId})`,
    });
    this.saveState('AUDIT');
  }

  public saveClientTaxPortalSecrets(
    clientId: string,
    secrets: {
      taxPortalUsername?: string;
      taxPortalPassword?: string;
      etaUsername?: string;
      etaPassword?: string;
      etaClientId?: string;
      etaClientSecret?: string;
      etaTokenPin?: string;
      aiDisabled?: boolean;
    }
  ): void {
    this.assertCan('EDIT_RECORD', {
      clientId,
      entityType: 'بيانات بوابات الضرائب والفاتورة الإلكترونية',
    });
    this.assertCan('VIEW_PORTAL_SECRETS', {
      clientId,
      entityType: 'أسرار بوابات الضرائب والفاتورة الإلكترونية',
    });

    const idx = this.state.clients.findIndex((c) => c.id === clientId);
    if (idx === -1) {
      throw new Error('لم يتم العثور على المنشأة المحددة لحفظ بيانات البوابات الضريبية.');
    }
    const existing = this.state.clients[idx] as any;
    const prevCreds = existing.portalCredentials || {};
    const prevEta = existing.etaConfig || {};

    const updatedClient = {
      ...existing,
      taxPortalEmail: secrets.taxPortalUsername ?? existing.taxPortalEmail,
      aiDisabled: typeof secrets.aiDisabled === 'boolean' ? secrets.aiDisabled : Boolean(existing.aiDisabled),
      portalCredentials: {
        ...prevCreds,
        taxPortalUsername: secrets.taxPortalUsername ?? prevCreds.taxPortalUsername ?? '',
        taxPortalPassword: secrets.taxPortalPassword ?? prevCreds.taxPortalPassword ?? '',
        etaUsername: secrets.etaUsername ?? prevCreds.etaUsername ?? '',
        etaPassword: secrets.etaPassword ?? prevCreds.etaPassword ?? '',
        etaTokenPin: secrets.etaTokenPin ?? prevCreds.etaTokenPin ?? '',
        updatedAt: getCairoTimestamp(),
      },
      etaConfig: {
        ...prevEta,
        clientId: secrets.etaClientId ?? prevEta.clientId ?? '',
        clientSecret: secrets.etaClientSecret ?? prevEta.clientSecret ?? '',
        tokenPin: secrets.etaTokenPin ?? prevEta.tokenPin ?? '',
      },
    } as any;

    this.state.clients[idx] = updatedClient;

    this.recordAuditMutation({
      action: 'UPDATE',
      entityType: 'CLIENT_TAX_SECRETS',
      entityId: clientId,
      clientId,
      beforeValue: { hasEtaCreds: Boolean(prevCreds.etaUsername) },
      afterValue: { hasEtaCreds: Boolean(secrets.etaUsername) },
      details: `تحديث وحفظ بيانات بوابة الضرائب والفاتورة الإلكترونية للمنشأة (${existing.name || clientId})`,
    });

    this.saveState('CLIENTS');
  }

  // @public-readonly-safe: دالة قراءة تسجيلات المنظومات الضريبية والجمركية
  public getClientSystemRegistrations(clientId?: string, kind?: SystemKind): ClientSystemRegistration[] {
    let list = this.state.clientSystemRegistrations || [];
    if (clientId) {
      list = list.filter((r) => r.clientId === clientId);
    }
    if (kind) {
      list = list.filter((r) => r.kind === kind);
    }
    return list;
  }

  // @public-readonly-safe: دالة قراءة تسجيل منظومة محددة لشركة
  public getClientSystemRegistration(clientId: string, kind: SystemKind): ClientSystemRegistration | undefined {
    return (this.state.clientSystemRegistrations || []).find(
      (r) => r.clientId === clientId && r.kind === kind
    );
  }

  public saveClientSystemRegistration(
    registration: ClientSystemRegistration,
    reason?: string
  ): ClientSystemRegistration {
    this.assertCan('EDIT_RECORD', {
      clientId: registration.clientId,
      entityType: 'تسجيل المنظومة الضريبية',
    });

    const existingIdx = (this.state.clientSystemRegistrations || []).findIndex(
      (r) => r.id === registration.id || (r.clientId === registration.clientId && r.kind === registration.kind)
    );
    const existing = existingIdx >= 0 ? this.state.clientSystemRegistrations[existingIdx] : undefined;

    // فحص صلاحية الأسرار إذا تغيرت كلمة المرور أو تم إدخالها
    const passwordChanged =
      registration.credentials?.password &&
      (!existing || existing.credentials?.password !== registration.credentials?.password);
    if (passwordChanged) {
      this.assertCan('VIEW_PORTAL_SECRETS', {
        clientId: registration.clientId,
        entityType: 'بيانات دخول المنظومة السرية',
      });
    }

    const updatedRecord: ClientSystemRegistration = {
      ...registration,
      id: registration.id || (existing ? existing.id : `reg-${registration.clientId}-${registration.kind}`),
      updatedAt: getCairoTimestamp(),
    };

    if (existingIdx >= 0) {
      this.state.clientSystemRegistrations[existingIdx] = updatedRecord;
    } else {
      if (!Array.isArray(this.state.clientSystemRegistrations)) {
        this.state.clientSystemRegistrations = [];
      }
      this.state.clientSystemRegistrations.push(updatedRecord);
    }

    // مزامنة الحقول القديمة للقراءة فقط والتوافق العكسي
    const client = this.state.clients.find((c) => c.id === registration.clientId);
    if (client) {
      if (!client.portalCredentials) client.portalCredentials = {};
      if (registration.kind === 'SAP') {
        client.portalCredentials.sapPortal = {
          ...client.portalCredentials.sapPortal,
          username: registration.credentials.username,
          password: registration.credentials.password,
          registeredMobile: registration.credentials.registeredMobile,
          email: registration.credentials.email,
          notes: registration.credentials.notes,
          pinOtp: registration.credentials.pinOtp,
        };
      } else if (registration.kind === 'GENERAL_TAX') {
        client.portalCredentials.etaGeneralTax = {
          ...client.portalCredentials.etaGeneralTax,
          username: registration.credentials.username,
          password: registration.credentials.password,
          registeredMobile: registration.credentials.registeredMobile,
          email: registration.credentials.email,
          notes: registration.credentials.notes,
          pinOtp: registration.credentials.pinOtp,
        };
      } else if (registration.kind === 'E_INVOICE') {
        client.portalCredentials.etaEInvoicing = {
          ...client.portalCredentials.etaEInvoicing,
          username: registration.credentials.username,
          password: registration.credentials.password,
          email: registration.credentials.email,
          notes: registration.credentials.notes,
        };
        client.eInvoiceRegistered = registration.status === 'REGISTERED';
        if (registration.extra?.hasToken) {
          client.hasEsealToken = true;
          client.tokenSerial = registration.extra.tokenSerial || client.tokenSerial;
          client.tokenPin = registration.extra.tokenPin || client.tokenPin;
          client.tokenExpiryDate = registration.extra.tokenExpiryDate || client.tokenExpiryDate;
          client.tokenIssuer = registration.extra.tokenIssuer || client.tokenIssuer;
          client.portalCredentials.eSignatureToken = {
            ...client.portalCredentials.eSignatureToken,
            tokenSerial: registration.extra.tokenSerial,
            tokenPin: registration.extra.tokenPin,
            expiryDate: registration.extra.tokenExpiryDate,
            issuer: registration.extra.tokenIssuer,
            issuerUsername: registration.extra.issuerUsername,
            issuerPassword: registration.extra.issuerPassword,
          };
        }
      } else if (registration.kind === 'NAFEZA') {
        client.portalCredentials.nafeza = {
          ...client.portalCredentials.nafeza,
          username: registration.credentials.username,
          password: registration.credentials.password,
          email: registration.credentials.email,
          registeredMobile: registration.credentials.registeredMobile,
          notes: registration.credentials.notes,
          eSignatureEnabled: registration.extra?.eSignatureEnabled,
          registrantType: registration.extra?.registrantType,
          importerRegistrationNumber: registration.extra?.importerRegistrationNumber,
          authMethod: registration.extra?.authMethod,
        };
      } else if (registration.kind === 'PAYROLL_NEW') {
        client.portalCredentials.etaPayrollTax = {
          ...client.portalCredentials.etaPayrollTax,
          username: registration.credentials.username,
          password: registration.credentials.password,
          email: registration.credentials.email,
          registeredMobile: registration.credentials.registeredMobile,
          notes: registration.credentials.notes,
          facilityNumber: registration.extra?.facilityNumber,
        };
      }
    }

    this.recordAuditMutation({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'CLIENT_SYSTEM_REGISTRATION',
      entityId: updatedRecord.id,
      clientId: updatedRecord.clientId,
      beforeValue: existing
        ? {
            kind: existing.kind,
            status: existing.status,
            username: existing.credentials.username,
            extra: existing.extra,
          }
        : null,
      afterValue: {
        kind: updatedRecord.kind,
        status: updatedRecord.status,
        username: updatedRecord.credentials.username,
        extra: updatedRecord.extra,
      },
      reason,
      details: reason || `تحديث تسجيل المنظومة ${registration.kind} للشركة (${client?.name || registration.clientId})`,
    });

    this.saveState('CLIENTS');
    return updatedRecord;
  }

  // @public-readonly-safe: دالة قراءة سجل إجراءات المنظومات
  public getClientSystemActions(clientId?: string, kind?: SystemKind): ClientSystemAction[] {
    let list = this.state.clientSystemActions || [];
    if (clientId) {
      list = list.filter((a) => a.clientId === clientId);
    }
    if (kind) {
      list = list.filter((a) => a.kind === kind);
    }
    return list;
  }

  public addClientSystemAction(
    action: Omit<ClientSystemAction, 'id' | 'performedBy' | 'createdAt' | 'date'> & { date?: string },
    reason?: string
  ): ClientSystemAction {
    this.assertCan('EDIT_RECORD', {
      clientId: action.clientId,
      entityType: 'إجراء منظومة ضريبية أو جمركية',
    });

    const currentUser = this.getCurrentUser();
    const newAction: ClientSystemAction = {
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      performedBy: currentUser?.name || currentUser?.username || 'system',
      createdAt: getCairoTimestamp(),
      date: action.date || getCairoDateString(),
    };

    if (!Array.isArray(this.state.clientSystemActions)) {
      this.state.clientSystemActions = [];
    }
    this.state.clientSystemActions.unshift(newAction);

    const client = this.state.clients.find((c) => c.id === action.clientId);

    this.recordAuditMutation({
      action: 'CREATE',
      entityType: 'CLIENT_SYSTEM_ACTION',
      entityId: newAction.id,
      clientId: newAction.clientId,
      beforeValue: null,
      afterValue: {
        kind: newAction.kind,
        type: newAction.type,
        date: newAction.date,
        reference: newAction.reference,
        count: newAction.count,
        performedBy: newAction.performedBy,
        extra: newAction.extra,
      },
      reason,
      details: reason || `تسجيل إجراء جديد على منظومة ${newAction.kind}: ${newAction.type} للشركة (${client?.name || newAction.clientId})`,
    });

    this.saveState('CLIENTS');
    return newAction;
  }

  // @public-readonly-safe: دالة قراءة روابط المنظومات القابلة للتعديل
  public getSystemPortalUrls(): SystemPortalUrlsConfig {
    return {
      ...DEFAULT_SYSTEM_PORTAL_URLS,
      ...(this.state.systemPortalUrls || {}),
    };
  }

  public updateSystemPortalUrls(
    urls: Partial<SystemPortalUrlsConfig>,
    reason?: string
  ): SystemPortalUrlsConfig {
    this.assertCan('MANAGE_USERS', {
      entityType: 'إعدادات روابط بوابات المنظومات',
    });

    const prev = this.getSystemPortalUrls();
    const next: SystemPortalUrlsConfig = {
      ...prev,
      ...urls,
    };
    this.state.systemPortalUrls = next;

    this.recordAuditMutation({
      action: 'UPDATE',
      entityType: 'SYSTEM_PORTAL_URLS',
      entityId: 'system-portal-urls',
      clientId: undefined,
      beforeValue: prev,
      afterValue: next,
      reason,
      details: reason || 'تحديث روابط بوابات المنظومات الضريبية والجمركية',
    });

    this.saveState('SETTINGS');
    return next;
  }

  public logPortalSecretAccess(
    clientId: string,
    kind: SystemKind | string,
    action: 'VIEW' | 'COPY'
  ): void {
    this.assertCan('VIEW_PORTAL_SECRETS', {
      clientId,
      entityType: 'بيانات دخول المنظومة',
    });

    const user = this.getCurrentUser();
    const client = this.state.clients.find((c) => c.id === clientId);
    const actionLabel = action === 'VIEW' ? 'كشف' : 'نسخ';

    this.logAudit({
      action: action === 'VIEW' ? 'VIEW_PORTAL_SECRET' : 'COPY_PORTAL_SECRET',
      entityType: `SYSTEM_PORTAL_SECRET_${kind}`,
      entityId: `${clientId}:${kind}`,
      clientId,
      details: `${actionLabel} كلمة مرور منظومة ${kind} للمنشأة (${client?.name || clientId}) بواسطة المستخدم (${user?.name || user?.username || 'غير معروف'})`,
    });
    this.saveState('AUDIT');
  }

  // =========================================================================
  // Part أ: Scoped Entity & Ledger Queries (Mandatory clientId + Fiscal Bounds)
  // =========================================================================

  // @public-readonly-safe: استعلام قيود اليومية مفلترة بالعميل وحدود السنة المالية دون السجلات غير المنسوبة
  public getJournalEntries(clientId: string, fiscalYear?: number): JournalEntry[] {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استعلام قيود اليومية بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const validClientIds = new Set(this.state.clients.map((c) => c.id));
    if (!validClientIds.has(cleanClientId)) return [];

    const bounds = fiscalYear ? this.getClientFiscalYearBounds(cleanClientId, fiscalYear) : null;
    return (this.state.journalEntries || []).filter((j) => {
      if (j.clientId !== cleanClientId) return false;
      if (!bounds || !fiscalYear) return true;
      const d = (j.date || '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d >= bounds.startDate && d <= bounds.endDate;
      }
      return j.fiscalYear === fiscalYear;
    });
  }

  // @public-readonly-safe: استعلام الفواتير مفلترة بالعميل وحدود السنة المالية
  public getInvoices(clientId: string, fiscalYear?: number): Invoice[] {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استعلام الفواتير بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const bounds = fiscalYear ? this.getClientFiscalYearBounds(cleanClientId, fiscalYear) : null;
    return (this.state.invoices || []).filter((inv) => {
      if (inv.clientId !== cleanClientId) return false;
      if (!bounds || !fiscalYear) return true;
      const d = (inv.date || '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d >= bounds.startDate && d <= bounds.endDate;
      }
      return inv.fiscalYear === fiscalYear;
    });
  }

  // @public-readonly-safe: استعلام حركات الخزنة مفلترة بالعميل وحدود السنة المالية
  public getTreasuryTransactions(clientId: string, fiscalYear?: number): OfficeTreasuryTransaction[] {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استعلام حركات الخزنة بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const bounds = fiscalYear ? this.getClientFiscalYearBounds(cleanClientId, fiscalYear) : null;
    return (this.state.treasuryTransactions || []).filter((tx) => {
      if (tx.clientId !== cleanClientId) return false;
      if (!bounds || !fiscalYear) return true;
      const d = (tx.date || '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d >= bounds.startDate && d <= bounds.endDate;
      }
      return tx.fiscalYear === fiscalYear;
    });
  }

  // @public-readonly-safe: استعلام الأصول الثابتة مفلترة بالعميل
  public getFixedAssets(clientId: string, fiscalYear?: number): FixedAsset[] {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استعلام الأصول الثابتة بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const bounds = fiscalYear ? this.getClientFiscalYearBounds(cleanClientId, fiscalYear) : null;
    return (this.state.fixedAssets || []).filter((fa) => {
      if (fa.clientId !== cleanClientId) return false;
      if (!bounds || !fiscalYear) return true;
      const d = (fa.purchaseDate || '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d <= bounds.endDate;
      }
      return !fa.fiscalYear || fa.fiscalYear <= fiscalYear;
    });
  }

  // @public-readonly-safe: استعلام الإقرارات الضريبية مفلترة بالعميل والسنة المالية
  public getTaxDeclarations(clientId: string, fiscalYear?: number): TaxDeclarationRecord[] {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استعلام الإقرارات الضريبية بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    return (this.state.taxDeclarations || []).filter((decl) => {
      if (decl.clientId !== cleanClientId) return false;
      if (fiscalYear !== undefined && decl.fiscalYear !== fiscalYear) return false;
      return true;
    });
  }

  // @public-readonly-safe: استخراج ميزان المراجعة للعميل والسنة المالية بحدود السنة الفعلية
  public getTrialBalance(
    clientId: string,
    fiscalYear?: number,
    options?: { postedOnly?: boolean; fromDate?: string; toDate?: string }
  ): TrialBalanceSummary {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استخراج ميزان المراجعة بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const client = this.state.clients.find((c) => c.id === cleanClientId);
    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();
    const bounds = this.getClientFiscalYearBounds(cleanClientId, targetYear);
    const clientAccounts = this.getClientAccounts(cleanClientId, targetYear);
    const clientEntries = this.state.journalEntries.filter((j) => j.clientId === cleanClientId);

    return AccountingCalculator.computeTrialBalance(clientAccounts, clientEntries, {
      clientId: cleanClientId,
      fiscalYear: targetYear,
      fiscalYearBounds: bounds,
      fromDate: options?.fromDate || bounds.startDate,
      toDate: options?.toDate || bounds.endDate,
      postedOnly: options?.postedOnly ?? true,
    });
  }

  // @public-readonly-safe: استخراج دفتر الأستاذ العام للعميل والسنة المالية بحدود السنة الفعلية
  public getGeneralLedger(
    clientId: string,
    fiscalYear?: number,
    accountIdOrCode?: string,
    options?: { postedOnly?: boolean; fromDate?: string; toDate?: string }
  ): GeneralLedgerSummary {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع استخراج دفتر الأستاذ بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const client = this.state.clients.find((c) => c.id === cleanClientId);
    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();
    const bounds = this.getClientFiscalYearBounds(cleanClientId, targetYear);
    const clientAccounts = this.getClientAccounts(cleanClientId, targetYear);
    const clientEntries = this.state.journalEntries.filter((j) => j.clientId === cleanClientId);

    return AccountingCalculator.computeGeneralLedger(clientAccounts, clientEntries, {
      clientId: cleanClientId,
      fiscalYear: targetYear,
      fiscalYearBounds: bounds,
      fromDate: options?.fromDate || bounds.startDate,
      toDate: options?.toDate || bounds.endDate,
      postedOnly: options?.postedOnly ?? true,
      accountIdOrCode,
    });
  }

  // =========================================================================
  // Part ب, ج, د, هـ: Unified StatementModel, ManagerAdjustmentLayer, Notes & Versioning
  // =========================================================================

  private getAdjustmentLayerStorageKey(clientId: string, fiscalYear: number, version?: number): string {
    if (version !== undefined && version !== null && Number.isFinite(Number(version)) && Number(version) > 0) {
      return `${clientId}:${fiscalYear}:v${Number(version)}`;
    }
    return `${clientId}:${fiscalYear}:WORKING`;
  }

  // @public-readonly-safe: جلب طبقة تعديلات المدير للعميل والسنة والإصدار
  public getManagerAdjustmentLayer(
    clientId: string,
    fiscalYear: number,
    version?: number
  ): ManagerAdjustmentLayer {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع قراءة طبقة تعديلات القوائم بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    if (!this.state.managerAdjustmentLayers || typeof this.state.managerAdjustmentLayers !== 'object') {
      this.state.managerAdjustmentLayers = {};
    }

    if (version !== undefined && version !== null && Number(version) > 0) {
      const vKey = this.getAdjustmentLayerStorageKey(cleanClientId, fiscalYear, version);
      const fromLayerMap = this.state.managerAdjustmentLayers[vKey];
      if (fromLayerMap) return fromLayerMap;

      const snap = this.getApprovedStatementsForClient(cleanClientId, fiscalYear).find(
        (s) => s.version === Number(version) || s.versionNo === Number(version)
      );
      if (snap?.adjustmentLayer) {
        return snap.adjustmentLayer;
      }
      return {
        clientId: cleanClientId,
        fiscalYear,
        version: Number(version),
        status: snap?.status || 'APPROVED',
        adjustments: [],
        customLineLabels: {},
        updatedAt: snap?.approvedAt || getCairoTimestamp(),
        updatedBy: 'system',
      };
    }

    const workingKey = this.getAdjustmentLayerStorageKey(cleanClientId, fiscalYear);
    if (this.state.managerAdjustmentLayers[workingKey]) {
      return this.state.managerAdjustmentLayers[workingKey];
    }

    const latestApproved = this.getLatestApprovedStatementForClient(cleanClientId, fiscalYear);
    if (latestApproved?.adjustmentLayer) {
      return latestApproved.adjustmentLayer;
    }

    return {
      clientId: cleanClientId,
      fiscalYear,
      version: latestApproved?.version || 1,
      status: latestApproved ? 'APPROVED' : 'DRAFT',
      adjustments: [],
      customLineLabels: {},
      updatedAt: getCairoTimestamp(),
      updatedBy: 'system',
    };
  }

  /**
   * Requirement ب-1: Single Unified StatementModel builder for (clientId, fiscalYear, version?)
   */
  // @public-readonly-safe: بناء النموذج الموحد للقوائم المالية والإيضاحات والنسب والتدفقات النقدية وتقرير المراقب والملف الائتماني
  public buildStatementModel(
    clientId: string,
    fiscalYear?: number,
    version?: number
  ): StatementModel {
    if (!clientId || !clientId.trim()) {
      throw new Error('ممنوع بناء نموذج القوائم المالية بدون تحديد العميل (clientId إلزامي).');
    }
    const cleanClientId = clientId.trim();
    const client = this.state.clients.find((c) => c.id === cleanClientId);
    const targetYear =
      fiscalYear ||
      this.state.activeClientContext?.selectedFiscalYear ||
      client?.fiscalYear ||
      client?.activeFiscalYear ||
      getCairoCurrentYear();
    const compYear = targetYear - 1;

    const currentBounds = this.getClientFiscalYearBounds(cleanClientId, targetYear);
    const compBounds = this.getClientFiscalYearBounds(cleanClientId, compYear);

    const currentAccounts = this.getClientAccounts(cleanClientId, targetYear);
    const compAccounts = this.getClientAccounts(cleanClientId, compYear);
    const clientEntries = (this.state.journalEntries || []).filter((j) => j.clientId === cleanClientId);
    const statementMapping = this.getClientStatementMapping(cleanClientId);

    const workingKey = this.getAdjustmentLayerStorageKey(cleanClientId, targetYear);
    const hasOpenWorkingDraft = Boolean(
      this.state.managerAdjustmentLayers?.[workingKey] &&
        this.state.managerAdjustmentLayers[workingKey].status === 'DRAFT'
    );

    let approvedSnapshot: ApprovedStatementsSnapshot | undefined;
    if (version !== undefined && version !== null && Number(version) > 0) {
      approvedSnapshot = this.getApprovedStatementsForClient(cleanClientId, targetYear).find(
        (s) => s.version === Number(version) || s.versionNo === Number(version)
      );
    } else if (!hasOpenWorkingDraft) {
      approvedSnapshot = this.getLatestApprovedStatementForClient(cleanClientId, targetYear);
    }

    const adjustmentLayer = this.getManagerAdjustmentLayer(cleanClientId, targetYear, version);
    const savedNotes = this.state.statementNotes?.[`${cleanClientId}:${targetYear}`] || {};

    return AccountingCalculator.buildStatementModel({
      clientId: cleanClientId,
      fiscalYear: targetYear,
      version: version ?? approvedSnapshot?.version ?? adjustmentLayer.version ?? 1,
      client: client
        ? {
            id: client.id,
            name: client.name,
            taxId: client.taxId,
            taxCardNo: client.taxCardNo,
            commercialRegister: client.commercialRegister,
            commercialRegNo: client.commercialRegNo,
          }
        : { id: cleanClientId, name: cleanClientId },
      accounts: currentAccounts,
      comparativeAccounts: compAccounts,
      entries: clientEntries,
      fiscalBounds: currentBounds,
      comparativeFiscalBounds: compBounds,
      statementMapping,
      adjustmentLayer,
      savedNotes,
      officeProfile: this.state.officeProfile,
      approvedSnapshot: approvedSnapshot || null,
    });
  }

  /**
   * Requirement ب-2 & ج-1 & ج-3 & د-4 & هـ:
   * Apply or update a manager adjustment on a statement line (CURRENT or COMPARATIVE).
   * Requires EDIT_FINAL_STATEMENTS permission. Period lock does NOT block this (only blocks ledger mutations).
   * Never modifies ledger accounts or journal entries.
   */
  public upsertManagerStatementAdjustment(params: {
    clientId: string;
    fiscalYear: number;
    lineKey: FinancialStatementLineKey | string;
    period?: StatementAdjustmentPeriod;
    overrideAmount: number;
    reason: string;
    version?: number;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_ADJUSTMENT',
    });

    const cleanReason = String(params.reason || '').trim();
    if (!cleanReason) {
      throw new Error('سبب التعديل اليدوي على القوائم المالية مطلوب ولا يمكن تركه فارغاً.');
    }

    const period: StatementAdjustmentPeriod = params.period || 'CURRENT';
    const overrideAmount = Math.round((Number(params.overrideAmount) || 0) * 100) / 100;

    // Build baseline model without this line's override to capture accurate ledgerAmount
    const currentModelBefore = this.buildStatementModel(resolvedClientId, params.fiscalYear, params.version);
    const targetLineBefore = currentModelBefore.linesMap[params.lineKey];
    const ledgerAmount = targetLineBefore
      ? period === 'CURRENT'
        ? targetLineBefore.ledgerCurrent
        : targetLineBefore.ledgerComparative
      : 0;
    const previousAmount = targetLineBefore
      ? period === 'CURRENT'
        ? targetLineBefore.currentAmount
        : targetLineBefore.comparativeAmount
      : ledgerAmount;

    if (!this.state.managerAdjustmentLayers || typeof this.state.managerAdjustmentLayers !== 'object') {
      this.state.managerAdjustmentLayers = {};
    }

    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, params.fiscalYear);
    const existingLayer = this.getManagerAdjustmentLayer(resolvedClientId, params.fiscalYear);
    const nextAdjustments = [...(existingLayer.adjustments || [])];

    const adjIdx = nextAdjustments.findIndex(
      (a) => a.lineKey === params.lineKey && a.period === period
    );

    const nowTs = getCairoTimestamp();
    const newAdj: ManagerStatementAdjustment = {
      id: adjIdx >= 0 ? nextAdjustments[adjIdx].id : `madj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lineKey: params.lineKey,
      lineLabelAr:
        targetLineBefore?.labelAr ||
        (STATEMENT_LINE_LABELS_AR[params.lineKey] as any)?.labelAr ||
        String(params.lineKey),
      period,
      ledgerAmount,
      overrideAmount,
      diff: Math.round((overrideAmount - ledgerAmount) * 100) / 100,
      reason: cleanReason,
      by: user.name,
      byUserId: user.id,
      at: nowTs,
    };

    if (adjIdx >= 0) {
      nextAdjustments[adjIdx] = newAdj;
    } else {
      nextAdjustments.push(newAdj);
    }

    const latestApproved = this.getLatestApprovedStatementForClient(resolvedClientId, params.fiscalYear);
    const updatedLayer: ManagerAdjustmentLayer = {
      ...existingLayer,
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      version: existingLayer.basedOnVersion
        ? existingLayer.basedOnVersion + 1
        : latestApproved
        ? latestApproved.version + 1
        : 1,
      basedOnVersion: existingLayer.basedOnVersion ?? latestApproved?.version,
      status: 'DRAFT',
      adjustments: nextAdjustments,
      updatedAt: nowTs,
      updatedBy: user.name,
    };

    this.state.managerAdjustmentLayers[workingKey] = updatedLayer;

    this.recordAuditMutation({
      action: 'MANAGER_STATEMENT_LINE_OVERRIDE',
      entityType: 'FINANCIAL_STATEMENT_LINE',
      entityId: `${resolvedClientId}:${params.fiscalYear}:${params.lineKey}:${period}`,
      clientId: resolvedClientId,
      beforeValue: {
        lineKey: params.lineKey,
        period,
        ledgerAmount,
        previousAmount,
      },
      afterValue: {
        lineKey: params.lineKey,
        period,
        ledgerAmount,
        overrideAmount,
        diff: newAdj.diff,
        reason: cleanReason,
      },
      reason: cleanReason,
      details: `تعديل يدوي لبند القوائم المالية (${newAdj.lineLabelAr} - ${period}) من (${previousAmount}) إلى (${overrideAmount}) [رصيد الأستاذ: ${ledgerAmount}] — السبب: ${cleanReason}`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Batch apply multiple line adjustments with a single shared reason (Requirement ج-3).
   */
  public batchUpsertManagerStatementAdjustments(params: {
    clientId: string;
    fiscalYear: number;
    items: Array<{
      lineKey: FinancialStatementLineKey | string;
      period?: StatementAdjustmentPeriod;
      overrideAmount: number;
    }>;
    reason: string;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_ADJUSTMENT',
    });

    const cleanReason = String(params.reason || '').trim();
    if (!cleanReason) {
      throw new Error('سبب دفعة التعديلات اليدوية مطلوب ولا يمكن تركه فارغاً.');
    }

    for (const item of params.items) {
      this.upsertManagerStatementAdjustment({
        clientId: resolvedClientId,
        fiscalYear: params.fiscalYear,
        lineKey: item.lineKey,
        period: item.period || 'CURRENT',
        overrideAmount: item.overrideAmount,
        reason: cleanReason,
      });
    }

    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Requirement ب-2: Revert a single statement line back to its Ledger value ("إرجاع للأستاذ" لكل سطر).
   */
  public resetManagerStatementAdjustmentLine(params: {
    clientId: string;
    fiscalYear: number;
    lineKey: FinancialStatementLineKey | string;
    period?: StatementAdjustmentPeriod;
    reason?: string;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_ADJUSTMENT',
    });

    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, params.fiscalYear);
    const existingLayer = this.getManagerAdjustmentLayer(resolvedClientId, params.fiscalYear);
    const beforeAdjustments = [...(existingLayer.adjustments || [])];
    const removed = beforeAdjustments.filter(
      (a) => a.lineKey === params.lineKey && (!params.period || a.period === params.period)
    );
    const remaining = beforeAdjustments.filter(
      (a) => !(a.lineKey === params.lineKey && (!params.period || a.period === params.period))
    );

    if (!this.state.managerAdjustmentLayers) {
      this.state.managerAdjustmentLayers = {};
    }

    this.state.managerAdjustmentLayers[workingKey] = {
      ...existingLayer,
      status: 'DRAFT',
      adjustments: remaining,
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    if (removed.length > 0) {
      this.recordAuditMutation({
        action: 'RESET_STATEMENT_LINE_TO_LEDGER',
        entityType: 'FINANCIAL_STATEMENT_LINE',
        entityId: `${resolvedClientId}:${params.fiscalYear}:${params.lineKey}`,
        clientId: resolvedClientId,
        beforeValue: removed,
        afterValue: null,
        reason: params.reason || 'إرجاع البند لرصيد دفتر الأستاذ',
        details: `إرجاع بند القوائم المالية (${params.lineKey}) إلى رصيد الأستاذ الأصلي للعميل (${resolvedClientId}) للسنة (${params.fiscalYear})`,
      });
      this.saveState('APPROVED_STATEMENTS');
    }

    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Requirement ب-2: Revert ALL statement adjustments back to Ledger ("إرجاع للأستاذ" لكل القائمة).
   */
  public resetAllManagerStatementAdjustments(
    clientId: string,
    fiscalYear: number,
    reason = 'إرجاع جميع بنود القوائم المالية لأرصدة دفتر الأستاذ'
  ): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear,
      entityType: 'STATEMENT_ADJUSTMENT',
    });

    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, fiscalYear);
    const existingLayer = this.getManagerAdjustmentLayer(resolvedClientId, fiscalYear);
    const beforeAdjustments = [...(existingLayer.adjustments || [])];

    if (!this.state.managerAdjustmentLayers) {
      this.state.managerAdjustmentLayers = {};
    }

    this.state.managerAdjustmentLayers[workingKey] = {
      ...existingLayer,
      status: 'DRAFT',
      adjustments: [],
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    this.recordAuditMutation({
      action: 'RESET_ALL_STATEMENT_ADJUSTMENTS_TO_LEDGER',
      entityType: 'FINANCIAL_STATEMENT',
      entityId: `${resolvedClientId}:${fiscalYear}`,
      clientId: resolvedClientId,
      beforeValue: beforeAdjustments,
      afterValue: [],
      reason,
      details: `إرجاع جميع التعديلات اليدوية (${beforeAdjustments.length} تعديل) إلى أرصدة دفتر الأستاذ للعميل (${resolvedClientId}) للسنة (${fiscalYear})`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return this.buildStatementModel(resolvedClientId, fiscalYear);
  }

  /**
   * Requirement هـ: Rename statement line display name protected by assertCan('EDIT_FINAL_STATEMENTS') inside db.
   */
  public setStatementLineDisplayName(params: {
    clientId: string;
    fiscalYear: number;
    lineKey: FinancialStatementLineKey | string;
    customLabelAr: string;
    reason?: string;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_LINE_NAME',
    });

    const cleanLabel = String(params.customLabelAr || '').trim();
    if (!cleanLabel) {
      throw new Error('اسم البند في القوائم المالية لا يمكن أن يكون فارغاً.');
    }

    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, params.fiscalYear);
    const existingLayer = this.getManagerAdjustmentLayer(resolvedClientId, params.fiscalYear);
    const prevLabels = { ...(existingLayer.customLineLabels || {}) };
    const beforeLabel = prevLabels[params.lineKey] || STATEMENT_LINE_LABELS_AR[params.lineKey] || params.lineKey;

    if (!this.state.managerAdjustmentLayers) {
      this.state.managerAdjustmentLayers = {};
    }

    const nextLabels = {
      ...prevLabels,
      [params.lineKey]: cleanLabel,
    };

    this.state.managerAdjustmentLayers[workingKey] = {
      ...existingLayer,
      customLineLabels: nextLabels,
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    this.recordAuditMutation({
      action: 'RENAME_STATEMENT_LINE_LABEL',
      entityType: 'FINANCIAL_STATEMENT_LINE',
      entityId: `${resolvedClientId}:${params.fiscalYear}:${params.lineKey}`,
      clientId: resolvedClientId,
      beforeValue: { lineKey: params.lineKey, labelAr: beforeLabel },
      afterValue: { lineKey: params.lineKey, labelAr: cleanLabel },
      reason: params.reason || `تعديل مسمى بند القوائم المالية (${params.lineKey})`,
      details: `تعديل اسم البند (${params.lineKey}) في القوائم المالية من "${beforeLabel}" إلى "${cleanLabel}"`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Requirement د-5: Save manual paragraph edit on an explanatory note and record baseline numbers.
   */
  public saveStatementNoteManualEdit(params: {
    clientId: string;
    fiscalYear: number;
    noteId: string;
    manualParagraph: string;
    customTitle?: string;
    reason?: string;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_NOTE',
    });

    const currentModel = this.buildStatementModel(resolvedClientId, params.fiscalYear);
    const targetNote = currentModel.notes.find((n) => n.id === params.noteId);

    const baselineNumbers: Record<string, number> = {};
    for (const lk of targetNote?.linkedLineKeys || []) {
      baselineNumbers[lk] = currentModel.linesMap[lk]?.currentAmount ?? 0;
    }

    if (!this.state.statementNotes || typeof this.state.statementNotes !== 'object') {
      this.state.statementNotes = {};
    }
    const clientYearKey = `${resolvedClientId}:${params.fiscalYear}`;
    if (!this.state.statementNotes[clientYearKey]) {
      this.state.statementNotes[clientYearKey] = {};
    }

    const beforeNote = this.state.statementNotes[clientYearKey][params.noteId] || null;
    const nowTs = getCairoTimestamp();
    this.state.statementNotes[clientYearKey][params.noteId] = {
      manualParagraph: params.manualParagraph,
      customTitle: params.customTitle ?? beforeNote?.customTitle,
      baselineNumbers,
      lastConfirmedAt: nowTs,
      lastConfirmedBy: user.name,
      updatedAt: nowTs,
      updatedBy: user.name,
    };

    this.recordAuditMutation({
      action: 'EDIT_STATEMENT_NOTE_TEXT',
      entityType: 'STATEMENT_NOTE',
      entityId: `${resolvedClientId}:${params.fiscalYear}:${params.noteId}`,
      clientId: resolvedClientId,
      beforeValue: beforeNote,
      afterValue: this.state.statementNotes[clientYearKey][params.noteId],
      reason: params.reason || `تعديل نص الإيضاح المتمم (${targetNote?.title || params.noteId})`,
      details: `تعديل نص الإيضاح المتمم رقم (${targetNote?.noteNumber || params.noteId}) للعميل (${resolvedClientId}) للسنة (${params.fiscalYear})`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Requirement د-5: Confirm a note flagged with "تحتاج مراجعة" after linked numbers changed.
   */
  public confirmStatementNoteReview(params: {
    clientId: string;
    fiscalYear: number;
    noteId: string;
  }): StatementModel {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'STATEMENT_NOTE',
    });

    const currentModel = this.buildStatementModel(resolvedClientId, params.fiscalYear);
    const targetNote = currentModel.notes.find((n) => n.id === params.noteId);

    const baselineNumbers: Record<string, number> = {};
    for (const lk of targetNote?.linkedLineKeys || []) {
      baselineNumbers[lk] = currentModel.linesMap[lk]?.currentAmount ?? 0;
    }

    if (!this.state.statementNotes || typeof this.state.statementNotes !== 'object') {
      this.state.statementNotes = {};
    }
    const clientYearKey = `${resolvedClientId}:${params.fiscalYear}`;
    if (!this.state.statementNotes[clientYearKey]) {
      this.state.statementNotes[clientYearKey] = {};
    }

    const existing = this.state.statementNotes[clientYearKey][params.noteId] || {};
    const nowTs = getCairoTimestamp();
    this.state.statementNotes[clientYearKey][params.noteId] = {
      ...existing,
      baselineNumbers,
      lastConfirmedAt: nowTs,
      lastConfirmedBy: user.name,
      updatedAt: nowTs,
      updatedBy: user.name,
    };

    this.recordAuditMutation({
      action: 'CONFIRM_STATEMENT_NOTE_REVIEW',
      entityType: 'STATEMENT_NOTE',
      entityId: `${resolvedClientId}:${params.fiscalYear}:${params.noteId}`,
      clientId: resolvedClientId,
      beforeValue: { needsReview: true },
      afterValue: { needsReview: false, baselineNumbers, confirmedBy: user.name },
      details: `تأكيد مراجعة الإيضاح المتمم (${targetNote?.title || params.noteId}) بعد تحديث أرقامه المشتقة من النموذج`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return this.buildStatementModel(resolvedClientId, params.fiscalYear);
  }

  /**
   * Requirement د-1: "تعديل الإصدار النهائي" — Opens a working draft copy from current approved version N.
   */
  public startEditingApprovedStatementVersion(
    clientId: string,
    fiscalYear: number,
    sourceVersion?: number
  ): { draftLayer: ManagerAdjustmentLayer; model: StatementModel } {
    const resolvedClientId = this.resolveMandatoryClientId(clientId);
    const user = this.assertCan('EDIT_FINAL_STATEMENTS', {
      clientId: resolvedClientId,
      fiscalYear,
      entityType: 'APPROVED_STATEMENT',
    });

    const sourceSnap =
      sourceVersion !== undefined
        ? this.getApprovedStatementsForClient(resolvedClientId, fiscalYear).find(
            (s) => s.version === sourceVersion || s.versionNo === sourceVersion
          )
        : this.getLatestApprovedStatementForClient(resolvedClientId, fiscalYear);

    const baseLayer = sourceSnap?.adjustmentLayer || this.getManagerAdjustmentLayer(resolvedClientId, fiscalYear, sourceSnap?.version);
    const nextVersionNumber = (sourceSnap?.version || 0) + 1;

    const draftLayer: ManagerAdjustmentLayer = {
      clientId: resolvedClientId,
      fiscalYear,
      version: nextVersionNumber,
      basedOnVersion: sourceSnap?.version || 1,
      status: 'DRAFT',
      adjustments: (baseLayer.adjustments || []).map((a) => ({ ...a })),
      customLineLabels: { ...(baseLayer.customLineLabels || {}) },
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    if (!this.state.managerAdjustmentLayers) {
      this.state.managerAdjustmentLayers = {};
    }
    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, fiscalYear);
    this.state.managerAdjustmentLayers[workingKey] = draftLayer;

    this.recordAuditMutation({
      action: 'OPEN_DRAFT_FROM_APPROVED_STATEMENT',
      entityType: 'APPROVED_STATEMENT',
      entityId: sourceSnap?.id || `${resolvedClientId}:${fiscalYear}`,
      clientId: resolvedClientId,
      beforeValue: { version: sourceSnap?.version || 1, status: sourceSnap?.status || 'APPROVED' },
      afterValue: { draftVersion: nextVersionNumber, basedOnVersion: sourceSnap?.version || 1, status: 'DRAFT' },
      details: `فتح نسخة عمل (مسودة تعديل الإصدار النهائي) من الإصدار المعتمد رقم (${sourceSnap?.version || 1}) للعميل (${resolvedClientId}) للسنة (${fiscalYear})`,
    });

    this.saveState('APPROVED_STATEMENTS');
    return {
      draftLayer,
      model: this.buildStatementModel(resolvedClientId, fiscalYear),
    };
  }

  /**
   * Requirement د-1, د-2, د-3, هـ:
   * Approve current working statement model -> produces Version N+1 with new SHA-256 fingerprint,
   * new verificationCode, marks Version N as SUPERSEDED (with link to N+1, never deleted),
   * updates QR status, and logs line-by-line before/after diffs & mandatory reissue reason in Audit Trail.
   */
  public approveStatementModelVersion(params: {
    clientId: string;
    fiscalYear: number;
    reissueReason?: string;
    reason?: string;
  }): {
    snapshot: ApprovedStatementsSnapshot;
    supersededSnapshot?: ApprovedStatementsSnapshot;
    versionDiffs: StatementVersionDiffItem[];
    model: StatementModel;
  } {
    const resolvedClientId = this.resolveMandatoryClientId(params.clientId);
    const existingActive = this.getLatestApprovedStatementForClient(resolvedClientId, params.fiscalYear);
    const allForPeriod = this.getApprovedStatementsForClient(resolvedClientId, params.fiscalYear);
    const isReissue = allForPeriod.length > 0;

    const user = this.assertCan(isReissue ? 'EDIT_FINAL_STATEMENTS' : 'APPROVE_STATEMENT', {
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      entityType: 'APPROVED_STATEMENT',
    });

    const cleanReason = String(params.reissueReason || params.reason || '').trim();
    if (isReissue && !cleanReason) {
      throw new Error('سبب إعادة الإصدار مطلوب ولا يمكن اعتماد تعديل الإصدار النهائي بدون إدخال السبب.');
    }

    const maxExistingVersion = allForPeriod.reduce(
      (maxV, s) => Math.max(maxV, Number(s.version || s.versionNo || 0)),
      0
    );
    const nextVersion = maxExistingVersion + 1;

    // Build previous version model if re-issuing to compute exact line-by-line before/after diffs
    const prevModel = existingActive
      ? this.buildStatementModel(resolvedClientId, params.fiscalYear, existingActive.version)
      : null;

    // Ensure working layer is used to build the new model
    const workingKey = this.getAdjustmentLayerStorageKey(resolvedClientId, params.fiscalYear);
    const workingLayer = this.getManagerAdjustmentLayer(resolvedClientId, params.fiscalYear);
    const approvedLayer: ManagerAdjustmentLayer = {
      ...workingLayer,
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      version: nextVersion,
      basedOnVersion: existingActive?.version,
      status: 'APPROVED',
      reissueReason: isReissue ? cleanReason : undefined,
      updatedAt: getCairoTimestamp(),
      updatedBy: user.name,
    };

    if (!this.state.managerAdjustmentLayers) {
      this.state.managerAdjustmentLayers = {};
    }
    const versionLayerKey = this.getAdjustmentLayerStorageKey(resolvedClientId, params.fiscalYear, nextVersion);
    this.state.managerAdjustmentLayers[versionLayerKey] = approvedLayer;
    // Clear working draft status to APPROVED so subsequent reads default to the newly approved version
    this.state.managerAdjustmentLayers[workingKey] = approvedLayer;

    const nextModel = this.buildStatementModel(resolvedClientId, params.fiscalYear, nextVersion);

    // Compute line-by-line diffs between previous version N and new version N+1 (Requirement د-3)
    const versionDiffs: StatementVersionDiffItem[] = [];
    if (prevModel) {
      for (const lineKey of Object.keys(nextModel.linesMap)) {
        const prevLine = prevModel.linesMap[lineKey];
        const nextLine = nextModel.linesMap[lineKey];
        if (!nextLine) continue;
        const beforeCur = prevLine ? prevLine.currentAmount : 0;
        const afterCur = nextLine.currentAmount;
        const diffCur = Math.round((afterCur - beforeCur) * 100) / 100;
        const beforeComp = prevLine ? prevLine.comparativeAmount : 0;
        const afterComp = nextLine.comparativeAmount;
        const diffComp = Math.round((afterComp - beforeComp) * 100) / 100;
        if (Math.abs(diffCur) >= 0.005 || Math.abs(diffComp) >= 0.005) {
          versionDiffs.push({
            lineKey,
            labelAr: nextLine.labelAr,
            beforeCurrent: beforeCur,
            afterCurrent: afterCur,
            diffCurrent: diffCur,
            beforeComparative: beforeComp,
            afterComparative: afterComp,
            diffComparative: diffComp,
          });
        }
      }
    }

    const verificationCode = generateVerificationCode();
    const nowTs = getCairoTimestamp();
    const canonicalPayload = JSON.stringify({
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      version: nextVersion,
      verificationCode,
      totals: {
        incomeStatement: nextModel.incomeStatement?.totals || {
          netProfit: nextModel.incomeStatement?.netProfit,
        },
        balanceSheet: nextModel.balanceSheet?.totals || {
          totalAssets: nextModel.balanceSheet?.totalAssets,
        },
        cashFlow: nextModel.cashFlow?.totals || {
          endingCash: nextModel.cashFlow?.endingCash,
        },
        equityStatement: nextModel.equityStatement?.totals || {
          totalClosingEquity: nextModel.equityStatement?.totalClosingEquity,
        },
      },
      lines: Object.fromEntries(
        Object.entries(nextModel.linesMap || nextModel.lines || {}).map(([k, v]: [string, any]) => [
          k,
          { current: v?.currentAmount ?? 0, comparative: v?.comparativeAmount ?? 0 },
        ])
      ),
      adjustments: approvedLayer.adjustments,
    });
    const sha256Fingerprint = computeSha256Hex(canonicalPayload);

    const tb = this.getTrialBalance(resolvedClientId, params.fiscalYear);

    const newSnap = this.addApprovedStatement({
      id: `as-${resolvedClientId}-${params.fiscalYear}-v${nextVersion}-${Date.now().toString(36)}`,
      clientId: resolvedClientId,
      fiscalYear: params.fiscalYear,
      version: nextVersion,
      versionNo: nextVersion,
      status: 'APPROVED',
      approvedAt: nowTs,
      approvedBy: user.name,
      source: approvedLayer.adjustments.length > 0 ? 'MANUAL' : 'LEDGER',
      trialBalanceRows: tb.rows,
      incomeStatement: nextModel.incomeStatement,
      balanceSheet: nextModel.balanceSheet,
      cashFlow: nextModel.cashFlow,
      equityStatement: nextModel.equityStatement,
      notes: nextModel.notes,
      ratios: nextModel.ratios,
      adjustmentLayer: approvedLayer,
      reissueReason: isReissue ? cleanReason : undefined,
      previousVersionId: existingActive?.id,
      previousVersion: existingActive?.version,
      supersededFromVersion: existingActive?.version,
      versionDiffs,
      verificationCode,
      sha256Fingerprint,
      model: nextModel,
    } as any);

    if (isReissue) {
      this.recordAuditMutation({
        action: 'APPROVE_REISSUED_STATEMENT_VERSION_DIFF',
        entityType: 'APPROVED_STATEMENT',
        entityId: newSnap.id,
        clientId: resolvedClientId,
        beforeValue: {
          previousVersion: existingActive?.version,
          previousVerificationCode: existingActive?.verificationCode,
          previousSha256: existingActive?.sha256Fingerprint,
          previousTotals: prevModel
            ? {
                totalAssets: prevModel.balanceSheet?.totals?.totalAssets ?? prevModel.balanceSheet?.totalAssets,
                totalLiabilitiesAndEquity:
                  prevModel.balanceSheet?.totals?.totalLiabilitiesAndEquity ??
                  prevModel.balanceSheet?.totalLiabilitiesAndEquity,
                netProfit:
                  prevModel.incomeStatement?.totals?.netProfit ?? prevModel.incomeStatement?.netProfit,
                endingCash:
                  prevModel.cashFlow?.totals?.endingCash ?? prevModel.cashFlow?.endingCash,
              }
            : null,
          changedLinesBefore: versionDiffs.map((d) => ({
            lineKey: d.lineKey,
            labelAr: d.labelAr,
            beforeCurrent: d.beforeCurrent,
            beforeComparative: d.beforeComparative,
          })),
        },
        afterValue: {
          newVersion: nextVersion,
          newVerificationCode: verificationCode,
          newSha256: sha256Fingerprint,
          supersededVersion: existingActive?.version,
          supersededStatus: 'SUPERSEDED',
          newTotals: {
            totalAssets: nextModel.balanceSheet?.totals?.totalAssets ?? nextModel.balanceSheet?.totalAssets,
            totalLiabilitiesAndEquity:
              nextModel.balanceSheet?.totals?.totalLiabilitiesAndEquity ??
              nextModel.balanceSheet?.totalLiabilitiesAndEquity,
            netProfit:
              nextModel.incomeStatement?.totals?.netProfit ?? nextModel.incomeStatement?.netProfit,
            endingCash:
              nextModel.cashFlow?.totals?.endingCash ?? nextModel.cashFlow?.endingCash,
          },
          changedLinesAfter: versionDiffs.map((d) => ({
            lineKey: d.lineKey,
            labelAr: d.labelAr,
            afterCurrent: d.afterCurrent,
            diffCurrent: d.diffCurrent,
            afterComparative: d.afterComparative,
            diffComparative: d.diffComparative,
          })),
        },
        reason: cleanReason,
        details: `إعادة إصدار القوائم المالية المعتمدة للعميل (${resolvedClientId}) للسنة (${params.fiscalYear}): إنشاء الإصدار (${nextVersion}) ووسم الإصدار (${existingActive?.version}) بالحالة SUPERSEDED. عدد البنود المتغيرة: (${versionDiffs.length}). السبب: ${cleanReason}`,
      });
      this.saveState('APPROVED_STATEMENTS');
    }

    return {
      snapshot: newSnap,
      supersededSnapshot: existingActive,
      versionDiffs,
      model: this.buildStatementModel(resolvedClientId, params.fiscalYear, nextVersion),
    };
  }
}

export const db = new LocalDatabase();

