import React, { useState, useMemo } from 'react';
import {
  Calculator,
  X,
  Sparkles,
  Building2,
  FileText,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Layers,
  Info,
  DollarSign,
  TrendingUp,
  Percent,
  Sliders,
  ChevronDown,
  ArrowRight,
  Send,
  Building,
  Scale,
  BadgePercent,
  Briefcase
} from 'lucide-react';
import { ClientArchiveRecord, ProcedureCategory, CompanyType } from '../types';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { db } from '../db/localDatabase';

export interface FeeEstimateResult {
  procedureCategory: ProcedureCategory;
  procedureTitle: string;
  recommendedFee: number;
  minFee: number;
  maxFee: number;
  estimatedGovFees: number;
  govFeeBreakdown: { item: string; amount: number; notes: string }[];
  scopeDeliverables: string[];
  estimatedDays: number;
  paymentTerms: string;
}

interface SmartProcedureFeeEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientArchiveRecord | null;
  onApplyEstimate?: (estimate: {
    title: string;
    category: ProcedureCategory;
    agreedFees: number;
    governmentFees: number;
    notes: string;
  }) => void;
}

interface ProcedurePreset {
  id: string;
  title: string;
  category: ProcedureCategory;
  group: 'CORPORATE' | 'TAX' | 'AUDIT' | 'PAYROLL' | 'STUDIES';
  groupLabel: string;
  baseFee: number;
  baseGovFees: number;
  govFeeBreakdown: { item: string; amount: number; notes: string }[];
  deliverables: string[];
  days: number;
  applicableCompanyTypes: CompanyType[];
  notesTemplate: string;
}

