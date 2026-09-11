import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Eye,
  Sliders,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PrintService, PrintElementOptions } from '../../services/PrintService';
import { exportElementToPdf } from '../../utils/certifiedDocumentExporter';

export interface PrintPreviewModalProps {
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
  const [zoomLevel, setZoomLevel] = useState<number>(90);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    String(initialOrientation).toLowerCase() === 'landscape' ? 'landscape' : 'portrait'
  );
  const [pageSize, setPageSize] = useState<'A4' | 'A3' | 'Letter' | 'Thermal80mm'>(initialPageSize);
  const [margins, setMargins] = useState<'DEFAULT' | 'NARROW' | 'NONE'>('DEFAULT');

  // Official elements toggles
  const [showLetterhead, setShowLetterhead] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showQr, setShowQr] = useState<boolean>(true);

  // Page Selection & Smart Resequencing
  const [pageSelectionMode, setPageSelectionMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([1]);
  const [customRangeInput, setCustomRangeInput] = useState<string>('1');
  const [resequencePageNumbers, setResequencePageNumbers] = useState<boolean>(true);

  // Execution states
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const [clonedHtml, setClonedHtml] = useState<string>('');

  const effectiveTitle = title || documentTitle || 'معاينة الطباعة المعتمدة';

  // Parse custom range input (e.g. "1, 3, 5-7")
  const parseRangeString = (str: string, max: number): number[] => {
    const pages = new Set<number>();
    const parts = str.split(/[,;\s]+/).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(max, Math.max(start, end));
          for (let p = from; p <= to; p++) pages.add(p);
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val) && val >= 1 && val <= max) {
          pages.add(val);
        }
      }
    }

    const arr = Array.from(pages).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1];
  };

  // Inspect target element whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    const inspectElement = () => {
      const el = PrintService.findPrintableElement(targetElementId);
      if (el) {
        // Find separate page sheets
        const sheetEls = el.querySelectorAll<HTMLElement>(
          '[id^="page-sheet-"], [data-page-index], .a4-sheet-canvas, .printable-page, .print-sheet'
        );
        const count = sheetEls.length > 0 ? sheetEls.length : 1;
        setTotalPages(count);

        const initialAll = Array.from({ length: count }, (_, i) => i + 1);
        setSelectedPages(initialAll);
        setCustomRangeInput(count > 1 ? `1-${count}` : '1');
        setPageSelectionMode('ALL');

        // Clone and sanitize text
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

        clone
          .querySelectorAll<HTMLElement>(
            'button, .no-print, [data-no-print="true"], .action-toolbar, .screen-action-toolbar'
          )
          .forEach((node) => node.remove());

        setClonedHtml(clone.innerHTML);
      }
    };

    const timer = setTimeout(inspectElement, 150);
    return () => clearTimeout(timer);
  }, [isOpen, targetElementId]);

  // Handle page toggle chip
  const togglePageSelection = (pageNum: number) => {
    let next: number[];
    if (selectedPages.includes(pageNum)) {
      if (selectedPages.length === 1) return; // Keep at least one page
      next = selectedPages.filter((p) => p !== pageNum);
    } else {
      next = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(next);
    setCustomRangeInput(next.join(', '));
    setPageSelectionMode('CUSTOM');
  };

  const handleSelectAllPages = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setCustomRangeInput(totalPages > 1 ? `1-${totalPages}` : '1');
    setPageSelectionMode('ALL');
  };

  const handleCustomRangeTextChange = (text: string) => {
    setCustomRangeInput(text);
    const parsed = parseRangeString(text, totalPages);
    setSelectedPages(parsed);
    setPageSelectionMode('CUSTOM');
  };

  if (!isOpen) return null;

  // Print Execution
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    try {
      const options: PrintElementOptions = {
        title: effectiveTitle,
        orientation,
        pageSize,
        margins,
        selectedPages: pageSelectionMode === 'CUSTOM' ? selectedPages : undefined,
        resequencePageNumbers,
        showLetterhead,
        showStamp,
        showQr,
        customDelayMs: 300,
        onAfterPrint: () => {
          setPrintSuccess(true);
          setTimeout(() => setPrintSuccess(false), 4000);
        },
      };

      await PrintService.printElementById(targetElementId, options);
    } finally {
      setIsPrinting(false);
    }
  };

  // PDF Export Execution
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
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col md:flex-row text-slate-100 font-sans select-none animate-in fade-in duration-200">
      {/* 
        RIGHT SIDEBAR: Print Controls & Layout Options 
        (لوحة أوامر وضبط الطباعة الجانبية المتوافقة مع المعايير القياسية لأنظمة التشغيل)
      */}
      <aside className="w-full md:w-[380px] lg:w-[400px] h-auto md:h-full bg-slate-900 border-b md:border-b-0 md:border-l border-slate-800 flex flex-col justify-between shrink-0 shadow-2xl z-30 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>إعدادات وأوامر الطباعة</span>
                {printSuccess && (
                  <span className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> تم بنجاح
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={effectiveTitle}>
                {effectiveTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <div className="p-4 space-y-4 text-xs">
          {/* Primary Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPrinting ? 'جاري تجهيز الطباعة...' : 'طباعة المستند الآن (Ctrl+P)'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-all disabled:opacity-50"
            >
              {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingPdf ? 'جاري إنشاء PDF...' : 'تصدير ملف PDF رسمي معتمد'}</span>
            </button>
          </div>

          {/* Page Range & Selection (تحديد واختيار الصفحات المراد طباعتها) */}
          <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>نطاق الصفحات للطباعة:</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                {selectedPages.length} من {totalPages} صفحة
              </span>
            </div>

            {/* Selection Mode Switch */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllPages}
                className={`py-1.5 px-2 rounded-lg font-bold text-center border cursor-pointer transition-all ${
                  pageSelectionMode === 'ALL'
                    ? 'bg-emerald-700 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800'
                }`}
              >
                جميع الصفحات ({totalPages})
              </button>
              <button
                type="button"
                onClick={() => setPageSelectionMode('CUSTOM')}
                className={`py-1.5 px-2 rounded-lg font-bold text-center border cursor-pointer transition-all ${
                  pageSelectionMode === 'CUSTOM'
                    ? 'bg-emerald-700 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800'
                }`}
              >
                تحديد صفحات مخصصة
              </button>
            </div>

            {/* Custom Interactive Page Selection */}
            {totalPages > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>انقر لاختيار الصفحات:</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    المحدد: {selectedPages.join(', ')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-900 rounded-lg border border-slate-800">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isSelected = selectedPages.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePageSelection(p)}
                        className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs scale-105'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                        }`}
                        title={`صفحة ${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    أو اكتب أرقام الصفحات مفصولة بفاصلة أو شرطة (مثال: 1, 3 أو 1-3):
                  </label>
                  <input
                    type="text"
                    value={customRangeInput}
                    onChange={(e) => handleCustomRangeTextChange(e.target.value)}
                    placeholder="مثال: 1, 3 أو 2-4"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Resequencing Toggle (إعادة ترقيم تذييل الصفحات) */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resequencePageNumbers}
                  onChange={(e) => setResequencePageNumbers(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-300 leading-snug">
                  <strong className="text-emerald-300">إعادة ترقيم تذييل الصفحات المحددة تلقائياً</strong>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    (عند تحديد صفحات معينة مثل 2 و 4، يُعاد ترقيم أسفل الصفحة: صفحة 1 من 2، صفحة 2 من 2)
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Paper Size & Orientation (مقاس الورق والاتجاه) */}
          <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2.5">
            <span className="font-bold text-slate-200 block">إعدادات الورقة والمقاس:</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">المقاس:</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="A3">A3 (297 × 420 mm)</option>
                  <option value="Letter">Letter</option>
                  <option value="Thermal80mm">طابعة إيصالات (80mm)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">الاتجاه:</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="portrait">📄 رأسي (Portrait)</option>
                  <option value="landscape">📃 أفقي (Landscape)</option>
                </select>
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">الهوامش المحاسبية:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['DEFAULT', 'NARROW', 'NONE'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargins(m)}
                    className={`py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      margins === m
                        ? 'bg-emerald-700 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-900 text-slate-300 border-slate-750'
                    }`}
                  >
                    {m === 'DEFAULT' ? 'قياسي (8mm)' : m === 'NARROW' ? 'ضيق (5mm)' : 'بدون'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Official Elements Toggles */}
          <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
            <span className="font-bold text-slate-200 block">عناصر التوثيق والاعتماد:</span>
            <div className="space-y-1.5 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLetterhead}
                  onChange={(e) => setShowLetterhead(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="text-slate-300">إظهار الترويسة وبيانات المكتب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="text-slate-300">إظهار خاتم الاعتماد وتوقيع المحاسب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="text-slate-300">إظهار باركود ورمز التحقق الأمني (QR)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> معالجة الصفحات الفارغة مفعلة
          </span>
          <span className="font-mono text-slate-500">100% متطابق مع المعايير</span>
        </div>
      </aside>

      {/* 
        MAIN VIEWPORT: Live Print Screen Preview
        (عرض الشاشة الخاصة بالطباعة بباقي الشاشة مثل النظام المتعارف عليه)
      */}
      <main className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden relative">
        {/* Top Floating Viewport Toolbar */}
        <div className="h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-white hidden sm:inline">المعاينة الطباعية المباشرة (WYSIWYG)</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-emerald-400 font-mono font-bold">
              الصفحات المحددة للطباعة: [{selectedPages.join(', ')}]
            </span>
          </div>

          {/* Quick Zoom & Reset Controls */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs font-bold text-white px-2">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(90)}
              className="text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-700 cursor-pointer font-bold"
            >
              ملائم
            </button>
          </div>
        </div>

        {/* Scrollable Viewport with A4 Paper Canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-950/80">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              width: orientation === 'portrait' ? '210mm' : '297mm',
              minHeight: orientation === 'portrait' ? '297mm' : '210mm',
            }}
            className="a4-sheet-canvas bg-white text-slate-900 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-10 border border-slate-300 text-right leading-relaxed transition-all"
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
      </main>
    </div>
  );
};
