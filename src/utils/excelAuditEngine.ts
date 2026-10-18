import {
  BenfordAnalysisResult,
  BenfordDigitMetric,
  ExcelAuditDatasetSummary,
  UnsupervisedMlAnomaly,
} from '../types';
import { getCairoDateString } from './cairoTime';

export const BENFORD_THEORETICAL: Record<number, number> = {
  1: 30.103,
  2: 17.609,
  3: 12.494,
  4: 9.691,
  5: 7.918,
  6: 6.695,
  7: 5.799,
  8: 5.115,
  9: 4.576,
};

export interface AuditDatasetInputRow {
  rowNumber: number;
  entryNumber: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export function calculateBenfordFromAmounts(amounts: number[]): BenfordAnalysisResult {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let totalEvaluated = 0;

  for (const rawAmt of amounts) {
    const amt = Math.abs(rawAmt);
    if (amt >= 10) {
      const firstChar = amt.toString().replace(/[^1-9]/, '').charAt(0);
      const digit = parseInt(firstChar, 10);
      if (digit >= 1 && digit <= 9) {
        counts[digit]++;
        totalEvaluated++;
      }
    }
  }

  let sumAbsDev = 0;
  const distortedDigits: number[] = [];

  const digitStats: BenfordDigitMetric[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
    const actualCount = counts[digit] || 0;
    const actualPercentage = totalEvaluated > 0 ? Number(((actualCount / totalEvaluated) * 100).toFixed(2)) : 0;
    const expectedPercentage = Number(BENFORD_THEORETICAL[digit].toFixed(2));
    const deviation = Number((actualPercentage - expectedPercentage).toFixed(2));
    sumAbsDev += Math.abs(deviation / 100);

    const isAnomalous = totalEvaluated >= 10 && Math.abs(deviation) >= 8;
    if (isAnomalous) {
      distortedDigits.push(digit);
    }

    return {
      digit,
      actualCount,
      actualPercentage,
      expectedPercentage,
      deviation,
      actualPct: actualPercentage,
      expectedPct: expectedPercentage,
      deviationPct: deviation,
      isSuspicious: isAnomalous,
      isAnomalous,
    };
  });

  const mad = totalEvaluated > 0 ? Number((sumAbsDev / 9).toFixed(4)) : 0;
  const conformityLevel =
    totalEvaluated === 0
      ? 'INSUFFICIENT_DATA'
      : mad <= 0.012
      ? 'ACCEPTABLE_CONFORMITY'
      : mad <= 0.018
      ? 'MARGINAL_CONFORMITY'
      : 'NON_CONFORMITY';

  return {
    totalSampleSize: totalEvaluated,
    validNumbersCount: totalEvaluated,
    madScore: mad,
    meanAbsoluteDeviation: mad,
    conformityLevel,
    digits: digitStats,
    digitStats,
    flaggedDigits: distortedDigits,
    distortedDigits,
  };
}

export function analyzeAuditDataset(rows: AuditDatasetInputRow[]): ExcelAuditDatasetSummary {
  const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const amounts = rows.map((r) => Math.max(Number(r.debit) || 0, Number(r.credit) || 0)).filter((a) => a > 0);
  const totalGrossAmount = amounts.reduce((sum, a) => sum + a, 0);
  const n = amounts.length;
  const meanAmount = n > 0 ? Math.round(totalGrossAmount / n) : 0;
  const sorted = [...amounts].sort((a, b) => a - b);
  const medianAmount = n > 0 ? sorted[Math.floor(n / 2)] : 0;
  const variance = n > 0 ? amounts.reduce((acc, v) => acc + Math.pow(v - meanAmount, 2), 0) / n : 0;
  const stdDeviation = Math.round(Math.sqrt(variance));

  const benford = calculateBenfordFromAmounts(amounts);
  const mlAnomalies: UnsupervisedMlAnomaly[] = [];

  rows.forEach((r) => {
    const amt = Math.max(Number(r.debit) || 0, Number(r.credit) || 0);
    if (amt <= 0) return;
    const zScore = stdDeviation > 0 ? (amt - meanAmount) / stdDeviation : 0;

    if (amt >= 48000 && amt < 50000) {
      mlAnomalies.push({
        id: `anom-struct-${r.rowNumber}`,
        rowIndex: r.rowNumber,
        row: {
          rowIndex: r.rowNumber,
          date: r.date,
          reference: r.entryNumber,
          description: r.description,
          amount: amt,
          debit: r.debit,
          credit: r.credit,
        },
        reference: r.entryNumber,
        description: r.description,
        amount: amt,
        score: 85,
        zScore: Number(zScore.toFixed(2)),
        severity: 'HIGH',
        category: 'STRUCTURING_THRESHOLD',
        title: 'عملية تقترب من سقف المدفوعات النقدية (قانون 18 لسنة 2019)',
        reasonAr: 'المبلغ يقع مباشرة تحت حد 50,000 ج.م، مما يستوجب فحص وسيلة السداد.',
        mathematicalReason: `المبلغ ${amt} ج.م يقترب من الحد الرقابي 50,000 ج.م.`,
        auditingInterpretation: 'فحص مستند الصرف والتحقق من عدم تجزئة الفاتورة.',
        mandatoryManualAuditStep: 'مطابقة أصل الفاتورة وإشعار التحويل البنكي.',
      });
    } else if (zScore >= 3.0) {
      mlAnomalies.push({
        id: `anom-zscore-${r.rowNumber}`,
        rowIndex: r.rowNumber,
        row: {
          rowIndex: r.rowNumber,
          date: r.date,
          reference: r.entryNumber,
          description: r.description,
          amount: amt,
          debit: r.debit,
          credit: r.credit,
        },
        reference: r.entryNumber,
        description: r.description,
        amount: amt,
        score: 90,
        zScore: Number(zScore.toFixed(2)),
        severity: 'CRITICAL',
        category: 'OUTLIER_ZSCORE',
        title: 'قيمة شاذة إحصائياً عن متوسط حركات العميل',
        reasonAr: `الانحراف المعياري للعملية (Z = ${zScore.toFixed(2)}) يتجاوز 3 أضعاف الانحراف المعياري.`,
        mathematicalReason: `Z-Score = ${zScore.toFixed(2)}`,
        auditingInterpretation: 'بند ذو أهمية نسبية مرتفعة يتطلب فحص المستند المؤيد.',
        mandatoryManualAuditStep: 'فحص العقد والفاتورة الضريبية واعتماد الإدارة.',
      });
    }
  });

  const critical = mlAnomalies.filter((a) => a.severity === 'CRITICAL').length;
  const high = mlAnomalies.filter((a) => a.severity === 'HIGH').length;
  const medium = mlAnomalies.filter((a) => a.severity === 'MEDIUM').length;
  const low = mlAnomalies.filter((a) => a.severity === 'LOW').length;
  const overallRiskScore = n === 0 ? 0 : Math.min(100, critical * 20 + high * 10 + medium * 5);

  return {
    fileName: 'دفتر_قيود_اليومية_النشط',
    auditDate: getCairoDateString(),
    totalRows: rows.length,
    validRows: n,
    validRowsCount: n,
    totalGrossAmount,
    totalDebit,
    totalCredit,
    meanAmount,
    medianAmount,
    stdDeviation,
    overallRiskScore,
    anomaliesCount: {
      total: mlAnomalies.length,
      critical,
      high,
      medium,
      low,
    },
    benford,
    mlAnomalies,
  };
}
