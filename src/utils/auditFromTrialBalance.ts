import { JournalEntry, Account } from '../types';
import { DatabaseState } from '../db/localDatabase';

export interface AuditBuildResult {
  entry: JournalEntry;
  calculatedAccounts: Account[];
  incomeData: any;
  balanceData: any;
  cashFlowData: any;
  warnings: string[];
}

import { JournalEntry, Account, JournalEntryLine } from '../types';
import { DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
  round2,
} from './accountingCalculations';

export interface AuditBuildResult {
  entry: JournalEntry;
  calculatedAccounts: Account[];
  incomeData: any;
  balanceData: any;
  cashFlowData: any;
  warnings: string[];
}

export function buildAuditFromTrialBalance(
  mappedRows: any[],
  accounts: Account[],
  fiscalYear: number,
  clientName?: string,
  clientId?: string
): AuditBuildResult {
  const warnings: string[] = [];
  
  // Create lines from mappedRows
  const lines: JournalEntryLine[] = mappedRows.map((row, index) => {
    const existingAcc = accounts.find(a => a.code === row.mappedCode);
    const accId = existingAcc ? existingAcc.id : `acc-audit-${row.mappedCode}`;
    const accName = existingAcc ? existingAcc.name : row.mappedName;
    
    if (!existingAcc) {
      warnings.push(`الحساب (${row.originalName}) بالكود (${row.mappedCode}) غير موجود في دليل الحسابات المعياري.`);
    }

    return {
      id: `line-audit-${index}-${Date.now()}`,
      accountId: accId,
      accountCode: row.mappedCode,
      accountName: accName,
      debit: round2(row.debit || 0),
      credit: round2(row.credit || 0),
      description: `رصيد ميزان المراجعة - ${row.originalName}`,
    };
  });

  const totalDebit = round2(lines.reduce((sum, l) => sum + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((sum, l) => sum + (l.credit || 0), 0));

  const auditEntry: JournalEntry = {
    id: `audit-direct-entry-${fiscalYear}-${Date.now()}`,
    entryNumber: Date.now(),
    serialNumber: `AUDIT-${fiscalYear}-0001`,
    entryType: 'ADJUSTING',
    date: `${fiscalYear}-12-31`,
    description: `قيد ميزان المراجعة المباشر المعتمد لسنة ${fiscalYear} (وضع المراجعة)`,
    totalDebit,
    totalCredit,
    isPosted: true,
    source: 'AUDIT_DIRECT_ENTRY',
    clientId,
    clientName,
    lines,
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Temp account structure for computation
  const evalAccounts: Account[] = [...accounts];
  mappedRows.forEach(row => {
    if (!evalAccounts.some(a => a.code === row.mappedCode)) {
      evalAccounts.push({
        id: `acc-audit-${row.mappedCode}`,
        code: row.mappedCode,
        name: row.mappedName,
        category: row.mappedCode.startsWith('1') ? 'ASSETS' :
                  row.mappedCode.startsWith('2') ? 'LIABILITIES' :
                  row.mappedCode.startsWith('3') ? 'EQUITY' :
                  row.mappedCode.startsWith('4') ? 'REVENUES' : 'EXPENSES',
        nature: (row.mappedCode.startsWith('1') || row.mappedCode.startsWith('5')) ? 'DEBIT' : 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: false,
      });
    }
  });

  const calculatedAccounts = computeAccountBalances(evalAccounts, [auditEntry]);
  
  // Use estimateTaxIfMissing=false for review mode
  const incomeData = generateIncomeStatement(calculatedAccounts, false);
  if (incomeData.taxExpense === 0 && !incomeData.hasTaxRecorded) {
    warnings.push("ضريبة الدخل غير مسجلة في الميزان");
  }

  const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);
  const cashFlowData = generateCashFlowStatement(incomeData, balanceData);

  return {
    entry: auditEntry,
    calculatedAccounts,
    incomeData,
    balanceData,
    cashFlowData,
    warnings,
  };
}
