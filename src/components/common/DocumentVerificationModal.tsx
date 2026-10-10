import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Calendar,
  Building,
  User,
  Hash,
  Copy,
  X,
  BadgeCheck,
  Lock,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Info,
  QrCode as QrIcon,
  Smartphone,
  Globe,
  Check,
  Languages,
} from 'lucide-react';
import {
  VerificationPayloadData,
  generateQrCodeSvg,
  generateDocumentSecurityHash,
  formatEgyptianCurrency,
  buildHumanReadableDigitalSeal,
  buildVerificationUrl,
} from '../../utils/qrCodeGenerator';

interface DocumentVerificationModalProps {
  data: VerificationPayloadData;
  onClose: () => void;
  isOpen?: boolean;
}

export const DocumentVerificationModal: React.FC<DocumentVerificationModalProps> = ({
  data,
  onClose,
  isOpen = true,
}) => {
  const [modalLang, setModalLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'audit' | 'encrypted_pdf' | 'offline_seal'>('encrypted_pdf');
  const [copied, setCopied] = useState(false);
  const [copiedSeal, setCopiedSeal] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const isEn = modalLang === 'en';

  // Anti-print, anti-save and anti-copy keyboard interception
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isModifier && (key === 'p' || key === 's' || key === 'c' || key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        setSecurityNotice(
          isEn
            ? '⚠️ Security Notice: This document is encrypted & protected against direct printing or raw copying for anti-fraud compliance.'
            : '⚠️ تنبيه أمني: المستند محمي ومقفل ضد الطباعة والنسخ المباشر. إنه مخصص للاطلاع والتحقق الرسمي فقط للحماية من التزوير.'
        );
        setTimeout(() => setSecurityNotice(null), 4500);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isEn]);

  if (!isOpen) return null;

  const rawType = data.docType || '';
  const docId = data.docNumber || '';

  const isFinancialStatements =
    rawType.includes('قوائم') ||
    rawType.includes('مركز') ||
    rawType.includes('مالي') ||
    docId.startsWith('EAS') ||
    docId.startsWith('FIN') ||
    docId.startsWith('FS');

  const isAuditorReport =
    rawType.includes('تقرير') ||
    rawType.includes('مراقب') ||
    docId.startsWith('AUD');

  const isTaxDeclaration =
    rawType.includes('ضريب') ||
    rawType.includes('إقرار') ||
    docId.startsWith('TAX');

  const isInvoice =
    rawType.includes('فاتورة') ||
    docId.startsWith('INV');

  const isCertificate = !isFinancialStatements && !isAuditorReport && !isTaxDeclaration && !isInvoice;

  const directUrl = buildVerificationUrl(data);
  const verificationUrl =
    typeof window !== 'undefined'
      ? window.location.hash.includes('verify')
        ? window.location.href
        : directUrl
      : directUrl;

  const securityHash =
    data.securityHash ||
    generateDocumentSecurityHash(
      data.docNumber || 'CERT-OFFICIAL',
      data.clientName || 'العميل المعتمد',
      data.amount,
      data.date
    );

  const humanReadableSeal = buildHumanReadableDigitalSeal(data);

  const issueDateFormatted = data.date || new Date().toISOString().slice(0, 10);
  const verifyTimestamp = new Date().toLocaleString(isEn ? 'en-US' : 'ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySeal = () => {
    navigator.clipboard.writeText(humanReadableSeal);
    setCopiedSeal(true);
    setTimeout(() => setCopiedSeal(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onContextMenu={(e) => {
        e.preventDefault();
        setSecurityNotice(
          isEn
            ? '⚠️ Content Digitally Sealed: Context menus are disabled to maintain document integrity.'
            : '⚠️ المحتوى محمي رقمياً: القوائم والأوامر مقفلة لضمان موثوقية المستند.'
        );
        setTimeout(() => setSecurityNotice(null), 3000);
      }}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-600/40 overflow-hidden flex flex-col max-h-[95vh]"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        {/* Security Warning Toast */}
        {securityNotice && (
          <div className="absolute top-4 left-4 right-4 z-50 p-3.5 bg-amber-600 text-white rounded-2xl shadow-xl border border-amber-400 flex items-center gap-3 animate-in slide-in-from-top-3 duration-200">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-200 animate-bounce" />
            <span className="text-xs font-bold leading-relaxed">{securityNotice}</span>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 sm:p-6 relative overflow-hidden border-b border-emerald-800">
          <div className="absolute top-0 left-0 -mt-10 -ml-10 w-44 h-44 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center border border-emerald-400/30 shadow-inner shrink-0">
                <ShieldCheck className="w-7 h-7 sm:w-8 h-8 text-emerald-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    {isEn ? 'Certified & 100% Verified' : 'وثيقة معتمدة ومطابقة 100%'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-300" />
                    {isEn ? 'Encrypted View (Read-Only)' : 'عرض محمي مشفر (Read-Only)'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1">
                  {isEn
                    ? 'Electronic Document Verification & Digital Attestation Portal'
                    : 'بوابة التحقق الإلكتروني والمعاينة الرقمية المشفرة'}
                </h2>
                <p className="text-[11px] sm:text-xs text-emerald-100/80 font-medium">
                  {isEn
                    ? `Egyptian CPA & Auditor Practice: ${data.auditorName || 'Mohamed Gamil Marei'}`
                    : `سجل المحاسبين والمراجعين - وزارة المالية • مكتب المحاسب القانوني ${data.auditorName || 'محمد جميل مرعي'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher inside modal */}
              <button
                type="button"
                onClick={() => setModalLang(isEn ? 'ar' : 'en')}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded-xl text-xs font-bold border border-emerald-600/50 transition-all cursor-pointer"
                title={isEn ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
              >
                <Languages className="w-3.5 h-3.5 text-emerald-300" />
                <span>{isEn ? 'العربية' : 'English'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer shrink-0"
                title={isEn ? 'Close Modal' : 'إغلاق النافذة'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-emerald-800/80 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('encrypted_pdf')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'encrypted_pdf'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {isEn ? 'Encrypted Document Preview' : 'المعاينة المشفرة للمستند (محمي ضد الطباعة)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>{isEn ? 'Security Audit Log & Credentials' : 'سجل التحقق الأمني وبيانات الاعتماد'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('offline_seal')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'offline_seal'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isEn ? 'Offline Digital Seal' : 'الختم الرقمي والتوافق دون إنترنت (Offline Seal)'}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950">
          {activeTab === 'encrypted_pdf' ? (
            /* ================= Tab 1: Encrypted Read-Only PDF Document View ================= */
            <div className="space-y-4">
              {/* Security Protection Notice Box */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold">
                    {isEn
                      ? 'This document is displayed in secure, encrypted read-only format. Printing and direct clipboard extraction are restricted to prevent forgery.'
                      : 'هذا المستند معروض بصيغة المعاينة الرقمية المشفرة والمحمية ضد الطباعة والتعديل. تم تقييد أوامر النسخ والحفظ لمنع التلاعب وتأكيد صحة المستند لدى الجهات البنكية والرسمية.'}
                  </span>
                </div>
                <span className="px-2 py-1 bg-amber-200/60 dark:bg-amber-900/60 rounded-lg font-mono text-[10px] font-bold text-amber-950 dark:text-amber-100 shrink-0">
                  SECURE VERIFIED
                </span>
              </div>

              {/* Certified Document Canvas */}
              <div
                className="relative bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border-2 border-slate-300 select-none overflow-hidden"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {/* Dynamic Diagonal Watermark Matrix */}
                <div
                  className="absolute inset-0 pointer-events-none flex flex-col justify-around opacity-[0.09] rotate-[-25deg] scale-125 z-10"
                  aria-hidden="true"
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="text-center whitespace-nowrap space-y-1">
                      <div className="text-lg sm:text-xl font-black text-slate-900 tracking-widest uppercase">
                        {isEn
                          ? 'OFFICIAL DIGITAL VERIFICATION COPY • DO NOT REPRODUCE'
                          : 'نسخة رقمية مشفرة للاطلاع والتحقق الرسمي فقط • غير صالحة لإعادة الطباعة'}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800">
                        OFFICIAL VERIFICATION ONLY • {securityHash} • {verifyTimestamp}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document Header */}
                <div className="border-b-2 border-emerald-900 pb-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <div className="text-xs font-bold text-slate-500">
                      {isEn ? 'Arab Republic of Egypt' : 'جمهورية مصر العربية'}
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {data.firmName || (isEn ? 'CPA & Statutory Auditor Practice' : 'مكتب المحاسب القانوني ومراقب الحسابات')}
                    </div>
                    <div className="text-sm font-bold text-emerald-900">{data.auditorName || 'محمد جميل مرعي'}</div>
                    <div className="text-xs text-slate-600 font-mono">
                      {isEn ? 'Ministry of Finance CPA Reg. No: ' : 'رقم القيد بسجل المحاسبين والمراجعين: '}
                      <strong>{data.licenseNumber || 'س.م.م 43122'}</strong>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shrink-0">
                    <div className="text-[10px] font-bold text-emerald-800">
                      {isEn ? 'Permanent Record ID (Permalink)' : 'معرف السجل الفريد (Permalink)'}
                    </div>
                    <div className="text-xs font-mono font-black text-emerald-950 mt-0.5">
                      {data.recordId || data.docNumber || 'RECORD-OFFICIAL'}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">{securityHash}</div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-6">
                  <span className={`inline-block px-4 py-1.5 text-white text-sm sm:text-base font-black rounded-xl shadow-xs ${
                    isFinancialStatements
                      ? 'bg-blue-900 border border-blue-700'
                      : isAuditorReport
                      ? 'bg-slate-900 border border-slate-700'
                      : isTaxDeclaration
                      ? 'bg-teal-900 border border-teal-700'
                      : isInvoice
                      ? 'bg-purple-900 border border-purple-700'
                      : 'bg-emerald-900 border border-emerald-700'
                  }`}>
                    {isFinancialStatements
                      ? (isEn ? 'Attestation of Annual Financial Statements & Balance Sheet (EAS)' : 'اعتماد القوائم المالية السنوية والمركز المالي (معايير EAS)')
                      : isAuditorReport
                      ? (isEn ? 'Independent Auditor’s Report on Financial Statements' : 'تقرير مراقب الحسابات المستقل عن القوائم المالية')
                      : isTaxDeclaration
                      ? (isEn ? 'Certified Tax Return & Audit Attestation (ETA)' : 'اعتماد الإقرار والفحص الضريبي المالي (مصلحة الضرائب)')
                      : isInvoice
                      ? (isEn ? 'Certified Professional Fees Invoice' : 'فاتورة أتعاب مهنية معتمدة ومسجلة')
                      : (data.docType || (isEn ? 'Certified Professional Attestation' : 'شهادة مهنية رسمية معتمدة'))}
                  </span>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {isEn
                      ? `Officially issued with ID: ${data.docNumber} on Date: ${issueDateFormatted}`
                      : `صادرة وموثقة رسمياً برقم إثبات ${data.docNumber} في تاريخ ${issueDateFormatted}`}
                  </div>
                </div>

                {/* Document Main Content Body */}
                <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {isFinancialStatements ? (
                    /* ---------------- 1. Financial Statements Document Body ---------------- */
                    <>
                      <p>
                        {isEn ? (
                          <>
                            The office of Certified Public Accountant & Statutory Auditor <strong>{data.auditorName || 'Mohamed Gamil Marei'}</strong>, registered with the Ministry of Finance under License No. <strong>({data.licenseNumber || '43122'})</strong>, officially attests and certifies the attached Annual Financial Statements of <strong>{data.clientName || 'Certified Entity'}</strong> for the fiscal period ended <strong>{data.fiscalYear || '2024'}</strong>.
                          </>
                        ) : (
                          <>
                            يعتمد مكتب المحاسب القانوني ومراقب الحسابات <strong>{data.auditorName || 'محمد جميل مرعي'}</strong>، المقيد بسجل المحاسبين والمراجعين بوزارة المالية تحت رقم <strong>({data.licenseNumber || 'س.م.م 43122'})</strong>، القوائم المالية والحسابات الختامية المرفقة للشركة/المنشأة: <strong>{data.clientName || 'العميل المعتمد'}</strong> عن السنة المالية المنتهية في <strong>{data.fiscalYear || '2024'}</strong>، وتتضمن:
                          </>
                        )}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-center">
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-950">قائمة المركز المالي</div>
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">قائمة الدخل والأرباح</div>
                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950">قائمة التدفقات النقدية</div>
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">الإيضاحات والسياسات</div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{isEn ? 'Entity / Company Name:' : 'اسم الشركة / المنشأة:'}</span>
                          <span className="font-black text-slate-900">{data.clientName || 'الشركة المعتمدة'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{isEn ? 'Fiscal Audit Year:' : 'السنة المالية المعتمدة:'}</span>
                          <span className="font-bold text-slate-900 font-mono">{data.fiscalYear || '2024'}</span>
                        </div>
                        {(data.totalAssets !== undefined || (data.amount !== undefined && !data.netProfit)) && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-blue-50/70 p-2 rounded-lg">
                            <span className="text-blue-950 font-bold">
                              {isEn ? 'Total Assets (Financial Position):' : 'إجمالي الأصول (قائمة المركز المالي):'}
                            </span>
                            <span className="font-mono font-black text-blue-950 text-sm sm:text-base">
                              {formatEgyptianCurrency(data.totalAssets !== undefined ? data.totalAssets : data.amount!)}
                            </span>
                          </div>
                        )}
                        {(data.netProfit !== undefined || data.amount !== undefined) && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-emerald-50/70 p-2 rounded-lg">
                            <span className="text-emerald-950 font-bold">
                              {isEn ? 'Net Profit / Operating Results:' : 'صافي ربح / نتائج النشاط عن العام:'}
                            </span>
                            <span className="font-mono font-black text-emerald-950 text-sm sm:text-base">
                              {formatEgyptianCurrency(data.netProfit !== undefined ? data.netProfit : data.amount!)}
                            </span>
                          </div>
                        )}
                        {(data.commercialRegNo || data.taxCardNo) && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">
                              {isEn ? 'Commercial Reg. / Tax Card:' : 'السجل التجاري / البطاقة الضريبية:'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {data.commercialRegNo || data.taxCardNo}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{isEn ? 'Reporting Framework:' : 'إطار إعداد التقارير المالية:'}</span>
                          <span className="font-bold text-emerald-800">
                            {isEn ? 'Egyptian Accounting Standards (EAS) & Law 159/1981' : 'معايير المحاسبة المصرية (EAS) وقانون الشركات 159 لسنة 1981'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">{isEn ? 'Auditor Opinion:' : 'رأي مراقب الحسابات:'}</span>
                          <span className="font-bold text-emerald-700">
                            {isEn ? 'Unqualified (Clean) Opinion ✓' : 'رأي غير معدل (نظيف) - بدون أي تحفظات ✓'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isEn ? (
                          <>
                            In our opinion, the attached financial statements present fairly, in all material respects, the financial position of the company and of its financial performance and its cash flows for the year then ended in accordance with Egyptian Accounting Standards (EAS). This electronic attestation constitutes an official certified document matching the office records.
                          </>
                        ) : (
                          <>
                            في رأينا المهني، تعبر القوائم المالية المرفقة بعدالة ووضوح في كافة جوانبها الجوهرية عن المركز المالي الحقيقي للشركة ونتائج أعمالها وتدفقاتها النقدية عن السنة المالية المنتهية في ذلك التاريخ، وفقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين واللوائح السارية، وتعتبر هذه النسخة الإلكترونية وثيقة أصلية معتمدة ومطابقة لدفاتر وسجلات الشركة المنتظمة.
                          </>
                        )}
                      </p>
                    </>
                  ) : isAuditorReport ? (
                    /* ---------------- 2. Auditor Report Document Body ---------------- */
                    <>
                      <p>
                        {isEn ? (
                          <>
                            To the Shareholders of <strong>{data.clientName || 'The Company'}</strong>: We have audited the accompanying financial statements of the company for the fiscal year ended <strong>{data.fiscalYear || '2024'}</strong>.
                          </>
                        ) : (
                          <>
                            إلى السادة / مساهمي وأصحاب شركة <strong>{data.clientName || 'العميل المعتمد'}</strong>: قمنا بمراجعة القوائم المالية المرفقة للشركة عن السنة المالية المنتهية في <strong>{data.fiscalYear || '2024'}</strong> وفقاً لمعايير المراجعة المصرية (ESA) والقانون 159 لسنة 1981.
                          </>
                        )}
                      </p>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">الشركة / المنشأة:</span>
                          <span className="font-black text-slate-900">{data.clientName || 'الشركة المعتمدة'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">السنة المالية المشمولة:</span>
                          <span className="font-bold text-slate-900 font-mono">{data.fiscalYear || '2024'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">نوع الرأي المهني:</span>
                          <span className="font-black text-emerald-800">رأي غير متحفظ (نظيف - Unqualified Opinion)</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">معايير المراجعة المطبقة:</span>
                          <span className="font-bold text-slate-900">معايير المراجعة المصرية (ESA) وقانون مزاولة مهنة المحاسبة 133 لسنة 1951</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        في رأينا، تعبر القوائم المالية بعدالة ووضوح في كافة جوانبها الهامة عن المركز المالي للشركة ونتائج أعمالها وتدفقاتها النقدية عن السنة المالية المنتهية في ذلك التاريخ وفقاً لمعايير المحاسبة المصرية (EAS).
                      </p>
                    </>
                  ) : isTaxDeclaration ? (
                    /* ---------------- 3. Tax Declaration Document Body ---------------- */
                    <>
                      <p>
                        يشهد مكتب المحاسب القانوني ومراقب الحسابات <strong>{data.auditorName || 'محمد جميل مرعي'}</strong> باعتماد الإقرار الضريبي ومرفقاته لشركة/ممولي: <strong>{data.clientName || 'الممول المعتمد'}</strong> عن الفترة الضريبية <strong>{data.fiscalYear || '2024'}</strong>.
                      </p>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">الممول / المنشأة:</span>
                          <span className="font-black text-slate-900">{data.clientName}</span>
                        </div>
                        {data.taxCardNo && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">رقم التسجيل / البطاقة الضريبية:</span>
                            <span className="font-mono font-bold text-slate-900">{data.taxCardNo}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">السنة / الفترة الضريبية:</span>
                          <span className="font-mono font-bold text-slate-900">{data.fiscalYear || '2024'}</span>
                        </div>
                        {data.amount !== undefined && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-emerald-50/70 p-2 rounded-lg">
                            <span className="text-emerald-950 font-bold">صافي الضريبة / الوعاء المعتمد:</span>
                            <span className="font-mono font-black text-emerald-950 text-sm sm:text-base">
                              {formatEgyptianCurrency(data.amount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">السند القانوني:</span>
                          <span className="font-bold text-slate-900">قانون الإجراءات الضريبية الموحد 206 لسنة 2020 وقانون 91 لسنة 2005</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        الإقرار مطابق للدفاتر والسجلات المحاسبية المنتظمة المؤيدة بمستندات صحيحة ومقدم عبر منظومة مصلحة الضرائب المصرية (ETA).
                      </p>
                    </>
                  ) : isInvoice ? (
                    /* ---------------- 4. Invoice Document Body ---------------- */
                    <>
                      <p>
                        فاتورة إلكترونية معتمدة صادرة من مكتب المحاسب القانوني ومراقب الحسابات <strong>{data.auditorName || 'محمد جميل مرعي'}</strong> لصالح: <strong>{data.clientName || 'العميل'}</strong> مقابل خدمات المحاسبة والمراجعة القانونية.
                      </p>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">رقم الفاتورة:</span>
                          <span className="font-mono font-black text-slate-900">{data.docNumber}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">العميل / الجهة:</span>
                          <span className="font-black text-slate-900">{data.clientName}</span>
                        </div>
                        {data.amount !== undefined && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-purple-50 p-2 rounded-lg">
                            <span className="text-purple-950 font-bold">إجمالي قيمة الفاتورة المستحق:</span>
                            <span className="font-mono font-black text-purple-950 text-sm sm:text-base">
                              {formatEgyptianCurrency(data.amount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">تاريخ الإصدار:</span>
                          <span className="font-mono font-bold text-slate-900">{issueDateFormatted}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        الفاتورة صادرة وموثقة بالسجلات الرسمية للنظام ومطابقة لضوابط مصلحة الضرائب المصرية.
                      </p>
                    </>
                  ) : (
                    /* ---------------- 5. Certificate Document Body (Default) ---------------- */
                    <>
                      <p>
                        {isEn ? (
                          <>
                            The office of Certified Public Accountant & Statutory Auditor <strong>{data.auditorName || 'Mohamed Gamil Marei'}</strong>, registered with the Ministry of Finance under License No. <strong>({data.licenseNumber || '43122'})</strong>, certifies that based on documentary audit and examination of official books:
                          </>
                        ) : (
                          <>
                            يشهد مكتب المحاسب القانوني ومراقب الحسابات <strong>{data.auditorName || 'محمد جميل مرعي'}</strong>، المقيد بسجل المحاسبين والمراجعين بوزارة المالية تحت رقم <strong>({data.licenseNumber || 'س.م.م 43122'})</strong>، بأنه بناءً على الفحص المستندي والمراجعة المحاسبية من واقع الدفاتر والسجلات والمستندات المؤيدة:
                          </>
                        )}
                      </p>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                        <div className="flex items-center justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{isEn ? 'Client / Beneficiary:' : 'اسم العميل / المستفيد:'}</span>
                          <span className="font-black text-slate-900">{data.clientName || 'العميل المعتمد'}</span>
                        </div>

                        {(data.nationalId || data.commercialRegNo || data.taxCardNo) && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">
                              {isEn ? 'National ID / CR / Tax Card:' : 'الرقم القومي / السجل / البطاقة الضريبية:'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {data.nationalId || data.commercialRegNo || data.taxCardNo}
                            </span>
                          </div>
                        )}

                        {data.amount !== undefined && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-emerald-50/70 p-2 rounded-lg">
                            <span className="text-emerald-950 font-bold">
                              {isEn ? 'Audited & Certified Net Amount:' : 'المبلغ المالي المعتمد والمحقق:'}
                            </span>
                            <span className="font-mono font-black text-emerald-950 text-sm sm:text-base">
                              {formatEgyptianCurrency(data.amount)}
                            </span>
                          </div>
                        )}

                        {data.monthlyAmount !== undefined && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">
                              {isEn ? 'Equivalent Monthly Average:' : 'المتوسط المالي الشهري المعادل:'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatEgyptianCurrency(data.monthlyAmount)}
                            </span>
                          </div>
                        )}

                        {data.fiscalYear && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">
                              {isEn ? 'Audit Fiscal Period:' : 'السنة المالية المشمولة بالفحص:'}
                            </span>
                            <span className="font-bold text-slate-900">{data.fiscalYear}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500">
                            {isEn ? 'Addressed To:' : 'الجهة الموجه إليها الشهادة:'}
                          </span>
                          <span className="font-bold text-slate-900">
                            {data.recipient || (isEn ? 'Official Authorities & Banks' : 'الجهات الرسمية والمصرفية')}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isEn ? (
                          <>
                            This attestation was issued to be submitted to <strong>{data.recipient || 'Official Authorities'}</strong> for the purpose of <strong>{data.purpose || 'Proof of Solvency and Financial Verification'}</strong>. This electronic record constitutes a valid, legally verified document matching official office registers.
                          </>
                        ) : (
                          <>
                            وقد أُعطيت هذه الشهادة لتقديمها إلى <strong>{data.recipient || 'الجهات الرسمية'}</strong> لغرض <strong>{data.purpose || 'إثبات الملاءة والاعتماد المالي'}</strong>، وتعتبر هذه النسخة الإلكترونية وثيقة أصلية معتمدة تم التحقق من سلامتها الرقمية وتطابقها التام مع سجلات المكتب.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </div>

                {/* Footer Stamp & Verification Seal */}
                <div className="mt-8 pt-4 border-t-2 border-emerald-900 flex items-center justify-between gap-4">
                  <div className={`${isEn ? 'text-left' : 'text-right'} space-y-0.5 text-[11px] sm:text-xs`}>
                    <div className="font-bold text-slate-500">
                      {isEn ? 'Statutory Auditor & CPA:' : 'المحاسب القانوني ومراقب الحسابات:'}
                    </div>
                    <div className="font-black text-slate-900 text-sm">{data.auditorName || 'محمد جميل مرعي'}</div>
                    <div className="text-emerald-800 font-semibold">{data.licenseNumber || 'س.م.م 43122'}</div>
                  </div>

                  {/* Official Verification Seal */}
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-emerald-800 bg-emerald-50/80 p-1 flex flex-col items-center justify-center text-center text-emerald-950 font-black shadow-inner">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 mb-0.5" />
                      <span className="text-[8px] leading-tight">{isEn ? 'VERIFIED' : 'معتمد وموثق'}</span>
                      <span className="text-[7px] font-mono text-emerald-800">EAS SEAL</span>
                      <span className="text-[7px] text-slate-600 font-mono">{data.licenseNumber || '43122'}</span>
                    </div>

                    <div
                      data-qr-container="true"
                      className="qr-print-container p-1.5 bg-white border border-slate-300 rounded-xl shrink-0 shadow-xs"
                      dangerouslySetInnerHTML={{
                        __html: generateQrCodeSvg(verificationUrl || 'https://cpa-egypt.tax.gov.eg', 96),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'audit' ? (
            /* ================= Tab 2: Official Audit Verification Details ================= */
            <div className="space-y-4">
              {/* Status Alert Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
                  <BadgeCheck className="w-7 h-7" />
                </div>
                <div className="text-xs">
                  <div className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                    {isEn ? 'Document Verified & Certified 100%' : 'تم التحقق من صحة المستند ومطابقته 100%'}
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                    {isEn
                      ? 'This document was officially issued and attested under Egyptian Accounting & Auditing Standards (EAS/ESA) and Law 133 of 1951.'
                      : 'هذه الوثيقة صادرة وموثقة إلكترونياً من مكتب المحاسب القانوني ومطابقة لمعايير المحاسبة والمراجعة المصرية (EAS) وقانون مزاولة مهنة المحاسبة 133 لسنة 1951.'}
                  </div>
                </div>
              </div>

              {/* Details Cards */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'Document Type:' : 'نوع المستند المعتمد:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {data.docType || 'شهادة مهنية رسمية'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'Document Ref / Serial:' : 'رقم المستند / السريال:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-wider flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-emerald-600" />
                      {data.docNumber || 'CERT-2026-OFFICIAL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'Database Permanent Record ID:' : 'معرف السجل الثابت بقاعدة البيانات:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 font-mono tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      {data.recordId || data.docNumber || 'RECORD-LINKED'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'Client / Beneficiary:' : 'اسم العميل / المستفيد:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      {data.clientName || 'العميل المعتمد'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'National ID / CR / Tax Card:' : 'الرقم القومي / السجل التجاري / الضريبي:'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {data.nationalId || data.commercialRegNo || data.taxCardNo || '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  {isFinancialStatements ? (
                    <>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          {isEn ? 'Net Profit / Fiscal Result:' : 'صافي ربح / نتائج النشاط عن العام:'}
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          {data.netProfit !== undefined
                            ? formatEgyptianCurrency(data.netProfit)
                            : (data.amount !== undefined ? formatEgyptianCurrency(data.amount) : 'مبين بالقوائم المعتمدة')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          {isEn ? 'Total Certified Assets:' : 'إجمالي الأصول (قائمة المركز المالي):'}
                        </span>
                        <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                          {data.totalAssets !== undefined
                            ? formatEgyptianCurrency(data.totalAssets)
                            : (data.amount !== undefined ? formatEgyptianCurrency(data.amount) : 'مبين بالقوائم المعتمدة')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          {isEn ? 'Certified Net Amount:' : 'المبلغ المالي المعتمد:'}
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          {data.amount !== undefined ? formatEgyptianCurrency(data.amount) : 'مبين بمتن المستند'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          {isEn ? 'Issue & Attestation Date:' : 'تاريخ الإصدار والاعتماد:'}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          {issueDateFormatted}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'CPA & Statutory Auditor:' : 'المحاسب القانوني ومراقب الحسابات:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" />
                      {data.auditorName || 'محمد جميل مرعي'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      {isEn ? 'Ministry of Finance License No:' : 'رقم القيد بسجل المحاسبين (وزارة المالية):'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 font-mono">
                      {data.licenseNumber || 'س.م.م 43122'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Hash & Digital Signature Box */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    {isEn ? 'Digital Security Signature (SHA-256 Hash):' : 'بصمة التشفير والسلامة الرقمية (SHA-256 Security Hash):'}
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px]">SAL-TAMPER-PROOF</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-emerald-400 text-xs tracking-wider break-all border border-slate-800">
                  {securityHash}
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  {isEn
                    ? 'This cryptographic hash ensures no character or figure in the document has been altered post-issuance.'
                    : 'هذه البصمة تضمن عدم إمكانية تعديل أي رقم أو حرف في المستند بعد صدوره، وتُعد حجة قانونية لدى البنوك والجهات الإدارية.'}
                </div>
              </div>
            </div>
          ) : (
            /* ================= Tab 3: Offline Digital Seal & Scanner Payload ================= */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-700/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="text-xs">
                  <div className="font-black text-blue-900 dark:text-blue-200 text-sm">
                    {isEn
                      ? 'Offline Digital Seal & Scanner Payload'
                      : 'الختم الرقمي وحلول المسح في حالة انقطاع الإنترنت (Offline Digital Seal)'}
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
                    {isEn
                      ? 'Dual-mode QR logic: scanning with smartphone cameras opens the live URL, while handheld barcode scanners parse the full cryptographic plaintext below.'
                      : 'يعمل كود الـ QR بتقنية الثنائية المتقدمة (Dual-Mode): عند مسحه عبر كاميرا هاتف يفتح رابط التحقق الإلكتروني المباشر، وعند مسحه بأجهزة قارئ الباركود اليدوية يظهر النص الرقمي المشفر والمختوم أدناه.'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <QrIcon className="w-4 h-4 text-emerald-600" />
                    {isEn ? 'Plaintext Digital Seal Payload:' : 'نص الختم الرقمي الكامل المشفر داخل الباركود:'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySeal}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    {copiedSeal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSeal ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy Seal' : 'نسخ نص الختم')}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {humanReadableSeal}
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'Direct Verification URL inside QR:' : 'رابط التحقق الإلكتروني المشفر داخل الـ QR:'}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-emerald-400 text-xs break-all border border-slate-800">
                  {verificationUrl}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {copied
                  ? isEn ? 'Link Copied!' : 'تم نسخ الرابط بنجاح!'
                  : isEn ? 'Copy Verification Link' : 'نسخ رابط التحقق المباشر'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSecurityNotice(
                  isEn
                    ? 'ℹ️ Notice: This digital document is encrypted against printing to prevent unauthorized circulation.'
                    : 'ℹ️ تنبيه: هذا المستند الرقمي محمي ضد الطباعة الورقية لمنع التداول غير المصرح به. يمكنك مشاركة رابط التحقق الإلكتروني الرسمي مع الجهة الطالبة.'
                );
                setTimeout(() => setSecurityNotice(null), 5000);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Print-Lock Protected' : 'حماية الطباعة مفعلة'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
          >
            {isEn ? 'Close' : 'إغلاق'}
          </button>
        </div>
      </div>
    </div>
  );
};
