import { describe, it, expect, vi } from 'vitest';
import { DatabaseState, db } from '../db/localDatabase';
import { IssuedDocumentService } from '../services/issuedDocumentService';

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

  it('sets registryStatus to RECORDED on success and FAILED on recordIssuedDocument failure', async () => {
    const mockRecord = vi.spyOn(IssuedDocumentService, 'recordIssuedDocument');

    // 1. Success case
    mockRecord.mockResolvedValueOnce({ success: true });
    const successCert = db.addCertificate({
      certificateType: 'INCOME_PROOF',
      beneficiaryType: 'NATURAL_PERSON',
      clientName: 'عميل ناجح',
      recipientEntity: 'جهة اختبار',
      purpose: 'إثبات دخل',
      periodText: '2025',
      certifiedAmount: 100000,
      issueDate: '2026-01-01',
      qrPayload: 'qr-success',
      auditorNotes: 'ملاحظات',
      securityHash: 'hash-success',
      printedCount: 0,
    });

    expect(successCert.registryStatus).toBe('PENDING');
    await new Promise((r) => setTimeout(r, 50));
    expect(successCert.registryStatus).toBe('RECORDED');

    // 2. Failure case
    mockRecord.mockResolvedValueOnce({ success: false, error: 'Network Error' });
    const failedCert = db.addCertificate({
      certificateType: 'INCOME_PROOF',
      beneficiaryType: 'NATURAL_PERSON',
      clientName: 'عميل فاشل',
      recipientEntity: 'جهة اختبار',
      purpose: 'إثبات دخل',
      periodText: '2025',
      certifiedAmount: 100000,
      issueDate: '2026-01-01',
      qrPayload: 'qr-fail',
      auditorNotes: 'ملاحظات',
      securityHash: 'hash-fail',
      printedCount: 0,
    });

    expect(failedCert.registryStatus).toBe('PENDING');
    await new Promise((r) => setTimeout(r, 50));
    expect(failedCert.registryStatus).toBe('FAILED');

    mockRecord.mockRestore();
  });
});
