import { describe, it, expect } from 'vitest';
import { db } from './localDatabase';

describe('resetForProduction', () => {
  it('resets database for production while preserving standard chart of accounts and users', async () => {
    // Populate some sample data to verify it gets cleared
    (db as any).state.clients = [
      { id: 'client-test-1', name: 'شركة تجريبية' } as any,
    ];
    (db as any).state.journalEntries = [
      { id: 'je-test-1', entryNumber: '101' } as any,
    ];
    (db as any).state.invoices = [
      { id: 'inv-test-1', invoiceNumber: 'INV-1' } as any,
    ];

    // Ensure current user is ADMIN
    (db as any).state.users = [
      { id: 'user-admin', username: 'admin', role: 'ADMIN', name: 'المدير العام' },
    ];
    (db as any).state.currentUserId = 'user-admin';

    // Execute resetForProduction
    const res = await db.resetForProduction({
      passcode: 'MASTER_PURGE_PASSWORD',
      confirmationText: 'تفريغ',
    });

    expect(res.success).toBe(true);
    expect(res.backupJson).toBeDefined();

    const state = db.getState();

    // Standard chart of accounts must remain with zero balances
    expect(state.accounts.length).toBeGreaterThan(0);
    state.accounts.forEach((acc) => {
      expect(acc.currentBalance || 0).toBe(0);
      expect(acc.openingBalanceDebit || 0).toBe(0);
      expect(acc.openingBalanceCredit || 0).toBe(0);
    });

    // Admin user must remain
    expect(state.users.length).toBeGreaterThan(0);

    // All transactional collections must be empty
    expect(state.clients).toEqual([]);
    expect(state.journalEntries).toEqual([]);
    expect(state.treasuryTransactions).toEqual([]);
    expect(state.taxDeclarations).toEqual([]);
    expect(state.taxMandates).toEqual([]);
    expect(state.certificates).toEqual([]);
    expect(state.invoices).toEqual([]);
    expect(state.feasibilityStudies).toEqual([]);
    expect(state.creditSimulations).toEqual([]);
    expect(state.fixedAssets).toEqual([]);
    expect(state.feeEstimates).toEqual([]);
    expect(state.customsShipments).toEqual([]);
    expect(state.whatsappMessages).toEqual([]);

    // Office profile personal fields cleared
    expect(state.officeProfile.firmName).toBe('');
    expect(state.officeProfile.auditorName).toBe('');
    expect(state.officeProfile.phone).toBe('');
    expect(state.officeProfile.email).toBe('');
  });
});
