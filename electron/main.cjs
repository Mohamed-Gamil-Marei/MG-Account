const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// 1. Single Instance Lock (Item 1)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Desktop] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let serverInstance = null;
let activePort = null;
let activeHost = '127.0.0.1';
let allowLan = false;
let initialAdminCredentials = null;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Helper to find a free port dynamically
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// 2. Data Directories Setup in app.getPath('userData') (Item 2)
function setupDataDirectories() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  const documentsDir = path.join(dataDir, 'documents');
  const backupDir = path.join(dataDir, 'backups');
  const dbPath = path.join(dataDir, 'app.db');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(documentsDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  process.env.DATA_DIR = dataDir;
  process.env.DB_PATH = dbPath;
  process.env.DOCUMENTS_DIR = documentsDir;
  process.env.BACKUP_DIR = backupDir;
  process.env.DESKTOP_ENV = '1';
  process.env.DIST_PATH = path.join(__dirname, '..', 'dist');

  // Network configuration (Item 5)
  const configPath = path.join(userDataPath, 'desktop-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      allowLan = Boolean(cfg.allowLan);
    }
  } catch {}
  activeHost = allowLan ? '0.0.0.0' : '127.0.0.1';
  process.env.HOST = activeHost;

  return { userDataPath, dataDir, dbPath, configPath };
}

// 3. Automatic Secrets Management (Item 3)
function setupSecrets(userDataPath) {
  const secretsPath = path.join(userDataPath, 'secrets.dat');
  let secrets = null;

  if (fs.existsSync(secretsPath)) {
    try {
      const raw = fs.readFileSync(secretsPath);
      if (safeStorage.isEncryptionAvailable()) {
        secrets = JSON.parse(safeStorage.decryptString(raw));
      } else {
        const key = crypto.createHash('sha256').update(userDataPath).digest();
        const iv = raw.subarray(0, 16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const dec = Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8');
        secrets = JSON.parse(dec);
      }
    } catch {
      secrets = null;
    }
  }

  if (!secrets) {
    secrets = {
      CREDENTIALS_KEY: crypto.randomBytes(32).toString('hex'), // 64 hex chars
      PASSWORD_PURGE_MASTER: crypto.randomBytes(24).toString('base64url'), // >= 16 chars
      DEVICE_ACTIVATION_CODE: crypto.randomBytes(12).toString('hex').toUpperCase(), // 24 chars
      SETUP_TOKEN: crypto.randomBytes(24).toString('hex'),
      ETA_CLIENT_SECRET: crypto.randomBytes(24).toString('hex'),
      ETA_TOKEN_PIN: String(crypto.randomInt(100000, 999999)),
    };

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const enc = safeStorage.encryptString(JSON.stringify(secrets));
        fs.writeFileSync(secretsPath, enc);
      } else {
        const key = crypto.createHash('sha256').update(userDataPath).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const enc = Buffer.concat([iv, cipher.update(Buffer.from(JSON.stringify(secrets), 'utf8')), cipher.final()]);
        fs.writeFileSync(secretsPath, enc);
      }
    } catch (err) {
      console.warn('[Desktop Secrets] Could not persist secrets securely:', err);
    }
  }

  // Pass to server process in memory (never written to plain files)
  process.env.CREDENTIALS_KEY = secrets.CREDENTIALS_KEY;
  process.env.PASSWORD_PURGE_MASTER = secrets.PASSWORD_PURGE_MASTER;
  process.env.DEVICE_ACTIVATION_CODE = secrets.DEVICE_ACTIVATION_CODE;
  process.env.SETUP_TOKEN = secrets.SETUP_TOKEN;
  process.env.ETA_CLIENT_SECRET = secrets.ETA_CLIENT_SECRET;
  process.env.ETA_TOKEN_PIN = secrets.ETA_TOKEN_PIN;
}

// 4. Direct Admin Setup on First Run (Item 4)
function setupInitialAdminIfEmpty(dbPath) {
  let db;
  try {
    db = new Database(dbPath);
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

    const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (countRow && countRow.count === 0) {
      // Generate 12-char password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
      let tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += chars[crypto.randomInt(0, chars.length)];
      }

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

      // Keep in memory ONLY for the one-time display (never log to console/disk)
      initialAdminCredentials = {
        name: 'admin',
        email: 'admin@desktop.local',
        password: tempPassword,
      };
    }
  } catch (err) {
    console.error('[Desktop Database Init Error]:', err);
  } finally {
    if (db) {
      try { db.close(); } catch {}
    }
  }
}

