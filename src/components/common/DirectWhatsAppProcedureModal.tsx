import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  MessageSquare,
  Building,
  Phone,
  DollarSign,
  FileText,
  Receipt,
  CheckCircle2,
  Copy,
  Check,
  Percent,
  Sparkles,
  QrCode,
  ShieldCheck,
  Layers,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Sliders,
  Smartphone,
  Hash,
  User,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { WhatsAppApiService, WhatsAppApiSessionStatus } from '../../services/whatsappApiService';
import {
  ProcedureWhatsAppType,
  ProcedureWhatsAppContext,
  PROCEDURE_TEMPLATES_METADATA,
  buildProcedureWhatsAppMessage,
} from '../../utils/procedureWhatsAppTemplates';
import { ClientArchiveRecord, WhatsAppEventCategory } from '../../types';

export interface DirectWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: Partial<ProcedureWhatsAppContext>;
  initialClient?: ClientArchiveRecord | null;
  state?: DatabaseState;
  onSuccess?: (result: { messageId?: string; phone: string; text: string }) => void;
}

export const DirectWhatsAppProcedureModal: React.FC<DirectWhatsAppModalProps> = ({
  isOpen,
  onClose,
  initialContext,
  initialClient,
  state: propState,
  onSuccess,
}) => {
  const state = propState || db.getState();
  const clients = state?.clients || [];

  // Active form state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClient?.id || initialContext?.clientName || (clients[0]?.id ?? '')
  );
  const [clientName, setClientName] = useState<string>(
    initialClient?.name || initialContext?.clientName || (clients[0]?.name ?? 'شركة الأمل للتجارة')
  );
  const [contactPerson, setContactPerson] = useState<string>(
    initialClient?.contactPerson || initialContext?.contactPerson || ''
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialClient?.phone || initialContext?.phone || (clients[0]?.phone ?? '01003335360')
  );

  const [procedureType, setProcedureType] = useState<ProcedureWhatsAppType>(
    initialContext?.procedureType || 'INVOICE_CLAIM'
  );
  const [title, setTitle] = useState<string>(initialContext?.title || '');
  const [referenceCode, setReferenceCode] = useState<string>(
    initialContext?.referenceCode || `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
  );
  const [amount, setAmount] = useState<number>(Number(initialContext?.amount) || 0);
  const [includeAmountInWords, setIncludeAmountInWords] = useState<boolean>(
    initialContext?.includeAmountInWords !== false
  );
  const [periodOrDate, setPeriodOrDate] = useState<string>(
    initialContext?.periodOrDate || new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState<string>(
    initialContext?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [recipientEntity, setRecipientEntity] = useState<string>(
    initialContext?.recipientEntity || ''
  );
  const [customNotes, setCustomNotes] = useState<string>(initialContext?.customNotes || '');
  const [verificationCode, setVerificationCode] = useState<string>(
    initialContext?.verificationCode || `MG-${Math.floor(Math.random() * 90000 + 10000)}`
  );

  // Editable Message Body
  const [messageText, setMessageText] = useState<string>('');
  const [isManualEditMode, setIsManualEditMode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sending state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    channel?: string;
  } | null>(null);

  // Session Connection status
  const [sessionStatus, setSessionStatus] = useState<WhatsAppApiSessionStatus | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session status
  const checkSession = async () => {
    setIsCheckingSession(true);
    try {
      const status = await WhatsAppApiService.getSessionStatus();
      if (status) {
        setSessionStatus(status);
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingSession(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkSession();
    }
  }, [isOpen]);

  // Sync initial props
  useEffect(() => {
    if (initialClient) {
      setSelectedClientId(initialClient.id);
      setClientName(initialClient.name);
      setContactPerson(initialClient.contactPerson || '');
      setPhoneNumber(initialClient.phone || '');
    }
    if (initialContext) {
      if (initialContext.procedureType) setProcedureType(initialContext.procedureType);
      if (initialContext.title) setTitle(initialContext.title);
      if (initialContext.referenceCode) setReferenceCode(initialContext.referenceCode);
      if (initialContext.amount !== undefined) setAmount(Number(initialContext.amount));
      if (initialContext.periodOrDate) setPeriodOrDate(initialContext.periodOrDate);
      if (initialContext.dueDate) setDueDate(initialContext.dueDate);
      if (initialContext.recipientEntity) setRecipientEntity(initialContext.recipientEntity);
      if (initialContext.customNotes) setCustomNotes(initialContext.customNotes);
      if (initialContext.verificationCode) setVerificationCode(initialContext.verificationCode);
      if (initialContext.phone) setPhoneNumber(initialContext.phone);
      if (initialContext.clientName) setClientName(initialContext.clientName);
    }
  }, [initialClient, initialContext]);

  // Regenerate message template when fields change (unless manually locked)
  useEffect(() => {
    if (!isManualEditMode) {
      const firmName = state.officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
      const auditorName = state.officeProfile?.auditorName || 'أ/ محمد جميل مرعي';
      const officePhone = state.officeProfile?.phone || '01003335360';

      const generated = buildProcedureWhatsAppMessage({
        procedureType,
        clientName,
        contactPerson,
        phone: phoneNumber,
        referenceCode,
        title,
        amount,
        includeAmountInWords,
        periodOrDate,
        dueDate,
        recipientEntity,
        customNotes,
        verificationCode,
        firmName,
        auditorName,
        officePhone,
      });

      setMessageText(generated);
    }
  }, [
    procedureType,
    clientName,
    contactPerson,
    phoneNumber,
    referenceCode,
    title,
    amount,
    includeAmountInWords,
    periodOrDate,
    dueDate,
    recipientEntity,
    customNotes,
    verificationCode,
    isManualEditMode,
  ]);

  if (!isOpen) return null;

  // Handle Client Selection Change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.name);
      setContactPerson(found.contactPerson || '');
      setPhoneNumber(found.phone || '');
    }
  };

  // Format international phone for direct code dispatch
  const formatPhoneForSending = (raw: string): string => {
    let clean = raw.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '2' + clean;
    }
    if (!clean.startsWith('20') && clean.length === 10 && clean.startsWith('1')) {
      clean = '20' + clean;
    }
    return clean || '201003335360';
  };

  // Direct In-App Send Action
  const handleDirectSend = async () => {
    if (!messageText.trim()) {
      alert('يرجى كتابة نص الرسالة قبل الإرسال.');
      return;
    }

    const cleanPhone = formatPhoneForSending(phoneNumber);
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('يرجى التأكد من رقم هاتف المستلم.');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // Map category
      let category: WhatsAppEventCategory = 'GENERAL';
      let apiCategory: 'QUOTATION' | 'CERTIFIED_REPORT' | 'INVOICE' | 'TAX' | 'GENERAL' = 'GENERAL';
      if (procedureType === 'INVOICE_CLAIM') {
        category = 'INVOICE';
        apiCategory = 'INVOICE';
      } else if (procedureType === 'TREASURY_RECEIPT') {
        category = 'TREASURY_RECEIPT';
        apiCategory = 'GENERAL';
      } else if (procedureType.startsWith('CERTIFICATE_')) {
        category = 'CERTIFICATE';
        apiCategory = 'CERTIFIED_REPORT';
      } else if (procedureType === 'TAX_DECLARATION' || procedureType === 'ETA_INVOICE_SYNC') {
        category = 'TAX_DECLARATION';
        apiCategory = 'TAX';
      }

      // 1. Send directly through in-app code engine
      const res = await WhatsAppApiService.sendMessage(cleanPhone, messageText, {
        clientName,
        category: apiCategory,
        referenceCode,
        amount: amount > 0 ? amount : undefined,
      });

      if (res.success) {
        // 2. Add to database local messages log
        try {
          db.sendWhatsAppMessage({
            clientId: selectedClientId || 'client-general',
            clientName,
            phone: cleanPhone,
            direction: 'OUTGOING',
            sender: 'AUDITOR',
            text: messageText,
            category,
            timestamp: new Date().toISOString(),
            status: 'SENT',
          });
        } catch {
          // ignore
        }

        setSendResult({
          success: true,
          message: `تم إرسال الرسالة بنجاح عبر كود المحرك الداخلي بدون الحاجة لفتح تطبيق خارجي!`,
          messageId: res.messageId,
          channel: 'Direct Internal Gateway',
        });

        if (onSuccess) {
          onSuccess({
            messageId: res.messageId,
            phone: cleanPhone,
            text: messageText,
          });
        }
      } else {
        setSendResult({
          success: false,
          message: res.error || 'فشل إرسال الرسالة عبر البوابة الداخلية.',
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: `حدث خطأ أثناء الإرسال: ${err?.message || err}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy Message to Clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Insert Variable Token into textarea
  const insertToken = (token: string) => {
    setIsManualEditMode(true);
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = messageText;
      const newText = text.substring(0, start) + token + text.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + token.length;
        }
      }, 50);
    } else {
      setMessageText((prev) => prev + ' ' + token);
    }
  };

  const selectedTemplateMeta = PROCEDURE_TEMPLATES_METADATA.find((p) => p.type === procedureType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">إرسال إشعار واتساب مخصص ومباشر للإجراء</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  ربط كود داخلي (In-App Gateway)
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                إرسال مباشر من داخل النظام بدون مغادرة الصفحة أو فتح تطبيق خارجي، مع مرونة كاملة في التعديل والصياغة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                sessionStatus?.status === 'CONNECTED'
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  sessionStatus?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {sessionStatus?.status === 'CONNECTED'
                  ? `بوابة الواتساب متصلة (${sessionStatus.connectedPhone || 'الجلسة مفعلة'})`
                  : 'محرك الإرسال الداخلي جاهز'}
              </span>
              <button
                onClick={checkSession}
                disabled={isCheckingSession}
                title="تحديث حالة الاتصال"
                className="hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingSession ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Top Bar: Procedure Category & Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {/* 1. Procedure Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                <span>نوع الإجراء المحاسبي / المعاملة:</span>
              </label>
              <select
                value={procedureType}
                onChange={(e) => {
                  setProcedureType(e.target.value as ProcedureWhatsAppType);
                  setIsManualEditMode(false);
                }}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              >
                {PROCEDURE_TEMPLATES_METADATA.map((tmpl) => (
                  <option key={tmpl.type} value={tmpl.type}>
                    {tmpl.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Client Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-700" />
                <span>الشركة / العميل المستلم:</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'بدون هاتف'})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Phone Number for WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>رقم الواتساب المستلم:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">2010...</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                  }}
                  placeholder="مثال: 01003335360"
                  className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 pl-16 focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
                <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatPhoneForSending(phoneNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible / Configurable Procedure Details */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>بيانات المعاملة المالية والمستند:</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedTemplateMeta?.defaultDescription}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              {/* Reference Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">رقم المرجع / المستند:</label>
                <input
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  className="w-full font-mono bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">المبلغ المالي (ج.م):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2 top-1 text-[10px] text-slate-400">ج.م</span>
                </div>
              </div>

              {/* Period / Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">الفترة / التاريخ:</label>
                <input
                  type="text"
                  value={periodOrDate}
                  onChange={(e) => setPeriodOrDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Recipient Entity / Custom title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  {procedureType.startsWith('CERTIFICATE_') ? 'الجهة الموجه إليها:' : 'البيان / العنوان:'}
                </label>
                <input
                  type="text"
                  value={recipientEntity || title}
                  onChange={(e) => {
                    if (procedureType.startsWith('CERTIFICATE_')) setRecipientEntity(e.target.value);
                    else setTitle(e.target.value);
                  }}
                  placeholder={procedureType.startsWith('CERTIFICATE_') ? 'إلى من يهمه الأمر / بنك مصر' : 'بيان المعاملة'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Optional extra inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-words"
                  checked={includeAmountInWords}
                  onChange={(e) => setIncludeAmountInWords(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="chk-words" className="text-[11px] font-medium text-slate-700 cursor-pointer">
                  تضمين تفقيط المبلغ بالحروف العربية
                </label>
              </div>

              {procedureType === 'INVOICE_CLAIM' && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">تاريخ الاستحقاق المقترح:</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Message Text Editor with Variables Toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  <span>نص رسالة الواتساب القابلة للتعديل الكامل:</span>
                </label>
                {isManualEditMode && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    تم التعديل اليدوي للنص
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Reset to Auto Template Button */}
                {isManualEditMode && (
                  <button
                    onClick={() => setIsManualEditMode(false)}
                    className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    title="استعادة القالب التلقائي"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>استعادة القالب</span>
                  </button>
                )}

                {/* Quick Variable Insertion Chips */}
                <span className="text-[10px] text-slate-400 font-bold ml-1">إدراج متغير:</span>
                {[
                  { label: '+ اسم العميل', token: `*${clientName}*` },
                  { label: '+ المبلغ', token: `*${amount > 0 ? formatEgyptianCurrency(amount) : ''}*` },
                  { label: '+ التفقيط', token: `فقط ${numberToArabicWords(amount)} لا غير` },
                  { label: '+ رقم المرجع', token: `#${referenceCode}` },
                  { label: '+ كود QR', token: `MG-${referenceCode}` },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertToken(chip.token)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Big Rich Text Area */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setIsManualEditMode(true);
                }}
                rows={10}
                className="w-full text-xs font-mono leading-relaxed bg-slate-900 text-emerald-300 border border-slate-700 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-inner resize-y selection:bg-emerald-700 selection:text-white"
                placeholder="اكتب أو عدّل نص رسالة الواتساب هنا..."
              />
              <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                {messageText.length} حرف | جاهزة للإرسال المباشر
              </div>
            </div>
          </div>

          {/* Feedback & Result Alert */}
          {sendResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-bold animate-in fade-in duration-150 ${
                sendResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div>{sendResult.message}</div>
                {sendResult.messageId && (
                  <div className="text-[10px] font-mono text-emerald-700 mt-1">
                    كود المعاملة: {sendResult.messageId} | القناة: {sendResult.channel || 'Internal Code Gateway'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'تم نسخ النص!' : 'نسخ النص'}</span>
            </button>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              يتم الإرسال مباشرة من خادم البرنامج إلى هاتف العميل
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء / إغلاق
            </button>

            {/* Primary Direct Send Button */}
            <button
              onClick={handleDirectSend}
              disabled={isSending || !messageText.trim()}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارِ الإرسال المباشر...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>إرسال عبر كود الواتساب الآن</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
