/**
 * AI Smart Excel Audit, Benford's Law & Unsupervised Machine Learning Sentinel Engine
 * مختبر الفحص والتدقيق الجنائي الذكي لملفات الإكسيل والبيانات المحاسبية
 * معايير المراجعة المصرية (ESA 240 / ESA 315 / ESA 500) وقانون تنظيم المدفوعات غير النقدية رقم 18 لسنة 2019
 */

import * as XLSX from 'xlsx';
import {
  ExcelAuditRow,
  ColumnMappingConfig,
  BenfordAnalysisResult,
  BenfordDigitMetric,
  UnsupervisedMlAnomaly,
  AuditClusterSummary,
  ExcelAuditDatasetSummary,
  ExcelAuditSeverity,
  ExcelAnomalyCategory,
} from '../types';

// Theoretical Benford's Law first-digit probability distribution
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

// Synonyms dictionary for fuzzy / heuristic header detection
const HEADER_SYNONYMS: Record<keyof ColumnMappingConfig, string[]> = {
  dateCol: [
    'تاريخ', 'التاريخ', 'تاريخ القيد', 'تاريخ الفاتورة', 'تاريخ الحركة', 'تاريخ السند',
    'يومية', 'اليوم', 'date', 'posting date', 'doc date', 'docdate', 'txndate',
    'trans date', 'entry date', 'voucher date', 'invoice date', 'day'
  ],
  amountCol: [
    'مبلغ', 'المبلغ', 'القيمة', 'صافي', 'الصافي', 'إجمالي', 'الإجمالي', 'قيمة',
    'قيمة الحركة', 'الرصيد', 'amount', 'value', 'total', 'net', 'gross', 'sum',
    'balance', 'txn amount', 'net amount', 'price', 'val'
  ],
  debitCol: [
    'مدين', 'المدين', 'منه', 'حركة مدينة', 'debit', 'dr', 'debit amount', 'debit egp'
  ],
  creditCol: [
    'دائن', 'الدائن', 'له', 'حركة دائنة', 'credit', 'cr', 'credit amount', 'credit egp'
  ],
  descriptionCol: [
    'بيان', 'البيان', 'شرح', 'الشرح', 'الوصف', 'وصف', 'ملاحظات', 'تفاصيل', 'شرح القيد',
    'description', 'particulars', 'narrative', 'memo', 'remarks', 'details', 'notes',
    'item', 'concept'
  ],
  docNoCol: [
    'رقم المستند', 'رقم القيد', 'رقم الفاتورة', 'رقم السند', 'رقم الإذن', 'رقم الشيك',
    'مستند', 'فاتورة', 'قيد', 'سند', 'كود الحركة', 'مسلسل', 'doc no', 'docno', 'ref',
    'reference', 'invoice', 'voucher', 'serial', 'id', 'txn id', 'code', 'number', 'check no'
  ],
  accountCol: [
    'حساب', 'الحساب', 'كود الحساب', 'اسم الحساب', 'رقم الحساب', 'شجرة الحسابات', 'مركز التكلفة',
    'account', 'account name', 'gl', 'gl code', 'account no', 'account code', 'cost center'
  ],
  entityCol: [
    'عميل', 'مورد', 'العميل', 'المورد', 'الجهة', 'المستفيد', 'الشركة', 'اسم العميل', 'اسم المورد',
    'الطرف الآخر', 'party', 'vendor', 'supplier', 'customer', 'client', 'entity', 'beneficiary',
    'counterparty', 'payee'
  ],
  categoryCol: [
    'نوع', 'النوع', 'تصنيف', 'القطاع', 'نوع الحركة', 'نوع المصروف', 'الفرع',
    'category', 'type', 'class', 'group', 'sector', 'department', 'branch'
  ],
};

/**
 * Parses any uploaded Excel or CSV file into sheets and 2D arrays
 */
export async function parseExcelFile(file: File): Promise<{
  sheetNames: string[];
  sheetsData: Record<string, any[][]>;
  defaultSheet: string;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('الملف لا يحتوي على أي صفحات بيانات صالحة.');
  }

  const sheetsData: Record<string, any[][]> = {};
  sheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    sheetsData[name] = rawData;
  });

  return {
    sheetNames,
    sheetsData,
    defaultSheet: sheetNames[0],
  };
}

/**
 * Cleans string for fuzzy comparison
 */
function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—./\\]+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/**
 * Calculates string similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = cleanStr(str1);
  const s2 = cleanStr(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Simple token overlap
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const intersection = words1.filter((w) => words2.includes(w));
  if (intersection.length > 0) {
    return (2 * intersection.length) / (words1.length + words2.length);
  }
  return 0;
}

/**
 * Auto-detects the true header row index and matches columns heuristically
 */
export function autoDetectHeaderAndMapping(sheetData: any[][]): {
  headerRowIndex: number;
  availableColumns: string[];
  mapping: ColumnMappingConfig;
} {
  const maxRowsToCheck = Math.min(sheetData.length, 10);
  let bestHeaderRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < maxRowsToCheck; r++) {
    const row = sheetData[r] || [];
    let textCellsCount = 0;
    let keywordHits = 0;

    row.forEach((cell) => {
      const s = cleanStr(cell);
      if (s.length > 1 && isNaN(Number(s))) {
        textCellsCount++;
        // Check if it matches any known auditing header synonyms
        for (const key of Object.keys(HEADER_SYNONYMS) as (keyof ColumnMappingConfig)[]) {
          if (HEADER_SYNONYMS[key].some((syn) => cleanStr(syn) === s || s.includes(cleanStr(syn)))) {
            keywordHits++;
            break;
          }
        }
      }
    });

    const score = textCellsCount * 2 + keywordHits * 5;
    if (score > maxScore) {
      maxScore = score;
      bestHeaderRowIndex = r;
    }
  }

  const rawHeaderRow = sheetData[bestHeaderRowIndex] || [];
  const availableColumns: string[] = rawHeaderRow.map((cell, idx) => {
    const str = String(cell || '').trim();
    return str || `العمود_${idx + 1}`;
  });

  // Now find the best matching column for each field
  const mapping: ColumnMappingConfig = {
    dateCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    amountCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    debitCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    creditCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    descriptionCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    docNoCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    accountCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    entityCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
    categoryCol: { detectedColumn: null, confidence: 0, isManualOverride: false },
  };

  (Object.keys(HEADER_SYNONYMS) as (keyof ColumnMappingConfig)[]).forEach((fieldKey) => {
    const synonyms = HEADER_SYNONYMS[fieldKey];
    let bestCol: string | null = null;
    let highestSim = 0;

    availableColumns.forEach((colName) => {
      synonyms.forEach((syn) => {
        const sim = calculateSimilarity(colName, syn);
        if (sim > highestSim) {
          highestSim = sim;
          bestCol = colName;
        }
      });
    });

    if (bestCol && highestSim >= 0.5) {
      mapping[fieldKey] = {
        detectedColumn: bestCol,
        confidence: Math.min(100, Math.round(highestSim * 100)),
        isManualOverride: false,
      };
    }
  });

  return {
    headerRowIndex: bestHeaderRowIndex,
    availableColumns,
    mapping,
  };
}

/**
 * Converts Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) and cleans formatting to standard number
 */
export function cleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Convert Arabic/Eastern numbers
  str = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // Handle negative enclosed in parentheses e.g. (1,250.00)
  const isNegative = str.startsWith('(') && str.endsWith(')');
  str = str.replace(/[()]/g, '');

  // Strip currency symbols, commas, spaces
  str = str.replace(/[^\d.-]/g, '');

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Cleans date to YYYY-MM-DD
 */
