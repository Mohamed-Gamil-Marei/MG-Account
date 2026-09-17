import {
  ClientArchiveRecord,
  Invoice,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  ProfessionalCertificate,
  ClientProcedureTask,
  OfficeProfile,
  WhatsAppMessage,
  WhatsAppEventCategory,
} from '../types';
import { DatabaseState, db } from '../db/localDatabase';

/**
 * Service for managing WhatsApp interactions, template generation,
 * simulated AI accountant auto-replies, and direct wa.me dispatching.
 */
export class WhatsAppBotService {
  /**
   * Cleans and formats phone number for international WhatsApp link
   * Handles domestic and custom country codes
   */
  public static formatWhatsAppNumber(phone: string, defaultCode?: string): string {
    const code = defaultCode || db.getWhatsAppBotSettings?.()?.defaultCountryCode || '20';
    if (!phone) return code + '1000000000';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      return code + digits.slice(1);
    }
    if (digits.startsWith(code)) {
      return digits;
    }
    if (digits.length === 10 && digits.startsWith('1')) {
      return code + digits;
    }
    return digits;
  }

  /**
   * Generates direct WhatsApp API URL based on configured dispatch settings
   */
  public static createDirectWhatsAppUrl(phone: string, text: string): string {
    const settings = db.getWhatsAppBotSettings?.();
    const baseUrl = settings?.customApiBaseUrl || 'https://api.whatsapp.com/send';
    const cleanPhone = this.formatWhatsAppNumber(phone, settings?.defaultCountryCode);
    const encodedText = encodeURIComponent(text);

    if (baseUrl.includes('wa.me')) {
      return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    } else if (baseUrl.includes('web.whatsapp.com')) {
      return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
    return `${baseUrl}?phone=${cleanPhone}&text=${encodedText}`;
  }

  /**
   * Builds the official greeting header for client messages
   */
  public static getHeader(client: ClientArchiveRecord): string {
    const contact = client.contactPerson ? ` (${client.contactPerson})` : '';
    return `مكتب المحاسب القانوني / محمد جميل مرعي\nالسادة / *${client.name}*${contact}\nتحية طيبة،،\n\n`;
  }

  /**
   * Builds the certified office footer signature with distinct numbers
   */
  public static getFooter(officeProfile?: OfficeProfile): string {
    return `\n\n━━━━━━━━━━━━━━━━━━━━\n💬 واتساب: 0552777332 | 📞 اتصال: 01003335360\nمكتب المحاسب القانوني ومراقب الحسابات`;
  }

  /**
   * Template: Invoice Issuance Notification (فاتورة أتعاب ضريبية)
   */
  public static buildInvoiceMessage(
    invoice: Invoice,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    return (
      header +
      `مرفق مطالبة أتعاب مهنية رقم *${invoice.invoiceNumber}* بقيمة *${(invoice.grandTotal || 0).toLocaleString('ar-EG')} ج.م*.\n` +
      `الحالة: ${invoice.status === 'PAID' ? 'مسددة بنجاح ✅' : 'مستحقة للسداد ⏳'}\n` +
      `تاريخ الاستحقاق: ${invoice.dueDate || invoice.date}\n` +
      `شاكرين حسن تعاونكم وحرصكم الدائم.` +
      footer
    );
  }

  /**
   * Template: Treasury Receipt Voucher (سند قبض أتعاب بالخزنة)
   */
  public static buildTreasuryReceiptMessage(
    tx: OfficeTreasuryTransaction,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    return (
      header +
      `تم استلام وتوريد *${(tx.amount || 0).toLocaleString('ar-EG')} ج.م* بالخزينة بموجب سند قبض رقم *${tx.voucherNumber}* بتاريخ ${tx.date}.\n` +
      `البيان: ${tx.description}\n` +
      `تم قيد الدفعة وتحديث كشف حسابكم بالمنظومة.` +
      footer
    );
  }

  /**
   * Template: Tax Declaration Submission Alert (إشعار تقديم إقرار ضريبي)
   */
  public static buildTaxDeclarationMessage(
    tax: TaxDeclarationRecord,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    const typeTitles: Record<string, string> = {
      VAT_10: 'إقرار القيمة المضافة',
      INCOME_27_CORP: 'إقرار أرباح الشركات',
      INCOME_28_INDIV: 'إقرار الدخل للأفراد',
      PAYROLL_4: 'إقرار المرتبات والأجور',
      WHT_41: 'نموذج 41 خصم وتحصيل',
      ANNUAL_PAYROLL_SETTLEMENT: 'التسوية السنوية للمرتبات',
    };

    const declTitle = typeTitles[tax.declarationType] || tax.declarationType;
    const taxDue = tax.netVatPayable || tax.netTaxPayable || 0;

    return (
      header +
      `تم بنجاح اعتماد وتقديم *${declTitle}* عن فترة *${tax.period}* بمصلحة الضرائب المصرية.\n` +
      `رقم الإشعار: ${tax.receiptNumber || 'معتمد'}\n` +
      `الضريبة واجبة السداد: *${taxDue.toLocaleString('ar-EG')} ج.م*.\n` +
      `المستند مؤرشف بملفكم طرفنا.` +
      footer
    );
  }

  /**
   * Template: Tax Deadline Reminder (تذكير باقتراب موعد استحقاق ضريبي)
   */
  public static buildTaxDeadlineReminderMessage(
    tax: TaxDeclarationRecord,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    return (
      header +
      `تذكير ودي بقرب الموعد القانوني لتقديم إقرار *${tax.declarationType}* عن فترة *${tax.period}* (آخر موعد: ${tax.dueDate}).\n` +
      `يرجى التكرم بتجهيز وموافاتنا بالمستندات اللازمة لاستيفاء الفحص.` +
      footer
    );
  }

  /**
   * Template: Professional Certificate Approved (اعتماد شهادة دخل / ملاءة معتمدة)
   */
  public static buildCertificateMessage(
    cert: ProfessionalCertificate,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    return (
      header +
      `تم اعتماد شهادتكم المهنية رقم *${cert.certificateNumber}* بغرض: ${cert.purpose} لصالح: ${cert.recipientEntity || 'الجهة المختصة'}.\n` +
      `المبلغ المعتمد: *${(cert.certifiedAmount || 0).toLocaleString('ar-EG')} ج.م*.\n` +
      `الشهادة مختومة وموثقة برمز QR وجاهزة للاستلام والتسليم.` +
      footer
    );
  }

  /**
   * Template: Client Procedure Task Update (مستجدات مهمة أو إجراء تأسيس/سجل)
   */
  public static buildProcedureUpdateMessage(
    proc: ClientProcedureTask,
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    const header = this.getHeader(client);
    const footer = this.getFooter(officeProfile);

    const statusMap: Record<string, string> = {
      COMPLETED: 'مكتمل بنجاح ✅',
      IN_PROGRESS: 'قيد التنفيذ ⏳',
      AT_AUTHORITY: 'مقدم للجهة الحكومية 🏛️',
      PENDING_CLIENT_DOCS: 'بانتظار مستنداتكم',
      PENDING: 'قيد الدراسة والتجهيز',
    };

    return (
      header +
      `إحاطتكم بمستجدات معاملة: *${proc.title}* (كود: ${proc.procedureCode}).\n` +
      `الموقف الحالي: *${statusMap[proc.status] || proc.status}* (إنجاز: ${proc.progressPercent}%).\n` +
      (proc.notes ? `ملاحظة: ${proc.notes}\n` : '') +
      `شاكرين ثقتكم الكريمة.` +
      footer
    );
  }

  /**
   * Template: Interactive Bot Menu (القائمة التفاعلية لروبوت الواتساب)
   */
  public static buildInteractiveBotMenu(
    client: ClientArchiveRecord,
    officeProfile: OfficeProfile
  ): string {
    return (
      `مرحباً بكم بشركة *${client.name}* في الخدمة الذاتية الذكية لمكتب المحاسب القانوني *أ/ ${officeProfile.auditorName}* 🤖✨\n\n` +
      `يمكنكم الاستعلام الفوري وإرسال الطلبات بالرد بأحد الأرقام التالية:\n\n` +
      `1️⃣ *الاستعلام عن الفواتير والأتعاب المستحقة*\n` +
      `2️⃣ *مواعيد وموقف الإقرارات الضريبية القادمة*\n` +
      `3️⃣ *كشف المدفوعات وسندات القبض المسددة بالخزنة*\n` +
      `4️⃣ *موقف الإجراءات وتراخيص الشركات والسجل التجاري*\n` +
      `5️⃣ *طلب شهادة دخل أو اعتماد مستند مالي*\n` +
      `6️⃣ *مواعيد العمل وعناوين وتواصل المكتب*\n` +
      `7️⃣ *التحدث المباشر مع مراقب الحسابات*\n\n` +
      `💡 _أرسل رقم الخدمة (مثلاً 1 أو 2) وسيقوم الروبوت المحاسبي بالرد الفوري._`
    );
  }

  /**
   * Simulated AI Accountant Auto-Reply Engine
   * Generates realistic, contextual answers based on actual database records.
   */
  public static generateBotResponse(
    incomingText: string,
    client: ClientArchiveRecord,
    state: DatabaseState
  ): { text: string; category: WhatsAppEventCategory } {
    const text = (incomingText || '').trim().toLowerCase();
    const office = state.officeProfile;

    // Option 1: Invoices and Fees
    if (
      text === '1' ||
      text.includes('فاتور') ||
      text.includes('اتعاب') ||
      text.includes('أتعاب') ||
      text.includes('المستحق') ||
      text.includes('مبلغ')
    ) {
      const clientInvoices = state.invoices.filter(
        (inv) => inv.partnerId === client.id || inv.partnerName === client.name
      );
      const unpaid = clientInvoices.filter((inv) => inv.status !== 'PAID');
      const totalUnpaid = unpaid.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

      let reply = `📊 *تقرير الفواتير والأتعاب المستحقة - ${client.name}*\n\n`;
      if (unpaid.length === 0) {
        reply += `✅ *حسابكم مسدد بالكامل!* لا توجد أي فواتير أو أتعاب معلقة طرف سيادتكم حتى تاريخه.\n\nإجمالي الفواتير الصادرة سابقاً: ${clientInvoices.length} فاتورة مسددة.`;
      } else {
        reply += `⚠️ يوجد عدد *${unpaid.length} فاتورة* قيد الاستحقاق بإجمالي: *${totalUnpaid.toLocaleString('en-US')} ج.م*:\n\n`;
        unpaid.slice(0, 4).forEach((inv) => {
          reply += `▫️ فاتورة رقم *${inv.invoiceNumber}* بمبلغ *${(inv.grandTotal || 0).toLocaleString('en-US')} ج.م* (استحقاق: ${inv.dueDate || inv.date})\n`;
        });
        reply += `\nيمكنكم السداد عبر التحويل البنكي أو إنستاباي، وسنوافيكم بسند القبض فور السداد.`;
      }

      reply += `\n\n_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'INVOICE' };
    }

    // Option 2: Tax declarations & deadlines
    if (
      text === '2' ||
      text.includes('ضريب') ||
      text.includes('اقرار') ||
      text.includes('إقرار') ||
      text.includes('قيمة مضافة') ||
      text.includes('كسب عمل') ||
      text.includes('مواعيد')
    ) {
      const clientTaxes = state.taxDeclarations.filter((t) => t.clientId === client.id);
      const upcoming = clientTaxes.filter((t) => t.status !== 'PAID' && t.status !== 'SUBMITTED_TO_ETA');

      let reply = `📋 *موقف الإقرارات الضريبية لمصلحة الضرائب المصرية*\n` + `المأمورية المختصة: *${client.taxOffice || 'الضرائب العامة'}*\n\n`;

      if (clientTaxes.length === 0) {
        reply += `✅ ملفكم الضريبي مستوفى بالكامل ومطابق لمنظومة ETA. سيقوم المكتب بإخطاركم فور فتح فترات الإقرار الجديدة.`;
      } else {
        reply += `🔹 *آخر الإقرارات الضريبية المسجلة:*\n`;
        clientTaxes.slice(0, 3).forEach((t) => {
          const statusText =
            t.status === 'SUBMITTED_TO_ETA'
              ? '✅ تم التقديم لمصلحة الضرائب'
              : t.status === 'READY_TO_SUBMIT'
              ? '⏳ جاهز للتقديم'
              : '📝 قيد التجهيز';
          reply += `▫️ ${t.declarationType} (${t.period}): *${statusText}*\n`;
        });

        if (upcoming.length > 0) {
          reply += `\n⏰ *أقرب موعد استحقاق قادم:* ${upcoming[0].dueDate}`;
        }
      }

      reply += `\n\n_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'TAX_DECLARATION' };
    }

    // Option 3: Treasury payments and receipts
    if (
      text === '3' ||
      text.includes('سداد') ||
      text.includes('خزن') ||
      text.includes('ايصال') ||
      text.includes('إيصال') ||
      text.includes('قبض') ||
      text.includes('مدفوع')
    ) {
      const clientTxs = state.treasuryTransactions.filter((tx) => tx.clientId === client.id);
      const totalPaid = clientTxs
        .filter((tx) => tx.type === 'INCOME_FEES')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      let reply = `💰 *كشف سندات القبض والمدفوعات بالخزنة*\n` + `إجمالي الدفعات المسددة طرف المكتب: *${totalPaid.toLocaleString('en-US')} ج.م*\n\n`;

      if (clientTxs.length === 0) {
        reply += `لا توجد حركات مسجلة مؤخراً في الخزينة.`;
      } else {
        reply += `🔹 *أحدث إيصالات وسندات القبض:*\n`;
        clientTxs.slice(0, 4).forEach((tx) => {
          reply += `▫️ سند رقم *${tx.voucherNumber}* بمبلغ *${tx.amount.toLocaleString('en-US')} ج.م* بتاريخ ${tx.date} (${tx.paymentMethod})\n`;
        });
      }

      reply += `\n\n_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'TREASURY_RECEIPT' };
    }

    // Option 4: Procedures & tasks
    if (
      text === '4' ||
      text.includes('إجراء') ||
      text.includes('اجراء') ||
      text.includes('سجل تجاري') ||
      text.includes('تأسيس') ||
      text.includes('مهمة')
    ) {
      const clientProcs = (client.procedures || []).filter((p) => p.status !== 'CANCELLED');

      let reply = `📑 *موقف الإجراءات والمهام التنفيذية - ${client.name}*\n\n`;

      if (clientProcs.length === 0) {
        reply += `✅ كافة الإجراءات القانونية والتأسيسية السابقة مكتملة وموثقة بالسجل التجاري.`;
      } else {
        clientProcs.forEach((p) => {
          reply += `▫️ *${p.title}* (${p.procedureCode})\n   الحالة: *${p.status}* | الإنجاز: ${p.progressPercent}%\n   المسؤول: ${p.assignedTo}\n\n`;
        });
      }

      reply += `_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'PROCEDURE_UPDATE' };
    }

    // Option 5: Request a Certificate
    if (
      text === '5' ||
      text.includes('شهادة') ||
      text.includes('دخل') ||
      text.includes('ملاءة') ||
      text.includes('اعتماد')
    ) {
      const reply =
        `📜 *طلب إصدار شهادة محاسبية معتمدة*\n\n` +
        `يسعدنا خدمة سيادتكم! لإصدار شهادة إثبات دخل أو ملاءة مالية معتمدة برمز التحقق QR، يرجى تزويدنا بالتالي:\n` +
        `1. اسم الجهة الموجه إليها الشهادة (البنك / السفارة / جهة حكومية).\n` +
        `2. السنة المالية أو الفترة المطلوب إثبات الدخل عنها.\n` +
        `3. مستندات التأييد (كشوف الحسابات أو عقود الإيرادات).\n\n` +
        `يقوم فريق المراجعة بإعداد الشهادة واعتمادها في خلال 24 ساعة عمل.\n\n` +
        `_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'CERTIFICATE' };
    }

    // Option 6: Office Info & Hours
    if (
      text === '6' ||
      text.includes('عنوان') ||
      text.includes('تواصل') ||
      text.includes('مكان') ||
      text.includes('مواعيد العمل') ||
      text.includes('ساعات')
    ) {
      const reply =
        `🏛️ *معلومات وبيانات التواصل مع المكتب*\n\n` +
        `📌 *${office.firmName}*\n` +
        `المحاسب القانوني: *أ/ ${office.auditorName}*\n` +
        `📍 *العنوان:* ${office.address}\n` +
        `📞 *هاتف / واتساب:* ${office.phone || office.mobile || '01003335360'}\n` +
        `✉️ *البريد الإلكتروني:* ${office.email}\n` +
        `⏰ *مواعيد العمل الرسمية:* من الأحد إلى الخميس (9:00 ص حتى 6:00 م)\n` +
        `📜 *رقم ترخيص وزارة المالية:* ${office.licenseNumber}\n\n` +
        `نرحب بزيارتكم الكريمة في أي وقت!\n\n` +
        `_للعودة للقائمة الرئيسية أرسل 0._`;
      return { text: reply, category: 'GENERAL' };
    }

    // Option 7: Human Auditor Contact
    if (
      text === '7' ||
      text.includes('محادثة') ||
      text.includes('بشري') ||
      text.includes('المحاسب') ||
      text.includes('محمد جميل') ||
      text.includes('كلمني')
    ) {
      const reply =
        `👨‍💼 *طلب اتصال ومحادثة مباشرة مع مراقب الحسابات*\n\n` +
        `تم إشعار الأستاذ / *${office.auditorName}* (المحاسب القانوني والشريك المسؤول) بطلب سيادتكم.\n\n` +
        `سيتواصل سيادته معكم عبر هذا الرقم في أقرب وقت، أو يمكنكم الاتصال المباشر على:\n` +
        `📞 *${office.mobile || office.phone || '01003335360'}*\n\n` +
        `_شكراً لثقتكم الغالية._`;
      return { text: reply, category: 'GENERAL' };
    }

    // Greetings or Main Menu request
    if (
      text === '0' ||
      text.includes('سلام') ||
      text.includes('مرحبا') ||
      text.includes('اهلا') ||
      text.includes('قائمة') ||
      text.includes('menu') ||
      text.includes('start')
    ) {
      const menu = this.buildInteractiveBotMenu(client, office);
      return { text: menu, category: 'INTERACTIVE_BOT_MENU' };
    }

    // Default Fallback
    const fallback =
      `شكراً لتواصلكم مع *${office.firmName}* 🌸\n\n` +
      `لقد استلمنا رسالتكم: "${incomingText}" وسيقوم المحاسب المسؤول بالرد عليها.\n\n` +
      `للخدمات السريعة التلقائية، يرجى إرسال رقم الخدمة:\n` +
      `1️⃣ الفواتير والأتعاب\n` +
      `2️⃣ الإقرارات والضرائب\n` +
      `3️⃣ سندات القبض بالخزنة\n` +
      `4️⃣ موقف الإجراءات والسجلات\n` +
      `5️⃣ طلب شهادة معتمدة\n` +
      `6️⃣ عنوان ومعلومات المكتب\n` +
      `0️⃣ عرض القائمة كاملة`;
    return { text: fallback, category: 'BOT_AUTO_REPLY' };
  }
}
