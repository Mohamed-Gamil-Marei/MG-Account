import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';
import { OfficeProfile, ClientArchiveRecord } from '../../types';
import { db } from '../../db/localDatabase';
import { MohamedGamilLogo } from './MohamedGamilLogo';

export interface OfficialReportHeaderProps {
  officeProfile?: (Partial<OfficeProfile> & {
    mainOfficeTitle?: string;
    branchOfficeTitle?: string;
    showOfficePhones?: boolean;
    headerStyle?: 'standard' | 'formal-classic' | 'two-column' | 'compact';
    showLogo?: boolean;
  }) | null;
  clientProfile?: Partial<ClientArchiveRecord> | {
    companyName?: string;
    name?: string;
    taxRegNo?: string;
    taxCardNo?: string;
    commercialRegNo?: string;
    commercialRegistrationNo?: string;
    legalForm?: string;
    taxOffice?: string;
    taxFileNo?: string;
    activity?: string;
  } | null;
  documentTitle?: string;
  title?: string; // alias for documentTitle
  reportTitle?: string; // alias for backwards compatibility
  documentSubtitle?: string;
  subtitle?: string; // alias for documentSubtitle
  referenceNumber?: string;
  date?: string;
  fiscalYear?: number | string;
  periodStartDate?: string;
  periodEndDate?: string;
  documentReference?: string;
  issueDate?: string;
  isOfficialStampVisible?: boolean;
  showHeaderClientBanner?: boolean;
  showTaxAndRegDetails?: boolean;
  className?: string;
  variant?: 'full' | 'compact' | 'print-only';
}

