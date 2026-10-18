import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/localDatabase';
import { AccountingCalculator } from '../AccountingCalculator';
import { PostingEngineService } from '../PostingEngineService';
import { Invoice, InvoiceType, JournalEntry } from '../../types';

describe('YearEndClosing, TrialBalance, and Financial Statements Engine', () => {
  const testClientId = 'client-close-test';

  beforeEach(() => {
    db.resetToInitialStateForTesting();

    // Register a fresh test client
    db.addClient({
      id: testClientId,
      name: 'شركة الأمل الدولية للتجارة ش.م.م',
      activityTemplate: 'COMMERCIAL',
      fiscalYear: 2026,
      fiscalYearStart: '2026-01-01',
      fiscalYearEnd: '2026-12-31',
    });

    // Setup initial opening balances for 2026
    // Cash: 200,000 | Receivables: 150,000 | Capital: 350,000
    db.setClientAccountOpeningBalance(testClientId, 2026, '1101', 200000, 0, 'رصيد افتتاحي نقدية');
    db.setClientAccountOpeningBalance(testClientId, 2026, '1103', 150000, 0, 'رصيد افتتاحي عملاء');
    db.setClientAccountOpeningBalance(testClientId, 2026, '3101', 0, 350000, 'رصيد افتتاحي رأس المال');
  });

  describe('Requirement 1: TrialBalanceView Calculation & Strict Matching', () => {
    it('calculates trial balance strictly: Balance = Opening + movements within period only', () => {
      const clientAccounts = db.getClientAccounts(testClientId, 2026);

      // Post an invoice inside period (May 2026)
      const invInPeriod: Invoice = {
        id: 'inv-may-1',
        invoiceNumber: 'INV-MAY-001',
        clientId: testClientId,
        invoiceType: 'SALES',
        partnerName: 'شركة النيل',
        date: '2026-05-15',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 50000,
        totalVat: 7000,
        grandTotal: 57000,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 57000,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([invInPeriod]);
      PostingEngineService.postInvoice('inv-may-1');

      // Post another entry outside period (e.g. November 2026)
      const invOutPeriod: Invoice = {
        id: 'inv-nov-1',
        invoiceNumber: 'INV-NOV-001',
        clientId: testClientId,
        invoiceType: 'SALES',
        partnerName: 'شركة الأهرام',
        date: '2026-11-20',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 80000,
        totalVat: 11200,
        grandTotal: 91200,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 91200,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([invOutPeriod]);
      PostingEngineService.postInvoice('inv-nov-1');

      const allEntries = db.getState().journalEntries.filter((j) => j.clientId === testClientId);

      // Compute TB filtered for period Jan 1 to June 30
      const tbH1 = AccountingCalculator.computeTrialBalance(clientAccounts, allEntries, {
        clientId: testClientId,
        fiscalYear: 2026,
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
        postedOnly: true,
      });

      // Opening balances must be included
      const cashRow = tbH1.rows.find((r) => r.accountCode === '1101');
      expect(cashRow?.openingDebit).toBe(200000);

      // Movement must only contain the May invoice (subtotal 50,000 sales + 7,000 tax = 57,000 receivables)
      const salesRow = tbH1.rows.find((r) => r.accountCode === '4101');
      expect(salesRow?.movementCredit).toBe(50000);

      const vatOutRow = tbH1.rows.find((r) => r.accountCode === '2104');
      expect(vatOutRow?.movementCredit).toBe(7000);

      const recRow = tbH1.rows.find((r) => r.accountCode === '1103');
      // Opening 150,000 + movement 57,000 = closing 207,000
      expect(recRow?.openingDebit).toBe(150000);
      expect(recRow?.movementDebit).toBe(57000);
      expect(recRow?.closingDebit).toBe(207000);

      // November invoice movements must NOT be in H1 trial balance
      expect(salesRow?.closingCredit).toBe(50000);
      expect(tbH1.isBalanced).toBe(true);
      expect(tbH1.difference).toBe(0);
    });

    it('strictly matches accounts by ID only and surfaces orphan lines in red alert (unmatchedLines)', () => {
      const clientAccounts = db.getClientAccounts(testClientId, 2026);
      const accCash = clientAccounts.find((a) => a.code === '1101')!;

      // Add a manual journal entry where line 2 points to an invalid/deleted account ID
      const malformedEntry: JournalEntry = {
        id: 'je-orphan-test',
        entryNumber: 9999,
        date: '2026-04-10',
        fiscalYear: 2026,
        clientId: testClientId,
        description: 'قيد تجريبي يحتوي على حساب مفقود',
        isPosted: true,
        status: 'POSTED',
        lines: [
          {
            id: 'line-valid',
            accountId: accCash.id,
            accountCode: accCash.code,
            accountName: accCash.name,
            debit: 10000,
            credit: 0,
            clientId: testClientId,
          },
          {
            id: 'line-missing-acc',
            accountId: 'non-existent-account-id-xyz',
            accountCode: '9999',
            accountName: 'حساب مجهول تم حذفه',
            debit: 0,
            credit: 10000,
            clientId: testClientId,
          },
        ],
      };

      const tb = AccountingCalculator.computeTrialBalance(clientAccounts, [malformedEntry], {
        clientId: testClientId,
        fiscalYear: 2026,
        postedOnly: true,
      });

      // The missing account line must NOT silently vanish; it must be in unmatchedLines!
      expect(tb.unmatchedLines.length).toBe(1);
      expect(tb.unmatchedLines[0].accountId).toBe('non-existent-account-id-xyz');
      expect(tb.unmatchedLines[0].credit).toBe(10000);
      expect(tb.unmatchedLines[0].entryNumber).toBe(9999);
    });
  });

  describe('Requirement 2: Real Year-End Closing, Validation, and Post-Closing Equilibrium', () => {
    it('refuses closing if draft entries exist or trial balance is not balanced', () => {
      // Add a draft journal entry
      const clientAccounts = db.getClientAccounts(testClientId, 2026);
      const cashAcc = clientAccounts.find((a) => a.code === '1101')!;
      const capAcc = clientAccounts.find((a) => a.code === '3101')!;

      db.addJournalEntry({
        clientId: testClientId,
        fiscalYear: 2026,
        date: '2026-10-10',
        description: 'قيد مسودة معلق',
        isPosted: false,
        status: 'DRAFT',
        lines: [
          { id: 'l-draft-1', accountId: cashAcc.id, accountCode: cashAcc.code, accountName: cashAcc.name, debit: 5000, credit: 0 },
          { id: 'l-draft-2', accountId: capAcc.id, accountCode: capAcc.code, accountName: capAcc.name, debit: 0, credit: 5000 },
        ],
      });

      // Attempting closing must fail
      const preview = db.previewYearEndClosing(testClientId, 2026);
      expect(preview.canClose).toBe(false);
      expect(preview.errors.some((e) => e.includes('مسودة'))).toBe(true);

      expect(() => {
        db.executeYearEndClosing(testClientId, 2026);
      }).toThrow(/مسودة/);
    });

    it('executes real closing: revenues & expenses become 0, Retained Earnings = Net Income, and rolls over to next year', () => {
      // Create operational transactions for 2026:
      // 1. Sales invoice: 100,000 EGP + 14% VAT (14,000) = 114,000 EGP
      const saleInv: Invoice = {
        id: 'inv-close-sale',
        invoiceNumber: 'INV-CLS-01',
        clientId: testClientId,
        invoiceType: 'SALES',
        partnerName: 'العميل المميز',
        date: '2026-06-01',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 100000,
        totalVat: 14000,
        grandTotal: 114000,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 114000,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([saleInv]);
      PostingEngineService.postInvoice('inv-close-sale');

      // 2. Office Service revenue invoice: 25,000 EGP + 14% VAT (3,500) = 28,500 EGP
      const servInv: Invoice = {
        id: 'inv-close-serv',
        invoiceNumber: 'INV-CLS-02',
        clientId: testClientId,
        invoiceType: 'OFFICE_SERVICE',
        partnerName: 'شركة الاستشارات',
        date: '2026-07-15',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 25000,
        totalVat: 3500,
        grandTotal: 28500,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 28500,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([servInv]);
      PostingEngineService.postInvoice('inv-close-serv');

      // 3. Purchase invoice: 40,000 EGP + 14% VAT (5,600) = 45,600 EGP
      const purchInv: Invoice = {
        id: 'inv-close-purch',
        invoiceNumber: 'INV-CLS-03',
        clientId: testClientId,
        invoiceType: 'PURCHASE',
        partnerName: 'مورد البضاعة',
        date: '2026-08-10',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 40000,
        totalVat: 5600,
        grandTotal: 45600,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 45600,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([purchInv]);
      PostingEngineService.postInvoice('inv-close-purch');

      // Total Revenues: 100,000 (Sales) + 25,000 (Service) = 125,000 EGP
      // Total Expenses: 40,000 (Purchases COGS) = 40,000 EGP
      // Expected Net Income (Profit): 125,000 - 40,000 = 85,000 EGP

      // Check pre-closing preview
      const preview = db.previewYearEndClosing(testClientId, 2026);
      expect(preview.canClose).toBe(true);
      expect(preview.totalRevenues).toBe(125000);
      expect(preview.totalExpenses).toBe(40000);
      expect(preview.netIncome).toBe(85000);
      expect(preview.isProfit).toBe(true);

      // Execute Year-End Closing
      const result = db.executeYearEndClosing(testClientId, 2026, {
        rolloverToNextYear: true,
        lockPeriod: true,
      });

      expect(result.success).toBe(true);
      expect(result.netIncome).toBe(85000);
      expect(result.isProfit).toBe(true);

      // Acceptance criterion check: Post-closing Trial Balance
      const postTb = result.postClosingTrialBalance;
      expect(postTb.isBalanced).toBe(true);
      expect(postTb.difference).toBe(0);

      // All Revenue accounts must have zero closing balance
      const salesRow = postTb.rows.find((r) => r.accountCode === '4101');
      expect(salesRow?.closingDebit || 0).toBe(0);
      expect(salesRow?.closingCredit || 0).toBe(0);

      const servRow = postTb.rows.find((r) => r.accountCode === '4120');
      expect(servRow?.closingDebit || 0).toBe(0);
      expect(servRow?.closingCredit || 0).toBe(0);

      // All Expense accounts must have zero closing balance
      const cogsRow = postTb.rows.find((r) => r.accountCode === '5101');
      expect(cogsRow?.closingDebit || 0).toBe(0);
      expect(cogsRow?.closingCredit || 0).toBe(0);

      // Income Summary account 3999 must also be zero
      const incSumRow = postTb.rows.find((r) => r.accountCode === '3999');
      expect(incSumRow?.closingDebit || 0).toBe(0);
      expect(incSumRow?.closingCredit || 0).toBe(0);

      // Retained Earnings (3102) must equal exactly the Net Income (85,000 EGP)!
      const retainedRow = postTb.rows.find((r) => r.accountCode === '3102');
      expect(retainedRow).toBeDefined();
      expect(retainedRow?.closingCredit).toBe(85000);

      // Period must now be locked
      const lockKey = `${testClientId}_2026`;
      expect(db.getState().fiscalPeriodLocks[lockKey]?.isLocked).toBe(true);

      // Re-executing closing for the same client and year must be blocked
      expect(() => {
        db.executeYearEndClosing(testClientId, 2026);
      }).toThrow(/مقفلة بالفعل/);

      // Check rollover to next year (2027 opening balances)
      const opening2027 = db.getState().openingBalances[testClientId]?.[2027];
      expect(opening2027).toBeDefined();

      // In 2027, Retained Earnings must open with 85,000 EGP credit
      const retAcc = db.getState().accounts.find((a) => a.clientId === testClientId && a.code === '3102')!;
      expect(opening2027[retAcc.id]?.credit).toBe(85000);

      // Next year's opening balances must balance (Total Debits = Total Credits)
      let sum2027Dr = 0;
      let sum2027Cr = 0;
      for (const entry of Object.values(opening2027)) {
        sum2027Dr += entry.debit || 0;
        sum2027Cr += entry.credit || 0;
      }
      expect(Math.round(sum2027Dr * 100)).toBe(Math.round(sum2027Cr * 100));

      // Admin can unlock period with reason
      db.unlockFiscalPeriod(testClientId, 2026, 'إعادة فتح لمراجعة قيود الجرد');
      expect(db.getState().fiscalPeriodLocks[lockKey]?.isLocked).toBe(false);
      expect(db.getState().fiscalPeriodLocks[lockKey]?.reason).toBe('إعادة فتح لمراجعة قيود الجرد');
    });
  });

  describe('Requirement 3: Financial Statements generated from Trial Balance via Mapping', () => {
    it('generates Balance Sheet and Income Statement strictly from Trial Balance and flags unmapped accounts', () => {
      const clientAccounts = db.getClientAccounts(testClientId, 2026);

      // Post an invoice
      const saleInv: Invoice = {
        id: 'inv-stmt-1',
        invoiceNumber: 'INV-STMT-01',
        clientId: testClientId,
        invoiceType: 'SALES',
        partnerName: 'شركة الإسراء',
        date: '2026-03-10',
        currency: 'EGP',
        exchangeRate: 1,
        subtotal: 60000,
        totalVat: 8400,
        grandTotal: 68400,
        totalDiscount: 0,
        totalTableTax: 0,
        totalWht: 0,
        paidAmount: 0,
        remainingAmount: 68400,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        items: [],
      };
      db.batchAddInvoices([saleInv]);
      PostingEngineService.postInvoice('inv-stmt-1');

      const clientEntries = db.getState().journalEntries.filter((j) => j.clientId === testClientId);
      const tb = AccountingCalculator.computeTrialBalance(clientAccounts, clientEntries, {
        clientId: testClientId,
        fiscalYear: 2026,
        postedOnly: true,
      });

      // Default mapping
      const mapping = db.getClientStatementMapping(testClientId);
      const statements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
        tb,
        clientAccounts,
        mapping
      );

      // Balance Sheet must balance: Assets = Liabilities + Equity
      expect(statements.balanceSheet.isBalanced).toBe(true);
      expect(statements.balanceSheet.totalAssets).toBe(statements.balanceSheet.totalLiabilitiesAndEquity);

      // Net revenue in Income statement must match sales
      expect(statements.incomeStatement.netRevenue).toBe(60000);
      expect(statements.incomeStatement.netProfitBeforeTax).toBe(60000);

      // Now create a custom unmapped account with a balance and ensure it is caught
      const customAcc = db.addAccount({
        clientId: testClientId,
        code: '1999',
        name: 'أصول خاصة غير مصنفة',
        category: 'ASSETS',
        nature: 'DEBIT',
      });

      const unmappedEntry: JournalEntry = {
        id: 'je-custom-unmapped',
        entryNumber: 8888,
        date: '2026-04-01',
        clientId: testClientId,
        fiscalYear: 2026,
        description: 'قيد للحساب الخاص',
        isPosted: true,
        status: 'POSTED',
        lines: [
          {
            id: 'l1',
            accountId: customAcc.id,
            accountCode: customAcc.code,
            accountName: customAcc.name,
            debit: 15000,
            credit: 0,
            clientId: testClientId,
          },
          {
            id: 'l2',
            accountId: clientAccounts.find((a) => a.code === '3101')!.id,
            accountCode: '3101',
            accountName: 'رأس المال',
            debit: 0,
            credit: 15000,
            clientId: testClientId,
          },
        ],
      };

      const updatedEntries = [...clientEntries, unmappedEntry];
      const updatedAccounts = db.getClientAccounts(testClientId, 2026);
      const updatedTb = AccountingCalculator.computeTrialBalance(updatedAccounts, updatedEntries, {
        clientId: testClientId,
        fiscalYear: 2026,
        postedOnly: true,
      });

      const updatedStatements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
        updatedTb,
        updatedAccounts,
        mapping // custom account 1999 is NOT in default mapping
      );

      // The unmapped account must be flagged with red/amber alert!
      expect(updatedStatements.unmappedAccounts.some((a) => a.accountCode === '1999')).toBe(true);

      // Now map it through setClientStatementMapping
      db.setClientStatementMapping(testClientId, {
        '1999': 'BS_OTHER_NON_CURRENT_ASSETS',
      });

      const newMapping = db.getClientStatementMapping(testClientId);
      const finalStatements = AccountingCalculator.generateFinancialStatementsFromTrialBalance(
        updatedTb,
        updatedAccounts,
        newMapping
      );

      // Once mapped, unmappedAccounts must be clear of 1999
      expect(finalStatements.unmappedAccounts.some((a) => a.accountCode === '1999')).toBe(false);
      expect(finalStatements.balanceSheet.isBalanced).toBe(true);
    });
  });
});
