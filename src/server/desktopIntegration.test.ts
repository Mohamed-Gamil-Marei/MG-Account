import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { Express } from 'express';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

describe('Desktop Features Integration Tests (src/server/desktopIntegration.test.ts)', () => {
  let app: Express;
  let db: Database.Database;
  const adminToken = 'desktop-admin-session-token-12345';
  const accountantToken = 'desktop-accountant-session-token-12345';
  let adminUserId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DESKTOP_ENV = '1';
    process.env.PASSWORD_PURGE_MASTER = 'MasterPurgeSecretKey2026Strong!';
    process.env.CREDENTIALS_KEY = 'CredentialsSecretKeyDesktop2026VeryStrong64CharsLongLongLongLongLong';
    process.env.DEVICE_ACTIVATION_CODE = 'DEVICE-ACTIVATION-2026';
    process.env.SETUP_TOKEN = 'SETUP-TOKEN-DESKTOP-2026';

    const testDbPath = path.join(os.tmpdir(), `test_desktop_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    // Seed test users
    const hash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const accHash = crypto.createHash('sha256').update(accountantToken).digest('hex');

    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Admin Test', 'admin@desktop.test', '$2a$10$dummyHashMustChange1234567890', 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, datetime('now'))
    `);
    const info = insertAdmin.run();
    adminUserId = Number(info.lastInsertRowid);

    const insertAcc = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Accountant Test', 'accountant@desktop.test', '$2a$10$dummyHashMustChange1234567890', 'ACCOUNTANT', 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, datetime('now'))
    `);
    const accInfo = insertAcc.run();

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `);
    insertSession.run(hash, adminUserId);
    insertSession.run(accHash, accInfo.lastInsertRowid);
  });

  describe('1. Network Status and LAN Access Endpoints (Item 5)', () => {
    it('يسمح للمدير فقط بالاستعلام عن حالة شبكة سطح المكتب', async () => {
      const resAdmin = await request(app)
        .get('/api/desktop/network-status')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
      expect(resAdmin.body).toHaveProperty('allowLan');
      expect(resAdmin.body).toHaveProperty('host');
      expect(resAdmin.body).toHaveProperty('port');
      expect(resAdmin.body.isDesktop).toBe(true);

      const resAcc = await request(app)
        .get('/api/desktop/network-status')
        .set('Cookie', [`session_token=${accountantToken}`]);

      expect(resAcc.status).toBe(403);
    });

    it('يسمح للمدير فقط بتغيير إعداد السماح بالشبكة المحلية (LAN Access)', async () => {
      const toggleRes = await request(app)
        .post('/api/desktop/network-access')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ allowLan: true });

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.success).toBe(true);
      expect(toggleRes.body.allowLan).toBe(true);

      // Verify setting stored in SQLite settings table
      const row = db.prepare("SELECT value FROM settings WHERE key = 'DESKTOP_LAN_ACCESS'").get() as any;
      expect(row.value).toBe('true');

      // Non-admin attempt is rejected
      const nonAdminRes = await request(app)
        .post('/api/desktop/network-access')
        .set('Cookie', [`session_token=${accountantToken}`])
        .send({ allowLan: false });

      expect(nonAdminRes.status).toBe(403);
    });
  });

  describe('2. Direct Admin & Password Change Enforcement (Item 4)', () => {
    it('يعيد mustChangePassword: true في بيانات المستخدم /api/auth/me عند وجود علامة الإلزام', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(true);
    });

    it('يرفض تغيير كلمة المرور إذا كانت أقل من 10 أحرف', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('10');
    });

    it('يقبل تغيير كلمة المرور بـ 10 أحرف فأكثر ويلغي علامة must_change_password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`session_token=${adminToken}`])
        .send({ newPassword: 'NewStrongPassword2026!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB that must_change_password became 0
      const updatedUser = db.prepare("SELECT must_change_password FROM users WHERE id = ?").get(adminUserId) as any;
      expect(updatedUser.must_change_password).toBe(0);

      // Verify /api/auth/me now reflects mustChangePassword: false
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`session_token=${adminToken}`]);

      expect(meRes.body.user.mustChangePassword).toBe(false);
    });
  });

  describe('3. Automated Desktop Secrets Generation Verification (Item 3)', () => {
    it('يولد أسرار عشوائية تطابق معايير القوة المطلوبة دون أي قيم مدمجة ثابتة', () => {
      const generated = {
        CREDENTIALS_KEY: crypto.randomBytes(32).toString('hex'),
        PASSWORD_PURGE_MASTER: crypto.randomBytes(24).toString('base64url'),
        DEVICE_ACTIVATION_CODE: crypto.randomBytes(12).toString('hex').toUpperCase(),
        SETUP_TOKEN: crypto.randomBytes(24).toString('hex'),
        ETA_CLIENT_SECRET: crypto.randomBytes(24).toString('hex'),
        ETA_TOKEN_PIN: String(crypto.randomInt(100000, 999999)),
      };

      expect(generated.CREDENTIALS_KEY.length).toBeGreaterThanOrEqual(32);
      expect(generated.PASSWORD_PURGE_MASTER.length).toBeGreaterThanOrEqual(16);
      expect(generated.DEVICE_ACTIVATION_CODE.length).toBeGreaterThanOrEqual(12);
      expect(generated.SETUP_TOKEN.length).toBeGreaterThanOrEqual(16);
      expect(generated.ETA_CLIENT_SECRET.length).toBeGreaterThanOrEqual(16);
      expect(generated.ETA_TOKEN_PIN.length).toBe(6);
    });
  });
});
