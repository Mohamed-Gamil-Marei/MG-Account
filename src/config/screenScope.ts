import { ClientArchiveRecord, NavigationTab, SystemUser } from '../types';
import { DatabaseState } from '../db/localDatabase';

/**
 * الشاشات التشغيلية العابرة للعملاء (Cross-Client Operational Screens)
 * تُعرض مباشرة بكافة العملاء المصرح بهم للمستخدم دون اشتراط اختيار عميل نشط (activeClientId)
 */
export const CROSS_CLIENT_TABS: readonly NavigationTab[] = [
  'DASHBOARD',
  // الإقرارات والمنظومات ومواعيد التقديم والمطابقة مع الـ ETA
  'TAX_AUDIT_HUB',
  'TAX_TRACKER',
  'TAX_FILING_CELLS',
  'TAX_PENALTY_SIMULATOR',
  'TAX_EXPOSURE_SIMULATOR',
  'ETA_RECONCILIATION',
  'E_INVOICING_TOKENS',
  'TAX_COMPLIANCE_HUB',
  // الفواتير الإلكترونية والتوكنات
  'INVOICING',
  // التأمينات والمرتبات
  'PAYROLL_INSURANCE',
  // الخزنة، الرسوم، الواتساب، أرشيف العملاء
  'OFFICE_HUB',
  'CLIENTS_ARCHIVE',
  'PRACTICE_CLIENTS_HUB',
  'OFFICE_TREASURY',
  'PRACTICE_MANAGEMENT',
  'WHATSAPP_BOT',
  'MULTI_TENANT_WORKSPACES',
  // الشهادات المهنية
  'CERTIFICATES',
  // أسعار الصرف
  'CURRENCY_EXCHANGE_RATES',
  'CURRENCY_RATES',
  // سجل المراجعة والأمان
  'AUDIT_SECURITY_HUB',
  'SECURITY_AUDIT_HUB',
  'AUDIT_TRAIL',
  'BACKUP_EXPORT',
  'USERS_DEVICES',
  // القيود غير المنسوبة
  'UNASSIGNED_ENTRIES',
] as const;

/**
 * الشاشات المحاسبية والمالية المرتبطة بعميل محدد وسنة مالية محددة (Client & Fiscal-Year Scoped Screens)
 * تتطلب تحديد شركة وسنة مالية، وتعرض منتقياً سريعاً للعملاء وشريطاً ثابتاً أعلى الشاشة
 */
export const CLIENT_SCOPED_TABS: readonly NavigationTab[] = [
  // دليل الحسابات، القيود، الأستاذ، ميزان المراجعة، ربط الحسابات
  'ACCOUNTING_HUB',
  'CHART_OF_ACCOUNTS',
  'JOURNAL_ENTRIES',
  'GENERAL_LEDGER',
  'TRIAL_BALANCE',
  'ACCOUNT_MAPPING',
  // الأصول الثابتة والإهلاكات
  'FIXED_ASSETS',
  // أوراق العمل، فحص ملفات الإكسيل، التسويات البنكية
  'FILE_REVIEW',
  'AUDIT_WORKING_PAPERS',
  'BANK_RECONCILIATION',
  'OCR_INVOICE_SCANNER',
  // القوائم المالية، تقرير المراقب، الإيضاحات، الملف المالي السنوي
  'FINANCIAL_REPORTING_HUB',
  'FINANCIAL_STATEMENTS',
  'ANNUAL_FINANCIAL_DOSSIER',
  'FINANCIAL_DOSSIER_GENERATOR',
  'FINANCIAL_NOTES',
  'AUDITOR_REPORT',
  'FINANCIAL_SIMULATOR',
  'FEASIBILITY_STUDY',
  // الإقفال السنوي
  'YEAR_END_CLOSING',
  // أدوات المراجعة والفحص
  'AUDIT_TOOLS_HUB',
  'EXCEL_AUDIT_SENTINEL',
  'FRAUD_AUDIT_SENTINEL',
  'JOURNAL_AUDIT_SCANNER',
  'AUDIT_CONSISTENCY_SENTINEL',
  // الائتمان والتخطيط المالي والجمارك
  'CREDIT_HUB',
  'CREDIT_SIMULATOR',
  'QUICK_BANK_DOSSIER',
  'CREDIT_DOSSIER_REGISTRY',
  'FINANCIAL_PLANNING_HUB',
  'BUDGET_PLANNER',
  'BUDGET_AND_CASHFLOW',
  'CASH_FLOW_PREDICTOR',
  'CUSTOMS_HUB',
  'CUSTOMS_SHIPMENTS',
  'CUSTOMS_LANDED_COST',
  'CUSTOMS_NAFEZA_ACI',
] as const;

