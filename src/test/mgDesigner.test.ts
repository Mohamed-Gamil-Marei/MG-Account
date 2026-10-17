import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateAndStoreEd25519Keys, decryptPrivateKey, exportPublicKeyPem } from '../utils/designerKeyService';
import { encodePayloadWithChecksum, decodePayloadWithChecksum } from '../utils/designerBase32';
import { DesignerCustomerDb } from '../utils/designerCustomerDb';
import { issueActivationCode, issueUnlockCode, verifyEd25519Signature, parseLicenseRequestCode } from '../utils/designerLicenseService';
import { signIntegrity } from '../../tools/sign-integrity.cjs';

describe('MG Designer Workstation & Security Test Suite (Real Code)', () => {
  const testDir = path.join(os.tmpdir(), `test_mg_designer_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const keyStorePath = path.join(testDir, 'encrypted_keys.dat');
  const publicKeyPath = path.join(testDir, 'license-public-key.pem');
  const dbPath = path.join(testDir, 'designer_customers.db');
  const masterPassword = 'DesignerMasterSecretPassword2026!';

  let designerDb: DesignerCustomerDb;
  let publicKeyPem: string;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });

    // 1. Initialize Keys
    const keyRes = await generateAndStoreEd25519Keys(masterPassword, keyStorePath);
    publicKeyPem = keyRes.publicKeyPem;
    exportPublicKeyPem(keyStorePath, publicKeyPath);

    // 2. Initialize Customer Database
    designerDb = new DesignerCustomerDb(dbPath);
  });

  afterAll(() => {
    try {
      designerDb.close();
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. توليد مفتاح Ed25519 وتشفيره (scrypt + AES-256-GCM) والتحقق من صحة فك التشفير برمز السر الصحيح ورفض الخاطئ', async () => {
    expect(fs.existsSync(keyStorePath)).toBe(true);

    // Correct password decrypts private key
    const decryptedPrivateKey = await decryptPrivateKey(masterPassword, keyStorePath);
    expect(decryptedPrivateKey).toContain('BEGIN PRIVATE KEY');

    // Wrong password fails
    await expect(decryptPrivateKey('WRONG_PASSWORD_123', keyStorePath)).rejects.toThrow('كلمة السر غير صحيحة');
  });

  it('2. كود الطلب والـ Checksum: ترميز وفك شفرة Base32 والتحقق من التغيير والتعديل', () => {
    const originalRequest = {
      v: '1.0',
      fp: 'FP-TEST-DEVICE-FINGERPRINT-8899',
      appVersion: '1.2.0',
      ts: new Date().toISOString(),
      nonce: 'nonce-12345-abc',
    };

    const encodedBase32 = encodePayloadWithChecksum(originalRequest);
    expect(encodedBase32).toBeDefined();

    // Valid decoding
    const decoded = decodePayloadWithChecksum(encodedBase32);
    expect(decoded.valid).toBe(true);
    expect(decoded.data.fp).toBe('FP-TEST-DEVICE-FINGERPRINT-8899');

    // Tampered Base32 string fails
    const tamperedBase32 = encodedBase32.slice(0, -4) + 'XXXX';
    const tamperedDecoded = decodePayloadWithChecksum(tamperedBase32);
    expect(tamperedDecoded.valid).toBe(false);
  });

  it('3. سجل العملاء SQLite: توليد سيريال تلقائي MG-XXXX-XXXX-XXXX وإضافة وبحث وتعديل عميل', () => {
    const serial = designerDb.generateSerial();
    expect(serial).toMatch(/^MG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const customer = designerDb.addCustomer({
      name: 'أحمد محمود المحاسب',
      phone: '01012345678',
      office: 'مكتب الأمل للاستشارات',
      saleDate: '2026-10-17',
      price: 5000,
      maxUsers: 5,
      notes: 'عميل مميز',
      status: 'ACTIVE',
    });

    expect(customer.id).toBeDefined();
    expect(customer.serial).toMatch(/^MG-/);

    const found = designerDb.getCustomers('أحمد محمود');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].office).toBe('مكتب الأمل للاستشارات');

    // Update customer
    designerDb.updateCustomer(customer.id, { maxUsers: 10 });
    const updated = designerDb.getCustomerById(customer.id);
    expect(updated?.maxUsers).toBe(10);
  });

  it('4. إصدار الترخيص: توقيع Ed25519 والتحقق الصحيح ورفض الترخيص المعدل (Tampered License)', async () => {
    const customer = designerDb.addCustomer({
      name: 'سامح حسن',
      phone: '01099998888',
      office: 'مكتب الخبراء',
      saleDate: '2026-10-17',
      maxUsers: 3,
      status: 'ACTIVE',
    });

    const requestCodePayload = {
      v: '1.0',
      fp: 'FP-TEST-FINGERPRINT-LICENSE-999',
      appVersion: '1.2.0',
      ts: new Date().toISOString(),
      nonce: 'nonce-license-req-123',
    };
    const requestCodeStr = encodePayloadWithChecksum(requestCodePayload);

    const issueResult = await issueActivationCode({
      requestCodeStr,
      customer,
      keyStorePath,
      keyPassword: masterPassword,
      customerDb: designerDb,
    });

    expect(issueResult.activationCodeGrouped).toBeDefined();
    expect(issueResult.licFileContent).toContain('MG_ACCOUNT_LICENSE_V1');

    // Verify signature with public key
    const fullToken = `${issueResult.licFileContent.includes('token') ? JSON.parse(issueResult.licFileContent).token : ''}`;
    const isSignatureValid = verifyEd25519Signature(fullToken, publicKeyPem);
    expect(isSignatureValid).toBe(true);

    // Tamper token payload (change maxUsers to 999) -> verify returns false
    const [payloadB64, sigB64] = fullToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    decodedPayload.maxUsers = 999;
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload), 'utf8').toString('base64');
    const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;

    const isTamperedValid = verifyEd25519Signature(tamperedToken, publicKeyPem);
    expect(isTamperedValid).toBe(false);
  });

  it('5. فك القفل الطارئ: كود الفك المربوط بالبصمة لا يُستخدم مرتين (One-Time Unlock Enforcement)', async () => {
    const incidentPayload = {
      fp: 'FP-INCIDENT-DEVICE-555',
      reason: 'تغيير هارد ديسك السيرفر الرئيسي',
      ts: new Date().toISOString(),
      nonce: 'NONCE-INCIDENT-ONE-TIME-777',
    };
    const incidentCodeStr = encodePayloadWithChecksum(incidentPayload);

    // Issue first time -> Success
    const unlockRes1 = await issueUnlockCode({
      incidentCodeStr,
      keyStorePath,
      keyPassword: masterPassword,
      customerDb: designerDb,
    });

    expect(unlockRes1.unlockCodeGrouped).toBeDefined();

    // Re-issuing unlock for the same nonce -> Fails (One-time enforcement)
    await expect(
      issueUnlockCode({
        incidentCodeStr,
        keyStorePath,
        keyPassword: masterPassword,
        customerDb: designerDb,
      })
    ).rejects.toThrow(/أكثر من مرة واحدة/);
  });

  it('6. نسخة احتياطية مشفّرة لسجل العملاء (تصدير واستيراد مشفّر)', async () => {
    const backupFilePath = path.join(testDir, 'backup_registry.mgdb');
    const backupPassword = 'BackupSecretPassword2026!';

    await designerDb.exportEncryptedBackup(backupPassword, backupFilePath);
    expect(fs.existsSync(backupFilePath)).toBe(true);

    // Import into fresh database instance
    const freshDbPath = path.join(testDir, 'fresh_imported_designer.db');
    const freshDb = new DesignerCustomerDb(freshDbPath);

    const importResult = await freshDb.importEncryptedBackup(backupPassword, backupFilePath);
    expect(importResult.importedCustomers).toBeGreaterThan(0);

    const importedCusts = freshDb.getCustomers();
    expect(importedCusts.length).toBeGreaterThan(0);
    freshDb.close();
  });

  it('7. توقيع سلامة الملفات (tools/sign-integrity.cjs): حساب SHA-256 وتوليد integrity.json و integrity.sig', () => {
    const fakeProjDir = path.join(testDir, 'fake_project');
    const fakeDistDir = path.join(fakeProjDir, 'dist');
    const fakeElectronDir = path.join(fakeProjDir, 'electron');

    fs.mkdirSync(fakeDistDir, { recursive: true });
    fs.mkdirSync(fakeElectronDir, { recursive: true });

    fs.writeFileSync(path.join(fakeDistDir, 'index.html'), '<html>MG Account</html>', 'utf8');
    fs.writeFileSync(path.join(fakeElectronDir, 'main.cjs'), 'console.log("Electron")', 'utf8');

    const result = signIntegrity(fakeProjDir, keyStorePath, masterPassword);
    expect(result.filesCount).toBe(2);
    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.sigPath)).toBe(true);

    const jsonContent = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
    expect(jsonContent.hashes['dist/index.html']).toBeDefined();
    expect(jsonContent.hashes['electron/main.cjs']).toBeDefined();
  });
});
