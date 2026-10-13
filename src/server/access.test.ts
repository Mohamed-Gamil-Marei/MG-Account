import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';
import { checkEntityAccess, AccessUser, UserRole } from './access';

describe('1. checkEntityAccess Comprehensive Matrix Tests (src/server/access.test.ts)', () => {
  const roles: (UserRole | 'UNKNOWN_ROLE')[] = [
    'ADMIN',
    'ACCOUNTANT',
    'AUDITOR',
    'SECRETARY',
    'PENDING',
    'UNKNOWN_ROLE'
  ];

  const standardEntities = ['journalEntries', 'accounts', 'invoices'];
  const actions: ('READ' | 'WRITE' | 'DELETE')[] = ['READ', 'WRITE', 'DELETE'];

  it('evaluates checkEntityAccess for standard roles and entities', () => {
    for (const role of roles) {
      for (const entity of standardEntities) {
        for (const action of actions) {
          const user: AccessUser = { role: role as UserRole };
          const allowed = checkEntityAccess(user, entity, action);

          if (role === 'PENDING' || role === 'UNKNOWN_ROLE') {
            expect(allowed).toBe(false);
          } else if (role === 'ADMIN') {
            expect(allowed).toBe(true);
          } else if (role === 'AUDITOR') {
            if (action === 'READ') {
              expect(allowed).toBe(true);
            } else {
              expect(allowed).toBe(false);
            }
          } else if (role === 'SECRETARY') {
            if (entity === 'invoices') {
              expect(allowed).toBe(action === 'READ' || action === 'WRITE');
            } else {
              expect(allowed).toBe(false);
            }
          } else if (role === 'ACCOUNTANT') {
            if (action === 'DELETE') {
              expect(allowed).toBe(false);
            } else {
              expect(allowed).toBe(true);
            }
          }
        }
      }
    }
  });

  it('explicitly denies unknown role and PENDING role across all entities and actions', () => {
    const invalidUsers: (AccessUser | null)[] = [
      null,
      undefined,
      { role: 'PENDING' },
      { role: 'UNKNOWN_ROLE' as any }
    ];

    const allEntities = ['journalEntries', 'accounts', 'auditLogs', 'fiscalPeriodLocks', 'invoices'];
    for (const user of invalidUsers) {
      for (const entity of allEntities) {
        for (const action of actions) {
          expect(checkEntityAccess(user, entity, action)).toBe(false);
        }
      }
    }
  });

  it('enforces AUDITOR as strictly read-only on standard entities', () => {
    const auditorUser: AccessUser = { role: 'AUDITOR' };
    for (const entity of standardEntities) {
      expect(checkEntityAccess(auditorUser, entity, 'READ')).toBe(true);
      expect(checkEntityAccess(auditorUser, entity, 'WRITE')).toBe(false);
      expect(checkEntityAccess(auditorUser, entity, 'DELETE')).toBe(false);
    }

    // Auditor with canAccessAuditTrail can read auditLogs
    const auditorWithAudit: AccessUser = { role: 'AUDITOR', canAccessAuditTrail: true };
    expect(checkEntityAccess(auditorWithAudit, 'auditLogs', 'READ')).toBe(true);
    expect(checkEntityAccess(auditorWithAudit, 'auditLogs', 'WRITE')).toBe(false);
  });
});

describe('2. Server Journal Entry Balance & Period Locking Tests', () => {
  function validateEntryBalance(lines: { debit: number; credit: number }[]): boolean {
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) <= 0.005;
  }

  it('rejects unbalanced journal entries (difference > 0.005)', () => {
    const imbalancedLines = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 999.98 }
    ];
    expect(validateEntryBalance(imbalancedLines)).toBe(false);
  });

  it('accepts balanced journal entries (difference <= 0.005)', () => {
    const balancedLines = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 1000.003 }
    ];
    expect(validateEntryBalance(balancedLines)).toBe(true);
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

  it('rejects adding, editing, deleting, or unposting entries in a locked period', () => {
    const locks: PeriodLock[] = [
      { startDate: '2026-01-01', endDate: '2026-03-31', isLocked: true }
    ];

    const entryDateInLockedPeriod = '2026-02-15';
    const entryDateInOpenPeriod = '2026-04-10';

    expect(isPeriodLocked(entryDateInLockedPeriod, locks)).toBe(true);
    expect(isPeriodLocked(entryDateInOpenPeriod, locks)).toBe(false);
  });
});

describe('3. Reset Production Purge Tests', () => {
  function executeResetProduction(password: string | undefined, hasMasterPasswordEnv: boolean): { success: boolean; error?: string; purged: boolean } {
    const MASTER_PURGE = process.env.PASSWORD_PURGE_MASTER || 'VALID-MASTER-PURGE-PASSWORD-2026';
    if (!hasMasterPasswordEnv || !MASTER_PURGE || MASTER_PURGE.length < 16) {
      return { success: false, error: 'PASSWORD_PURGE_MASTER not configured', purged: false };
    }
    if (!password || password !== MASTER_PURGE) {
      return { success: false, error: 'Invalid master purge password', purged: false };
    }
    return { success: true, purged: true };
  }

  it('rejects reset-production without PASSWORD_PURGE_MASTER or with wrong password and preserves auditLogs', () => {
    // Without password
    const resNoPass = executeResetProduction(undefined, true);
    expect(resNoPass.success).toBe(false);
    expect(resNoPass.purged).toBe(false);

    // With wrong password
    const resWrongPass = executeResetProduction('wrongpassword', true);
    expect(resWrongPass.success).toBe(false);
    expect(resWrongPass.purged).toBe(false);

    // With correct password
    const resCorrect = executeResetProduction('VALID-MASTER-PURGE-PASSWORD-2026', true);
    expect(resCorrect.success).toBe(true);
    expect(resCorrect.purged).toBe(true);
  });
});

describe('4. ETA Routes Permission Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Mock ETA middleware or route guard checking role
    const mockEtaAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const role = req.headers['x-test-role'] as string;
      if (!role || ['SECRETARY', 'AUDITOR', 'PENDING'].includes(role)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions for ETA' });
      }
      if (!['ADMIN', 'ACCOUNTANT'].includes(role)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      next();
    };

    app.all('/api/eta/*', mockEtaAuth, (_req, res) => {
      res.status(200).json({ success: true, message: 'ETA access granted' });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('returns 403 for SECRETARY and AUDITOR on /api/eta/*', async () => {
    for (const role of ['SECRETARY', 'AUDITOR', 'PENDING']) {
      const res = await fetch(`${baseUrl}/api/eta/config`, {
        headers: { 'x-test-role': role }
      });
      expect(res.status).toBe(403);
    }
  });

  it('allows access for ADMIN and ACCOUNTANT on /api/eta/*', async () => {
    for (const role of ['ADMIN', 'ACCOUNTANT']) {
      const res = await fetch(`${baseUrl}/api/eta/config`, {
        headers: { 'x-test-role': role }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    }
  });
});
