export type UserRole = 'ADMIN' | 'AUDITOR' | 'ACCOUNTANT' | 'SECRETARY' | 'PENDING';

const VALID_ROLES: UserRole[] = ['ADMIN', 'AUDITOR', 'ACCOUNTANT', 'SECRETARY', 'PENDING'];

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

export const KNOWN_ENTITIES: string[] = [
  'clients',
  'suppliers',
  'accounts',
  'journalEntries',
  'treasury',
  'taxDeclarations',
  'taxAudits',
  'invoices',
  'certificates',
  'officeProfile',
  'auditLogs',
  'taxMandates',
  'fixedAssets',
  'feeEstimates',
  'whatsappMessages',
  'whatsappBotSettings',
  'exchangeRates',
  'fiscalPeriodLocks',
  'customsShipments',
  'financialActivityLogs',
  'preferences',
  'systemUsers',
  'closingChecklists',
  'clientDeadlines',
  'openItems',
  'approvedStatements',
  'feeAgreements',
  'feeCollections',
  'documents',
  'workspaces',
  'accounting_workspaces',
  'issuedDocuments',
  'financialStatements',
  'whatsapp',
];

export function checkEntityAccess(user: AccessUser | null | undefined, entityType: string, action: 'READ' | 'WRITE' | 'DELETE'): boolean {
  if (!user || user.role === 'PENDING') return false;
  if (!VALID_ROLES.includes(user.role as UserRole)) return false;
  if (!KNOWN_ENTITIES.includes(entityType)) return false;

  // 1. Audit logs: client cannot WRITE or DELETE auditLogs
  if (entityType === 'auditLogs') {
    if (action === 'WRITE' || action === 'DELETE') return false;
    if (action === 'READ') return !!user.canAccessAuditTrail || user.role === 'ADMIN';
    return false;
  }

  // 3. WhatsApp entity: Allowed for ADMIN and ACCOUNTANT only. SECRETARY and PENDING are blocked.
  if (entityType === 'whatsapp' || entityType === 'whatsappMessages' || entityType === 'whatsappBotSettings') {
    return ['ADMIN', 'ACCOUNTANT'].includes(user.role);
  }

  // 4. Treasury access
  if (entityType === 'treasury') {
    if (!user.canAccessTreasury && user.role !== 'ADMIN') return false;
    return action === 'READ' && ['ADMIN', 'ACCOUNTANT', 'AUDITOR'].includes(user.role);
  }

  // User Preferences: personal settings allowed for all authenticated valid roles
  if (entityType === 'preferences') {
    return true;
  }

  if (user.role === 'ADMIN') return true;

  // AUDITOR role: strict Read-Only across all entities (never allow WRITE or DELETE)
  if (user.role === 'AUDITOR') {
    return action === 'READ';
  }

  // Secretary limits
  if (user.role === 'SECRETARY') {
    if (action === 'READ') {
      return ['clients', 'invoices', 'certificates', 'preferences', 'documents'].includes(entityType);
    }
    if (action === 'WRITE') {
      return ['invoices', 'preferences', 'documents'].includes(entityType);
    }
    return false;
  }

  // Admin-only write entities (Admin was already handled above)
  const adminOnlyWriteEntities = ['officeProfile', 'systemUsers', 'fiscalPeriodLocks'];
  if (adminOnlyWriteEntities.includes(entityType) && action !== 'READ') {
    return false;
  }

  // Accountant write entities
  const accountantAdminWriteEntities = ['accounts', 'taxDeclarations', 'taxAudits', 'fixedAssets', 'exchangeRates'];
  if (accountantAdminWriteEntities.includes(entityType) && action === 'WRITE') {
    return (user.role as string) === 'ACCOUNTANT';
  }

  // Journal entries posting
  if (entityType === 'journalEntries' && action === 'WRITE') {
    return !!user.canPostEntries || (user.role as string) === 'ACCOUNTANT';
  }

  if (action === 'DELETE') {
    return !!user.canDeleteRecords;
  }

  if (action === 'READ') {
    return true;
  }

  if (action === 'WRITE') {
    return (user.role as string) === 'ACCOUNTANT';
  }

  return false; // Default to DENY
}
