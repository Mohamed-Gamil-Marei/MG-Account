import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { Express } from 'express';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

describe('Device Activation Code Security & Server Startup Test Suite', () => {
  let app: Express;
  let db: Database.Database;
  const adminToken = 'device-code-admin-token-12345';
  const accountantToken = 'device-code-accountant-token-67890';
  let adminUserId: number;
  let accountantUserId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_PURGE_MASTER = 'MasterPurgeSecretKey2026Strong!';
    process.env.CREDENTIALS_KEY = 'CredentialsSecretKeyDesktop2026VeryStrong64CharsLongLongLongLongLong';
    process.env.DEVICE_ACTIVATION_CODE = 'TEST_DEVICE_ACTIVATION_CODE_SECURE_2026';

    const testDbPath = path.join(os.tmpdir(), `test_device_act_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    // Seed Admin
    const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Admin Device', 'admin@device.test', '$2a$10$dummyHashMustChange1234567890', 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, datetime('now'))
    `);
    const infoAdmin = insertAdmin.run();
    adminUserId = Number(infoAdmin.lastInsertRowid);

    // Seed Accountant
    const accHash = crypto.createHash('sha256').update(accountantToken).digest('hex');
    const insertAcc = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Accountant Device', 'acc@device.test', '$2a$10$dummyHashMustChange1234567890', 'ACCOUNTANT', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, datetime('now'))
    `);
    const infoAcc = insertAcc.run();
    accountantUserId = Number(infoAcc.lastInsertRowid);

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `);
    insertSession.run(adminHash, adminUserId);
    insertSession.run(accHash, accountantUserId);

    // Seed valid license code so license enforcement middleware passes
    const privateKeyPem = fs.readFileSync(path.join(process.cwd(), 'keys/private.pem'), 'utf8');
    const licensePayload = {
      licenseId: 'LIC-DEVICE-TEST',
      officeName: 'مكتب الاختبارات',
      plan: 'OFFICE',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      maxUsers: 20,
      mode: 'OFFLINE',
      features: { cloudSync: true, ai: true, whatsapp: true, eta: true },
    };
    const pB64 = Buffer.from(JSON.stringify(licensePayload), 'utf8').toString('base64');
    const sig = crypto.sign(null, Buffer.from(pB64, 'utf8'), crypto.createPrivateKey(privateKeyPem)).toString('base64');
    const validLicenseCode = `${pB64}.${sig}`;

    db.prepare(`
      INSERT INTO settings (key, value, updated_at, updated_by)
      VALUES ('LICENSE_CODE', ?, datetime('now'), 'system')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(validLicenseCode);
  });

  it('1. يرفض السيرفر التشغيل في بيئة الإنتاج لو DEVICE_ACTIVATION_CODE ناقص أو أقل من 12 حرف', async () => {
    const oldCode = process.env.DEVICE_ACTIVATION_CODE;
    const oldNodeEnv = process.env.NODE_ENV;

    try {
      delete process.env.DEVICE_ACTIVATION_CODE;
      process.env.NODE_ENV = 'production';
      await expect(createApp()).rejects.toThrow('Missing or invalid production environment variables');

      process.env.DEVICE_ACTIVATION_CODE = 'SHORT_CODE';
      await expect(createApp()).rejects.toThrow('DEVICE_ACTIVATION_CODE (min 12 chars)');
    } finally {
      process.env.DEVICE_ACTIVATION_CODE = oldCode;
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  it('2. يرفض محاولة تصريح الجهاز عند إدخال كود تفعيل خاطئ برمز 401', async () => {
    const res = await request(app)
      .post('/api/auth/authorize-device')
      .send({
        passcode: 'WRONG_INVALID_ACTIVATION_CODE',
        customDeviceName: 'جهاز جديد غير مصرح',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('رمز الماستر كود غير صحيح');
  });

  it('3. يرفض طلب إظهار كود التفعيل للمستخدمين غير المدراء (ACCOUNTANT) برمز 403', async () => {
    const res = await request(app)
      .get('/api/settings/reveal-activation-code')
      .set('Cookie', [`session_token=${accountantToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('مقتصر حصرياً على مدير النظام');
  });

  it('4. يسمح للمدير (ADMIN) بإظهار كود التفعيل ويسجل العملية فوراً في auditLogs', async () => {
    const res = await request(app)
      .get('/api/settings/reveal-activation-code')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.code).toBe(process.env.DEVICE_ACTIVATION_CODE);

    // Verify audit log entry in auditLogs table
    const rows = db.prepare(`
      SELECT * FROM auditLogs 
      ORDER BY updated_at DESC
    `).all() as any[];

    const auditRow = rows.find((r) => {
      try {
        const parsed = JSON.parse(r.data);
        return parsed.action === 'REVEAL_DEVICE_ACTIVATION_CODE';
      } catch {
        return false;
      }
    });

    expect(auditRow).toBeDefined();
    const parsedData = JSON.parse(auditRow.data);
    expect(parsedData.action).toBe('REVEAL_DEVICE_ACTIVATION_CODE');
    expect(parsedData.userName).toBe('Admin Device');
  });
});
