import * as XLSX from 'xlsx';

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
    wsReport['!cols'] = [
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
    ];

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
    wsCorrected['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
      { wch: 15 },
      { wch: 45 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 },
    ];
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
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص مؤشرات التدقيق');

    XLSX.writeFile(wb, `تقرير_فحص_وتصحيح_توجيه_القيود_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
