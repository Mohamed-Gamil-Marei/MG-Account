import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { Express } from 'express';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

describe('Offline Signed License & Enforcement Test Suite (src/server/license.test.ts)', () => {
  let app: Express;
  let db: Database.Database;
  const adminToken = 'license-admin-token-12345';
  const accountantToken = 'license-accountant-token-67890';
  let adminUserId: number;
  let accountantUserId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_PURGE_MASTER = 'MasterPurgeSecretKey2026Strong!';
    process.env.CREDENTIALS_KEY = 'CredentialsSecretKeyDesktop2026VeryStrong64CharsLongLongLongLongLong';

    const testDbPath = path.join(os.tmpdir(), `test_license_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    // Seed Admin
    const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Admin License', 'admin@license.test', '$2a$10$dummyHashMustChange1234567890', 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, datetime('now'))
    `);
    const infoAdmin = insertAdmin.run();
    adminUserId = Number(infoAdmin.lastInsertRowid);

    // Seed Accountant
    const accHash = crypto.createHash('sha256').update(accountantToken).digest('hex');
    const insertAcc = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Accountant License', 'acc@license.test', '$2a$10$dummyHashMustChange1234567890', 'ACCOUNTANT', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, datetime('now'))
    `);
    const infoAcc = insertAcc.run();
    accountantUserId = Number(infoAcc.lastInsertRowid);

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `);
    insertSession.run(adminHash, adminUserId);
    insertSession.run(accHash, accountantUserId);
  });

  it('1. يرجع حالة MISSING_OR_INVALID عندما لا يوجد ترخيص مفعل', async () => {
    const res = await request(app)
      .get('/api/license/status')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('MISSING_OR_INVALID');
  });

  it('2. يرفض تفعيل الترخيص للمستخدمين غير المدراء (ACCOUNTANT) برمز 403', async () => {
    const res = await request(app)
      .post('/api/license/activate')
      .set('Cookie', [`session_token=${accountantToken}`])
      .send({ licenseCode: 'SOME-LICENSE-CODE' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('تفعيل الترخيص مقتصر على مدير النظام');
  });

  it('3. يرفض تفعيل ترخيص بتوقيع غير صالح أو معدل', async () => {
    const invalidCode = 'eyJsaWNlbnNlSWQiOiJMSUMtMTIzIn0=.BADSIGNATURE';
    const res = await request(app)
      .post('/api/license/activate')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ licenseCode: invalidCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('4. يرفض ترخيصاً تم التلاعب بحمولة بياناته (Tampered Payload)', async () => {
    const privateKeyPem = fs.readFileSync(path.join(process.cwd(), 'keys/private.pem'), 'utf8');

    // Create valid payload
    const originalPayload = {
      licenseId: 'LIC-TEST-1001',
      officeName: 'مكتب المحاسبة المعتمد',
      plan: 'ONLINE',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      maxUsers: 15,
      mode: 'ONLINE',
      features: { cloudSync: true, ai: true, whatsapp: true, eta: true },
    };

    const origB64 = Buffer.from(JSON.stringify(originalPayload), 'utf8').toString('base64');
    const signature = crypto.sign(null, Buffer.from(origB64, 'utf8'), crypto.createPrivateKey(privateKeyPem));
    const sigB64 = signature.toString('base64');

    // Tamper payload: change maxUsers to 999 without updating signature
    const tamperedPayload = { ...originalPayload, maxUsers: 999 };
    const tamperedB64 = Buffer.from(JSON.stringify(tamperedPayload), 'utf8').toString('base64');
    const tamperedCode = `${tamperedB64}.${sigB64}`;

    const res = await request(app)
      .post('/api/license/activate')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ licenseCode: tamperedCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('توقيع الترخيص غير مصرح به أو تم التلاعب به');
  });

  it('5. يفعّل الترخيص الأصلي الموقّع بنجاح ويرجع المزايا والوضع باللغة العربية', async () => {
    const privateKeyPem = fs.readFileSync(path.join(process.cwd(), 'keys/private.pem'), 'utf8');

    const validPayload = {
      licenseId: 'LIC-TEST-SUCCESS',
      officeName: 'مكتب جميل مرعي للمحاسبة والمراجعة',
      plan: 'ONLINE',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      maxUsers: 25,
      mode: 'ONLINE',
      features: { cloudSync: true, ai: true, whatsapp: true, eta: true },
    };

    const payloadB64 = Buffer.from(JSON.stringify(validPayload), 'utf8').toString('base64');
    const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), crypto.createPrivateKey(privateKeyPem));
    const sigB64 = signature.toString('base64');
    const validCode = `${payloadB64}.${sigB64}`;

    const res = await request(app)
      .post('/api/license/activate')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ licenseCode: validCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('VALID');
    expect(res.body.mode).toBe('ONLINE');
    expect(res.body.features.cloudSync).toBe(true);
    expect(res.body.payload.officeName).toBe('مكتب جميل مرعي للمحاسبة والمراجعة');
  });

  it('6. يمنع الكتابة (POST) عند مسح الترخيص ويرفض غير المصرح لهم', async () => {
    db.prepare("DELETE FROM settings WHERE key = 'LICENSE_CODE'").run();

    const postRes = await request(app)
      .post('/api/data/clients')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ name: 'شركة تجريبية غير مرخصة' });

    expect(postRes.status).toBe(403);
    expect(postRes.body.licenseError).toBe(true);
  });

  it('7. يسمح بالقراءة والتصدير وتسجيل الدخول بدون ترخيص', async () => {
    const getRes = await request(app)
      .get('/api/data/clients')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(getRes.status).toBe(200);
  });
});
