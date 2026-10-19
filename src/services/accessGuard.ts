import { SystemUser } from '../types';

export type AccessGuardAction =
  | 'POST_ENTRY'
  | 'EDIT_POSTED'
  | 'DELETE_RECORD'
  | 'VOID_RECORD'
  | 'APPROVE_STATEMENT'
  | 'ISSUE_CERTIFICATE'
  | 'MANAGE_USERS'
  | 'EXPORT_BACKUP'
  | 'IMPORT_BACKUP'
  | 'CREATE_ENTRY'
  | 'CREATE_INVOICE'
  | 'CREATE_RECORD'
  | 'EDIT_RECORD'
  | 'LOCK_PERIOD'
  | 'UNLOCK_PERIOD'
  | 'POST'
  | 'UNPOST'
  | 'EDIT'
  | 'DELETE'
  | 'TREASURY'
  | 'TAX'
  | 'AUDIT_TRAIL'
  | 'ADMIN';

export interface AccessGuardContext {
  clientId?: string | null;
  fiscalYear?: number;
  entityType?: string;
  date?: string;
  allowWithoutClient?: boolean;
  requireAdmin?: boolean;
  activeClientId?: string | null;
}

export class PermissionError extends Error {
  public readonly code: string = 'PERMISSION_DENIED';
  public readonly action: AccessGuardAction;
  public readonly clientId?: string | null;
  public readonly fiscalYear?: number;
  public readonly entityType?: string;

