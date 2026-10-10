import React, { useState, useEffect } from 'react';
import {
  Printer,
  Sliders,
  Edit3,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Building2,
  X,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { generateQrCodeSvg } from '../../utils/qrCodeGenerator';
import { PrintService } from '../../services/PrintService';
import { PrintExportControlModal } from './PrintExportControlModal';
import { MgBrandBadge } from './MgBrandBadge';

interface PrintLayoutWrapperProps {
  id?: string;
  documentTitle?: string;
  title?: string;
  documentSubtitle?: string;
  documentRefNumber?: string;
  documentDate?: string;
  companyName?: string;
  companyTaxNumber?: string;
  companyCommercialReg?: string;
  clientCode?: string;
  fiscalYear?: number | string;
  qrPayload?: string;
  children: React.ReactNode;
  showSignatureStamp?: boolean;
  notes?: string;
  isOpen?: boolean;
  onClose?: () => void;
  watermarkText?: string;
  verificationPayload?: any;
}

export const PrintLayoutWrapper: React.FC<PrintLayoutWrapperProps> = ({
  id = 'printable-report-content',
  documentTitle,
  title,
  documentSubtitle,
  documentRefNumber,
  documentDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
  companyName,
  companyTaxNumber,
  companyCommercialReg,
  clientCode,
  fiscalYear = '2026',
  qrPayload,
  children,
  showSignatureStamp = true,
  notes,
  isOpen,
  onClose,
  watermarkText,
  verificationPayload: customVerificationPayload,
}) => {
  const initialEffectiveTitle = documentTitle || title || 'تقرير مالي معتمد';

  // Load office profile and print settings
  const stateProfile = db.getState().officeProfile;
  const [printSettings, setPrintSettings] = useState(PrintService.getSettings());
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [isHeaderEditBarOpen, setIsHeaderEditBarOpen] = useState(false);
  const [headerSaveSuccess, setHeaderSaveSuccess] = useState(false);

  // Editable header state for instant, on-the-fly customization before printing
  const [editableOfficeName, setEditableOfficeName] = useState(
    stateProfile?.firmName || stateProfile?.auditorName || 'مكتب المحاسب القانوني / محمد جميل مرعي'
  );
  const [editableOfficeTitle, setEditableOfficeTitle] = useState(
    stateProfile?.title || 'محاسب ومراجع قانوني - خبير ضرائب واستشارات مالية'
  );
  const [editableLicense, setEditableLicense] = useState(
    stateProfile?.licenseNumber || 'سجل المحاسبين والمراجعين رقم 43122'
  );
  const [editableTaxNumber, setEditableTaxNumber] = useState(
    stateProfile?.taxAuthorityRegNo || '654-987-321'
  );
  const [editablePhone, setEditablePhone] = useState(
    stateProfile?.phone || stateProfile?.mobile || '01003335360'
  );
  const [editableDocTitle, setEditableDocTitle] = useState(initialEffectiveTitle);
  const [editableDocSubtitle, setEditableDocSubtitle] = useState(documentSubtitle || '');
  const [editableCompanyName, setEditableCompanyName] = useState(companyName || '');
  const [editableDocDate, setEditableDocDate] = useState(documentDate);
  const [editableRefNumber, setEditableRefNumber] = useState(documentRefNumber || '');

  // Keep state in sync if incoming props change
  useEffect(() => {
    if (documentTitle || title) setEditableDocTitle(documentTitle || title || 'تقرير مالي معتمد');
    if (documentSubtitle !== undefined) setEditableDocSubtitle(documentSubtitle);
    if (companyName !== undefined) setEditableCompanyName(companyName);
    if (documentDate !== undefined) setEditableDocDate(documentDate);
    if (documentRefNumber !== undefined) setEditableRefNumber(documentRefNumber);
  }, [documentTitle, title, documentSubtitle, companyName, documentDate, documentRefNumber]);

  const handleSaveHeaderAsDefault = () => {
    db.updateOfficeProfile({
      firmName: editableOfficeName,
      title: editableOfficeTitle,
      licenseNumber: editableLicense,
      taxAuthorityRegNo: editableTaxNumber,
      phone: editablePhone,
    });
    setHeaderSaveSuccess(true);
    setTimeout(() => setHeaderSaveSuccess(false), 3000);
  };

  const handleResetHeaderToDefaults = () => {
    const currentProfile = db.getState().officeProfile;
    setEditableOfficeName(
      currentProfile?.firmName || currentProfile?.auditorName || 'مكتب المحاسب القانوني / محمد جميل مرعي'
    );
    setEditableOfficeTitle(
      currentProfile?.title || 'محاسب ومراجع قانوني - خبير ضرائب واستشارات مالية'
    );
    setEditableLicense(
      currentProfile?.licenseNumber || 'سجل المحاسبين والمراجعين رقم 43122'
    );
    setEditableTaxNumber(currentProfile?.taxAuthorityRegNo || '654-987-321');
    setEditablePhone(currentProfile?.phone || currentProfile?.mobile || '01003335360');
    setEditableDocTitle(initialEffectiveTitle);
    setEditableDocSubtitle(documentSubtitle || '');
    setEditableCompanyName(companyName || '');
    setEditableDocDate(documentDate);
    setEditableRefNumber(documentRefNumber || '');
  };

  const handleExecutePrint = () => {
    PrintService.printElementById(id, {
      title: editableDocTitle,
      orientation: printSettings.orientation === 'LANDSCAPE' ? 'landscape' : 'portrait',
      pageSize: printSettings.paperSize || 'A4',
      margins: printSettings.margins || 'DEFAULT',
      showLetterhead: printSettings.includeLetterhead !== false,
      showStamp: printSettings.includeSignatureStamp !== false && showSignatureStamp,
      showQr: printSettings.includeQrVerification !== false,
    });
  };

  if (isOpen === false) return null;

  const verificationPayload =
    (typeof customVerificationPayload === 'string' ? customVerificationPayload : null) ||
    qrPayload ||
    `OFFICE: ${editableOfficeName} | DOC: ${editableDocTitle} | REF: ${editableRefNumber || 'N/A'} | DATE: ${editableDocDate} | CLIENT: ${editableCompanyName || 'عام'} | AUTH: LIC-43122-VERIFIED`;

  const content = (
    <div
      id={id}
      className="bg-white text-slate-900 p-8 sm:p-10 max-w-5xl mx-auto rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 relative"
    >
      {watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
          <span className="text-6xl font-black rotate-[-25deg]">{watermarkText}</span>
        </div>
      )}

      {/* Official Header */}
      {printSettings.includeLetterhead !== false && (
        <div className="official-header border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            {/* Right side: Office Info & Optional Logo */}
            <div className="flex items-start gap-3.5 text-right">
              {stateProfile?.showLogo !== false && (
                <div className="shrink-0 pt-0.5">
                  {stateProfile?.logoUrl ? (
                    <img
                      src={stateProfile.logoUrl}
                      alt="شعار المكتب"
                      className="object-contain rounded-lg border border-slate-200 p-0.5"
                      style={{
                        width: `${printSettings.logoSizePx || 60}px`,
                        height: `${printSettings.logoSizePx || 60}px`,
                      }}
                    />
                  ) : stateProfile?.logoType === 'MOHAMED_GAMIL_GOLD' ? (
                    <MgBrandBadge size="md" interactive={false} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black flex items-center justify-center border border-amber-500/40 shadow-xs">
                      MG
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  {editableOfficeName}
                </h1>
                <p className="text-xs font-bold text-emerald-800">
                  {editableOfficeTitle}
                </p>
                {printSettings.includeOfficeTaxInfo !== false && (
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                    <div>
                      <span className="font-semibold text-slate-800">ترخيص المزاولة:</span>{' '}
                      <span className="font-mono">{editableLicense}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>
                        <span className="font-semibold text-slate-800">ب.ض:</span>{' '}
                        <span className="font-mono">{editableTaxNumber}</span>
                      </span>
                      <span>•</span>
                      <span>
                        <span className="font-semibold text-slate-800">هاتف:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{editablePhone}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Left side: QR Code & Verification Stamp */}
            {printSettings.includeQrVerification !== false && (
              <div
                data-qr-container="true"
                data-qr="true"
                className="qr-verification qr-print-container flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 shrink-0"
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(verificationPayload, printSettings.qrSizePx || 88),
                  }}
                />
                <span className="text-[8.5px] font-mono font-bold text-slate-600 mt-0.5">وثيقة موثقة رقمياً</span>
              </div>
            )}
          </div>

          {/* Title Bar */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/80 px-4 py-2.5 rounded-xl">
            <div>
              <h2 className="text-base font-black text-slate-900">{editableDocTitle}</h2>
              {editableDocSubtitle && <p className="text-xs text-slate-500">{editableDocSubtitle}</p>}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-700">
              {editableRefNumber && (
                <span className="font-mono font-bold px-2 py-0.5 bg-white border border-slate-200 rounded">
                  مرجع: {editableRefNumber}
                </span>
              )}
              <span className="font-mono">التاريخ: {editableDocDate}</span>
            </div>
          </div>

          {/* Target Company / Client Info Header (If applicable) */}
          {editableCompanyName && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-50/50 border border-emerald-200/60 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">المنشأة / العميل:</span>
                <span className="font-bold text-slate-900">{editableCompanyName}</span>
              </div>
              {clientCode && (
                <div>
                  <span className="text-slate-500 block text-[10px]">كود العميل:</span>
                  <span className="font-mono font-bold text-slate-800">{clientCode}</span>
                </div>
              )}
              {companyTaxNumber && (
                <div>
                  <span className="text-slate-500 block text-[10px]">رقم التسجيل الضريبي:</span>
                  <span className="font-mono text-slate-800">{companyTaxNumber}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block text-[10px]">السنة المالية:</span>
                <span className="font-mono font-bold text-emerald-800">{fiscalYear}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Document Content */}
      <div className="min-h-[250px]">{children}</div>

      {/* Notes / Disclaimers */}
      {notes && (
        <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <span className="font-bold text-slate-800 block mb-0.5">ملاحظات وإيضاحات:</span>
          <p>{notes}</p>
        </div>
      )}

      {/* Official Footer & Signature Stamp */}
      {showSignatureStamp && printSettings.includeSignatureStamp !== false && (
        <div
          data-stamp="true"
          className="official-stamp mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs"
        >
          <div className="text-right space-y-1">
            <span className="text-slate-500 block">إعداد ومراجعة:</span>
            <span className="font-bold text-slate-800">قسم الحسابات والمراجعة الفنية</span>
            <div className="text-[10px] text-slate-400 font-mono">نظام التدقيق الرقمي المعتمد</div>
          </div>

          <div className="text-left space-y-1.5 flex flex-col items-end">
            <span className="text-slate-500 block text-right">المحاسب القانوني المعتمد:</span>
            <span className="font-bold text-slate-900 text-right">{editableOfficeName}</span>
            <div className="w-36 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-[10px] bg-slate-50/50">
              (خاتم وتوقيع المحاسب القانوني)
            </div>
          </div>
        </div>
      )}

      {/* Print Page Footer */}
      {printSettings.showDocumentTimestamp !== false && (
        <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>طُبعت هذه الوثيقة آلياً من المنظومة المحاسبية المعتمدة</span>
          <span className="font-mono">{new Date().toISOString().replace('T', ' ').substring(0, 19)}</span>
        </div>
      )}
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto no-print">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-300 dark:border-slate-800 no-print flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  معاينة طباعة الوثيقة
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {editableDocTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Instant Header Edit Toggle Button */}
              <button
                type="button"
                onClick={() => setIsHeaderEditBarOpen(!isHeaderEditBarOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isHeaderEditBarOpen
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60'
                }`}
                title="تعديل فوري وسريع لترويسة الوثيقة قبل إرسالها للطابعة"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الترويسة فوري {isHeaderEditBarOpen ? '▲' : '▼'}</span>
              </button>

              {/* Print & Export Settings Button */}
              <button
                type="button"
                onClick={() => setIsPrintSettingsOpen(true)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="تخصيص أساليب الطباعة، إظهار/إخفاء الـ QR، شكل الختم والهوامش"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>إعدادات الطباعة والـ QR</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handleExecutePrint}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الوثيقة الآن</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>

          {/* Instant Header Edit Bar (Collapsible Quick Customizer) */}
          {isHeaderEditBarOpen && (
            <div className="no-print bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 mb-4 space-y-3 shrink-0 text-xs animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                    تعديل ترويسة التقرير فورياً لهذه الطباعة (تنطبق التعديلات لحظياً على الورقة أدناه):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {headerSaveSuccess && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم الحفظ كافتراضي للمكتب ✓
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHeaderAsDefault}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="حفظ هذه الترويسة كافتراضية لجميع المطبوعات القادمة"
                  >
                    <Save className="w-3 h-3" />
                    <span>حفظ كافتراضي للمكتب</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetHeaderToDefaults}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-100/50"
                    title="استعادة الترويسة الأصلية من إعدادات المكتب"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الأصل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHeaderEditBarOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                    title="إغلاق الشريط"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Edit Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    اسم المكتب / المحاسب:
                  </label>
                  <input
                    type="text"
                    value={editableOfficeName}
                    onChange={(e) => setEditableOfficeName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-amber-500"
                    placeholder="مكتب المحاسب القانوني..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    الصفة / اللقب المهني:
                  </label>
                  <input
                    type="text"
                    value={editableOfficeTitle}
                    onChange={(e) => setEditableOfficeTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-amber-500"
                    placeholder="محاسب ومراجع قانوني..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    عنوان الوثيقة المطبوعة:
                  </label>
                  <input
                    type="text"
                    value={editableDocTitle}
                    onChange={(e) => setEditableDocTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-amber-500"
                    placeholder="تقرير مالي معتمد..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    الوصف الفرعي:
                  </label>
                  <input
                    type="text"
                    value={editableDocSubtitle}
                    onChange={(e) => setEditableDocSubtitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-amber-500"
                    placeholder="بيان تفصيلي..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    اسم المنشأة / العميل:
                  </label>
                  <input
                    type="text"
                    value={editableCompanyName}
                    onChange={(e) => setEditableCompanyName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-amber-500"
                    placeholder="اسم الشركة أو العميل..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    تاريخ الوثيقة:
                  </label>
                  <input
                    type="text"
                    value={editableDocDate}
                    onChange={(e) => setEditableDocDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-amber-500"
                    placeholder="التاريخ..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    رقم الترخيص:
                  </label>
                  <input
                    type="text"
                    value={editableLicense}
                    onChange={(e) => setEditableLicense(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-amber-500"
                    placeholder="سجل رقم..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    رقم الهاتف للتواصل:
                  </label>
                  <input
                    type="text"
                    value={editablePhone}
                    onChange={(e) => setEditablePhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-amber-500"
                    placeholder="0100..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* The Content Paper */}
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>

          {/* Modal for Print & Export Settings */}
          <PrintExportControlModal
            isOpen={isPrintSettingsOpen}
            onClose={() => setIsPrintSettingsOpen(false)}
            onSaved={() => setPrintSettings(PrintService.getSettings())}
          />
        </div>
      </div>
    );
  }

  return content;
};

export { PrintLayout, printElementWithPrintLayout } from './PrintLayout';
