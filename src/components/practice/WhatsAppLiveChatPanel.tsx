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
  FileText,
  DollarSign,
  ChevronDown,
  FileSpreadsheet,
  Receipt,
  FileCheck2,
  Copy,
  Sliders,
  Paperclip,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { WhatsAppDocumentShareModal } from '../archive/WhatsAppDocumentShareModal';
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

interface UnifiedChatItem {
  phone: string;
  clientName: string;
  contactPerson?: string;
  clientId?: string;
  lastMessage: string;
  lastTimestamp: string;
  lastDirection: 'INCOMING' | 'OUTGOING';
  unreadCount: number;
  hasServerThread: boolean;
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
  const [conversationsFilter, setConversationsFilter] = useState<'ALL' | 'ACTIVE' | 'CLIENTS'>('ALL');
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<WhatsAppApiSessionStatus | null>(null);

  // Simulation & testing state (calm, subtle drawer)
  const [showSimulationDrawer, setShowSimulationDrawer] = useState(false);
  const [simulationText, setSimulationText] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAutoScrollDisabled = useRef(false);

  // Normalize phone number helper
  const normalizePhone = (p: string): string => {
    let clean = (p || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '2' + clean;
    if (!clean.startsWith('20') && clean.length === 10) clean = '20' + clean;
    return clean;
  };

  // Load threads and session status calmly without unhandled errors
  const loadThreadsAndStatus = async (isQuiet = false) => {
    if (!isQuiet) setIsLoadingThreads(true);
    try {
      const [fetchedThreads, fetchedStatus] = await Promise.all([
        WhatsAppApiService.getChatThreads().catch(() => []),
        WhatsAppApiService.getSessionStatus().catch(() => null),
      ]);
      setThreads(fetchedThreads || []);
      if (fetchedStatus) setSessionStatus(fetchedStatus);
    } catch {
      // Quiet failover
    } finally {
      if (!isQuiet) setIsLoadingThreads(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadThreadsAndStatus(false);
  }, []);

  // Polite background polling (every 20s, paused if document hidden)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadThreadsAndStatus(true);
      if (selectedPhone) {
        WhatsAppApiService.getChatMessages(selectedPhone)
          .then((msgs) => {
            if (msgs && msgs.length !== activeMessages.length) {
              setActiveMessages(msgs);
            }
          })
          .catch(() => {});
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [selectedPhone, activeMessages.length]);

  // Unified conversations directory combining state.clients with active threads
  const unifiedChatList = useMemo<UnifiedChatItem[]>(() => {
    const list: UnifiedChatItem[] = [];
    const seenPhones = new Set<string>();

    // 1. Add server threads first
    threads.forEach((t) => {
      const norm = normalizePhone(t.phone);
      if (seenPhones.has(norm)) return;
      seenPhones.add(norm);

      // Match client if possible
      const matched = state.clients.find((c) => normalizePhone(c.phone || '') === norm);

      list.push({
        phone: t.phone,
        clientName: t.clientName || matched?.name || 'عميل',
        contactPerson: matched?.contactPerson,
        clientId: matched?.id,
        lastMessage: t.lastMessage || 'لا توجد رسائل سابقة',
        lastTimestamp: t.lastTimestamp || new Date().toISOString(),
        lastDirection: t.lastDirection || 'OUTGOING',
        unreadCount: t.unreadCount || 0,
        hasServerThread: true,
      });
    });

    // 2. Add clients from database with phone numbers
    state.clients.forEach((c) => {
      if (!c.phone) return;
      const norm = normalizePhone(c.phone);
      if (seenPhones.has(norm)) return;
      seenPhones.add(norm);

      // Check if local database has any message history for this client
      const localMsgs = (state.whatsappMessages || []).filter((m) => m.clientId === c.id);
      const latestLocal = localMsgs[localMsgs.length - 1];

      list.push({
        phone: c.phone,
        clientName: c.name,
        contactPerson: c.contactPerson,
        clientId: c.id,
        lastMessage: latestLocal ? latestLocal.text : 'عميل مسجل - جاهز لبدء المراسلة',
        lastTimestamp: latestLocal ? latestLocal.timestamp : c.updatedAt || c.createdAt || new Date().toISOString(),
        lastDirection: latestLocal ? (latestLocal.direction === 'INCOMING' ? 'INCOMING' : 'OUTGOING') : 'OUTGOING',
        unreadCount: 0,
        hasServerThread: false,
      });
    });

    return list;
  }, [threads, state.clients, state.whatsappMessages]);

  // Auto-select initialPhone or first thread once available
  useEffect(() => {
    if (!selectedPhone && unifiedChatList.length > 0) {
      if (initialPhone) {
        const normInit = normalizePhone(initialPhone);
        const match = unifiedChatList.find((item) => normalizePhone(item.phone) === normInit);
        if (match) {
          setSelectedPhone(match.phone);
          return;
        }
      }
      setSelectedPhone(unifiedChatList[0].phone);
    }
  }, [unifiedChatList, initialPhone, selectedPhone]);

  // Fetch messages when selectedPhone changes
  const loadMessagesForPhone = async (phone: string) => {
    if (!phone) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await WhatsAppApiService.getChatMessages(phone);
      setActiveMessages(msgs || []);
    } catch {
      setActiveMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedPhone) {
      loadMessagesForPhone(selectedPhone);
    }
  }, [selectedPhone]);

