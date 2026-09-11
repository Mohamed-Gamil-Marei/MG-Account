import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  HelpCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';
import { generateCreditDossierTemplate, parseUploadedCreditExcel } from './CreditExcelManager';

interface CreditExcelBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearsList: number[];
  yearsData: Record<number, FiscalYearData>;
  clientName?: string;
  onImportSuccess: (importedData: {
    yearsDetected: number[];
    parsedYearsData: Record<number, Partial<FiscalYearData>>;
    clientMetadata?: any;
  }) => void;
}

export const CreditExcelBridgeModal: React.FC<CreditExcelBridgeModalProps> = ({
  isOpen,
  onClose,
  yearsList,
  yearsData,
  clientName,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImportData, setPreviewImportData] = useState<{
    yearsDetected: number[];
    parsedYearsData: Record<number, Partial<FiscalYearData>>;
    clientMetadata?: any;
    fileName: string;
  } | null>(null);

  if (!isOpen) return null;

  // Handle Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const buffer = generateCreditDossierTemplate(yearsList, yearsData, clientName);
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نموذج_إدخال_الملف_الائتماني_البنكي_${new Date().getFullYear()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`خطأ في إنشاء ملف الإكسيل: ${err?.message || ''}`);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseUploadedCreditExcel(arrayBuffer);

      if (!result.success) {
        setErrorMessage(result.error || 'تعذر استخراج البيانات من الملف المرفوع.');
        setPreviewImportData(null);
      } else {
        setPreviewImportData({
          yearsDetected: result.yearsDetected,
          parsedYearsData: result.parsedYearsData,
          clientMetadata: result.clientMetadata,
          fileName: file.name,
        });
      }
    } catch (err: any) {
      setErrorMessage(`حدث خطأ أثناء قراءة الملف: ${err?.message || ''}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and Apply Import
  const handleConfirmApply = () => {
    if (!previewImportData) return;
    onImportSuccess({
      yearsDetected: previewImportData.yearsDetected,
      parsedYearsData: previewImportData.parsedYearsData,
      clientMetadata: previewImportData.clientMetadata,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-slate-100 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>جسر الإكسيل الذكي للملف الائتماني (Excel 2-Way Bridge)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                حمّل نموذج إكسيل مجهز، دوّن أرقام العميل خارجياً، ثم ارفعه ليتم تطبيقه وموازنته في ثوانٍ.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Step 1 & 2 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Download Template */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Download className="w-4 h-4" />
                  <span>الخطوة 1: تحميل نموذج الإكسيل</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  يحتوي القالب على شيتات مخصصة لبيانات التسهيل البنكي، قائمة الدخل، والمركز المالي بكود ربط محاسبي دقيق.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل نموذج الإكسيل المعتمد (.XLSX)</span>
              </button>
            </div>

            {/* Step 2: Upload Completed File */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-blue-500/40 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Upload className="w-4 h-4" />
                  <span>الخطوة 2: استيراد وقراءة الملف</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ارفع الملف بعد تدوين الأرقام ليقوم النظام باستخلاص السنوات والمؤشرات وتحديث الملف بالكامل تلقائياً.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-file-upload-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isProcessing ? 'جاري الفحص والمطابقة...' : 'اختيار ورفع ملف إكسيل'}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview of Imported Data */}
          {previewImportData && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/80 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تم فحص الملف بنجاح: [{previewImportData.fileName}]</span>
                </span>
                <span className="text-[11px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                  {previewImportData.yearsDetected.length} سنوات مكتشفة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">السنوات المالية:</span>
                  <span className="font-bold font-mono text-emerald-400">
                    {previewImportData.yearsDetected.join(', ')}
                  </span>
                </div>

                {previewImportData.clientMetadata?.companyName && (
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">اسم المنشأة:</span>
                    <span className="font-bold truncate block">{previewImportData.clientMetadata.companyName}</span>
                  </div>
                )}

                {previewImportData.clientMetadata?.requestedLoanAmount && (
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">القرض المطلوب:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      {formatEgyptianCurrency(previewImportData.clientMetadata.requestedLoanAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewImportData(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApply}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تطبيق الأرقام وتحديث الملف فوراً</span>
                </button>
              </div>
            </div>
          )}

          {/* Tips and Advice */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>نصائح لضمان استيراد دقيق وسريع:</span>
            </span>
            <ul className="list-disc list-inside space-y-0.5 pr-2">
              <li>لا تقم بحذف عمود «كود الربط» في ورقتي قائمة الدخل والمركز المالي.</li>
              <li>يمكنك إدخال قيم موجبة أو سالبة؛ يقوم النظام بفرز التكاليف والإهلاكات تلقائياً.</li>
              <li>البرنامج يدعم ملفات XLSX و XLS و CSV ذات التنسيق الجدولي القياسي.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>متوافق تماماً مع موازين المراجعة وبرامج المحاسبة (QuickBooks, ERP, Excel)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
