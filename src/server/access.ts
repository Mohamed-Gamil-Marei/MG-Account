export type UserRole = 'ADMIN' | 'AUDITOR' | 'ACCOUNTANT' | 'SECRETARY' | 'PENDING' | string;

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

  // 3. WhatsApp entity: Allowed for ADMIN and ACCOUNTANT only. SECRETARY and PENDING are blocked.
  if (entityType === 'whatsapp') {
    return ['ADMIN', 'ACCOUNTANT'].includes(user.role);
  }

  // 4. Treasury access
  if (entityType === 'treasury') {
    if (!user.canAccessTreasury && user.role !== 'ADMIN' && user.role !== 'AUDITOR') return false;
  }

  // 3. User Preferences: personal settings allowed for all authenticated non-PENDING roles
  if (entityType === 'preferences') {
    return true;
  }

  // 4. Secretary limits
  if (user.role === 'SECRETARY') {
    if (action === 'READ') {
      return ['clients', 'invoices', 'certificates', 'preferences', 'documents'].includes(entityType);
    }
    if (action === 'WRITE') {
      return ['invoices', 'preferences', 'documents'].includes(entityType);
    }
    return false;
  }

  // 5. Admin-only write entities (office profile, system users, fiscal period locks)
  const adminOnlyWriteEntities = ['officeProfile', 'systemUsers', 'fiscalPeriodLocks'];
  if (adminOnlyWriteEntities.includes(entityType) && action !== 'READ') {
    return user.role === 'ADMIN';
  }

  // 6. Accountant/Auditor/Admin write entities
  const accountantAdminWriteEntities = ['accounts', 'taxDeclarations', 'taxAudits', 'fixedAssets', 'exchangeRates'];
  if (accountantAdminWriteEntities.includes(entityType) && action !== 'READ') {
    return ['ACCOUNTANT', 'AUDITOR', 'ADMIN'].includes(user.role);
  }

  // Journal entries posting
  if (entityType === 'journalEntries' && action === 'WRITE') {
    return !!user.canPostEntries || ['ADMIN', 'ACCOUNTANT', 'AUDITOR'].includes(user.role);
  }

  if (action === 'DELETE') {
    return !!user.canDeleteRecords || ['ADMIN', 'ACCOUNTANT', 'AUDITOR'].includes(user.role);
  }

  return true;
}
