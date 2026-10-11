import { describe, it, expect } from 'vitest';
import { computeFeeSummary } from './clientFees';
import { ClientFeeAgreement, ClientFeeCollection } from '../types';

describe('clientFees helper', () => {
  const today = new Date('2026-10-11');

  it('computes summary with partial and full collection, cancelled agreement', () => {
    const agreements: ClientFeeAgreement[] = [
      { id: 'ag-1', clientId: 'c-1', fiscalYear: 2026, description: 'Audit 2025', amount: 10000, dueDate: '2026-09-01', status: 'ACTIVE' },
      { id: 'ag-2', clientId: 'c-1', fiscalYear: 2026, description: 'Tax Return', amount: 5000, dueDate: '2026-08-01', status: 'ACTIVE' },
      { id: 'ag-3', clientId: 'c-1', fiscalYear: 2026, description: 'Cancelled fee', amount: 3000, dueDate: '2026-01-01', status: 'CANCELLED' },
      { id: 'ag-4', clientId: 'c-2', fiscalYear: 2026, description: 'Consulting', amount: 8000, dueDate: '2026-11-01', status: 'ACTIVE' },
    ];

    const collections: ClientFeeCollection[] = [
      { id: 'col-1', agreementId: 'ag-1', clientId: 'c-1', amount: 4000, receivedAt: '2026-09-10', method: 'CASH' },
      { id: 'ag-2-full', agreementId: 'ag-2', clientId: 'c-1', amount: 5000, receivedAt: '2026-08-15', method: 'BANK' },
      // ag-4 has no collections
    ];

    const summary = computeFeeSummary(agreements, collections, today);

    expect(summary['c-1']).toBeDefined();
    expect(summary['c-1'].totalDue).toBe(15000); // 10000 + 5000 (cancelled ignored)
    expect(summary['c-1'].totalCollected).toBe(9000); // 4000 + 5000
    expect(summary['c-1'].remaining).toBe(6000); // 15000 - 9000
    // ag-1 due 2026-09-01 is oldest unpaid (since ag-2 is fully paid). Today is 2026-10-11. Sept 1 to Oct 11 = 40 days.
    expect(summary['c-1'].daysOverdue).toBe(40);

    expect(summary['c-2']).toBeDefined();
    expect(summary['c-2'].totalDue).toBe(8000);
    expect(summary['c-2'].totalCollected).toBe(0);
    expect(summary['c-2'].remaining).toBe(8000);
    expect(summary['c-2'].daysOverdue).toBe(0); // due date is in the future (2026-11-01)
  });
});
