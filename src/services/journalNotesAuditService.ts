import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../utils/excelArabicStyler';

export type AuditIssueSeverity = 'HIGH' | 'MEDIUM' | 'INFO';

export type AuditIssueCategory =
  | 'CAPITAL_VS_EXPENSE'        // أصل رأسمالي موجه كمصروف دوري
  | 'REPAIRS_VS_CAPITALIZATION' // صيانة دورية مرسملة على الأصول
  | 'PREPAID_MISALLOCATION'     // مصروف مقدم موجه كمصروف فوري
  | 'CLIENT_SUPPLIER_MIX'       // خلط بين عميل ومورد
  | 'CUSTODY_VS_EXPENSE'        // عهد العاملين موجهة كمصروف نهائي
  | 'PARTNER_DRAWINGS'          // مسحوبات شخصية للشريك كمصروف شركة
  | 'FINANCING_VS_ADMIN'        // فوائد ومصاريف بنكية موجهة كإدارية
  | 'TAX_WITHHOLDING_MIX'       // خلط ضريبة الخصم والإضافة مع القيمة المضافة
  | 'INVENTORY_VS_EXPENSE'      // شراء بضاعة/خامات موجهة كمصروف نثري
  | 'REVENUE_MISCLASSIFICATION' // إيراد مبيعات مودع في حسابات وسيطة/دائنة
  | 'SALARIES_MISALLOCATION'    // أجور ورواتب موجهة لموردين أو خدمات
  | 'ENTRY_NUMBER_MISMATCH'     // اختلاف رقم القيد أو المرجع في الشرح
  | 'OTHER_MISALLOCATION';      // توجيه غير ملائم

export interface RawJournalRow {
  id: string;
  originalRowIndex: number;
  entryNo: string;
  date: string;
  accountCode: string;
  accountName: string;
  narration: string;
  debit: number;
  credit: number;
  reference?: string;
  costCenter?: string;
  originalRawRow?: any[];
  originalHeaders?: string[];
  [key: string]: any;
}

export interface AuditFinding {
  hasIssue: boolean;
  severity: AuditIssueSeverity;
  category: AuditIssueCategory;
  categoryLabel: string;
  issueDescription: string;
  accountingStandardRef: string;
  matchedKeywords: string[];
  suggestedAccountCode: string;
  suggestedAccountName: string;
  confidenceScore: number; // 0 to 100
  suggestedCorrectionEntry: {
    debitAccount: string;
    creditAccount: string;
    amount: number;
    explanation: string;
  };
}

export interface AuditedJournalRow extends RawJournalRow {
  audit: AuditFinding;
  userOverriddenAccount?: string;
  isResolved?: boolean;
}

export interface ForensicAnomaly {
  id: string;
  rowIndex: number;
  entryNo: string;
  date: string;
  accountName: string;
  accountCode?: string;
  narration: string;
  amount: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category:
    | 'ROUND_NUMBER'
    | 'LARGE_CASH_DRAWS'
    | 'SMURFING_THRESHOLD'
    | 'WEEKEND_OFFHOURS'
    | 'VAGUE_NARRATION'
    | 'DUPLICATE_PAYMENT'
    | 'CONTROL_OVERRIDE'
    | 'BENFORD_ANOMALY';
  title: string;
  description: string;
  recommendation: string;
  standardRef?: string;
}

export interface BenfordDigitStat {
  digit: number;
  actualCount: number;
  actualPercentage: number;
  expectedPercentage: number;
  deviation: number;
  isAnomalous: boolean;
}

export interface ForensicAuditAnalysisResult {
  overallRiskScore: number; // 0 to 100
  totalSampleAmounts: number;
  totalSampleValue: number;
  digitStats: BenfordDigitStat[];
  benfordStats: BenfordDigitStat[];
  anomalies: ForensicAnomaly[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  smurfingCount: number;
  roundNumbersCount: number;
  benfordAnomaliesCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuditSummaryStats {
  totalRows: number;
  totalEntriesCount: number;
  flaggedErrorsCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  cleanRowsCount: number;
  totalDiscrepancyAmount: number;
  categoryBreakdown: Record<AuditIssueCategory, number>;
}

// Arabic Text Normalizer for fuzzy matching
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // إزالة التشكيل
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Helper to test if any keyword is present
function findMatchingKeywords(text: string, keywords: string[]): string[] {
  const norm = normalizeText(text);
  const matched: string[] = [];
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    if (norm.includes(normKw)) {
      matched.push(kw);
    }
  }
  return matched;
}

export class JournalNotesAuditEngine {
  /**
   * Evaluates a single journal line against accounting audit heuristics
   */
  static auditLine(row: RawJournalRow): AuditFinding {
    const narrationNorm = normalizeText(row.narration);
    const accountNorm = normalizeText(row.accountName);
    const amount = Math.max(row.debit || 0, row.credit || 0);
    const isDebit = (row.debit || 0) > 0;

    // Default clean state
    const cleanFinding: AuditFinding = {
      hasIssue: false,
      severity: 'INFO',
      category: 'OTHER_MISALLOCATION',
      categoryLabel: 'توجيه سليم ومطابق',
      issueDescription: 'البيان متوافق مع طبيعة الحساب المختار ولا توجد مؤشرات تعارض.',
      accountingStandardRef: 'معايير المحاسبة المصرية (EAS)',
      matchedKeywords: [],
      suggestedAccountCode: row.accountCode,
      suggestedAccountName: row.accountName,
      confidenceScore: 98,
      suggestedCorrectionEntry: {
        debitAccount: row.accountName,
        creditAccount: row.accountName,
        amount: 0,
        explanation: 'القيد سليم ولا يحتاج لتسوية.',
      },
    };

    if (!row.narration || row.narration.trim().length < 2) {
      return {
        hasIssue: true,
        severity: 'MEDIUM',
        category: 'OTHER_MISALLOCATION',
        categoryLabel: 'بيان فارغ أو غير كافٍ',
        issueDescription: 'السطر بدون شرح أو بيان (Notes) واضح، مما يتعذر معه التحقق المهني من صحة التوجيه المحاسبي وفق متطلبات الرقابة الداخلية.',
        accountingStandardRef: 'معيار المحاسبة المصري (1) - متطلبات الإفصاح والتوثيق',
        matchedKeywords: ['بيان فارغ'],
        suggestedAccountCode: row.accountCode,
        suggestedAccountName: row.accountName,
        confidenceScore: 80,
        suggestedCorrectionEntry: {
          debitAccount: row.accountName,
          creditAccount: row.accountName,
          amount,
          explanation: 'إضافة شرح وافٍ للقيد يوضح العملية وأطرافها ورقم المستند المؤيد.',
        },
      };
    }

    // 1. CAPITAL_VS_EXPENSE: شراء أصل رأسمالي موجه كمصروف
    const capitalAssetKeywords = [
      'كمبيوتر', 'لاب توب', 'لابتوب', 'حاسب الي', 'سيرفر', 'طابعة', 'شاشة عرض',
      'مكيف', 'تكييف', 'مبرد', 'مولد كهرباء', 'ماكينة', 'الات ومعدات', 'موبايل ايفون',
      'هاتف محمول', 'سكانر', 'كاميرات مراقبة', 'سنترال', 'سيارة نقل', 'سيارة ملاكي',
      'عربة', 'شاحنة', 'موتوسيكل', 'مكاتب خشب', 'اثاث مكتبي', 'انتريه مكتب', 'خزينة حديد',
      'تجهيز مقر', 'تشطيبات وديكورات', 'برنامج حسابات مرخص', 'سيرفرات', 'بوفيه مكتبي'
    ];
    const assetMatched = findMatchingKeywords(row.narration, capitalAssetKeywords);
    const isBookedAsExpense =
      accountNorm.includes('مصروف') ||
      accountNorm.includes('عموميه') ||
      accountNorm.includes('اداريه') ||
      accountNorm.includes('نثريات') ||
      accountNorm.includes('مكتبيه') ||
      accountNorm.includes('مشتريات') ||
      accountNorm.includes('تشغيل') ||
      accountNorm.includes('ادوات');

    if (assetMatched.length > 0 && isBookedAsExpense) {
      let suggested = 'أصول ثابتة - آلات ومعدات وتجهيزات';
      let code = '1200';
      if (assetMatched.some((k) => ['كمبيوتر', 'لاب توب', 'سيرفر', 'طابعة', 'شاشة'].some((t) => k.includes(t)))) {
        suggested = 'أصول ثابتة - حاسبات آلية وتجهيزات تكنولوجية';
        code = '1230';
      } else if (assetMatched.some((k) => ['سيارة', 'عربة', 'شاحنة', 'موتوسيكل'].some((t) => k.includes(t)))) {
        suggested = 'أصول ثابتة - سيارات ووسائل نقل وانتقال';
        code = '1220';
      } else if (assetMatched.some((k) => ['اثاث', 'مكاتب', 'خزينة'].some((t) => k.includes(t)))) {
        suggested = 'أصول ثابتة - أثاث ومهمات ومكاتب';
        code = '1240';
      }

      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'CAPITAL_VS_EXPENSE',
        categoryLabel: 'مصروف رأسمالي (أصل ثابت) موجه كمصروف إيرادي',
        issueDescription: `البيان يشير صراحة لشراء/اقتناء أصل ثابت [${assetMatched.join(', ')}] بينما تم توجيهه لحساب المصروفات الجارية [${row.accountName}]. هذا يؤدي لتضخيم المصروفات بشكل مصطنع وخفض الأرباح بالمخالفة لمعيار الأصول الثابتة.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (10) - الأصول الثابتة وإهلاكها',
        matchedKeywords: assetMatched,
        suggestedAccountCode: code,
        suggestedAccountName: suggested,
        confidenceScore: 96,
        suggestedCorrectionEntry: {
          debitAccount: suggested,
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية وإعادة توجيه: رسملة تكلفة الأصول الثابتة (${assetMatched.join(', ')}) واستبعادها من المصروفات العمومية وفق معيار 10.`,
        },
      };
    }

