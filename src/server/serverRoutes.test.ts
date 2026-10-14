import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import type { Express } from 'express';
import Database from 'better-sqlite3';

const TEST_PURGE_MASTER = 'PURGE_MASTER_TEST_SECRET_KEY_1234';
const TEST_CREDENTIALS_KEY = 'TEST_CREDENTIALS_KEY_32_CHARS_LONG_OK_1234';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Real Server HTTP Route Tests (src/server/serverRoutes.test.ts)', () => {
  let app: Express;
  let db: Database.Database;
  let testDbPath: string;

  // Raw session tokens for each user role
  const adminToken = 'admin-raw-session-token-secret-xyz';
  const accountantToken = 'accountant-raw-session-token-secret-xyz';
  const auditorToken = 'auditor-raw-session-token-secret-xyz';
  const secretaryToken = 'secretary-raw-session-token-secret-xyz';
  const pendingToken = 'pending-raw-session-token-secret-xyz';

  beforeAll(async () => {
    // 1. Configure test environment variables before createApp initializes
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_PURGE_MASTER = TEST_PURGE_MASTER;
    process.env.CREDENTIALS_KEY = TEST_CREDENTIALS_KEY;
    testDbPath = path.join(os.tmpdir(), `test_mg_account_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    // 2. Import createApp dynamically after env vars are set
    const { createApp } = await import('../../server');
    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    // 3. Seed test users in SQLite database
    const users = [
      { id: 1, name: 'Admin User', email: 'admin@test.local', role: 'ADMIN', canPost: 1, canEditPosted: 1, canDelete: 1, token: adminToken },
      { id: 2, name: 'Accountant User', email: 'accountant@test.local', role: 'ACCOUNTANT', canPost: 1, canEditPosted: 1, canDelete: 1, token: accountantToken },
      { id: 3, name: 'Auditor User', email: 'auditor@test.local', role: 'AUDITOR', canPost: 0, canEditPosted: 0, canDelete: 0, token: auditorToken },
      { id: 4, name: 'Secretary User', email: 'secretary@test.local', role: 'SECRETARY', canPost: 0, canEditPosted: 0, canDelete: 0, token: secretaryToken },
      { id: 5, name: 'Pending User', email: 'pending@test.local', role: 'PENDING', canPost: 0, canEditPosted: 0, canDelete: 0, token: pendingToken },
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, created_at)
      VALUES (?, ?, ?, 'dummy_hash', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `);

    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const u of users) {
      insertUser.run(u.id, u.name, u.email, u.role, u.role === 'ADMIN' ? 1 : 0, 1, 1, u.canPost, u.canEditPosted, u.canDelete, 1, 1);
      insertSession.run(hashToken(u.token), u.id, farFuture);
    }
  });

  afterAll(() => {
    try {
      if (db) db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  // =========================================================================
  // (أ) قيد غير متزن يترفض والـ GET يثبت إنه ماتحفظش
  // =========================================================================
  describe('(أ) رفض القيد المحاسبي غير المتزن والتحقق من عدم حفظه', () => {
    it('يرفض السيرفر حفظ قيد غير متزن (الفارق > 0.005) ويعيد خطأ 400، و GET يثبت عدم حفظه', async () => {
      const imbalancedEntryId = 'je-test-imbalanced-001';
      const imbalancedPayload = {
        id: imbalancedEntryId,
        data: {
          id: imbalancedEntryId,
          date: '2025-05-10',
          description: 'قيد رواتب غير متزن لاختبار الرفض',
          lines: [
            { id: 'l1', accountCode: '101', debit: 5000, credit: 0 },
            { id: 'l2', accountCode: '102', debit: 0, credit: 4200 }, // الفارق 800 > 0.005
          ],
        },
      };

      // 1. Post imbalanced entry with accountant session
      const postRes = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send(imbalancedPayload);

      expect(postRes.status).toBe(400);
      expect(postRes.body.success).toBe(false);
      expect(postRes.body.error).toMatch(/القيد غير متزن/);

      // 2. Query GET to prove the imbalanced entry was NEVER saved in database
      const getRes = await request(app)
        .get('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);

      const savedEntries = getRes.body.data || [];
      const found = savedEntries.some((e: any) => e.id === imbalancedEntryId);
      expect(found).toBe(false);
    });

    it('يقبل قيداً متزناً بتاريخ في سنة غير مقفولة (مثل 2027) برمز نجاح، و GET يثبت حفظه', async () => {
      const balancedEntryId = 'je-test-balanced-2027';
      const balancedPayload = {
        id: balancedEntryId,
        data: {
          id: balancedEntryId,
          date: '2027-08-15',
          description: 'قيد رواتب متزن في سنة مالية مفتوحة 2027',
          lines: [
            { id: 'l1', accountCode: '101', debit: 6000, credit: 0 },
            { id: 'l2', accountCode: '102', debit: 0, credit: 6000 },
          ],
        },
      };

      const postRes = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send(balancedPayload);

      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);

      const getRes = await request(app)
        .get('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);

      const savedEntries = getRes.body.data || [];
      const found = savedEntries.some((e: any) => e.id === balancedEntryId);
      expect(found).toBe(true);
    });
  });

  // =========================================================================
  // (ب) إضافة وتعديل وحذف وإلغاء ترحيل في فترة مقفولة تترفض
  // =========================================================================
  describe('(ب) رفض الإضافة والتعديل والحذف وإلغاء الترحيل في فترة مقفولة', () => {
    beforeAll(() => {
      // قفل السنة المالية 2026 في جدول fiscalPeriodLocks
      const lockData = {
        id: 'lock-fiscal-2026',
        fiscalYear: 2026,
        period: 'ANNUAL',
        isLocked: true,
        lockedBy: 'مدير النظام',
        lockedAt: '2026-01-01T00:00:00Z',
      };
      db.prepare(`
        INSERT OR REPLACE INTO fiscalPeriodLocks (id, data, updated_at, version, updated_by)
        VALUES (?, ?, datetime('now'), 1, 'admin')
      `).run('lock-fiscal-2026', JSON.stringify(lockData));
    });

    it('يرفض إضافة قيد جديد في فترة مقفولة (2026)', async () => {
      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: 'je-locked-add-test',
          data: {
            id: 'je-locked-add-test',
            date: '2026-04-15',
            description: 'محاولة إضافة قيد في سنة مقفولة',
            lines: [
              { id: '1', accountCode: '101', debit: 1000, credit: 0 },
              { id: '2', accountCode: '102', debit: 0, credit: 1000 },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/مقفولة/);
    });

    it('يرفض تعديل قيد في فترة مقفولة (2026)', async () => {
      // إدراج قيد مسبق في 2026 بقاعدة البيانات
      const existingEntry = {
        id: 'je-locked-edit-test',
        date: '2026-02-10',
        description: 'قيد قديم في سنة 2026',
        status: 'DRAFT',
        lines: [
          { id: '1', accountCode: '101', debit: 2000, credit: 0 },
          { id: '2', accountCode: '102', debit: 0, credit: 2000 },
        ],
      };
      db.prepare(`
        INSERT OR REPLACE INTO journalEntries (id, data, updated_at, version, updated_by)
        VALUES (?, ?, datetime('now'), 1, 'admin')
      `).run(existingEntry.id, JSON.stringify(existingEntry));

      // محاولة تعديله عبر الـ API
      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: existingEntry.id,
          data: {
            ...existingEntry,
            description: 'محاولة تعديل قيد داخل فترة مقفولة',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/مقفولة/);
    });

    it('يرفض إلغاء ترحيل قيد في فترة مقفولة (2026)', async () => {
      // إدراج قيد مرحل POSTED في سنة 2026
      const postedEntry = {
        id: 'je-locked-unpost-test',
        date: '2026-03-20',
        description: 'قيد مرحل في سنة 2026',
        status: 'POSTED',
        isPosted: true,
        lines: [
          { id: '1', accountCode: '101', debit: 3000, credit: 0 },
          { id: '2', accountCode: '102', debit: 0, credit: 3000 },
        ],
      };
      db.prepare(`
        INSERT OR REPLACE INTO journalEntries (id, data, updated_at, version, updated_by)
        VALUES (?, ?, datetime('now'), 1, 'admin')
      `).run(postedEntry.id, JSON.stringify(postedEntry));

      // محاولة إلغاء الترحيل بتحويله إلى مسودة DRAFT
      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: postedEntry.id,
          data: {
            ...postedEntry,
            status: 'DRAFT',
            isPosted: false,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/مقفولة/);
    });

    it('يرفض حذف قيد في فترة مقفولة (2026)', async () => {
      // إدراج قيد للحذف في 2026
      const entryToDelete = {
        id: 'je-locked-delete-test',
        date: '2026-05-01',
        description: 'قيد يراد حذفه في سنة 2026',
        lines: [
          { id: '1', accountCode: '101', debit: 4000, credit: 0 },
          { id: '2', accountCode: '102', debit: 0, credit: 4000 },
        ],
      };
      db.prepare(`
        INSERT OR REPLACE INTO journalEntries (id, data, updated_at, version, updated_by)
        VALUES (?, ?, datetime('now'), 1, 'admin')
      `).run(entryToDelete.id, JSON.stringify(entryToDelete));

      // محاولة الحذف
      const res = await request(app)
        .delete(`/api/data/journalEntries/${entryToDelete.id}`)
        .set('Cookie', [`session_token=${accountantToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/مقفولة/);

      // التأكد أن القيد لم يُحذف من قاعدة البيانات
      const row = db.prepare('SELECT id FROM journalEntries WHERE id = ?').get(entryToDelete.id);
      expect(row).toBeDefined();
    });
  });

  // =========================================================================
  // (ج) reset-production بدون الكلمة أو بكلمة غلط يرجع خطأ والبيانات و auditLogs فاضلة
  // =========================================================================
  describe('(ج) حماية مسار reset-production والحفاظ على البيانات وسجلات التدقيق', () => {
    beforeAll(() => {
      // وضع بيانات أولية للعملاء وسجلات تدقيق
      db.prepare(`
        INSERT OR REPLACE INTO clients (id, data, updated_at, version, updated_by)
        VALUES ('client-safe-1', '{"name":"شركة الأمل للتجارة"}', datetime('now'), 1, 'admin')
      `).run();

      db.prepare(`
        INSERT OR REPLACE INTO auditLogs (id, data, updated_at, version, updated_by)
        VALUES ('audit-safe-1', '{"action":"SECURITY_EVENT","details":"سجل تدقيق آمن لا يحذف"}', datetime('now'), 1, 'admin')
      `).run();
    });

    it('يرفض الطلب إذا كانت كلمة التأكيد غير "تفريغ" ويعيد 400 والبيانات تظل سليمة', async () => {
      const res = await request(app)
        .post('/api/admin/reset-production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmationText: 'كلمة_أخرى_غير_تفريغ',
          passcode: TEST_PURGE_MASTER,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/تفريغ/);

      // التحقق من بقاء بيانات العملاء وسجلات التدقيق
      const clientRow = db.prepare('SELECT id FROM clients WHERE id = ?').get('client-safe-1');
      const auditRow = db.prepare('SELECT id FROM auditLogs WHERE id = ?').get('audit-safe-1');
      expect(clientRow).toBeDefined();
      expect(auditRow).toBeDefined();
    });

    it('يرفض الطلب إذا كانت كلمة المرور السرية خاطئة ويعيد 400 والبيانات تظل سليمة', async () => {
      const res = await request(app)
        .post('/api/admin/reset-production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmationText: 'تفريغ',
          passcode: 'WRONG_PASSWORD_INCORRECT_SECRET',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/غير صحيحة/);

      // التحقق من بقاء بيانات العملاء وسجلات التدقيق
      const clientRow = db.prepare('SELECT id FROM clients WHERE id = ?').get('client-safe-1');
      const auditRow = db.prepare('SELECT id FROM auditLogs WHERE id = ?').get('audit-safe-1');
      expect(clientRow).toBeDefined();
      expect(auditRow).toBeDefined();
    });

    it('يقبل الطلب بكلمة المرور الصحيحة وتأكيد "تفريغ"، ويفرغ جداول البيانات مع الإبقاء على سجلات auditLogs', async () => {
      // التأكد من وجود سجلات عملاء قبل التفريغ
      db.prepare(`
        INSERT OR REPLACE INTO clients (id, data, updated_at, version, updated_by)
        VALUES ('client-to-purge-1', '{"name":"عميل تجريبي للتفريغ"}', datetime('now'), 1, 'admin')
      `).run();

      const res = await request(app)
        .post('/api/admin/reset-production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmationText: 'تفريغ',
          passcode: TEST_PURGE_MASTER,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // جداول البيانات تتفرّغ (جدول clients فارغ)
      const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
      expect(clientCount.count).toBe(0);

      // جدول auditLogs يفضل فيه السجل اللي كان موجود قبل التفريغ
      const auditRow = db.prepare('SELECT id FROM auditLogs WHERE id = ?').get('audit-safe-1');
      expect(auditRow).toBeDefined();
    });
  });

  // =========================================================================
  // (د) مسارات مصلحة الضرائب ETA:
  // /api/eta/token و /documents/submit لـ ADMIN و ACCOUNTANT فقط
  // /api/eta/config و /logs للمدير فقط، و 403 للباقي
  // =========================================================================
  describe('(د) مصفوفة صلاحيات مسارات منظومة الضرائب المصرية ETA', () => {
    // 1. /api/eta/token
    describe('مسار طلب التوكن /api/eta/token', () => {
      it('يسمح لـ ADMIN و ACCOUNTANT (لا يعيد 403 Forbidden)', async () => {
        const adminRes = await request(app)
          .post('/api/eta/token')
          .set('Cookie', [`session_token=${adminToken}`])
          .send({});
        expect(adminRes.status).not.toBe(403);

        const accountantRes = await request(app)
          .post('/api/eta/token')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({});
        expect(accountantRes.status).not.toBe(403);
      });

      it('يرفض AUDITOR و SECRETARY و PENDING بـ 403 Forbidden', async () => {
        for (const token of [auditorToken, secretaryToken, pendingToken]) {
          const res = await request(app)
            .post('/api/eta/token')
            .set('Cookie', [`session_token=${token}`])
            .send({});
          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        }
      });
    });

    // 2. /api/eta/documents/submit
    describe('مسار إرسال الفاتورة /api/eta/documents/submit', () => {
      it('يسمح لـ ADMIN و ACCOUNTANT (لا يعيد 403 Forbidden)', async () => {
        const adminRes = await request(app)
          .post('/api/eta/documents/submit')
          .set('Cookie', [`session_token=${adminToken}`])
          .send({ invoice: { invoiceNumber: 'INV-TEST-001' } });
        expect(adminRes.status).not.toBe(403);

        const accountantRes = await request(app)
          .post('/api/eta/documents/submit')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({ invoice: { invoiceNumber: 'INV-TEST-002' } });
        expect(accountantRes.status).not.toBe(403);
      });

      it('يرفض AUDITOR و SECRETARY و PENDING بـ 403 Forbidden', async () => {
        for (const token of [auditorToken, secretaryToken, pendingToken]) {
          const res = await request(app)
            .post('/api/eta/documents/submit')
            .set('Cookie', [`session_token=${token}`])
            .send({ invoice: { invoiceNumber: 'INV-TEST-003' } });
          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        }
      });
    });

    // 3. /api/eta/config (للمدير فقط)
    describe('مسار إعدادات الربط /api/eta/config', () => {
      it('يسمح لـ ADMIN فقط ويعيد 200', async () => {
        const res = await request(app)
          .get('/api/eta/config')
          .set('Cookie', [`session_token=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('يرفض ACCOUNTANT و AUDITOR و SECRETARY و PENDING بـ 403 Forbidden', async () => {
        for (const token of [accountantToken, auditorToken, secretaryToken, pendingToken]) {
          const res = await request(app)
            .get('/api/eta/config')
            .set('Cookie', [`session_token=${token}`]);

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        }
      });
    });

    // 4. /api/eta/logs (للمدير فقط)
    describe('مسار سجلات الإرسال /api/eta/logs', () => {
      it('يسمح لـ ADMIN فقط ويعيد 200', async () => {
        const res = await request(app)
          .get('/api/eta/logs')
          .set('Cookie', [`session_token=${adminToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('يرفض ACCOUNTANT و AUDITOR و SECRETARY و PENDING بـ 403 Forbidden', async () => {
        for (const token of [accountantToken, auditorToken, secretaryToken, pendingToken]) {
          const res = await request(app)
            .get('/api/eta/logs')
            .set('Cookie', [`session_token=${token}`]);

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        }
      });
    });
  });

  // =========================================================================
  // (هـ) محاولات AUDITOR إجراء POST/PUT/DELETE على القيود والحسابات ورفضها بـ 403
  // =========================================================================
  describe('(هـ) حظر تعديل أو حذف أو إضافة البيانات على المراجع القانوني AUDITOR (403 Forbidden)', () => {
    const targetEntities = ['journalEntries', 'accounts'];

    for (const entity of targetEntities) {
      it(`يرفض محاولة AUDITOR إنشاء سجل جديد عبر POST على /api/data/${entity} برمز 403`, async () => {
        const res = await request(app)
          .post(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${auditorToken}`])
          .send({
            id: `auditor-post-${entity}-test`,
            data: { id: `auditor-post-${entity}-test`, name: 'Audit Test' },
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it(`يرفض محاولة AUDITOR تعديل سجل عبر PUT على /api/data/${entity} برمز 403`, async () => {
        const res = await request(app)
          .put(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${auditorToken}`])
          .send({
            id: `auditor-put-${entity}-test`,
            data: { id: `auditor-put-${entity}-test`, name: 'Audit Test Update' },
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it(`يرفض محاولة AUDITOR حذف سجل عبر DELETE على /api/data/${entity}/:id برمز 403`, async () => {
        const res = await request(app)
          .delete(`/api/data/${entity}/auditor-del-${entity}-test`)
          .set('Cookie', [`session_token=${auditorToken}`]);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    }
  });

  // =========================================================================
  // (و) اختبار استعادة نسخة احتياطية: ينسخ، يغيّر بيانات، يستعيد، ويتأكد إن البيانات رجعت
  // =========================================================================
  describe('(و) اختبار استعادة النسخة الاحتياطية (Backup & Restore Real Flow)', () => {
    it('يقوم بأخذ نسخة، ثم تغيير البيانات، ثم استعادة النسخة، ويتأكد من عودة البيانات بدقة', async () => {
      // 1. إنشاء حساب أصلي قبل أخذ النسخة الاحتياطية
      const originalAccount = {
        id: 'acc-restore-target-001',
        data: {
          id: 'acc-restore-target-001',
          code: '1050',
          name: 'حساب الصندوق الميداني الأصلي',
          type: 'ASSET',
          balance: 25000,
        },
      };

      const seedRes = await request(app)
        .post('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`])
        .send(originalAccount);

      expect(seedRes.status).toBe(200);

      // التأكد من وجود الحساب
      const verifySeedRes = await request(app)
        .get('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`]);

      const foundInitial = verifySeedRes.body.data.find((a: any) => a.id === originalAccount.id);
      expect(foundInitial).toBeDefined();
      expect(foundInitial.name).toBe('حساب الصندوق الميداني الأصلي');

      // 2. إنشاء نسخة احتياطية عبر السيرفر
      const backupRes = await request(app)
        .post('/api/server-backups/create')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(backupRes.status).toBe(200);
      expect(backupRes.body.success).toBe(true);
      const backupName = backupRes.body.backupName;
      expect(backupName).toBeDefined();
      expect(backupName).toMatch(/^backup_/);

      // 3. تغيير البيانات بعد أخذ النسخة:
      // (أ) تعديل الحساب الأصلي
      const modifiedAccount = {
        id: 'acc-restore-target-001',
        data: {
          id: 'acc-restore-target-001',
          code: '1050',
          name: 'حساب تم العبث به بعد النسخة الاحتياطية',
          type: 'ASSET',
          balance: 99999,
        },
      };

      const putRes = await request(app)
        .put('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`])
        .send(modifiedAccount);

      expect(putRes.status).toBe(200);

      // (ب) إضافة حساب دخيل جديد غير موجود في النسخة
      const junkAccount = {
        id: 'acc-junk-post-backup-002',
        data: {
          id: 'acc-junk-post-backup-002',
          code: '9999',
          name: 'حساب مؤقت مضاف بعد النسخة الاحتياطية',
          type: 'EXPENSE',
          balance: 500,
        },
      };

      const postJunkRes = await request(app)
        .post('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`])
        .send(junkAccount);

      expect(postJunkRes.status).toBe(200);

      // التحقق من أن البيانات تغيرت فعلاً
      const verifyChangedRes = await request(app)
        .get('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`]);

      const foundModified = verifyChangedRes.body.data.find((a: any) => a.id === originalAccount.id);
      expect(foundModified?.name).toBe('حساب تم العبث به بعد النسخة الاحتياطية');

      const foundJunk = verifyChangedRes.body.data.find((a: any) => a.id === junkAccount.id);
      expect(foundJunk).toBeDefined();

      // 4. استعادة النسخة الاحتياطية
      const restoreRes = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          backupName,
          confirmationText: 'تأكيد الاستعادة',
        });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);

      // 5. التأكد التام من عودة البيانات إلى حالتها الأصلية
      const verifyRestoredRes = await request(app)
        .get('/api/data/accounts')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(verifyRestoredRes.status).toBe(200);

      // الحساب الأصلي رجع لاسمه ورصيده الأصلي
      const foundRestored = verifyRestoredRes.body.data.find((a: any) => a.id === originalAccount.id);
      expect(foundRestored).toBeDefined();
      expect(foundRestored.name).toBe('حساب الصندوق الميداني الأصلي');
      expect(foundRestored.balance).toBe(25000);

      // الحساب الدخيل الذي أضيف بعد النسخة اختفى
      const foundJunkAfterRestore = verifyRestoredRes.body.data.find((a: any) => a.id === junkAccount.id);
      expect(foundJunkAfterRestore).toBeUndefined();
    });

    it('يرفض طلب الاستعادة إذا كان نص التأكيد غير صحيح برمز 400', async () => {
      const res = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          backupName: 'backup_test_dummy',
          confirmationText: 'نص خاطئ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('يرفض محاولة غير المدير (مثل ACCOUNTANT) استعادة نسخة احتياطية برمز 403', async () => {
      const res = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          backupName: 'backup_test_dummy',
          confirmationText: 'تأكيد الاستعادة',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});

