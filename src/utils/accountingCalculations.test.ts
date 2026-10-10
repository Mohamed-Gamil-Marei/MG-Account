import { describe, it, expect, beforeEach } from 'vitest';
import { Account, JournalEntry } from '../types';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  findSuspectedDiscrepancyCause,
  round2,
} from './accountingCalculations';
import { LocalDatabase, db } from '../db/localDatabase';

function makeEntry(partial: Partial<JournalEntry>): JournalEntry {
  return {
    id: partial.id || `e-${Math.random().toString(36).substring(2, 7)}`,
    entryNumber: partial.entryNumber || 1,
    serialNumber: partial.serialNumber || 'JV-2026-0001',
    entryType: partial.entryType || 'GENERAL',
    date: partial.date || '2026-01-01',
    description: partial.description || '',
    totalDebit: partial.totalDebit || 0,
    totalCredit: partial.totalCredit || 0,
    isPosted: partial.isPosted ?? true,
    lines: partial.lines || [],
    auditTrail: partial.auditTrail || [],
    createdAt: partial.createdAt || '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt || '2026-01-01T00:00:00.000Z',
  };
}

describe('Accounting Calculations & Ledger Tests (اختبارات المحاسبة والقيود)', () => {
  let sampleAccounts: Account[];

  beforeEach(() => {
    sampleAccounts = [
      {
        id: 'acc-1110',
        code: '1110',
        name: 'الأصول الثابتة - المعدات والآلات',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1190',
        code: '1190',
        name: 'مجمع إهلاك الأصول الثابتة',
        category: 'ASSETS',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1210',
        code: '1210',
        name: 'مخزون بضائع',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1220',
        code: '1220',
        name: 'العملاء والعملاء المدينون',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1230',
        code: '1230',
        name: 'ضريبة أرباح تجارية مخصومة (خصم وتحصيل 1%)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1235',
        code: '1235',
        name: 'ضريبة قيمة مضافة مدخلات (14%)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-1250',
        code: '1250',
        name: 'النقدية بالصندوق والبنوك',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-2110',
        code: '2110',
        name: 'قروض طويلة الأجل',
        category: 'LIABILITIES',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-2145',
        code: '2145',
        name: 'ضريبة القيمة المضافة مخرجات (14%)',
        category: 'LIABILITIES',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-2210',
        code: '2210',
        name: 'الموردون والحسابات الدائنة',
        category: 'LIABILITIES',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-3100',
        code: '3100',
        name: 'رأس المال المدفوع',
        category: 'EQUITY',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-3400',
        code: '3400',
        name: 'الأرباح المرحلة',
        category: 'EQUITY',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-4110',
        code: '4110',
        name: 'إيراد المبيعات',
        category: 'REVENUES',
        nature: 'CREDIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-5100',
        code: '5100',
        name: 'تكلفة المبيعات',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-5300',
        code: '5300',
        name: 'مصروفات عمومية وإدارية',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
      {
        id: 'acc-5360',
        code: '5360',
        name: 'مصروف إهلاك أصول ثابتة',
        category: 'EXPENSES',
        nature: 'DEBIT',
        level: 2,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        isSystem: true,
      },
    ];
  });

  // 1) ميزان مراجعة: مجموع المدين = مجموع الدائن بعد ترحيل 10 قيود متنوعة
  it('1) Trial Balance: total debit equals total credit after posting 10 diverse journal entries', () => {
    const entries: JournalEntry[] = [
      // 1. إيداع رأس المال
      makeEntry({
        id: 'e1',
        entryNumber: 1,
        serialNumber: 'JV-2026-0001',
        date: '2026-01-01',
        description: 'إيداع رأس مال الشركة بالنقدية والبنك',
        totalDebit: 500000,
        totalCredit: 500000,
        lines: [
          { id: 'l1-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 500000, credit: 0 },
          { id: 'l1-2', accountId: 'acc-3100', accountCode: '3100', accountName: 'رأس المال المدفوع', debit: 0, credit: 500000 },
        ],
      }),
      // 2. شراء أصول ثابتة (معدات)
      makeEntry({
        id: 'e2',
        entryNumber: 2,
        serialNumber: 'JV-2026-0002',
        date: '2026-01-02',
        description: 'شراء آلات ومعدات للمصنع نقداً',
        totalDebit: 100000,
        totalCredit: 100000,
        lines: [
          { id: 'l2-1', accountId: 'acc-1110', accountCode: '1110', accountName: 'الأصول الثابتة', debit: 100000, credit: 0 },
          { id: 'l2-2', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 0, credit: 100000 },
        ],
      }),
      // 3. شراء مخزون بضائع على الحساب من مورد
      makeEntry({
        id: 'e3',
        entryNumber: 3,
        serialNumber: 'JV-2026-0003',
        date: '2026-01-05',
        description: 'شراء بضاعة على الحساب من المورد',
        totalDebit: 80000,
        totalCredit: 80000,
        lines: [
          { id: 'l3-1', accountId: 'acc-1210', accountCode: '1210', accountName: 'مخزون بضائع', debit: 80000, credit: 0 },
          { id: 'l3-2', accountId: 'acc-2210', accountCode: '2210', accountName: 'الموردون', debit: 0, credit: 80000 },
        ],
      }),
      // 4. مبيعات نقدية مع ضريبة قيمة مضافة 14%
      makeEntry({
        id: 'e4',
        entryNumber: 4,
        serialNumber: 'JV-2026-0004',
        date: '2026-01-10',
        description: 'مبيعات نقدية شاملة ضريبة القيمة المضافة',
        totalDebit: 57000,
        totalCredit: 57000,
        lines: [
          { id: 'l4-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 57000, credit: 0 },
          { id: 'l4-2', accountId: 'acc-4110', accountCode: '4110', accountName: 'إيراد المبيعات', debit: 0, credit: 50000 },
          { id: 'l4-3', accountId: 'acc-2145', accountCode: '2145', accountName: 'ضريبة القيمة المضافة', debit: 0, credit: 7000 },
        ],
      }),
      // 5. اثبات تكلفة المبيعات للمبيعات النقدية
      makeEntry({
        id: 'e5',
        entryNumber: 5,
        serialNumber: 'JV-2026-0005',
        date: '2026-01-10',
        description: 'اثبات تكلفة البضاعة المباعة',
        totalDebit: 30000,
        totalCredit: 30000,
        lines: [
          { id: 'l5-1', accountId: 'acc-5100', accountCode: '5100', accountName: 'تكلفة المبيعات', debit: 30000, credit: 0 },
          { id: 'l5-2', accountId: 'acc-1210', accountCode: '1210', accountName: 'مخزون بضائع', debit: 0, credit: 30000 },
        ],
      }),
      // 6. مبيعات آجلة لعميل مع ضريبة 14% وخصم وتحصيل 1%
      makeEntry({
        id: 'e6',
        entryNumber: 6,
        serialNumber: 'JV-2026-0006',
        date: '2026-01-15',
        description: 'مبيعات آجلة لعميل',
        totalDebit: 34200,
        totalCredit: 34200,
        lines: [
          { id: 'l6-1', accountId: 'acc-1220', accountCode: '1220', accountName: 'العملاء', debit: 33900, credit: 0 },
          { id: 'l6-2', accountId: 'acc-1230', accountCode: '1230', accountName: 'خصم وتحصيل 1%', debit: 300, credit: 0 },
          { id: 'l6-3', accountId: 'acc-4110', accountCode: '4110', accountName: 'إيراد المبيعات', debit: 0, credit: 30000 },
          { id: 'l6-4', accountId: 'acc-2145', accountCode: '2145', accountName: 'ضريبة القيمة المضافة', debit: 0, credit: 4200 },
        ],
      }),
      // 7. سداد جزء من مستحقات المورد بشيك/بنك
      makeEntry({
        id: 'e7',
        entryNumber: 7,
        serialNumber: 'JV-2026-0007',
        date: '2026-01-20',
        description: 'سداد للمورد بشيك بنكي',
        totalDebit: 50000,
        totalCredit: 50000,
        lines: [
          { id: 'l7-1', accountId: 'acc-2210', accountCode: '2210', accountName: 'الموردون', debit: 50000, credit: 0 },
          { id: 'l7-2', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 0, credit: 50000 },
        ],
      }),
      // 8. سداد مصروفات عمومية وإدارية
      makeEntry({
        id: 'e8',
        entryNumber: 8,
        serialNumber: 'JV-2026-0008',
        date: '2026-01-25',
        description: 'سداد مصروفات إدارية وعمومية نقداً',
        totalDebit: 10000,
        totalCredit: 10000,
        lines: [
          { id: 'l8-1', accountId: 'acc-5300', accountCode: '5300', accountName: 'مصروفات عمومية وإدارية', debit: 10000, credit: 0 },
          { id: 'l8-2', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 0, credit: 10000 },
        ],
      }),
      // 9. إثبات قيد إهلاك الأصول الثابتة
      makeEntry({
        id: 'e9',
        entryNumber: 9,
        serialNumber: 'JV-2026-0009',
        date: '2026-01-28',
        description: 'إثبات إهلاك المعدات عن الفترة',
        totalDebit: 5000,
        totalCredit: 5000,
        lines: [
          { id: 'l9-1', accountId: 'acc-5360', accountCode: '5360', accountName: 'مصروف إهلاك أصول ثابتة', debit: 5000, credit: 0 },
          { id: 'l9-2', accountId: 'acc-1190', accountCode: '1190', accountName: 'مجمع إهلاك الأصول الثابتة', debit: 0, credit: 5000 },
        ],
      }),
      // 10. الحصول على قرض بنكي طويل الأجل
      makeEntry({
        id: 'e10',
        entryNumber: 10,
        serialNumber: 'JV-2026-0010',
        date: '2026-01-30',
        description: 'إيداع قيمة القرض البنكي بالحساب',
        totalDebit: 100000,
        totalCredit: 100000,
        lines: [
          { id: 'l10-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 100000, credit: 0 },
          { id: 'l10-2', accountId: 'acc-2110', accountCode: '2110', accountName: 'قروض طويلة الأجل', debit: 0, credit: 100000 },
        ],
      }),
    ];

    const calculatedAccounts = computeAccountBalances(sampleAccounts, entries);

    const sumTotalDebit = round2(calculatedAccounts.reduce((acc, curr) => acc + curr.totalDebit, 0));
    const sumTotalCredit = round2(calculatedAccounts.reduce((acc, curr) => acc + curr.totalCredit, 0));

    const sumEndingDebit = round2(calculatedAccounts.reduce((acc, curr) => acc + curr.endingBalanceDebit, 0));
    const sumEndingCredit = round2(calculatedAccounts.reduce((acc, curr) => acc + curr.endingBalanceCredit, 0));

    expect(sumTotalDebit).toBe(sumTotalCredit);
    expect(sumEndingDebit).toBe(sumEndingCredit);
    expect(sumTotalDebit).toBeGreaterThan(0);
  });

  // 2) قائمة الدخل: إيرادات 100,000، تكلفة 60,000، إهلاك 5,000 في 5360، مصروف عمومي 10,000 ← ربح قبل الضريبة 25,000
  it('2) Income Statement: Revenues 100,000, COGS 60,000, Depreciation 5,000 (code 5360), Admin 10,000 -> Profit Before Tax 25,000', () => {
    const entries: JournalEntry[] = [
      // إيرادات 100,000
      makeEntry({
        id: 'inc-1',
        entryNumber: 101,
        serialNumber: 'JV-INC-01',
        date: '2026-02-01',
        description: 'إيرادات المبيعات',
        totalDebit: 100000,
        totalCredit: 100000,
        lines: [
          { id: 'linc1-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 100000, credit: 0 },
          { id: 'linc1-2', accountId: 'acc-4110', accountCode: '4110', accountName: 'إيراد المبيعات', debit: 0, credit: 100000 },
        ],
      }),
      // تكلفة 60,000
      makeEntry({
        id: 'inc-2',
        entryNumber: 102,
        serialNumber: 'JV-INC-02',
        date: '2026-02-02',
        description: 'تكلفة المبيعات',
        totalDebit: 60000,
        totalCredit: 60000,
        lines: [
          { id: 'linc2-1', accountId: 'acc-5100', accountCode: '5100', accountName: 'تكلفة المبيعات', debit: 60000, credit: 0 },
          { id: 'linc2-2', accountId: 'acc-1210', accountCode: '1210', accountName: 'مخزون بضائع', debit: 0, credit: 60000 },
        ],
      }),
      // إهلاك 5,000 في 5360
      makeEntry({
        id: 'inc-3',
        entryNumber: 103,
        serialNumber: 'JV-INC-03',
        date: '2026-02-03',
        description: 'إهلاك الأصول الثابتة',
        totalDebit: 5000,
        totalCredit: 5000,
        lines: [
          { id: 'linc3-1', accountId: 'acc-5360', accountCode: '5360', accountName: 'مصروف إهلاك أصول ثابتة', debit: 5000, credit: 0 },
          { id: 'linc3-2', accountId: 'acc-1190', accountCode: '1190', accountName: 'مجمع الإهلاك', debit: 0, credit: 5000 },
        ],
      }),
      // مصروف عمومي 10,000 في 5300
      makeEntry({
        id: 'inc-4',
        entryNumber: 104,
        serialNumber: 'JV-INC-04',
        date: '2026-02-04',
        description: 'مصروفات عمومية وإدارية',
        totalDebit: 10000,
        totalCredit: 10000,
        lines: [
          { id: 'linc4-1', accountId: 'acc-5300', accountCode: '5300', accountName: 'مصروفات عمومية وإدارية', debit: 10000, credit: 0 },
          { id: 'linc4-2', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 0, credit: 10000 },
        ],
      }),
    ];

    const calculatedAccounts = computeAccountBalances(sampleAccounts, entries);
    const incomeData = generateIncomeStatement(calculatedAccounts);

    expect(incomeData.revenuesTotal).toBe(100000);
    expect(incomeData.costOfGoodsSold).toBe(60000);
    expect(incomeData.grossProfit).toBe(40000); // 100,000 - 60,000
    expect(incomeData.administrativeExpenses).toBe(10000);
    expect(incomeData.depreciationExpense).toBe(5000);
    expect(incomeData.profitBeforeTax).toBe(25000); // 40,000 - 10,000 - 5,000 = 25,000
  });

  // 3) الميزانية: لازم isBalanced = true لما القيود متوازنة، و false مع تفاصيل الفرق لما أحذف قيد من وسط
  it('3) Balance Sheet: isBalanced = true when entries are balanced, and false with variance details when deleting an entry from middle', () => {
    const balancedEntries: JournalEntry[] = [
      makeEntry({
        id: 'bs-1',
        entryNumber: 1,
        serialNumber: 'JV-BS-01',
        date: '2026-03-01',
        description: 'رأس المال',
        totalDebit: 200000,
        totalCredit: 200000,
        lines: [
          { id: 'lbs1-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 200000, credit: 0 },
          { id: 'lbs1-2', accountId: 'acc-3100', accountCode: '3100', accountName: 'رأس المال المدفوع', debit: 0, credit: 200000 },
        ],
      }),
      makeEntry({
        id: 'bs-2',
        entryNumber: 2,
        serialNumber: 'JV-BS-02',
        date: '2026-03-02',
        description: 'شراء بضاعة نقداً',
        totalDebit: 50000,
        totalCredit: 50000,
        lines: [
          { id: 'lbs2-1', accountId: 'acc-1210', accountCode: '1210', accountName: 'مخزون بضائع', debit: 50000, credit: 0 },
          { id: 'lbs2-2', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 0, credit: 50000 },
        ],
      }),
      makeEntry({
        id: 'bs-3',
        entryNumber: 3,
        serialNumber: 'JV-BS-03',
        date: '2026-03-03',
        description: 'مبيعات نقداً',
        totalDebit: 80000,
        totalCredit: 80000,
        lines: [
          { id: 'lbs3-1', accountId: 'acc-1250', accountCode: '1250', accountName: 'النقدية بالصندوق والبنوك', debit: 80000, credit: 0 },
          { id: 'lbs3-2', accountId: 'acc-4110', accountCode: '4110', accountName: 'إيراد المبيعات', debit: 0, credit: 80000 },
        ],
      }),
    ];

    // الحالة الأولى: القيود متوازنة
    let calculatedAccounts = computeAccountBalances(sampleAccounts, balancedEntries);
    let incomeData = generateIncomeStatement(calculatedAccounts);
    let balanceSheet = generateBalanceSheet(calculatedAccounts, incomeData);

    expect(balanceSheet.isBalanced).toBe(true);
    expect(balanceSheet.variance).toBe(0);

    // الحالة الثانية: قيد غير متوازن نتيجة تعديل أو حذف طرف قيد
    const corruptedEntries: JournalEntry[] = [
      balancedEntries[0],
      makeEntry({
        ...balancedEntries[1],
        totalDebit: 50000,
        totalCredit: 0,
        lines: [
          { id: 'lbs2-1-corrupted', accountId: 'acc-1210', accountCode: '1210', accountName: 'مخزون بضائع', debit: 50000, credit: 0 },
        ],
      }),
      balancedEntries[2],
    ];

    calculatedAccounts = computeAccountBalances(sampleAccounts, corruptedEntries);
    incomeData = generateIncomeStatement(calculatedAccounts);
    balanceSheet = generateBalanceSheet(calculatedAccounts, incomeData);

    expect(balanceSheet.isBalanced).toBe(false);
    expect(balanceSheet.variance).toBeGreaterThan(0);

    // فحص تحديد السبب والمشتبه به
    const suspect = findSuspectedDiscrepancyCause(calculatedAccounts, corruptedEntries, balanceSheet.variance);
    expect(suspect).not.toBeNull();
    expect(suspect?.details).toBeDefined();
    expect(suspect?.amount).toBe(balanceSheet.variance);
  });

  // 4) فاتورة بيع 10,000 + ض.ق.م 14% - خصم وتحصيل 1% ← القيد متوازن والأرصدة صح
  it('4) Sales Invoice: 10,000 + VAT 14% (1,400) - WHT 1% (100) -> Entry is balanced (11,400) and balances are correct', () => {
    // الأرقام:
    // قيمة المبيعات = 10,000 ج.م
    // ضريبة القيمة المضافة 14% = 1,400 ج.م (دائن)
    // خصم وتحصيل من المصدر 1% = 100 ج.م (مدين)
    // الصافي المستحق من العميل = (10,000 + 1,400) - 100 = 11,300 ج.م (مدين)

    const salesEntry: JournalEntry = makeEntry({
      id: 'inv-1001',
      entryNumber: 1,
      serialNumber: 'JV-INV-1001',
      date: '2026-04-01',
      description: 'فاتورة مبيعات آجل رقم 1001 مع ضريبة القيمة المضافة وخصم وتحصيل',
      totalDebit: 11400,
      totalCredit: 11400,
      lines: [
        {
          id: 'sl-1',
          accountId: 'acc-1220',
          accountCode: '1220',
          accountName: 'العملاء والعملاء المدينون',
          debit: 11300,
          credit: 0,
        },
        {
          id: 'sl-2',
          accountId: 'acc-1230',
          accountCode: '1230',
          accountName: 'ضريبة أرباح تجارية مخصومة (خصم وتحصيل 1%)',
          debit: 100,
          credit: 0,
        },
        {
          id: 'sl-3',
          accountId: 'acc-4110',
          accountCode: '4110',
          accountName: 'إيراد المبيعات',
          debit: 0,
          credit: 10000,
        },
        {
          id: 'sl-4',
          accountId: 'acc-2145',
          accountCode: '2145',
          accountName: 'ضريبة القيمة المضافة مخرجات (14%)',
          debit: 0,
          credit: 1400,
        },
      ],
    });

    // التحقق المباشر من توازن القيد ذاته
    const sumDebit = salesEntry.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const sumCredit = salesEntry.lines.reduce((s, l) => s + (l.credit || 0), 0);
    expect(sumDebit).toBe(11400);
    expect(sumCredit).toBe(11400);
    expect(sumDebit).toBe(sumCredit);

    // ترحيل القيد واحتساب الأرصدة
    const calculatedAccounts = computeAccountBalances(sampleAccounts, [salesEntry]);

    const customerAcc = calculatedAccounts.find((a) => a.code === '1220');
    const whtAcc = calculatedAccounts.find((a) => a.code === '1230');
    const salesAcc = calculatedAccounts.find((a) => a.code === '4110');
    const vatAcc = calculatedAccounts.find((a) => a.code === '2145');

    expect(customerAcc?.endingBalanceDebit).toBe(11300);
    expect(whtAcc?.endingBalanceDebit).toBe(100);
    expect(salesAcc?.endingBalanceCredit).toBe(10000);
    expect(vatAcc?.endingBalanceCredit).toBe(1400);
  });

  // 5) رفض قيد غير متوازن في addJournalEntry
  it('5) Rejection of unbalanced entry in addJournalEntry', () => {
    const unbalancedEntry = {
      date: '2026-05-01',
      description: 'قيد إدخال غير متزن خطأ',
      isPosted: false,
      totalDebit: 10000,
      totalCredit: 9000,
      lines: [
        {
          id: 'unb-1',
          accountId: 'acc-1250',
          accountCode: '1250',
          accountName: 'النقدية بالصندوق والبنوك',
          debit: 10000,
          credit: 0,
        },
        {
          id: 'unb-2',
          accountId: 'acc-3100',
          accountCode: '3100',
          accountName: 'رأس المال المدفوع',
          debit: 0,
          credit: 9000,
        },
      ],
    };

    expect(() => {
      db.addJournalEntry(unbalancedEntry as any);
    }).toThrowError(/تعذر حفظ القيد المحاسبي|القيد غير متزن/);
  });

  // 6) ميزان مراجعة صغير وتأكيد طرد وتوازن القوائم بدون موازنة آليّة
  it('6) Small Trial Balance Review Flow & Balance Sheet Verification without auto-plugging', () => {
    const trialBalanceAccounts: Account[] = [
      { id: 't-1110', code: '1110', name: 'أصول ثابتة', category: 'ASSETS', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-1210', code: '1210', name: 'مخزون', category: 'ASSETS', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-1220', code: '1220', name: 'عملاء', category: 'ASSETS', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-1250', code: '1250', name: 'نقدية', category: 'ASSETS', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-2210', code: '2210', name: 'موردين', category: 'LIABILITIES', nature: 'CREDIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-2250', code: '2250', name: 'مستحقات', category: 'LIABILITIES', nature: 'CREDIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-3100', code: '3100', name: 'رأس مال', category: 'EQUITY', nature: 'CREDIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-4110', code: '4110', name: 'إيرادات المبيعات', category: 'REVENUES', nature: 'CREDIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-5110', code: '5110', name: 'تكلفة المبيعات', category: 'EXPENSES', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
      { id: 't-5300', code: '5300', name: 'مصروفات عمومية وإدارية', category: 'EXPENSES', nature: 'DEBIT', level: 2, openingBalanceDebit: 0, openingBalanceCredit: 0 },
    ];

    const trialBalanceRows = [
      { code: '1110', debit: 100000, credit: 0 },
      { code: '1210', debit: 50000, credit: 0 },
      { code: '1220', debit: 30000, credit: 0 },
      { code: '1250', debit: 20000, credit: 0 },
      { code: '2210', debit: 0, credit: 40000 },
      { code: '2250', debit: 0, credit: 10000 },
      { code: '3100', debit: 0, credit: 100000 },
      { code: '4110', debit: 0, credit: 80000 },
      { code: '5110', debit: 20000, credit: 0 },
      { code: '5300', debit: 10000, credit: 0 },
    ];

    const totDebit = trialBalanceRows.reduce((s, r) => s + r.debit, 0);
    const totCredit = trialBalanceRows.reduce((s, r) => s + r.credit, 0);
    expect(totDebit).toBe(230000);
    expect(totCredit).toBe(230000);
    expect(totDebit).toBe(totCredit);

    // Create candidate JournalEntry line by line
    const lines = trialBalanceRows.map((row, idx) => {
      const acc = trialBalanceAccounts.find((a) => a.code === row.code)!;
      return {
        id: `tb-line-${idx}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: row.debit,
        credit: row.credit,
        description: 'رصيد ميزان مراجعة مراجَع',
      };
    });

    const directEntry: JournalEntry = makeEntry({
      entryNumber: 99,
      serialNumber: 'AUDIT-2026-TEST',
      entryType: 'ADJUSTING',
      date: '2026-12-31',
      description: 'قيد ميزان المراجعة المباشر المعتمد',
      totalDebit: totDebit,
      totalCredit: totCredit,
      isPosted: true,
      source: 'AUDIT_DIRECT_ENTRY' as any,
      lines,
    });

    const calculatedAccounts = computeAccountBalances(trialBalanceAccounts, [directEntry]);
    const incomeData = generateIncomeStatement(calculatedAccounts);
    const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);

    // Income Statement Verifications
    expect(incomeData.revenuesTotal).toBe(80000);
    expect(incomeData.costOfGoodsSold).toBe(20000);
    expect(incomeData.administrativeExpenses).toBe(10000);
    expect(incomeData.profitBeforeTax).toBe(50000);

    // Balance Sheet Verifications
    expect(balanceData.nonCurrentAssets.propertyPlantEquipment).toBe(100000);
    expect(balanceData.currentAssets.inventory).toBe(50000);
    expect(balanceData.currentAssets.tradeReceivables).toBe(30000);
    expect(balanceData.currentAssets.cashAndBanks).toBe(20000);
    expect(balanceData.totalAssets).toBe(200000);

    expect(balanceData.equity.paidUpCapital).toBe(100000);
    expect(balanceData.currentLiabilities.tradePayables).toBe(40000);
    expect(balanceData.currentLiabilities.accruedExpenses).toBe(10000);
    expect(balanceData.totalEquityAndLiabilities).toBe(200000);

    // Balance Sheet is strictly balanced without auto-balancing
    expect(balanceData.isBalanced).toBe(true);
    expect(balanceData.variance).toBe(0);
  });
});
