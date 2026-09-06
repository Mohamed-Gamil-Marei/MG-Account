import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Briefcase,
  FileText,
  DollarSign,
  Clock,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Mail,
  MessageCircle,
  Calendar,
  Layers,
  Percent,
  Receipt,
  FileSpreadsheet,
  Check,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  FeeQuotationEstimate,
  ProcedureServiceType,
  EntityLegalType,
  LegalComplexityLevel,
  AccountingSystemQuality,
  AuditEngagementContract,
} from '../../types';
import { WhatsAppApiService, WhatsAppApiQuotationPayload } from '../../services/whatsappApiService';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface FeeEstimatorViewProps {
  state: DatabaseState;
  onConvertToContract?: (contract: AuditEngagementContract) => void;
}

// Preset defaults for Egyptian accounting procedures
interface ProcedurePreset {
  title: string;
  defaultPartnerHours: number;
  defaultManagerHours: number;
  defaultSeniorHours: number;
  defaultGovFees: number;
  defaultDurationDays: number;
  defaultComplexity: LegalComplexityLevel;
  defaultScope: string[];
  defaultDeliverables: string[];
  defaultPaymentTerms: { milestoneName: string; percentage: number }[];
}

const PROCEDURE_PRESETS: Record<ProcedureServiceType, ProcedurePreset> = {
  ANNUAL_AUDIT: {
    title: 'مراجعة وتدقيق القوائم المالية السنوية وإصدار تقرير مراقب الحسابات المستقل',
    defaultPartnerHours: 15,
    defaultManagerHours: 35,
    defaultSeniorHours: 60,
    defaultGovFees: 3000,
    defaultDurationDays: 25,
    defaultComplexity: 'HIGH',
    defaultScope: [
      'فحص واختبار نظام الرقابة الداخلية وإجراءات مطابقة الأرصدة البنكية والمصادقات',
      'حضور جرد الأصول الثابتة والمخزون السلعي بنهاية السنة المالية',
      'فحص واختبار قيود اليومية ومطابقة إقرارات ضريبة القيمة المضافة والمرتبات مع الدفاتر',
      'إعداد مسودة القوائم المالية المستقلة والإيضاحات المتممة وفقاً لمعايير المحاسبة المصرية (EAS)',
      'إصدار تقرير مراقب الحسابات المستقل واعتماده والتوقيع للجمعية العمومية للمساهمين',
    ],
    defaultDeliverables: [
      'نسخ أصلية معتمدة من القوائم المالية المدققة وموقعة ومختومة بخاتم مراقب الحسابات',
      'تقرير مراقب الحسابات المستقل الموجه للجمعية العامة العادية للمساهمين',
      'خطاب الإدارة (Management Letter) متضمناً توصيات الرقابة الداخلية والنقاط الجوهرية',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة التعاقد وبدء خطة المراجعة التمهيدية', percentage: 35 },
      { milestoneName: 'دفعة استكمال الاختبارات التفصيلية ومطابقة الجرد', percentage: 35 },
      { milestoneName: 'دفعة تسليم القوائم المالية المعتمدة وتقرير المراجع', percentage: 30 },
    ],
  },
  TAX_INSPECTION_DEFENSE: {
    title: 'إعداد ملف الدفاع الضريبي وحضور جلسات الفحص واللجنة الداخلية لضرائب الدخل والقيمة المضافة',
    defaultPartnerHours: 12,
    defaultManagerHours: 25,
    defaultSeniorHours: 35,
    defaultGovFees: 2000,
    defaultDurationDays: 45,
    defaultComplexity: 'HIGH',
    defaultScope: [
      'فحص ومراجعة الإقرارات الضريبية السابقة ونماذج (19 ضريبة دخل) و(15 قيمة مضافة)',
      'إعداد المذكرات القانونية والضريبية للطعن وتقديم أوجه الدفاع المستندي والدفترى',
      'حضور جلسات المأمورية واللجنة الداخلية لإنهاء الخلاف الضريبي بأقل وعاء خاضع',
      'استخراج النماذج والشهادات المعتمدة بالمخالصة وبراءة الذمة الضريبية',
    ],
    defaultDeliverables: [
      'مذكرة الدفاع الضريبية المعتمدة المؤيدة بالمستندات والقوانين والتعليمات التنفيذية',
      'محضر اتفاق اللجنة الداخلية ونموذج الربط الضريبي النهائي المعتمد',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة مقدمة عند إعداد المذكرة ودراسة الملف والطعن', percentage: 50 },
      { milestoneName: 'دفعة مؤخرة عند التوقيع على الاتفاق النهائي وتسلم النموذج', percentage: 50 },
    ],
  },
  COMPANY_FORMATION: {
    title: 'تأسيس شركة واستخراج السجل التجاري والبطاقة الضريبية وتراخيص هيئة الاستثمار (GAFI)',
    defaultPartnerHours: 8,
    defaultManagerHours: 18,
    defaultSeniorHours: 25,
    defaultGovFees: 8500,
    defaultDurationDays: 14,
    defaultComplexity: 'MEDIUM',
    defaultScope: [
      'صياغة عقد التأسيس والنظام الأساسي للشركة واعتماده من نقابة المحامين وهيئة الاستثمار',
      'استخراج شهادة عدم الالتباس والموافقة الأمنية للشركاء الأجانب إن وجدوا',
      'إنهاء إجراءات فتح الحساب البنكي وإيداع رأس المال واستخراج السجل التجاري المميكن',
      'استخراج البطاقة الضريبية وفتح الملف التأميني وتفعيل منظومة الفاتورة الإلكترونية',
    ],
    defaultDeliverables: [
      'عقد تأسيس الشركة والنظام الأساسي الموثقين بالشهر العقاري وهيئة الاستثمار',
      'السجل التجاري الأصلي الصالح والبطاقة الضريبية المميكنة',
      'شهادة تسجيل ضريبة القيمة المضافة وملف التأمينات الاجتماعية',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة التعاقد وبدء إجراءات عدم الالتباس والتوكيلات', percentage: 50 },
      { milestoneName: 'دفعة تسليم السجل التجاري والبطاقة الضريبية وكافة الوثائق', percentage: 50 },
    ],
  },
  ETA_COMPLIANCE: {
    title: 'تأهيل وتكامل منظومة الفاتورة والإيصال الإلكتروني وشهادات الختم والربط البرمجي (ETA)',
    defaultPartnerHours: 6,
    defaultManagerHours: 15,
    defaultSeniorHours: 20,
    defaultGovFees: 1500,
    defaultDurationDays: 10,
    defaultComplexity: 'LOW',
    defaultScope: [
      'استخراج وتفعيل شهادة الختم الإلكتروني وتوكيد الشركة على بورتال الضرائب المصرية',
      'تكويد الأصناف والخدمات وفقاً لدليل المعايير الدولية (GS1 / EGS) وربطها بنظام الشركة',
      'تدريب الكادر المحاسبي على إصدار الفواتير والإشعارات واعتمادها من البوابة',
      'إجراء اختبارات التكامل والتسليم النهائي لبيئة التشغيل الفعلية (Production)',
    ],
    defaultDeliverables: [
      'حساب مصلحة الضرائب المصرية مفعل ومربوط بالختم الإلكتروني',
      'دليل تكويد الأصناف المعتمد وشهادة نجاح التكامل البرمجي',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة التعاقد والبدء في استخراج الختم والتكويد', percentage: 60 },
      { milestoneName: 'دفعة التسليم النهائي واختبار أول حزمة فواتير ناجحة', percentage: 40 },
    ],
  },
  FEASIBILITY_STUDY: {
    title: 'إعداد دراسة جدوى اقتصادية شاملة ونموذج تقييم مالي وائتماني للبنوك وجهات التمويل',
    defaultPartnerHours: 20,
    defaultManagerHours: 40,
    defaultSeniorHours: 50,
    defaultGovFees: 1000,
    defaultDurationDays: 30,
    defaultComplexity: 'HIGH',
    defaultScope: [
      'إعداد الدراسة التسويقية والفنية وتحليل الطاقة الإنتاجية وتكاليف التشغيل',
      'بناء النموذج المالي التفصيلي لـ 5 سنوات قادمة (قوائم دخل وتدفقات نقدية وميزانيات تقديرية)',
      'حساب مؤشرات الجدوى: صافي القيمة الحالية (NPV)، معدل العائد الداخلي (IRR)، وفترة الاسترداد',
      'تحليل الحساسية واختبارات الضغط للسيناريوهات المتشائمة',
    ],
    defaultDeliverables: [
      'مجلد دراسة الجدوى الاقتصادية الشاملة المعتمد بخاتم المحاسب القانوني ومراقب الحسابات',
      'ملف النموذج المالي التفاعلي (Financial Model Spreadsheet)',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة التعاقد وجمع البيانات والمسوح الميدانية', percentage: 40 },
      { milestoneName: 'دفعة إنجاز المسودة الأولى للنموذج المالي', percentage: 30 },
      { milestoneName: 'دفعة تسليم الدراسة المعتمدة نهائياً', percentage: 30 },
    ],
  },
  RESTRUCTURING_CAPITAL: {
    title: 'إجراءات زيادة رأس المال وتعديل عقد التأسيس وإصدار تقرير مراقب الحسابات بالتحقق المالي',
    defaultPartnerHours: 12,
    defaultManagerHours: 25,
    defaultSeniorHours: 35,
    defaultGovFees: 4000,
    defaultDurationDays: 20,
    defaultComplexity: 'HIGH',
    defaultScope: [
      'فحص قيود زيادة رأس المال ومراجعة حسابات الأرصدة الدائنة أو الأرباح المرحلة المراد رسملتها',
      'إصدار تقرير مراقب الحسابات المستقل بشأن صحة وجدية الزيادة وفقاً لقانون الشركات 159',
      'حضور وإعداد محضر الجمعية العامة غير العادية (EGM) والتصديق عليه بهيئة الاستثمار',
      'تأشير الزيادة بالسجل التجاري ونشر التعديل في صحيفة الاستثمار والجريدة الرسمية',
    ],
    defaultDeliverables: [
      'تقرير مراقب الحسابات المعتمد بشأن التحقق من الزيادة النقدية أو الرسملة',
      'محضر الجمعية غير العادية المصدق من هيئة الاستثمار والسجل التجاري المحدث',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة التعاقد وإصدار تقرير التحقق المحاسبي', percentage: 50 },
      { milestoneName: 'دفعة التأشير في السجل التجاري واستلام الوثائق المحدثة', percentage: 50 },
    ],
  },
  MONTHLY_RETAINER: {
    title: 'عقد استشارات ومتابعة محاسبية وضريبية شهرية مستمرة (Financial & Tax Retainer)',
    defaultPartnerHours: 8,
    defaultManagerHours: 20,
    defaultSeniorHours: 35,
    defaultGovFees: 500,
    defaultDurationDays: 30,
    defaultComplexity: 'MEDIUM',
    defaultScope: [
      'مراجعة دورية لقيود اليومية والدفاتر والتوجيه المحاسبي وفقاً لمعايير المحاسبة المصرية',
      'إعداد وتقديم إقرارات ضريبة القيمة المضافة (نموذج 10) وضريبة كسب العمل (نموذج 4 مرتبات)',
      'إعداد تقارير الأداء المالي والتحليل الرقابي الشهري للإدارة العليا',
      'تقديم الاستشارات المالية والضريبية الدورية والرد على استفسارات الشركة الفورية',
    ],
    defaultDeliverables: [
      'إشعارات تقديم الإقرارات الضريبية الشهرية والربع سنوية المعتمدة',
      'تقرير الرقابة المالية والملاحظات المحاسبية الشهرية للإدارة',
    ],
    defaultPaymentTerms: [
      { milestoneName: 'دفعة شهرية مستحقة في بداية كل شهر تعاقدي', percentage: 100 },
    ],
  },
};

