/**
 * Oracle ERP Financials / Fusion Architecture Types & Interfaces
 * منظومة أوراكل المالية - الهيكل المحاسبي ودفاتر الأستاذ وقطاعات الحسابات المرنة
 */

export type OracleLedgerType = 'PRIMARY' | 'SECONDARY' | 'REPORTING';

export interface OracleSegmentDefinition {
  segmentNumber: number;
  segmentName: string;
  segmentNameAr: string;
  codeLength: number;
  exampleValue: string;
  description: string;
}

export interface OracleLedger {
  id: string;
  ledgerName: string;
  ledgerNameAr: string;
  ledgerType: OracleLedgerType;
  currency: string;
  chartOfAccountsName: string;
  accountingStandard: 'EAS' | 'IFRS' | 'US_GAAP';
  fiscalCalendarName: string;
  revaluationRate?: number;
  status: 'ACTIVE' | 'FROZEN';
}

export type OraclePeriodStatus = 'OPEN' | 'CLOSED' | 'PERMANENTLY_CLOSED' | 'FUTURE_ENTERABLE';

export interface OracleAccountingPeriod {
  periodName: string;       // e.g. "JAN-26", "FEB-26", ..., "DEC-26", "ADJ-26"
  periodNameAr: string;     // e.g. "يناير 2026", "فترة التسويات السنوية 2026"
  periodNumber: number;     // 1..13
  fiscalYear: number;       // 2026
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ADJ';
  startDate: string;
  endDate: string;
  status: OraclePeriodStatus;
  isAdjustingPeriod?: boolean;
}

export type OracleJournalSource = 'MANUAL' | 'SPREADSHEET' | 'PAYABLES' | 'RECEIVABLES' | 'ASSETS' | 'TAX_ENGINE';
export type OracleJournalCategory = 'STANDARD' | 'ACCRUAL' | 'PAYMENTS' | 'RECEIPTS' | 'DEPRECIATION' | 'TAX_ADJUSTMENT' | 'REVALUATION';
export type OracleJournalStatus = 'UNPOSTED' | 'POSTED' | 'FUNDS_CHECKED' | 'ERROR' | 'REVERSED';

export interface OracleJournalLineItem {
  id: string;
  lineNumber: number;
  companyCode: string;       // Segment 1 (e.g. 01)
  costCenterCode: string;    // Segment 2 (e.g. 100)
  accountCode: string;       // Segment 3 (e.g. 11101)
  subAccountCode: string;    // Segment 4 (e.g. 000)
  intercompanyCode: string;  // Segment 5 (e.g. 00)
  fullCodeCombination: string; // e.g. "01-100-11101-000-00"
  accountNameAr: string;
  enteredCurrency: string;   // EGP, USD, EUR
  enteredDebit: number;
  enteredCredit: number;
  exchangeRate: number;
  accountedDebit: number;    // In Ledger Currency
  accountedCredit: number;   // In Ledger Currency
  lineDescription: string;
}

export interface OracleJournalBatch {
  id: string;
  batchName: string;
  batchDescription: string;
  ledgerId: string;
  periodName: string;
  fiscalYear: number;
  source: OracleJournalSource;
  category: OracleJournalCategory;
  accountingDate: string;
  status: OracleJournalStatus;
  totalAccountedDebit: number;
  totalAccountedCredit: number;
  isBalanced: boolean;
  fundsStatus: 'PASSED' | 'WARNING' | 'FAILED';
  lines: OracleJournalLineItem[];
  postedBy?: string;
  postedAt?: string;
  referenceDocNo?: string;
}

export interface OracleAPInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  amount: number;
  taxAmount: number;
  status: 'VALIDATED' | 'UNVALIDATED' | 'PAID' | 'CANCELLED';
  matchStatus: '3_WAY_MATCHED' | 'UNMATCHED';
  poNumber?: string;
  glDate: string;
  distributionCode: string; // 01-100-51101-000-00
}

export interface OracleARTransaction {
  id: string;
  trxNumber: string;
  customerName: string;
  trxDate: string;
  currency: string;
  totalAmount: number;
  status: 'COMPLETE' | 'INCOMPLETE' | 'PAID';
  taxExempt: boolean;
  glDate: string;
  receivablesAccountCode: string; // 01-000-11301-000-00
  revenueAccountCode: string;     // 01-200-41101-000-00
}
