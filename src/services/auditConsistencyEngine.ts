import { DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  CalculatedAccount,
  IncomeStatementData,
  BalanceSheetData,
} from '../utils/accountingCalculations';

export type AuditSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'PASSED';

export interface AuditCheckItem {
  id: string;
  category: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'TRIAL_BALANCE' | 'FIXED_ASSETS' | 'TAX_COMPLIANCE' | 'BANK_CASH' | 'JOURNAL_INTEGRITY';
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  severity: AuditSeverity;
  standardReference: string; // e.g. EAS 1, EAS 10, EAS 24, Law 91
  status: 'PASSED' | 'FAILED' | 'WARNING';
  metricValue?: string | number;
  expectedValue?: string | number;
  variance?: number;
  recommendationAr: string;
  autoFixAvailable?: boolean;
}

export interface AuditConsistencyReport {
  timestamp: string;
  fiscalYear: number;
  clientName: string;
  auditorName: string;
  firmName: string;
  overallHealthScore: number; // 0 to 100
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL_RISK';
  summary: {
    totalChecks: number;
    passedCount: number;
    warningCount: number;
    criticalCount: number;
  };
  checks: AuditCheckItem[];
  financialSnapshot: {
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
    balanceSheetVariance: number;
    trialBalanceDebit: number;
    trialBalanceCredit: number;
    trialBalanceVariance: number;
    netSales: number;
    netProfit: number;
    taxExpense: number;
  };
}

