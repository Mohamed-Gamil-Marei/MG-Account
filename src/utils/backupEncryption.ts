/**
 * محرك تشفير واستعادة النسخ الاحتياطية وتأمين بيانات بوابات الضرائب
 * (WebCrypto AES-GCM 256-bit Backup Encryption & Security Engine)
 */

export interface EncryptedBackupPackage {
  mgBackupType: 'ENCRYPTED_BACKUP';
  format: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  checksum: string; // Hex SHA-256
  version: number;
  createdAt: string;
  hasTaxSecrets: boolean;
  metadata?: {
    clientsCount?: number;
    journalEntriesCount?: number;
    accountsCount?: number;
  };
}

/**
 * تحويل مصفوفة بايتات إلى Base64
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * تحويل Base64 إلى Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * حساب بصمة SHA-256 لنص UTF-8
 */
async function computeSha256Hex(plainText: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * اشتقاق مفتاح AES-GCM 256-bit من كلمة المرور والملح عبر PBKDF2
 */
async function deriveAesGcmKey(password: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * تطهير وحذف بيانات الاعتماد السرية لبوابات الضرائب والفاتورة الإلكترونية إلا بطلب صريح
 */
export function sanitizeStateForBackup(
  stateObj: any,
  options?: { includeTaxSecrets?: boolean; isEncrypted?: boolean }
): any {
  if (!stateObj || typeof stateObj !== 'object') return stateObj;
  const cloned = JSON.parse(JSON.stringify(stateObj));

  // إذا لم يكن هناك إذن صريح مشفر، تُحذف كلمات السر ورموز PIN للضرائب
  const allowTaxSecrets = Boolean(options?.includeTaxSecrets && options?.isEncrypted);

  if (!allowTaxSecrets) {
    // 1. تنظيف عملاء المنظومة والشهادات
    if (Array.isArray(cloned.clients)) {
      cloned.clients = cloned.clients.map((c: any) => {
        const clientCopy = { ...c };
        if (clientCopy.etaConfig) {
          clientCopy.etaConfig = {
            ...clientCopy.etaConfig,
            clientSecret: undefined,
            clientSecret1: undefined,
            clientSecret2: undefined,
            tokenPin: undefined,
          };
        }
        if (clientCopy.portalCredentials) {
          clientCopy.portalCredentials = {
            ...clientCopy.portalCredentials,
            etaPassword: undefined,
            etaTokenPin: undefined,
            taxPortalPassword: undefined,
            socialInsurancePassword: undefined,
          };
        }
        return clientCopy;
      });
    }

    // 2. تنظيف ملف المكتب وشهادات ETA العامة
    if (cloned.officeProfile) {
      delete cloned.officeProfile.etaClientSecret;
      delete cloned.officeProfile.tokenPin;
    }

    if (cloned.systemSerials) {
      delete cloned.systemSerials.activationKeySecret;
    }
  }

  return cloned;
}

/**
 * تشفير بيانات النسخة الاحتياطية بكلمة مرور عبر AES-GCM
 */
export async function encryptBackupData(
  plainData: unknown,
  password: string,
  options?: { includeTaxSecrets?: boolean; metadata?: any }
): Promise<EncryptedBackupPackage> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('محرك التشفير WebCrypto غير مدعوم في هذه البيئة.');
  }

  if (!password || password.length < 6) {
    throw new Error('كلمة المرور لتشفير النسخة الاحتياطية يجب أن لا تقل عن 6 أحرف.');
  }

  // التطهير الأمني لبيانات بوابات الضرائب
  const sanitized = sanitizeStateForBackup(plainData, {
    includeTaxSecrets: options?.includeTaxSecrets,
    isEncrypted: true,
  });

  const plainText = JSON.stringify(sanitized);
  const checksum = await computeSha256Hex(plainText);

  // توليد ملح 16 بايت وشعاع تهيئة 12 بايت
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const iterations = 100000;

  const key = await deriveAesGcmKey(password, salt, iterations);

  const encoder = new TextEncoder();
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  return {
    mgBackupType: 'ENCRYPTED_BACKUP',
    format: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
    checksum,
    version: 2,
    createdAt: new Date().toISOString(),
    hasTaxSecrets: Boolean(options?.includeTaxSecrets),
    metadata: options?.metadata,
  };
}

/**
 * فك تشفير النسخة الاحتياطية والتحقق من صحة كلمة المرور وتطابق بصمة التشفير SHA-256
 */
export async function decryptBackupData(
  pkg: EncryptedBackupPackage,
  password: string
): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('محرك التشفير WebCrypto غير مدعوم في هذه البيئة.');
  }

  if (!pkg || pkg.mgBackupType !== 'ENCRYPTED_BACKUP' || pkg.format !== 'AES-GCM-256') {
    throw new Error('تنسيق حزمة النسخة الاحتياطية المشفرة غير مدعوم أو تالف.');
  }

  if (!password) {
    throw new Error('يرجى إدخال كلمة المرور لفك تشفير النسخة الاحتياطية.');
  }

  try {
    const salt = base64ToBuffer(pkg.salt);
    const iv = base64ToBuffer(pkg.iv);
    const ciphertext = base64ToBuffer(pkg.ciphertext);

    const key = await deriveAesGcmKey(password, salt, pkg.iterations || 100000);

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const plainText = decoder.decode(decryptedBuffer);

    // التحقق من البصمة الرقمية SHA-256
    const calculatedChecksum = await computeSha256Hex(plainText);
    if (pkg.checksum && calculatedChecksum !== pkg.checksum) {
      throw new Error('فشل التحقق من تكامل البيانات: بصمة التشفير SHA-256 لا تطابق المحتوى الأصلي.');
    }

    return plainText;
  } catch (err) {
    if (err instanceof Error && err.message.includes('تكامل')) {
      throw err;
    }
    throw new Error('فشل فك التشفير: كلمة المرور غير صحيحة أو تم التلاعب بملف النسخة الاحتياطية.');
  }
}
