export interface WhatsAppServerConfig {
  mode: 'SIMULATION' | 'META_CLOUD_API' | 'BAILEYS_GATEWAY';
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  businessAccountId?: string;
  autoReplyEnabled?: boolean;
  officeName?: string;
  [key: string]: any;
}

export interface WhatsAppChatMessage {
  id: string;
  phone: string;
  clientName?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  text: string;
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

class WhatsAppServerEngine {
  private config: WhatsAppServerConfig = {
    mode: 'SIMULATION',
    autoReplyEnabled: true,
    officeName: 'مكتب المحاسب القانوني محمد جميل مرعي',
  };

  private sessionConnected = false;
  private logs: { id: string; timestamp: string; level: string; message: string }[] = [];
  private messagesByPhone: Map<string, WhatsAppChatMessage[]> = new Map();

  public getSessionStatus() {
    return {
      connected: this.sessionConnected,
      mode: this.config.mode,
      qrCodeDataUrl: null,
      lastActivity: new Date().toISOString(),
    };
  }

  public async startBaileysSession() {
    this.sessionConnected = true;
    this.addLog('INFO', 'تم تفعيل جلسة بوابة واتساب بنجاح');
    return this.getSessionStatus();
  }

  public async disconnectBaileysSession() {
    this.sessionConnected = false;
    this.addLog('INFO', 'تم إيقاف جلسة بوابة واتساب');
    return this.getSessionStatus();
  }

  public async sendDocumentDirect(
    to: string,
    _fileBase64: string,
    fileName: string,
    _mimetype?: string,
    caption?: string
  ) {
    const msg = this.recordMessage(to, 'OUTBOUND', `[مستند: ${fileName}] ${caption || ''}`.trim());
    return { success: true, messageId: msg.id, timestamp: msg.timestamp };
  }

  public async sendMessageDirect(to: string, message: string, meta?: { clientName?: string; [key: string]: any }) {
    const msg = this.recordMessage(to, 'OUTBOUND', message, meta?.clientName);
    return { success: true, messageId: msg.id, timestamp: msg.timestamp };
  }

  public async sendQuotationDirect(payload: any) {
    const to = payload?.phone || payload?.to || '';
    const text = payload?.message || `عرض أتعاب مهنية لعميل: ${payload?.clientName || ''}`;
    return this.sendMessageDirect(to, text, { clientName: payload?.clientName });
  }

  public async sendCertifiedReportDirect(payload: any) {
    const to = payload?.phone || payload?.to || '';
    const text = payload?.message || `تقرير مالي معتمد: ${payload?.reportTitle || ''}`;
    return this.sendMessageDirect(to, text, { clientName: payload?.clientName });
  }

  public getConfig(): WhatsAppServerConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<WhatsAppServerConfig>): WhatsAppServerConfig {
    this.config = { ...this.config, ...partial };
    return this.getConfig();
  }

  public runDiagnostics() {
    return {
      ok: true,
      mode: this.config.mode,
      sessionConnected: this.sessionConnected,
      checkedAt: new Date().toISOString(),
    };
  }

  public getLogs() {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public async handleWebhookPayload(body: any) {
    this.addLog('INFO', `استلام حدث Webhook: ${JSON.stringify(body).slice(0, 120)}`);
    return { received: true };
  }

  public getChatThreads() {
    const threads: { phone: string; clientName: string; lastMessage: string; updatedAt: string; unreadCount: number }[] = [];
    for (const [phone, msgs] of this.messagesByPhone.entries()) {
      const last = msgs[msgs.length - 1];
      if (last) {
        threads.push({
          phone,
          clientName: last.clientName || phone,
          lastMessage: last.text,
          updatedAt: last.timestamp,
          unreadCount: 0,
        });
      }
    }
    return threads;
  }

  public getChatMessages(phone: string): WhatsAppChatMessage[] {
    return this.messagesByPhone.get(phone) || [];
  }

  public simulateIncomingClientReply(phone: string, text: string, clientName?: string) {
    const msg = this.recordMessage(phone, 'INBOUND', text, clientName);
    return { success: true, message: msg };
  }

  private recordMessage(
    phone: string,
    direction: 'INBOUND' | 'OUTBOUND',
    text: string,
    clientName?: string
  ): WhatsAppChatMessage {
    const cleanPhone = String(phone || 'unknown').trim();
    const list = this.messagesByPhone.get(cleanPhone) || [];
    const msg: WhatsAppChatMessage = {
      id: `wa-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phone: cleanPhone,
      clientName,
      direction,
      text,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED',
    };
    list.push(msg);
    this.messagesByPhone.set(cleanPhone, list);
    this.addLog('INFO', `${direction === 'OUTBOUND' ? 'إرسال' : 'استقبال'} رسالة (${cleanPhone})`);
    return msg;
  }

  private addLog(level: string, message: string) {
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
    });
    if (this.logs.length > 200) {
      this.logs.length = 200;
    }
  }
}

export const whatsappServerEngine = new WhatsAppServerEngine();
