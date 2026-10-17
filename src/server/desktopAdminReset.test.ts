import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import os from 'os';
import path from 'path';
import fs from 'fs';
import {
  setupOrResetDesktopAdmin,
  getInitialAdminCredentials,
  clearInitialAdminCredentials,
} from './desktopAdmin';

describe('Desktop Local Safe Admin Recovery (--reset-admin-password)', () => {
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    clearInitialAdminCredentials();
    dbPath = path.join(os.tmpdir(), `test_desktop_admin_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    db = new Database(dbPath);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch {}
    clearInitialAdminCredentials();
  });

  it('1. تهيئة أولية لسطح المكتب عندما تكون قاعدة البيانات فارغة: ينشئ admin@desktop.local مع must_change_password=1', () => {
    const creds = setupOrResetDesktopAdmin(db, { resetPassword: false });
    expect(creds).not.toBeNull();
    expect(creds?.email).toBe('admin@desktop.local');
    expect(creds?.password.length).toBe(12);
    expect(creds?.isReset).toBe(false);

    // Verify user in SQLite
    const user = db.prepare("SELECT * FROM users WHERE email = 'admin@desktop.local'").get() as any;
    expect(user).toBeDefined();
    expect(user.role).toBe('ADMIN');
    expect(user.must_change_password).toBe(1);
    expect(user.is_active).toBe(1);

    // Verify password hash matches
    const isValid = bcrypt.compareSync(creds!.password, user.password_hash);
    expect(isValid).toBe(true);

    // Verify getInitialAdminCredentials returns credentials once and clears from memory
    const retrieved = getInitialAdminCredentials();
    expect(retrieved?.email).toBe('admin@desktop.local');

    const secondRetrieval = getInitialAdminCredentials();
    expect(secondRetrieval).toBeNull();
  });

  it('2. تشغيل بالمعامل --reset-admin-password: يولد كلمة مرور مؤقتة جديدة ويلغي جلسات المستخدم ويعمل mustChangePassword=true', () => {
    // 1. Initial setup with an old password
    const oldPass = 'OldSecretPass123';
    const oldHash = bcrypt.hashSync(oldPass, 10);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PENDING',
        is_active INTEGER NOT NULL DEFAULT 1,
        can_manage_users INTEGER DEFAULT 1,
        can_access_treasury INTEGER DEFAULT 1,
        can_access_audit_trail INTEGER DEFAULT 1,
        can_post_entries INTEGER DEFAULT 1,
        can_edit_posted_entries INTEGER DEFAULT 1,
        can_delete_records INTEGER DEFAULT 1,
        can_access_credit_files INTEGER DEFAULT 1,
        can_access_tax_reports INTEGER DEFAULT 1,
        must_change_password INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);

    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, must_change_password, created_at)
      VALUES ('admin', 'admin@desktop.local', ?, 'ADMIN', 1, 0, datetime('now'))
    `).run(oldHash);

    const adminId = Number(info.lastInsertRowid);

    // Create 2 active sessions for this admin
    db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES ('session_token_1', ?, datetime('now', '+7 days'))`).run(adminId);
    db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES ('session_token_2', ?, datetime('now', '+7 days'))`).run(adminId);

    // Verify 2 sessions exist
    const sessionsBefore = (db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(adminId) as any).count;
    expect(sessionsBefore).toBe(2);

    // 2. Execute reset with --reset-admin-password flag
    const resetCreds = setupOrResetDesktopAdmin(db, { resetPassword: true });
    expect(resetCreds).not.toBeNull();
    expect(resetCreds?.email).toBe('admin@desktop.local');
    expect(resetCreds?.password.length).toBe(12);
    expect(resetCreds?.password).not.toBe(oldPass);
    expect(resetCreds?.isReset).toBe(true);

    // 3. Verify user in DB has must_change_password = 1 and new hash
    const updatedUser = db.prepare("SELECT * FROM users WHERE email = 'admin@desktop.local'").get() as any;
    expect(updatedUser.must_change_password).toBe(1);
    expect(bcrypt.compareSync(resetCreds!.password, updatedUser.password_hash)).toBe(true);
    expect(bcrypt.compareSync(oldPass, updatedUser.password_hash)).toBe(false);

    // 4. Verify all sessions for admin@desktop.local were deleted
    const sessionsAfter = (db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(adminId) as any).count;
    expect(sessionsAfter).toBe(0);
  });

  it('3. الأمان وعدم الكتابة في السجلات: كلمة المرور المؤقتة لا تُحفظ في ملفات أو سجلات وتُقرأ مرة واحدة فقط', () => {
    const creds = setupOrResetDesktopAdmin(db, { resetPassword: true });
    expect(creds?.password).toBeDefined();

    // Verify DB does not contain plain text password anywhere
    const rawSqliteDump = db.prepare("SELECT * FROM users WHERE email = 'admin@desktop.local'").get() as any;
    expect(JSON.stringify(rawSqliteDump)).not.toContain(creds!.password);

    // Verify once retrieved via getInitialAdminCredentials, it is cleared from memory
    const retrieved = getInitialAdminCredentials();
    expect(retrieved?.password).toBe(creds!.password);

    expect(getInitialAdminCredentials()).toBeNull();
  });
});
