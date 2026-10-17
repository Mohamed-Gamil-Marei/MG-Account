import React from 'react';

export interface PrintLayoutWrapperProps {
  id?: string;
  documentTitle?: string;
  title?: string;
  documentSubtitle?: string;
  documentRefNumber?: string;
  documentDate?: string;
  companyName?: string;
  clientCode?: string;
  fiscalYear?: number | string;
  showSignatureStamp?: boolean;
  notes?: string;
  isOpen?: boolean;
  onClose?: () => void;
  watermarkText?: string;
  verificationPayload?: any;
  children: React.ReactNode;
  className?: string;
}

export const PrintLayoutWrapper: React.FC<PrintLayoutWrapperProps> = ({
  id = 'printable-document-wrapper',
  documentTitle,
  documentSubtitle,
  documentRefNumber,
  companyName,
  clientCode,
  fiscalYear,
  children,
  className = '',
}) => {
  return (
    <div
      id={id}
      data-printable="true"
      className={`bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 space-y-5 ${className}`}
      dir="rtl"
    >
      <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-slate-900">{documentTitle}</h1>
          {documentSubtitle && <p className="text-xs text-slate-600 mt-0.5">{documentSubtitle}</p>}
          {companyName && (
            <div className="text-xs font-bold text-slate-800 mt-1">
              المنشأة: {companyName} {clientCode ? `(${clientCode})` : ''}
            </div>
          )}
        </div>
        <div className="text-left text-xs text-slate-600 font-mono space-y-0.5">
          {documentRefNumber && <div>Ref: {documentRefNumber}</div>}
          {fiscalYear && <div>FY: {fiscalYear}</div>}
          <div>Date: {new Date().toISOString().slice(0, 10)}</div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
};
