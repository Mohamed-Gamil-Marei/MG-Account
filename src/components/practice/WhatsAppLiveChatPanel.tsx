import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Phone,
  CheckCheck,
  Search,
  ExternalLink,
  RefreshCw,
  Building2,
  Clock,
  Sparkles,
  Bot,
  AlertCircle,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  WhatsAppApiService,
  WhatsAppChatMessage,
  WhatsAppChatThread,
  WhatsAppApiSessionStatus,
} from '../../services/whatsappApiService';

interface WhatsAppLiveChatPanelProps {
  state: DatabaseState;
  initialPhone?: string;
  onNavigateToArchive?: (clientId?: string) => void;
}

export const WhatsAppLiveChatPanel: React.FC<WhatsAppLiveChatPanelProps> = ({
  state,
  initialPhone,
  onNavigateToArchive,
}) => {
  const [threads, setThreads] = useState<WhatsAppChatThread[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [activeMessages, setActiveMessages] = useState<WhatsAppChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<WhatsAppApiSessionStatus | null>(null);

  // Simulation state
  const [simulationText, setSimulationText] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads and session status
  const loadThreadsAndStatus = async () => {
    try {
      const [fetchedThreads, fetchedStatus] = await Promise.all([
        WhatsAppApiService.getChatThreads(),
        WhatsAppApiService.getSessionStatus(),
      ]);
      setThreads(fetchedThreads);
      setSessionStatus(fetchedStatus);

      // Auto-select first thread or initialPhone
      if (!selectedPhone) {
        if (initialPhone) {
          const match = fetchedThreads.find(
            (t) => t.phone === initialPhone || t.phone.endsWith(initialPhone.slice(-9))
          );
          if (match) {
            setSelectedPhone(match.phone);
          } else if (fetchedThreads.length > 0) {
            setSelectedPhone(fetchedThreads[0].phone);
          }
        } else if (fetchedThreads.length > 0) {
          setSelectedPhone(fetchedThreads[0].phone);
        }
      }
    } catch (err) {
      console.error('Error fetching chat threads:', err);
    }
  };

  // Initial load
  useEffect(() => {
    setIsLoadingThreads(true);
    loadThreadsAndStatus().finally(() => setIsLoadingThreads(false));

    // Poll for real-time updates every 3.5 seconds
    const interval = setInterval(() => {
      loadThreadsAndStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Fetch messages when selectedPhone changes
  const loadMessagesForPhone = async (phone: string) => {
    if (!phone) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await WhatsAppApiService.getChatMessages(phone);
      setActiveMessages(msgs);
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedPhone) {
      loadMessagesForPhone(selectedPhone);
    }
  }, [selectedPhone]);

  // Periodic poll for active thread messages
  useEffect(() => {
    if (!selectedPhone) return;
    const interval = setInterval(() => {
      WhatsAppApiService.getChatMessages(selectedPhone).then((msgs) => {
        if (msgs.length !== activeMessages.length) {
          setActiveMessages(msgs);
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedPhone, activeMessages.length]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Find linked client in local database
  const activeThread = useMemo(() => {
    return threads.find((t) => t.phone === selectedPhone);
  }, [threads, selectedPhone]);

  const matchedClient = useMemo(() => {
    if (!selectedPhone) return null;
    const rawClean = selectedPhone.replace(/[^0-9]/g, '');
    return state.clients.find((c) => {
      const cClean = (c.phone || '').replace(/[^0-9]/g, '');
      return (
        cClean === rawClean ||
        (cClean.length >= 9 && rawClean.endsWith(cClean.slice(-9))) ||
        (rawClean.length >= 9 && cClean.endsWith(rawClean.slice(-9)))
      );
    });
  }, [state.clients, selectedPhone]);

  // Filtered threads list
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.clientName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  // Send message from office
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedPhone) return;

    setIsSending(true);
    setFeedback(null);
    try {
      const clientName = activeThread?.clientName || matchedClient?.name || 'عميل المكتب';
      const res = await WhatsAppApiService.sendChatMessage(selectedPhone, text, clientName);

      if (res.success) {
        setInputText('');
        if (res.messages) {
          setActiveMessages(res.messages);
        } else {
          loadMessagesForPhone(selectedPhone);
        }
        loadThreadsAndStatus();

        // Also record to local database for consistency
        if (matchedClient) {
          db.sendWhatsAppMessage({
            clientId: matchedClient.id,
            clientName: matchedClient.name,
            phone: selectedPhone,
            direction: 'OUTGOING',
            sender: 'AUDITOR',
            text,
          });
        }
      } else {
        setFeedback({ type: 'ERROR', text: res.error || 'تعذر إرسال الرسالة عبر الواتساب.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'ERROR', text: err.message || 'خطأ أثناء الإرسال.' });
    } finally {
      setIsSending(false);
    }
  };

  // Simulate client reply
  const handleSimulateClientReply = async (customText?: string) => {
    const replyText = customText || simulationText.trim();
    if (!replyText || !selectedPhone) return;

    setIsSimulating(true);
    setFeedback(null);
    try {
      const clientName = activeThread?.clientName || matchedClient?.name || 'عميل المكتب';
      const res = await WhatsAppApiService.simulateIncomingReply(selectedPhone, replyText, clientName);

      if (res.success) {
        setSimulationText('');
        setFeedback({
          type: 'SUCCESS',
          text: `تم محاكاة استقبال رد العميل "${clientName}" وظهوره بالشات الحي واستجابة البوت التلقائي.`,
        });
        loadMessagesForPhone(selectedPhone);
        loadThreadsAndStatus();

        // Also sync with local database
        if (matchedClient) {
          db.sendWhatsAppMessage({
            clientId: matchedClient.id,
            clientName: matchedClient.name,
            phone: selectedPhone,
            direction: 'INCOMING',
            sender: 'CLIENT',
            text: replyText,
          });
        }
      } else {
        setFeedback({ type: 'ERROR', text: res.error || 'فشلت محاكاة الرد.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'ERROR', text: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  // Quick reply options for testing client replies
  const QUICK_SIMULATION_REPLIES = [
    'موافق على عرض الأتعاب وسأقوم بالتحويل البنكي اليوم، شكراً جزيلاً.',
    'السلام عليكم، ممكن استعلام عن موقف الإقرار الضريبي للقيمة المضافة؟',
    '1', // Invoices fee check
    '2', // Tax status check
    '5', // Income certificate check
    'تمام يا فندم تسلم، غداً سيمر مندوبنا بالمكتب لاستلام النسخة الورقية المعتمدة.',
  ];

  // Quick office responses
  const QUICK_OFFICE_RESPONSES = [
    'السلام عليكم ورحمة الله، مرحباً بك في مكتب المحاسب القانوني محمد جميل مرعي.',
    'تم اعتماد ومطابقة القوائم المالية وإرفاق كود QR الرسمي وجاهزة للاستلام.',
    'تم تقديم إقرار القيمة المضافة بنجاح ومرفق إشعار السداد المعتمد.',
    'نرجو التكرم بموافاتنا بصور الفواتير الإلكترونية المتبقية لاعتمادها.',
  ];

  return (
    <div className="space-y-4">
      {/* Top Notification / Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
            feedback.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'SUCCESS' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main WhatsApp Web Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[740px]">
        {/* ============================================================== */}
        {/* LEFT PANEL: CONVERSATIONS THREAD LIST (قائمة المحادثات) */}
        {/* ============================================================== */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-l border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">محادثات الواتساب الحية</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sessionStatus?.status === 'CONNECTED'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-300 font-mono">
                    {sessionStatus?.status === 'CONNECTED'
                      ? `متصل: ${sessionStatus.connectedPhone || 'WhatsApp'}`
                      : 'بوابة المحاكاة والـ API'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadThreadsAndStatus}
              disabled={isLoadingThreads}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer"
              title="تحديث المحادثات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العميل أو رقم الهاتف..."
                className="w-full pl-3 pr-9 py-2 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 border border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Client Quick Selector Dropdown */}
          <div className="px-3 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              عميل مسجل:
            </span>
            <select
              value={
                matchedClient?.id ||
                state.clients.find((c) => c.phone === selectedPhone)?.id ||
                ''
              }
              onChange={(e) => {
                const client = state.clients.find((c) => c.id === e.target.value);
                if (client && client.phone) {
                  let cleanPhone = client.phone.replace(/[^0-9]/g, '');
                  if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
                  if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;
                  setSelectedPhone(cleanPhone);
                }
              }}
              className="bg-white border border-emerald-200 text-emerald-900 rounded-lg px-2 py-1 text-[11px] font-medium outline-none max-w-[190px] truncate"
            >
              <option value="">اختر عميل لبدء محادثة...</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'بدون هاتف'})
                </option>
              ))}
            </select>
          </div>

          {/* Conversations Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">لا توجد محادثات مطابقة</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكنك اختيار عميل من القائمة أعلاه لبدء المحادثة معه فوراً.
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.phone === selectedPhone;
                return (
                  <button
                    key={thread.phone}
                    type="button"
                    onClick={() => setSelectedPhone(thread.phone)}
                    className={`w-full p-3 text-right flex items-start gap-3 transition-colors cursor-pointer border-r-4 ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-600'
                        : 'hover:bg-slate-100/80 border-transparent bg-white'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {thread.clientName.slice(0, 2)}
                    </div>

                    {/* Thread Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {thread.clientName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(thread.lastTimestamp).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                          {thread.lastDirection === 'OUTGOING' ? (
                            <span className="text-emerald-600 shrink-0 font-medium">
                              أنت:
                            </span>
                          ) : (
                            <span className="text-blue-600 shrink-0 font-medium">
                              العميل:
                            </span>
                          )}
                          <span className="truncate">{thread.lastMessage}</span>
                        </p>

                        {thread.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {thread.phone}
                        </span>
                        {thread.lastDirection === 'INCOMING' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">
                            رد عميل 📥
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: ACTIVE CONVERSATION CHAT WINDOW */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col bg-[#efeae2]/30 min-w-0">
          {/* Chat Header */}
          <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {(activeThread?.clientName || matchedClient?.name || 'عميل').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {activeThread?.clientName || matchedClient?.name || 'محادثة عميل'}
                  </h3>
                  {matchedClient && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      عميل معتمد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                  <span>{selectedPhone || 'يرجى اختيار محادثة'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-sans flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    متصل عبر WhatsApp Web Gateway
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              {matchedClient && onNavigateToArchive && (
                <button
                  type="button"
                  onClick={() => onNavigateToArchive(matchedClient.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="فتح ملف وأرشيف العميل"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>ملف العميل</span>
                </button>
              )}

              <a
                href={`https://wa.me/${selectedPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-all"
                title="فتح في تطبيق واتساب الويب الرسمي"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Web</span>
              </a>
            </div>
          </div>

          {/* Interactive Simulation Drawer (تجربة رد العميل) */}
          <div className="bg-amber-50/90 border-b border-amber-200 px-3 py-2 flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold text-amber-900">
                محاكاة رد العميل واختبار الاستقبال:
              </span>
              <span className="text-amber-800 text-[11px] hidden sm:inline">
                (اضغط لإرسال رسالة كأنها واردة من هاتف العميل فوراً)
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_SIMULATION_REPLIES.slice(0, 4).map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleSimulateClientReply(reply)}
                  className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 text-[10px] font-semibold hover:bg-amber-100 transition-all cursor-pointer truncate max-w-[150px]"
                  title={reply}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
            {isLoadingMessages ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs mr-2">جاري مزامنة الرسائل...</span>
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-700">لا توجد رسائل سابقة في هذه المحادثة</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  اكتب رسالة بالأسفل لإرسالها عبر الواتساب، أو اضغط على أحد أزرار المحاكاة لتجربة استقبال رد العميل ورؤيته فوراً.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isClient = msg.direction === 'INCOMING';
                const isBot = msg.sender === 'BOT';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isClient ? 'items-start' : 'items-end'
                    } animate-in fade-in`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-xs relative text-xs leading-relaxed ${
                        isClient
                          ? 'bg-white text-slate-900 rounded-tr-sm border border-slate-200'
                          : isBot
                          ? 'bg-indigo-50 text-indigo-950 rounded-tl-sm border border-indigo-200'
                          : 'bg-[#d9fdd3] text-emerald-950 rounded-tl-sm border border-emerald-200'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-black/5 text-[10px] font-bold">
                        <span
                          className={`flex items-center gap-1 ${
                            isClient
                              ? 'text-blue-700'
                              : isBot
                              ? 'text-indigo-700'
                              : 'text-emerald-800'
                          }`}
                        >
                          {isClient ? (
                            <>
                              <User className="w-3 h-3" />
                              <span>العميل: {msg.clientName || 'وارد من العميل'}</span>
                            </>
                          ) : isBot ? (
                            <>
                              <Bot className="w-3 h-3 text-indigo-600" />
                              <span>الرد التلقائي الذكي للبوت 🤖</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3 text-emerald-700" />
                              <span>مكتب المحاسب القانوني محمد مرعي</span>
                            </>
                          )}
                        </span>

                        {msg.category && (
                          <span className="px-1.5 py-0.2 rounded bg-black/5 text-[9px] font-mono">
                            {msg.category === 'QUOTATION'
                              ? 'عرض سعر'
                              : msg.category === 'CERTIFIED_REPORT'
                              ? 'تقرير مالي'
                              : msg.category === 'TAX'
                              ? 'ضريبة'
                              : 'إشعار'}
                          </span>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap font-sans text-xs break-words">
                        {msg.text}
                      </div>

                      {/* Footer & Timestamp */}
                      <div className="flex items-center justify-end gap-1 mt-1.5 pt-0.5 text-[9px] text-slate-400 font-mono">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {!isClient && (
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Strip */}
          <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-[10px] text-slate-500 font-bold shrink-0">رد سريع للمكتب:</span>
            {QUICK_OFFICE_RESPONSES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(tmpl)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all cursor-pointer whitespace-nowrap text-[10px]"
              >
                {tmpl}
              </button>
            ))}
          </div>

          {/* Input & Dispatch Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="اكتب رسالتك للعميل هنا... (اضغط Enter للإرسال)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all"
              />
            </div>

            <button
              type="button"
              disabled={isSending || !inputText.trim() || !selectedPhone}
              onClick={handleSendMessage}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isSending || !inputText.trim() || !selectedPhone
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'جاري الإرسال...' : 'إرسال'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
