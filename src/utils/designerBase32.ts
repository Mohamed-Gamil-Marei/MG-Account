import crypto from 'crypto';

// RFC 4648 Base32 alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buf: Buffer): string {
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

  return output;
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

// Deterministic Checksum calculation sorting keys alphabetically
export function computeChecksum(payloadObj: Record<string, any>): string {
  const sortedKeys = Object.keys(payloadObj).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = payloadObj[k];
  }
  const canonicalJson = JSON.stringify(sortedObj);
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex').substring(0, 8);
}

// Encode JSON payload with checksum into Base32
export function encodePayloadWithChecksum(payload: Record<string, any>): string {
  const checksum = computeChecksum(payload);
  const fullObj = { ...payload, checksum };
  const buf = Buffer.from(JSON.stringify(fullObj), 'utf8');
  return encodeBase32(buf);
}

// Decode Base32 string and verify payload + checksum
export function decodePayloadWithChecksum<T = any>(base32Str: string): { valid: boolean; data?: T; error?: string } {
  try {
    const buf = decodeBase32(base32Str);
    const jsonStr = buf.toString('utf8').replace(/\0+$/, '').trim();
    const obj = JSON.parse(jsonStr);

    if (!obj || typeof obj !== 'object') {
      return { valid: false, error: 'كود غير صالح: صيغة JSON تالفة.' };
    }

    const { checksum, ...originalPayload } = obj;
    if (!checksum) {
      return { valid: false, error: 'كود غير صالح: الرمز التفقدي (Checksum) مفقود.' };
    }

    const expectedChecksum = computeChecksum(originalPayload);
    if (checksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
      return { valid: false, error: 'كود غير صالح: الرمز التفقدي (Checksum) غير مطابق أو تم التلاعب به.' };
    }

    return { valid: true, data: originalPayload as T };
  } catch (err: any) {
    return { valid: false, error: `فشل فك شفرة الكود: ${err.message}` };
  }
}
