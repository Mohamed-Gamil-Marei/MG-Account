/**
 * Automated Journal Entry Audit & Inspection Engine
 * محرك الفحص والتدقيق الآلي لقيود اليومية وفقاً لمعايير المراجعة المصرية (ESA)
 * فحص القيود المتكررة، غير المتوازنة، المفتقرة للمرفقات والمستندات الثبوتية، والشذوذ المحاسبي
 */

import { JournalEntry } from '../types';

export type AuditFindingType =
  | 'DUPLICATE_ENTRY'           // قيود متكررة أو شبه متكررة مشبوهة
  | 'UNBALANCED_ENTRY'          // قيد محاسبي غير متوازن (فروق مدين ودائن)
  | 'MISSING_ATTACHMENT'        // يفتقر لمرفق أو مستند مؤيد رسمي
  | 'UNPOSTED_ENTRY'            // قيود مسودة غير مرحلة للأستاذ العام
  | 'UNUSUAL_DATE_OR_CUTOFF'    // تواريخ غير اعتيادية أو قيود مستقبلية
  | 'MATERIAL_TRANSACTION'      // معاملات جوهرية تفوق حد الأهمية النسبية
  | 'ZERO_VALUE_LINES';         // أسطر قيد فارغة أو مبالغ صفرية

export type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AuditFinding {
  id: string;
  type: AuditFindingType;
  severity: AuditSeverity;
  title: string;
  description: string;
  recommendation: string; // توجيه وتوصية المراجع القانوني
  journalEntryId: string;
  entrySerialNumber: string;
  entryDate: string;
  entryDescription: string;
  entryTotalAmount: number;
  clientId?: string;
  clientName?: string;
  entryType: string;
  
  // Specific finding details
  duplicateOfEntryId?: string;
  duplicateOfSerial?: string;
  duplicateScore?: number; // 0 - 100% similarity
  varianceAmount?: number; // في حالة عدم التوازن
  isPosted: boolean;
  hasAttachment: boolean;
  
  // State for auditor interaction
  isReviewed?: boolean;
  auditorResolutionNote?: string;
  detectedAt: string;
}

export interface AuditScanSummary {
  totalEntriesScanned: number;
  totalFinancialVolume: number;
  totalFindingsCount: number;
  unbalancedCount: number;
  duplicatesCount: number;
  missingAttachmentsCount: number;
  unpostedCount: number;
  otherAnomaliesCount: number;
  
  criticalFindingsCount: number;
  highFindingsCount: number;
  mediumFindingsCount: number;
  lowFindingsCount: number;

  // Composite Audit Health Score (0 - 100%)
  auditHealthScore: number;
  healthGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_REVIEW' | 'CRITICAL_RISK';
  healthLabelAr: string;

  // Rate metrics
  balancedRate: number; // %
  attachmentRate: number; // %
  postedRate: number; // %
  uniquenessRate: number; // %

  flaggedFinancialExposure: number; // إجمالي مبالغ القيود محل الملاحظات
}

export interface AuditScanOptions {
  clientId?: string | null;
  fiscalYear?: number | null;
  materialityThreshold?: number; // حد الأهمية النسبية (افتراضي 50,000 ج.م)
  strictDateComparison?: boolean;
}

/**
 * Executes a comprehensive automated audit inspection on the journal entries
 */
