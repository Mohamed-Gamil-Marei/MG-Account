const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const {
  setupOrResetDesktopAdmin,
  getInitialAdminCredentials,
} = require('./desktopAdmin.cjs');

// 1. Single Instance Lock
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
let preferredPort = 3210;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Helper to find an available port starting at startPort (Default: 3210)
function getAvailablePort(startPort = 3210, host = '0.0.0.0') {
  return new Promise((resolve) => {
    let port = startPort;
    const checkPort = (p) => {
      const server = http.createServer();
      server.once('error', (err) => {
        checkPort(p + 1);
      });
      server.once('listening', () => {
        server.close(() => resolve(p));
      });
      server.listen(p, host);
    };
    checkPort(port);
  });
}

// 2. Data Directories Setup in app.getPath('userData')
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
  process.env.IS_ELECTRON_DESKTOP = 'true';
  process.env.COOKIE_SECURE = 'false';
  process.env.DIST_PATH = path.join(__dirname, '..', 'dist');

  // Network configuration & Port preferences
  const configPath = path.join(userDataPath, 'desktop-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      allowLan = Boolean(cfg.allowLan);
      if (cfg.preferredPort && Number.isInteger(cfg.preferredPort)) {
        preferredPort = cfg.preferredPort;
      } else if (cfg.port && Number.isInteger(cfg.port)) {
        preferredPort = cfg.port;
      }
    }
  } catch {}

  activeHost = allowLan ? '0.0.0.0' : '127.0.0.1';
  process.env.HOST = activeHost;

  return { userDataPath, dataDir, dbPath, configPath };
}

// 3. Automatic Secrets Management
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

// 4. Start In-Process Server
async function startDesktopServer(configPath, startPort = 3210) {
  activePort = await getAvailablePort(startPort, activeHost);
  process.env.PORT = String(activePort);
  process.env.COOKIE_SECURE = 'false';
  process.env.IS_ELECTRON_DESKTOP = 'true';

  // Persist preferredPort and actualPort into desktop-config.json
  try {
    let existingCfg = {};
    if (fs.existsSync(configPath)) {
      existingCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const updatedCfg = {
      ...existingCfg,
      preferredPort: startPort || 3210,
      actualPort: activePort,
      allowLan: allowLan,
    };
    fs.writeFileSync(configPath, JSON.stringify(updatedCfg, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Desktop Config] Could not write desktop-config.json:', err);
  }

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
  ipcMain.handle('desktop:get-initial-admin', () => {
    return getInitialAdminCredentials();
  });

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

        for (const filename of Object.keys(zip.files)) {
          const zipEntry = zip.files[filename];
          if (zipEntry.isDirectory) continue;

          if (filename === 'app.db' || filename.endsWith('/app.db')) {
            const buf = await zipEntry.async('nodebuffer');
            fs.writeFileSync(dbPath, buf);
          } else if (filename.startsWith('documents/')) {
            const relPath = filename.replace('documents/', '');
            if (relPath) {
              const targetDocPath = path.join(process.env.DOCUMENTS_DIR, relPath);
              fs.mkdirSync(path.dirname(targetDocPath), { recursive: true });
              const buf = await zipEntry.async('nodebuffer');
              fs.writeFileSync(targetDocPath, buf);
            }
          }
        }
      }

      // Relaunch or restart server
      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('desktop:get-user-data-path', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('desktop:set-network-access', async (_event, allow) => {
    try {
      allowLan = Boolean(allow);
      let existingCfg = {};
      if (fs.existsSync(configPath)) {
        existingCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      const updatedCfg = {
        ...existingCfg,
        preferredPort: preferredPort || 3210,
        actualPort: activePort,
        allowLan: allowLan,
      };
      fs.writeFileSync(configPath, JSON.stringify(updatedCfg, null, 2), 'utf8');
      return { success: true, allowLan };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// App Lifecycle
app.whenReady().then(async () => {
  try {
    const { userDataPath, dbPath, configPath } = setupDataDirectories();
    setupSecrets(userDataPath);
    const resetAdminPasswordRequested = process.argv.includes('--reset-admin-password');
    setupOrResetDesktopAdmin(dbPath, { resetPassword: resetAdminPasswordRequested });
    setupIpcHandlers(userDataPath, configPath);
    const port = await startDesktopServer(configPath, preferredPort);
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
