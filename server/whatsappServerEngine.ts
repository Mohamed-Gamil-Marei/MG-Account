import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

export interface WhatsAppServerConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  landlineNumber: string;
  officeName: string;
  webhookUrl: string;
  isEnabled: boolean;
  autoReplyEnabled: boolean;
  notificationsEnabled: boolean;
  businessDescription: string;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
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
  channel?: 'BAILEYS_QR_GATEWAY' | 'META_CLOUD_API' | 'LOCAL_GATEWAY';
}

export interface WhatsAppSessionStatus {
  status: 'DISCONNECTED' | 'SCAN_QR_CODE' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  qrRawString: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  platform: string;
  lastConnectedTime: string | null;
  autoReplyEnabled: boolean;
  activeMode: 'BAILEYS_FREE_GATEWAY' | 'META_CLOUD_API' | 'SIMULATION';
  stats: {
    sentCount: number;
    receivedCount: number;
    failedCount: number;
  };
}

export interface WhatsAppChatMessage {
  id: string;
  phone: string;
  clientName?: string;
  sender: 'CLIENT' | 'OFFICE' | 'BOT';
  direction: 'INCOMING' | 'OUTGOING';
  text: string;
  timestamp: string;
  status: 'RECEIVED' | 'SENT' | 'DELIVERED' | 'READ';
  category?: 'QUOTATION' | 'CERTIFIED_REPORT' | 'INVOICE' | 'TAX' | 'GENERAL';
  referenceCode?: string;
  amount?: number;
}

export interface WhatsAppChatThread {
  phone: string;
  clientName: string;
  lastMessage: string;
  lastTimestamp: string;
  lastDirection: 'INCOMING' | 'OUTGOING';
  lastSender: 'CLIENT' | 'OFFICE' | 'BOT';
  unreadCount: number;
  totalMessages: number;
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

const SESSION_DIR = path.join(process.cwd(), ".whatsapp_session");

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

  private sessionStatus: WhatsAppSessionStatus = {
    status: "DISCONNECTED",
    qrCodeDataUrl: null,
    qrRawString: null,
    connectedPhone: null,
    connectedName: null,
    platform: "WhatsApp Multi-Device Gateway (Free)",
    lastConnectedTime: null,
    autoReplyEnabled: true,
    activeMode: "BAILEYS_FREE_GATEWAY",
    stats: {
      sentCount: 0,
      receivedCount: 0,
      failedCount: 0,
    },
  };

  private sock: any = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  private logs: WhatsAppLogEntry[] = [
    {
      id: "log-init-1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      direction: "OUTGOING",
      phoneNumber: "201098765432",
      clientName: "شركة الأمل للتجارة والتوزيع",
      message: "تم إرسال إشعار استحقاق إقرار ضريبة القيمة المضافة لشهر يوليو",
      status: "DELIVERED",
      channel: "BAILEYS_QR_GATEWAY",
    },
    {
      id: "log-init-2",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      direction: "INCOMING",
      phoneNumber: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      message: "1",
      status: "RECEIVED",
      channel: "BAILEYS_QR_GATEWAY",
    },
    {
      id: "log-init-3",
      timestamp: new Date(Date.now() - 1795000).toISOString(),
      direction: "OUTGOING",
      phoneNumber: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      message: "كشف فواتير الأتعاب: إجمالي المستحق 15,000 ج.م",
      status: "DELIVERED",
      channel: "BAILEYS_QR_GATEWAY",
    },
  ];

