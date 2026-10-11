import { describe, it, expect } from 'vitest';
import { checkOpeningBalances, OpeningBalanceRow } from './openingBalanceCheck';

describe('checkOpeningBalances (Opening Balance Rollforward Check)', () => {
  it('handles full match scenario cleanly', () => {
    const priorRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 100000, credit: 0 },
      { mappedCode: '2010', mappedName: 'الموردون', debit: 0, credit: 50000 },
      { mappedCode: '3400', mappedName: 'الأرباح المرحلة', debit: 0, credit: 30000 },
      { mappedCode: '4110', mappedName: 'إيراد المبيعات', debit: 0, credit: 20000 }, // Revenue
      { mappedCode: '5110', mappedName: 'تكلفة المبيعات', debit: 10000, credit: 0 }, // Expense -> Profit = 10,000
    ];

    const currentRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', openingDebit: 100000, openingCredit: 0 },
      { mappedCode: '2010', mappedName: 'الموردون', openingDebit: 0, openingCredit: 50000 },
      // Opening RE should be 30,000 credit + 10,000 credit profit = 40,000 credit (net balance -40,000)
      { mappedCode: '3400', mappedName: 'الأرباح المرحلة', openingDebit: 0, openingCredit: 40000 },
      // Current year revenue / expense opening is 0
      { mappedCode: '4110', mappedName: 'إيراد المبيعات', openingDebit: 0, openingCredit: 0 },
      { mappedCode: '5110', mappedName: 'تكلفة المبيعات', openingDebit: 0, openingCredit: 0 },
    ];

    const result = checkOpeningBalances(priorRows, currentRows, true);

    expect(result.hasPriorData).toBe(true);
    expect(result.hasOpeningColumns).toBe(true);
    expect(result.isMatched).toBe(true);
    expect(result.discrepancies.length).toBe(0);
    expect(result.totalDifference).toBe(0);
  });

  it('detects a difference in a single asset/liability account', () => {
    const priorRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 100000, credit: 0 },
      { mappedCode: '2010', mappedName: 'الموردون', debit: 0, credit: 50000 },
    ];

    const currentRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', openingDebit: 90000, openingCredit: 0 }, // Diff -10,000
      { mappedCode: '2010', mappedName: 'الموردون', openingDebit: 0, openingCredit: 50000 },
    ];

    const result = checkOpeningBalances(priorRows, currentRows, true);

    expect(result.isMatched).toBe(false);
    expect(result.discrepancies.length).toBe(1);
    expect(result.discrepancies[0].mappedCode).toBe('1010');
    expect(result.discrepancies[0].difference).toBe(-10000);
    expect(result.totalDifference).toBe(10000);
  });

  it('excludes revenue and expense accounts (4xxx & 5xxx) from direct line discrepancies', () => {
    const priorRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 100000, credit: 0 },
      { mappedCode: '3400', mappedName: 'الأرباح المرحلة', debit: 0, credit: 0 },
      { mappedCode: '4110', mappedName: 'إيراد المبيعات', debit: 0, credit: 50000 }, // Revenue
      { mappedCode: '5110', mappedName: 'تكلفة أجور', debit: 30000, credit: 0 }, // Expense -> Net Profit = 20,000
    ];

    // Current year opening has 0 for 4110 and 5110, and 20,000 in 3400 (retained earnings)
    const currentRows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', openingDebit: 100000, openingCredit: 0 },
      { mappedCode: '3400', mappedName: 'الأرباح المرحلة', openingDebit: 0, openingCredit: 20000 },
      { mappedCode: '4110', mappedName: 'إيراد المبيعات', openingDebit: 0, openingCredit: 0 },
      { mappedCode: '5110', mappedName: 'تكلفة أجور', openingDebit: 0, openingCredit: 0 },
    ];

    const result = checkOpeningBalances(priorRows, currentRows, true);

    expect(result.isMatched).toBe(true);
    expect(result.discrepancies.length).toBe(0);
  });

  it('handles missing prior data or missing opening columns gracefully', () => {
    const rows: OpeningBalanceRow[] = [
      { mappedCode: '1010', mappedName: 'النقدية بالبنوك', debit: 100000, credit: 0 },
    ];

    // Case 1: Missing prior data
    const resultNoPrior = checkOpeningBalances(null, rows, true);
    expect(resultNoPrior.hasPriorData).toBe(false);
    expect(resultNoPrior.isMatched).toBe(false);

    // Case 2: Missing opening columns
    const resultNoOpening = checkOpeningBalances(rows, rows, false);
    expect(resultNoOpening.hasOpeningColumns).toBe(false);
    expect(resultNoOpening.isMatched).toBe(false);
  });
});
