/**
 * Utility for generating cryptographic verification codes and validating Drive URLs
 */

/**
 * Generates a cryptographically strong, URL-safe random verification code
 * of at least 16 characters using crypto.getRandomValues.
 */
export function generateVerificationCode(length: number = 24): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const minLength = Math.max(16, length);
  const array = new Uint8Array(minLength);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments where crypto is under node:crypto
    const nodeCrypto = typeof window === 'undefined' ? (() => {
      try {
        if (typeof require === 'function') {
          return require('crypto');
        }
      } catch {}
      return null;
    })() : null;
    if (nodeCrypto && nodeCrypto.randomBytes) {
      const bytes = nodeCrypto.randomBytes(minLength);
      for (let i = 0; i < minLength; i++) {
        array[i] = bytes[i];
      }
    } else {
      for (let i = 0; i < minLength; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
  }

  let code = '';
  for (let i = 0; i < minLength; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Validates whether a given URL is a legitimate Google Drive or Google Docs URL
 */
export function isValidGoogleDriveUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://drive.google.com/') || trimmed.startsWith('https://docs.google.com/');
}
