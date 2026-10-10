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
  Sliders,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  FileDown,
} from 'lucide-react';
import { ModelType, ExportFormat, exportModelData, importModelData } from '../../utils/dataImportExport';
import { exportElementToPdf, exportElementToImage } from '../../utils/certifiedDocumentExporter';
import { db } from '../../db/localDatabase';
import { PrintPreviewModal } from './PrintPreviewModal';
import { PrintService } from '../../services/PrintService';
import { ActionButton } from './ActionButton';
import { AutoArchiverService } from '../../services/AutoArchiver';
import { DirectWhatsAppProcedureModal } from './DirectWhatsAppProcedureModal';
import { PrintHeaderCustomizerModal } from '../credit/PrintHeaderCustomizerModal';
import { TemplateGeneratorService } from '../../services/TemplateGeneratorService';
import {
  ProcedureWhatsAppType,
  ProcedureWhatsAppContext,
} from '../../utils/procedureWhatsAppTemplates';

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
  recordId?: string; // المعرف الثابت الفريد للسجل الحالي لمنع تداخل البيانات
  title?: string;
  screenTitle?: string;
  state?: any;
  actions?: ScreenActionButtonItem[];
  count?: number;
  printSelector?: string; // CSS selector or ID to print
  targetElementId?: string; // Specific ID for PDF/Image capture
  onRefresh?: () => void;
  customActions?: React.ReactNode;
  customDocument?: any; // Specific active certificate/invoice/etc.
  showPrint?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showTemplates?: boolean;
  showPreview?: boolean;
  showWhatsApp?: boolean; // Direct in-app WhatsApp sender
  whatsAppContext?: Partial<ProcedureWhatsAppContext>;
  whatsAppProcedureType?: ProcedureWhatsAppType;
  compact?: boolean;
  className?: string;
}

