import { describe, it, expect } from 'vitest';
import { Account, JournalEntry } from '../types';
import { buildAuditFromTrialBalance } from './auditFromTrialBalance';
import { computeAccountBalances, generateIncomeStatement, generateBalanceSheet } from './accountingCalculations';

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

  // Test 5: ميزان فيه كود غير موجود بالدليل، تنفيذ نفس خطوات الحفظ، والتأكد أن الأصول = الالتزامات + حقوق الملكية
  it('5. ميزان فيه كود غير موجود بالدليل ينشئ الحساب ويربطه وتتساوى الأصول مع الالتزامات وحقوق الملكية بعد الحفظ', () => {
    // كود 1290 (شيكات تحت التحصيل - أصل متداول) غير موجود في baseAccounts
    expect(baseAccounts.find((a) => a.code === '1290')).toBeUndefined();

    const rowsWithMissingAccountInDirectory = [
      { originalCode: '1290', originalName: 'شيكات برسم التحصيل', mappedCode: '1290', mappedName: 'شيكات برسم التحصيل', debit: 60000, credit: 0 },
      { originalCode: '1110', originalName: 'الأصول الثابتة', mappedCode: '1110', mappedName: 'الأصول الثابتة', debit: 140000, credit: 0 },
      { originalCode: '2210', originalName: 'الموردون', mappedCode: '2210', mappedName: 'الموردون', debit: 0, credit: 50000 },
      { originalCode: '3100', originalName: 'رأس المال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 150000 },
    ];

    // Total Debit: 60,000 + 140,000 = 200,000
    // Total Credit: 50,000 + 150,000 = 200,000 -> متزن

    const buildResult = buildAuditFromTrialBalance(rowsWithMissingAccountInDirectory, baseAccounts, 2024);
    expect(buildResult.entry).toBeDefined();

    // تنفيذ نفس خطوات الحفظ (في دالة نقية تحاكي handleSaveEntryToDatabase)
    const codeToId: Record<string, string> = {};
    const createdAccounts: Account[] = [];

    // 1. إنشاء الحسابات الناقصة بـ crypto.randomUUID()
    buildResult.entry.lines.forEach((line) => {
      const existing = baseAccounts.find((a) => a.code === line.accountCode);
      if (!existing) {
        const generatedId = crypto.randomUUID();
        codeToId[line.accountCode] = generatedId;
        createdAccounts.push({
          id: generatedId,
          code: line.accountCode,
          name: line.accountName,
          category: line.accountCode.startsWith('1') ? 'ASSETS' :
                    line.accountCode.startsWith('2') ? 'LIABILITIES' :
                    line.accountCode.startsWith('3') ? 'EQUITY' :
                    line.accountCode.startsWith('4') ? 'REVENUES' : 'EXPENSES',
          nature: (line.accountCode.startsWith('1') || line.accountCode.startsWith('5')) ? 'DEBIT' : 'CREDIT',
          level: 2,
          openingBalanceDebit: 0,
          openingBalanceCredit: 0,
          isSystem: false,
        });
      } else {
        codeToId[line.accountCode] = existing.id;
      }
    });

    expect(createdAccounts.length).toBe(1);
    expect(createdAccounts[0].code).toBe('1290');
    expect(createdAccounts[0].id).toBeDefined();

    // 2. تحديث كل line.accountId = codeToId[line.accountCode] || id الحساب الموجود
    const updatedLines = buildResult.entry.lines.map((line) => {
      const targetId = codeToId[line.accountCode] || baseAccounts.find((a) => a.code === line.accountCode)?.id || line.accountId;
      return {
        ...line,
        accountId: targetId,
      };
    });

    const savedEntry: JournalEntry = {
      ...buildResult.entry,
      lines: updatedLines,
      isPosted: true,
    };

    // 3. احتساب computeAccountBalances على القيد المحفوظ مع الدليل الكامل المحدث
    const allAccountsAfterSave = [...baseAccounts, ...createdAccounts];
    const calculatedAccountsAfterSave = computeAccountBalances(allAccountsAfterSave, [savedEntry]);

    // التأكد من أن ميزان المراجعة متزن بعد الحفظ
    const totalDebit = calculatedAccountsAfterSave.reduce((sum, a) => sum + a.totalDebit, 0);
    const totalCredit = calculatedAccountsAfterSave.reduce((sum, a) => sum + a.totalCredit, 0);
    expect(totalDebit).toBe(totalCredit);

    // 4. استخراج الميزانية العمومية والتأكد أن إجمالي الأصول = الالتزامات + حقوق الملكية
    const incomeData = generateIncomeStatement(calculatedAccountsAfterSave, false);
    const balanceSheet = generateBalanceSheet(calculatedAccountsAfterSave, incomeData);

    expect(balanceSheet.isBalanced).toBe(true);
    expect(balanceSheet.totalAssets).toBe(200000);
    expect(balanceSheet.totalLiabilities).toBe(50000);
    expect(balanceSheet.equityTotal).toBe(150000);
    expect(balanceSheet.totalEquityAndLiabilities).toBe(200000);
    expect(balanceSheet.totalAssets).toBe(balanceSheet.totalLiabilities + balanceSheet.equityTotal);
    expect(balanceSheet.variance).toBe(0);
  });

  // Test 7: ميزان بدون ميزان سنة سابقة (priorRows): التدفقات النقدية hasComparativeData: false
  it('7. بدون ميزان سنة مقارنة (priorRows): التدفقات النقدية hasComparativeData: false والتدفقات null', () => {
    const balancedRows = [
      { originalCode: '1110', originalName: 'أصول ثابتة', mappedCode: '1110', mappedName: 'الأصول الثابتة', debit: 100000, credit: 0 },
      { originalCode: '1250', originalName: 'خزينة', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 50000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس مال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 150000 },
    ];

    const result = buildAuditFromTrialBalance(balancedRows, baseAccounts, 2024, 'العميل', 'c1', null);

    expect(result.cashFlowData.hasComparativeData).toBe(false);
    expect(result.cashFlowData.netChangeInCash).toBeNull();
    expect(result.cashFlowData.operatingCashFlow.netOperatingCash).toBeNull();
    expect(result.cashFlowData.investingCashFlow.netInvestingCash).toBeNull();
    expect(result.cashFlowData.financingCashFlow.netFinancingCash).toBeNull();
  });

  // Test 8: مع ميزان سنة مقارنة (priorRows): التدفقات النقدية hasComparativeData: true وتحتسب الأرقام
  it('8. مع ميزان سنة مقارنة (priorRows): التدفقات النقدية hasComparativeData: true وتحتسب التدفقات', () => {
    const priorRows = [
      { originalCode: '1110', originalName: 'أصول ثابتة', mappedCode: '1110', mappedName: 'الأصول الثابتة', debit: 80000, credit: 0 },
      { originalCode: '1250', originalName: 'خزينة', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 20000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس مال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 100000 },
    ];

    const currentRows = [
      { originalCode: '1110', originalName: 'أصول ثابتة', mappedCode: '1110', mappedName: 'الأصول الثابتة', debit: 120000, credit: 0 },
      { originalCode: '1250', originalName: 'خزينة', mappedCode: '1250', mappedName: 'النقدية وما في حكمها', debit: 30000, credit: 0 },
      { originalCode: '3100', originalName: 'رأس مال', mappedCode: '3100', mappedName: 'رأس المال', debit: 0, credit: 150000 },
    ];

    const result = buildAuditFromTrialBalance(currentRows, baseAccounts, 2024, 'العميل', 'c1', priorRows);

    expect(result.cashFlowData.hasComparativeData).toBe(true);
    expect(result.cashFlowData.netChangeInCash).not.toBeNull();
    expect(typeof result.cashFlowData.operatingCashFlow.netOperatingCash).toBe('number');
  });
});

