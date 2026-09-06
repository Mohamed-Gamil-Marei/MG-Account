// Egyptian Tax Late Payment Penalties and Interest Calculator Engine
// Compliant with Law 206/2020, Law 91/2005 (Art. 110), and Law 67/2016 (VAT)

export type TaxObligationType =
  | 'VAT'
  | 'CORPORATE_INCOME_TAX'
  | 'WITHHOLDING_TAX'
  | 'PAYROLL_TAX'
  | 'STAMP_DUTY'
  | 'ETA_E_INVOICE'
  | 'TAX_AUDIT_EXPOSURE'
  | 'CUSTOMS_DUTY'
  | 'OTHER';

export type CalculationMethod =
  | 'LAW_206_DAILY' // سعر الائتمان والخصم للبنك المركزي + 2% سنوياً (حساب يومي)
  | 'VAT_MONTHLY_1_5' // 1.5% شهرياً عن كل شهر أو جزء منه (قانون 67/2016)
  | 'CUSTOM_ANNUAL_RATE'; // معدل سنوي مخصص

export interface TaxPenaltyInput {
  id?: string;
  invoiceOrDeclarationNumber: string;
  obligationType: TaxObligationType;
  clientName?: string;
  clientId?: string;
  principalAmount: number; // أصل مبلغ الضريبة
  issueDate?: string;
  dueDate: string; // تاريخ الاستحقاق القانوني
  paymentDate: string; // تاريخ السداد الفعلي أو المستهدف
  calculationMethod: CalculationMethod;
  cbeDiscountRate: number; // سعر الائتمان والخصم للبنك المركزي (مثلاً 27.75%)
  cbeLegalMargin: number; // الهامش القانوني الإضافي (افتراضياً 2%)
  customAnnualRate?: number; // في حالة الطريقة المخصصة
  waiverPercentage: number; // نسبة التجاوز / الإعفاء الحكومي إن وجدت (0% إلى 100%)
  notes?: string;
}

export interface MonthlyBreakdownPeriod {
  periodIndex: number;
  periodLabel: string;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  periodInterestRate: number;
  periodInterestAmount: number;
  cumulativeInterest: number;
}

export interface TaxPenaltyResult {
  id: string;
  invoiceOrDeclarationNumber: string;
  obligationType: TaxObligationType;
  obligationLabel: string;
  principalAmount: number;
  dueDate: string;
  paymentDate: string;
  calculationMethod: CalculationMethod;
  calculationMethodLabel: string;
  isDelayed: boolean;
  daysOverdue: number;
  monthsCount: number; // عدد الشهور وأجزاء الشهور
  effectiveAnnualRate: number; // النسبة السنوية الفعالة المطبقة %
  effectiveMonthlyRate: number; // النسبة الشهرية المطبقة %
  dailyRate: number; // النسبة اليومية %
  grossPenaltyAmount: number; // إجمالي مقابل التأخير قبل التجاوز
  waiverPercentage: number;
  waiverDiscountAmount: number; // قيمة التجاوز / الإعفاء الموفرة
  netPenaltyPayable: number; // صافي الغرامة واجبة السداد
  totalSettlementAmount: number; // إجمالي المبلغ الكلي (أصل + غرامة)
  penaltyToPrincipalRatio: number; // نسبة الغرامة لأصل الدين %
  monthlyBreakdown: MonthlyBreakdownPeriod[];
  suggestedJournalEntry: {
    debitAccount: string;
    debitAmount: number;
    creditAccount: string;
    creditAmount: number;
    description: string;
    isTaxDeductible: boolean;
    legalReference: string;
  };
}

export const OBLIGATION_TYPE_LABELS: Record<TaxObligationType, { label: string; defaultMethod: CalculationMethod; standardDueDateNote: string }> = {
  VAT: {
    label: 'ضريبة القيمة المضافة (VAT - نموذج 10)',
    defaultMethod: 'VAT_MONTHLY_1_5',
    standardDueDateNote: 'نهاية الشهر التالي للشهر الضريبي',
  },
  CORPORATE_INCOME_TAX: {
    label: 'ضريبة الدخل السنوية (أرباح أشخاص اعتبارية/طبيعية)',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: '30 أبريل للشركات أو خلال 4 أشهر من نهاية السنة المالية',
  },
  WITHHOLDING_TAX: {
    label: 'ضريبة الخصم والتحصيل تحت حساب الضريبة (نموذج 41)',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'نهاية الشهر التالي لانتهاء كل ربع سنة تقويمي',
  },
  PAYROLL_TAX: {
    label: 'ضريبة المرتبات والأجور (كسب العمل والتأمينات)',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'خلال الـ 15 يوماً التالية للشهر أو نهاية الشهر التالي للربع سنة',
  },
  STAMP_DUTY: {
    label: 'ضريبة الدمغة النسبية والنوعية ورسم التنمية',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'خلال المواعيد المحددة بالقانون لكل واقعة منشئة',
  },
  ETA_E_INVOICE: {
    label: 'فاتورة مبيعات/مشتريات إلكترونية مستحقة الضريبة',
    defaultMethod: 'VAT_MONTHLY_1_5',
    standardDueDateNote: 'تاريخ استحقاق الفاتورة أو نهاية الفترة الضريبية',
  },
  TAX_AUDIT_EXPOSURE: {
    label: 'فروق الفحص والربط الضريبي واللجان الداخلية (نموذج 19/15)',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'تاريخ الإخطار بالربط أو انقضاء مهلة الطعن القانونية',
  },
  CUSTOMS_DUTY: {
    label: 'الضرائب الجمركية وضريبة الجدول الواردة',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'تاريخ الإفراج الجمركي أو المهلة القانونية للسداد',
  },
  OTHER: {
    label: 'التزامات ومستحقات ضريبية أخرى',
    defaultMethod: 'LAW_206_DAILY',
    standardDueDateNote: 'وفقاً للإشعار أو التاريخ التعاقدي',
  },
};

