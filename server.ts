import express from 'express';
import path from 'path';
import os from 'os';
import { DatabaseSync as Database } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  ensureUsersAndSessionsSchema,
  setupOrResetDesktopAdmin,
  getInitialAdminCredentials,
} from './src/server/desktopAdmin.js';
import { setupMgDesignerRoutes } from './src/server/mgDesignerRoutes.js';
import { whatsappServerEngine } from './server/whatsappServerEngine.js';

const PORT = process.env.NODE_ENV === 'production' ? (Number(process.env.PORT) || 3000) : 3000;
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(os.tmpdir(), 'mg_account.sqlite');

export const sqliteDb = new Database(DB_PATH);
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
  CREATE TABLE IF NOT EXISTS app_database_state (
    id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS daily_backups (
    id TEXT PRIMARY KEY,
    date_key TEXT UNIQUE NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tax_secret_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_email TEXT,
    client_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  );
`);

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function maskClientData(
  text: string,
  clientInfo?: { name?: string; taxId?: string; address?: string }
): string {
  let masked = String(text || '');
  if (clientInfo?.name && clientInfo.name.trim().length > 2) {
    const escaped = clientInfo.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(escaped, 'gi'), '[CLIENT_NAME_REDACTED]');
  }
  if (clientInfo?.taxId && clientInfo.taxId.trim()) {
    const escaped = clientInfo.taxId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(escaped, 'gi'), '[TAX_ID_REDACTED]');
  }
  if (clientInfo?.address && clientInfo.address.trim().length > 3) {
    const escaped = clientInfo.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(escaped, 'gi'), '[ADDRESS_REDACTED]');
  }
  // Egyptian Tax Registration Number (9 digits or 3-3-3)
  masked = masked.replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g, '[TAX_ID_REDACTED]');
  // Egyptian National ID (14 digits starting with 2 or 3)
  masked = masked.replace(/\b[23]\d{13}\b/g, '[NATIONAL_ID_REDACTED]');
  // Egyptian Mobile Numbers
  masked = masked.replace(/\b01[0125]\d{8}\b/g, '[PHONE_REDACTED]');
  return masked;
}

export function getAuthenticatedUserFromRequest(req: express.Request): {
  id: number;
  name: string;
  email: string;
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
  tokenHash: string;
} | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const nowIso = new Date().toISOString();

  const sessionRow = sqliteDb
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(tokenHash) as { user_id: number; expires_at: string } | undefined;

  if (!sessionRow || sessionRow.expires_at <= nowIso) {
    if (sessionRow) {
      sqliteDb.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }
    return null;
  }

  const user = sqliteDb
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(sessionRow.user_id) as any;

  if (!user || !user.is_active || user.role === 'PENDING') {
    return null;
  }

  return {
    ...user,
    tokenHash,
  };
}

export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(
    express.json({
      limit: '25mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

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

    const normalizedEmail = String(email).trim().toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    const attempt = sqliteDb
      .prepare('SELECT * FROM login_attempts WHERE email = ?')
      .get(normalizedEmail) as
      | { email: string; failed_count: number; locked_until: string | null; last_attempt: string }
      | undefined;

    if (attempt?.locked_until && new Date(attempt.locked_until) > now) {
      res.status(429).json({
        error: 'تم قفل الحساب مؤقتاً لمدة 15 دقيقة نتيجة 5 محاولات دخول خاطئة متتالية.',
        lockedUntil: attempt.locked_until,
      });
      return;
    }

    const user = sqliteDb
      .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
      .get(normalizedEmail) as any;

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      const nextCount = (attempt?.failed_count || 0) + 1;
      const lockedUntil =
        nextCount >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;

      sqliteDb
        .prepare(
          `INSERT INTO login_attempts (email, failed_count, locked_until, last_attempt)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
             failed_count = excluded.failed_count,
             locked_until = excluded.locked_until,
             last_attempt = excluded.last_attempt`
        )
        .run(normalizedEmail, nextCount, lockedUntil, nowIso);

      if (lockedUntil) {
        res.status(429).json({
          error: 'تم قفل الحساب مؤقتاً لمدة 15 دقيقة لتجاوز الحد الأقصى لمحاولات الدخول (5 محاولات).',
          lockedUntil,
        });
        return;
      }

      res.status(401).json({
        error: 'بيانات الدخول غير صحيحة',
        remainingAttempts: Math.max(0, 5 - nextCount),
      });
      return;
    }

    if (!user.is_active || user.role === 'PENDING') {
      res.status(403).json({
        error:
          user.role === 'PENDING'
            ? 'الحساب في حالة انتظار الاعتماد (PENDING) ولا يملك صلاحيات وصول بعد'
            : 'هذا الحساب موقوف حالياً',
      });
      return;
    }

    // Clear failed attempts on successful login
    sqliteDb.prepare('DELETE FROM login_attempts WHERE email = ?').run(normalizedEmail);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    sqliteDb
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .run(tokenHash, user.id, expiresAt, nowIso);

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
        canPostEntries: Boolean(user.can_post_entries),
        canEditPostedEntries: Boolean(user.can_edit_posted_entries),
        canDeleteRecords: Boolean(user.can_delete_records),
        canAccessCreditFiles: Boolean(user.can_access_credit_files),
        canAccessTaxReports: Boolean(user.can_access_tax_reports),
        mustChangePassword: Boolean(user.must_change_password),
      },
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const authUser = getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ error: 'جلسة الدخول غير صالحة أو منتهية الصلاحية' });
      return;
    }
    res.json({
      user: {
        uid: String(authUser.id),
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        isActive: Boolean(authUser.is_active),
        canManageUsers: Boolean(authUser.can_manage_users),
        canAccessTreasury: Boolean(authUser.can_access_treasury),
        canAccessAuditTrail: Boolean(authUser.can_access_audit_trail),
        canPostEntries: Boolean(authUser.can_post_entries),
        canEditPostedEntries: Boolean(authUser.can_edit_posted_entries),
        canDeleteRecords: Boolean(authUser.can_delete_records),
        canAccessCreditFiles: Boolean(authUser.can_access_credit_files),
        canAccessTaxReports: Boolean(authUser.can_access_tax_reports),
        mustChangePassword: Boolean(authUser.must_change_password),
      },
    });
  });

  app.post('/api/auth/change-password', (req, res) => {
    const authUser = getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ error: 'يجب تسجيل الدخول لتغيير كلمة المرور' });
      return;
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
      return;
    }

    if (String(newPassword).length < 10) {
      res.status(400).json({ error: 'سياسة الأمان: كلمة المرور الجديدة يجب أن تتكون من 10 أحرف على الأقل' });
      return;
    }

    const dbUser = sqliteDb
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(authUser.id) as { password_hash: string } | undefined;

    if (!dbUser || !bcrypt.compareSync(String(currentPassword), dbUser.password_hash)) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    const newHash = bcrypt.hashSync(String(newPassword), 10);
    sqliteDb
      .prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(newHash, authUser.id);

    // Terminate all other active sessions for this user
    sqliteDb
      .prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
      .run(authUser.id, authUser.tokenHash);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح وإنهاء كافة الجلسات الأخرى.',
    });
  });

  app.post('/api/tax/reveal-secrets', (req, res) => {
    const { password, clientId, reason } = req.body || {};
    if (!password || String(password).trim().length === 0) {
      res.status(400).json({ error: 'يجب إدخال كلمة مرور المستخدم للتحقق وإظهار البيانات السرية' });
      return;
    }

    const authUser = getAuthenticatedUserFromRequest(req);
    let verifiedUser: any = authUser;

    if (authUser) {
      const dbUser = sqliteDb
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(authUser.id) as any;
      if (!dbUser || !bcrypt.compareSync(String(password), dbUser.password_hash)) {
        res.status(401).json({ error: 'كلمة المرور غير صحيحة. تم رفض كشف بيانات الضرائب.' });
        return;
      }
      verifiedUser = dbUser;
    } else {
      // Fallback check against active admin user in SQLite if session token not attached yet
      const adminUser = sqliteDb
        .prepare("SELECT * FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1")
        .get() as any;
      if (adminUser && bcrypt.compareSync(String(password), adminUser.password_hash)) {
        verifiedUser = adminUser;
      } else {
        res.status(401).json({ error: 'كلمة المرور غير صحيحة أو الجلسة غير صالحة.' });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    sqliteDb
      .prepare(
        `INSERT INTO tax_secret_audit (user_id, user_email, client_id, action, details, created_at)
         VALUES (?, ?, ?, 'TAX_SECRET_VIEWED', ?, ?)`
      )
      .run(
        verifiedUser.id,
        verifiedUser.email,
        String(clientId || 'UNKNOWN'),
        String(reason || 'إظهار بيانات الدخول لبوابة الضرائب والفاتورة الإلكترونية بعد التحقق من كلمة المرور'),
        nowIso
      );

    res.json({
      success: true,
      verified: true,
      auditedAt: nowIso,
    });
  });

  app.post('/api/ai/generate', async (req, res) => {
    const authUser = getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ error: 'غير مصرح باستدعاء الذكاء الاصطناعي بدون جلسة مصادقة صالحة' });
      return;
    }

    const { prompt, clientId, clientInfo, aiDisabled } = req.body || {};
    if (aiDisabled) {
      res.status(403).json({
        error: 'تم تعطيل ميزات الذكاء الاصطناعي لهذه المنشأة بناءً على إعدادات الخصوصية والأمان.',
      });
      return;
    }

    // Also check in saved database state if client has aiDisabled = true
    if (clientId) {
      const savedStateRow = sqliteDb
        .prepare('SELECT data_json FROM app_database_state WHERE id = ?')
        .get('PRIMARY') as { data_json: string } | undefined;
      if (savedStateRow?.data_json) {
        try {
          const parsedState = JSON.parse(savedStateRow.data_json);
          const foundClient = (parsedState.clients || []).find((c: any) => c.id === clientId);
          if (foundClient?.aiDisabled) {
            res.status(403).json({
              error: 'تم تعطيل ميزات الذكاء الاصطناعي لهذه المنشأة بناءً على إعدادات الخصوصية والأمان.',
            });
            return;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'مفتاح GEMINI_API_KEY غير مهيأ في بيئة السيرفر' });
      return;
    }

    const sanitizedPrompt = maskClientData(String(prompt || ''), clientInfo);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: sanitizedPrompt,
      });
      res.json({
        success: true,
        text: response.text || '',
        maskedPromptPreview: sanitizedPrompt,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'فشل الاتصال بخدمة الذكاء الاصطناعي عبر السيرفر',
      });
    }
  });

  // SQLite Database Persistence & Daily Automatic Backup
  app.get('/api/database/state', (_req, res) => {
    try {
      const row = sqliteDb
        .prepare('SELECT data_json, updated_at, version FROM app_database_state WHERE id = ?')
        .get('PRIMARY') as { data_json: string; updated_at: string; version: number } | undefined;
      if (!row) {
        res.json({ exists: false, data: null });
        return;
      }
      res.json({
        exists: true,
        updatedAt: row.updated_at,
        version: row.version,
        data: JSON.parse(row.data_json),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'فشل قراءة قاعدة البيانات من السيرفر' });
    }
  });

  app.post('/api/database/state', (req, res) => {
    try {
      const { state } = req.body || {};
      if (!state || typeof state !== 'object') {
        res.status(400).json({ error: 'بيانات الحالة غير صالحة للحفظ' });
        return;
      }

      const nowIso = new Date().toISOString();
      const dateKey = nowIso.slice(0, 10);
      const serialized = JSON.stringify(state);

      sqliteDb
        .prepare(
          `INSERT INTO app_database_state (id, data_json, updated_at, version)
           VALUES ('PRIMARY', ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET
             data_json = excluded.data_json,
             updated_at = excluded.updated_at,
             version = app_database_state.version + 1`
        )
        .run(serialized, nowIso);

      // Automatic Daily Backup in SQLite
      const existingDaily = sqliteDb
        .prepare('SELECT id FROM daily_backups WHERE date_key = ?')
        .get(dateKey);

      if (!existingDaily) {
        sqliteDb
          .prepare('INSERT INTO daily_backups (id, date_key, data_json, created_at) VALUES (?, ?, ?, ?)')
          .run(`daily-${dateKey}`, dateKey, serialized, nowIso);
      }

      res.json({ success: true, updatedAt: nowIso, dailyBackupDate: dateKey });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'فشل حفظ البيانات في قاعدة بيانات السيرفر (SQLite)',
      });
    }
  });

  app.get('/api/database/backups', (_req, res) => {
    try {
      const rows = sqliteDb
        .prepare('SELECT id, date_key, created_at FROM daily_backups ORDER BY date_key DESC LIMIT 30')
        .all();
      res.json({ backups: rows });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذر جلب سجل النسخ الاحتياطية اليومية' });
    }
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

  // WhatsApp Webhook Verification (GET) & Signature Validation (POST)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken =
      whatsappServerEngine.getConfig().verifyToken ||
      process.env.WHATSAPP_VERIFY_TOKEN ||
      'MG_ACCOUNTING_VERIFY_TOKEN_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      res.status(200).send(String(challenge || ''));
      return;
    }
    res.status(403).json({ error: 'فشل التحقق من رمز verifyToken الخاص بـ Webhook الواتساب' });
  });

  app.post('/api/whatsapp/webhook', async (req: any, res) => {
    const signatureHeader = String(req.headers['x-hub-signature-256'] || '');
    const appSecret = process.env.WHATSAPP_APP_SECRET || 'MG_WHATSAPP_APP_SECRET_2026';

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      res.status(401).json({ error: 'توقيع Webhook الواتساب (X-Hub-Signature-256) مفقود' });
      return;
    }

    const rawBodyBuffer: Buffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expectedSig =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBodyBuffer).digest('hex');

    const sigBuf = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      res.status(401).json({ error: 'توقيع Webhook الواتساب غير صالح (Invalid Signature)' });
      return;
    }

    const result = await whatsappServerEngine.handleWebhookPayload(req.body);
    res.status(200).json(result);
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

  return app;
}

export async function startServer() {
  const app = createApp();

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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE' && PORT !== 3000) {
      console.warn(`Port ${PORT} is in use, falling back to port 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log('Server listening on http://0.0.0.0:3000');
      });
    } else {
      console.error('Server listen error:', err);
    }
  });
}

if (process.env.VITEST !== 'true') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