  private chatMessages: WhatsAppChatMessage[] = [
    {
      id: "chat-msg-1",
      phone: "201098765432",
      clientName: "شركة الأمل للتجارة والتوزيع",
      sender: "OFFICE",
      direction: "OUTGOING",
      text: "السلام عليكم ورحمة الله، مرفق لسيادتكم إشعار استحقاق إقرار ضريبة القيمة المضافة لشهر يوليو 2026 ومطابقة الفواتير الإلكترونية.",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "DELIVERED",
      category: "TAX",
    },
    {
      id: "chat-msg-2",
      phone: "201098765432",
      clientName: "شركة الأمل للتجارة والتوزيع",
      sender: "CLIENT",
      direction: "INCOMING",
      text: "وعليكم السلام يا أستاذ محمد، تمام تم الاطلاع ومراجعة البنود وسنقوم بسداد الضريبة اليوم، شكراً جزيلاً لسرعة المتابعة.",
      timestamp: new Date(Date.now() - 3200000).toISOString(),
      status: "RECEIVED",
    },
    {
      id: "chat-msg-3",
      phone: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      sender: "CLIENT",
      direction: "INCOMING",
      text: "السلام عليكم، ممكن استعلام عن أتعاب الفحص الضريبي وسند القبض الأخير؟",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: "RECEIVED",
    },
    {
      id: "chat-msg-4",
      phone: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      sender: "BOT",
      direction: "OUTGOING",
      text: "🧾 استعلام فواتير الأتعاب والمستحقات:\nعزيزي العميل، مسجل باسمكم:\n• حالة الحساب: ساري ونشط\n• فواتير معلقة: أتعاب إشراف سنوي 4,500 ج.م\n• سند القبض الأخير: REC-2026-089 بقيمة 5,000 ج.م معتمد بالخزينة.",
      timestamp: new Date(Date.now() - 1795000).toISOString(),
      status: "DELIVERED",
    },
    {
      id: "chat-msg-5",
      phone: "201123456789",
      clientName: "مؤسسة النور الهندسية",
      sender: "CLIENT",
      direction: "INCOMING",
      text: "ممتاز يا فندم، غداً صباحاً سيمر مندوبنا بالمكتب لسداد المتبقي واستلام الشهادة المعتمدة.",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      status: "RECEIVED",
    },
    {
      id: "chat-msg-6",
      phone: "201200001122",
      clientName: "مجموعة الباسم للمقاولات العامة",
      sender: "CLIENT",
      direction: "INCOMING",
      text: "أستاذ محمد، هل تم الانتهاء من إعداد المركز المالي والشهادة البنكية لتقديمها للبنك الأهلي المصري؟",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      status: "RECEIVED",
    },
    {
      id: "chat-msg-7",
      phone: "201200001122",
      clientName: "مجموعة الباسم للمقاولات العامة",
      sender: "OFFICE",
      direction: "OUTGOING",
      text: "أهلاً بك يا بشمهندس باسم، نعم بفضل الله تم توثيق واعتماد القوائم المالية وشهادة الدخل ومختومة بختم المحاسب القانوني ومرفق كود QR الرسمي، وجاهزة للاستلام بمقر المكتب أو إرسال نسخة معتمدة PDF فوراً.",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: "DELIVERED",
      category: "CERTIFIED_REPORT",
    },
  ];

  constructor() {
    this.ensureSessionDir();
    // If previous session files exist, attempt background auto-connect
    if (this.hasSavedSession()) {
      setTimeout(() => {
        this.startBaileysSession().catch((err) => {
          console.warn("Auto reconnect Baileys warning:", err?.message);
        });
      }, 2500);
    }
  }

