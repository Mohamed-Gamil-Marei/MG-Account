import { describe, it, expect } from 'vitest';
import {
  getVisibleClients,
  migrateClientTaxSubjectFlagsOnce,
  isClientTaxSubjectUnspecified,
} from '../screenScope';
import { ClientArchiveRecord, SystemUser } from '../../types';

const sampleClients: ClientArchiveRecord[] = [
  { id: 'c1', code: 'CL-001', name: 'شركة النيل للصناعات', taxId: '100-200-300', commercialRegister: '111' },
  { id: 'c2', code: 'CL-002', name: 'شركة الأهرام للتجارة', taxId: '400-500-600', commercialRegister: '222' },
  { id: 'c3', code: 'CL-003', name: 'شركة الدلتا للمقاولات', taxId: '700-800-900', commercialRegister: '333' },
];

const baseUserProps = {
  roleTitleArabic: 'محاسب',
  canAccessTreasury: false,
  canAccessAuditTrail: false,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('getVisibleClients - Default Deny & 4 Core Access Cases', () => {
  it('1) يرجع [] إذا لم يوجد مستخدم حالي (Default Deny when no current user)', () => {
    const stateNoUser = {
      clients: sampleClients,
      users: [],
      currentUserId: '',
    };
    expect(getVisibleClients(stateNoUser, null)).toEqual([]);
    expect(getVisibleClients(stateNoUser, undefined)).toEqual([]);
  });

  it('2) المستخدم غير الأدمن بدون permittedClientIds معرّفة (أو فارغة) يرى [] (لا الكل)', () => {
    const accountantWithoutList: SystemUser = {
      ...baseUserProps,
      id: 'u-acc-1',
      name: 'محاسب بدون تقييد محدد',
      email: 'acc1@office.eg',
      role: 'ACCOUNTANT',
      isActive: true,
    };
    const accountantWithEmptyList: SystemUser = {
      ...baseUserProps,
      id: 'u-acc-2',
      name: 'محاسب بقائمة فارغة',
      email: 'acc2@office.eg',
      role: 'SENIOR_AUDITOR',
      isActive: true,
      permittedClientIds: [],
    };
    const state = {
      clients: sampleClients,
      users: [accountantWithoutList, accountantWithEmptyList],
      currentUserId: accountantWithoutList.id,
    };

    expect(getVisibleClients(state, accountantWithoutList)).toEqual([]);
    expect(getVisibleClients(state, accountantWithEmptyList)).toEqual([]);
  });

  it('3) المستخدم غير الأدمن مع permittedClientIds معرّفة يرى العملاء المصرح بهم فقط', () => {
    const accountantRestricted: SystemUser = {
      ...baseUserProps,
      id: 'u-acc-3',
      name: 'محاسب مخصص لعميلين',
      email: 'acc3@office.eg',
      role: 'ACCOUNTANT',
      isActive: true,
      permittedClientIds: ['c1', 'c3'],
    };
    const state = {
      clients: sampleClients,
      users: [accountantRestricted],
      currentUserId: accountantRestricted.id,
    };

    const visible = getVisibleClients(state, accountantRestricted);
    expect(visible.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('4) الأدمن فقط يرى كل العملاء عند غياب التقييد، ويحترم التقييد عند تحديده', () => {
    const adminUnrestricted: SystemUser = {
      ...baseUserProps,
      id: 'u-admin-1',
      name: 'مدير النظام',
      email: 'admin@office.eg',
      role: 'ADMIN',
      isActive: true,
    };
    const adminRestricted: SystemUser = {
      ...baseUserProps,
      id: 'u-admin-2',
      name: 'مدير مقيد',
      email: 'admin2@office.eg',
      role: 'ADMIN',
      isActive: true,
      permittedClientIds: ['c2'],
    };
    const state = {
      clients: sampleClients,
      users: [adminUnrestricted, adminRestricted],
      currentUserId: adminUnrestricted.id,
    };

    expect(getVisibleClients(state, adminUnrestricted).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(getVisibleClients(state, adminRestricted).map((c) => c.id)).toEqual(['c2']);
  });
});

describe('migrateClientTaxSubjectFlagsOnce - ترحيل علامات الخضوع لمرة واحدة', () => {
  it('يفعّل علامات الخضوع تلقائيًا من الفواتير والإقرارات والمرتبات ولا يتكرر عند وجود migrationDone', () => {
    const mockState: any = {
      clients: [
        { id: 'c1', code: 'C1', name: 'شركة 1', taxId: '1', commercialRegister: '1' },
        { id: 'c2', code: 'C2', name: 'شركة 2', taxId: '2', commercialRegister: '2' },
        { id: 'c3', code: 'C3', name: 'شركة 3 بدون حركات', taxId: '3', commercialRegister: '3' },
      ],
      invoices: [
        {
          id: 'inv-1',
          clientId: 'c1',
          totalVat: 1400,
          totalWht: 100,
          items: [],
        },
      ],
      taxDeclarations: [
        {
          id: 'decl-1',
          clientId: 'c2',
          declarationType: 'STAMP_TAX',
        },
        {
          id: 'decl-2',
          clientId: 'c2',
          declarationType: 'PAYROLL_QUARTERLY_4',
        },
      ],
      journalEntries: [],
    };

    expect(isClientTaxSubjectUnspecified(mockState.clients[2])).toBe(true);

    const firstRun = migrateClientTaxSubjectFlagsOnce(mockState);
    expect(firstRun.alreadyDone).toBe(false);
    expect(firstRun.migratedCount).toBe(2);
    expect(mockState.migrationDone).toBe(true);
    expect(mockState.clients[0].isVatSubject).toBe(true);
    expect(mockState.clients[0].isWhtSubject).toBe(true);
    expect(mockState.clients[1].isStampTaxSubject).toBe(true);
    expect(mockState.clients[1].hasPayroll).toBe(true);

    // محاولة تشغيل ثانية لا تتكرر بسبب migrationDone
    mockState.clients[2].isVatSubject = false;
    mockState.invoices.push({ id: 'inv-2', clientId: 'c3', totalVat: 500, totalWht: 0, items: [] });
    const secondRun = migrateClientTaxSubjectFlagsOnce(mockState);
    expect(secondRun.alreadyDone).toBe(true);
    expect(secondRun.migratedCount).toBe(0);
    expect(mockState.clients[2].isVatSubject).toBe(false);
  });
});