export const ScreenActionToolbar: React.FC<ScreenActionToolbarProps> = ({
  modelType = 'ALL_DATA',
  recordId,
  title = '',
  screenTitle,
  state: _state,
  actions,
  count: _count,
  printSelector,
  targetElementId,
  onRefresh,
  customActions,
  customDocument,
  showPrint = true,
  showExport = true,
  showImport = true,
  showTemplates = true,
  showPreview = true,
  showWhatsApp = false,
  whatsAppContext,
  whatsAppProcedureType,
  compact: _compact = true,
  className = '',
}) => {
  const effectiveModelType = (modelType || 'ALL_DATA') as ModelType;
  const effectiveTitle = title || screenTitle || 'المستند المالي';

  // State menus
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isHeaderCustomizerOpen, setIsHeaderCustomizerOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Print settings
  const [pageSize, setPageSize] = useState<PageSizeOption>('A4');
  const [orientation, setOrientation] = useState<PageOrientationOption>('portrait');

  // Loading & Feedback
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [acceptedFormat, setAcceptedFormat] = useState<string>('.xlsx,.xls,.csv,.json');

  // Resolve target selector with smart DOM fallback
  const getResolvedTarget = (): string | undefined => {
    if (targetElementId) return targetElementId;
    if (printSelector) return printSelector;
    if (toolbarRef.current) {
      const parentCard = toolbarRef.current.closest<HTMLElement>(
        '.unified-screen-card, [data-unified-screen="true"], [id$="-card"], [id$="-container"]'
      );
      if (parentCard && parentCard.id) return `#${parentCard.id}`;
    }
    return undefined;
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Derive Procedure Type from Model Type or Document for WhatsApp
  const deriveProcedureType = (): ProcedureWhatsAppType => {
    if (whatsAppProcedureType) return whatsAppProcedureType;
    if (whatsAppContext?.procedureType) return whatsAppContext.procedureType;

    const mt = String(effectiveModelType).toUpperCase();
    if (mt.includes('INVOICE') || mt.includes('BILLING')) return 'INVOICE_CLAIM';
    if (mt.includes('TREASURY')) return 'TREASURY_RECEIPT';
    if (mt.includes('CERTIFICATE')) {
      if (customDocument?.certificateType === 'INVESTED_CAPITAL') return 'CERTIFICATE_CAPITAL';
      if (customDocument?.certificateType === 'SOLVENCY_FINANCIAL_STANDING') return 'CERTIFICATE_SOLVENCY';
      if (customDocument?.certificateType === 'AUDITOR_REPORT') return 'CERTIFICATE_AUDITOR';
      return 'CERTIFICATE_INCOME';
    }
    if (mt.includes('TAX') || mt.includes('ETA')) return 'TAX_DECLARATION';
    if (mt.includes('FINANCIAL_STATEMENT')) return 'FINANCIAL_STATEMENTS';
    if (mt.includes('AUDIT')) return 'AUDIT_REPORT';
    if (mt.includes('PAYROLL') || mt.includes('SALARY')) return 'PAYROLL_INSURANCE';
    if (mt.includes('FEASIBILITY')) return 'FEASIBILITY_STUDY';
    if (mt.includes('CUSTOMS') || mt.includes('IMPORT')) return 'IMPORT_CUSTOMS';
    return 'GENERAL_NOTICE';
  };

  const getDerivedWhatsAppContext = (): Partial<ProcedureWhatsAppContext> => {
    const derivedType = deriveProcedureType();
    const clientName = customDocument?.clientName || customDocument?.client || customDocument?.companyName || '';
    const refCode = customDocument?.certificateNumber || customDocument?.invoiceNumber || customDocument?.referenceNumber || customDocument?.receiptNumber || customDocument?.id || '';
    const amt = customDocument?.amount || customDocument?.totalAmount || customDocument?.certifiedAmount || customDocument?.investedCapitalAmount || 0;

    return {
      procedureType: derivedType,
      title: effectiveTitle || customDocument?.title || '',
      clientName: clientName || whatsAppContext?.clientName || '',
      referenceCode: refCode || whatsAppContext?.referenceCode || '',
      amount: amt || whatsAppContext?.amount || 0,
      recipientEntity: customDocument?.recipientEntity || whatsAppContext?.recipientEntity || '',
      customNotes: customDocument?.notes || whatsAppContext?.customNotes || '',
      ...whatsAppContext,
    };
  };

  // Unified Multi-Format Export Handler
  const handleExport = async (format: ExportFormat | 'PDF' | 'IMAGE_PNG' | 'IMAGE_JPEG') => {
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const cleanTitle = effectiveTitle.replace(/\s+/g, '_');
      const timeStr = new Date().toISOString().slice(0, 10);
      const targetSel = getResolvedTarget();

      if (format === 'PDF') {
        const success = await exportElementToPdf(
          targetSel,
          `${cleanTitle}${recordId ? `_${recordId}` : ''}_${timeStr}.pdf`,
          { orientation }
        );
        if (success) {
          showFeedback('success', `تم تصدير مستند [${effectiveTitle}] كـ PDF بنجاح`);
        } else {
          showFeedback('error', 'تعذر تصدير PDF، يرجى المحاولة عبر نافذة معاينة الطباعة');
        }
      } else if (format === 'IMAGE_PNG') {
        const success = await exportElementToImage(
          targetSel,
          `${cleanTitle}_${timeStr}.png`,
          'png'
        );
        if (success) {
          showFeedback('success', `تم تصدير صورة [${effectiveTitle}] فائقة الدقة (PNG) بنجاح`);
        } else {
          showFeedback('error', 'تعذر تصدير الصورة');
        }
      } else if (format === 'IMAGE_JPEG') {
        const success = await exportElementToImage(
          targetSel,
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
    }
  };

  // Trigger Import Dialog for specific extensions
  const triggerImport = (acceptType: string = '.xlsx,.xls,.csv,.json') => {
    setAcceptedFormat(acceptType);
    setIsImportMenuOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  // Handle File Input Change
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

  // Handle Direct Print with specific letterhead option
  const handlePrint = async (
    customSize?: PageSizeOption,
    customOrient?: PageOrientationOption,
    withLetterhead: boolean = true
  ) => {
    const selectedSize = customSize || pageSize;
    const selectedOrient = customOrient || orientation;
    setIsPrintMenuOpen(false);

    const selector = getResolvedTarget() || '';

    await PrintService.printElementById(selector, {
      recordId,
      title: effectiveTitle,
      orientation: selectedOrient,
      pageSize: selectedSize === 'Default' ? 'A4' : selectedSize,
      showLetterhead: withLetterhead,
      customDelayMs: 250,
      onAfterPrint: () => {
        showFeedback(
          'success',
          withLetterhead
            ? `تم إرسال أمر الطباعة بالترويسة المعتمدة: ${effectiveTitle}`
            : `تم إرسال أمر الطباعة بدون ترويسة (ورق جاهز): ${effectiveTitle}`
        );
      },
    });
  };

  // Handle Download Templates in multiple formats
  const handleDownloadTemplate = (format: 'XLSX' | 'CSV' | 'JSON') => {
    setIsTemplateMenuOpen(false);
    try {
      TemplateGeneratorService.downloadTemplate(effectiveModelType, format);
      showFeedback('success', `تم تنزيل قالب التعبئة بصيغة (${format}) بنجاح`);
    } catch (err: any) {
      showFeedback('error', `تعذر تنزيل القالب: ${err?.message || err}`);
    }
  };

  return (
    <div ref={toolbarRef} className={`flex items-center gap-1.5 flex-wrap ${className} no-print text-xs select-none`}>
      {/* Hidden File Input for Direct Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept={acceptedFormat}
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

      {/* ========================================================
          1. UNIFIED PRINT & PREVIEW (عرض أولاً + تحكم الترويسة)
         ======================================================== */}
      {(showPreview || showPrint) && (
        <div className="relative">
          <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-800 text-white shadow-2xs">
            {/* Primary Click: Opens WYSIWYG Print Preview Modal FIRST */}
            <button
              onClick={() => {
                if (showPreview) setIsPreviewModalOpen(true);
                else handlePrint(pageSize, orientation, true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-slate-700 rounded-r-lg text-xs font-bold transition-all cursor-pointer border-l border-slate-700 active:scale-95 text-slate-100"
              title="معاينة الطباعة أولاً (عرض تفاعلي)"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>معاينة وطباعة</span>
            </button>
            <button
              onClick={() => {
                setIsPrintMenuOpen(!isPrintMenuOpen);
                setIsExportMenuOpen(false);
                setIsImportMenuOpen(false);
                setIsTemplateMenuOpen(false);
              }}
              className="px-1.5 py-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-l-lg text-xs transition-all cursor-pointer"
              title="خيارات الطباعة والترويسة والورق"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {isPrintMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100 mb-2 flex items-center justify-between">
                <span>خيارات الطباعة والترويسة</span>
                <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  معتمد
                </span>
              </div>

              {/* 1.1 Open Preview First (عرض أولاً) */}
              <button
                onClick={() => {
                  setIsPrintMenuOpen(false);
                  setIsPreviewModalOpen(true);
                }}
                className="w-full mb-1.5 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-lg font-bold text-xs flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-700" />
                  <span>معاينة الطباعة أولاً (WYSIWYG)</span>
                </div>
                <span className="text-[10px] text-emerald-600 bg-emerald-100/70 px-1 rounded">مستحسن</span>
              </button>

              {/* 1.2 Quick Direct Print: With Letterhead */}
              <button
                onClick={() => handlePrint(pageSize, orientation, true)}
                className="w-full mb-1 py-1.5 px-2.5 hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer text-right"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold">طباعة بالترويسة المعتمدة</div>
                  <div className="text-[10px] text-slate-400">إظهار ترويسة المكتب والشعار والبيانات</div>
                </div>
              </button>

              {/* 1.3 Quick Direct Print: Without Letterhead */}
              <button
                onClick={() => handlePrint(pageSize, orientation, false)}
                className="w-full mb-2 py-1.5 px-2.5 hover:bg-amber-50 text-slate-800 border border-slate-200 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer text-right"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold">طباعة بدون ترويسة</div>
                  <div className="text-[10px] text-slate-400">للطباعة على ورق رسمي مسبق التجهيز</div>
                </div>
              </button>

              {/* 1.4 Full Header Customizer Button */}
              <div className="border-t border-slate-100 pt-2 mb-2">
                <button
                  onClick={() => {
                    setIsPrintMenuOpen(false);
                    setIsHeaderCustomizerOpen(true);
                  }}
                  className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>تعديل وتخصيص بيانات الترويسة والشعار</span>
                </button>
              </div>

              {/* Paper Size & Orientation selectors */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>المقاس:</span>
                  <div className="flex gap-1">
                    {(['A4', 'A3', 'Thermal80mm'] as PageSizeOption[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setPageSize(sz)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          pageSize === sz
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {sz === 'Thermal80mm' ? 'إيصال' : sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>الاتجاه:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        orientation === 'portrait'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      طولي
                    </button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        orientation === 'landscape'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      عرضي
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          2. UNIFIED EXPORT (تصدير بصيغ متعددة: Excel, CSV, PDF, Images, JSON)
         ======================================================== */}
      {showExport && (
        <div className="relative">
          <button
            onClick={() => {
              setIsExportMenuOpen(!isExportMenuOpen);
              setIsPrintMenuOpen(false);
              setIsImportMenuOpen(false);
              setIsTemplateMenuOpen(false);
            }}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            title="تصدير بصيغ متعددة"
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
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>تصدير {effectiveTitle}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                  صيغ متعددة
                </span>
              </div>

              {/* 2.1 Excel Export */}
              <button
                onClick={() => handleExport('XLSX')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">مصنف Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">شيت إكسل منسق بالكامل (RTL)</div>
                </div>
              </button>

              {/* 2.2 PDF Export */}
              <button
                onClick={() => handleExport('PDF')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-slate-700 hover:text-rose-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">مستند PDF رسمي</div>
                  <div className="text-[10px] text-slate-400">ملف جاهز للطباعة والتوثيق</div>
                </div>
              </button>

              {/* 2.3 Image PNG Export */}
              <button
                onClick={() => handleExport('IMAGE_PNG')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-950 font-medium transition-all text-right cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">صورة عالية الدقة (PNG)</div>
                  <div className="text-[10px] text-slate-400">مشاركة فورية واضحة</div>
                </div>
              </button>

              {/* 2.4 CSV Export */}
              <button
                onClick={() => handleExport('CSV')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="text-xs">تصدير جدول CSV (.csv)</span>
              </button>

              {/* 2.5 JSON Export */}
              <button
                onClick={() => handleExport('JSON')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-all text-right cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span className="text-xs">تصدير هيكل بيانات JSON</span>
              </button>

              {/* 2.6 Auto Archiving */}
              <div className="border-t border-slate-100 my-1 pt-1">
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    const res = AutoArchiverService.archiveDocument({
                      category:
                        String(effectiveModelType).includes('FINANCIAL')
                          ? 'FINANCIAL_STATEMENTS'
                          : 'GENERAL_REPORT',
                      title: `${effectiveTitle} [معتمد وموثق]`,
                      notes: `أرشفة آلية مباشرة من شريط الأدوات للشاشة: ${effectiveTitle}`,
                    });
                    if (res.success && res.timestampCode) {
                      showFeedback(
                        'success',
                        `تمت الأرشفة الآلية في ملف العميل! كود التوثيق: ${res.timestampCode}`
                      );
                    } else {
                      showFeedback('error', res.error || 'تعذر إتمام الأرشفة');
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-all text-right cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-xs truncate">أرشفة وتوثيق في ملف العميل</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. UNIFIED IMPORT (استيراد بصيغ متعددة: Excel, CSV, JSON)
         ======================================================== */}
      {showImport && (
        <div className="relative">
          <button
            onClick={() => {
              setIsImportMenuOpen(!isImportMenuOpen);
              setIsPrintMenuOpen(false);
              setIsExportMenuOpen(false);
              setIsTemplateMenuOpen(false);
            }}
            disabled={isImporting}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-lg font-bold text-xs border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            title="استيراد بصيغ متعددة"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>استيراد</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isImportMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>استيراد بيانات</span>
                <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                  متعدد الصيغ
                </span>
              </div>

              {/* 3.1 Excel Import */}
              <button
                onClick={() => triggerImport('.xlsx,.xls')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">استيراد من مصنف إكسل (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">قراءة وتوزيع الأعمدة آلياً</div>
                </div>
              </button>

              {/* 3.2 CSV Import */}
              <button
                onClick={() => triggerImport('.csv')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">استيراد من ملف CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400">جداول نصية ومفصولة بفواصل</div>
                </div>
              </button>

              {/* 3.3 JSON Import */}
              <button
                onClick={() => triggerImport('.json')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">استيراد من ملف JSON (.json)</div>
                  <div className="text-[10px] text-slate-400">بيانات مهيكلة أو نسخ احتياطي</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          4. UNIFIED DOWNLOAD FILL-IN TEMPLATES (قوالب التعبئة للاستيراد)
         ======================================================== */}
      {showTemplates && (
        <div className="relative">
          <button
            onClick={() => {
              setIsTemplateMenuOpen(!isTemplateMenuOpen);
              setIsPrintMenuOpen(false);
              setIsExportMenuOpen(false);
              setIsImportMenuOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-900 rounded-lg font-bold text-xs border border-slate-300 transition-all cursor-pointer"
            title="تنزيل قوالب جاهزة للتعبئة والاستيراد"
          >
            <FileDown className="w-3.5 h-3.5 text-purple-700" />
            <span>قوالب التعبئة</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isTemplateMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>قوالب التعبئة للاستيراد</span>
                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                  جاهزة للتعبئة
                </span>
              </div>

              {/* 4.1 Excel Template */}
              <button
                onClick={() => handleDownloadTemplate('XLSX')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">قالب إكسل للتعبئة (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">مع شيت التعليمات وتنسيق RTL</div>
                </div>
              </button>

              {/* 4.2 CSV Template */}
              <button
                onClick={() => handleDownloadTemplate('CSV')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">قالب CSV للتعبئة (.csv)</div>
                  <div className="text-[10px] text-slate-400">متوافق مع ترميز UTF-8 العربي</div>
                </div>
              </button>

              {/* 4.3 JSON Template */}
              <button
                onClick={() => handleDownloadTemplate('JSON')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-950 font-medium transition-all text-right cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-bold text-xs">قالب JSON للتعبئة (.json)</div>
                  <div className="text-[10px] text-slate-400">هيكل بيانات مطابق لمنظومة الـ ERP</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          5. OPTIONAL DIRECT WHATSAPP PROCEDURE NOTIFICATION
         ======================================================== */}
      {showWhatsApp && (
        <button
          onClick={() => setIsWhatsAppModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs border border-emerald-600 transition-all cursor-pointer active:scale-95"
          title="إرسال إشعار واتساب مباشر"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
          <span>واتساب</span>
        </button>
      )}

      {/* Live Feedback Toast Notification */}
      {feedback && (
        <div
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs animate-in fade-in zoom-in-95 duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
              : 'bg-rose-100 text-rose-950 border border-rose-300'
          }`}
        >
          <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ========================================================
          MODALS: Print Preview, Header Customizer, WhatsApp
         ======================================================== */}
      {/* 1. Fullscreen Interactive Print Preview Modal */}
      {isPreviewModalOpen && (
        <PrintPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          recordId={recordId}
          modelType={String(effectiveModelType)}
          title={effectiveTitle}
          targetElementId={targetElementId || printSelector || 'financial-statements-container'}
          customDocument={customDocument}
          initialPageSize={pageSize === 'Default' ? 'A4' : pageSize}
          initialOrientation={orientation}
        />
      )}

      {/* 2. Direct Header Customizer Modal */}
      {isHeaderCustomizerOpen && (
        <PrintHeaderCustomizerModal
          isOpen={isHeaderCustomizerOpen}
          onClose={() => setIsHeaderCustomizerOpen(false)}
          officeProfile={db.getState().officeProfile || {}}
          onSaveOfficeProfile={(prof) => {
            db.updateOfficeProfile(prof as any);
            showFeedback('success', 'تم تحديث وحفظ بيانات الترويسة والشعار بنجاح');
          }}
          clientProfile={{
            companyName: customDocument?.clientName || db.getState().activeClientContext?.companyName || 'الشركة والمنشأة',
            ...customDocument,
          }}
          onSaveClientProfile={() => {
            showFeedback('success', 'تم تحديث بيانات العميل بنجاح');
          }}
          sampleDocumentTitle={effectiveTitle}
        />
      )}

      {/* 3. Direct In-App WhatsApp Procedure Modal */}
      {isWhatsAppModalOpen && (
        <DirectWhatsAppProcedureModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          initialContext={getDerivedWhatsAppContext()}
          onSuccess={(res) => {
            showFeedback('success', `تم إرسال إشعار الواتساب بنجاح إلى: ${res.phone}`);
          }}
        />
      )}
    </div>
  );
};