/**
 * Calculates the exact day difference between two date strings (YYYY-MM-DD)
 */
export function calculateDaysDifference(dueDateStr: string, paymentDateStr: string): number {
  if (!dueDateStr || !paymentDateStr) return 0;
  const due = new Date(dueDateStr);
  const payment = new Date(paymentDateStr);
  
  // Set times to midnight to avoid DST discrepancies
  due.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);

  const diffTime = payment.getTime() - due.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculates the count of months (or partial months) delayed
 * Under Egyptian VAT Law 67/2016, any fraction of a month counts as a full month (1.5% for each month or part thereof).
 */
export function calculateMonthsCount(dueDateStr: string, paymentDateStr: string): number {
  if (!dueDateStr || !paymentDateStr) return 0;
  const due = new Date(dueDateStr);
  const payment = new Date(paymentDateStr);

  if (payment <= due) return 0;

  let months = (payment.getFullYear() - due.getFullYear()) * 12 + (payment.getMonth() - due.getMonth());
  if (payment.getDate() > due.getDate()) {
    months += 1;
  }
  
  // If payment is after due date in the same month or next days, at least 1 month
  return Math.max(1, months);
}

/**
 * Core Tax Penalty Calculation Engine
 */
export function calculateTaxPenalty(input: TaxPenaltyInput): TaxPenaltyResult {
  const principal = Math.max(0, input.principalAmount || 0);
  const daysOverdue = calculateDaysDifference(input.dueDate, input.paymentDate);
  const monthsCount = calculateMonthsCount(input.dueDate, input.paymentDate);
  const isDelayed = daysOverdue > 0;

  let grossPenalty = 0;
  let effectiveAnnualRate = 0;
  let effectiveMonthlyRate = 0;
  let dailyRate = 0;
  let methodLabel = '';

  const cbeTotalRate = (input.cbeDiscountRate || 0) + (input.cbeLegalMargin || 0);

  if (!isDelayed || principal === 0) {
    grossPenalty = 0;
  } else {
    switch (input.calculationMethod) {
      case 'VAT_MONTHLY_1_5': {
        methodLabel = 'قانون القيمة المضافة 67/2016 (1.5% شهرياً عن كل شهر أو جزء منه)';
        effectiveMonthlyRate = 1.5;
        effectiveAnnualRate = 18.0;
        dailyRate = (18.0 / 365);
        grossPenalty = principal * (effectiveMonthlyRate / 100) * monthsCount;
        break;
      }
      case 'CUSTOM_ANNUAL_RATE': {
        const rate = input.customAnnualRate || 20;
        methodLabel = `معدل سنوي مخصص (${rate}% سنوياً)`;
        effectiveAnnualRate = rate;
        effectiveMonthlyRate = rate / 12;
        dailyRate = rate / 365;
        grossPenalty = principal * (dailyRate / 100) * daysOverdue;
        break;
      }
      case 'LAW_206_DAILY':
      default: {
        methodLabel = `قانون الإجراءات الموحد 206/2020 (سعر البنك المركزي ${input.cbeDiscountRate}% + ${input.cbeLegalMargin}% = ${cbeTotalRate}% سنوياً)`;
        effectiveAnnualRate = cbeTotalRate;
        effectiveMonthlyRate = cbeTotalRate / 12;
        dailyRate = cbeTotalRate / 365;
        grossPenalty = principal * (dailyRate / 100) * daysOverdue;
        break;
      }
    }
  }

  // Calculate Waiver Discount if amnesty is applied
  const waiverPct = Math.min(100, Math.max(0, input.waiverPercentage || 0));
  const waiverDiscountAmount = (grossPenalty * waiverPct) / 100;
  const netPenaltyPayable = Math.max(0, grossPenalty - waiverDiscountAmount);
  const totalSettlementAmount = principal + netPenaltyPayable;
  const penaltyToPrincipalRatio = principal > 0 ? (netPenaltyPayable / principal) * 100 : 0;

  // Generate Monthly Breakdown Periods
  const monthlyBreakdown: MonthlyBreakdownPeriod[] = [];
  if (isDelayed && daysOverdue > 0 && principal > 0) {
    const dueDateObj = new Date(input.dueDate);
    let currentStartDate = new Date(dueDateObj);
    let accumInterest = 0;

    const totalSteps = input.calculationMethod === 'VAT_MONTHLY_1_5' ? monthsCount : Math.min(12, Math.ceil(daysOverdue / 30));
    const daysPerStep = Math.max(1, Math.floor(daysOverdue / totalSteps));

    for (let i = 1; i <= totalSteps; i++) {
      const isLast = i === totalSteps;
      const stepDays = isLast ? Math.max(1, daysOverdue - (i - 1) * daysPerStep) : daysPerStep;
      
      let stepInterest = 0;
      let stepRate = 0;

      if (input.calculationMethod === 'VAT_MONTHLY_1_5') {
        stepRate = 1.5;
        stepInterest = principal * 0.015;
      } else {
        stepRate = (effectiveAnnualRate / 365) * stepDays;
        stepInterest = principal * (stepRate / 100);
      }

      accumInterest += stepInterest;

      const endDateObj = new Date(currentStartDate);
      endDateObj.setDate(endDateObj.getDate() + stepDays);

      monthlyBreakdown.push({
        periodIndex: i,
        periodLabel: input.calculationMethod === 'VAT_MONTHLY_1_5' ? `الشهر الضريبي رقم ${i}` : `الفترة ${i} (${stepDays} يوم)`,
        startDate: currentStartDate.toISOString().split('T')[0],
        endDate: endDateObj.toISOString().split('T')[0],
        daysInPeriod: stepDays,
        periodInterestRate: stepRate,
        periodInterestAmount: Math.round(stepInterest * 100) / 100,
        cumulativeInterest: Math.round(accumInterest * 100) / 100,
      });

      currentStartDate = endDateObj;
    }
  }

  const obligationMeta = OBLIGATION_TYPE_LABELS[input.obligationType] || OBLIGATION_TYPE_LABELS.OTHER;

  return {
    id: input.id || `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoiceOrDeclarationNumber: input.invoiceOrDeclarationNumber || 'غير محدد',
    obligationType: input.obligationType,
    obligationLabel: obligationMeta.label,
    principalAmount: Math.round(principal * 100) / 100,
    dueDate: input.dueDate,
    paymentDate: input.paymentDate,
    calculationMethod: input.calculationMethod,
    calculationMethodLabel: methodLabel,
    isDelayed,
    daysOverdue,
    monthsCount,
    effectiveAnnualRate: Math.round(effectiveAnnualRate * 100) / 100,
    effectiveMonthlyRate: Math.round(effectiveMonthlyRate * 100) / 100,
    dailyRate: Math.round(dailyRate * 10000) / 10000,
    grossPenaltyAmount: Math.round(grossPenalty * 100) / 100,
    waiverPercentage: waiverPct,
    waiverDiscountAmount: Math.round(waiverDiscountAmount * 100) / 100,
    netPenaltyPayable: Math.round(netPenaltyPayable * 100) / 100,
    totalSettlementAmount: Math.round(totalSettlementAmount * 100) / 100,
    penaltyToPrincipalRatio: Math.round(penaltyToPrincipalRatio * 10) / 10,
    monthlyBreakdown,
    suggestedJournalEntry: {
      debitAccount: '5230 - مصروفات وغرامات تأخير سداد ضرائب ومستحقات حكومية',
      debitAmount: Math.round(netPenaltyPayable * 100) / 100,
      creditAccount: '2130 - مصلحة الضرائب المصرية (مقابل تأخير مستحق) / النقدية والبنوك',
      creditAmount: Math.round(netPenaltyPayable * 100) / 100,
      description: `إثبات مقابل التأخير والضريبة الإضافية المستحقة عن ${obligationMeta.label} رقم ${input.invoiceOrDeclarationNumber}`,
      isTaxDeductible: false,
      legalReference: 'المادة 24 بند 5 من القانون 91 لسنة 2005: غرامات التأخير والتعويضات غير معتمدة ضريبياً كتكلفة واجبة الخصم',
    },
  };
}

/**
 * Calculates Early Settlement Comparison Matrix
 */
export function calculateEarlySettlementComparison(input: TaxPenaltyInput) {
  const baseDue = new Date(input.dueDate);
  const now = new Date();
  
  const scenarios = [
    { label: 'السداد الفوري اليوم', dateOffsetDays: 0 },
    { label: 'السداد بعد 15 يوماً', dateOffsetDays: 15 },
    { label: 'السداد بعد 30 يوماً (شهر)', dateOffsetDays: 30 },
    { label: 'السداد بعد 60 يوماً (شهرين)', dateOffsetDays: 60 },
    { label: 'السداد بعد 90 يوماً (3 أشهر)', dateOffsetDays: 90 },
  ];

  return scenarios.map((sc) => {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + sc.dateOffsetDays);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const result = calculateTaxPenalty({
      ...input,
      paymentDate: targetDateStr,
    });

    return {
      label: sc.label,
      targetDate: targetDateStr,
      daysOverdue: result.daysOverdue,
      penaltyAmount: result.netPenaltyPayable,
      totalSettlement: result.totalSettlementAmount,
      isImmediate: sc.dateOffsetDays === 0,
    };
  });
}
