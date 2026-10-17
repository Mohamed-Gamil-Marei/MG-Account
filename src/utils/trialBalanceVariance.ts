export interface VarianceAccountItem {
  mappedCode: string;
  mappedName: string;
  currentBalance: number;
  priorBalance: number;
  difference: number;
  percentage: number | null; // null if priorBalance === 0 (new account)
}

export interface VarianceAnalysisResult {
  allAccounts: VarianceAccountItem[];
  flaggedAccounts: VarianceAccountItem[];
  newAccounts: VarianceAccountItem[];
  disappearedAccounts: VarianceAccountItem[];
  pctThreshold: number;
  minAmount: number;
}

export interface VarianceOptions {
  pctThreshold?: number;
  minAmount?: number;
}

function getRowNetBalance(row: any): number {
  if (typeof row.netBalance === 'number') return row.netBalance;
  const endDebit = Number(row.endingDebit ?? row.closingDebit ?? row.debit ?? 0);
  const endCredit = Number(row.endingCredit ?? row.closingCredit ?? row.credit ?? 0);
  return endDebit - endCredit;
}

export function computeVariance(
  currentRows: any[],
  priorRows: any[],
  options: VarianceOptions = {}
): VarianceAnalysisResult {
  const pctThreshold = options.pctThreshold ?? 30;
  const minAmount = options.minAmount ?? 10000;

  const currentMap = new Map<string, { name: string; balance: number }>();
  for (const r of currentRows || []) {
    const code = String(r.mappedCode || r.accountCode || r.code || '').trim();
    if (!code) continue;
    const name = String(r.mappedName || r.accountName || r.name || code).trim();
    const bal = getRowNetBalance(r);
    const prev = currentMap.get(code);
    currentMap.set(code, {
      name: prev?.name || name,
      balance: (prev?.balance || 0) + bal,
    });
  }

  const priorMap = new Map<string, { name: string; balance: number }>();
  for (const r of priorRows || []) {
    const code = String(r.mappedCode || r.accountCode || r.code || '').trim();
    if (!code) continue;
    const name = String(r.mappedName || r.accountName || r.name || code).trim();
    const bal = getRowNetBalance(r);
    const prev = priorMap.get(code);
    priorMap.set(code, {
      name: prev?.name || name,
      balance: (prev?.balance || 0) + bal,
    });
  }

  const allCodes = Array.from(new Set([...currentMap.keys(), ...priorMap.keys()])).sort();
  const allAccounts: VarianceAccountItem[] = [];
  const flaggedAccounts: VarianceAccountItem[] = [];
  const newAccounts: VarianceAccountItem[] = [];
  const disappearedAccounts: VarianceAccountItem[] = [];

  for (const code of allCodes) {
    const curr = currentMap.get(code);
    const prior = priorMap.get(code);
    const currentBalance = Math.round(((curr?.balance || 0) + Number.EPSILON) * 100) / 100;
    const priorBalance = Math.round(((prior?.balance || 0) + Number.EPSILON) * 100) / 100;
    const difference = Math.round(((currentBalance - priorBalance) + Number.EPSILON) * 100) / 100;
    const mappedName = curr?.name || prior?.name || code;

    let percentage: number | null = null;
    if (Math.abs(priorBalance) > 0.001) {
      percentage = Math.round(((difference / Math.abs(priorBalance)) * 100) * 10) / 10;
    }

    const item: VarianceAccountItem = {
      mappedCode: code,
      mappedName,
      currentBalance,
      priorBalance,
      difference,
      percentage,
    };

    allAccounts.push(item);

    if (Math.abs(priorBalance) < 0.01 && Math.abs(currentBalance) >= 0.01) {
      newAccounts.push(item);
    } else if (Math.abs(priorBalance) >= 0.01 && Math.abs(currentBalance) < 0.01) {
      disappearedAccounts.push(item);
    }

    const absDiff = Math.abs(difference);
    const exceedsAmount = absDiff >= minAmount;
    const exceedsPct = percentage === null ? absDiff >= minAmount : Math.abs(percentage) >= pctThreshold;

    if (exceedsAmount && exceedsPct) {
      flaggedAccounts.push(item);
    }
  }

  return {
    allAccounts,
    flaggedAccounts,
    newAccounts,
    disappearedAccounts,
    pctThreshold,
    minAmount,
  };
}
