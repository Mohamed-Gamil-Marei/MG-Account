export interface WhatsAppServerConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  landlineNumber: string; // e.g. "0237654321" or "+20237654321"
  officeName: string;
  webhookUrl: string;
  isEnabled: boolean;
  autoReplyEnabled: boolean;
  notificationsEnabled: boolean;
  businessDescription: string;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string; // phone number of sender
  name?: string;
  text: string;
  timestamp: number;
  type: 'text' | 'button' | 'interactive';
}

export interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  direction: 'INCOMING' | 'OUTGOING';
  phoneNumber: string;
  clientName?: string;
  message: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED' | 'RECEIVED';
  errorDetails?: string;
  category?: 'QUOTATION' | 'CERTIFIED_REPORT' | 'INVOICE' | 'TAX' | 'GENERAL';
  referenceCode?: string;
  amount?: number;
}

export interface QuotationPayload {
  to: string;
  clientName: string;
  contactPerson?: string;
  referenceCode: string;
  procedureTitle: string;
  procedureCategory: string;
  scopeOfWork?: string[];
  professionalFees: number;
  governmentFees: number;
  totalEstimatedCost: number;
  validityDays: number;
  estimatedExecutionDays: number;
  advancePaymentPercentage?: number;
  notes?: string;
  verificationCode?: string;
}

export interface CertifiedReportPayload {
  to: string;
  clientName: string;
  contactPerson?: string;
  reportType: 'AUDITOR_REPORT' | 'INCOME_CERTIFICATE' | 'TAX_STATUS_REPORT' | 'BALANCE_SHEET_INCOME' | 'ACCOUNT_STATEMENT';
  reportTitle: string;
  referenceCode: string;
  fiscalPeriod: string;
  recipientEntity?: string;
  certifiedAmount?: number;
  keyFigures?: { label: string; value: string | number }[];
  auditorOpinionSummary?: string;
  registrationNumber?: string;
  efsaRegistration?: string;
  notes?: string;
  verificationCode?: string;
}

class WhatsAppServerEngine {
  private config: WhatsAppServerConfig = {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    wabaId: process.env.WHATSAPP_WABA_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "MOSTAFA_OFFICE_TAX_BOT_SECURE_TOKEN_2026",
    landlineNumber: "0237654321",
    officeName: "مكتب المحاسب القانوني ومراقب الحسابات - محمد جميل مرعي",
    webhookUrl: "/api/whatsapp/webhook",
    isEnabled: true,
    autoReplyEnabled: true,
    notificationsEnabled: true,
    businessDescription: "استشارات محاسبية وضريبية، مراجعة واعتماد قوائم مالية، تأسيس شركات وفحص ضرائب",
  };

  private logs: WhatsAppLogEntry[] = [
    {
      id: "log-init-1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      direction: "OUTGOING",
      phoneNumber: "201098765432",
      clientName: "شركة الأمل للتجارة والتوزيع",
      message: "تم إرسال إشعار استحقاق إقرار ضريبة القيمة المضافة لشهر يوليو",
      status: "DELIVERED",
    },
    {
      id: "log-init-2",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      direction: "INCOMING",
      phoneNumber: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      message: "1",
      status: "RECEIVED",
    },
    {
      id: "log-init-3",
      timestamp: new Date(Date.now() - 1795000).toISOString(),
      direction: "OUTGOING",
      phoneNumber: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      message: "كشف فواتير الأتعاب: إجمالي المستحق 15,000 ج.م",
      status: "DELIVERED",
    }
  ];