// 5. Start In-Process Server (Item 1)
async function startDesktopServer() {
  activePort = await getFreePort();
  process.env.PORT = String(activePort);

  // Require bundled server
  const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Server bundle not found at: ${serverPath}. Please run 'npm run build' first.`);
  }

  const { startServer } = require(serverPath);
  const appExpress = await startServer(activePort, activeHost);
  serverInstance = appExpress && appExpress.server ? appExpress.server : null;
  return activePort;
}

// Create the Electron Window
async function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'منظومة المحاسب والمراجع القانوني المتكامل',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  const appUrl = `http://127.0.0.1:${port}`;
  await mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC Handlers
function setupIpcHandlers(userDataPath, configPath) {
  // One-time Admin credentials retrieval (Item 4)
  ipcMain.handle('desktop:get-initial-admin', () => {
    const creds = initialAdminCredentials;
    initialAdminCredentials = null; // Clear immediately from memory!
    return creds;
  });

  // Backup & Restore Dialogs (Item 7)
  ipcMain.handle('desktop:choose-backup-folder', async () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ نسخة احتياطية كاملة من المنظومة',
      defaultPath: `MG_Account_Backup_${dateStr}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });
    return res.canceled ? null : res.filePath;
  });

  ipcMain.handle('desktop:choose-restore-file', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختيار ملف النسخة الاحتياطية للاستعادة',
      filters: [{ name: 'ZIP Archive / SQLite DB', extensions: ['zip', 'db'] }],
      properties: ['openFile'],
    });
    return (res.canceled || !res.filePaths.length) ? null : res.filePaths[0];
  });

  ipcMain.handle('desktop:save-backup-to-file', async (_event, targetPath) => {
    try {
      const backupUrl = `http://127.0.0.1:${activePort}/api/server-backups/download-full`;
      const res = await fetch(backupUrl);
      if (!res.ok) throw new Error('فشل تحميل ملف النسخة الاحتياطية من السيرفر المحلي.');
      const buf = await res.arrayBuffer();
      fs.writeFileSync(targetPath, Buffer.from(buf));
      return { success: true, size: buf.byteLength, path: targetPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('desktop:restore-from-file', async (_event, sourcePath) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'الملف المحدد غير موجود.' };
      }
      const dataDir = process.env.DATA_DIR;
      const dbPath = process.env.DB_PATH;

      // Close server before restoring to unlock SQLite
      if (serverInstance && typeof serverInstance.close === 'function') {
        serverInstance.close();
      }

      // If .db file directly
      if (sourcePath.endsWith('.db')) {
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        fs.copyFileSync(sourcePath, dbPath);
      } else {
        // ZIP restoration
        const JSZip = require('jszip');
        const zipData = fs.readFileSync(sourcePath);
        const zip = await JSZip.loadAsync(zipData);

        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        const dbEntry = zip.file('app.db') || zip.file('data/app.db');
        if (dbEntry) {
          const dbContent = await dbEntry.async('nodebuffer');
          fs.writeFileSync(dbPath, dbContent);
        }

        const documentsDir = process.env.DOCUMENTS_DIR;
        const docFiles = Object.keys(zip.files).filter(k => k.startsWith('documents/'));
        if (docFiles.length > 0 && fs.existsSync(documentsDir)) {
          fs.rmSync(documentsDir, { recursive: true, force: true });
          fs.mkdirSync(documentsDir, { recursive: true });
          for (const k of docFiles) {
            const entry = zip.files[k];
            if (!entry.dir) {
              const targetDocPath = path.join(dataDir, k);
              fs.mkdirSync(path.dirname(targetDocPath), { recursive: true });
              const content = await entry.async('nodebuffer');
              fs.writeFileSync(targetDocPath, content);
            }
          }
        }
      }

      // Restart server & reload window
      await startDesktopServer();
      if (mainWindow) {
        mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Network Status and LAN Access (Item 5)
  ipcMain.handle('desktop:get-network-status', () => {
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    return {
      host: activeHost,
      port: activePort,
      allowLan,
      localIps: ips,
      lanUrl: ips.length ? `http://${ips[0]}:${activePort}` : `http://127.0.0.1:${activePort}`,
    };
  });

  ipcMain.handle('desktop:set-network-access', (_event, newAllowLan) => {
    allowLan = Boolean(newAllowLan);
    fs.writeFileSync(configPath, JSON.stringify({ allowLan }, null, 2));
    return { success: true, allowLan, restartRequired: true };
  });

  ipcMain.handle('desktop:get-user-data-path', () => {
    return app.getPath('userData');
  });
}

// App Lifecycle
app.whenReady().then(async () => {
  try {
    const { userDataPath, dbPath, configPath } = setupDataDirectories();
    setupSecrets(userDataPath);
    setupInitialAdminIfEmpty(dbPath);
    setupIpcHandlers(userDataPath, configPath);

    const port = await startDesktopServer();
    await createMainWindow(port);
  } catch (err) {
    console.error('[Desktop Fatal Startup Error]:', err);
    dialog.showErrorBox('خطأ في إقلاع التطبيق', `حدث خطأ أثناء تشغيل المنظومة:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    try {
      serverInstance.close();
    } catch {}
  }
});
