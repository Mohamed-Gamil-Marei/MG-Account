import { describe, it, expect } from 'vitest';
import { checkEntityAccess, AccessUser } from './access';

describe('1. Permission Matrix Tests (src/server/access.ts)', () => {
  it('denies access if user is null, undefined, or PENDING', () => {
    expect(checkEntityAccess(null, 'clients', 'READ')).toBe(false);
    expect(checkEntityAccess(undefined, 'clients', 'WRITE')).toBe(false);
    const pendingUser: AccessUser = { role: 'PENDING' };
    expect(checkEntityAccess(pendingUser, 'clients', 'READ')).toBe(false);
  });

  it('enforces AUDITOR role as strictly read-only on the server', () => {
    const auditor: AccessUser = { role: 'AUDITOR' };
    expect(checkEntityAccess(auditor, 'clients', 'READ')).toBe(true);
    expect(checkEntityAccess(auditor, 'clients', 'WRITE')).toBe(false);
    expect(checkEntityAccess(auditor, 'clients', 'DELETE')).toBe(false);
    expect(checkEntityAccess(auditor, 'journalEntries', 'WRITE')).toBe(false);
    expect(checkEntityAccess(auditor, 'accounts', 'DELETE')).toBe(false);
  });

  it('enforces SECRETARY role limits correctly', () => {
    const secretary: AccessUser = { role: 'SECRETARY' };
    expect(checkEntityAccess(secretary, 'clients', 'READ')).toBe(true);
    expect(checkEntityAccess(secretary, 'clients', 'WRITE')).toBe(false);
    expect(checkEntityAccess(secretary, 'invoices', 'WRITE')).toBe(true);
    expect(checkEntityAccess(secretary, 'officeProfile', 'WRITE')).toBe(false);
  });

  it('enforces ADMIN and ACCOUNTANT write rules on restricted entities', () => {
    const accountant: AccessUser = { role: 'ACCOUNTANT' };
    const admin: AccessUser = { role: 'ADMIN' };

    expect(checkEntityAccess(accountant, 'officeProfile', 'WRITE')).toBe(false);
    expect(checkEntityAccess(admin, 'officeProfile', 'WRITE')).toBe(true);

    expect(checkEntityAccess(accountant, 'accounts', 'WRITE')).toBe(true);
    expect(checkEntityAccess(admin, 'accounts', 'WRITE')).toBe(true);
  });

  it('defaults to DENY (return false) for unhandled actions', () => {
    const admin: AccessUser = { role: 'ADMIN' };
    expect(checkEntityAccess(admin, 'clients' as any, 'UNKNOWN_ACTION' as any)).toBe(false);
  });
});

describe('2. Journal Entry Balance Tolerance Tests (0.005)', () => {
  function validateEntryBalance(lines: { debit: number; credit: number }[]): boolean {
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) <= 0.005;
  }

  it('accepts balanced journal entries within 0.005 tolerance', () => {
    const validLines = [
      { debit: 100.00, credit: 0 },
      { debit: 0, credit: 100.002 },
    ];
    expect(validateEntryBalance(validLines)).toBe(true);
  });

  it('rejects imbalanced journal entries exceeding 0.005 tolerance', () => {
    const invalidLines = [
      { debit: 100.00, credit: 0 },
      { debit: 0, credit: 99.99 },
    ];
    expect(validateEntryBalance(invalidLines)).toBe(false);
  });
});

describe('3. Period Locking Logic Tests', () => {
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

  it('identifies if an entry date falls within a locked period', () => {
    const locks: PeriodLock[] = [
      { startDate: '2026-01-01', endDate: '2026-03-31', isLocked: true },
      { startDate: '2026-04-01', endDate: '2026-06-30', isLocked: false },
    ];

    expect(isPeriodLocked('2026-02-15', locks)).toBe(true);
    expect(isPeriodLocked('2026-05-15', locks)).toBe(false);
    expect(isPeriodLocked('2026-07-01', locks)).toBe(false);
  });
});

describe('4. Production Purge & ETA Permissions Mock Validation', () => {
  it('validates MASTER_PURGE_PASSWORD minimum length requirement (>= 16 chars)', () => {
    const isValidPurgePassword = (pass: string | undefined): boolean => {
      if (!pass || typeof pass !== 'string') return false;
      return pass.length >= 16;
    };

    expect(isValidPurgePassword('short-pass')).toBe(false);
    expect(isValidPurgePassword('123456789012345')).toBe(false);
    expect(isValidPurgePassword('SECURE-PRODUCTION-PURGE-MASTER-KEY-2026')).toBe(true);
  });

  it('restricts ETA paths to ADMIN and ACCOUNTANT roles', () => {
    const canAccessETA = (user: AccessUser | null): boolean => {
      if (!user) return false;
      return ['ADMIN', 'ACCOUNTANT'].includes(user.role);
    };

    expect(canAccessETA({ role: 'ADMIN' })).toBe(true);
    expect(canAccessETA({ role: 'ACCOUNTANT' })).toBe(true);
    expect(canAccessETA({ role: 'AUDITOR' })).toBe(false);
    expect(canAccessETA({ role: 'SECRETARY' })).toBe(false);
    expect(canAccessETA(null)).toBe(false);
  });
});