const COMPLEXITY_MULTIPLIERS: Record<LegalComplexityLevel, { label: string; multiplier: number; desc: string }> = {
  LOW: { label: 'بسيط / نشاط خدمي محدد (1.0x)', multiplier: 1.0, desc: 'حجم مستندات محدود، تعاملات واضحة بدون تعقيد تنظيمي' },
  MEDIUM: { label: 'متوسط / نشاط تجاري وصناعي عادي (1.25x)', multiplier: 1.25, desc: 'حركة مستندية منتظمة، خطوط إنتاج وتوزيع محدودة' },
  HIGH: { label: 'متقدم / استيراد وتصدير وفروع متعددة (1.6x)', multiplier: 1.6, desc: 'عملات أجنبية، فحص سنوات سابقة، تعدد مأموريات وفروع' },
  VERY_HIGH: { label: 'معقد جداً / لجان طعن، دمج وتصفية وإعادة هيكلة (2.0x)', multiplier: 2.0, desc: 'نزاعات قضائية وضريبية شائكة، إعادة تقييم أصول' },
};

const QUALITY_MULTIPLIERS: Record<AccountingSystemQuality, { label: string; multiplier: number; desc: string }> = {
  REGULAR_ERP: { label: 'نظام ERP إلكتروني منتظم وموثق (1.0x)', multiplier: 1.0, desc: 'قيود ومستندات مدققة رقمياً تقلل زمن الفحص الميداني' },
  MANUAL_BOOKS: { label: 'دفاتر ورقية ومستندات يدوية (1.3x)', multiplier: 1.3, desc: 'تتطلب جهداً إضافياً في التدقيق اليدوي ومطابقة الفواتير' },
  NO_SYSTEM: { label: 'عدم وجود نظام محاسبي / فوضى مستندية (1.7x)', multiplier: 1.7, desc: 'تتطلب إعادة بناء الحسابات من الصفر وتسوية الأرصدة' },
};

