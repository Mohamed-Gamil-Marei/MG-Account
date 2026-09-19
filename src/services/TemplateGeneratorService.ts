import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../utils/excelArabicStyler';

export class TemplateGeneratorService {
  /**
   * Generates and downloads the official Journal Entries Excel Template
   */
  public static downloadJournalEntriesTemplate(): void {
    const headers = [
      'تاريخ القيد (YYYY-MM-DD)',
      'رقم مرجع القيد / السند',
      'كود الحساب',
      'اسم الحساب',
      'مدين (ج.م)',
      'دائن (ج.م)',
      'العملة (EGP/USD/EUR)',
      'سعر الصرف',
      'مدين بالعملة الأجنبية',
      'دائن بالعملة الأجنبية',
      'مركز التكلفة / المشروع',
      'شرح وبيان الطرف',
      'البيان العام للقيد',
    ];

    const sampleData = [
      [
        '2026-03-01',
        'JV-2026-001',
        '1220',
        'العملاء والمدينون التجاريون',
        114000,
        0,
        'EGP',
        1,
        0,
        0,
        'CC-SALES-CAIRO',
        'استحقاق قيمة الفاتورة شاملة الضريبة',
        'إثبات مبيعات بضاعة بالأجل لشركة النيل التجارية',
      ],
      [
        '2026-03-01',
        'JV-2026-001',
        '4110',
        'إيرادات النشاط الجاري والمبيعات',
        0,
        100000,
        'EGP',
        1,
        0,
        0,
        'CC-SALES-CAIRO',
        'قيمة البضاعة المباعة قبل الضريبة',
        'إثبات مبيعات بضاعة بالأجل لشركة النيل التجارية',
      ],
      [
        '2026-03-01',
        'JV-2026-001',
        '2210',
        'مصلحة الضرائب - ضريبة القيمة المضافة 14%',
        0,
        14000,
        'EGP',
        1,
        0,
        0,
        'CC-TAX-01',
        'ضريبة ق.م المستحقة 14%',
        'إثبات مبيعات بضاعة بالأجل لشركة النيل التجارية',
      ],
      [
        '2026-03-02',
        'JV-2026-002',
        '1110',
        'الصندوق والخزينة المركزية',
        50000,
        0,
        'EGP',
        1,
        0,
        0,
        'CC-MAIN',
        'إيداع نقدي مقبوضات مبيعات',
        'سداد نقدي من أحد العملاء بالخزينة',
      ],
      [
        '2026-03-02',
        'JV-2026-002',
        '1220',
        'العملاء والمدينون التجاريون',
        0,
        50000,
        'EGP',
        1,
        0,
        0,
        'CC-MAIN',
        'تخفيض حساب العميل بالسداد النقدي',
        'سداد نقدي من أحد العملاء بالخزينة',
      ],
    ];

    const instructions = [
      ['دليل إرشادات تعبئة نموذج استيراد قيود اليومية العامة (Journal Entries Template)'],
      ['1. يرجى إدخال القيود بحيث تشترك أطراف نفس القيد في نفس "تاريخ القيد" و "رقم مرجع القيد / السند".'],
      ['2. يجب أن يتساوى إجمالي المدين مع إجمالي الدائن لكل قيد لضمان توازن دفتر اليومية.'],
      ['3. صيغة التاريخ المقبولة: YYYY-MM-DD (مثال: 2026-03-15) أو صيغة تاريخ الإكسل العادية.'],
      ['4. كود الحساب: يفضل كتابة كود الحساب من شجرة الحسابات (مثل 1110 للخزينة، 1220 للعملاء، 4110 للمبيعات).'],
      ['5. إذا لم يتم تحديد كود الحساب، سيقوم النظام بالبحث التلقائي بالاسم أو إنشاء حساب فرعي مطابق.'],
      ['6. في حال العملات الأجنبية: حدد كود العملة (USD / EUR) وسعر الصرف، أو اتركها فارغة للعملة المحلية (EGP).'],
    ];

    const wb = XLSX.utils.book_new();

    // Journal Sheet
    const wsJournal = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    formatWorksheetForArabicExport(wsJournal, [headers, ...sampleData], [
      { wch: 15 }, // Date
      { wch: 15 }, // Ref
      { wch: 12 }, // Code
      { wch: 30 }, // Name
      { wch: 14 }, // Debit
      { wch: 14 }, // Credit
      { wch: 10 }, // Cur
      { wch: 10 }, // Rate
      { wch: 14 }, // Foreign Debit
      { wch: 14 }, // Foreign Credit
      { wch: 18 }, // Cost Center
      { wch: 35 }, // Line Desc
      { wch: 40 }, // Header Desc
    ]);
    XLSX.utils.book_append_sheet(wb, wsJournal, 'قيود اليومية العامة');

    // Instructions Sheet
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    formatWorksheetForArabicExport(wsInstructions, instructions, [{ wch: 80 }]);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'تعليمات الاستيراد');

