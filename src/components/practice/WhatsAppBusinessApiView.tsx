import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  MessageSquare,
  FileText,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Filter,
  Search,
  Sliders,
  ChevronDown,
  Trash2,
  FileCheck2,
  DollarSign,
  Calendar,
  Percent,
  Printer,
  Smartphone,
  CheckCheck,
  Hash,
  AlertTriangle,
  Zap,
  Info,
  User,
  QrCode,
  Wifi,
  WifiOff,
  LogOut,
  Bot,
  Play,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord } from '../../types';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import {
  WhatsAppApiService,
  WhatsAppApiQuotationPayload,
  WhatsAppApiCertifiedReportPayload,
  WhatsAppApiLogItem,
  WhatsAppApiDiagnostics,
  WhatsAppApiSessionStatus,
} from '../../services/whatsappApiService';
import { WhatsAppLiveChatPanel } from './WhatsAppLiveChatPanel';

interface WhatsAppBusinessApiViewProps {
  state: DatabaseState;
  initialClientId?: string;
  onNavigateToArchive?: (clientId?: string) => void;
}

// Preset Professional Quotation Packages
interface QuotationPreset {
  id: string;
  title: string;
  category: string;
  professionalFees: number;
  governmentFees: number;
  days: number;
  scope: string[];
  notes: string;
}

const QUOTATION_PRESETS: QuotationPreset[] = [
  {
    id: 'CORP_SETUP_JSC',
    title: 'تأسيس شركة مساهمة مصرية (ش.م.م) وفقاً للقانون 159 لسنة 1981',
    category: 'تأسيس شركات وقوانين استثمار',
    professionalFees: 28000,
    governmentFees: 14500,
    days: 7,
    scope: [
      'استخراج شهادة عدم التباس الاسم التجاري من السجل التجاري الرئيسي',
      'إعداد وصياغة العقد الابتدائي والنظام الأساسي واعتماده بنقابة المحامين',
      'فتح الحساب البنكي وإيداع نسبة رأس المال واستخراج شهادة بنكية معتمدة',
      'إنهاء إجراءات قطاع التأسيس بالهيئة العامة للاستثمار والمناطق الحرة (GAFI)',
      'استخراج السجل التجاري المميكن وإصدار البطاقة الضريبية المميكنة',
    ],
    notes: 'العرض يشمل سداد رسوم الغرفة التجارية ورسوم نقابة المحامين وهيئة الاستثمار.',
  },
  {
    id: 'CORP_SETUP_LLC',
    title: 'تأسيس شركة ذات مسؤولية محدودة (ش.ذ.م.م) ونظام الشركاء',
    category: 'تأسيس شركات وقوانين استثمار',
    professionalFees: 18000,
    governmentFees: 9500,
    days: 5,
    scope: [
      'حجز الاسم التجاري وفحص التوكيلات القانونية للشركاء',
      'صياغة ومراجعة عقد التأسيس واعتماده بهيئة الاستثمار',
      'قيد الشركة في السجل التجاري واستخراج البطاقة الضريبية',
      'فتح الملف التأميني للمنشأة والتأمين على المدير المسؤول',
    ],
    notes: 'الأسعار تشمل كافة مراحل التأسيس حتى استلام البطاقة الضريبية والسجل التجاري.',
  },
  {
    id: 'TAX_AUDIT_INSPECTION',
    title: 'فحص ضريبي شامل ومرافقة لجان الطعن (دخل + قيمة مضافة + كسب عمل)',
    category: 'الفحص والمنازعات الضريبية',
    professionalFees: 25000,
    governmentFees: 3000,
    days: 15,
    scope: [
      'فحص وتدقيق القيود اليومية والمستندات المؤيدة للإيرادات والمصروفات',
      'إعداد المذكرات الدفاعية والمحاسبية القانونية للرد على نماذج الفحص (19، 15)',
      'حضور جلسات الفحص بمأمورية الضرائب المختصة والتفاوض الفني مع المراجعين',
      'إعداد الدفوع القانونية للجان الداخلية ولجان الطعن الضريبي لإنهاء النزاع بالتسوية',
    ],
    notes: 'الدفعة المقدمة 50% عند التكليف، والباقي عند صدور النتيجة النهائية للجنة الفحص.',
  },
  {
    id: 'FINANCIAL_STATEMENTS_AUDIT',
    title: 'مراجعة وتدقيق القوائم المالية السنوية وإصدار تقرير مراقب الحسابات',
    category: 'المراجعة والتدقيق الخارجي',
    professionalFees: 20000,
    governmentFees: 2500,
    days: 10,
    scope: [
      'مراجعة وتدقيق الحسابات الختامية ودفاتر الأستاذ العام ومطابقة موازين المراجعة',
      'إعداد القوائم المالية المستقلة الكاملة وفقاً لمعايير المحاسبة المصرية (EAS)',
      'إعداد الإيضاحات المتممة للقوائم المالية وحساب الإهلاكات والمخصصات القانونية',
      'إصدار واعتماد تقرير مراقب الحسابات المستقل الموجه للجمعية العمومية والبنوك',
    ],
    notes: 'شامل تسليم 4 نسخ أصلية ممهورة بختم وترخيص مزاولة المهنة وكارنيه سجل المحاسبين.',
  },
  {
    id: 'MONTHLY_BOOKKEEPING',
    title: 'عقد مسك دفاتر وحسابات دورية وإشراف ضريبي ربع سنوي',
    category: 'مسك الدفاتر والإشراف الضريبي',
    professionalFees: 7500,
    governmentFees: 0,
    days: 30,
    scope: [
      'تسجيل وترحيل قيود اليومية المحاسبية الشهرية ومطابقة كشوف الحسابات البنكية',
      'إعداد وتقديم الإقرارات الشهرية لضريبة القيمة المضافة (نموذج 10)',
      'إعداد وتقديم إقرارات الخصم والتحصيل تحت حساب الضريبة ربع السنوية (نموذج 41)',
      'إعداد مذكرات تسوية كسب العمل الربع سنوية (نموذج 4 مرتبات)',
    ],
    notes: 'أتعاب تدفع شهرياً بموجب عقد سنوي محدد المدة.',
  },
];

