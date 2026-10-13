import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { resetUsersProcess } from '../../scripts/reset-users';

describe('reset-users script tests', () => {
  const testDir = path.join(process.cwd(), 'data', 'test_reset_users');
  const testDbPath = path.join(testDir, 'app.db');
  const testBackupDir = path.join(testDir, 'backups');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Seed test database
    const db = new Database(testDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        email TEXT,
        timestamp INTEGER,
        success INTEGER
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS auditLogs (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_by TEXT
      );
    `);

    // Insert sample rows
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@example.com', 'hash123', 'ADMIN')`).run();
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES ('Accountant User', 'accountant@example.com', 'hash456', 'ACCOUNTANT')`).run();
    db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES ('token123', 1, '2030-01-01')`).run();
    db.prepare(`INSERT INTO login_attempts (ip, email, timestamp, success) VALUES ('127.0.0.1', 'admin@example.com', 1000, 1)`).run();

    db.prepare(`INSERT INTO clients (id, data, updated_at) VALUES ('client-1', '{"name":"المصرية للتوريدات"}', '2026-01-01')`).run();
    db.prepare(`INSERT INTO invoices (id, data, updated_at) VALUES ('inv-101', '{"total":5000}', '2026-01-01')`).run();

    db.close();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('cancels deletion when confirmation string is invalid', async () => {
    const res = await resetUsersProcess({
      dbPath: testDbPath,
      backupDir: testBackupDir,
      autoConfirm: true,
      inputConfirmation: 'CANCEL',
    });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('cancelled');

    // Verify DB remains untouched
    const db = new Database(testDbPath);
    const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const sessionsCount = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count;
    const clientsCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as any).count;
    db.close();

    expect(usersCount).toBe(2);
    expect(sessionsCount).toBe(1);
    expect(clientsCount).toBe(1);
  });

  it('executes deletion safely when confirmation is RESET-USERS', async () => {
    const res = await resetUsersProcess({
      dbPath: testDbPath,
      backupDir: testBackupDir,
      autoConfirm: true,
      inputConfirmation: 'RESET-USERS',
    });

    expect(res.success).toBe(true);
    expect(res.deletedCount).toBe(2);
    expect(res.backupPath).toBeDefined();

    // Verify users, sessions, and login_attempts are cleared (0)
    const db = new Database(testDbPath);
    const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const sessionsCount = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count;
    const loginAttemptsCount = (db.prepare('SELECT COUNT(*) as count FROM login_attempts').get() as any).count;

    // Verify other data tables remain completely untouched
    const clientsCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as any).count;
    const invoicesCount = (db.prepare('SELECT COUNT(*) as count FROM invoices').get() as any).count;

    // Verify audit log entry RESET_USERS was written
    const auditRow = db.prepare("SELECT * FROM auditLogs WHERE id LIKE 'audit-reset-users-%'").get() as any;

    db.close();

    expect(usersCount).toBe(0);
    expect(sessionsCount).toBe(0);
    expect(loginAttemptsCount).toBe(0);

    expect(clientsCount).toBe(1);
    expect(invoicesCount).toBe(1);

    expect(auditRow).toBeDefined();
    const auditData = JSON.parse(auditRow.data);
    expect(auditData.action).toBe('RESET_USERS');
    expect(auditData.entity).toBe('users');
    expect(auditData.details).toContain('2');

    // Verify backup database exists and passes PRAGMA integrity_check
    expect(fs.existsSync(res.backupPath!)).toBe(true);
    const backupDb = new Database(res.backupPath!);
    const integrityRes = (backupDb.prepare('PRAGMA integrity_check').get() as any)['integrity_check'];
    const backupUsersCount = (backupDb.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    backupDb.close();

    expect(integrityRes).toBe('ok');
    expect(backupUsersCount).toBe(2); // Backup has original users before reset
  });
});
