import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  X,
  MessageSquare,
  Building,
  Phone,
  DollarSign,
  FileText,
  Receipt,
  FileCheck2,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Percent,
  Paperclip,
  Upload,
  Download,
  FileSpreadsheet,
  Share2,
  Trash2,
  BookOpen,
  Printer,
  ChevronDown,
  QrCode,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { ClientArchiveRecord, ClientDocument } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { WhatsAppApiService } from '../../services/whatsappApiService';
import { WhatsAppQrLinkingModal } from '../common/WhatsAppQrLinkingModal';

export type DocShareType =
  | 'ARCHIVED_DOCUMENT'    // مستند من أرشيف العميل
  | 'ACCOUNT_STATEMENT'    // كشف حساب تفصيلي للعميل / مورد
  | 'ANY_FILE'             // تحديد ورفع أي ملف مخصص من الجهاز
  | 'VERIFICATION_CODE'    // إرسال كود تحقق واعتماد رسمي
  | 'INVOICE_CLAIM'        // مطالبة مالية / فاتورة أتعاب
  | 'TREASURY_RECEIPT'     // إيصال سند قبض خزينة
  | 'TAX_DECLARATION'      // إقرار ضريبي معتمد
  | 'FINANCIAL_STATEMENT'  // مسودة/قوائم مالية معتمدة
  | 'QUOTATION'            // عرض سعر وأتعاب مهنية معتمد
  | 'CUSTOM_STATEMENT';    // إشعار مالي مخصص

