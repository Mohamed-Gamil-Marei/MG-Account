export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'SECRETARY' | 'PENDING' | string;

export interface AccessUser {
  id?: string | number;
  name?: string;
  email?: string;
  role: UserRole;
  canManageUsers?: boolean;
  canAccessTreasury?: boolean;
  canAccessAuditTrail?: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  canAccessCreditFiles?: boolean;
  canAccessTaxReports?: boolean;
}

export function checkEntityAccess(user: AccessUser | null | undefined, entityType: string, action: 'READ' | 'WRITE' | 'DELETE'): boolean {
  if (!user || user.role === 'PENDING') return false;

  // 1. Audit logs: client cannot WRITE or DELETE auditLogs
  if (entityType === 'auditLogs') {
    if (action === 'WRITE' || action === 'DELETE') return false;
    if (action === 'READ') return !!user.canAccessAuditTrail || user.role === 'ADMIN';
  }

  // 2. Treasury access
  if (entityType === 'treasury') {
    if (!user.canAccessTreasury && user.role !== 'ADMIN') return false;
  }

  // 3. Secretary limits
  if (user.role === 'SECRETARY') {
    if (action === 'READ') {
      return ['clients', 'invoices', 'certificates'].includes(entityType);
    }
    if (action === 'WRITE') {
      return entityType === 'invoices';
    }
    return false;
  }

  // 4. Admin-only write entities
  const adminOnlyWriteEntities = ['officeProfile', 'systemUsers', 'fiscalPeriodLocks', 'preferences'];
  if (adminOnlyWriteEntities.includes(entityType) && action !== 'READ') {
    return user.role === 'ADMIN';
  }

  // 5. Accountant/Admin write entities
  const accountantAdminWriteEntities = ['accounts', 'taxDeclarations', 'taxAudits', 'fixedAssets', 'exchangeRates'];
  if (accountantAdminWriteEntities.includes(entityType) && action !== 'READ') {
    return user.role === 'ACCOUNTANT' || user.role === 'ADMIN';
  }

  // Journal entries posting
  if (entityType === 'journalEntries' && action === 'WRITE') {
    return !!user.canPostEntries || user.role === 'ADMIN' || user.role === 'ACCOUNTANT';
  }

  if (action === 'DELETE') {
    return !!user.canDeleteRecords || user.role === 'ADMIN' || user.role === 'ACCOUNTANT';
  }

  return true;
}
