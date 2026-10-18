import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface InitialAdminCredentials {
  email: string;
  password: string;
  isReset: boolean;
}

let inMemoryAdminCredentials: InitialAdminCredentials | null = null;

export function generateRandomAdminPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export function ensureUsersAndSessionsSchema(sqliteDb: any): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PENDING',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_manage_users INTEGER NOT NULL DEFAULT 0,
      can_access_treasury INTEGER NOT NULL DEFAULT 0,
      can_access_audit_trail INTEGER NOT NULL DEFAULT 0,
      can_post_entries INTEGER NOT NULL DEFAULT 0,
      can_edit_posted_entries INTEGER NOT NULL DEFAULT 0,
      can_delete_records INTEGER NOT NULL DEFAULT 0,
      can_access_credit_files INTEGER NOT NULL DEFAULT 0,
      can_access_tax_reports INTEGER NOT NULL DEFAULT 0,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_attempt TEXT NOT NULL
    );
  `);
}

export function setupOrResetDesktopAdmin(
  sqliteDb: any,
  options: { resetPassword?: boolean } = {}
): InitialAdminCredentials | null {
  ensureUsersAndSessionsSchema(sqliteDb);
  const adminEmail = 'admin@desktop.local';
  const existing = sqliteDb
    .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
    .get(adminEmail) as any;

  const totalUsers = (sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;

  if (!existing && totalUsers === 0) {
    const password = generateRandomAdminPassword(12);
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    sqliteDb
      .prepare(
        `INSERT INTO users (
          name, email, password_hash, role, is_active,
          can_manage_users, can_access_treasury, can_access_audit_trail,
          can_post_entries, can_edit_posted_entries, can_delete_records,
          can_access_credit_files, can_access_tax_reports, must_change_password, created_at
        ) VALUES (?, ?, ?, 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ?)`
      )
      .run('المدير العام', adminEmail, passwordHash, now);

    inMemoryAdminCredentials = {
      email: adminEmail,
      password,
      isReset: false,
    };
    return { ...inMemoryAdminCredentials };
  }

  if (options.resetPassword) {
    const password = generateRandomAdminPassword(12);
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    if (existing) {
      sqliteDb
        .prepare(
          `UPDATE users
           SET password_hash = ?, must_change_password = 1, is_active = 1, role = 'ADMIN'
           WHERE id = ?`
        )
        .run(passwordHash, existing.id);

      sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    } else {
      sqliteDb
        .prepare(
          `INSERT INTO users (
            name, email, password_hash, role, is_active,
            can_manage_users, can_access_treasury, can_access_audit_trail,
            can_post_entries, can_edit_posted_entries, can_delete_records,
            can_access_credit_files, can_access_tax_reports, must_change_password, created_at
          ) VALUES (?, ?, ?, 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ?)`
        )
        .run('المدير العام', adminEmail, passwordHash, now);
    }

    inMemoryAdminCredentials = {
      email: adminEmail,
      password,
      isReset: true,
    };
    return { ...inMemoryAdminCredentials };
  }

  return null;
}

export function getInitialAdminCredentials(): InitialAdminCredentials | null {
  if (!inMemoryAdminCredentials) return null;
  const creds = { ...inMemoryAdminCredentials };
  inMemoryAdminCredentials = null;
  return creds;
}

export function clearInitialAdminCredentials(): void {
  inMemoryAdminCredentials = null;
}