export function cleanDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  // If already Date object from XLSX
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }

  // If Excel serial number (e.g. 45200)
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const utcDays = Math.floor(val - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  let str = String(val).trim();
  str = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

/**
 * Normalizes raw sheet data into clean typed ExcelAuditRow array
 */
export function normalizeRowsFromSheet(
  sheetData: any[][],
  headerRowIndex: number,
  mapping: ColumnMappingConfig
): ExcelAuditRow[] {
  const headerRow = sheetData[headerRowIndex] || [];
  const colIndexMap: Record<string, number> = {};

  headerRow.forEach((cell, idx) => {
    const colName = String(cell || '').trim();
    if (colName) {
      colIndexMap[colName] = idx;
    }
  });

  const getColVal = (rowArr: any[], colKey: keyof ColumnMappingConfig): any => {
    const mappedName = mapping[colKey]?.detectedColumn;
    if (!mappedName) return '';
    const idx = colIndexMap[mappedName];
    if (idx === undefined || idx < 0) return '';
    return rowArr[idx];
  };

  const rows: ExcelAuditRow[] = [];
  const dataRows = sheetData.slice(headerRowIndex + 1);

  dataRows.forEach((rowArr, i) => {
    if (!rowArr || rowArr.length === 0) return;
    // Check if entire row is empty
    const hasContent = rowArr.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasContent) return;

    const rawDebit = cleanNumber(getColVal(rowArr, 'debitCol'));
    const rawCredit = cleanNumber(getColVal(rowArr, 'creditCol'));
    let amount = cleanNumber(getColVal(rowArr, 'amountCol'));

    if (amount === 0 && (rawDebit > 0 || rawCredit > 0)) {
      amount = Math.max(rawDebit, rawCredit);
    }

    const dateStr = cleanDate(getColVal(rowArr, 'dateCol'));
    const docNo = String(getColVal(rowArr, 'docNoCol') || '').trim() || `DOC-${i + 1}`;
    const description = String(getColVal(rowArr, 'descriptionCol') || '').trim() || 'قيد / معاملة غير مشروحة';
    const account = String(getColVal(rowArr, 'accountCol') || '').trim() || 'حساب عام';
    const entity = String(getColVal(rowArr, 'entityCol') || '').trim() || 'جهة عامة';
    const category = String(getColVal(rowArr, 'categoryCol') || '').trim() || 'عام';

    // Original raw object
    const originalRowData: Record<string, any> = {};
    headerRow.forEach((hCell, idx) => {
      const col = String(hCell || '').trim() || `Col_${idx}`;
      originalRowData[col] = rowArr[idx];
    });

    rows.push({
      id: `audit-row-${i + 1}`,
      rowIndex: headerRowIndex + 2 + i, // Excel 1-based row
      originalRowData,
      date: dateStr,
      docNo,
      description,
      account,
      entity,
      amount,
      debit: rawDebit,
      credit: rawCredit,
      category,
      hasWarnings: false,
    });
  });

  return rows;
}

/**
 * Calculates First-Digit Benford's Law distribution and statistical goodness of fit
 */
export function calculateBenfordDistribution(rows: ExcelAuditRow[]): BenfordAnalysisResult {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let totalEvaluated = 0;

  rows.forEach((r) => {
    const amt = Math.abs(r.amount);
    if (amt >= 10) {
      const firstDigitStr = amt.toString().replace(/[^1-9]/, '').charAt(0);
      const digit = parseInt(firstDigitStr, 10);
      if (digit >= 1 && digit <= 9) {
        counts[digit]++;
        totalEvaluated++;
      }
    }
  });

  const distortedDigits: number[] = [];
  let sumAbsoluteDeviations = 0;
  let chiSquare = 0;

  const digitStats: BenfordDigitMetric[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
    const actualCount = counts[digit] || 0;
    const actualPercentage = totalEvaluated > 0 ? (actualCount / totalEvaluated) * 100 : 0;
    const expectedPercentage = BENFORD_THEORETICAL[digit];
    const expectedCount = totalEvaluated * (expectedPercentage / 100);

    const deviation = actualPercentage - expectedPercentage;
    sumAbsoluteDeviations += Math.abs(deviation / 100);

    // Z-score approximation for binomial proportion
    const variance = (expectedPercentage / 100) * (1 - expectedPercentage / 100) * totalEvaluated;
    const zScore = variance > 0 ? (actualCount - expectedCount) / Math.sqrt(variance) : 0;

    if (expectedCount > 0) {
      chiSquare += Math.pow(actualCount - expectedCount, 2) / expectedCount;
    }

    // Significant distortion if Z > 2.58 (99% confidence) or deviation > 5%
    const isAnomalous = totalEvaluated >= 30 && (Math.abs(zScore) >= 2.58 || Math.abs(deviation) >= 6.5);
    if (isAnomalous) {
      distortedDigits.push(digit);
    }

    return {
      digit,
      actualCount,
      actualPercentage: Number(actualPercentage.toFixed(2)),
      expectedPercentage: Number(expectedPercentage.toFixed(2)),
      deviation: Number(deviation.toFixed(2)),
      zScore: Number(zScore.toFixed(2)),
      isAnomalous,
    };
  });

  // Mean Absolute Deviation (MAD) = sum(|Actual - Expected|) / 9
  const meanAbsoluteDeviation = sumAbsoluteDeviations / 9;

  let conformityLevel: 'CLOSE' | 'ACCEPTABLE' | 'MARGINAL' | 'NON_CONFORMING' = 'ACCEPTABLE';
  if (meanAbsoluteDeviation <= 0.006) {
    conformityLevel = 'CLOSE';
  } else if (meanAbsoluteDeviation <= 0.012) {
    conformityLevel = 'ACCEPTABLE';
  } else if (meanAbsoluteDeviation <= 0.018) {
    conformityLevel = 'MARGINAL';
  } else {
    conformityLevel = 'NON_CONFORMING';
  }

  return {
    digitStats,
    totalEvaluatedAmounts: totalEvaluated,
    meanAbsoluteDeviation: Number(meanAbsoluteDeviation.toFixed(4)),
    conformityLevel,
    chiSquareStatistic: Number(chiSquare.toFixed(2)),
    isSignificantDistortion: distortedDigits.length > 0 || conformityLevel === 'NON_CONFORMING',
    distortedDigits,
  };
}

/**
 * Runs Unsupervised Machine Learning Outlier Detection & Forensic Electronic Auditing
 */
