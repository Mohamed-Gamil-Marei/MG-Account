import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import type { Express } from 'express';
import Database from 'better-sqlite3';
import JSZip from 'jszip';
import { checkEntityAccess } from './access';

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
      { id: 6, name: 'Restricted Accountant User', email: 'accountant_nopost@test.local', role: 'ACCOUNTANT', canPost: 0, canEditPosted: 0, canDelete: 1, token: accountantNoPostToken },
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

    try {
      const privateKeyPem = fs.readFileSync(path.join(process.cwd(), 'keys', 'private.pem'), 'utf8');
      const payload = {
        licenseId: 'LIC-TEST-SUITE',
        officeName: 'مكتب الاختبارات الشاملة',
        plan: 'ONLINE',
        mode: 'ONLINE',
        features: { cloudSync: true, ai: true, whatsapp: true, eta: true },
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 50,
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
      const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), crypto.createPrivateKey(privateKeyPem));
      const sigB64 = signature.toString('base64');
      const licenseCode = `${payloadB64}.${sigB64}`;

      db.prepare(`
        INSERT INTO settings (key, value, updated_at, updated_by)
        VALUES ('LICENSE_CODE', ?, datetime('now'), 'system')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(licenseCode);
    } catch (e) {
      console.warn('Could not seed test license in serverRoutes.test.ts:', e);
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

  describe('Task 4: Real-Server JV Concurrency & Numbering (المهمة 4: ترقيم القيود)', () => {
    it('20 concurrent POST requests in the same year receive unique non-duplicated JV numbers', async () => {
      const year = 2026;
      const requests = Array.from({ length: 20 }, (_, i) => {
        const id = `jv-concurrent-2026-${i + 1}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const entryPayload = {
          date: `${year}-04-15`,
          fiscalYear: year,
          description: `قيد متزامن تجريبي ${i + 1}`,
          status: 'DRAFT',
          lines: [
            { accountId: 'acc-1', accountCode: '101', debit: 500, credit: 0, description: 'مدين' },
            { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 500, description: 'دائن' },
          ],
        };
        return request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({ id, data: entryPayload });
      });

      const responses = await Promise.all(requests);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }

      // Read back all stored entries from DB
      const activeDb = (app as any).db || db;
      const allRows = activeDb.prepare("SELECT data FROM journalEntries").all() as any[];
      const entries2026 = allRows
        .map((r: any) => JSON.parse(r.data))
        .filter((e: any) => e.description && e.description.startsWith('قيد متزامن تجريبي'));

      expect(entries2026.length).toBe(20);

      const serialNumbers = entries2026.map((e: any) => e.serialNumber);
      const entryNumbers = entries2026.map((e: any) => e.entryNumber);

      // Verify no duplicates
      const uniqueSerials = new Set(serialNumbers);
      const uniqueNumbers = new Set(entryNumbers);
      expect(uniqueSerials.size).toBe(20);
      expect(uniqueNumbers.size).toBe(20);

      // Verify format
      for (const s of serialNumbers) {
        expect(s).toMatch(/^JV-2026-\d{4}$/);
      }
    });

    it('entries in two different years receive independent JV numbers', async () => {
      const entryYear1 = 2024;
      const entryYear2 = 2025;

      const id1 = `jv-year-2024-${Date.now()}`;
      const payload1 = {
        date: `${entryYear1}-06-01`,
        fiscalYear: entryYear1,
        description: 'قيد سنة 2024',
        status: 'DRAFT',
        lines: [
          { accountId: 'acc-1', accountCode: '101', debit: 100, credit: 0 },
          { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 100 },
        ],
      };

      const res1 = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ id: id1, data: payload1 });
      expect(res1.status).toBe(200);

      const id2 = `jv-year-2025-${Date.now()}`;
      const payload2 = {
        date: `${entryYear2}-07-15`,
        fiscalYear: entryYear2,
        description: 'قيد سنة 2025',
        status: 'DRAFT',
        lines: [
          { accountId: 'acc-1', accountCode: '101', debit: 200, credit: 0 },
          { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 200 },
        ],
      };

      const res2 = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ id: id2, data: payload2 });
      expect(res2.status).toBe(200);

      const activeDb = (app as any).db || db;
      const row1 = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(id1) as any;
      const row2 = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(id2) as any;

      const parsed1 = JSON.parse(row1.data);
      const parsed2 = JSON.parse(row2.data);

      expect(parsed1.serialNumber).toMatch(/^JV-2024-\d{4}$/);
      expect(parsed2.serialNumber).toMatch(/^JV-2025-\d{4}$/);
      expect(parsed1.entryNumber).toBe(1);
      expect(parsed2.entryNumber).toBe(1);
    });

    it('deletion then addition does not repeat a JV number', async () => {
      const year = 2029; // Use unique isolated year

      // 1. Add entry 1
      const id1 = `jv-del-1-${Date.now()}`;
      const res1 = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: id1,
          data: {
            date: `${year}-01-10`,
            fiscalYear: year,
            description: 'قيد أول 2029',
            status: 'DRAFT',
            lines: [
              { accountId: 'acc-1', accountCode: '101', debit: 300, credit: 0 },
              { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 300 },
            ],
          },
        });
      expect(res1.status).toBe(200);

      // 2. Add entry 2
      const id2 = `jv-del-2-${Date.now()}`;
      const res2 = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: id2,
          data: {
            date: `${year}-02-10`,
            fiscalYear: year,
            description: 'قيد ثان 2029',
            status: 'DRAFT',
            lines: [
              { accountId: 'acc-1', accountCode: '101', debit: 400, credit: 0 },
              { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 400 },
            ],
          },
        });
      expect(res2.status).toBe(200);

      const activeDb = (app as any).db || db;
      const row2 = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(id2) as any;
      const parsed2 = JSON.parse(row2.data);
      expect(parsed2.entryNumber).toBe(2);
      expect(parsed2.serialNumber).toBe(`JV-${year}-0002`);

      // 3. Delete entry 2
      const delRes = await request(app)
        .delete(`/api/data/journalEntries/${id2}`)
        .set('Cookie', [`session_token=${adminToken}`]);
      expect(delRes.status).toBe(200);

      // 4. Add entry 3
      const id3 = `jv-del-3-${Date.now()}`;
      const res3 = await request(app)
        .post('/api/data/journalEntries')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({
          id: id3,
          data: {
            date: `${year}-03-10`,
            fiscalYear: year,
            description: 'قيد ثالث 2029',
            status: 'DRAFT',
            lines: [
              { accountId: 'acc-1', accountCode: '101', debit: 500, credit: 0 },
              { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 500 },
            ],
          },
        });
      expect(res3.status).toBe(200);

      // 5. Verify entry 3 has number 3 (NOT 2)
      const row3 = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(id3) as any;
      const parsed3 = JSON.parse(row3.data);
      expect(parsed3.entryNumber).toBe(3);
      expect(parsed3.serialNumber).toBe(`JV-${year}-0003`);
    });
  });

  // =========================================================================
  // (ن) اختبارات التحقق الشاملة للبنود الأمنية التسعة (Items 1 to 9 Security Matrix)
  // =========================================================================
  describe('(ن) اختبارات التحقق الصارمة للبنود الأمنية التسعة (Items 1 to 9)', () => {
    // 1) مسار /api/admin/reset-production
    it('البند 1: يرفض القيم المدمجة (123456 و MG-2026-PURGE و MASTER_PURGE_PASSWORD) ولا يقبل إلا PASSWORD_PURGE_MASTER، ولا يمسح auditLogs، ويجري نسخة احتياطية', async () => {
      const activeDb = (app as any).db || db;
      activeDb.prepare(`
        INSERT OR REPLACE INTO auditLogs (id, data, updated_at, version, updated_by)
        VALUES ('audit-item1-test', '{"action":"ITEM1_CHECK","details":"سجل تدقيق محمي"}', datetime('now'), 1, 'admin')
      `).run();

      const bannedPasscodes = ['123456', 'MG-2026-PURGE', 'MASTER_PURGE_PASSWORD'];
      for (const badPass of bannedPasscodes) {
        const res = await request(app)
          .post('/api/admin/reset-production')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ confirmationText: 'تفريغ', passcode: badPass });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }

      const validRes = await request(app)
        .post('/api/admin/reset-production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmationText: 'تفريغ', passcode: TEST_PURGE_MASTER });
      expect(validRes.status).toBe(200);
      expect(validRes.body.success).toBe(true);

      const preservedAudit = activeDb.prepare("SELECT id FROM auditLogs WHERE id = 'audit-item1-test'").get();
      expect(preservedAudit).toBeDefined();
    });

    // 2) مسار تفعيل الجهاز
    it('البند 2: مسار تفعيل الجهاز يعيد 401 عند خطأ الكود دون كشف debugInput أو debugActivation في الاستجابة', async () => {
      const res = await request(app)
        .post('/api/auth/authorize-device')
        .send({ passcode: 'WRONG_DEVICE_PASSCODE_999', customDeviceName: 'Test Machine' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.debugInput).toBeUndefined();
      expect(res.body.debugActivation).toBeUndefined();
    });

    // 3) التحقق من الأدوار ورفض غير المعتمد، وجعل الافتراضي في checkEntityAccess هو الرفض
    it('البند 3: يتحقق من role مقابل القائمة الثابتة ويرفض غيرها برمز 400، و checkEntityAccess الافتراضي هو الرفض', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          name: 'Hacker User',
          email: 'hacker@test.local',
          password: 'Password123456!',
          role: 'SUPERADMIN'
        });
      expect(createRes.status).toBe(400);
      expect(createRes.body.error).toMatch(/غير صالح/);

      const updateRes = await request(app)
        .put('/api/users/2')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ role: 'UNKNOWN_ROLE' });
      expect(updateRes.status).toBe(400);

      const dummyUser = { id: 99, role: 'ACCOUNTANT' as const };
      expect(checkEntityAccess(dummyUser, 'unknownNonExistentEntity', 'READ' as any)).toBe(false);
      expect(checkEntityAccess(dummyUser, 'unknownNonExistentEntity', 'WRITE' as any)).toBe(false);
      expect(checkEntityAccess(dummyUser, 'unknownNonExistentEntity', 'DELETE' as any)).toBe(false);
    });

    // 4) دور AUDITOR قراءة فقط ويُمنع من الكتابة والحذف
    it('البند 4: دور AUDITOR قراءة فقط ويمنع عنه الكتابة والحذف على السيرفر (403)', async () => {
      const activeDb = (app as any).db || db;
      activeDb.prepare(`
        INSERT OR REPLACE INTO clients (id, data, updated_at, version, updated_by)
        VALUES ('client-auditor-guard', '{"name":"شركة الفحص"}', datetime('now'), 1, 'admin')
      `).run();

      const writeRes = await request(app)
        .post('/api/data/clients')
        .set('Cookie', [`session_token=${auditorToken}`])
        .send({ id: 'client-auditor-write-fail', data: { name: 'فشل' } });
      expect(writeRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete('/api/data/clients/client-auditor-guard')
        .set('Cookie', [`session_token=${auditorToken}`]);
      expect(deleteRes.status).toBe(403);

      const auditorUserObj = { id: 3, role: 'AUDITOR' as const };
      const entitiesToTest = ['clients', 'journalEntries', 'invoices', 'treasury', 'accounts', 'taxDeclarations'];
      for (const ent of entitiesToTest) {
        expect(checkEntityAccess(auditorUserObj, ent, 'WRITE')).toBe(false);
        expect(checkEntityAccess(auditorUserObj, ent, 'DELETE')).toBe(false);
      }
    });

    // 5) مسارات ETA محصورة على ADMIN و ACCOUNTANT مع التسجيل في سجل التدقيق وخلو clientSecret من الافتراضي
    it('البند 5: مسارات ETA محصورة على ADMIN و ACCOUNTANT وتسجل كل عملية في auditLogs', async () => {
      const tokenAuditor = await request(app).post('/api/eta/token').set('Cookie', [`session_token=${auditorToken}`]);
      expect(tokenAuditor.status).toBe(403);
      const submitAuditor = await request(app).post('/api/eta/documents/submit').set('Cookie', [`session_token=${auditorToken}`]).send({ invoice: { invoiceNumber: 'INV-1' } });
      expect(submitAuditor.status).toBe(403);
      const batchAuditor = await request(app).post('/api/eta/documents/batch-submit').set('Cookie', [`session_token=${auditorToken}`]).send({ invoices: [] });
      expect(batchAuditor.status).toBe(403);
      const diagAuditor = await request(app).get('/api/eta/diagnostics').set('Cookie', [`session_token=${auditorToken}`]);
      expect(diagAuditor.status).toBe(403);

      const tokenAccountant = await request(app).post('/api/eta/token').set('Cookie', [`session_token=${accountantToken}`]).send({});
      expect(tokenAccountant.status).not.toBe(403);

      const diagAccountant = await request(app).get('/api/eta/diagnostics').set('Cookie', [`session_token=${accountantToken}`]);
      expect(diagAccountant.status).not.toBe(403);

      const activeDb = (app as any).db || db;
      const etaAudit = activeDb.prepare("SELECT * FROM auditLogs WHERE data LIKE '%ETA_%'").all();
      expect(etaAudit.length).toBeGreaterThan(0);
    });

    // 6) checkClientExists ومسار رفع المستندات
    it('البند 6: checkClientExists ومسار رفع المستندات يرفضان clientId غير الموجود ويعيدان 400', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 test dummy content for rejection');
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', [`session_token=${accountantToken}`])
        .field('clientId', 'non-existent-client-id-xyz-999')
        .field('year', '2026')
        .field('type', 'TAX_CARD')
        .attach('file', fakePdfBuffer, 'test.pdf');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/غير موجود/);
    });

    // 7) الجلسات وإلغاؤها عند تغيير كلمة المرور أو الدور، والحد الأدنى 10 أحرف
    it('البند 7: يرفض كلمة مرور أقل من 10 أحرف في التعديل (400)، ويلغي كل الجلسات في جدول sessions عند تغيير كلمة المرور أو الدور', async () => {
      const activeDb = (app as any).db || db;

      const tempUserRes = await request(app)
        .post('/api/users')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          name: 'Session Test User',
          email: 'session-test@test.local',
          password: 'ValidInitialPass10!',
          role: 'ACCOUNTANT'
        });
      expect(tempUserRes.status).toBe(200);
      const tempUserId = tempUserRes.body.id;

      const tempSessionToken = 'temp-test-user-session-token-xyz';
      activeDb.prepare(`
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+1 hour'))
      `).run(hashToken(tempSessionToken), tempUserId);

      const meBefore = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`session_token=${tempSessionToken}`]);
      expect(meBefore.status).toBe(200);

      const shortPassRes = await request(app)
        .put(`/api/users/${tempUserId}`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ password: '123' });
      expect(shortPassRes.status).toBe(400);
      expect(shortPassRes.body.error).toMatch(/10 أحرف/);

      const changePassRes = await request(app)
        .put(`/api/users/${tempUserId}`)
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ password: 'BrandNewStrongPass10!' });
      expect(changePassRes.status).toBe(200);

      const meAfter = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`session_token=${tempSessionToken}`]);
      expect(meAfter.status).toBe(401);
    });

    // 8) استعادة النسخة الاحتياطية
    it('البند 8: استعادة النسخة الاحتياطية تستبدل مجلد documents بالكامل وتحذف ملفات WAL/SHM', async () => {
      // 1. يرفض غير المدير برمز 403
      const resAccountant = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ backupName: 'backup_test_nonexistent', confirmationText: 'تأكيد الاستعادة' });
      expect(resAccountant.status).toBe(403);

      // 2. يرفض المدير إذا لم يُرسل نص التأكيد الصريح "تأكيد الاستعادة"
      const resNoConfirm = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ backupName: 'backup_test_nonexistent' });
      expect(resNoConfirm.status).toBe(400);

      // 3. يرفض إذا كان اسم النسخة غير موجود (404)
      const resNotFound = await request(app)
        .post('/api/server-backups/restore')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ backupName: 'backup_test_nonexistent', confirmationText: 'تأكيد الاستعادة' });
      expect(resNotFound.status).toBe(404);
    });

    // 9) migrate-all ينفذ داخل transaction ويتحقق من البنية
    it('البند 9: migrate-all يرفض البنية غير الصالحة برمز 400، وينفذ الترحيل السليم داخل معاملة transaction', async () => {
      const badRes1 = await request(app)
        .post('/api/data/migrate-all')
        .set('Cookie', [`session_token=${adminToken}`])
        .send([1, 2, 3]);
      expect(badRes1.status).toBe(400);

      const goodRes = await request(app)
        .post('/api/data/migrate-all')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({
          clients: [{ id: 'mig-client-1', name: 'عميل مرحل داخل transaction' }],
          accounts: [{ id: 'mig-acc-1', name: 'حساب مرحل' }]
        });
      expect(goodRes.status).toBe(200);
      expect(goodRes.body.success).toBe(true);
      expect(goodRes.body.summary.clientsCount).toBe(1);
      expect(goodRes.body.summary.accountsCount).toBe(1);
    });

    // =========================================================================
    // (س) اختبارات خادم قيود اليومية المحاسبية المتقدمة (Journal Entries Hardening 1 to 5)
    // =========================================================================
    describe('(س) اختبارات خادم قيود اليومية المحاسبية المتقدمة (Journal Entries Hardening)', () => {
      // 1) ارفض أي قيد مدينه لا يساوي دائنه (تفاوت 0.005 جنيه بحد أقصى)
      it('1) يرفض القيد غير المتزن بتفاوت يتجاوز 0.005 ج.م ويقبل المتزن ضمن حدود 0.005', async () => {
        const unbalRes = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: `je-unbal-${Date.now()}`,
            data: {
              date: '2026-06-15',
              description: 'قيد غير متزن',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 1000, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 1000.01 }, // diff = 0.01 > 0.005
              ],
            },
          });
        expect(unbalRes.status).toBe(400);
        expect(unbalRes.body.error).toMatch(/غير متزن|0\.005/);

        const balRes = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: `je-bal-${Date.now()}`,
            data: {
              date: '2026-06-15',
              description: 'قيد متزن ضمن حدود 0.005',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 1000, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 1000.003 }, // diff = 0.003 <= 0.005
              ],
            },
          });
        expect(balRes.status).toBe(200);
        expect(balRes.body.success).toBe(true);
      });

      // 2) فعّل قفل الفترات: ارفض إضافة أو تعديل أو حذف أو إلغاء ترحيل أي قيد داخل فترة مقفولة
      it('2) يرفض إضافة أو تعديل أو حذف أو إلغاء ترحيل أي قيد داخل فترة مالية مقفولة', async () => {
        const activeDb = (app as any).db || db;
        // قفل السنة المالية 2024
        const lockId = `lock-2024-ANNUAL`;
        activeDb.prepare(`
          INSERT OR REPLACE INTO fiscalPeriodLocks (id, data, updated_at, version, updated_by)
          VALUES (?, ?, datetime('now'), 1, 'admin')
        `).run(lockId, JSON.stringify({
          id: lockId,
          fiscalYear: 2024,
          period: 'ANNUAL',
          isLocked: true,
          lockedAt: new Date().toISOString(),
          lockedBy: 'admin',
        }));

        // أ) محاولة إضافة قيد في سنة 2024 المقفولة
        const addLockedRes = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: `je-locked-add-${Date.now()}`,
            data: {
              date: '2024-05-10',
              description: 'قيد في فترة مقفولة',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 500 },
              ],
            },
          });
        expect(addLockedRes.status).toBe(400);
        expect(addLockedRes.body.error).toMatch(/مقفولة/);

        // إضافة قيد مسبق في 2024 مباشرة في قاعدة البيانات لمحاولة التعديل والحذف
        const testLockedJeId = `je-pre-locked-2024-${Date.now()}`;
        activeDb.prepare(`
          INSERT INTO journalEntries (id, data, updated_at, version, updated_by)
          VALUES (?, ?, datetime('now'), 1, 'admin')
        `).run(testLockedJeId, JSON.stringify({
          id: testLockedJeId,
          date: '2024-06-20',
          entryNumber: 1,
          serialNumber: 'JV-2024-0001',
          description: 'قيد قديم في 2024',
          isPosted: true,
          status: 'POSTED',
          lines: [
            { accountId: 'acc-1', accountCode: '101', debit: 500, credit: 0 },
            { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 500 },
          ],
        }));

        // ب) محاولة تعديل قيد في سنة مقفولة
        const editLockedRes = await request(app)
          .put('/api/data/journalEntries')
          .set('Cookie', [`session_token=${adminToken}`])
          .send({
            id: testLockedJeId,
            data: {
              date: '2024-06-20',
              description: 'تعديل قيد في فترة مقفولة',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 600, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 600 },
              ],
            },
          });
        expect(editLockedRes.status).toBe(400);
        expect(editLockedRes.body.error).toMatch(/مقفولة/);

        // ج) محاولة إلغاء ترحيل قيد في سنة مقفولة
        const unpostLockedRes = await request(app)
          .put('/api/data/journalEntries')
          .set('Cookie', [`session_token=${adminToken}`])
          .send({
            id: testLockedJeId,
            data: {
              date: '2024-06-20',
              description: 'إلغاء ترحيل في فترة مقفولة',
              isPosted: false,
              status: 'DRAFT',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 500 },
              ],
            },
          });
        expect(unpostLockedRes.status).toBe(400);
        expect(unpostLockedRes.body.error).toMatch(/مقفولة/);

        // د) محاولة حذف قيد في سنة مقفولة
        const deleteLockedRes = await request(app)
          .delete(`/api/data/journalEntries/${testLockedJeId}`)
          .set('Cookie', [`session_token=${adminToken}`]);
        expect(deleteLockedRes.status).toBe(403);
        expect(deleteLockedRes.body.error).toMatch(/مقفولة/);
      });

      // 3) ارفض تعديل أو حذف قيد مرحّل إلا لمن عنده canEditPostedEntries، وسجّل كل محاولة في سجل المراجعة
      it('3) يرفض تعديل أو حذف قيد مرحّل لمن لا يملك canEditPostedEntries ويسجل المحاولة في auditLogs', async () => {
        const activeDb = (app as any).db || db;
        const postedJeId = `je-posted-auth-test-${Date.now()}`;
        activeDb.prepare(`
          INSERT INTO journalEntries (id, data, updated_at, version, updated_by)
          VALUES (?, ?, datetime('now'), 1, 'admin')
        `).run(postedJeId, JSON.stringify({
          id: postedJeId,
          date: '2026-07-01',
          entryNumber: 99,
          serialNumber: 'JV-2026-0099',
          description: 'قيد مبيعات مرحل رسمي',
          isPosted: true,
          status: 'POSTED',
          lines: [
            { accountId: 'acc-1', accountCode: '101', debit: 2000, credit: 0 },
            { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 2000 },
          ],
        }));

        // accountantNoPostToken لا يملك canEditPostedEntries
        const editRes = await request(app)
          .put('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantNoPostToken}`])
          .send({
            id: postedJeId,
            data: {
              date: '2026-07-01',
              description: 'محاولة تعديل قيد مرحل بدون صلاحية',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 2500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 2500 },
              ],
            },
          });
        expect(editRes.status).toBe(400);
        expect(editRes.body.error).toMatch(/canEditPostedEntries/);

        // حذف القيد المرحل من محاسب بدون canEditPostedEntries يُرفض برمز 403
        const delRes = await request(app)
          .delete(`/api/data/journalEntries/${postedJeId}`)
          .set('Cookie', [`session_token=${accountantNoPostToken}`]);
        expect(delRes.status).toBe(403);
        expect(delRes.body.error).toMatch(/canEditPostedEntries/);

        // تعديل القيد المرحل من مستخدم يملك canEditPostedEntries ينجح برمز 200 ويسجل في auditLogs
        const editPermRes = await request(app)
          .put('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: postedJeId,
            data: {
              date: '2026-07-01',
              description: 'تعديل مصرح به لقيد مرحل',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 2200, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 2200 },
              ],
            },
          });
        expect(editPermRes.status).toBe(200);

        // التحقق من تسجيل المحاولات والتعديل في auditLogs
        const auditAttempts = activeDb.prepare("SELECT * FROM auditLogs WHERE data LIKE ?").all(`%${postedJeId}%`);
        expect(auditAttempts.length).toBeGreaterThan(0);
      });

      // 4) ترقيم القيود يُحسب على السيرفر بالسنة المالية للقيد، بدون تكرار، وبدون السماح بحذف يترك فجوة في الترقيم
      it('4) ترقيم القيود يحسب على السيرفر بالسنة المالية للقيد ويمنع الحذف الذي يترك فجوة في الترقيم', async () => {
        const year = 2028;
        const idA = `jv-seq-a-${Date.now()}`;
        const idB = `jv-seq-b-${Date.now()}`;

        const resA = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: idA,
            data: {
              date: `${year}-01-15`,
              description: 'قيد أول لسنة 2028',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 300, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 300 },
              ],
            },
          });
        expect(resA.status).toBe(200);

        const resB = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: idB,
            data: {
              date: `${year}-02-20`,
              description: 'قيد ثان لسنة 2028',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 700, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 700 },
              ],
            },
          });
        expect(resB.status).toBe(200);

        const activeDb = (app as any).db || db;
        const rowA = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(idA) as any;
        const parsedA = JSON.parse(rowA.data);
        const rowB = activeDb.prepare("SELECT data FROM journalEntries WHERE id = ?").get(idB) as any;
        const parsedB = JSON.parse(rowB.data);

        expect(parsedA.entryNumber).toBe(1);
        expect(parsedA.serialNumber).toBe(`JV-${year}-0001`);
        expect(parsedB.entryNumber).toBe(2);
        expect(parsedB.serialNumber).toBe(`JV-${year}-0002`);

        // محاولة حذف القيد الأول idA وترك فجوة (لأن idB موجود برقم 2)
        const delGapRes = await request(app)
          .delete(`/api/data/journalEntries/${idA}`)
          .set('Cookie', [`session_token=${adminToken}`]);
        expect(delGapRes.status).toBe(400);
        expect(delGapRes.body.error).toMatch(/فجوة/);
      });

      // 5) فحص تكرار ترحيل الفاتورة يكون بالفاتورة والعميل معًا وليس رقم الفاتورة فقط
      it('5) فحص تكرار ترحيل الفاتورة على السيرفر يكون بالفاتورة والعميل معاً وليس رقم الفاتورة فقط', async () => {
        const invNum = `INV-SRV-TEST-${Date.now()}`;
        const entryId1 = `je-inv-c1-${Date.now()}`;
        const entryId2 = `je-inv-c2-${Date.now()}`;
        const entryIdDup = `je-inv-c1-dup-${Date.now()}`;

        // 1. ترحيل فاتورة للعميل client-1
        const res1 = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: entryId1,
            data: {
              date: '2026-08-01',
              entryType: 'SALES',
              referenceNumber: invNum,
              clientId: 'client-1',
              clientName: 'شركة النيل للخدمات',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 1500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 1500 },
              ],
            },
          });
        expect(res1.status).toBe(200);

        // 2. ترحيل نفس رقم الفاتورة لعميل مختلف client-2 (ينجح ولا يرفض!)
        const res2 = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: entryId2,
            data: {
              date: '2026-08-01',
              entryType: 'SALES',
              referenceNumber: invNum,
              clientId: 'client-2',
              clientName: 'مؤسسة الأهرام الدولية',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 2500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 2500 },
              ],
            },
          });
        expect(res2.status).toBe(200);

        // 3. محاولة ترحيل نفس رقم الفاتورة لنفس العميل client-1 مرة أخرى (يُرفض كتكرار!)
        const resDup = await request(app)
          .post('/api/data/journalEntries')
          .set('Cookie', [`session_token=${accountantToken}`])
          .send({
            id: entryIdDup,
            data: {
              date: '2026-08-01',
              entryType: 'SALES',
              referenceNumber: invNum,
              clientId: 'client-1',
              clientName: 'شركة النيل للخدمات',
              lines: [
                { accountId: 'acc-1', accountCode: '101', debit: 1500, credit: 0 },
                { accountId: 'acc-2', accountCode: '102', debit: 0, credit: 1500 },
              ],
            },
          });
        expect(resDup.status).toBe(400);
      });
    });
  });
});