const CROSS_CLIENT_SET = new Set<string>(CROSS_CLIENT_TABS);
const CLIENT_SCOPED_SET = new Set<string>(CLIENT_SCOPED_TABS);

export function isCrossClientTab(tab: NavigationTab | string, parentHub?: string): boolean {
  if (CROSS_CLIENT_SET.has(tab)) return true;
  if (
    parentHub === 'TAX_AUDIT_HUB' ||
    parentHub === 'OFFICE_HUB' ||
    parentHub === 'AUDIT_SECURITY_HUB' ||
    parentHub === 'INVOICING'
  ) {
    return true;
  }
  return false;
}

export function isClientScopedTab(tab: NavigationTab | string, parentHub?: string): boolean {
  if (isCrossClientTab(tab, parentHub)) return false;
  if (CLIENT_SCOPED_SET.has(tab)) return true;
  return true;
}

/**
 * دالة موحدة لجلب العملاء المسموح للمستخدم برؤيتهم وفقاً لـ permittedClientIds والدور الوظيفي
 * تُستخدم في كافة القوائم والأشرطة والفلاتر والبحث السريع (GlobalSearchBar)
 */
export function getVisibleClients(
  state: Pick<DatabaseState, 'clients' | 'users' | 'currentUserId'>,
  user?: SystemUser | null
): ClientArchiveRecord[] {
  const allClients = Array.isArray(state?.clients) ? state.clients : [];
  const effectiveUser =
    user !== undefined
      ? user
      : state?.users?.find((u) => u.id === state.currentUserId) || null;

  if (!effectiveUser) {
    return allClients;
  }

  if (effectiveUser.role === 'PENDING' || effectiveUser.isActive === false) {
    return [];
  }

  if (Array.isArray(effectiveUser.permittedClientIds)) {
    if (effectiveUser.role !== 'ADMIN' || effectiveUser.permittedClientIds.length > 0) {
      const allowedSet = new Set(effectiveUser.permittedClientIds);
      return allClients.filter((c) => allowedSet.has(c.id));
    }
  }

  return allClients;
}

export type TaxSubjectKind = 'VAT' | 'INCOME' | 'WHT' | 'STAMP' | 'PAYROLL';

/**
 * التحقق مما إذا كانت الشركة خاضعة لنوع ضريبة معين بناءً على إعدادات ملف العميل
 */
export function isClientSubjectToTax(
  client: ClientArchiveRecord,
  taxKind: TaxSubjectKind | 'ALL'
): boolean {
  if (!client) return false;
  if (taxKind === 'ALL') return true;

  switch (taxKind) {
    case 'VAT':
      return Boolean(client.isVatSubject ?? client.isVatRegistered ?? false);
    case 'INCOME':
      // ضريبة الدخل خاضعة افتراضياً ما لم يتم إلغاء تفعيلها صراحة في ملف العميل
      return client.isIncomeTaxSubject !== undefined ? Boolean(client.isIncomeTaxSubject) : true;
    case 'WHT':
      return Boolean(client.isWhtSubject ?? client.isWithholdingTaxSubject ?? false);
    case 'STAMP':
      return Boolean(client.isStampTaxSubject ?? false);
    case 'PAYROLL':
      return Boolean(client.hasPayroll ?? client.isPayrollTaxSubject ?? false);
    default:
      return true;
  }
}
