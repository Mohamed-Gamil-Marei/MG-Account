import React, { useState, useRef } from 'react';
import {
  Printer,
  Eye,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  Check,
  ChevronDown,
  Loader2,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ModelType, ExportFormat, exportModelData, importModelData } from '../../utils/dataImportExport';
import { db } from '../../db/localDatabase';
import { PrintPreviewModal } from './PrintPreviewModal';

export type PageSizeOption = 'A4' | 'A3' | 'Letter' | 'Thermal80mm' | 'Default';
export type PageOrientationOption = 'portrait' | 'landscape';

interface ScreenActionToolbarProps {
  modelType: ModelType;
  title: string;
  count?: number;
  printSelector?: string; // CSS selector to print specifically or triggers window.print()
  onRefresh?: () => void;
  customActions?: React.ReactNode;
  showPrint?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showPreview?: boolean;
  className?: string;
}

export const ScreenActionToolbar: React.FC<ScreenActionToolbarProps> = ({
  modelType,
  title,
  count,
  printSelector,
  onRefresh,
  customActions,
  showPrint = true,
  showExport = true,
  showImport = true,
  showPreview = true,
  className = '',
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState<PageSizeOption>('A4');
  const [orientation, setOrientation] = useState<PageOrientationOption>('portrait');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = (format: ExportFormat) => {
    setIsExporting(true);
    setIsExportMenuOpen(false);
    try {
      const res = exportModelData(modelType, format, db.getState());
      if (res.success) {
        showFeedback('success', res.message);
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', `حدث خطأ أثناء التصدير: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const res = await importModelData(file, modelType);
      if (res.success) {
        showFeedback('success', res.message);
        if (onRefresh) onRefresh();
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', `فشل الاستيراد: ${err.message || err}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePrint = (customSize?: PageSizeOption, customOrient?: PageOrientationOption) => {
    const selectedSize = customSize || pageSize;
    const selectedOrient = customOrient || orientation;
    setIsPrintMenuOpen(false);

    // Apply print style overrides dynamically
    const styleId = 'dynamic-print-overrides';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    let sizeCss = 'A4 portrait';
    if (selectedSize === 'A4') sizeCss = `A4 ${selectedOrient}`;
    else if (selectedSize === 'A3') sizeCss = `A3 ${selectedOrient}`;
    else if (selectedSize === 'Letter') sizeCss = `letter ${selectedOrient}`;
    else if (selectedSize === 'Thermal80mm') sizeCss = `80mm auto`;

    styleTag.innerHTML = `
      @page {
        size: ${sizeCss};
        margin: 10mm;
      }
    `;

    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className} no-print`}>
      {/* Hidden File Input for Direct Screen Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".xlsx,.xls,.csv,.json"
        className="hidden"
      />

      {/* Optional Custom Injected Actions */}
      {customActions}

      {/* 1. Print Preview Button (معاينة الطباعة وتخصيص الأعمدة والهوامش) */}
      {showPreview && (
        <button
          onClick={() => setIsPreviewModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          title="معاينة شكل المستند النهائي قبل الطباعة مع ضبط الهوامش وإخفاء/إظهار الأعمدة"
        >
          <Eye className="w-4 h-4 text-emerald-200" />
          <span>معاينة الطباعة</span>
        </button>
      )}

      {/* 2. Universal Print with Size & Orientation Dropdown */}
      {showPrint && (
        <div className="relative">
          <div className="inline-flex rounded-xl shadow-xs">
            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-r-xl text-xs font-bold transition-all cursor-pointer border-l border-slate-700 active:scale-95"
              title={`طباعة فورية (${pageSize} - ${orientation === 'portrait' ? 'طولي' : 'عرضي'})`}
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة</span>
            </button>
            <button
              onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
              className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-l-xl text-xs border-slate-700 transition-all cursor-pointer"
              title="خيارات أحجام الورق والاتجاه"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isPrintMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100 mb-2 flex items-center justify-between">
                <span>إعدادات طباعة {title}</span>
                <span className="text-[10px] text-emerald-600 font-mono">جاهز للطباعة</span>
              </div>

              {/* Open Preview Modal from Menu */}
              <button
                onClick={() => {
                  setIsPrintMenuOpen(false);
                  setIsPreviewModalOpen(true);
                }}
                className="w-full mb-2.5 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>فتح شاشة المعاينة وضبط الأعمدة</span>
              </button>

              {/* Page Size Options */}
              <div className="space-y-1 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 block">حجم الصفحة (Paper Size):</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'A4' as PageSizeOption, label: 'A4 قياسي' },
                    { id: 'A3' as PageSizeOption, label: 'A3 عريض' },
                    { id: 'Letter' as PageSizeOption, label: 'Letter أمريكي' },
                    { id: 'Thermal80mm' as PageSizeOption, label: 'إيصال 80مم' },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => setPageSize(sz.id)}
                      className={`px-2 py-1.5 rounded-lg text-right font-medium transition-all cursor-pointer flex items-center justify-between ${
                        pageSize === sz.id
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>{sz.label}</span>
                      {pageSize === sz.id && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Orientation */}
              <div className="space-y-1 mb-3">
                <span className="text-[11px] font-semibold text-slate-500 block">اتجاه الصفحة (Orientation):</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                      orientation === 'portrait'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    📄 طولي (Portrait)
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    📃 عرضي (Landscape)
                  </button>
                </div>
              </div>

              <button
                onClick={() => handlePrint(pageSize, orientation)}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>إرسال لأمر الطباعة الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Universal Multi-format Export Dropdown */}
      {showExport && (
        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="تصدير السجلات بصيغ متعددة (Excel, CSV, JSON, TXT)"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-blue-700" />
            )}
            <span>تصدير</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100 mb-1">
                صيغ تصدير {title}
              </div>
              <button
                onClick={() => handleExport('XLSX')}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">مصنف إكسل رسمي منسق</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400">متوافق مع البرامج وقواعد البيانات</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('JSON')}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">JSON (.json)</div>
                  <div className="text-[10px] text-slate-400">نسخة احتياطية هيكلية كاملة</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('TXT')}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">Text (.txt)</div>
                  <div className="text-[10px] text-slate-400">تقرير نصي مطبوع ومعتمد</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Universal Import Button */}
      {showImport && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl font-semibold text-xs border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50"
          title={`استيراد بيانات وسجلات ${title} من ملف Excel أو CSV أو JSON`}
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-emerald-700" />
          )}
          <span>استيراد</span>
        </button>
      )}

      {/* Live Inline Feedback Bubble */}
      {feedback && (
        <div
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm animate-in fade-in zoom-in-95 duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Fullscreen Interactive Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        modelType={modelType}
        title={title}
        initialPageSize={pageSize === 'Default' ? 'A4' : pageSize}
        initialOrientation={orientation}
      />
    </div>
  );
};

