import React, { useState, useRef } from 'react';
import {
  Printer,
  Eye,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Loader2,
  Settings,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ModelType, ExportFormat, exportModelData, importModelData } from '../../utils/dataImportExport';
import { exportElementToPdf, exportElementToImage } from '../../utils/certifiedDocumentExporter';
import { db } from '../../db/localDatabase';
import { PrintPreviewModal } from './PrintPreviewModal';
import { PrintService } from '../../services/PrintService';
import { ActionButton, ActionDropdownItem } from './ActionButton';
import { ActionMenu, ActionMenuItem } from './ActionMenu';
import { AutoArchiverService } from '../../services/AutoArchiver';

export type PageSizeOption = 'A4' | 'A3' | 'Letter' | 'Thermal80mm' | 'Default';
export type PageOrientationOption = 'portrait' | 'landscape';

export interface ScreenActionButtonItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'outline' | 'primary' | 'secondary' | string;
}

interface ScreenActionToolbarProps {
  modelType?: ModelType | string;
  title?: string;
  screenTitle?: string;
  state?: any;
  actions?: ScreenActionButtonItem[];
  count?: number;
  printSelector?: string; // CSS selector to print specifically or triggers window.print()
  targetElementId?: string; // Specific ID for PDF/Image capture
  onRefresh?: () => void;
  customActions?: React.ReactNode;
  customDocument?: any; // Specific active certificate/invoice/etc.
  showPrint?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showPreview?: boolean;
  compact?: boolean;
  className?: string;
}

