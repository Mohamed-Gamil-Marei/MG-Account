import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Invoice } from '../types';
import { db } from '../db/localDatabase';
import { EtaExcelEngine, ParsedImportResult } from '../utils/etaExcelEngine';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedImportResult | null>(null);
  const [activePreviewIdx, setActivePreviewIdx] = useState<number | null>(null);
  const [isSuccessImported, setIsSuccessImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setIsSuccessImported(false);

    try {
      const result = await EtaExcelEngine.parseExcelInvoiceFile(file);
      setParseResult(result);
    } catch (e: any) {
      setParseResult({
        success: false,
        invoices: [],
        errors: [`حدث خطأ غير متوقع: ${e?.message || 'خطأ غير معروف'}`],
        warnings: [],
        totalRowsRead: 0,
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
        alert('يرجى اختيار ملف بصيغة إكسل (.xlsx, .xls) أو ملف CSV.');
      }
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.invoices || parseResult.invoices.length === 0) return;

    db.batchAddInvoices(parseResult.invoices);
    setIsSuccessImported(true);
    onImportComplete(parseResult.invoices.length);

    setTimeout(() => {
      onClose();
      // Reset state
      setSelectedFile(null);
      setParseResult(null);
      setIsSuccessImported(false);
    }, 1500);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setIsSuccessImported(false);
    setActivePreviewIdx(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                استيراد الفواتير والإيصالات الإلكترونية عبر شيت الإكسل (Excel Import)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                قراءة تلقائية، مطابقة الأكواد والبنود، حساب الضرائب (VAT 14% و WHT 1%)، وتوليد الفواتير دفعة واحدة.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Success Alert */}
        {isSuccessImported && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs animate-fade-in font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              تم استيراد وإدراج ({parseResult?.invoices.length}) مستند وفاتورة إلكترونية بنجاح في قاعدة البيانات!
            </span>
          </div>
        )}

        {/* Template Download Card */}
        <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span>تحميل النموذج القياسي لشيت الإكسل (ETA Excel Template)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-mono text-[10px]">
                .xlsx
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              يحتوي على الأعمدة المطلوبة، أمثلة عملية لفواتير B2B وإيصالات B2C، ودليل أكواد الضرائب (T1, T4) وأكواد السلع (EGS/GS1).
            </div>
          </div>
          <button
            onClick={() => EtaExcelEngine.downloadEtaExcelTemplate()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer shrink-0 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تحميل نموذج الإكسل الجاهز</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        {!parseResult && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 group-hover:text-emerald-700 group-hover:border-emerald-300 group-hover:scale-105 transition-all">
              <Upload className="w-7 h-7" />
            </div>
            <div className="font-bold text-slate-800 text-sm mt-3">
              اسحب وأفلت ملف الإكسل هنا، أو انقر للاختيار من جهازك
            </div>
            <div className="text-slate-500 text-[11px] mt-1">
              يدعم ملفات Microsoft Excel (.xlsx, .xls) وجداول البيانات CSV
            </div>
            {isParsing && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>جاري قراءة ومعالجة صفوف الإكسل...</span>
              </div>
            )}
          </div>
        )}

        {/* Parsed Result Preview */}
        {parseResult && (
          <div className="mt-4 space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-slate-500 text-[10px]">إجمالي الصفوف المقروءة:</div>
                <div className="font-bold font-mono text-base text-slate-800 mt-0.5">
                  {parseResult.totalRowsRead} صف
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="text-emerald-800 text-[10px]">عدد الفواتير المستخلصة:</div>
                <div className="font-bold font-mono text-base text-emerald-950 mt-0.5">
                  {parseResult.invoices.length} مستند
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="text-blue-800 text-[10px]">إجمالي القيمة المالية:</div>
                <div className="font-bold font-mono text-sm text-blue-950 mt-0.5">
                  {formatEgyptianCurrency(parseResult.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0))}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="text-amber-800 text-[10px]">إجمالي ضريبة القيمة المضافة:</div>
                <div className="font-bold font-mono text-sm text-amber-950 mt-0.5">
                  {formatEgyptianCurrency(parseResult.invoices.reduce((sum, inv) => sum + inv.totalVat, 0))}
                </div>
              </div>
            </div>

            {/* Error alerts if any */}
            {parseResult.errors && parseResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                <div className="font-bold text-red-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>تنبيهات وأخطاء تم رصدها في الملف:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Invoices Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>معاينة الفواتير والإيصالات المستخرجة قبل الاعتماد:</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  الملف: <strong className="text-slate-700">{selectedFile?.name}</strong>
                </span>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">رقم الفاتورة</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">تاريخ الفاتورة</th>
                      <th className="py-2.5 px-3">العميل / الطرف</th>
                      <th className="py-2.5 px-3">الرقم الضريبي</th>
                      <th className="py-2.5 px-3 text-center">البنود</th>
                      <th className="py-2.5 px-3 text-left">قيمة البضاعة</th>
                      <th className="py-2.5 px-3 text-left">ض.ق.م 14%</th>
                      <th className="py-2.5 px-3 text-left">الصافي الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.isReceipt ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {inv.isReceipt ? 'إيصال B2C' : 'فاتورة B2B'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{inv.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.partnerName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{inv.partnerTaxNo || 'غير مسجل'}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {inv.items.length} بند
                        </td>
                        <td className="py-2.5 px-3 font-mono text-left text-slate-700">
                          {formatEgyptianCurrency(inv.subtotal)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-left text-emerald-700">
                          +{formatEgyptianCurrency(inv.totalVat)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-left text-slate-900">
                          {formatEgyptianCurrency(inv.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-5">
          {parseResult ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4 text-slate-500" />
              <span>اختيار ملف آخر</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>
          )}

          {parseResult && parseResult.invoices.length > 0 && (
            <button
              type="button"
              disabled={isSuccessImported}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>اعتماد واستيراد كافة الفواتير ({parseResult.invoices.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
