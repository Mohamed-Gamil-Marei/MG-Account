import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  CheckCircle2,
  Download,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { PrintService } from '../../services/PrintService';
import { exportElementToPdf } from '../../utils/certifiedDocumentExporter';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  documentTitle?: string;
  targetElementId?: string;
  modelType?: string;
  customDocument?: any;
  initialPageSize?: 'A4' | 'A3' | 'Letter' | 'Thermal80mm';
  initialOrientation?: 'portrait' | 'landscape' | 'PORTRAIT' | 'LANDSCAPE';
  children?: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  documentTitle,
  targetElementId = 'financial-statements-container',
  initialPageSize = 'A4',
  initialOrientation = 'portrait',
  children,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    String(initialOrientation).toLowerCase() === 'landscape' ? 'landscape' : 'portrait'
  );
  const [pageSize, setPageSize] = useState<'A4' | 'A3' | 'Letter' | 'Thermal80mm'>(initialPageSize);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const [clonedHtml, setClonedHtml] = useState<string>('');
  
  const effectiveTitle = title || documentTitle || 'معاينة الطباعة المعتمدة';

  useEffect(() => {
    if (!isOpen) return;

    if (!children) {
      // Find and clone target element from DOM
      const el = PrintService.findPrintableElement(targetElementId);
      if (el) {
        // Clone and sanitize inputs to clean text
        const clone = el.cloneNode(true) as HTMLElement;
        const inputs = clone.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          'input, select, textarea'
        );
        inputs.forEach((input) => {
          const span = document.createElement('span');
          span.className = 'font-mono font-bold text-slate-900 inline-block px-1';
          span.textContent = input.value || '';
          input.parentNode?.replaceChild(span, input);
        });

        const hideNodes = clone.querySelectorAll<HTMLElement>(
          'button, .no-print, [data-no-print="true"], .action-toolbar, .screen-action-toolbar'
        );
        hideNodes.forEach((node) => node.remove());

        setClonedHtml(clone.innerHTML);
      }
    }
  }, [isOpen, children, targetElementId]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    try {
      await PrintService.printElementById(targetElementId, {
        title: effectiveTitle,
        orientation,
        pageSize,
        customDelayMs: 250,
        onAfterPrint: () => {
          setPrintSuccess(true);
          setTimeout(() => setPrintSuccess(false), 3500);
        },
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const cleanName = effectiveTitle.replace(/\s+/g, '_');
      const timeStr = new Date().toISOString().slice(0, 10);
      await exportElementToPdf(targetElementId, `${cleanName}_${timeStr}.pdf`, {
        orientation,
        format: pageSize.toLowerCase() as any,
      });
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3500);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-between p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>المعاينة الرسمية المعتمدة للطباعة (Official Print Preview)</span>
              {printSuccess && (
                <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> تم التنفيذ بنجاح
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">{effectiveTitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
              title="تصغير"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-2 text-slate-200 font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(160, prev + 10))}
              title="تكبير"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              orientation === 'portrait'
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-emerald-900/80 text-emerald-200 border-emerald-600 font-bold'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{orientation === 'portrait' ? '📄 رأسي (Portrait)' : '📃 أفقي (Landscape)'}</span>
          </button>

          {/* PDF Direct Export */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="تصدير ملف PDF معتمد"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'جاري إنشاء PDF...' : 'تصدير PDF'}</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{isPrinting ? 'جاري تجهيز الطباعة...' : 'طباعة التقرير فوراً'}</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition-all"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-auto my-3 p-4 flex justify-center items-start bg-slate-950/60 rounded-2xl border border-slate-800/80">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: orientation === 'portrait' ? '210mm' : '297mm',
            minHeight: orientation === 'portrait' ? '297mm' : '210mm',
          }}
          className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 my-4 border border-slate-300"
        >
          {children ? (
            children
          ) : (
            <div
              className="printable-canvas-preview text-slate-900 text-right leading-relaxed"
              dangerouslySetInnerHTML={{ __html: clonedHtml }}
            />
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-slate-900/90 text-slate-400 px-5 py-2 rounded-xl text-[11px] flex items-center justify-between border border-slate-800 shrink-0">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          معاينة مطابقة بنسبة 100% للطباعة الورقية وملفات PDF المعتمدة (معالجة الأوراق الفارغة مفعلة).
        </span>
        <span className="font-mono text-slate-300">
          الصفحة: A4 ({orientation === 'portrait' ? 'رأسي' : 'أفقي'})
        </span>
      </div>
    </div>
  );
};