export const ScreenActionToolbar: React.FC<ScreenActionToolbarProps> = ({
  modelType = 'ALL_DATA',
  title = '',
  screenTitle,
  state: _state,
  actions,
  count,
  printSelector,
  targetElementId,
  onRefresh,
  customActions,
  customDocument,
  showPrint = true,
  showExport = true,
  showImport = true,
  showPreview = true,
  compact = true,
  className = '',
}) => {
  const effectiveModelType = (modelType || 'ALL_DATA') as ModelType;
  const effectiveTitle = title || screenTitle || '';
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState<PageSizeOption>('A4');
  const [orientation, setOrientation] = useState<PageOrientationOption>('portrait');
  const [isExporting, setIsExporting] = useState(false);
  const [exportingLabel, setExportingLabel] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = async (format: ExportFormat | 'PDF' | 'IMAGE_PNG' | 'IMAGE_JPEG') => {
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const cleanTitle = effectiveTitle.replace(/\s+/g, '_');
      const timeStr = new Date().toISOString().slice(0, 10);

      if (format === 'PDF') {
        setExportingLabel('PDF');
        const success = await exportElementToPdf(
          targetElementId || printSelector,
          `${cleanTitle}_${timeStr}.pdf`,
          { orientation }
        );
        if (success) {
          showFeedback('success', `تم تصدير مستند [${effectiveTitle}] كـ PDF بنجاح`);
        } else {
          showFeedback('error', 'تعذر تصدير PDF، يرجى المحاولة عبر نافذة معاينة الطباعة');
        }
      } else if (format === 'IMAGE_PNG') {
        setExportingLabel('PNG');
        const success = await exportElementToImage(
          targetElementId || printSelector,
          `${cleanTitle}_${timeStr}.png`,
          'png'
        );
        if (success) {
          showFeedback('success', `تم تصدير صورة [${effectiveTitle}] فائقة الدقة (PNG) بنجاح`);
        } else {
          showFeedback('error', 'تعذر تصدير الصورة');
        }
      } else if (format === 'IMAGE_JPEG') {
        setExportingLabel('JPEG');
        const success = await exportElementToImage(
          targetElementId || printSelector,
          `${cleanTitle}_${timeStr}.jpg`,
          'jpeg'
        );
        if (success) {
          showFeedback('success', `تم تصدير صورة [${effectiveTitle}] (JPG) بنجاح`);
        } else {
          showFeedback('error', 'تعذر تصدير الصورة');
        }
      } else {
        const res = exportModelData(effectiveModelType, format as ExportFormat, db.getState(), customDocument);
        if (res.success) {
          showFeedback('success', res.message);
        } else {
          showFeedback('error', res.message);
        }
      }
    } catch (err: any) {
      showFeedback('error', `حدث خطأ أثناء التصدير: ${err.message || err}`);
    } finally {
      setIsExporting(false);
      setExportingLabel('');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const res = await importModelData(file, effectiveModelType);
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

  const handlePrint = async (customSize?: PageSizeOption, customOrient?: PageOrientationOption) => {
    const selectedSize = customSize || pageSize;
    const selectedOrient = customOrient || orientation;
    setIsPrintMenuOpen(false);

    const selector = targetElementId || printSelector || 'financial-statements-container';

    await PrintService.printElementById(selector, {
      title: effectiveTitle,
      orientation: selectedOrient,
      pageSize: selectedSize === 'Default' ? 'A4' : selectedSize,
      customDelayMs: 250,
      onAfterPrint: () => {
        showFeedback('success', `تم إرسال أمر الطباعة بنجاح: ${effectiveTitle}`);
      },
    });
  };

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className} no-print`}>
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

      {/* Action Buttons passed as array using unified ActionButton */}
      {actions?.map((act, idx) => (
        <ActionButton
          key={idx}
          label={act.label}
          icon={act.icon}
          onClick={act.onClick}
          variant={act.variant === 'outline' ? 'outline' : 'primary'}
          size="sm"
        />
      ))}

      {/* 1. Universal Print / Preview Consolidated Button */}
      {(showPreview || showPrint) && (
        <div className="relative">
          <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-800 text-white shadow-2xs">
            <button
              onClick={() => {
                if (showPreview) setIsPreviewModalOpen(true);
                else handlePrint();
              }}
              className="flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded-r-lg text-xs font-bold transition-all cursor-pointer border-l border-slate-700 active:scale-95"
              title="معاينة وطباعة"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة</span>
            </button>
            <button
              onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
              className="px-1.5 py-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-l-lg text-xs transition-all cursor-pointer"
              title="خيارات الطباعة والورق"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {isPrintMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100 mb-2 flex items-center justify-between">
                <span>إعدادات طباعة {effectiveTitle}</span>
                <span className="text-[10px] text-emerald-600 font-mono">معتمد</span>
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
                    📄 طولي
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-2 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    📃 عرضي
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

      {/* 2. Unified Export & Tools Dropdown */}
      {(showExport || showImport) && (
        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            disabled={isExporting}
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="تصدير"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-blue-700" />
            )}
            <span>تصدير</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>تصدير {title}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">معتمد</span>
              </div>

              {showExport && (
                <>
                  <button
                    onClick={() => handleExport('PDF')}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-50 text-slate-700 hover:text-rose-950 font-medium transition-all text-right cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="font-bold text-xs">مستند PDF رسمي</div>
                      <div className="text-[10px] text-slate-400">ملف جاهز للطباعة والتوثيق</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport('XLSX')}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 font-medium transition-all text-right cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="font-bold text-xs">مصنف Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">شيت إكسل منسق جاهز للعمل</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport('IMAGE_PNG')}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-950 font-medium transition-all text-right cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="font-bold text-xs">صورة فائقة الدقة (PNG)</div>
                      <div className="text-[10px] text-slate-400">للمشاركة الفورية</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport('CSV')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-all text-right cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="text-xs">تصدير CSV (.csv)</span>
                  </button>

                  <button
                    onClick={() => handleExport('JSON')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-all text-right cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="text-xs">تصدير هيكل بيانات JSON</span>
                  </button>

                  <div className="border-t border-slate-100 my-1 pt-1">
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        const res = AutoArchiverService.archiveDocument({
                          category: modelType === 'FINANCIAL_STATEMENTS' ? 'FINANCIAL_STATEMENTS' : 'GENERAL_REPORT',
                          title: `${effectiveTitle} [معتمد وموثق]`,
                          notes: `أرشفة آلية مباشرة من شريط الأدوات للشاشة: ${effectiveTitle}`,
                        });
                        if (res.success && res.timestampCode) {
                          showFeedback('success', `تمت الأرشفة الآلية بنجاح في ملف العميل! كود التوثيق: ${res.timestampCode}`);
                        } else {
                          showFeedback('error', res.error || 'تعذر إتمام الأرشفة');
                        }
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-all text-right cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="flex-1 truncate">
                        <div className="font-bold text-xs">أرشفة آلية في ملف العميل</div>
                        <div className="text-[10px] text-emerald-700 font-normal">AutoArchiver بترميز زمني موثق</div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {showImport && (
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={isImporting}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 font-bold transition-all text-right cursor-pointer"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                    <div className="flex-1 truncate">
                      <div className="font-bold text-xs">استيراد بيانات من ملف</div>
                      <div className="text-[10px] text-slate-400">Excel أو CSV أو JSON</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Inline Feedback Bubble */}
      {feedback && (
        <div
          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs animate-in fade-in zoom-in-95 duration-150 ${
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
        title={effectiveTitle}
        targetElementId={targetElementId || printSelector || 'financial-statements-container'}
        customDocument={customDocument}
        initialPageSize={pageSize === 'Default' ? 'A4' : pageSize}
        initialOrientation={orientation}
      />
    </div>
  );
};

