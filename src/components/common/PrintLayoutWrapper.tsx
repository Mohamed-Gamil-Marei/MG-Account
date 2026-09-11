import React from 'react';
import { db } from '../../db/localDatabase';
import { generateQrCodeSvg } from '../../utils/qrCodeGenerator';

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
  const effectiveDocumentTitle = documentTitle || title || 'تقرير مالي معتمد';

  if (isOpen === false) return null;
  const stateProfile = db.getState().officeProfile;
  const officeDisplayName = stateProfile?.firmName || stateProfile?.auditorName || 'مكتب المحاسب القانوني / محمد جميل مرعي';
  const officeTitle = stateProfile?.title || 'محاسب ومراجع قانوني - خبير ضرائب واستشارات مالية';
  const officeLicense = stateProfile?.licenseNumber || 'سجل المحاسبين والمراجعين رقم 43122';
  const officeTaxNumber = stateProfile?.taxAuthorityRegNo || '654-987-321';
  const officePhone = stateProfile?.phone || stateProfile?.mobile || '01003335360';

  const verificationPayload =
    (typeof customVerificationPayload === 'string' ? customVerificationPayload : null) ||
    qrPayload ||
    `OFFICE: ${officeDisplayName} | DOC: ${effectiveDocumentTitle} | REF: ${documentRefNumber || 'N/A'} | DATE: ${documentDate} | CLIENT: ${companyName || 'عام'} | AUTH: LIC-43122-VERIFIED`;

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
      <div className="border-b-2 border-slate-900 pb-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          {/* Right side: Office Info */}
          <div className="space-y-1 text-right">
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              {officeDisplayName}
            </h1>
            <p className="text-xs font-bold text-emerald-800">
              {officeTitle}
            </p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
              <div>
                <span className="font-semibold text-slate-800">ترخيص المزاولة:</span>{' '}
                <span className="font-mono">{officeLicense}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  <span className="font-semibold text-slate-800">ب.ض:</span>{' '}
                  <span className="font-mono">{officeTaxNumber}</span>
                </span>
                <span>•</span>
                <span>
                  <span className="font-semibold text-slate-800">هاتف:</span>{' '}
                  <span className="font-mono font-bold text-slate-800">{officePhone}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Left side: QR Code & Verification Stamp */}
          <div
            data-qr-container="true"
            className="qr-print-container flex flex-col items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 shrink-0"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(verificationPayload, 92),
              }}
            />
            <span className="text-[8.5px] font-mono font-bold text-slate-600 mt-0.5">وثيقة موثقة رقمياً</span>
          </div>
        </div>

        {/* Title Bar */}
        <div className="mt-5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/80 px-4 py-2.5 rounded-xl">
          <div>
            <h2 className="text-base font-black text-slate-900">{documentTitle}</h2>
            {documentSubtitle && <p className="text-xs text-slate-500">{documentSubtitle}</p>}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            {documentRefNumber && (
              <span className="font-mono font-bold px-2 py-0.5 bg-white border border-slate-200 rounded">
                مرجع: {documentRefNumber}
              </span>
            )}
            <span className="font-mono">التاريخ: {documentDate}</span>
          </div>
        </div>

        {/* Target Company / Client Info Header (If applicable) */}
        {companyName && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-50/50 border border-emerald-200/60 p-3 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">المنشأة / العميل:</span>
              <span className="font-bold text-slate-900">{companyName}</span>
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
      {showSignatureStamp && (
        <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs">
          <div className="text-right space-y-1">
            <span className="text-slate-500 block">إعداد ومراجعة:</span>
            <span className="font-bold text-slate-800">قسم الحسابات والمراجعة الفنية</span>
            <div className="text-[10px] text-slate-400 font-mono">نظام التدقيق الرقمي المعتمد</div>
          </div>

          <div className="text-left space-y-1.5 flex flex-col items-end">
            <span className="text-slate-500 block text-right">المحاسب القانوني المعتمد:</span>
            <span className="font-bold text-slate-900 text-right">{officeDisplayName}</span>
            <div className="w-36 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-[10px] bg-slate-50/50">
              (خاتم وتوقيع المحاسب القانوني)
            </div>
          </div>
        </div>
      )}

      {/* Print Page Footer */}
      <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <span>طُبعت هذه الوثيقة آلياً من المنظومة المحاسبية المعتمدة</span>
        <span className="font-mono">{new Date().toISOString().replace('T', ' ').substring(0, 19)}</span>
      </div>
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
        <div className="bg-slate-100 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 relative shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-300 no-print">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                طباعة الوثيقة الآن
              </button>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