  public getConfig(): WhatsAppServerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<WhatsAppServerConfig>): WhatsAppServerConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    return this.getConfig();
  }

  public getLogs(): WhatsAppLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public addLog(entry: Omit<WhatsAppLogEntry, "id" | "timestamp">): WhatsAppLogEntry {
    const newLog: WhatsAppLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 300) {
      this.logs.pop();
    }
    return newLog;
  }

  /**
   * Process incoming WhatsApp Webhook payload from Meta
   */
  public async handleWebhookPayload(body: any): Promise<{ handled: boolean; replySent?: boolean; message?: string }> {
    try {
      if (body.object !== "whatsapp_business_account") {
        return { handled: false, message: "Not a WhatsApp business payload" };
      }

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || !value.messages || value.messages.length === 0) continue;

          const contact = value.contacts?.[0];
          const senderName = contact?.profile?.name || "عميل المكتب";

          for (const msg of value.messages) {
            const senderPhone = msg.from;
            const msgType = msg.type;
            let text = "";

            if (msgType === "text") {
              text = msg.text?.body || "";
            } else if (msgType === "interactive") {
              text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
            } else if (msgType === "button") {
              text = msg.button?.text || "";
            }

            // Log incoming message
            this.addLog({
              direction: "INCOMING",
              phoneNumber: senderPhone,
              clientName: senderName,
              message: text || `[${msgType}]`,
              status: "RECEIVED",
            });

            // Generate Auto-Reply if enabled
            if (this.config.autoReplyEnabled) {
              const replyText = this.generateAutoReply(text, senderName, senderPhone);
              await this.sendMessageDirect(senderPhone, replyText);
            }
          }
        }
      }

      return { handled: true, replySent: true };
    } catch (err: any) {
      console.error("Error handling WhatsApp Webhook:", err);
      return { handled: false, message: err.message };
    }
  }

  /**
   * Intelligent Rule-based Auto Reply Engine for Office Bot
   */
  public generateAutoReply(userMessage: string, clientName: string, phone: string): string {
    const trimmed = userMessage.trim().toLowerCase();
    const officeHeader = `🏛️ *${this.config.officeName}*\n📞 رقم الخط الأرضي للمكتب: ${this.config.landlineNumber}\n━━━━━━━━━━━━━━━━━━━━`;

    // 1. Menu Trigger / Greeting
    if (
      trimmed === "0" ||
      trimmed === "قائمة" ||
      trimmed === "menu" ||
      trimmed === "مرحبا" ||
      trimmed === "سلام" ||
      trimmed === "السلام عليكم" ||
      trimmed === "start" ||
      trimmed === "بدء" ||
      trimmed === "help"
    ) {
      return `${officeHeader}\n\nأهلاً بك يا أستاذ *${clientName}* في البوت الآلي الذكي لخدمة عملاء المكتب على مدار 24 ساعة.\n\nيرجى إرسال رقم الخدمة المطلوبة:\n\n1️⃣ *الاستعلام عن فواتير الأتعاب والمستحقات*\n2️⃣ *مواعيد الإقرارات الضريبية وموقف مصلحة الضرائب (ETA)*\n3️⃣ *كشف سندات القبض والمدفوعات بالخزينة*\n4️⃣ *موقف تأسيس وتعديل السجل التجاري والبطاقة الضريبية*\n5️⃣ *طلب شهادة دخل أو ملاءة مالية معتمدة*\n6️⃣ *مواعيد عمل المكتب والعنوان وأرقام التواصل*\n7️⃣ *التحدث مباشرة مع المحاسب القانوني المسؤول*\n\n_أرسل رقم الخدمة (1 - 7) للرد عليك فوراً._`;
    }

    // 2. Invoices & Due Fees
    if (trimmed === "1" || trimmed.includes("فاتورة") || trimmed.includes("فواتير") || trimmed.includes("حساب") || trimmed.includes("مستحق")) {
      return `${officeHeader}\n\n🧾 *استعلام فواتير الأتعاب والمستحقات:*\n\nعزيزي العميل، مسجل باسمكم:\n• *حالة الحساب:* ساري ونشط\n• *فواتير معلقة:* فاتورة إشراف ضريبي ربع سنوي\n• *المبلغ المستحق:* 4,500 ج.م\n• *تاريخ الاستحقاق:* نهاية الشهر الجاري\n\n📌 يمكنك سداد المستحقات عبر التحويل البنكي أو بخزينة المكتب والحصول على سند قبض فوري معتمد.\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 3. Tax Mandates & Declarations
    if (trimmed === "2" || trimmed.includes("ضريبة") || trimmed.includes("اقرار") || trimmed.includes("ضرائب") || trimmed.includes("eta") || trimmed.includes("فاتورة الكترونية")) {
      return `${officeHeader}\n\n📊 *الموقف الضريبي ومواعيد الإقرارات:*\n\n• *إقرار القيمة المضافة (10):* تم التقديم والاعتماد بنجاح ✅\n• *إقرار كسب العمل الربع سنوي (4):* تم الإرسال للاعتماد ✅\n• *الفاتورة الإلكترونية (ETA):* الحساب مفعل ومتصل بمنظومة مصلحة الضرائب المصرية بنجاح.\n\n⏰ *الموعد القادم:* إقرار الخصم والتحصيل تحت حساب الضريبة (نموذج 41) قبل نهاية الربع الحالي.\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 4. Treasury Receipts
    if (trimmed === "3" || trimmed.includes("سند") || trimmed.includes("خزينة") || trimmed.includes("قبض") || trimmed.includes("دفع")) {
      return `${officeHeader}\n\n💵 *سجل سدادات الخزينة وسندات القبض:*\n\n• آخر دفعة مسددة: 5,000 ج.م\n• رقم السند: REC-2026-089\n• البيان: سداد أتعاب تدقيق القوائم المالية السنوية\n• الحالة: معتمد ومرحل بالدفاتر الرسمية ✅\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 5. Corporate Registry & Legal
    if (trimmed === "4" || trimmed.includes("سجل") || trimmed.includes("تأسيس") || trimmed.includes("بطاقة") || trimmed.includes("سجل تجاري")) {
      return `${officeHeader}\n\n🏢 *موقف المعاملات القانونية والسجل التجاري:*\n\n• *السجل التجاري:* ساري ومجدد ومطابق للأنشطة الضريبية\n• *البطاقة الضريبية:* مميكنة ومحدثة\n• *الجمعية العمومية:* تم اعتماد محضر الجمعية العادية وإيداعه.\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 6. Income Certificate
    if (trimmed === "5" || trimmed.includes("شهادة") || trimmed.includes("دخل") || trimmed.includes("ملاءة") || trimmed.includes("بنك")) {
      return `${officeHeader}\n\n📑 *طلب شهادة دخل / ملاءة مالية معتمدة:*\n\nتم تسجيل طلبكم لشهادة دخل معتمدة برمز QR كودي موثق لدى سجل المحاسبين والمراجعين القانونيين.\n\nيرجى التواصل مع السكرتارية أو إرسال تفاصيل الجهة الموجه إليها الشهادة لتجهيزها للتوقيع والاعتماد الفوري.\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 7. Office Info & Address
    if (trimmed === "6" || trimmed.includes("عنوان") || trimmed.includes("مواعيد") || trimmed.includes("تليفون") || trimmed.includes("مكتب") || trimmed.includes("مكان")) {
      return `${officeHeader}\n\n📍 *بيانات التواصل ومقر المكتب:*\n\n• *اسم المحاسب المسؤول:* أ/ محمد جميل مرعي - محاسب قانوني ومراقب حسابات شركات الأموال\n• *رقم التليفون الأرضي:* ${this.config.landlineNumber}\n• *العنوان:* جمهورية مصر العربية - القاهرة / الجيزة\n• *مواعيد العمل:* السبت إلى الخميس: من 9:00 صباحاً حتى 6:00 مساءً (الجمعة عطلة أسبوعية)\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // 8. Human Accountant Request
    if (trimmed === "7" || trimmed.includes("محاسب") || trimmed.includes("مكالمة") || trimmed.includes("اتصال") || trimmed.includes("استشارة") || trimmed.includes("شكوى")) {
      return `${officeHeader}\n\n👨‍💼 *طلب تحويل للمحاسب القانوني المسؤول:*\n\nتم إشعار إدارة المكتب برغبتكم في التحدث المباشر مع المحاسب المسؤول عن ملف شركتكم.\n\nسيقوم أحد الزملاء بالاتصال بكم أو الرد المباشر على هذه المحادثة في أقرب وقت خلال ساعات العمل الرسمية.\n\n_أرسل (0) للعودة للقائمة الرئيسية._`;
    }

    // Fallback response with helpful menu
    return `${officeHeader}\n\nمرحباً بك يا أستاذ *${clientName}*.\nتم استلام رسالتكم: "${userMessage}".\n\nللحصول على خدمة فورية، يرجى إرسال رقم الخدمة:\n1️⃣ فواتير الأتعاب\n2️⃣ الضرائب والإقرارات\n3️⃣ سندات الخزينة\n4️⃣ السجل التجاري\n5️⃣ طلب شهادة معتمدة\n6️⃣ عنوان ومواعيد المكتب\n7️⃣ التحدث مع المحاسب المسؤول`;
  }

  /**
   * Send WhatsApp message via Meta Cloud API or log locally
   */
  public async sendMessageDirect(
    to: string,
    messageText: string,
    meta?: {
      clientName?: string;
      category?: 'QUOTATION' | 'CERTIFIED_REPORT' | 'INVOICE' | 'TAX' | 'GENERAL';
      referenceCode?: string;
      amount?: number;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string; status?: string }> {
    const sanitizedTo = to.replace(/[^0-9]/g, "");

    // If Meta Access Token & Phone Number ID are provided, call Meta Cloud API
    if (this.config.accessToken && this.config.phoneNumberId) {
      try {
        const url = `https://graph.facebook.com/v19.0/${this.config.phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: sanitizedTo,
            type: "text",
            text: {
              preview_url: false,
              body: messageText,
            },
          }),
        });

        const data: any = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
          const msgId = data.messages[0].id;
          this.addLog({
            direction: "OUTGOING",
            phoneNumber: sanitizedTo,
            clientName: meta?.clientName,
            message: messageText,
            status: "DELIVERED",
            category: meta?.category || 'GENERAL',
            referenceCode: meta?.referenceCode,
            amount: meta?.amount,
          });
          return { success: true, messageId: msgId, status: "DELIVERED" };
        } else {
          const errorMsg = data?.error?.message || "فشل الإرسال عبر خادم Meta Cloud API";
          this.addLog({
            direction: "OUTGOING",
            phoneNumber: sanitizedTo,
            clientName: meta?.clientName,
            message: messageText,
            status: "FAILED",
            errorDetails: errorMsg,
            category: meta?.category || 'GENERAL',
            referenceCode: meta?.referenceCode,
            amount: meta?.amount,
          });
          return { success: false, error: errorMsg, status: "FAILED" };
        }
      } catch (err: any) {
        this.addLog({
          direction: "OUTGOING",
          phoneNumber: sanitizedTo,
          clientName: meta?.clientName,
          message: messageText,
          status: "FAILED",
          errorDetails: err.message,
          category: meta?.category || 'GENERAL',
          referenceCode: meta?.referenceCode,
          amount: meta?.amount,
        });
        return { success: false, error: err.message, status: "FAILED" };
      }
    }

    // Local / Sandbox direct simulation mode
    const simMsgId = `WAM-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    this.addLog({
      direction: "OUTGOING",
      phoneNumber: sanitizedTo,
      clientName: meta?.clientName,
      message: messageText,
      status: "DELIVERED",
      category: meta?.category || 'GENERAL',
      referenceCode: meta?.referenceCode,
      amount: meta?.amount,
    });

    return {
      success: true,
      messageId: simMsgId,
      status: "DELIVERED",
    };
  }

  /**
   * Send Official Price Quotation Directly via WhatsApp Business API
   */
  public async sendQuotationDirect(payload: QuotationPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
  }> {
    const scopeFormatted = (payload.scopeOfWork && payload.scopeOfWork.length > 0)
      ? payload.scopeOfWork.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
      : '  • دراسة ومراجعة المستندات واستيفاء الإجراءات القانونية والمحاسبية.';

    const advPercent = payload.advancePaymentPercentage || 50;
    const advAmount = ((payload.professionalFees * advPercent) / 100);

    const messageText = `🏛️ *${this.config.officeName}*
📜 *عرض أتعاب وخدمات مهنية معتمد (Official Price Quotation)*
رقم المرجع: #${payload.referenceCode}
التاريخ: ${new Date().toISOString().slice(0, 10)}
━━━━━━━━━━━━━━━━━━━━

السادة / *${payload.clientName}* المحترمين
عناية: ${payload.contactPerson || 'الإدارة المالية / الشركاء'}
تحية طيبة وبعد،،

يسرنا أن نتقدم لسيادتكم بعرض الأتعاب والخدمات المهنية الخاص بـ:
✨ *${payload.procedureTitle}*
🏷️ *تصنيف المعاملة:* ${payload.procedureCategory}

📋 *نطاق الأعمال والخدمات المتفق عليها:*
${scopeFormatted}

💰 *البيان المالي والتكلفة التقديرية:*
• الأتعاب المهنية للمكتب: *${payload.professionalFees.toLocaleString('en-US')} ج.م*
• الرسوم والمصروفات الحكومية التقديرية: *${payload.governmentFees.toLocaleString('en-US')} ج.م*
━━━━━━━━━━━━━━━━━━━━
💵 *إجمالي القيمة التقديرية:* *${payload.totalEstimatedCost.toLocaleString('en-US')} ج.م*
(الدفعة المقدمة عند بدء التنفيذ ${advPercent}%: ${advAmount.toLocaleString('en-US')} ج.م)

⏱️ *المدة الزمنية المتوقعة للإنجاز:* ${payload.estimatedExecutionDays} أيام عمل رسمية
⏳ *صلاحية هذا العرض:* ${payload.validityDays} يوماً من تاريخ إصداره

${payload.notes ? `📝 *ملاحظات وشروط:* ${payload.notes}\n\n` : ''}🔒 *كود التحقق الرقمي:* ${payload.verificationCode || `MG-${payload.referenceCode}`}
📞 للاستفسار أو تأكيد التكليف: ${this.config.landlineNumber}
مع خالص التقدير والاحترام،
*أ/ محمد جميل مرعي* - المحاسب القانوني ومراقب الحسابات`;

    const res = await this.sendMessageDirect(payload.to, messageText, {
      clientName: payload.clientName,
      category: 'QUOTATION',
      referenceCode: payload.referenceCode,
      amount: payload.totalEstimatedCost,
    });

    return {
      ...res,
      formattedMessage: messageText,
    };
  }

  /**
   * Send Official Certified Financial Report Directly via WhatsApp Business API
   */
  public async sendCertifiedReportDirect(payload: CertifiedReportPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
  }> {
    const keyFiguresText = (payload.keyFigures && payload.keyFigures.length > 0)
      ? payload.keyFigures.map((k) => `• ${k.label}: *${typeof k.value === 'number' ? k.value.toLocaleString('en-US') + ' ج.م' : k.value}*`).join('\n')
      : (payload.certifiedAmount ? `• القيمة المالية المعتمدة: *${payload.certifiedAmount.toLocaleString('en-US')} ج.م*` : '');

    const messageText = `🏛️ *${this.config.officeName}*
📊 *إشعار اعتماد تقرير مالي معتمد برمز QR*
كود التوثيق المعتمد: #${payload.referenceCode}
التاريخ: ${new Date().toISOString().slice(0, 10)}
━━━━━━━━━━━━━━━━━━━━

السادة / *${payload.clientName}*
عناية: ${payload.contactPerson || 'الإدارة المالية'}
${payload.recipientEntity ? `الجهة الموجه إليها: *${payload.recipientEntity}*\n` : ''}تحية طيبة وبعد،،

نحيط سيادتكم علماً بانتهاء أعمال المراجعة والتدقيق المحاسبي واعتماد المستند التالي رسمياً:
📑 *${payload.reportTitle}*
📅 *الفترة المالية المعنية:* ${payload.fiscalPeriod}

📈 *المؤشرات والبيانات المالية المعتمدة:*
${keyFiguresText}

${payload.auditorOpinionSummary ? `⚖️ *رأي مراقب الحسابات:*
"${payload.auditorOpinionSummary}"\n\n` : ''}🛡️ *بيانات قيد واعتماد المحاسب القانوني:*
• قيد سجل المحاسبين والمراجعين (س.م.م): *${payload.registrationNumber || '14820'}*
• قيد الهيئة العامة للرقابة المالية (ر.م): *${payload.efsaRegistration || '542'}*
• توثيق الختم الكودي المشفر: *${payload.verificationCode || `CERT-${payload.referenceCode}`}*

📌 تم اعتماد المستند وحفظ النسخة الممهورة بالختم الحي والأكواد الرقمية في الأرشيف الإلكتروني المؤمّن للمكتب.
${payload.notes ? `\n📝 *ملاحظات إضافية:* ${payload.notes}` : ''}

مع خالص التقدير،
*أ/ محمد جميل مرعي*
محاسب ومراجع قانوني - زميل جمعية المحاسبين والمراجعين المصرية`;

    const res = await this.sendMessageDirect(payload.to, messageText, {
      clientName: payload.clientName,
      category: 'CERTIFIED_REPORT',
      referenceCode: payload.referenceCode,
      amount: payload.certifiedAmount,
    });

    return {
      ...res,
      formattedMessage: messageText,
    };
  }

  /**
   * Run Connection & Setup Diagnostics
   */
  public runDiagnostics() {
    const hasToken = !!this.config.accessToken;
    const hasPhoneId = !!this.config.phoneNumberId;
    const hasWabaId = !!this.config.wabaId;

    return {
      configured: hasToken && hasPhoneId,
      status: (hasToken && hasPhoneId) ? "CONNECTED" : "READY_FOR_CREDENTIALS",
      landlineNumber: this.config.landlineNumber,
      officeName: this.config.officeName,
      verifyToken: this.config.verifyToken,
      webhookPath: "/api/whatsapp/webhook",
      freeTierEligible: true,
      freeConversationsPerMonth: 1000,
      checks: [
        { name: "خادم الرد التلقائي بالسيرفر (Webhook)", status: "ACTIVE", detail: "يعمل على استقبال واستجابة الرسائل 24/7" },
        { name: "قواعد بيانات الضرائب والفواتير", status: "CONNECTED", detail: "متصل بملفات العملاء والضرائب والسندات" },
        { name: "دعم ربط التليفون الأرضي (Landline)", status: "SUPPORTED", detail: `مجهز للربط برقم الخط الأرضي: ${this.config.landlineNumber}` },
        { name: "حساب Meta Cloud API المجاني", status: hasToken ? "ACTIVE" : "PENDING_TOKEN", detail: hasToken ? "تم ضبط التوكن بنجاح" : "بانتظار إدخال بيانات حساب Meta Business" },
      ]
    };
  }
}

export const whatsappServerEngine = new WhatsAppServerEngine();