const PROCEDURE_PRESETS: ProcedurePreset[] = [
  {
    id: 'CORP_JOINT_STOCK',
    title: 'تأسيس شركة مساهمة مصرية (ش.م.م) وفق القانون 159',
    category: 'COMPANY_ESTABLISHMENT',
    group: 'CORPORATE',
    groupLabel: 'تأسيس وتعديل الشركات',
    baseFee: 22000,
    baseGovFees: 8500,
    govFeeBreakdown: [
      { item: 'رسوم هيئة الاستثمار والترخيص', amount: 3200, notes: 'وفق رأس المال المصدر' },
      { item: 'تصديق نقابة المحامين', amount: 2500, notes: 'رسم توثيق عقد التأسيس (1%)' },
      { item: 'القيد بالغرفة التجارية والسجل التجاري', amount: 1400, notes: 'شامل استخراج السجل المميكن' },
      { item: 'النشر بجريدتي الاستثمار والوقائع المصرية', amount: 1400, notes: 'النشر القانوني الإلزامي' },
    ],
    deliverables: [
      'صياغة عقد التأسيس والنظام الأساسي واعتماده',
      'إنهاء شهادة عدم التباس الاسم التجاري والموافقة الأمنية للشركاء',
      'استخراج شهادة الإيداع البنكي (10%) واستكمال إجراءات هيئة الاستثمار',
      'استخراج السجل التجاري والبطاقة الضريبية وشهادة التسجيل الضريبي',
    ],
    days: 14,
    applicableCompanyTypes: ['JOINT_STOCK'],
    notesTemplate: 'شامل توثيق الشهر العقاري وإنهاء كافة إجراءات التأسيس حتى استلام أصل السجل التجاري والبطاقة الضريبية.',
  },
  {
    id: 'CORP_LLC',
    title: 'تأسيس شركة ذات مسؤولية محدودة (ش.ذ.م.م)',
    category: 'COMPANY_ESTABLISHMENT',
    group: 'CORPORATE',
    groupLabel: 'تأسيس وتعديل الشركات',
    baseFee: 14000,
    baseGovFees: 4800,
    govFeeBreakdown: [
      { item: 'رسوم فحص وتوثيق هيئة الاستثمار', amount: 1800, notes: 'رسوم نموذج التأسيس الموحد' },
      { item: 'تصديق نقابة المحامين والتوثيق', amount: 1500, notes: 'تصديق العقد' },
      { item: 'رسوم الغرفة التجارية والسجل التجاري', amount: 1100, notes: 'إصدار السجل التجاري المعتمد' },
      { item: 'طوابع دمغة ونشر إلكتروني', amount: 400, notes: 'نشر إلكتروني بالهيئة' },
    ],
    deliverables: [
      'صياغة عقد التأسيس المعتمد وتحديد صلاحيات المديرين',
      'إنهاء كافة متطلبات هيئة الاستثمار والرقابة المالية',
      'استخراج السجل التجاري والبطاقة الضريبية',
      'فتح الملف التأميني المبدئي للمنشأة',
    ],
    days: 10,
    applicableCompanyTypes: ['LLC'],
    notesTemplate: 'شامل حضور جلسة التوثيق وإنهاء إجراءات البطاقة الضريبية والسجل التجاري.',
  },
  {
    id: 'CORP_SOLE',
    title: 'قيد منشأة فردية / سجل تجاري فردي جديد',
    category: 'COMMERCIAL_REGISTRY',
    group: 'CORPORATE',
    groupLabel: 'تأسيس وتعديل الشركات',
    baseFee: 4000,
    baseGovFees: 1200,
    govFeeBreakdown: [
      { item: 'رسوم الغرفة التجارية وشهادة المزاولة', amount: 650, notes: 'اشتراك الغرفة والتصديق' },
      { item: 'رسوم استخراج السجل التجاري', amount: 400, notes: 'رسوم السجل المميكن' },
      { item: 'طوابع دمغة وتنمية موارد', amount: 150, notes: 'طوابع حكومية' },
    ],
    deliverables: [
      'فتح الملف الضريبي واستخراج شهادة بيانات رقم التسجيل',
      'استخراج شهادة مزاولة المهنة من الغرفة التجارية',
      'إصدار السجل التجاري الفردي المعتمد للمنشأة',
    ],
    days: 5,
    applicableCompanyTypes: ['SOLE_PROPRIETORSHIP', 'INDIVIDUAL'],
    notesTemplate: 'يتم استخراج البطاقة الضريبية أولاً ثم شهادة الغرفة التجارية فالسجل التجاري.',
  },
  {
    id: 'CORP_GENERAL_ASSEMBLY',
    title: 'اعتماد محضر جمعية عامة عادية / غير عادية بهيئة الاستثمار',
    category: 'COMPANY_ESTABLISHMENT',
    group: 'CORPORATE',
    groupLabel: 'تأسيس وتعديل الشركات',
    baseFee: 7500,
    baseGovFees: 2400,
    govFeeBreakdown: [
      { item: 'رسوم مراجعة واعتماد المحضر بهيئة الاستثمار', amount: 1400, notes: 'رسوم الاعتماد الرسمي' },
      { item: 'رسوم التأشير بالسجل التجاري بالمحضر', amount: 750, notes: 'تعديل بيانات السجل' },
      { item: 'طوابع ونشر', amount: 250, notes: 'طوابع نقابية ورسمية' },
    ],
    deliverables: [
      'صياغة ومراجعة دعوة الجمعية وجدول الأعمال ومحضر الاجتماع',
      'إعداد تقرير مجلس الإدارة وتقرير مراقب الحسابات للجمعية',
      'تقديم الملف واعتماده رسمياً من الإدارة المركزية للشؤون القانونية بهيئة الاستثمار',
      'التأشير بما يفيد قرارات الجمعية في السجل التجاري للشركة',
    ],
    days: 8,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC'],
    notesTemplate: 'يشمل اعتماد القوائم المالية أو تعديل التشكيل أو زيادة رأس المال بالسجل التجاري.',
  },
  {
    id: 'TAX_AUDIT_FULL',
    title: 'حضور الفحص الضريبي الشامل (دخل + قيمة مضافة + كسب عمل + دمغة)',
    category: 'TAX_AUDIT',
    group: 'TAX',
    groupLabel: 'الضرائب والفحص واللجان',
    baseFee: 20000,
    baseGovFees: 1800,
    govFeeBreakdown: [
      { item: 'رسوم الاطلاع وتصوير مذكرات الفحص الضريبي', amount: 600, notes: 'رسوم رسمية بالمأمورية' },
      { item: 'طوابع دمغة الفحص والشهادات الضريبية', amount: 500, notes: 'دمغات مأمورية' },
      { item: 'مصروفات انتقالات وإدارية مأمورية الضرائب', amount: 700, notes: 'جلسات الفحص والمطابقة' },
    ],
    deliverables: [
      'تجهيز وفحص الدفاتر المحاسبية والقوائم التحليلية والفواتير',
      'حضور جلسات الفحص بمأمورية الضرائب المختصة وتقديم الدفاتر',
      'مراجعة نماذج الفحص (19، 38، 14 قيمة مضافة) والاعتراض عليها قانونياً',
      'إعداد المذكرات الإيضاحية والدفاع الفني لحماية العميل من التقدير الجزافي',
    ],
    days: 30,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP'],
    notesTemplate: 'تستحق الأتعاب على دفعتين: 50% مقدم تعاقد و 50% بعد اعتماد التقرير أو اللجنة الداخلية.',
  },
  {
    id: 'TAX_DISPUTE_COMMITTEE',
    title: 'إعداد مذكرات الدفاع وحضور لجان الطعن ولجان فض المنازعات',
    category: 'TAX_AUDIT',
    group: 'TAX',
    groupLabel: 'الضرائب والفحص واللجان',
    baseFee: 15000,
    baseGovFees: 1500,
    govFeeBreakdown: [
      { item: 'رسوم قيد الطعن بصندوق الطعون الضريبية', amount: 800, notes: 'رسوم قيد رسمية' },
      { item: 'طوابع ومستندات إيداع ومحاضر جلسات', amount: 700, notes: 'دمغات ورسوم أمانة' },
    ],
    deliverables: [
      'دراسة تقرير فحص المأمورية وتحديد أوجه الخلل القانوني والحسابي',
      'صياغة مذكرة الدفاع المستندة لأحكام محكمة النقض والتعليمات التنفيذية للضرائب',
      'حضور جلسات لجنة الطعن وتقديم الدفوع الفنية والمستندات المؤيدة',
      'استلام القرار النهائي وتخفيض الوعاء الضريبي لأقصى حد قانوني',
    ],
    days: 45,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP'],
    notesTemplate: 'يمكن الاتفاق على نسبة نجاح إضافية مرتبطة بحجم التخفيض الضريبي المحقق.',
  },
  {
    id: 'TAX_DECLARATION_ANNUAL',
    title: 'إعداد ومراجعة واعتماد إقرار ضريبة الدخل السنوي للشركات',
    category: 'TAX_DECLARATION',
    group: 'TAX',
    groupLabel: 'الضرائب والفحص واللجان',
    baseFee: 6500,
    baseGovFees: 450,
    govFeeBreakdown: [
      { item: 'رسوم تجديد خدمة البوابة الإلكترونية لمصلحة الضرائب', amount: 350, notes: 'اشتراك البوابة' },
      { item: 'طوابع ونقابة المحاسبين والمراجعين', amount: 100, notes: 'دمغة موازنة الإقرار' },
    ],
    deliverables: [
      'مراجعة الإيرادات وتكلفة الحصول عليها والمصروفات المؤيدة دفترياً',
      'حساب الإهلاك الضريبي وفروق الوعاء المحاسبي عن الوعاء الضريبي',
      'تعبئة الجداول التفصيلية (قائمة الدخل، الميزانية، الإهلاك، التبرعات) عبر المنظومة',
      'اعتماد الإقرار إلكترونياً بتوقيع مراقب الحسابات القانوني وإرساله',
    ],
    days: 7,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP'],
    notesTemplate: 'شامل استخراج إشعار التقديم النهائي وسداد الضريبة المستحقة إلكترونياً.',
  },
  {
    id: 'AUDIT_FINANCIAL_STATEMENTS',
    title: 'مراجعة وتدقيق القوائم المالية السنوية وإصدار تقرير مراقب الحسابات',
    category: 'FINANCIAL_AUDIT',
    group: 'AUDIT',
    groupLabel: 'المراجعة واعتماد القوائم المالية',
    baseFee: 18000,
    baseGovFees: 800,
    govFeeBreakdown: [
      { item: 'طوابع ودمغات نقابة المحاسبين والمراجعين القانونيين', amount: 500, notes: 'دمغات تقرير المراجع' },
      { item: 'رسوم اعتماد الصندوق التكافلي للمهنة', amount: 300, notes: 'طوابع المهنة' },
    ],
    deliverables: [
      'تنفيذ إجراءات المراجعة وفق معايير المراجعة المصرية (ESA)',
      'فحص قيود اليومية والأستاذ العام ومطابقة الأرصدة والعملاء والموردين والبنك',
      'إعداد القوائم المالية الأربع (المركز المالي، الدخل، التدفقات النقدية، التغير في حقوق الملكية)',
      'صياغة الإيضاحات المتممة للقوائم وإصدار تقرير مراقب الحسابات المستقل',
    ],
    days: 20,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC', 'PARTNERSHIP'],
    notesTemplate: 'تسلم القوائم مجلدة ومختومة بختم مراقب الحسابات في 5 نسخ أصلية للشركة والبنك والضرائب.',
  },
  {
    id: 'AUDIT_CERTIFICATE_INCOME',
    title: 'شهادة محاسب قانوني معتمدة لإثبات الدخل وصافي الأرباح للبنك',
    category: 'PROFESSIONAL_CERT',
    group: 'AUDIT',
    groupLabel: 'المراجعة واعتماد القوائم المالية',
    baseFee: 3500,
    baseGovFees: 350,
    govFeeBreakdown: [
      { item: 'دمغات نقابة التجاريين والمحاسبين', amount: 200, notes: 'دمغة مهنية' },
      { item: 'طوابع استخراج وتصديق شهادة البيانات', amount: 150, notes: 'طوابع رسمية' },
    ],
    deliverables: [
      'فحص الدفاتر والحسابات البنكية ومستندات الإيرادات لآخر 12 شهراً',
      'إصدار شهادة صافي الدخل السنوي أو الشهري موجهة للبنك المطلوب',
      'اعتماد الشهادة بختم وترخيص مزاولة المهنة وكارنيه سجل المحاسبين',
    ],
    days: 3,
    applicableCompanyTypes: ['SOLE_PROPRIETORSHIP', 'INDIVIDUAL', 'LLC'],
    notesTemplate: 'جاهزة للتقديم للبنوك والتمويل العقاري والجهات الحكومية والائتمان.',
  },
  {
    id: 'PAYROLL_INSURANCE_FILE',
    title: 'فتح ملف تأمينات اجتماعية للمنشأة وقيد صاحب العمل والعمالة',
    category: 'SOCIAL_INSURANCE',
    group: 'PAYROLL',
    groupLabel: 'التأمينات والرواتب والعمالة',
    baseFee: 3800,
    baseGovFees: 950,
    govFeeBreakdown: [
      { item: 'رسوم فتح الملف التأميني بالهيئة القومية للتأمين الاجتماعي', amount: 450, notes: 'رسوم ملف' },
      { item: 'طوابع استمارات (س1 عمال وس6 وس2)', amount: 250, notes: 'استمارات رسمية' },
      { item: 'رسوم فحص مكتب العمل والتفتيش التأميني', amount: 250, notes: 'رسوم إدارية' },
    ],
    deliverables: [
      'إعداد ملف المنشأة التأميني وتجهيز عقد الإيجار والسجل والبطاقة الضريبية',
      'تسجيل صاحب العمل أو المدير وتحديد فئة الدخل التأميني',
      'تسجيل العمالة المؤمن عليها واستخراج الرقم التأميني المميكن للمنشأة',
    ],
    days: 6,
    applicableCompanyTypes: ['SOLE_PROPRIETORSHIP', 'LLC', 'JOINT_STOCK', 'PARTNERSHIP'],
    notesTemplate: 'يشمل تسليم استمارة (س2) السنوية المعتمدة ومطابقة الدفعات التأمينية.',
  },
  {
    id: 'STUDIES_FEASIBILITY',
    title: 'إعداد دراسة جدوى اقتصادية متكاملة لتمويل بنكي أو هيئة التنمية',
    category: 'FEASIBILITY_STUDY',
    group: 'STUDIES',
    groupLabel: 'دراسات الجدوى والاستشارات',
    baseFee: 25000,
    baseGovFees: 1200,
    govFeeBreakdown: [
      { item: 'رسوم استعلام وتوثيق بيانات السوق والترخيص', amount: 700, notes: 'بيانات قطاعية' },
      { item: 'طوابع دمغة نقابة المحاسبين على الدراسات والتقارير', amount: 500, notes: 'اعتماد مهني' },
    ],
    deliverables: [
      'الدراسة التسويقية وتحليل العرض والطلب والفجوة السوقية',
      'الدراسة الفنية وتكاليف الآلات ومعدات التشغيل ومستلزمات الإنتاج',
      'الدراسة المالية وتحليل نقطة التعادل والتدفقات النقدية المتوقعة لخمس سنوات',
      'مؤشرات الربحية (IRR، NPV، فترة الاسترداد Payback Period)',
      'تقرير مالي معتمد موجه للبنك المقرض أو هيئة الاستثمار والتنمية الصناعية',
    ],
    days: 21,
    applicableCompanyTypes: ['JOINT_STOCK', 'LLC', 'SOLE_PROPRIETORSHIP'],
    notesTemplate: 'تسلم الدراسة في 3 نسخ فاخرة مدعمة بالرسوم البيانية والمؤشرات الاقتصادية القياسية.',
  },
];