export const OfficialReportHeader: React.FC<OfficialReportHeaderProps> = ({
  officeProfile: propOfficeProfile,
  clientProfile: propClientProfile,
  documentTitle: propDocumentTitle,
  title,
  reportTitle,
  documentSubtitle: propDocumentSubtitle,
  subtitle,
  referenceNumber,
  fiscalYear,
  periodStartDate,
  periodEndDate,
  documentReference,
  issueDate,
  showHeaderClientBanner = false,
  className = '',
  variant = 'full',
}) => {
  // 1. Live reactive resolution: ALWAYS read from active db state if not explicitly provided
  const dbState = db.getState();
  const dbOffice = dbState?.officeProfile || {};
  const office = { ...dbOffice, ...(propOfficeProfile || {}) };

  // 2. Client resolution: if not provided, try active client from db
  const activeClientId = dbState?.activeClientContext?.clientId;
  const dbClient = activeClientId ? dbState?.clients?.find((c) => c.id === activeClientId) : null;
  const client = propClientProfile || dbClient || null;

  // 3. Office fields with clean fallbacks (no forced overwrites)
  const firmName = office?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = office?.auditorName || 'محمد جميل مرعي';
  const licenseNumber = office?.licenseNumber || 'س.م.م 43122';
  const officeTitle = office?.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات';
  const finalDocTitle = propDocumentTitle || title || reportTitle || 'تقرير مالي محاسبي معتمد';
  const finalDocSubtitle = propDocumentSubtitle || subtitle;
  const phone = office?.phone || office?.mobile || '';
  const email = office?.email || '';
  const logoUrl = office?.logoUrl;
  const showLogo = office?.showLogo !== false;
  const showPhones = office?.showOfficePhones !== false && Boolean(phone);
  const headerStyle = office?.headerStyle || (variant === 'compact' ? 'compact' : 'standard');

  const showMain = office?.showMainOfficeAddress !== false;
  const mainTitle = office?.mainOfficeTitle || 'المقر الرئيسي';
  const mainAddress = office?.mainOfficeAddress || office?.address || '';

  const showBranch = office?.showBranchOfficeAddress !== false;
  const branchTitle = office?.branchOfficeTitle || 'الفرع';
  const branchAddress = office?.branchOfficeAddress || '';

  // 4. Document details
  const titleText = propDocumentTitle || reportTitle || '';
  const dateStr = issueDate || new Date().toISOString().slice(0, 10);
  const isPrintOnly = variant === 'print-only';
  const isCompact = headerStyle === 'compact';

  // Check if auditor is Mohamed Gamil to display vector logo if no custom image is uploaded
  const isMohamedGamil =
    !logoUrl &&
    (auditorName.includes('جميل') ||
      auditorName.includes('مرعي') ||
      firmName.includes('جميل') ||
      firmName.includes('مرعي'));

  // Client info extraction
  const companyName = (client as any)?.companyName || (client as any)?.name;
  const taxCardNo = (client as any)?.taxCardNo || (client as any)?.taxRegNo;
  const commercialRegNo = (client as any)?.commercialRegNo || (client as any)?.commercialRegistrationNo;
  const legalForm = (client as any)?.legalForm;
  const taxOffice = (client as any)?.taxOffice;

  return (
    <div
      data-official-header="true"
      data-letterhead="true"
      className={`official-header w-full border-b-2 border-slate-900 ${
        isCompact ? 'pb-2 mb-2' : 'pb-3 mb-4'
      } text-slate-900 font-['Cairo',sans-serif] ${
        isPrintOnly ? 'hidden print:block' : 'block'
      } ${className}`}
      dir="rtl"
    >
      {/* Main Letterhead Grid: Right (Office Info) | Center (Emblem/Logo) | Left (Document Info) */}
      <div className="flex items-start justify-between gap-4">
        {/* Right Side: Office and Auditor Credentials */}
        <div className="text-right flex-1 min-w-[200px] space-y-0.5">
          <h1 className={`${isCompact ? 'text-sm' : 'text-base sm:text-lg'} font-black text-slate-950 leading-snug`}>
            {firmName}
          </h1>

          <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-900">
            <span>{auditorName}</span>
            <span className="text-slate-500 font-normal">| {title}</span>
          </div>

          <div className="text-[11px] text-slate-700 flex items-center gap-3 flex-wrap pt-0.5">
            <span>رقم القيد: <strong className="text-slate-950 font-bold">{licenseNumber}</strong></span>
            {office?.taxAuthorityLicense && (
              <span>• ترخيص الضرائب: {office.taxAuthorityLicense}</span>
            )}
            {showPhones && (
              <span className="inline-flex items-center gap-1">
                • هاتف: <span dir="ltr" className="font-semibold text-slate-900">{phone}</span>
              </span>
            )}
            {email && (
              <span className="inline-flex items-center gap-1">
                • {email}
              </span>
            )}
          </div>

          {/* Addresses (Only shown if toggled on and address is not empty) */}
          {(showMain && mainAddress || showBranch && branchAddress) && (
            <div className="text-[10px] text-slate-600 pt-1 flex flex-col gap-0.5">
              {showMain && mainAddress && (
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                  <span><strong>{mainTitle}:</strong> {mainAddress}</span>
                </div>
              )}
              {showBranch && branchAddress && (
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                  <span><strong>{branchTitle}:</strong> {branchAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Clean Logo / Monogram (if enabled) */}
        {showLogo && (logoUrl || isMohamedGamil) && (
          <div className="flex flex-col items-center justify-center shrink-0 px-2 text-center self-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار المكتب"
                className={`${isCompact ? 'h-10' : 'h-14'} w-auto max-w-[130px] object-contain`}
                referrerPolicy="no-referrer"
              />
            ) : isMohamedGamil ? (
              <MohamedGamilLogo
                size={isCompact ? 48 : 62}
                variant="HEADER_TRANSPARENT"
                className="opacity-95"
              />
            ) : null}
          </div>
        )}

        {/* Left Side: Document Title & Metadata */}
        <div className="text-left flex-1 min-w-[180px] space-y-1 text-xs">
          {titleText && (
            <div className="inline-block px-3 py-1 bg-slate-900 text-white font-bold rounded text-xs text-right">
              {titleText}
              {fiscalYear ? ` (${fiscalYear})` : ''}
            </div>
          )}

          {periodStartDate && periodEndDate && (
            <div className="text-[10.5px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-right">
              <span className="text-slate-500">الفترة: </span>
              <span>من {periodStartDate} إلى {periodEndDate}</span>
            </div>
          )}

          <div className="text-slate-700 text-[11px] text-right">
            <span className="text-slate-500">التاريخ: </span>
            <span className="font-bold text-slate-900">{dateStr}</span>
          </div>

          {documentReference && (
            <div className="text-slate-700 text-[11px] text-right">
              <span className="text-slate-500">رقم الإشارة: </span>
              <span className="font-semibold text-slate-800">{documentReference}</span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Client Banner: Only rendered if explicitly enabled and company name exists */}
      {showHeaderClientBanner && companyName && (
        <div className="mt-2.5 pt-2 border-t border-slate-300 bg-slate-50/80 p-2 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-500 text-[10px] block">المنشأة:</span>
            <span className="font-bold text-slate-900 truncate block">{companyName}</span>
          </div>
          {legalForm && (
            <div>
              <span className="text-slate-500 text-[10px] block">الشكل القانوني:</span>
              <span className="font-medium text-slate-800 truncate block">{legalForm}</span>
            </div>
          )}
          {(taxCardNo || commercialRegNo) && (
            <div>
              <span className="text-slate-500 text-[10px] block">البطاقة والسجل:</span>
              <span className="font-medium text-slate-800 block text-[11px]">
                {taxCardNo ? `ض: ${taxCardNo}` : ''} {commercialRegNo ? `| س.ت: ${commercialRegNo}` : ''}
              </span>
            </div>
          )}
          {taxOffice && (
            <div>
              <span className="text-slate-500 text-[10px] block">المأمورية:</span>
              <span className="font-medium text-slate-800 truncate block text-[11px]">{taxOffice}</span>
            </div>
          )}
        </div>
      )}

      {finalDocSubtitle && (
        <div className="text-center text-[10.5px] text-slate-500 mt-1.5 italic">
          {finalDocSubtitle}
        </div>
      )}
    </div>
  );
};
