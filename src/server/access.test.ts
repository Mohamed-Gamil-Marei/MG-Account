import { describe, it, expect } from 'vitest';
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

