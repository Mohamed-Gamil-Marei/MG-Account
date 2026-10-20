import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/localDatabase';
import {
  assertCan,
  canPerform,
  PermissionError,
  PeriodLockError,
} from '../accessGuard';
import { PostingEngineService } from '../PostingEngineService';

describe('AccessGuard, Two-Level Period Locking, and Tamper-Evident Audit Log', () => {
  const clientId = 'client-1';
  const secondClientId = 'client-2';

  beforeEach(() => {
    db.resetToInitialStateForTesting();
    // Ensure client-2 exists for cross-client permission tests
    const state = db.getState();
    if (!state.clients.some((c) => c.id === secondClientId)) {
      db.addClient({
        id: secondClientId,
        name: 'شركة النيل للصناعات الهندسية',
        code: 'CLI-002',
        taxId: '200-300-400',
        fiscalYear: 2026,
        activeFiscalYear: 2026,
      });
    }
    db.setActiveClientContext(clientId, 2026);
  });

  describe('1) getCurrentUser & Unauthenticated Rejection', () => {
    it('returns null when no currentUserId is set (never falls back to first admin user)', () => {
      db.logout();
      expect(db.getCurrentUser()).toBeNull();
    });

    it('returns null when currentUserId points to a non-existent user', () => {
      db.getState().currentUserId = 'non-existent-user-id';
      expect(db.getCurrentUser()).toBeNull();
    });

    it('rejects all data mutations with "يجب تسجيل الدخول" when getCurrentUser is null', () => {
      db.logout();
      expect(db.getCurrentUser()).toBeNull();

      expect(() =>
        assertCan('POST_ENTRY', { clientId, fiscalYear: 2026, entityType: 'قيد يومية' })
      ).toThrowError(PermissionError);

      expect(() =>
        assertCan('POST_ENTRY', { clientId, fiscalYear: 2026, entityType: 'قيد يومية' })
      ).toThrow(/يجب تسجيل الدخول/);

      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-02-10',
          description: 'قيد بدون تسجيل دخول',
          isPosted: false,
          lines: [
            { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
            { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 500 },
          ],
        })
      ).toThrow(/يجب تسجيل الدخول/);

      expect(() =>
        db.addInvoice({
          clientId,
          invoiceNumber: 'INV-NO-AUTH',
          invoiceType: 'SALES',
          date: '2026-02-10',
          partnerName: 'عميل تجريبي',
          subtotal: 1000,
          totalVat: 140,
          grandTotal: 1140,
        })
      ).toThrow(/يجب تسجيل الدخول/);
    });
  });

  describe('2) Centralized accessGuard (assertCan) & Role/Flag/Client Scope Enforcement', () => {
    it('enforces canPostEntries, canEditPostedEntries, canDeleteRecords, and permittedClientIds on db methods', () => {
      // Create a restricted accountant with access only to client-1, no posting, no delete
      const juniorUser = db.addUser({
        name: 'محاسب تحت التمرين',
        email: 'junior@office.eg',
        role: 'JUNIOR_ACCOUNTANT',
        roleTitleArabic: 'محاسب مبتدئ',
        canManageUsers: false,
        canAccessTreasury: false,
        canAccessAuditTrail: false,
        canPostEntries: false,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        permittedClientIds: [clientId],
        createdAt: '2026-01-01',
      });

      // Prepare a posted entry as admin before switching user
      const postedEntry = db.addJournalEntry({
        clientId,
        date: '2026-02-15',
        description: 'قيد مرحل بواسطة المدير',
        isPosted: true,
        lines: [
          { id: 'l1', accountCode: '1101', accountName: 'النقدية', debit: 2000, credit: 0 },
          { id: 'l2', accountCode: '4101', accountName: 'الإيرادات', debit: 0, credit: 2000 },
        ],
      });

      const draftEntry = db.addJournalEntry({
        clientId,
        date: '2026-02-16',
        description: 'مسودة قيد',
        isPosted: false,
        lines: [
          { id: 'l3', accountCode: '1101', accountName: 'النقدية', debit: 1000, credit: 0 },
          { id: 'l4', accountCode: '4101', accountName: 'الإيرادات', debit: 0, credit: 1000 },
        ],
      });

      const inv = db.addInvoice({
        clientId,
        invoiceNumber: 'INV-2026-901',
        invoiceType: 'SALES',
        date: '2026-02-16',
        partnerName: 'شركة الأمل',
        subtotal: 1000,
        totalVat: 140,
        grandTotal: 1140,
      });

      // Switch to junior user
      db.switchUser(juniorUser.id);
      expect(db.getCurrentUser()?.id).toBe(juniorUser.id);

      // 1. Can create a DRAFT journal entry for permitted client-1
      const createdDraft = db.addJournalEntry({
        clientId,
        date: '2026-02-17',
        description: 'مسودة قيد مسموحة',
        isPosted: false,
        lines: [
          { id: 'l5', accountCode: '1101', accountName: 'النقدية', debit: 300, credit: 0 },
          { id: 'l6', accountCode: '4101', accountName: 'الإيرادات', debit: 0, credit: 300 },
        ],
      });
      expect(createdDraft.isPosted).toBe(false);

      // 2. Cannot post an entry directly or via togglePostEntry or postInvoice (canPostEntries = false)
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-02-18',
          description: 'محاولة ترحيل مباشر بدون صلاحية',
          isPosted: true,
          lines: [
            { id: 'l7', accountCode: '1101', accountName: 'النقدية', debit: 300, credit: 0 },
            { id: 'l8', accountCode: '4101', accountName: 'الإيرادات', debit: 0, credit: 300 },
          ],
        })
      ).toThrowError(PermissionError);

      expect(() => db.togglePostEntry(draftEntry.id)).toThrowError(PermissionError);
      expect(() => db.postInvoice(inv.id)).toThrowError(PermissionError);
      expect(() => PostingEngineService.postInvoice(inv.id)).toThrowError(PermissionError);

      // 3. Cannot edit a posted entry (canEditPostedEntries = false)
      expect(() =>
        db.updateJournalEntry({
          ...postedEntry,
          description: 'تعديل غير مصرح به',
        })
      ).toThrowError(PermissionError);

      // 4. Cannot delete records (canDeleteRecords = false)
      expect(() => db.deleteJournalEntry(draftEntry.id)).toThrowError(PermissionError);

      // 5. Cannot access unpermitted client (secondClientId)
      expect(() =>
        db.addJournalEntry({
          clientId: secondClientId,
          date: '2026-02-17',
          description: 'قيد لعميل غير مصرح به',
          isPosted: false,
          lines: [
            { id: 'l9', accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
            { id: 'l10', accountCode: '4101', accountName: 'الإيرادات', debit: 0, credit: 500 },
          ],
        })
      ).toThrowError(PermissionError);

      expect(() =>
        db.batchAddInvoices([
          {
            clientId: secondClientId,
            invoiceNumber: 'INV-UNAUTH-CLIENT',
            invoiceType: 'SALES',
            date: '2026-02-17',
            partnerName: 'عميل خارج النطاق',
            subtotal: 500,
            totalVat: 70,
            grandTotal: 570,
          },
        ])
      ).toThrowError(PermissionError);

      // 6. Cannot approve financial statements, issue certificates, manage users, or import backups
      expect(() =>
        db.addApprovedStatement({
          clientId,
          fiscalYear: 2026,
          approvedBy: juniorUser.name,
          source: 'LEDGER',
          trialBalanceRows: [],
          incomeStatement: {},
          balanceSheet: {},
          cashFlow: {},
        })
      ).toThrowError(PermissionError);

      expect(() =>
        assertCan('ISSUE_CERTIFICATE', { clientId, entityType: 'شهادة محاسبية' })
      ).toThrowError(PermissionError);

      expect(() =>
        assertCan('MANAGE_USERS', { entityType: 'مستخدم' })
      ).toThrowError(PermissionError);

      expect(() =>
        assertCan('IMPORT_BACKUP', { entityType: 'نسخة احتياطية' })
      ).toThrowError(PermissionError);

      // Verify canPerform helper for UI disabled states and tooltips
      const postCheck = canPerform('POST_ENTRY', { clientId });
      expect(postCheck.allowed).toBe(false);
      expect(postCheck.reason).toContain('canPostEntries');
    });

    it('denies non-admin user with undefined/empty permittedClientIds from accessing any client', () => {
      const unassignedAccountant = db.addUser({
        name: 'محاسب بدون عملاء معينين',
        email: 'unassigned@office.eg',
        role: 'SENIOR_ACCOUNTANT',
        roleTitleArabic: 'محاسب أول',
        canManageUsers: false,
        canAccessTreasury: true,
        canAccessAuditTrail: false,
        canPostEntries: true,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        permittedClientIds: [],
        createdAt: '2026-01-01',
      });

      db.switchUser(unassignedAccountant.id);

      expect(() =>
        db.addTaxDeclaration({
          id: 'decl-unassigned-1',
          clientId,
          declarationType: 'VAT_MONTHLY_10',
          period: '2026-01',
          fiscalYear: 2026,
          dueDate: '2026-03-31',
          status: 'DRAFT',
        })
      ).toThrowError(PermissionError);
    });
  });

  describe('3) Two-Level Period Locking (Monthly/Quarterly + Annual)', () => {
    it('enforces monthly and quarterly period locks on journal entries, invoices, and treasury transactions', () => {
      // Lock March 2026 (2026-03) for client-1
      const marchLock = db.lockMonthlyPeriod(
        clientId,
        2026,
        3,
        'إقفال شهر مارس بعد تقديم إقرار القيمة المضافة'
      );
      expect(marchLock.scope).toBe('MONTH');
      expect(db.isPeriodLocked(clientId, '2026-03-15')).toBe(true);
      expect(db.isPeriodLocked(clientId, '2026-04-10')).toBe(false);

      // Rejects creating journal entry in March 2026 with PeriodLockError mentioning the period
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد داخل شهر مقفل',
          isPosted: false,
          lines: [
            { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
            { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 500 },
          ],
        })
      ).toThrowError(PeriodLockError);

      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد داخل شهر مقفل',
          isPosted: false,
          lines: [
            { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
            { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 500 },
          ],
        })
      ).toThrow(/2026-03|مارس 2026/);

      // Rejects adding invoice in March 2026
      expect(() =>
        db.addInvoice({
          clientId,
          invoiceNumber: 'INV-LOCKED-MAR',
          invoiceType: 'SALES',
          date: '2026-03-12',
          partnerName: 'شركة مقفلة',
          subtotal: 1000,
          totalVat: 140,
          grandTotal: 1140,
        })
      ).toThrowError(PeriodLockError);

      // Rejects adding treasury transaction in March 2026
      expect(() =>
        db.addTreasuryTransaction({
          id: 'tr-locked-mar',
          date: '2026-03-25',
          type: 'INCOME_FEES',
          amount: 1500,
          clientId,
          description: 'تحصيل أتعاب في شهر مقفل',
        })
      ).toThrowError(PeriodLockError);

      // Allows entries in April 2026 (open month)
      const aprilEntry = db.addJournalEntry({
        clientId,
        date: '2026-04-10',
        description: 'قيد في شهر مفتوح (أبريل)',
        isPosted: true,
        lines: [
          { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 750, credit: 0 },
          { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 750 },
        ],
      });
      expect(aprilEntry.id).toBeTruthy();

      // Lock Q2 2026 (April - June) and verify reversal of April entry is now blocked
      db.lockQuarterlyPeriod(clientId, 2026, 2, 'إقفال الربع الثاني 2026');
      expect(db.isPeriodLocked(clientId, '2026-04-10')).toBe(true);
      expect(() =>
        db.createReversalJournalEntry(aprilEntry.id, 'محاولة عكس في ربع مقفل', '2026-04-15')
      ).toThrowError(PeriodLockError);
    });

    it('requires ADMIN or PARTNER_AUDITOR and a non-empty reason to unlock a locked period', () => {
      db.lockFiscalPeriod(clientId, 2026, 'إقفال ختامي للسنة المالية 2026');
      expect(db.isPeriodLocked(clientId, '2026-11-01', 2026)).toBe(true);

      // Empty reason is rejected
      expect(() => db.unlockFiscalPeriod(clientId, 2026, '   ')).toThrow(/سبب إلزامي/);

      // Non-admin/non-partner cannot unlock
      const seniorUser = db.addUser({
        name: 'محاسب أول',
        email: 'senior@office.eg',
        role: 'SENIOR_ACCOUNTANT',
        roleTitleArabic: 'محاسب أول',
        canManageUsers: false,
        canAccessTreasury: true,
        canAccessAuditTrail: true,
        canPostEntries: true,
        canEditPostedEntries: true,
        canDeleteRecords: true,
        permittedClientIds: [clientId],
        createdAt: '2026-01-01',
      });
      db.switchUser(seniorUser.id);
      expect(() =>
        db.unlockFiscalPeriod(clientId, 2026, 'محاولة فك قفل من محاسب غير شريك')
      ).toThrowError(PermissionError);

      // Switch back to ADMIN and unlock with reason
      db.switchUser('user-admin');
      const unlocked = db.unlockFiscalPeriod(
        clientId,
        2026,
        'إعادة فتح السنة المالية لتسجيل تسوية جردية معتمدة'
      );
      expect(unlocked?.isLocked).toBe(false);
      expect(db.isPeriodLocked(clientId, '2026-11-01', 2026)).toBe(false);
    });
  });

  describe('4) Tamper-Evident Audit Log & Unlimited Retention (>1000 entries)', () => {
    it('logs every modification with before/after summaries, freezes entries, verifies hash chain, and never truncates at 1000', () => {
      const initialLogCount = db.getAuditLogs().length;

      const entry = db.addJournalEntry({
        clientId,
        date: '2026-05-01',
        description: 'قيد اختبار سجل المراجعة',
        isPosted: false,
        lines: [
          { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 1200, credit: 0 },
          { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 1200 },
        ],
      });

      db.updateJournalEntry({
        ...entry,
        description: 'قيد اختبار سجل المراجعة بعد التعديل',
      });

      const logsAfterOps = db.getAuditLogs();
      expect(logsAfterOps.length).toBeGreaterThanOrEqual(initialLogCount + 2);

      const latestLog = logsAfterOps[0];
      expect(Object.isFrozen(latestLog)).toBe(true);
      expect(latestLog.userId).toBe('user-admin');
      expect(latestLog.clientId).toBe(clientId);
      expect(latestLog.hash).toBeTruthy();
      expect(latestLog.prevHash).toBeTruthy();

      // Verify direct property mutation on frozen audit log throws in strict mode
      expect(() => {
        (latestLog as { details: string }).details = 'تلاعب في السجل';
      }).toThrow();

      // Verify chain integrity
      expect(db.verifyAuditChain().valid).toBe(true);

      // Verify no 1000-entry limit: append 1,010 audit entries and confirm all are retained
      for (let i = 0; i < 1010; i++) {
        db.logAudit({
          action: 'UPDATE',
          entityType: 'JOURNAL_ENTRY',
          entityId: `bulk-je-${i}`,
          clientId,
          details: `سجل مراجعة متسلسل رقم ${i}`,
        });
      }

      expect(db.getAuditLogs().length).toBeGreaterThan(1010);
      expect(db.verifyAuditChain().valid).toBe(true);
    });
  });

  describe('5) فحص أمني آلي: كل دالة تغيير في قاعدة البيانات محمية بـ assertCan أو موسومة بـ @public-readonly-safe', () => {
    it('يمر على كافة دوال db العامة التي تبدأ بـ add|update|delete|void|post|save|batch|import|reset|dispose|lock|unlock ويفشل إذا وُجدت دالة بدون حماية', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const dbFilePath = path.resolve(__dirname, '../../db/localDatabase.ts');
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const lines = content.split('\n');
      const mutationPrefixes =
        /^(add|update|delete|void|post|save|batch|import|reset|dispose|lock|unlock)/;
      const unprotected: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = /^\s*public\s+(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/.exec(line);
        if (match) {
          const methodName = match[1];
          if (mutationPrefixes.test(methodName)) {
            const prevLine = i > 0 ? lines[i - 1] : '';
            const prevPrevLine = i > 1 ? lines[i - 2] : '';
            const isMarkedSafe =
              prevLine.includes('@public-readonly-safe') ||
              prevPrevLine.includes('@public-readonly-safe');

            let body = '';
            for (let j = i; j < Math.min(i + 40, lines.length); j++) {
              body += lines[j] + '\n';
            }
            const hasAssertCan = body.includes('assertCan(');

            if (!isMarkedSafe && !hasAssertCan) {
              unprotected.push(methodName);
            }
          }
        }
      }

      expect(unprotected).toEqual([]);
    });
  });
});
