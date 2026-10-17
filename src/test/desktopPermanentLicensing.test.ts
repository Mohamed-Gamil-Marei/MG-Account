import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getMachineFingerprint, generateRequestCode, verifyPermanentLicense, DesktopLicensePayload } from '../utils/desktopPermanentLicensing';

describe('Desktop Permanent Offline Licensing (Phases 1-4)', () => {
  let testKeyPair: any;

  beforeEach(() => {
    testKeyPair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Ensure electron/license-public-key.pem exists for tests
    const electronDir = path.join(process.cwd(), 'electron');
    if (!fs.existsSync(electronDir)) {
      fs.mkdirSync(electronDir, { recursive: true });
    }
    fs.writeFileSync(path.join(electronDir, 'license-public-key.pem'), testKeyPair.publicKey);
  });

  it('1. يولد بصمة جهاز وكود طلب صحيح', () => {
    const fp = getMachineFingerprint();
    expect(fp).toBeTypeOf('string');
    expect(fp.length).toBe(64);

    const reqCode = generateRequestCode();
    expect(reqCode).toBeTypeOf('string');
    expect(reqCode.length).toBeGreaterThan(10);
  });

  it('2. يقبل ترخيص صحيح موقّع بالمفتاح الخاص ومطابق للبصمة', () => {
    const fp = getMachineFingerprint();
    const payload: DesktopLicensePayload = {
      serial: 'MG-9999-8888-7777',
      fingerprint: fp,
      customerName: 'تجربة اختبار',
      maxUsers: 5,
      issuedAt: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), crypto.createPrivateKey(testKeyPair.privateKey));
    const token = `${payloadB64}.${signature.toString('base64')}`;

    const res = verifyPermanentLicense(token);
    expect(res.valid).toBe(true);
    expect(res.payload?.serial).toBe('MG-9999-8888-7777');
    expect(res.payload?.maxUsers).toBe(5);
  });

  it('3. يرفض ترخيص موجه لجهاز آخر (بصمة غير مطابقة)', () => {
    const payload: DesktopLicensePayload = {
      serial: 'MG-9999-8888-7777',
      fingerprint: 'wrong-fingerprint-hash-for-another-pc',
      customerName: 'جهاز آخر',
      maxUsers: 3,
      issuedAt: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), crypto.createPrivateKey(testKeyPair.privateKey));
    const token = `${payloadB64}.${signature.toString('base64')}`;

    const res = verifyPermanentLicense(token);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/بصمة الجهاز غير مطابقة/);
  });

  it('4. يرفض ترخيص مزور أو تم التلاعب به', () => {
    const fp = getMachineFingerprint();
    const payload: DesktopLicensePayload = {
      serial: 'MG-9999-8888-7777',
      fingerprint: fp,
      customerName: 'مزوّر',
      maxUsers: 10,
      issuedAt: new Date().toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    // Tamper payload after signing or use invalid signature
    const fakeSig = Buffer.alloc(64, 1).toString('base64');
    const token = `${payloadB64}.${fakeSig}`;

    const res = verifyPermanentLicense(token);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/فشل التحقق من توقيع الترخيص/);
  });
});
