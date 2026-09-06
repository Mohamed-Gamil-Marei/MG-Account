import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ClientArchiveRecord, ClientDocument, Invoice, OfficeTreasuryTransaction, TaxDeclarationRecord } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { WhatsAppApiService } from '../../services/whatsappApiService';

export type DocShareType =
  | 'ARCHIVED_DOCUMENT'    // مستند من أرشيف العميل
  | 'INVOICE_CLAIM'        // مطالبة مالية / فاتورة أتعاب
  | 'TREASURY_RECEIPT'     // إيصال سند قبض خزينة
  | 'TAX_DECLARATION'      // إقرار ضريبي معتمد
  | 'FINANCIAL_STATEMENT'  // مسودة/قوائم مالية معتمدة
  | 'QUOTATION'            // عرض سعر وأتعاب مهنية معتمد
  | 'CUSTOM_STATEMENT';    // إشعار مالي مخصص

interface WhatsAppDocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientArchiveRecord | null;
  state: DatabaseState;
  initialDoc?: ClientDocument | null;
}

export const WhatsAppDocumentShareModal: React.FC<WhatsAppDocumentShareModalProps> = ({
  isOpen,
  onClose,
  client,
  state,
  initialDoc,
}) => {
  const [shareType, setShareType] = useState<DocShareType>(
    initialDoc ? 'ARCHIVED_DOCUMENT' : 'INVOICE_CLAIM'
  );

  // Form Fields
  const [phoneNumber, setPhoneNumber] = useState(client?.phone || '');
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDoc?.id || '');
  const [documentTitle, setDocumentTitle] = useState(initialDoc?.title || '');
  const [documentRefCode, setDocumentRefCode] = useState(
    initialDoc ? `DOC-${initialDoc.id.slice(-4)}` : `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`
  );
  const [amount, setAmount] = useState<number>(5000);
  const [includeAmountInWords, setIncludeAmountInWords] = useState(true);
  const [periodOrYear, setPeriodOrYear] = useState<string>('السنة المالية 2026');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customNotes, setCustomNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSendingApi, setIsSendingApi] = useState(false);
  const [apiResult, setApiResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // Sync client or initial document changes
  useEffect(() => {
    if (client) {
      setPhoneNumber(client.phone || '');
    }
    if (initialDoc) {
      setShareType('ARCHIVED_DOCUMENT');
      setSelectedDocId(initialDoc.id);
      setDocumentTitle(initialDoc.title);
      setDocumentRefCode(`DOC-${initialDoc.id.slice(-4)}`);
    }
  }, [client, initialDoc]);

  if (!isOpen || !client) return null;

  const officeName = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = state.officeProfile.auditorName || 'أ/ محمد جميل مرعي';
  const officePhone = state.officeProfile.phone || '01003335360';

  // Format international WhatsApp phone
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0')
    ? '2' + cleanPhone
    : cleanPhone.startsWith('20')
    ? cleanPhone
    : cleanPhone || '201003335360';

  // Available client documents
  const clientDocs = client.documents || [];

  // Generate Message Content with Company Name & Amount
  const generateWhatsAppMessage = () => {
    const greeting = `السادة / *${client.name}*\nعناية: ${client.contactPerson || 'الإدارة المالية المحترمة'}\nتحية طيبة وبعد،،`;
    const signature = `\n\n📌 *ملاحظة:* يرجى مراجعة وتأكيد الاستلام أو موافاتنا بإشعار السداد والتحويل.\n\nمع خالص التقدير،\n*${officeName}*\nالمحاسب القانوني: *${auditorName}*\nهاتف التواصل: ${officePhone}`;

    const amountInWordsStr = amount > 0 && includeAmountInWords ? `\n🔹 *المبلغ بالحروف:* فقط ${numberToArabicWords(amount)} لا غير` : '';

    switch (shareType) {
      case 'INVOICE_CLAIM':
        return {
          title: `مطالبة أتعاب محاسبية ومراجعة`,
          text: `${greeting}\n\nنرفق لسيادتكم بيان مطالبة بأتعاب الخدمات المحاسبية والضريبية وفقاً للبيانات التالية:\n\n🏢 *اسم الشركة:* ${client.name}\n📋 *البيان:* ${documentTitle || 'أتعاب المراجعة وإعداد الإقرارات الضريبية'}\n🔢 *رقم المطالبة المرجعي:* ${documentRefCode}\n📅 *الفترة المالية:* ${periodOrYear}\n💰 *المبلغ المطلوب:* *${formatEgyptianCurrency(amount)}*${amountInWordsStr}\n⏳ *تاريخ الاستحقاق المقترح:* ${dueDate}${customNotes ? `\n📝 *ملاحظات إضافية:* ${customNotes}` : ''}${signature}`,
        };

      case 'TREASURY_RECEIPT':
        return {
          title: `إشعار استلام وسند قبض أتعاب`,
          text: `${greeting}\n\nنحيط سيادتكم علماً بأنه تم استلام وتوريد المبلغ المالي الموضح أدناه إلى خزينة المكتب وإصدار سند القبض المعتمد:\n\n🏢 *اسم الشركة:* ${client.name}\n🧾 *رقم سند القبض:* ${documentRefCode}\n💵 *المبلغ المحصل:* *${formatEgyptianCurrency(amount)}*${amountInWordsStr}\n📋 *البيان:* ${documentTitle || 'سداد أتعاب مهنية واستشارات ضريبية'}\n📅 *تاريخ السند:* ${new Date().toISOString().slice(0, 10)}${customNotes ? `\n📝 *ملاحظات:* ${customNotes}` : ''}${signature}`,
        };

      case 'ARCHIVED_DOCUMENT':
        return {
          title: `مشاركة مستند من الأرشيف الإلكتروني`,
          text: `${greeting}\n\nيسرنا إحاطة سيادتكم علماً بجهوزية المستند التالي من الأرشيف والموثق لدى مكتبنا:\n\n🏢 *اسم الشركة:* ${client.name}\n📄 *اسم المستند:* *${documentTitle || 'مستند مالي معتمد'}*\n🔢 *الكود المرجعي:* ${documentRefCode}\n📅 *تاريخ التوثيق:* ${new Date().toISOString().slice(0, 10)}${amount > 0 ? `\n💰 *القيمة المرتبطة:* *${formatEgyptianCurrency(amount)}*` : ''}${customNotes ? `\n📝 *ملاحظات:* ${customNotes}` : ''}\n\nالمستند مؤرشف ومتاح بالصيغة الإلكترونية المعتمدة طرفنا.${signature}`,
        };

      case 'TAX_DECLARATION':
        return {
          title: `إشعار تقديم واعتماد إقرار ضريبي`,
          text: `${greeting}\n\nنحيط سيادتكم علماً بأنه تم إعداد واعتماد الإقرار الضريبي بنجاح عبر منظومة مصلحة الضرائب المصرية:\n\n🏢 *اسم الشركة:* ${client.name}\n📋 *نوع الإقرار:* ${documentTitle || 'إقرار ضريبة القيمة المضافة / كسب العمل'}\n📅 *الفترة الضريبية:* ${periodOrYear}\n🔢 *رقم الإشعار المرجعي:* ${documentRefCode}\n💰 *الضريبة المستحقة المسددة:* *${formatEgyptianCurrency(amount)}*${amountInWordsStr}${customNotes ? `\n📝 *ملاحظات الفحص:* ${customNotes}` : ''}${signature}`,
        };

      case 'FINANCIAL_STATEMENT':
        return {
          title: `إشعار جهوزية القوائم المالية وتقرير المراجع`,
          text: `${greeting}\n\nيسعدنا إفادتكم بانتهاء أعمال المراجعة والتدقيق، وأصبحت مسودة القوائم المالية المستقلة وتقرير مراقب الحسابات جاهزة للاعتماد والتوقيع:\n\n🏢 *اسم الشركة:* ${client.name}\n📊 *القوائم عن:* ${periodOrYear}\n🔢 *رقم المرجع:* ${documentRefCode}\n💰 *إجمالي أرباح / إيرادات النشاط:* *${formatEgyptianCurrency(amount)}*\n\nيرجى التنسيق معنا لتحديد موعد التسليم والتوقيع الرسمي.${signature}`,
        };

      case 'QUOTATION':
        return {
          title: `عرض أتعاب وخدمات مهنية معتمد: ${documentTitle || 'أعمال واستشارات'}`,
          text: `${greeting}\n\nيسرنا أن نتقدم لسيادتكم بعرض الأتعاب والخدمات المهنية المعتمد الخاص بشركتكم الموقرة (${client.name}):\n\n✨ *مسمى الخدمة / الإجراء:* ${documentTitle || 'أعمال محاسبية وضريبية وتأسيس'}\n🔢 *رقم مرجع العرض:* #${documentRefCode}\n💰 *قيمة الأتعاب المقدرة:* *${formatEgyptianCurrency(amount)}*${amountInWordsStr}\n⏱️ *سريان العرض:* سارٍ حتى ${dueDate}\n${customNotes ? `📝 *ملاحظات وشروط:* ${customNotes}\n` : ''}🔒 *كود التحقق الرقمي:* VER-${documentRefCode}\n\nيسعدنا تواصلكم لتأكيد التكليف والبدء في الإجراءات.${signature}`,
        };

      case 'CUSTOM_STATEMENT':
      default:
        return {
          title: `إشعار ومستند مالي مخصص`,
          text: `${greeting}\n\nنحيط سيادتكم علماً بما يلي بخصوص شركتكم الموقرة (${client.name}):\n\n📋 *الموضوع:* ${documentTitle || 'إشعار مالي'}\n${amount > 0 ? `💰 *المبلغ:* *${formatEgyptianCurrency(amount)}*${amountInWordsStr}\n` : ''}${customNotes ? `📝 *التفاصيل:* ${customNotes}\n` : ''}${signature}`,
        };
    }
  };

  const messageData = generateWhatsAppMessage();

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
          clientName: client.name,
          contactPerson: client.contactPerson,
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
          clientName: client.name,
          category:
            shareType === 'INVOICE_CLAIM'
              ? 'INVOICE'
              : shareType === 'FINANCIAL_STATEMENT'
              ? 'CERTIFIED_REPORT'
              : 'GENERAL',
          referenceCode: documentRefCode,
          amount: amount,
        });
      }

      // Record in local database
      db.sendWhatsAppMessage({
        clientId: client.id,
        clientName: client.name,
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

  const handleSendViaWhatsAppApi = () => {
    if (!phoneNumber) {
      alert('يرجى التأكد من كتابة رقم هاتف العميل.');
      return;
    }

    // Record the outgoing message in local database for audit & compliance logging
    db.sendWhatsAppMessage({
      clientId: client.id,
      clientName: client.name,
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

    const botSettings = db.getWhatsAppBotSettings();
    const baseUrl = botSettings.customApiBaseUrl || 'https://api.whatsapp.com/send';
    const countryCode = botSettings.defaultCountryCode || '20';

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const targetPhone = clean.startsWith('0')
      ? countryCode + clean.slice(1)
      : clean.startsWith(countryCode)
      ? clean
      : clean || (countryCode + '1003335360');

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
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-right space-y-0 text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-white shadow-inner">
              <Send className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                منظومة إرسال المستندات والمطالبات (WhatsApp API)
              </span>
              <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                <span>إرسال إشعار / مستند مالي للعميل:</span>
                <span className="text-emerald-300">{client.name}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Share Type Selection Pills */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              اختر نوع النموذج والمستند المالي المراد إرساله:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShareType('INVOICE_CLAIM');
                  setDocumentTitle('مطالبة أتعاب إعداد القوائم ومطابقة الفاتورة الإلكترونية');
                  setDocumentRefCode(`INV-2026-${Math.floor(Math.random() * 900 + 100)}`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'INVOICE_CLAIM'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>مطالبة أتعاب / فاتورة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('TREASURY_RECEIPT');
                  setDocumentTitle('سند قبض تحصيل أتعاب مراجعة قانونية');
                  setDocumentRefCode(`VCH-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'TREASURY_RECEIPT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>إيصال سند قبض خزينة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('ARCHIVED_DOCUMENT');
                  if (clientDocs[0]) {
                    setSelectedDocId(clientDocs[0].id);
                    setDocumentTitle(clientDocs[0].title);
                  }
                  setDocumentRefCode(`DOC-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'ARCHIVED_DOCUMENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                <span>مستند من الأرشيف ({clientDocs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('TAX_DECLARATION');
                  setDocumentTitle('إقرار ضريبة القيمة المضافة - نموذج 10');
                  setDocumentRefCode(`ETA-DECL-${new Date().getFullYear()}-Q1`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'TAX_DECLARATION'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>إقرار ضريبي معتمد</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('FINANCIAL_STATEMENT');
                  setDocumentTitle('القوائم المالية المدققة وتقرير مراقب الحسابات');
                  setDocumentRefCode(`FS-REP-2026`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'FINANCIAL_STATEMENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>مسودة قوائم مالية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('QUOTATION');
                  setDocumentTitle('عرض أتعاب تأسيس واستشارات ضريبية ومحاسبية');
                  setDocumentRefCode(`QUO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'QUOTATION'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>عرض سعر / أتعاب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareType('CUSTOM_STATEMENT');
                  setDocumentTitle('إشعار مالي وإداري');
                }}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  shareType === 'CUSTOM_STATEMENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                <span>إشعار مخصص</span>
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Target Client Name (Readonly preview) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                اسم الشركة / العميل المستلم:
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white">
                <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{client.name}</span>
              </div>
            </div>

            {/* Target WhatsApp Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                رقم هاتف واتساب (WhatsApp):
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-transparent font-mono font-bold text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* If Archived Document selected, pick from document list */}
            {shareType === 'ARCHIVED_DOCUMENT' && clientDocs.length > 0 && (
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  اختر المستند من أرشيف الشركة:
                </label>
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  {clientDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.fileName}) - {doc.uploadedAt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Document Title / Description */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                بيان / عنوان المستند:
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="مثال: أتعاب إعداد واعتماد الإقرارات الضريبية"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                الرقم المرجعي / رقم السند:
              </label>
              <input
                type="text"
                value={documentRefCode}
                onChange={(e) => setDocumentRefCode(e.target.value)}
                placeholder="INV-2026-001"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            {/* Amount Field (Highlighted) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                المبلغ المالي (ج.م) *
              </label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl">
                <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="5000"
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
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            {/* Optional Notes */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                ملاحظات أو توجيهات إضافية للعميل (اختياري):
              </label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="مثال: يرجى التحويل على حساب بنك مصر IBAN: EG... وإرسال صورة الإشعار."
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <span>معاينة الرسالة الجاهزة للإرسال عبر WhatsApp:</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح' : 'نسخ نص النموذج'}</span>
              </button>
            </div>

            {/* API Result Feedback */}
            {apiResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
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
                      معرف الرسالة المعتمد: {apiResult.messageId}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-emerald-950/5 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-emerald-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text shadow-inner">
              {messageData.text}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSendingApi}
              onClick={handleDirectServerSend}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isSendingApi ? 'animate-spin' : ''}`} />
              <span>{isSendingApi ? 'جارٍ الإرسال المباشر...' : 'إرسال مباشر عبر API السيرفر (بدون مغادرة التطبيق)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaWhatsAppApi}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="فتح المحادثة عبر WhatsApp Web أو تطبيق الهاتف"
            >
              <span>فتح WhatsApp خارجي</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
