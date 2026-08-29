import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  X,
  Phone,
  Mail,
  FileCheck,
  Calendar,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ClientArchiveRecord, ClientProcedureTask, TaxDeclarationRecord } from '../types';

export type ClientNotifyType =
  | 'PROCEDURE_UPDATE'     // إشعار بمستجدات أو إنجاز إجراء
  | 'TAX_DECLARATION'      // إشعار بتقديم إقرار ضريبي
  | 'TAX_REMINDER'         // تذكير بموعد استحقاق ضريبي
  | 'DOCS_READY'           // إشعار بجهوزية القوائم والشهادات
  | 'DOCS_REQUEST'         // طلب مستندات وفواتير الشهر
  | 'FEES_INVOICE'         // مطالبة بأتعاب المحاسبة والمراجعة
  | 'CUSTOM';              // رسالة مخصصة

interface ClientNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientArchiveRecord | null;
  procedure?: ClientProcedureTask | null;
  taxDeclaration?: TaxDeclarationRecord | null;
  officeName?: string;
  auditorName?: string;
}

export const ClientNotificationModal: React.FC<ClientNotificationModalProps> = ({
  isOpen,
  onClose,
  client,
  procedure,
  taxDeclaration,
  officeName = 'مكتب المحاسب القانوني ومراقب الحسابات',
  auditorName = 'أ/ محمد جميل مرعي',
}) => {
  const [notifyType, setNotifyType] = useState<ClientNotifyType>(
    procedure ? 'PROCEDURE_UPDATE' : taxDeclaration ? 'TAX_DECLARATION' : 'DOCS_READY'
  );
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(client?.phone || '');
  const [emailAddress, setEmailAddress] = useState(client?.email || '');

  // Keep phone/email/type in sync if client or context changes
  React.useEffect(() => {
    if (client) {
      setPhoneNumber(client.phone || '');
      setEmailAddress(client.email || '');
    }
    if (procedure) {
      setNotifyType('PROCEDURE_UPDATE');
    } else if (taxDeclaration) {
      setNotifyType('TAX_DECLARATION');
    }
  }, [client, procedure, taxDeclaration]);

  if (!isOpen || !client) return null;

  // Format international WhatsApp phone
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0')
    ? '2' + cleanPhone // Egypt default
    : cleanPhone.startsWith('20')
    ? cleanPhone
    : cleanPhone;

  // Pre-configured message generators
  const generateMessage = (): { subject: string; text: string } => {
    const clientGreeting = `السادة / ${client.name}\nعناية: ${client.contactPerson || 'الإدارة المالية'}\nتحية طيبة وبعد،،`;
    const signature = `\n\nمع خالص التقدير والاحترام،\n${officeName}\nالمحاسب القانوني: ${auditorName}\nهاتف المكتب: 01000000000`;

    switch (notifyType) {
      case 'PROCEDURE_UPDATE': {
        const procTitle = procedure?.title || 'الإجراء الإداري والمحاسبي';
        const procCode = procedure?.procedureCode || 'PRC';
        const statusArabic =
          procedure?.status === 'COMPLETED'
            ? 'تم الانتهاء منه واعتماده بنجاح'
            : procedure?.status === 'AT_AUTHORITY'
            ? 'مقدم ومقيد لدى الجهة المختصة وجاري المتابعة'
            : procedure?.status === 'PENDING_CLIENT_DOCS'
            ? 'بانتظار موافاتنا بالمستندات المطلوبة لاستكمال التنفيذ'
            : 'جاري العمل عليه وإنجازه';

        return {
          subject: `إشعار بمستجدات الإجراء: ${procTitle}`,
          text: `${clientGreeting}\n\nنود إحاطة سيادتكم علماً بشأن الإجراء رقم (${procCode}):\n📌 *${procTitle}*\nالحالة الحالية: *${statusArabic}*.\n${
            procedure?.notes ? `ملاحظات: ${procedure.notes}\n` : ''
          }نحن على تواصل مستمر لإحاطتكم بكافة المستجدات فور ورودها.${signature}`,
        };
      }

      case 'TAX_DECLARATION': {
        const declType = taxDeclaration?.declarationType || 'ضريبة القيمة المضافة / كسب العمل';
        const period = taxDeclaration?.period || 'الفترة الحالية';
        const receiptNo = taxDeclaration?.receiptNumber || 'تم السداد المعتمد';
        return {
          subject: `إشعار بتقديم وسداد الإقرار الضريبي (${period})`,
          text: `${clientGreeting}\n\nنحيط سيادتكم علماً بأنه تم تقديم الإقرار الضريبي بنجاح عبر البوابة الإلكترونية لمصلحة الضرائب المصرية:\n📋 نوع الإقرار: *${declType}*\n📅 الفترة الضريبية: *${period}*\n🧾 رقم إشعار/سداد البوابة: *${receiptNo}*\n\nالمستندات وإيصالات السداد الرسمية مؤرشفة ومتاحة طرفنا للاستلام في أي وقت.${signature}`,
        };
      }

      case 'TAX_REMINDER': {
        return {
          subject: `تذكير بموعد الاستحقاق الضريبي وإعداد الفواتير`,
          text: `${clientGreeting}\n\nنود تذكير سيادتكم بقرب انتهاء المهلة القانونية لتقديم الإقرارات الضريبية ومطابقة الفاتورة الإلكترونية للفترة القادمة.\n\nيرجى التكرم بسرعة موافاتنا ببيانات فواتير المبيعات والمشتريات ومسير الرواتب لاستيفاء الفحص والمطابقة في المواعيد القانونية تفادياً لأي غرامات.${signature}`,
        };
      }

      case 'DOCS_READY': {
        return {
          subject: `إشعار بجهوزية القوائم المالية / المستندات المعتمدة`,
          text: `${clientGreeting}\n\nيسعدنا إفادتكم بانتهاء أعمال المراجعة والتدقيق، وأصبحت *القوائم المالية والتقارير وشهادات الدخل المعتمدة* جاهزة للتوقيع والاستلام بمقر المكتب أو عبر التوصيل المعتمد.\n\nيرجى التنسيق معنا لتحديد موعد التسليم.${signature}`,
        };
      }

      case 'DOCS_REQUEST': {
        return {
          subject: `طلب موافاتنا بالمستندات المحاسبية وفواتير الشهر`,
          text: `${clientGreeting}\n\nفي إطار المتابعة الدورية لأعمالكم المحاسبية والضريبية، نرجو التكرم بموافاتنا بالمستندات التالية:\n1. كشوف حركة الحسابات البنكية للشهر المنصرم.\n2. فواتير المشتريات والمصروفات المؤيدة مستندياً.\n3. كشف مسير المرتبات والأجور المنصرفة.\n\nشاكرين ومقدرين حسن تعاونكم الدائم.${signature}`,
        };
      }

      case 'FEES_INVOICE': {
        return {
          subject: `إشعار بأتعاب الخدمات المحاسبية والاستشارات`,
          text: `${clientGreeting}\n\nمرفق لسيادتكم بيان بأتعاب الأعمال المحاسبية والضريبية المنفذة لصالح شركتكم الموقرة وفقاً للاتفاق المبرم.\n\nيرجى التكرم بتوجيه الإدارة المالية للتحويل أو السداد مع إرسال إشعار التحويل لتسجيل سند القبض المعتمد.${signature}`,
        };
      }

      case 'CUSTOM':
      default: {
        return {
          subject: customSubject || `إشعار محاسبي وقانوني - ${client.name}`,
          text: `${clientGreeting}\n\n${customBody || 'نود إحاطة سيادتكم علماً بكافة الإجراءات والمستندات المحاسبية.'}${signature}`,
        };
      }
    }
  };

  const messageData = generateMessage();

  const handleSendWhatsApp = () => {
    if (!phoneNumber) {
      alert('يرجى إدخال رقم هاتف العميل أولاً.');
      return;
    }
    const encodedText = encodeURIComponent(messageData.text);
    const waUrl = `https://wa.me/${waPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendEmail = () => {
    if (!emailAddress) {
      alert('يرجى إدخال البريد الإلكتروني للعميل أولاً.');
      return;
    }
    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
      messageData.subject
    )}&body=${encodeURIComponent(messageData.text)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-right space-y-0 text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg">
              <MessageSquare className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                منظومة إخطارات وإشعار العملاء
              </span>
              <h3 className="text-sm font-bold text-white mt-1">إرسال إشعار ومستجدات: {client.name}</h3>
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
          {/* Client Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 block">رقم الهاتف (واتساب):</span>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none border-b border-dashed border-slate-300 dark:border-slate-600 pb-0.5"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 block">البريد الإلكتروني:</span>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full bg-transparent font-medium text-slate-800 dark:text-slate-200 text-xs focus:outline-none border-b border-dashed border-slate-300 dark:border-slate-600 pb-0.5"
                />
              </div>
            </div>
          </div>

          {/* Template Selection Pills */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">اختر نوع الإشعار / القالب الجاهز:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNotifyType('PROCEDURE_UPDATE')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'PROCEDURE_UPDATE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>مستجدات إجراء</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('TAX_DECLARATION')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'TAX_DECLARATION'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>تقديم إقرار ضريبي</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('TAX_REMINDER')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'TAX_REMINDER'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تذكير بموعد ضريبي</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('DOCS_READY')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'DOCS_READY'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>جاهزية القوائم/الشهادات</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('DOCS_REQUEST')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'DOCS_REQUEST'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-600 shrink-0" />
                <span>طلب مستندات الشهر</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('FEES_INVOICE')}
                className={`p-2.5 rounded-xl border text-right font-semibold text-[11px] transition-all flex items-center gap-2 cursor-pointer ${
                  notifyType === 'FEES_INVOICE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Receipt className="w-4 h-4 text-rose-600 shrink-0" />
                <span>مطالبة بالأتعاب</span>
              </button>
            </div>
          </div>

          {/* Custom mode inputs */}
          {notifyType === 'CUSTOM' && (
            <div className="space-y-2">
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="عنوان الموضوع..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
              <textarea
                rows={3}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="اكتب نص الرسالة هنا..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          )}

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>معاينة نص الرسالة الصادرة:</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح' : 'نسخ الرسالة'}</span>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text">
              {messageData.text}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر واتساب (WhatsApp)</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>إرسال بالبريد</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
