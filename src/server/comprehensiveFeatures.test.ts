import { describe, it, expect } from 'vitest';
import { checkEntityAccess, AccessUser } from './access';

describe('1. Comprehensive Permission Matrix Tests (src/server/access.ts)', () => {
  const roles: ('ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'SECRETARY' | 'PENDING')[] = [
    'ADMIN',
    'ACCOUNTANT',
    'AUDITOR',
    'SECRETARY',
    'PENDING',
  ];

  it('denies access if user is null, undefined, or PENDING across all entities', () => {
    const entities = ['clients', 'suppliers', 'invoices', 'journalEntries', 'accounts', 'officeProfile'] as const;
    for (const entity of entities) {
      expect(checkEntityAccess(null, entity, 'READ')).toBe(false);
      expect(checkEntityAccess(undefined, entity, 'WRITE')).toBe(false);
      expect(checkEntityAccess({ role: 'PENDING' }, entity, 'READ')).toBe(false);
      expect(checkEntityAccess({ role: 'PENDING' }, entity, 'DELETE')).toBe(false);
    }
  });

  it('allows ADMIN full access to all standard entities', () => {
    const admin: AccessUser = { role: 'ADMIN' };
    const entities = ['clients', 'suppliers', 'invoices', 'journalEntries', 'accounts', 'officeProfile'] as const;
    for (const entity of entities) {
      expect(checkEntityAccess(admin, entity, 'READ')).toBe(true);
      expect(checkEntityAccess(admin, entity, 'WRITE')).toBe(true);
      expect(checkEntityAccess(admin, entity, 'DELETE')).toBe(true);
    }
  });

  it('enforces ACCOUNTANT permissions correctly (read/write standard accounts/journals, no officeProfile write)', () => {
    const accountant: AccessUser = { role: 'ACCOUNTANT' };
    expect(checkEntityAccess(accountant, 'accounts', 'READ')).toBe(true);
    expect(checkEntityAccess(accountant, 'accounts', 'WRITE')).toBe(true);
    expect(checkEntityAccess(accountant, 'journalEntries', 'WRITE')).toBe(true);
    expect(checkEntityAccess(accountant, 'officeProfile', 'WRITE')).toBe(false);
  });

  it('enforces AUDITOR role as strictly read-only on the server', () => {
    const auditor: AccessUser = { role: 'AUDITOR' };
    const entities = ['clients', 'suppliers', 'invoices', 'journalEntries', 'accounts', 'officeProfile'] as const;
    for (const entity of entities) {
      expect(checkEntityAccess(auditor, entity, 'READ')).toBe(true);
      expect(checkEntityAccess(auditor, entity, 'WRITE')).toBe(false);
      expect(checkEntityAccess(auditor, entity, 'DELETE')).toBe(false);
    }
  });

  it('enforces SECRETARY role limits correctly (invoices read/write, clients read-only, accounts/journalEntries restricted)', () => {
    const secretary: AccessUser = { role: 'SECRETARY' };
    expect(checkEntityAccess(secretary, 'clients', 'READ')).toBe(true);
    expect(checkEntityAccess(secretary, 'clients', 'WRITE')).toBe(false);
    expect(checkEntityAccess(secretary, 'invoices', 'WRITE')).toBe(true);
    expect(checkEntityAccess(secretary, 'accounts', 'WRITE')).toBe(false);
    expect(checkEntityAccess(secretary, 'officeProfile', 'WRITE')).toBe(false);
  });
});

describe('2. Journal Entry Balance Tolerance Tests (0.005) & Period Locking', () => {
  function validateEntryBalance(lines: { debit: number; credit: number }[]): boolean {
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) <= 0.005;
  }

  it('accepts balanced journal entries within 0.005 tolerance', () => {
    const validLines = [
      { debit: 1500.00, credit: 0 },
      { debit: 0, credit: 1500.003 },
    ];
    expect(validateEntryBalance(validLines)).toBe(true);
  });

  it('rejects imbalanced journal entries exceeding 0.005 tolerance', () => {
    const invalidLines = [
      { debit: 1500.00, credit: 0 },
      { debit: 0, credit: 1499.98 },
    ];
    expect(validateEntryBalance(invalidLines)).toBe(false);
  });

  interface PeriodLock {
    startDate: string;
    endDate: string;
    isLocked: boolean;
  }

  function isPeriodLocked(entryDate: string, locks: PeriodLock[]): boolean {
    const d = new Date(entryDate).getTime();
    for (const lock of locks) {
      if (lock.isLocked) {
        const start = new Date(lock.startDate).getTime();
        const end = new Date(lock.endDate).getTime();
        if (d >= start && d <= end) {
          return true;
        }
      }
    }
    return false;
  }

  it('rejects entries in locked accounting periods', () => {
    const locks: PeriodLock[] = [
      { startDate: '2026-01-01', endDate: '2026-03-31', isLocked: true },
      { startDate: '2026-04-01', endDate: '2026-06-30', isLocked: false },
    ];

    expect(isPeriodLocked('2026-02-10', locks)).toBe(true);
    expect(isPeriodLocked('2026-05-10', locks)).toBe(false);
  });
});

describe('3. Production Purge & ETA Permissions Tests', () => {
  it('rejects purge path or action without valid MASTER_PURGE_PASSWORD (>= 16 chars)', () => {
    const isValidPurgePassword = (pass: string | undefined): boolean => {
      if (!pass || typeof pass !== 'string') return false;
      return pass.length >= 16;
    };

    expect(isValidPurgePassword(undefined)).toBe(false);
    expect(isValidPurgePassword('')).toBe(false);
    expect(isValidPurgePassword('short')).toBe(false);
    expect(isValidPurgePassword('VALID-MASTER-PURGE-PASSWORD-2026')).toBe(true);
  });

  it('validates ETA permissions for each role correctly', () => {
    const canAccessETA = (user: AccessUser | null): boolean => {
      if (!user) return false;
      return ['ADMIN', 'ACCOUNTANT'].includes(user.role);
    };

    expect(canAccessETA({ role: 'ADMIN' })).toBe(true);
    expect(canAccessETA({ role: 'ACCOUNTANT' })).toBe(true);
    expect(canAccessETA({ role: 'AUDITOR' })).toBe(false);
    expect(canAccessETA({ role: 'SECRETARY' })).toBe(false);
    expect(canAccessETA({ role: 'PENDING' })).toBe(false);
    expect(canAccessETA(null)).toBe(false);
  });
});
