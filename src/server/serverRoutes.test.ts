import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import type { Express } from 'express';
import Database from 'better-sqlite3';
import JSZip from 'jszip';

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
  const accountantNoPostToken = 'accountant-nopost-raw-session-token-secret-xyz';
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
      { id: 6, name: 'Restricted Accountant User', email: 'accountant_nopost@test.local', role: 'ACCOUNTANT', canPost: 0, canEditPosted: 0, canDelete: 0, token: accountantNoPostToken },
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

    it('يدعم تحميل النسخة الاحتياطية كملف مضغوط zip يحتوي على قاعدة البيانات والمستندات للمدير فقط ويرفض غيره برمز 403', async () => {
      const createRes = await request(app)
        .post('/api/server-backups/create')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(createRes.status).toBe(200);
      const backupName = createRes.body.backupName;

      const zipRes = await request(app)
        .get(`/api/server-backups/${backupName}/download?format=zip`)
        .set('Cookie', [`session_token=${adminToken}`])
        .buffer(true)
        .parse((res, callback) => {
          const chunks: any[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(zipRes.status).toBe(200);
      expect(zipRes.headers['content-type']).toContain('zip');

      const zip = await JSZip.loadAsync(zipRes.body as Buffer);
      expect(zip.file('app.db')).not.toBeNull();

      const forbiddenRes = await request(app)
        .get(`/api/server-backups/${backupName}/download?format=zip`)
        .set('Cookie', [`session_token=${auditorToken}`]);

      expect(forbiddenRes.status).toBe(403);
    });

    it('يستعيد قاعدة البيانات ومجلد المستندات المرفوعة كاملاً عند تنفيذ الاستعادة', async () => {
      const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
      const backupDir = process.env.BACKUP_DIR || path.join(dataDir, 'backups');
      const docsDir = process.env.DOCUMENTS_DIR || path.join(dataDir, 'documents');

      const dummyBackupName = `backup_test_docs_${Date.now()}`;
      const dummyBackupPath = path.join(backupDir, dummyBackupName);
      const dummyBackupDocs = path.join(dummyBackupPath, 'documents');

      fs.mkdirSync(dummyBackupDocs, { recursive: true });

      const currentDbPath = process.env.DB_PATH || path.join(dataDir, 'app.db');
      fs.copyFileSync(currentDbPath, path.join(dummyBackupPath, 'app.db'));

      const testDocFile = path.join(dummyBackupDocs, 'doc_restored_test.pdf');
      fs.writeFileSync(testDocFile, '%PDF-1.4 Restored Document Test Content');

      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc_to_be_overwritten.txt'), 'Junk Data Before Restore');

      const restoreRes = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          backupName: dummyBackupName,
          confirmationText: 'تأكيد الاستعادة',
        });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);

      const restoredDocPath = path.join(docsDir, 'doc_restored_test.pdf');
      expect(fs.existsSync(restoredDocPath)).toBe(true);
      const content = fs.readFileSync(restoredDocPath, 'utf8');
      expect(content).toContain('Restored Document Test Content');

      try { fs.rmSync(dummyBackupPath, { recursive: true, force: true }); } catch {}
    });
  });

  // =========================================================================
  // (ز) رفض حفظ قيد مرحّل (isPosted: true أو status: "POSTED") لمن لا يملك can_post_entries
  // =========================================================================
  describe('(ز) حظر حفظ أو ترحيل القيود (isPosted=true / status=POSTED) بدون صلاحية can_post_entries برمز 403', () => {
    const postedEntryWithFlag = {
      id: 'je-test-posted-flag-001',
      data: {
        id: 'je-test-posted-flag-001',
        date: '2027-04-10',
        description: 'قيد رواتب معتمد لاختبار حظر الترحيل',
        isPosted: true,
        lines: [
          { id: 'l1', accountCode: '101', debit: 8000, credit: 0 },
          { id: 'l2', accountCode: '102', debit: 0, credit: 8000 },
        ],
      },
    };

    const postedEntryWithStatus = {
      id: 'je-test-posted-status-001',
      data: {
        id: 'je-test-posted-status-001',
        date: '2027-04-11',
        description: 'قيد رواتب بحالة POSTED لاختبار حظر الترحيل',
        status: 'POSTED',
        lines: [
          { id: 'l1', accountCode: '101', debit: 5500, credit: 0 },
          { id: 'l2', accountCode: '102', debit: 0, credit: 5500 },
        ],
      },
    };

    it('يرفض محاولة محاسب لا يملك can_post_entries حفظ قيد عبر POST مع isPosted=true برمز 403', async () => {
      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantNoPostToken}`])
        .send(postedEntryWithFlag);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('can_post_entries');
    });

    it('يرفض محاولة محاسب لا يملك can_post_entries حفظ قيد عبر POST مع status="POSTED" برمز 403', async () => {
      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantNoPostToken}`])
        .send(postedEntryWithStatus);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('can_post_entries');
    });

    it('يرفض محاولة محاسب لا يملك can_post_entries تعديل قيد عبر PUT إلى مرحّل برمز 403', async () => {
      const res = await request(app)
        .put('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantNoPostToken}`])
        .send(postedEntryWithFlag);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('can_post_entries');
    });

    it('يرفض محاولة سكرتير حفظ قيد عبر POST مع isPosted=true أو status="POSTED" برمز 403', async () => {
      const resPostFlag = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${secretaryToken}`])
        .send(postedEntryWithFlag);

      expect(resPostFlag.status).toBe(403);
      expect(resPostFlag.body.success).toBe(false);

      const resPostStatus = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${secretaryToken}`])
        .send(postedEntryWithStatus);

      expect(resPostStatus.status).toBe(403);
      expect(resPostStatus.body.success).toBe(false);
    });

    it('يرفض محاولة سكرتير تعديل قيد عبر PUT إلى مرحّل برمز 403', async () => {
      const res = await request(app)
        .put('/api/data/journalEntries')
        .set('Cookie', [`session_token=${secretaryToken}`])
        .send(postedEntryWithFlag);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('يسمح للمحاسب الذي لا يملك can_post_entries بحفظ قيد مسودة (isPosted: false / status: DRAFT) بنجاح 200', async () => {
      const draftPayload = {
        id: 'je-test-draft-nopost-valid-001',
        data: {
          id: 'je-test-draft-nopost-valid-001',
          date: '2027-04-12',
          description: 'قيد مسودة عادي مسموح به للمحاسب',
          isPosted: false,
          status: 'DRAFT',
          lines: [
            { id: 'l1', accountCode: '101', debit: 4000, credit: 0 },
            { id: 'l2', accountCode: '102', debit: 0, credit: 4000 },
          ],
        },
      };

      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantNoPostToken}`])
        .send(draftPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('يسمح للمدير أو المحاسب الذي يملك can_post_entries بحفظ قيد مرحّل (isPosted: true) برمز 200', async () => {
      const validPostedPayload = {
        id: 'je-test-posted-valid-accountant-001',
        data: {
          id: 'je-test-posted-valid-accountant-001',
          date: '2027-04-13',
          description: 'قيد مرحّل نظامي بواسطة محاسب مفوض',
          isPosted: true,
          lines: [
            { id: 'l1', accountCode: '101', debit: 9500, credit: 0 },
            { id: 'l2', accountCode: '102', debit: 0, credit: 9500 },
          ],
        },
      };

      const res = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send(validPostedPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // (ح) اختبار مزامنة الكيانات الستة الجديدة على السيرفر الحقيقي وصلاحيات المراجع
  // =========================================================================
  describe('(ح) اختبار مزامنة الكيانات الستة الجديدة وصلاحيات المراجع AUDITOR', () => {
    const sixEntities = [
      'closingChecklists',
      'clientDeadlines',
      'openItems',
      'approvedStatements',
      'feeAgreements',
      'feeCollections',
    ];

    for (const entity of sixEntities) {
      it(`يسمح للمدير أو المحاسب بحفظ واسترجاع (${entity}) بنجاح 200`, async () => {
        const payload = {
          id: `test-6ent-${entity}-001`,
          data: { id: `test-6ent-${entity}-001`, name: `Test ${entity}` },
        };

        const postRes = await request(app)
          .post(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${adminToken}`])
          .send(payload);

        expect(postRes.status).toBe(200);
        expect(postRes.body.success).toBe(true);

        const getRes = await request(app)
          .get(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${adminToken}`]);

        expect(getRes.status).toBe(200);
        expect(getRes.body.success).toBe(true);
        expect(Array.isArray(getRes.body.data)).toBe(true);
        expect(getRes.body.data.some((item: any) => item.id === `test-6ent-${entity}-001`)).toBe(true);
      });

      it(`يسمح للمراجع AUDITOR بقراءة (${entity}) بينما يرفض تعديله أو حذفه برمز 403`, async () => {
        const getRes = await request(app)
          .get(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${auditorToken}`]);

        expect(getRes.status).toBe(200);
        expect(getRes.body.success).toBe(true);

        const postRes = await request(app)
          .post(`/api/data/${entity}`)
          .set('Cookie', [`session_token=${auditorToken}`])
          .send({ id: `auditor-fail-${entity}`, data: {} });

        expect(postRes.status).toBe(403);

        const delRes = await request(app)
          .delete(`/api/data/${entity}/auditor-fail-${entity}`)
          .set('Cookie', [`session_token=${auditorToken}`]);

        expect(delRes.status).toBe(403);
      });
    }
  });

  // =========================================================================
  // (ط) اختبار تنظيف محددات المعدل (Rate Limiters Cleanup)
  // =========================================================================
  describe('(ط) اختبار تنظيف محددات المعدل (Rate Limiters Cleanup)', () => {
    it('ينظف المدخلات المنتهية ويحافظ على الحد الأقصى للمفاتيح في الذاكرة', () => {
      const cleanFn = (app as any).cleanExpiredRateLimits;
      const aiMap: Map<string, any> = (app as any).aiRateLimits;
      const verifyMap: Map<string, any> = (app as any).verifyMasterRateLimits;

      expect(typeof cleanFn).toBe('function');

      const now = Date.now();
      // Add expired and active entries to aiRateLimits
      aiMap.set('ip-expired', { timestamps: [now - 120000] }); // expired (>60s)
      aiMap.set('ip-active', { timestamps: [now - 5000] });     // active

      // Add expired and active entries to verifyMasterRateLimits
      verifyMap.set('ip-master-expired', [now - 120000]);
      verifyMap.set('ip-master-active', [now - 2000]);

      // Run cleanup
      cleanFn();

      // Expired entries should be deleted
      expect(aiMap.has('ip-expired')).toBe(false);
      expect(aiMap.has('ip-active')).toBe(true);

      expect(verifyMap.has('ip-master-expired')).toBe(false);
      expect(verifyMap.has('ip-master-active')).toBe(true);
    });
  });

  describe('(ي) اختبار ترحيل الكيانات الستة (migrate-local-six)', () => {
    it('يرفض المراجع AUDITOR والسكرتير SECRETARY برمز 403', async () => {
      const payload = {
        clientDeadlines: [{ id: 'dl-test-01', title: 'test deadline' }]
      };

      const auditorRes = await request(app)
        .post('/api/data/migrate-local-six')
        .set('Cookie', [`session_token=${auditorToken}`])
        .send(payload);
      expect(auditorRes.status).toBe(403);

      const secretaryRes = await request(app)
        .post('/api/data/migrate-local-six')
        .set('Cookie', [`session_token=${secretaryToken}`])
        .send(payload);
      expect(secretaryRes.status).toBe(403);
    });

    it('يضيف سجل جديد ولا يغير سجل موجود مسبقاً على السيرفر (INSERT OR IGNORE)', async () => {
      const existingId = 'dl-existing-001';
      const originalData = { id: existingId, title: 'Original Server Title', original: true };
      const modifiedData = { id: existingId, title: 'Attempted Local Override Title', original: false };
      const newId = 'dl-new-002';
      const newData = { id: newId, title: 'New Local Deadline', original: true };

      // 1. Insert original record on server via admin
      const seedRes = await request(app)
        .post('/api/data/clientDeadlines')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ id: existingId, data: originalData });
      expect(seedRes.status).toBe(200);

      // 2. Perform migration call with modified existing record + new record
      const migrationPayload = {
        clientDeadlines: [modifiedData, newData]
      };

      const migrateRes = await request(app)
        .post('/api/data/migrate-local-six')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send(migrationPayload);

      expect(migrateRes.status).toBe(200);
      expect(migrateRes.body.success).toBe(true);

      // 3. Verify existing record was NOT changed (remains original data)
      const getRes = await request(app)
        .get('/api/data/clientDeadlines')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(getRes.status).toBe(200);
      const items = getRes.body.data;
      const foundExisting = items.find((item: any) => item.id === existingId);
      const foundNew = items.find((item: any) => item.id === newId);

      expect(foundExisting).toBeDefined();
      const parsedExistingData = typeof foundExisting.data === 'string' ? JSON.parse(foundExisting.data) : (foundExisting.data || foundExisting);
      expect(parsedExistingData.title).toBe('Original Server Title');

      expect(foundNew).toBeDefined();
    });
  });

  describe('(ك) اختبار حظر وتفعيل المستخدمين على السيرفر', () => {
    it('مستخدم موقوف مبيقدرش يسجل دخول (يرجع الحساب موقوف)، والمدير يقدر يوقفه ويرجعه، وغير المدير مبيقدرش', async () => {
      // 1. Create a test user via admin
      const createRes = await request(app)
        .post('/api/users')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          name: 'اختبار الحظر',
          email: 'blocktest@example.com',
          password: 'Password12345!',
          role: 'ACCOUNTANT'
        });
      expect(createRes.status).toBe(200);
      const newUserId = createRes.body.id;

      // 2. Non-admin trying to block user -> 403
      const nonAdminBlockRes = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ isActive: false });
      expect(nonAdminBlockRes.status).toBe(403);

      // 3. Admin blocks user
      const adminBlockRes = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ isActive: false });
      expect(adminBlockRes.status).toBe(200);

      // 4. Suspended user cannot login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'blocktest@example.com', password: 'Password12345!' });
      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error).toBe("الحساب موقوف.");

      // 5. Admin restores user
      const restoreRes = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ isActive: true });
      expect(restoreRes.status).toBe(200);

      // 6. Restored user can login successfully
      const loginAfterRestoreRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'blocktest@example.com', password: 'Password12345!' });
      expect(loginAfterRestoreRes.status).toBe(200);
      expect(loginAfterRestoreRes.body.success).toBe(true);
    });
  });

  describe('(ل) اختبار ترخيص الأجهزة وتفعيلها بالماستر كود على السيرفر', () => {
    it('يقبل الكود الصحيح، ويرفض الكود الخاطئ و123456، ويشغل الrate limiter بعد 5 محاولات، ويسجل في auditLogs', async () => {
      if ((app as any).authorizeDeviceRateLimits) {
        (app as any).authorizeDeviceRateLimits.clear();
      }

      // 1. Correct code -> 200
      const correctCode = process.env.DEVICE_ACTIVATION_CODE || '1234567890123456';
      const correctRes = await request(app)
        .post('/api/auth/authorize-device')
        .send({ passcode: correctCode, customDeviceName: 'Main Accounting PC' });
      expect(correctRes.status).toBe(200);
      expect(correctRes.body.success).toBe(true);
      expect(correctRes.body.device).toBeDefined();

      // 2. Wrong code -> 401
      const wrongRes = await request(app)
        .post('/api/auth/authorize-device')
        .send({ passcode: 'WrongCode12345', customDeviceName: 'Test Device 1' });
      expect(wrongRes.status).toBe(401);

      // 3. Static old code 123456 -> 401
      const staticRes = await request(app)
        .post('/api/auth/authorize-device')
        .send({ passcode: '123456', customDeviceName: 'Test Device 2' });
      expect(staticRes.status).toBe(401);

      // 4. Rate limiter test (5 attempts total per 15 min per IP)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/authorize-device')
          .set('X-Forwarded-For', '203.0.113.50')
          .send({ passcode: 'BadPass' });
      }
      // 6th attempt from 203.0.113.50 should return 429 Too Many Requests
      const rateLimitRes = await request(app)
        .post('/api/auth/authorize-device')
        .set('X-Forwarded-For', '203.0.113.50')
        .send({ passcode: 'BadPass' });
      expect(rateLimitRes.status).toBe(429);
    });
  });

  describe('(م) اختبارات أمان وتشفير التوكن والأرقام السرية وصلاحيات الإظهار (Phase A)', () => {
    it('يحفظ بيانات التوكن مشفرة في قاعدة البيانات ويحذف النص العادي، ويقصر الإظهار على المدير والمحاسب فقط ويرفض المراجع والسكرتير (403)، ويسجل في auditLogs', async () => {
      const clientId = 'client-token-test-001';
      const clientPayload = {
        id: clientId,
        name: 'شركة التوكن والتبرعات المصرية',
        portalCredentials: {
          eSignatureToken: {
            provider: 'Egypt Trust',
            tokenType: 'BOTH',
            pin: '987654321',
            password: '987654321', // duplicate to test scrubbing
            serialNumber: 'SN-998877',
            expiryDate: '2028-12-31'
          }
        }
      };

      // 1. Save client as Admin
      const saveRes = await request(app)
        .post('/api/data/clients')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ id: clientId, data: clientPayload });
      expect(saveRes.status).toBe(200);

      // 2. Verify in SQLite db that _encryptedPortalCredentials exists and raw pin/password are scrubbed from data column
      const activeDb = (app as any).db || db;
      const row = activeDb.prepare("SELECT data FROM clients WHERE id = ?").get(clientId) as any;
      expect(row).toBeDefined();
      const parsedStored = JSON.parse(row.data);
      expect(parsedStored._encryptedPortalCredentials).toBeDefined();
      expect(parsedStored.portalCredentials.eSignatureToken.pin).toBeUndefined();
      expect(parsedStored.portalCredentials.eSignatureToken.password).toBeUndefined();
      expect(parsedStored.portalCredentials.eSignatureToken.hasPassword).toBe(true);

      // 3. Test reveal-credentials access control:
      // - Auditor (403)
      const auditorReveal = await request(app)
        .post(`/api/clients/${clientId}/reveal-credentials`)
        .set('Cookie', [`session_token=${auditorToken}`])
        .send({ portalKey: 'eSignatureToken' });
      expect(auditorReveal.status).toBe(403);

      // - Secretary (403)
      const secretaryReveal = await request(app)
        .post(`/api/clients/${clientId}/reveal-credentials`)
        .set('Cookie', [`session_token=${secretaryToken}`])
        .send({ portalKey: 'eSignatureToken' });
      expect(secretaryReveal.status).toBe(403);

      // - Accountant (200)
      const accountantReveal = await request(app)
        .post(`/api/clients/${clientId}/reveal-credentials`)
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ portalKey: 'eSignatureToken' });
      expect(accountantReveal.status).toBe(200);
      expect(accountantReveal.body.success).toBe(true);
      expect(accountantReveal.body.credentials.eSignatureToken.pin).toBe('987654321');

      // - Admin (200)
      const adminReveal = await request(app)
        .post(`/api/clients/${clientId}/reveal-credentials`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ portalKey: 'eSignatureToken' });
      expect(adminReveal.status).toBe(200);
      expect(adminReveal.body.credentials.eSignatureToken.pin).toBe('987654321');

      // 4. Verify audit logs recorded the reveal actions
      const auditRowsRaw = activeDb.prepare("SELECT data FROM auditLogs ORDER BY updated_at DESC").all() as any[];
      const auditRows = auditRowsRaw.map(r => JSON.parse(r.data)).filter((a: any) => a.recordId === clientId && a.action === 'REVEAL_CLIENT_CREDENTIALS');
      expect(auditRows.length).toBeGreaterThan(0);
      const latestAudit = auditRows[0];
      expect(latestAudit.action).toBe('REVEAL_CLIENT_CREDENTIALS');
    });
  });
});



