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
 * القاعدة: الافتراضي المنع.
 * - إذا لم يوجد مستخدم حالي تُرجع []
 * - المستخدم غير الأدمن بدون permittedClientIds معرّفة (أو فارغة) يرى [] (لا الكل)
 * - الأدمن فقط يرى كل العملاء عند غياب التقييد
 */
export function getVisibleClients(
  state: Pick<DatabaseState, 'clients' | 'users' | 'currentUserId'>,
  user?: SystemUser | null
): ClientArchiveRecord[] {
  const allClients = Array.isArray(state?.clients) ? state.clients : [];
  const effectiveUser =
    user !== undefined
      ? user
      : state?.currentUserId
      ? state?.users?.find((u) => u.id === state.currentUserId) || null
      : null;

  // 1. إذا لم يوجد مستخدم حالي رجّع []
  if (!effectiveUser) {
    return [];
  }

  if (effectiveUser.role === 'PENDING' || effectiveUser.isActive === false) {
    return [];
  }

  const hasPermittedList =
    Array.isArray(effectiveUser.permittedClientIds) &&
    effectiveUser.permittedClientIds.length > 0;

  // 2. الأدمن فقط يرى كل العملاء عند غياب التقييد
  if (effectiveUser.role === 'ADMIN') {
    if (!hasPermittedList) {
      return allClients;
    }
    const allowedSet = new Set(effectiveUser.permittedClientIds);
    return allClients.filter((c) => allowedSet.has(c.id));
  }

  // 3. المستخدم غير الأدمن بدون permittedClientIds معرّفة يرى [] (لا الكل)
  if (!hasPermittedList) {
    return [];
  }

  // 4. المستخدم غير الأدمن مع permittedClientIds معرّفة يرى العملاء المصرح بهم فقط
  const allowedSet = new Set(effectiveUser.permittedClientIds);
  return allClients.filter((c) => allowedSet.has(c.id));
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

/**
 * التحقق مما إذا كان العميل لم تُحدَّد له علامات الخضوع الضريبي بعد
 */
export function isClientTaxSubjectUnspecified(client: ClientArchiveRecord): boolean {
  if (!client) return false;
  if (client.taxSubjectConfigured === true) return false;

  const hasUndefinedFlags =
    client.isVatSubject === undefined ||
    client.isWhtSubject === undefined ||
    client.isStampTaxSubject === undefined ||
    client.hasPayroll === undefined;

  const hasAnyExplicitOptionalTax = Boolean(
    client.isVatSubject ||
      client.isVatRegistered ||
      client.isWhtSubject ||
      client.isWithholdingTaxSubject ||
      client.isStampTaxSubject ||
      client.hasPayroll ||
      client.isPayrollTaxSubject
  );

  return hasUndefinedFlags || !hasAnyExplicitOptionalTax;
}

export interface TaxSubjectMigrationResult {
  migratedCount: number;
  updatedClientIds: string[];
  alreadyDone: boolean;
}

/**
 * ترحيل لمرة واحدة عند تحميل الحالة (مع علم migrationDone لعدم التكرار):
 * لكل عميل لم تُحدَّد له علامات الخضوع، يفعّل تلقائيًا:
 * - isWhtSubject إذا وُجدت له فواتير بخصم وإضافة أو إقرارات خصم.
 * - isStampTaxSubject إذا وُجدت إقرارات دمغة.
 * - hasPayroll إذا وُجدت له بيانات مرتبات.
 * - isVatSubject إذا وُجدت فواتير بضريبة قيمة مضافة أو إقرارات قيمة مضافة.
 */
export function migrateClientTaxSubjectFlagsOnce(
  state: Partial<DatabaseState> & {
    migrationDone?: boolean;
    lastTaxSubjectMigrationCount?: number;
    taxSubjectMigrationNotificationPending?: boolean;
  }
): TaxSubjectMigrationResult {
  if (!state || state.migrationDone === true) {
    return {
      migratedCount: 0,
      updatedClientIds: [],
      alreadyDone: true,
    };
  }

  const clients = Array.isArray(state.clients) ? state.clients : [];
  const invoices = Array.isArray(state.invoices) ? state.invoices : [];
  const declarations = Array.isArray(state.taxDeclarations) ? state.taxDeclarations : [];
  const journalEntries = Array.isArray(state.journalEntries) ? state.journalEntries : [];
  const rawPayrollRecords: any[] = Array.isArray((state as any).payrollRecords)
    ? (state as any).payrollRecords
    : Array.isArray((state as any).employees)
    ? (state as any).employees
    : Array.isArray((state as any).payrollRuns)
    ? (state as any).payrollRuns
    : [];

  const updatedClientIds: string[] = [];

  for (const client of clients) {
    if (!client || client.taxSubjectConfigured === true) {
      continue;
    }

    const clientInvoices = invoices.filter((inv) => inv && inv.clientId === client.id);
    const clientDeclarations = declarations.filter(
      (d) =>
        d &&
        (d.clientId === client.id ||
          (client.taxId && d.taxId === client.taxId) ||
          (client.taxCardNo && d.taxId === client.taxCardNo) ||
          (client.name && d.clientName === client.name))
    );

    let clientUpdated = false;

    // 1. isWhtSubject: فواتير بخصم وإضافة أو إقرارات خصم
    if (client.isWhtSubject === undefined || !client.isWhtSubject) {
      const hasWhtInvoice = clientInvoices.some(
        (inv) =>
          Number(inv.totalWht) > 0 ||
          (Array.isArray(inv.items) &&
            inv.items.some((it) => Number(it?.whtAmount) > 0 || Number(it?.whtRate) > 0))
      );
      const hasWhtDecl = clientDeclarations.some((d) => {
        const dtype = String(d.declarationType || '').toUpperCase();
        return (
          dtype === 'WHT_41' ||
          dtype === 'WHT_QUARTERLY_41' ||
          dtype.includes('WHT') ||
          Number(d.whtDeductedAmount) > 0 ||
          Number(d.whtDeductions) > 0
        );
      });

      if (hasWhtInvoice || hasWhtDecl) {
        if (!client.isWhtSubject) {
          client.isWhtSubject = true;
          client.isWithholdingTaxSubject = true;
          clientUpdated = true;
        }
      }
    }

    // 2. isStampTaxSubject: إقرارات دمغة
    if (client.isStampTaxSubject === undefined || !client.isStampTaxSubject) {
      const hasStampDecl = clientDeclarations.some((d) => {
        const dtype = String(d.declarationType || '').toUpperCase();
        return dtype === 'STAMP_TAX' || dtype.includes('STAMP');
      });

      if (hasStampDecl) {
        if (!client.isStampTaxSubject) {
          client.isStampTaxSubject = true;
          clientUpdated = true;
        }
      }
    }

    // 3. hasPayroll: بيانات مرتبات (إقرارات مرتبات أو سجلات مرتبات أو قيود مرتبات أو بيانات بوابة كسب العمل)
    if (client.hasPayroll === undefined || !client.hasPayroll) {
      const hasPayrollDecl = clientDeclarations.some((d) => {
        const dtype = String(d.declarationType || '').toUpperCase();
        return (
          dtype === 'PAYROLL_4' ||
          dtype === 'PAYROLL_QUARTERLY_4' ||
          dtype.includes('PAYROLL')
        );
      });
      const hasPayrollRecord = rawPayrollRecords.some(
        (r) => r && (r.clientId === client.id || r.companyId === client.id)
      );
      const hasPayrollCreds = Boolean(client.portalCredentials?.etaPayrollTax?.username);
      const hasPayrollJournals = journalEntries.some(
        (je) =>
          je &&
          je.clientId === client.id &&
          (String((je as any).sourceType || '').toUpperCase().includes('PAYROLL') ||
            /مرتبات|أجور|كسب عمل/i.test(String(je.description || '')))
      );

      if (hasPayrollDecl || hasPayrollRecord || hasPayrollCreds || hasPayrollJournals) {
        if (!client.hasPayroll) {
          client.hasPayroll = true;
          client.isPayrollTaxSubject = true;
          clientUpdated = true;
        }
      }
    }

    // 4. isVatSubject: فواتير بضريبة قيمة مضافة أو إقرارات قيمة مضافة
    if (client.isVatSubject === undefined || !client.isVatSubject) {
      const hasVatInvoice = clientInvoices.some(
        (inv) =>
          Number(inv.totalVat) > 0 ||
          Number(inv.totalTableTax) > 0 ||
          (Array.isArray(inv.items) &&
            inv.items.some(
              (it) =>
                Number(it?.vatAmount) > 0 ||
                Number(it?.vatRate) > 0 ||
                Number(it?.tableTaxAmount) > 0
            ))
      );
      const hasVatDecl = clientDeclarations.some((d) => {
        const dtype = String(d.declarationType || '').toUpperCase();
        return (
          dtype === 'VAT_10' ||
          dtype === 'VAT_MONTHLY_10' ||
          dtype.includes('VAT') ||
          Number(d.outputTaxAmount) > 0 ||
          Number(d.inputTaxDeductible) > 0
        );
      });

      if (hasVatInvoice || hasVatDecl) {
        if (!client.isVatSubject) {
          client.isVatSubject = true;
          client.isVatRegistered = true;
          clientUpdated = true;
        }
      }
    }

    if (clientUpdated) {
      updatedClientIds.push(client.id);
    }
  }

  state.migrationDone = true;
  state.lastTaxSubjectMigrationCount = updatedClientIds.length;
  state.taxSubjectMigrationNotificationPending = true;

  return {
    migratedCount: updatedClientIds.length,
    updatedClientIds,
    alreadyDone: false,
  };
}
