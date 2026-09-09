/**
 * WhatsApp Business API Service
 * Connects frontend directly to server-side WhatsApp Business Gateway & Meta Cloud API
 * Enables programmatic sending of Price Quotations and Certified Financial Reports
 * without redirecting to external applications.
 */

export interface WhatsAppApiQuotationPayload {
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

export interface WhatsAppApiCertifiedReportPayload {
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

export interface WhatsAppApiServerConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  hasToken?: boolean;
  verifyToken: string;
  landlineNumber: string;
  officeName: string;
  webhookUrl: string;
  isEnabled: boolean;
  autoReplyEnabled: boolean;
  notificationsEnabled: boolean;
  businessDescription: string;
}

export interface WhatsAppApiLogItem {
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

export interface WhatsAppApiSessionStatus {
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

export interface WhatsAppApiDiagnostics {
  configured: boolean;
  status: 'CONNECTED' | 'READY_FOR_CREDENTIALS';
  landlineNumber: string;
  officeName: string;
  verifyToken: string;
  webhookPath: string;
  freeTierEligible: boolean;
  freeConversationsPerMonth: number;
  checks: { name: string; status: string; detail: string }[];
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

export class WhatsAppApiService {
  /**
   * Send an official Price Quotation directly via WhatsApp Business API
   */
  public static async sendQuotation(payload: WhatsAppApiQuotationPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/whatsapp/send-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('WhatsApp API send quotation error:', err);
      return { success: false, error: err.message || 'فشل الاتصال بخادم WhatsApp API' };
    }
  }

  /**
   * Send a Certified Financial Report directly via WhatsApp Business API
   */
  public static async sendCertifiedReport(payload: WhatsAppApiCertifiedReportPayload): Promise<{
    success: boolean;
    messageId?: string;
    formattedMessage?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/whatsapp/send-certified-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('WhatsApp API send certified report error:', err);
      return { success: false, error: err.message || 'فشل الاتصال بخادم WhatsApp API' };
    }
  }

  /**
   * Send generic direct WhatsApp message through server API
   */
  public static async sendMessage(
    to: string,
    message: string,
    meta?: {
      clientName?: string;
      category?: 'QUOTATION' | 'CERTIFIED_REPORT' | 'INVOICE' | 'TAX' | 'GENERAL';
      referenceCode?: string;
      amount?: number;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          message,
          ...meta,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('WhatsApp API send message error:', err);
      return { success: false, error: err.message || 'فشل الاتصال بخادم WhatsApp API' };
    }
  }

  /**
   * Fetch WhatsApp Server Configuration
   */
  public static async getConfig(): Promise<WhatsAppApiServerConfig | null> {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to fetch WhatsApp config:', err);
      return null;
    }
  }

