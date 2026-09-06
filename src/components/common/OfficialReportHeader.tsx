import React from 'react';
import { ShieldCheck, Building2, Calendar, FileText, CheckCircle2, MapPin } from 'lucide-react';
import { OfficeProfile, ClientArchiveRecord } from '../../types';
import { ClientProfileData } from '../credit/CreditBatchPrintDocument';

export interface OfficialReportHeaderProps {
  officeProfile?: Partial<OfficeProfile> | null;
  clientProfile?: Partial<ClientProfileData> | Partial<ClientArchiveRecord> | null;
  documentTitle?: string;
  documentSubtitle?: string;
  fiscalYear?: number | string;
  documentReference?: string;
  issueDate?: string;
  isOfficialStampVisible?: boolean;
  className?: string;
  variant?: 'full' | 'compact' | 'print-only';
}

export const OfficialReportHeader: React.FC<OfficialReportHeaderProps> = ({
  officeProfile,
  clientProfile,
  documentTitle = 'القوائم المالية والحسابات الختامية المعتمدة',
  documentSubtitle = 'طبقاً لمعايير المحاسبة المصرية (EAS) والقوانين واللوائح السارية',
  fiscalYear,
  documentReference,
  issueDate,
  isOfficialStampVisible = true,
  className = '',
  variant = 'full',
}) => {
  const firmName = officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = officeProfile?.auditorName || 'أ/ محمد جميل مرعي';
  const licenseNumber = officeProfile?.licenseNumber || 'س.م.م 43122';
  const title = officeProfile?.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات';
  const phone = officeProfile?.phone || '01003335360';
  const logoUrl = officeProfile?.logoUrl;

  const showMain = officeProfile?.showMainOfficeAddress !== false;
  const mainAddress = officeProfile?.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية';
  
  const showBranch = officeProfile?.showBranchOfficeAddress !== false;
  const branchAddress = officeProfile?.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية';

  // Client info
  const companyName =
    (clientProfile as any)?.companyName ||
    (clientProfile as any)?.name ||
    'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)';
  const taxCardNo =
    (clientProfile as any)?.taxRegNo ||
    (clientProfile as any)?.taxCardNo ||
    '492-817-302';
  const commercialRegNo =
    (clientProfile as any)?.commercialRegNo ||
    (clientProfile as any)?.commercialRegistrationNo ||
    '109482';
  const legalForm = (clientProfile as any)?.legalForm || 'شركة مساهمة مصرية (ش.م.م)';
  const taxOffice =
    (clientProfile as any)?.taxOffice ||
    'مأمورية ضرائب الشركات المساهمة بالقاهرة';

  const dateStr = issueDate || new Date().toISOString().slice(0, 10);
  const refCode =
    documentReference ||
    `EGY-REP-${fiscalYear || new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

  const isPrintOnly = variant === 'print-only';

  return (
    <div
      data-official-header="true"
      className={`official-header w-full border-b-2 border-slate-900 pb-2.5 mb-3 text-slate-900 ${
        isPrintOnly ? 'hidden print:block' : 'block'
      } ${className}`}
      dir="rtl"
    >
      {/* Upper Bar: Auditor & Office Info (Right) | Logo / Emblem (Center) | Document Info & Stamp (Left) */}
      <div className="flex items-start justify-between gap-3">
        {/* Right side: Office and Auditor Credentials */}
        <div className="space-y-0.5 text-right flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-900 shrink-0" />
            <h1 className="text-sm sm:text-base font-black text-slate-950 tracking-tight">
              {firmName}
            </h1>
          </div>
          <div className="text-xs font-bold text-slate-900">
            {auditorName} <span className="text-slate-600 font-normal">| {title}</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2 flex-wrap">
            <span>سجل المحاسبين والمراجعين: {licenseNumber}</span>
            {officeProfile?.taxAuthorityLicense && (
              <span>• سجل الخبراء: {officeProfile.taxAuthorityLicense}</span>
            )}
            {phone && <span>• ت: {phone}</span>}
          </div>

          {/* Addresses line in the header (Dynamic Main & Branch visibility) */}
          {(showMain || showBranch) && (
            <div className="text-[9.5px] text-slate-700 pt-0.5 flex flex-col gap-0.5 font-sans">
              {showMain && mainAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                  <span><strong>المقر الرئيسي:</strong> {mainAddress}</span>
                </div>
              )}
              {showBranch && branchAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                  <span><strong>الفرع:</strong> {branchAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Logo or Emblem */}
        <div className="flex flex-col items-center justify-center shrink-0 px-2 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="شعار المكتب"
              className="h-14 w-auto max-w-[130px] object-contain mb-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 shadow-2xs mb-1">
              <Building2 className="w-6 h-6 text-slate-700" />
            </div>
          )}
          <span className="text-[9px] font-bold text-slate-600 font-mono tracking-wider uppercase">
            Official Financial Audit
          </span>
        </div>

        {/* Left side: Document Title, Date & QR verification code */}
        <div className="space-y-1 text-left flex-1 min-w-[200px] font-mono text-[10px]">
          <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold rounded text-xs text-right">
            {documentTitle}
            {fiscalYear ? ` (${fiscalYear})` : ''}
          </div>
          <div className="text-slate-600">
            <span className="text-slate-400">التاريخ: </span>
            <span className="font-semibold text-slate-800">{dateStr}</span>
          </div>
          <div className="text-slate-600">
            <span className="text-slate-400">كود الوثيقة: </span>
            <span className="font-semibold text-slate-800">{refCode}</span>
          </div>
          {isOfficialStampVisible && (
            <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>معتمد ومطابق للمعايير المصرية (EAS)</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar: Client Entity Information (الممول والمنشأة) */}
      <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300 bg-slate-50/70 p-2 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <div className="truncate">
          <span className="text-slate-500 text-[10px] block font-sans">المنشأة الممول:</span>
          <span className="font-black text-slate-900 truncate block" title={companyName}>
            {companyName}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block font-sans">الشكل القانوني:</span>
          <span className="font-semibold text-slate-800 truncate block">{legalForm}</span>
        </div>
        <div className="font-mono">
          <span className="text-slate-500 text-[10px] block font-sans">البطاقة والسجل:</span>
          <span className="font-bold text-slate-800 block text-[11px]">
            ض: {taxCardNo} | س.ت: {commercialRegNo}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block font-sans">المأمورية المختصة:</span>
          <span className="font-medium text-slate-700 truncate block text-[11px]">
            {taxOffice}
          </span>
        </div>
      </div>

      {documentSubtitle && (
        <div className="text-center text-[10px] text-slate-500 mt-1 font-sans italic">
          {documentSubtitle}
        </div>
      )}
    </div>
  );
};
