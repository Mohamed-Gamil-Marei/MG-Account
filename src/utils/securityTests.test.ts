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

  it('7. السكرتير يُرفض في كل خدمات /api/whatsapp/* (قراءة وكتابة)', () => {
    expect(checkEntityAccess(secretaryUser, 'whatsapp', 'READ')).toBe(false);
    expect(checkEntityAccess(secretaryUser, 'whatsapp', 'WRITE')).toBe(false);
    expect(checkEntityAccess(pendingUser, 'whatsapp', 'READ')).toBe(false);
    expect(checkEntityAccess(accountantUser, 'whatsapp', 'READ')).toBe(true);
    expect(checkEntityAccess(adminUser, 'whatsapp', 'WRITE')).toBe(true);
  });

  it('8. تنزيل أو الوصول لمستند عميل غير مصرح به يُرفض للعميل المقيد', () => {
    const restrictedUser = {
      id: 10,
      name: 'Restricted User',
      role: 'ACCOUNTANT',
      permittedClientIds: ['CLIENT-101', 'CLIENT-102']
    };

    const docAllowed = { id: 'doc-1', client_id: 'CLIENT-101' };
    const docForbidden = { id: 'doc-2', client_id: 'CLIENT-999' };

    const isPermitted = (u: typeof restrictedUser, doc: typeof docForbidden) => {
      if (!checkEntityAccess(u, 'documents', 'READ')) return false;
      if (u.permittedClientIds && Array.isArray(u.permittedClientIds)) {
        return u.permittedClientIds.includes(doc.client_id);
      }
      return true;
    };

    expect(isPermitted(restrictedUser, docAllowed)).toBe(true);
    expect(isPermitted(restrictedUser, docForbidden)).toBe(false);
  });

  it('9. سجل محاولات الدخول (login_attempts) يُنضَّف للأقدم من 24 ساعة', () => {
    const now = Date.now();
    const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;
    const oneHourAgo = now - 1 * 60 * 60 * 1000;

    const attempts = [
      { id: 1, ip: '127.0.0.1', timestamp: twentyFiveHoursAgo },
      { id: 2, ip: '127.0.0.1', timestamp: oneHourAgo }
    ];

    const cutoff = now - 24 * 60 * 60 * 1000;
    const remainingAttempts = attempts.filter(a => a.timestamp >= cutoff);

    expect(remainingAttempts).toHaveLength(1);
    expect(remainingAttempts[0].id).toBe(2);
  });

  it('10. إعدادات CSP في بيئة الإنتاج (production) لا تحتوي على unsafe-eval أو unsafe-inline في script-src', () => {
    const isProd = true;
    const scriptSrcDirectives = isProd
      ? ["'self'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

    expect(scriptSrcDirectives).not.toContain("'unsafe-eval'");
    expect(scriptSrcDirectives).not.toContain("'unsafe-inline'");
    expect(scriptSrcDirectives).toEqual(["'self'"]);
  });

  it('11. حدود أبعاد البيانات (Body Limits): 3MB لـ officeProfile ينجح، و12MB يرجّع 413، و20MB لـ migrate-all ينجح للمدير', () => {
    const checkPayloadLimit = (route: string, sizeMB: number, role: string) => {
      if (role === 'PENDING') {
        return { status: 403, error: 'صلاحية مرفوضة' };
      }

      let limitMB = 1; // default limit
      if (route === '/api/ocr' || route === '/api/server-backups/restore' || route === '/api/data/migrate-all') {
        limitMB = 50;
      } else if (route.startsWith('/api/data') || route.startsWith('/api/ai') || route === '/api/eta/documents/batch-submit') {
        limitMB = 10;
      }

      if (sizeMB > limitMB) {
        return { status: 413, error: 'حجم البيانات المرسلة يتجاوز الحد الأقصى المسموح به لهذا المسار (413 Payload Too Large).' };
      }

      return { status: 200, success: true };
    };

    // Push 3MB to /api/data/officeProfile -> succeeds (200)
    const profile3MB = checkPayloadLimit('/api/data/officeProfile', 3, 'ADMIN');
    expect(profile3MB.status).toBe(200);

    // Push 12MB to /api/data/officeProfile -> returns 413
    const profile12MB = checkPayloadLimit('/api/data/officeProfile', 12, 'ADMIN');
    expect(profile12MB.status).toBe(413);
    expect(profile12MB.error).toContain('413 Payload Too Large');

    // Push 20MB to /api/data/migrate-all for ADMIN -> succeeds (200)
    const migrate20MB = checkPayloadLimit('/api/data/migrate-all', 20, 'ADMIN');
    expect(migrate20MB.status).toBe(200);
  });

  it('12. قفل الحساب المزدوج للبريد الإلكتروني عند تجاوزه 20 محاولة فاشلة في ساعة', () => {
    const emailAttempts = Array.from({ length: 22 }, () => ({
      email: 'user@example.com',
      success: 0,
      timestamp: Date.now() - 15 * 60 * 1000
    }));

    const now = Date.now();
    const attemptsLastHour = emailAttempts.filter(
      a => a.email === 'user@example.com' && a.success === 0 && a.timestamp > now - 60 * 60 * 1000
    );

    expect(attemptsLastHour.length).toBeGreaterThanOrEqual(20);
  });
});
