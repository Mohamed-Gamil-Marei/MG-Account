import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/localDatabase';
import { AccountingCalculator } from '../AccountingCalculator';
import { buildFinancialStatementsQrText } from '../../utils/qrCodeGenerator';
import { JournalEntry, Invoice } from '../../types';

describe('Multi-Company Isolation, Fiscal Year Bounds, StatementModel & Manager Adjustments', () => {
  beforeEach(() => {
    db.resetToInitialStateForTesting();
  });

  // =========================================================================
  // Requirement A-6 & Acceptance Criterion: Multi-Company Isolation
  // =========================================================================
  it('guarantees complete isolation between two clients sharing identical account codes', () => {
    // Client A
    const clientAId = 'client-iso-a';
    db.addClient({
      id: clientAId,
      name: 'شركة الفا للخدمات ش.م.م',
      code: 'ALFA-01',
      activityTemplate: 'SERVICE',
      fiscalYear: 2026,
    });
    db.setClientAccountOpeningBalance(clientAId, 2026, '1101', 500000, 0, 'نقدية ألفا');
    db.setClientAccountOpeningBalance(clientAId, 2026, '3101', 0, 500000, 'رأس مال ألفا');

    // Client B
    const clientBId = 'client-iso-b';
    db.addClient({
      id: clientBId,
      name: 'شركة بيتا الهندسية ش.ذ.م.م',
      code: 'BETA-02',
      activityTemplate: 'SERVICE',
      fiscalYear: 2026,
    });
    db.setClientAccountOpeningBalance(clientBId, 2026, '1101', 80000, 0, 'نقدية بيتا');
    db.setClientAccountOpeningBalance(clientBId, 2026, '3101', 0, 80000, 'رأس مال بيتا');

    // Add revenue entry to Client A only
    const entryA: JournalEntry = {
      id: 'je-alfa-1',
      entryNumber: 1,
      date: '2026-03-15',
      clientId: clientAId,
      fiscalYear: 2026,
      description: 'إيراد استشارات ألفا',
      lines: [
        { id: 'l1', accountCode: '1101', accountName: 'نقدية', debit: 120000, credit: 0 },
        { id: 'l2', accountCode: '4101', accountName: 'إيرادات', debit: 0, credit: 120000 },
      ],
      isPosted: true,
      status: 'POSTED',
    };
    db.addJournalEntry(entryA);

    // Compute trial balances for both clients
    const accountsA = db.getClientAccounts(clientAId, 2026);
    const entriesA = db.getJournalEntries(clientAId, 2026);
    const tbA = AccountingCalculator.computeTrialBalance(accountsA, entriesA, {
      clientId: clientAId,
      fiscalYear: 2026,
    });

    const accountsB = db.getClientAccounts(clientBId, 2026);
    const entriesB = db.getJournalEntries(clientBId, 2026);
    const tbB = AccountingCalculator.computeTrialBalance(accountsB, entriesB, {
      clientId: clientBId,
      fiscalYear: 2026,
    });

    // Check Client A: Cash = 500,000 + 120,000 = 620,000
    const cashA = tbA.rows.find((r) => r.accountCode === '1101');
    expect(cashA?.closingDebit).toBe(620000);

    // Check Client B: Cash must remain strictly 80,000 (no leak from Client A)
    const cashB = tbB.rows.find((r) => r.accountCode === '1101');
    expect(cashB?.closingDebit).toBe(80000);
    expect(tbB.rows.find((r) => r.accountCode === '4101')).toBeUndefined();

    // Build statement models: Client A net income = 120,000, Client B net income = 0
    const modelA = db.buildStatementModel(clientAId, 2026);
    const modelB = db.buildStatementModel(clientBId, 2026);
    expect(modelA.incomeStatement.operatingRevenue).toBe(120000);
    expect(modelA.incomeStatement.netIncome).toBe(120000);
    expect(modelB.incomeStatement.operatingRevenue).toBe(0);
    expect(modelB.incomeStatement.netIncome).toBe(0);
  });

  // =========================================================================
  // Requirement A-2, A-6: Fiscal Year starting in July
  // =========================================================================
  it('accurately computes fiscal year bounds for a company whose fiscal year starts in July', () => {
    const clientJulyId = 'client-july';
    db.addClient({
      id: clientJulyId,
      name: 'الشركة المصرية لتجارة المحاصيل (سنة تبدأ 1 يوليو)',
      fiscalYear: 2026,
      fiscalYearStartMonth: 7,
      fiscalYearEndMonth: 6,
    });

    const bounds2026 = db.getClientFiscalYearBounds(clientJulyId, 2026);
    expect(bounds2026.startDate).toBe('2025-07-01');
    expect(bounds2026.endDate).toBe('2026-06-30');
    expect(bounds2026.isCalendarYear).toBe(false);

    // Resolving dates to fiscal year
    const fyForAug2025 = db.resolveClientFiscalYearForDate(clientJulyId, '2025-08-15');
    expect(fyForAug2025).toBe(2026);

    const fyForMay2026 = db.resolveClientFiscalYearForDate(clientJulyId, '2026-05-20');
    expect(fyForMay2026).toBe(2026);

    const fyForJul2026 = db.resolveClientFiscalYearForDate(clientJulyId, '2026-07-01');
    expect(fyForJul2026).toBe(2027);
  });

  // =========================================================================
  // Requirement A-1, A-6: Out-of-bounds date rejection or relocation
  // =========================================================================
  it('rejects an entry outside client fiscal year bounds when explicit fiscalYear is mismatched', () => {
    const clientId = 'client-date-bounds';
    db.addClient({
      id: clientId,
      name: 'شركة الاختبار المالي',
      fiscalYear: 2026,
    });

    // An entry dated in 2025 with explicit fiscalYear 2026 should be rejected
    expect(() => {
      db.addJournalEntry({
        entryNumber: 1,
        date: '2025-05-10',
        clientId,
        fiscalYear: 2026,
        description: 'قيد بتاريخ سنة سابقة',
        lines: [
          { id: 'l-err-1', accountCode: '1101', accountName: 'نقدية', debit: 1000, credit: 0 },
          { id: 'l-err-2', accountCode: '3101', accountName: 'رأس مال', debit: 0, credit: 1000 },
        ],
      });
    }).toThrow(/خارج حدود السنة المالية/);
  });

  // =========================================================================
  // Requirement A-4: Opening balance rollover & repeat protection
  // =========================================================================
  it('previews and executes rollover, prevents duplicate execution without confirmRepeat, and warns on edits', () => {
    const clientId = 'client-rollover-test';
    db.addClient({
      id: clientId,
      name: 'شركة الترحيل والسنوات اللاحقة',
      fiscalYear: 2025,
    });
    db.setClientAccountOpeningBalance(clientId, 2025, '1101', 300000, 0, 'افتتاحي 2025');
    db.setClientAccountOpeningBalance(clientId, 2025, '3101', 0, 300000, 'رأس مال 2025');

    // Add entry in 2025
    db.addJournalEntry({
      entryNumber: 1,
      date: '2025-06-01',
      clientId,
      fiscalYear: 2025,
      description: 'مبيعات نقدية 2025',
      lines: [
        { id: 'l-ro-1', accountCode: '1101', accountName: 'نقدية', debit: 50000, credit: 0 },
        { id: 'l-ro-2', accountCode: '4101', accountName: 'إيرادات', debit: 0, credit: 50000 },
      ],
      isPosted: true,
      status: 'POSTED',
    });

    // Preview rollover to 2026
    const preview = db.previewRolloverClosingBalances(clientId, 2025);
    expect(preview.fromFiscalYear).toBe(2025);
    expect(preview.toFiscalYear).toBe(2026);
    const cashPreview = preview.previewRows.find((i) => i.accountCode === '1101');
    expect(cashPreview?.closingDebit).toBe(350000);

    // Perform actual rollover to 2026
    const result1 = db.rolloverClosingBalancesToNextYear(clientId, 2025);
    expect(result1.targetYear).toBe(2026);
    expect(result1.count).toBeGreaterThan(0);

    // Check that 2026 opening balance now reflects 350,000 for cash
    const acc2026 = db.getClientAccounts(clientId, 2026);
    const cash2026 = acc2026.find((a) => a.code === '1101');
    expect(cash2026?.openingBalanceDebit).toBe(350000);

    // Repeating rollover without confirmRepeat must throw
    expect(() => {
      db.rolloverClosingBalancesToNextYear(clientId, 2025);
    }).toThrow(/يُمنع تكرار الترحيل|مسبقاً/);

    // Repeating with confirmRepeat succeeds
    const result2 = db.rolloverClosingBalancesToNextYear(clientId, 2025, true, 'إعادة ترحيل معتمدة');
    expect(result2.count).toBeGreaterThan(0);

    // Modifying opening balance of 2025 after rollover emits warning in audit log
    const editRes: any = db.setClientAccountOpeningBalance(
      clientId,
      2025,
      '1101',
      400000,
      0,
      'تعديل افتتاحي لاحق'
    );
    expect(editRes.hasSubsequentRolloverWarning || editRes.postRolloverWarning).toBeTruthy();
  });

  // =========================================================================
  // Requirement A-5: Sequential numbering for (client + year) without collisions
  // =========================================================================
  it('generates strictly sequential entry numbers per client and year without gaps or length+1 bugs', () => {
    const clientId = 'client-seq-num';
    db.addClient({ id: clientId, name: 'شركة الترقيم المتسلسل', fiscalYear: 2026 });

    const e1 = db.addJournalEntry({
      date: '2026-01-10',
      clientId,
      fiscalYear: 2026,
      description: 'قيد 1',
      lines: [
        { id: 'l-s1-1', accountCode: '1101', accountName: 'نقدية', debit: 100, credit: 0 },
        { id: 'l-s1-2', accountCode: '3101', accountName: 'رأس مال', debit: 0, credit: 100 },
      ],
    });
    expect(e1.entryNumber).toBe(1);

    const e2 = db.addJournalEntry({
      date: '2026-01-15',
      clientId,
      fiscalYear: 2026,
      description: 'قيد 2',
      lines: [
        { id: 'l-s2-1', accountCode: '1101', accountName: 'نقدية', debit: 200, credit: 0 },
        { id: 'l-s2-2', accountCode: '3101', accountName: 'رأس مال', debit: 0, credit: 200 },
      ],
    });
    expect(e2.entryNumber).toBe(2);

    // Delete e1 or filter, e3 must still be 3 (not reusing or colliding)
    const e3 = db.addJournalEntry({
      date: '2026-01-20',
      clientId,
      fiscalYear: 2026,
      description: 'قيد 3',
      lines: [
        { id: 'l-s3-1', accountCode: '1101', accountName: 'نقدية', debit: 300, credit: 0 },
        { id: 'l-s3-2', accountCode: '3101', accountName: 'رأس مال', debit: 0, credit: 300 },
      ],
    });
    expect(e3.entryNumber).toBe(3);
  });

  // =========================================================================
  // Requirement B, C: StatementModel, Manager Adjustments, Reversion, Propagation
  // =========================================================================
  it('ripples manager adjustments on revenue to net profit, equity, cash flows, notes and ratios, and allows reset', () => {
    const clientId = 'client-adjustments-model';
    db.addClient({
      id: clientId,
      name: 'الشركة الهندسية للتوريدات ش.م.م',
      fiscalYear: 2026,
    });
    db.setClientAccountOpeningBalance(clientId, 2026, '1101', 100000, 0, 'افتتاحي نقدية');
    db.setClientAccountOpeningBalance(clientId, 2026, '3101', 0, 100000, 'افتتاحي رأس مال');

    // Add 200,000 ledger revenue
    db.addJournalEntry({
      date: '2026-04-10',
      clientId,
      fiscalYear: 2026,
      description: 'إيرادات توريدات',
      lines: [
        { id: 'l-rev-1', accountCode: '1101', accountName: 'نقدية', debit: 200000, credit: 0 },
        { id: 'l-rev-2', accountCode: '4101', accountName: 'إيرادات النشاط', debit: 0, credit: 200000 },
      ],
      isPosted: true,
      status: 'POSTED',
    });

    // Map account 4101 to IS_OPERATING_REVENUE and 1101 to BS_CASH_EQUIVALENTS
    db.setClientStatementMapping(clientId, {
      '4101': 'IS_OPERATING_REVENUE',
      '1101': 'BS_CASH_EQUIVALENTS',
      '3101': 'BS_PAID_UP_CAPITAL',
    });

    const initialModel = db.buildStatementModel(clientId, 2026);
    expect(initialModel.incomeStatement.operatingRevenue).toBe(200000);
    expect(initialModel.incomeStatement.netIncome).toBe(200000);
    expect(initialModel.balanceSheet.totals.retainedEarnings).toBe(200000);

    // Manager overrides revenue to 350,000 with mandatory reason
    db.upsertManagerStatementAdjustment({
      clientId,
      fiscalYear: 2026,
      lineKey: 'IS_OPERATING_REVENUE',
      period: 'CURRENT',
      overrideAmount: 350000,
      reason: 'إضافة إيرادات عقود مؤكدة وفق معيار الإيراد EAS 48',
    });

    const updatedModel = db.buildStatementModel(clientId, 2026);
    // Revenue and net profit updated
    expect(updatedModel.incomeStatement.operatingRevenue).toBe(350000);
    expect(updatedModel.incomeStatement.netIncome).toBe(350000);

    // Retained earnings in equity updated from the single model source
    expect(updatedModel.equityStatement.endingRetainedEarnings).toBe(350000);
    expect(updatedModel.balanceSheet.totals.retainedEarnings).toBe(350000);

    // Indirect cash flow starting net income updated
    expect(updatedModel.cashFlow.operatingActivities.netIncome).toBe(350000);

    // Notes reflect new revenue figure
    const revNote = updatedModel.notes.find((n) => n.linkedLineKeys?.includes('IS_OPERATING_REVENUE'));
    expect(revNote?.renderedTemplateText).toContain('350,000');
    expect(revNote?.needsReview).toBe(true);

    // Internal adjustments impact report contains this adjustment
    expect(updatedModel.adjustmentsImpactReport.length).toBe(1);
    expect(updatedModel.adjustmentsImpactReport[0].diff).toBe(150000);
    expect(updatedModel.adjustmentsImpactReport[0].reason).toContain('EAS 48');

    // Reconciliation bar detects the manual adjustment and flags differences without artificial balancing
    expect(updatedModel.reconciliation.manualAdjustmentsCount).toBe(1);
    expect(updatedModel.reconciliation.manualAdjustmentsTotalAbsolute).toBe(150000);

    // Reset line back to ledger
    db.resetManagerStatementAdjustmentLine({
      clientId,
      fiscalYear: 2026,
      lineKey: 'IS_OPERATING_REVENUE',
      period: 'CURRENT',
    });

    const resetModel = db.buildStatementModel(clientId, 2026);
    expect(resetModel.incomeStatement.operatingRevenue).toBe(200000);
    expect(resetModel.incomeStatement.netIncome).toBe(200000);
    expect(resetModel.adjustmentsImpactReport.length).toBe(0);
    expect(resetModel.reconciliation.manualAdjustmentsCount).toBe(0);
  });

  // =========================================================================
  // Requirement D: Versioned Statement Approval & Reissue (N -> N+1)
  // =========================================================================
  it('manages approved statement versions, increments to N+1 on edit/reissue, and marks prior version SUPERSEDED', () => {
    const clientId = 'client-versioned-approval';
    db.addClient({
      id: clientId,
      name: 'شركة النظم الحديثة للاستثمار',
      fiscalYear: 2026,
    });
    db.setClientAccountOpeningBalance(clientId, 2026, '1101', 50000, 0, 'نقدية');
    db.setClientAccountOpeningBalance(clientId, 2026, '3101', 0, 50000, 'رأس مال');

    // First approval (Version 1)
    const approvalV1 = db.approveStatementModelVersion({
      clientId,
      fiscalYear: 2026,
      reissueReason: 'الاعتماد السنوي الأول للقوائم المالية',
    });
    expect(approvalV1.snapshot.version).toBe(1);
    expect(approvalV1.snapshot.status).toBe('APPROVED');
    expect(approvalV1.snapshot.sha256Fingerprint).toBeDefined();
    expect(approvalV1.snapshot.verificationCode).toBeDefined();

    // Check QR code payload for V1
    const qrTextV1 = buildFinancialStatementsQrText({
      companyName: 'شركة النظم الحديثة للاستثمار',
      fiscalYear: 2026,
      totalAssets: approvalV1.snapshot.model.balanceSheet.totals.totalAssets,
      netProfit: approvalV1.snapshot.model.incomeStatement.netIncome,
      version: 1,
      verificationCode: approvalV1.snapshot.verificationCode,
      approvedAt: approvalV1.snapshot.approvedAt,
      status: approvalV1.snapshot.status,
    });
    expect(qrTextV1).toContain('STATUS:سليم');

    // Now start editing approved version 1
    const draft = db.startEditingApprovedStatementVersion(clientId, 2026);
    expect(draft.draftLayer.isDraftOfVersion ?? (draft.draftLayer as any).basedOnVersion).toBe(1);

    // Apply manager override in the draft
    db.upsertManagerStatementAdjustment({
      clientId,
      fiscalYear: 2026,
      lineKey: 'BS_CASH_EQUIVALENTS',
      period: 'CURRENT',
      overrideAmount: 75000,
      reason: 'إعادة تبويب شيكات تحت التحصيل بنكية',
    });

    // Reissue approval (Produces Version 2)
    const approvalV2 = db.approveStatementModelVersion({
      clientId,
      fiscalYear: 2026,
      reissueReason: 'إعادة إصدار معدلة بعد تسوية الحسابات البنكية',
    });
    expect(approvalV2.snapshot.version).toBe(2);
    expect(approvalV2.snapshot.status).toBe('APPROVED');
    expect(approvalV2.snapshot.supersededFromVersion).toBe(1);

    // Prior version 1 must now be marked SUPERSEDED
    const listVersions = db.getApprovedStatementsForClient(clientId, 2026);
    const v1Record = listVersions.find((s) => s.version === 1);
    expect(v1Record?.status).toBe('SUPERSEDED');
    expect(v1Record?.supersededByVersion).toBe(2);
    expect(v1Record?.supersededAt).toBeDefined();

    // QR verification for the superseded version must indicate that it was replaced by a newer version
    const qrTextV1Superseded = buildFinancialStatementsQrText({
      companyName: 'شركة النظم الحديثة للاستثمار',
      fiscalYear: 2026,
      totalAssets: v1Record!.model.balanceSheet.totals.totalAssets,
      netProfit: v1Record!.model.incomeStatement.netIncome,
      version: 1,
      verificationCode: v1Record!.verificationCode,
      approvedAt: v1Record!.approvedAt,
      status: 'SUPERSEDED',
      supersededAt: v1Record!.supersededAt,
      supersededByVersion: 2,
    });
    expect(qrTextV1Superseded).toContain('تم استبداله بإصدار أحدث');
    expect(qrTextV1Superseded).toContain('الإصدار رقم 2');
  });

  // =========================================================================
  // Requirement E: Security & Access Guard Permissions
  // =========================================================================
  it('enforces EDIT_FINAL_STATEMENTS permission check directly in db methods', () => {
    const clientId = 'client-rbac-test';
    db.addClient({ id: clientId, name: 'شركة حماية الصلاحيات', fiscalYear: 2026 });

    // Switch current user to a low-privilege role without EDIT_FINAL_STATEMENTS (e.g. DATA_ENTRY)
    db.setCurrentUser({
      id: 'user-assistant',
      name: 'محاسب مدخل بيانات',
      role: 'DATA_ENTRY',
      permissions: ['VIEW', 'DATA_ENTRY'],
      permittedClientIds: [clientId],
    });

    // Attempting to modify statement model directly via db must throw AccessDeniedError
    expect(() => {
      db.upsertManagerStatementAdjustment({
        clientId,
        fiscalYear: 2026,
        lineKey: 'IS_OPERATING_REVENUE',
        period: 'CURRENT',
        overrideAmount: 900000,
        reason: 'محاولة تعديل بدون صلاحية',
      });
    }).toThrow(/صلاحية/);

    expect(() => {
      db.setStatementLineDisplayName({
        clientId,
        fiscalYear: 2026,
        lineKey: 'IS_OPERATING_REVENUE',
        customLabelAr: 'تسمية غير مصرح بها',
      });
    }).toThrow(/صلاحية/);

    expect(() => {
      db.approveStatementModelVersion({
        clientId,
        fiscalYear: 2026,
        reissueReason: 'محاولة اعتماد غير مصرح بها',
      });
    }).toThrow(/صلاحية/);
  });
});
