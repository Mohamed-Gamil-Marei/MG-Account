import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface DesktopAdminCredentials {
  name: string;
  email: string;
  password: string;
  isReset?: boolean;
}

let initialAdminCredentials: DesktopAdminCredentials | null = null;

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars[crypto.randomInt(0, chars.length)];
  }
  return tempPassword;
}

export function ensureDesktopTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PENDING',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_manage_users INTEGER DEFAULT 0,
      can_access_treasury INTEGER DEFAULT 0,
      can_access_audit_trail INTEGER DEFAULT 0,
      can_post_entries INTEGER DEFAULT 0,
      can_edit_posted_entries INTEGER DEFAULT 0,
      can_delete_records INTEGER DEFAULT 0,
      can_access_credit_files INTEGER DEFAULT 0,
      can_access_tax_reports INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  try {
    db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;");
  } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
}

export function setupOrResetDesktopAdmin(
  dbOrPath: Database.Database | string,
  options: { resetPassword?: boolean } = {}
): DesktopAdminCredentials | null {
  const shouldReset = Boolean(options.resetPassword);
  let db: Database.Database | null = null;
  let closeOnExit = false;

  try {
    if (typeof dbOrPath === 'string') {
      db = new Database(dbOrPath);
      closeOnExit = true;
    } else {
      db = dbOrPath;
    }

    ensureDesktopTables(db);

    if (shouldReset) {
      const tempPassword = generateTempPassword();
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(tempPassword, salt);
      const now = new Date().toISOString();

      const existingAdmin = db.prepare("SELECT * FROM users WHERE email = 'admin@desktop.local'").get() as any;

      if (existingAdmin) {
        db.prepare(`
          UPDATE users
          SET password_hash = ?,
              must_change_password = 1,
              is_active = 1
          WHERE email = 'admin@desktop.local'
        `).run(hash);

        try {
          db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existingAdmin.id);
        } catch {}
      } else {
        db.prepare(`
          INSERT INTO users (
            name, email, password_hash, role, is_active,
            can_manage_users, can_access_treasury, can_access_audit_trail,
            can_post_entries, can_edit_posted_entries, can_delete_records,
            can_access_credit_files, can_access_tax_reports,
            must_change_password, created_at
          ) VALUES (
            'admin', 'admin@desktop.local', ?, 'ADMIN', 1,
            1, 1, 1,
            1, 1, 1,
            1, 1,
            1, ?
          )
        `).run(hash, now);
      }

      // Memory only - never write to disk or console/logs
      initialAdminCredentials = {
        name: existingAdmin ? existingAdmin.name : 'admin',
        email: 'admin@desktop.local',
        password: tempPassword,
        isReset: true,
      };
      return initialAdminCredentials;
    } else {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      if (countRow && countRow.count === 0) {
        const tempPassword = generateTempPassword();
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(tempPassword, salt);
        const createdAt = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (
            name, email, password_hash, role, is_active,
            can_manage_users, can_access_treasury, can_access_audit_trail,
            can_post_entries, can_edit_posted_entries, can_delete_records,
            can_access_credit_files, can_access_tax_reports,
            must_change_password, created_at
          ) VALUES (
            'admin', 'admin@desktop.local', ?, 'ADMIN', 1,
            1, 1, 1,
            1, 1, 1,
            1, 1,
            1, ?
          )
        `).run(hash, createdAt);

        // Memory only
        initialAdminCredentials = {
          name: 'admin',
          email: 'admin@desktop.local',
          password: tempPassword,
          isReset: false,
        };
        return initialAdminCredentials;
      }
    }
    return null;
  } catch (err) {
    console.error('[Desktop Database Admin Setup Error]:', err);
    return null;
  } finally {
    if (closeOnExit && db) {
      try { db.close(); } catch {}
    }
  }
}

export function getInitialAdminCredentials(): DesktopAdminCredentials | null {
  const creds = initialAdminCredentials;
  initialAdminCredentials = null; // Clear immediately from memory!
  return creds;
}

export function peekInitialAdminCredentials(): DesktopAdminCredentials | null {
  return initialAdminCredentials;
}

export function clearInitialAdminCredentials(): void {
  initialAdminCredentials = null;
}
