import { JournalEntry, Account, JournalEntryLine } from '../types';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
  IncomeStatementData,
  BalanceSheetData,
  CashFlowStatementData,
  CalculatedAccount,
  round2,
} from './accountingCalculations';

export interface AuditBuildResult {
  entry: JournalEntry;
  calculatedAccounts: CalculatedAccount[];
  incomeData: IncomeStatementData;
  balanceData: BalanceSheetData;
  cashFlowData: CashFlowStatementData;
  warnings: string[];
}

export function buildAuditFromTrialBalance(
  mappedRows: any[],
  accounts: Account[],
  fiscalYear: number,
  clientName?: string,
  clientId?: string,
  priorRows?: any[] | null
): AuditBuildResult {
  const warnings: string[] = [];
  
  // Create lines from mappedRows
  const lines: JournalEntryLine[] = mappedRows.map((row, index) => {
    const existingAcc = accounts.find((a) => a.code === row.mappedCode);
    const accId = existingAcc ? existingAcc.id : `acc-audit-${row.mappedCode}`;
    const accName = existingAcc ? existingAcc.name : (row.mappedName || row.originalName);
    
    if (!existingAcc) {
      warnings.push(`الحساب (${row.originalName || row.mappedName}) بالكود (${row.mappedCode}) غير مربوط بدليل الحسابات المعياري.`);
    }

    const c = String(row.mappedCode || '');
    const isRecognized = c.startsWith('1') || c.startsWith('2') || c.startsWith('3') || c.startsWith('4') || c.startsWith('5');
    if (!isRecognized) {
      warnings.push(`الحساب (${row.originalName || row.mappedName}) بالكود (${c}) غير مصنف ضمن بنود القوائم المالية المعتمدة.`);
    }

    return {
      id: `line-audit-${index}-${Date.now()}`,
      accountId: accId,
      accountCode: row.mappedCode,
      accountName: accName,
      debit: round2(row.debit || 0),
      credit: round2(row.credit || 0),
      description: `رصيد ميزان المراجعة - ${row.originalName || accName}`,
    };
  });

  const totalDebit = round2(lines.reduce((sum, l) => sum + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((sum, l) => sum + (l.credit || 0), 0));
  const trialBalanceDiff = round2(totalDebit - totalCredit);

  // وقيد الميزان غير المتزن يتوقف قبل التوليد
  if (Math.abs(trialBalanceDiff) > 0.01) {
    throw new Error(
      `ميزان المراجعة غير متزن! إجمالي المدين: ${totalDebit.toLocaleString('ar-EG')} - إجمالي الدائن: ${totalCredit.toLocaleString('ar-EG')} (الفرق: ${trialBalanceDiff.toLocaleString('ar-EG')} ج.م). غير مسموح بتوليد القوائم إلا بعد تعديل الميزان أو الموازنة بجاري الشركاء.`
    );
  }

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
  mappedRows.forEach((row) => {
    if (!evalAccounts.some((a) => a.code === row.mappedCode)) {
      evalAccounts.push({
        id: `acc-audit-${row.mappedCode}`,
        code: row.mappedCode,
        name: row.mappedName || row.originalName,
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
  
  // Use estimateTaxIfMissing=false for review mode (do not estimate 22.5% tax)
  const incomeData = generateIncomeStatement(calculatedAccounts, false);
  if (!incomeData.hasTaxRecorded || incomeData.taxExpense === 0) {
    warnings.push('ضريبة الدخل غير مسجلة في الميزان');
  }

  const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);

  // Compute priorBalanceData if priorRows provided for comparative cash flow
  let priorBalanceData: BalanceSheetData | null = null;
  if (priorRows && priorRows.length > 0) {
    try {
      const priorEvalAccounts: Account[] = [...accounts];
      const validPriorRows = priorRows.filter((r) => Boolean(r.mappedCode || r.originalCode));

      validPriorRows.forEach((row) => {
        const code = String(row.mappedCode || row.originalCode || '');
        if (code && !priorEvalAccounts.some((a) => a.code === code)) {
          priorEvalAccounts.push({
            id: `acc-audit-prior-${code}`,
            code,
            name: row.mappedName || row.originalName || code,
            category: code.startsWith('1') ? 'ASSETS' :
                      code.startsWith('2') ? 'LIABILITIES' :
                      code.startsWith('3') ? 'EQUITY' :
                      code.startsWith('4') ? 'REVENUES' : 'EXPENSES',
            nature: (code.startsWith('1') || code.startsWith('5')) ? 'DEBIT' : 'CREDIT',
            level: 2,
            openingBalanceDebit: 0,
            openingBalanceCredit: 0,
            isSystem: false,
          });
        }
      });

      const priorLines: JournalEntryLine[] = validPriorRows.map((row, index) => {
        const code = String(row.mappedCode || row.originalCode || '');
        const existingAcc = accounts.find((a) => a.code === code);
        const accId = existingAcc ? existingAcc.id : `acc-audit-prior-${code}`;
        const accName = existingAcc ? existingAcc.name : (row.mappedName || row.originalName || code);
        return {
          id: `line-prior-${index}-${Date.now()}`,
          accountId: accId,
          accountCode: code,
          accountName: accName,
          debit: round2(row.debit || 0),
          credit: round2(row.credit || 0),
          description: `رصيد ميزان السنة المقارنة - ${accName}`,
        };
      });

      const priorEntry: JournalEntry = {
        id: `audit-prior-entry-${fiscalYear - 1}-${Date.now()}`,
        entryNumber: Date.now() - 1,
        serialNumber: `AUDIT-${fiscalYear - 1}-PRIOR`,
        entryType: 'ADJUSTING',
        date: `${fiscalYear - 1}-12-31`,
        description: `ميزان مراجعة السنة المقارنة ${fiscalYear - 1}`,
        totalDebit: round2(priorLines.reduce((s, l) => s + (l.debit || 0), 0)),
        totalCredit: round2(priorLines.reduce((s, l) => s + (l.credit || 0), 0)),
        isPosted: true,
        source: 'AUDIT_DIRECT_ENTRY',
        clientId,
        clientName,
        lines: priorLines,
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const priorCalculatedAccounts = computeAccountBalances(priorEvalAccounts, [priorEntry]);
      const priorIncomeData = generateIncomeStatement(priorCalculatedAccounts, false);
      priorBalanceData = generateBalanceSheet(priorCalculatedAccounts, priorIncomeData);
    } catch (e) {
      console.warn('Failed to compute priorBalanceData from priorRows:', e);
      priorBalanceData = null;
    }
  }

  const cashFlowData = generateCashFlowStatement(incomeData, balanceData, priorBalanceData);

  return {
    entry: auditEntry,
    calculatedAccounts,
    incomeData,
    balanceData,
    cashFlowData,
    warnings,
  };
}
