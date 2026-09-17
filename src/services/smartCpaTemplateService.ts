import * as XLSX from 'xlsx';

export interface SmartCpaExpenseAllocation {
  salaries: number; // 20% أجور وما في حكمها
  rent: number; // 12% إيجارات
  licensingFees: number; // 12% رسوم وتراخيص
  electricityWaterGas: number; // 11% كهرباء وغاز ومياه
  stationeryAndPrinting: number; // 8% أدوات مكتبية ومطبوعات
  hospitalityAndBuffet: number; // 7% بوفيه وضيافة
  advertising: number; // 7% مصاريف إعلانات
  transportation: number; // 5% انتقالات ومواصلات
  promotionAndPublicity: number; // 5% مصاريف دعاية
  professionalConsultancy: number; // 4% استشارات مهنية وقانونية
  donationsAndTips: number; // 3% إكراميات وتبرعات
  miscellaneous: number; // 3% مصاريف متنوعة
  telecomAndPostage: number; // 2% بريد وهاتف
  stampsAndDuties: number; // 1% رسوم ودمغات
  total: number; // 100%
}

export const SMART_EXPENSE_RATIOS = [
  { key: 'salaries', label: 'أجور وما في حكمها', ratio: 0.20 },
  { key: 'rent', label: 'إيجارات', ratio: 0.12 },
  { key: 'licensingFees', label: 'رسوم وتراخيص', ratio: 0.12 },
  { key: 'electricityWaterGas', label: 'كهرباء وغاز ومياه', ratio: 0.11 },
  { key: 'stationeryAndPrinting', label: 'أدوات مكتبية ومطبوعات وتصوير', ratio: 0.08 },
  { key: 'hospitalityAndBuffet', label: 'بوفيه وضيافة ونظافة', ratio: 0.07 },
  { key: 'advertising', label: 'مصاريف إعلانات وتسويق', ratio: 0.07 },
  { key: 'transportation', label: 'انتقالات ومواصلات وبدلات سفر', ratio: 0.05 },
  { key: 'promotionAndPublicity', label: 'مصاريف دعاية وترويج', ratio: 0.05 },
  { key: 'professionalConsultancy', label: 'استشارات مهنية وقانونية ومحاسبية', ratio: 0.04 },
  { key: 'donationsAndTips', label: 'إكراميات وتبرعات', ratio: 0.03 },
  { key: 'miscellaneous', label: 'مصاريف عمومية وإدارية متنوعة', ratio: 0.03 },
  { key: 'telecomAndPostage', label: 'بريد وهاتف وإنترنت', ratio: 0.02 },
  { key: 'stampsAndDuties', label: 'رسوم ودمغات حكومية', ratio: 0.01 },
] as const;

export interface SmartCpaYearData {
  year: number;
  isManualMode: boolean; // false = smart auto calculation, true = custom manual edit
  // Top Inputs
  sales: number;
  totalExpensesInput: number;
  paidUpCapital: number;
  // Fixed Assets Roll-Forward
  fixedAssetsCostOpening: number;
  fixedAssetsAdditions: number;
  fixedAssetsDisposals: number;
  fixedAssetsCostClosing: number;
  accumulatedDepreciationOpening: number;
  depreciationPeriod: number;
  accumulatedDepreciationClosing: number;
  netFixedAssets: number;
  // Cost of Sales & Inventory (18% of sales: 6% raw, 8% wip, 4% finished)
  inventoryRaw: number;
  inventoryWip: number;
  inventoryFinished: number;
  inventoryTotal: number;
  inventoryOpening: number;
  purchases: number;
  costOfSales: number;
  grossProfit: number;
  // Income Statement
  operatingExpenses: number;
  depreciationExpense: number;
  totalExpenses: number;
  netProfitBeforeTax: number;
  taxRate: number; // 0.225
  taxAmount: number;
  netProfitAfterTax: number;
  // Balance Sheet
  nonCurrentAssets: number;
  accountsReceivable: number;
  cashAndBanks: number;
  inventoryClosing: number;
  totalCurrentAssets: number;
  totalAssets: number;
  partnersCurrentAccount: number; // Auto balancing plug: totalAssets - (capital + netProfitAfterTax + nonCurrentLiabilities + currentLiabilities)
  currentYearProfit: number; // = netProfitAfterTax
  totalEquity: number;
  nonCurrentLiabilities: number;
  accountsPayable: number;
  totalCurrentLiabilities: number;
  totalLiabilitiesAndEquity: number;
  // 14-item Expense Detail Breakdown (100%)
  expenseAllocation: SmartCpaExpenseAllocation;
}

