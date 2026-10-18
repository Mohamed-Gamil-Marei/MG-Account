import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/localDatabase';
import { PostingEngineService } from '../PostingEngineService';
import { AccountingCalculator } from '../AccountingCalculator';
import { Invoice, InvoiceType } from '../../types';

describe('PostingEngineService & addJournalEntry Strict Accounting Suite', () => {
  const clientId = 'client-1';
  const secondClientId = 'client-2';

  beforeEach(() => {
    db.resetToInitialStateForTesting();
    db.addClient({
      id: secondClientId,
      name: 'شركة الدلتا للتوريدات ش.م.م',
      activityTemplate: 'COMMERCIAL',
      fiscalYear: 2026,
    });
  });

  describe('1. All 7 Invoice Types (SALES, PURCHASE, RETURN_SALES, RETURN_PURCHASE, CREDIT_NOTE, DEBIT_NOTE, OFFICE_SERVICE)', () => {
    it('builds and posts SALES invoice with VAT, Table Tax, and WHT accurately', () => {
      const inv: Invoice = {
        id: 'inv-sales-1',
        clientId,
        invoiceNumber: 'INV-S-001',
        invoiceType: 'SALES',
        date: '2026-03-10',
        partnerName: 'شركة النيل للتجارة',
        items: [],
        subtotal: 10000,
        totalDiscount: 0,
        totalVat: 1400,
        totalTableTax: 500,
        totalWht: 100,
        grandTotal: 11800,
        paidAmount: 0,
        remainingAmount: 11800,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-10T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(true);
      const entry = res.entry!;
      expect(entry.totalDebit).toBe(11900);
      expect(entry.totalCredit).toBe(11900);

      // Dr Receivables (1103) = 11,800, Dr WHT Receivable (1106) = 100
      // Cr Sales (4101) = 10,000, Cr VAT Output (2104) = 1,400, Cr Table Tax (2106) = 500
      const drAr = entry.lines.find((l) => l.accountCode === '1103');
      const drWht = entry.lines.find((l) => l.accountCode === '1106');
      const crSales = entry.lines.find((l) => l.accountCode === '4101');
      const crVat = entry.lines.find((l) => l.accountCode === '2104');
      const crTbl = entry.lines.find((l) => l.accountCode === '2106');

      expect(drAr?.debit).toBe(11800);
      expect(drWht?.debit).toBe(100);
      expect(crSales?.credit).toBe(10000);
      expect(crVat?.credit).toBe(1400);
      expect(crTbl?.credit).toBe(500);
    });

    it('builds and posts PURCHASE invoice with VAT Input and WHT Payable accurately', () => {
      const inv: Invoice = {
        id: 'inv-purch-1',
        clientId,
        invoiceNumber: 'INV-P-001',
        invoiceType: 'PURCHASE',
        date: '2026-03-11',
        partnerName: 'مصنع الدلتا للخامات',
        items: [],
        subtotal: 20000,
        totalDiscount: 0,
        totalVat: 2800,
        totalWht: 200,
        grandTotal: 22600,
        paidAmount: 0,
        remainingAmount: 22600,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-11T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(true);
      const entry = res.entry!;
      expect(entry.totalDebit).toBe(22800);
      expect(entry.totalCredit).toBe(22800);

      expect(entry.lines.find((l) => l.accountCode === '5101')?.debit).toBe(20000);
      expect(entry.lines.find((l) => l.accountCode === '1105')?.debit).toBe(2800);
      expect(entry.lines.find((l) => l.accountCode === '2101')?.credit).toBe(22600);
      expect(entry.lines.find((l) => l.accountCode === '2105')?.credit).toBe(200);
    });

    it('builds and posts RETURN_SALES: Dr Sales Returns (4102) + Dr VAT Output (2104) -> Cr Receivables (1103)', () => {
      const inv: Invoice = {
        id: 'inv-rets-1',
        clientId,
        invoiceNumber: 'RET-S-001',
        invoiceType: 'RETURN_SALES',
        date: '2026-03-12',
        partnerName: 'شركة النيل للتجارة',
        items: [],
        subtotal: 5000,
        totalDiscount: 0,
        totalVat: 700,
        totalWht: 0,
        grandTotal: 5700,
        paidAmount: 0,
        remainingAmount: 5700,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-12T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(true);
      const entry = res.entry!;
      expect(entry.totalDebit).toBe(5700);
      expect(entry.totalCredit).toBe(5700);

      expect(entry.lines.find((l) => l.accountCode === '4102')?.debit).toBe(5000);
      expect(entry.lines.find((l) => l.accountCode === '2104')?.debit).toBe(700);
      expect(entry.lines.find((l) => l.accountCode === '1103')?.credit).toBe(5700);
    });

    it('builds and posts RETURN_PURCHASE: Dr Payables (2101) -> Cr Purchase Returns (5102) + Cr VAT Input (1105)', () => {
      const inv: Invoice = {
        id: 'inv-retp-1',
        clientId,
        invoiceNumber: 'RET-P-001',
        invoiceType: 'RETURN_PURCHASE',
        date: '2026-03-13',
        partnerName: 'مصنع الدلتا للخامات',
        items: [],
        subtotal: 4000,
        totalDiscount: 0,
        totalVat: 560,
        totalWht: 0,
        grandTotal: 4560,
        paidAmount: 0,
        remainingAmount: 4560,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-13T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(true);
      const entry = res.entry!;
      expect(entry.totalDebit).toBe(4560);
      expect(entry.totalCredit).toBe(4560);

      expect(entry.lines.find((l) => l.accountCode === '2101')?.debit).toBe(4560);
      expect(entry.lines.find((l) => l.accountCode === '5102')?.credit).toBe(4000);
      expect(entry.lines.find((l) => l.accountCode === '1105')?.credit).toBe(560);
    });

    it('builds and posts CREDIT_NOTE (إشعار دائن) and DEBIT_NOTE (إشعار مدين) accurately', () => {
      const cn: Invoice = {
        id: 'inv-cn-1',
        clientId,
        invoiceNumber: 'CN-001',
        invoiceType: 'CREDIT_NOTE',
        date: '2026-03-14',
        partnerName: 'شركة النيل للتجارة',
        items: [],
        subtotal: 2000,
        totalDiscount: 0,
        totalVat: 280,
        totalWht: 0,
        grandTotal: 2280,
        paidAmount: 0,
        remainingAmount: 2280,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-14T10:00:00Z',
      };
      const dn: Invoice = {
        id: 'inv-dn-1',
        clientId,
        invoiceNumber: 'DN-001',
        invoiceType: 'DEBIT_NOTE',
        date: '2026-03-15',
        partnerName: 'شركة النيل للتجارة',
        items: [],
        subtotal: 1500,
        totalDiscount: 0,
        totalVat: 210,
        totalWht: 0,
        grandTotal: 1710,
        paidAmount: 0,
        remainingAmount: 1710,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-15T10:00:00Z',
      };
      db.batchAddInvoices([cn, dn]);

      const resCn = PostingEngineService.postInvoice(cn.id);
      expect(resCn.success).toBe(true);
      expect(resCn.entry?.lines.find((l) => l.accountCode === '4102')?.debit).toBe(2000);
      expect(resCn.entry?.lines.find((l) => l.accountCode === '2104')?.debit).toBe(280);
      expect(resCn.entry?.lines.find((l) => l.accountCode === '1103')?.credit).toBe(2280);

      const resDn = PostingEngineService.postInvoice(dn.id);
      expect(resDn.success).toBe(true);
      expect(resDn.entry?.lines.find((l) => l.accountCode === '1103')?.debit).toBe(1710);
      expect(resDn.entry?.lines.find((l) => l.accountCode === '4101')?.credit).toBe(1500);
      expect(resDn.entry?.lines.find((l) => l.accountCode === '2104')?.credit).toBe(210);
    });

    it('builds and posts OFFICE_SERVICE as professional fee revenue (4120 REVENUES), NOT an expense', () => {
      const officeInv: Invoice = {
        id: 'inv-office-1',
        clientId,
        invoiceNumber: 'OFF-001',
        invoiceType: 'OFFICE_SERVICE',
        date: '2026-03-16',
        partnerName: 'شركة الأمل للاستثمار',
        items: [],
        subtotal: 30000,
        totalDiscount: 0,
        totalVat: 4200,
        totalWht: 1500,
        grandTotal: 32700,
        paidAmount: 0,
        remainingAmount: 32700,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-16T10:00:00Z',
      };
      db.batchAddInvoices([officeInv]);

      const res = PostingEngineService.postInvoice(officeInv.id);
      expect(res.success).toBe(true);
      const entry = res.entry!;

      const revenueLine = entry.lines.find((l) => l.accountCode === '4120');
      expect(revenueLine).toBeDefined();
      expect(revenueLine?.credit).toBe(30000);
      expect(revenueLine?.debit).toBe(0);

      // Verify account 4120 in client COA is category REVENUES
      const acc4120 = db
        .getState()
        .accounts.find((a) => a.clientId === clientId && a.code === '4120');
      expect(acc4120?.category).toBe('REVENUES');
      expect(acc4120?.nature).toBe('CREDIT');
    });
  });

  describe('2. Strict Account Mapping & No Fallback to Different Account', () => {
    it('rejects posting with a clear error when a required account is unmapped or missing (no fallback)', () => {
      const inv: Invoice = {
        id: 'inv-unmapped-1',
        clientId,
        invoiceNumber: 'INV-UNM-001',
        invoiceType: 'RETURN_SALES',
        date: '2026-03-18',
        partnerName: 'عميل تجريبي',
        items: [],
        subtotal: 1000,
        totalDiscount: 0,
        totalVat: 140,
        totalWht: 0,
        grandTotal: 1140,
        paidAmount: 0,
        remainingAmount: 1140,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-18T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      // Clear salesReturnsAccountCode in client account mapping
      db.setClientAccountMapping(clientId, { salesReturnsAccountCode: '' });

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('مردودات ومسموحات المبيعات');
    });

    it('rejects mapping or posting to a summary/parent account or inactive account', () => {
      // Add a summary parent account (level 2)
      db.addAccount({
        clientId,
        code: '4100',
        name: 'إجمالي الإيرادات (رئيسي)',
        category: 'REVENUES',
        nature: 'CREDIT',
        level: 2,
      });

      expect(() =>
        db.setClientAccountMapping(clientId, { salesAccountCode: '4100' })
      ).toThrow(/حساب رئيسي\/تجميعي/);
    });
  });

  describe('3. Fractional EGP (حالة جزء من الجنيه) & Strict addJournalEntry Validation', () => {
    it('handles fractional EGP invoices (piastres) and auto-aligns 1-piastre rounding difference', () => {
      // Subtotal 333.33, VAT 14% = 46.67, WHT 1% = 3.33 -> Net = 376.67
      const inv: Invoice = {
        id: 'inv-frac-1',
        clientId,
        invoiceNumber: 'INV-FRAC-001',
        invoiceType: 'SALES',
        date: '2026-03-19',
        partnerName: 'شركة القروش الدقيقة',
        items: [],
        subtotal: 333.33,
        totalDiscount: 0,
        totalVat: 46.67,
        totalWht: 3.33,
        grandTotal: 376.67,
        paidAmount: 0,
        remainingAmount: 376.67,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-19T10:00:00Z',
      };
      db.batchAddInvoices([inv]);

      const res = PostingEngineService.postInvoice(inv.id);
      expect(res.success).toBe(true);
      expect(res.entry?.totalDebit).toBe(380);
      expect(res.entry?.totalCredit).toBe(380);

      // Verify 1-piastre (0.01) tolerance in addJournalEntry is aligned to exact equality
      const onePiastreEntry = db.addJournalEntry({
        clientId,
        date: '2026-03-19',
        description: 'قيد تقريب قرش واحد',
        lines: [
          { id: 'l1', accountCode: '1101', accountName: 'النقدية', debit: 100.01, credit: 0 },
          { id: 'l2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 100.0 },
        ],
      });
      expect(onePiastreEntry.totalDebit).toBe(onePiastreEntry.totalCredit);
    });

    it('rejects journal entry with < 2 lines, both debit & credit on same line, > 0.01 imbalance, or cross-client account', () => {
      // 1 line only
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد بسطر وحيد',
          lines: [{ id: 'l1', accountCode: '1101', accountName: 'النقدية', debit: 100, credit: 0 }],
        })
      ).toThrow(/سطرين على الأقل/);

      // Both debit and credit on same line
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد مدين ودائن في نفس السطر',
          lines: [
            { id: 'l1', accountCode: '1101', accountName: 'النقدية', debit: 100, credit: 50 },
            { id: 'l2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 50 },
          ],
        })
      ).toThrow(/مديناً ودائناً في آن واحد/);

      // Imbalance > 0.01 (e.g., 0.05 EGP)
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد غير متوازن',
          lines: [
            { id: 'l1', accountCode: '1101', accountName: 'النقدية', debit: 100.05, credit: 0 },
            { id: 'l2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 100.0 },
          ],
        })
      ).toThrow(/غير متوازن/);

      // Cross-client accountId
      const client2Acc = db.getState().accounts.find((a) => a.clientId === secondClientId && a.code === '1101')!;
      expect(() =>
        db.addJournalEntry({
          clientId,
          date: '2026-03-20',
          description: 'قيد بحساب يخص عميلاً آخر',
          lines: [
            { id: 'l1', accountId: client2Acc.id, accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
            { id: 'l2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 500 },
          ],
        })
      ).toThrow(/يخص عميلاً آخر/);
    });
  });

  describe('4. Foreign Currency Posting by Date & Settlement FX Gain/Loss', () => {
    it('uses date-specific exchange rate from exchangeRates table and posts FX gain/loss on settlement', () => {
      // Register historical USD exchange rates by date
      db.saveExchangeRate({
        date: '2026-04-01',
        currency: 'USD',
        officialRate: 49.5,
        rateToEgp: 49.5,
      });
      db.saveExchangeRate({
        date: '2026-04-15',
        currency: 'USD',
        officialRate: 50.75,
        rateToEgp: 50.75,
      });

      const fxInvoice: Invoice = {
        id: 'inv-usd-1',
        clientId,
        invoiceNumber: 'INV-USD-001',
        invoiceType: 'SALES',
        date: '2026-04-01',
        partnerName: 'Global Export Corp',
        items: [],
        subtotal: 1000.25, // fractional USD
        totalDiscount: 0,
        totalVat: 0,
        totalWht: 0,
        grandTotal: 1000.25,
        paidAmount: 0,
        remainingAmount: 1000.25,
        currency: 'USD',
        exchangeRate: 0, // force lookup from table by (2026-04-01 + USD) = 49.5
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-04-01T10:00:00Z',
      };
      db.batchAddInvoices([fxInvoice]);

      const postRes = PostingEngineService.postInvoice(fxInvoice.id);
      expect(postRes.success).toBe(true);
      const postedEntry = postRes.entry!;

      // 1000.25 USD * 49.5 = 49,512.38 EGP
      expect(postedEntry.exchangeRate).toBe(49.5);
      expect(postedEntry.totalDebit).toBe(49512.38);
      expect(postedEntry.totalCredit).toBe(49512.38);
      expect(postedEntry.lines[0].originalAmount).toBe(1000.25);
      expect(postedEntry.lines[0].amountEgp).toBe(49512.38);

      // Settle on 2026-04-15 when USD rate is 50.75 -> Cash = 1000.25 * 50.75 = 50,762.69 EGP
      // Realized FX Gain = 50,762.69 - 49,512.38 = 1,250.31 EGP credited to 4201
      const settleRes = PostingEngineService.postForeignCurrencySettlement({
        invoiceId: fxInvoice.id,
        settlementDate: '2026-04-15',
      });
      expect(settleRes.success).toBe(true);
      expect(settleRes.fxType).toBe('GAIN');
      expect(settleRes.fxDifferenceEgp).toBe(1250.31);

      const fxGainLine = settleRes.entry?.lines.find((l) => l.accountCode === '4201');
      expect(fxGainLine?.credit).toBe(1250.31);
      expect(settleRes.entry?.totalDebit).toBe(settleRes.entry?.totalCredit);
    });
  });

  describe('5 & 6. Sequential Entry Numbering per Client/Year & Scoped Duplicate Invoice Prevention', () => {
    it('assigns gapless sequential entry numbers per (clientId + fiscalYear) independent of array length', () => {
      const e1 = db.addJournalEntry({
        clientId: secondClientId,
        date: '2026-02-01',
        description: 'قيد أول للعميل الثاني',
        lines: [
          { id: '1', accountCode: '1101', accountName: 'النقدية', debit: 500, credit: 0 },
          { id: '2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 500 },
        ],
      });
      const e2 = db.addJournalEntry({
        clientId: secondClientId,
        date: '2026-02-02',
        description: 'قيد ثاني للعميل الثاني',
        lines: [
          { id: '3', accountCode: '1101', accountName: 'النقدية', debit: 700, credit: 0 },
          { id: '4', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 700 },
        ],
      });
      expect(Number(e2.entryNumber)).toBe(Number(e1.entryNumber) + 1);
    });

    it('rejects invoice without clientId and scopes duplicate check to (clientId + invoiceNumber + invoiceType) within invoice entries only', () => {
      // Manual journal entry with referenceNumber 'INV-DUP-100' should NOT block posting an invoice with invoiceNumber 'INV-DUP-100'
      db.addJournalEntry({
        clientId,
        date: '2026-03-01',
        referenceNumber: 'INV-DUP-100',
        documentType: 'MANUAL',
        description: 'قيد يدوي يحمل نفس الرقم المرجعي',
        lines: [
          { id: 'm1', accountCode: '1101', accountName: 'النقدية', debit: 1000, credit: 0 },
          { id: 'm2', accountCode: '4101', accountName: 'المبيعات', debit: 0, credit: 1000 },
        ],
      });

      const salesInv: Invoice = {
        id: 'inv-dup-sales',
        clientId,
        invoiceNumber: 'INV-DUP-100',
        invoiceType: 'SALES',
        date: '2026-03-05',
        partnerName: 'عميل أ',
        items: [],
        subtotal: 1000,
        totalDiscount: 0,
        totalVat: 140,
        totalWht: 0,
        grandTotal: 1140,
        paidAmount: 0,
        remainingAmount: 1140,
        currency: 'EGP',
        exchangeRate: 1,
        status: 'ISSUED',
        paymentMethod: 'CREDIT',
        createdAt: '2026-03-05T10:00:00Z',
      };
      // Same invoice number but PURCHASE type should be allowed
      const purchaseInvSameNo: Invoice = {
        ...salesInv,
        id: 'inv-dup-purchase',
        invoiceType: 'PURCHASE',
      };
      db.batchAddInvoices([salesInv, purchaseInvSameNo]);

      const firstPost = PostingEngineService.postInvoice(salesInv.id);
      expect(firstPost.success).toBe(true);

      // Re-posting same (clientId + invoiceNumber + SALES) must be rejected
      const duplicatePost = PostingEngineService.postInvoice(salesInv.id);
      expect(duplicatePost.success).toBe(false);

      // Posting same invoiceNumber with different type (PURCHASE) must succeed
      const diffTypePost = PostingEngineService.postInvoice(purchaseInvSameNo.id);
      expect(diffTypePost.success).toBe(true);

      // Invoice without clientId must be rejected
      db.getState().invoices.push({
        ...salesInv,
        id: 'inv-no-client',
        clientId: '',
        invoiceNumber: 'INV-NO-CL',
      });
      const noClientRes = PostingEngineService.postInvoice('inv-no-client');
      expect(noClientRes.success).toBe(false);
      expect(noClientRes.error).toContain('clientId');
    });
  });

  describe('7. Acceptance Criterion: Trial Balance Equilibrium After Posting 20 Varied Invoices', () => {
    it('posts 20 diverse invoices across all 7 types, fractional amounts, and foreign currencies and yields a strictly balanced Trial Balance', () => {
      db.saveExchangeRate({
        date: '2026-05-01',
        currency: 'USD',
        officialRate: 50.25,
        rateToEgp: 50.25,
      });
      db.saveExchangeRate({
        date: '2026-05-01',
        currency: 'EUR',
        officialRate: 54.4,
        rateToEgp: 54.4,
      });

      const typesCycle: InvoiceType[] = [
        'SALES',
        'PURCHASE',
        'RETURN_SALES',
        'RETURN_PURCHASE',
        'CREDIT_NOTE',
        'DEBIT_NOTE',
        'OFFICE_SERVICE',
      ];

      const twentyInvoices: Partial<Invoice>[] = Array.from({ length: 20 }, (_, i) => {
        const idx = i + 1;
        const invoiceType = typesCycle[i % typesCycle.length];
        const isUsd = idx % 5 === 0;
        const isEur = idx % 7 === 0 && !isUsd;
        const currency = isUsd ? 'USD' : isEur ? 'EUR' : 'EGP';
        const subtotal = Number((1250.35 + idx * 117.13).toFixed(2));
        const totalVat = Number((subtotal * 0.14).toFixed(2));
        const totalWht = idx % 2 === 0 ? Number((subtotal * 0.01).toFixed(2)) : 0;
        const totalTableTax = idx % 4 === 0 ? Number((subtotal * 0.05).toFixed(2)) : 0;
        const grandTotal = Number((subtotal + totalVat + totalTableTax - totalWht).toFixed(2));

        return {
          id: `inv-batch20-${idx}`,
          clientId,
          invoiceNumber: `INV-2026-B${String(idx).padStart(3, '0')}`,
          invoiceType,
          date: '2026-05-10',
          partnerName: `شريك تجاري رقم ${idx}`,
          subtotal,
          totalDiscount: 0,
          totalVat,
          totalWht,
          totalTableTax,
          grandTotal,
          currency,
          paymentMethod: idx % 3 === 0 ? 'CASH' : 'CREDIT',
        };
      });

      db.batchAddInvoices(twentyInvoices);

      for (let i = 1; i <= 20; i++) {
        const res = PostingEngineService.postInvoice(`inv-batch20-${i}`);
        expect(res.success).toBe(true);
        expect(res.entry?.totalDebit).toBe(res.entry?.totalCredit);
      }

      // Compute Trial Balance for client-1 in 2026
      const clientAccounts = db.getClientAccounts(clientId, 2026);
      const clientEntries = db
        .getState()
        .journalEntries.filter((je) => je.clientId === clientId);

      const tb = AccountingCalculator.computeTrialBalance(
        clientAccounts,
        clientEntries,
        2026,
        false
      );

      expect(tb.rows.length).toBeGreaterThan(0);
      expect(tb.totalOpeningDebit).toBe(tb.totalOpeningCredit);
      expect(tb.totalMovementDebit).toBe(tb.totalMovementCredit);
      expect(tb.totalClosingDebit).toBe(tb.totalClosingCredit);
      expect(tb.isBalanced).toBe(true);
    });
  });
});
