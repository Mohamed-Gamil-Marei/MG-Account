import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { Express } from 'express';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

import bcrypt from 'bcryptjs';

describe('Real Server Cookie Secure Flag & LAN Network Port Integration Tests', () => {
  let app: Express;
  let db: Database.Database;
  const adminToken = 'lan-port-admin-token-12345';
  let adminUserId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_PURGE_MASTER = 'MasterPurgeSecretKey2026Strong!';
    process.env.CREDENTIALS_KEY = 'CredentialsSecretKeyDesktop2026VeryStrong64CharsLongLongLongLongLong';
    process.env.DEVICE_ACTIVATION_CODE = 'TEST_DEVICE_ACTIVATION_CODE_SECURE_2026';
    process.env.PORT = '3210';

    const testDbPath = path.join(os.tmpdir(), `test_cookie_secure_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    process.env.DB_PATH = testDbPath;

    app = await createApp();
    db = (app as any).db || new Database(testDbPath);

    // Seed Admin user with valid bcrypt password hash
    const passHash = bcrypt.hashSync('Password123!', 10);
    const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, can_manage_users, can_access_treasury, can_access_audit_trail, can_post_entries, can_edit_posted_entries, can_delete_records, can_access_credit_files, can_access_tax_reports, must_change_password, created_at)
      VALUES ('Admin Cookie', 'admin.cookie@test.com', ?, 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, datetime('now'))
    `);
    const infoAdmin = insertAdmin.run(passHash);
    adminUserId = Number(infoAdmin.lastInsertRowid);

    const insertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `);
    insertSession.run(adminHash, adminUserId);
  });

  it('1. يصدر كوكي بدون خاصية Secure ويسمح بالتسجيل عند ضبط COOKIE_SECURE=false', async () => {
    const oldCookieSecure = process.env.COOKIE_SECURE;
    process.env.COOKIE_SECURE = 'false';

    try {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.cookie@test.com',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(200);
      const setCookieHeaders = loginRes.get('Set-Cookie') || [];
      expect(setCookieHeaders.length).toBeGreaterThan(0);

      const sessionCookie = setCookieHeaders.find((c: string) => c.startsWith('session_token='));
      expect(sessionCookie).toBeDefined();

      // Verify that 'Secure' attribute is NOT present when COOKIE_SECURE=false
      expect(sessionCookie!.toLowerCase()).not.toContain('secure');

      // Verify HTTP authentication with un-secure cookie succeeds
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [sessionCookie!]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('admin.cookie@test.com');
    } finally {
      process.env.COOKIE_SECURE = oldCookieSecure;
    }
  });

  it('2. يصدر كوكي مع خاصية Secure عند ضبط COOKIE_SECURE=true', async () => {
    const oldCookieSecure = process.env.COOKIE_SECURE;
    const oldEnv = process.env.NODE_ENV;
    const oldDesktop = process.env.IS_ELECTRON_DESKTOP;

    try {
      process.env.COOKIE_SECURE = 'true';
      delete process.env.IS_ELECTRON_DESKTOP;

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.cookie@test.com',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(200);
      const setCookieHeaders = loginRes.get('Set-Cookie') || [];
      const sessionCookie = setCookieHeaders.find((c: string) => c.startsWith('session_token='));
      expect(sessionCookie).toBeDefined();

      // Verify 'Secure' attribute IS present when COOKIE_SECURE=true
      expect(sessionCookie!.toLowerCase()).toContain('secure');
    } finally {
      process.env.COOKIE_SECURE = oldCookieSecure;
      process.env.NODE_ENV = oldEnv;
      process.env.IS_ELECTRON_DESKTOP = oldDesktop;
    }
  });

  it('3. يرجع بورت السيرفر 3210 ورابط شبكة المكتب LAN كاملاً من /api/desktop/network-status للمدير', async () => {
    const statusRes = await request(app)
      .get('/api/desktop/network-status')
      .set('Cookie', [`session_token=${adminToken}`]);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.port).toBe(3210);
    expect(statusRes.body.lanUrl).toMatch(/^http:\/\/[0-9.]+:3210$/);
  });
});
