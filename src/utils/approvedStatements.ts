import { ApprovedStatementsSnapshot } from '../types';

export interface SnapshotDiffItem {
  code: string;
  name: string;
  valueA: number;
  valueB: number;
  diff: number;
  status: 'EQUAL' | 'CHANGED' | 'ONLY_IN_A' | 'ONLY_IN_B';
}

export function compareApprovedSnapshots(
  snapA: ApprovedStatementsSnapshot,
  snapB: ApprovedStatementsSnapshot
): SnapshotDiffItem[] {
  const mapA = new Map<string, { name: string; value: number }>();
  const mapB = new Map<string, { name: string; value: number }>();

  snapA.trialBalanceRows.forEach((row) => {
    const net = (row.debit || 0) - (row.credit || 0);
    mapA.set(row.code, { name: row.name, value: net });
  });

  snapB.trialBalanceRows.forEach((row) => {
    const net = (row.debit || 0) - (row.credit || 0);
    mapB.set(row.code, { name: row.name, value: net });
  });

  const allCodes = new Set([...mapA.keys(), ...mapB.keys()]);
  const diffs: SnapshotDiffItem[] = [];

  allCodes.forEach((code) => {
    const itemA = mapA.get(code);
    const itemB = mapB.get(code);

    if (itemA && itemB) {
      const valA = itemA.value;
      const valB = itemB.value;
      const diff = valB - valA;
      const status = diff === 0 ? 'EQUAL' : 'CHANGED';
      diffs.push({
        code,
        name: itemB.name || itemA.name,
        valueA: valA,
        valueB: valB,
        diff,
        status,
      });
    } else if (itemA && !itemB) {
      diffs.push({
        code,
        name: itemA.name,
        valueA: itemA.value,
        valueB: 0,
        diff: -itemA.value,
        status: 'ONLY_IN_A',
      });
    } else if (!itemA && itemB) {
      diffs.push({
        code,
        name: itemB.name,
        valueA: 0,
        valueB: itemB.value,
        diff: itemB.value,
        status: 'ONLY_IN_B',
      });
    }
  });

  return diffs.sort((a, b) => a.code.localeCompare(b.code));
}
