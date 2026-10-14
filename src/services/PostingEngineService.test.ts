import { describe, it, expect } from 'vitest';
import { PostingEngineService } from './PostingEngineService';
import { Account, Invoice } from '../types';

describe('PostingEngineService.findAccount', () => {
  const accounts: Account[] = [
    {
      id: 'acc-1',
      code: '1250',
      name: 'النقدية بالصندوق (الخزينة الرئيسية)',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-2',
      code: '4110',
      name: 'مبيعات سلع وبضائع',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-3',
      code: '4120',
      name: 'إيرادات خدمات واستشارات',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-4',
      code: '2230',
      name: 'مصلحة الضرائب على القيمة المضافة',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
  ];

  const findAccount = (PostingEngineService as any).findAccount.bind(PostingEngineService);

  it('1. يجد الحساب بالكود المفضل المطابق تماماً', () => {
    const res = findAccount(accounts, ['1250'], 'ASSETS', 'نقدية');
    expect(res.id).toBe('acc-1');
    expect(res.code).toBe('1250');
  });

  it('2. يرمي خطأ عند عدم تطابق الكود (إلغاء المطابقة الجزئية والاسمية)', () => {
    expect(() => {
      findAccount(accounts, ['22'], 'LIABILITIES', 'ضريبة');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('3. يرمي خطأ عند عدم وجود الكود', () => {
    expect(() => {
      findAccount(accounts, ['41'], 'REVENUES', 'اسم غير موجود إطلاقاً');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('4. يرمي خطأ ولا يختار حساباً عشوائياً عند فشل الكود', () => {
    expect(() => {
      findAccount(accounts, ['9999'], 'REVENUES', 'خدمات واستشارات');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('5. يرمي خطأ صريح عند غياب الحساب', () => {
    expect(() => {
      findAccount(accounts, ['1999'], 'ASSETS', 'حساب أصل مجهول غير مسجل');
    }).toThrowError(/تعذر ترحيل القيد/);
  });
});

describe('اختبارات محرك الترحيل الآلي للفواتير (PostingEngineService Requirements)', () => {
  const standardAccounts: Account[] = [
    {
      id: 'acc-rec-1',
      code: '1220',
      name: 'العملاء - مدينون تجاريون',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-wht-1',
      code: '1230',
      name: 'مصلحة الضرائب - ضريبة خصم وتحصيل (أ.ت.ص)',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-rev-1',
      code: '4110',
      name: 'إيرادات المبيعات والخدمات',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-vat-1',
      code: '2230',
      name: 'مصلحة الضرائب على القيمة المضافة',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
  ];

  const baseInvoice: Invoice = {
    id: 'inv-test-req-001',
    invoiceNumber: 'INV-REQ-101',
    invoiceType: 'SALES',
    date: '2026-06-01',
    clientId: 'client-alpha',
    partnerName: 'شركة الألفا الهندسية',
    items: [
      {
        id: 'item-1',
        itemCode: 'SERV-01',
        description: 'أعمال استشارات هندسية',
        quantity: 1,
        unitPrice: 50000,
        discountRate: 0,
        vatRate: 14,
        whtRate: 1,
        totalBeforeTax: 50000,
        vatAmount: 7000,
        whtAmount: 500,
        netTotal: 56500,
      },
    ],
    subtotal: 50000,
    totalDiscount: 0,
    totalVat: 7000,
    totalWht: 500, // 1%
    grandTotal: 57000,
    paidAmount: 0,
    remainingAmount: 56500,
    status: 'ISSUED',
    paymentMethod: 'CREDIT',
    qrPayload: 'test-qr',
    createdAt: '2026-06-01T12:00:00Z',
  };

  // =========================================================================
  // 1) القيد ميتعملش isPosted=true تلقائيًا إلا لو المستخدم عنده canPostEntries
  // =========================================================================
  describe('1) اشتراط صلاحية canPostEntries لتفعيل isPosted=true', () => {
    it('يجعل isPosted=false في مسودة القيد إذا كان userCanPost غير مفعل أو غير متاح للمستخدم', () => {
      const draftWithoutPermission = PostingEngineService.buildInvoiceJournalEntry(
        baseInvoice,
        standardAccounts,
        undefined,
        false
      );
      expect(draftWithoutPermission.isPosted).toBe(false);
    });

    it('يجعل isPosted=true فقط عندما يمتلك المستخدم صلاحية canPostEntries صراحة', () => {
      const draftWithPermission = PostingEngineService.buildInvoiceJournalEntry(
        baseInvoice,
        standardAccounts,
        undefined,
        true
      );
      expect(draftWithPermission.isPosted).toBe(true);
    });

    it('يرحل القيد كمسودة (isPosted: false) عبر postInvoice لمستخدم بدون صلاحية canPostEntries', async () => {
      const { db } = await import('../db/localDatabase');
      const testInvoice: Invoice = {
        ...baseInvoice,
        id: 'inv-noperm-01',
        invoiceNumber: 'INV-NOPERM-01',
      };
      db.getState().invoices.push(testInvoice);

      const unprivilegedUser = {
        id: 'user-assistant-01',
        name: 'مساعد محاسب',
        role: 'SECRETARY',
        canPostEntries: false,
      };

      const res = PostingEngineService.postInvoice(testInvoice.id, unprivilegedUser);
      expect(res.success).toBe(true);
      expect(res.journalEntry).toBeDefined();
      expect(res.journalEntry?.isPosted).toBe(false);
    });

    it('يرحل القيد كمرحل بالكامل (isPosted: true) عبر postInvoice لمستخدم يملك canPostEntries: true', async () => {
      const { db } = await import('../db/localDatabase');
      const testInvoice: Invoice = {
        ...baseInvoice,
        id: 'inv-perm-01',
        invoiceNumber: 'INV-PERM-01',
      };
      db.getState().invoices.push(testInvoice);

      const privilegedUser = {
        id: 'user-senior-01',
        name: 'محاسب قانوني رئيسي',
        role: 'ACCOUNTANT',
        canPostEntries: true,
      };

      const res = PostingEngineService.postInvoice(testInvoice.id, privilegedUser);
      expect(res.success).toBe(true);
      expect(res.journalEntry).toBeDefined();
      expect(res.journalEntry?.isPosted).toBe(true);
    });
  });

  // =========================================================================
  // 2) فحص تكرار رقم الفاتورة يبقى لكل (عميل + رقم فاتورة)، مش الرقم بس
  // =========================================================================
  describe('2) فحص تكرار رقم الفاتورة لكل (عميل + رقم فاتورة)', () => {
    it('يسمح بترحيل نفس رقم الفاتورة إذا كان لعميلين مختلفين', async () => {
      const { db } = await import('../db/localDatabase');

      const invoiceClientA: Invoice = {
        ...baseInvoice,
        id: 'inv-multi-client-a',
        invoiceNumber: 'INV-SHARED-2026',
        clientId: 'client-101',
        partnerName: 'شركة النور للمقاولات',
      };

      const invoiceClientB: Invoice = {
        ...baseInvoice,
        id: 'inv-multi-client-b',
        invoiceNumber: 'INV-SHARED-2026', // نفس رقم الفاتورة تماماً
        clientId: 'client-202',          // عميل مختلف
        partnerName: 'مؤسسة الأمل للتجارة',
      };

      db.getState().invoices.push(invoiceClientA, invoiceClientB);

      // ترحيل فاتورة العميل الأول بنجاح
      const resA = PostingEngineService.postInvoice(invoiceClientA.id, { canPostEntries: true });
      expect(resA.success).toBe(true);
      expect(resA.journalEntry?.referenceNumber).toBe('INV-SHARED-2026');

      // ترحيل فاتورة العميل الثاني بنفس الرقم ينجح ولا يرفض كتكرار
      const resB = PostingEngineService.postInvoice(invoiceClientB.id, { canPostEntries: true });
      expect(resB.success).toBe(true);
      expect(resB.journalEntry?.referenceNumber).toBe('INV-SHARED-2026');

      // التحقق من أن فحص isInvoicePosted يفرق بين العميلين
      expect(PostingEngineService.isInvoicePosted('INV-SHARED-2026', 'client-101').isPosted).toBe(true);
      expect(PostingEngineService.isInvoicePosted('INV-SHARED-2026', 'client-202').isPosted).toBe(true);
      expect(PostingEngineService.isInvoicePosted('INV-SHARED-2026', 'client-303').isPosted).toBe(false);
    });

    it('يرفض تكرار نفس رقم الفاتورة لنفس العميل', async () => {
      const { db } = await import('../db/localDatabase');

      const duplicateInvoiceClientA: Invoice = {
        ...baseInvoice,
        id: 'inv-dup-client-a',
        invoiceNumber: 'INV-SHARED-2026',
        clientId: 'client-101', // نفس العميل السابق
        partnerName: 'شركة النور للمقاولات',
      };
      db.getState().invoices.push(duplicateInvoiceClientA);

      const resDup = PostingEngineService.postInvoice(duplicateInvoiceClientA.id);
      expect(resDup.success).toBe(false);
      expect(resDup.error).toContain('تم ترحيل هذه الفاتورة مسبقاً');
    });
  });

  // =========================================================================
  // 3) العملة تتاخد من الفاتورة، مش ثابتة EGP
  // =========================================================================
  describe('3) اعتماد عملة وسعر صرف الفاتورة بدلاً من تثبيت EGP', () => {
    it('ينقل عملة USD وسعر الصرف من الفاتورة إلى قيد اليومية وكافة أسطره', () => {
      const usdInvoice: Invoice = {
        ...baseInvoice,
        currency: 'USD',
        exchangeRate: 50.25,
      };

      const entry = PostingEngineService.buildInvoiceJournalEntry(usdInvoice, standardAccounts);
      expect(entry.currency).toBe('USD');
      expect(entry.exchangeRate).toBe(50.25);

      // التأكد من تطبيق العملة وسعر الصرف على كل أسطر القيد
      expect(entry.lines.length).toBeGreaterThan(0);
      for (const line of entry.lines) {
        expect(line.currency).toBe('USD');
        expect(line.exchangeRate).toBe(50.25);
      }
    });

    it('ينقل عملة EUR إلى القيد والأسطر بشكل سليم', () => {
      const eurInvoice: Invoice = {
        ...baseInvoice,
        currency: 'EUR',
        exchangeRate: 53.8,
      };

      const entry = PostingEngineService.buildInvoiceJournalEntry(eurInvoice, standardAccounts);
      expect(entry.currency).toBe('EUR');
      expect(entry.exchangeRate).toBe(53.8);
      for (const line of entry.lines) {
        expect(line.currency).toBe('EUR');
      }
    });

    it('يعتمد EGP كعملة افتراضية عندما لا تحدد الفاتورة عملة خاصة', () => {
      const defaultInvoice: Invoice = {
        ...baseInvoice,
        currency: undefined,
        exchangeRate: undefined,
      };

      const entry = PostingEngineService.buildInvoiceJournalEntry(defaultInvoice, standardAccounts);
      expect(entry.currency).toBe('EGP');
      expect(entry.exchangeRate).toBe(1);
    });
  });

  // =========================================================================
  // 4) لو كود حساب احتياطي (زي 41 أو 214) هيتستخدم، اطلب إعداد حساب صريح
  // =========================================================================
  describe('4) حظر الترحيل على الحسابات التجميعية الرئيسية (41 / 214) والمطالبة بحساب صريح', () => {
    it('يرفض الترحيل على حساب رئيسي 41 ويطلب إعداد حساب تحليلي صريح للإيرادات', () => {
      // شجرة حسابات تحتوي فقط على الحساب التجميعي 41 دون تفصيل 4110 أو 4100
      const accountsWithOnlyParentRevenue: Account[] = [
        standardAccounts[0], // العملاء 1220
        standardAccounts[1], // أ.ت.ص 1230
        standardAccounts[3], // القيمة المضافة 2230
        {
          id: 'acc-parent-41',
          code: '41',
          name: 'إيرادات النشاط الجاري (حساب تجميعي)',
          category: 'REVENUES',
          nature: 'CREDIT',
          level: 2,
          openingBalanceDebit: 0,
          openingBalanceCredit: 0,
          isSystem: true,
        },
      ];

      expect(() => {
        PostingEngineService.buildInvoiceJournalEntry(baseInvoice, accountsWithOnlyParentRevenue);
      }).toThrowError(/حساب رئيسي\/تجميعي.*يرجى إعداد وتحديد حساب تحليلي تفصيلي صريح/);
    });

    it('يرفض الترحيل على حساب رئيسي 214 ويطلب إعداد حساب صريح لضريبة القيمة المضافة', () => {
      // شجرة حسابات تحتوي فقط على الحساب التجميعي 214 دون 2230 أو 2145
      const accountsWithOnlyParentVat: Account[] = [
        standardAccounts[0], // العملاء 1220
        standardAccounts[1], // أ.ت.ص 1230
        standardAccounts[2], // الإيرادات 4110
        {
          id: 'acc-parent-214',
          code: '214',
          name: 'حسابات دائنة لمصالح وهيئات (حساب رئيسي)',
          category: 'LIABILITIES',
          nature: 'CREDIT',
          level: 3,
          openingBalanceDebit: 0,
          openingBalanceCredit: 0,
          isSystem: true,
        },
      ];

      expect(() => {
        PostingEngineService.buildInvoiceJournalEntry(baseInvoice, accountsWithOnlyParentVat);
      }).toThrowError(/حساب رئيسي\/تجميعي.*يرجى إعداد وتحديد حساب تحليلي تفصيلي صريح/);
    });

    it('يقبل الترحيل بنجاح عندما تتوفر الحسابات التحليلية الصريحة (4110 و 2230)', () => {
      expect(() => {
        const entry = PostingEngineService.buildInvoiceJournalEntry(baseInvoice, standardAccounts);
        expect(entry).toBeDefined();
        expect(entry.lines.some((l) => l.accountCode === '4110')).toBe(true);
        expect(entry.lines.some((l) => l.accountCode === '2230')).toBe(true);
      }).not.toThrow();
    });
  });
});