export interface WhatsAppDocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientArchiveRecord | null;
  state: DatabaseState;
  initialDoc?: ClientDocument | null;
  initialShareType?: DocShareType;
  initialAccountStatement?: {
    accountId?: string;
    accountName?: string;
    startDate?: string;
    endDate?: string;
    openingBalance?: number;
    totalDebit?: number;
    totalCredit?: number;
    closingBalance?: number;
  };
  onDirectSend?: (text: string, category?: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const WhatsAppDocumentShareModal: React.FC<WhatsAppDocumentShareModalProps> = ({
  isOpen,
  onClose,
  client,
  state,
  initialDoc,
  initialShareType,
  initialAccountStatement,
  onDirectSend,
}) => {
  // Client selection support (allows switching or picking a client)
  const [selectedClientId, setSelectedClientId] = useState<string>(client?.id || state.clients[0]?.id || '');
  const activeClient = useMemo(() => {
    return state.clients.find((c) => c.id === selectedClientId) || client || state.clients[0];
  }, [selectedClientId, state.clients, client]);

  const [shareType, setShareType] = useState<DocShareType>(
    initialShareType || (initialDoc ? 'ARCHIVED_DOCUMENT' : initialAccountStatement ? 'ACCOUNT_STATEMENT' : 'ARCHIVED_DOCUMENT')
  );

  // Form Fields
  const [phoneNumber, setPhoneNumber] = useState(activeClient?.phone || '');
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDoc?.id || '');
  const [documentTitle, setDocumentTitle] = useState(initialDoc?.title || '');
  const [documentRefCode, setDocumentRefCode] = useState(
    initialDoc
      ? `DOC-${initialDoc.id.slice(-4)}`
      : `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`
  );
  const [amount, setAmount] = useState<number>(5000);
  const [includeAmountInWords, setIncludeAmountInWords] = useState(true);
  const [periodOrYear, setPeriodOrYear] = useState<string>(`السنة المالية ${new Date().getFullYear()}`);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customNotes, setCustomNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSendingApi, setIsSendingApi] = useState(false);
  const [apiResult, setApiResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'DISCONNECTED' | 'SCAN_QR' | 'CONNECTED'>('DISCONNECTED');

  useEffect(() => {
    // Check initial gateway status
    WhatsAppApiService.getSessionStatus().then((st) => {
      setGatewayStatus(st.status);
    }).catch(() => {
      setGatewayStatus('DISCONNECTED');
    });
  }, []);

  // Custom File Upload State
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileDataUrl, setCustomFileDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Statement Configuration State
  const [statementAccountId, setStatementAccountId] = useState<string>(initialAccountStatement?.accountId || 'ALL');
  const [statementStartDate, setStatementStartDate] = useState<string>(
    initialAccountStatement?.startDate || `${new Date().getFullYear()}-01-01`
  );
  const [statementEndDate, setStatementEndDate] = useState<string>(
    initialAccountStatement?.endDate || new Date().toISOString().slice(0, 10)
  );

  // Sync client or initial document changes
  useEffect(() => {
    if (client) {
      setSelectedClientId(client.id);
      setPhoneNumber(client.phone || '');
    }
    if (initialDoc) {
      setShareType('ARCHIVED_DOCUMENT');
      setSelectedDocId(initialDoc.id);
      setDocumentTitle(initialDoc.title);
      setDocumentRefCode(`DOC-${initialDoc.id.slice(-4)}`);
    }
    if (initialShareType) {
      setShareType(initialShareType);
    }
  }, [client, initialDoc, initialShareType]);

  useEffect(() => {
    if (activeClient) {
      setPhoneNumber(activeClient.phone || '');
    }
  }, [activeClient]);

  // Available client documents
  const clientDocs = useMemo(() => {
    if (!activeClient) return [];
    return activeClient.documents || [];
  }, [activeClient]);

  // Automatically select first archived doc if none selected
  useEffect(() => {
    if (shareType === 'ARCHIVED_DOCUMENT' && clientDocs.length > 0 && !selectedDocId) {
      setSelectedDocId(clientDocs[0].id);
      setDocumentTitle(clientDocs[0].title);
      setDocumentRefCode(`DOC-${clientDocs[0].id.slice(-4)}`);
    }
  }, [shareType, clientDocs, selectedDocId]);

  // Handle local custom file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    if (!documentTitle || documentTitle === 'ملف مرفق') {
      setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    setDocumentRefCode(`FILE-${Date.now().toString().slice(-5)}`);

    // Read as DataURL for direct preview / download
    const reader = new FileReader();
    reader.onload = () => {
      setCustomFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Calculate live Account Statement data for current client
  const statementData = useMemo(() => {
    if (!activeClient) {
      return {
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
        transactionsCount: 0,
        recentEntries: [],
      };
    }

    // Filter journal entries for this client and date range
    const clientEntries = (state.journalEntries || []).filter((entry) => {
      const matchClient = entry.clientId === activeClient.id || entry.lines?.some((l) => l.clientId === activeClient.id);
      if (!matchClient) return false;
      if (entry.status && entry.status !== 'POSTED') return false;
      return true;
    });

    let openingBalance = initialAccountStatement?.openingBalance || 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const periodEntries: {
      date: string;
      serial: string;
      description: string;
      debit: number;
      credit: number;
    }[] = [];

    clientEntries.forEach((entry) => {
      const entryDate = entry.date;
      const isBeforeStart = statementStartDate && entryDate < statementStartDate;
      const isInRange =
        (!statementStartDate || entryDate >= statementStartDate) &&
        (!statementEndDate || entryDate <= statementEndDate);

      entry.lines.forEach((line) => {
        // If specific account selected, check accountId
        if (statementAccountId !== 'ALL' && line.accountId !== statementAccountId) {
          return;
        }

        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;

        if (isBeforeStart) {
          openingBalance += debit - credit;
        } else if (isInRange) {
          totalDebit += debit;
          totalCredit += credit;
          periodEntries.push({
            date: entry.date,
            serial: entry.serialNumber,
            description: line.description || entry.description,
            debit,
            credit,
          });
        }
      });
    });

    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      transactionsCount: periodEntries.length,
      recentEntries: periodEntries.slice(-5).reverse(),
    };
  }, [activeClient, state.journalEntries, statementStartDate, statementEndDate, statementAccountId, initialAccountStatement]);

  // Update amount automatically when Statement is selected
  useEffect(() => {
    if (shareType === 'ACCOUNT_STATEMENT') {
      setAmount(Math.abs(statementData.closingBalance));
      setDocumentTitle(`كشف حساب معتمد - ${activeClient?.name || ''}`);
      setDocumentRefCode(`STMT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
      setPeriodOrYear(`من ${statementStartDate} إلى ${statementEndDate}`);
    }
  }, [shareType, statementData.closingBalance, activeClient?.name, statementStartDate, statementEndDate]);

  if (!isOpen) return null;

  const officeName = state.officeProfile.firmName || state.officeProfile.officeName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = state.officeProfile.auditorName || 'أ/ محمد جميل مرعي';
  const officePhone = state.officeProfile.phone || '01003335360';

  // Generate Message Content with Company Name & Amount (Simplified and expressive)
  const generateWhatsAppMessage = () => {
    const clientName = activeClient?.name || 'العميل المحترم';
    const contactPerson = activeClient?.contactPerson ? ` (${activeClient.contactPerson})` : '';
    const greeting = `مكتب المحاسب القانوني / محمد جميل مرعي\nالسادة / *${clientName}*${contactPerson}\nتحية طيبة،،`;
    const signature = `\n\n━━━━━━━━━━━━━━━━━━━━\n💬 واتساب: 0552777332 | 📞 اتصال: 01003335360`;

    switch (shareType) {
      case 'ARCHIVED_DOCUMENT': {
        return {
          title: `مشاركة مستند من الأرشيف الإلكتروني`,
          text: `${greeting}\n\nمرفق مستند معتمد: *${documentTitle || 'مستند مالي'}* (كود: ${documentRefCode})${amount > 0 ? ` بقيمة *${formatEgyptianCurrency(amount)}*` : ''}.${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };
      }

      case 'ACCOUNT_STATEMENT': {
        const net = statementData.closingBalance;
        const statusText = net > 0 ? 'مدين للمكتب' : net < 0 ? 'دائن لصالحكم' : 'خالص ومسوى';
        return {
          title: `كشف حساب مالي معتمد`,
          text: `${greeting}\n\nكشف حسابكم للفترة من ${statementStartDate} إلى ${statementEndDate}:\nالرصيد الختامي: *${formatEgyptianCurrency(Math.abs(net))}* (${statusText}).${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };
      }

      case 'ANY_FILE': {
        return {
          title: `إرسال ملف ومستند مرفق`,
          text: `${greeting}\n\nمرفق لسيادتكم: *${documentTitle || customFile?.name || 'ملف رقمي'}* (مرجع: ${documentRefCode})${amount > 0 ? ` بقيمة *${formatEgyptianCurrency(amount)}*` : ''}.${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };
      }

      case 'INVOICE_CLAIM':
        return {
          title: `مطالبة أتعاب محاسبية ومراجعة`,
          text: `${greeting}\n\nمرفق مطالبة أتعاب رقم *${documentRefCode}* بمبلغ *${formatEgyptianCurrency(amount)}* عن ${periodOrYear}.\nالبيان: ${documentTitle || 'أتعاب محاسبية وضريبية'}\nتاريخ الاستحقاق: ${dueDate}${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };

      case 'TREASURY_RECEIPT':
        return {
          title: `إشعار استلام وسند قبض أتعاب`,
          text: `${greeting}\n\nتم استلام وتوريد مبلغ *${formatEgyptianCurrency(amount)}* بالخزينة بموجب سند قبض رقم *${documentRefCode}* بتاريخ ${new Date().toISOString().slice(0, 10)}.\nالبيان: ${documentTitle || 'سداد أتعاب مهنية'}${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };

      case 'TAX_DECLARATION':
        return {
          title: `إشعار تقديم واعتماد إقرار ضريبي`,
          text: `${greeting}\n\nتم اعتماد وتقديم *${documentTitle || 'الإقرار الضريبي'}* عن فترة ${periodOrYear} بنجاح لدى مصلحة الضرائب.\nرقم الإشعار: ${documentRefCode} | الضريبة المسددة: *${formatEgyptianCurrency(amount)}*.${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };

      case 'FINANCIAL_STATEMENT':
        return {
          title: `إشعار جهوزية القوائم المالية وتقرير المراجع`,
          text: `${greeting}\n\nتم الانتهاء من مراجعة القوائم المالية عن ${periodOrYear}.\nالمسودة وتقرير مراقب الحسابات جاهزة للاعتماد والتوقيع بمقر المكتب.${customNotes ? `\nملاحظة: ${customNotes}` : ''}${signature}`,
        };

      case 'QUOTATION':
        return {
          title: `عرض أتعاب وخدمات مهنية معتمد: ${documentTitle || 'أعمال واستشارات'}`,
          text: `${greeting}\n\nعرض أتعاب معتمد لخدمة: *${documentTitle || 'خدمات مهنية'}* بقيمة *${formatEgyptianCurrency(amount)}* (مرجع #${documentRefCode}).\nسارٍ حتى ${dueDate}.${customNotes ? `\nشروط: ${customNotes}` : ''}${signature}`,
        };

      case 'VERIFICATION_CODE': {
        const code = documentRefCode || '784219';
        return {
          title: `إرسال كود تحقق واعتماد رسمي`,
          text: `${greeting}\n\nكود التحقق والاعتماد: *${code}*\nالغرض: ${documentTitle || 'توثيق معاملة محاسبية'}\nتاريخ: ${new Date().toISOString().slice(0, 10)}${signature}`,
        };
      }

      case 'CUSTOM_STATEMENT':
      default:
        return {
          title: `إشعار ومستند مالي مخصص`,
          text: `${greeting}\n\nالموضوع: *${documentTitle || 'إشعار مالي'}*${amount > 0 ? ` بمبلغ *${formatEgyptianCurrency(amount)}*` : ''}.\n${customNotes ? `التفاصيل: ${customNotes}` : ''}${signature}`,
        };
    }
  };

  const messageData = generateWhatsAppMessage();

  // Web Share API to send the actual file directly to WhatsApp on supported devices
  const handleShareFileNative = async () => {
    if (shareType === 'ANY_FILE' && customFile) {
      if (navigator.canShare && navigator.canShare({ files: [customFile] })) {
        try {
          await navigator.share({
            files: [customFile],
            title: documentTitle || customFile.name,
            text: messageData.text,
          });
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Native share aborted or unsupported:', err);
          }
        }
      }
    }

    // Fallback: Copy and Open WhatsApp Web
    handleSendViaWhatsAppApi();
  };

  // Direct Server WhatsApp Business API Send
  const handleDirectServerSend = async () => {
    if (!phoneNumber) {
      alert('يرجى التأكد من كتابة رقم هاتف العميل.');
      return;
    }

    setIsSendingApi(true);
    setApiResult(null);

    try {
      let res;
      if (shareType === 'QUOTATION') {
        res = await WhatsAppApiService.sendQuotation({
          to: phoneNumber,
          clientName: activeClient?.name || 'العميل',
          contactPerson: activeClient?.contactPerson,
          referenceCode: documentRefCode,
          procedureTitle: documentTitle || 'عرض أتعاب وخدمات مهنية',
          procedureCategory: 'استشارات وتأسيس ومراجعة',
          professionalFees: amount,
          governmentFees: 0,
          totalEstimatedCost: amount,
          validityDays: 15,
          estimatedExecutionDays: 7,
          notes: customNotes,
          verificationCode: `VER-${documentRefCode}`,
        });
      } else {
        res = await WhatsAppApiService.sendMessage(phoneNumber, messageData.text, {
          clientName: activeClient?.name || 'العميل',
          category:
            shareType === 'INVOICE_CLAIM'
              ? 'INVOICE'
              : shareType === 'FINANCIAL_STATEMENT' || shareType === 'ACCOUNT_STATEMENT'
              ? 'CERTIFIED_REPORT'
              : 'GENERAL',
          referenceCode: documentRefCode,
          amount: amount,
        });
      }

      // Record in local database
      db.sendWhatsAppMessage({
        clientId: activeClient?.id || '',
        clientName: activeClient?.name || 'العميل',
        phone: phoneNumber,
        direction: 'OUTGOING',
        sender: 'AUDITOR',
        text: messageData.text,
        category:
          shareType === 'INVOICE_CLAIM'
            ? 'INVOICE'
            : shareType === 'TREASURY_RECEIPT'
            ? 'TREASURY_RECEIPT'
            : shareType === 'TAX_DECLARATION'
            ? 'TAX_DECLARATION'
            : 'GENERAL',
        mediaPayload: {
          type:
            shareType === 'INVOICE_CLAIM'
              ? 'INVOICE'
              : shareType === 'TREASURY_RECEIPT'
              ? 'RECEIPT'
              : shareType === 'TAX_DECLARATION'
              ? 'TAX_DECLARATION'
              : 'DOCUMENT',
          title: documentTitle || messageData.title,
          referenceCode: documentRefCode,
          amount: amount,
          receiptNumber: shareType === 'TREASURY_RECEIPT' ? documentRefCode : undefined,
        },
      });

      if (onDirectSend) {
        onDirectSend(messageData.text, shareType);
      }

      if (res.success) {
        setApiResult({
          success: true,
          message: `تم الإرسال بنجاح مباشرة إلى هاتف العميل (${phoneNumber}) عبر WhatsApp Business API!`,
          messageId: res.messageId,
        });
      } else {
        setApiResult({
          success: false,
          message: res.error || 'تعذر الإرسال عبر API السيرفر.',
        });
      }
    } catch (err: any) {
      setApiResult({
        success: false,
        message: err.message || 'خطأ في الاتصال بالخادم.',
      });
    } finally {
      setIsSendingApi(false);
    }
  };

  // Open Real WhatsApp Web or Mobile App
  const handleSendViaWhatsAppApi = () => {
    if (!phoneNumber) {
      alert('يرجى التأكد من كتابة رقم هاتف العميل.');
      return;
    }

    // Record the outgoing message in local database for audit & compliance logging
    db.sendWhatsAppMessage({
      clientId: activeClient?.id || '',
      clientName: activeClient?.name || 'العميل',
      phone: phoneNumber,
      direction: 'OUTGOING',
      sender: 'AUDITOR',
      text: messageData.text,
      category:
        shareType === 'INVOICE_CLAIM'
          ? 'INVOICE'
          : shareType === 'TREASURY_RECEIPT'
          ? 'TREASURY_RECEIPT'
          : shareType === 'TAX_DECLARATION'
          ? 'TAX_DECLARATION'
          : 'GENERAL',
      mediaPayload: {
        type:
          shareType === 'INVOICE_CLAIM'
            ? 'INVOICE'
            : shareType === 'TREASURY_RECEIPT'
            ? 'RECEIPT'
            : shareType === 'TAX_DECLARATION'
            ? 'TAX_DECLARATION'
            : 'DOCUMENT',
        title: documentTitle || messageData.title,
        referenceCode: documentRefCode,
        amount: amount,
        receiptNumber: shareType === 'TREASURY_RECEIPT' ? documentRefCode : undefined,
      },
    });

    if (onDirectSend) {
      onDirectSend(messageData.text, shareType);
    }

    const botSettings = db.getWhatsAppBotSettings();
    const baseUrl = botSettings.customApiBaseUrl || 'https://api.whatsapp.com/send';
    const countryCode = botSettings.defaultCountryCode || '20';

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const targetPhone = clean.startsWith('0')
      ? countryCode + clean.slice(1)
      : clean.startsWith(countryCode)
      ? clean
      : clean || countryCode + '1003335360';

    const encodedText = encodeURIComponent(messageData.text);
    let waUrl = '';
    if (baseUrl.includes('wa.me')) {
      waUrl = `https://wa.me/${targetPhone}?text=${encodedText}`;
    } else if (baseUrl.includes('web.whatsapp.com')) {
      waUrl = `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
    } else {
      waUrl = `${baseUrl}?phone=${targetPhone}&text=${encodedText}`;
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Account Statement as CSV/Excel
  const handleExportStatementCsv = () => {
    if (!activeClient) return;

    const headers = ['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد'];
    let running = statementData.openingBalance;
    const rows = statementData.recentEntries.map((e) => {
      running += e.debit - e.credit;
      return [e.date, e.serial, `"${e.description.replace(/"/g, '""')}"`, e.debit, e.credit, running];
    });

    const csvContent =
      '\uFEFF' +
      [`كشف حساب: ${activeClient.name}`, `الفترة: من ${statementStartDate} إلى ${statementEndDate}`, `رصيد أول المدة: ${statementData.openingBalance}`].join('\n') +
      '\n\n' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') +
      `\n\nإجمالي المدين,${statementData.totalDebit}\nإجمالي الدائن,${statementData.totalCredit}\nالرصيد النهائي,${statementData.closingBalance}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_${activeClient.name.replace(/\s+/g, '_')}_${statementStartDate}_${statementEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-right space-y-0 text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  إرسال الملفات والمستندات عبر WhatsApp
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {documentRefCode}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                <span>إرسال إلى العميل:</span>
                <span className="text-emerald-300 font-black">{activeClient?.name || 'العميل'}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Internal WhatsApp Gateway Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${gatewayStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {gatewayStatus === 'CONNECTED' ? (
                  <>واتساب البرنامج الداخلي: <strong className="text-emerald-600 dark:text-emerald-400">متصل وجاهز (0552777332)</strong></>
                ) : (
                  <>واتساب البرنامج الداخلي: <strong className="text-amber-600 dark:text-amber-400">غير مفعل بالباركود</strong></>
                )}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">| الاتصال الصوتي: 01003335360</span>
            </div>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{gatewayStatus === 'CONNECTED' ? 'إدارة ربط الباركود' : 'تفعيل بالباركود الآن'}</span>
            </button>
          </div>

          {/* Top Tabs: 3 Main Requested Categories + Others */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              حدد نوع المستند أو المعاملة المراد إرسالها عبر WhatsApp:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1. Archived Document */}
              <button
                type="button"
                id="tab-share-archived"
                onClick={() => {
                  setShareType('ARCHIVED_DOCUMENT');
                  if (clientDocs[0]) {
                    setSelectedDocId(clientDocs[0].id);
                    setDocumentTitle(clientDocs[0].title);
                  }
                  setDocumentRefCode(`DOC-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  shareType === 'ARCHIVED_DOCUMENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm font-bold ring-1 ring-emerald-500/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">ملف مأرشف</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    من أرشيف العميل ({clientDocs.length} ملف متاح)
                  </div>
                </div>
              </button>

              {/* 2. Account Statement */}
              <button
                type="button"
                id="tab-share-statement"
                onClick={() => {
                  setShareType('ACCOUNT_STATEMENT');
                  setDocumentTitle(`كشف حساب معتمد - ${activeClient?.name || ''}`);
                  setDocumentRefCode(`STMT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
                  setAmount(Math.abs(statementData.closingBalance));
                }}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  shareType === 'ACCOUNT_STATEMENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm font-bold ring-1 ring-emerald-500/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">كشف حساب تفصيلي</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    الأرصدة والحركات والمسددات
                  </div>
                </div>
              </button>

              {/* 3. Any Custom File */}
              <button
                type="button"
                id="tab-share-any-file"
                onClick={() => {
                  setShareType('ANY_FILE');
                  setDocumentRefCode(`FILE-${Date.now().toString().slice(-5)}`);
                }}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  shareType === 'ANY_FILE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm font-bold ring-1 ring-emerald-500/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">أي ملف أحدده</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    رفع واختيار أي ملف PDF / Excel / صورة
                  </div>
                </div>
              </button>
            </div>

            {/* Secondary Standard Models (Accordion / Compact Buttons) */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">نماذج أخرى:</span>
              <button
                type="button"
                id="tab-share-code"
                onClick={() => {
                  setShareType('VERIFICATION_CODE');
                  setDocumentTitle('كود تحقق وتوثيق رسمي من داخل المنظومة');
                  setDocumentRefCode(Math.floor(100000 + Math.random() * 900000).toString());
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'VERIFICATION_CODE'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                🔐 إرسال كود
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareType('INVOICE_CLAIM');
                  setDocumentTitle('مطالبة أتعاب إعداد القوائم ومطابقة الفاتورة الإلكترونية');
                  setDocumentRefCode(`INV-2026-${Math.floor(Math.random() * 900 + 100)}`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'INVOICE_CLAIM'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                فاتورة أتعاب
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareType('TREASURY_RECEIPT');
                  setDocumentTitle('سند قبض تحصيل أتعاب مراجعة');
                  setDocumentRefCode(`VCH-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'TREASURY_RECEIPT'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                سند قبض
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareType('TAX_DECLARATION');
                  setDocumentTitle('إقرار ضريبة القيمة المضافة');
                  setDocumentRefCode(`ETA-${new Date().getFullYear()}-Q1`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'TAX_DECLARATION'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                إقرار ضريبي
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareType('FINANCIAL_STATEMENT');
                  setDocumentTitle('القوائم المالية المدققة');
                  setDocumentRefCode(`FS-2026`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'FINANCIAL_STATEMENT'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                قوائم مالية
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareType('QUOTATION');
                  setDocumentTitle('عرض أتعاب وخدمات مهنية');
                  setDocumentRefCode(`QUO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 cursor-pointer ${
                  shareType === 'QUOTATION'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                عرض سعر
              </button>
            </div>
          </div>

          {/* DYNAMIC SECTION 1: ARCHIVED DOCUMENT SELECTOR */}
          {shareType === 'ARCHIVED_DOCUMENT' && (
            <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  اختر المستند من الأرشيف الإلكتروني للعميل:
                </span>
                <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold">
                  ({clientDocs.length} ملف مؤرشف)
                </span>
              </div>

              {clientDocs.length === 0 ? (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-center space-y-2">
                  <p className="text-slate-500 text-xs">لا توجد مستندات مؤرشفة حالياً لهذا العميل في الأرشيف الإلكتروني.</p>
                  <p className="text-[11px] text-slate-400">
                    يمكنك استخدام خيار <strong className="text-emerald-600 font-bold">"أي ملف أحدده"</strong> لرفع وإرسال أي ملف من جهازك فوراً.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedDocId}
                    onChange={(e) => {
                      const doc = clientDocs.find((d) => d.id === e.target.value);
                      if (doc) {
                        setSelectedDocId(doc.id);
                        setDocumentTitle(doc.title);
                        setDocumentRefCode(`DOC-${doc.id.slice(-4)}`);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {clientDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.fileName}) • تاريخ: {doc.uploadedAt}
                      </option>
                    ))}
                  </select>

                  {/* Selected Document Info Badge */}
                  {(() => {
                    const selectedDoc = clientDocs.find((d) => d.id === selectedDocId);
                    if (!selectedDoc) return null;
                    return (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{selectedDoc.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            الحجم: {selectedDoc.fileSize || 'غير محدد'} • النوع: {selectedDoc.documentType}
                          </span>
                        </div>
                        {selectedDoc.fileDataUrl && (
                          <a
                            href={selectedDoc.fileDataUrl}
                            download={selectedDoc.fileName}
                            className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-800 dark:text-purple-300 font-bold flex items-center gap-1 transition-all"
                            title="تحميل الملف الأرشيفي"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تنزيل</span>
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC SECTION 2: ACCOUNT STATEMENT ENGINE */}
          {shareType === 'ACCOUNT_STATEMENT' && (
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  إعدادات وفترة كشف الحساب المالي:
                </span>
                <button
                  type="button"
                  onClick={handleExportStatementCsv}
                  className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 text-blue-800 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="تصدير كشف الحساب بصيغة Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير Excel (CSV)</span>
                </button>
              </div>

              {/* Date Filters & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    الحساب المحاسبي:
                  </label>
                  <select
                    value={statementAccountId}
                    onChange={(e) => setStatementAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs"
                  >
                    <option value="ALL">جميع قيود ومعاملات العميل</option>
                    {state.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    من تاريخ:
                  </label>
                  <input
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    إلى تاريخ:
                  </label>
                  <input
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Live Statement Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">رصيد أول المدة:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatEgyptianCurrency(statementData.openingBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي المدين (+):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatEgyptianCurrency(statementData.totalDebit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي الدائن (-):</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatEgyptianCurrency(statementData.totalCredit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الرصيد المستحق الحالي:</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {formatEgyptianCurrency(Math.abs(statementData.closingBalance))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC SECTION 3: ANY CUSTOM FILE PICKER */}
          {shareType === 'ANY_FILE' && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-amber-600" />
                  حدد أي ملف من جهازك لإرفاقه ومشاركته عبر WhatsApp:
                </span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300">
                  يدعم PDF, Excel, Word, الصور, الملفات المضغوطة
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                id="file-input-custom-whatsapp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drop / Click Target */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 dark:border-amber-800/80 rounded-xl p-4 text-center cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-all bg-white dark:bg-slate-900/80 group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {customFile ? 'انقر لتغيير الملف المحدد' : 'انقر هنا لاختيار وتحديد أي ملف من جهازك'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {customFile ? `${customFile.name} (${formatFileSize(customFile.size)})` : 'PDF • XLSX • DOCX • JPG • PNG • ZIP'}
                </p>
              </div>

              {/* Selected File Card & Actions */}
              {customFile && (
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {customFile.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        الحجم: {formatFileSize(customFile.size)} • النوع: {customFile.type || 'ملف رقمي'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {customFileDataUrl && (
                      <a
                        href={customFileDataUrl}
                        download={customFile.name}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        title="تحميل الملف"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleShareFileNative}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="مشاركة الملف مباشرة عبر WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>إرسال الملف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFile(null);
                        setCustomFileDataUrl(null);
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="إلغاء تحديد الملف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Target Client Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                العميل / الشركة المستلمة:
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const found = state.clients.find((c) => c.id === e.target.value);
                  if (found) {
                    setPhoneNumber(found.phone || '');
                  }
                }}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientCode ? `[${c.clientCode}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target WhatsApp Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                رقم هاتف واتساب (WhatsApp):
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-transparent font-mono font-bold text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Document Title / Description */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                عنوان / بيان المستند المرسل:
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="مثال: كشف حساب تفصيلي / ملف مأرشف"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                الرقم المرجعي / كود التوثيق:
              </label>
              <input
                type="text"
                value={documentRefCode}
                onChange={(e) => setDocumentRefCode(e.target.value)}
                placeholder="REF-2026-001"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Amount Field (Highlighted) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                المبلغ المرتبط / الرصيد (ج.م):
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-transparent font-mono font-bold text-xs text-emerald-950 dark:text-emerald-200 focus:outline-none"
                />
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">ج.م</span>
              </div>
              {amount > 0 && includeAmountInWords && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block font-medium">
                  {numberToArabicWords(amount)}
                </span>
              )}
            </div>

            {/* Period / Year */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                الفترة المالية / السنة:
              </label>
              <input
                type="text"
                value={periodOrYear}
                onChange={(e) => setPeriodOrYear(e.target.value)}
                placeholder="السنة المالية 2026"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Optional Notes */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                ملاحظات أو توجيهات إضافية في رسالة WhatsApp (اختياري):
              </label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="اكتب أي تعليمات إضافية مثل موعد المراجعة أو الحسابات البنكية للمكتب..."
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <span>معاينة نص الرسالة الجاهزة للإرسال:</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح' : 'نسخ نص الرسالة'}</span>
              </button>
            </div>

            {/* API Result Feedback */}
            {apiResult && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                  apiResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500/40 text-rose-900 dark:text-rose-200'
                }`}
              >
                {apiResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{apiResult.message}</p>
                  {apiResult.messageId && (
                    <p className="text-[10px] opacity-80 mt-0.5 font-mono">
                      معرف الرسالة: {apiResult.messageId}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text">
              {messageData.text}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Native Share File (If Any File is selected) */}
            {shareType === 'ANY_FILE' && customFile && (
              <button
                type="button"
                onClick={handleShareFileNative}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="مشاركة الملف مباشرة عبر WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة الملف المرفق</span>
              </button>
            )}

            {/* Direct Server API Send from Internal WhatsApp */}
            <button
              type="button"
              id="btn-confirm-send-api"
              disabled={isSendingApi}
              onClick={handleDirectServerSend}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="إرسال فوري من داخل البرنامج عبر بوابة واتساب المكتب (0552777332) دون الحاجة لمتصفح خارجي"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingApi ? 'animate-spin' : ''}`} />
              <span>{isSendingApi ? 'جارٍ الإرسال الفوري...' : 'إرسال مباشر من داخل البرنامج (WhatsApp الداخلي)'}</span>
            </button>

            {/* Open WhatsApp Web Fallback */}
            <button
              type="button"
              id="btn-confirm-open-web"
              onClick={handleSendViaWhatsAppApi}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="فتح عبر المتصفح أو تطبيق الهاتف كخيار بديل"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>فتح بالمتصفح الخارجي</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Internal WhatsApp QR Linking Modal */}
      {isQrModalOpen && (
        <WhatsAppQrLinkingModal
          isOpen={isQrModalOpen}
          onClose={() => {
            setIsQrModalOpen(false);
            WhatsAppApiService.getSessionStatus().then((st) => setGatewayStatus(st.status)).catch(() => {});
          }}
          state={state}
        />
      )}
    </div>
  );
};
