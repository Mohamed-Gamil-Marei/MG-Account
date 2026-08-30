import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Printer,
  Eye,
  X,
  Columns,
  Sliders,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Check,
  ChevronDown,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Phone,
  ShieldCheck,
  Building,
  QrCode,
  FileText,
  Settings2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ModelType, getModelTabularData, exportModelData } from '../../utils/dataImportExport';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../../utils/qrCodeGenerator';
import * as XLSX from 'xlsx';

export type MarginPreset = 'normal' | 'narrow' | 'wide' | 'zero' | 'custom';
export type PageSize = 'A4' | 'A3' | 'Letter' | 'Thermal80mm';
export type PageOrientation = 'portrait' | 'landscape';
export type TableDensity = 'compact' | 'normal' | 'relaxed';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelType: ModelType;
  title: string;
  customRows?: Record<string, any>[];
  customColumns?: string[];
  subtitle?: string;
  initialPageSize?: PageSize;
  initialOrientation?: PageOrientation;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  modelType,
  title,
  customRows,
  customColumns,
  subtitle,
  initialPageSize = 'A4',
  initialOrientation = 'portrait',
}) => {
  const dbState = db.getState();
  const officeProfile = dbState.officeProfile || {
    firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
    auditorName: 'محمد جميل مرعي',
    title: 'محاسب قانوني ومراجع حسابات - زميل جمعية المحاسبين والمراجعين المصرية',
    licenseNumber: 'س.م.م / 43122 - ترخيص وزارة المالية',
    taxAuthorityRegNo: 'م.ض. 492-817-302',
    phone: '01003335360',
    mobile: '01003335360',
    email: 'cpa.mohamed.marei@egyptcpa.com',
    address: 'ميدان التحرير / شارع قصر العيني - القاهرة - جمهورية مصر العربية',
  };

  // 1. Raw Tabular Data Extraction
  const allRows: Record<string, any>[] = useMemo(() => {
    if (customRows && customRows.length > 0) return customRows;
    return getModelTabularData(modelType, dbState);
  }, [modelType, customRows, dbState]);

  // 2. Discover all Column Keys
  const allAvailableColumns: string[] = useMemo(() => {
    if (customColumns && customColumns.length > 0) return customColumns;
    if (allRows.length === 0) return [];
    const keysSet = new Set<string>();
    allRows.forEach((row) => {
      Object.keys(row).forEach((k) => keysSet.add(k));
    });
    return Array.from(keysSet);
  }, [allRows, customColumns]);

  // 3. Column Visibility State (Set of active/visible columns)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');

  // Sync default selected columns when available columns change
  useEffect(() => {
    if (allAvailableColumns.length > 0) {
      // Default: exclude QR strings or redundant payloads from standard printed table unless chosen
      const defaultCols = allAvailableColumns.filter(
        (col) => !col.includes('رمز') && !col.includes('Payload') && !col.includes('QR')
      );
      setSelectedColumns(defaultCols.length > 0 ? defaultCols : allAvailableColumns);
    }
  }, [allAvailableColumns]);

  // 4. Page Layout & Margins Controls
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const [orientation, setOrientation] = useState<PageOrientation>(initialOrientation);
  const [marginPreset, setMarginPreset] = useState<MarginPreset>('normal');
  const [customMargins, setCustomMargins] = useState({
    top: 10,
    bottom: 10,
    right: 10,
    left: 10,
  });

  // 5. Header, Footer, and Content Options
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showPhoneContact, setShowPhoneContact] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showTotalsRow, setShowTotalsRow] = useState(true);
  const [density, setDensity] = useState<TableDensity>('normal');
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [zoomScale, setZoomScale] = useState<number>(100);

  // 6. Active Margins in MM
  const activeMarginsMm = useMemo(() => {
    switch (marginPreset) {
      case 'zero':
        return { top: 3, bottom: 3, right: 3, left: 3 };
      case 'narrow':
        return { top: 5, bottom: 5, right: 5, left: 5 };
      case 'wide':
        return { top: 20, bottom: 20, right: 20, left: 20 };
      case 'custom':
        return customMargins;
      case 'normal':
      default:
        return { top: 10, bottom: 10, right: 10, left: 10 };
    }
  }, [marginPreset, customMargins]);

  // 7. Filtered Columns List for UI
  const filteredColumnsToChoose = useMemo(() => {
    if (!columnSearchTerm.trim()) return allAvailableColumns;
    return allAvailableColumns.filter((c) =>
      c.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );
  }, [allAvailableColumns, columnSearchTerm]);

  // 8. Column Toggles Handlers
  const toggleColumn = (columnName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(allAvailableColumns);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const invertSelection = () => {
    setSelectedColumns((prev) =>
      allAvailableColumns.filter((c) => !prev.includes(c))
    );
  };

  // 9. Numeric Totals Calculation for Selected Columns
  const numericTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedColumns.forEach((col) => {
      let sum = 0;
      let hasNumeric = false;
      allRows.forEach((r) => {
        const val = r[col];
        if (typeof val === 'number' && !isNaN(val)) {
          sum += val;
          hasNumeric = true;
        } else if (typeof val === 'string') {
          const clean = val.replace(/,/g, '').trim();
          const parsed = parseFloat(clean);
          if (!isNaN(parsed) && /^-?\d+(\.\d+)?$/.test(clean)) {
            sum += parsed;
            hasNumeric = true;
          }
        }
      });
      if (hasNumeric) {
        totals[col] = sum;
      }
    });
    return totals;
  }, [allRows, selectedColumns]);

  // 10. Perform Direct Print
  const handlePrintDocument = () => {
    const styleId = 'egypt-cpa-print-preview-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let sizeCss = 'A4 portrait';
    if (pageSize === 'A4') sizeCss = `A4 ${orientation}`;
    else if (pageSize === 'A3') sizeCss = `A3 ${orientation}`;
    else if (pageSize === 'Letter') sizeCss = `letter ${orientation}`;
    else if (pageSize === 'Thermal80mm') sizeCss = `80mm auto`;

    styleEl.innerHTML = `
      @page {
        size: ${sizeCss};
        margin-top: ${activeMarginsMm.top}mm;
        margin-bottom: ${activeMarginsMm.bottom}mm;
        margin-right: ${activeMarginsMm.right}mm;
        margin-left: ${activeMarginsMm.left}mm;
      }
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-preview-canvas, #printable-preview-canvas * {
          visibility: visible !important;
        }
        #printable-preview-canvas {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
        }
      }
    `;

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 11. Export Filtered Excel Sheet with currently selected columns only
  const handleExportFilteredExcel = () => {
    const filteredRows = allRows.map((r, idx) => {
      const rowObj: Record<string, any> = { 'م': idx + 1 };
      selectedColumns.forEach((c) => {
        rowObj[c] = r[c] ?? '';
      });
      return rowObj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredRows);
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${title}_المعاينة_المعتمدة_${timestamp}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* ========================================================================= */}
        {/* Top Modal Header                                                          */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
              <Eye className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">معاينة الطباعة وضبط الهوامش والأعمدة</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>المحاسب القانوني: {officeProfile.auditorName}</span>
                <span>•</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {officeProfile.phone || '01003335360'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl text-xs">
              <button
                onClick={() => setZoomScale((prev) => Math.max(50, prev - 10))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1 text-slate-300">{zoomScale}%</span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(150, prev + 10))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomScale(100)}
                className="text-[10px] px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 cursor-pointer ml-1"
                title="إعادة ضبط 100%"
              >
                100%
              </button>
            </div>

            {/* Export Filtered Excel */}
            <button
              onClick={handleExportFilteredExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="تصدير كملف Excel بالأعمدة المختارة"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير إكسل بالأعمدة المحددة</span>
            </button>

            {/* Primary Print Button */}
            <button
              onClick={handlePrintDocument}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/50 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>إرسال إلى الطابعة الآن (Ctrl+P)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Main Body: Two-Column Layout (Controls Panel + Live Sheet Canvas)           */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ----------------------------------------------------------------------- */}
          {/* Side Settings Panel: Margins, Columns, Orientation, Header toggles      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="w-full lg:w-84 xl:w-96 bg-slate-900/95 border-b lg:border-b-0 lg:border-l border-slate-800 p-4 overflow-y-auto space-y-5 text-xs">
            {/* 1. Page Size & Orientation */}
            <div className="space-y-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  حجم واتجاه الصفحة
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Page Setup</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">المقاس</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSize)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-medium focus:ring-1 focus:ring-emerald-500 text-xs"
                  >
                    <option value="A4">A4 القياسي (210 × 297 mm)</option>
                    <option value="A3">A3 العريض (297 × 420 mm)</option>
                    <option value="Letter">Letter (8.5 × 11 in)</option>
                    <option value="Thermal80mm">طابعة كاشير حرارية (80mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الاتجاه</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as PageOrientation)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-medium focus:ring-1 focus:ring-emerald-500 text-xs"
                  >
                    <option value="portrait">طولي (Portrait)</option>
                    <option value="landscape">عرضي (Landscape)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Page Margins Control (الهوامش) */}
            <div className="space-y-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  هوامش الصفحة (Margins)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {marginPreset === 'custom'
                    ? `${customMargins.top}mm`
                    : marginPreset === 'narrow'
                    ? '5mm'
                    : marginPreset === 'wide'
                    ? '20mm'
                    : marginPreset === 'zero'
                    ? '3mm'
                    : '10mm'}
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'narrow', label: 'ضيق (5mm)' },
                  { id: 'normal', label: 'عادي (10mm)' },
                  { id: 'wide', label: 'عريض (20mm)' },
                  { id: 'custom', label: 'مخصص...' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setMarginPreset(p.id as MarginPreset)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      marginPreset === p.id
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Margins Sliders */}
              {marginPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      أعلى: <span className="text-emerald-400 font-mono">{customMargins.top}mm</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={customMargins.top}
                      onChange={(e) =>
                        setCustomMargins((prev) => ({ ...prev, top: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      أسفل: <span className="text-emerald-400 font-mono">{customMargins.bottom}mm</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={customMargins.bottom}
                      onChange={(e) =>
                        setCustomMargins((prev) => ({ ...prev, bottom: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      يمين: <span className="text-emerald-400 font-mono">{customMargins.right}mm</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={customMargins.right}
                      onChange={(e) =>
                        setCustomMargins((prev) => ({ ...prev, right: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      يسار: <span className="text-emerald-400 font-mono">{customMargins.left}mm</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={customMargins.left}
                      onChange={(e) =>
                        setCustomMargins((prev) => ({ ...prev, left: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Column Visibility Selector (إخفاء / إظهار الأعمدة) */}
            <div className="space-y-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Columns className="w-4 h-4 text-amber-400" />
                  الأعمدة المراد إظهارها / إخفاؤها
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {selectedColumns.length} / {allAvailableColumns.length}
                </span>
              </div>

              {/* Column Search & Actions */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="بحث في أسماء الأعمدة..."
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs placeholder:text-slate-500"
                />

                <div className="flex items-center justify-between text-[11px] gap-1">
                  <button
                    onClick={selectAllColumns}
                    className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3" />
                    تحديد الكل
                  </button>
                  <button
                    onClick={deselectAllColumns}
                    className="text-red-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" />
                    إلغاء الكل
                  </button>
                  <button
                    onClick={invertSelection}
                    className="text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    عكس التحديد
                  </button>
                </div>
              </div>

              {/* Checkbox List */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                {filteredColumnsToChoose.map((col) => {
                  const isChecked = selectedColumns.includes(col);
                  return (
                    <label
                      key={col}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-slate-800/80 text-slate-100 font-medium'
                          : 'text-slate-400 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="truncate ml-2">{col}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(col)}
                        className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Document Elements & Density */}
            <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-slate-200 font-bold flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-purple-400" />
                عناصر الترويسة والتذييل
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(e) => setShowHeader(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>ترويسة المكتب</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showPhoneContact}
                    onChange={(e) => setShowPhoneContact(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>هاتف المكتب (01003335360)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showStamp}
                    onChange={(e) => setShowStamp(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>ختم وتوقيع المراجع</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>رمز QR التوثيقي</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showTotalsRow}
                    onChange={(e) => setShowTotalsRow(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>سطر الإجماليات</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={(e) => setShowFooter(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>تذييل وترقيم الصفحات</span>
                </label>
              </div>

              {/* Table Density & Font Size */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">كثافة الصفوف</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value as TableDensity)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  >
                    <option value="compact">مضغوط (صفحة واحدة)</option>
                    <option value="normal">عادي ومتوازن</option>
                    <option value="relaxed">متباعد ومريح</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">حجم الخط</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  >
                    <option value="xs">صغير (10pt)</option>
                    <option value="sm">متوسط (11pt)</option>
                    <option value="base">كبير (12pt)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* Main Document Canvas: Realistic Paper Rendering with applied styles     */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto flex items-start justify-center">
            <div
              id="printable-preview-canvas"
              style={{
                transform: `scale(${zoomScale / 100})`,
                transformOrigin: 'top center',
                paddingTop: `${activeMarginsMm.top}mm`,
                paddingBottom: `${activeMarginsMm.bottom}mm`,
                paddingRight: `${activeMarginsMm.right}mm`,
                paddingLeft: `${activeMarginsMm.left}mm`,
                width:
                  pageSize === 'Thermal80mm'
                    ? '80mm'
                    : orientation === 'landscape'
                    ? '297mm'
                    : '210mm',
                minHeight:
                  pageSize === 'Thermal80mm'
                    ? 'auto'
                    : orientation === 'landscape'
                    ? '210mm'
                    : '297mm',
              }}
              className="bg-white text-slate-900 shadow-2xl rounded-sm transition-all duration-150 relative text-xs flex flex-col justify-between"
            >
              {/* Top Letterhead Header */}
              {showHeader && (
                <div className="border-b-2 border-emerald-900 pb-3 mb-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 text-right">
                      <h1 className="text-sm sm:text-base font-black text-slate-900">
                        {officeProfile.firmName}
                      </h1>
                      <div className="text-xs font-bold text-emerald-900">
                        {officeProfile.auditorName}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {officeProfile.title}
                      </div>
                      <div className="text-[10px] text-slate-700 font-mono">
                        رقم القيد بسجل المحاسبين والمراجعين: <strong>{officeProfile.licenseNumber}</strong>
                      </div>
                    </div>

                    <div className="text-left space-y-1 font-mono text-[10px] text-slate-600">
                      <div className="font-bold text-slate-900">{officeProfile.taxAuthorityRegNo}</div>
                      {showPhoneContact && (
                        <div className="text-emerald-900 font-bold text-[11px] flex items-center justify-end gap-1">
                          <span>هاتف:</span>
                          <strong className="font-mono">{officeProfile.phone || '01003335360'}</strong>
                        </div>
                      )}
                      <div>تاريخ التقرير: <strong>{new Date().toISOString().slice(0, 10)}</strong></div>
                      <div>عدد السجلات: <strong>{allRows.length}</strong></div>
                    </div>
                  </div>

                  {/* Title Banner */}
                  <div className="text-center pt-2">
                    <div className="inline-block px-6 py-1 bg-emerald-50 border border-emerald-800 rounded-lg">
                      <h2 className="text-xs sm:text-sm font-black text-emerald-950">
                        {title}
                      </h2>
                    </div>
                    {subtitle && (
                      <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Center Table of Data with Selected Columns */}
              <div className="flex-1 overflow-x-auto">
                {selectedColumns.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="font-bold text-sm">لم يتم تحديد أي أعمدة للطباعة</p>
                    <p className="text-xs mt-1">يرجى اختيار عمود واحد على الأقل من القائمة الجانبية</p>
                  </div>
                ) : allRows.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="font-bold text-sm">لا توجد بيانات أو سجلات حالية في هذا النموذج</p>
                  </div>
                ) : (
                  <table className="w-full text-right border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-900 font-bold border-b border-slate-300">
                        <th className="p-1.5 border-l border-slate-300 text-center w-8 text-[10px]">
                          م
                        </th>
                        {selectedColumns.map((col) => (
                          <th
                            key={col}
                            className={`p-1.5 border-l border-slate-300 font-black text-slate-900 ${
                              fontSize === 'xs'
                                ? 'text-[10px]'
                                : fontSize === 'sm'
                                ? 'text-[11px]'
                                : 'text-xs'
                            }`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="p-1 border-l border-slate-200 text-center font-mono text-[9px] text-slate-500">
                            {rIdx + 1}
                          </td>
                          {selectedColumns.map((col) => {
                            const val = row[col];
                            const isNumeric = typeof val === 'number';
                            return (
                              <td
                                key={col}
                                className={`border-l border-slate-200 ${
                                  density === 'compact'
                                    ? 'p-0.5'
                                    : density === 'relaxed'
                                    ? 'p-2'
                                    : 'p-1.5'
                                } ${
                                  fontSize === 'xs'
                                    ? 'text-[10px]'
                                    : fontSize === 'sm'
                                    ? 'text-[11px]'
                                    : 'text-xs'
                                } ${
                                  isNumeric
                                    ? 'font-mono text-left font-bold text-emerald-950'
                                    : 'text-slate-800'
                                }`}
                              >
                                {isNumeric
                                  ? formatEgyptianCurrency(val)
                                  : val !== undefined && val !== null
                                  ? String(val)
                                  : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>

                    {/* Optional Totals Row */}
                    {showTotalsRow && Object.keys(numericTotals).length > 0 && (
                      <tfoot>
                        <tr className="bg-emerald-50 font-black border-t-2 border-emerald-900 text-emerald-950">
                          <td className="p-1.5 border-l border-slate-300 text-center text-[10px]">
                            ∑
                          </td>
                          {selectedColumns.map((col) => {
                            const totalVal = numericTotals[col];
                            return (
                              <td
                                key={col}
                                className="p-1.5 border-l border-slate-300 font-mono text-left text-xs font-black"
                              >
                                {totalVal !== undefined
                                  ? formatEgyptianCurrency(totalVal)
                                  : ''}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* Bottom Sign-off, Stamp, & QR Verification Footer */}
              {showFooter && (
                <div className="mt-6 pt-4 border-t-2 border-emerald-900 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    {/* Auditor Signature Text */}
                    <div className="space-y-1 text-right">
                      <div className="text-[10px] text-slate-500 font-bold">
                        المحاسب القانوني ومراقب الحسابات:
                      </div>
                      <div className="text-xs font-black text-slate-900">
                        {officeProfile.auditorName}
                      </div>
                      <div className="text-[10px] text-emerald-800 font-bold font-mono">
                        {officeProfile.licenseNumber}
                      </div>
                    </div>

                    {/* Official Stamp & QR Code */}
                    <div className="flex items-center gap-3">
                      {showStamp && (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[8px] font-bold text-emerald-950 p-1 text-center shadow-2xs">
                          <span>مكتب المحاسب القانوني</span>
                          <span className="text-emerald-800 font-black text-[9px]">
                            {officeProfile.auditorName}
                          </span>
                          <span className="font-mono text-[7px]">س.م.م 43122</span>
                          <span className="text-[7px] text-emerald-700">ختم الاعتماد</span>
                        </div>
                      )}

                      {showQrCode && (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: generateQrCodeSvg(
                              `CPA|${title}|${allRows.length}_RECS|${officeProfile.auditorName}|${officeProfile.licenseNumber}|${officeProfile.phone || '01003335360'}`,
                              64
                            ),
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Office Bottom Footer Line */}
                  <div className="text-[9px] text-slate-500 text-center border-t border-slate-200 pt-1.5 flex items-center justify-between flex-wrap gap-1">
                    <span>{officeProfile.address}</span>
                    <span className="font-bold text-emerald-900 font-mono">
                      هاتف المكتب: {officeProfile.phone || '01003335360'}
                    </span>
                    <span>النظام المحاسبي المصري الموحد (EAS)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
