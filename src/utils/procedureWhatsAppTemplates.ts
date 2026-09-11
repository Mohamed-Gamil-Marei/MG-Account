/**
 * Procedure WhatsApp Templates & Message Generator
 * Generates highly customizable, professional WhatsApp notification messages
 * for all accounting, tax, treasury, auditing, and corporate procedures.
 */

import { numberToArabicWords } from './numberToWordsArabic';
import { formatEgyptianCurrency } from './qrCodeGenerator';

export type ProcedureWhatsAppType =
  | 'INVOICE_CLAIM'          // فاتورة أتعاب ومطالبة سداد
  | 'TREASURY_RECEIPT'       // سند قبض نقدية / بنك
  | 'TREASURY_PAYMENT'       // سند صرف / تسوية
  | 'CERTIFICATE_CAPITAL'    // شهادة رأس المال المستثمر وحجم الأعمال
  | 'CERTIFICATE_INCOME'     // شهادة إثبات الدخل السنوي والشهري
  | 'CERTIFICATE_SOLVENCY'   // شهادة ملاءة مالية وموقف بنكي
  | 'CERTIFICATE_AUDITOR'    // تقرير واعتماد مراقب الحسابات
  | 'TAX_DECLARATION'        // إقرار ضريبي (قيمة مضافة / كسب عمل / نموذج 41)
  | 'ETA_INVOICE_SYNC'       // مطابقة منظومة الفاتورة الإلكترونية والإيصال
  | 'FINANCIAL_STATEMENTS'   // القوائم المالية والميزانية العمومية
  | 'AUDIT_REPORT'           // تقرير تدقيق ومراجعة الحسابات السنوي
  | 'COMMERCIAL_REGISTRY'    // السجل التجاري والبطاقة الضريبية وتأسيس الشركات
  | 'IMPORT_CUSTOMS'         // الاعتماد المستندي والإفراج الجمركي (ACID)
  | 'PAYROLL_INSURANCE'      // مسير الرواتب والأجور والتأمينات الاجتماعية
  | 'FEASIBILITY_STUDY'      // دراسة الجدوى الاقتصادية المعتمدة
  | 'GENERAL_NOTICE';        // إشعار مهني وتذكير مخصص

export interface ProcedureWhatsAppContext {
  procedureType: ProcedureWhatsAppType;
  clientName: string;
  contactPerson?: string;
  phone?: string;
  referenceCode?: string;
  title?: string;
  amount?: number;
  includeAmountInWords?: boolean;
  periodOrDate?: string;
  dueDate?: string;
  recipientEntity?: string;
  customNotes?: string;
  verificationCode?: string;
  scopeOfWork?: string[];
  auditorName?: string;
  firmName?: string;
  officePhone?: string;
  additionalDetails?: Record<string, any>;
}

export interface ProcedureTemplateMetadata {
  type: ProcedureWhatsAppType;
  label: string;
  category: 'INVOICING' | 'TREASURY' | 'CERTIFICATES' | 'TAX_ETA' | 'AUDIT_FINANCIALS' | 'CORPORATE_LEGAL' | 'CUSTOMS_TRADE' | 'PAYROLL_HR' | 'GENERAL';
  iconName: string;
  defaultTitle: string;
  defaultDescription: string;
}

