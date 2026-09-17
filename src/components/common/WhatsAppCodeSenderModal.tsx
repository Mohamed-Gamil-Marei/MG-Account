import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  X,
  Send,
  Sparkles,
  Copy,
  Check,
  Building,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord } from '../../types';
import { WhatsAppApiService } from '../../services/whatsappApiService';

export interface WhatsAppCodeSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: ClientArchiveRecord | null;
  state?: DatabaseState;
  initialCodeType?: 'OTP' | 'DOCUMENT_AUTH' | 'CLIENT_CODE' | 'CUSTOM';
  initialPurpose?: string;
  onSuccessSend?: (code: string, message: string) => void;
}

export type CodeTypeOption = 'OTP' | 'DOCUMENT_AUTH' | 'CLIENT_CODE' | 'TRANSACTION_AUTH' | 'CUSTOM';

export const WhatsAppCodeSenderModal: React.FC<WhatsAppCodeSenderModalProps> = ({
  isOpen,
  onClose,
  initialClient,
  state: propState,
  initialCodeType = 'OTP',
  initialPurpose,
  onSuccessSend,
}) => {
  const state = propState || db.getState();
  const clients = state.clients || [];

  // Active Client
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');

  // Code Details
  const [codeType, setCodeType] = useState<CodeTypeOption>(initialCodeType);
  const [codeValue, setCodeValue] = useState<string>('');
  const [purposeTitle, setPurposeTitle] = useState<string>(
    initialPurpose || 'التحقق من الهوية وتأكيد العمليات المحاسبية'
  );
  const [validity, setValidity] = useState<string>('صالح لمدة 15 دقيقة');
  const [targetEntity, setTargetEntity] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // UI States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);
  const [isSendingApi, setIsSendingApi] = useState(false);
  const [apiResult, setApiResult] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize client selection
  useEffect(() => {
    if (initialClient) {
      setSelectedClientId(initialClient.id);
      setPhoneNumber(initialClient.phone || '');
      setContactPerson(initialClient.contactPerson || '');
    } else if (state.activeClientContext?.activeClientId) {
      const active = clients.find((c) => c.id === state.activeClientContext.activeClientId);
      if (active) {
        setSelectedClientId(active.id);
        setPhoneNumber(active.phone || '');
        setContactPerson(active.contactPerson || '');
      } else if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
        setPhoneNumber(clients[0].phone || '');
        setContactPerson(clients[0].contactPerson || '');
      }
    } else if (clients.length > 0) {
      setSelectedClientId(clients[0].id);
      setPhoneNumber(clients[0].phone || '');
      setContactPerson(clients[0].contactPerson || '');
    }
  }, [initialClient, state.activeClientContext, clients]);

  // When client changes in dropdown
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setPhoneNumber(found.phone || '');
      setContactPerson(found.contactPerson || '');
      if (codeType === 'CLIENT_CODE') {
        setCodeValue(found.code || `CL-${found.id.slice(0, 5)}`);
      }
    }
  };

  // Helper generator functions
  const generateRandomOtp = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return num.toString();
  };

  const generateDocAuthCode = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `VER-${year}-${rand}`;
  };

  const generateTransactionCode = () => {
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `AUTH-${rand}`;
  };

  // Set default code when type changes or on init
  useEffect(() => {
    if (codeType === 'OTP') {
      setCodeValue(generateRandomOtp());
    } else if (codeType === 'DOCUMENT_AUTH') {
      setCodeValue(generateDocAuthCode());
    } else if (codeType === 'TRANSACTION_AUTH') {
      setCodeValue(generateTransactionCode());
    } else if (codeType === 'CLIENT_CODE') {
      const active = clients.find((c) => c.id === selectedClientId);
      setCodeValue(active?.code || `CL-2026-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [codeType, selectedClientId]);

  // Active client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Office Profile Info
  const officeName = state.officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = state.officeProfile?.auditorName || 'أ/ محمد جميل مرعي';
  const officePhone = '01003335360'; // Requested official office phone

  // Build the complete WhatsApp Message Text
  const messageText = useMemo(() => {
    const clientName = activeClient?.name || 'العميل المحترم';
    const contactLine = contactPerson ? `عناية: ${contactPerson} المحترمين\n` : '';
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    let typeTitle = 'كود تحقق أمان معتمد';
    if (codeType === 'OTP') typeTitle = 'رمز التحقق السريع (OTP)';
    else if (codeType === 'DOCUMENT_AUTH') typeTitle = 'كود توثيق واعتماد المستندات';
    else if (codeType === 'CLIENT_CODE') typeTitle = 'كود ملف الشركة بالمنظومة المحاسبية';
    else if (codeType === 'TRANSACTION_AUTH') typeTitle = 'كود اعتماد العملية المالية';
    else if (codeType === 'CUSTOM') typeTitle = 'كود مرجعي معتمد';

    const header = `🏛️ *${officeName}*\n📜 *محاسبون قانونيون ومستشارون ماليون وضرائب*\n━━━━━━━━━━━━━━━━━━━━\n\nالسادة / *${clientName}*\n${contactLine}تحية طيبة وبعد،،\n\nنرسل لسيادتكم كود التحقق والاعتماد المعتمد الصادر من داخل المنظومة المحاسبية للمكتب:\n\n`;

    const codeBox = `🔐 *${typeTitle}:*\n👉 *${codeValue || '------'}* 👈\n\n`;

    const details = `📋 *البيان والغرض:* ${purposeTitle}
📅 *تاريخ ووقت الإصدار:* ${nowStr}
⏳ *مدة الصلاحية:* ${validity}
${targetEntity ? `🏛️ *الجهة الموجه إليها:* ${targetEntity}\n` : ''}${additionalNotes ? `📝 *ملاحظات إضافية:* ${additionalNotes}\n` : ''}
⚠️ *تنبيه أمني:* يرجى استخدام هذا الرمز لإتمام وتأكيد الإجراء أو إبرازه للمراجعين عند طلب التحقق.`;

    const footer = `\n\n━━━━━━━━━━━━━━━━━━━━\n📞 *هاتف التواصل والاستفسار:* ${officePhone}\nالمحاسب القانوني: *${auditorName}*\n_محاسب ومراجع قانوني - زميل جمعية المحاسبين والمراجعين المصرية_`;

    return `${header}${codeBox}${details}${footer}`;
  }, [
    activeClient,
    contactPerson,
    codeType,
    codeValue,
    purposeTitle,
    validity,
    targetEntity,
    additionalNotes,
    officeName,
    auditorName,
    officePhone,
  ]);

  if (!isOpen) return null;

  // Copy code only
  const handleCopyCode = () => {
    if (!codeValue) return;
    navigator.clipboard.writeText(codeValue);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy full message
  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedFullMessage(true);
    setTimeout(() => setCopiedFullMessage(false), 2000);
  };

  // Record to local chat database
  const recordMessageToDb = () => {
    db.sendWhatsAppMessage({
      clientId: selectedClientId || 'general',
      clientName: activeClient?.name || 'العميل',
      phone: phoneNumber,
      direction: 'OUTGOING',
      sender: 'AUDITOR',
      text: messageText,
      category: 'SECURITY_VERIFICATION',
      mediaPayload: {
        type: 'DOCUMENT',
        title: purposeTitle,
        referenceCode: codeValue,
      },
    });
  };

  // Open Direct WhatsApp Web / Mobile URL
  const handleSendViaWhatsAppWeb = () => {
    if (!phoneNumber) {
      alert('يرجى كتابة رقم هاتف العميل أولاً.');
      return;
    }

    recordMessageToDb();

    const botSettings = db.getWhatsAppBotSettings();
    const baseUrl = botSettings.customApiBaseUrl || 'https://api.whatsapp.com/send';
    const countryCode = botSettings.defaultCountryCode || '20';

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    const targetPhone = clean.startsWith('0')
      ? countryCode + clean.slice(1)
      : clean.startsWith(countryCode)
      ? clean
      : countryCode + clean;

    const fullUrl = `${baseUrl}?phone=${targetPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');

    if (onSuccessSend) {
      onSuccessSend(codeValue, messageText);
    }
  };

  // Send via Server WhatsApp API
  const handleSendViaServerApi = async () => {
    if (!phoneNumber) {
      alert('يرجى كتابة رقم هاتف العميل أولاً.');
      return;
    }

    setIsSendingApi(true);
    setApiResult(null);

    try {
      recordMessageToDb();

      const res = await WhatsAppApiService.sendMessage(phoneNumber, messageText, {
        clientName: activeClient?.name || 'العميل',
        category: 'GENERAL',
        referenceCode: codeValue,
      });

      if (res.success) {
        setApiResult({
          success: true,
          message: `تم إرسال الكود بنجاح مباشرة إلى الرقم (${phoneNumber}) عبر WhatsApp Business API!`,
        });
        if (onSuccessSend) {
          onSuccessSend(codeValue, messageText);
        }
      } else {
        setApiResult({
          success: false,
          message: res.error || 'تعذر الإرسال الفوري عبر API السيرفر. يمكنك استخدام زر فتح واتساب المباشر.',
        });
      }
    } catch (err: any) {
      setApiResult({
        success: false,
        message: err.message || 'حدث خطأ أثناء الإرسال لخادم الواتساب.',
      });
    } finally {
      setIsSendingApi(false);
    }
  };

  // Send only to internal chat simulation
  const handleRecordToChatOnly = () => {
    recordMessageToDb();
    setApiResult({
      success: true,
      message: 'تم تسجيل وإرسال الكود في سجل محادثة العميل بنجاح.',
    });
    if (onSuccessSend) {
      onSuccessSend(codeValue, messageText);
    }
  };

  return (
    <div
      id="whatsapp-code-sender-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-right text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  إرسال كود من داخل البرنامج عبر WhatsApp
                </span>
                <span className="text-[11px] text-emerald-200/80 font-mono">
                  📞 هاتف المكتب: {officePhone}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                إصدار وإرسال كود تحقق وتوثيق رسمي للعميل
              </h3>
            </div>
          </div>

          <button
            id="close-code-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* API Result Banner */}
          {apiResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                apiResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {apiResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">{apiResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setApiResult(null)}
                className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          )}

          {/* Section 1: Client & Recipient */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>الشركة والعميل المستلم:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {clients.length} شركة مسجلة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  اختر الشركة:
                </label>
                <select
                  id="client-select"
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none font-bold text-xs"
                >
                  <option value="">-- اختر العميل --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  رقم هاتف الواتساب:
                </label>
                <div className="relative">
                  <input
                    id="client-phone-input"
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="مثال: 01012345678"
                    className="w-full p-2 pl-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none font-mono text-xs text-left"
                    dir="ltr"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  عناية المسؤول (اختياري):
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="مثال: أ/ أحمد محمود"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Code Type & Generator */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-2xs">
            <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              حدد نوع الكود المراد إرساله من داخل المنظومة:
            </label>

            {/* Code Type Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                id="type-otp-btn"
                onClick={() => {
                  setCodeType('OTP');
                  setCodeValue(generateRandomOtp());
                  setPurposeTitle('التحقق من الهوية وتأكيد العمليات السريعة');
                  setValidity('صالح لمدة 15 دقيقة');
                }}
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  codeType === 'OTP'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رمز OTP سريع</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">6 أرقام عشوائية مؤمنة</div>
              </button>

              <button
                type="button"
                id="type-doc-auth-btn"
                onClick={() => {
                  setCodeType('DOCUMENT_AUTH');
                  setCodeValue(generateDocAuthCode());
                  setPurposeTitle('توثيق واعتماد شهادة محاسبية / تقرير معتمد');
                  setValidity('صالح للاعتماد الرسمي الدائم');
                }}
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  codeType === 'DOCUMENT_AUTH'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>كود اعتماد مستند</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">صيغة VER-2026-XXXX</div>
              </button>

              <button
                type="button"
                id="type-client-code-btn"
                onClick={() => {
                  setCodeType('CLIENT_CODE');
                  setCodeValue(activeClient?.code || `CL-2026-001`);
                  setPurposeTitle('كود ملف الشركة بالأرشيف المحاسبي');
                  setValidity('كود مرجعي دائم');
                }}
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  codeType === 'CLIENT_CODE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>كود ملف العميل</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">رقم السجل والملف</div>
              </button>

              <button
                type="button"
                id="type-custom-btn"
                onClick={() => {
                  setCodeType('CUSTOM');
                  setPurposeTitle('كود مخصص للعميل');
                }}
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  codeType === 'CUSTOM'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>كود مخصص حر</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">إدخال يدوي حر</div>
              </button>
            </div>

            {/* Code Input Display with Quick Generator Buttons */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-emerald-400 font-bold block mb-1">
                  قيمة الكود المراد إرساله (قابلة للتعديل والكتابة المباشرة):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="code-value-input"
                    type="text"
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    placeholder="اكتب أو ولد الكود هنا..."
                    className="w-full bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-lg font-mono text-base sm:text-lg font-black tracking-wider text-emerald-300 text-center outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer font-sans text-xs"
                    title="نسخ الكود"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Regenerators */}
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end border-t sm:border-t-0 sm:border-r border-slate-800 sm:pr-3 pt-2 sm:pt-0">
                <button
                  type="button"
                  id="btn-regen-otp"
                  onClick={() => setCodeValue(generateRandomOtp())}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  title="توليد OTP جديد"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد OTP</span>
                </button>
                <button
                  type="button"
                  id="btn-regen-doc-auth"
                  onClick={() => setCodeValue(generateDocAuthCode())}
                  className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-700 rounded-lg text-white font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  title="توليد كود توثيق معتمد"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>توليد VER</span>
                </button>
                {activeClient?.code && (
                  <button
                    type="button"
                    onClick={() => setCodeValue(activeClient.code!)}
                    className="px-2.5 py-1.5 bg-blue-800 hover:bg-blue-700 rounded-lg text-white font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                    title="كود ملف العميل"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>كود العميل</span>
                  </button>
                )}
              </div>
            </div>

            {/* Purpose & Presets */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                الغرض والبيان من الكود:
              </label>
              <input
                id="purpose-input"
                type="text"
                value={purposeTitle}
                onChange={(e) => setPurposeTitle(e.target.value)}
                placeholder="بيان الغرض من إرسال هذا الكود..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none text-xs"
              />

              {/* Quick Purpose Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  'تأكيد الدخول والاطلاع على الأرشيف الإلكتروني',
                  'اعتماد وتوثيق الشهادة المحاسبية الموجهة للبنك',
                  'تأكيد واستلام الإقرار الضريبي المعتمد',
                  'رمز تأكيد مطابقة الرصيد وكشف الحساب',
                  'رمز تأكيد تسليم الدفاتر والمستندات الأصلية',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setPurposeTitle(chip)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-700 border border-slate-200 dark:border-slate-700 rounded text-[10px] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Validity & Destination Entity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مدة الصلاحية:
                </label>
                <select
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none text-xs"
                >
                  <option value="صالح لمدة 15 دقيقة">صالح لمدة 15 دقيقة (رمز أمان فوري)</option>
                  <option value="صالح لمدة ساعة واحدة">صالح لمدة ساعة واحدة</option>
                  <option value="صالح لمدة 24 ساعة">صالح لمدة 24 ساعة</option>
                  <option value="صالح لمدة 7 أيام">صالح لمدة 7 أيام</option>
                  <option value="صالح للاعتماد الرسمي الدائم">صالح للاعتماد الرسمي الدائم</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الجهة الموجه إليها (اختياري):
                </label>
                <input
                  type="text"
                  value={targetEntity}
                  onChange={(e) => setTargetEntity(e.target.value)}
                  placeholder="مثال: البنك الأهلي المصري / مصلحة الضرائب"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live WhatsApp Message Preview */}
          <div className="bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>معاينة نص رسالة WhatsApp الرسمية التي ستصل للعميل:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyFullMessage}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedFullMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم نسخ الرسالة</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرسالة بالكامل</span>
                  </>
                )}
              </button>
            </div>

            {/* Message Bubble */}
            <div className="bg-[#E7FCE8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900 font-sans leading-relaxed text-xs shadow-inner whitespace-pre-line select-text">
              {messageText}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              رقم التواصل المدرج بالقالب:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">01003335360</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              id="btn-send-to-chat"
              onClick={handleRecordToChatOnly}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="إدراج الرسالة في سجل المحادثة الداخلي بالبرنامج فقط"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>إدراج بالسجل الداخلي</span>
            </button>

            <button
              type="button"
              id="btn-send-via-api"
              disabled={isSendingApi}
              onClick={handleSendViaServerApi}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="إرسال فوري عبر سيرفر WhatsApp API بالمنظومة"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSendingApi ? 'جارٍ الإرسال عبر API...' : 'إرسال فوري عبر سيرفر API'}</span>
            </button>

            <button
              type="button"
              id="btn-open-whatsapp-web"
              onClick={handleSendViaWhatsAppWeb}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="فتح تطبيق أو موقع WhatsApp لإرسال الرسالة للعميل"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
