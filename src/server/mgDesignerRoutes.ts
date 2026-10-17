import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import { generateAndStoreEd25519Keys, exportPublicKeyPem } from '../utils/designerKeyService';
import { DesignerCustomerDb } from '../utils/designerCustomerDb';
import { issueActivationCode, issueUnlockCode } from '../utils/designerLicenseService';

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filenameSafe = typeof __filename !== 'undefined' ? __filename : (typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : process.cwd());
const _require = createRequire(__filenameSafe);
let signIntegrity: (data: string) => string;
try {
  const toolsPath = path.join(process.cwd(), 'tools', 'sign-integrity.cjs');
  signIntegrity = _require(toolsPath).signIntegrity;
} catch {
  try {
    signIntegrity = _require('../../tools/sign-integrity.cjs').signIntegrity;
  } catch {
    signIntegrity = (d: string) => d;
  }
}

export function setupMgDesignerRoutes(app: Express, dataDir: string): void {
  const designerDir = path.join(dataDir, 'mg_designer');
  fs.mkdirSync(designerDir, { recursive: true });

  const designerDbPath = path.join(designerDir, 'designer_customers.db');
  const keyStorePath = path.join(designerDir, 'encrypted_designer_keys.dat');
  const publicKeyExportPath = path.join(designerDir, 'license-public-key.pem');

  const designerDb = new DesignerCustomerDb(designerDbPath);

  // 1. Keys API
  app.post('/api/designer/keys/generate', async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة السر يجب أن لا تقل عن 6 أحرف.' });
      }

      const { publicKeyPem } = await generateAndStoreEd25519Keys(password, keyStorePath);
      exportPublicKeyPem(keyStorePath, publicKeyExportPath);

      res.json({
        success: true,
        message: 'تم توليد وتشفير زوج المفاتيح Ed25519 بنجاح!',
        publicKeyPem,
        publicKeyExportPath,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/designer/keys/status', (_req, res) => {
    try {
      const exists = fs.existsSync(keyStorePath);
      let publicKeyPem = null;
      if (exists) {
        const raw = fs.readFileSync(keyStorePath, 'utf8');
        const store = JSON.parse(raw);
        publicKeyPem = store.publicKeyPem;
      }
      res.json({ success: true, exists, publicKeyPem, keyStorePath });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/designer/keys/export-public', (_req, res) => {
    try {
      exportPublicKeyPem(keyStorePath, publicKeyExportPath);
      res.json({ success: true, path: publicKeyExportPath });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Customers API
  app.get('/api/designer/customers', (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      const customers = designerDb.getCustomers(q);
      res.json({ success: true, customers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/designer/customers', (req, res) => {
    try {
      const customer = designerDb.addCustomer(req.body);
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/designer/customers/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      designerDb.updateCustomer(id, req.body);
      res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/designer/customers/:id/history', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const activations = designerDb.getActivationsByCustomer(id);
      const incidents = designerDb.getIncidentsByCustomer(id);
      res.json({ success: true, activations, incidents });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Issue License API
  app.post('/api/designer/issue-license', async (req, res) => {
    try {
      const { requestCode, customerId, password, notes } = req.body;
      if (!requestCode || !password) {
        return res.status(400).json({ success: false, error: 'كود الطلب وكلمة سر المفتاح مطلوبان.' });
      }

      const customer = designerDb.getCustomerById(parseInt(customerId, 10));
      if (!customer) {
        return res.status(404).json({ success: false, error: 'العميل غير موجود في سجلات المصمم.' });
      }

      const result = await issueActivationCode({
        requestCodeStr: requestCode,
        customer,
        keyStorePath,
        keyPassword: password,
        customerDb: designerDb,
        notes,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 4. Issue Incident Unlock API
  app.post('/api/designer/issue-unlock', async (req, res) => {
    try {
      const { incidentCode, password, customerId } = req.body;
      if (!incidentCode || !password) {
        return res.status(400).json({ success: false, error: 'كود الحادثة وكلمة سر المفتاح مطلوبان.' });
      }

      const customer = customerId ? designerDb.getCustomerById(parseInt(customerId, 10)) : undefined;

      const result = await issueUnlockCode({
        incidentCodeStr: incidentCode,
        keyStorePath,
        keyPassword: password,
        customerDb: designerDb,
        customer,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Backup Export / Import API
  app.post('/api/designer/backup/export', async (req, res) => {
    try {
      const { password, targetPath } = req.body;
      const exportPath = targetPath || path.join(designerDir, `mg_designer_backup_${Date.now()}.mgdb`);
      await designerDb.exportEncryptedBackup(password, exportPath);
      res.json({ success: true, exportPath });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/designer/backup/import', async (req, res) => {
    try {
      const { password, sourcePath } = req.body;
      const result = await designerDb.importEncryptedBackup(password, sourcePath);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 6. Sign Integrity API
  app.post('/api/designer/integrity/sign', async (req, res) => {
    try {
      const { password, projectPath } = req.body;
      const targetProj = projectPath || process.cwd();
      const result = signIntegrity(targetProj, keyStorePath, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
}
