import { describe, it, expect } from 'vitest';
import { ApprovedStatementsSnapshot } from '../types';
import { compareApprovedSnapshots } from './approvedStatements';

describe('Approved Statements & Version Comparison', () => {
  it('preserves values and calculates version numbers and comparisons including items in only one snapshot and negative differences', () => {
    const snap1: ApprovedStatementsSnapshot = {
      id: 'appr-1',
      clientId: 'cli-1',
      fiscalYear: 2026,
      versionNo: 1,
      approvedBy: 'مدير النظام',
      approvedAt: '2026-10-01 10:00:00',
      source: 'LEDGER',
      trialBalanceRows: [
        { code: '1110', name: 'النقدية بالخزينة', debit: 50000, credit: 0 },
        { code: '1210', name: 'العملاء', debit: 20000, credit: 0 },
        { code: '2110', name: 'الموردون', debit: 0, credit: 15000 },
      ],
      incomeStatement: { items: [] },
      balanceSheet: { assets: 70000 },
      cashFlow: { net: 30000 },
      checklistStatus: { ok: true, missing: [] },
    };

    const snap2: ApprovedStatementsSnapshot = {
      id: 'appr-2',
      clientId: 'cli-1',
      fiscalYear: 2026,
      versionNo: 2,
      approvedBy: 'مراقب الحسابات',
      approvedAt: '2026-10-10 12:00:00',
      source: 'LEDGER',
      trialBalanceRows: [
        { code: '1110', name: 'النقدية بالخزينة', debit: 45000, credit: 0 }, // negative difference (-5000)
        { code: '1310', name: 'المخزون', debit: 15000, credit: 0 }, // ONLY_IN_B
        { code: '2110', name: 'الموردون', debit: 0, credit: 15000 }, // EQUAL
        // 1210 is ONLY_IN_A
      ],
      incomeStatement: { items: [] },
      balanceSheet: { assets: 60000 },
      cashFlow: { net: 25000 },
      checklistStatus: { ok: true, missing: [] },
    };

    expect(snap2.versionNo).toBe(snap1.versionNo + 1);

    const diffs = compareApprovedSnapshots(snap1, snap2);

    // Negative difference
    const cashDiff = diffs.find((d) => d.code === '1110');
    expect(cashDiff).toBeDefined();
    expect(cashDiff?.valueA).toBe(50000);
    expect(cashDiff?.valueB).toBe(45000);
    expect(cashDiff?.diff).toBe(-5000); // negative difference
    expect(cashDiff?.status).toBe('CHANGED');

    // Item in snapshot A but not in B
    const debtorsDiff = diffs.find((d) => d.code === '1210');
    expect(debtorsDiff).toBeDefined();
    expect(debtorsDiff?.status).toBe('ONLY_IN_A');
    expect(debtorsDiff?.valueA).toBe(20000);
    expect(debtorsDiff?.valueB).toBe(0);
    expect(debtorsDiff?.diff).toBe(-20000);

    // Item in snapshot B but not in A
    const inventoryDiff = diffs.find((d) => d.code === '1310');
    expect(inventoryDiff).toBeDefined();
    expect(inventoryDiff?.status).toBe('ONLY_IN_B');
    expect(inventoryDiff?.valueA).toBe(0);
    expect(inventoryDiff?.valueB).toBe(15000);
    expect(inventoryDiff?.diff).toBe(15000);

    // Unchanged item
    const suppliersDiff = diffs.find((d) => d.code === '2110');
    expect(suppliersDiff).toBeDefined();
    expect(suppliersDiff?.status).toBe('EQUAL');
    expect(suppliersDiff?.diff).toBe(0);
  });
});