export class SmartCpaTemplateService {
  private static STORAGE_KEY = 'cpa_smart_annual_template_years_v2';

  // Calculate a year with the exact Excel formulas from the user's sheet
  public static calculateYear(
    input: Partial<SmartCpaYearData> & { year: number },
    previousYear?: SmartCpaYearData
  ): SmartCpaYearData {
    const year = input.year;
    const isManualMode = !!input.isManualMode;

    const sales = input.sales !== undefined ? Number(input.sales) : 8547570;
    const totalExpensesInput = input.totalExpensesInput !== undefined ? Number(input.totalExpensesInput) : 428462;
    const paidUpCapital = input.paidUpCapital !== undefined ? Number(input.paidUpCapital) : 300000;

    // 1. Fixed Assets Roll-Forward
    const fixedAssetsCostOpening =
      input.fixedAssetsCostOpening !== undefined
        ? Number(input.fixedAssetsCostOpening)
        : previousYear
        ? previousYear.fixedAssetsCostClosing
        : 1737200;
    const fixedAssetsAdditions = input.fixedAssetsAdditions !== undefined ? Number(input.fixedAssetsAdditions) : 0;
    const fixedAssetsDisposals = input.fixedAssetsDisposals !== undefined ? Number(input.fixedAssetsDisposals) : 0;
    const fixedAssetsCostClosing = fixedAssetsCostOpening + fixedAssetsAdditions - fixedAssetsDisposals;

    const accumulatedDepreciationOpening =
      input.accumulatedDepreciationOpening !== undefined
        ? Number(input.accumulatedDepreciationOpening)
        : previousYear
        ? previousYear.accumulatedDepreciationClosing
        : 265246;

    // Depreciation period calculation (~7.63% weighted average rate for mixed assets)
    const depreciationPeriod =
      input.depreciationPeriod !== undefined
        ? Number(input.depreciationPeriod)
        : Math.round(fixedAssetsCostClosing * 0.0763);

    const accumulatedDepreciationClosing = accumulatedDepreciationOpening + depreciationPeriod;
    const netFixedAssets = Math.max(0, fixedAssetsCostClosing - accumulatedDepreciationClosing);

    // 2. Cost of Sales & Inventory (18% of sales: 6% raw, 8% wip, 4% finished)
    const inventoryRaw = Math.round(sales * 0.06);
    const inventoryWip = Math.round(sales * 0.08);
    const inventoryFinished = Math.round(sales * 0.04);
    const inventoryTotal = inventoryRaw + inventoryWip + inventoryFinished;

    const inventoryOpening =
      input.inventoryOpening !== undefined
        ? Number(input.inventoryOpening)
        : previousYear
        ? previousYear.inventoryClosing
        : Math.round(sales * 0.12);

    const costOfSales =
      input.costOfSales !== undefined
        ? Number(input.costOfSales)
        : Math.round(sales * 0.74); // 74% of sales as in template cell F19

    const purchases = Math.max(0, costOfSales + inventoryTotal - inventoryOpening);
    const grossProfit = sales - costOfSales;

    // 3. Operating Expenses & Allocation
    const operatingExpenses = totalExpensesInput;
    const depreciationExpense = depreciationPeriod;
    const totalExpenses = operatingExpenses + depreciationExpense;

    const netProfitBeforeTax = grossProfit - totalExpenses;
    const taxRate = 0.225; // Egyptian corporate tax rate
    const taxAmount = netProfitBeforeTax > 0 ? Math.round(netProfitBeforeTax * taxRate) : 0;
    const netProfitAfterTax = netProfitBeforeTax - taxAmount;

    // 4. Current Assets
    const accountsReceivable =
      input.accountsReceivable !== undefined
        ? Number(input.accountsReceivable)
        : Math.round(sales * 0.093); // ~9.3% in template (795,950 / 8,547,570)
    const cashAndBanks =
      input.cashAndBanks !== undefined
        ? Number(input.cashAndBanks)
        : Math.round(sales * 0.018); // ~1.8% in template (154,800)
    const inventoryClosing = inventoryTotal;
    const totalCurrentAssets = accountsReceivable + cashAndBanks + inventoryClosing;
    const totalAssets = netFixedAssets + totalCurrentAssets;

    // 5. Liabilities
    const nonCurrentLiabilities =
      input.nonCurrentLiabilities !== undefined ? Number(input.nonCurrentLiabilities) : 0;
    const accountsPayable =
      input.accountsPayable !== undefined
        ? Number(input.accountsPayable)
        : Math.round(purchases * 0.027); // ~180,500
    const totalCurrentLiabilities = accountsPayable;

    // 6. GOLDEN AUTO-BALANCING PLUG: Partners' Current Account
    // H25 = I22 - SUM(H24 + H26 + H29 + I33)
    const currentYearProfit = netProfitAfterTax; // H26 = D25
    const partnersCurrentAccount =
      totalAssets - (paidUpCapital + currentYearProfit + nonCurrentLiabilities + totalCurrentLiabilities);

    const totalEquity = paidUpCapital + partnersCurrentAccount + currentYearProfit;
    const totalLiabilitiesAndEquity = totalEquity + nonCurrentLiabilities + totalCurrentLiabilities;

    // 7. 14-Item Expense Allocation Breakdown (100%)
    const expenseAllocation: SmartCpaExpenseAllocation = {
      salaries: Math.round(operatingExpenses * 0.20),
      rent: Math.round(operatingExpenses * 0.12),
      licensingFees: Math.round(operatingExpenses * 0.12),
      electricityWaterGas: Math.round(operatingExpenses * 0.11),
      stationeryAndPrinting: Math.round(operatingExpenses * 0.08),
      hospitalityAndBuffet: Math.round(operatingExpenses * 0.07),
      advertising: Math.round(operatingExpenses * 0.07),
      transportation: Math.round(operatingExpenses * 0.05),
      promotionAndPublicity: Math.round(operatingExpenses * 0.05),
      professionalConsultancy: Math.round(operatingExpenses * 0.04),
      donationsAndTips: Math.round(operatingExpenses * 0.03),
      miscellaneous: Math.round(operatingExpenses * 0.03),
      telecomAndPostage: Math.round(operatingExpenses * 0.02),
      stampsAndDuties: Math.round(operatingExpenses * 0.01),
      total: operatingExpenses,
    };

    // If manual mode, honor exact manual values passed
    if (isManualMode) {
      return {
        year,
        isManualMode: true,
        sales: input.sales ?? sales,
        totalExpensesInput: input.totalExpensesInput ?? totalExpensesInput,
        paidUpCapital: input.paidUpCapital ?? paidUpCapital,
        fixedAssetsCostOpening: input.fixedAssetsCostOpening ?? fixedAssetsCostOpening,
        fixedAssetsAdditions: input.fixedAssetsAdditions ?? fixedAssetsAdditions,
        fixedAssetsDisposals: input.fixedAssetsDisposals ?? fixedAssetsDisposals,
        fixedAssetsCostClosing: input.fixedAssetsCostClosing ?? fixedAssetsCostClosing,
        accumulatedDepreciationOpening: input.accumulatedDepreciationOpening ?? accumulatedDepreciationOpening,
        depreciationPeriod: input.depreciationPeriod ?? depreciationPeriod,
        accumulatedDepreciationClosing: input.accumulatedDepreciationClosing ?? accumulatedDepreciationClosing,
        netFixedAssets: input.netFixedAssets ?? netFixedAssets,
        inventoryRaw: input.inventoryRaw ?? inventoryRaw,
        inventoryWip: input.inventoryWip ?? inventoryWip,
        inventoryFinished: input.inventoryFinished ?? inventoryFinished,
        inventoryTotal: input.inventoryTotal ?? inventoryTotal,
        inventoryOpening: input.inventoryOpening ?? inventoryOpening,
        purchases: input.purchases ?? purchases,
        costOfSales: input.costOfSales ?? costOfSales,
        grossProfit: (input.sales ?? sales) - (input.costOfSales ?? costOfSales),
        operatingExpenses: input.operatingExpenses ?? operatingExpenses,
        depreciationExpense: input.depreciationExpense ?? depreciationExpense,
        totalExpenses: (input.operatingExpenses ?? operatingExpenses) + (input.depreciationExpense ?? depreciationExpense),
        netProfitBeforeTax:
          ((input.sales ?? sales) - (input.costOfSales ?? costOfSales)) -
          ((input.operatingExpenses ?? operatingExpenses) + (input.depreciationExpense ?? depreciationExpense)),
        taxRate: 0.225,
        taxAmount: input.taxAmount ?? taxAmount,
        netProfitAfterTax: input.netProfitAfterTax ?? netProfitAfterTax,
        nonCurrentAssets: input.nonCurrentAssets ?? netFixedAssets,
        accountsReceivable: input.accountsReceivable ?? accountsReceivable,
        cashAndBanks: input.cashAndBanks ?? cashAndBanks,
        inventoryClosing: input.inventoryClosing ?? inventoryClosing,
        totalCurrentAssets:
          (input.accountsReceivable ?? accountsReceivable) +
          (input.cashAndBanks ?? cashAndBanks) +
          (input.inventoryClosing ?? inventoryClosing),
        totalAssets:
          (input.netFixedAssets ?? netFixedAssets) +
          ((input.accountsReceivable ?? accountsReceivable) +
            (input.cashAndBanks ?? cashAndBanks) +
            (input.inventoryClosing ?? inventoryClosing)),
        partnersCurrentAccount: input.partnersCurrentAccount ?? partnersCurrentAccount,
        currentYearProfit: input.currentYearProfit ?? currentYearProfit,
        totalEquity:
          (input.paidUpCapital ?? paidUpCapital) +
          (input.partnersCurrentAccount ?? partnersCurrentAccount) +
          (input.currentYearProfit ?? currentYearProfit),
        nonCurrentLiabilities: input.nonCurrentLiabilities ?? nonCurrentLiabilities,
        accountsPayable: input.accountsPayable ?? accountsPayable,
        totalCurrentLiabilities: input.totalCurrentLiabilities ?? totalCurrentLiabilities,
        totalLiabilitiesAndEquity:
          (input.paidUpCapital ?? paidUpCapital) +
          (input.partnersCurrentAccount ?? partnersCurrentAccount) +
          (input.currentYearProfit ?? currentYearProfit) +
          (input.nonCurrentLiabilities ?? nonCurrentLiabilities) +
          (input.totalCurrentLiabilities ?? totalCurrentLiabilities),
        expenseAllocation: input.expenseAllocation ?? expenseAllocation,
      };
    }

    return {
      year,
      isManualMode: false,
      sales,
      totalExpensesInput,
      paidUpCapital,
      fixedAssetsCostOpening,
      fixedAssetsAdditions,
      fixedAssetsDisposals,
      fixedAssetsCostClosing,
      accumulatedDepreciationOpening,
      depreciationPeriod,
      accumulatedDepreciationClosing,
      netFixedAssets,
      inventoryRaw,
      inventoryWip,
      inventoryFinished,
      inventoryTotal,
      inventoryOpening,
      purchases,
      costOfSales,
      grossProfit,
      operatingExpenses,
      depreciationExpense,
      totalExpenses,
      netProfitBeforeTax,
      taxRate,
      taxAmount,
      netProfitAfterTax,
      nonCurrentAssets: netFixedAssets,
      accountsReceivable,
      cashAndBanks,
      inventoryClosing,
      totalCurrentAssets,
      totalAssets,
      partnersCurrentAccount,
      currentYearProfit,
      totalEquity,
      nonCurrentLiabilities,
      accountsPayable,
      totalCurrentLiabilities,
      totalLiabilitiesAndEquity,
      expenseAllocation,
    };
  }

