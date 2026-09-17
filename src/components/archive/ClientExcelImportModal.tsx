import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Building,
  Phone,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  FileCheck2,
  KeyRound,
} from 'lucide-react';
import { ClientArchiveRecord } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientExcelEngine, ParsedClientImportResult } from '../../utils/clientExcelEngine';

interface ClientExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onImportComplete?: (count: number) => void;
}

export const ClientExcelImportModal: React.FC<ClientExcelImportModalProps> = ({
  isOpen,
  onClose,
  state,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedClientImportResult | null>(null);
  const [isSuccessImported, setIsSuccessImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    ClientExcelEngine.downloadClientTemplate(state.officeProfile.firmName || 'مكتب_محمد_جميل_مرعي');
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setIsSuccessImported(false);

    try {
      const result = await ClientExcelEngine.parseExcelClientFile(file, state.clients.length);
      setParseResult(result);
    } catch (e: any) {
      setParseResult({
        success: false,
        clients: [],
        errors: [`حدث خطأ أثناء قراءة ملف الإكسيل: ${e?.message || 'تأكد من صيغة الملف'}`],
        warnings: [],
        totalRowsRead: 0,
        columnsDetected: [],
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        handleFileChange(file);
      } else {
        alert('يرجى اختيار ملف بصيغة إكسيل (.xlsx, .xls) أو ملف CSV.');
      }
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.clients || parseResult.clients.length === 0) return;

    const count = parseResult.clients.length;
    db.batchAddClients(parseResult.clients);
    setImportedCount(count);
    setIsSuccessImported(true);

    if (onImportComplete) {
      onImportComplete(count);
    }

    setTimeout(() => {
      onClose();
      // Reset state
      setSelectedFile(null);
      setParseResult(null);
      setIsSuccessImported(false);
    }, 1800);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setIsSuccessImported(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>استيراد وتصدير ملفات العملاء دفعة واحدة (Excel)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  تسجيل جماعي
                </span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                تصدير نموذج إكسيل معتمد، تدوين بيانات العملاء والشركات، واستيرادها لإنشاء كافة الملفات آلياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-slate-700 dark:text-slate-300">
          {/* Step 1: Download Official Template Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  الخطوة الأولى: تحميل قالب الإكسيل المعتمد مع أمثلة للشركات المصرية
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mr-7">
                القالب يحتوي على كافة الأعمدة (الاسم، السجل، الضرائب، المأمورية، الحسابات الحكومية، وكلمات المرور) مع 3 صفوف استرشادية.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>تحميل قالب الإكسيل المعتمد (.xlsx)</span>
            </button>
          </div>

          {/* Success Message Banner */}
          {isSuccessImported && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h4 className="font-bold text-sm">تم استيراد وحفظ {importedCount} ملف عميل بنجاح في الأرشيف!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                تم تحديث الأرشيف المحلي تلقائياً، وإنشاء الأكواد وربط بيانات البوابات الحكومية. جاري إغلاق النافذة...
              </p>
            </div>
          )}

          {/* Step 2: Upload File Area */}
          {!isSuccessImported && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!selectedFile ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <Upload className="w-7 h-7 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      الخطوة الثانية: اسحب ملف الإكسيل المعبأ هنا أو اضغط للاختيار
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      يدعم ملفات Microsoft Excel (.xlsx, .xls) وملفات القيم المفصولة (.csv)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 shadow-xs transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>اختيار ملف من جهازك</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
                  <div className="flex items-center gap-3 text-right">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{selectedFile.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        الحجم: {(selectedFile.size / 1024).toFixed(1)} ك.ب • تم فحص الملف بنجاح
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      تغيير الملف
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إلغاء</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="p-8 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                جاري قراءة وتحليل بيانات العملاء ومطابقة الأعمدة...
              </p>
            </div>
          )}

          {/* Errors Display */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>تعذر استيراد الملف للأسباب التالية:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 mr-6">
                {parseResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Display */}
          {parseResult && parseResult.warnings.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ملاحظات وتنبيهات ({parseResult.warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 mr-6 max-h-24 overflow-y-auto">
                {parseResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parse Result Preview Table */}
          {parseResult && parseResult.clients.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    معاينة ملفات العملاء الجاهزة للاستيراد:
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
                    {parseResult.clients.length} منشأة
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  إجمالي الصفوف المقروءة: {parseResult.totalRowsRead} صف
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 text-center">#</th>
                        <th className="p-2.5">كود العميل</th>
                        <th className="p-2.5">اسم المنشأة / الشركة</th>
                        <th className="p-2.5">الشكل القانوني</th>
                        <th className="p-2.5">السجل التجاري</th>
                        <th className="p-2.5">البطاقة الضريبية</th>
                        <th className="p-2.5">مأمورية الضرائب</th>
                        <th className="p-2.5">هاتف التواصل / واتساب</th>
                        <th className="p-2.5">المسؤول</th>
                        <th className="p-2.5 text-center">البوابات المسجلة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parseResult.clients.map((c, idx) => {
                        const portalsCount = [
                          c.portalCredentials?.etaEInvoicing?.username,
                          c.portalCredentials?.etaGeneralTax?.username,
                          c.portalCredentials?.sapPortal?.username,
                          c.portalCredentials?.nafeza?.username,
                        ].filter(Boolean).length;

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {c.clientCode}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {c.name}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                              {c.companyType === 'JOINT_STOCK'
                                ? 'مساهمة'
                                : c.companyType === 'LLC'
                                ? 'محدودة'
                                : c.companyType === 'ONE_PERSON'
                                ? 'شخص واحد'
                                : c.companyType === 'INDIVIDUAL'
                                ? 'فردي'
                                : 'تضامن'}
                            </td>
                            <td className="p-2.5 font-mono">{c.commercialRegistrationNo || '—'}</td>
                            <td className="p-2.5 font-mono">{c.taxCardNo || '—'}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                              {c.taxOffice}
                            </td>
                            <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                              {c.phone || '—'}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                              {c.contactPerson || '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {portalsCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                  <KeyRound className="w-3 h-3" />
                                  <span>{portalsCount} منظومات</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>

          {parseResult && parseResult.clients.length > 0 && !isSuccessImported && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد واستيراد ({parseResult.clients.length}) ملف عميل دفعة واحدة 🚀</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
