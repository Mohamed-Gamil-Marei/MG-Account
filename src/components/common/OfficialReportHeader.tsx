import React from 'react';
import { ShieldCheck, Building2, Calendar, FileText, CheckCircle2, MapPin } from 'lucide-react';
import { OfficeProfile, ClientArchiveRecord } from '../../types';
import { ClientProfileData } from '../credit/CreditBatchPrintDocument';
import { MohamedGamilLogo } from './MohamedGamilLogo';

export interface OfficialReportHeaderProps {
  officeProfile?: (Partial<OfficeProfile> & {
    mainOfficeTitle?: string;
    branchOfficeTitle?: string;
    showOfficePhones?: boolean;
    headerStyle?: 'standard' | 'formal-classic' | 'two-column' | 'compact';
    showLogo?: boolean;
  }) | null;
  clientProfile?: Partial<ClientProfileData> | Partial<ClientArchiveRecord> | null;
  documentTitle?: string;
  documentSubtitle?: string;
  fiscalYear?: number | string;
  periodStartDate?: string;
  periodEndDate?: string;
  documentReference?: string;
  issueDate?: string;
  isOfficialStampVisible?: boolean;
  showHeaderClientBanner?: boolean;
  className?: string;
  variant?: 'full' | 'compact' | 'print-only';
}

export const OfficialReportHeader: React.FC<OfficialReportHeaderProps> = ({
  officeProfile,
  clientProfile,
  documentTitle = 'القوائم المالية والحسابات الختامية المعتمدة',
  documentSubtitle = 'طبقاً لمعايير المحاسبة المصرية (EAS) والقوانين واللوائح السارية',
  fiscalYear,
  periodStartDate,
  periodEndDate,
  documentReference,
  issueDate,
  isOfficialStampVisible = true,
  showHeaderClientBanner = true,
  className = '',
  variant = 'full',
}) => {
  const firmName = officeProfile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = officeProfile?.auditorName || 'أ/ محمد جميل مرعي';
  const licenseNumber = officeProfile?.licenseNumber || 'س.م.م 43122';
  const title = officeProfile?.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات';
  const phone = officeProfile?.phone || '01003335360';
  const mobile = officeProfile?.mobile;
  const email = officeProfile?.email;
  const logoUrl = officeProfile?.logoUrl;
  const showLogo = officeProfile?.showLogo !== false;
  const showPhones = officeProfile?.showOfficePhones !== false;
  const headerStyle = officeProfile?.headerStyle || 'standard';

  const showMain = officeProfile?.showMainOfficeAddress !== false;
  const mainTitle = officeProfile?.mainOfficeTitle || 'المقر الرئيسي';
  const mainAddress = officeProfile?.mainOfficeAddress || officeProfile?.address || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية';
  
  const showBranch = officeProfile?.showBranchOfficeAddress !== false;
  const branchTitle = officeProfile?.branchOfficeTitle || 'الفرع';
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
  const taxFileNo = (clientProfile as any)?.taxFileNo;
  const activity = (clientProfile as any)?.activity;

  const dateStr = issueDate || new Date().toISOString().slice(0, 10);
  const refCode =
    documentReference ||
    `EGY-REP-${fiscalYear || new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

  const isPrintOnly = variant === 'print-only';
  const isCompact = variant === 'compact' || headerStyle === 'compact';

  return (
    <div
      data-official-header="true"
      className={`official-header w-full border-b-2 border-slate-900 pb-2 mb-3 text-slate-900 ${
        isPrintOnly ? 'hidden print:block' : 'block'
      } ${className}`}
      dir="rtl"
    >
      {/* Upper Bar: Auditor & Office Info (Right) | Logo / Emblem (Center) | Document Info & Stamp (Left) */}
      <div className="flex items-start justify-between gap-3">
        {/* Right side: Office and Auditor Credentials */}
        <div className="space-y-0.5 text-right flex-1 min-w-[230px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
            <h1 className="text-sm sm:text-base font-black text-slate-950">
              {firmName}
            </h1>
          </div>
          <div className="text-xs font-bold text-slate-900">
            {auditorName} <span className="text-slate-600 font-normal">| {title}</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2 flex-wrap">
            <span>سجل المحاسبين والمراجعين: {licenseNumber}</span>
            {officeProfile?.taxAuthorityLicense && (
              <span>• {officeProfile.taxAuthorityLicense}</span>
            )}
            {showPhones && phone && (
              <span>• هاتف: {phone}</span>
            )}
            {showPhones && mobile && mobile !== phone && (
              <span>• موبايل: {mobile}</span>
            )}
            {email && (
              <span>• بريد: {email}</span>
            )}
          </div>

          {/* Addresses line in the header (Dynamic Main & Branch visibility) */}
          {(showMain || showBranch) && (
            <div className="text-[9.5px] text-slate-700 pt-0.5 flex flex-col gap-0.5 font-sans">
              {showMain && mainAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-800 shrink-0" />
                  <span><strong>{mainTitle}:</strong> {mainAddress}</span>
                </div>
              )}
              {showBranch && branchAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-800 shrink-0" />
                  <span><strong>{branchTitle}:</strong> {branchAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Logo or Emblem (if enabled) */}
        {showLogo && (
          <div className="flex flex-col items-center justify-center shrink-0 px-2 text-center">
            {officeProfile?.logoType === 'NONE' ? null : (officeProfile?.logoType === 'CUSTOM_UPLOAD' && logoUrl) || (logoUrl && officeProfile?.logoType !== 'MOHAMED_GAMIL_GOLD' && officeProfile?.logoType !== 'EGYPT_EMBLEM') ? (
              <img
                src={logoUrl}
                alt="شعار المكتب"
                className="h-13 w-auto max-w-[120px] object-contain mb-1"
                referrerPolicy="no-referrer"
              />
            ) : officeProfile?.logoType === 'EGYPT_EMBLEM' ? (
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-amber-400/70 flex flex-col items-center justify-center text-amber-300 shadow-2xs mb-0.5">
                <span className="text-[10px] font-black tracking-tight">مصر</span>
                <span className="text-[7.5px] text-slate-300 font-mono">EAS</span>
              </div>
            ) : (
              <MohamedGamilLogo size={62} variant="HEADER_TRANSPARENT" className="mb-0.5" />
            )}
            <span className="text-[8px] font-black text-amber-800 dark:text-amber-400 font-mono tracking-wider uppercase">
              MOHAMED GAMIL MAREI
            </span>
          </div>
        )}

        {/* Left side: Document Title, Date & QR verification code */}
        <div className="space-y-1 text-left flex-1 min-w-[200px] font-mono text-[10px]">
          <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold rounded text-xs text-right">
            {documentTitle}
            {fiscalYear ? ` (${fiscalYear})` : ''}
          </div>
          {periodStartDate && periodEndDate && (
            <div className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <span className="text-slate-500 font-normal">عن الفترة: </span>
              <span>من {periodStartDate} إلى {periodEndDate}</span>
            </div>
          )}
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
      {showHeaderClientBanner && (
        <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300 bg-slate-50/80 p-2 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
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
            <span className="text-slate-500 text-[10px] block font-sans">المأمورية والملف:</span>
            <span className="font-medium text-slate-700 truncate block text-[11px]">
              {taxOffice} {taxFileNo ? `(ملف: ${taxFileNo})` : ''}
            </span>
          </div>
        </div>
      )}

      {documentSubtitle && (
        <div className="text-center text-[10px] text-slate-500 mt-1 font-sans italic">
          {documentSubtitle}
        </div>
      )}
    </div>
  );
};
