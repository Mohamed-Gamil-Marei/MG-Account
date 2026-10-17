export interface FinancialNoteTemplate {
  id: string;
  noteNumber: string;
  titleAr: string;
  titleEn: string;
  title: string;
  category: 'POLICIES' | 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'INCOME_STATEMENT' | 'DISCLOSURES';
  contentAr: string;
  contentEn: string;
  body: string;
  standardReference: string;
}

export const NOTES_TEMPLATES: FinancialNoteTemplate[] = [
  {
    id: 'note-1',
    noteNumber: '1',
    titleAr: 'عن الشركة والنشاط الرئيسي',
    titleEn: 'Company Information and Principal Activities',
    title: 'عن الشركة والنشاط الرئيسي',
    category: 'POLICIES',
    contentAr: 'تأسست الشركة كشركة مساهمة مصرية خاضعة لأحكام قانون الاستثمار والقوانين ذات الصلة، وتهدف إلى ممارسة النشاط التجاري والخدمي في جمهورية مصر العربية.',
    contentEn: 'The company was established as an Egyptian joint stock company subject to investment laws and aims to conduct commercial and service activities.',
    body: 'تأسست الشركة كشركة مساهمة مصرية خاضعة لأحكام قانون الاستثمار والقوانين ذات الصلة، وتهدف إلى ممارسة النشاط التجاري والخدمي في جمهورية مصر العربية.',
    standardReference: 'معيار المحاسبة المصري رقم (1)',
  },
  {
    id: 'note-2',
    noteNumber: '2',
    titleAr: 'أسس إعداد القوائم المالية والسياسات المحاسبية الهامة',
    titleEn: 'Basis of Preparation and Significant Accounting Policies',
    title: 'أسس إعداد القوائم المالية والسياسات المحاسبية الهامة',
    category: 'POLICIES',
    contentAr: 'أُعدت القوائم المالية المرفقة وفقاً لمعايير المحاسبة المصرية السارية وعلى أساس التكلفة التاريخية مبدأ الاستحقاق واستمرارية المنشأة.',
    contentEn: 'The accompanying financial statements have been prepared in accordance with Egyptian Accounting Standards.',
    body: 'أُعدت القوائم المالية المرفقة وفقاً لمعايير المحاسبة المصرية السارية وعلى أساس التكلفة التاريخية مبدأ الاستحقاق واستمرارية المنشأة.',
    standardReference: 'EAS 1 Presentation of Financial Statements',
  },
  {
    id: 'note-3',
    noteNumber: '3',
    titleAr: 'النقدية وما في حكمها',
    titleEn: 'Cash and Cash Equivalents',
    title: 'النقدية وما في حكمها',
    category: 'ASSETS',
    contentAr: 'تتضمن النقدية وما في حكمها الأرصدة بالخزينة الرئيسية والأنصبة البنكية القابلة للسحب الفوري.',
    contentEn: 'Cash and cash equivalents comprise cash on hand and demand deposits with banks.',
    body: 'تتضمن النقدية وما في حكمها الأرصدة بالخزينة الرئيسية والأنصبة البنكية القابلة للسحب الفوري.',
    standardReference: 'معيار المحاسبة المصري رقم (4) قائمة التدفقات النقدية',
  },
];
