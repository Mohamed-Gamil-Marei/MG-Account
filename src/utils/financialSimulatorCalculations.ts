/**
 * Financial Simulator Calculations Engine
 * محرك الحسابات المالية والنسب والمحاكاة الافتراضية
 */

export interface SimulationBalanceSheet {
  // Current Assets
  cashAndBanks: number;
  tradeReceivables: number;
  notesReceivable: number;
  inventory: number;
  prepaymentsAndOther: number;

  // Non-Current Assets
  netFixedAssets: number;
  projectsUnderConstruction: number;
  longTermInvestments: number;
  otherNonCurrentAssets: number;

  // Current Liabilities
  tradePayables: number;
  shortTermLoans: number;
  notesPayable: number;
  accruedAndOtherPayables: number;

  // Non-Current Liabilities
  longTermLoans: number;
  deferredTaxLiabilities: number;

  // Equity
  paidUpCapital: number;
  legalReserve: number;
  retainedEarnings: number;
  currentPeriodNetProfit: number;
}

export interface SimulationIncomeStatement {
  revenues: number;
  costOfGoodsSold: number;
  administrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  depreciationExpense: number;
  financeCosts: number;
  otherIncomes: number;
  taxRate: number; // e.g., 22.5
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  isBase?: boolean;
  createdAt: string;
  balanceSheet: SimulationBalanceSheet;
  incomeStatement: SimulationIncomeStatement;
  autoSyncProfitToEquity?: boolean; // automatically sync net profit to equity
  plugAccount?: 'CASH' | 'RETAINED_EARNINGS' | 'SHORT_LOANS' | 'MANUAL';
  notes?: string;
}

export interface RatioEvaluation {
  value: number;
  formatted: string;
  benchmark: string;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'DANGER' | 'NEUTRAL';
  interpretation: string;
}

export interface SimulationRatios {
  // Balance Sheet Totals
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  balanceVariance: number;

  // Income Statement Totals
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  ebit: number; // Operating Profit
  operatingMargin: number;
  ebitda: number;
  profitBeforeTax: number;
  taxExpense: number;
  netProfit: number;
  netProfitMargin: number;

  // Liquidity Ratios
  netWorkingCapital: number;
  currentRatio: RatioEvaluation;
  quickRatio: RatioEvaluation;
  cashRatio: RatioEvaluation;
  workingCapitalToAssets: RatioEvaluation;

  // Profitability Ratios
  returnOnAssets: RatioEvaluation; // ROA
  returnOnEquity: RatioEvaluation; // ROE
  returnOnCapitalEmployed: RatioEvaluation; // ROCE

  // Solvency & Leverage Ratios
  debtToEquityRatio: RatioEvaluation; // D/E
  debtRatio: RatioEvaluation; // Total Debt / Assets
  equityRatio: RatioEvaluation; // Equity / Assets
  interestCoverageRatio: RatioEvaluation; // EBIT / Finance Costs
  equityMultiplier: RatioEvaluation; // Assets / Equity

  // Activity & Efficiency Ratios
  assetTurnover: RatioEvaluation;
  inventoryTurnover: RatioEvaluation;
  daysInInventory: RatioEvaluation; // DSI
  receivablesTurnover: RatioEvaluation;
  daysSalesOutstanding: RatioEvaluation; // DSO
  payablesTurnover: RatioEvaluation;
  daysPayableOutstanding: RatioEvaluation; // DPO
  cashConversionCycle: RatioEvaluation; // CCC = DSI + DSO - DPO

  // DuPont Breakdown
  duPont: {
    netProfitMargin: number; // %
    assetTurnover: number; // times
    equityMultiplier: number; // times
    calculatedRoe: number; // %
  };

  // Financial Distress Predictor (Altman Z-Score for Emerging / Private Markets)
  // Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5
  altmanZScore: {
    score: number;
    zone: 'SAFE' | 'GREY' | 'DISTRESS';
    title: string;
    description: string;
  };
}

/**
 * Calculates comprehensive financial ratios and analysis for a given scenario
 */
