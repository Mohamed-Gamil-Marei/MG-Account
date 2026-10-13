import { describe, it, expect } from 'vitest';
import { checkEntityAccess } from './access';

interface MockServerRecord {
  id: string;
  data: any;
  version: number;
}

class MockServerDatabase {
  private records: Map<string, MockServerRecord> = new Map();

  public saveRecord(id: string, data: any, version?: number): { success: boolean; version?: number; error?: string; status: number } {
    const existing = this.records.get(id);
    if (existing) {
      if (version === undefined || version !== existing.version) {
        return {
          success: false,
          error: 'تعارض إصدار (Version Conflict): تم تعديل هذا السجل من قبل مستخدم آخر.',
          status: 409,
        };
      }
      const newVersion = existing.version + 1;
      const updated = { id, data, version: newVersion };
      this.records.set(id, updated);
      return { success: true, version: newVersion, status: 200 };
    } else {
      const newVersion = 1;
      const created = { id, data, version: newVersion };
      this.records.set(id, created);
      return { success: true, version: newVersion, status: 200 };
    }
  }

  public getRecord(id: string): MockServerRecord | undefined {
    return this.records.get(id);
  }
}

describe('Client-Server Compatibility & Security Tests', () => {
  const secretaryUser = { id: 'sec-1', name: 'سكرتير المكتب', role: 'SECRETARY' };
  const accountantUser = { id: 'acc-1', name: 'المحاسب المسؤول', role: 'ACCOUNTANT' };
  const adminUser = { id: 'adm-1', name: 'المدير العام', role: 'ADMIN' };

  it('1. تعديل نفس السجل 3 مرات متتالية بنجاح مع زيادة رقم الإصدار (Version Increment)', () => {
    const db = new MockServerDatabase();
    const recordId = 'client-101';

    // 1st Save (Creation - version 1)
    const res1 = db.saveRecord(recordId, { name: 'شركة القاهرة للمقاولات v1' }, 1);
    expect(res1.success).toBe(true);
    expect(res1.version).toBe(1);

    // 2nd Save (1st Update - passing version 1 -> receives version 2)
    const res2 = db.saveRecord(recordId, { name: 'شركة القاهرة للمقاولات v2' }, 1);
    expect(res2.success).toBe(true);
    expect(res2.version).toBe(2);

    // 3rd Save (2nd Update - passing version 2 -> receives version 3)
    const res3 = db.saveRecord(recordId, { name: 'شركة القاهرة للمقاولات v3' }, 2);
    expect(res3.success).toBe(true);
    expect(res3.version).toBe(3);

    expect(db.getRecord(recordId)?.version).toBe(3);
  });

  it('2. تعديل سجل من نسخة قديمة يرجع خطأ تعارض الإصدار (409 Version Conflict)', () => {
    const db = new MockServerDatabase();
    const recordId = 'entry-505';

    // Initial save (Version 1)
    db.saveRecord(recordId, { amount: 1000 }, 1);

    // User A updates record to Version 2
    const userASave = db.saveRecord(recordId, { amount: 1500 }, 1);
    expect(userASave.success).toBe(true);
    expect(userASave.version).toBe(2);

    // User B tries to update using outdated Version 1 (Conflict!)
    const userBSave = db.saveRecord(recordId, { amount: 2000 }, 1);
    expect(userBSave.success).toBe(false);
    expect(userBSave.status).toBe(409);
    expect(userBSave.error).toContain('تعارض إصدار');
  });

  it('3. السكرتير لا يقدر يكتب أو يجري تعديلات على accounts (المرجع 403 Forbidden)', () => {
    const canWriteAccounts = checkEntityAccess(secretaryUser, 'accounts', 'WRITE');
    expect(canWriteAccounts).toBe(false);

    // Verify accountant and admin CAN write to accounts
    expect(checkEntityAccess(accountantUser, 'accounts', 'WRITE')).toBe(true);
    expect(checkEntityAccess(adminUser, 'accounts', 'WRITE')).toBe(true);
  });

  it('4. تفضيلات المحاسب الشخصية (preferences) تتحفظ بنجاح لأي دور مسجل', () => {
    const canAccountantWritePrefs = checkEntityAccess(accountantUser, 'preferences', 'WRITE');
    const canSecretaryWritePrefs = checkEntityAccess(secretaryUser, 'preferences', 'WRITE');
    const canAdminWritePrefs = checkEntityAccess(adminUser, 'preferences', 'WRITE');

    expect(canAccountantWritePrefs).toBe(true);
    expect(canSecretaryWritePrefs).toBe(true);
    expect(canAdminWritePrefs).toBe(true);
  });
});