  // Load all years data with default sequence matching the user's Excel model
  public static loadAllYears(): Record<number, SmartCpaYearData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load smart cpa years:', e);
    }

    // Default 4 years based on user's spreadsheet: 2021, 2022, 2023, 2024
    const y2021 = this.calculateYear({
      year: 2021,
      sales: 8547570,
      totalExpensesInput: 428462,
      fixedAssetsCostOpening: 1737200,
      accumulatedDepreciationOpening: 265246,
      paidUpCapital: 300000,
    });

    const y2022 = this.calculateYear(
      {
        year: 2022,
        sales: 7420000,
        totalExpensesInput: 465000,
        paidUpCapital: 300000,
      },
      y2021
    );

    const y2023 = this.calculateYear(
      {
        year: 2023,
        sales: 6154251,
        totalExpensesInput: 653405,
        paidUpCapital: 300000,
      },
      y2022
    );

    const y2024 = this.calculateYear(
      {
        year: 2024,
        sales: 9850000,
        totalExpensesInput: 720000,
        paidUpCapital: 300000,
      },
      y2023
    );

    const initialMap: Record<number, SmartCpaYearData> = {
      2021: y2021,
      2022: y2022,
      2023: y2023,
      2024: y2024,
    };

    this.saveAllYears(initialMap);
    return initialMap;
  }

  public static saveAllYears(years: Record<number, SmartCpaYearData>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(years));
    } catch (e) {
      console.error('Failed to persist smart cpa years:', e);
    }
  }

  // Generate Excel workbook matching the exact structure of the user's sheet
  public static exportToExcelWorkbook(yearsData: Record<number, SmartCpaYearData>, companyName: string = 'منشأة محاسبية معتمدة'): void {
    const wb = XLSX.utils.book_new();
    const sortedYears = Object.keys(yearsData).map(Number).sort((a, b) => a - b);

    // Build worksheet matrix
    const rows: (string | number)[][] = [];

    rows.push(['منظومة المحاسب القانوني المتكامل - القوائم المالية ونموذج المراجعة السريعة']);
    rows.push([companyName]);
    rows.push([]);

    for (const year of sortedYears) {
      const d = yearsData[year];
      if (!d) continue;

      rows.push([`=== السنة المالية المنتهية في 31 ديسمبر ${year} ===`]);
      rows.push([]);

      // Section 1: Income Statement & Balance Sheet Header
      rows.push(['قائمة الدخل', '', 'قائمة المركز المالي', '', 'كشف الأصول الثابتة والإهلاك', '', 'توزيع المصروفات العمومية (100%)']);
      rows.push(['البيان', 'القيمة (ج.م)', 'البيان', 'القيمة (ج.م)', 'البيان', 'القيمة (ج.م)', 'البند', 'النسبة', 'القيمة (ج.م)']);

      // Row 1
      rows.push([
        'المبيعات والإيرادات', d.sales,
        'الأصول غير المتداولة (صافي)', d.netFixedAssets,
        'تكلفة الأصول أول المدة', d.fixedAssetsCostOpening,
        'أجور وما في حكمها', '20%', d.expenseAllocation.salaries
      ]);

      // Row 2
      rows.push([
        '(يخصم): تكلفة المبيعات', d.costOfSales,
        'العملاء والمدينون', d.accountsReceivable,
        'إضافات العام', d.fixedAssetsAdditions,
        'إيجارات', '12%', d.expenseAllocation.rent
      ]);

      // Row 3
      rows.push([
        'مجمل الربح', d.grossProfit,
        'نقدية بالصندوق والبنوك', d.cashAndBanks,
        'إجمالي تكلفة الأصول آخر المدة', d.fixedAssetsCostClosing,
        'رسوم وتراخيص', '12%', d.expenseAllocation.licensingFees
      ]);

      // Row 4
      rows.push([
        '(يخصم): المصروفات العمومية', d.operatingExpenses,
        'مخزون آخر المدة (18%)', d.inventoryClosing,
        'مجمع الإهلاك أول المدة', d.accumulatedDepreciationOpening,
        'كهرباء وغاز ومياه', '11%', d.expenseAllocation.electricityWaterGas
      ]);

      // Row 5
      rows.push([
        '(يخصم): إهلاك الفترة', d.depreciationExpense,
        'إجمالي الأصول المتداولة', d.totalCurrentAssets,
        'إهلاك الفترة المحسوب', d.depreciationPeriod,
        'أدوات مكتبية ومطبوعات', '8%', d.expenseAllocation.stationeryAndPrinting
      ]);

      // Row 6
      rows.push([
        'إجمالي المصروفات', d.totalExpenses,
        'إجمالي الأصول', d.totalAssets,
        'مجمع الإهلاك آخر المدة', d.accumulatedDepreciationClosing,
        'بوفيه وضيافة ونظافة', '7%', d.expenseAllocation.hospitalityAndBuffet
      ]);

      // Row 7
      rows.push([
        'صافي الربح قبل الضريبة', d.netProfitBeforeTax,
        'رأس المال المدفوع', d.paidUpCapital,
        'صافي القيمة الدفترية للأصول', d.netFixedAssets,
        'مصاريف إعلانات وتسويق', '7%', d.expenseAllocation.advertising
      ]);

      // Row 8
      rows.push([
        'الضريبة (22.5%)', d.taxAmount,
        'جاري صاحب الشأن (الاتزان)', d.partnersCurrentAccount,
        '', '',
        'انتقالات ومواصلات وبدلات', '5%', d.expenseAllocation.transportation
      ]);

      // Row 9
      rows.push([
        'صافي أرباح العام بعد الضريبة', d.netProfitAfterTax,
        'أرباح العام المرحلة', d.currentYearProfit,
        '', '',
        'مصاريف دعاية وترويج', '5%', d.expenseAllocation.promotionAndPublicity
      ]);

      // Row 10
      rows.push([
        '', '',
        'إجمالي حقوق الملكية', d.totalEquity,
        '', '',
        'استشارات مهنية ومحاسبية', '4%', d.expenseAllocation.professionalConsultancy
      ]);

      // Row 11
      rows.push([
        '', '',
        'الالتزامات المتداولة (الموردين)', d.totalCurrentLiabilities,
        '', '',
        'إكراميات وتبرعات', '3%', d.expenseAllocation.donationsAndTips
      ]);

      // Row 12
      rows.push([
        '', '',
        'إجمالي الالتزامات وحقوق الملكية', d.totalLiabilitiesAndEquity,
        '', '',
        'مصاريف عمومية متنوعة', '3%', d.expenseAllocation.miscellaneous
      ]);

      // Row 13
      rows.push([
        '', '',
        'فارق التوازن المحاسبي', d.totalAssets - d.totalLiabilitiesAndEquity,
        '', '',
        'بريد وهاتف وإنترنت', '2%', d.expenseAllocation.telecomAndPostage
      ]);

      // Row 14
      rows.push([
        '', '',
        '', '',
        '', '',
        'رسوم ودمغات حكومية', '1%', d.expenseAllocation.stampsAndDuties
      ]);

      // Row 15
      rows.push([
        '', '',
        '', '',
        '', '',
        'إجمالي الإيضاح المتمم', '100%', d.expenseAllocation.total
      ]);

      rows.push([]);
      rows.push(['-----------------------------------------------------------------------------------------------------']);
      rows.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'القوائم المالية ونموذج CPA');
    XLSX.writeFile(wb, `CPA_Financial_Statements_Model_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /**
   * Back-solves required Sales and Expenses from a target Net Profit after tax.
   * Useful when an auditor or client has a target bank net profit or target tax figure.
   */
  public static backSolveTargetProfit(
    targetNetProfitAfterTax: number,
    targetGrossMarginPercent: number = 17.5,
    targetExpenseRatioPercent: number = 5.0,
    estimatedDepreciation: number = 40000
  ): {
    estimatedSales: number;
    estimatedExpenses: number;
    estimatedCostOfSales: number;
    estimatedGrossProfit: number;
    estimatedTax: number;
    estimatedNetProfitBeforeTax: number;
  } {
    const safeTarget = Math.max(1000, targetNetProfitAfterTax);
    const taxRate = 0.225;
    const estimatedNetProfitBeforeTax = Math.round(safeTarget / (1 - taxRate));
    const estimatedTax = Math.round(estimatedNetProfitBeforeTax * taxRate);

    const gmDecimal = Math.max(5, Math.min(50, targetGrossMarginPercent)) / 100;
    const expDecimal = Math.max(1, Math.min(30, targetExpenseRatioPercent)) / 100;

    const netOperatingMargin = gmDecimal - expDecimal;
    const effectiveMargin = netOperatingMargin > 0.01 ? netOperatingMargin : 0.10;

    // NPBT = Sales * effectiveMargin - depreciation
    // => Sales = (NPBT + depreciation) / effectiveMargin
    const estimatedSales = Math.round((estimatedNetProfitBeforeTax + estimatedDepreciation) / effectiveMargin);
    const estimatedCostOfSales = Math.round(estimatedSales * (1 - gmDecimal));
    const estimatedGrossProfit = estimatedSales - estimatedCostOfSales;
    const estimatedExpenses = Math.round(estimatedSales * expDecimal);

    return {
      estimatedSales,
      estimatedExpenses,
      estimatedCostOfSales,
      estimatedGrossProfit,
      estimatedTax,
      estimatedNetProfitBeforeTax,
    };
  }
}
