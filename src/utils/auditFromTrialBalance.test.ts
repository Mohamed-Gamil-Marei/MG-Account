import { describe, it, expect } from 'vitest';
import { Account } from '../types';
import { buildAuditFromTrialBalance } from './auditFromTrialBalance';

const baseAccounts: Account[] = [
  {
    id: 'acc-1110',
    code: '1110',
    name: 'الأصول الثابتة',
    category: 'ASSETS',
    nature: 'DEBIT',
    level: 2,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    isSystem: true,
  },
  {
    id: 'acc-1210',
    code: '1210',
    name: 'المخزون',
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
    name: 'العملاء',
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
    name: 'النقدية وما في حكمها',
    category: 'ASSETS',
    nature: 'DEBIT',
    level: 2,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    isSystem: true,
  },
  {
    id: 'acc-2210',
    code: '2210',
    name: 'الموردون',
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
    name: 'رأس المال',
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
    name: 'إيرادات المبيعات',
    category: 'REVENUES',
    nature: 'CREDIT',
    level: 2,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    isSystem: true,
  },
  {
    id: 'acc-5110',
    code: '5110',
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
    name: 'المصروفات العمومية والإدارية',
    category: 'EXPENSES',
    nature: 'DEBIT',
    level: 2,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    isSystem: true,
  },
  {
    id: 'acc-5500',
    code: '5500',
    name: 'ضريبة الدخل',
    category: 'EXPENSES',
    nature: 'DEBIT',
    level: 2,
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    isSystem: true,
  },
];

describe('buildAuditFromTrialBalance (اختبارات بناء ومراجعة ميزان المراجعة)', () => {
  // Test 1: ميزان متزن يطلع ميزانية متزنة
  it('1. ميزان متزن يطلع ميزانية متزنة', () => {
    const balancedRows = [
      { originalCode: '1110', originalName: 'سيارات ومعدات', mappedCode: '1110', mappedName: 'الأصول الثابتة', debit: 200000, credit: 0 },
      { originalCode: '1210', originalName: 'مخزن البضاعة', mappedCode: '1210', mappedName: 'المخزون', debit: 150000, credit: 0 },
      { originalCode: '1250', originalName: 'خزينة وبنك', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 100000, credit: 0 },
      { originalCode: '5110', originalName: 'مشتريات وبضاعة', mappedCode: '5110', mappedName: 'تكلفة المبيعات', debit: 300000, credit: 0 },
      { originalCode: '5300', originalName: 'مصاريف عمومية', mappedCode: '5300', mappedName: 'المصروفات العمومية والإدارية', debit: 50000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس مال الشركة', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 250000 },
      { originalCode: '2210', originalName: 'موردين تجاريين', mappedCode: '2210', mappedName: 'الموردون', debit: 0, credit: 50000 },
      { originalCode: '4110', originalName: 'مبيعات سنوية', mappedCode: '4110', mappedName: 'إيرادات المبيعات', debit: 0, credit: 500000 },
    ];

    // Total Debit: 200000 + 150000 + 100000 + 300000 + 50000 = 800000
    // Total Credit: 250000 + 50000 + 500000 = 800000 -> Balanced!

    const result = buildAuditFromTrialBalance(balancedRows, baseAccounts, 2024);

    expect(result.entry.totalDebit).toBe(800000);
    expect(result.entry.totalCredit).toBe(800000);
    expect(result.balanceData.isBalanced).toBe(true);
    expect(result.balanceData.variance).toBeLessThan(0.05);
    expect(result.balanceData.totalAssets).toBe(result.balanceData.totalEquityAndLiabilities);
  });

  // Test 2: ميزان فيه حساب غير مربوط يطلع warning
  it('2. ميزان فيه حساب غير مربوط يطلع warning', () => {
    const rowsWithUnmapped = [
      { originalCode: '9999', originalName: 'حساب غريب غير معرف', mappedCode: '9999', mappedName: 'حساب غريب', debit: 10000, credit: 0 },
      { originalCode: '1250', originalName: 'خزينة', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 90000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس مال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 100000 },
    ];

    const result = buildAuditFromTrialBalance(rowsWithUnmapped, baseAccounts, 2024);

    expect(result.warnings.length).toBeGreaterThan(0);
    const unmappedWarning = result.warnings.find(w => w.includes('9999') || w.includes('غير مربوط') || w.includes('غير مصنف'));
    expect(unmappedWarning).toBeDefined();
  });

  // Test 3: ميزان بدون ضريبة ما يحسبش ضريبة
  it('3. ميزان بدون ضريبة ما يحسبش ضريبة (estimateTaxIfMissing=false)', () => {
    const rowsWithoutTax = [
      { originalCode: '1250', originalName: 'النقدية', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 100000, credit: 0 },
      { originalCode: '4110', originalName: 'إيرادات المبيعات', mappedCode: '4110', mappedName: 'إيرادات المبيعات', debit: 0, credit: 100000 },
    ];

    const result = buildAuditFromTrialBalance(rowsWithoutTax, baseAccounts, 2024);

    // In review mode, tax is NOT estimated at 22.5%, so taxExpense is 0
    expect(result.incomeData.taxExpense).toBe(0);
    // Warning must be generated indicating that tax was not recorded in the trial balance
    const taxWarning = result.warnings.find(w => w.includes('ضريبة الدخل غير مسجلة في الميزان'));
    expect(taxWarning).toBeDefined();
  });

  // Test 4: قيد الميزان غير المتزن يتوقف قبل التوليد
  it('4. قيد الميزان غير المتزن يتوقف قبل التوليد ويرمي خطأ', () => {
    const unbalancedRows = [
      { originalCode: '1250', originalName: 'النقدية', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 100000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس المال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 90000 },
    ];

    // Total Debit: 100000, Total Credit: 90000 -> Unbalanced by 10000
    expect(() => {
      buildAuditFromTrialBalance(unbalancedRows, baseAccounts, 2024);
    }).toThrow(/ميزان المراجعة غير متزن/);
  });
});