    // 2. REPAIRS_VS_CAPITALIZATION: صيانة دورية مرسملة على الأصول
    const repairKeywords = [
      'صيانة دورية', 'تغيير زيت', 'تغيير فلاتر', 'اصلاح عطل', 'تصليح سباكة',
      'صيانة تكييف', 'غيار استهلاكي', 'صيانة مصعد', 'صيانة شبكة', 'دهانات دورية',
      'تشحيم', 'تربيط عفشة', 'غسيل وتلميع'
    ];
    const repairMatched = findMatchingKeywords(row.narration, repairKeywords);
    const isBookedAsFixedAsset =
      (accountNorm.includes('اصول ثابته') ||
       accountNorm.includes('سيارات') ||
       accountNorm.includes('مباني') ||
       accountNorm.includes('الات')) &&
      !accountNorm.includes('صيانه') &&
      !accountNorm.includes('مصروف');

    if (repairMatched.length > 0 && isBookedAsFixedAsset) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'REPAIRS_VS_CAPITALIZATION',
        categoryLabel: 'صيانة دورية إيرادية مرسملة بالخطأ على الأصول',
        issueDescription: `البيان يوضح أعمال صيانة دورية واستهلاكية [${repairMatched.join(', ')}] تم تحميلها على حساب الأصل الثابت [${row.accountName}] مما يؤدي لرسملة خاطئة لا تضيف لعمر الأصل الإنتاجي.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (10) - التفرقة بين نفقات الصيانة اللاحقة والإضافات الرأسمالية',
        matchedKeywords: repairMatched,
        suggestedAccountCode: '5220',
        suggestedAccountName: 'مصروفات عمومية وإدارية - صيانة وإصلاحات',
        confidenceScore: 94,
        suggestedCorrectionEntry: {
          debitAccount: 'مصروفات عمومية وإدارية - صيانة وإصلاحات',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية تصحيحية: إثبات مصاريف الصيانة الدورية كمصروف فترة واستبعادها من حساب الأصل الثابت.`,
        },
      };
    }

    // 3. PREPAID_MISALLOCATION: مصروف مقدم موجه كمصروف فوري
    const prepaidKeywords = [
      'ايجار سنوي', 'ايجار عن سنه', 'ايجار مقدم', 'عقد ايجار لسنه', 'سداد ايجار 6 شهور',
      'وثيقة تامين سنوي', 'تامين شامل سنوي', 'اشتراك سنوي', 'رخصة سيارة 3 سنوات',
      'دومين واستضافة 3 سنوات', 'عقد صيانة سنوي مقدم'
    ];
    const prepaidMatched = findMatchingKeywords(row.narration, prepaidKeywords);
    const isBookedAsDirectPeriodExpense =
      (accountNorm.includes('مصروف ايجار') ||
       accountNorm.includes('مصروف تامين') ||
       accountNorm.includes('مصاريف تشغيل') ||
       accountNorm.includes('عموميه')) &&
      !accountNorm.includes('مقدم') &&
      !accountNorm.includes('ارصده مدينه');

    if (prepaidMatched.length > 0 && isBookedAsDirectPeriodExpense) {
      return {
        hasIssue: true,
        severity: 'MEDIUM',
        category: 'PREPAID_MISALLOCATION',
        categoryLabel: 'مصروف مدفوع مقدماً محمل بالكامل على الفترة الحالية',
        issueDescription: `البيان يشير إلى نفقات تغطي فترة مستقبلية ممتدة [${prepaidMatched.join(', ')}] بينما تم تحميل كامل المبلغ على مصروفات الشهر/الفترة الحالية [${row.accountName}] بالمخالفة لمبدأ الاستحقاق.`,
        accountingStandardRef: 'مفهوم الاستحقاق المحاسبي ومعيار المحاسبة المصري رقم (1)',
        matchedKeywords: prepaidMatched,
        suggestedAccountCode: '1310',
        suggestedAccountName: 'أرصدة مدينة أخرى - مصروفات مدفوعة مقدماً',
        confidenceScore: 90,
        suggestedCorrectionEntry: {
          debitAccount: 'أرصدة مدينة أخرى - مصروفات مدفوعة مقدماً',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية استحقاق: ترحيل المتبقي من المصروف المدفوع مقدماً للأرصدة المدينة ليتم إهلاكه شهرياً.`,
        },
      };
    }

    // 4. CLIENT_SUPPLIER_MIX: خلط بين عميل ومورد
    const clientActionKeywords = ['تحصيل من العميل', 'سداد من العميل', 'دفعة العميل', 'شيك العميل', 'ايداع العميل', 'مستخلص عميل'];
    const clientActionMatched = findMatchingKeywords(row.narration, clientActionKeywords);
    const isSupplierAccount = accountNorm.includes('مورد') || accountNorm.includes('دائنون') || accountNorm.includes('اوراق دفع');

    if (clientActionMatched.length > 0 && isSupplierAccount) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'CLIENT_SUPPLIER_MIX',
        categoryLabel: 'توجيه تحصيل عميل على حساب الموردين',
        issueDescription: `البيان ينص على معاملة تخص (عميل) [${clientActionMatched.join(', ')}] في حين تم توجيه السطر على حساب الموردين [${row.accountName}]، مما يقلب طبيعة الحساب ويشوه مطابقة كشوف الحسابات.`,
        accountingStandardRef: 'معايير إثبات الالتزامات والأصول المتداولة (EAS 1)',
        matchedKeywords: clientActionMatched,
        suggestedAccountCode: '1130',
        suggestedAccountName: 'العملاء (ذمم مدينة تجارية)',
        confidenceScore: 97,
        suggestedCorrectionEntry: {
          debitAccount: row.accountName,
          creditAccount: 'العملاء (ذمم مدينة تجارية)',
          amount,
          explanation: `تصحيح توجيه: نقل التحصيل من حساب المورد إلى حساب العميل الصحيح لتصحيح الأرصدة.`,
        },
      };
    }

    const supplierActionKeywords = ['سداد للمورد', 'دفعة للمورد', 'شيك للمورد', 'تحويل للمورد', 'فاتورة المورد'];
    const supplierActionMatched = findMatchingKeywords(row.narration, supplierActionKeywords);
    const isClientAccount = accountNorm.includes('عميل') || accountNorm.includes('عملاء') || accountNorm.includes('مدينون') || accountNorm.includes('اوراق قبض');

    if (supplierActionMatched.length > 0 && isClientAccount) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'CLIENT_SUPPLIER_MIX',
        categoryLabel: 'توجيه سداد مورد على حساب العملاء',
        issueDescription: `البيان ينص صراحة على سداد أو دفعة تخص (مورد) [${supplierActionMatched.join(', ')}] في حين تم قيدها على حساب العملاء [${row.accountName}].`,
        accountingStandardRef: 'معايير المحاسبة المصرية (EAS 1)',
        matchedKeywords: supplierActionMatched,
        suggestedAccountCode: '2110',
        suggestedAccountName: 'الموردون (ذمم دائنة تجارية)',
        confidenceScore: 97,
        suggestedCorrectionEntry: {
          debitAccount: 'الموردون (ذمم دائنة تجارية)',
          creditAccount: row.accountName,
          amount,
          explanation: `تصحيح توجيه: تحميل السداد على حساب الموردين واستبعاده من حساب العملاء.`,
        },
      };
    }

    // 5. CUSTODY_VS_EXPENSE: عهد العاملين والمسحوبات المؤقتة
    const custodyKeywords = ['عهدة مؤقتة', 'صرف عهدة', 'عهدة نقدية', 'عهدة مشتريات', 'استعاضة عهدة', 'عهدة المهندس', 'عهدة الموظف'];
    const custodyMatched = findMatchingKeywords(row.narration, custodyKeywords);
    const isBookedAsFinalExpense =
      (accountNorm.includes('مصروف') || accountNorm.includes('عموميه') || accountNorm.includes('نثريات')) &&
      !accountNorm.includes('عهده') &&
      !accountNorm.includes('عهد');

    if (custodyMatched.length > 0 && isBookedAsFinalExpense) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'CUSTODY_VS_EXPENSE',
        categoryLabel: 'صرف عهدة موجه كمصروف نهائي قبل تقديم الفواتير',
        issueDescription: `البيان يوضح صرف عهدة نقدية للموظف [${custodyMatched.join(', ')}] بينما تم توجيهها كمصروف نهائي [${row.accountName}] فور خروج النقدية وقبل اعتماد فواتير التسوية الرسمية.`,
        accountingStandardRef: 'الرقابة الداخلية ومعيار العرض والإفصاح للأرصدة المدينة المتداولة',
        matchedKeywords: custodyMatched,
        suggestedAccountCode: '1320',
        suggestedAccountName: 'أرصدة مدينة أخرى - عهد العاملين',
        confidenceScore: 93,
        suggestedCorrectionEntry: {
          debitAccount: 'أرصدة مدينة أخرى - عهد العاملين',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية عهد: إثبات العهدة في ذمة الموظف لحين تقديم المستندات المؤيدة للصرف والتسوية.`,
        },
      };
    }

    // 6. PARTNER_DRAWINGS: مسحوبات شخصية للشريك محملة كمصروف شركة
    const partnerDrawKeywords = [
      'مسحوبات شخصية', 'مصاريف مدارس اولاد', 'مصاريف منزل الشريك', 'سفر عائلي',
      'مشتريات شخصية للشريك', 'سداد فيزا شخصية', 'مصاريف نادي الشريك'
    ];
    const partnerMatched = findMatchingKeywords(row.narration, partnerDrawKeywords);
    const isBookedAsCoExpense =
      accountNorm.includes('مصروف') ||
      accountNorm.includes('عموميه') ||
      accountNorm.includes('انتقالات') ||
      accountNorm.includes('ضيافه');

    if (partnerMatched.length > 0 && isBookedAsCoExpense) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'PARTNER_DRAWINGS',
        categoryLabel: 'مسحوبات شخصية للشريك محملة كمصروف شركة',
        issueDescription: `البيان يثبت نفقات ومسحوبات خاصة بالشريك [${partnerMatched.join(', ')}] تم تحميلها على مصروفات الشركة [${row.accountName}] بالمخالفة الصريحة لقانون الشركات وأحكام الفحص الضريبي.`,
        accountingStandardRef: 'مبدأ استقلال الوحدة الاقتصادية وأحكام المادة 17 من قانون الضريبة على الدخل',
        matchedKeywords: partnerMatched,
        suggestedAccountCode: '3210',
        suggestedAccountName: 'حقوق الملكية - جاري الشركاء (مسحوبات)',
        confidenceScore: 98,
        suggestedCorrectionEntry: {
          debitAccount: 'حقوق الملكية - جاري الشركاء (مسحوبات)',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية جاري الشركاء: استبعاد النفقات الشخصية من مصروفات الشركة وتحميلها على الحساب الجاري للشريك.`,
        },
      };
    }

    // 7. FINANCING_VS_ADMIN: فوائد ومصاريف بنكية موجهة كمصروفات عامة
    const bankFeeKeywords = ['عمولة تحويل', 'عمولة بنكية', 'مصاريف سويفت', 'فوائد مدينة', 'عمولة فتح اعتماد', 'عمولة كشف حساب', 'دمغة بنكية'];
    const bankMatched = findMatchingKeywords(row.narration, bankFeeKeywords);
    const isBookedAsAdmin = accountNorm.includes('عموميه') || accountNorm.includes('نثريات') || accountNorm.includes('مورد');

    if (bankMatched.length > 0 && isBookedAsAdmin) {
      return {
        hasIssue: true,
        severity: 'MEDIUM',
        category: 'FINANCING_VS_ADMIN',
        categoryLabel: 'أعباء وعمولات بنكية موجهة كمصروفات عمومية أو موردين',
        issueDescription: `البيان يخص عمولات وفوائد مصرفية [${bankMatched.join(', ')}] وُجهت كبند إداري عام أو مورد [${row.accountName}]. يتطلب الإفصاح المالي فصل الأعباء التمويلية عن المصروفات التشغيلية.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (1) - قائمة الدخل وتبويب النفقات التمويلية',
        matchedKeywords: bankMatched,
        suggestedAccountCode: '5310',
        suggestedAccountName: 'أعباء ومصروفات تمويلية وبنكية',
        confidenceScore: 92,
        suggestedCorrectionEntry: {
          debitAccount: 'أعباء ومصروفات تمويلية وبنكية',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية إفصاح: إعادة تبويب العمولات والفوائد البنكية ضمن المصروفات التمويلية بقائمة الدخل.`,
        },
      };
    }

    // 8. TAX_WITHHOLDING_MIX: خلط ضريبة الخصم والإضافة مع القيمة المضافة
    const whtKeywords = ['خصم 1%', 'خصم 3%', 'ضريبة خصم واضافة', 'خصم وتحصيل', 'اتص', 'ارباح تجارية وصناعية'];
    const whtMatched = findMatchingKeywords(row.narration, whtKeywords);
    const isVatAccount = accountNorm.includes('قيمه مضافه') || accountNorm.includes('vat');

    if (whtMatched.length > 0 && isVatAccount) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'TAX_WITHHOLDING_MIX',
        categoryLabel: 'خلط ضريبة الخصم والتحصيل (أ.ت.ص) مع ضريبة القيمة المضافة',
        issueDescription: `البيان يخص ضريبة الخصم والتحصيل تحت حساب الضريبة [${whtMatched.join(', ')}] بينما تم قيدها على حساب ضريبة القيمة المضافة [${row.accountName}] مما يسبب تضارباً جسيماً مع مأمورية الضرائب.`,
        accountingStandardRef: 'قانون الإجراءات الضريبية الموحد وقانون الضريبة على الدخل',
        matchedKeywords: whtMatched,
        suggestedAccountCode: '2130',
        suggestedAccountName: 'مصلحة الضرائب - ضريبة الخصم والتحصيل (أ.ت.ص)',
        confidenceScore: 96,
        suggestedCorrectionEntry: {
          debitAccount: isDebit ? 'مصلحة الضرائب - ضريبة الخصم والتحصيل' : row.accountName,
          creditAccount: isDebit ? row.accountName : 'مصلحة الضرائب - ضريبة الخصم والتحصيل',
          amount,
          explanation: `تسوية ضريبية: نقل مبالغ الخصم والتحصيل لحسابها المخصص وفصلها عن حسابات القيمة المضافة.`,
        },
      };
    }

    // 9. INVENTORY_VS_EXPENSE: شراء بضاعة/خامات موجهة كمصروف نثري
    const inventoryKeywords = ['شراء بضاعة', 'خامات تصنيع', 'بضاعة للبيع', 'قطع غيار بغرض البيع', 'رسالة استيراد'];
    const invMatched = findMatchingKeywords(row.narration, inventoryKeywords);
    const isPettyExpense = accountNorm.includes('نثريات') || accountNorm.includes('ادوات كتابيه') || accountNorm.includes('ضيافه');

    if (invMatched.length > 0 && isPettyExpense) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'INVENTORY_VS_EXPENSE',
        categoryLabel: 'شراء بضاعة أو خامات موجهة كمصروف نثري',
        issueDescription: `البيان يخص مشتريات بضاعة أو مواد إنتاجية [${invMatched.join(', ')}] وجهت لحساب نثريات أو مصروفات بسيطة [${row.accountName}] مما يشوه تكلفة البضاعة المباعة ومخزون نهاية المدة.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (2) - المخزون',
        matchedKeywords: invMatched,
        suggestedAccountCode: '1140',
        suggestedAccountName: 'المخزون / المشتريات (تكلفة النشاط الجاري)',
        confidenceScore: 94,
        suggestedCorrectionEntry: {
          debitAccount: 'المخزون / المشتريات (تكلفة النشاط الجاري)',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية مخزون: إثبات البضاعة المشتراة ضمن تكلفة المبيعات أو المخزون واستبعادها من النثريات.`,
        },
      };
    }

    // 10. REVENUE_MISCLASSIFICATION: إيراد مبيعات مودع في حسابات وسيطة أو جاري شركاء
    const revenueKeywords = ['ايراد مبيعات', 'فاتورة بيع نقدي', 'مبيعات المعرض', 'ايراد خدمات استشارية', 'تحصيل اتعاب'];
    const revMatched = findMatchingKeywords(row.narration, revenueKeywords);
    const isIntermediateOrLiability =
      accountNorm.includes('جاري الشركاء') ||
      accountNorm.includes('ارصده دائنه') ||
      accountNorm.includes('تامينات للغير');

    if (revMatched.length > 0 && isIntermediateOrLiability) {
      return {
        hasIssue: true,
        severity: 'HIGH',
        category: 'REVENUE_MISCLASSIFICATION',
        categoryLabel: 'إيرادات نشاط رئيسية موجهة لحسابات التزامات أو جاري الشركاء',
        issueDescription: `البيان يثبت تحقيق إيرادات مبيعات أو خدمات [${revMatched.join(', ')}] تم توجيهها بالخطأ لحساب دائن أو جاري الشركاء [${row.accountName}] مما يخفي إيرادات الشركة وقائمة الدخل.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (48) - الإيراد من العقود مع العملاء',
        matchedKeywords: revMatched,
        suggestedAccountCode: '4110',
        suggestedAccountName: 'إيرادات النشاط الجاري (المبيعات والخدمات)',
        confidenceScore: 95,
        suggestedCorrectionEntry: {
          debitAccount: row.accountName,
          creditAccount: 'إيرادات النشاط الجاري (المبيعات والخدمات)',
          amount,
          explanation: `تسوية إيرادات: الاعتراف بإيرادات النشاط الجاري في قائمة الدخل وتصحيح الحساب الوسيط.`,
        },
      };
    }

    // 11. SALARIES_MISALLOCATION: أجور ورواتب موجهة لموردين أو خدمات
    const salaryKeywords = ['رواتب شهر', 'مرتبات العاملين', 'حوافز موظفين', 'اجور العماله', 'بدل سكن موظف', 'مكافاة نهاية خدمة'];
    const salMatched = findMatchingKeywords(row.narration, salaryKeywords);
    const isBookedAsSupplier = accountNorm.includes('موردين') || accountNorm.includes('خدمات خارجيه');

    if (salMatched.length > 0 && isBookedAsSupplier) {
      return {
        hasIssue: true,
        severity: 'MEDIUM',
        category: 'SALARIES_MISALLOCATION',
        categoryLabel: 'رواتب وأجور موجهة لحساب الموردين',
        issueDescription: `البيان يوضح صرف رواتب وأجور [${salMatched.join(', ')}] بينما تم توجيهها لحساب الموردين [${row.accountName}]، مما يخل بوعاء ضريبة كسب العمل ونسب التأمينات الاجتماعية.`,
        accountingStandardRef: 'معيار المحاسبة المصري رقم (38) - مزايا العاملين',
        matchedKeywords: salMatched,
        suggestedAccountCode: '5110',
        suggestedAccountName: 'مصروفات عمومية - أجور ومرتبات العاملين',
        confidenceScore: 93,
        suggestedCorrectionEntry: {
          debitAccount: 'مصروفات عمومية - أجور ومرتبات العاملين',
          creditAccount: row.accountName,
          amount,
          explanation: `تسوية أجور: إعادة توجيه الرواتب لحساب الأجور والمرتبات واستبعادها من الموردين.`,
        },
      };
    }

    return cleanFinding;
  }

  /**
   * Audits an entire batch of journal rows
   */
  static auditDataset(rows: RawJournalRow[]): {
    auditedRows: AuditedJournalRow[];
    stats: AuditSummaryStats;
  } {
    const auditedRows: AuditedJournalRow[] = [];
    const categoryBreakdown: Record<AuditIssueCategory, number> = {
      CAPITAL_VS_EXPENSE: 0,
      REPAIRS_VS_CAPITALIZATION: 0,
      PREPAID_MISALLOCATION: 0,
      CLIENT_SUPPLIER_MIX: 0,
      CUSTODY_VS_EXPENSE: 0,
      PARTNER_DRAWINGS: 0,
      FINANCING_VS_ADMIN: 0,
      TAX_WITHHOLDING_MIX: 0,
      INVENTORY_VS_EXPENSE: 0,
      REVENUE_MISCLASSIFICATION: 0,
      SALARIES_MISALLOCATION: 0,
      ENTRY_NUMBER_MISMATCH: 0,
      OTHER_MISALLOCATION: 0,
    };

    let flaggedErrorsCount = 0;
    let highSeverityCount = 0;
    let mediumSeverityCount = 0;
    let cleanRowsCount = 0;
    let totalDiscrepancyAmount = 0;
    const uniqueEntryNumbers = new Set<string>();

    rows.forEach((row, idx) => {
      uniqueEntryNumbers.add(row.entryNo || `entry-${idx}`);
      const finding = this.auditLine(row);

      if (finding.hasIssue) {
        flaggedErrorsCount++;
        categoryBreakdown[finding.category] = (categoryBreakdown[finding.category] || 0) + 1;
        totalDiscrepancyAmount += Math.max(row.debit || 0, row.credit || 0);

        if (finding.severity === 'HIGH') {
          highSeverityCount++;
        } else if (finding.severity === 'MEDIUM') {
          mediumSeverityCount++;
        }
      } else {
        cleanRowsCount++;
      }

      auditedRows.push({
        ...row,
        audit: finding,
      });
    });

    const stats: AuditSummaryStats = {
      totalRows: rows.length,
      totalEntriesCount: uniqueEntryNumbers.size,
      flaggedErrorsCount,
      highSeverityCount,
      mediumSeverityCount,
      cleanRowsCount,
      totalDiscrepancyAmount,
      categoryBreakdown,
    };

    return { auditedRows, stats };
  }

  /**
   * Forensic Accounting & Fraud Red Flags Engine (ISA 240 & Benford's Law)
   * Analyzes rows for financial manipulation, split smurfing, round figures, off-hour postings, and Benford curve deviations.
   */
  static analyzeForensics(rows: RawJournalRow[]): ForensicAuditAnalysisResult {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const expectedPercentages: Record<number, number> = {
      1: 30.1,
      2: 17.6,
      3: 12.5,
      4: 9.7,
      5: 7.9,
      6: 6.7,
      7: 5.8,
      8: 5.1,
      9: 4.6,
    };

    let totalAmountsCount = 0;
    let totalSampleValue = 0;
    const anomalies: ForensicAnomaly[] = [];
    const seenAmountsMap = new Map<string, { rowIndex: number; entryNo: string; date: string }>();

    rows.forEach((row, idx) => {
      const amt = Math.max(row.debit || 0, row.credit || 0);
      const accNorm = normalizeText(row.accountName);
      const narrNorm = normalizeText(row.narration);
      const rIndex = row.originalRowIndex || idx + 1;

      if (amt >= 10) {
        totalAmountsCount++;
        totalSampleValue += amt;

        // Benford first digit
        const firstDigitStr = amt.toString().replace(/[^1-9]/, '').charAt(0);
        const digit = parseInt(firstDigitStr, 10);
        if (digit >= 1 && digit <= 9) {
          counts[digit]++;
        }

        // Rule 1: Round Numbers Anomaly (الأرقام الدائرية المقفولة المصطنعة)
        if (
          amt >= 20000 &&
          amt % 10000 === 0 &&
          !accNorm.includes('راس المال') &&
          !accNorm.includes('قرض') &&
          !accNorm.includes('بنك')
        ) {
          anomalies.push({
            id: `forensic-round-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: amt >= 100000 ? 'CRITICAL' : 'HIGH',
            category: 'ROUND_NUMBER',
            title: `مبلغ دائري مقفول مصطنع (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تم قيد مبلغ دائري دون كسور بحساب [${row.accountName}]، وهو نمط متكرر عند فبركة الأرقام أو الصرف بدون فواتير تفصيلية رسمية.`,
            recommendation: 'فحص المستند المؤيد الأصلي، وإشعار الخصم والإضافة، والتحقق من عدم التقدير الجزافي غير المستندي.',
            standardRef: 'معيار المراجعة الدولي ISA 240 فقرة A37',
          });
        }

        // Rule 2: Large Cash Withdrawals (مخالفة السحب النقدي المباشر قانون 18 لسنة 2019)
        if (
          amt >= 50000 &&
          (accNorm.includes('صندوق') || accNorm.includes('نقديه') || accNorm.includes('خزينه') || narrNorm.includes('نقدا')) &&
          (row.debit > 0 || !row.credit)
        ) {
          anomalies.push({
            id: `forensic-cash-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: 'CRITICAL',
            category: 'LARGE_CASH_DRAWS',
            title: `سحب نقدي ضخم مخالف لقانون المدفوعات غير النقدية (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تم صرف أو سحب مبلغ نقدي يتجاوز الحدود القصوى المقررة بقانون تنظيم وسائل الدفع غير النقدي رقم 18 لسنة 2019.`,
            recommendation: 'مراجعة محضر الجرد وإذن الصرف، وإلزام المنشأة بالسداد عبر وسائل الدفع الإلكتروني أو الشيكات لتفادي الغرامات الضريبية.',
            standardRef: 'القانون 18 لسنة 2019 & ISA 250',
          });
        }

        // Rule 3: Smurfing / Threshold Split (تجزئة وتفتيت المبالغ للهروب من حدود التفويض)
        if (
          (amt >= 4800 && amt <= 4999) ||
          (amt >= 9600 && amt <= 9999) ||
          (amt >= 48000 && amt <= 49999) ||
          (amt >= 96000 && amt <= 99999)
        ) {
          anomalies.push({
            id: `forensic-smurf-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: 'HIGH',
            category: 'SMURFING_THRESHOLD',
            title: `شبهة تفتيت وتجزئة المبلغ للهروب من التفويض الرقابي (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `المبلغ يقع تحت سقف التفويض المالي مباشرة، وهو مؤشر قوي على تجزئة الفواتير لتفادي اعتماد الإدارة العليا.`,
            recommendation: 'فحص المعاملات المجاورة لنفس المورد أو المستفيد للتحقق من تجزئة أوامر الشراء.',
            standardRef: 'ISA 240 (Management Override & Fraud Red Flags)',
          });
        }

        // Rule 4: Suspicious / Vague Narration (بيانات مبهمة وتلاعب محاسبي)
        const suspiciousKeywords = [
          'تسوية عاجلة', 'تسويات عاجلة', 'بدون مستند', 'مؤقت', 'معلق', 'فروق جرد',
          'امانة خاصة', 'تعديل رصيد', 'حساب وسيط', 'مجهول', 'طوارئ', 'تعليمات شفهية',
          'استثنائي', 'بدون فاتورة', 'تحت التسوية', 'فروقات غير معروفة'
        ];
        const matchedSusp = suspiciousKeywords.filter((k) => narrNorm.includes(normalizeText(k)));
        if (matchedSusp.length > 0) {
          anomalies.push({
            id: `forensic-narr-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: amt >= 40000 ? 'CRITICAL' : 'HIGH',
            category: 'VAGUE_NARRATION',
            title: `بيان قيد مشبوه وعالي المخاطر الرقابية (${matchedSusp.join('، ')})`,
            description: `يتضمن الشرح عبارات [${matchedSusp.join('، ')}] تشير إلى غياب المستندات المؤيدة أو استخدام حسابات وسيطة معلقة لحجب التلاعب.`,
            recommendation: 'استبعاد التسوية من الأرباح المعتمدة ضريبياً لحين تقديم المستندات الرسمية الموثقة.',
            standardRef: 'ISA 240 فقرة A38 & معيار المحاسبة المصري 1',
          });
        } else if ((!row.narration || row.narration.trim().length === 0) && amt >= 20000) {
          anomalies.push({
            id: `forensic-blank-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: 'فارغ تماماً (بدون شرح)',
            amount: amt,
            severity: 'HIGH',
            category: 'VAGUE_NARRATION',
            title: `حركة بمبلغ جوهري بدون تدوين أي بيان (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تم قيد حركة دائنة/مدينة جوهرية بدون كتابة أي شرح أو بيان يوضح طبيعة العملية أو الجهة المستفيدة.`,
            recommendation: 'استيفاء إذن الصرف وأصل الفاتورة وتوثيق البيان في الدفاتر لمنع المساءلة القانونية.',
            standardRef: 'المادة 22 من قانون التجارة & معايير الرقابة الداخلية',
          });
        }

        // Rule 5: Duplicate Payments / Invoices (شبهة دفع مكرر لنفس الحساب والقيمة)
        const dupKey = `${row.accountName}-${amt}-${row.date}`;
        if (seenAmountsMap.has(dupKey) && amt >= 5000) {
          const prev = seenAmountsMap.get(dupKey)!;
          anomalies.push({
            id: `forensic-dup-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: 'HIGH',
            category: 'DUPLICATE_PAYMENT',
            title: `شبهة تكرار صرف أو فاتورة مكررة (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تكرار نفس المبلغ وتاريخ القيد مع سطر سابق (صف رقم ${prev.rowIndex}، قيد #${prev.entryNo})، مما يشير إلى صرف مكرر أو ازدواج قيدي.`,
            recommendation: 'مطابقة كشف حساب المورد ورقم إشعار البنك للتأكد من عدم تكرار الخصم.',
            standardRef: 'إجراءات التدقيق الجنائي الداخلي لمنع الهدر المالي',
          });
        } else {
          seenAmountsMap.set(dupKey, { rowIndex: rIndex, entryNo: row.entryNo, date: row.date });
        }

        // Rule 6: Sensitive Control Override (التسويات المباشرة على الأرباح المرحلة ورأس المال)
        if (
          (accNorm.includes('ارباح مرحله') ||
            accNorm.includes('ارباح محتجزه') ||
            accNorm.includes('راس المال') ||
            accNorm.includes('حسابات الشركاء الجاريه')) &&
          amt >= 20000 &&
          !narrNorm.includes('توزيع ارباح') &&
          !narrNorm.includes('زياده راس المال')
        ) {
          anomalies.push({
            id: `forensic-override-${row.id || idx}`,
            rowIndex: rIndex,
            entryNo: row.entryNo,
            date: row.date,
            accountName: row.accountName,
            accountCode: row.accountCode,
            narration: row.narration,
            amount: amt,
            severity: 'CRITICAL',
            category: 'CONTROL_OVERRIDE',
            title: `قيد تسوية مباشر على حقوق الملكية والأرباح المرحلة (${amt.toLocaleString('ar-EG')} ج.م)`,
            description: `تسجيل قيد تسوية على حساب الأرباح المرحلة أو حقوق الملكية مباشرة متجاوزاً قائمة الدخل بدون سند جمعية عمومية.`,
            recommendation: 'طلب محضر اجتماع الجمعية العامة غير العادية وموافقة مراجع الحسابات الخارجي المعتمدة.',
            standardRef: 'معيار المحاسبة الدولي IAS 1 & معيار المراجعة ISA 240',
          });
        }

        // Rule 7: Weekend Postings (عطلات نهاية الأسبوع)
        if (row.date) {
          try {
            const d = new Date(row.date);
            const dayOfWeek = d.getDay(); // 5 = Friday, 6 = Saturday
            if ((dayOfWeek === 5 || dayOfWeek === 6) && amt >= 35000) {
              anomalies.push({
                id: `forensic-wknd-${row.id || idx}`,
                rowIndex: rIndex,
                entryNo: row.entryNo,
                date: row.date,
                accountName: row.accountName,
                accountCode: row.accountCode,
                narration: row.narration,
                amount: amt,
                severity: 'MEDIUM',
                category: 'WEEKEND_OFFHOURS',
                title: `قيد مرحل في عطلة أسبوعية رسمية (${amt.toLocaleString('ar-EG')} ج.م)`,
                description: `تم إثبات القيد في يوم عطلة رسمية (الجمعة/السبت)، وهو مؤشر على محاولات ترحيل عمليات بمعزل عن الرقابة المباشرة.`,
                recommendation: 'التحقق من سجل إدخال المستخدمين (User Log) وتأكيد تصريح العمل بالعطلات.',
                standardRef: 'ISA 240 فقرة A39',
              });
            }
          } catch {
            // ignore date parse errors
          }
        }
      }
    });

    // Benford Digit Stats
    const digitStats: BenfordDigitStat[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
      const count = counts[digit] || 0;
      const actualPercentage = totalAmountsCount > 0 ? Number(((count / totalAmountsCount) * 100).toFixed(1)) : 0;
      const expectedPercentage = expectedPercentages[digit];
      const deviation = Number(Math.abs(actualPercentage - expectedPercentage).toFixed(1));
      const isAnomalous = totalAmountsCount > 25 && deviation > 6.5;

      return {
        digit,
        actualCount: count,
        actualPercentage,
        expectedPercentage,
        deviation,
        isAnomalous,
      };
    });

    const anomalousDigits = digitStats.filter((d) => d.isAnomalous);
    if (anomalousDigits.length > 0) {
      anomalies.push({
        id: `forensic-benford-general`,
        rowIndex: 0,
        entryNo: 'عام إحصائي',
        date: new Date().toISOString().split('T')[0],
        accountName: 'تحليل قانون بنفورد',
        accountCode: '',
        narration: `انحراف إحصائي غير طبيعي في الأرقام: ${anomalousDigits.map((d) => d.digit).join('، ')}`,
        amount: totalSampleValue,
        severity: 'HIGH',
        category: 'BENFORD_ANOMALY',
        title: `انحراف إحصائي عن قانون بنفورد الطبيعي (الرقم ${anomalousDigits.map((d) => d.digit).join('، ')})`,
        description: `أظهرت البيانات تكراراً غير طبيعي للأرقام التي تبدأ بالخانة (${anomalousDigits.map((d) => d.digit).join('، ')}) بانحراف يتجاوز الحد المسموح، مما يعزز فرضية افتعال أو تقدير الأرقام يدوياً.`,
        recommendation: 'توسيع حجم العينة المختارة للمراجعة المستندية وتكثيف التحقق من مصادر القيود.',
        standardRef: 'Benford’s Law in Forensic Accounting & ISA 240',
      });
    }

    const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;

    // Calculate Overall Risk Score (0 - 100)
    let computedScore =
      anomalousDigits.length * 8 +
      criticalCount * 22 +
      highCount * 9 +
      mediumCount * 3;
    if (totalAmountsCount > 0 && computedScore > 100) computedScore = 100;
    if (totalAmountsCount === 0) computedScore = 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (computedScore >= 75) riskLevel = 'CRITICAL';
    else if (computedScore >= 45) riskLevel = 'HIGH';
    else if (computedScore >= 20) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    const smurfingCount = anomalies.filter((a) => a.category === 'SMURFING_THRESHOLD').length;
    const roundNumbersCount = anomalies.filter((a) => a.category === 'ROUND_NUMBER').length;
    const benfordAnomaliesCount = anomalousDigits.length;

    return {
      overallRiskScore: computedScore,
      totalSampleAmounts: totalAmountsCount,
      totalSampleValue,
      digitStats,
      benfordStats: digitStats,
      anomalies,
      criticalCount,
      highCount,
      mediumCount,
      smurfingCount,
      roundNumbersCount,
      benfordAnomaliesCount,
      riskLevel,
    };
  }

  /**
   * Smart File Reader: Handles Excel (.xlsx/.xls) and CSV files
   */
  static parseUploadedFile(file: File): Promise<RawJournalRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawJson || rawJson.length === 0) {
            reject(new Error('الملف فارغ أو لا يحتوي على بيانات.'));
            return;
          }

          // Detect Header Row (find row with highest keywords match)
          const headerKeywords = [
            'قيد', 'تاريخ', 'حساب', 'بيان', 'شرح', 'مدين', 'دائن',
            'entry', 'date', 'account', 'narration', 'description', 'notes', 'debit', 'credit'
          ];

          let bestHeaderRowIndex = 0;
          let maxMatches = 0;

          for (let r = 0; r < Math.min(rawJson.length, 10); r++) {
            const rowStr = rawJson[r].map((cell) => String(cell || '').toLowerCase()).join(' ');
            const matches = headerKeywords.filter((kw) => rowStr.includes(kw)).length;
            if (matches > maxMatches) {
              maxMatches = matches;
              bestHeaderRowIndex = r;
            }
          }

          const headerRow = rawJson[bestHeaderRowIndex].map((h) => String(h || '').trim());

          // Map column indices
          const colMap: Record<string, number> = {
            entryNo: -1,
            date: -1,
            accountCode: -1,
            accountName: -1,
            narration: -1,
            debit: -1,
            credit: -1,
          };

          headerRow.forEach((colName, idx) => {
            const norm = normalizeText(colName);
            if (colMap.entryNo === -1 && (norm.includes('قيد') || norm.includes('رقم') || norm.includes('ref') || norm.includes('voucher') || norm.includes('entry'))) {
              colMap.entryNo = idx;
            } else if (colMap.date === -1 && (norm.includes('تاريخ') || norm.includes('date'))) {
              colMap.date = idx;
            } else if (colMap.accountCode === -1 && (norm.includes('كود') || norm.includes('code'))) {
              colMap.accountCode = idx;
            } else if (colMap.accountName === -1 && (norm.includes('حساب') || norm.includes('اسم الحساب') || norm.includes('account'))) {
              colMap.accountName = idx;
            } else if (colMap.narration === -1 && (norm.includes('بيان') || norm.includes('شرح') || norm.includes('ملاحظ') || norm.includes('نوتس') || norm.includes('desc') || norm.includes('narr') || norm.includes('note'))) {
              colMap.narration = idx;
            } else if (colMap.debit === -1 && (norm.includes('مدين') || norm.includes('منه') || norm.includes('debit') || norm.includes('dr'))) {
              colMap.debit = idx;
            } else if (colMap.credit === -1 && (norm.includes('دائن') || norm.includes('له') || norm.includes('credit') || norm.includes('cr'))) {
              colMap.credit = idx;
            }
          });

          // Fallbacks if some columns weren't matched
          if (colMap.accountName === -1) {
            // Find first text column that isn't date or narration
            colMap.accountName = headerRow.findIndex((_, idx) => idx !== colMap.date && idx !== colMap.narration && idx !== colMap.entryNo);
          }
          if (colMap.narration === -1) {
            // Try to find any remaining column with 'تفاصيل' or take next available column
            colMap.narration = headerRow.findIndex((_, idx) => idx !== colMap.accountName && idx !== colMap.debit && idx !== colMap.credit);
          }

          const parsedRows: RawJournalRow[] = [];

          for (let i = bestHeaderRowIndex + 1; i < rawJson.length; i++) {
            const row = rawJson[i];
            if (!row || row.every((c) => c === '' || c === undefined || c === null)) continue;

            const entryNoVal = colMap.entryNo !== -1 ? String(row[colMap.entryNo] || '').trim() : `JV-${i}`;
            const dateVal = colMap.date !== -1 ? String(row[colMap.date] || '').trim() : new Date().toISOString().split('T')[0];
            const accountCodeVal = colMap.accountCode !== -1 ? String(row[colMap.accountCode] || '').trim() : '';
            const accountNameVal = colMap.accountName !== -1 ? String(row[colMap.accountName] || '').trim() : 'حساب عام';
            const narrationVal = colMap.narration !== -1 ? String(row[colMap.narration] || '').trim() : '';

            const debitNum = colMap.debit !== -1 ? parseFloat(String(row[colMap.debit]).replace(/,/g, '')) || 0 : 0;
            const creditNum = colMap.credit !== -1 ? parseFloat(String(row[colMap.credit]).replace(/,/g, '')) || 0 : 0;

            // Skip empty spacer lines
            if (!accountNameVal && !narrationVal && debitNum === 0 && creditNum === 0) continue;

            parsedRows.push({
              id: `row-${i}-${Date.now()}`,
              originalRowIndex: i + 1,
              entryNo: entryNoVal || `JV-${i}`,
              date: dateVal,
              accountCode: accountCodeVal,
              accountName: accountNameVal || 'حساب غير محدد',
              narration: narrationVal,
              debit: debitNum,
              credit: creditNum,
              originalRawRow: row,
              originalHeaders: headerRow,
            });
          }

          resolve(parsedRows);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('تعذر قراءة محتويات الملف.'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Generates a sample misallocated dataset for instant 1-click testing
   */
  static getSampleMisallocatedDataset(): RawJournalRow[] {
    return [
      {
        id: 'sample-1',
        originalRowIndex: 2,
        entryNo: 'JV-2026/014',
        date: '2026-01-15',
        accountCode: '5210',
        accountName: 'مصروفات عمومية وإدارية - أدوات كتابية ومكتبية',
        narration: 'شراء عدد 4 أجهزة كمبيوتر لابتوب Dell للمهندسين وطابعة ليزر للمكتب',
        debit: 95000,
        credit: 0,
      },
      {
        id: 'sample-2',
        originalRowIndex: 3,
        entryNo: 'JV-2026/014',
        date: '2026-01-15',
        accountCode: '1110',
        accountName: 'النقدية بالصندوق والخزينة',
        narration: 'سداد قيمة أجهزة اللاب توب للمهندسين نقداً',
        debit: 0,
        credit: 95000,
      },
      {
        id: 'sample-3',
        originalRowIndex: 4,
        entryNo: 'JV-2026/019',
        date: '2026-01-20',
        accountCode: '1220',
        accountName: 'أصول ثابتة - سيارات ووسائل نقل',
        narration: 'صيانة دورية وتغيير زيت وفلاتر وإصلاح فرامل سيارة الشركة نقل',
        debit: 14500,
        credit: 0,
      },
      {
        id: 'sample-4',
        originalRowIndex: 5,
        entryNo: 'JV-2026/019',
        date: '2026-01-20',
        accountCode: '1120',
        accountName: 'البنك التجاري الدولي (حساب جاري)',
        narration: 'سداد تكلفة صيانة السيارة بشيك بنكي رقم 4402',
        debit: 0,
        credit: 14500,
      },
      {
        id: 'sample-5',
        originalRowIndex: 6,
        entryNo: 'JV-2026/024',
        date: '2026-02-01',
        accountCode: '5230',
        accountName: 'مصروف إيجار المقر الإداري',
        narration: 'سداد إيجار مقر الشركة الرئيسي عن سنة كاملة مقدماً حتى فبراير 2027',
        debit: 240000,
        credit: 0,
      },
      {
        id: 'sample-6',
        originalRowIndex: 7,
        entryNo: 'JV-2026/024',
        date: '2026-02-01',
        accountCode: '1120',
        accountName: 'البنك التجاري الدولي (حساب جاري)',
        narration: 'سداد إيجار سنوي مقدم بشيك مصرفي',
        debit: 0,
        credit: 240000,
      },
      {
        id: 'sample-7',
        originalRowIndex: 8,
        entryNo: 'JV-2026/031',
        date: '2026-02-10',
        accountCode: '2110',
        accountName: 'الموردون - شركة الأهرام للتوريدات',
        narration: 'تحصيل من العميل شركة النور للمقاولات دفعة تحت الحساب بشيك',
        debit: 180000,
        credit: 0,
      },
      {
        id: 'sample-8',
        originalRowIndex: 9,
        entryNo: 'JV-2026/031',
        date: '2026-02-10',
        accountCode: '1120',
        accountName: 'البنك التجاري الدولي (حساب جاري)',
        narration: 'إيداع شيك التحصيل من العميل شركة النور',
        debit: 0,
        credit: 180000,
      },
      {
        id: 'sample-9',
        originalRowIndex: 10,
        entryNo: 'JV-2026/045',
        date: '2026-02-18',
        accountCode: '5290',
        accountName: 'مصروفات عمومية وإدارية - ضيافة وبوفيه ونثريات',
        narration: 'صرف عهدة نقدية مؤقتة للمهندس أحمد لشراء مستلزمات موقع العاصمة',
        debit: 35000,
        credit: 0,
      },
      {
        id: 'sample-10',
        originalRowIndex: 11,
        entryNo: 'JV-2026/045',
        date: '2026-02-18',
        accountCode: '1110',
        accountName: 'النقدية بالصندوق والخزينة',
        narration: 'صرف عهدة نقدية لمسؤول الموقع',
        debit: 0,
        credit: 35000,
      },
      {
        id: 'sample-11',
        originalRowIndex: 12,
        entryNo: 'JV-2026/058',
        date: '2026-03-02',
        accountCode: '5280',
        accountName: 'مصروفات عمومية وإدارية - سفر وانتقالات',
        narration: 'مسحوبات شخصية للشريك وسداد مصاريف مدارس الأولاد الخاصة',
        debit: 50000,
        credit: 0,
      },
      {
        id: 'sample-12',
        originalRowIndex: 13,
        entryNo: 'JV-2026/058',
        date: '2026-03-02',
        accountCode: '1120',
        accountName: 'البنك الأهلي المصري (حساب جاري)',
        narration: 'تحويل بنكي لمصاريف المدارس الخاصة بالشريك',
        debit: 0,
        credit: 50000,
      },
      {
        id: 'sample-13',
        originalRowIndex: 14,
        entryNo: 'JV-2026/063',
        date: '2026-03-12',
        accountCode: '2120',
        accountName: 'مصلحة الضرائب - ضريبة القيمة المضافة (دائنة)',
        narration: 'خصم وتحصيل تحت حساب الضريبة (أ.ت.ص 1%) من فاتورة مقاول الباطن',
        debit: 0,
        credit: 4200,
      },
      {
        id: 'sample-14',
        originalRowIndex: 15,
        entryNo: 'JV-2026/070',
        date: '2026-03-25',
        accountCode: '5110',
        accountName: 'مصروفات عمومية - الأجور والمرتبات',
        narration: 'سداد رواتب وأجور العاملين والموظفين عن شهر مارس 2026 بشيك بنكي',
        debit: 125000,
        credit: 0,
      },
    ];
  }

  /**
   * Generates a fully formatted Excel workbook for download
   */
  static exportAuditReportToExcel(auditedRows: AuditedJournalRow[], stats: AuditSummaryStats): void {
    const wb = XLSX.utils.book_new();

    // 1. Audit Report Sheet
    const reportData = auditedRows.map((row) => ({
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'كود الحساب المسجل': row.accountCode || '-',
      'اسم الحساب المسجل حالياً': row.accountName,
      'البيان والشرح (Notes)': row.narration,
      'مدين': row.debit || 0,
      'دائن': row.credit || 0,
      'حالة التدقيق': row.audit.hasIssue ? '⚠️ توجيه خاطئ / يحتاج تصحيح' : '✅ توجيه سليم',
      'درجة الأهمية': row.audit.severity === 'HIGH' ? 'حرجة (عالية)' : row.audit.severity === 'MEDIUM' ? 'متوسطة' : 'عادية',
      'نوع المخالفة المحاسبية': row.audit.categoryLabel,
      'شرح وتفصيل الخطأ': row.audit.issueDescription,
      'السند والمعيار المحاسبي': row.audit.accountingStandardRef,
      'الحساب المقترح البديل': row.userOverriddenAccount || row.audit.suggestedAccountName,
      'قيد التسوية المقترح (من حـ/)': row.audit.suggestedCorrectionEntry.debitAccount,
      'قيد التسوية المقترح (إلى حـ/)': row.audit.suggestedCorrectionEntry.creditAccount,
      'مبلغ التسوية': row.audit.suggestedCorrectionEntry.amount,
      'شرح قيد التسوية': row.audit.suggestedCorrectionEntry.explanation,
    }));

    const wsReport = XLSX.utils.json_to_sheet(reportData);
    formatWorksheetForArabicExport(wsReport, reportData, [
      { wch: 14 }, // entry
      { wch: 12 }, // date
      { wch: 14 }, // code
      { wch: 30 }, // account
      { wch: 45 }, // narration
      { wch: 14 }, // debit
      { wch: 14 }, // credit
      { wch: 22 }, // status
      { wch: 14 }, // severity
      { wch: 32 }, // category
      { wch: 55 }, // desc
      { wch: 35 }, // standard
      { wch: 35 }, // suggested
      { wch: 30 }, // dr
      { wch: 30 }, // cr
      { wch: 15 }, // amt
      { wch: 45 }, // exp
    ]);

    XLSX.utils.book_append_sheet(wb, wsReport, 'تقرير الفحص وإعادة التوجيه');

    // 2. Clean Corrected Journal (Ready for ERP Re-Import)
    const correctedJournalData = auditedRows.map((row) => ({
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'الحساب المصحح': row.userOverriddenAccount || (row.audit.hasIssue ? row.audit.suggestedAccountName : row.accountName),
      'كود الحساب': row.audit.hasIssue && !row.userOverriddenAccount ? row.audit.suggestedAccountCode : row.accountCode,
      'البيان': row.narration,
      'مدين': row.debit || 0,
      'دائن': row.credit || 0,
      'ملاحظة إعادة التوجيه': row.audit.hasIssue ? `تم تعديله من: [${row.accountName}]` : 'أصلي معتمد',
    }));

    const wsCorrected = XLSX.utils.json_to_sheet(correctedJournalData);
    formatWorksheetForArabicExport(wsCorrected, correctedJournalData, [
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
      { wch: 15 },
      { wch: 45 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 },
    ]);
    XLSX.utils.book_append_sheet(wb, wsCorrected, 'شيت القيود بعد التصحيح');

    // 3. Summary KPI Sheet
    const summaryData = [
      { 'المؤشر': 'إجمالي السطور المفحوصة', 'القيمة': stats.totalRows },
      { 'المؤشر': 'إجمالي القيود المفحوصة', 'القيمة': stats.totalEntriesCount },
      { 'المؤشر': 'السطور ذات التوجيه الخاطئ', 'القيمة': stats.flaggedErrorsCount },
      { 'المؤشر': 'أخطاء حرجة (High Severity)', 'القيمة': stats.highSeverityCount },
      { 'المؤشر': 'ملاحظات متوسطة (Medium)', 'القيمة': stats.mediumSeverityCount },
      { 'المؤشر': 'سطور موجهة بصورة سليمة', 'القيمة': stats.cleanRowsCount },
      { 'المؤشر': 'إجمالي المبالغ الخاضعة لإعادة التوجيه (ج.م)', 'القيمة': stats.totalDiscrepancyAmount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    formatWorksheetForArabicExport(wsSummary, summaryData, [
      { wch: 45 },
      { wch: 25 },
    ]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص مؤشرات التدقيق');

    writeArabicExcelFile(wb, `تقرير_فحص_وتصحيح_توجيه_القيود_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Exports dedicated Errors & Suggested Adjusting Entries spreadsheet (شيت المشاكل والتصحيح فقط)
   */
  static exportErrorsAndAdjustmentsOnly(
    auditedRows: AuditedJournalRow[],
    stats: AuditSummaryStats,
    originalFileName?: string
  ): void {
    const wb = XLSX.utils.book_new();

    // 1. Errors by Row Sheet
    const flaggedRows = auditedRows.filter((r) => r.audit.hasIssue);
    const errorsData = flaggedRows.map((row) => ({
      'رقم الصف بالملف الأصلي': row.originalRowIndex,
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'الحساب المسجل حالياً (الخطأ)': row.accountName,
      'كود الحساب المسجل': row.accountCode || '-',
      'البيان والشرح في الملف': row.narration,
      'المبلغ (ج.م)': (row.debit || 0) > 0 ? row.debit : row.credit,
      'نوع الخطأ المحاسبي': row.audit.categoryLabel,
      'شرح سبب الخطأ بالتفصيل': row.audit.issueDescription,
      'التوجيه المحاسبي السليم': row.userOverriddenAccount || row.audit.suggestedAccountName,
      'كود الحساب الصحيح': row.audit.suggestedAccountCode,
      'قيد التسوية المصحح (من حـ/)': row.audit.suggestedCorrectionEntry.debitAccount,
      'قيد التسوية المصحح (إلى حـ/)': row.audit.suggestedCorrectionEntry.creditAccount,
      'مبلغ قيد التسوية': row.audit.suggestedCorrectionEntry.amount,
      'شرح قيد التسوية المقترح': row.audit.suggestedCorrectionEntry.explanation,
      'السند والمعيار المحاسبي': row.audit.accountingStandardRef,
      'درجة الخطورة': row.audit.severity === 'HIGH' ? 'حرجة' : row.audit.severity === 'MEDIUM' ? 'متوسطة' : 'عادية',
    }));

    const wsErrors = XLSX.utils.json_to_sheet(
      errorsData.length > 0
        ? errorsData
        : [{ 'ملاحظة': 'لا توجد أخطاء توجيه في الملف المفحوص، كافة القيود سليمة وموجهة طبقاً للمعايير.' }]
    );

    formatWorksheetForArabicExport(
      wsErrors,
      errorsData.length > 0 ? errorsData : undefined,
      [
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
        { wch: 32 },
        { wch: 16 },
        { wch: 45 },
        { wch: 16 },
        { wch: 30 },
        { wch: 55 },
        { wch: 35 },
        { wch: 16 },
        { wch: 32 },
        { wch: 32 },
        { wch: 16 },
        { wch: 45 },
        { wch: 35 },
        { wch: 14 },
      ]
    );
    XLSX.utils.book_append_sheet(wb, wsErrors, 'الأخطاء وقيود التسوية');

    // 2. Clean Corrected Journal (Ready for ERP Import)
    const correctedJournalData = auditedRows.map((row) => ({
      'رقم الصف': row.originalRowIndex,
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'الحساب بعد التصحيح': row.userOverriddenAccount || (row.audit.hasIssue ? row.audit.suggestedAccountName : row.accountName),
      'كود الحساب الصحيح': row.audit.hasIssue && !row.userOverriddenAccount ? row.audit.suggestedAccountCode : row.accountCode,
      'البيان': row.narration,
      'مدين': row.debit || 0,
      'دائن': row.credit || 0,
      'حالة التعديل': row.audit.hasIssue
        ? `تم تعديله من [${row.accountName}] إلى [${row.userOverriddenAccount || row.audit.suggestedAccountName}]`
        : 'أصلي بدون تعديل',
    }));

    const wsCorrected = XLSX.utils.json_to_sheet(correctedJournalData);
    formatWorksheetForArabicExport(wsCorrected, correctedJournalData);
    XLSX.utils.book_append_sheet(wb, wsCorrected, 'القيود المصححة للترحيل ERP');

    // 3. Summary
    const summaryData = [
      { 'المؤشر': 'إجمالي السطور المفحوصة', 'القيمة': stats.totalRows },
      { 'المؤشر': 'إجمالي القيود المفحوصة', 'القيمة': stats.totalEntriesCount },
      { 'المؤشر': 'السطور ذات التوجيه الخاطئ', 'القيمة': stats.flaggedErrorsCount },
      { 'المؤشر': 'أخطاء حرجة (High Severity)', 'القيمة': stats.highSeverityCount },
      { 'المؤشر': 'ملاحظات متوسطة (Medium)', 'القيمة': stats.mediumSeverityCount },
      { 'المؤشر': 'سطور موجهة بصورة سليمة', 'القيمة': stats.cleanRowsCount },
      { 'المؤشر': 'إجمالي المبالغ الخاضعة لإعادة التوجيه (ج.م)', 'القيمة': stats.totalDiscrepancyAmount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    formatWorksheetForArabicExport(wsSummary, summaryData, [{ wch: 45 }, { wch: 25 }]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص التدقيق');

    const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, '') : 'القيود';
    writeArabicExcelFile(wb, `شيت_الأخطاء_وقيود_التسوية_${baseName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Exports the EXACT original uploaded file rows/columns with appended Audit Columns
   * plus a dedicated Discrepancy by Row Number report sheet as requested by the user.
   */
  static exportOriginalWithAuditAnnotations(
    auditedRows: AuditedJournalRow[],
    stats: AuditSummaryStats,
    originalFileName?: string,
    forensicResult?: ForensicAuditAnalysisResult
  ): void {
    const wb = XLSX.utils.book_new();

    // Check if we have originalRawRow and originalHeaders from file upload
    const hasOriginalRawData = auditedRows.length > 0 && Array.isArray(auditedRows[0].originalRawRow);

    let originalHeaders: string[] = [];
    if (hasOriginalRawData && auditedRows[0].originalHeaders && auditedRows[0].originalHeaders.length > 0) {
      originalHeaders = [...auditedRows[0].originalHeaders];
    } else {
      originalHeaders = [
        'رقم القيد',
        'التاريخ',
        'كود الحساب',
        'اسم الحساب',
        'البيان / الشرح',
        'مدين',
        'دائن',
      ];
    }

    // Map forensic anomalies by row index or row id
    const forensicByRow = new Map<number, ForensicAnomaly[]>();
    if (forensicResult && forensicResult.anomalies) {
      forensicResult.anomalies.forEach((a) => {
        if (a.rowIndex > 0) {
          const arr = forensicByRow.get(a.rowIndex) || [];
          arr.push(a);
          forensicByRow.set(a.rowIndex, arr);
        }
      });
    }

    // New Audit Columns to append
    const auditExtraHeaders = [
      'حالة التدقيق',
      'هل يوجد خطأ في التوجيه؟',
      'نوع الخطأ المحاسبي',
      'تفصيل الخطأ المحاسبي والسند',
      'التوجيه المحاسبي الصحيح (الحساب المقترح)',
      'كود الحساب المقترح',
      'قيد التسوية المقترح (من حـ/)',
      'قيد التسوية المقترح (إلى حـ/)',
      'مبلغ الخطأ / التسوية',
      'مخاطر التدليس والغش (ISA 240)',
      'درجة الخطورة',
    ];

    const allSheetHeaders = [...originalHeaders, ...auditExtraHeaders];

    // Build the rows array of arrays (AOA)
    const exportAoa: any[][] = [];
    exportAoa.push(allSheetHeaders);

    auditedRows.forEach((row) => {
      let baseRowData: any[] = [];
      if (hasOriginalRawData && row.originalRawRow) {
        baseRowData = [...row.originalRawRow];
        // Ensure baseRowData length matches originalHeaders length
        while (baseRowData.length < originalHeaders.length) {
          baseRowData.push('');
        }
      } else {
        baseRowData = [
          row.entryNo,
          row.date,
          row.accountCode || '',
          row.accountName,
          row.narration,
          row.debit || 0,
          row.credit || 0,
        ];
      }

      const rowForensics = forensicByRow.get(row.originalRowIndex) || [];
      const forensicSummary =
        rowForensics.length > 0
          ? rowForensics.map((f) => `[${f.title}]: ${f.description}`).join(' | ')
          : 'لا توجد مؤشرات احتيال';

      const auditData = [
        row.audit.hasIssue ? '⚠️ توجيه خاطئ' : '✅ سليم',
        row.audit.hasIssue ? 'نعم - متوجه خطأ' : 'لا - صحيح',
        row.audit.hasIssue ? row.audit.categoryLabel : '-',
        row.audit.hasIssue ? `${row.audit.issueDescription} (${row.audit.accountingStandardRef})` : 'التوجيه متوافق مع المعايير',
        row.userOverriddenAccount || (row.audit.hasIssue ? row.audit.suggestedAccountName : row.accountName),
        row.audit.hasIssue ? row.audit.suggestedAccountCode : row.accountCode,
        row.audit.hasIssue ? row.audit.suggestedCorrectionEntry.debitAccount : '-',
        row.audit.hasIssue ? row.audit.suggestedCorrectionEntry.creditAccount : '-',
        row.audit.hasIssue ? row.audit.suggestedCorrectionEntry.amount : 0,
        forensicSummary,
        row.audit.hasIssue
          ? (row.audit.severity === 'HIGH' ? 'حرجة (عالية)' : row.audit.severity === 'MEDIUM' ? 'متوسطة' : 'عادية')
          : rowForensics.some((f) => f.severity === 'CRITICAL')
          ? 'شبهة احتيال حرجة'
          : 'سليم',
      ];

      exportAoa.push([...baseRowData, ...auditData]);
    });

    const wsOriginalWithAudit = XLSX.utils.aoa_to_sheet(exportAoa);
    formatWorksheetForArabicExport(wsOriginalWithAudit, exportAoa);
    XLSX.utils.book_append_sheet(wb, wsOriginalWithAudit, 'البيانات الأصلية مع الملاحظات');

    // 2. Sheet: "تقرير الأخطاء بأرقام الصفوف"
    const flaggedRows = auditedRows.filter((r) => r.audit.hasIssue);
    const rowByRowReportData = flaggedRows.map((row) => ({
      'رقم الصف بالملف الأصلي': row.originalRowIndex,
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'الحساب المسجل حالياً (التوجيه الخاطئ)': row.accountName,
      'كود الحساب الأصلي': row.accountCode || '-',
      'البيان والشرح في الملف': row.narration,
      'المبلغ': (row.debit || 0) > 0 ? row.debit : row.credit,
      'نوع الخطأ': row.audit.categoryLabel,
      'شرح سبب خطأ التوجيه': row.audit.issueDescription,
      'التوجيه الصح الواجب إثباته': row.userOverriddenAccount || row.audit.suggestedAccountName,
      'كود الحساب الصح': row.audit.suggestedAccountCode,
      'قيد التسوية المصحح': `من حـ/ ${row.audit.suggestedCorrectionEntry.debitAccount} إلى حـ/ ${row.audit.suggestedCorrectionEntry.creditAccount}`,
      'المعيار المحاسبي': row.audit.accountingStandardRef,
      'درجة الخطورة': row.audit.severity === 'HIGH' ? 'حرجة (عالية)' : row.audit.severity === 'MEDIUM' ? 'متوسطة' : 'عادية',
    }));

    const wsRowErrors = XLSX.utils.json_to_sheet(
      rowByRowReportData.length > 0
        ? rowByRowReportData
        : [{ 'ملاحظة': 'لا توجد أخطاء توجيه في الملف المفحوص، كافة القيود سليمة وموجهة طبقاً للمعايير.' }]
    );

    formatWorksheetForArabicExport(
      wsRowErrors,
      rowByRowReportData.length > 0 ? rowByRowReportData : undefined,
      [
        { wch: 18 }, // row index
        { wch: 15 }, // entry
        { wch: 12 }, // date
        { wch: 32 }, // wrong account
        { wch: 15 }, // wrong code
        { wch: 45 }, // narration
        { wch: 15 }, // amount
        { wch: 30 }, // category
        { wch: 55 }, // explanation
        { wch: 35 }, // correct account
        { wch: 15 }, // correct code
        { wch: 50 }, // adjusting entry
        { wch: 30 }, // standard
        { wch: 15 }, // severity
      ]
    );
    XLSX.utils.book_append_sheet(wb, wsRowErrors, 'تقرير الأخطاء بأرقام الصفوف');

    // 3. Sheet: "مخاطر التدليس والغش (ISA 240)"
    if (forensicResult && forensicResult.anomalies && forensicResult.anomalies.length > 0) {
      const forensicData = forensicResult.anomalies.map((a) => ({
        'رقم الصف بالملف': a.rowIndex > 0 ? a.rowIndex : 'إجمالي',
        'رقم القيد': a.entryNo,
        'التاريخ': a.date,
        'الحساب': a.accountName,
        'المبلغ (ج.م)': a.amount,
        'درجة الخطورة': a.severity === 'CRITICAL' ? 'حرج جداً' : a.severity === 'HIGH' ? 'مرتفع' : 'متوسط',
        'مؤشر الخطر': a.title,
        'طبيعة الشبهة والتدليس': a.description,
        'توصية مراجع الحسابات': a.recommendation,
        'المعيار والسند': a.standardRef || 'معيار ISA 240',
      }));

      const wsForensic = XLSX.utils.json_to_sheet(forensicData);
      formatWorksheetForArabicExport(wsForensic, forensicData, [
        { wch: 16 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 16 },
        { wch: 16 },
        { wch: 35 },
        { wch: 55 },
        { wch: 55 },
        { wch: 30 },
      ]);
      XLSX.utils.book_append_sheet(wb, wsForensic, 'مخاطر التدليس والغش ISA 240');

      // Benford sheet
      if (forensicResult.digitStats && forensicResult.digitStats.length > 0) {
        const benfordData = forensicResult.digitStats.map((d) => ({
          'الرقم الأول (Digit)': d.digit,
          'التكرار الفعلي في الملف': d.actualCount,
          'النسبة الفعلية (%)': `${d.actualPercentage}%`,
          'النسبة المتوقعة بقانون بنفورد (%)': `${d.expectedPercentage}%`,
          'الانحراف عن الطبيعي (%)': `${d.deviation}%`,
          'حالة الشذوذ الإحصائي': d.isAnomalous ? '⚠️ انحراف غير طبيعي (شبهة افتعال)' : 'طبيعي ومطابق ✓',
        }));
        const wsBenford = XLSX.utils.json_to_sheet(benfordData);
        formatWorksheetForArabicExport(wsBenford, benfordData, [
          { wch: 20 },
          { wch: 22 },
          { wch: 18 },
          { wch: 30 },
          { wch: 22 },
          { wch: 35 },
        ]);
        XLSX.utils.book_append_sheet(wb, wsBenford, 'تحليل قانون بنفورد');
      }
    }

    // 4. Clean Corrected Journal (Ready for ERP Import)
    const correctedJournalData = auditedRows.map((row) => ({
      'رقم الصف': row.originalRowIndex,
      'رقم القيد': row.entryNo,
      'التاريخ': row.date,
      'الحساب بعد التصحيح': row.userOverriddenAccount || (row.audit.hasIssue ? row.audit.suggestedAccountName : row.accountName),
      'كود الحساب الصحيح': row.audit.hasIssue && !row.userOverriddenAccount ? row.audit.suggestedAccountCode : row.accountCode,
      'البيان': row.narration,
      'مدين': row.debit || 0,
      'دائن': row.credit || 0,
      'حالة التعديل': row.audit.hasIssue ? `تم تصحيحه من [${row.accountName}] إلى [${row.userOverriddenAccount || row.audit.suggestedAccountName}]` : 'أصلي بدون تعديل',
    }));

    const wsCorrected = XLSX.utils.json_to_sheet(correctedJournalData);
    formatWorksheetForArabicExport(wsCorrected, correctedJournalData);
    XLSX.utils.book_append_sheet(wb, wsCorrected, 'القيود بعد التصحيح للترحيل');

    // 5. Summary KPI Sheet
    const summaryData = [
      { 'المؤشر': 'إجمالي السطور المفحوصة', 'القيمة': stats.totalRows },
      { 'المؤشر': 'إجمالي القيود المفحوصة', 'القيمة': stats.totalEntriesCount },
      { 'المؤشر': 'السطور ذات التوجيه الخاطئ', 'القيمة': stats.flaggedErrorsCount },
      { 'المؤشر': 'أخطاء حرجة (High Severity)', 'القيمة': stats.highSeverityCount },
      { 'المؤشر': 'ملاحظات متوسطة (Medium)', 'القيمة': stats.mediumSeverityCount },
      { 'المؤشر': 'سطور موجهة بصورة سليمة', 'القيمة': stats.cleanRowsCount },
      { 'المؤشر': 'إجمالي المبالغ الخاضعة لإعادة التوجيه (ج.م)', 'القيمة': stats.totalDiscrepancyAmount },
      {
        'المؤشر': 'مؤشر مخاطر الاحتيال والتدليس (0-100)',
        'القيمة': forensicResult ? `${forensicResult.overallRiskScore} / 100 (${forensicResult.riskLevel})` : 'غير مفعل',
      },
      {
        'المؤشر': 'مخالفات تدليس ورقابة حرجة (Critical)',
        'القيمة': forensicResult ? forensicResult.criticalCount : 0,
      },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    formatWorksheetForArabicExport(wsSummary, summaryData, [{ wch: 45 }, { wch: 25 }]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص التدقيق الشامل');

    // Generate filename based on original file if available
    const baseName = originalFileName
      ? originalFileName.replace(/\.[^/.]+$/, '')
      : 'القيود_المفحوصة';
    const finalFilename = `${baseName}_مع_ملاحظات_التوجيه_والتدليس_${new Date().toISOString().split('T')[0]}.xlsx`;

    writeArabicExcelFile(wb, finalFilename);
  }
}