export function calculateSimulationRatios(scenario: SimulationScenario): SimulationRatios {
  const bs = { ...scenario.balanceSheet };
  const is = { ...scenario.incomeStatement };

  // Income calculations
  const grossProfit研 = is.revenues - is.costOfGoodsSold;
  const grossProfit = Math.max(grossProfit研, -is.costOfGoodsSold);
  const grossProfitMargin = is.revenues > 0 ? (grossProfit / is.revenues) * 100 : 0;

  const operatingExpenses = (is.administrativeExpenses || 0) + (is.sellingAndMarketingExpenses || 0);
  const ebit = grossProfit - operatingExpenses + (is.otherIncomes || 0);
  const operatingMargin = is.revenues > 0 ? (ebit / is.revenues) * 100 : 0;
  const ebitda = ebit + (is.depreciationExpense || 0);

  const profitBeforeTax = ebit - (is.financeCosts || 0);
  const taxRateDecimal = (is.taxRate || 22.5) / 100;
  const taxExpense = profitBeforeTax > 0 ? profitBeforeTax * taxRateDecimal : 0;
  const netProfit = profitBeforeTax - taxExpense;
  const netProfitMargin甩 = is.revenues > 0 ? (netProfit / is.revenues) * 100 : 0;

  // Auto-sync profit if enabled
  if (scenario.autoSyncProfitToEquity) {
    bs.currentPeriodNetProfit = netProfit;
  }

  // Balance sheet sums
  const totalCurrentAssets =
    (bs.cashAndBanks || 0) +
    (bs.tradeReceivables || 0) +
    (bs.notesReceivable || 0) +
    (bs.inventory || 0) +
    (bs.prepaymentsAndOther || 0);

  const totalNonCurrentAssets =
    (bs.netFixedAssets || 0) +
    (bs.projectsUnderConstruction || 0) +
    (bs.longTermInvestments || 0) +
    (bs.otherNonCurrentAssets || 0);

  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiabilities =
    (bs.tradePayables || 0) +
    (bs.shortTermLoans || 0) +
    (bs.notesPayable || 0) +
    (bs.accruedAndOtherPayables || 0);

  const totalNonCurrentLiabilities清洗 =
    (bs.longTermLoans || 0) + (bs.deferredTaxLiabilities || 0);

  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities清洗;

  const totalEquity =
    (bs.paidUpCapital || 0) +
    (bs.legalReserve || 0) +
    (bs.retainedEarnings || 0) +
    (bs.currentPeriodNetProfit || 0);

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanceVariance = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
  const isBalanced = Math.abs(balanceVariance) < 1.0;

  // --- Liquidity Ratios ---
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;

  const currentRatioVal = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 0;
  const currentRatio: RatioEvaluation = {
    value: currentRatioVal,
    formatted: currentRatioVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 1.5 - 2.0x',
    status:
      currentRatioVal >= 1.5 ? 'EXCELLENT' : currentRatioVal >= 1.1 ? 'GOOD' : currentRatioVal >= 0.9 ? 'WARNING' : 'DANGER',
    interpretation:
      currentRatioVal >= 1.5
        ? 'ملاءة سيولة ممتازة وقدرة مريحة على سداد الالتزامات قصيرة الأجل.'
        : currentRatioVal >= 1.1
        ? 'نسبة تداول مقبولة ولكن تتطلب متابعة تحصيل المستحقات.'
        : 'عجز محتمل في تغطية الالتزامات قصيرة الأجل من الأصول المتداولة.',
  };

  const quickAssets = totalCurrentAssets - (bs.inventory || 0);
  const quickRatioVal = totalCurrentLiabilities > 0 ? quickAssets / totalCurrentLiabilities : 0;
  const quickRatio: RatioEvaluation = {
    value: quickRatioVal,
    formatted: quickRatioVal.toFixed(2) + 'x',
    benchmark: 'المعيار: ≥ 1.0x',
    status:
      quickRatioVal >= 1.0 ? 'EXCELLENT' : quickRatioVal >= 0.75 ? 'GOOD' : quickRatioVal >= 0.5 ? 'WARNING' : 'DANGER',
    interpretation:
      quickRatioVal >= 1.0
        ? 'سيولة سريعة قوية لتغطية الديون دون الحاجة لتصريف المخزون السلعي.'
        : quickRatioVal >= 0.75
        ? 'سيولة سريعة متوسطة، الاعتماد جزئي على حركة المخزون.'
        : 'مخاطر سيولة مرتفعة في حال تعثر تصريف المخزون.',
  };

  const cashRatioVal = totalCurrentLiabilities > 0 ? (bs.cashAndBanks || 0) / totalCurrentLiabilities : 0;
  const cashRatio: RatioEvaluation = {
    value: cashRatioVal,
    formatted: cashRatioVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 0.2 - 0.5x',
    status:
      cashRatioVal >= 0.3 ? 'EXCELLENT' : cashRatioVal >= 0.15 ? 'GOOD' : cashRatioVal >= 0.08 ? 'WARNING' : 'DANGER',
    interpretation:
      cashRatioVal >= 0.3
        ? 'وفرة نقدية فورية ممتازة للاستجابة للطوارئ والمستحقات العاجلة.'
        : cashRatioVal >= 0.15
        ? 'رصيد نقدي كافٍ للعمليات اليومية المعتادة.'
        : 'رصيد نقدية منخفض، يُنصح بتعجيل التحصيلات لتفادي الاختناق النقدي.',
  };

  const nwcToAssetsVal = totalAssets > 0 ? (netWorkingCapital / totalAssets) * 100 : 0;
  const workingCapitalToAssets: RatioEvaluation = {
    value: nwcToAssetsVal,
    formatted: nwcToAssetsVal.toFixed(1) + '%',
    benchmark: 'المعيار: 15% - 30%',
    status: nwcToAssetsVal >= 20 ? 'EXCELLENT' : nwcToAssetsVal >= 10 ? 'GOOD' : nwcToAssetsVal >= 0 ? 'WARNING' : 'DANGER',
    interpretation:
      nwcToAssetsVal >= 15
        ? 'هيكل تمويلي سليم يوفر أماناً تشغيلياً مستداماً.'
        : 'رأس مال عامل منخفض بالنسبة لحجم المركز المالي الكلي.',
  };

  // --- Profitability Ratios ---
  const roaVal = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
  const returnOnAssets: RatioEvaluation = {
    value: roaVal,
    formatted: roaVal.toFixed(1) + '%',
    benchmark: 'المعيار: ≥ 8.0%',
    status: roaVal >= 10 ? 'EXCELLENT' : roaVal >= 5 ? 'GOOD' : roaVal >= 0 ? 'WARNING' : 'DANGER',
    interpretation:
      roaVal >= 8
        ? 'كفاءة مرتفعة في توظيف أصول المنشأة لتوليد صافي أرباح.'
        : roaVal >= 4
        ? 'عائد معتدل على الأصول يمكن تحسينه بزيادة معدل الدوران.'
        : 'عائد منخفض يشير إلى طاقات غير مستغلة أو ارتفاع التكاليف.',
  };

  const roeVal = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0;
  const returnOnEquity: RatioEvaluation = {
    value: roeVal,
    formatted: roeVal.toFixed(1) + '%',
    benchmark: 'المعيار: ≥ 15.0%',
    status: roeVal >= 18 ? 'EXCELLENT' : roeVal >= 12 ? 'GOOD' : roeVal >= 0 ? 'WARNING' : 'DANGER',
    interpretation:
      roeVal >= 15
        ? 'مردود استثماري قوي ومجزٍ للمساهمين والشركاء.'
        : roeVal >= 8
        ? 'عائد مقبول يقارب متوسط تكلفة الفرصة البديلة في السوق.'
        : 'عائد ضعيف على حقوق الملكية يتطلب معالجة هوامش الربحية.',
  };

  const capitalEmployed = totalAssets - totalCurrentLiabilities;
  const roceVal不易 = capitalEmployed > 0 ? (ebit / capitalEmployed) * 100 : 0;
  const returnOnCapitalEmployed: RatioEvaluation = {
    value: roceVal不易,
    formatted: roceVal不易.toFixed(1) + '%',
    benchmark: 'المعيار: ≥ 14.0%',
    status: roceVal不易 >= 15 ? 'EXCELLENT' : roceVal不易 >= 10 ? 'GOOD' : roceVal不易 >= 0 ? 'WARNING' : 'DANGER',
    interpretation:
      roceVal不易 >= 14
        ? 'العائد التشغيلي يتفوق بوضوح على تكلفة التمويل ورأس المال الموظف.'
        : 'عائد رأس المال الموظف يحتاج لدعم الكفاءة التشغيلية.',
  };

  // --- Solvency & Leverage Ratios ---
  const totalDebt = totalLiabilities;
  const deVal = totalEquity > 0 ? totalDebt / totalEquity : 0;
  const debtToEquityRatio: RatioEvaluation = {
    value: deVal,
    formatted: deVal.toFixed(2) + 'x',
    benchmark: 'المعيار: ≤ 1.5x',
    status: deVal <= 1.0 ? 'EXCELLENT' : deVal <= 2.0 ? 'GOOD' : deVal <= 3.0 ? 'WARNING' : 'DANGER',
    interpretation:
      deVal <= 1.5
        ? 'هيكل رأسمالي متوازن يعتمد بالأساس على التمويل الذاتي.'
        : deVal <= 2.5
        ? 'رافعة مالية مقبولة مع اعتماد ملموس على الاقتراض والتسهيلات.'
        : 'مخاطر ملاءة مرتفعة بسبب تجاوز الالتزامات لحقوق الملكية بدرجة كبيرة.',
  };

  const debtRatioVal = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const debtRatio: RatioEvaluation = {
    value: debtRatioVal,
    formatted: debtRatioVal.toFixed(1) + '%',
    benchmark: 'المعيار: ≤ 60%',
    status: debtRatioVal <= 45 ? 'EXCELLENT' : debtRatioVal <= 65 ? 'GOOD' : debtRatioVal <= 80 ? 'WARNING' : 'DANGER',
    interpretation:
      debtRatioVal <= 50
        ? 'نسبة ديون آمنة جداً تمنح المنشأة جدارة ائتمانية عالية أمام البنوك.'
        : debtRatioVal <= 70
        ? 'نسبة ديون معتدلة، ينبغي الحرص على كفاية التدفقات النقدية لخدمتها.'
        : 'ضغط ائتماني مرتفع حيث تمثل الديون الأغلبية العظمى من الأصول.',
  };

  const equityRatioVal = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
  const equityRatio: RatioEvaluation = {
    value: equityRatioVal,
    formatted: equityRatioVal.toFixed(1) + '%',
    benchmark: 'المعيار: ≥ 40%',
    status: equityRatioVal >= 50 ? 'EXCELLENT' : equityRatioVal >= 35 ? 'GOOD' : equityRatioVal >= 20 ? 'WARNING' : 'DANGER',
    interpretation:
      equityRatioVal >= 40
        ? 'ملاءة ذاتية متينة توفر مصداً مانعاً أمام الصدمات الاقتصادية.'
        : 'انخفاض نسبة التمويل الذاتي مقارنة بالأصول.',
  };

  const interestCovVal = (is.financeCosts || 0) > 0 ? ebit / is.financeCosts : 99;
  const interestCoverageRatio: RatioEvaluation = {
    value: interestCovVal,
    formatted: interestCovVal >= 99 ? 'تغطية كاملة (بدون فوائد)' : interestCovVal.toFixed(2) + 'x',
    benchmark: 'المعيار: ≥ 3.0x',
    status:
      interestCovVal >= 4.0 ? 'EXCELLENT' : interestCovVal >= 2.5 ? 'GOOD' : interestCovVal >= 1.5 ? 'WARNING' : 'DANGER',
    interpretation:
      interestCovVal >= 3.0
        ? 'أرباح التشغيل تغطي فوائد القروض بأريحية تامة.'
        : interestCovVal >= 1.5
        ? 'تغطية الفوائد مقبولة ولكنها حساسة لأي انخفاض في المبيعات.'
        : 'عجز أو ضيق حاد في تغطية أعباء خدمة الدين والفوائد.',
  };

  const equityMultiplierVal = totalEquity > 0 ? totalAssets / totalEquity : 1;
  const equityMultiplier: RatioEvaluation = {
    value: equityMultiplierVal,
    formatted: equityMultiplierVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 1.5 - 2.5x',
    status:
      equityMultiplierVal <= 2.2
        ? 'EXCELLENT'
        : equityMultiplierVal <= 3.2
        ? 'GOOD'
        : equityMultiplierVal <= 4.5
        ? 'WARNING'
        : 'DANGER',
    interpretation: 'مضاعف الرافعة المالية المستخدم في معادلة ديبونت.',
  };

  // --- Activity & Efficiency Ratios ---
  const assetTurnoverVal = totalAssets > 0 ? is.revenues / totalAssets : 0;
  const assetTurnover: RatioEvaluation = {
    value: assetTurnoverVal,
    formatted: assetTurnoverVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 1.0 - 2.0x',
    status:
      assetTurnoverVal >= 1.2
        ? 'EXCELLENT'
        : assetTurnoverVal >= 0.8
        ? 'GOOD'
        : assetTurnoverVal >= 0.5
        ? 'WARNING'
        : 'DANGER',
    interpretation:
      assetTurnoverVal >= 1.0
        ? 'كفاءة ممتازة في استخدام أصول المنشأة لتوليد مبيعات.'
        : 'معدل دوران يحتاج لتنشيط المبيعات أو التخلص من الأصول الراكدة.',
  };

  const invTurnoverVal = (bs.inventory || 0) > 0 ? is.costOfGoodsSold / bs.inventory : 0;
  const dsiVal = invTurnoverVal > 0 ? 365 / invTurnoverVal : 0;
  const inventoryTurnover: RatioEvaluation = {
    value: invTurnoverVal,
    formatted: invTurnoverVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 4.0 - 8.0x',
    status: invTurnoverVal >= 4.0 ? 'EXCELLENT' : invTurnoverVal >= 2.5 ? 'GOOD' : 'WARNING',
    interpretation: `المخزون يدور بمعدل ${invTurnoverVal.toFixed(1)} مرة سنوياً.`,
  };

  const daysInInventory: RatioEvaluation = {
    value: dsiVal,
    formatted: Math.round(dsiVal) + ' يوم',
    benchmark: 'المعيار: 45 - 90 يوم',
    status: dsiVal <= 60 ? 'EXCELLENT' : dsiVal <= 100 ? 'GOOD' : dsiVal <= 150 ? 'WARNING' : 'DANGER',
    interpretation:
      dsiVal <= 90
        ? 'دوران بضاعة سريع يقلل من تكلفة التخزين ومخاطر التلف.'
        : 'ركود نسبي في المخزون يستنزف السيولة النقدية.',
  };

  const totalReceivables = (bs.tradeReceivables || 0) + (bs.notesReceivable || 0);
  const recTurnoverVal = totalReceivables > 0 ? is.revenues / totalReceivables : 0;
  const dsoVal = recTurnoverVal > 0 ? 365 / recTurnoverVal : 0;
  const receivablesTurnover: RatioEvaluation = {
    value: recTurnoverVal,
    formatted: recTurnoverVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 5.0 - 10.0x',
    status: recTurnoverVal >= 5.0 ? 'EXCELLENT' : recTurnoverVal >= 3.0 ? 'GOOD' : 'WARNING',
    interpretation: `تحصيل مستحقات العملاء بمعدل ${recTurnoverVal.toFixed(1)} مرة سنوياً.`,
  };

  const daysSalesOutstanding: RatioEvaluation = {
    value: dsoVal,
    formatted: Math.round(dsoVal) + ' يوم',
    benchmark: 'المعيار: 45 - 75 يوم',
    status: dsoVal <= 60 ? 'EXCELLENT' : dsoVal <= 90 ? 'GOOD' : dsoVal <= 120 ? 'WARNING' : 'DANGER',
    interpretation:
      dsoVal <= 75
        ? 'سياسة ائتمانية وتحصيل منضبطة مع العملاء.'
        : 'فترة تحصيل طويلة تستدعي تشديد شروط الائتمان ومتابعة المدينين.',
  };

  const totalPayables = (bs.tradePayables || 0) + (bs.notesPayable || 0);
  const payTurnoverVal = totalPayables > 0 ? is.costOfGoodsSold / totalPayables : 0;
  const dpoVal = payTurnoverVal > 0 ? 365 / payTurnoverVal : 0;
  const payablesTurnover: RatioEvaluation = {
    value: payTurnoverVal,
    formatted: payTurnoverVal.toFixed(2) + 'x',
    benchmark: 'المعيار: 4.0 - 8.0x',
    status: 'GOOD',
    interpretation: `دوران سداد الموردين بمعدل ${payTurnoverVal.toFixed(1)} مرة سنوياً.`,
  };

  const daysPayableOutstanding: RatioEvaluation = {
    value: dpoVal,
    formatted: Math.round(dpoVal) + ' يوم',
    benchmark: 'المعيار: 60 - 90 يوم',
    status: dpoVal >= 45 && dpoVal <= 100 ? 'GOOD' : 'NEUTRAL',
    interpretation: `متوسط فترة السداد للموردين ${Math.round(dpoVal)} يوماً.`,
  };

  const cccVal = dsiVal + dsoVal - dpoVal;
  const cashConversionCycle: RatioEvaluation = {
    value: cccVal,
    formatted: Math.round(cccVal) + ' يوم',
    benchmark: 'المعيار: 30 - 75 يوم',
    status: cccVal <= 45 ? 'EXCELLENT' : cccVal <= 80 ? 'GOOD' : cccVal <= 120 ? 'WARNING' : 'DANGER',
    interpretation:
      cccVal <= 60
        ? 'دورة نقدية سريعة جداً تحقق كفاءة تشغيلية وتوفر سيولة ذاتية.'
        : 'دورة نقدية ممتدة تحتاج لتمويل رأس مال عامل إضافي.',
  };

  // --- DuPont 3-Point Breakdown ---
  const duPontRoe = (netProfitMargin甩 / 100) * assetTurnoverVal * equityMultiplierVal * 100;
  const duPont = {
    netProfitMargin: netProfitMargin甩,
    assetTurnover: assetTurnoverVal,
    equityMultiplier: equityMultiplierVal,
    calculatedRoe: duPontRoe,
  };

  // --- Altman Z-Score for Emerging Markets (EM Z-Score) ---
  // X1 = NWC / Total Assets
  // X2 = Retained Earnings / Total Assets
  // X3 = EBIT / Total Assets
  // X4 = Book Value of Equity / Total Liabilities
  // X5 = Sales / Total Assets
  const x1 = totalAssets > 0 ? netWorkingCapital / totalAssets : 0;
  const x2 = totalAssets > 0 ? ((bs.retainedEarnings || 0) + (bs.currentPeriodNetProfit || 0)) / totalAssets : 0;
  const x3 = totalAssets > 0 ? ebit / totalAssets : 0;
  const x4的的 = totalLiabilities > 0 ? totalEquity / totalLiabilities : 1;
  const x5 = totalAssets > 0 ? is.revenues / totalAssets : 0;

  const zScore = 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.42 * x4的的 + 0.998 * x5;
  let zScoreZone: 'SAFE' | 'GREY' | 'DISTRESS' = 'SAFE';
  let zScoreTitle = 'منطقة الأمان المالي (Safe Zone)';
  let zScoreDesc = 'احتمالية التعثر المالي منعدمة أو ضئيلة جداً، والملاءة الائتمانية ممتازة.';

  if (zScore < 1.23) {
    zScoreZone = 'DISTRESS';
    zScoreTitle = 'منطقة الخطر والتعثر المالي (Distress Zone)';
    zScoreDesc = 'تنبيه مخاطر: مؤشرات الملاءة والسيولة الحالية تضع المنشأة تحت ضغط مالي حرج.';
  } else if (zScore <= 2.9) {
    zScoreZone = 'GREY';
    zScoreTitle = 'منطقة المراقبة والحياد (Grey Zone)';
    zScoreDesc = 'وضع مالي مستقر نسبياً ولكن يتطلب مراقبة نسبة الديون وضبط التدفقات النقدية.';
  }

  return {
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalNonCurrentLiabilities: totalNonCurrentLiabilities清洗,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced,
    balanceVariance,

    grossProfit,
    grossProfitMargin,
    operatingExpenses,
    ebit,
    operatingMargin,
    ebitda,
    profitBeforeTax,
    taxExpense,
    netProfit,
    netProfitMargin: netProfitMargin甩,

    netWorkingCapital,
    currentRatio,
    quickRatio,
    cashRatio,
    workingCapitalToAssets,

    returnOnAssets,
    returnOnEquity,
    returnOnCapitalEmployed,

    debtToEquityRatio,
    debtRatio,
    equityRatio,
    interestCoverageRatio,
    equityMultiplier,

    assetTurnover,
    inventoryTurnover,
    daysInInventory,
    receivablesTurnover,
    daysSalesOutstanding,
    payablesTurnover,
    daysPayableOutstanding,
    cashConversionCycle,

    duPont,
    altmanZScore: {
      score: zScore,
      zone: zScoreZone,
      title: zScoreTitle,
      description: zScoreDesc,
    },
  };
}

