import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Phone,
  CheckCheck,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Paperclip,
  Smile,
  Receipt,
  FileSpreadsheet,
  FileCheck2,
  Calendar,
  AlertCircle,
  Building2,
  ShieldCheck,
  ChevronRight,
  Filter,
  Copy,
  Check,
  ArrowRight,
  Info,
  Clock,
  Settings,
  HelpCircle,
  Award,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import {
  ClientArchiveRecord,
  WhatsAppMessage,
  WhatsAppEventCategory,
  Invoice,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  ProfessionalCertificate,
  ClientProcedureTask,
} from '../types';
import { WhatsAppBotService } from '../services/whatsappBotService';

interface WhatsAppBotViewProps {
  initialClientId?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const WhatsAppBotView: React.FC<WhatsAppBotViewProps> = ({
  initialClientId,
  onNavigateToTab,
}) => {
  const [state, setState] = useState<DatabaseState>(db.getState());
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (state.clients[0]?.id ?? '')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNPAID_INVOICES' | 'PENDING_TAXES'>('ALL');
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to database changes
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setState(db.getState());
    });
    return unsub;
  }, []);

  // Update selected client if initialClientId changes
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  // Scroll to bottom on message change or typing state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedClientId, state.whatsappMessages, isBotTyping]);

  const selectedClient = state.clients.find((c) => c.id === selectedClientId) || state.clients[0];
  const clientMessages = selectedClient
    ? state.whatsappMessages.filter((m) => m.clientId === selectedClient.id)
    : [];

  const botSettings = db.getWhatsAppBotSettings();

  // Filter clients list
  const filteredClients = (state.clients || []).filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.taxCardNo && c.taxCardNo.includes(searchQuery));

    if (!matchesSearch) return false;

    if (activeFilter === 'UNPAID_INVOICES') {
      const hasUnpaid = state.invoices.some((inv) => inv.clientId === c.id && inv.status !== 'PAID');
      return hasUnpaid;
    }

    if (activeFilter === 'PENDING_TAXES') {
      const hasPendingTax = state.taxDeclarations.some(
        (t) => t.clientId === c.id && (t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT')
      );
      return hasPendingTax;
    }

    return true;
  });

  // Handle sending an outgoing message (from the auditor / office)
  const handleSendAuditorMessage = (
    textToSend?: string,
    category: WhatsAppEventCategory = 'GENERAL',
    mediaPayload?: any
  ) => {
    const msgText = textToSend || inputText.trim();
    if (!msgText || !selectedClient) return;

    db.sendWhatsAppMessage({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      phone: selectedClient.phone || '',
      direction: 'OUTGOING',
      sender: 'AUDITOR',
      text: msgText,
      category,
      mediaPayload,
    });

    if (!textToSend) {
      setInputText('');
    }
  };

  // Simulate client sending an incoming message, triggering the intelligent AI bot auto-responder
  const handleSimulateClientIncoming = (clientPromptText: string) => {
    if (!selectedClient) return;

    // 1. Add incoming client message
    db.sendWhatsAppMessage({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      phone: selectedClient.phone || '',
      direction: 'INCOMING',
      sender: 'CLIENT',
      text: clientPromptText,
      category: 'GENERAL',
    });

    // 2. If auto-reply is enabled, simulate bot typing and response after 800ms
    if (botSettings.isAutoReplyEnabled) {
      setIsBotTyping(true);
      setTimeout(() => {
        const botResponse = WhatsAppBotService.generateBotResponse(
          clientPromptText,
          selectedClient,
          state
        );

        db.sendWhatsAppMessage({
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          phone: selectedClient.phone || '',
          direction: 'OUTGOING',
          sender: 'OFFICE_BOT',
          text: botResponse.text,
          category: botResponse.category,
        });

        setIsBotTyping(false);
      }, 950);
    }
  };

  // Open Real WhatsApp Web / Desktop with 1 click
  const handleOpenRealWhatsApp = (text?: string) => {
    if (!selectedClient) return;
    const phone = selectedClient.phone || '01003335360';
    const messageToSend = text || inputText || WhatsAppBotService.buildInteractiveBotMenu(selectedClient, state.officeProfile);
    const url = WhatsAppBotService.createDirectWhatsAppUrl(phone, messageToSend);
    window.open(url, '_blank');
  };

  // Copy message to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Quick Action Dispatchers
  const handleDispatchInvoice = (invoice: Invoice) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildInvoiceMessage(invoice, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'INVOICE', {
      type: 'INVOICE',
      title: `فاتورة ضريبية #${invoice.invoiceNumber}`,
      referenceCode: invoice.invoiceNumber,
      amount: invoice.grandTotal || 0,
    });
  };

  const handleDispatchTreasuryReceipt = (tx: OfficeTreasuryTransaction) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildTreasuryReceiptMessage(tx, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'TREASURY_RECEIPT', {
      type: 'RECEIPT',
      title: `سند قبض خزنة #${tx.voucherNumber}`,
      referenceCode: tx.voucherNumber,
      amount: tx.amount,
    });
  };

  const handleDispatchTaxSubmission = (tax: TaxDeclarationRecord) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildTaxDeclarationMessage(tax, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'TAX_DECLARATION', {
      type: 'TAX_DECLARATION',
      title: `إقرار ${tax.declarationType} (${tax.period})`,
      receiptNumber: tax.receiptNumber,
      amount: tax.netVatPayable || tax.netTaxPayable || 0,
    });
  };

  const handleDispatchTaxDeadline = (tax: TaxDeclarationRecord) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildTaxDeadlineReminderMessage(tax, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'TAX_DEADLINE_REMINDER', {
      type: 'TAX_DECLARATION',
      title: `تذكير استحقاق ضريبي: ${tax.declarationType}`,
    });
  };

  const handleDispatchCertificate = (cert: ProfessionalCertificate) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildCertificateMessage(cert, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'CERTIFICATE', {
      type: 'CERTIFICATE',
      title: `شهادة مهنية معتمدة #${cert.certificateNumber}`,
      referenceCode: cert.certificateNumber,
      amount: cert.certifiedAmount || 0,
    });
  };

  const handleDispatchProcedure = (proc: ClientProcedureTask) => {
    if (!selectedClient) return;
    const formatted = WhatsAppBotService.buildProcedureUpdateMessage(proc, selectedClient, state.officeProfile);
    handleSendAuditorMessage(formatted, 'PROCEDURE_UPDATE', {
      type: 'DOCUMENT',
      title: `مستجدات إجراء: ${proc.title}`,
      referenceCode: proc.procedureCode,
    });
  };

  // Client-specific statistics
  const clientInvoices = selectedClient
    ? state.invoices.filter((inv) => inv.partnerId === selectedClient.id || inv.partnerName === selectedClient.name || (inv as any).clientId === selectedClient.id)
    : [];
  const unpaidInvoices = clientInvoices.filter((inv) => inv.status !== 'PAID');
  const clientTaxes = selectedClient
    ? state.taxDeclarations.filter((t) => t.clientId === selectedClient.id || t.clientName === selectedClient.name)
    : [];
  const clientTreasury = selectedClient
    ? state.treasuryTransactions.filter((tx) => tx.clientId === selectedClient.id || tx.clientName === selectedClient.name)
    : [];
  const clientCerts = selectedClient
    ? state.certificates.filter((c) => c.clientId === selectedClient.id || c.clientName === selectedClient.name)
    : [];
  const clientProcs = selectedClient?.procedures || [];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                محاكي وروبوت الواتساب المحاسبي (WhatsApp Bot & Live Dispatcher)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل وجاهز للإرسال
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مراسلة العملاء المباشرة عبر روابط WhatsApp الرسمية، والرد الذكي التلقائي على استفسارات الضرائب والفواتير
            </p>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            id="btn-toggle-bot-auto-reply"
            onClick={() => {
              db.updateWhatsAppBotSettings({
                isAutoReplyEnabled: !botSettings.isAutoReplyEnabled,
              });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              botSettings.isAutoReplyEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title="تفعيل أو تعطيل رد الروبوت المحاسبي التلقائي"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>الرد الآلي: {botSettings.isAutoReplyEnabled ? 'مفعل (نشط)' : 'معطل'}</span>
          </button>

          <button
            id="btn-bot-settings"
            onClick={() => setShowBotSettings(!showBotSettings)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>إعدادات الروبوت</span>
          </button>
        </div>
      </div>

      {/* Bot Settings Modal */}
      {showBotSettings && (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              إعدادات وقواعد الرد الآلي للروبوت المحاسبي
            </h3>
            <button
              onClick={() => setShowBotSettings(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              إغلاق ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">اسم الروبوت الظاهر للعملاء:</label>
              <input
                type="text"
                value={botSettings.botName}
                onChange={(e) => db.updateWhatsAppBotSettings({ botName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">مواعيد وساعات العمل الرسمية:</label>
              <input
                type="text"
                value={botSettings.officeWorkingHours}
                onChange={(e) => db.updateWhatsAppBotSettings({ officeWorkingHours: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">رسالة الترحيب الافتتاحية:</label>
              <input
                type="text"
                value={botSettings.welcomeGreeting}
                onChange={(e) => db.updateWhatsAppBotSettings({ welcomeGreeting: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main WhatsApp Simulator Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Clients List (4 cols) */}
        <div className="lg:col-span-4 border-l border-slate-800 bg-slate-950/80 flex flex-col h-full">
          {/* Search and Filters */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث باسم الشركة، الهاتف، أو المأمورية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                الكل ({state.clients.length})
              </button>
              <button
                onClick={() => setActiveFilter('UNPAID_INVOICES')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  activeFilter === 'UNPAID_INVOICES'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                فواتير مستحقة
              </button>
              <button
                onClick={() => setActiveFilter('PENDING_TAXES')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  activeFilter === 'PENDING_TAXES'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                إقرارات معلقة
              </button>
            </div>
          </div>

          {/* Client Chats List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 max-h-[560px]">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا يوجد عملاء مطابقين للبحث
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                const msgs = state.whatsappMessages.filter((m) => m.clientId === client.id);
                const lastMsg = msgs[msgs.length - 1];
                const unpaidCount = state.invoices.filter(
                  (inv) => inv.clientId === client.id && inv.status !== 'PAID'
                ).length;

                return (
                  <button
                    key={client.id}
                    id={`chat-item-${client.id}`}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full text-right p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-r-4 border-emerald-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-black text-xs flex items-center justify-center shadow-xs">
                        {client.name.substring(0, 2)}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute bottom-0 left-0" />
                    </div>

                    {/* Chat Preview Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-xs text-slate-100 truncate">
                          {client.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {lastMsg ? lastMsg.timestamp.split(' ')[1] || lastMsg.timestamp : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        {lastMsg ? (
                          <>
                            {lastMsg.direction === 'OUTGOING' && (
                              <CheckCheck className="w-3 h-3 text-emerald-400 shrink-0 inline" />
                            )}
                            <span className="truncate">{lastMsg.text.replace(/\*/g, '')}</span>
                          </>
                        ) : (
                          <span className="text-slate-500">لا توجد رسائل سابقة - ابدأ المحادثة</span>
                        )}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {unpaidCount > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {unpaidCount} فاتورة مستحقة
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono">
                          {client.phone || '01003335360'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live WhatsApp Chat Window (5 or 8 cols depending on side panel) */}
        <div
          className={`${
            showRightPanel ? 'lg:col-span-5' : 'lg:col-span-8'
          } flex flex-col h-full bg-[#0b141a] border-l border-slate-800 relative`}
        >
          {/* WhatsApp Chat Header */}
          {selectedClient ? (
            <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {selectedClient.name.substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                    {selectedClient.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      متصل الآن
                    </span>
                    <span>•</span>
                    <span className="font-mono">{selectedClient.phone || '01003335360'}</span>
                    {selectedClient.contactPerson && (
                      <>
                        <span>•</span>
                        <span className="truncate">{selectedClient.contactPerson}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-open-real-wa-header"
                  onClick={() => handleOpenRealWhatsApp()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="فتح في تطبيق واتساب ويب الحقيقي للمحادثة المباشرة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">واتساب الحقيقي</span>
                </button>

                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    showRightPanel
                      ? 'bg-slate-800 text-amber-400'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                  title="إظهار/إخفاء لوحة الإجراءات السريعة"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 max-h-[460px] bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Disclaimer pill */}
            <div className="flex justify-center my-1">
              <span className="px-3 py-1 rounded-full bg-slate-900/90 text-slate-400 border border-slate-800 text-[10px] flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                المحادثات مشفرة وتدعم الإرسال الفوري لخدمات العملاء بالذكاء الاصطناعي
              </span>
            </div>

            {clientMessages.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 text-emerald-400 mx-auto flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  لا توجد رسائل سابقة مع هذه الشركة. يمكنك كتابة رسالة أدناه أو إرسال إشعار فوري بفاتورة أو إقرار.
                </p>
              </div>
            ) : (
              clientMessages.map((msg) => {
                const isAuditor = msg.direction === 'OUTGOING';
                const isBot = msg.sender === 'OFFICE_BOT';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAuditor ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md text-xs leading-relaxed transition-all relative ${
                        isAuditor
                          ? 'bg-[#005c4b] text-slate-100 rounded-tl-xs'
                          : 'bg-[#202c33] text-slate-200 rounded-tr-xs'
                      }`}
                    >
                      {/* Sender Tag if Bot */}
                      {isBot && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold mb-1.5 pb-1 border-b border-emerald-800/50">
                          <Bot className="w-3 h-3" />
                          <span>المساعد المحاسبي الذكي (رد آلي)</span>
                        </div>
                      )}

                      {/* Message Body */}
                      <div className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Media/Action Card Preview */}
                      {msg.mediaPayload && (
                        <div className="mt-2 pt-2 border-t border-emerald-800/40 bg-black/20 rounded-xl p-2.5 text-[11px] space-y-1">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>{msg.mediaPayload.title}</span>
                          </div>
                          {msg.mediaPayload.amount && (
                            <div className="text-slate-300">
                              المبلغ:{' '}
                              <strong className="text-emerald-400">
                                {msg.mediaPayload.amount.toLocaleString('en-US')} ج.م
                              </strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer time & checkmarks */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-300/80">
                        <span>{msg.timestamp.split(' ')[1] || msg.timestamp}</span>
                        {isAuditor && (
                          <CheckCheck
                            className={`w-3.5 h-3.5 ${
                              msg.status === 'READ' ? 'text-cyan-400' : 'text-slate-400'
                            }`}
                          />
                        )}
                        <button
                          onClick={() => handleCopy(msg.text)}
                          className="opacity-60 hover:opacity-100 ml-1 text-slate-300"
                          title="نسخ نص الرسالة"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Simulated Bot Typing Indicator */}
            {isBotTyping && (
              <div className="flex items-start">
                <div className="bg-[#202c33] text-emerald-400 rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs flex items-center gap-2 shadow-md">
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                  <span className="text-[11px] text-slate-300">الروبوت يكتب الرد الآن...</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-200" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Simulation Prompts (Test what client sends) */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              محاكاة استفسار العميل:
            </span>
            <button
              onClick={() => handleSimulateClientIncoming('1')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all cursor-pointer"
            >
              1️⃣ كشف الفواتير
            </button>
            <button
              onClick={() => handleSimulateClientIncoming('2')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all cursor-pointer"
            >
              2️⃣ موقف الضرائب
            </button>
            <button
              onClick={() => handleSimulateClientIncoming('3')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all cursor-pointer"
            >
              3️⃣ إيصالات الخزنة
            </button>
            <button
              onClick={() => handleSimulateClientIncoming('4')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all cursor-pointer"
            >
              4️⃣ موقف الإجراءات
            </button>
            <button
              onClick={() => handleSimulateClientIncoming('5')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all cursor-pointer"
            >
              5️⃣ طلب شهادة
            </button>
            <button
              onClick={() => handleSimulateClientIncoming('0')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 shrink-0 border border-amber-500/30 transition-all cursor-pointer"
            >
              0️⃣ القائمة الرئيسية
            </button>
          </div>

          {/* Chat Composer Input */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              id="input-wa-message"
              placeholder="اكتب رسالة من المحاسب القانوني للعميل..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAuditorMessage();
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />

            {/* Send Button */}
            <button
              id="btn-send-wa-message"
              onClick={() => handleSendAuditorMessage()}
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-all shadow-md cursor-pointer shrink-0"
              title="إرسال في المحاكي"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* Real WhatsApp Click-to-Chat Button */}
            <button
              id="btn-send-real-wa"
              onClick={() => handleOpenRealWhatsApp()}
              className="px-3 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              title="إرسال فوري إلى رقم واتساب العميل الحقيقي"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إرسال للواتساب الحقيقي</span>
            </button>
          </div>
        </div>

        {/* Right Column: Client Financial Card & Quick Event Dispatcher (3 cols) */}
        {showRightPanel && selectedClient && (
          <div className="lg:col-span-3 border-r border-slate-800 bg-slate-950/90 p-4 space-y-4 overflow-y-auto max-h-[640px] custom-scrollbar">
            {/* Client Summary Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">بطاقة العميل المحاسبية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {selectedClient.clientCode}
                </span>
              </div>
              <h4 className="font-bold text-xs text-slate-100">{selectedClient.name}</h4>
              <div className="text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم التسجيل الضريبي:</span>
                  <span className="font-mono text-slate-200">{selectedClient.taxCardNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المأمورية:</span>
                  <span className="text-slate-200">{selectedClient.taxOffice || 'الضرائب العامة'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الهاتف المسجل:</span>
                  <span className="font-mono text-emerald-400">{selectedClient.phone || '01003335360'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Event Dispatchers */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                إرسال إشعار فوري عند حدوث إجراء
              </h4>

              {/* 1. Send Invoices */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    فواتير الأتعاب ({clientInvoices.length})
                  </span>
                </div>
                {clientInvoices.length === 0 ? (
                  <p className="text-[10px] text-slate-500">لا توجد فواتير مسجلة</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {clientInvoices.slice(0, 3).map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => handleDispatchInvoice(inv)}
                        className="w-full text-right p-2 rounded-lg bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-[11px] flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-emerald-300">
                            #{inv.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(inv.grandTotal || 0).toLocaleString('en-US')} ج.م
                          </div>
                        </div>
                        <Send className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Send Treasury Receipt */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    سندات قبض الخزنة ({clientTreasury.length})
                  </span>
                </div>
                {clientTreasury.length === 0 ? (
                  <p className="text-[10px] text-slate-500">لا توجد سندات قبض</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {clientTreasury.slice(0, 3).map((tx) => (
                      <button
                        key={tx.id}
                        onClick={() => handleDispatchTreasuryReceipt(tx)}
                        className="w-full text-right p-2 rounded-lg bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-[11px] flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-amber-300">
                            #{tx.voucherNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tx.amount.toLocaleString('en-US')} ج.م ({tx.paymentMethod})
                          </div>
                        </div>
                        <Send className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Send Tax Declarations & Deadlines */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                    الإقرارات والضرائب ({clientTaxes.length})
                  </span>
                </div>
                {clientTaxes.length === 0 ? (
                  <p className="text-[10px] text-slate-500">لا توجد إقرارات مسجلة</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {clientTaxes.slice(0, 3).map((tax) => (
                      <div
                        key={tax.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]"
                      >
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>{tax.declarationType}</span>
                          <span className="text-[10px] text-slate-400">{tax.period}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => handleDispatchTaxSubmission(tax)}
                            className="flex-1 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[10px] font-semibold border border-cyan-800/50 transition-all"
                            title="إرسال إشعار التقديم"
                          >
                            إشعار التقديم
                          </button>
                          <button
                            onClick={() => handleDispatchTaxDeadline(tax)}
                            className="flex-1 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] font-semibold border border-amber-800/50 transition-all"
                            title="تذكير بالموعد النهائي"
                          >
                            تذكير الموعد
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Send Certified Certificates */}
              {clientCerts.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>الشهادات المهنية المعتمدة ({clientCerts.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {clientCerts.slice(0, 2).map((cert) => (
                      <button
                        key={cert.id}
                        onClick={() => handleDispatchCertificate(cert)}
                        className="w-full text-right p-2 rounded-lg bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 text-[11px] flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-purple-300">
                            #{cert.certificateNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">{cert.purpose}</div>
                        </div>
                        <Send className="w-3 h-3 text-slate-500 group-hover:text-purple-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Send Procedures Updates */}
              {clientProcs.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>الإجراءات والتأسيس ({clientProcs.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {clientProcs.slice(0, 2).map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => handleDispatchProcedure(proc)}
                        className="w-full text-right p-2 rounded-lg bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/40 text-[11px] flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-blue-300">
                            {proc.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            إنجاز: {proc.progressPercent}% ({proc.status})
                          </div>
                        </div>
                        <Send className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Interactive Bot Menu */}
              <button
                id="btn-send-bot-menu"
                onClick={() => {
                  const menu = WhatsAppBotService.buildInteractiveBotMenu(selectedClient, state.officeProfile);
                  handleSendAuditorMessage(menu, 'INTERACTIVE_BOT_MENU');
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>إرسال القائمة التفاعلية الذكية للعميل</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