  // Gentle scroll to bottom on message update
  useEffect(() => {
    if (!isAutoScrollDisabled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  // Active chat item details
  const activeChat = useMemo(() => {
    return unifiedChatList.find((t) => t.phone === selectedPhone) || null;
  }, [unifiedChatList, selectedPhone]);

  const matchedClient = useMemo(() => {
    if (!selectedPhone) return null;
    const norm = normalizePhone(selectedPhone);
    return state.clients.find((c) => normalizePhone(c.phone || '') === norm) || null;
  }, [state.clients, selectedPhone]);

  // Filtered threads list
  const filteredChatList = useMemo(() => {
    let result = unifiedChatList;

    if (conversationsFilter === 'ACTIVE') {
      result = result.filter((item) => item.hasServerThread);
    } else if (conversationsFilter === 'CLIENTS') {
      result = result.filter((item) => !!item.clientId);
    }

    if (!searchQuery || !searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (t) =>
        (t.clientName || '').toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q)) ||
        (t.contactPerson && t.contactPerson.toLowerCase().includes(q)) ||
        (t.lastMessage || '').toLowerCase().includes(q)
    );
  }, [unifiedChatList, searchQuery, conversationsFilter]);

  // Send message via API
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedPhone) return;

    setIsSending(true);
    setFeedback(null);
    try {
      const clientName = activeChat?.clientName || matchedClient?.name || 'عميل المكتب';
      const res = await WhatsAppApiService.sendChatMessage(selectedPhone, text, clientName);

      if (res.success) {
        setInputText('');
        if (res.messages) {
          setActiveMessages(res.messages);
        } else {
          loadMessagesForPhone(selectedPhone);
        }
        loadThreadsAndStatus(true);

        // Record to local database for consistency
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
        setFeedback({
          type: 'ERROR',
          text: res.error || 'تعذر إرسال الرسالة عبر خادم الـ API. يمكنك استخدام زر "واتساب ويب" للإرسال المباشر.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'ERROR',
        text: err.message || 'تعذر الاتصال بالخادم. استخدم زر واتساب ويب.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Direct WhatsApp Web Link
  const getDirectWhatsAppUrl = (phone: string, text: string) => {
    const norm = normalizePhone(phone);
    return `https://wa.me/${norm}?text=${encodeURIComponent(text)}`;
  };

  // Simulate client reply
  const handleSimulateClientReply = async (customText?: string) => {
    const replyText = customText || simulationText.trim();
    if (!replyText || !selectedPhone) return;

    setIsSimulating(true);
    setFeedback(null);
    try {
      const clientName = activeChat?.clientName || matchedClient?.name || 'عميل المكتب';
      const res = await WhatsAppApiService.simulateIncomingReply(selectedPhone, replyText, clientName);

      if (res.success) {
        setSimulationText('');
        setFeedback({
          type: 'SUCCESS',
          text: `تم استقبال رد العميل "${clientName}" وظهوره في المحادثة الحية فوراً.`,
        });
        loadMessagesForPhone(selectedPhone);
        loadThreadsAndStatus(true);

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

  // Quick simulation presets
  const QUICK_SIMULATION_REPLIES = [
    'موافق على عرض أتعاب المراجعة وسأقوم بالتحويل البنكي اليوم، شكراً جزيلاً.',
    'السلام عليكم، أرجو الإفادة بموقف إقرار ضريبة القيمة المضافة.',
    '1', // Invoices fee check
    '2', // Tax status check
    'تمام يا فندم تسلم، غداً سيمر مندوبنا بالمكتب لاستلام النسخة الورقية المعتمدة.',
  ];

  // Quick professional templates
  const QUICK_TEMPLATES = [
    {
      title: 'تحية ترحيبية رسمية',
      text: `السلام عليكم ورحمة الله، مرحباً بكم في مكتب المحاسب القانوني ومراقب الحسابات محمد جميل مرعي. نسعد بخدمتكم وتلبية استفساراتكم الضريبية والمحاسبية.`,
    },
    {
      title: 'إشعار جاهزية القوائم المالية',
      text: `السادة المحترمون، نود إحاطتكم بأنه تم الانتهاء من مراجعة واعتماد القوائم المالية وتقرير مراقب الحسابات المستقل ومرفق رمز التوثيق الرقمي QR.`,
    },
    {
      title: 'تذكير بموعد الإقرار الضريبي',
      text: `نود التذكير باقتراب الموعد النهائي لتقديم إقرار ضريبة القيمة المضافة الشهري (نموذج 10). نرجو التكرم بموافاتنا بالفواتير المتبقية للاعتماد قبل تاريخ الإغلاق.`,
    },
    {
      title: 'مطالبة أتعاب مهنية',
      text: `نرجو التكرم بالتوجيه نحو صرف الأتعاب المهنية المستحقة عن أعمال المراجعة الدورية والفحص الضريبي وفقاً للتعاقد الساري. شاكرين حسن تعاونكم.`,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
            feedback.type === 'SUCCESS'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'SUCCESS' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main WhatsApp Window Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col md:flex-row h-[680px]">
        {/* ============================================================== */}
        {/* LEFT PANEL: CONVERSATIONS & CLIENTS LIST */}
        {/* ============================================================== */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
          {/* Header */}
          <div className="p-3 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">محادثات الواتساب الحية</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sessionStatus?.status === 'CONNECTED'
                        ? 'bg-emerald-400'
                        : 'bg-emerald-500/60'
                    }`}
                  />
                  <span className="text-[10px] text-slate-300">
                    {sessionStatus?.status === 'CONNECTED'
                      ? `متصل: ${sessionStatus.connectedPhone || 'WhatsApp'}`
                      : 'بوابة المراسلات المباشرة'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadThreadsAndStatus(false)}
              disabled={isLoadingThreads}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer"
              title="تحديث المحادثات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العميل أو رقم الهاتف..."
                className="w-full pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mt-2">
              <button
                type="button"
                onClick={() => setConversationsFilter('ALL')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                  conversationsFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                الكل ({unifiedChatList.length})
              </button>
              <button
                type="button"
                onClick={() => setConversationsFilter('ACTIVE')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                  conversationsFilter === 'ACTIVE'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                محادثات نشطة ({threads.length})
              </button>
              <button
                type="button"
                onClick={() => setConversationsFilter('CLIENTS')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                  conversationsFilter === 'CLIENTS'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                عملاء المكتب ({state.clients.filter((c) => !!c.phone).length})
              </button>
            </div>
          </div>

          {/* Conversations Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredChatList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">لا توجد محادثات مطابقة</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكنك إضافة رقم هاتف للعميل من ملفات العملاء للبدء في مراسلته.
                </p>
              </div>
            ) : (
              filteredChatList.map((chat) => {
                const isSelected = chat.phone === selectedPhone;
                return (
                  <button
                    key={chat.phone}
                    type="button"
                    onClick={() => setSelectedPhone(chat.phone)}
                    className={`w-full p-2.5 text-right flex items-start gap-2.5 transition-colors cursor-pointer border-r-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-600 dark:border-emerald-500'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border-transparent bg-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {chat.clientName.slice(0, 2)}
                    </div>

                    {/* Thread Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {chat.clientName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {chat.lastTimestamp
                            ? new Date(chat.lastTimestamp).toLocaleDateString('ar-EG', {
                                month: 'numeric',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                          {chat.lastDirection === 'OUTGOING' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 shrink-0 font-medium">
                              أنت:
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 shrink-0 font-medium">
                              العميل:
                            </span>
                          )}
                          <span className="truncate">{chat.lastMessage}</span>
                        </p>

                        {chat.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {chat.phone}
                        </span>
                        {chat.contactPerson && (
                          <span className="text-[9px] text-slate-400 truncate">
                            • {chat.contactPerson}
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
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 min-w-0">
          {/* Chat Header */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(activeChat?.clientName || matchedClient?.name || 'عميل').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeChat?.clientName || matchedClient?.name || 'محادثة عميل'}
                  </h3>
                  {matchedClient && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                      عميل معتمد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  <span>{selectedPhone || 'يرجى اختيار عميل'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    منظومة مراسلات معتمدة
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Attachment & Statement Modal Trigger */}
              <button
                type="button"
                id="btn-livechat-attach-files"
                onClick={() => setIsShareModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="إرسال ملف مأرشف أو كشف حساب أو أي ملف محدد"
              >
                <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>إرسال ملف / كشف حساب</span>
              </button>

              {/* Subtle Testing/Simulation Toggle */}
              <button
                type="button"
                onClick={() => setShowSimulationDrawer((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showSimulationDrawer
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title="اختبار ومحاكاة ردود العميل"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>أداة المحاكاة</span>
              </button>

              {matchedClient && onNavigateToArchive && (
                <button
                  type="button"
                  onClick={() => onNavigateToArchive(matchedClient.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="فتح ملف وأرشيف العميل"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ملف العميل</span>
                </button>
              )}

              {selectedPhone && (
                <a
                  href={getDirectWhatsAppUrl(selectedPhone, '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium flex items-center gap-1 transition-all"
                  title="فتح المحادثة في تطبيق واتساب الرسمي"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp Web</span>
                </a>
              )}
            </div>
          </div>

          {/* Collapsible Simulation Drawer (Quiet & Calm) */}
          {showSimulationDrawer && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-600" />
                  محاكاة استقبال رد العميل (للاختبار والتحقق):
                </span>
                <button
                  onClick={() => setShowSimulationDrawer(false)}
                  className="text-amber-800 dark:text-amber-300 text-xs hover:underline cursor-pointer"
                >
                  إغلاق ✕
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_SIMULATION_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulateClientReply(reply)}
                    className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-[10px] font-medium hover:bg-amber-100 dark:hover:bg-amber-950 transition-all cursor-pointer truncate max-w-[200px]"
                    title={reply}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {isLoadingMessages ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs mr-2">جاري عرض الرسائل...</span>
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  لا توجد رسائل سابقة مع هذا العميل
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  اكتب رسالتك بالأسفل لإرسالها مباشرة أو استخدام أحد القوالب المهنية المعتمدة.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isClient = msg.direction === 'INCOMING';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isClient ? 'justify-start' : 'justify-end'} animate-in fade-in duration-150`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-xl p-3 shadow-2xs ${
                        isClient
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/70'
                      }`}
                    >
                      {/* Sender Info */}
                      <div className="flex items-center justify-between gap-2 mb-1 border-b border-black/5 dark:border-white/5 pb-1">
                        <span className="text-[10px] font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          {isClient ? (
                            <>
                              <User className="w-3 h-3 text-blue-600" />
                              <span>{activeChat?.clientName || 'العميل'}</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                              <span>مكتب المحاسب القانوني محمد جميل مرعي</span>
                            </>
                          )}
                        </span>

                        {msg.category && (
                          <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[9px] font-mono">
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
                      <div className="whitespace-pre-wrap font-sans text-xs break-words leading-relaxed">
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
                          <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Templates Strip */}
          <div className="bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-[10px] text-slate-500 font-bold shrink-0">قوالب سريعة:</span>
            {QUICK_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(tmpl.text)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-300 transition-all cursor-pointer whitespace-nowrap text-[10px]"
              >
                {tmpl.title}
              </button>
            ))}
          </div>

          {/* Input & Dispatch Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
              title="إرفاق ملف مأرشف أو كشف حساب أو أي ملف مخصص"
            >
              <Paperclip className="w-4 h-4" />
            </button>

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
                placeholder="اكتب رسالتك للعميل هنا... (اضغط Enter للإرسال المباشر)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all"
              />
            </div>

            {/* Direct WhatsApp Web Button */}
            {selectedPhone && (
              <a
                href={getDirectWhatsAppUrl(selectedPhone, inputText)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="إرسال مباشر عبر تطبيق واتساب ويب"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </a>
            )}

            {/* Send Button */}
            <button
              type="button"
              disabled={isSending || !inputText.trim() || !selectedPhone}
              onClick={handleSendMessage}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                isSending || !inputText.trim() || !selectedPhone
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'جاري الإرسال...' : 'إرسال'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Document & Statement Sharing Modal */}
      {isShareModalOpen && (
        <WhatsAppDocumentShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          client={matchedClient || state.clients.find((c) => c.phone && normalizePhone(c.phone) === normalizePhone(selectedPhone)) || state.clients[0] || null}
          state={state}
        />
      )}
    </div>
  );
};