  constructor(
    message: string,
    meta: {
      action: AccessGuardAction;
      clientId?: string | null;
      fiscalYear?: number;
      entityType?: string;
      code?: string;
    }
  ) {
    super(message);
    this.name = 'PermissionError';
    this.action = meta.action;
    this.clientId = meta.clientId;
    this.fiscalYear = meta.fiscalYear;
    this.entityType = meta.entityType;
    if (meta.code) {
      this.code = meta.code;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PeriodLockError extends PermissionError {
  public readonly periodKey: string;
  public readonly targetDate?: string;

  constructor(
    message: string,
    meta: {
      clientId: string;
      periodKey: string;
      fiscalYear?: number;
      targetDate?: string;
      entityType?: string;
    }
  ) {
    super(message, {
      action: 'EDIT_POSTED',
      clientId: meta.clientId,
      fiscalYear: meta.fiscalYear,
      entityType: meta.entityType || 'FISCAL_PERIOD',
      code: 'PERIOD_LOCKED',
    });
    this.name = 'PeriodLockError';
    this.periodKey = meta.periodKey;
    this.targetDate = meta.targetDate;
    Object.setPrototypeOf(this, PeriodLockError.prototype);
  }
}

type CurrentUserResolver = () => SystemUser | null;
type ActiveClientIdResolver = () => string | null;

let registeredUserResolver: CurrentUserResolver | null = null;
let registeredActiveClientResolver: ActiveClientIdResolver | null = null;

export function registerAccessGuardResolvers(
  userResolver: CurrentUserResolver,
  activeClientResolver?: ActiveClientIdResolver
): void {
  registeredUserResolver = userResolver;
  if (activeClientResolver) {
    registeredActiveClientResolver = activeClientResolver;
  }
}

function normalizeAction(action: AccessGuardAction): AccessGuardAction {
  switch (action) {
    case 'POST':
    case 'UNPOST':
      return 'POST_ENTRY';
    case 'DELETE':
      return 'DELETE_RECORD';
    case 'EDIT':
    case 'CREATE_RECORD':
    case 'CREATE_ENTRY':
    case 'CREATE_INVOICE':
      return 'EDIT_RECORD';
    default:
      return action;
  }
}

/**
 * الحارس المركزي للصلاحيات (Access Guard)
 * يفحص:
 * 1) وجود مستخدم حالي مسجل ونشط (يرفض عند null برسالة تتضمن "يجب تسجيل الدخول")
 * 2) دور المستخدم (ADMIN, AUDITOR, ACCOUNTANT, TAX_SPECIALIST, SECRETARY, VIEWER, PENDING)
 * 3) الأعلام الصريحة (canPostEntries, canEditPostedEntries, canDeleteRecords, canManageUsers, إلخ)
 * 4) نطاق العملاء المسموح بهم (permittedClientIds) للعميل المعني
 */
export function assertCan(
  action: AccessGuardAction,
  ctx?: AccessGuardContext | string,
  userOverride?: SystemUser | null
): SystemUser {
  const context: AccessGuardContext =
    typeof ctx === 'string' ? { clientId: ctx } : ctx || {};
  const normalizedAction = normalizeAction(action);

  const user =
    userOverride !== undefined
      ? userOverride
      : registeredUserResolver
      ? registeredUserResolver()
      : null;

  if (!user) {
    throw new PermissionError(
      'عملية مرفوضة: يجب تسجيل الدخول بحساب مستخدم نشط لإجراء هذه العملية.',
      {
        action: normalizedAction,
        clientId: context.clientId,
        fiscalYear: context.fiscalYear,
        entityType: context.entityType,
      }
    );
  }

  if (user.isActive === false || user.role === 'PENDING') {
    throw new PermissionError(
      `عملية مرفوضة: حساب المستخدم (${user.name || user.id}) غير مفعل أو قيد المراجعة. يجب تسجيل الدخول بحساب نشط.`,
      {
        action: normalizedAction,
        clientId: context.clientId,
        fiscalYear: context.fiscalYear,
        entityType: context.entityType,
      }
    );
  }

  if (user.role === 'VIEWER') {
    throw new PermissionError(
      `عملية مرفوضة: المستخدم (${user.name}) يحمل صلاحية مشاهدة فقط (VIEWER) ولا يملك صلاحية الإضافة أو التعديل أو الحذف.`,
      {
        action: normalizedAction,
        clientId: context.clientId,
        fiscalYear: context.fiscalYear,
        entityType: context.entityType,
      }
    );
  }

  const isAdminRole = user.role === 'ADMIN';

  // فحص العمليات المقيدة بمدير النظام (ADMIN) فقط
  if (
    normalizedAction === 'ADMIN' ||
    normalizedAction === 'IMPORT_BACKUP' ||
    context.requireAdmin
  ) {
    if (!isAdminRole) {
      throw new PermissionError(
        'عملية مرفوضة: هذه العملية مقيدة بصلاحية مدير النظام (ADMIN) فقط.',
        {
          action: normalizedAction,
          clientId: context.clientId,
          fiscalYear: context.fiscalYear,
          entityType: context.entityType,
        }
      );
    }
  }

  // تحديد العميل المستهدف وفحص permittedClientIds
  const activeClientId =
    context.activeClientId !== undefined
      ? context.activeClientId
      : registeredActiveClientResolver
      ? registeredActiveClientResolver()
      : null;

  const targetClientId =
    context.clientId !== undefined
      ? context.clientId
      : !context.allowWithoutClient &&
        normalizedAction !== 'MANAGE_USERS' &&
        normalizedAction !== 'EXPORT_BACKUP' &&
        normalizedAction !== 'IMPORT_BACKUP' &&
        normalizedAction !== 'ADMIN'
      ? activeClientId
      : null;

  if (!isAdminRole) {
    if (targetClientId && String(targetClientId).trim()) {
      const cleanClientId = String(targetClientId).trim();
      if (
        !Array.isArray(user.permittedClientIds) ||
        !user.permittedClientIds.includes(cleanClientId)
      ) {
        throw new PermissionError(
          `عملية مرفوضة: المستخدم (${user.name}) غير مصرح له بالوصول أو التعديل على بيانات العميل (${cleanClientId}) وفقاً لقائمة العملاء المصرح بهم (permittedClientIds).`,
          {
            action: normalizedAction,
            clientId: cleanClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
    } else if (
      !context.allowWithoutClient &&
      normalizedAction !== 'MANAGE_USERS' &&
      normalizedAction !== 'EXPORT_BACKUP' &&
      normalizedAction !== 'IMPORT_BACKUP' &&
      normalizedAction !== 'ADMIN' &&
      (!Array.isArray(user.permittedClientIds) || user.permittedClientIds.length === 0)
    ) {
      throw new PermissionError(
        `عملية مرفوضة: المستخدم (${user.name}) ليس لديه أي عملاء مصرح بالوصول إليهم (permittedClientIds).`,
        {
          action: normalizedAction,
          clientId: targetClientId,
          fiscalYear: context.fiscalYear,
          entityType: context.entityType,
        }
      );
    }
  } else if (
    targetClientId &&
    String(targetClientId).trim() &&
    Array.isArray(user.permittedClientIds) &&
    user.permittedClientIds.length > 0 &&
    !user.permittedClientIds.includes(String(targetClientId).trim())
  ) {
    throw new PermissionError(
      `عملية مرفوضة: المستخدم (${user.name}) مقيد بقائمة عملاء محددة لا تشمل العميل (${targetClientId}).`,
      {
        action: normalizedAction,
        clientId: targetClientId,
        fiscalYear: context.fiscalYear,
        entityType: context.entityType,
      }
    );
  }

  // فحص الصلاحيات التفصيلية والأعلام (canPostEntries, canEditPostedEntries, canDeleteRecords)
  const hasPostFlag = isAdminRole ? user.canPostEntries !== false : Boolean(user.canPostEntries);
  const hasEditPostedFlag = isAdminRole
    ? user.canEditPostedEntries !== false
    : Boolean(user.canEditPostedEntries);
  const hasDeleteFlag = isAdminRole
    ? user.canDeleteRecords !== false
    : Boolean(user.canDeleteRecords);

  switch (normalizedAction) {
    case 'POST_ENTRY':
    case 'LOCK_PERIOD':
      if (!hasPostFlag) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية ترحيل القيود أو الفواتير المحاسبية (canPostEntries).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
      break;

    case 'EDIT_POSTED':
      if (!hasEditPostedFlag) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية تعديل أو عكس القيود والسجلات المرحّلة (canEditPostedEntries).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
      break;

    case 'VOID_RECORD':
      if (!hasEditPostedFlag && !hasDeleteFlag) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية إلغاء أو إبطال السجلات المحاسبية (VOID_RECORD - تتطلب canEditPostedEntries أو canDeleteRecords).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
      break;

    case 'DELETE_RECORD':
      if (!hasDeleteFlag) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية حذف السجلات المحاسبية (canDeleteRecords).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
      break;

    case 'APPROVE_STATEMENT':
      if (
        !hasPostFlag ||
        (!isAdminRole && user.role !== 'AUDITOR' && user.role !== 'ACCOUNTANT')
      ) {
        throw new PermissionError(
          'عملية مرفوضة: اعتماد القوائم المالية الختامية يتطلب دور مراجع حسابات أو مدير نظام مع تفعيل صلاحية الترحيل (canPostEntries).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'APPROVED_STATEMENT',
          }
        );
      }
      break;

    case 'ISSUE_CERTIFICATE':
      if (
        !hasPostFlag ||
        (!isAdminRole && user.role !== 'AUDITOR' && user.role !== 'ACCOUNTANT')
      ) {
        throw new PermissionError(
          'عملية مرفوضة: إصدار الشهادات المهنية المعتمدة يتطلب صلاحية الترحيل والاعتماد (canPostEntries).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'CERTIFICATE',
          }
        );
      }
      break;

    case 'MANAGE_USERS':
      if (!isAdminRole && !user.canManageUsers) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية إدارة المستخدمين والصلاحيات (canManageUsers).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'USER',
          }
        );
      }
      break;

    case 'EXPORT_BACKUP':
      if (!targetClientId) {
        if (!isAdminRole && !user.canManageUsers) {
          throw new PermissionError(
            'عملية مرفوضة: تصدير النسخة الاحتياطية الشاملة للنظام مقيد بمدير النظام (ADMIN) فقط.',
            {
              action: normalizedAction,
              clientId: null,
              fiscalYear: context.fiscalYear,
              entityType: context.entityType || 'BACKUP',
            }
          );
        }
      } else if (!isAdminRole && !hasPostFlag && !hasEditPostedFlag) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية تصدير النسخة الاحتياطية لبيانات العميل (EXPORT_BACKUP).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'BACKUP',
          }
        );
      }
      break;

    case 'IMPORT_BACKUP':
    case 'UNLOCK_PERIOD':
      if (!isAdminRole) {
        throw new PermissionError(
          'عملية مرفوضة: هذه العملية الحساسة مقيدة بصلاحية مدير النظام (ADMIN) فقط.',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType,
          }
        );
      }
      break;

    case 'TREASURY':
      if (!isAdminRole && !user.canAccessTreasury) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية الوصول أو التعديل في الخزينة والأتعاب (canAccessTreasury).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'TREASURY',
          }
        );
      }
      break;

    case 'TAX':
      if (
        !isAdminRole &&
        !user.canAccessTaxReports &&
        user.role !== 'TAX_SPECIALIST' &&
        !hasPostFlag &&
        !hasEditPostedFlag
      ) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية تعديل الإقرارات والبيانات الضريبية (canAccessTaxReports).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'TAX_DECLARATION',
          }
        );
      }
      break;

    case 'AUDIT_TRAIL':
      if (!isAdminRole && !user.canAccessAuditTrail) {
        throw new PermissionError(
          'عملية مرفوضة: ليس لديك صلاحية الاطلاع على سجل المراجعة (canAccessAuditTrail).',
          {
            action: normalizedAction,
            clientId: targetClientId,
            fiscalYear: context.fiscalYear,
            entityType: context.entityType || 'AUDIT_TRAIL',
          }
        );
      }
      break;

    case 'EDIT_RECORD':
    default:
      // Active non-VIEWER users with client access in permittedClientIds can create/edit draft records
      break;
  }

  return user;
}

/**
 * فحص غير رامٍ للأخطاء يُستخدم في الواجهة لتعطيل الأزرار مع إظهار تلميح (Tooltip) بالسبب بالعربية
 */
export function canPerform(
  action: AccessGuardAction,
  ctx?: AccessGuardContext | string,
  userOverride?: SystemUser | null
): { allowed: boolean; reason?: string } {
  try {
    assertCan(action, ctx, userOverride);
    return { allowed: true };
  } catch (err) {
    return {
      allowed: false,
      reason: err instanceof Error ? err.message : 'غير مصرح بهذه العملية',
    };
  }
}