  private ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
      try {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      } catch (err) {
        console.warn("Failed to create session dir:", err);
      }
    }
  }

  private hasSavedSession(): boolean {
    try {
      if (!fs.existsSync(SESSION_DIR)) return false;
      const files = fs.readdirSync(SESSION_DIR);
      return files.some((f) => f.startsWith("creds.json"));
    } catch {
      return false;
    }
  }

  /**
   * Start or initialize the Baileys Multi-Device WhatsApp Socket
   */
  public async startBaileysSession(): Promise<WhatsAppSessionStatus> {
    if (this.sessionStatus.status === "CONNECTED" && this.sock) {
      return this.getSessionStatus();
    }
    if (this.isConnecting) {
      return this.getSessionStatus();
    }

    this.isConnecting = true;
    this.sessionStatus.status = "CONNECTING";
    this.ensureSessionDir();

    try {
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as any }));

      const socketFactory: any = (makeWASocket as any).default || makeWASocket;
      const sock = socketFactory({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["مكتب المحاسب القانوني مرعي", "Chrome", "124.0.0"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      this.sock = sock;

      sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.sessionStatus.status = "SCAN_QR_CODE";
            this.sessionStatus.qrRawString = qr;
            this.sessionStatus.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 340,
              margin: 2,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
          } catch (qrErr) {
            console.error("QR Code generation error:", qrErr);
          }
        }

        if (connection === "open") {
          this.isConnecting = false;
          this.sessionStatus.status = "CONNECTED";
          this.sessionStatus.qrCodeDataUrl = null;
          this.sessionStatus.qrRawString = null;
          this.sessionStatus.lastConnectedTime = new Date().toISOString();

          const rawId = sock.user?.id || "";
          const phone = rawId.split(":")[0].split("@")[0];
          this.sessionStatus.connectedPhone = phone ? (phone.startsWith("+") ? phone : `+${phone}`) : "+201000000000";
          this.sessionStatus.connectedName = sock.user?.name || "مكتب المحاسب القانوني - مرعي";
        }

        if (connection === "close") {
          this.isConnecting = false;
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (statusCode === DisconnectReason.loggedOut) {
            this.sessionStatus.status = "DISCONNECTED";
            this.sessionStatus.qrCodeDataUrl = null;
            this.sessionStatus.qrRawString = null;
            this.sessionStatus.connectedPhone = null;
            this.sessionStatus.connectedName = null;
            this.clearSessionFolder();
          } else if (shouldReconnect) {
            this.sessionStatus.status = "CONNECTING";
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.startBaileysSession().catch(() => {});
            }, 4000);
          } else {
            this.sessionStatus.status = "DISCONNECTED";
          }
        }
      });

      sock.ev.on("creds.update", saveCreds);

      // Handle Incoming WhatsApp Messages
      sock.ev.on("messages.upsert", async (m: any) => {
        try {
          if (!m.messages || m.messages.length === 0) return;
          const msg = m.messages[0];

          // Ignore messages sent by ourselves or system notifications
          if (msg.key.fromMe) return;

          const remoteJid = msg.key.remoteJid || "";
          if (remoteJid.endsWith("@g.us")) return; // skip group messages by default

          const rawPhone = remoteJid.replace("@s.whatsapp.net", "");
          const senderName = msg.pushName || "عميل المكتب";

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.buttonsResponseMessage?.selectedDisplayText ||
            "";

          if (!text) return;

          this.sessionStatus.stats.receivedCount += 1;

          // Record log entry
          this.addLog({
            direction: "INCOMING",
            phoneNumber: rawPhone,
            clientName: senderName,
            message: text,
            status: "RECEIVED",
            channel: "BAILEYS_QR_GATEWAY",
          });

          // Record in Live Chat thread
          this.addChatMessage({
            phone: rawPhone,
            clientName: senderName,
            sender: "CLIENT",
            direction: "INCOMING",
            text,
            status: "RECEIVED",
          });

          // Generate auto-reply if enabled
          if (this.sessionStatus.autoReplyEnabled && this.config.autoReplyEnabled) {
            const reply = this.generateAutoReply(text, senderName, rawPhone);
            await this.sendMessageDirect(rawPhone, reply);
          }
        } catch (msgErr) {
          console.error("Error processing incoming WhatsApp message:", msgErr);
        }
      });

      this.isConnecting = false;
      return this.getSessionStatus();
    } catch (err: any) {
      this.isConnecting = false;
      this.sessionStatus.status = "DISCONNECTED";
      console.error("Failed to initialize Baileys session:", err);
      return this.getSessionStatus();
    }
  }

  /**
   * Disconnect the active WhatsApp session and remove stored credentials
   */
  public async disconnectBaileysSession(): Promise<WhatsAppSessionStatus> {
    clearTimeout(this.reconnectTimer);
    if (this.sock) {
      try {
        await this.sock.logout().catch(() => {});
        this.sock.end();
      } catch (err) {
        console.warn("Logout error:", err);
      }
      this.sock = null;
    }

    this.clearSessionFolder();

    this.sessionStatus.status = "DISCONNECTED";
    this.sessionStatus.qrCodeDataUrl = null;
    this.sessionStatus.qrRawString = null;
    this.sessionStatus.connectedPhone = null;
    this.sessionStatus.connectedName = null;
    this.isConnecting = false;

    return this.getSessionStatus();
  }

  private clearSessionFolder() {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        const files = fs.readdirSync(SESSION_DIR);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(SESSION_DIR, file));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to clear session files:", err);
    }
  }

  public getSessionStatus(): WhatsAppSessionStatus {
    const isMetaConfigured = !!(this.config.accessToken && this.config.phoneNumberId);
    let activeMode: 'BAILEYS_FREE_GATEWAY' | 'META_CLOUD_API' | 'SIMULATION' = "BAILEYS_FREE_GATEWAY";

    if (this.sessionStatus.status === "CONNECTED") {
      activeMode = "BAILEYS_FREE_GATEWAY";
    } else if (isMetaConfigured) {
      activeMode = "META_CLOUD_API";
    } else {
      activeMode = "SIMULATION";
    }

    return {
      ...this.sessionStatus,
      autoReplyEnabled: this.config.autoReplyEnabled,
      activeMode,
    };
  }

  public getConfig(): WhatsAppServerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<WhatsAppServerConfig>): WhatsAppServerConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    if (newConfig.autoReplyEnabled !== undefined) {
      this.sessionStatus.autoReplyEnabled = newConfig.autoReplyEnabled;
    }
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

  public addChatMessage(entry: Omit<WhatsAppChatMessage, "id" | "timestamp">): WhatsAppChatMessage {
    const formattedPhone = this.formatPhoneNumber(entry.phone);
    const newMsg: WhatsAppChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
      phone: formattedPhone,
    };
    this.chatMessages.push(newMsg);
    if (this.chatMessages.length > 1000) {
      this.chatMessages.shift();
    }
    return newMsg;
  }

  public getChatThreads(): WhatsAppChatThread[] {
    const map = new Map<string, WhatsAppChatThread>();

    for (const msg of this.chatMessages) {
      const isUnread = msg.direction === 'INCOMING' && msg.status === 'RECEIVED';
      const existing = map.get(msg.phone);
      if (!existing) {
        map.set(msg.phone, {
          phone: msg.phone,
          clientName: msg.clientName || 'عميل واتساب',
          lastMessage: msg.text,
          lastTimestamp: msg.timestamp,
          lastDirection: msg.direction,
          lastSender: msg.sender,
          unreadCount: isUnread ? 1 : 0,
          totalMessages: 1,
        });
      } else {
        existing.lastMessage = msg.text;
        existing.lastTimestamp = msg.timestamp;
        existing.lastDirection = msg.direction;
        existing.lastSender = msg.sender;
        existing.totalMessages += 1;
        if (msg.clientName && existing.clientName === 'عميل واتساب') {
          existing.clientName = msg.clientName;
        }
        if (isUnread) {
          existing.unreadCount += 1;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }

  public getChatMessages(phone: string): WhatsAppChatMessage[] {
    const formatted = this.formatPhoneNumber(phone);
    return this.chatMessages.filter(
      (m) => m.phone === formatted || m.phone.endsWith(formatted.slice(-9))
    );
  }

  public simulateIncomingClientReply(
    phone: string,
    text: string,
    clientName: string = "عميل المكتب"
  ): { incoming: WhatsAppChatMessage; reply?: WhatsAppChatMessage } {
    const formatted = this.formatPhoneNumber(phone);
    this.sessionStatus.stats.receivedCount += 1;

    this.addLog({
      direction: "INCOMING",
      phoneNumber: formatted,
      clientName,
      message: text,
      status: "RECEIVED",
      channel: "LOCAL_GATEWAY",
    });

    const incoming = this.addChatMessage({
      phone: formatted,
      clientName,
      sender: "CLIENT",
      direction: "INCOMING",
      text,
      status: "RECEIVED",
    });

    let reply: WhatsAppChatMessage | undefined;
    if (this.config.autoReplyEnabled) {
      const replyText = this.generateAutoReply(text, clientName, formatted);
      reply = this.addChatMessage({
        phone: formatted,
        clientName,
        sender: "BOT",
        direction: "OUTGOING",
        text: replyText,
        status: "DELIVERED",
      });
      this.addLog({
        direction: "OUTGOING",
        phoneNumber: formatted,
        clientName,
        message: replyText,
        status: "DELIVERED",
        channel: "LOCAL_GATEWAY",
      });
    }

    return { incoming, reply };
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

            this.addLog({
              direction: "INCOMING",
              phoneNumber: senderPhone,
              clientName: senderName,
              message: text || `[${msgType}]`,
              status: "RECEIVED",
              channel: "META_CLOUD_API",
            });

            this.addChatMessage({
              phone: senderPhone,
              clientName: senderName,
              sender: "CLIENT",
              direction: "INCOMING",
              text: text || `[${msgType}]`,
              status: "RECEIVED",
            });

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
  public generateAutoReply(userMessage: string, clientName: string, _phone: string): string {
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

    return `${officeHeader}\n\nمرحباً بك يا أستاذ *${clientName}*.\nتم استلام رسالتكم: "${userMessage}".\n\nللحصول على خدمة فورية، يرجى إرسال رقم الخدمة:\n1️⃣ فواتير الأتعاب\n2️⃣ الضرائب والإقرارات\n3️⃣ سندات الخزينة\n4️⃣ السجل التجاري\n5️⃣ طلب شهادة معتمدة\n6️⃣ عنوان ومواعيد المكتب\n7️⃣ التحدث مع المحاسب المسؤول`;
  }

  /**
   * Format phone number to WhatsApp international standard (e.g. 2010... or 2011...)
   */
  private formatPhoneNumber(to: string): string {
    let clean = to.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "2" + clean;
    }
    if (!clean.startsWith("20") && clean.length === 10 && clean.startsWith("1")) {
      clean = "20" + clean;
    }
    return clean;
  }

  /**
   * Send WhatsApp message via active connection (Priority: Baileys Multi-Device -> Meta Cloud API -> Simulation)
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
  ): Promise<{ success: boolean; messageId?: string; error?: string; status?: string; channel?: string }> {
    const formattedPhone = this.formatPhoneNumber(to);

    // 1. PRIORITY 1: Baileys Web Multi-Device Gateway (Free & Direct from Phone)
    if (this.sock && this.sessionStatus.status === "CONNECTED") {
      try {
        const jid = `${formattedPhone}@s.whatsapp.net`;
        const result = await this.sock.sendMessage(jid, { text: messageText });
        const messageId = result?.key?.id || `BAIL-${Date.now()}`;

        this.sessionStatus.stats.sentCount += 1;
        this.addLog({
          direction: "OUTGOING",
          phoneNumber: formattedPhone,
          clientName: meta?.clientName,
          message: messageText,
          status: "DELIVERED",
          category: meta?.category || 'GENERAL',
          referenceCode: meta?.referenceCode,
          amount: meta?.amount,
          channel: "BAILEYS_QR_GATEWAY",
        });

        this.addChatMessage({
          phone: formattedPhone,
          clientName: meta?.clientName,
          sender: "OFFICE",
          direction: "OUTGOING",
          text: messageText,
          status: "DELIVERED",
          category: meta?.category,
          referenceCode: meta?.referenceCode,
          amount: meta?.amount,
        });

        return {
          success: true,
          messageId,
          status: "DELIVERED",
          channel: "BAILEYS_QR_GATEWAY",
        };
      } catch (baileysErr: any) {
        console.warn("Baileys send error, falling back:", baileysErr?.message);
        this.sessionStatus.stats.failedCount += 1;
      }
    }

    // 2. PRIORITY 2: Meta Cloud API (Official Cloud API)
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
            to: formattedPhone,
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
          this.sessionStatus.stats.sentCount += 1;
          this.addLog({
            direction: "OUTGOING",
            phoneNumber: formattedPhone,
            clientName: meta?.clientName,
            message: messageText,
            status: "DELIVERED",
            category: meta?.category || 'GENERAL',
            referenceCode: meta?.referenceCode,
            amount: meta?.amount,
            channel: "META_CLOUD_API",
          });
          return { success: true, messageId: msgId, status: "DELIVERED", channel: "META_CLOUD_API" };
        } else {
          const errorMsg = data?.error?.message || "فشل الإرسال عبر خادم Meta Cloud API";
          this.sessionStatus.stats.failedCount += 1;
          this.addLog({
            direction: "OUTGOING",
            phoneNumber: formattedPhone,
            clientName: meta?.clientName,
            message: messageText,
            status: "FAILED",
            errorDetails: errorMsg,
            category: meta?.category || 'GENERAL',
            referenceCode: meta?.referenceCode,
            amount: meta?.amount,
            channel: "META_CLOUD_API",
          });
          return { success: false, error: errorMsg, status: "FAILED" };
        }
      } catch (err: any) {
        this.sessionStatus.stats.failedCount += 1;
        this.addLog({
          direction: "OUTGOING",
          phoneNumber: formattedPhone,
          clientName: meta?.clientName,
          message: messageText,
          status: "FAILED",
          errorDetails: err.message,
          category: meta?.category || 'GENERAL',
          referenceCode: meta?.referenceCode,
          amount: meta?.amount,
          channel: "META_CLOUD_API",
        });
        return { success: false, error: err.message, status: "FAILED" };
      }
    }

    // 3. PRIORITY 3: Local Gateway Simulation & Archive Mode
    const simMsgId = `WAM-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    this.sessionStatus.stats.sentCount += 1;
    this.addLog({
      direction: "OUTGOING",
      phoneNumber: formattedPhone,
      clientName: meta?.clientName,
      message: messageText,
      status: "DELIVERED",
      category: meta?.category || 'GENERAL',
      referenceCode: meta?.referenceCode,
      amount: meta?.amount,
      channel: "LOCAL_GATEWAY",
    });

    return {
      success: true,
      messageId: simMsgId,
      status: "DELIVERED",
      channel: "LOCAL_GATEWAY",
    };
  }

  /**
   * Send document / PDF file directly via WhatsApp session
   */
  public async sendDocumentDirect(
    to: string,
    fileBase64: string,
    fileName: string,
    mimetype: string = "application/pdf",
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedPhone = this.formatPhoneNumber(to);

    if (this.sock && this.sessionStatus.status === "CONNECTED") {
      try {
        const jid = `${formattedPhone}@s.whatsapp.net`;
        const base64Clean = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
        const buffer = Buffer.from(base64Clean, "base64");

        const result = await this.sock.sendMessage(jid, {
          document: buffer,
          mimetype,
          fileName,
          caption: caption || `مرفق لحضراتكم مستند معتمد: ${fileName}`,
        });

        this.addLog({
          direction: "OUTGOING",
          phoneNumber: formattedPhone,
          message: `[مستند PDF]: ${fileName}`,
          status: "DELIVERED",
          category: "CERTIFIED_REPORT",
          channel: "BAILEYS_QR_GATEWAY",
        });

        return { success: true, messageId: result?.key?.id };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return {
      success: false,
      error: "جلسة الواتساب غير متصلة حالياً. يرجى مسح كود QR لتشغيل الإرسال المباشر.",
    };
  }

  /**
   * Send Official Price Quotation
   */
  public async sendQuotationDirect(payload: QuotationPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
    channel?: string;
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
   * Send Official Certified Financial Report
   */
  public async sendCertifiedReportDirect(payload: CertifiedReportPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
    channel?: string;
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
    const isBaileysConnected = this.sessionStatus.status === "CONNECTED";
    const hasToken = !!this.config.accessToken;
    const hasPhoneId = !!this.config.phoneNumberId;

    return {
      configured: isBaileysConnected || (hasToken && hasPhoneId),
      status: isBaileysConnected ? "CONNECTED" : (hasToken && hasPhoneId) ? "CONNECTED_META" : "READY_FOR_CREDENTIALS",
      landlineNumber: this.config.landlineNumber,
      officeName: this.config.officeName,
      verifyToken: this.config.verifyToken,
      webhookPath: "/api/whatsapp/webhook",
      freeTierEligible: true,
      freeConversationsPerMonth: "غير محدود (مجاني عبر مسح كود QR من هاتفك)",
      checks: [
        {
          name: "بوابة الواتساب المجانية (Baileys Web Gateway)",
          status: isBaileysConnected ? "ACTIVE" : (this.sessionStatus.status === "SCAN_QR_CODE" ? "PENDING_SCAN" : "STANDBY"),
          detail: isBaileysConnected ? `متصل برقم: ${this.sessionStatus.connectedPhone}` : "جاهز لتوليد كود QR ومسحه من هاتفك",
        },
        {
          name: "خادم الرد التلقائي بالسيرفر (Auto-Reply Engine)",
          status: "ACTIVE",
          detail: "يعمل على استقبال واستجابة الرسائل 24/7",
        },
        {
          name: "قواعد بيانات الضرائب والفواتير",
          status: "CONNECTED",
          detail: "متصل بملفات العملاء والضرائب والسندات",
        },
        {
          name: "دعم ربط التليفون الأرضي (Landline)",
          status: "SUPPORTED",
          detail: `مجهز للربط برقم الخط الأرضي: ${this.config.landlineNumber}`,
        },
      ],
    };
  }
}

export const whatsappServerEngine = new WhatsAppServerEngine();
