import React, { useState, useRef, useEffect } from 'react';
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
  disablePrintAndExport?: boolean;
  disableReason?: string;
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
  disablePrintAndExport = false,
  disableReason,
}) => {
  const effectiveModelType = (modelType || 'ALL_DATA') as ModelType;
  const effectiveTitle = title || screenTitle || 'المستند المالي';

  // State menus
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isMoreToolbarOpen, setIsMoreToolbarOpen] = useState(false);

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
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [acceptedFormat, setAcceptedFormat] = useState<string>('.xlsx,.xls,.csv,.json');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreToolbarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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

  const allActionNodes: React.ReactNode[] = [];

  if (customActions) {
    allActionNodes.push(<React.Fragment key="custom">{customActions}</React.Fragment>);
  }

  actions?.forEach((act, idx) => {
    allActionNodes.push(
      <ActionButton
        key={`act-${idx}`}
        label={act.label}
        icon={act.icon}
        onClick={act.onClick}
        variant={act.variant === 'outline' ? 'outline' : 'primary'}
        size="sm"
      />
    );
  });

  if (showPreview || showPrint) {
    allActionNodes.push(
      <div key="print-prev" className="relative">
        <div className={`inline-flex rounded-lg border shadow-2xs ${disablePrintAndExport ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-60' : 'border-slate-700/80 bg-slate-800 text-white'}`}>
          <button
            onClick={() => {
              if (disablePrintAndExport) {
                showFeedback('error', disableReason || 'تم منع الطباعة الرسمية لوجود فارق عدم اتزان في القوائم المالية');
                return;
              }
              if (showPreview) setIsPreviewModalOpen(true);
              else handlePrint(pageSize, orientation, true);
            }}
            disabled={disablePrintAndExport}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-all border-l ${
              disablePrintAndExport
                ? 'cursor-not-allowed text-slate-400 border-slate-300 dark:border-slate-700'
                : 'hover:bg-slate-700 rounded-r-lg cursor-pointer border-slate-700 active:scale-95 text-slate-100'
            }`}
            title={disablePrintAndExport ? (disableReason || 'الطباعة معطلة لعدم اتزان الميزانية') : 'معاينة الطباعة أولاً (عرض تفاعلي)'}
          >
            <Printer className={`w-3.5 h-3.5 ${disablePrintAndExport ? 'text-slate-400' : 'text-emerald-400'}`} />
            <span>معاينة وطباعة</span>
          </button>
          <button
            onClick={() => {
              if (disablePrintAndExport) {
                showFeedback('error', disableReason || 'تم منع الطباعة الرسمية لوجود فارق عدم اتزان في القوائم المالية');
                return;
              }
              setIsPrintMenuOpen(!isPrintMenuOpen);
              setIsExportMenuOpen(false);
              setIsImportMenuOpen(false);
              setIsTemplateMenuOpen(false);
            }}
            disabled={disablePrintAndExport}
            className={`px-1.5 py-1 text-xs transition-all ${
              disablePrintAndExport
                ? 'cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-700 text-slate-300 hover:text-white rounded-l-lg cursor-pointer'
            }`}
            title="خيارات الطباعة"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {isPrintMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="font-bold text-slate-900 dark:text-slate-100 pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
              <span>خيارات الطباعة والترويسة</span>
              <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                معتمد
              </span>
            </div>
            <button
              onClick={() => {
                setIsPrintMenuOpen(false);
                setIsPreviewModalOpen(true);
              }}
              className="w-full mb-1.5 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold text-xs flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>معاينة الطباعة أولاً (WYSIWYG)</span>
              </div>
              <span className="text-[10px] text-emerald-600 bg-emerald-100/70 px-1 rounded">مستحسن</span>
            </button>
            <button
              onClick={() => handlePrint(pageSize, orientation, true)}
              className="w-full mb-1 py-1.5 px-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer text-right"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <div className="flex-1 truncate">
                <div className="font-bold">طباعة بالترويسة المعتمدة</div>
                <div className="text-[10px] text-slate-400">إظهار ترويسة المكتب والشعار والبيانات</div>
              </div>
            </button>
            <button
              onClick={() => handlePrint(pageSize, orientation, false)}
              className="w-full mb-2 py-1.5 px-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer text-right"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <div className="flex-1 truncate">
                <div className="font-bold">طباعة بدون ترويسة</div>
                <div className="text-[10px] text-slate-400">للطباعة على ورق رسمي مسبق التجهيز</div>
              </div>
            </button>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mb-2">
              <button
                onClick={() => {
                  setIsPrintMenuOpen(false);
                  setIsHeaderCustomizerOpen(true);
                }}
                className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>تعديل وتخصيص بيانات الترويسة والشعار</span>
              </button>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>المقاس:</span>
                <div className="flex gap-1">
                  {(['A4', 'A3', 'Thermal80mm'] as PageSizeOption[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPageSize(sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        pageSize === sz ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sz === 'Thermal80mm' ? 'إيصال' : sz}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>الاتجاه:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      orientation === 'portrait' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    طولي
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      orientation === 'landscape' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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
    );
  }

  if (showExport) {
    allActionNodes.push(
      <div key="export-group" className="relative">
        <button
          onClick={() => {
            if (disablePrintAndExport) {
              showFeedback('error', disableReason || 'تم منع التصدير الرسمي لوجود فارق عدم اتزان في القوائم المالية');
              return;
            }
            setIsExportMenuOpen(!isExportMenuOpen);
            setIsPrintMenuOpen(false);
            setIsImportMenuOpen(false);
            setIsTemplateMenuOpen(false);
          }}
          disabled={isExporting || disablePrintAndExport}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs border transition-all ${
            disablePrintAndExport
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50'
          }`}
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" /> : <Download className={`w-3.5 h-3.5 ${disablePrintAndExport ? 'text-slate-400' : 'text-blue-700'}`} />}
          <span>تصدير</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {isExportMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
              <span>تصدير {effectiveTitle}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">صيغ متعددة</span>
            </div>
            <button onClick={() => handleExport('XLSX')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>مصنف Excel (.xlsx)</span>
            </button>
            <button onClick={() => handleExport('PDF')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
              <span>مستند PDF رسمي</span>
            </button>
            <button onClick={() => handleExport('IMAGE_PNG')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
              <span>صورة عالية الدقة (PNG)</span>
            </button>
            <button onClick={() => handleExport('CSV')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>تصدير جدول CSV (.csv)</span>
            </button>
            <button onClick={() => handleExport('JSON')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>تصدير هيكل بيانات JSON</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showImport) {
    allActionNodes.push(
      <div key="import-group" className="relative">
        <button
          onClick={() => {
            setIsImportMenuOpen(!isImportMenuOpen);
            setIsPrintMenuOpen(false);
            setIsExportMenuOpen(false);
            setIsTemplateMenuOpen(false);
          }}
          disabled={isImporting}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-emerald-700" />}
          <span>استيراد</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {isImportMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
              <span>استيراد بيانات</span>
            </div>
            <button onClick={() => triggerImport('.xlsx,.xls')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>استيراد من مصنف إكسل (.xlsx)</span>
            </button>
            <button onClick={() => triggerImport('.csv')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileText className="w-4 h-4 text-amber-700 shrink-0" />
              <span>استيراد من ملف CSV (.csv)</span>
            </button>
            <button onClick={() => triggerImport('.json')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileCode className="w-4 h-4 text-blue-700 shrink-0" />
              <span>استيراد من ملف JSON (.json)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showTemplates) {
    allActionNodes.push(
      <div key="templates-group" className="relative">
        <button
          onClick={() => {
            setIsTemplateMenuOpen(!isTemplateMenuOpen);
            setIsPrintMenuOpen(false);
            setIsExportMenuOpen(false);
            setIsImportMenuOpen(false);
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5 text-purple-600" />
          <span>قوالب التعبئة</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {isTemplateMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
              <span>قوالب التعبئة للاستيراد</span>
            </div>
            <button onClick={() => handleDownloadTemplate('XLSX')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>قالب إكسل للتعبئة (.xlsx)</span>
            </button>
            <button onClick={() => handleDownloadTemplate('CSV')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileText className="w-4 h-4 text-amber-700 shrink-0" />
              <span>قالب CSV للتعبئة (.csv)</span>
            </button>
            <button onClick={() => handleDownloadTemplate('JSON')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 dark:text-slate-300 font-medium transition-all text-right cursor-pointer">
              <FileCode className="w-4 h-4 text-blue-700 shrink-0" />
              <span>قالب JSON للتعبئة (.json)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showWhatsApp) {
    allActionNodes.push(
      <button
        key="whatsapp-btn"
        onClick={() => setIsWhatsAppModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs border border-emerald-600 transition-all cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
        <span>واتساب</span>
      </button>
    );
  }

  const visibleActions = allActionNodes.slice(0, 3);
  const overflowActions = allActionNodes.slice(3);

  return (
    <div ref={toolbarRef} className={`flex items-center gap-1.5 flex-wrap ${className} no-print text-xs select-none`}>
      <input type="file" ref={fileInputRef} onChange={handleImportFile} accept={acceptedFormat} className="hidden" />

      {visibleActions}

      {overflowActions.length > 0 && (
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setIsMoreToolbarOpen(!isMoreToolbarOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <span>المزيد ⋯</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isMoreToolbarOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMoreToolbarOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto">
              {overflowActions.map((node, i) => (
                <div key={i} onClick={() => setIsMoreToolbarOpen(false)}>
                  {node}
                </div>
              ))}
            </div>
          )}
        </div>
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