export const WhatsAppBusinessApiView: React.FC<WhatsAppBusinessApiViewProps> = ({
  state,
  initialClientId,
  onNavigateToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'FREE_GATEWAY' | 'LIVE_CHAT' | 'QUOTATIONS' | 'CERTIFIED_REPORTS' | 'API_CONFIG' | 'LOGS'>('LIVE_CHAT');

  // Client Selection
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (state.clients[0]?.id ?? '')
  );

  const selectedClient = useMemo(() => {
    return state.clients.find((c) => c.id === selectedClientId) || state.clients[0];
  }, [state.clients, selectedClientId]);

  // General Notification / Alert State
  const [sendAlert, setSendAlert] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO';
    message: string;
    details?: string;
    messageId?: string;
  } | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 0: FREE GATEWAY (BAILEYS QR CODE MULTI-DEVICE SESSION)
  // -------------------------------------------------------------
  const [sessionStatus, setSessionStatus] = useState<WhatsAppApiSessionStatus | null>(null);
  const [isConnectingSession, setIsConnectingSession] = useState(false);
  const [quickTestPhone, setQuickTestPhone] = useState(selectedClient?.phone || '01003335360');
  const [quickTestMessage, setQuickTestMessage] = useState('مرحباً بكم، رسالة تجريبية موثقة من مكتب المحاسب القانوني محمد جميل مرعي.');
  const [isSendingQuickTest, setIsSendingQuickTest] = useState(false);
  const [quickTestFeedback, setQuickTestFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // -------------------------------------------------------------
  // TAB 1: PRICE QUOTATION FORM STATE
  // -------------------------------------------------------------
  const [quoteRecipientPhone, setQuoteRecipientPhone] = useState(selectedClient?.phone || '01003335360');
  const [quoteReferenceCode, setQuoteReferenceCode] = useState(
    `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [quoteProcedureTitle, setQuoteProcedureTitle] = useState(QUOTATION_PRESETS[0].title);
  const [quoteCategory, setQuoteCategory] = useState(QUOTATION_PRESETS[0].category);
  const [quoteProfessionalFees, setQuoteProfessionalFees] = useState(QUOTATION_PRESETS[0].professionalFees);
  const [quoteGovernmentFees, setQuoteGovernmentFees] = useState(QUOTATION_PRESETS[0].governmentFees);
  const [quoteValidityDays, setQuoteValidityDays] = useState(15);
  const [quoteExecutionDays, setQuoteExecutionDays] = useState(QUOTATION_PRESETS[0].days);
  const [quoteAdvancePercentage, setQuoteAdvancePercentage] = useState(50);
  const [quoteScopeItems, setQuoteScopeItems] = useState<string[]>(QUOTATION_PRESETS[0].scope);
  const [quoteNewScopeInput, setQuoteNewScopeInput] = useState('');
  const [quoteNotes, setQuoteNotes] = useState(QUOTATION_PRESETS[0].notes);

  // -------------------------------------------------------------
  // TAB 2: CERTIFIED FINANCIAL REPORT FORM STATE
  // -------------------------------------------------------------
  const [reportRecipientPhone, setReportRecipientPhone] = useState(selectedClient?.phone || '01003335360');
  const [reportType, setReportType] = useState<WhatsAppApiCertifiedReportPayload['reportType']>('AUDITOR_REPORT');
  const [reportReferenceCode, setReportReferenceCode] = useState(
    `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [reportTitle, setReportTitle] = useState('تقرير مراقب الحسابات المستقل والقوائم المالية المدققة');
  const [reportFiscalPeriod, setReportFiscalPeriod] = useState('السنة المالية المنتهية في 31 ديسمبر 2025');
  const [reportRecipientEntity, setReportRecipientEntity] = useState('السادة / الجمعية العامة للمساهمين والبنك المعتمد');
  const [reportCertifiedAmount, setReportCertifiedAmount] = useState(2500000);
  const [reportAuditorOpinion, setReportAuditorOpinion] = useState(
    'في رأينا أن القوائم المالية المرفقة تعبر بعدالة ووضوح، من كافة النواحي الجوهرية، عن المركز المالي للشركة ونتائج أعمالها وتدفقاتها النقدية وفقاً لمعايير المحاسبة المصرية (EAS) والقوانين السارية.'
  );
  const [reportKeyFigures, setReportKeyFigures] = useState([
    { label: 'إجمالي الإيرادات السنوية', value: '18,500,000 ج.م' },
    { label: 'صافي الربح بعد الضرائب', value: '2,500,000 ج.م' },
    { label: 'إجمالي الأصول المتداولة والثابتة', value: '34,200,000 ج.م' },
    { label: 'حقوق الملكية ورأس المال المدفوع', value: '20,000,000 ج.م' },
  ]);
  const [reportNotes, setReportNotes] = useState(
    'التقرير صادر وموثق برمز QR للتحقق اللحظي ومسجل بسجل المحاسبين والمراجعين بوزارة المالية.'
  );

  // -------------------------------------------------------------
  // TAB 3: API CONFIG & DIAGNOSTICS
  // -------------------------------------------------------------
  const [serverConfig, setServerConfig] = useState<{
    phoneNumberId: string;
    wabaId: string;
    accessToken: string;
    hasToken?: boolean;
    landlineNumber: string;
    officeName: string;
    webhookUrl: string;
    verifyToken: string;
  }>({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    landlineNumber: '0237654321',
    officeName: 'مكتب المحاسب القانوني ومراقب الحسابات - محمد جميل مرعي',
    webhookUrl: '/api/whatsapp/webhook',
    verifyToken: 'MOSTAFA_OFFICE_TAX_BOT_SECURE_TOKEN_2026',
  });

  const [diagnostics, setDiagnostics] = useState<WhatsAppApiDiagnostics | null>(null);
  const [logs, setLogs] = useState<WhatsAppApiLogItem[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | 'QUOTATION' | 'CERTIFIED_REPORT' | 'FAILED'>('ALL');

  // Update client phone in forms when client changes
  useEffect(() => {
    if (selectedClient) {
      if (selectedClient.phone) {
        setQuoteRecipientPhone(selectedClient.phone);
        setReportRecipientPhone(selectedClient.phone);
        setQuickTestPhone(selectedClient.phone);
      }
    }
  }, [selectedClient]);

  // Load server config and logs on mount
  useEffect(() => {
    loadServerData();
  }, []);

  // Poll session status automatically when Free Gateway tab is active
  useEffect(() => {
    let interval: any = null;
    if (activeTab === 'FREE_GATEWAY') {
      interval = setInterval(async () => {
        const sess = await WhatsAppApiService.getSessionStatus();
        if (sess) setSessionStatus(sess);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const loadServerData = async () => {
    try {
      const [cfg, diag, lgs, sess] = await Promise.all([
        WhatsAppApiService.getConfig(),
        WhatsAppApiService.getDiagnostics(),
        WhatsAppApiService.getLogs(),
        WhatsAppApiService.getSessionStatus(),
      ]);
      if (cfg) setServerConfig(cfg);
      if (diag) setDiagnostics(diag);
      if (lgs) setLogs(lgs);
      if (sess) setSessionStatus(sess);
    } catch (err) {
      console.warn('Error loading WhatsApp server telemetry:', err);
    }
  };

  // Start QR session
  const handleStartSession = async () => {
    setIsConnectingSession(true);
    try {
      const sess = await WhatsAppApiService.startSession();
      if (sess) setSessionStatus(sess);
      setSendAlert({
        type: 'INFO',
        message: 'تم بدء جلسة الواتساب وتوليد كود QR. يرجى مسحه الآن من تطبيق واتساب بهاتفك.',
      });
    } catch (err: any) {
      setSendAlert({ type: 'ERROR', message: 'تعذر تشغيل الجلسة', details: err.message });
    } finally {
      setIsConnectingSession(false);
    }
  };

  // Disconnect session
  const handleDisconnectSession = async () => {
    try {
      const sess = await WhatsAppApiService.disconnectSession();
      if (sess) setSessionStatus(sess);
      setSendAlert({
        type: 'SUCCESS',
        message: 'تم تسجيل الخروج وقطع اتصال واتساب بنجاح.',
      });
    } catch (err: any) {
      setSendAlert({ type: 'ERROR', message: 'تعذر تسجيل الخروج', details: err.message });
    }
  };

  // Quick test send
  const handleQuickTestSend = async () => {
    if (!quickTestPhone.trim() || !quickTestMessage.trim()) return;
    setIsSendingQuickTest(true);
    setQuickTestFeedback(null);
    try {
      const res = await WhatsAppApiService.sendMessage(quickTestPhone, quickTestMessage, {
        clientName: selectedClient?.name,
        category: 'GENERAL',
      });
      if (res.success) {
        setQuickTestFeedback({
          success: true,
          text: `تم الإرسال بنجاح إلى الرقم (${quickTestPhone})! كود العملية: ${res.messageId || 'OK'}`,
        });
        loadServerData();
      } else {
        setQuickTestFeedback({
          success: false,
          text: res.error || 'فشل إرسال الرسالة التجريبية.',
        });
      }
    } catch (err: any) {
      setQuickTestFeedback({ success: false, text: err.message });
    } finally {
      setIsSendingQuickTest(false);
    }
  };

  // Toggle Auto Reply Bot
  const handleToggleAutoReply = async () => {
    const nextState = !sessionStatus?.autoReplyEnabled;
    const res = await WhatsAppApiService.updateConfig({ autoReplyEnabled: nextState });
    if (res.success) {
      setSessionStatus((prev) => (prev ? { ...prev, autoReplyEnabled: nextState } : null));
      setSendAlert({
        type: 'SUCCESS',
        message: nextState ? 'تم تفعيل المساعد الآلي (البوت) للرد التلقائي 24/7' : 'تم إيقاف المساعد الآلي مؤقتاً',
      });
    }
  };

  // Helper to copy text
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Apply Quotation Preset
  const handleApplyPreset = (preset: QuotationPreset) => {
    setQuoteProcedureTitle(preset.title);
    setQuoteCategory(preset.category);
    setQuoteProfessionalFees(preset.professionalFees);
    setQuoteGovernmentFees(preset.governmentFees);
    setQuoteExecutionDays(preset.days);
    setQuoteScopeItems([...preset.scope]);
    setQuoteNotes(preset.notes);
  };

  // Add item to quotation scope
  const handleAddScopeItem = () => {
    if (!quoteNewScopeInput.trim()) return;
    setQuoteScopeItems((prev) => [...prev, quoteNewScopeInput.trim()]);
    setQuoteNewScopeInput('');
  };

  const handleRemoveScopeItem = (idx: number) => {
    setQuoteScopeItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // -------------------------------------------------------------
  // ACTION: DIRECT SEND QUOTATION VIA WHATSAPP BUSINESS API
  // -------------------------------------------------------------
  const handleSendQuotationViaApi = async () => {
    if (!quoteRecipientPhone.trim()) {
      setSendAlert({
        type: 'ERROR',
        message: 'يرجى إدخال رقم هاتف العميل المستقبل لعرض السعر.',
      });
      return;
    }

    setIsSending(true);
    setSendAlert(null);

    const payload: WhatsAppApiQuotationPayload = {
      to: quoteRecipientPhone,
      clientName: selectedClient?.name || 'العميل المحترم',
      contactPerson: selectedClient?.contactPerson || 'الإدارة المالية',
      referenceCode: quoteReferenceCode,
      procedureTitle: quoteProcedureTitle,
      procedureCategory: quoteCategory,
      scopeOfWork: quoteScopeItems,
      professionalFees: quoteProfessionalFees,
      governmentFees: quoteGovernmentFees,
      totalEstimatedCost: quoteProfessionalFees + quoteGovernmentFees,
      validityDays: quoteValidityDays,
      estimatedExecutionDays: quoteExecutionDays,
      advancePaymentPercentage: quoteAdvancePercentage,
      notes: quoteNotes,
      verificationCode: `VER-QUO-${quoteReferenceCode.replace(/[^0-9]/g, '')}`,
    };

    try {
      const res = await WhatsAppApiService.sendQuotation(payload);
      if (res.success) {
        setSendAlert({
          type: 'SUCCESS',
          message: `تم بنجاح إرسال عرض السعر المعتمد مباشرة إلى هاتف العميل (${quoteRecipientPhone}) عبر WhatsApp Business API.`,
          details: `رقم العملية بالسيرفر: ${res.messageId} | كود العرض: #${quoteReferenceCode}`,
          messageId: res.messageId,
        });

        // Record in local database client messages for local sync
        db.sendWhatsAppMessage({
          clientId: selectedClient?.id || 'client-gen',
          clientName: selectedClient?.name || 'عميل',
          phone: quoteRecipientPhone,
          direction: 'OUTGOING',
          sender: 'AUDITOR',
          category: 'INVOICE',
          text: res.formattedMessage || `عرض سعر معتمد: ${quoteProcedureTitle}`,
        });

        // Refresh server logs
        loadServerData();

        // Generate new random code for next quote
        setQuoteReferenceCode(`QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        setSendAlert({
          type: 'ERROR',
          message: 'تعذر إرسال عرض السعر عبر الـ API.',
          details: res.error,
        });
      }
    } catch (err: any) {
      setSendAlert({
        type: 'ERROR',
        message: 'خطأ غير متوقع أثناء الاتصال بالخادم.',
        details: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: DIRECT SEND CERTIFIED REPORT VIA WHATSAPP BUSINESS API
  // -------------------------------------------------------------
  const handleSendCertifiedReportViaApi = async () => {
    if (!reportRecipientPhone.trim()) {
      setSendAlert({
        type: 'ERROR',
        message: 'يرجى إدخال رقم هاتف العميل المستقبل للتقرير المالي المعتمد.',
      });
      return;
    }

    setIsSending(true);
    setSendAlert(null);

    const payload: WhatsAppApiCertifiedReportPayload = {
      to: reportRecipientPhone,
      clientName: selectedClient?.name || 'الشركة المصرية المعتمدة',
      contactPerson: selectedClient?.contactPerson || 'السادة الإدارة المالية',
      reportType,
      reportTitle,
      referenceCode: reportReferenceCode,
      fiscalPeriod: reportFiscalPeriod,
      recipientEntity: reportRecipientEntity,
      certifiedAmount: reportCertifiedAmount,
      keyFigures: reportKeyFigures,
      auditorOpinionSummary: reportAuditorOpinion,
      registrationNumber: 'س.م.م 14820',
      efsaRegistration: 'ر.م 542',
      notes: reportNotes,
      verificationCode: `QR-EGY-CERT-${reportReferenceCode}`,
    };

    try {
      const res = await WhatsAppApiService.sendCertifiedReport(payload);
      if (res.success) {
        setSendAlert({
          type: 'SUCCESS',
          message: `تم بنجاح إرسال التقرير المالي المعتمد مباشرة عبر WhatsApp Business API إلى الرقم (${reportRecipientPhone}).`,
          details: `رقم التسجيل: ${res.messageId} | كود الوثيقة: #${reportReferenceCode}`,
          messageId: res.messageId,
        });

        // Record in local client history
        db.sendWhatsAppMessage({
          clientId: selectedClient?.id || 'client-gen',
          clientName: selectedClient?.name || 'عميل',
          phone: reportRecipientPhone,
          direction: 'OUTGOING',
          sender: 'AUDITOR',
          category: 'GENERAL',
          text: res.formattedMessage || `تقرير مالي معتمد: ${reportTitle}`,
        });

        // Refresh server logs
        loadServerData();

        // Generate new random code for next report
        setReportReferenceCode(`CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        setSendAlert({
          type: 'ERROR',
          message: 'تعذر إرسال التقرير المالي عبر الـ API.',
          details: res.error,
        });
      }
    } catch (err: any) {
      setSendAlert({
        type: 'ERROR',
        message: 'خطأ غير متوقع أثناء الاتصال بالخادم.',
        details: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        (log.clientName && log.clientName.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.phoneNumber && log.phoneNumber.includes(logSearch)) ||
        (log.referenceCode && log.referenceCode.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.message && log.message.toLowerCase().includes(logSearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (logCategoryFilter === 'QUOTATION') return log.category === 'QUOTATION';
      if (logCategoryFilter === 'CERTIFIED_REPORT') return log.category === 'CERTIFIED_REPORT';
      if (logCategoryFilter === 'FAILED') return log.status === 'FAILED';

      return true;
    });
  }, [logs, logSearch, logCategoryFilter]);

  // Save Config
  const handleSaveConfig = async () => {
    setIsSending(true);
    const res = await WhatsAppApiService.updateConfig(serverConfig);
    setIsSending(false);
    if (res.success) {
      setSendAlert({
        type: 'SUCCESS',
        message: 'تم حفظ وتحديث إعدادات ربط WhatsApp Business API بنجاح في السيرفر.',
      });
      loadServerData();
    } else {
      setSendAlert({
        type: 'ERROR',
        message: 'فشل حفظ الإعدادات.',
        details: res.error,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-5 text-white border border-emerald-900/60 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-white">بوابة ربط WhatsApp Business API المباشرة</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-xs">
                <Zap className="w-3 h-3" />
                <span>إرسال مباشر بدون تطبيقات خارجية</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/15">
                {serverConfig.hasToken ? 'متصل بـ Meta Cloud API الرسمي' : 'خادم الإرسال والردود السحابي نشط'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              واجهة برمجية متكاملة تسمح بإرسال عروض الأسعار والأتعاب، وتقارير المراجعة والقوائم المالية المعتمدة برمز QR
              مباشرة من النظام إلى هواتف العملاء عبر خوادم WhatsApp Business دون الحاجة لفتح برامج خارجية أو متصفحات وسيطة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadServerData}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
              title="تحديث حالة الاتصال وسجل الإرسال"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحديث الحالة</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {sendAlert && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border flex items-start gap-3 text-xs animate-in fade-in slide-in-from-top-2 ${
              sendAlert.type === 'SUCCESS'
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-md'
                : sendAlert.type === 'ERROR'
                ? 'bg-red-950/90 border-red-500/80 text-red-100 shadow-md'
                : 'bg-blue-950/90 border-blue-500/80 text-blue-100'
            }`}
          >
            {sendAlert.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : sendAlert.type === 'ERROR' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{sendAlert.message}</p>
              {sendAlert.details && <p className="text-[11px] opacity-80 mt-0.5 font-mono">{sendAlert.details}</p>}
            </div>
            <button
              onClick={() => setSendAlert(null)}
              className="text-white/60 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-4 border-t border-emerald-900/60 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('FREE_GATEWAY')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'FREE_GATEWAY'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">1. ربط الواتساب</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">كود QR مجاني</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold shrink-0">
              {sessionStatus?.status === 'CONNECTED' ? 'متصل ✅' : 'QR'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LIVE_CHAT')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'LIVE_CHAT'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15 ring-1 ring-emerald-400/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">2. شات وردود العملاء</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">محادثات وردود حية</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono font-bold shrink-0 animate-pulse">
              حي 💬
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUOTATIONS')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'QUOTATIONS'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">3. عروض الأسعار</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">تسعير الإجراءات</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold shrink-0">
              عرض
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CERTIFIED_REPORTS')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'CERTIFIED_REPORTS'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">4. التقارير المعتمدة</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">قوائم وشهادات QR</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold shrink-0">
              QR
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">5. سجل الرسائل</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">حالة التسليم</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold shrink-0">
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('API_CONFIG')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'API_CONFIG'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">6. إعدادات Meta</span>
                <span className="text-[10px] opacity-75 font-normal truncate block">Cloud API</span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold shrink-0">
              Meta
            </span>
          </button>
        </div>
      </div>

      {/* Central Target Client Picker */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center border border-blue-200/60 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
              العميل / الشركة المستهدفة بالإرسال:
            </span>
            <span className="text-[11px] text-slate-500">
              تحديد ملف الشركة لتعبئة أرقام الواتساب والبيانات المالية والضريبية آلياً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[280px]">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : '(بدون رقم)'}
              </option>
            ))}
          </select>
          {onNavigateToArchive && (
            <button
              type="button"
              onClick={() => onNavigateToArchive(selectedClientId)}
              className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 cursor-pointer"
              title="فتح ملف العميل بالأرشيف"
            >
              الملف
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 0: FREE GATEWAY (BAILEYS QR CODE MULTI-DEVICE)       */}
      {/* ========================================================= */}
      {activeTab === 'FREE_GATEWAY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: QR Code & Pairing Console (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>ربط الواتساب المجاني بالهاتف (كود QR - واتساب ويب متعدد الأجهزة)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  إرسال مباشر غير محدود للتقارير والفواتير وعروض الأسعار دون اشتراكات سحابية مدفوعة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadServerData}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="تحديث حالة الجلسة"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث</span>
                </button>
              </div>
            </div>

            {/* STATUS 1: CONNECTED */}
            {sessionStatus?.status === 'CONNECTED' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-900 dark:text-emerald-100">
                            واتساب المكتب متصل وجاهز للإرسال الفوري ✅
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            نشط 24/7
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5 font-bold font-mono" dir="ltr">
                          {sessionStatus.connectedPhone || '+201000000000'}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          اسم الحساب المرتبط: {sessionStatus.connectedName || 'مكتب المحاسب القانوني - مرعي'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnectSession}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>قطع الاتصال</span>
                    </button>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">رسائل مرسلة بنجاح</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {sessionStatus.stats.sentCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">رسائل عملاء مستلمة</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                      {sessionStatus.stats.receivedCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">أخطاء إرسال</span>
                    <span className="text-lg font-black text-slate-600 dark:text-slate-400 font-mono">
                      {sessionStatus.stats.failedCount}
                    </span>
                  </div>
                </div>

                {/* Auto Reply Bot Toggle Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        المساعد الآلي الذكي (بوت الرد على استفسارات العملاء 24/7):
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {sessionStatus.autoReplyEnabled
                          ? 'مفعّل: يقوم بالرد الفوري على أرقام الخدمات (فواتير، ضرائب، مواعيد، سندات الخزينة)'
                          : 'معطل حالياً'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAutoReply}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      sessionStatus.autoReplyEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sessionStatus.autoReplyEnabled ? 'مفعّل ✅' : 'تفعيل البوت'}
                  </button>
                </div>
              </div>
            ) : sessionStatus?.status === 'SCAN_QR_CODE' && sessionStatus.qrCodeDataUrl ? (
              /* STATUS 2: SCAN QR CODE */
              <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>كود QR نشط وجاهز للمسح الآن من تطبيق واتساب بهاتفك 📱</span>
                </div>

                {/* QR Display */}
                <div className="p-4 bg-white rounded-3xl shadow-md border border-slate-200 inline-block mx-auto max-w-[280px]">
                  <img
                    src={sessionStatus.qrCodeDataUrl}
                    alt="كود QR لربط الواتساب"
                    className="w-56 h-56 mx-auto rounded-xl"
                  />
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    يتم التحديث اللحظي تلقائياً كل بضع ثوانٍ
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-right border border-slate-200 dark:border-slate-700 text-xs space-y-2 max-w-lg mx-auto">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block border-b pb-1">
                    خطوات الربط السريع من الهاتف (مرة واحدة فقط):
                  </span>
                  <ol className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px] list-decimal list-inside leading-relaxed">
                    <li>افتح تطبيق <strong>WhatsApp</strong> على هاتفك الشخصي أو هاتف المكتب.</li>
                    <li>اضغط على خيارات <strong>(الثلاث نقاط ⠇)</strong> بأعلى الشاشة أو <strong>الإعدادات</strong>.</li>
                    <li>اختر <strong>الأجهزة المرتبطة (Linked Devices)</strong> ثم اضغط على <strong>ربط جهاز (Link a Device)</strong>.</li>
                    <li>وجّه كاميرا الهاتف نحو كود QR الظاهر بالأعلى ليتم الاتصال فوراً.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={isConnectingSession}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConnectingSession ? 'animate-spin' : ''}`} />
                    <span>توليد كود QR جديد</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectSession}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : sessionStatus?.status === 'CONNECTING' || isConnectingSession ? (
              /* STATUS 3: CONNECTING SPINNER */
              <div className="p-8 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  جاري الاتصال بسيرفر الواتساب وتجهيز كود QR المشفر...
                </span>
                <p className="text-[11px] text-slate-500">
                  يرجى الانتظار ثوانٍ معدودة ريثما يتم توليد الكود للربط.
                </p>
              </div>
            ) : (
              /* STATUS 4: DISCONNECTED / WELCOME */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      ربط الواتساب المجاني 100% عبر كود QR
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      اربط رقم هاتفك الشخصي أو هاتف المكتب بالبرنامج بمسحة واحدة، لإرسال التقارير والفواتير وعروض الأسعار آلياً ومجاناً بدون أي تكاليف أو اشتراكات!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={isConnectingSession}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-md hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>تشغيل الربط وتوليد كود QR الآن</span>
                  </button>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>إرسال آلي خلف الكواليس</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      يتم إرسال عروض الأسعار والتقارير المعتمدة مباشرة إلى هاتف العميل دون الحاجة لفتح المتصفح.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span>مجاني 100% مدى الحياة</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      يعتمد على بروتوكول واتساب ويب مفتوح المصدر (Baileys)، دون الحاجة لبطاقات بنكية أو اشتراكات شهرية.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-blue-500" />
                      <span>مساعد آلي ذكي للرد 24/7</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      استجابة فورية لاستفسارات العملاء حول الفواتير والضرائب وعنوان المكتب وسندات الخزينة تلقائياً.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                      <span>تشفير تام وآمن</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      المراسلات مشفرة طرفاً لطرف (End-to-End Encryption) وفقاً لبروتوكول WhatsApp الرسمي.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Instant Test Sender & Interactive Bot Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Instant Test Message Console */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>إرسال رسالة تجريبية فورية للعميل:</span>
                </h4>
                <span className="text-[10px] text-slate-500">اختبار الإرسال المباشر</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  رقم هاتف المستلم:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="text"
                    value={quickTestPhone}
                    onChange={(e) => setQuickTestPhone(e.target.value)}
                    placeholder="01003335360"
                    className="w-full bg-transparent text-xs font-bold outline-none font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  نص الرسالة:
                </label>
                <textarea
                  value={quickTestMessage}
                  onChange={(e) => setQuickTestMessage(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none leading-relaxed"
                />
              </div>

              {/* Quick Template Fill Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500">نماذج جاهزة:</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuickTestMessage(
                      `🏛️ مكتب المحاسب القانوني محمد جميل مرعي\n📌 إشعار مالي: نود تذكيركم بموعد تقديم إقرار القيمة المضافة قبل نهاية الأسبوع الحالي.`
                    )
                  }
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  إقرار ضريبي
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuickTestMessage(
                      `🏛️ مكتب المحاسب القانوني\n🧾 مطالبة سداد أتعاب: برجاء التكرم بمراجعة فاتورة الخدمات المحاسبية المعتمدة رقم INV-2026-042.`
                    )
                  }
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  مطالبة أتعاب
                </button>
              </div>

              <button
                type="button"
                onClick={handleQuickTestSend}
                disabled={isSendingQuickTest}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingQuickTest ? 'animate-spin' : ''}`} />
                <span>{isSendingQuickTest ? 'جاري الإرسال...' : 'إرسال الرسالة التجريبية الآن'}</span>
              </button>

              {quickTestFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    quickTestFeedback.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-200'
                  }`}
                >
                  {quickTestFeedback.text}
                </div>
              )}
            </div>

            {/* Auto Reply Bot Quick Menu Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  <span>قائمة الردود التلقائية التي يرسلها البوت للعملاء:</span>
                </h4>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>1️⃣ فواتير الأتعاب والمستحقات</span>
                  <span className="text-[10px] text-emerald-600 font-bold">رد فوري</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>2️⃣ موقف الضرائب والإقرارات (ETA)</span>
                  <span className="text-[10px] text-emerald-600 font-bold">رد فوري</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>3️⃣ سندات القبض وسدادات الخزينة</span>
                  <span className="text-[10px] text-emerald-600 font-bold">رد فوري</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>4️⃣ موقف تأسيس وتعديل السجل التجاري</span>
                  <span className="text-[10px] text-emerald-600 font-bold">رد فوري</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>5️⃣ طلب شهادة دخل أو ملاءة مالية</span>
                  <span className="text-[10px] text-emerald-600 font-bold">تسجيل طلب</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>6️⃣ مواعيد العمل ومقر المكتب والتليفون</span>
                  <span className="text-[10px] text-emerald-600 font-bold">بيانات المكتب</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>7️⃣ التحدث مباشرة مع المحاسب القانوني</span>
                  <span className="text-[10px] text-blue-600 font-bold">إشعار فوري</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: LIVE WHATSAPP CHAT & CLIENT REPLIES               */}
      {/* ========================================================= */}
      {activeTab === 'LIVE_CHAT' && (
        <WhatsAppLiveChatPanel
          state={state}
          initialPhone={selectedClient?.phone}
          onNavigateToArchive={onNavigateToArchive}
        />
      )}

      {/* ========================================================= */}
      {/* VIEW 1: PRICE QUOTATIONS DISPATCHER                      */}
      {/* ========================================================= */}
      {activeTab === 'QUOTATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Presets Bar */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5 flex items-center justify-between">
                <span>نماذج عروض أتعاب محاسبية وقانونية جاهزة للتعبئة الفورية:</span>
                <span className="text-[10px] text-emerald-600 font-normal">اختر لتطبيق الحزمة</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scrollbar-none">
                {QUOTATION_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shrink-0 cursor-pointer transition-all text-right flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{p.title.slice(0, 32)}...</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  رقم هاتف الواتساب للمستلم (مع كود الدولة):
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="text"
                    value={quoteRecipientPhone}
                    onChange={(e) => setQuoteRecipientPhone(e.target.value)}
                    placeholder="01003335360 أو 201003335360"
                    className="w-full bg-transparent text-xs font-bold outline-none font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  كود العرض المرجعي:
                </label>
                <div className="flex items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={quoteReferenceCode}
                    onChange={(e) => setQuoteReferenceCode(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Procedure Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  مسمى الإجراء / الخدمة المهنية المطلوبة:
                </label>
                <input
                  type="text"
                  value={quoteProcedureTitle}
                  onChange={(e) => setQuoteProcedureTitle(e.target.value)}
                  className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  تصنيف المعاملة في المكتب:
                </label>
                <input
                  type="text"
                  value={quoteCategory}
                  onChange={(e) => setQuoteCategory(e.target.value)}
                  className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Financials & Duration */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>البيان المالي والتكلفة التقديرية</span>
                </span>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  الإجمالي: {formatEgyptianCurrency(quoteProfessionalFees + quoteGovernmentFees)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    أتعاب المكتب المهنية:
                  </label>
                  <input
                    type="number"
                    value={quoteProfessionalFees}
                    onChange={(e) => setQuoteProfessionalFees(Number(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    الرسوم الحكومية التقديرية:
                  </label>
                  <input
                    type="number"
                    value={quoteGovernmentFees}
                    onChange={(e) => setQuoteGovernmentFees(Number(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    الدفعة المقدمة (%):
                  </label>
                  <select
                    value={quoteAdvancePercentage}
                    onChange={(e) => setQuoteAdvancePercentage(Number(e.target.value))}
                    className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value={25}>25% مقدم</option>
                    <option value={33}>33% مقدم</option>
                    <option value={50}>50% مقدم (قياسي)</option>
                    <option value={100}>100% سداد كامل</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    مدة التنفيذ المتوقعة:
                  </label>
                  <input
                    type="number"
                    value={quoteExecutionDays}
                    onChange={(e) => setQuoteExecutionDays(Number(e.target.value) || 1)}
                    className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Scope of Work Items */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                بنود ونطاق الأعمال المشمولة في العرض ({quoteScopeItems.length} بنود):
              </label>
              <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto pr-1">
                {quoteScopeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveScopeItem(idx)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quoteNewScopeInput}
                  onChange={(e) => setQuoteNewScopeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddScopeItem()}
                  placeholder="إضافة بند إضافي لنطاق العمل..."
                  className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddScopeItem}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer shrink-0"
                >
                  إضافة
                </button>
              </div>
            </div>

            {/* Notes & Conditions */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                شروط العرض والملاحظات الإضافية:
              </label>
              <textarea
                rows={2}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Right Live Phone Preview & Direct Send Button (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Phone Screen Mockup */}
            <div className="bg-slate-900 rounded-3xl p-4 text-white border-4 border-slate-800 shadow-xl space-y-3 flex-1 flex flex-col">
              {/* WhatsApp App Header Mockup */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                    MG
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">مكتب المحاسب القانوني</h4>
                    <span className="text-[9px] text-emerald-400 block font-mono">حساب أعمال رسمي موثق</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">WhatsApp API</span>
              </div>

              {/* Message Chat Bubble */}
              <div className="flex-1 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/50 text-[11px] space-y-2 overflow-y-auto max-h-[380px] leading-relaxed text-slate-100 font-sans">
                <div className="font-bold text-emerald-300 text-xs border-b border-emerald-800/40 pb-1">
                  🏛️ {serverConfig.officeName}
                  <br />
                  📜 عرض أتعاب وخدمات مهنية معتمد (#{quoteReferenceCode})
                </div>

                <p>
                  السادة / <span className="font-bold text-white">{selectedClient?.name}</span> المحترمين
                  <br />
                  عناية: {selectedClient?.contactPerson || 'الإدارة المالية'}
                </p>

                <p className="font-semibold text-emerald-200">
                  ✨ {quoteProcedureTitle}
                  <br />
                  🏷️ تصنيف المعاملة: {quoteCategory}
                </p>

                <div>
                  <span className="font-bold text-white block">📋 نطاق الأعمال:</span>
                  {quoteScopeItems.map((s, i) => (
                    <div key={i} className="text-slate-300 text-[10px] pl-1">
                      {i + 1}. {s}
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-700/40 space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>أتعاب المكتب المهنية:</span>
                    <span className="font-bold text-emerald-300">
                      {quoteProfessionalFees.toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>الرسوم الحكومية:</span>
                    <span>{quoteGovernmentFees.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700">
                    <span>الإجمالي التقديري:</span>
                    <span className="text-emerald-400">
                      {(quoteProfessionalFees + quoteGovernmentFees).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300">
                  ⏱️ المدة المتوقعة: {quoteExecutionDays} أيام عمل
                  <br />
                  ⏳ الصلاحية: {quoteValidityDays} يوماً
                  <br />
                  🔒 كود التحقق الرقمي: VER-QUO-{quoteReferenceCode.replace(/[^0-9]/g, '')}
                </p>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-emerald-900/60 flex items-center justify-between">
                  <span>أ/ محمد جميل مرعي</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCheck className="w-3 h-3" />
                    <span>موقع ومعتمد</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendQuotationViaApi}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>جاري الإرسال المباشر عبر السيرفر...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      <span>إرسال عرض السعر مباشرة عبر الـ API (Direct Send)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `عرض سعر معتمد لشركة ${selectedClient?.name}: ${quoteProcedureTitle} بقيمة إجمالية ${(
                          quoteProfessionalFees + quoteGovernmentFees
                        ).toLocaleString('en-US')} ج.م - كود المرجع: #${quoteReferenceCode}`,
                        'QUOTE_TEXT'
                      )
                    }
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'QUOTE_TEXT' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'QUOTE_TEXT' ? 'تم نسخ النص' : 'نسخ نص العرض'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: CERTIFIED FINANCIAL REPORTS DISPATCHER             */}
      {/* ========================================================= */}
      {activeTab === 'CERTIFIED_REPORTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Report Type Preset Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                اختر نوع التقرير أو الوثيقة المالية المعتمدة المراد إرسالها:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setReportType('AUDITOR_REPORT');
                    setReportTitle('تقرير مراقب الحسابات المستقل والقوائم المالية المدققة');
                    setReportRecipientEntity('السادة / الجمعية العامة للمساهمين');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                    reportType === 'AUDITOR_REPORT'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 font-bold text-blue-950 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>1. تقرير مراقب الحسابات والقوائم السنوية</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reportType === 'AUDITOR_REPORT' ? 'text-blue-600' : 'text-slate-300'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportType('INCOME_CERTIFICATE');
                    setReportTitle('شهادة إثبات دخل وملاءة مالية معتمدة للبنك');
                    setReportRecipientEntity('السادة / بنك مصر - قطاع تمويل الشركات والائتمان');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                    reportType === 'INCOME_CERTIFICATE'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 font-bold text-blue-950 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>2. شهادة إثبات دخل معتمدة (CBE)</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reportType === 'INCOME_CERTIFICATE' ? 'text-blue-600' : 'text-slate-300'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportType('TAX_STATUS_REPORT');
                    setReportTitle('تقرير الفحص والموقف الضريبي والمحاسبي المعتمد');
                    setReportRecipientEntity('مصلحة الضرائب المصرية ولجان الطعن');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                    reportType === 'TAX_STATUS_REPORT'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 font-bold text-blue-950 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>3. تقرير الموقف الضريبي النهائي</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reportType === 'TAX_STATUS_REPORT' ? 'text-blue-600' : 'text-slate-300'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportType('BALANCE_SHEET_INCOME');
                    setReportTitle('ميزانية عمومية وقائمة دخل تفصيلية مدققة ومرحلة');
                    setReportRecipientEntity('الشركاء والإدارة العامة للشركة');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                    reportType === 'BALANCE_SHEET_INCOME'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 font-bold text-blue-950 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>4. ميزانية وقائمة دخل مرحلة</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reportType === 'BALANCE_SHEET_INCOME' ? 'text-blue-600' : 'text-slate-300'}`} />
                </button>
              </div>
            </div>

            {/* Recipient & Codes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  رقم هاتف الواتساب للمستلم:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    value={reportRecipientPhone}
                    onChange={(e) => setReportRecipientPhone(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold outline-none font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  كود التوثيق المعتمد:
                </label>
                <div className="flex items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={reportReferenceCode}
                    onChange={(e) => setReportReferenceCode(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Report Title & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  عنوان التقرير / الوثيقة:
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  الفترة المالية المعنية بالتقرير:
                </label>
                <input
                  type="text"
                  value={reportFiscalPeriod}
                  onChange={(e) => setReportFiscalPeriod(e.target.value)}
                  className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Entity Addressed */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                الجهة الموجه إليها التقرير أو الشهادة:
              </label>
              <input
                type="text"
                value={reportRecipientEntity}
                onChange={(e) => setReportRecipientEntity(e.target.value)}
                className="w-full p-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>

            {/* Key Figures */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2.5">
              <span className="text-xs font-black text-blue-950 dark:text-blue-200 block">
                المؤشرات والبيانات المالية الرئيسية المعتمدة في التقرير:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {reportKeyFigures.map((k, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-blue-800"
                  >
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{k.label}</span>
                    <input
                      type="text"
                      value={k.value}
                      onChange={(e) => {
                        const next = [...reportKeyFigures];
                        next[idx].value = e.target.value;
                        setReportKeyFigures(next);
                      }}
                      className="w-full font-bold text-blue-900 dark:text-blue-200 bg-transparent outline-none mt-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Opinion Summary */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                ملخص رأي مراقب الحسابات المستقل (Auditor Opinion):
              </label>
              <textarea
                rows={2}
                value={reportAuditorOpinion}
                onChange={(e) => setReportAuditorOpinion(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right Live Phone Preview & Direct Send Button (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="bg-slate-900 rounded-3xl p-4 text-white border-4 border-slate-800 shadow-xl space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                    CPA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">إشعار اعتماد رسمي</h4>
                    <span className="text-[9px] text-blue-400 block font-mono">موثق برمز QR الكودي</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Meta Business</span>
              </div>

              {/* Chat bubble */}
              <div className="flex-1 bg-blue-950/40 p-3 rounded-2xl border border-blue-800/50 text-[11px] space-y-2 overflow-y-auto max-h-[380px] leading-relaxed text-slate-100 font-sans">
                <div className="font-bold text-blue-300 text-xs border-b border-blue-800/40 pb-1">
                  🏛️ {serverConfig.officeName}
                  <br />
                  📊 إشعار اعتماد تقرير مالي معتمد (#{reportReferenceCode})
                </div>

                <p>
                  السادة / <span className="font-bold text-white">{selectedClient?.name}</span>
                  <br />
                  الجهة الموجه إليها: <span className="text-blue-200">{reportRecipientEntity}</span>
                </p>

                <p className="font-semibold text-white">
                  📑 {reportTitle}
                  <br />
                  📅 الفترة المالية: {reportFiscalPeriod}
                </p>

                <div className="p-2 rounded-xl bg-slate-900/90 border border-blue-800/60 space-y-1">
                  <span className="text-[10px] font-bold text-blue-300 block">المؤشرات المالية المعتمدة:</span>
                  {reportKeyFigures.map((k, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-slate-300">
                      <span>{k.label}:</span>
                      <span className="font-bold text-white">{k.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-300 italic">
                  ⚖️ "{reportAuditorOpinion}"
                </div>

                <div className="text-[10px] text-slate-300 space-y-0.5">
                  <p>🛡️ قيد سجل المحاسبين والمراجعين (س.م.م): 14820</p>
                  <p>🛡️ قيد الهيئة العامة للرقابة المالية (ر.م): 542</p>
                  <p>🔒 كود التحقق الرقمي: QR-EGY-CERT-{reportReferenceCode}</p>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-blue-900/60 flex items-center justify-between">
                  <span>أ/ محمد جميل مرعي</span>
                  <span className="flex items-center gap-1 text-blue-400 font-bold">
                    <CheckCheck className="w-3 h-3" />
                    <span>معتمد ومرحل</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendCertifiedReportViaApi}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الإرسال المباشر عبر السيرفر...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>إرسال التقرير المعتمد مباشرة عبر الـ API (Direct Send)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `تقرير مالي معتمد: ${reportTitle} لشركة ${selectedClient?.name} عن ${reportFiscalPeriod} - كود التوثيق المعتمد #${reportReferenceCode}`,
                      'REPORT_TEXT'
                    )
                  }
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'REPORT_TEXT' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'REPORT_TEXT' ? 'تم نسخ نص التقرير' : 'نسخ نص الإشعار المعتمد'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: API CONFIGURATION & WEBHOOK CONSOLE               */}
      {/* ========================================================= */}
      {activeTab === 'API_CONFIG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>إعدادات الاتصال المباشر بخوادم Meta WhatsApp Business Cloud API</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  بيانات الاعتماد السحابية لإرسال الرسائل وعروض الأسعار مباشرة باسم المكتب
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ التعديلات بالسيرفر</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number ID (معرف رقم الهاتف):
                </label>
                <input
                  type="text"
                  value={serverConfig.phoneNumberId}
                  onChange={(e) => setServerConfig((s) => ({ ...s, phoneNumberId: e.target.value }))}
                  placeholder="10982347589234"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  WABA ID (معرف حساب الأعمال في Meta):
                </label>
                <input
                  type="text"
                  value={serverConfig.wabaId}
                  onChange={(e) => setServerConfig((s) => ({ ...s, wabaId: e.target.value }))}
                  placeholder="29834710928374"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Permanent System User Access Token:
                </label>
                <input
                  type="password"
                  value={serverConfig.accessToken}
                  onChange={(e) => setServerConfig((s) => ({ ...s, accessToken: e.target.value }))}
                  placeholder={serverConfig.hasToken ? '••••••••••••••••••••••••' : 'EAABw...'}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يتم حفظ التوكن في بيئة السيرفر الآمنة ولا يظهر في واجهة العميل لحماية الخصوصية.
                </span>
              </div>
            </div>

            {/* Webhook Configuration Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>رابط الـ Webhook الخاص بالسيرفر لاستقبال ردود العملاء:</span>
              </h4>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Callback URL (Webhook Endpoint):</label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs">
                  <span className="text-slate-700 dark:text-slate-300 flex-1 truncate text-left" dir="ltr">
                    {window.location.origin}/api/whatsapp/webhook
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/whatsapp/webhook`, 'WEBHOOK_URL')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold cursor-pointer shrink-0"
                  >
                    {copiedKey === 'WEBHOOK_URL' ? 'تم النسخ' : 'نسخ الرابط'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Verify Token:</label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs">
                  <span className="text-slate-700 dark:text-slate-300 flex-1 truncate text-left" dir="ltr">
                    {serverConfig.verifyToken}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(serverConfig.verifyToken, 'VERIFY_TOKEN')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold cursor-pointer shrink-0"
                  >
                    {copiedKey === 'VERIFY_TOKEN' ? 'تم النسخ' : 'نسخ الرمز'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Diagnostics Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>فحص وتشخيص حالة الخادم السحابي</span>
            </h3>

            {diagnostics ? (
              <div className="space-y-2.5 text-xs">
                {diagnostics.checks.map((chk, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{chk.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          chk.status === 'ACTIVE' || chk.status === 'CONNECTED'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{chk.detail}</p>
                  </div>
                ))}

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold block mb-1">✨ الحصة الشهرية المجانية (Meta Free Tier):</span>
                  <p className="leading-relaxed">
                    مكتبك مؤهل لـ 1,000 محادثة خدمة عملاء مجانية شهرياً عبر خوادم Meta الرسمية دون أي رسوم اشتراك.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">جاري تحميل تقرير الفحص...</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: LIVE TRANSMISSION LOGS                            */}
      {/* ========================================================= */}
      {activeTab === 'LOGS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>سجل إرسال الرسائل وعروض الأسعار عبر الـ API ({filteredLogs.length} عملية)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تتبع لحظي لجميع عروض الأسعار والتقارير المالية الصادرة من المنظومة وحالة استلامها
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm('هل أنت متأكد من مسح سجل المراسلات الحالي؟')) {
                    await WhatsAppApiService.clearLogs();
                    loadServerData();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>مسح السجل</span>
              </button>

              <button
                type="button"
                onClick={loadServerData}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="بحث برقم الهاتف، اسم الشركة، كود العرض..."
                className="w-full bg-transparent outline-none text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setLogCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  logCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                الكل ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('QUOTATION')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  logCategoryFilter === 'QUOTATION'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                عروض أسعار
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('CERTIFIED_REPORT')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  logCategoryFilter === 'CERTIFIED_REPORT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                تقارير معتمدة
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('FAILED')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  logCategoryFilter === 'FAILED'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                فشل الإرسال
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">الوقت</th>
                  <th className="p-3">النوع والتصنيف</th>
                  <th className="p-3">العميل / المستلم</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">الكود المرجعي</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">ملخص المحتوى</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد سجلات مطابقة للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.category === 'QUOTATION'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : item.category === 'CERTIFIED_REPORT'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.category === 'QUOTATION'
                            ? 'عرض سعر'
                            : item.category === 'CERTIFIED_REPORT'
                            ? 'تقرير معتمد'
                            : 'رسالة عامة'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{item.clientName || 'عميل المكتب'}</td>
                      <td className="p-3 font-mono text-[11px] dir-ltr text-left">{item.phoneNumber}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{item.referenceCode || '-'}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.amount ? `${item.amount.toLocaleString('en-US')} ج.م` : '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'DELIVERED' || item.status === 'SENT'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : item.status === 'FAILED'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{item.status === 'DELIVERED' ? 'تم التسليم' : item.status === 'SENT' ? 'تم الإرسال' : 'فشل'}</span>
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-[11px] text-slate-500" title={item.message}>
                        {item.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