export const SmartProcedureFeeEstimatorModal: React.FC<SmartProcedureFeeEstimatorModalProps> = ({
  isOpen,
  onClose,
  client,
  onApplyEstimate,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PROCEDURE_PRESETS[0].id);
  const [companyType, setCompanyType] = useState<CompanyType>(client?.companyType || 'LLC');
  const [activityScale, setActivityScale] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'MEGA'>('MEDIUM');
  const [urgencyLevel, setUrgencyLevel] = useState<'NORMAL' | 'URGENT' | 'SUPER_URGENT'>('NORMAL');
  const [includeFullRepresentation, setIncludeFullRepresentation] = useState<boolean>(true);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);
  const [showQuotationPrint, setShowQuotationPrint] = useState<boolean>(false);

  const selectedPreset = useMemo(() => {
    return PROCEDURE_PRESETS.find((p) => p.id === selectedPresetId) || PROCEDURE_PRESETS[0];
  }, [selectedPresetId]);

  // Dynamic Calculation Engine based on entity type, activity scale, urgency
  const calculation = useMemo(() => {
    let fee = selectedPreset.baseFee;
    let govFees = selectedPreset.baseGovFees;

    // Multiplier for company type
    let companyMultiplier = 1.0;
    if (companyType === 'JOINT_STOCK') companyMultiplier = 1.35;
    else if (companyType === 'LLC') companyMultiplier = 1.15;
    else if (companyType === 'PARTNERSHIP') companyMultiplier = 1.0;
    else if (companyType === 'SOLE_PROPRIETORSHIP') companyMultiplier = 0.85;
    else if (companyType === 'FREELANCE') companyMultiplier = 0.80;

    // Multiplier for activity size
    let scaleMultiplier = 1.0;
    if (activityScale === 'SMALL') scaleMultiplier = 0.85;
    else if (activityScale === 'MEDIUM') scaleMultiplier = 1.0;
    else if (activityScale === 'LARGE') scaleMultiplier = 1.35;
    else if (activityScale === 'MEGA') scaleMultiplier = 1.75;

    // Multiplier for urgency
    let urgencyMultiplier = 1.0;
    if (urgencyLevel === 'URGENT') urgencyMultiplier = 1.25;
    else if (urgencyLevel === 'SUPER_URGENT') urgencyMultiplier = 1.5;

    let calculatedFee = Math.round(fee * companyMultiplier * scaleMultiplier * urgencyMultiplier);

    // Apply discount if any
    if (customDiscountPercent > 0) {
      calculatedFee = Math.round(calculatedFee * (1 - customDiscountPercent / 100));
    }

    // Adjust gov fees based on scale if corporate
    if (selectedPreset.category === 'COMPANY_ESTABLISHMENT') {
      if (activityScale === 'LARGE') govFees = Math.round(govFees * 1.3);
      if (activityScale === 'MEGA') govFees = Math.round(govFees * 1.6);
    }

    const minFee = Math.round(calculatedFee * 0.9);
    const maxFee = Math.round(calculatedFee * 1.15);

    const totalEstimatedCost = calculatedFee + govFees;

    return {
      recommendedFee: calculatedFee,
      minFee,
      maxFee,
      estimatedGovFees: govFees,
      totalCost: totalEstimatedCost,
      estimatedDays: urgencyLevel === 'SUPER_URGENT' ? Math.max(2, Math.round(selectedPreset.days * 0.5)) : urgencyLevel === 'URGENT' ? Math.max(3, Math.round(selectedPreset.days * 0.75)) : selectedPreset.days,
      govBreakdown: selectedPreset.govFeeBreakdown.map((g) => ({
        ...g,
        amount: Math.round(g.amount * (govFees / selectedPreset.baseGovFees)),
      })),
    };
  }, [selectedPreset, companyType, activityScale, urgencyLevel, customDiscountPercent]);

  if (!isOpen) return null;

  const filteredPresets = PROCEDURE_PRESETS.filter((p) => {
    if (selectedGroup === 'ALL') return true;
    return p.group === selectedGroup;
  });

  const handleApply = () => {
    if (onApplyEstimate) {
      onApplyEstimate({
        title: selectedPreset.title,
        category: selectedPreset.category,
        agreedFees: calculation.recommendedFee,
        governmentFees: calculation.estimatedGovFees,
        notes: `${selectedPreset.notesTemplate}\n(تم التقدير الذكي استناداً لنوع المنشأة: ${companyType} وحجم النشاط: ${activityScale}).`,
      });
    }
    onClose();
  };

  const handleCopyQuoteText = () => {
    const quoteText = `🏢 *مكتب المحاسب القانوني ومراقب الحسابات*
عناية السادة / ${client?.name || 'العميل الكريم'}
تحية طيبة وبعد،،

📋 *بيان التقدير المالي المبدئي للإجراء المحاسبي:*
🔹 *الإجراء / المعاملة:* ${selectedPreset.title}
🔹 *الشكل القانوني:* ${companyType}
🔹 *المدة الزمنية المتوقعة للتنفيذ:* ${calculation.estimatedDays} يوم عمل

💰 *البيان المالي والرسوم:*
• أتعاب المكتب المهنية المقترحة: *${formatEgyptianCurrency(calculation.recommendedFee)}*
• الرسوم والمصروفات الحكومية المتوقعة: *${formatEgyptianCurrency(calculation.estimatedGovFees)}*
• ━━━━━━━━━━━━━━━━━━━━
• *إجمالي التكلفة التقديرية:* *${formatEgyptianCurrency(calculation.totalCost)}*

📌 *نطاق الأعمال المتضمن في الإجراء:*
${selectedPreset.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

⚠️ *ملاحظات وشروط السداد:*
${selectedPreset.notesTemplate}

مع وافر التقدير والاحترام،،`;

    navigator.clipboard.writeText(quoteText);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Calculator className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-amber-400">
                  نظام التقدير الذكي لرسوم وأتعاب الإجراءات المحاسبية
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  محرك احتساب ذكي (AI/Rules)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تقدير دقيق للأتعاب المهنية والمصروفات والرسوم الحكومية الرسمية وفق المعايير المصرية ولوائح الجهات
                {client && (
                  <span className="text-amber-300 font-bold mr-1">
                    • العميل المختار: {client.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-slate-800">
          {/* Left Column: Preset Selection & Parameters (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedGroup('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGroup === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                كافة المعاملات ({PROCEDURE_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('CORPORATE')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGroup === 'CORPORATE'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                تأسيس وتعديل شركات
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('TAX')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGroup === 'TAX'
                    ? 'bg-amber-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ضرائب وفحص ولجان
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('AUDIT')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGroup === 'AUDIT'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                مراجعة وقوائم مالية
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('STUDIES')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGroup === 'STUDIES'
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                دراسات واستشارات
              </button>
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اختر نوع الإجراء أو المعاملة المراد تقدير تكاليفها:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50/70 border border-slate-200 rounded-2xl">
                {filteredPresets.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`text-right p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {preset.groupLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ~{preset.days} يوم
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {preset.title}
                        </h4>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">الأتعاب المبدئية:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatEgyptianCurrency(preset.baseFee)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modifiers & Parameters Grid */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>معايير الضبط التقديري الدقيق (Smart Modifiers)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Company Type */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الشكل القانوني للمنشأة:</label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="JOINT_STOCK">شركة مساهمة (ش.م.م) +35%</option>
                    <option value="LLC">مسؤولية محدودة (ش.ذ.م.م) +15%</option>
                    <option value="PARTNERSHIP">شركة أشخاص / تضامن قياسي</option>
                    <option value="SOLE_PROPRIETORSHIP">منشأة فردية -15%</option>
                    <option value="FREELANCE">مهن حرة / فردي -20%</option>
                  </select>
                </div>

                {/* Activity Scale */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حجم النشاط ورأس المال:</label>
                  <select
                    value={activityScale}
                    onChange={(e) => setActivityScale(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="SMALL">صغير / ناشئ (أقل من 500 ألف)</option>
                    <option value="MEDIUM">متوسط قياسي (500 ألف - 5 مليون)</option>
                    <option value="LARGE">كبير ومتقدم (5 - 20 مليون) +35%</option>
                    <option value="MEGA">شركات كبرى ومجموعات +75%</option>
                  </select>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">درجة الاستعجال والتنفيذ:</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="NORMAL">عادي (المدة النظامية)</option>
                    <option value="URGENT">عاجل وأولوية سريعة (+25%)</option>
                    <option value="SUPER_URGENT">طارئ جداً وخاص (+50%)</option>
                  </select>
                </div>
              </div>

              {/* Discount and Adjustments */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-bold">خصم خاص أو تسوية أتعاب (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={customDiscountPercent}
                    onChange={(e) => setCustomDiscountPercent(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-xs"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>المدة الزمنية التقديرية:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    ~ {calculation.estimatedDays} يوم عمل
                  </span>
                </div>
              </div>
            </div>

            {/* Scope Deliverables */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="block text-xs font-bold text-slate-900 mb-2 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                المخرجات والخدمات المشمولة في نطاق هذا الإجراء:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {selectedPreset.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Financial Breakdown & Action Output (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* The Main Calculation Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  صافي التقدير المحسوب
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedPreset.category}
                </span>
              </div>

              {/* Recommended Fee Box */}
              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  الأتعاب المهنية المقترحة للمكتب:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatEgyptianCurrency(calculation.recommendedFee)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>المدى التقديري العادل:</span>
                  <span className="font-mono text-slate-300">
                    {formatEgyptianCurrency(calculation.minFee)} - {formatEgyptianCurrency(calculation.maxFee)}
                  </span>
                </div>
              </div>

              {/* Gov Fees Box */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">المصروفات والرسوم الحكومية التقديرية:</span>
                  <span className="text-sm font-bold font-mono text-rose-300">
                    {formatEgyptianCurrency(calculation.estimatedGovFees)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  (رسوم هيئات، نقابات، سجل تجاري، غرف تجارية، طوابع ونشر)
                </p>
              </div>

              {/* Total Package Cost */}
              <div className="pt-3 border-t border-slate-700 bg-slate-800/40 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">إجمالي التكلفة المتوقعة:</span>
                  <span className="text-[10px] text-slate-400">شاملة الرسوم والأتعاب المهنية</span>
                </div>
                <span className="text-xl font-black font-mono text-amber-400">
                  {formatEgyptianCurrency(calculation.totalCost)}
                </span>
              </div>
            </div>

            {/* Gov Fees Itemized Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-rose-600" />
                تفصيل بنود الرسوم والمصروفات الحكومية المتوقعة:
              </span>
              <div className="space-y-1.5 text-xs">
                {calculation.govBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.item}</span>
                      <span className="text-[10px] text-slate-400">{item.notes}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-700">
                      {formatEgyptianCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {onApplyEstimate && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>تطبيق هذا التقدير وتعبئة بيانات الإجراء تلقائياً</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyQuoteText}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                >
                  {copiedQuote ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم نسخ العرض!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>نسخ نص العرض للواتساب</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-blue-200"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>طباعة عرض التقدير</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
