import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const FIXED_SALT = 'MG_DESKTOP_PERMANENT_SALT_2026';

export interface DesktopLicensePayload {
  serial: string;
  fingerprint: string;
  customerName: string;
  maxUsers: number;
  issuedAt: string;
}

// 1. Get Machine Fingerprint = SHA-256(MachineGuid + salt)
export function getMachineFingerprint(): string {
  let machineGuid = '';
  if (process.platform === 'win32') {
    try {
      const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8' });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/);
      if (match && match[1]) {
        machineGuid = match[1].trim();
      }
    } catch {}
  }

  if (!machineGuid) {
    machineGuid = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'generic-cpu'}`;
  }

  return crypto.createHash('sha256').update(`${machineGuid}:${FIXED_SALT}`).digest('hex');
}

// 2. Generate Request Code for Activation
export function generateRequestCode(): string {
  const fp = getMachineFingerprint();
  const payload = {
    v: '1.0',
    fp,
    appVersion: '1.2.0',
    ts: new Date().toISOString(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const jsonStr = JSON.stringify(payload);
  const checksum = crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex').substring(0, 8);
  const fullObj = { ...payload, checksum };
  const buf = Buffer.from(JSON.stringify(fullObj), 'utf8');
  // Base32 encode
  return encodeBase32(buf);
}

// RFC 4648 Base32 alphabet helper
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buf.length; i++) {
    value = ((value & 0xffff) << 8) | buf[i];
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  // Format into chunks of 5
  const clean = output.replace(/[^A-Z2-7]/g, '');
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 5) {
    chunks.push(clean.substring(i, i + 5));
  }
  return chunks.join('-');
}

export function decodeBase32(str: string): Buffer {
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = ((value & 0xffff) << 5) | idx;
    bits += 5;

    while (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// 3. Verify Ed25519 signature of activation token using public key
export function verifyPermanentLicense(tokenOrLicContent: string): { valid: boolean; payload?: DesktopLicensePayload; error?: string } {
  try {
    let token = tokenOrLicContent.trim();
    // If it's json .lic file content
    if (token.startsWith('{')) {
      const parsedLic = JSON.parse(token);
      token = parsedLic.token || parsedLic.activationCode || '';
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'صيغة ترخيص غير صالحة.' };
    }

    const [payloadB64, sigB64] = parts;
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload: DesktopLicensePayload = JSON.parse(payloadJson);

    // Check fingerprint match
    const currentFp = getMachineFingerprint();
    if (payload.fingerprint !== currentFp) {
      return { valid: false, error: 'الترخيص غير مخصص لهذا الجهاز (بصمة الجهاز غير مطابقة).' };
    }

    // Load public key
    let pubKeyPath = path.join(process.cwd(), 'electron', 'license-public-key.pem');
    if (!fs.existsSync(pubKeyPath)) {
      pubKeyPath = path.join(process.cwd(), '..', 'electron', 'license-public-key.pem');
    }
    if (!fs.existsSync(pubKeyPath)) {
      pubKeyPath = path.join(process.cwd(), 'keys', 'license-public-key.pem');
    }
    if (!fs.existsSync(pubKeyPath)) {
      return { valid: false, error: 'ملف المفتاح العام للترخيص غير موجود.' };
    }

    const publicKeyPem = fs.readFileSync(pubKeyPath, 'utf8');
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const signature = Buffer.from(sigB64, 'base64');

    const isVerified = crypto.verify(null, Buffer.from(payloadB64, 'utf8'), publicKey, signature);
    if (!isVerified) {
      return { valid: false, error: 'فشل التحقق من توقيع الترخيص (توقيع غير صالح أو تم التلاعب بالملف).' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: `خطأ في التحقق من الترخيص: ${err.message}` };
  }
}
