import express from 'express';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  ensureUsersAndSessionsSchema,
  setupOrResetDesktopAdmin,
  getInitialAdminCredentials,
} from './src/server/desktopAdmin.js';
import { setupMgDesignerRoutes } from './src/server/mgDesignerRoutes.js';
import { whatsappServerEngine } from './server/whatsappServerEngine.js';

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'mg_account.sqlite');

const sqliteDb = new Database(DB_PATH);
ensureUsersAndSessionsSchema(sqliteDb);
setupOrResetDesktopAdmin(sqliteDb);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS issued_documents (
    verification_code TEXT PRIMARY KEY,
    document_type TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    firm_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    display_doc_number TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cloud_backups (
    id TEXT PRIMARY KEY,
    firm_name TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export async function startServer() {
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/initial-setup', (_req, res) => {
    const creds = getInitialAdminCredentials();
    res.json({ hasCredentials: Boolean(creds), credentials: creds });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
      return;
    }
    const user = sqliteDb
      .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
      .get(String(email).trim()) as
      | {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          role: string;
          is_active: number;
          can_manage_users: number;
          can_access_treasury: number;
          can_access_audit_trail: number;
          can_post_entries: number;
          can_edit_posted_entries: number;
          can_delete_records: number;
          can_access_credit_files: number;
          can_access_tax_reports: number;
          must_change_password: number;
        }
      | undefined;

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({ error: 'هذا الحساب موقوف حالياً' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    sqliteDb
      .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(token, user.id, expiresAt);

    res.json({
      token,
      user: {
        uid: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: Boolean(user.is_active),
        canManageUsers: Boolean(user.can_manage_users),
        canAccessTreasury: Boolean(user.can_access_treasury),
        canAccessAuditTrail: Boolean(user.can_access_audit_trail),
        mustChangePassword: Boolean(user.must_change_password),
      },
    });
  });

  app.post('/api/documents/register', (req, res) => {
    const { verificationCode, documentType, issueDate, firmName, status, displayDocNumber } = req.body || {};
    if (!verificationCode) {
      res.status(400).json({ success: false, error: 'verificationCode مطلوب' });
      return;
    }
    sqliteDb
      .prepare(
        `INSERT OR REPLACE INTO issued_documents (
          verification_code, document_type, issue_date, firm_name, status, display_doc_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(verificationCode),
        String(documentType || 'CERTIFICATE'),
        String(issueDate || new Date().toISOString().slice(0, 10)),
        String(firmName || 'مكتب المحاسب القانوني'),
        String(status || 'ACTIVE'),
        String(displayDocNumber || ''),
        new Date().toISOString()
      );
    res.json({ success: true, verificationCode });
  });

  app.get('/api/documents/verify/:code', (req, res) => {
    const row = sqliteDb
      .prepare('SELECT * FROM issued_documents WHERE verification_code = ?')
      .get(req.params.code) as
      | {
          verification_code: string;
          document_type: string;
          issue_date: string;
          firm_name: string;
          status: string;
          display_doc_number: string;
          created_at: string;
        }
      | undefined;
    if (!row) {
      res.status(404).json({ valid: false, message: 'لم يتم العثور على المستند في السجل المركزي' });
      return;
    }
    res.json({
      valid: row.status === 'ACTIVE',
      document: {
        verificationCode: row.verification_code,
        documentType: row.document_type,
        issueDate: row.issue_date,
        firmName: row.firm_name,
        status: row.status,
        displayDocNumber: row.display_doc_number,
        createdAt: row.created_at,
      },
    });
  });

  app.get('/api/whatsapp/status', (_req, res) => {
    res.json(whatsappServerEngine.getSessionStatus());
  });
  app.post('/api/whatsapp/start', async (_req, res) => {
    res.json(await whatsappServerEngine.startBaileysSession());
  });
  app.post('/api/whatsapp/disconnect', async (_req, res) => {
    res.json(await whatsappServerEngine.disconnectBaileysSession());
  });
  app.post('/api/whatsapp/send', async (req, res) => {
    const { to, message, clientName } = req.body || {};
    res.json(await whatsappServerEngine.sendMessageDirect(to, message, { clientName }));
  });
  app.post('/api/whatsapp/send-document', async (req, res) => {
    const { to, fileBase64, fileName, mimetype, caption } = req.body || {};
    res.json(await whatsappServerEngine.sendDocumentDirect(to, fileBase64, fileName, mimetype, caption));
  });
  app.get('/api/whatsapp/threads', (_req, res) => {
    res.json({ threads: whatsappServerEngine.getChatThreads() });
  });
  app.get('/api/whatsapp/messages/:phone', (req, res) => {
    res.json({ messages: whatsappServerEngine.getChatMessages(req.params.phone) });
  });

  setupMgDesignerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