export const FeeEstimatorView: React.FC<FeeEstimatorViewProps> = ({ state, onConvertToContract }) => {
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'QUOTATIONS_HISTORY'>('CALCULATOR');
  const [quotations, setQuotations] = useState<FeeQuotationEstimate[]>(() => db.getFeeEstimates());

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(state.clients[0]?.id || '');
  const [clientName, setClientName] = useState<string>(state.clients[0]?.name || '');
  const [contactPerson, setContactPerson] = useState<string>(state.clients[0]?.contactPerson || '');
  const [phone, setPhone] = useState<string>(state.clients[0]?.phone || '01001234567');
  const [email, setEmail] = useState<string>(state.clients[0]?.email || '');

  // Criteria State
  const [procedureType, setProcedureType] = useState<ProcedureServiceType>('ANNUAL_AUDIT');
  const [procedureTitle, setProcedureTitle] = useState<string>(PROCEDURE_PRESETS.ANNUAL_AUDIT.title);
  const [legalType, setLegalType] = useState<EntityLegalType>('JOINT_STOCK');
  const [complexityLevel, setComplexityLevel] = useState<LegalComplexityLevel>('HIGH');
  const [accountingQuality, setAccountingQuality] = useState<AccountingSystemQuality>('REGULAR_ERP');
  const [annualTurnoverBracket, setAnnualTurnoverBracket] = useState<string>('50M - 100M EGP');
  const [branchesCount, setBranchesCount] = useState<number>(1);

  // Hourly Breakdown State
  const [partnerHours, setPartnerHours] = useState<number>(PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultPartnerHours);
  const [partnerRate, setPartnerRate] = useState<number>(2000); // EGP/hr
  const [managerHours, setManagerHours] = useState<number>(PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultManagerHours);
  const [managerRate, setManagerRate] = useState<number>(1000); // EGP/hr
  const [seniorHours, setSeniorHours] = useState<number>(PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultSeniorHours);
  const [seniorRate, setSeniorRate] = useState<number>(500); // EGP/hr

  // Adjustments & Expenses
  const [govFees, setGovFees] = useState<number>(PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultGovFees);
  const [discountPct, setDiscountPct] = useState<number>(10);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [executionDays, setExecutionDays] = useState<number>(PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultDurationDays);
  const [notes, setNotes] = useState<string>('عرض السعر يشمل حضور الجلسات والاجتماعات التنسيقية وتمثيل الشركة أمام الجهات المختصة.');

  // Scope and Deliverables
  const [scopeItems, setScopeItems] = useState<string[]>([...PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultScope]);
  const [deliverables, setDeliverables] = useState<string[]>([...PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultDeliverables]);
  const [newScopeText, setNewScopeText] = useState<string>('');

  // Payment Schedule
  const [paymentMilestones, setPaymentMilestones] = useState<{ milestoneName: string; percentage: number }[]>(
    [...PROCEDURE_PRESETS.ANNUAL_AUDIT.defaultPaymentTerms]
  );

  // Modals & Feedback
  const [activeQuotationForModal, setActiveQuotationForModal] = useState<FeeQuotationEstimate | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState<string>('');

  // Handle Client Selection Change
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = state.clients.find((c) => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setContactPerson(client.contactPerson || '');
      setPhone(client.phone || '01001234567');
      setEmail(client.email || '');
      if (client.commercialType) {
        if (client.commercialType.includes('مساهمة')) setLegalType('JOINT_STOCK');
        else if (client.commercialType.includes('مسؤولية') || client.commercialType.includes('ذ.م.م')) setLegalType('LLC');
        else if (client.commercialType.includes('فرد')) setLegalType('SOLE_PROPRIETORSHIP');
      }
    }
  };

  // Handle Procedure Type Preset Selection
  const handleProcedureTypeChange = (type: ProcedureServiceType) => {
    setProcedureType(type);
    const preset = PROCEDURE_PRESETS[type];
    if (preset) {
      setProcedureTitle(preset.title);
      setPartnerHours(preset.defaultPartnerHours);
      setManagerHours(preset.defaultManagerHours);
      setSeniorHours(preset.defaultSeniorHours);
      setGovFees(preset.defaultGovFees);
      setExecutionDays(preset.defaultDurationDays);
      setComplexityLevel(preset.defaultComplexity);
      setScopeItems([...preset.defaultScope]);
      setDeliverables([...preset.defaultDeliverables]);
      setPaymentMilestones([...preset.defaultPaymentTerms]);
    }
  };

  // Live Calculations
  const calculations = useMemo(() => {
    const totalHours = partnerHours + managerHours + seniorHours;
    const baseLaborCost = partnerHours * partnerRate + managerHours * managerRate + seniorHours * seniorRate;

    const compMultiplier = COMPLEXITY_MULTIPLIERS[complexityLevel].multiplier;
    const qualMultiplier = QUALITY_MULTIPLIERS[accountingQuality].multiplier;

    // Additional branch factor (e.g. +5% per extra branch beyond 1)
    const branchMultiplier = 1 + Math.max(0, branchesCount - 1) * 0.05;

    const grossCalculatedFee = Math.round(baseLaborCost * compMultiplier * qualMultiplier * branchMultiplier);
    const discountAmount = Math.round((grossCalculatedFee * discountPct) / 100);
    const netProfFee = Math.round(grossCalculatedFee - discountAmount);

    const vatAmount = includeVat ? Math.round(netProfFee * 0.14) : 0;
    const grandTotal = netProfFee + govFees + vatAmount;

    // Milestones with amounts
    const calculatedMilestones = paymentMilestones.map((m) => ({
      milestoneName: m.milestoneName,
      percentage: m.percentage,
      amount: Math.round((grandTotal * m.percentage) / 100),
    }));

    return {
      totalHours,
      baseLaborCost,
      compMultiplier,
      qualMultiplier,
      branchMultiplier,
      grossCalculatedFee,
      discountAmount,
      netProfFee,
      vatAmount,
      grandTotal,
      calculatedMilestones,
    };
  }, [
    partnerHours,
    partnerRate,
    managerHours,
    managerRate,
    seniorHours,
    seniorRate,
    complexityLevel,
    accountingQuality,
    branchesCount,
    discountPct,
    includeVat,
    govFees,
    paymentMilestones,
  ]);

  // Generate / Save Quotation Object
  const generateQuotationObject = (): FeeQuotationEstimate => {
    const quoteNum = `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const validUntil = validUntilDate.toISOString().split('T')[0];

    return {
      id: `quo-${Date.now()}`,
      quotationNumber: quoteNum,
      date: today,
      validUntil,
      clientId: selectedClientId,
      clientName: clientName || 'عميل تجريبي',
      contactPerson,
      phone: phone || '01001234567',
      email,
      procedureType,
      procedureTitle,
      legalType,
      complexityLevel,
      accountingQuality,
      annualTurnoverBracket,
      branchesCount,
      hourlyBreakdown: {
        partnerHours,
        partnerHourlyRate: partnerRate,
        managerHours,
        managerHourlyRate: managerRate,
        seniorAuditorHours: seniorHours,
        seniorAuditorHourlyRate: seniorRate,
      },
      totalEstimatedHours: calculations.totalHours,
      baseLaborCost: calculations.baseLaborCost,
      complexityMultiplier: calculations.compMultiplier,
      qualityMultiplier: calculations.qualMultiplier,
      calculatedProfessionalFee: calculations.grossCalculatedFee,
      discountPercentage: discountPct,
      netProfessionalFee: calculations.netProfFee,
      estimatedGovFees: govFees,
      taxVatFee: calculations.vatAmount,
      totalQuotationAmount: calculations.grandTotal,
      scopeItems: [...scopeItems],
      clientDeliverables: [...deliverables],
      paymentTerms: calculations.calculatedMilestones,
      executionDurationDays: executionDays,
      notes,
      verificationCode: `VER-${quoteNum}`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
  };

  const handleSaveQuotation = () => {
    const quote = generateQuotationObject();
    const saved = db.saveFeeEstimate(quote);
    setQuotations(db.getFeeEstimates());
    setToastMessage(`تم حفظ عرض السعر رقم (${saved.quotationNumber}) بنجاح.`);
    setTimeout(() => setToastMessage(null), 4000);
    return saved;
  };

  // Direct WhatsApp Business API Dispatch
  const handleDirectWhatsAppApiSend = async (targetQuote?: FeeQuotationEstimate) => {
    const quote = targetQuote || generateQuotationObject();
    setIsSendingWhatsApp(true);

    const payload: WhatsAppApiQuotationPayload = {
      to: quote.phone,
      clientName: quote.clientName,
      contactPerson: quote.contactPerson,
      referenceCode: quote.quotationNumber,
      procedureTitle: quote.procedureTitle,
      procedureCategory: quote.procedureType,
      scopeOfWork: quote.scopeItems,
      professionalFees: quote.netProfessionalFee,
      governmentFees: quote.estimatedGovFees,
      totalEstimatedCost: quote.totalQuotationAmount,
      validityDays: 30,
      estimatedExecutionDays: quote.executionDurationDays,
      advancePaymentPercentage: quote.paymentTerms[0]?.percentage || 40,
      notes: quote.notes,
      verificationCode: quote.verificationCode,
    };

    try {
      const result = await WhatsAppApiService.sendQuotation(payload);
      if (result.success) {
        db.updateFeeEstimateStatus(quote.id, 'SENT_WHATSAPP');
        setQuotations(db.getFeeEstimates());
        setToastMessage(`تم إرسال عرض السعر مباشرة للعميل عبر WhatsApp Business API بنجاح.`);
      } else {
        // Fallback to web link if direct API credentials are not yet configured
        const text = WhatsAppApiService.formatQuotationMessage(payload);
        const url = WhatsAppApiService.getDirectWebUrl(quote.phone, text);
        window.open(url, '_blank');
        db.updateFeeEstimateStatus(quote.id, 'SENT_WHATSAPP');
        setQuotations(db.getFeeEstimates());
        setToastMessage(`تم تجهيز وإرسال عرض السعر عبر WhatsApp Web للعميل.`);
      }
    } catch (err: any) {
      // Fallback to direct web URL
      const text = WhatsAppApiService.formatQuotationMessage(payload);
      const url = WhatsAppApiService.getDirectWebUrl(quote.phone, text);
      window.open(url, '_blank');
      setToastMessage(`تم فتح واتساب لإرسال العرض للعميل.`);
    } finally {
      setIsSendingWhatsApp(false);
      setIsWhatsAppModalOpen(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Convert Quote to Engagement Contract
  const handleConvertToContract = (quote: FeeQuotationEstimate) => {
    const engagementTypeMap: Record<ProcedureServiceType, AuditEngagementContract['engagementType']> = {
      ANNUAL_AUDIT: 'ANNUAL_AUDIT',
      TAX_INSPECTION_DEFENSE: 'TAX_INSPECTION_DEFENSE',
      COMPANY_FORMATION: 'COMPANY_FORMATION',
      ETA_COMPLIANCE: 'ETA_COMPLIANCE',
      FEASIBILITY_STUDY: 'FEASIBILITY_STUDY',
      RESTRUCTURING_CAPITAL: 'COMPANY_FORMATION',
      MONTHLY_RETAINER: 'ANNUAL_AUDIT',
    };

    const newContract: AuditEngagementContract = {
      id: `cnt-${Date.now()}`,
      contractCode: `ENG-2026-${Math.floor(100 + Math.random() * 900)}`,
      clientId: quote.clientId || 'cl-custom',
      clientName: quote.clientName,
      engagementType: engagementTypeMap[quote.procedureType] || 'ANNUAL_AUDIT',
      fiscalYear: 2026,
      contractDate: quote.date,
      startDate: quote.date,
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      totalAgreedFee: quote.totalQuotationAmount,
      paidAmount: 0,
      remainingAmount: quote.totalQuotationAmount,
      assignedAuditor: 'أ. محمد جميل مرعي',
      status: 'ACTIVE',
      billingSchedule: quote.paymentTerms.map((pt, idx) => ({
        milestoneName: pt.milestoneName,
        dueDate: new Date(new Date().setDate(new Date().getDate() + (idx + 1) * 30)).toISOString().split('T')[0],
        amount: pt.amount,
        isBilled: false,
        isPaid: false,
      })),
      notes: `تم توليد هذا العقد تلقائياً بناءً على عرض السعر المقبول رقم: ${quote.quotationNumber}`,
    };

    db.updateFeeEstimateStatus(quote.id, 'CONVERTED_TO_CONTRACT');
    setQuotations(db.getFeeEstimates());

    if (onConvertToContract) {
      onConvertToContract(newContract);
    }
    setToastMessage(`تم تحويل عرض السعر (${quote.quotationNumber}) إلى عقد ارتباط مهني نشط بنجاح!`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Scope item helpers
  const handleAddScopeItem = () => {
    if (newScopeText.trim()) {
      setScopeItems([...scopeItems, newScopeText.trim()]);
      setNewScopeText('');
    }
  };

  const handleRemoveScopeItem = (index: number) => {
    setScopeItems(scopeItems.filter((_, i) => i !== index));
  };

  // Filtered History
  const filteredQuotations = useMemo(() => {
    if (!searchHistoryQuery.trim()) return quotations;
    const q = searchHistoryQuery.toLowerCase();
    return quotations.filter(
      (item) =>
        item.clientName.toLowerCase().includes(q) ||
        item.quotationNumber.toLowerCase().includes(q) ||
        item.procedureTitle.toLowerCase().includes(q)
    );
  }, [quotations, searchHistoryQuery]);

  const activeQuoteForPrint = activeQuotationForModal || generateQuotationObject();

  return (
    <div className="space-y-6 text-right animate-fadeIn" dir="rtl">
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border border-emerald-800/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>وحدة تقدير الأتعاب المهنية الذكية | Smart Fee Estimator & Quotations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            مقدّر أتعاب الإجراءات وعروض الأسعار التلقائية
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            تحديد معايير الإجراء المحاسبي والضريبي (ساعات العمل، نوع الكيان القانوني، درجة التعقيد، وجودة الدفاتر) وتوليد عرض سعر مهني معتمد وإرساله مباشرة عبر واتساب بيزنس أو البريد الإلكتروني.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'CALCULATOR'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>حاسبة وتقدير جديد</span>
          </button>
          <button
            onClick={() => setActiveTab('QUOTATIONS_HISTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'QUOTATIONS_HISTORY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل عروض الأسعار ({quotations.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab: Calculator */}
      {activeTab === 'CALCULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Inputs & Criteria (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Client & Engagement Profile */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>بيانات العميل ونوع الملف القانوني</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">الخطوة 1 من 4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر من قائمة العملاء</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- عميل جديد / غير مسجل --</option>
                    {state.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.clientCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الشركة / الممول</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: شركة الأمل للتجارة (ش.م.م)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الشخص المسؤول / المخاطب</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="مثال: أ. محمود عبد السلام"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الواتساب / الهاتف</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01001234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Procedure & Complexity Criteria */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>معايير الإجراء والتعقيد القانوني والمحاسبي</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">الخطوة 2 من 4</span>
              </div>

              {/* Procedure Type Selection Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع الإجراء / الخدمة المطلوبة</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { type: 'ANNUAL_AUDIT', label: 'مراجعة قوائم سنوية', icon: FileSpreadsheet },
                    { type: 'TAX_INSPECTION_DEFENSE', label: 'دفاع وفحص ضريبي', icon: ShieldCheck },
                    { type: 'COMPANY_FORMATION', label: 'تأسيس وترخيص شركات', icon: Building2 },
                    { type: 'ETA_COMPLIANCE', label: 'الفاتورة والإيصال (ETA)', icon: Receipt },
                    { type: 'FEASIBILITY_STUDY', label: 'دراسة جدوى وتقييم', icon: DollarSign },
                    { type: 'RESTRUCTURING_CAPITAL', label: 'زيادة وتعديل رأس مال', icon: Layers },
                    { type: 'MONTHLY_RETAINER', label: 'استشارات شهرية', icon: Clock },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = procedureType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleProcedureTypeChange(item.type as ProcedureServiceType)}
                        className={`p-2.5 rounded-xl text-[11px] font-bold border transition-all text-right flex flex-col gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Legal Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الإجراء في العرض</label>
                  <input
                    type="text"
                    value={procedureTitle}
                    onChange={(e) => setProcedureTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الشكل القانوني للكيان</label>
                  <select
                    value={legalType}
                    onChange={(e) => setLegalType(e.target.value as EntityLegalType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="JOINT_STOCK">شركة مساهمة مصرية (ش.م.م)</option>
                    <option value="LLC">شركة ذات مسؤولية محدودة (ش.ذ.م.م)</option>
                    <option value="ONE_PERSON">شركة الشخص الواحد</option>
                    <option value="PARTNERSHIP">شركة تضامن أو توصية</option>
                    <option value="SOLE_PROPRIETORSHIP">منشأة فردية</option>
                    <option value="FOREIGN_BRANCH">فرع شركة أجنبية</option>
                    <option value="NGO">جمعية أو مؤسسة أهلية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">حجم النشاط / رقم الأعمال السنوي</label>
                  <select
                    value={annualTurnoverBracket}
                    onChange={(e) => setAnnualTurnoverBracket(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="أقل من 10 مليون ج.م">أقل من 10 مليون ج.م</option>
                    <option value="10M - 50M EGP">من 10 إلى 50 مليون ج.م</option>
                    <option value="50M - 100M EGP">من 50 إلى 100 مليون ج.م</option>
                    <option value="100M - 250M EGP">من 100 إلى 250 مليون ج.م</option>
                    <option value="أكثر من 250 مليون ج.م">أكثر من 250 مليون ج.م (شركات كبرى)</option>
                  </select>
                </div>
              </div>

              {/* Multiplier Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    درجة التعقيد القانوني والفني ({COMPLEXITY_MULTIPLIERS[complexityLevel].multiplier}x)
                  </label>
                  <select
                    value={complexityLevel}
                    onChange={(e) => setComplexityLevel(e.target.value as LegalComplexityLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.entries(COMPLEXITY_MULTIPLIERS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {COMPLEXITY_MULTIPLIERS[complexityLevel].desc}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    جودة الدفاتر والنظام المحاسبي ({QUALITY_MULTIPLIERS[accountingQuality].multiplier}x)
                  </label>
                  <select
                    value={accountingQuality}
                    onChange={(e) => setAccountingQuality(e.target.value as AccountingSystemQuality)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.entries(QUALITY_MULTIPLIERS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {QUALITY_MULTIPLIERS[accountingQuality].desc}
                  </span>
                </div>
              </div>

              {/* Number of branches */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">عدد الفروع / المواقع الإنتاجية التابعة</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={branchesCount}
                    onChange={(e) => setBranchesCount(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-400">
                    {branchesCount} {branchesCount === 1 ? 'فرع رئيسي' : 'فروع'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Time, Effort & Hourly Rates */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>توزيع ساعات العمل ومعدلات الأتعاب (Man-Hours Engine)</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">الخطوة 3 من 4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Partner */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">الشريك المسئول</span>
                    <span className="text-[10px] text-slate-500 font-mono">Partner</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">الساعات المقدرة</label>
                    <input
                      type="number"
                      min="1"
                      value={partnerHours}
                      onChange={(e) => setPartnerHours(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">سعر الساعة (ج.م)</label>
                    <input
                      type="number"
                      step="100"
                      value={partnerRate}
                      onChange={(e) => setPartnerRate(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
                    <span>التكلفة:</span>
                    <span className="text-white font-bold">{(partnerHours * partnerRate).toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Manager */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400">مدير المراجعة</span>
                    <span className="text-[10px] text-slate-500 font-mono">Manager</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">الساعات المقدرة</label>
                    <input
                      type="number"
                      min="1"
                      value={managerHours}
                      onChange={(e) => setManagerHours(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">سعر الساعة (ج.م)</label>
                    <input
                      type="number"
                      step="100"
                      value={managerRate}
                      onChange={(e) => setManagerRate(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
                    <span>التكلفة:</span>
                    <span className="text-white font-bold">{(managerHours * managerRate).toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Senior Auditor */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400">المراجع المالي</span>
                    <span className="text-[10px] text-slate-500 font-mono">Senior</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">الساعات المقدرة</label>
                    <input
                      type="number"
                      min="1"
                      value={seniorHours}
                      onChange={(e) => setSeniorHours(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">سعر الساعة (ج.م)</label>
                    <input
                      type="number"
                      step="50"
                      value={seniorRate}
                      onChange={(e) => setSeniorRate(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
                    <span>التكلفة:</span>
                    <span className="text-white font-bold">{(seniorHours * seniorRate).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Adjustments: Gov Fees, Discount & VAT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">رسوم حكومية ومباشرة (ج.م)</label>
                  <input
                    type="number"
                    value={govFees}
                    onChange={(e) => setGovFees(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">توثيق، رسوم هيئات وغرف</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">خصم تشجيعي (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Math.max(0, Math.min(50, Number(e.target.value))))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">يخصم من الأتعاب المهنية</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">مدة التنفيذ المقدرة (أيام عمل)</label>
                  <input
                    type="number"
                    min="1"
                    value={executionDays}
                    onChange={(e) => setExecutionDays(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">أيام عمل فعلية</span>
                </div>
              </div>

              {/* VAT Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="includeVat"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="includeVat" className="text-xs text-slate-300 font-bold cursor-pointer">
                  تضمين ضريبة القيمة المضافة على الأتعاب المهنية (14% VAT)
                </label>
              </div>
            </div>

            {/* Section 4: Scope of Work & Deliverables */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>نطاق العمل التعاقدي والمخرجات المسلمة للعميل</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">الخطوة 4 من 4</span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">بنود نطاق العمل (Scope of Work)</label>
                <div className="space-y-2">
                  {scopeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveScopeItem(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newScopeText}
                    onChange={(e) => setNewScopeText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddScopeItem()}
                    placeholder="إضافة بند عمل جديد..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddScopeItem}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات وشروط مهنية إضافية</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Quotation Summary & Dispatch Deck (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-6">
            {/* Real-time Summary Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">معاينة عرض السعر الفوري</span>
                  <h3 className="text-base font-black text-white">{clientName || 'عرض سعر جديد'}</h3>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {calculations.totalHours} ساعة عمل
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">تكلفة ساعات العمل الأساسية:</span>
                  <span>{calculations.baseLaborCost.toLocaleString('ar-EG')} ج.م</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span className="font-sans">معامل التعقيد القانوني ({calculations.compMultiplier}x):</span>
                  <span className="text-emerald-400">+{((calculations.compMultiplier - 1) * 100).toFixed(0)}%</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span className="font-sans">معامل جودة الدفاتر ({calculations.qualMultiplier}x):</span>
                  <span className="text-emerald-400">+{((calculations.qualMultiplier - 1) * 100).toFixed(0)}%</span>
                </div>

                <div className="flex justify-between text-slate-300 border-t border-slate-800/80 pt-2 font-bold">
                  <span className="font-sans">الأتعاب المهنية المحتسبة:</span>
                  <span>{calculations.grossCalculatedFee.toLocaleString('ar-EG')} ج.م</span>
                </div>

                {discountPct > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span className="font-sans">خصم خاص ({discountPct}%):</span>
                    <span>-{calculations.discountAmount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-300 font-bold">
                  <span className="font-sans">صافي الأتعاب المهنية:</span>
                  <span>{calculations.netProfFee.toLocaleString('ar-EG')} ج.م</span>
                </div>

                {govFees > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">المصروفات والرسوم الحكومية:</span>
                    <span>{govFees.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                {includeVat && (
                  <div className="flex justify-between text-amber-300">
                    <span className="font-sans">ضريبة القيمة المضافة (14%):</span>
                    <span>{calculations.vatAmount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 mt-4 text-center">
                  <span className="text-[11px] font-sans font-bold text-slate-400 block mb-1">
                    إجمالي عرض السعر التقديري الشامل
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {calculations.grandTotal.toLocaleString('ar-EG')}{' '}
                    <span className="text-xs text-slate-400 font-sans">جنيه مصري</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 font-sans">
                    شامل كافة مراحل العمل والمذكرات والاعتماد الرسمي
                  </span>
                </div>
              </div>

              {/* Payment Schedule Milestones */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <span className="text-xs font-bold text-slate-300 block mb-2">جدول الدفعات المقترح:</span>
                {calculations.calculatedMilestones.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">{m.milestoneName}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {m.amount.toLocaleString('ar-EG')} ج.م ({m.percentage}%)
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDirectWhatsAppApiSend()}
                  disabled={isSendingWhatsApp}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isSendingWhatsApp ? 'جارٍ الإرسال عبر API...' : 'إرسال عرض السعر عبر واتساب بيزنس'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const quote = handleSaveQuotation();
                      setActiveQuotationForModal(quote);
                      setIsEmailModalOpen(true);
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>إرسال بريد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const quote = handleSaveQuotation();
                      setActiveQuotationForModal(quote);
                      setIsPrintModalOpen(true);
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>طباعة / PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  className="w-full py-2.5 bg-slate-950 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>حفظ العرض في السجل كمسودة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'QUOTATIONS_HISTORY' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                placeholder="بحث برقم العرض أو اسم العميل أو نوع الإجراء..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold shrink-0">
              إجمالي العروض المسجلة: {filteredQuotations.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotations.map((quote) => {
              const statusBadgeMap: Record<FeeQuotationEstimate['status'], { label: string; bg: string; text: string }> = {
                DRAFT: { label: 'مسودة', bg: 'bg-slate-800', text: 'text-slate-300' },
                SENT_WHATSAPP: { label: 'مرسل واتساب', bg: 'bg-emerald-950 border border-emerald-600/40', text: 'text-emerald-400' },
                SENT_EMAIL: { label: 'مرسل بريد', bg: 'bg-blue-950 border border-blue-600/40', text: 'text-blue-400' },
                ACCEPTED: { label: 'تمت الموافقة', bg: 'bg-emerald-900/60 text-white', text: 'text-white' },
                REJECTED: { label: 'ملغي / مرفوض', bg: 'bg-red-950', text: 'text-red-400' },
                CONVERTED_TO_CONTRACT: { label: 'عقد نشط', bg: 'bg-amber-950 border border-amber-600/40', text: 'text-amber-400' },
              };
              const badge = statusBadgeMap[quote.status] || statusBadgeMap.DRAFT;

              return (
                <div key={quote.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400">{quote.quotationNumber}</span>
                      <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">{quote.clientName}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{quote.date}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    {quote.procedureTitle}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">ساعات العمل</span>
                      <span className="text-white font-bold">{quote.totalEstimatedHours} ساعة</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">إجمالي العرض</span>
                      <span className="text-emerald-400 font-bold">{quote.totalQuotationAmount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsAppApiSend(quote)}
                      className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="إرسال عبر واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuotationForModal(quote);
                        setIsPrintModalOpen(true);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                      title="معاينة وطباعة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {quote.status !== 'CONVERTED_TO_CONTRACT' && (
                      <button
                        type="button"
                        onClick={() => handleConvertToContract(quote)}
                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تحويل لعقد ارتباط</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        db.deleteFeeEstimate(quote.id);
                        setQuotations(db.getFeeEstimates());
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && activeQuotationForModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>إرسال عرض السعر عبر البريد الإلكتروني</span>
              </h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">البريد الإلكتروني للعميل</label>
                <input
                  type="email"
                  value={activeQuotationForModal.email || ''}
                  onChange={(e) => setActiveQuotationForModal({ ...activeQuotationForModal, email: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">معاينة نص البريد</label>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-sans text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[11px]">
                  {`السادة / ${activeQuotationForModal.clientName}\nعناية الأستاذ / ${activeQuotationForModal.contactPerson || 'المحترم'}\n\nتحية طيبة وبعد،،\n\nيسر مكتب المحاسب القانوني / محمد جميل مرعي أن يتقدم لسيادتكم بعرض الأتعاب المهنية رقم (${activeQuotationForModal.quotationNumber}) بشأن:\n"${activeQuotationForModal.procedureTitle}"\n\n- إجمالي ساعات العمل المقدرة: ${activeQuotationForModal.totalEstimatedHours} ساعة عمل.\n- إجمالي الأتعاب المقدرة: ${activeQuotationForModal.totalQuotationAmount.toLocaleString('ar-EG')} ج.م.\n- مدة التنفيذ المقدرة: ${activeQuotationForModal.executionDurationDays} يوم عمل.\n\nمرفق لسيادتكم ملف العرض التفصيلي وجدول الدفعات ونطاق العمل المعتمد.\nوتفضلوا بقبول فائق الاحترام والتقدير،،\nمكتب المحاسب القانوني / محمد جميل مرعي`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={`mailto:${activeQuotationForModal.email || ''}?subject=${encodeURIComponent(
                  `عرض أتعاب مهنية - ${activeQuotationForModal.procedureTitle} - ${activeQuotationForModal.quotationNumber}`
                )}&body=${encodeURIComponent(
                  `السادة / ${activeQuotationForModal.clientName}\nتحية طيبة وبعد،،\n\nيسر مكتب المحاسب القانوني / محمد جميل مرعي تقديم عرض الأتعاب المهنية رقم ${activeQuotationForModal.quotationNumber} بمبلغ ${activeQuotationForModal.totalQuotationAmount.toLocaleString(
                    'ar-EG'
                  )} ج.م.\n\nشاكرين ثقتكم الغالية.`
                )}`}
                onClick={() => {
                  db.updateFeeEstimateStatus(activeQuotationForModal.id, 'SENT_EMAIL');
                  setQuotations(db.getFeeEstimates());
                  setIsEmailModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>فتح برنامج البريد والإرسال</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `السادة / ${activeQuotationForModal.clientName}\nعرض أتعاب رقم: ${activeQuotationForModal.quotationNumber}\nالإجراء: ${activeQuotationForModal.procedureTitle}\nالإجمالي: ${activeQuotationForModal.totalQuotationAmount.toLocaleString('ar-EG')} ج.م`
                  );
                  setToastMessage('تم نسخ نص العرض للحافظة بنجاح.');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print / Export Layout Modal */}
      {isPrintModalOpen && activeQuoteForPrint && (
        <PrintLayoutWrapper
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          documentTitle="عرض أتعاب وخدمات مهنية معتمد"
          documentSubtitle={activeQuoteForPrint.procedureTitle}
          documentRefNumber={activeQuoteForPrint.quotationNumber}
          documentDate={activeQuoteForPrint.date}
          companyName={activeQuoteForPrint.clientName}
          qrPayload={JSON.stringify({
            quotationNumber: activeQuoteForPrint.quotationNumber,
            client: activeQuoteForPrint.clientName,
            amount: activeQuoteForPrint.totalQuotationAmount,
            auditor: 'محمد جميل مرعي',
            code: activeQuoteForPrint.verificationCode,
          })}
        >
          <div className="space-y-6 text-slate-800 text-right font-sans" dir="rtl">
            {/* Header Greeting */}
            <div className="border-b pb-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">
                السادة / {activeQuoteForPrint.clientName} المحترمون
              </h3>
              <p className="text-xs text-slate-600">
                عناية الأستاذ / {activeQuoteForPrint.contactPerson || 'المدير المالي والمسؤولين'} • تحية طيبة وتقدير وبعد،،
              </p>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                يسر مكتبنا كمحاسبين قانونيين ومراقبي حسابات معتمدين أن نتقدم لسيادتكم بهذا العرض المهني الفني والمالي لتقديم خدمات:
                <strong className="text-slate-900 block mt-1">« {activeQuoteForPrint.procedureTitle} »</strong>
              </p>
            </div>

            {/* Scope of Work */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded">
                أولاً: نطاق العمل والمسؤوليات المهنية (Scope of Professional Work)
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5 pr-2">
                {activeQuoteForPrint.scopeItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Client Deliverables */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded">
                ثانياً: المخرجات والتقارير المعتمدة المسلمة للعميل (Deliverables)
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5 pr-2">
                {activeQuoteForPrint.clientDeliverables.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Financial Quotation Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded">
                ثالثاً: المقابل المالي والأتعاب المهنية (Professional Fees Schedule)
              </h4>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold">
                    <th className="border border-slate-300 p-2 text-right">البيان والتفاصيل</th>
                    <th className="border border-slate-300 p-2 text-center">ساعات العمل المقدرة</th>
                    <th className="border border-slate-300 p-2 text-left">المبلغ (جنيه مصري)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">الأتعاب المهنية الأساسية للعمل الميداني والاعتماد</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{activeQuoteForPrint.totalEstimatedHours} ساعة</td>
                    <td className="border border-slate-300 p-2 text-left font-mono">{activeQuoteForPrint.netProfessionalFee.toLocaleString('ar-EG')} ج.م</td>
                  </tr>
                  {activeQuoteForPrint.estimatedGovFees > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2">المصروفات المباشرة والرسوم الحكومية والتوثيق</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">-</td>
                      <td className="border border-slate-300 p-2 text-left font-mono">{activeQuoteForPrint.estimatedGovFees.toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                  )}
                  {activeQuoteForPrint.taxVatFee > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2">ضريبة القيمة المضافة (14% VAT)</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">-</td>
                      <td className="border border-slate-300 p-2 text-left font-mono">{activeQuoteForPrint.taxVatFee.toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-2 text-slate-900 text-sm">إجمالي عرض السعر النهائي</td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-emerald-800">{activeQuoteForPrint.totalEstimatedHours} ساعة</td>
                    <td className="border border-slate-300 p-2 text-left font-mono text-slate-900 text-sm">
                      {activeQuoteForPrint.totalQuotationAmount.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Schedule */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded">
                رابعاً: جدول سداد الدفعات ومدة التنفيذ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeQuoteForPrint.paymentTerms.map((m, idx) => (
                  <div key={idx} className="border border-slate-300 p-2 rounded bg-slate-50 text-xs">
                    <span className="font-bold text-slate-800 block mb-1">{m.milestoneName}</span>
                    <span className="font-mono text-slate-900">{m.amount.toLocaleString('ar-EG')} ج.م ({m.percentage}%)</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                • مدة التنفيذ المقدرة: <strong>{activeQuoteForPrint.executionDurationDays} يوم عمل</strong> من تاريخ استلام كافة المستندات وسداد دفعة التعاقد.
              </p>
            </div>

            {/* Acceptance Box */}
            <div className="border-t-2 border-slate-800 pt-4 grid grid-cols-2 gap-6 text-xs">
              <div className="text-right">
                <span className="font-bold block mb-1">المحاسب القانوني ومراقب الحسابات:</span>
                <span className="block font-bold text-slate-900">محمد جميل مرعي</span>
                <span className="text-slate-600 block text-[11px]">سجل م.م رقم 43122 - وزارة المالية</span>
              </div>
              <div className="text-left">
                <span className="font-bold block mb-1">موافقة واعتماد العميل:</span>
                <span className="block text-slate-600 text-[11px]">التوقيع والخاتم: .......................................</span>
                <span className="block text-slate-600 text-[11px] mt-1">التاريخ: ...... / ...... / 2026 م</span>
              </div>
            </div>
          </div>
        </PrintLayoutWrapper>
      )}
    </div>
  );
};
