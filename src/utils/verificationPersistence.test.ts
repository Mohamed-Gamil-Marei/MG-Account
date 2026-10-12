import { describe, it, expect } from 'vitest';
import { DatabaseState, db } from '../db/localDatabase';

describe('Verification Code Persistence in localDatabase', () => {
  it('generates verificationCode before saving and persists it through state export/restore', async () => {
    // Add a test certificate
    const cert = await db.addCertificate({
      certificateType: 'FREELANCE_INCOME',
      beneficiaryType: 'NATURAL_PERSON',
      clientName: 'اختبار العميل',
      recipientEntity: 'البنك الأهلي',
      purpose: 'الحصول على تمويل',
      periodText: 'عن عام 2025',
      certifiedAmount: 150000,
      issueDate: '2026-04-01',
      qrPayload: 'test-qr',
      auditorNotes: 'ملاحظات الاختبار',
      securityHash: 'hash-123',
      printedCount: 0,
    });

    expect(cert.verificationCode).toBeDefined();
    expect(cert.verificationCode?.length).toBeGreaterThanOrEqual(16);

    // Export state (simulate flushDirtyStorage / localStorage backup)
    const exportedJson = JSON.stringify((db as any).getState());
    expect(exportedJson).toContain(cert.verificationCode);

    // Restore into a new state instance or reload
    const parsed = JSON.parse(exportedJson) as DatabaseState;
    const restoredCert = parsed.certificates.find(c => c.id === cert.id);

    expect(restoredCert).toBeDefined();
    expect(restoredCert?.verificationCode).toBe(cert.verificationCode);
  });
});