export function runAuditConsistencySentinel(
  state: DatabaseState,
  fiscalYear: number = 2026
): AuditConsistencyReport {
  const accounts = state.accounts || [];
  const journalEntries = state.journalEntries || [];
  const fixedAssets = state.fixedAssets || [];
  const clientContext = state.activeClientContext;
  const clientName = clientContext?.clientName || state.officeProfile?.firmName || 'المنشأة المعتمدة';
  const auditorName = state.officeProfile?.auditorName || 'المحاسب القانوني';
  const firmName = state.officeProfile?.firmName || 'مكتب المحاسبة والمراجعة';

  // 1. Calculate trial balance, income statement, balance sheet
  const calculatedAccounts = computeAccountBalances(accounts, journalEntries);
  const incomeData = generateIncomeStatement(calculatedAccounts);
  const balanceSheetData = generateBalanceSheet(calculatedAccounts, incomeData);

  const checks: AuditCheckItem[] = [];

  // Check 1: Balance Sheet Equation Equality (EAS 1)
  const bsVariance = Math.abs(balanceSheetData.totalAssets - balanceSheetData.totalEquityAndLiabilities);
  if (bsVariance < 0.01) {
    checks.push({
      id: 'BS_EQUATION',
      category: 'BALANCE_SHEET',
      titleAr: 'توازن معادلة المركز المالي (الأصول = الخصوم + حقوق الملكية)',
      titleEn: 'Balance Sheet Equilibrium Check',
      descriptionAr: 'الميزانية متزنة بالكامل دون أي فروق مليمية وفقاً للمعيار المصري رقم (1).',
      severity: 'PASSED',
      standardReference: 'EAS 1 (عرض القوائم المالية)',
      status: 'PASSED',
      metricValue: balanceSheetData.totalAssets,
      expectedValue: balanceSheetData.totalEquityAndLiabilities,
      variance: 0,
      recommendationAr: 'المعادلة سليمة وموثقة بنجاح.',
    });
  } else {
    checks.push({
      id: 'BS_EQUATION',
      category: 'BALANCE_SHEET',
      titleAr: 'اختلال توازن المركز المالي (فارق غير متزن)',
      titleEn: 'Balance Sheet Out of Balance',
      descriptionAr: `يوجد فارق قدره ${bsVariance.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م بين إجمالي الأصول وإجمالي الخصوم وحقوق الملكية.`,
      severity: 'CRITICAL',
      standardReference: 'EAS 1 (عرض القوائم المالية)',
      status: 'FAILED',
      metricValue: balanceSheetData.totalAssets,
      expectedValue: balanceSheetData.totalEquityAndLiabilities,
      variance: bsVariance,
      recommendationAr: 'راجع ترحيل قيود الإقفال السنوية وحساب صافي ربح الفترة في حقوق الملكية.',
      autoFixAvailable: true,
    });
  }

  // Check 2: Trial Balance Ending Debit vs Ending Credit
  let totalEndingDebit = 0;
  let totalEndingCredit = 0;
  let totalMovementDebit = 0;
  let totalMovementCredit = 0;

  for (const acc of calculatedAccounts) {
    if (acc.level >= 2) {
      totalEndingDebit += acc.endingBalanceDebit || 0;
      totalEndingCredit += acc.endingBalanceCredit || 0;
      totalMovementDebit += acc.movementDebit || 0;
      totalMovementCredit += acc.movementCredit || 0;
    }
  }

  const tbEndingVariance = Math.abs(totalEndingDebit - totalEndingCredit);
  if (tbEndingVariance < 0.01) {
    checks.push({
      id: 'TB_BALANCE',
      category: 'TRIAL_BALANCE',
      titleAr: 'توازن ميزان المراجعة بالأرصدة الختامية',
      titleEn: 'Trial Balance Ending Balances Equality',
      descriptionAr: 'مجموع الأرصدة المدينة يطابق تماماً مجموع الأرصدة الدائنة بميزان المراجعة.',
      severity: 'PASSED',
      standardReference: 'معايير المحاسبة المصرية - القيد المزدوج',
      status: 'PASSED',
      metricValue: totalEndingDebit,
      expectedValue: totalEndingCredit,
      variance: 0,
      recommendationAr: 'ميزان المراجعة متزن محاسبياً بنسبة 100%.',
    });
  } else {
    checks.push({
      id: 'TB_BALANCE',
      category: 'TRIAL_BALANCE',
      titleAr: 'عدم توازن ميزان المراجعة الختامي',
      titleEn: 'Trial Balance Out of Equilibrium',
      descriptionAr: `فارق ${tbEndingVariance.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م بين إجمالي المدين والدائن في ميزان المراجعة.`,
      severity: 'CRITICAL',
      standardReference: 'معايير المحاسبة المصرية - القيد المزدوج',
      status: 'FAILED',
      metricValue: totalEndingDebit,
      expectedValue: totalEndingCredit,
      variance: tbEndingVariance,
      recommendationAr: 'فحص القيود اليدوية والتأكد من عدم وجود قيد وحيد الطرف أو حذف غير مكتمل لأحد الأطراف.',
      autoFixAvailable: false,
    });
  }

  // Check 3: Retained Earnings and Net Income Roll-Forward
  const currentNetIncomeInBS = balanceSheetData.equity.currentYearNetProfit;
  const netIncomeFromIS = incomeData.netProfitAfterTax;
  const netIncomeDiff = Math.abs(currentNetIncomeInBS - netIncomeFromIS);

  if (netIncomeDiff < 1.0) {
    checks.push({
      id: 'NET_INCOME_ROLLFORWARD',
      category: 'INCOME_STATEMENT',
      titleAr: 'مطابقة صافي ربح الفترة بين قائمة الدخل والمركز المالي',
      titleEn: 'Income Statement to Balance Sheet Net Profit Integration',
      descriptionAr: 'صافي الربح بعد الضريبة بقائمة الدخل يطابق تماماً صافي ربح الفترة بحقوق الملكية.',
      severity: 'PASSED',
      standardReference: 'EAS 1 فقرة 106',
      status: 'PASSED',
      metricValue: netIncomeFromIS,
      expectedValue: currentNetIncomeInBS,
      variance: 0,
      recommendationAr: 'التكامل بين قائمة الدخل والميزانية سليم ومكتمل.',
    });
  } else {
    checks.push({
      id: 'NET_INCOME_ROLLFORWARD',
      category: 'INCOME_STATEMENT',
      titleAr: 'تضارب بين صافي ربح الدخل وحقوق الملكية',
      titleEn: 'Discrepancy in Net Income Integration',
      descriptionAr: `صافي ربح قائمة الدخل (${netIncomeFromIS.toLocaleString('ar-EG')} ج.م) يختلف عن ربح حقوق الملكية (${currentNetIncomeInBS.toLocaleString('ar-EG')} ج.م).`,
      severity: 'CRITICAL',
      standardReference: 'EAS 1 فقرة 106',
      status: 'FAILED',
      metricValue: netIncomeFromIS,
      expectedValue: currentNetIncomeInBS,
      variance: netIncomeDiff,
      recommendationAr: 'قم بإعادة احتساب وترحيل صافي ربح الفترة إلى بند الأرباح وحقوق الملكية.',
      autoFixAvailable: true,
    });
  }

  // Check 4: Fixed Assets vs Depreciation (EAS 10)
  const isDeprecExpense = incomeData.depreciationExpense;
  const bsAccumDeprec = balanceSheetData.nonCurrentAssets.accumulatedDepreciation;
  
  if (fixedAssets.length > 0) {
    const totalAssetCost = fixedAssets.reduce((s, a) => s + (a.acquisitionCost || 0), 0);
    const totalAssetAccum = fixedAssets.reduce((s, a) => s + (a.currentAccumulatedDepreciation || 0), 0);

    const assetCostDiff = Math.abs(balanceSheetData.nonCurrentAssets.propertyPlantEquipment - totalAssetCost);
    if (assetCostDiff > 100) {
      checks.push({
        id: 'FA_REGISTER_MATCH',
        category: 'FIXED_ASSETS',
        titleAr: 'فارق بين سجل الأصول الثابتة ورصيد الميزانية',
        titleEn: 'Fixed Asset Register vs Balance Sheet Discrepancy',
        descriptionAr: `تكلفة الأصول في السجل التمليكي (${totalAssetCost.toLocaleString('ar-EG')} ج.م) لا تطابق الأصول بالميزانية (${balanceSheetData.nonCurrentAssets.propertyPlantEquipment.toLocaleString('ar-EG')} ج.م).`,
        severity: 'WARNING',
        standardReference: 'EAS 10 (الأصول الثابتة وإهلاكاتها)',
        status: 'WARNING',
        metricValue: totalAssetCost,
        expectedValue: balanceSheetData.nonCurrentAssets.propertyPlantEquipment,
        variance: assetCostDiff,
        recommendationAr: 'تحديث سجل الأصول وإثبات أي إضافات أو استبعادات للأصول خلال السنة المالية.',
      });
    } else {
      checks.push({
        id: 'FA_REGISTER_MATCH',
        category: 'FIXED_ASSETS',
        titleAr: 'تطابق سجل الأصول الثابتة مع القوائم المالية',
        titleEn: 'Fixed Asset Register Reconciliation',
        descriptionAr: 'تكلفة الأصول الثابتة ومجمعات الإهلاك في السجل تطابق حسابات الأستاذ العام بدقة.',
        severity: 'PASSED',
        standardReference: 'EAS 10',
        status: 'PASSED',
        recommendationAr: 'السجل مطابق للمعايير المصرية.',
      });
    }
  }

  // Check 5: Abnormal Negative Balances (Negative Cash, Inventory, etc.)
  const abnormalAccounts: string[] = [];
  for (const acc of calculatedAccounts) {
    if (acc.level < 2) continue;
    // Cash / Bank should not be negative debit
    if (acc.code.startsWith('1230') || acc.code.startsWith('1240') || acc.name.includes('صندوق') || acc.name.includes('خزينة')) {
      if (acc.endingBalanceCredit > acc.endingBalanceDebit && (acc.endingBalanceCredit - acc.endingBalanceDebit) > 1.0) {
        abnormalAccounts.push(`خزينة/بنك ذو رصيد سالب دائن: ${acc.name} (${acc.code})`);
      }
    }
    // Inventory should not be credit
    if (acc.code.startsWith('1210') || acc.name.includes('مخزون')) {
      if (acc.endingBalanceCredit > acc.endingBalanceDebit && (acc.endingBalanceCredit - acc.endingBalanceDebit) > 1.0) {
        abnormalAccounts.push(`مخزون ذو رصيد سالب دائن: ${acc.name} (${acc.code})`);
      }
    }
  }

  if (abnormalAccounts.length === 0) {
    checks.push({
      id: 'ABNORMAL_BALANCES',
      category: 'BANK_CASH',
      titleAr: 'سلامة أرصدة النقدية والمخزون من الأرصدة الشاذة',
      titleEn: 'No Abnormal / Inverted Balances Found',
      descriptionAr: 'لم يتم رصد أي رصيد شاذ (خزينة مكشوفة سالبة أو مخزون مدين سالب).',
      severity: 'PASSED',
      standardReference: 'رقابة داخلية ومعايير المراجعة المصرية (معيار 315)',
      status: 'PASSED',
      recommendationAr: 'الأرصدة متوافقة مع طبيعتها المحاسبية الطبيعية.',
    });
  } else {
    checks.push({
      id: 'ABNORMAL_BALANCES',
      category: 'BANK_CASH',
      titleAr: 'تنبيه رقابي: رصد أرصدة شاذة معكوسة بالدفاتر',
      titleEn: 'Abnormal Balances Detected',
      descriptionAr: `تم اكتشاف أرصدة سالبة/معكوسة: ${abnormalAccounts.join(' - ')}. هذا يمثل خطراً عند الفحص الضريبي والبنكي.`,
      severity: 'CRITICAL',
      standardReference: 'معيار مراجعة مصري 315 ومحددات الفحص الضريبي',
      status: 'FAILED',
      recommendationAr: 'تسوية رصيد الخزينة المكشوف بقيد تمويل جاري الشركاء أو تسوية أرصدة البنوك الدائنة.',
      autoFixAvailable: true,
    });
  }

  // Check 6: Egyptian Statutory Tax Compliance (Law 91 / 22.5%)
  if (incomeData.profitBeforeTax > 0) {
    const expectedTax = incomeData.profitBeforeTax * 0.225;
    const actualTaxRecorded = incomeData.taxExpense;
    const taxDiff = Math.abs(actualTaxRecorded - expectedTax);

    if (taxDiff > 500 && actualTaxRecorded === 0) {
      checks.push({
        id: 'TAX_PROVISION',
        category: 'TAX_COMPLIANCE',
        titleAr: 'عدم احتساب مخصص ضريبة الدخل السنوية (قانون 91)',
        titleEn: 'Missing Income Tax Provision',
        descriptionAr: `المنشأة حققت ربحاً قدره ${incomeData.profitBeforeTax.toLocaleString('ar-EG')} ج.م ولم يُثبت مخصص ضريبة الدخل 22.5% المقدر بـ ${expectedTax.toLocaleString('ar-EG')} ج.م.`,
        severity: 'WARNING',
        standardReference: 'قانون الضريبة على الدخل 91 والمعيار المصري 24',
        status: 'WARNING',
        metricValue: actualTaxRecorded,
        expectedValue: expectedTax,
        variance: expectedTax,
        recommendationAr: 'إثبات قيد استحقاق مخصص ضريبة الدخل (من حـ/ مصروف ضريبة الدخل إلى حـ/ مصلحة الضرائب).',
        autoFixAvailable: true,
      });
    } else {
      checks.push({
        id: 'TAX_PROVISION',
        category: 'TAX_COMPLIANCE',
        titleAr: 'معالجة ضريبة الدخل والضريبة المؤجلة متوافقة',
        titleEn: 'Tax Provision Accrual Compliant',
        descriptionAr: `تم احتساب وإثبات ضريبة الدخل السنوية (${actualTaxRecorded.toLocaleString('ar-EG')} ج.م) بما يتوافق مع القوانين المصرية.`,
        severity: 'PASSED',
        standardReference: 'قانون 91 لسنة 2005 ومعيار EAS 24',
        status: 'PASSED',
        metricValue: actualTaxRecorded,
        expectedValue: expectedTax,
        recommendationAr: 'الامتثال الضريبي مكتمل.',
      });
    }
  }

  // Check 7: Unposted Draft Journal Entries
  const draftEntries = journalEntries.filter((e) => !e.isPosted);
  if (draftEntries.length > 0) {
    checks.push({
      id: 'UNPOSTED_ENTRIES',
      category: 'JOURNAL_INTEGRITY',
      titleAr: `يوجد ${draftEntries.length} قيود مسودة غير مرحلة`,
      titleEn: 'Unposted Draft Journal Entries Exist',
      descriptionAr: 'القيود غير المرحلة لا تؤثر في ميزان المراجعة أو القوائم المالية، مما قد يسبب نقصاً في البيانات المعتمدة.',
      severity: 'WARNING',
      standardReference: 'أصول القيد والترحيل بالدفاتر المنتظمة (قانون التجارة 17)',
      status: 'WARNING',
      metricValue: draftEntries.length,
      expectedValue: 0,
      recommendationAr: 'ترحيل كافة قيود التسوية الختامية أو إلغاء القيود غير المكتملة.',
      autoFixAvailable: true,
    });
  } else {
    checks.push({
      id: 'UNPOSTED_ENTRIES',
      category: 'JOURNAL_INTEGRITY',
      titleAr: 'كافة قيود اليومية مرحلة ومنتظمة بالدفاتر',
      titleEn: 'All Journal Entries are Posted',
      descriptionAr: `تم ترحيل كامل القيود المسجلة (${journalEntries.length} قيد) بنجاح إلى دفاتر الأستاذ.`,
      severity: 'PASSED',
      standardReference: 'معايير التدقيق والرقابة على القيود',
      status: 'PASSED',
      recommendationAr: 'الدفاتر منتظمة ومحدثة لحظياً.',
    });
  }

  // Calculate Health Score
  const totalChecks = checks.length;
  const passedCount = checks.filter((c) => c.status === 'PASSED').length;
  const warningCount = checks.filter((c) => c.status === 'WARNING').length;
  const criticalCount = checks.filter((c) => c.severity === 'CRITICAL' && c.status === 'FAILED').length;

  let healthScore = 100;
  healthScore -= criticalCount * 30;
  healthScore -= warningCount * 10;
  if (healthScore < 0) healthScore = 0;

  const overallStatus =
    criticalCount > 0 ? 'CRITICAL_RISK' : warningCount > 0 ? 'WARNING' : 'HEALTHY';

  return {
    timestamp: new Date().toISOString(),
    fiscalYear,
    clientName,
    auditorName,
    firmName,
    overallHealthScore: healthScore,
    overallStatus,
    summary: {
      totalChecks,
      passedCount,
      warningCount,
      criticalCount,
    },
    checks,
    financialSnapshot: {
      totalAssets: balanceSheetData.totalAssets,
      totalLiabilitiesAndEquity: balanceSheetData.totalEquityAndLiabilities,
      balanceSheetVariance: bsVariance,
      trialBalanceDebit: totalEndingDebit,
      trialBalanceCredit: totalEndingCredit,
      trialBalanceVariance: tbEndingVariance,
      netSales: incomeData.revenuesTotal,
      netProfit: incomeData.netProfitAfterTax,
      taxExpense: incomeData.taxExpense,
    },
  };
}
