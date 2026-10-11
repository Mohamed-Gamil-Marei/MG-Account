import { describe, it, expect } from 'vitest';
import { ApprovedStatementsSnapshot } from '../types';

function compareSnapshots(snapA: ApprovedStatementsSnapshot, snapB: ApprovedStatementsSnapshot) {
  const diffs: Record<string, { valueA: number; valueB: number; diff: number }> = {};
  const itemsA = snapA.incomeStatement?.items || [];
  const itemsB = snapB.incomeStatement?.items || [];

  const mapA = new Map(itemsA.map((i: any) => [i.key || i.name, i.amount || 0]));
  const mapB = new Map(itemsB.map((i: any) => [i.key || i.name, i.amount || 0]));

  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()] as string[]);
  for (const k of allKeys) {
    const valA = (mapA.get(k) as number) || 0;
    const valB = (mapB.get(k) as number) || 0;
    diffs[k] = { valueA: valA, valueB: valB, diff: valB - valA };
  }
  return diffs;
}

describe('Approved Statements & Version Comparison', () => {
  it('preserves values and calculates version numbers and comparisons', () => {
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
      ],
      incomeStatement: {
        items: [
          { key: 'rev', name: 'إيرادات النشاط', amount: 100000 },
          { key: 'exp', name: 'مصروفات التشغيل', amount: 40000 },
        ],
      },
      balanceSheet: { assets: 50000 },
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
        { code: '1110', name: 'النقدية بالخزينة', debit: 60000, credit: 0 },
      ],
      incomeStatement: {
        items: [
          { key: 'rev', name: 'إيرادات النشاط', amount: 120000 },
          { key: 'exp', name: 'مصروفات التشغيل', amount: 45000 },
        ],
      },
      balanceSheet: { assets: 60000 },
      cashFlow: { net: 40000 },
      checklistStatus: { ok: true, missing: [] },
    };

    expect(snap2.versionNo).toBe(snap1.versionNo + 1);
    expect(snap1.incomeStatement.items[0].amount).toBe(100000); // original preserved

    const diffs = compareSnapshots(snap1, snap2);
    expect(diffs['rev'].valueA).toBe(100000);
    expect(diffs['rev'].valueB).toBe(120000);
    expect(diffs['rev'].diff).toBe(20000);

    expect(diffs['exp'].valueA).toBe(40000);
    expect(diffs['exp'].valueB).toBe(45000);
    expect(diffs['exp'].diff).toBe(5000);
  });
});
