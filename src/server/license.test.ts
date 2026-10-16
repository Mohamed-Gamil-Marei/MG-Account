import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { Express } from 'express';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

describe('Offline Signed License & Enforcement Test Suite (src/server/license.test.ts)', () => {
  let app: Express;
  let db: Database.Database;
  const adminToken = 'license-admin-token-12345';
  let adminUserId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_PURGE_MASTER = 'MasterPurgeSecretKey2026Strong!';
    process.env.CREDENTIALS_KEY = 'CredentialsSecretKeyDesktop2026VeryStrong64CharsLongLongLongLongLong';

    const testDbPath = path.join(os.tmpdir(), `test_license_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    const hash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Admin License', 'admin@license.test', '$2a$10$dummyHashMustChange1234567890', 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, datetime('now'))
    `);
    const info = insertAdmin.run();
    adminUserId = Number(info.lastInsertRowid);

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `);
    insertSession.run(hash, adminUserId);
  });

  it('1. يرجع حالة MISSING_OR_INVALID عندما لا يوجد ترخيص مفعل', async () => {
    const res = await request(app)
      .get('/api/license/status')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('MISSING_OR_INVALID');
  });

  it('2. يرفض تفعيل ترخيص بتوقيع غير معدل أو تالف', async () => {
    const invalidCode = 'eyJsaWNlbnNlSWQiOiJMSUMtMTIzIn0=.BADSIGNATURE';
    const res = await request(app)
      .post('/api/license/activate')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ licenseCode: invalidCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. يمنع الكتابة (POST) على المسارات عند غياب الترخيص (403 Forbidden)', async () => {
    db.prepare("DELETE FROM settings WHERE key = 'LICENSE_CODE'").run();

    const postRes = await request(app)
      .post('/api/data/clients')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({ name: 'شركة تجريبية غير مرخصة' });

    expect(postRes.status).toBe(403);
    expect(postRes.body.licenseError).toBe(true);
  });

  it('4. يسمح بالقراءة والتصدير وتسجيل الدخول حتى لو لم يوجد ترخيص', async () => {
    const getRes = await request(app)
      .get('/api/data/clients')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(getRes.status).toBe(200);
  });

  it('5. يمنع تجاوز الحد الأقصى للمستخدمين (maxUsers) عند وجود ترخيص غير صالح', async () => {
    const createRes = await request(app)
      .post('/api/users')
      .set('Cookie', [`session_token=${adminToken}`])
      .send({
        name: 'مستخدم إضافي ممنوع',
        email: 'extra@test.com',
        password: 'Password1234!',
        role: 'ACCOUNTANT',
      });

    expect(createRes.status).toBe(403); // Blocked by license enforcement middleware
  });
});
