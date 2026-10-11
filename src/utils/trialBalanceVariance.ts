import { round2 } from './accountingCalculations';

export interface TrialBalanceVarianceOptions {
  pctThreshold?: number;
  minAmount?: number;
}

export interface VarianceAccountItem {
  mappedCode: string;
  mappedName: string;
  currentBalance: number;
  priorBalance: number;
  difference: number;
  percentage: number | null;
  flagged: boolean;
  isNew: boolean;
  isDisappeared: boolean;
}

export interface VarianceAnalysisResult {
  variances: VarianceAccountItem[];
  flaggedAccounts: VarianceAccountItem[];
  newAccounts: VarianceAccountItem[];
  disappearedAccounts: VarianceAccountItem[];
}

export interface GenericTrialBalanceRow {
  debit?: number;
  credit?: number;
  netBalance?: number;
  mappedCode?: string;
  mappedName?: string;
  originalCode?: string;
  originalName?: string;
}

export function computeVariance(
  currentRows: GenericTrialBalanceRow[],
  priorRows: GenericTrialBalanceRow[],
  opts: TrialBalanceVarianceOptions = {}
): VarianceAnalysisResult {
  const pctThreshold = opts.pctThreshold ?? 30;
  const minAmount = opts.minAmount ?? 10000;

  const currentMap = new Map<string, { name: string; balance: number }>();
  for (const r of currentRows || []) {
    const code = String(r.mappedCode || '').trim();
    if (!code || code === 'UNMAPPED') continue;

    let rowNet = 0;
    if (r.debit !== undefined || r.credit !== undefined) {
      rowNet = (Number(r.debit) || 0) - (Number(r.credit) || 0);
    } else if (r.netBalance !== undefined) {
      rowNet = Number(r.netBalance) || 0;
    }

    const name = r.mappedName || r.originalName || code;
    const existing = currentMap.get(code);
    if (existing) {
      existing.balance += rowNet;
    } else {
      currentMap.set(code, { name, balance: rowNet });
    }
  }

  const priorMap = new Map<string, { name: string; balance: number }>();
  for (const r of priorRows || []) {
    const code = String(r.mappedCode || '').trim();
    if (!code || code === 'UNMAPPED') continue;

    let rowNet = 0;
    if (r.debit !== undefined || r.credit !== undefined) {
      rowNet = (Number(r.debit) || 0) - (Number(r.credit) || 0);
    } else if (r.netBalance !== undefined) {
      rowNet = Number(r.netBalance) || 0;
    }

    const name = r.mappedName || r.originalName || code;
    const existing = priorMap.get(code);
    if (existing) {
      existing.balance += rowNet;
    } else {
      priorMap.set(code, { name, balance: rowNet });
    }
  }

  const allCodes = new Set<string>([
    ...Array.from(currentMap.keys()),
    ...Array.from(priorMap.keys()),
  ]);

  const variances: VarianceAccountItem[] = [];
  const newAccounts: VarianceAccountItem[] = [];
  const disappearedAccounts: VarianceAccountItem[] = [];

  allCodes.forEach((code) => {
    const curr = currentMap.get(code);
    const pri = priorMap.get(code);

    const currentBalance = curr ? round2(curr.balance) : 0;
    const priorBalance = pri ? round2(pri.balance) : 0;
    const mappedName = (curr ? curr.name : pri?.name) || code;

    const difference = round2(currentBalance - priorBalance);

    let percentage: number | null = null;
    let pctValForCheck = 0;

    if (priorBalance !== 0) {
      const rawPct = (difference / priorBalance) * 100;
      percentage = round2(rawPct);
      pctValForCheck = Math.abs(percentage);
    }

    const isNew = !!curr && !pri && currentBalance !== 0;
    const isDisappeared = !curr && !!pri && priorBalance !== 0;

    const absDiff = Math.abs(difference);
    const passesAmount = absDiff >= minAmount;
    const passesPct = priorBalance === 0
      ? currentBalance !== 0
      : pctValForCheck >= pctThreshold;

    const flagged = passesAmount && passesPct;

    const item: VarianceAccountItem = {
      mappedCode: code,
      mappedName,
      currentBalance,
      priorBalance,
      difference,
      percentage,
      flagged,
      isNew,
      isDisappeared,
    };

    variances.push(item);

    if (isNew) {
      newAccounts.push(item);
    }
    if (isDisappeared) {
      disappearedAccounts.push(item);
    }
  });

  const flaggedAccounts = variances
    .filter((v) => v.flagged)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  return {
    variances,
    flaggedAccounts,
    newAccounts,
    disappearedAccounts,
  };
}