    writeArabicExcelFile(wb, 'نموذج_استيراد_قيود_اليومية_العامة_المعتمد.xlsx');
  }

  /**
   * Generates and downloads the official General Ledger / Trial Balance Excel Template
   */
  public static downloadGeneralLedgerTemplate(): void {
    const headers = [
      'كود الحساب',
      'اسم الحساب المحاسبي',
      'النوع (ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE)',
      'الرصيد الافتتاحي مدين (ج.م)',
      'الرصيد الافتتاحي دائن (ج.م)',
      'حركات الفترة مدين (ج.م)',
      'حركات الفترة دائن (ج.م)',
      'الرصيد الختامي مدين (ج.م)',
      'الرصيد الختامي دائن (ج.م)',
      'مركز التكلفة التابع',
    ];

    const sampleData = [
      ['1110', 'النقدية بالصندوق والخزينة', 'ASSET', 50000, 0, 120000, 95000, 75000, 0, 'CC-MAIN'],
      ['1120', 'البنك التجاري الدولي CIB', 'ASSET', 350000, 0, 600000, 450000, 500000, 0, 'CC-MAIN'],
      ['1220', 'العملاء والمدينون التجاريون', 'ASSET', 180000, 0, 850000, 720000, 310000, 0, 'CC-SALES'],
      ['2110', 'الموردون والدائنون التجاريون', 'LIABILITY', 0, 120000, 400000, 550000, 0, 270000, 'CC-PURCH'],
      ['3110', 'رأس المال المدفوع', 'EQUITY', 0, 460000, 0, 0, 0, 460000, 'CC-CORP'],
      ['4110', 'إيرادات المبيعات والنشاط', 'REVENUE', 0, 0, 0, 850000, 0, 850000, 'CC-SALES'],
      ['5110', 'تكلفة البضاعة المباعة', 'EXPENSE', 0, 0, 510000, 0, 510000, 0, 'CC-PURCH'],
      ['5210', 'المصروفات العمومية والإدارية', 'EXPENSE', 0, 0, 185000, 0, 185000, 0, 'CC-ADMIN'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    formatWorksheetForArabicExport(ws, [headers, ...sampleData], [
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة والأستاذ العام');
    writeArabicExcelFile(wb, 'نموذج_استيراد_ميزان_المراجعة_ودفتر_الأستاذ.xlsx');
  }

  /**
   * Generates and downloads Bank Statement Excel Template
   */
  public static downloadBankStatementTemplate(): void {
    const headers = [
      'تاريخ الحركة (YYYY-MM-DD)',
      'تاريخ الاستحقاق',
      'رقم الشيك / المرجع البنكي',
      'البيان والشرح التفصيلي',
      'إيداع / مدين للبنك (ج.م)',
      'سحب / دائن للبنك (ج.م)',
      'الرصيد بعد الحركة',
      'كود الحساب المحاسبي المقابل المقترح',
    ];

    const sampleData = [
      ['2026-03-01', '2026-03-01', 'TRF-98231', 'تحويل بنكي وارد - دفعة عميل شركة النيل', 114000, 0, 464000, '1220'],
      ['2026-03-03', '2026-03-03', 'CHQ-00441', 'صرف شيك مقاصة - سداد لمورد الإسكندرية', 0, 50000, 414000, '2110'],
      ['2026-03-05', '2026-03-05', 'BNK-FEE-1', 'عمولات ومصاريف فتح اعتماد مستندي', 0, 2500, 411500, '5240'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    formatWorksheetForArabicExport(ws, [headers, ...sampleData], [
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 38 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب البنكي');
    writeArabicExcelFile(wb, 'نموذج_استيراد_كشف_حساب_البنك.xlsx');
  }
}
