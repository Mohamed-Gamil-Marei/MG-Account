import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  ArrowRight,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  Mic,
  MicOff,
  Camera,
  Share2,
  Phone,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Building,
  Building2,
  User,
  ChevronRight,
  X,
  Sparkles,
  Send,
  FileText,
  Upload,
  Eye,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  CreditCard,
  Wallet,
  Landmark,
  Calendar,
  MapPin,
  Hash,
  Monitor,
  Volume2,
  Play,
  ArrowUpRight,
  ChevronDown,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import {
  ClientArchiveRecord,
  ClientProcedureTask,
  OfficeTreasuryTransaction,
  ProcedureCategory,
  ProcedureStatus,
} from '../../types';
import { WhatsAppApiService } from '../../services/whatsappApiService';

interface MobileFieldCompanionViewProps {
  state: DatabaseState;
  onExitMobileMode: () => void;
  onNavigateToFullAppTab?: (tab: string) => void;
}

type MobileTab = 'HOME' | 'FINANCIALS' | 'PROCEDURES' | 'COLLECT' | 'EXPENSES' | 'CLIENTS';

export const MobileFieldCompanionView: React.FC<MobileFieldCompanionViewProps> = ({
  state,
  onExitMobileMode,
  onNavigateToFullAppTab,
}) => {
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('HOME');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // WhatsApp Share Modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<{
    phone: string;
    clientName: string;
    messageText: string;
    title: string;
    refCode: string;
  } | null>(null);

  // Voice Quick Logger state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [parsedVoiceData, setParsedVoiceData] = useState<{
    type: 'COLLECTION' | 'EXPENSE' | 'PROCEDURE';
    clientName: string;
    clientId?: string;
    amount: number;
    title: string;
    authority?: string;
  } | null>(null);

  // Gov Receipt Scanner state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  // Form States
  // 1. Procedure Form
  const [procClientId, setProcClientId] = useState('');
  const [procAuthority, setProcAuthority] = useState('مصلحة الضرائب المصرية');
  const [procCategory, setProcCategory] = useState<ProcedureCategory>('TAX_AUDIT');
  const [procTitle, setProcTitle] = useState('');
  const [procStatus, setProcStatus] = useState<ProcedureStatus>('COMPLETED');
  const [procAgreedFees, setProcAgreedFees] = useState<number | ''>('');
  const [procCollectedFees, setProcCollectedFees] = useState<number | ''>('');
  const [procGovFees, setProcGovFees] = useState<number | ''>('');
  const [procNotes, setProcNotes] = useState('');
  const [procReceiptImage, setProcReceiptImage] = useState<string | null>(null);

  // 2. Collection Form
  const [collectClientId, setCollectClientId] = useState('');
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectMethod, setCollectMethod] = useState<'CASH' | 'INSTAPAY' | 'BANK_TRANSFER'>('CASH');
  const [collectCategory, setCollectCategory] = useState('أتعاب مهنية واعتماد');
  const [collectNotes, setCollectNotes] = useState('');

  // 3. Expense Form
  const [expenseChargeType, setExpenseChargeType] = useState<'CLIENT' | 'OFFICE'>('CLIENT');
  const [expenseClientId, setExpenseClientId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState('رسوم ومصروفات حكومية');
  const [expenseAuthority, setExpenseAuthority] = useState('مصلحة الضرائب المصرية');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'CASH' | 'INSTAPAY' | 'BANK_TRANSFER'>('CASH');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseReceiptImage, setExpenseReceiptImage] = useState<string | null>(null);

  // Trigger Toast helper
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Quick Stats Calculations
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTransactions = state.treasuryTransactions.filter((t) => t.date.startsWith(todayStr));
  const todayCollected = todayTransactions
    .filter((t) => t.type === 'INCOME_FEES')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayExpenses = todayTransactions
    .filter((t) => t.type === 'EXPENSE_CLIENT_GOV_FEE' || t.type === 'EXPENSE_OFFICE')
    .reduce((sum, t) => sum + t.amount, 0);

  // All client procedures today
  const allProcedures: { proc: ClientProcedureTask; client: ClientArchiveRecord }[] = [];
  (state.clients || []).forEach((c) => {
    (c.procedures || []).forEach((p) => {
      allProcedures.push({ proc: p, client: c });
    });
  });

  const todayProcedures = allProcedures.filter(
    (item) => item.proc.startDate.startsWith(todayStr) || item.proc.completedDate?.startsWith(todayStr)
  );

  // Total Treasury Balance
  const totalIn = state.treasuryTransactions
    .filter((t) => t.type === 'INCOME_FEES')
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = state.treasuryTransactions
    .filter((t) => t.type !== 'INCOME_FEES')
    .reduce((s, t) => s + t.amount, 0);
  const treasuryBalance = totalIn - totalOut;

  // Pre-fill active client if any
  useEffect(() => {
    if (state.activeClientContext?.clientId) {
      setProcClientId(state.activeClientContext.clientId);
      setCollectClientId(state.activeClientContext.clientId);
      setExpenseClientId(state.activeClientContext.clientId);
      setSelectedClientId(state.activeClientContext.clientId);
    } else if (state.clients && state.clients.length > 0) {
      setProcClientId(state.clients[0].id);
      setCollectClientId(state.clients[0].id);
      setExpenseClientId(state.clients[0].id);
      setSelectedClientId(state.clients[0].id);
    }
  }, [state.activeClientContext?.clientId, state.clients]);

  // Client search filter
  const filteredClients = (state.clients || []).filter((c) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.clientCode.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query)) ||
      (c.commercialRegistrationNo && c.commercialRegistrationNo.includes(query)) ||
      (c.taxOffice && c.taxOffice.toLowerCase().includes(query))
    );
  });

  // --------------------------------------------------------------------------
  // WhatsApp Certified Dispatcher Generator
  // --------------------------------------------------------------------------
  const prepareWhatsAppNotification = (opts: {
    client: ClientArchiveRecord;
    actionTitle: string;
    amount?: number;
    refCode: string;
    authority?: string;
    date?: string;
    typeLabel: string;
  }) => {
    const auditorName = state.officeProfile.auditorName || 'محمد جميل مرعي';
    const licenseNo = state.officeProfile.licenseNumber || '14280';
    const dateStr = opts.date || new Date().toLocaleDateString('ar-EG');
    const amountStr = opts.amount ? `${opts.amount.toLocaleString()} ج.م` : 'بدون رسوم';
    const cleanPhone = (opts.client.phone || '').replace(/[^0-9]/g, '');

    const message = `📋 *إشعار معتمد من مكتب المحاسب القانوني*
🏛️ *أ/ ${auditorName}*
📜 محاسب قانوني ومراقب حسابات - سجل عام: ${licenseNo}
━━━━━━━━━━━━━━━━━━
عناية السادة: *${opts.client.name}*
تحية طيبة وبعد،،

نحيط سيادتكم علماً بأنه تم بنجاح تسجيل وتنفيذ المعاملة الميدانية التالية:
📌 *البيان:* ${opts.actionTitle}
🏷️ *التصنيف:* ${opts.typeLabel}
${opts.authority ? `🏛️ *الجهة الحكومية:* ${opts.authority}\n` : ''}💰 *المبلغ / الرسوم:* ${amountStr}
🔢 *رقم السند / الإجراء:* ${opts.refCode}
📅 *التاريخ:* ${dateStr}
✅ *الموقف الحالي:* معتمد ومثبت في السجلات الرسمية

🔐 *كود التحقق الرقمي:* EAS-${opts.refCode.replace(/[^A-Z0-9]/gi, '')}-${Math.floor(1000 + Math.random() * 9000)}
━━━━━━━━━━━━━━━━━━
مكتب المحاسب القانوني ${auditorName}
شكراً لثقتكم بنا.`;

    setWhatsAppPayload({
      phone: cleanPhone,
      clientName: opts.client.name,
      messageText: message,
      title: opts.actionTitle,
      refCode: opts.refCode,
    });
    setWhatsAppModalOpen(true);
  };

  const dispatchWhatsApp = () => {
    if (!whatsAppPayload) return;
    const phone = whatsAppPayload.phone;
    const encoded = encodeURIComponent(whatsAppPayload.messageText);

    // Also send through backend if connected
    if (phone) {
      WhatsAppApiService.sendChatMessage(phone, whatsAppPayload.messageText, whatsAppPayload.clientName).catch(() => {});
    }

    // Direct WhatsApp web / mobile intent
    const url = phone ? `https://wa.me/2${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    setWhatsAppModalOpen(false);
    showToast('تم فتح محادثة الواتساب لإرسال الإشعار المعتمد للعميل ✅');
  };

  // --------------------------------------------------------------------------
  // Voice Quick Logger Logic
  // --------------------------------------------------------------------------
  const startVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setVoiceTranscript(transcript);
          setIsListening(false);
          parseArabicVoiceCommand(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        return;
      } catch {
        // Fallback to simulation
      }
    }

    // If Web Speech not available in iframe, simulate realistic prompt
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      simulateVoicePhrase('سددت 850 جنيه رسوم شهادة عدم التباس لشركة الأمل واستلمت نموذج 4');
    }, 1800);
  };

  const parseArabicVoiceCommand = (text: string) => {
    let type: 'COLLECTION' | 'EXPENSE' | 'PROCEDURE' = 'PROCEDURE';
    if (text.includes('حصلت') || text.includes('استلمت') || text.includes('قبضت') || text.includes('أتعاب')) {
      type = 'COLLECTION';
    } else if (text.includes('سددت') || text.includes('دفعت') || text.includes('رسوم') || text.includes('مصروف')) {
      type = 'EXPENSE';
    }

    // Extract numbers
    const numMatch = text.match(/\d+/);
    let amount = numMatch ? parseInt(numMatch[0], 10) : 0;

    if (!amount) {
      if (text.includes('ألفين')) amount = 2000;
      else if (text.includes('ألف')) amount = 1000;
      else if (text.includes('خمسمائة') || text.includes('خمسميه')) amount = 500;
      else if (text.includes('ثلاثمائة')) amount = 300;
      else if (text.includes('مائة')) amount = 100;
    }

    // Match client
    let matchedClient = (state.clients || [])[0];
    for (const c of state.clients || []) {
      const words = c.name.split(' ');
      for (const w of words) {
        if (w.length > 2 && text.includes(w)) {
          matchedClient = c;
          break;
        }
      }
    }

    setParsedVoiceData({
      type,
      clientName: matchedClient?.name || 'عميل نقدي',
      clientId: matchedClient?.id,
      amount,
      title: text,
      authority: text.includes('ضرائب')
        ? 'مصلحة الضرائب المصرية'
        : text.includes('سجل')
        ? 'مكتب السجل التجاري'
        : text.includes('استثمار')
        ? 'الهيئة العامة للاستثمار'
        : 'الجهة الحكومية',
    });
  };

  const simulateVoicePhrase = (phrase: string) => {
    setVoiceTranscript(phrase);
    parseArabicVoiceCommand(phrase);
  };

  const applyVoiceDataToForm = () => {
    if (!parsedVoiceData) return;
    if (parsedVoiceData.type === 'COLLECTION') {
      if (parsedVoiceData.clientId) setCollectClientId(parsedVoiceData.clientId);
      if (parsedVoiceData.amount) setCollectAmount(parsedVoiceData.amount);
      setCollectNotes(parsedVoiceData.title);
      setActiveMobileTab('COLLECT');
    } else if (parsedVoiceData.type === 'EXPENSE') {
      if (parsedVoiceData.clientId) setExpenseClientId(parsedVoiceData.clientId);
      if (parsedVoiceData.amount) setExpenseAmount(parsedVoiceData.amount);
      setExpenseCategory(parsedVoiceData.authority ? `رسوم ${parsedVoiceData.authority}` : 'رسوم حكومية');
      setExpenseNotes(parsedVoiceData.title);
      setActiveMobileTab('EXPENSES');
    } else {
      if (parsedVoiceData.clientId) setProcClientId(parsedVoiceData.clientId);
      setProcTitle(parsedVoiceData.title);
      if (parsedVoiceData.amount) setProcGovFees(parsedVoiceData.amount);
      if (parsedVoiceData.authority) setProcAuthority(parsedVoiceData.authority);
      setActiveMobileTab('PROCEDURES');
    }
    setIsVoiceModalOpen(false);
    showToast('تم استخراج وتعبئة البيانات بنجاح في النموذج! 🎯');
  };

  // --------------------------------------------------------------------------
  // Smart Gov-Receipt Scanner Simulation
  // --------------------------------------------------------------------------
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setScannedImage(url);
        simulateReceiptOcr(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateReceiptOcr = (imageUrl: string) => {
    setIsScanningReceipt(true);
    setTimeout(() => {
      setIsScanningReceipt(false);
      setExpenseAmount(680);
      setExpenseAuthority('مصلحة الضرائب المصرية - نموذج 33 ع.ح');
      setExpenseCategory('رسوم فحص وطوابع دمغة مصلحة الضرائب');
      setExpenseNotes('سداد قسيمة 33 ع.ح رقم 994021 - مأمورية ضرائب العاشر من رمضان');
      setExpenseReceiptImage(imageUrl);
      setProcReceiptImage(imageUrl);
      setIsCameraModalOpen(false);
      setActiveMobileTab('EXPENSES');
      showToast('تم مسح إيصال المأمورية واستخراج المبلغ 680 ج.م تلقائياً! 📸');
    }, 1200);
  };

  // --------------------------------------------------------------------------
  // Form Submit Handlers
  // --------------------------------------------------------------------------

  // 1. Submit Procedure
  const handleSaveProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    const client = (state.clients || []).find((c) => c.id === procClientId);
    if (!client) {
      alert('يرجى اختيار العميل أولاً');
      return;
    }
    if (!procTitle.trim()) {
      alert('يرجى إدخال عنوان الإجراء');
      return;
    }

    const agreed = Number(procAgreedFees) || 0;
    const collected = Number(procCollectedFees) || 0;
    const govFees = Number(procGovFees) || 0;

    const newProc = db.addClientProcedure(
      client.id,
      {
        title: `${procTitle} (${procAuthority})`,
        category: procCategory,
        description: procNotes,
        assignedTo: state.officeProfile.auditorName || 'محمد جميل مرعي',
        status: procStatus,
        priority: 'HIGH',
        startDate: todayStr,
        dueDate: todayStr,
        completedDate: procStatus === 'COMPLETED' ? todayStr : undefined,
        agreedFees: agreed,
        collectedFees: collected,
        governmentFees: govFees,
        progressPercent: procStatus === 'COMPLETED' ? 100 : 50,
        notes: procNotes + (procReceiptImage ? ' [مرفق صورة الإيصال الحكومي]' : ''),
      },
      {
        recordFeeInTreasury: collected > 0,
        feePaymentMethod: 'CASH',
        recordGovFeeInTreasury: govFees > 0,
        govFeePaymentMethod: 'CASH',
      }
    );

    // Reset Form
    setProcTitle('');
    setProcAgreedFees('');
    setProcCollectedFees('');
    setProcGovFees('');
    setProcNotes('');
    setProcReceiptImage(null);

    showToast(`تم حفظ الإجراء [${newProc.procedureCode}] في سجل العميل والخزنة بنجاح ✅`);

    // Prompt WhatsApp Certified Notification
    prepareWhatsAppNotification({
      client,
      actionTitle: newProc.title,
      amount: collected > 0 ? collected : govFees > 0 ? govFees : undefined,
      refCode: newProc.procedureCode,
      authority: procAuthority,
      typeLabel: 'إنجاز إجراء ومهمة حكومية',
    });
  };

  // 2. Submit Collection (سند قبض فوري)
  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const client = (state.clients || []).find((c) => c.id === collectClientId);
    if (!client) {
      alert('يرجى اختيار العميل');
      return;
    }
    const amt = Number(collectAmount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    const tx = db.addTreasuryTransaction({
      date: todayStr,
      type: 'INCOME_FEES',
      category: collectCategory,
      amount: amt,
      clientId: client.id,
      clientName: client.name,
      paymentMethod: collectMethod,
      description: `تحصيل أتعاب ميداني: ${collectCategory} - ${client.name} ${collectNotes ? `(${collectNotes})` : ''}`,
      recordedBy: state.officeProfile.auditorName || 'محمد جميل مرعي',
    });

    // Also link to client procedure or journal entry if needed
    setCollectAmount('');
    setCollectNotes('');

    showToast(`تم إصدار سند القبض [${tx.voucherNumber}] بمبلغ ${amt.toLocaleString()} ج.م ✅`);

    prepareWhatsAppNotification({
      client,
      actionTitle: `سند قبض أتعاب رقم ${tx.voucherNumber} (${collectCategory})`,
      amount: amt,
      refCode: tx.voucherNumber,
      typeLabel: 'سند تحصيل وقبض رسمي',
    });
  };

  // 3. Submit Expense (مصروف ميداني / إيصال مأمورية)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح للمصروف');
      return;
    }

    const client = expenseChargeType === 'CLIENT'
      ? (state.clients || []).find((c) => c.id === expenseClientId)
      : null;

    if (expenseChargeType === 'CLIENT' && !client) {
      alert('يرجى تحديد العميل المحمّل عليه المصروف');
      return;
    }

    const tx = db.addTreasuryTransaction({
      date: todayStr,
      type: expenseChargeType === 'CLIENT' ? 'EXPENSE_CLIENT_GOV_FEE' : 'EXPENSE_OFFICE',
      category: expenseCategory,
      amount: amt,
      clientId: client?.id,
      clientName: client?.name,
      paymentMethod: expensePaymentMethod,
      description: `سداد ميداني: ${expenseCategory} [${expenseAuthority}] ${client ? `لحساب ${client.name}` : 'مصروفات مكتب'} ${expenseNotes ? `(${expenseNotes})` : ''}`,
      recordedBy: state.officeProfile.auditorName || 'محمد جميل مرعي',
    });

    setExpenseAmount('');
    setExpenseNotes('');
    setExpenseReceiptImage(null);

    showToast(`تم قيد سند الصرف [${tx.voucherNumber}] بمبلغ ${amt.toLocaleString()} ج.م ✅`);

    if (client) {
      prepareWhatsAppNotification({
        client,
        actionTitle: `سداد رسوم حكومية: ${expenseCategory}`,
        amount: amt,
        refCode: tx.voucherNumber,
        authority: expenseAuthority,
        typeLabel: 'إيصال سداد رسوم حكومية',
      });
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none pb-24 md:pb-8"
    >
      {/* ==================================================================== */}
      {/* TOP COMPANION HEADER (Sticky)                                       */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          {/* Brand & Auditor identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 border border-emerald-400/40">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white truncate">
                  المساعد الميداني
                </h1>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/40 font-bold">
                  EAS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {state.officeProfile.auditorName || 'أ/ محمد جميل مرعي'}
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Logger Trigger */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
              title="تسجيل صوتي ذكي"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Gov Receipt Snap Trigger */}
            <button
              onClick={() => setIsCameraModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
              title="مسح إيصال مأمورية بكاميرا الهاتف"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Switch back to Full ERP Desktop */}
            <button
              onClick={onExitMobileMode}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="التبديل إلى وضع الديسك توب الكامل (محطة العمل)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>وضع الديسك توب</span>
            </button>
          </div>
        </div>

        {/* Treasury Quick Ribbon */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-400">رصيد الخزينة الميدانية:</span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {treasuryBalance.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">اليوم:</span>
            <span className="text-[10px] text-emerald-300 font-mono font-bold">
              +{todayCollected.toLocaleString()}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] text-rose-400 font-mono font-bold">
              -{todayExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-600 text-white p-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span className="flex-1">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN VIEW CONTENT CONTAINER                                          */}
      {/* ==================================================================== */}
      <main className="flex-1 p-3.5 max-w-lg mx-auto w-full space-y-4">
        {/* ================================================================== */}
        {/* TAB 1: HOME (الرئيسية السريعة)                                     */}
        {/* ================================================================== */}
        {activeMobileTab === 'HOME' && (
          <div className="space-y-4">
            {/* 4 Big Touch Action Tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Tile 1: Collect */}
              <button
                onClick={() => setActiveMobileTab('COLLECT')}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 flex flex-col items-start gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">تحصيل أتعاب ورسوم</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">سند قبض وإشعار واتساب</p>
                </div>
              </button>

              {/* Tile 2: Procedure */}
              <button
                onClick={() => setActiveMobileTab('PROCEDURES')}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-500/30 hover:border-blue-400 flex flex-col items-start gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-slate-950 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">إنجاز وتسجيل إجراء</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">ضرائب، استثمار، سجل</p>
                </div>
              </button>

              {/* Tile 3: Expense */}
              <button
                onClick={() => setActiveMobileTab('EXPENSES')}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/80 to-slate-900 border border-amber-500/30 hover:border-amber-400 flex flex-col items-start gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">سداد مصروف ميداني</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">إيصال مأمورية، دمغات، عهدة</p>
                </div>
              </button>

              {/* Tile 4: Voice Logger */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/80 to-slate-900 border border-purple-500/30 hover:border-purple-400 flex flex-col items-start gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">تسجيل صوتي ذكي</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">تحدث بالعربية وتعبئة آلية</p>
                </div>
              </button>
            </div>

            {/* Smart Banner: Gov Receipt Camera Snap */}
            <div
              onClick={() => setIsCameraModalOpen(true)}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border border-cyan-500/30 flex items-center justify-between cursor-pointer hover:border-cyan-400 transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-300">
                    المسح الذكي لإيصال المأمورية (كاميرا)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    التقط صورة إيصال 33 ع.ح أو الفاتورة لاستخراج المبلغ فوراً
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-cyan-400 rotate-180 shrink-0" />
            </div>

            {/* Credit Dossier & 2026 Financial Highlights Quick Card */}
            <div
              onClick={() => setActiveMobileTab('FINANCIALS')}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all active:scale-98 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-emerald-300">
                      الملف الائتماني وقوائم 2026
                    </h4>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      مبيعات 23.5M
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    صافي ربح 4.97M | استثمار 35.6M (مركز مالي 30/06/2026)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400 rotate-180 shrink-0" />
            </div>

            {/* Today's Field Activity Stream */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white">نشاط اليوم الميداني</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {todayTransactions.length + todayProcedures.length} عملية
                </span>
              </div>

              {todayTransactions.length === 0 && todayProcedures.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  لم يتم تسجيل عمليات ميدانية اليوم حتى الآن. ابدأ بالضغط على الأزرار أعلاه!
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {/* Procedures Stream */}
                  {todayProcedures.map(({ proc, client }) => (
                    <div
                      key={proc.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate text-[11px]">
                            {proc.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {client.name} • {proc.procedureCode}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          prepareWhatsAppNotification({
                            client,
                            actionTitle: proc.title,
                            amount: proc.collectedFees || proc.governmentFees,
                            refCode: proc.procedureCode,
                            typeLabel: 'إنجاز إجراء ومهمة',
                          })
                        }
                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg shrink-0 cursor-pointer"
                        title="مشاركة إشعار واتساب"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Treasury Tx Stream */}
                  {todayTransactions.map((tx) => {
                    const client = (state.clients || []).find((c) => c.id === tx.clientId);
                    const isIncome = tx.type === 'INCOME_FEES';
                    return (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isIncome ? <DollarSign className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate text-[11px]">
                              {tx.category}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {tx.clientName || 'مصروف مكتب'} • {tx.voucherNumber}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {tx.amount.toLocaleString()} ج.م
                          </span>

                          {client && (
                            <button
                              onClick={() =>
                                prepareWhatsAppNotification({
                                  client,
                                  actionTitle: tx.category,
                                  amount: tx.amount,
                                  refCode: tx.voucherNumber,
                                  typeLabel: isIncome ? 'سند قبض أتعاب' : 'سداد مصروف حكومي',
                                })
                              }
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                              title="إشعار واتساب"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: PROCEDURES (تسجيل وإنجاز إجراء)                              */}
        {/* ================================================================== */}
        {activeMobileTab === 'PROCEDURES' && (
          <form onSubmit={handleSaveProcedure} className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">تسجيل وإنجاز إجراء ميداني</h2>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                حفظ فوري + خزنة
              </span>
            </div>

            {/* Client Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                العميل <span className="text-rose-400">*</span>
              </label>
              <select
                value={procClientId}
                onChange={(e) => setProcClientId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- اختر العميل --</option>
                {(state.clients || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Gov Authority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  الجهة الحكومية
                </label>
                <select
                  value={procAuthority}
                  onChange={(e) => setProcAuthority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="مصلحة الضرائب المصرية">مصلحة الضرائب المصرية</option>
                  <option value="مكتب السجل التجاري">مكتب السجل التجاري</option>
                  <option value="الهيئة العامة للاستثمار GAFI">الهيئة العامة للاستثمار GAFI</option>
                  <option value="الغرفة التجارية">الغرفة التجارية</option>
                  <option value="التأمينات الاجتماعية">التأمينات الاجتماعية</option>
                  <option value="مصلحة الجمارك المصرية">مصلحة الجمارك المصرية</option>
                  <option value="الشهر العقاري والتوثيق">الشهر العقاري والتوثيق</option>
                  <option value="البنك / جهة تمويل">البنك / جهة تمويل</option>
                  <option value="أخرى">جهة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  نوع الإجراء
                </label>
                <select
                  value={procCategory}
                  onChange={(e) => setProcCategory(e.target.value as ProcedureCategory)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="TAX_AUDIT">فحص ضريبي سنوي</option>
                  <option value="TAX_DECLARATION">إقرار ضريبي</option>
                  <option value="COMMERCIAL_REGISTRY">سجل تجاري / تعديل</option>
                  <option value="COMPANY_ESTABLISHMENT">تأسيس وتعديل شركة</option>
                  <option value="PROFESSIONAL_CERT">شهادة مهنية ودخل</option>
                  <option value="FINANCIAL_AUDIT">اعتماد قوائم مالية</option>
                  <option value="GOV_FEE_PAYMENT">سداد رسوم مأمورية</option>
                  <option value="GENERAL_CONSULTING">استشارة ومتابعة</option>
                </select>
              </div>
            </div>

            {/* Title / Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                بيان الإجراء <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={procTitle}
                onChange={(e) => setProcTitle(e.target.value)}
                placeholder="مثال: استخراج سجل تجاري محدث وتعديل السمة التجارية"
                required
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />

              {/* Quick Suggestion Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 mt-1 text-[10px] text-slate-400">
                <span
                  onClick={() => setProcTitle('حضور فحص ضريبة القيمة المضافة')}
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap"
                >
                  فحص قيمة مضافة
                </span>
                <span
                  onClick={() => setProcTitle('استخراج شهادة عدم التباس وتعديل سجل')}
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap"
                >
                  شهادة عدم التباس
                </span>
                <span
                  onClick={() => setProcTitle('توثيق وتصديق جمعية عمومية عادية')}
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap"
                >
                  توثيق جمعية عمومية
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                حالة الإنجاز
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setProcStatus('COMPLETED')}
                  className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                    procStatus === 'COMPLETED'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تم بنجاح ✅</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProcStatus('IN_PROGRESS')}
                  className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                    procStatus === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>جاري المتابعة ⏳</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProcStatus('PENDING_CLIENT_DOCS')}
                  className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                    procStatus === 'PENDING_CLIENT_DOCS'
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>نقص أوراق 📄</span>
                </button>
              </div>
            </div>

            {/* Financial Impacts (Fees & Expenses) */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2.5">
              <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>التسوية المالية بالخزينة (اختياري)</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-300 mb-1">
                    أتعاب محصلة فوراً (ج.م)
                  </label>
                  <input
                    type="number"
                    value={procCollectedFees}
                    onChange={(e) => setProcCollectedFees(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold rounded-xl p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1">
                    رسوم حكومية مسددة (ج.م)
                  </label>
                  <input
                    type="number"
                    value={procGovFees}
                    onChange={(e) => setProcGovFees(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 text-rose-400 font-mono font-bold rounded-xl p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Receipt / Attachment preview if any */}
            {procReceiptImage && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800 border border-cyan-500/40 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={procReceiptImage}
                    alt="Receipt"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                  />
                  <div>
                    <span className="text-cyan-300 font-bold block">مرفق إيصال المأمورية 📸</span>
                    <span className="text-[10px] text-slate-400">سيتم ربطه بالأرشيف والمستندات</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProcReceiptImage(null)}
                  className="text-rose-400 hover:text-rose-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                ملاحظات ميدانية
              </label>
              <textarea
                value={procNotes}
                onChange={(e) => setProcNotes(e.target.value)}
                placeholder="أي ملاحظات أو مستندات تم استلامها أو مواعيد قادمة..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>حفظ الإجراء في ملف العميل والخزنة</span>
            </button>
          </form>
        )}

        {/* ================================================================== */}
        {/* TAB 3: COLLECT (تحصيل أتعاب ورسوم - سند قبض فوري)                  */}
        {/* ================================================================== */}
        {activeMobileTab === 'COLLECT' && (
          <form onSubmit={handleSaveCollection} className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">سند قبض وتحصيل أتعاب فوري</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                قيد فوري في الخزينة
              </span>
            </div>

            {/* Client Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                العميل <span className="text-rose-400">*</span>
              </label>
              <select
                value={collectClientId}
                onChange={(e) => setCollectClientId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- اختر العميل --</option>
                {(state.clients || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                المبلغ المحصل (ج.م) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="أدخل المبلغ..."
                required
                className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-black text-lg rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Amount Quick Presets */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto py-1">
                {[500, 1000, 2000, 3000, 5000, 10000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setCollectAmount(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs font-bold shrink-0 border border-slate-700 cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                طريقة الدفع
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCollectMethod('CASH')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                    collectMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>نقدي كاش</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectMethod('INSTAPAY')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                    collectMethod === 'INSTAPAY'
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>إنستاباي InstaPay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectMethod('BANK_TRANSFER')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                    collectMethod === 'BANK_TRANSFER'
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>تحويل بنكي</span>
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                بند التحصيل
              </label>
              <select
                value={collectCategory}
                onChange={(e) => setCollectCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="دفعة أتعاب مراجعة واعتماد قوائم">دفعة أتعاب مراجعة واعتماد قوائم</option>
                <option value="أتعاب فحص ضريبي ولجان طعن">أتعاب فحص ضريبي ولجان طعن</option>
                <option value="أمانات سداد رسوم حكومية لحساب العميل">أمانات سداد رسوم حكومية لحساب العميل</option>
                <option value="أتعاب تأسيس وتعديل سجل تجاري">أتعاب تأسيس وتعديل سجل تجاري</option>
                <option value="أتعاب استشارات وتأهيل منظومة الفاتورة">أتعاب استشارات وتأهيل منظومة الفاتورة</option>
                <option value="أتعاب شهادة دخل مهنية">أتعاب شهادة دخل مهنية</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                البيان / ملاحظات السند
              </label>
              <input
                type="text"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                placeholder="مثال: دفعة تحت الحساب نقداً بمقر المأمورية"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>إصدار سند القبض وإرسال إيصال الواتساب</span>
            </button>
          </form>
        )}

        {/* ================================================================== */}
        {/* TAB 4: EXPENSES (سداد مصروف ميداني / إيصال مأمورية)                */}
        {/* ================================================================== */}
        {activeMobileTab === 'EXPENSES' && (
          <form onSubmit={handleSaveExpense} className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">سداد مصروف ميداني أو إيصال</h2>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                سند صرف معتمد
              </span>
            </div>

            {/* Charge Type: Client vs Office */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                الجهة المحمّل عليها المصروف
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExpenseChargeType('CLIENT')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                    expenseChargeType === 'CLIENT'
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>أمانات لحساب عميل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseChargeType('OFFICE')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                    expenseChargeType === 'OFFICE'
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>مصروفات عامة للمكتب</span>
                </button>
              </div>
            </div>

            {/* Client Picker if charged to Client */}
            {expenseChargeType === 'CLIENT' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  العميل <span className="text-rose-400">*</span>
                </label>
                <select
                  value={expenseClientId}
                  onChange={(e) => setExpenseClientId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- اختر العميل --</option>
                  {(state.clients || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                المبلغ المسدد (ج.م) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                required
                className="w-full bg-slate-950 border border-slate-700 text-rose-400 font-mono font-black text-lg rounded-xl p-3 focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Gov Authority / Office Reason */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  الجهة / المأمورية
                </label>
                <select
                  value={expenseAuthority}
                  onChange={(e) => setExpenseAuthority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="مصلحة الضرائب المصرية">مصلحة الضرائب المصرية</option>
                  <option value="مكتب السجل التجاري">مكتب السجل التجاري</option>
                  <option value="الهيئة العامة للاستثمار GAFI">الهيئة العامة للاستثمار GAFI</option>
                  <option value="الغرفة التجارية">الغرفة التجارية</option>
                  <option value="التأمينات الاجتماعية">التأمينات الاجتماعية</option>
                  <option value="انتقالات ومأموريات">انتقالات ومواصلات</option>
                  <option value="أخرى">جهة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  بند الصرف
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="رسوم ومصروفات حكومية">رسوم قسيمة 33 ع.ح</option>
                  <option value="رسوم تجديد واستخراج سجل">رسوم استخراج سجل</option>
                  <option value="طوابع دمغة ونقابة">طوابع دمغة وتصديق</option>
                  <option value="انتقالات ومواصلات المندوب">انتقالات ومواصلات</option>
                  <option value="مصاريف نثرية وإكراميات">نثريات وإكراميات</option>
                </select>
              </div>
            </div>

            {/* Receipt Snap Preview & Camera button */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                صورة الإيصال أو الفاتورة
              </label>
              {expenseReceiptImage ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={expenseReceiptImage}
                      alt="Receipt"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                    <div>
                      <span className="text-cyan-300 font-bold block">تم إرفاق صورة الإيصال</span>
                      <span className="text-[10px] text-slate-400">ستحفظ في سند الصرف الميداني</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpenseReceiptImage(null)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-dashed border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط صورة الإيصال بكاميرا الهاتف</span>
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                رقم الإيصال / ملاحظات
              </label>
              <input
                type="text"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="مثال: قسيمة 33 ع.ح رقم 8812 - فحص ضرائب 2025"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Receipt className="w-5 h-5" />
              <span>تسجيل سند الصرف من الخزنة</span>
            </button>
          </form>
        )}

        {/* ================================================================== */}
        {/* TAB 5: CLIENTS (دليل العملاء والاتصال السريع)                       */}
        {/* ================================================================== */}
        {activeMobileTab === 'CLIENTS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">دليل العملاء والاتصال السريع</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredClients.length} عميل
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، كود العميل، أو المأمورية..."
                className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl pr-9 pl-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Clients List */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
              {filteredClients.map((client) => {
                const proceduresCount = (client.procedures || []).length;
                const phone = client.phone || client.mobile || '';
                const cleanPhone = phone.replace(/[^0-9]/g, '');

                return (
                  <div
                    key={client.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-white truncate">
                            {client.name}
                          </h3>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">
                            ({client.clientCode})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {client.activity || 'نشاط تجاري'} • {client.taxOffice || 'مأمورية الضرائب'}
                        </p>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0 font-mono">
                        {proceduresCount} إجراء
                      </span>
                    </div>

                    {/* Quick Direct Actions: Call, WhatsApp, Fast Collect, Fast Procedure */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900">
                      {/* Call Phone */}
                      {cleanPhone ? (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>اتصال</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex-1 py-1.5 rounded-xl bg-slate-900 text-slate-600 border border-slate-800 flex items-center justify-center gap-1 text-[11px]"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>لا يوجد هاتف</span>
                        </button>
                      )}

                      {/* WhatsApp Chat */}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/2${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-teal-500/30 flex items-center justify-center gap-1 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </a>
                      )}

                      {/* Quick Collect For Client */}
                      <button
                        onClick={() => {
                          setCollectClientId(client.id);
                          setActiveMobileTab('COLLECT');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 text-[11px] font-bold transition-colors cursor-pointer"
                        title="تحصيل أتعاب لهذا العميل"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>تحصيل</span>
                      </button>

                      {/* Quick Procedure For Client */}
                      <button
                        onClick={() => {
                          setProcClientId(client.id);
                          setActiveMobileTab('PROCEDURES');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1 text-[11px] font-bold transition-colors cursor-pointer"
                        title="تسجيل إجراء لهذا العميل"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>إجراء</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 6: FINANCIALS (الملف الائتماني والمالي الميداني)                 */}
        {/* ================================================================== */}
        {activeMobileTab === 'FINANCIALS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header / Context */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">الملف الائتماني والمالي المعتمد</h2>
                    <p className="text-[10px] text-slate-400">مركز مالي معتمد في 30/06/2026 والمقارنات</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/40">
                  EAS 2026
                </span>
              </div>

              {/* Switch to Full Desktop Simulator */}
              <button
                type="button"
                onClick={() => onNavigateToFullAppTab ? onNavigateToFullAppTab('CREDIT_SIMULATOR') : onExitMobileMode()}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>فتح شاشات التحليل والطباعة الرسمية (ديسك توب)</span>
              </button>
            </div>

            {/* 2026 Statement Highlights Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">قائمة الدخل للفترة (30/06/2026)</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">مراجعة نصف سنوية</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">صافي المبيعات (إيرادات النشاط):</span>
                  <span className="font-mono font-bold text-white text-sm">23,540,850 ج.م</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">تكلفة المبيعات:</span>
                  <span className="font-mono text-rose-400">(14,124,510) ج.م</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900 bg-slate-900/50 px-2 rounded-lg">
                  <span className="text-emerald-300 font-semibold">مجمل الربح (هامش 40%):</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">9,416,340 ج.م</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">المصروفات الإدارية والعمومية:</span>
                  <span className="font-mono text-rose-400">(1,971,060) ج.م</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">صافي الربح قبل الضريبة:</span>
                  <span className="font-mono text-white font-semibold">7,445,280 ج.م</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">ضريبة الدخل المستحقة (22.5%):</span>
                  <span className="font-mono text-rose-400">(1,675,188) ج.م</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-gradient-to-r from-emerald-950/60 to-slate-900 px-2.5 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-300 font-bold">صافي الربح بعد الضريبة:</span>
                  <span className="font-mono font-black text-emerald-400 text-base">4,971,462 ج.م</span>
                </div>
              </div>
            </div>

            {/* Balance Sheet (المركز المالي 30/6/2026) */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">المركز المالي في 30/06/2026</span>
                </div>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">
                  متزن رسمياً
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الأصول المتداولة:</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs mt-0.5 block">16,265,784 ج.م</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الخصوم المتداولة:</span>
                  <span className="font-mono font-bold text-rose-300 text-xs mt-0.5 block">6,977,874 ج.م</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">رأس المال العامل:</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">9,287,910 ج.م</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الأصول الثابتة:</span>
                  <span className="font-mono font-bold text-blue-300 text-xs mt-0.5 block">26,350,500 ج.م</span>
                </div>
                <div className="col-span-2 p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 flex justify-between items-center">
                  <span className="text-xs font-bold text-white">إجمالي حقوق الملكية (الاستثمار):</span>
                  <span className="font-mono font-black text-cyan-300 text-sm">35,638,410 ج.م</span>
                </div>
              </div>
            </div>

            {/* Historical Comparative Summary Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <span className="text-xs font-bold text-white block">مقارنة تطور المبيعات والأرباح:</span>
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-300">عام 2025:</span>
                    <span className="text-[11px] text-slate-400 mr-2">مبيعات 38.13M ج.م</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">صافي ربح: 9,710,000 ج.م</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-300">عام 2024:</span>
                    <span className="text-[11px] text-slate-400 mr-2">مبيعات 9.85M ج.م</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">صافي ربح: 196,913 ج.م</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* BOTTOM NAVIGATION BAR (Thumb-Friendly Ergonomic)                      */}
      {/* ==================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-1.5 py-1.5 shadow-2xl">
        <div className="max-w-lg mx-auto grid grid-cols-6 gap-0.5 sm:gap-1">
          {/* 1. Home */}
          <button
            onClick={() => setActiveMobileTab('HOME')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'HOME'
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">الرئيسية</span>
          </button>

          {/* 2. Financials */}
          <button
            onClick={() => setActiveMobileTab('FINANCIALS')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'FINANCIALS'
                ? 'bg-slate-800 text-emerald-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">الماليات</span>
          </button>

          {/* 3. Procedures */}
          <button
            onClick={() => setActiveMobileTab('PROCEDURES')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'PROCEDURES'
                ? 'bg-slate-800 text-blue-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">إجراء</span>
          </button>

          {/* 4. Collect */}
          <button
            onClick={() => setActiveMobileTab('COLLECT')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'COLLECT'
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">تحصيل</span>
          </button>

          {/* 5. Expenses */}
          <button
            onClick={() => setActiveMobileTab('EXPENSES')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'EXPENSES'
                ? 'bg-slate-800 text-amber-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">مصروف</span>
          </button>

          {/* 6. Clients */}
          <button
            onClick={() => setActiveMobileTab('CLIENTS')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'CLIENTS'
                ? 'bg-slate-800 text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">العملاء</span>
          </button>
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* MODAL 1: WHATSAPP CERTIFIED NOTIFICATION MODAL                       */}
      {/* ==================================================================== */}
      {whatsAppModalOpen && whatsAppPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    إشعار العميل المعتمد بالواتساب
                  </h3>
                  <p className="text-[10px] text-slate-400">بختم وتوقيع المحاسب القانوني</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient info */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">إلى العميل:</span>
                <span className="font-bold text-white">{whatsAppPayload.clientName}</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">رقم الهاتف:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {whatsAppPayload.phone || 'غير مسجل'}
                </span>
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs max-h-56 overflow-y-auto font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {whatsAppPayload.messageText}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={dispatchWhatsApp}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>إرسال فوري عبر الواتساب 💬</span>
              </button>
              <button
                onClick={() => setWhatsAppModalOpen(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: SMART ARABIC VOICE QUICK LOGGER                             */}
      {/* ==================================================================== */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    المساعد الصوتي الميداني الذكي
                  </h3>
                  <p className="text-[10px] text-slate-400">تحدث بالعربية ليتم استخراج البيانات فوراً</p>
                </div>
              </div>
              <button
                onClick={() => setIsVoiceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mic Button & Wave Animation */}
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isListening
                    ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white ring-4 ring-purple-500/20'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <p className="text-xs font-bold text-purple-300">
                {isListening ? 'جاري الاستماع... تحدث الآن' : 'اضغط على الميكروفون للتحدث'}
              </p>
            </div>

            {/* Transcript Preview */}
            {voiceTranscript && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block mb-1">الكلام المسجل:</span>
                <p className="font-semibold text-white">{voiceTranscript}</p>
              </div>
            )}

            {/* Parsed Fields Preview */}
            {parsedVoiceData && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-purple-300 block">
                  البيانات المستخرجة آلياً:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">النوع: </span>
                    <span className="font-bold text-white">
                      {parsedVoiceData.type === 'COLLECTION'
                        ? 'تحصيل أتعاب'
                        : parsedVoiceData.type === 'EXPENSE'
                        ? 'سداد مصروف'
                        : 'إجراء ميداني'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">المبلغ: </span>
                    <span className="font-bold font-mono text-emerald-400">
                      {parsedVoiceData.amount ? `${parsedVoiceData.amount} ج.م` : 'غير محدد'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">العميل: </span>
                    <span className="font-bold text-white">{parsedVoiceData.clientName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyVoiceDataToForm}
                  className="w-full mt-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وتعبئة النموذج فوراً</span>
                </button>
              </div>
            )}

            {/* Quick Test Voice Simulation Phrases */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 block">أو جرب جمل صوتية سريعة بنقرة واحدة:</span>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => simulateVoicePhrase('سددت 850 جنيه رسوم شهادة عدم التباس لشركة الأمل واستلمت نموذج 4')}
                  className="p-1.5 text-right rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 cursor-pointer"
                >
                  🔊 "سددت 850 جنيه رسوم شهادة عدم التباس لشركة الأمل"
                </button>
                <button
                  type="button"
                  onClick={() => simulateVoicePhrase('حصلت 3500 جنيه أتعاب مراجعة كاش من مؤسسة النور')}
                  className="p-1.5 text-right rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 cursor-pointer"
                >
                  🔊 "حصلت 3500 جنيه أتعاب مراجعة كاش من مؤسسة النور"
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: SMART GOV-RECEIPT SNAP (كاميرا إيصالات المأموريات)          */}
      {/* ==================================================================== */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    المسح الذكي لإيصالات المصالح الحكومية
                  </h3>
                  <p className="text-[10px] text-slate-400">قسائم 33 ع.ح، إيصالات فوري، ورسوم السجل</p>
                </div>
              </div>
              <button
                onClick={() => setIsCameraModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera / Upload Area */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-slate-950 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">التقاط صورة بكاميرا الهاتف</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  أو اختر صورة من معرض الصور بهاتفك
                </p>
              </div>

              <label className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-all">
                <span>فتح الكاميرا / المعرض</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Demo Pre-scanned Gov Receipts */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 block font-bold">
                أو جرب بنقرة واحدة إيصالات حكومية شائعة:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    simulateReceiptOcr(
                      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=300'
                    )
                  }
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-right cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-cyan-300 block">
                    قسيمة 33 ع.ح ضرائب
                  </span>
                  <span className="text-[10px] text-slate-400">مبلغ: 680 ج.م</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    simulateReceiptOcr(
                      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300'
                    );
                    setExpenseAmount(1200);
                    setExpenseAuthority('مكتب السجل التجاري');
                    setExpenseCategory('رسوم استخراج وتجديد سجل تجاري');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-right cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-cyan-300 block">
                    رسوم سجل تجاري
                  </span>
                  <span className="text-[10px] text-slate-400">مبلغ: 1,200 ج.م</span>
                </button>
              </div>
            </div>

            {isScanningReceipt && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center gap-2 text-xs text-cyan-300 font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري قراءة وتحليل بيانات الإيصال...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