export const PROCEDURE_TEMPLATES_METADATA: ProcedureTemplateMetadata[] = [
  {
    type: 'INVOICE_CLAIM',
    label: 'فاتورة أتعاب ومطالبة سداد',
    category: 'INVOICING',
    iconName: 'Receipt',
    defaultTitle: 'مطالبة أتعاب خدمات محاسبية وضريبية',
    defaultDescription: 'إشعار إصدار فاتورة أتعاب مهنية وتفاصيل الدفعة المستحقة مع الحساب البنكي.',
  },
  {
    type: 'TREASURY_RECEIPT',
    label: 'سند قبض بالخزينة / البنك',
    category: 'TREASURY',
    iconName: 'Banknote',
    defaultTitle: 'إشعار تحصيل وسند قبض معتمد',
    defaultDescription: 'إشعار العميل بتوريد الدفعة النقدية أو التحويل البنكي وإصدار سند القبض الرسمي.',
  },
  {
    type: 'TREASURY_PAYMENT',
    label: 'سند صرف وتسوية مصروفات',
    category: 'TREASURY',
    iconName: 'WalletCards',
    defaultTitle: 'إشعار سداد وصرف مصروفات ورسوم',
    defaultDescription: 'إشعار العميل بسداد رسوم حكومية أو مصروفات تخص الملف من حساب الأمانات.',
  },
  {
    type: 'CERTIFICATE_CAPITAL',
    label: 'شهادة رأس المال المستثمر وحجم الأعمال',
    category: 'CERTIFICATES',
    iconName: 'Coins',
    defaultTitle: 'شهادة رأس المال المستثمر وحجم الأعمال المعتمدة',
    defaultDescription: 'إشعار إصدار واعتماد شهادة رأس المال المستثمر للشركات والمنشآت برمز QR كودي.',
  },
  {
    type: 'CERTIFICATE_INCOME',
    label: 'شهادة إثبات صافي الدخل',
    category: 'CERTIFICATES',
    iconName: 'FileCheck',
    defaultTitle: 'شهادة إثبات دخل معتمدة وموثقة',
    defaultDescription: 'إشعار جهوزية شهادة إثبات الدخل الموجهة للبنوك والجهات الرسمية.',
  },
  {
    type: 'CERTIFICATE_SOLVENCY',
    label: 'شهادة الملاءة المالية والموقف البنكي',
    category: 'CERTIFICATES',
    iconName: 'ShieldCheck',
    defaultTitle: 'شهادة الملاءة والمركز المالي المعتمد',
    defaultDescription: 'إشعار اعتماد شهادة الملاءة المالية المعتمدة لمقدمي العطاءات والتمويل.',
  },
  {
    type: 'CERTIFICATE_AUDITOR',
    label: 'تقرير ورأي مراقب الحسابات',
    category: 'CERTIFICATES',
    iconName: 'Award',
    defaultTitle: 'تقرير مراقب الحسابات واعتماد المراجع القانوني',
    defaultDescription: 'إشعار إصدار تقرير مراجع الحسابات المستقل الممهور بالختم الرسمي.',
  },
  {
    type: 'TAX_DECLARATION',
    label: 'إقرار ضريبي وموقف مصلحة الضرائب',
    category: 'TAX_ETA',
    iconName: 'FileSpreadsheet',
    defaultTitle: 'إشعار تقديم واعتماد الإقرار الضريبي',
    defaultDescription: 'إشعار تقديم إقرار القيمة المضافة أو كسب العمل أو نموذج 41 برقم السداد.',
  },
  {
    type: 'ETA_INVOICE_SYNC',
    label: 'الفاتورة الإلكترونية ومطابقة ETA',
    category: 'TAX_ETA',
    iconName: 'QrCode',
    defaultTitle: 'إشعار مطابقة منظومة الفاتورة والإيصال الإلكتروني',
    defaultDescription: 'إشعار استلام ومطابقة الفواتير الإلكترونية بمصلحة الضرائب والمهل المتبقية.',
  },
  {
    type: 'FINANCIAL_STATEMENTS',
    label: 'القوائم المالية المستقلة والميزانية',
    category: 'AUDIT_FINANCIALS',
    iconName: 'BarChart3',
    defaultTitle: 'إشعار جهوزية القوائم المالية المستقلة المعتمدة',
    defaultDescription: 'إشعار العميل باكتمال إعداد القوائم المالية السنوية وإيضاحاتها المتممة.',
  },
  {
    type: 'AUDIT_REPORT',
    label: 'تقرير التدقيق ومراجعة الحسابات',
    category: 'AUDIT_FINANCIALS',
    iconName: 'FileText',
    defaultTitle: 'تقرير الفحص والمراجعة الدفترية السنوي',
    defaultDescription: 'إشعار اكتمال التدقيق المالي وملاحظات الفحص المحاسبي.',
  },
  {
    type: 'COMMERCIAL_REGISTRY',
    label: 'السجل التجاري والبطاقة الضريبية',
    category: 'CORPORATE_LEGAL',
    iconName: 'Building2',
    defaultTitle: 'إشعار تحديث وتوثيق السجل التجاري والبطاقة الضريبية',
    defaultDescription: 'إشعار العميل باستخراج أو تجديد السجل التجاري والبطاقة الضريبية.',
  },
  {
    type: 'IMPORT_CUSTOMS',
    label: 'الاعتماد المستندي والإفراج الجمركي (ACID)',
    category: 'CUSTOMS_TRADE',
    iconName: 'Ship',
    defaultTitle: 'إشعار بوليصة الشحن والنافذة الجمركية الموحدة',
    defaultDescription: 'إشعار العميل بصدور رقم ACID ومتابعة تسوية الرسوم الجمركية والضرائب.',
  },
  {
    type: 'PAYROLL_INSURANCE',
    label: 'مسير الرواتب والتأمينات الاجتماعية',
    category: 'PAYROLL_HR',
    iconName: 'Users',
    defaultTitle: 'إشعار اعتماد مسير الرواتب ونماذج التأمينات',
    defaultDescription: 'إشعار بحساب ضريبة كسب العمل واشتراكات التأمينات الاجتماعية للعاملين.',
  },
  {
    type: 'FEASIBILITY_STUDY',
    label: 'دراسة الجدوى الاقتصادية والمالية',
    category: 'GENERAL',
    iconName: 'TrendingUp',
    defaultTitle: 'إشعار اعتماد دراسة الجدوى الاقتصادية',
    defaultDescription: 'إشعار اكتمال دراسة الجدوى والتحليل المالي للمشروع.',
  },
  {
    type: 'GENERAL_NOTICE',
    label: 'إشعار وتذكير مهني مخصص',
    category: 'GENERAL',
    iconName: 'MessageSquare',
    defaultTitle: 'إشعار واستفسار مهني من مكتب المحاسبة',
    defaultDescription: 'رسالة إشعار أو تذكير حرة موجهة للعميل قابلة للتعديل والصياغة.',
  },
];