  /**
   * Update WhatsApp Server Configuration
   */
  public static async updateConfig(
    config: Partial<WhatsAppApiServerConfig>
  ): Promise<{ success: boolean; data?: WhatsAppApiServerConfig; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return await res.json();
    } catch (err: any) {
      console.error('Failed to update WhatsApp config:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Run WhatsApp Connectivity & Diagnostics
   */
  public static async getDiagnostics(): Promise<WhatsAppApiDiagnostics | null> {
    try {
      const res = await fetch('/api/whatsapp/diagnostics');
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to run WhatsApp diagnostics:', err);
      return null;
    }
  }

  /**
   * Retrieve live WhatsApp message transmission logs
   */
  public static async getLogs(): Promise<WhatsAppApiLogItem[]> {
    try {
      const res = await fetch('/api/whatsapp/logs');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (err) {
      console.error('Failed to fetch WhatsApp logs:', err);
      return [];
    }
  }

  /**
   * Format quotation payload into professional Arabic message
   */
  public static formatQuotationMessage(payload: WhatsAppApiQuotationPayload): string {
    const scopeText = payload.scopeOfWork && payload.scopeOfWork.length > 0
      ? `\n📋 *نطاق العمل التعاقدي:*\n${payload.scopeOfWork.map((s, i) => ` ${i + 1}. ${s}`).join('\n')}`
      : '';

    return `🏛️ *مكتب المحاسب القانوني / محمد جميل مرعي*
📜 *عرض أتعاب مهنية معتمد*
━━━━━━━━━━━━━━━━━━━━━
🏢 *السادة:* ${payload.clientName}
👤 *عناية:* ${payload.contactPerson || 'المسؤول المالي المحترم'}
🔢 *رقم العرض:* \`${payload.referenceCode}\`
📂 *الخدمة:* ${payload.procedureTitle}
${scopeText}

💰 *تفاصيل الأتعاب والمصروفات:*
• الأتعاب المهنية: *${payload.professionalFees.toLocaleString('ar-EG')} ج.م*
• الرسوم الحكومية المباشرة: *${(payload.governmentFees || 0).toLocaleString('ar-EG')} ج.م*
⭐ *إجمالي عرض السعر الشامل: ${payload.totalEstimatedCost.toLocaleString('ar-EG')} ج.م*

⏱️ *مدة التنفيذ المقدرة:* ${payload.estimatedExecutionDays} يوم عمل
⏳ *صلاحية العرض:* ${payload.validityDays} يوماً من تاريخه
🔐 *رمز التحقق:* \`${payload.verificationCode || 'VER-' + payload.referenceCode}\`
${payload.notes ? `\n📝 *ملاحظات:* ${payload.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━
_للاعتماد والموافقة يرجى الرد على هذه الرسالة أو التواصل مع المكتب مباشرة._`;
  }

  /**
   * Generate direct WhatsApp web URL
   */
  public static getDirectWebUrl(phoneNumber: string, message: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const standardPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    return `https://wa.me/${standardPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Get WhatsApp Live Session Status (Baileys / Meta / QR Code)
   */
  public static async getSessionStatus(): Promise<WhatsAppApiSessionStatus | null> {
    try {
      const res = await fetch('/api/whatsapp/session-status');
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to fetch WhatsApp session status:', err);
      return null;
    }
  }

  /**
   * Start Baileys Multi-Device WhatsApp session and generate QR Code
   */
  public static async startSession(): Promise<WhatsAppApiSessionStatus | null> {
    try {
      const res = await fetch('/api/whatsapp/start-session', { method: 'POST' });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to start WhatsApp session:', err);
      return null;
    }
  }

  /**
   * Disconnect Baileys Multi-Device WhatsApp session
   */
  public static async disconnectSession(): Promise<WhatsAppApiSessionStatus | null> {
    try {
      const res = await fetch('/api/whatsapp/disconnect-session', { method: 'POST' });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to disconnect WhatsApp session:', err);
      return null;
    }
  }

  /**
   * Send document / PDF file directly via WhatsApp session
   */
  public static async sendDocument(
    to: string,
    fileBase64: string,
    fileName: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/send-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          fileBase64,
          fileName,
          caption,
        }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('Failed to send WhatsApp document:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clear transmission logs
   */
  public static async clearLogs(): Promise<boolean> {
    try {
      const res = await fetch('/api/whatsapp/logs', { method: 'DELETE' });
      const data = await res.json();
      return data.success;
    } catch (err) {
      console.error('Failed to clear WhatsApp logs:', err);
      return false;
    }
  }

  /**
   * Get all live WhatsApp chat conversation threads
   */
  public static async getChatThreads(): Promise<WhatsAppChatThread[]> {
    try {
      const res = await fetch('/api/whatsapp/chats');
      const data = await res.json();
      return data.success && Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error('Failed to get WhatsApp chat threads:', err);
      return [];
    }
  }

  /**
   * Get all chronological messages for a specific phone number
   */
  public static async getChatMessages(phone: string): Promise<WhatsAppChatMessage[]> {
    try {
      const res = await fetch(`/api/whatsapp/chat/${encodeURIComponent(phone)}`);
      const data = await res.json();
      return data.success && Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error('Failed to get WhatsApp chat messages:', err);
      return [];
    }
  }

  /**
   * Send a direct message in an active WhatsApp chat
   */
  public static async sendChatMessage(
    to: string,
    message: string,
    clientName?: string
  ): Promise<{ success: boolean; messages?: WhatsAppChatMessage[]; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, clientName }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('Failed to send WhatsApp chat message:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Simulate an incoming client message/reply for testing and demonstration
   */
  public static async simulateIncomingReply(
    phone: string,
    text: string,
    clientName?: string
  ): Promise<{ success: boolean; data?: { incoming: WhatsAppChatMessage; reply?: WhatsAppChatMessage }; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/chat/simulate-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text, clientName }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('Failed to simulate WhatsApp incoming reply:', err);
      return { success: false, error: err.message };
    }
  }
}
