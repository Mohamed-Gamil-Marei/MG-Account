import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  FileCode2,
  ChevronDown,
  Check,
  Sparkles,
  Printer,
  Loader2,
} from 'lucide-react';
import {
  CertifiedDocumentData,
  exportElementToPdf,
  exportElementToImage,
  exportDocumentToWord,
  exportDocumentToExcel,
  exportDocumentToJson,
  exportDocumentToXml,
} from '../../utils/certifiedDocumentExporter';
import { OfficeProfile } from '../../types';
import { db } from '../../db/localDatabase';

interface CertifiedDocumentExportMenuProps {
  documentData: CertifiedDocumentData;
  targetElementId?: string;
  profile?: OfficeProfile;
  buttonLabel?: string;
  className?: string;
  onExportSuccess?: (format: string) => void;
}

export const CertifiedDocumentExportMenu: React.FC<CertifiedDocumentExportMenuProps> = ({
  documentData,
  targetElementId = 'official-certificate-document',
  profile,
  buttonLabel = 'تصدير المستند المعتمد',
  className = '',
  onExportSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const officeProfile = profile || db.getState().officeProfile;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const triggerSuccess = (formatName: string) => {
    setSuccessMessage(`تم تصدير ${formatName} بنجاح`);
    onExportSuccess?.(formatName);
    setTimeout(() => {
      setSuccessMessage(null);
      setIsOpen(false);
    }, 1500);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportingFormat('PDF');
    const docName = (documentData.clientName || 'مستند_معتمد').replace(/\s+/g, '_');
    const certNo = documentData.certificateNumber || documentData.invoiceNumber || 'DOC';
    await exportElementToPdf(targetElementId, `شهادة_معتمدة_${docName}_${certNo}.pdf`);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess('مستند PDF رسمي');
  };

  const handleExportWord = () => {
    setIsExporting(true);
    setExportingFormat('WORD');
    exportDocumentToWord(documentData, officeProfile);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess('مستند Word قابل للتعديل');
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    setIsExporting(true);
    setExportingFormat(format.toUpperCase());
    const docName = (documentData.clientName || 'مستند_معتمد').replace(/\s+/g, '_');
    const certNo = documentData.certificateNumber || documentData.invoiceNumber || 'DOC';
    await exportElementToImage(targetElementId, `شهادة_معتمدة_${docName}_${certNo}.${format}`, format);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess(`صورة ${format.toUpperCase()} عالية الدقة`);
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    setExportingFormat('EXCEL');
    exportDocumentToExcel(documentData, officeProfile);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess('جدول بيانات Excel');
  };

  const handleExportJson = () => {
    setIsExporting(true);
    setExportingFormat('JSON');
    exportDocumentToJson(documentData);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess('ملف بيانات JSON');
  };

  const handleExportXml = () => {
    setIsExporting(true);
    setExportingFormat('XML');
    exportDocumentToXml(documentData);
    setIsExporting(false);
    setExportingFormat(null);
    triggerSuccess('ملف بيانات XML');
  };

  return (
    <div className={`relative inline-block text-right ${className}`} ref={menuRef}>
      {/* Primary Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        title="تصدير المستند المعتمد بكافة الصيغ (PDF, Word, PNG, Excel, JSON)"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
        ) : (
          <Download className="w-4 h-4 text-emerald-200" />
        )}
        <span>{isExporting ? `جاري التصدير (${exportingFormat})...` : buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-emerald-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>تصدير المستند المعتمد</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                جميع الصيغ
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              اختر الصيغة المناسبة للأرشفة أو الطباعة أو الإرسال
            </p>
          </div>

          {successMessage && (
            <div className="mb-2 p-2 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center gap-1.5 border border-emerald-200 animate-pulse">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-1 text-xs">
            {/* 1. PDF Document */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 transition-colors text-right cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">مستند رسمي PDF</div>
                <div className="text-[10px] text-slate-400">جاهز للطباعة والتوثيق والختم الإلكتروني</div>
              </div>
            </button>

            {/* 2. Word (.doc) */}
            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExporting}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-right cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">مستند Word قابل للتعديل (DOC)</div>
                <div className="text-[10px] text-slate-400">تنسيق عربي RTL متكامل لجداول ونصوص الشهادة</div>
              </div>
            </button>

            {/* 3. Image (PNG) */}
            <button
              type="button"
              onClick={() => handleExportImage('png')}
              disabled={isExporting}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-400 transition-colors text-right cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">صورة فائقة الدقة (PNG)</div>
                <div className="text-[10px] text-slate-400">للمشاركة الفورية عبر واتساب والبريد</div>
              </div>
            </button>

            {/* 4. Excel (XLSX) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-right cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">جدول بيانات Excel (XLSX)</div>
                <div className="text-[10px] text-slate-400">بيانات الشهادة والمبالغ وتحليل الدخل</div>
              </div>
            </button>

            {/* 5. JSON & XML */}
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleExportJson}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                <span>ملف JSON</span>
              </button>

              <button
                type="button"
                onClick={handleExportXml}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>ملف XML</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