export function runAutomatedJournalAudit(
  entries: JournalEntry[],
  options: AuditScanOptions = {}
): { findings: AuditFinding[]; summary: AuditScanSummary } {
  const materialityThreshold = options.materialityThreshold || 50000;
  
  // 1. Filter entries if client or year is specified
  let targetEntries = entries;
  if (options.clientId) {
    targetEntries = targetEntries.filter((e) => e.clientId === options.clientId || !e.clientId);
  }
  if (options.fiscalYear) {
    targetEntries = targetEntries.filter((e) => {
      const year = new Date(e.date).getFullYear();
      return year === options.fiscalYear;
    });
  }

  const findings: AuditFinding[] = [];
  const nowStr = new Date().toISOString();

  let unbalancedCount = 0;
  let duplicatesCount = 0;
  let missingAttachmentsCount = 0;
  let unpostedCount = 0;
  let otherAnomaliesCount = 0;
  let flaggedExposureSet = new Set<string>();

  // Set for tracking duplicates to avoid double-flagging the exact pair symmetrically
  const seenDuplicatePairs = new Set<string>();

  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i];
    const debitSum = entry.lines?.reduce((sum, l) => sum + (Number(l.debit) || 0), 0) || entry.totalDebit || 0;
    const creditSum = entry.lines?.reduce((sum, l) => sum + (Number(l.credit) || 0), 0) || entry.totalCredit || 0;
    const variance = Math.abs(debitSum - creditSum);

    const hasAttachment = Boolean(
      (entry.attachedFileUrl && entry.attachedFileUrl.trim().length > 0) ||
      (entry.attachedFileName && entry.attachedFileName.trim().length > 0)
    );

    // -------------------------------------------------------------
    // CHECK 1: Unbalanced Entries (القيود غير المتوازنة)
    // -------------------------------------------------------------
    if (variance > 0.01) {
      unbalancedCount++;
      flaggedExposureSet.add(entry.id);
      findings.push({
        id: `f-unbal-${entry.id}`,
        type: 'UNBALANCED_ENTRY',
        severity: 'CRITICAL',
        title: `قيد غير متوازن (فارق ${variance.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م)`,
        description: `القيد رقم ${entry.serialNumber} غير متطابق محاسبياً؛ إجمالي الطرف المدين (${debitSum.toLocaleString('ar-EG')} ج.م) يختلف عن الدائن (${creditSum.toLocaleString('ar-EG')} ج.م). هذا يخل بمبدأ القيد المزدوج وميزان المراجعة.`,
        recommendation: `يلزم موازنة أطراف القيد فوراً بإضافة أو تعديل الطرف الناقص أو ترحيل الفارق إلى حساب وسيط/تسويات معتمدة.`,
        journalEntryId: entry.id,
        entrySerialNumber: entry.serialNumber,
        entryDate: entry.date,
        entryDescription: entry.description,
        entryTotalAmount: Math.max(debitSum, creditSum),
        clientId: entry.clientId,
        clientName: entry.clientName,
        entryType: entry.entryType,
        varianceAmount: variance,
        isPosted: entry.isPosted,
        hasAttachment,
        detectedAt: nowStr,
      });
    }

    // -------------------------------------------------------------
    // CHECK 2: Missing Attachments (القيود المفتقرة للمرفقات)
    // -------------------------------------------------------------
    if (!hasAttachment) {
      missingAttachmentsCount++;
      const isMaterial = (entry.totalDebit || debitSum) >= materialityThreshold;
      const isMedium = (entry.totalDebit || debitSum) >= 15000;
      const severity: AuditSeverity = isMaterial ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW';

      if (isMaterial) {
        flaggedExposureSet.add(entry.id);
      }

      findings.push({
        id: `f-noatt-${entry.id}`,
        type: 'MISSING_ATTACHMENT',
        severity,
        title: isMaterial
          ? `قيد جوهري بدون مستند مؤيد (${(entry.totalDebit || debitSum).toLocaleString('ar-EG')} ج.م)`
          : `قيد يفتقر للمستندات والمرفقات الثبوتية`,
        description: `لم يتم إرفاق أصل الفاتورة أو إشعار التحصيل أو المستند المالي المؤيد للقيد ${entry.serialNumber} (${entry.description}).`,
        recommendation: isMaterial
          ? `وفقاً لمعيار المراجعة المصري (ESA 500)، يجب استيفاء أدلة الإثبات والمستندات الأصلية وتضمينها في أرشيف المراجعة.`
          : `يُوصى برفع صورة المستند أو إدراج رقم مرجع الفاتورة الإلكترونية لضمان الاعتماد الضريبي الكامل.`,
        journalEntryId: entry.id,
        entrySerialNumber: entry.serialNumber,
        entryDate: entry.date,
        entryDescription: entry.description,
        entryTotalAmount: entry.totalDebit || debitSum,
        clientId: entry.clientId,
        clientName: entry.clientName,
        entryType: entry.entryType,
        isPosted: entry.isPosted,
        hasAttachment: false,
        detectedAt: nowStr,
      });
    }

    // -------------------------------------------------------------
    // CHECK 3: Duplicate & Near-Duplicate Entries (القيود المتكررة المشبوهة)
    // -------------------------------------------------------------
    for (let j = i + 1; j < targetEntries.length; j++) {
      const other = targetEntries[j];
      const otherDebit = other.lines?.reduce((s, l) => s + (Number(l.debit) || 0), 0) || other.totalDebit || 0;
      
      const pairKey = [entry.id, other.id].sort().join(':::');
      if (seenDuplicatePairs.has(pairKey)) continue;

      const sameAmount = Math.abs(debitSum - otherDebit) < 0.01 && debitSum > 0;
      const sameClient = !entry.clientId || !other.clientId || entry.clientId === other.clientId;
      const daysDiff = Math.abs(
        (new Date(entry.date).getTime() - new Date(other.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check account signature matching
      const entryAccCodes = (entry.lines || []).map((l) => `${l.accountCode}:${l.debit}:${l.credit}`).sort().join('|');
      const otherAccCodes = (other.lines || []).map((l) => `${l.accountCode}:${l.debit}:${l.credit}`).sort().join('|');
      const isExactAccountMatch = entryAccCodes.length > 0 && entryAccCodes === otherAccCodes;

      const cleanDesc1 = (entry.description || '').trim().toLowerCase();
      const cleanDesc2 = (other.description || '').trim().toLowerCase();
      const isSameDesc = cleanDesc1 === cleanDesc2 && cleanDesc1.length > 5;

      let isDuplicate = false;
      let duplicateConfidence = 0;
      let reasonText = '';

      if (sameAmount && sameClient && isExactAccountMatch && daysDiff <= 15) {
        isDuplicate = true;
        duplicateConfidence = daysDiff === 0 ? 100 : 90;
        reasonText = `تطابق كامل في الحسابات والأطراف المدينة والدائنة والمبلغ (${debitSum.toLocaleString('ar-EG')} ج.م) خلال ${daysDiff === 0 ? 'نفس اليوم' : `${Math.round(daysDiff)} أيام`}`;
      } else if (sameAmount && sameClient && isSameDesc && daysDiff <= 30) {
        isDuplicate = true;
        duplicateConfidence = 85;
        reasonText = `تطابق تام في البيان والمبلغ (${debitSum.toLocaleString('ar-EG')} ج.م) بين القيدين`;
      }

      if (isDuplicate) {
        seenDuplicatePairs.add(pairKey);
        duplicatesCount++;
        flaggedExposureSet.add(entry.id);
        flaggedExposureSet.add(other.id);

        findings.push({
          id: `f-dup-${entry.id}-${other.id}`,
          type: 'DUPLICATE_ENTRY',
          severity: duplicateConfidence >= 90 ? 'CRITICAL' : 'HIGH',
          title: `اشتباه تكرار قيد محاسبي مع (${other.serialNumber})`,
          description: `تم رصد قيد مكرر محتمل بين القيد ${entry.serialNumber} والقيد ${other.serialNumber}. ${reasonText}.`,
          recommendation: `يرجى مراجعة كشف الحساب والتحقق مما إذا كانت المعاملة قد سُجلت مرتين (Double Booking) وإلغاء القيد الزائد لتفادي تضخيم الأرصدة.`,
          journalEntryId: entry.id,
          entrySerialNumber: entry.serialNumber,
          entryDate: entry.date,
          entryDescription: entry.description,
          entryTotalAmount: debitSum,
          clientId: entry.clientId,
          clientName: entry.clientName,
          entryType: entry.entryType,
          duplicateOfEntryId: other.id,
          duplicateOfSerial: other.serialNumber,
          duplicateScore: duplicateConfidence,
          isPosted: entry.isPosted,
          hasAttachment,
          detectedAt: nowStr,
        });
      }
    }

    // -------------------------------------------------------------
    // CHECK 4: Unposted Draft Entries (القيود غير المرحلة)
    // -------------------------------------------------------------
    if (!entry.isPosted) {
      unpostedCount++;
      findings.push({
        id: `f-unpost-${entry.id}`,
        type: 'UNPOSTED_ENTRY',
        severity: 'MEDIUM',
        title: `قيد مسودة غير مرحل للأستاذ العام (${entry.serialNumber})`,
        description: `القيد ${entry.serialNumber} مسجل كمسودة ولم يتم ترحيله نهائياً، وبالتالي لا تظهر أرقامه في ميزان المراجعة أو القوائم المالية.`,
        recommendation: `يلزم تدقيق القيد وترحيله رسمياً لإدراجه ضمن الحسابات الختامية للسنة المالية.`,
        journalEntryId: entry.id,
        entrySerialNumber: entry.serialNumber,
        entryDate: entry.date,
        entryDescription: entry.description,
        entryTotalAmount: debitSum,
        clientId: entry.clientId,
        clientName: entry.clientName,
        entryType: entry.entryType,
        isPosted: false,
        hasAttachment,
        detectedAt: nowStr,
      });
    }

    // -------------------------------------------------------------
    // CHECK 5: Zero-value or Empty Lines (أسطر صفرية أو فارغة)
    // -------------------------------------------------------------
    const hasZeroLines = entry.lines?.some(
      (l) => (!l.debit && !l.credit) || (Number(l.debit) === 0 && Number(l.credit) === 0)
    );
    if (hasZeroLines) {
      otherAnomaliesCount++;
      findings.push({
        id: `f-zeroline-${entry.id}`,
        type: 'ZERO_VALUE_LINES',
        severity: 'LOW',
        title: `قيد يحتوي على أسطر حسابات بمبالغ صفرية`,
        description: `يتضمن القيد ${entry.serialNumber} أسطر حسابات فارغة أو بقيم 0.00 ج.م لا لزوم لها في الدفتر.`,
        recommendation: `يُفضل تنظيف وحذف الأسطر الفارغة لتحسين جودة السجلات والدفاتر الرسمية.`,
        journalEntryId: entry.id,
        entrySerialNumber: entry.serialNumber,
        entryDate: entry.date,
        entryDescription: entry.description,
        entryTotalAmount: debitSum,
        clientId: entry.clientId,
        clientName: entry.clientName,
        entryType: entry.entryType,
        isPosted: entry.isPosted,
        hasAttachment,
        detectedAt: nowStr,
      });
    }

    // -------------------------------------------------------------
    // CHECK 6: Future Dates or Odd Cut-off
    // -------------------------------------------------------------
    const entryTime = new Date(entry.date).getTime();
    const todayEnd = new Date().setHours(23, 59, 59, 999);
    if (entryTime > todayEnd + 86400000 * 2) {
      otherAnomaliesCount++;
      findings.push({
        id: `f-futuredate-${entry.id}`,
        type: 'UNUSUAL_DATE_OR_CUTOFF',
        severity: 'HIGH',
        title: `قيد بتاريخ مستقبلي غير اعتيادي (${entry.date})`,
        description: `القيد رقم ${entry.serialNumber} مسجل بتاريخ مستقبلي يقع بعد التاريخ الحالي (${entry.date}).`,
        recommendation: `التحقق من صحة تاريخ المستند الفعلي أو تعديل القيد ليكون قيد تسوية استحقاق مؤجل.`,
        journalEntryId: entry.id,
        entrySerialNumber: entry.serialNumber,
        entryDate: entry.date,
        entryDescription: entry.description,
        entryTotalAmount: debitSum,
        clientId: entry.clientId,
        clientName: entry.clientName,
        entryType: entry.entryType,
        isPosted: entry.isPosted,
        hasAttachment,
        detectedAt: nowStr,
      });
    }
  }

  // Calculate Aggregates
  const totalEntriesScanned = targetEntries.length;
  const totalFinancialVolume = targetEntries.reduce((acc, e) => acc + (e.totalDebit || 0), 0);
  const totalFindingsCount = findings.length;

  const criticalFindingsCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highFindingsCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumFindingsCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowFindingsCount = findings.filter((f) => f.severity === 'LOW').length;

  // Rate Calculations
  const balancedEntriesCount = totalEntriesScanned - unbalancedCount;
  const balancedRate = totalEntriesScanned > 0 ? Math.round((balancedEntriesCount / totalEntriesScanned) * 100) : 100;
  
  const entriesWithAttachmentsCount = targetEntries.filter((e) => 
    Boolean((e.attachedFileUrl && e.attachedFileUrl.trim()) || (e.attachedFileName && e.attachedFileName.trim()))
  ).length;
  const attachmentRate = totalEntriesScanned > 0 ? Math.round((entriesWithAttachmentsCount / totalEntriesScanned) * 100) : 100;

  const postedEntriesCount = targetEntries.filter((e) => e.isPosted).length;
  const postedRate = totalEntriesScanned > 0 ? Math.round((postedEntriesCount / totalEntriesScanned) * 100) : 100;

  const uniquenessRate = totalEntriesScanned > 0 ? Math.max(0, Math.round(((totalEntriesScanned - duplicatesCount) / totalEntriesScanned) * 100)) : 100;

  // Composite Audit Health Score (0 - 100)
  // Weighting: Balanced (40%), Duplicates (25%), Attachments (20%), Posted (15%)
  let compositeScore = (balancedRate * 0.40) + (uniquenessRate * 0.25) + (attachmentRate * 0.20) + (postedRate * 0.15);
  compositeScore = Math.max(0, Math.min(100, Math.round(compositeScore)));

  // Critical deductions
  if (criticalFindingsCount > 0) {
    compositeScore = Math.min(compositeScore, Math.max(20, 85 - criticalFindingsCount * 15));
  }

  let healthGrade: AuditScanSummary['healthGrade'] = 'EXCELLENT';
  let healthLabelAr = 'ممتاز - الدفاتر سليمة وجاهزة للاعتماد';

  if (compositeScore >= 90 && criticalFindingsCount === 0) {
    healthGrade = 'EXCELLENT';
    healthLabelAr = 'ممتاز - الدفاتر سليمة ومطابقة للمعايير';
  } else if (compositeScore >= 75 && criticalFindingsCount === 0) {
    healthGrade = 'GOOD';
    healthLabelAr = 'جيد - يتطلب استيفاء بعض المرفقات والملاحظات';
  } else if (compositeScore >= 50 || criticalFindingsCount === 1) {
    healthGrade = 'NEEDS_REVIEW';
    healthLabelAr = 'يحتاج تدقيق - توجد ملاحظات تستوجب المعالجة الفورية';
  } else {
    healthGrade = 'CRITICAL_RISK';
    healthLabelAr = 'مرتفع المخاطر - قيود غير متوازنة ومكررة تعيق الاعتماد';
  }

  // Calculate flagged financial exposure amount
  let flaggedFinancialExposure = 0;
  targetEntries.forEach((e) => {
    if (flaggedExposureSet.has(e.id)) {
      flaggedFinancialExposure += (e.totalDebit || 0);
    }
  });

  // Sort findings by severity: CRITICAL first, then HIGH, then MEDIUM, then LOW
  const severityRank: Record<AuditSeverity, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    findings,
    summary: {
      totalEntriesScanned,
      totalFinancialVolume,
      totalFindingsCount,
      unbalancedCount,
      duplicatesCount,
      missingAttachmentsCount,
      unpostedCount,
      otherAnomaliesCount,
      criticalFindingsCount,
      highFindingsCount,
      mediumFindingsCount,
      lowFindingsCount,
      auditHealthScore: compositeScore,
      healthGrade,
      healthLabelAr,
      balancedRate,
      attachmentRate,
      postedRate,
      uniquenessRate,
      flaggedFinancialExposure,
    },
  };
}
