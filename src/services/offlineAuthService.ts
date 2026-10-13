import { FirebaseUserProfile } from './firebaseAuthService';

export interface OfflineAuthCacheData {
  email: string;
  saltHex: string;
  hashHex: string;
  expiresAt: string; // ISO date string (7 days)
  profile: FirebaseUserProfile;
}

const OFFLINE_AUTH_KEY = 'cpa_offline_auth_v1';
const OFFLINE_RATE_LIMIT_KEY = 'cpa_offline_login_attempts_v1';

/**
 * Converts ArrayBuffer to Hex String
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts Hex String to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generates PBKDF2 salted hash using Web Crypto API (SHA-256, 100,000 iterations)
 */
export async function derivePBKDF2Hash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = hexToBytes(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 256 bits = 32 bytes
  );

  return bufferToHex(derivedBits);
}

/**
 * Saves authenticated user profile and salted PBKDF2 hash for 7-day offline access.
 * NEVER stores plain text password or PIN.
 */
export async function saveOfflineAuthCache(
  email: string,
  password: string,
  profile: FirebaseUserProfile
): Promise<void> {
  if (typeof localStorage === 'undefined' || !email || !password) return;

  try {
    // Generate random 16-byte salt
    const saltArray = new Uint8Array(16);
    crypto.getRandomValues(saltArray);
    const saltHex = bufferToHex(saltArray.buffer);

    // Compute PBKDF2 hash
    const hashHex = await derivePBKDF2Hash(password, saltHex);

    // Set 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const cacheData: OfflineAuthCacheData = {
      email: email.trim().toLowerCase(),
      saltHex,
      hashHex,
      expiresAt,
      profile: {
        ...profile,
      },
    };

    localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify(cacheData));
  } catch (err) {
    console.error('Error saving offline auth cache:', err);
  }
}

/**
 * Checks local rate limits for offline login attempts (max 5 failed attempts per 15 minutes).
 */
export function checkOfflineRateLimit(): { isLocked: boolean; remainingMinutes?: number } {
  if (typeof localStorage === 'undefined') return { isLocked: false };
  try {
    const raw = localStorage.getItem(OFFLINE_RATE_LIMIT_KEY);
    if (!raw) return { isLocked: false };
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.lockUntil && now < data.lockUntil) {
      const remainingMinutes = Math.ceil((data.lockUntil - now) / (60 * 1000));
      return { isLocked: true, remainingMinutes };
    }
  } catch {
    // Ignore error
  }
  return { isLocked: false };
}

/**
 * Records a failed offline login attempt and enforces 15-minute lock if failed >= 5 times.
 */
export function recordFailedOfflineAttempt(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_RATE_LIMIT_KEY);
    const data = raw ? JSON.parse(raw) : { count: 0, firstAttemptTime: Date.now() };
    const now = Date.now();

    // Reset window after 15 mins
    if (now - data.firstAttemptTime > 15 * 60 * 1000) {
      data.count = 0;
      data.firstAttemptTime = now;
      delete data.lockUntil;
    }

    data.count += 1;
    if (data.count >= 5) {
      data.lockUntil = now + 15 * 60 * 1000; // Lock for 15 mins
    }

    localStorage.setItem(OFFLINE_RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {
    // Ignore error
  }
}

/**
 * Resets offline rate limit on successful offline login.
 */
export function resetOfflineRateLimit(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(OFFLINE_RATE_LIMIT_KEY);
  } catch {}
}

/**
 * Verifies offline authentication using stored PBKDF2 hash and salt.
 * Only allows offline login for the same user who previously logged in online.
 */
export async function verifyOfflineAuthCache(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; profile?: FirebaseUserProfile; message?: string }> {
  if (typeof localStorage === 'undefined') {
    return { success: false, message: 'بيئة غير مدعومة للتخزين المحلي.' };
  }

  // 1. Rate limit check
  const rateLimit = checkOfflineRateLimit();
  if (rateLimit.isLocked) {
    return {
      success: false,
      message: `تم قفل محاولات الدخول أوفلاين لكثرة المحاولات الفاشلة. يرجى الانتظار ${rateLimit.remainingMinutes} دقيقة أو الاتصال بالسيرفر.`,
    };
  }

  // 2. Read stored offline cache
  const rawCache = localStorage.getItem(OFFLINE_AUTH_KEY);
  if (!rawCache) {
    recordFailedOfflineAttempt();
    return {
      success: false,
      message: 'لا يوجد تسجيل دخول أونلاين سابق لهذا الحساب على هذا الجهاز. يلزم الاتصال بالسيرفر لأول مرة.',
    };
  }

  try {
    const cacheData: OfflineAuthCacheData = JSON.parse(rawCache);
    const cleanEmailInput = emailInput.trim().toLowerCase();

    // Exact email match requirement (no prefix matching)
    if (cacheData.email !== cleanEmailInput) {
      recordFailedOfflineAttempt();
      return {
        success: false,
        message: 'الحساب المدخل غير مطابق للحساب المسجل أوفلاين على هذا الجهاز.',
      };
    }

    // 3. Expiration check (7 days)
    if (Date.now() > new Date(cacheData.expiresAt).getTime()) {
      recordFailedOfflineAttempt();
      return {
        success: false,
        message: 'انتهت صلاحية الجلسة المحفوظة أوفلاين (7 أيام). يرجى الاتصال بالسيرفر وتسجيل الدخول لتجديد الجلسة.',
      };
    }

    // 4. Derive hash and compare
    const computedHash = await derivePBKDF2Hash(passwordInput, cacheData.saltHex);
    if (computedHash !== cacheData.hashHex) {
      recordFailedOfflineAttempt();
      return {
        success: false,
        message: 'كلمة المرور غير صحيحة أوفلاين.',
      };
    }

    // Success! Reset failed attempts
    resetOfflineRateLimit();

    return {
      success: true,
      profile: {
        ...cacheData.profile,
        isOffline: true,
      },
    };
  } catch (err) {
    console.error('Offline auth error:', err);
    recordFailedOfflineAttempt();
    return {
      success: false,
      message: 'فشلت عملية المصادقة أوفلاين بسبب تعذر قراءة البيانات المحلية.',
    };
  }
}

/**
 * Clears stored offline authentication cache for all accounts or a specific target email.
 */
export function clearOfflineAuthCache(targetEmail?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!targetEmail) {
      localStorage.removeItem(OFFLINE_AUTH_KEY);
      return;
    }
    const rawCache = localStorage.getItem(OFFLINE_AUTH_KEY);
    if (rawCache) {
      const cacheData: OfflineAuthCacheData = JSON.parse(rawCache);
      if (cacheData.email === targetEmail.trim().toLowerCase()) {
        localStorage.removeItem(OFFLINE_AUTH_KEY);
      }
    }
  } catch {}
}
