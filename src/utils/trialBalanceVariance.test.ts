import { describe, it, expect } from 'vitest';
import { computeVariance, GenericTrialBalanceRow } from './trialBalanceVariance';

describe('computeVariance (Trial Balance Variance Analysis)', () => {
  it('computes variance correctly with flagged accounts, non-flagged accounts, new, disappeared, and zero prior balance', () => {
    // Current year rows
    const currentRows: GenericTrialBalanceRow[] = [
      // Account 1010: Exceeds threshold (150,000 vs 100,000 -> diff 50,000, 50% change >= 30% & >= 10,000) -> Flagged #1
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 150000, credit: 0 },
      // Account 1020: Exceeds threshold (20,000 vs 100,000 -> diff -80,000, -80% change >= 30% & >= 10,000) -> Flagged #2
      { mappedCode: '1020', mappedName: 'العملاء', debit: 20000, credit: 0 },
      // Account 1030: Below threshold (105,000 vs 100,000 -> diff 5,000, 5% change < 30% & < 10,000) -> Not flagged
      { mappedCode: '1030', mappedName: 'المخزون', debit: 105000, credit: 0 },
      // Account 1040: New Account (15,000 vs absent prior -> diff 15,000, prior zero, current != 0, >= 10,000) -> New & Flagged
      { mappedCode: '1040', mappedName: 'أوراق دفع جديدة', debit: 15000, credit: 0 },
      // Account 1050: Prior zero, current 5,000 -> diff 5,000 < 10,000 -> Not flagged
      { mappedCode: '1050', mappedName: 'مصاريف نثرية', debit: 5000, credit: 0 },
      // Unmapped row -> Should be excluded
      { mappedCode: 'UNMAPPED', mappedName: 'غير مربوط', debit: 99999, credit: 0 },
    ];

    // Prior year rows
    const priorRows: GenericTrialBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 100000, credit: 0 },
      { mappedCode: '1020', mappedName: 'العملاء', debit: 100000, credit: 0 },
      { mappedCode: '1030', mappedName: 'المخزون', debit: 100000, credit: 0 },
      { mappedCode: '1050', mappedName: 'مصاريف نثرية', debit: 0, credit: 0 },
      // Account 1060: Disappeared Account (0 current vs 40,000 prior -> diff -40,000, >= 10,000) -> Disappeared & Flagged
      { mappedCode: '1060', mappedName: 'موردون قدامى', debit: 40000, credit: 0 },
    ];

    const result = computeVariance(currentRows, priorRows, {
      pctThreshold: 30,
      minAmount: 10000,
    });

    // Check flagged accounts
    const flaggedCodes = result.flaggedAccounts.map((a) => a.mappedCode);
    expect(flaggedCodes).toContain('1010');
    expect(flaggedCodes).toContain('1020');
    expect(flaggedCodes).toContain('1040');
    expect(flaggedCodes).toContain('1060');
    expect(flaggedCodes).not.toContain('1030');
    expect(flaggedCodes).not.toContain('1050');

    // Check 1010 details
    const acc1010 = result.variances.find((a) => a.mappedCode === '1010');
    expect(acc1010?.currentBalance).toBe(150000);
    expect(acc1010?.priorBalance).toBe(100000);
    expect(acc1010?.difference).toBe(50000);
    expect(acc1010?.percentage).toBe(50);
    expect(acc1010?.flagged).toBe(true);

    // Check 1020 details
    const acc1020 = result.variances.find((a) => a.mappedCode === '1020');
    expect(acc1020?.currentBalance).toBe(20000);
    expect(acc1020?.priorBalance).toBe(100000);
    expect(acc1020?.difference).toBe(-80000);
    expect(acc1020?.percentage).toBe(-80);
    expect(acc1020?.flagged).toBe(true);

    // Check 1030 (not flagged)
    const acc1030 = result.variances.find((a) => a.mappedCode === '1030');
    expect(acc1030?.flagged).toBe(false);

    // Check new account (1040)
    expect(result.newAccounts.map((a) => a.mappedCode)).toEqual(['1040']);
    const acc1040 = result.variances.find((a) => a.mappedCode === '1040');
    expect(acc1040?.percentage).toBeNull();
    expect(acc1040?.isNew).toBe(true);
    expect(acc1040?.flagged).toBe(true);

    // Check disappeared account (1060)
    expect(result.disappearedAccounts.map((a) => a.mappedCode)).toEqual(['1060']);
    const acc1060 = result.variances.find((a) => a.mappedCode === '1060');
    expect(acc1060?.isDisappeared).toBe(true);
    expect(acc1060?.flagged).toBe(true);
  });
});