/**
 * Builds standard WhatsApp message text from procedure context
 */
export function buildProcedureWhatsAppMessage(ctx: ProcedureWhatsAppContext): string {
  const firm = ctx.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditor = ctx.auditorName || 'أ/ محمد جميل مرعي';
  const phone = ctx.officePhone || '0237654321 / 01003335360';
  const refCode = ctx.referenceCode || `REF-${Date.now().toString().slice(-6)}`;
  const dateStr = ctx.periodOrDate || new Date().toISOString().slice(0, 10);
  const client = ctx.clientName || 'عميل المكتب المحترم';
  const contact = ctx.contactPerson ? `عناية: ${ctx.contactPerson}\n` : '';
  const amt = Number(ctx.amount || 0);

  const amountStr = amt > 0 ? formatEgyptianCurrency(amt) : '';
  const amountWordsStr =
    amt > 0 && ctx.includeAmountInWords !== false
      ? `\n🔹 *المبلغ بالحروف:* فقط ${numberToArabicWords(amt)} لا غير`
      : '';

  const header = `🏛️ *${firm}*\n📜 *محاسبون قانونيون ومستشارون ماليون وضرائب*\n━━━━━━━━━━━━━━━━━━━━\n\nالسادة / *${client}* المحترمين\n${contact}تحية طيبة وبعد،،\n\n`;
  const footer = `\n\n🔒 *كود التوثيق المعتمد:* ${ctx.verificationCode || `MG-${refCode}`}\n📞 هاتف التواصل والمتابعة: ${phone}\n\nمع خالص التقدير والاحترام،\n*${auditor}*\n_محاسب ومراجع قانوني - زميل جمعية المحاسبين والمراجعين المصرية_`;

  let body = '';

  switch (ctx.procedureType) {
    case 'INVOICE_CLAIM':
      body = `نحيط سيادتكم علماً بصدور فاتورة الأتعاب المهنية ومطالبة السداد وفقاً للبيانات التالية:
🧾 *نوع المعاملة:* ${ctx.title || 'أتعاب المراجعة وإعداد الإقرارات الضريبية'}
🔢 *رقم الفاتورة / المطالبة:* #${refCode}
📅 *تاريخ الإصدار:* ${dateStr}
💰 *إجمالي المبلغ المستحق:* *${amountStr}*${amountWordsStr}
${ctx.dueDate ? `⏳ *تاريخ الاستحقاق المقترح:* ${ctx.dueDate}\n` : ''}📌 *طرق السداد المتاحة:* نقداً بخزينة المكتب أو عبر التحويل البنكي لحساب المكتب.
${ctx.customNotes ? `\n📝 *ملاحظات إضافية:* ${ctx.customNotes}` : ''}`;
      break;

    case 'TREASURY_RECEIPT':
      body = `يسرنا تأكيد استلام وتوريد الدفعة المالية الموضحة أدناه وإصدار سند القبض الرسمي المعتمد بخزينة المكتب:
💵 *المبلغ المحصل:* *${amountStr}*${amountWordsStr}
🧾 *رقم سند القبض:* #${refCode}
📋 *البيان:* ${ctx.title || 'سداد دفعة من أتعاب الخدمات المحاسبية والاستشارات'}
📅 *تاريخ التوريد:* ${dateStr}
✅ *حالة التوريد:* تم القيد والترحيل بالدفاتر الرسمية وخزينة المكتب بنجاح.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'TREASURY_PAYMENT':
      body = `نحيط سيادتكم علماً بأنه تم صرف وسداد المبالغ والرسوم الموضحة أدناه لحساب ملف شركتكم:
💸 *المبلغ المصروف:* *${amountStr}*${amountWordsStr}
🧾 *رقم سند الصرف:* #${refCode}
📋 *البيان:* ${ctx.title || 'سداد رسوم حكومية / مصروفات فحص وتوثيق'}
📅 *تاريخ الصرف:* ${dateStr}
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'CERTIFICATE_CAPITAL':
      body = `نحيط سيادتكم علماً بانتهاء أعمال الفحص المحاسبي والمستندي واعتماد وتوثيق:
📜 *شهادة رأس المال المستثمر وحجم الأعمال الرسمية*
🏢 *المنشأة المفحوصة:* ${client}
🔢 *كود الشهادة المعتمد:* #${refCode}
📅 *الفترة / التاريخ المعتمد:* ${dateStr}
${amt > 0 ? `💰 *إجمالي رأس المال المستثمر المعتمد:* *${amountStr}*${amountWordsStr}\n` : ''}${ctx.recipientEntity ? `🏛️ *الجهة الموجه إليها:* ${ctx.recipientEntity}\n` : ''}🛡️ *سند الاعتماد:* تم الفحص والمطابقة على السجلات والدفاتر وشهادات الإيداع البنكية المعتمدة.
✅ الشهادة ممهورة بختم المحاسب القانوني الحي والباركود الرقمي المشفر وجاهزة للاستلام.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'CERTIFICATE_INCOME':
      body = `نحيط سيادتكم علماً بانتهاء أعمال المراجعة والاعتماد لـ:
📑 *شهادة إثبات صافي الدخل السنوي / الشهري المعتمدة*
🏢 *صاحب الشأن / المنشأة:* ${client}
🔢 *رقم الشهادة الرسمي:* #${refCode}
📅 *الفترة المالية المحاسبية:* ${dateStr}
💰 *صافي الدخل المعتمد:* *${amountStr}*${amountWordsStr}
${ctx.recipientEntity ? `🏛️ *الجهة الموجه إليها الشهادة:* ${ctx.recipientEntity}\n` : ''}🛡️ *التوثيق:* مقيدة ومسجلة بسجل المحاسبين والمراجعين بوزارة المالية.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'CERTIFICATE_SOLVENCY':
      body = `يسرنا إحاطتكم بانتهاء التدقيق واعتماد:
🛡️ *شهادة الملاءة المالية والمركز المالي المعتمد*
🏢 *الشركة:* ${client}
🔢 *كود الشهادة المرجعي:* #${refCode}
📅 *تاريخ المركز المالي:* ${dateStr}
${amt > 0 ? `💵 *القيمة / حجم الملاءة المعتمد:* *${amountStr}*${amountWordsStr}\n` : ''}${ctx.recipientEntity ? `🏛️ *الجهة المقدم إليها:* ${ctx.recipientEntity}\n` : ''}📌 تم إصدار الشهادة ومطابقتها وفقاً لمعايير المحاسبة والمراجعة المصرية (EAS).
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'CERTIFICATE_AUDITOR':
      body = `نحيط سيادتكم علماً بصدور واعتماد:
⚖️ *تقرير مراقب الحسابات المستقل واعتماد القوائم المالية*
🏢 *الشركة:* ${client}
🔢 *رقم التقرير المرجعي:* #${refCode}
📅 *عن القوائم المنتهية في:* ${dateStr}
⚖️ *الرأي المهني لمراقب الحسابات:* رأي نظيف وغير مقيد (Unqualified Opinion) يعبر بعدالة ووضوح عن المركز المالي ونتائج الأعمال.
${ctx.customNotes ? `\n📝 *ملاحظات إضافية:* ${ctx.customNotes}` : ''}`;
      break;

    case 'TAX_DECLARATION':
      body = `نحيط سيادتكم علماً بتمام إعداد وتقديم الإقرار الضريبي بنجاح عبر البوابة الإلكترونية لمصلحة الضرائب المصرية (ETA):
📋 *نوع الإقرار:* ${ctx.title || 'إقرار ضريبة القيمة المضافة / كسب العمل'}
📅 *الفترة الضريبية:* ${dateStr}
🔢 *رقم المرجع / كود السداد:* #${refCode}
${amt > 0 ? `💰 *قيمة الضريبة المسددة / المستحقة:* *${amountStr}*${amountWordsStr}\n` : ''}✅ تم توثيق إشعار الاستلام الإلكتروني وحفظه في السجل الضريبي لشركتكم.
${ctx.customNotes ? `\n📝 *ملاحظات الفحص الضريبي:* ${ctx.customNotes}` : ''}`;
      break;

    case 'ETA_INVOICE_SYNC':
      body = `📊 *إشعار متابعة منظومة الفاتورة والإيصال الإلكتروني (ETA)*
🏢 *الشركة:* ${client}
🔢 *رقم المطابقة / الدفعة:* #${refCode}
📅 *الفترة:* ${dateStr}
• *حالة الربط والـ ERP Integration:* نشط ومتزامن بنجاح ✅
• *الفواتير المعتمدة والمطابقة:* تم التحقق من سلامة الأكواد (GS1/EGS) والتوقيع الإلكتروني.
${ctx.dueDate ? `⏰ *تنبيه المهلة القانونية:* يرجى مراجعة إرسال الفواتير قبل موعد الإقفال في ${ctx.dueDate}\n` : ''}${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'FINANCIAL_STATEMENTS':
      body = `يسعدنا إفادتكم بانتهاء أعمال المراجعة والتدقيق، وأصبحت جاهزة للاعتماد:
📊 *القوائم المالية المستقلة الكاملة والإيضاحات المتممة*
🏢 *الشركة:* ${client}
📅 *السنة المالية المنتهية في:* ${dateStr}
🔢 *كود الملف المرجعي:* #${refCode}
${amt > 0 ? `💰 *إجمالي أصول / إيرادات النشاط:* *${amountStr}*${amountWordsStr}\n` : ''}📑 تتضمن القوائم: الميزانية، قائمة الدخل، قائمة التدفقات النقدية، وقائمة التغير في حقوق الملكية.
📌 يرجى التنسيق معنا لتوقيع واعتماد النسخ الرسمية.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'AUDIT_REPORT':
      body = `نحيط سيادتكم علماً باكتمال أعمال الفحص والمراجعة الدفترية لملف شركتكم:
📑 *تقرير المراجعة الدفترية والفحص التحليلي*
🏢 *الشركة:* ${client}
🔢 *كود المرجع:* #${refCode}
📅 *تاريخ الفحص:* ${dateStr}
${ctx.customNotes ? `\n📝 *أهم الملاحظات والتوصيات المهنية:* ${ctx.customNotes}` : ''}`;
      break;

    case 'COMMERCIAL_REGISTRY':
      body = `نحيط سيادتكم علماً بتمام إنهاء الإجراءات القانونية والمستندية التالية:
🏢 *${ctx.title || 'إشعار السجل التجاري والبطاقة الضريبية'}*
🏢 *اسم الشركة / المنشأة:* ${client}
🔢 *رقم القيد / السجل:* #${refCode}
📅 *تاريخ التحديث / الإصدار:* ${dateStr}
✅ تم استيفاء كافة التصديقات ومطابقة الأنشطة التجارية والضريبية.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'IMPORT_CUSTOMS':
      body = `🚢 *إشعار بوليصة الشحن والاعتماد الجمركي (نافذة - ACI)*
🏢 *الشركة المستوردة:* ${client}
🔢 *رقم القيد الجمركي المبدئي (ACID):* #${refCode}
📅 *تاريخ المعاملة:* ${dateStr}
${amt > 0 ? `💵 *القيمة المقدرة للرسالة الجمركية:* *${amountStr}*${amountWordsStr}\n` : ''}📋 *البيان:* ${ctx.title || 'متابعة بوليصة الشحن والتسوية المحاسبية للرسالة الجمركية'}
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'PAYROLL_INSURANCE':
      body = `👥 *إشعار اعتماد مسير الرواتب والضرائب والتأمينات الاجتماعية*
🏢 *الشركة:* ${client}
📅 *عن شهر:* ${dateStr}
🔢 *كود المسير المرجعي:* #${refCode}
${amt > 0 ? `💰 *إجمالي الأجور وصافي المستحق:* *${amountStr}*${amountWordsStr}\n` : ''}• *ضريبة كسب العمل (نموذج 4):* تم الاحتساب بدقة وفقاً لأحدث الشرائح الضريبية.
• *استمارة 2 تأمينات:* تم تحديث أجور الاشتراك التأميني.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'FEASIBILITY_STUDY':
      body = `📈 *إشعار اكتمال واعتماد دراسة الجدوى الاقتصادية والمالية*
🏢 *المشروع / العميل:* ${client}
🔢 *كود الدراسة المعتمد:* #${refCode}
📅 *تاريخ الإصدار:* ${dateStr}
${amt > 0 ? `💰 *إجمالي التكاليف الاستثمارية التقديرية:* *${amountStr}*${amountWordsStr}\n` : ''}📊 تتضمن الدراسة: الجدوى التسويقية، الجدوى الفنية، القوائم المالية التقديرية ومعدل العائد الداخلي (IRR) وفترة الاسترداد.
${ctx.customNotes ? `\n📝 *ملاحظات:* ${ctx.customNotes}` : ''}`;
      break;

    case 'GENERAL_NOTICE':
    default:
      body = `نحيط سيادتكم علماً بالإشعار المهني التالي بخصوص حساب وملف شركتكم:
📋 *موضوع الإشعار:* ${ctx.title || 'إشعار ومتابعة مهنية'}
🔢 *رقم المرجع:* #${refCode}
📅 *التاريخ:* ${dateStr}
${amt > 0 ? `💰 *المبلغ المرتبط:* *${amountStr}*${amountWordsStr}\n` : ''}${ctx.customNotes ? `\n📝 *تفاصيل الإشعار:* ${ctx.customNotes}\n` : ''}يرجى التكرم بالاطلاع والتواصل معنا في حال وجود أي استفسار.`;
      break;
  }

  return `${header}${body}${footer}`;
}
