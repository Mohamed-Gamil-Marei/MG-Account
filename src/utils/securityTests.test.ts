import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { checkEntityAccess } from '../server/access';

// Function to test HMAC verification logic
function verifyWebhookSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
  if (!signature || !appSecret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}


  it('7. يتحقق من صحة التوقيع باستخدام البايتس الخام بدقة (يدعم العربية والمسافات)', () => {
    const rawBody = Buffer.from(JSON.stringify({ text: 'تحديث الحسابات والعملاء 123' }), 'utf8');
    const appSecret = 'secret_key_arabic_999';
    const validSig = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, validSig, appSecret)).toBe(true);

    const tamperedBody = Buffer.from(JSON.stringify({ text: 'تحديث الحسابات والعملاء 999' }), 'utf8');
    expect(verifyWebhookSignature(tamperedBody, validSig, appSecret)).toBe(false);
  });

describe('Security & Access Control Tests', () => {
  const secretaryUser = { id: 1, name: 'Semia', role: 'SECRETARY' };
  const pendingUser = { id: 2, name: 'Pending User', role: 'PENDING' };
  const accountantUser = { id: 3, name: 'Accountant', role: 'ACCOUNTANT' };
  const adminUser = { id: 4, name: 'Admin', role: 'ADMIN' };

  it('1. SECRETARY يُرفض في الكتابة على accounts', () => {
    expect(checkEntityAccess(secretaryUser, 'accounts', 'WRITE')).toBe(false);
  });

  it('2. SECRETARY يُسمح له بالكتابة على invoices فقط', () => {
    expect(checkEntityAccess(secretaryUser, 'invoices', 'WRITE')).toBe(true);
    expect(checkEntityAccess(secretaryUser, 'clients', 'WRITE')).toBe(false);
  });

  it('3. PENDING يُرفض في كل /api/data (قراءة وكتابة وحذف)', () => {
    expect(checkEntityAccess(pendingUser, 'clients', 'READ')).toBe(false);
    expect(checkEntityAccess(pendingUser, 'invoices', 'WRITE')).toBe(false);
    expect(checkEntityAccess(pendingUser, 'accounts', 'DELETE')).toBe(false);
  });

  it('4. تعديل وتطبيق WRITE/DELETE على auditLogs يُرفض لكافة المستخدمين', () => {
    expect(checkEntityAccess(adminUser, 'auditLogs', 'WRITE')).toBe(false);
    expect(checkEntityAccess(accountantUser, 'auditLogs', 'WRITE')).toBe(false);
    expect(checkEntityAccess(secretaryUser, 'auditLogs', 'DELETE')).toBe(false);
  });

  it('5. webhook بتوقيع غلط يُرفض', () => {
    const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const appSecret = 'my_secret_key_123';
    
    // Correct signature
    const validSig = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, validSig, appSecret)).toBe(true);

    // Invalid signature
    const invalidSig = "sha256=" + crypto.createHmac("sha256", "wrong_secret").update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, invalidSig, appSecret)).toBe(false);

    // Missing signature
    expect(verifyWebhookSignature(rawBody, '', appSecret)).toBe(false);
  });

  it('6. ACCOUNTANT و ADMIN يُسمح لهما بالكتابة على accounts', () => {
    expect(checkEntityAccess(accountantUser, 'accounts', 'WRITE')).toBe(true);
    expect(checkEntityAccess(adminUser, 'accounts', 'WRITE')).toBe(true);
  });
});