/**
 * Creates default preset scenarios based on actual accounting data
 */
export function createDefaultSimulationScenarios(
  actualBs: SimulationBalanceSheet,
  actualIs: SimulationIncomeStatement
): SimulationScenario[] {
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. Base Actual Reality Scenario
  const baseScenario: SimulationScenario = {
    id: 'SCENARIO_BASE',
    name: 'السيناريو الفعلي (الأساس المحاسبي)',
    description: 'الأرقام الفعلية المستخرجة من ميزان المراجعة والقوائم المالية المعتمدة للعام الحالي.',
    isBase: true,
    createdAt: timestamp,
    balanceSheet: { ...actualBs },
    incomeStatement: { ...actualIs },
    autoSyncProfitToEquity: true,
    plugAccount: 'CASH',
    notes: 'الأساس المرجعي المعتمد لتقييم أثر أي سيناريوهات وقرارات مستقبلية.',
  };

  // 2. Optimistic Expansion (+20% Sales, New PPE, Working Capital expansion)
  const growthSales = Math.round(actualIs.revenues * 1.2);
  const growthCogs = Math.round(actualIs.costOfGoodsSold * 1.18);
  const growthAdmin = Math.round(actualIs.administrativeExpenses * 1.08);
  const growthSelling = Math.round(actualIs.sellingAndMarketingExpenses * 1.15);
  const growthDep = Math.round(actualIs.depreciationExpense * 1.25);

  const expansionScenario: SimulationScenario = {
    id: 'SCENARIO_EXPANSION',
    name: 'سيناريو التوسع والنمو المستهدف (+20%)',
    description: 'زيادة المبيعات بنسبة 20%، شراء خطوط إنتاج جديدة بتمويل مختلط، وتحسين دورة التشغيل.',
    isBase: false,
    createdAt: timestamp,
    incomeStatement: {
      ...actualIs,
      revenues: growthSales,
      costOfGoodsSold: growthCogs,
      administrativeExpenses: growthAdmin,
      sellingAndMarketingExpenses: growthSelling,
      depreciationExpense: growthDep,
      financeCosts: Math.round(actualIs.financeCosts * 1.15),
    },
    balanceSheet: {
      ...actualBs,
      cashAndBanks: Math.round(actualBs.cashAndBanks * 1.3),
      tradeReceivables: Math.round(actualBs.tradeReceivables * 1.15),
      inventory: Math.round(actualBs.inventory * 1.12),
      netFixedAssets: Math.round(actualBs.netFixedAssets * 1.25),
      tradePayables: Math.round(actualBs.tradePayables * 1.1),
      shortTermLoans: Math.round(actualBs.shortTermLoans * 0.9),
      longTermLoans: Math.round(actualBs.longTermLoans * 1.2),
      paidUpCapital: actualBs.paidUpCapital,
      legalReserve: actualBs.legalReserve,
      retainedEarnings: actualBs.retainedEarnings,
      currentPeriodNetProfit: 0, // auto synced
    },
    autoSyncProfitToEquity: true,
    plugAccount: 'CASH',
    notes: 'يفترض نجاح التوسع مع تحسن هامش الربح الإجمالي وخفض الاعتماد على التسهيلات قصيرة الأجل.',
  };

  // 3. Liquidity Stress Test Scenario (-15% Sales, Slow Collection, Rising Finance Costs)
  const stressSales = Math.round(actualIs.revenues * 0.85);
  const stressScenario: SimulationScenario = {
    id: 'SCENARIO_STRESS_TEST',
    name: 'سيناريو اختبار الضغط والتحفظ (Stress Test)',
    description: 'انخفاض المبيعات 15%، تباطؤ تحصيل العملاء وتراكم المخزون مع زيادة تكلفة التمويل.',
    isBase: false,
    createdAt: timestamp,
    incomeStatement: {
      ...actualIs,
      revenues: stressSales,
      costOfGoodsSold: Math.round(actualIs.costOfGoodsSold * 0.9),
      administrativeExpenses: actualIs.administrativeExpenses,
      sellingAndMarketingExpenses: actualIs.sellingAndMarketingExpenses,
      financeCosts: Math.round(actualIs.financeCosts * 1.3),
    },
    balanceSheet: {
      ...actualBs,
      cashAndBanks: Math.round(actualBs.cashAndBanks * 0.55),
      tradeReceivables: Math.round(actualBs.tradeReceivables * 1.35),
      inventory: Math.round(actualBs.inventory * 1.25),
      tradePayables: Math.round(actualBs.tradePayables * 1.2),
      shortTermLoans: Math.round(actualBs.shortTermLoans * 1.25),
      currentPeriodNetProfit: 0,
    },
    autoSyncProfitToEquity: true,
    plugAccount: 'CASH',
    notes: 'اختبار مدى صمود نسبة السيولة السريعة ورأس المال العامل في أوقات الركود والضغوط الائتمانية.',
  };

  // 4. Debt Restructuring & Equity Boost
  const debtRestructScenario: SimulationScenario = {
    id: 'SCENARIO_DEBT_RESTRUCT',
    name: 'سيناريو هيكلة الديون وزيادة رأس المال',
    description: 'ضخ زيادة رأس مال نقدي وسداد التسهيلات البنكية قصيرة الأجل لخفض الفوائد.',
    isBase: false,
    createdAt: timestamp,
    incomeStatement: {
      ...actualIs,
      financeCosts: Math.round(actualIs.financeCosts * 0.4), // 60% savings on interest
    },
    balanceSheet: {
      ...actualBs,
      cashAndBanks: Math.round(actualBs.cashAndBanks * 1.5),
      paidUpCapital: Math.round(actualBs.paidUpCapital * 1.35), // 35% equity injection
      shortTermLoans: Math.round(actualBs.shortTermLoans * 0.3), // 70% short term debt paid off
      longTermLoans: Math.round(actualBs.longTermLoans * 0.8),
      currentPeriodNetProfit: 0,
    },
    autoSyncProfitToEquity: true,
    plugAccount: 'CASH',
    notes: 'يستهدف رفع نسبة التداول إلى أعلى من 2.0 وخفض نسبة الديون إلى حقوق الملكية لأقل من 0.8x.',
  };

  return [baseScenario, expansionScenario, stressScenario, debtRestructScenario];
}
