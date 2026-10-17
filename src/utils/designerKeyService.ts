import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface EncryptedKeyStore {
  version: number;
  salt: string; // Hex
  iv: string; // Hex
  authTag: string; // Hex
  encryptedData: string; // Hex
  publicKeyPem: string;
  createdAt: string;
}

// Derive a 32-byte key using scrypt
export function deriveKeyFromPassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Item 1: Generate Ed25519 Key Pair and encrypt private key with password
export async function generateAndStoreEd25519Keys(
  password: string,
  targetFilePath: string
): Promise<{ publicKeyPem: string; keyStorePath: string }> {
  if (!password || password.length < 6) {
    throw new Error('كلمة السر يجب أن لا تقل عن 6 أحرف لحماية المفتاح الخاص.');
  }

  // 1. Generate Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  // 2. Encrypt private key with scrypt + AES-256-GCM
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await deriveKeyFromPassword(password, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const keyStore: EncryptedKeyStore = {
    version: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedData: encrypted.toString('hex'),
    publicKeyPem,
    createdAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
  fs.writeFileSync(targetFilePath, JSON.stringify(keyStore, null, 2), 'utf8');

  return { publicKeyPem, keyStorePath: targetFilePath };
}

// Item 1: Decrypt private key using password
export async function decryptPrivateKey(password: string, keyStorePath: string): Promise<string> {
  if (!fs.existsSync(keyStorePath)) {
    throw new Error('ملف المفاتيح المشفّر غير موجود.');
  }

  const raw = fs.readFileSync(keyStorePath, 'utf8');
  const keyStore: EncryptedKeyStore = JSON.parse(raw);

  const salt = Buffer.from(keyStore.salt, 'hex');
  const iv = Buffer.from(keyStore.iv, 'hex');
  const authTag = Buffer.from(keyStore.authTag, 'hex');
  const encrypted = Buffer.from(keyStore.encryptedData, 'hex');

  const key = await deriveKeyFromPassword(password, salt);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('كلمة السر غير صحيحة! تعذر فك تشفير المفتاح الخاص.');
  }
}

// Export Public Key (license-public-key.pem)
export function exportPublicKeyPem(keyStorePath: string, targetPath: string): void {
  if (!fs.existsSync(keyStorePath)) {
    throw new Error('ملف المفاتيح غير موجود.');
  }
  const keyStore: EncryptedKeyStore = JSON.parse(fs.readFileSync(keyStorePath, 'utf8'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, keyStore.publicKeyPem, 'utf8');
}
