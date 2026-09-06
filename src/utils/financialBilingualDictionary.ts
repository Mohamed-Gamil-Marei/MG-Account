/**
 * Bilingual Financial Reporting Dictionary (Arabic <-> English)
 * Fully compliant with Egyptian Accounting Standards (EAS) and IFRS
 */

export interface FinancialTerm {
  ar: string;
  en: string;
  noteRef?: string;
}

export const FINANCIAL_TERMS = {
  // Statement Titles
  BALANCE_SHEET_TITLE: {
    ar: 'قائمة المركز المالي',
    en: 'Statement of Financial Position',
  },
  INCOME_STATEMENT_TITLE: {
    ar: 'قائمة الدخل الشامل',
    en: 'Statement of Profit or Loss and Other Comprehensive Income',
  },
  CASH_FLOW_TITLE: {
    ar: 'قائمة التدفقات النقدية',
    en: 'Statement of Cash Flows',
  },
  NOTES_TITLE: {
    ar: 'الإيضاحات المتممة والسياسات المحاسبية',
    en: 'Notes to the Financial Statements and Accounting Policies',
  },
  AUDITED_FINANCIAL_STATEMENTS: {
    ar: 'القوائم المالية المدققة',
    en: 'Audited Financial Statements',
  },
  FOR_THE_YEAR_ENDED: {
    ar: 'عن السنة المالية المنتهية في',
    en: 'For the year ended',
  },
  AS_AT: {
    ar: 'كما في',
    en: 'As at',
  },
  COMPARATIVE_FIGURES: {
    ar: 'مع أرقام المقارنة المنتهية في',
    en: 'With comparative figures as at',
  },
  ALL_AMOUNTS_IN: {
    ar: 'جميع المبالغ موضحة بـ',
    en: 'All amounts are expressed in',
  },
  NOTE_NUMBER: {
    ar: 'رقم الإيضاح',
    en: 'Note',
  },
  DESCRIPTION: {
    ar: 'البيـــــــــان',
    en: 'Description / Line Item',
  },
  CURRENT_YEAR: {
    ar: 'السنة الحالية',
    en: 'Current Year',
  },
  PREVIOUS_YEAR: {
    ar: 'سنة المقارنة',
    en: 'Comparative Year',
  },

  // Balance Sheet - Non-Current Assets
  NON_CURRENT_ASSETS: {
    ar: 'الأصول غير المتداولة',
    en: 'Non-Current Assets',
  },
  FIXED_ASSETS_NET: {
    ar: 'الأصول الثابتة (بالصافي بعد الإهلاك)',
    en: 'Property, plant and equipment (net of accumulated depreciation)',
    noteRef: '4',
  },
  PROJECTS_UNDER_CONSTRUCTION: {
    ar: 'مشروعات تحت التنفيذ والاستكمال',
    en: 'Projects under construction',
    noteRef: '5',
  },
  RIGHT_OF_USE_ASSETS: {
    ar: 'أصول حق الانتفاع (عقود تأجير EAS 49 / IFRS 16)',
    en: 'Right-of-use assets (Leases EAS 49 / IFRS 16)',
    noteRef: '6',
  },
  INTANGIBLE_ASSETS: {
    ar: 'أصول غير ملموسة وشهرة محل وبرمجيات',
    en: 'Intangible assets and goodwill',
    noteRef: '7',
  },
  FINANCIAL_INVESTMENTS: {
    ar: 'استثمارات مالية بالقيمة العادلة / التكلفة المستهلكة',
    en: 'Financial assets at amortised cost / fair value',
    noteRef: '8',
  },
  DEFERRED_TAX_ASSETS: {
    ar: 'أصول ضريبية مؤجلة',
    en: 'Deferred tax assets',
    noteRef: '9',
  },
  TOTAL_NON_CURRENT_ASSETS: {
    ar: 'إجمالي الأصول غير المتداولة',
    en: 'Total Non-Current Assets',
  },

  // Balance Sheet - Current Assets
  CURRENT_ASSETS: {
    ar: 'الأصول المتداولة',
    en: 'Current Assets',
  },
  INVENTORIES: {
    ar: 'المخزون السلعي (خامات وبضائع تامة وتالف)',
    en: 'Inventories (Raw materials, finished goods, net)',
    noteRef: '10',
  },
  TRADE_RECEIVABLES: {
    ar: 'العملاء والمدينون التجاريون (بالصافي بعد مخصص ECL)',
    en: 'Trade and other receivables (net of expected credit loss allowance)',
    noteRef: '11',
  },
  PREPAYMENTS_AND_OTHER_DEBITS: {
    ar: 'أرصدة مدينة أخرى ومدفوعات مقدماً وتأمينات',
    en: 'Prepayments and other debit balances',
    noteRef: '12',
  },
  CASH_AND_CASH_EQUIVALENTS: {
    ar: 'النقدية وما في حكمها (البنوك وصناديق النقد)',
    en: 'Cash and cash equivalents',
    noteRef: '13',
  },
  TOTAL_CURRENT_ASSETS: {
    ar: 'إجمالي الأصول المتداولة',
    en: 'Total Current Assets',
  },
  TOTAL_ASSETS: {
    ar: 'إجمالي الأصول',
    en: 'Total Assets',
  },

  // Equity
  EQUITY: {
    ar: 'حقوق الملكية',
    en: 'Equity',
  },
  PAID_UP_CAPITAL: {
    ar: 'رأس المال المصدر والمدفوع بالكامل',
    en: 'Issued and paid-up share capital',
    noteRef: '14',
  },
  LEGAL_RESERVE: {
    ar: 'الاحتياطي القانوني (مجنب 5% سنوياً)',
    en: 'Legal reserve',
    noteRef: '15',
  },
  OTHER_RESERVES: {
    ar: 'احتياطيات نظامية ورأسمالية أخرى',
    en: 'Other statutory and capital reserves',
    noteRef: '16',
  },
  RETAINED_EARNINGS: {
    ar: 'الأرباح (الخسائر) المرحلة',
    en: 'Retained earnings (accumulated losses)',
    noteRef: '17',
  },
  NET_PROFIT_FOR_YEAR: {
    ar: 'صافي أرباح (خسائر) الفترة / العام',
    en: 'Net profit (loss) for the period / year',
  },
  TOTAL_EQUITY: {
    ar: 'إجمالي حقوق الملكية',
    en: 'Total Equity',
  },

  // Non-Current Liabilities
  NON_CURRENT_LIABILITIES: {
    ar: 'الالتزامات غير المتداولة (طويلة الأجل)',
    en: 'Non-Current Liabilities',
  },
  LONG_TERM_BORROWINGS: {
    ar: 'قروض وتسهيلات ائتمانية طويلة الأجل',
    en: 'Long-term borrowings and term loans',
    noteRef: '18',
  },
  LONG_TERM_LEASE_LIABILITIES: {
    ar: 'التزامات عقود تأجير تمويلي طويلة الأجل',
    en: 'Non-current lease liabilities',
    noteRef: '19',
  },
  END_OF_SERVICE_BENEFITS: {
    ar: 'مخصص مكافأة نهاية الخدمة ومزايا التقاعد',
    en: 'Employees end-of-service benefit obligations',
    noteRef: '20',
  },
  DEFERRED_TAX_LIABILITIES: {
    ar: 'التزامات ضريبية مؤجلة',
    en: 'Deferred tax liabilities',
    noteRef: '21',
  },
  TOTAL_NON_CURRENT_LIABILITIES: {
    ar: 'إجمالي الالتزامات غير المتداولة',
    en: 'Total Non-Current Liabilities',
  },

  // Current Liabilities
  CURRENT_LIABILITIES: {
    ar: 'الالتزامات المتداولة (قصيرة الأجل)',
    en: 'Current Liabilities',
  },
  TRADE_PAYABLES: {
    ar: 'الموردون والدائنون التجاريون وأوراق الدفع',
    en: 'Trade payables and commercial bills payable',
    noteRef: '22',
  },
  SHORT_TERM_BORROWINGS: {
    ar: 'سحب على المكشوف وتسهيلات بنكية جارية',
    en: 'Bank overdrafts and short-term facilities',
    noteRef: '23',
  },
  ACCRUED_INCOME_TAX: {
    ar: 'ضريبة الدخل المستحقة لمصلحة الضرائب',
    en: 'Current income tax liability (ETA)',
    noteRef: '24',
  },
  CURRENT_PORTION_LONG_TERM_DEBT: {
    ar: 'الجزء المتداول من القروض طويلة الأجل',
    en: 'Current portion of long-term borrowings',
    noteRef: '25',
  },
  ACCRUALS_AND_OTHER_CREDITS: {
    ar: 'أرصدة دائنة أخرى ومصروفات مستحقة',
    en: 'Accruals and other credit balances',
    noteRef: '26',
  },
  CURRENT_PROVISIONS: {
    ar: 'مخصصات مطالبات ومنازعات متداولة',
    en: 'Short-term provisions and dispute reserves',
    noteRef: '27',
  },
  TOTAL_CURRENT_LIABILITIES: {
    ar: 'إجمالي الالتزامات المتداولة',
    en: 'Total Current Liabilities',
  },
  TOTAL_LIABILITIES: {
    ar: 'إجمالي الالتزامات',
    en: 'Total Liabilities',
  },
  TOTAL_EQUITY_AND_LIABILITIES: {
    ar: 'إجمالي حقوق الملكية والالتزامات',
    en: 'Total Equity and Liabilities',
  },

  // Income Statement Lines
  REVENUES: {
    ar: 'إيرادات النشاط والمبيعات (Revenues)',
    en: 'Revenue from contracts with customers',
  },
  COST_OF_GOODS_SOLD: {
    ar: 'تكلفة المبيعات / الإنتاج المباع (COGS)',
    en: 'Cost of sales / Cost of goods sold',
  },
  GROSS_PROFIT: {
    ar: 'مجمل الربح (Gross Profit)',
    en: 'Gross Profit',
  },
  SELLING_AND_MARKETING_EXPENSES: {
    ar: 'مصروفات بيعية وتسويقية وتوزيع',
    en: 'Selling and distribution expenses',
  },
  GENERAL_AND_ADMIN_EXPENSES: {
    ar: 'مصروفات عمومية وإدارية',
    en: 'General and administrative expenses',
  },
  DEPRECIATION_AND_AMORTISATION: {
    ar: 'إهلاك واستهلاك الأصول الثابتة وغير الملموسة',
    en: 'Depreciation and amortisation',
  },
  OPERATING_PROFIT: {
    ar: 'أرباح (خسائر) التشغيل / الربح التشغيلي (EBIT)',
    en: 'Operating Profit / Earnings before interest & taxes (EBIT)',
  },
  FINANCING_COSTS: {
    ar: 'أعباء وتكاليف تمويلية وفوائد بنكية (-)',
    en: 'Finance costs and bank charges (-)',
  },
  FINANCING_INCOME: {
    ar: 'عوائد وفوائد دائنة واستثمارات (+)',
    en: 'Finance and investment income (+)',
  },
  FX_GAINS_LOSSES: {
    ar: 'أرباح (خسائر) فروق تقييم العملة الأجنبية (EAS 13)',
    en: 'Foreign exchange net gains / (losses) (EAS 13 / IAS 21)',
  },
  PROFIT_BEFORE_INCOME_TAX: {
    ar: 'صافي الربح المحاسبي قبل ضريبة الدخل (EBT)',
    en: 'Profit before income tax (EBT)',
  },
  INCOME_TAX_EXPENSE: {
    ar: 'مصروف ضريبة الدخل المحسوبة (22.5%)',
    en: 'Income tax expense (Current & Deferred 22.5%)',
  },
  NET_PROFIT_FOR_PERIOD: {
    ar: 'صافي أرباح (خسائر) العام بعد الضريبة',
    en: 'Net profit for the year after tax',
  },
  OTHER_COMPREHENSIVE_INCOME: {
    ar: 'بنود الدخل الشامل الآخر (OCI)',
    en: 'Other Comprehensive Income (OCI)',
  },
  TOTAL_COMPREHENSIVE_INCOME: {
    ar: 'إجمالي الدخل الشامل عن العام',
    en: 'Total Comprehensive Income for the year',
  },

  // Cash Flows
  CF_OPERATING_ACTIVITIES: {
    ar: 'التدفقات النقدية من الأنشطة التشغيلية',
    en: 'Cash flows from operating activities',
  },
  CF_INVESTING_ACTIVITIES: {
    ar: 'التدفقات النقدية من الأنشطة الاستثمارية',
    en: 'Cash flows from investing activities',
  },
  CF_FINANCING_ACTIVITIES: {
    ar: 'التدفقات النقدية من الأنشطة التمويلية',
    en: 'Cash flows from financing activities',
  },
  NET_CHANGE_IN_CASH: {
    ar: 'صافي الزيادة (النقص) في النقدية وما في حكمها',
    en: 'Net increase (decrease) in cash and cash equivalents',
  },
  CASH_AT_BEGINNING_OF_YEAR: {
    ar: 'النقدية وما في حكمها في بداية العام',
    en: 'Cash and cash equivalents at beginning of the year',
  },
  CASH_AT_END_OF_YEAR: {
    ar: 'النقدية وما في حكمها في نهاية العام',
    en: 'Cash and cash equivalents at end of the year',
  },

  // Auditor & Legal Sign-offs
  MANAGING_DIRECTOR: {
    ar: 'رئيس مجلس الإدارة / المدير العام',
    en: 'Chairman / Managing Director',
  },
  CHIEF_FINANCIAL_OFFICER: {
    ar: 'المدير المالي التنفيذي (CFO)',
    en: 'Chief Financial Officer (CFO)',
  },
  INDEPENDENT_AUDITOR: {
    ar: 'مراقب الحسابات المستقل',
    en: 'Independent Auditor',
  },
  AUDITOR_TITLE: {
    ar: 'محاسب قانوني ومراقب حسابات - سجل عام 43122',
    en: 'Certified Public Accountant & Statutory Auditor - Reg. 43122',
  },
  COMMERCIAL_REGISTER: {
    ar: 'سجل تجاري',
    en: 'Commercial Reg. No.',
  },
  TAX_CARD: {
    ar: 'بطاقة ضريبية',
    en: 'Tax Card No.',
  },
  TAX_OFFICE: {
    ar: 'مأمورية الضرائب',
    en: 'Tax Office',
  },
};
