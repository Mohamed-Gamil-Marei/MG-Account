import { ClientFeeAgreement, ClientFeeCollection } from '../types';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface ClientFeeSummaryItem {
  clientId: string;
  totalDue: number;
  totalCollected: number;
  remaining: number;
  daysOverdue: number; // 0 if none or not overdue
  oldestDueDate?: string;
  agreementsCount: number;
}

export function computeFeeSummary(
  agreements: ClientFeeAgreement[],
  collections: ClientFeeCollection[],
  nowDate: Date = new Date()
): Record<string, ClientFeeSummaryItem> {
  const collectionMap: Record<string, number> = {};
  for (const c of collections) {
    collectionMap[c.agreementId] = (collectionMap[c.agreementId] || 0) + c.amount;
  }

  const clientMap: Record<string, { due: number; collected: number; oldestUnpaidDate?: string; count: number }> = {};

  const todayTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

  for (const a of agreements) {
    if (a.status !== 'ACTIVE') continue;
    const collected = collectionMap[a.id] || 0;
    const remaining = Math.max(0, a.amount - collected);

    if (!clientMap[a.clientId]) {
      clientMap[a.clientId] = { due: 0, collected: 0, count: 0 };
    }
    clientMap[a.clientId].due += a.amount;
    clientMap[a.clientId].collected += collected;
    clientMap[a.clientId].count += 1;

    if (remaining > 0 && a.dueDate) {
      const dueTime = new Date(a.dueDate).getTime();
      if (!isNaN(dueTime)) {
        if (!clientMap[a.clientId].oldestUnpaidDate || dueTime < new Date(clientMap[a.clientId].oldestUnpaidDate!).getTime()) {
          clientMap[a.clientId].oldestUnpaidDate = a.dueDate;
        }
      }
    }
  }

  const result: Record<string, ClientFeeSummaryItem> = {};
  for (const [clientId, data] of Object.entries(clientMap)) {
    const remaining = round2(data.due - data.collected);
    let daysOverdue = 0;
    if (remaining > 0 && data.oldestUnpaidDate) {
      const dueTime = new Date(data.oldestUnpaidDate).getTime();
      if (!isNaN(dueTime) && dueTime < todayTime) {
        daysOverdue = Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24));
      }
    }

    result[clientId] = {
      clientId,
      totalDue: round2(data.due),
      totalCollected: round2(data.collected),
      remaining,
      daysOverdue,
      oldestDueDate: data.oldestUnpaidDate,
      agreementsCount: data.count,
    };
  }

  return result;
}