export function runUnsupervisedMlAudit(
  rows: ExcelAuditRow[],
  benfordResult: BenfordAnalysisResult
): {
  anomalies: UnsupervisedMlAnomaly[];
  clusters: AuditClusterSummary[];
  datasetSummary: Partial<ExcelAuditDatasetSummary>;
} {
  const anomalies: UnsupervisedMlAnomaly[] = [];
  const validAmounts = rows.map((r) => Math.abs(r.amount)).filter((a) => a > 0);

  if (validAmounts.length === 0) {
    return {
      anomalies: [],
      clusters: [],
      datasetSummary: {
        totalRows: rows.length,
        validRowsCount: 0,
        totalGrossAmount: 0,
      },
    };
  }

  // 1. Descriptive Statistics & Dispersion
  const sortedAmounts = [...validAmounts].sort((a, b) => a - b);
  const n = sortedAmounts.length;
  const totalGrossAmount = validAmounts.reduce((sum, a) => sum + a, 0);
  const meanAmount = totalGrossAmount / n;

  const medianAmount =
    n % 2 === 0
      ? (sortedAmounts[n / 2 - 1] + sortedAmounts[n / 2]) / 2
      : sortedAmounts[Math.floor(n / 2)];

  const q1 = sortedAmounts[Math.floor(n * 0.25)];
  const q3 = sortedAmounts[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + 1.5 * iqr;
  const extremeFence = q3 + 3.0 * iqr;

  // Standard Deviation
  const variance = validAmounts.reduce((acc, val) => acc + Math.pow(val - meanAmount, 2), 0) / n;
  const stdDeviation = Math.sqrt(variance);

  // Groupings for Relative Size Factor (RSF) & Duplicates
  const entityAmountsMap = new Map<string, number[]>();
  const exactDuplicateMap = new Map<string, ExcelAuditRow[]>();
  const amountDateMap = new Map<string, ExcelAuditRow[]>();

  rows.forEach((row) => {
    // RSF mapping
    if (row.entity) {
      const list = entityAmountsMap.get(row.entity) || [];
      list.push(row.amount);
      entityAmountsMap.set(row.entity, list);
    }

    // Exact duplicate key: amount + entity + docNo
    const dupKey = `${Math.round(row.amount)}_${cleanStr(row.entity)}_${cleanStr(row.docNo)}`;
    const dList = exactDuplicateMap.get(dupKey) || [];
    dList.push(row);
    exactDuplicateMap.set(dupKey, dList);

    // Date + Amount key for fuzzy duplicate
    const dateAmtKey = `${row.date}_${Math.round(row.amount)}`;
    const daList = amountDateMap.get(dateAmtKey) || [];
    daList.push(row);
    amountDateMap.set(dateAmtKey, daList);
  });

  // Calculate RSF (Top amount / Second largest amount for each entity)
  const entityRsfMap = new Map<string, number>();
  entityAmountsMap.forEach((amounts, entity) => {
    if (amounts.length >= 2) {
      const sorted = [...amounts].sort((a, b) => b - a);
      const top1 = sorted[0];
      const top2 = sorted[1];
      if (top2 > 0) {
        entityRsfMap.set(entity, top1 / top2);
      }
    }
  });

  // 2. Anomaly Detection Pipeline per Row
  rows.forEach((row) => {
    const amt = Math.abs(row.amount);
    const zScore = stdDeviation > 0 ? (amt - meanAmount) / stdDeviation : 0;

    // A. Extreme Isolation Outlier (Statistical LOF / Z-Score Anomaly)
    if (amt >= extremeFence || zScore >= 3.5) {
      const intensity = Math.min(99, Math.round(zScore * 15 + 40));
      anomalies.push({
        id: `anom-extreme-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: intensity,
        severity: 'CRITICAL',
        category: 'ISOLATION_OUTLIER',
        title: `قيمة شاذة إحصائياً بصورة متطرفة (${amt.toLocaleString('ar-EG')} ج.م)`,
        mathematicalReason: `قيمة العملية تتجاوز حد العزل الشاذ (Z-Score = ${zScore.toFixed(2)}σ > 3.5σ)، وتفوق الحد الأقصى للمدى الربيعي (${extremeFence.toLocaleString('ar-EG')} ج.م) بنسبة ${Math.round((amt / upperFence) * 100)}%.`,
        auditingInterpretation: `وفقاً لمعيار المراجعة المصري (ESA 240) ومعيار فحص العينات (ESA 530)، تصنف هذه العملية كبند ذو أهمية نسبية قصوى (Key Audit Matter) قد يشير إلى رسملة غير سليمة أو مدفوعات استثنائية خارج السياق المعتاد.`,
        mandatoryManualAuditStep: `فحص أصل الفاتورة الضريبية، العقد أو أمر التوريد، موافقة مجلس الإدارة أو المفوض المالي، والتحقق من كشف الحساب البنكي للتأكد من سداد القيمة عبر قنوات رسمية.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    } else if (amt >= upperFence && zScore >= 2.0) {
      anomalies.push({
        id: `anom-outlier-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: 75,
        severity: 'HIGH',
        category: 'ISOLATION_OUTLIER',
        title: `قيمة مرتفعة خارج النمط التوزيعي المعتاد (${amt.toLocaleString('ar-EG')} ج.م)`,
        mathematicalReason: `الانحراف المعياري للعملية Z-Score = ${zScore.toFixed(2)}، وتتجاوز الربيع الأعلى للشريحة بنسبة ملموسة.`,
        auditingInterpretation: `يستلزم معيار المراجعة المصري (ESA 315) توجيه إجراءات فحص تفصيلية للعمليات غير النمطية ذات القيمة العالية.`,
        mandatoryManualAuditStep: `مطابقة المستند المؤيد للعملية، مراجعة توقيعات الاستلام المخزني وإذن الصرف، والتحقق من صحة التوجيه المحاسبي.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    }

    // B. Structuring & Threshold Avoidance (قانون تنظيم المدفوعات غير النقدية رقم 18 لسنة 2019)
    // E.g., Clustering right below 50,000 (48,000 - 49,999) or below 20,000 (18,500 - 19,999)
    const isNearFiftyThousand = amt >= 48000 && amt < 50000;
    const isNearTwentyThousand = amt >= 18500 && amt < 20000;
    if (isNearFiftyThousand || isNearTwentyThousand) {
      const threshold = isNearFiftyThousand ? 50000 : 20000;
      anomalies.push({
        id: `anom-struct-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: 88,
        severity: 'HIGH',
        category: 'STRUCTURING_THRESHOLD',
        title: `شبهة تجزئة مبالغ وتفادي حدود الرقابة القانونية (${amt.toLocaleString('ar-EG')} ج.م)`,
        mathematicalReason: `المبلغ يقترب بنسبة ${( (amt / threshold) * 100 ).toFixed(1)}% من سقف الحد القانوني (${threshold.toLocaleString('ar-EG')} ج.م) بفارق هامشي لا يتعدى ${(threshold - amt).toLocaleString('ar-EG')} ج.م.`,
        auditingInterpretation: `تجزئة المدفوعات للهروب من حدود الإلزام بالسداد الإلكتروني (قانون 18 لسنة 2019 ولائحته التنفيذية) أو للهروب من صلاحيات الاعتماد الإداري العليا. يعرض المنشأة لغرامات مالية وعدم الاعتراف بالنفقة ضريبياً.`,
        mandatoryManualAuditStep: `فحص كافة العمليات التي تمت مع ذات الطرف (${row.entity || 'الجهة'}) خلال نفس الشهر، والتحقق من عدم تقسيم فاتورة واحدة إلى سندات متعددة.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    }

    // C. Round Number Forensic Estimation Anomaly (الأرقام الدائرية التقديرية)
    if (amt >= 20000 && amt % 10000 === 0) {
      anomalies.push({
        id: `anom-round-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: 65,
        severity: 'MEDIUM',
        category: 'ROUND_NUMBER',
        title: `مبلغ دائري مصطنع يفتقر للكسور والضريبة (${amt.toLocaleString('ar-EG')} ج.م)`,
        mathematicalReason: `المبلغ ينتهي بأصفار تامة متعددة (${amt.toLocaleString('ar-EG')}) بدون ضريبة قيمة مضافة (14%) أو استقطاع خصم وتحصيل تحت حساب الضريبة (1%).`,
        auditingInterpretation: `المعاملات التجارية الحقيقية تخضع لضرائب وكسور، بينما المبالغ الدائرية المجردة تشير عادة إلى تقدير جزافي، أو تسويات غير مؤيدة بمستندات رسمية، أو مخصصات اصطناعية.`,
        mandatoryManualAuditStep: `طلب أصل الفاتورة الإلكترونية الصادرة مع رمز QR، ومراجعة تسوية ضريبة القيمة المضافة ونموذج 41 خصم وتحصيل.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    }

    // D. Weekend / Holiday Processing Anomaly (عمليات العطلات الأسبوعية)
    if (row.date) {
      const dateObj = new Date(row.date);
      const dayOfWeek = dateObj.getDay(); // 5 = الجمعة, 6 = السبت (عطلات مصرية رسمية)
      if ((dayOfWeek === 5 || dayOfWeek === 6) && amt >= 25000) {
        anomalies.push({
          id: `anom-weekend-${row.id}`,
          rowIndex: row.rowIndex,
          row,
          score: 72,
          severity: 'MEDIUM',
          category: 'WEEKEND_OFF_HOURS',
          title: `تسجيل وترحيل مالي في عطلة أسبوعية (${dayOfWeek === 5 ? 'الجمعة' : 'السبت'})`,
          mathematicalReason: `تاريخ القيد يوافق يوم عطلة بنكية ورسمية بمبلغ ذو دلالة (${amt.toLocaleString('ar-EG')} ج.م).`,
          auditingInterpretation: `تعد القيود المسجلة في العطلات أو بعد ساعات الدوام الرسمي من مؤشرات الخطر المرتفعة (Red Flags) لتجاوز نظام الرقابة الداخلية (Management Override of Controls) وفقاً لمعيار ESA 240.`,
          mandatoryManualAuditStep: `فحص سجل الدخول والمستخدم المنشئ للعملية في الـ Audit Trail، والتأكد من وجود مبرر تشغيلي طارئ ومعتمد من المدير المالي.`,
          verificationVerdict: 'UNCHECKED',
        });
        row.hasWarnings = true;
      }
    }

    // E. Relative Size Factor Spike (RSF)
    const rsf = entityRsfMap.get(row.entity) || 0;
    if (rsf >= 5.0 && amt === Math.max(...(entityAmountsMap.get(row.entity) || [0]))) {
      anomalies.push({
        id: `anom-rsf-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: 82,
        severity: 'HIGH',
        category: 'RELATIVE_SIZE_SPIKE',
        title: `قفزة غير متناسبة في معاملات الطرف (RSF = ${rsf.toFixed(1)}x)`,
        mathematicalReason: `مبلغ هذه العملية يفوق ثاني أكبر عملية لنفس الطرف (${row.entity}) بمقدار ${rsf.toFixed(1)} ضعفاً، مما يمثل شذوذاً نسبياً حاداً.`,
        auditingInterpretation: `مؤشر خطر على احتمالية إنشاء مورد وهمي أو تحويل أموال استثنائي بدون دراسة مسبقة، يستوجب تدقيقاً معمقاً.`,
        mandatoryManualAuditStep: `التحقق من السجل التجاري والبطاقة الضريبية للطرف، ومطابقة شهادة استلام البضائع أو الخدمات مع العقد الأصلي.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    }

    // F. Benford Deviant Leading Digits
    const firstDigit = parseInt(amt.toString().replace(/[^1-9]/, '').charAt(0), 10);
    if (benfordResult.distortedDigits.includes(firstDigit) && amt >= 1000) {
      anomalies.push({
        id: `anom-benford-${row.id}`,
        rowIndex: row.rowIndex,
        row,
        score: 60,
        severity: 'LOW',
        category: 'BENFORD_DEVIATION',
        title: `رقم بداية مشبوه إحصائياً (${firstDigit}) يخالف قانون بنفورد`,
        mathematicalReason: `الرقم الأول (${firstDigit}) يظهر في الملف بنسبة شاذة تنحرف عن التوزيع الطبيعي اللوغاريتمي لقانون بنفورد (Z-Score = ${benfordResult.digitStats.find((d) => d.digit === firstDigit)?.zScore || 0}).`,
        auditingInterpretation: `تكرار أرقام بادئة محددة بصورة غير طبيعية يعكس عادة تدخلاً بشرياً لاختلاق مبالغ أو وضع قيود نمطية متكررة دون حركة تجارية فعلية.`,
        mandatoryManualAuditStep: `اختيار عينة عشوائية من المعاملات البادئة بالرقم ${firstDigit} وفحص مستنداتها المؤيدة للتحقق من مصداقية المصدر.`,
        verificationVerdict: 'UNCHECKED',
      });
      row.hasWarnings = true;
    }
  });

  // 3. Exact Duplicate & Redundant Payments
  exactDuplicateMap.forEach((dupRows) => {
    if (dupRows.length >= 2) {
      dupRows.slice(1).forEach((dupRow) => {
        anomalies.push({
          id: `anom-dup-${dupRow.id}`,
          rowIndex: dupRow.rowIndex,
          row: dupRow,
          score: 95,
          severity: 'CRITICAL',
          category: 'EXACT_DUPLICATE',
          title: `تكرار متطابق لعملية مسجلة سابقاً (${dupRow.amount.toLocaleString('ar-EG')} ج.م)`,
          mathematicalReason: `تطابق تام في القيمة (${dupRow.amount.toLocaleString('ar-EG')} ج.م)، واسم الطرف (${dupRow.entity})، ورقم المستند (${dupRow.docNo}) مع عملية أخرى في السطر ${dupRows[0].rowIndex}.`,
          auditingInterpretation: `شبهة تكرار سداد مزدوج (Double Payment) أو قيد محاسبي مكرر يؤدي لتضخيم المصروفات وتشويه القوائم المالية.`,
          mandatoryManualAuditStep: `مراجعة كشف الحساب البنكي لمطابقة حركة الخصم، والتأكد هل تم سداد الشيك مرتين أم أنه خطأ إدخال محاسبي يستوجب قيد عكسي.`,
          verificationVerdict: 'UNCHECKED',
        });
        dupRow.hasWarnings = true;
      });
    }
  });

  // 4. Fuzzy Duplicates (Same amount within same date to same account)
  amountDateMap.forEach((daRows) => {
    if (daRows.length >= 2 && daRows[0].amount >= 5000) {
      daRows.slice(1).forEach((fRow) => {
        if (!anomalies.some((a) => a.id === `anom-dup-${fRow.id}`)) {
          anomalies.push({
            id: `anom-fuzzy-${fRow.id}`,
            rowIndex: fRow.rowIndex,
            row: fRow,
            score: 78,
            severity: 'HIGH',
            category: 'FUZZY_DUPLICATE',
            title: `تكرار مشبوه لنفس القيمة في ذات اليوم (${fRow.amount.toLocaleString('ar-EG')} ج.م)`,
            mathematicalReason: `تسجيل عمليتين بنفس القيمة الدقيقة (${fRow.amount.toLocaleString('ar-EG')} ج.م) في نفس التاريخ (${fRow.date}).`,
            auditingInterpretation: `احتمالية إعادة إدخال نفس الفاتورة مع تغيير طفيف في البيان، أو تكرار المطالبة.`,
            mandatoryManualAuditStep: `فحص أصل الفواتير للعمليتين ومقارنة أرقام أذون الصرف والتوقيعات لمنع الازدواجية.`,
            verificationVerdict: 'UNCHECKED',
          });
          fRow.hasWarnings = true;
        }
      });
    }
  });

  // Sort anomalies by score descending
  anomalies.sort((a, b) => b.score - a.score);

  // 5. Quantile Cluster Stratification
  const clusters: AuditClusterSummary[] = [
    {
      clusterName: 'MICRO',
      clusterLabelAr: 'العمليات الدقيقة والفرعية (0 - 25%)',
      count: 0,
      minAmount: Infinity,
      maxAmount: 0,
      totalSum: 0,
      meanAmount: 0,
      outliersCount: 0,
    },
    {
      clusterName: 'OPERATIONAL',
      clusterLabelAr: 'العمليات التشغيلية النمطية (25% - 75%)',
      count: 0,
      minAmount: Infinity,
      maxAmount: 0,
      totalSum: 0,
      meanAmount: 0,
      outliersCount: 0,
    },
    {
      clusterName: 'UPPER_NORMAL',
      clusterLabelAr: 'العمليات المتوسطة والمرتفعة (75% - 95%)',
      count: 0,
      minAmount: Infinity,
      maxAmount: 0,
      totalSum: 0,
      meanAmount: 0,
      outliersCount: 0,
    },
    {
      clusterName: 'MATERIAL_EXTREME',
      clusterLabelAr: 'العمليات الجسيمة والشواذ الإحصائية (أعلى 5%)',
      count: 0,
      minAmount: Infinity,
      maxAmount: 0,
      totalSum: 0,
      meanAmount: 0,
      outliersCount: 0,
    },
  ];

  const p95 = sortedAmounts[Math.floor(n * 0.95)] || upperFence;

  rows.forEach((r) => {
    const a = Math.abs(r.amount);
    let targetCluster = clusters[1];
    if (a <= q1) {
      targetCluster = clusters[0];
    } else if (a <= q3) {
      targetCluster = clusters[1];
    } else if (a <= p95) {
      targetCluster = clusters[2];
    } else {
      targetCluster = clusters[3];
    }

    targetCluster.count++;
    targetCluster.totalSum += a;
    if (a < targetCluster.minAmount) targetCluster.minAmount = a;
    if (a > targetCluster.maxAmount) targetCluster.maxAmount = a;
    if (r.hasWarnings) targetCluster.outliersCount++;
  });

  clusters.forEach((c) => {
    if (c.count > 0) {
      c.meanAmount = Math.round(c.totalSum / c.count);
    } else {
      c.minAmount = 0;
      c.maxAmount = 0;
    }
  });

  // Calculate Overall Risk Score (0 to 100)
  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
  const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;

  let riskScore = 0;
  riskScore += Math.min(45, criticalCount * 15);
  riskScore += Math.min(30, highCount * 8);
  riskScore += Math.min(15, mediumCount * 3);
  if (benfordResult.conformityLevel === 'NON_CONFORMING') riskScore += 15;
  if (benfordResult.conformityLevel === 'MARGINAL') riskScore += 8;
  riskScore = Math.min(100, Math.max(5, riskScore));

  return {
    anomalies,
    clusters,
    datasetSummary: {
      totalRows: rows.length,
      validRowsCount: n,
      totalGrossAmount,
      meanAmount: Math.round(meanAmount),
      medianAmount: Math.round(medianAmount),
      stdDeviation: Math.round(stdDeviation),
      minAmount: sortedAmounts[0] || 0,
      maxAmount: sortedAmounts[n - 1] || 0,
      overallRiskScore: riskScore,
    },
  };
}

/**
 * Generates an Audit-Ready Benchmark Demo Dataset with Realistic Business Anomalies
 */
export function getBenchmarkDemoDataset(): {
  rows: ExcelAuditRow[];
  mapping: ColumnMappingConfig;
  fileName: string;
} {
  const demoDataRaw = [
    // 1. Normal Operations
    { date: '2026-01-04', docNo: 'INV-2026-0101', desc: 'توريد مستلزمات مكتبية وأحبار طباعة', account: 'مصروفات إدارية وعمومية', entity: 'شركة الأهرام للتوريدات', amount: 14500, debit: 14500, credit: 0, cat: 'مستلزمات' },
    { date: '2026-01-05', docNo: 'INV-2026-0102', desc: 'سداد إيجار مقر الشركة - شهر يناير 2026', account: 'إيجارات مقرات', entity: 'الشركة العربية للاستثمار العقاري', amount: 35000, debit: 35000, credit: 0, cat: 'إيجار' },
    { date: '2026-01-06', docNo: 'INV-2026-0103', desc: 'صيانة خطوط شبكات الحاسب الآلي والخوادم', account: 'صيانة برمجيات ونظم', entity: 'دل مصر لتكنولوجيا المعلومات', amount: 18200, debit: 18200, credit: 0, cat: 'تقنية' },
    { date: '2026-01-07', docNo: 'INV-2026-0104', desc: 'فاتورة استهلاك كهرباء المقر الرئيسي', account: 'كهرباء ومياه وإنارة', entity: 'شركة شمال القاهرة لتوزيع الكهرباء', amount: 12450, debit: 12450, credit: 0, cat: 'مرافق' },
    { date: '2026-01-08', docNo: 'INV-2026-0105', desc: 'مطبوعات تسويقية وحملة إعلانية رقمية', account: 'دعاية وإعلان وترويج', entity: 'وكالة تارجت للإعلان', amount: 28400, debit: 28400, credit: 0, cat: 'تسويق' },
    { date: '2026-01-10', docNo: 'INV-2026-0106', desc: 'توريد مواد خام تصنيع - شحنة رقم 1', account: 'مخزون خامات', entity: 'المصرية للصناعات الهندسية', amount: 87500, debit: 87500, credit: 0, cat: 'خامات' },
    { date: '2026-01-11', docNo: 'INV-2026-0107', desc: 'سداد مصروفات نقل وشحن بضائع داخلي', account: 'نقل وانتقالات', entity: 'الشركة الوطنية للوجستيات', amount: 9600, debit: 9600, credit: 0, cat: 'شحن' },
    { date: '2026-01-12', docNo: 'INV-2026-0108', desc: 'شراء أجهزة حاسب محمول للمهندسين', account: 'أجهزة حواسب ومعدات', entity: 'مترو للالكترونيات', amount: 62000, debit: 62000, credit: 0, cat: 'أصول' },

    // 2. Structuring Anomaly (Right below 50k limit - Law 18/2019)
    { date: '2026-01-13', docNo: 'PV-2026-0044', desc: 'دفعة نقدية تحت حساب مقاولة تجديد الواجهة (1)', account: 'مصروفات صيانة وترميم', entity: 'مكتب الإخلاص للمقاولات', amount: 49850, debit: 49850, credit: 0, cat: 'مقاولات' },
    { date: '2026-01-14', docNo: 'PV-2026-0045', desc: 'دفعة نقدية ثانية استكمال تجديد الواجهة (2)', account: 'مصروفات صيانة وترميم', entity: 'مكتب الإخلاص للمقاولات', amount: 49600, debit: 49600, credit: 0, cat: 'مقاولات' },

    // 3. Exact Duplicate Anomaly (Double Payment)
    { date: '2026-01-15', docNo: 'INV-2026-8902', desc: 'توريد كابلات وقواطع كهربائية للمصنع', account: 'مهمات وقطع غيار', entity: 'شركة السويدي للكابلات والكهرباء', amount: 64500, debit: 64500, credit: 0, cat: 'قطع غيار' },
    { date: '2026-01-18', docNo: 'INV-2026-8902', desc: 'توريد كابلات وقواطع كهربائية للمصنع (قيد مكرر)', account: 'مهمات وقطع غيار', entity: 'شركة السويدي للكابلات والكهرباء', amount: 64500, debit: 64500, credit: 0, cat: 'قطع غيار' },

    // 4. Extreme Isolation Outlier (Z > 4.5)
    { date: '2026-01-19', docNo: 'TR-2026-0911', desc: 'تسوية دفعة استثنائية شراء ترخيص برمجيات دولي', account: 'أصول غير ملموسة وتراخيص', entity: 'جلوبال كلاود انترناشونال ليمتد', amount: 685000, debit: 685000, credit: 0, cat: 'تراخيص' },

    // 5. Weekend / Holiday Processing Anomaly (Friday)
    { date: '2026-01-23', docNo: 'JV-2026-0145', desc: 'صرف مكافأة استثنائية للإدارة العليا نقدياً', account: 'مكافآت وحوافز إدارية', entity: 'إدارة الشؤون التنفيذية', amount: 78500, debit: 78500, credit: 0, cat: 'مرتبات' },

    // 6. Round Number Estimation (150,000 without withholding tax)
    { date: '2026-01-25', docNo: 'VCH-2026-0211', desc: 'أتعاب استشارية ودراسة سوق تسويقية جديدة', account: 'استشارات قانونية ومهنية', entity: 'المجموعة الدولية للخبراء', amount: 150000, debit: 150000, credit: 0, cat: 'أتعاب' },

    // 7. Benford Leading Digit Distortions (Unnatural spike of 7s and 8s)
    { date: '2026-01-26', docNo: 'INV-2026-0120', desc: 'توريد بضائع مستودع فرع الإسكندرية', account: 'مخزون بضائع بغرض البيع', entity: 'الإسكندرية للتجارة والتوزيع', amount: 74200, debit: 74200, credit: 0, cat: 'بضائع' },
    { date: '2026-01-27', docNo: 'INV-2026-0121', desc: 'توريد مستلزمات تعبئة وتغليف كرتون', account: 'مواد تعبئة وتغليف', entity: 'مطابع النيل الدولية', amount: 71800, debit: 71800, credit: 0, cat: 'تعبئة' },
    { date: '2026-01-28', docNo: 'INV-2026-0122', desc: 'صيانة وتأهيل شاحنات التوزيع الكبيرة', account: 'صيانة سيارات ونقل', entity: 'ورشة السلام الميكانيكية', amount: 77500, debit: 77500, credit: 0, cat: 'صيانة' },
    { date: '2026-01-29', docNo: 'INV-2026-0123', desc: 'أعمال عزل حراري ومائي لمستودع العاشر', account: 'مصروفات صيانة مقرات', entity: 'الحديثة للعزل والإنشاءات', amount: 76300, debit: 76300, credit: 0, cat: 'عزل' },
    { date: '2026-01-30', docNo: 'INV-2026-0124', desc: 'شراء مضخات مياه احتياطية للدفاع المدني', account: 'تجهيزات ومعدات أمان', entity: 'مصر للسلامة ومكافحة الحريق', amount: 79100, debit: 79100, credit: 0, cat: 'سلامة' },

    // 8. RSF Spike (Single massive payment vs historical standard)
    { date: '2026-02-01', docNo: 'INV-2026-0201', desc: 'توريد أدوات نظافة وضيافة بوفيه شهرية', account: 'بوفيه وضيافة ونظافة', entity: 'مؤسسة الشروق للنظافة والتوريد', amount: 6200, debit: 6200, credit: 0, cat: 'بوفيه' },
    { date: '2026-02-05', docNo: 'INV-2026-0202', desc: 'توريد خامات تعقيم ومستلزمات دورية', account: 'بوفيه وضيافة ونظافة', entity: 'مؤسسة الشروق للنظافة والتوريد', amount: 7100, debit: 7100, credit: 0, cat: 'بوفيه' },
    { date: '2026-02-12', docNo: 'INV-2026-0203', desc: 'عملية تجديد شاملة وتوريد كرفانات حراسة', account: 'بوفيه وضيافة ونظافة', entity: 'مؤسسة الشروق للنظافة والتوريد', amount: 145000, debit: 145000, credit: 0, cat: 'بوفيه' },

    // 9. Standard Operational Cluster Items
    { date: '2026-02-14', docNo: 'INV-2026-0204', desc: 'اشتراك خدمات الإنترنت والألياف الضوئية', account: 'اتصالات وإنترنت', entity: 'الشركة المصرية للاتصالات WE', amount: 8450, debit: 8450, credit: 0, cat: 'مرافق' },
    { date: '2026-02-16', docNo: 'INV-2026-0205', desc: 'سداد رسوم فحص وتحاليل مخبرية للهيئة', account: 'رسوم حكومية ورخص', entity: 'هيئة سلامة الغذاء المصرية', amount: 11300, debit: 11300, credit: 0, cat: 'حكومي' },
    { date: '2026-02-18', docNo: 'INV-2026-0206', desc: 'وثيقة تأمين شامل ضد الحريق والسطو', account: 'تأمينات عامة', entity: 'مصر للتأمين', amount: 32500, debit: 32500, credit: 0, cat: 'تأمين' },
    { date: '2026-02-20', docNo: 'INV-2026-0207', desc: 'شراء ملابس وأحذية السلامة والصحة المهنية', account: 'مهمات سلامة مهنية', entity: 'العاشر للمهمات الوقائية', amount: 16800, debit: 16800, credit: 0, cat: 'مهمات' },
    { date: '2026-02-22', docNo: 'INV-2026-0208', desc: 'سداد مصروفات ميزان بسكول ونقل', account: 'نقل وانتقالات', entity: 'ميزان الأمل للمركبات', amount: 4850, debit: 4850, credit: 0, cat: 'نقل' },
    { date: '2026-02-24', docNo: 'INV-2026-0209', desc: 'سداد رسوم اشتراك الغرفة التجارية السنوي', account: 'رسوم واشتراكات مهنية', entity: 'الغرفة التجارية بالقاهرة', amount: 5500, debit: 5500, credit: 0, cat: 'رسوم' },
    { date: '2026-02-26', docNo: 'INV-2026-0210', desc: 'سداد مقابل استضافة سحابية ودومين', account: 'اشتراكات برمجية سحابية', entity: 'أمازون ويب سيرفسز AWS', amount: 23100, debit: 23100, credit: 0, cat: 'سحابة' },
  ];

  const rows: ExcelAuditRow[] = demoDataRaw.map((d, i) => ({
    id: `demo-row-${i + 1}`,
    rowIndex: i + 2,
    originalRowData: d,
    date: d.date,
    docNo: d.docNo,
    description: d.desc,
    account: d.account,
    entity: d.entity,
    amount: d.amount,
    debit: d.debit,
    credit: d.credit,
    category: d.cat,
    hasWarnings: false,
  }));

  const mapping: ColumnMappingConfig = {
    dateCol: { detectedColumn: 'تاريخ', confidence: 100, isManualOverride: false },
    amountCol: { detectedColumn: 'المبلغ', confidence: 100, isManualOverride: false },
    debitCol: { detectedColumn: 'مدين', confidence: 95, isManualOverride: false },
    creditCol: { detectedColumn: 'دائن', confidence: 95, isManualOverride: false },
    descriptionCol: { detectedColumn: 'البيان', confidence: 100, isManualOverride: false },
    docNoCol: { detectedColumn: 'رقم المستند', confidence: 98, isManualOverride: false },
    accountCol: { detectedColumn: 'الحساب', confidence: 98, isManualOverride: false },
    entityCol: { detectedColumn: 'الجهة', confidence: 95, isManualOverride: false },
    categoryCol: { detectedColumn: 'التصنيف', confidence: 90, isManualOverride: false },
  };

  return {
    rows,
    mapping,
    fileName: 'ملف_حسابات_الشركة_التجريبية_للفحص_الذكي_2026.xlsx',
  };
}

/**
 * Creates and downloads a standard formatted Excel Template (.xlsx) for client audit readiness
 */
export function generateStandardExcelTemplate(): Blob {
  const headers = [
    'تاريخ العملية',
    'رقم المستند / الفاتورة',
    'اسم / كود الحساب',
    'البيان والشرح التفصيلي',
    'اسم العميل أو المورد أو الجهة',
    'مدين (Debit)',
    'دائن (Credit)',
    'صافي المبلغ (Amount)',
    'مركز التكلفة / الفرع',
    'التصنيف والنوع',
    'ملاحظات المراجع الداخلي',
  ];

  const sampleRows = [
    ['2026-01-05', 'INV-2026-0001', '1210 - عملاء محليين', 'مبيعات بضائع نقدية بالفاتورة الضريبية', 'شركة النيل للتوزيع والتجارة', 54200, 0, 54200, 'فرع القاهرة', 'مبيعات', 'معتمد'],
    ['2026-01-08', 'PV-2026-0012', '3110 - إيجار مقرات', 'سداد إيجار مقر المخزن لشهر يناير', 'الشركة العقارية الدولية', 28000, 0, 28000, 'مخازن العاشر', 'مصروفات تشغيل', 'مرفق إيصال'],
    ['2026-01-12', 'JV-2026-0045', '2110 - موردين محليين', 'سداد مستحقات توريد خامات إنتاج بشيك', 'مصر للأسمدة والكيماويات', 0, 95000, 95000, 'الإدارة المركزية', 'سداد موردين', 'شيك بنكي'],
    ['2026-01-15', 'INV-2026-0088', '3340 - مصروفات نقل', 'نولون شحن ونقل بضائع لمحافظة أسيوط', 'الأسطول الحديث للنقل', 14800, 0, 14800, 'إدارة اللوجستيات', 'شحن وتوزيع', 'معتمد'],
    ['2026-01-20', 'TR-2026-0019', '1111 - بنك مصر حساب جاري', 'إيداع نقدي للمبيعات اليومية في الخزينة', 'خزينة المركز الرئيسي', 42150, 0, 42150, 'الإدارة المالية', 'حركة بنكية', 'قسيمة إيداع'],
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 22 }, // DocNo
    { wch: 24 }, // Account
    { wch: 38 }, // Desc
    { wch: 30 }, // Entity
    { wch: 16 }, // Debit
    { wch: 16 }, // Credit
    { wch: 18 }, // Amount
    { wch: 20 }, // Cost Center
    { wch: 18 }, // Category
    { wch: 24 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'قالب_فحص_البيانات_المحاسبية');

  // Add guide instructions sheet
  const guideHeaders = ['البند', 'الإرشادات المحاسبية لضمان سلامة الفحص'];
  const guideRows = [
    ['تاريخ العملية', 'يفضل كتابة التاريخ بصيغة YYYY-MM-DD أو DD/MM/YYYY'],
    ['المبالغ والكسور', 'إدخال المبالغ بالأرقام دون فواصل نصية أو رموز عملات مدمجة'],
    ['اسم الطرف (العميل/المورد)', 'توحيد كتابة أسماء الشركات لضمان دقة كشف العمليات المكررة والمجزأة'],
    ['رقم الفاتورة/المستند', 'تسجيل الرقم التسلسلي للمستند المؤيد لتمكين خوارزمية كشف الفجوات التسلسلية'],
    ['ترويسة الملف', 'يدعم النظام أي ترتيب للأعمدة وأي مسميات ترويسة باللغتين العربية والإنجليزية'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
  wsGuide['!cols'] = [{ wch: 25 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'دليل_الإدخال_والمعايير');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Exports Full Audit Report to multi-sheet Excel Workbook (.xlsx)
 */
export function exportAuditReportToExcel(
  summary: ExcelAuditDatasetSummary,
  anomalies: UnsupervisedMlAnomaly[],
  benford: BenfordAnalysisResult,
  rows: ExcelAuditRow[]
): Blob {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryAoa = [
    ['تقرير المراجعة والتدقيق الجنائي الذكي لملفات الإكسيل والبيانات المحاسبية'],
    ['مكتب المحاسب القانوني ومراقب الحسابات / محمد جميل مرعي'],
    ['معايير المراجعة المصرية (ESA 240 / ESA 315 / ESA 530) وقانون 18 لسنة 2019'],
    [''],
    ['المؤشر الرقابي', 'القيمة المقاسة', 'التصنيف والتقييم المهني'],
    ['اسم الملف المفحوص', summary.fileName, 'مصدر البيانات'],
    ['تاريخ الفحص والتحليل', summary.auditDate, 'تاريخ النظام'],
    ['إجمالي عدد الحركات المفحوصة', summary.validRowsCount, 'عينة شاملة 100%'],
    ['إجمالي القيمة المالية الإجمالية', `${summary.totalGrossAmount.toLocaleString('ar-EG')} ج.م`, 'إجمالي المجتمع الإحصائي'],
    ['متوسط قيمة العملية', `${summary.meanAmount.toLocaleString('ar-EG')} ج.م`, 'المتوسط الحسابي'],
    ['الوسيط المالي للعمليات', `${summary.medianAmount.toLocaleString('ar-EG')} ج.م`, 'الوسيط (Q2)'],
    ['الانحراف المعياري (Standard Deviation)', `${summary.stdDeviation.toLocaleString('ar-EG')} ج.م`, 'تشتت المجتمع'],
    ['درجة الخطر الرقابي الإجمالي', `${summary.overallRiskScore} / 100`, summary.overallRiskScore >= 70 ? 'مرتفع وحرج' : summary.overallRiskScore >= 40 ? 'متوسط' : 'منخفض ومستقر'],
    ['مطابقة قانون بنفورد للأرقام الأولى', benford.conformityLevel === 'CLOSE' ? 'مطابقة وثيقة (Close)' : benford.conformityLevel === 'ACCEPTABLE' ? 'مطابقة مقبولة' : 'انحراف وتشويه غير طبيعي (Non-Conforming)', `MAD = ${benford.meanAbsoluteDeviation}`],
    ['إجمالي الملاحظات والشواذ المرصودة', summary.anomaliesCount.total, 'عمليات تستوجب فحصاً يدوياً'],
    ['شواذ حرجة (Critical)', summary.anomaliesCount.critical, 'تستوجب إجراء فورياً'],
    ['شواذ مرتفعة الخطورة (High)', summary.anomaliesCount.high, 'فحص عينات موسعة'],
    ['شواذ متوسطة الخطورة (Medium)', summary.anomaliesCount.medium, 'فحص دوري واستفسار'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص_نتائج_المراجعة');

  // Sheet 2: Flagged Anomalies
  const anomHeaders = [
    'م',
    'السطر بالأصل',
    'تاريخ العملية',
    'رقم المستند',
    'اسم الطرف / الجهة',
    'الحساب المحاسبي',
    'المبلغ (ج.م)',
    'درجة الخطورة',
    'تصنيف الشذوذ',
    'درجة الشذوذ (0-100)',
    'التفسير الرياضي والإحصائي (XAI)',
    'التفسير المهني الرقابي (ESA)',
    'إجراء الفحص والتحقق اليدوي المطلوب',
    'حالة الفحص اليدوي',
  ];

  const anomRows = anomalies.map((a, idx) => [
    idx + 1,
    a.rowIndex,
    a.row.date,
    a.row.docNo,
    a.row.entity,
    a.row.account,
    a.row.amount,
    a.severity === 'CRITICAL' ? 'حرج' : a.severity === 'HIGH' ? 'مرتفع' : a.severity === 'MEDIUM' ? 'متوسط' : 'منخفض',
    a.title,
    a.score,
    a.mathematicalReason,
    a.auditingInterpretation,
    a.mandatoryManualAuditStep,
    a.isManuallyVerified ? 'تم التحقق اليدوي' : 'قيد الفحص والتوثيق',
  ]);

  const wsAnom = XLSX.utils.aoa_to_sheet([anomHeaders, ...anomRows]);
  wsAnom['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 24 },
    { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 40 }, { wch: 45 },
    { wch: 45 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAnom, 'الشواذ_والعمليات_المشبوهة');

  // Sheet 3: Benford's Law
  const benfordHeaders = [
    'الرقم الأول (Digit)',
    'التكرار الفعلي بالملف (Count)',
    'النسبة الفعلية المحققة (%)',
    'النسبة النظرية لقانون بنفورد (%)',
    'الانحراف المطلق (Deviation %)',
    'معامل الانحراف المعياري (Z-Score)',
    'حالة المؤشر',
  ];
  const benfordRows = benford.digitStats.map((d) => [
    d.digit,
    d.actualCount,
    `${d.actualPercentage}%`,
    `${d.expectedPercentage}%`,
    `${d.deviation > 0 ? '+' : ''}${d.deviation}%`,
    d.zScore,
    d.isAnomalous ? 'انحراف شاذ يستوجب الفحص' : 'طبيعي ومطابق',
  ]);
  const wsBenford = XLSX.utils.aoa_to_sheet([benfordHeaders, ...benfordRows]);
  wsBenford['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 26 }, { wch: 24 }, { wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsBenford, 'تحليل_قانون_بنفورد');

  // Sheet 4: Raw Normalized Rows
  const rawHeaders = ['السطر', 'التاريخ', 'رقم المستند', 'الحساب', 'البيان', 'الجهة', 'مدين', 'دائن', 'المبلغ', 'ملاحظة الفحص'];
  const rawDataRows = rows.map((r) => [
    r.rowIndex,
    r.date,
    r.docNo,
    r.account,
    r.description,
    r.entity,
    r.debit,
    r.credit,
    r.amount,
    r.hasWarnings ? 'مرصود به شذوذ' : 'مطابق مبدئياً',
  ]);
  const wsRaw = XLSX.utils.aoa_to_sheet([rawHeaders, ...rawDataRows]);
  wsRaw['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRaw, 'البيانات_المفحوصة_كاملة');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Exports Full Audit Report to Microsoft Word (.doc) with official letterhead, tables, and signatures
 */
export function exportAuditReportToWord(
  summary: ExcelAuditDatasetSummary,
  anomalies: UnsupervisedMlAnomaly[],
  benford: BenfordAnalysisResult
): Blob {
  const anomaliesTableRows = anomalies
    .slice(0, 100)
    .map(
      (a, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${i + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${a.rowIndex}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${a.row.date}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px;">${a.row.docNo || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px;">${a.row.entity || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold; color: #0f172a;">${a.row.amount.toLocaleString('ar-EG')} ج.م</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: ${
        a.severity === 'CRITICAL' ? '#dc2626' : a.severity === 'HIGH' ? '#ea580c' : '#ca8a04'
      };">
        ${a.severity === 'CRITICAL' ? 'حرج جداً' : a.severity === 'HIGH' ? 'مرتفع' : 'متوسط'}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>${a.title}</strong><br/><small style="color: #475569;">${a.mathematicalReason}</small></td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; color: #1e293b;">${a.mandatoryManualAuditStep}</td>
    </tr>
  `
    )
    .join('');

  const benfordTableRows = benford.digitStats
    .map(
      (d) => `
    <tr style="background-color: ${d.isAnomalous ? '#fef2f2' : '#ffffff'};">
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${d.digit}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${d.actualCount}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${d.actualPercentage}%</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${d.expectedPercentage}%</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: ${Math.abs(d.deviation) > 5 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
        ${d.deviation > 0 ? '+' : ''}${d.deviation}%
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${d.zScore}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: ${d.isAnomalous ? '#dc2626' : '#16a34a'};">
        ${d.isAnomalous ? 'انحراف غير طبيعي' : 'مطابق'}
      </td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>تقرير المراجعة والتدقيق الجنائي الذكي لملفات الإكسيل</title>
      <style>
        body {
          font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif;
          direction: rtl;
          text-align: right;
          margin: 20px;
          color: #0f172a;
          line-height: 1.6;
        }
        .header-box {
          border-bottom: 3px double #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
        }
        .title {
          font-size: 20pt;
          font-weight: bold;
          color: #0f172a;
          margin: 0;
        }
        .subtitle {
          font-size: 11pt;
          color: #475569;
          margin-top: 4px;
        }
        .meta-table, .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        .meta-table td {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
        }
        .data-table th {
          background-color: #0f172a;
          color: #ffffff;
          padding: 8px;
          border: 1px solid #0f172a;
          font-weight: bold;
          text-align: center;
        }
        .section-title {
          font-size: 13pt;
          font-weight: bold;
          color: #1e3a8a;
          border-right: 4px solid #1e3a8a;
          padding-right: 8px;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        .badge-critical {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: bold;
        }
        .memo-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 14px;
          margin-bottom: 20px;
          font-size: 10.5pt;
        }
        .footer-sign {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div>
          <h1 class="title">مكتب المحاسب القانوني ومراقب الحسابات</h1>
          <div class="subtitle">محمد جميل مرعي • زميل جمعية المحاسبين والمراجعين المصرية • سجل محاسبين رقم 12044</div>
          <div class="subtitle">مذكرة مراجعة إلكترونية وفحص جنائي مالي لملفات الشركات (ESA 240 / Law 18-2019)</div>
        </div>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 25%; font-weight: bold; background-color: #f1f5f9;">اسم الملف محل الفحص:</td>
          <td style="width: 25%;">${summary.fileName}</td>
          <td style="width: 25%; font-weight: bold; background-color: #f1f5f9;">تاريخ إتمام الفحص:</td>
          <td style="width: 25%;">${summary.auditDate}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f1f5f9;">إجمالي الحركات المفحوصة:</td>
          <td>${summary.validRowsCount} حركة محاسبية</td>
          <td style="font-weight: bold; background-color: #f1f5f9;">إجمالي القيمة الإجمالية:</td>
          <td><strong>${summary.totalGrossAmount.toLocaleString('ar-EG')} ج.م</strong></td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f1f5f9;">مؤشر الخطر الرقابي الإجمالي:</td>
          <td><strong>${summary.overallRiskScore} / 100</strong></td>
          <td style="font-weight: bold; background-color: #f1f5f9;">مطابقة قانون بنفورد (MAD):</td>
          <td>${benford.conformityLevel === 'CLOSE' ? 'مطابقة وثيقة' : benford.conformityLevel === 'ACCEPTABLE' ? 'مطابقة مقبولة' : 'انحراف وتشويه غير طبيعي'} (MAD: ${benford.meanAbsoluteDeviation})</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f1f5f9;">عدد الملاحظات والشواذ:</td>
          <td colspan="3">
            إجمالي (${summary.anomaliesCount.total}) عملية مرصودة: 
            <span style="color: #dc2626; font-weight: bold;">${summary.anomaliesCount.critical} حرج</span> • 
            <span style="color: #ea580c; font-weight: bold;">${summary.anomaliesCount.high} عالي</span> • 
            <span style="color: #ca8a04; font-weight: bold;">${summary.anomaliesCount.medium} متوسط</span>
          </td>
        </tr>
      </table>

      <div class="section-title">أولاً: الرأي المهني ومذكرة المراجع العام المدعومة بالذكاء الاصطناعي القابل للتفسير (XAI Memo)</div>
      <div class="memo-box">
        ${summary.aiExecutiveMemo ? summary.aiExecutiveMemo.replace(/\n/g, '<br/>') : 'تم فحص كامل الحركات المسجلة بالملف باستخدام خوارزميات العزل الإحصائي غير الخاضعة للإشراف وقانون بنفورد للأرقام الأولى واختبارات تجزئة المدفوعات وتكرار السداد. يوصى بإجراء فحص يدوي ومستندي لكافة العمليات المبينة بالجدول أدناه قبل إبداء الرأي النهائي أو اعتماد القوائم المالية.'}
      </div>

      <div class="section-title">ثانياً: نتائج فحص قانون بنفورد للأرقام الأولى (Benford's Law First-Digit Analysis)</div>
      <p style="font-size: 10pt; color: #475569;">يعتمد هذا الفحص على معيار المراجعة المصري ESA 240 لكشف التلاعب المحاسبي وتزوير الأرقام الصادرة عن التقدير الجزافي البشري.</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>الرقم البادئ</th>
            <th>العدد الفعلي</th>
            <th>النسبة الفعلية</th>
            <th>النسبة النظرية</th>
            <th>الانحراف المطلق</th>
            <th>Z-Score</th>
            <th>التقييم الرقابي</th>
          </tr>
        </thead>
        <tbody>
          ${benfordTableRows}
        </tbody>
      </table>

      <div class="section-title">ثالثاً: سجل العمليات الشاذة والملاحظات التي تستوجب المراجعة اليدوية (Substantive Audit Checklist)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 4%;">م</th>
            <th style="width: 6%;">السطر</th>
            <th style="width: 9%;">التاريخ</th>
            <th style="width: 10%;">المستند</th>
            <th style="width: 13%;">الطرف / الجهة</th>
            <th style="width: 12%;">المبلغ (ج.م)</th>
            <th style="width: 8%;">الخطورة</th>
            <th style="width: 20%;">نوع الشذوذ والسبب الرياضي</th>
            <th style="width: 18%;">إجراء التحقق اليدوي الإلزامي</th>
          </tr>
        </thead>
        <tbody>
          ${anomaliesTableRows}
        </tbody>
      </table>

      <div class="footer-sign">
        <div style="float: right; width: 45%; text-align: center;">
          <p><strong>المراجع المالي / مدقق البيانات</strong></p>
          <p style="margin-top: 40px;">.........................................</p>
        </div>
        <div style="float: left; width: 45%; text-align: center;">
          <p><strong>الشريك المسؤول / مراقب الحسابات</strong></p>
          <p><strong>أ/ محمد جميل مرعي</strong></p>
          <p style="margin-top: 25px;">[ختم وتوقيع مكتب المحاسب القانوني]</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    </body>
    </html>
  `;

  return new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
}
