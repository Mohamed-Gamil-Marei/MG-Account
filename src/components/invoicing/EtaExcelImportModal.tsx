import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { EtaExcelEngine, ParsedImportResult } from '../../utils/etaExcelEngine';
import { Invoice } from '../../types';

interface EtaExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
  onImportSuccess?: (count: number) => void;
}

export const EtaExcelImportModal: React.FC<EtaExcelImportModalProps> = ({
  isOpen,
  onClose,
  defaultClientId,
  onImportSuccess,
}) => {
  const state = db.getState();
  const [selectedClientId, setSelectedClientId] = useState<string>(
    defaultClientId || state.activeClientContext?.clientId || state.clients[0]?.id || ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedImportResult | null>(null);
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const selectedClient = useMemo(() => {
    return state.clients.find((c) => c.id === selectedClientId) || null;
  }, [state.clients, selectedClientId]);

  // Handle File Upload and Live Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setImportStatus(null);

    try {
      const existingInvoices = state.invoices || [];
      const result = await EtaExcelEngine.parseExcelInvoiceFile(selectedFile, {
        clientId: selectedClientId,
        existingInvoices,
      });
      setParseResult(result);
    } catch (err: any) {
      setParseResult({
        success: false,
        invoices: [],
        errors: [err?.message || 'فشل في قراءة ملف الإكسل.'],
        warnings: [],
        totalRowsRead: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Re-run parse if client changes
  const handleClientChange = async (newClientId: string) => {
    setSelectedClientId(newClientId);
    if (file) {
      setIsParsing(true);
      try {
        const result = await EtaExcelEngine.parseExcelInvoiceFile(file, {
          clientId: newClientId,
          existingInvoices: state.invoices || [],
        });
        setParseResult(result);
      } finally {
        setIsParsing(false);
      }
    }
  };

  // Totals of parsed invoices
  const totals = useMemo(() => {
    if (!parseResult || !parseResult.invoices) {
      return {
        count: 0,
        subtotal: 0,
        vat: 0,
        wht: 0,
        grandTotal: 0,
        paid: 0,
        remaining: 0,
      };
    }

    const invoices = parseResult.invoices;
    return {
      count: invoices.length,
      subtotal: Number(invoices.reduce((s, i) => s + (i.subtotal || 0), 0).toFixed(2)),
      vat: Number(invoices.reduce((s, i) => s + (i.totalVat || 0), 0).toFixed(2)),
      wht: Number(invoices.reduce((s, i) => s + (i.totalWht || 0), 0).toFixed(2)),
      grandTotal: Number(invoices.reduce((s, i) => s + (i.grandTotal || 0), 0).toFixed(2)),
      paid: Number(invoices.reduce((s, i) => s + (i.paidAmount || 0), 0).toFixed(2)),
      remaining: Number(invoices.reduce((s, i) => s + (i.remainingAmount || 0), 0).toFixed(2)),
    };
  }, [parseResult]);

  // Execute import after user confirmation
  const handleConfirmImport = () => {
    if (!selectedClientId) {
      setImportStatus({ success: false, message: 'يجب اختيار المنشأة (العميل) لنسب الفواتير المستوردة إليها.' });
      return;
    }
    if (!parseResult || parseResult.invoices.length === 0) {
      setImportStatus({ success: false, message: 'لا توجد فواتير صالحة للاستيراد.' });
      return;
    }
    if (parseResult.errors.length > 0) {
      setImportStatus({
        success: false,
        message: 'لا يمكن الاستيراد بسبب وجود أخطاء في ملف الإكسل. يرجى تصحيح الأخطاء أولاً.',
      });
      return;
    }

    try {
      const invoicesToSave = parseResult.invoices.map((inv) => ({
        ...inv,
        clientId: selectedClientId,
      }));

      const addedCount = db.batchAddInvoices(invoicesToSave);
      setImportStatus({
        success: true,
        message: `تم استيراد (${addedCount}) فاتورة بنجاح ونسبها بالكامل للمنشأة (${selectedClient?.name || selectedClientId}).`,
      });

      if (onImportSuccess) {
        onImportSuccess(addedCount);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: err?.message || 'حدث خطأ أثناء حفظ الفواتير في قاعدة البيانات.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                استيراد فواتير إكسل منظومة الفاتورة والإيصال الإلكتروني (ETA)
              </h3>
              <p className="text-xs text-slate-500">
                معاينة دقيقة للكميات والكسور، نسب الضريبة، الإشعارات، والمبالغ المسددة قبل التأكيد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Client Selection */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    نسب الفواتير المستوردة للمنشأة (إلزامي):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    سيتم نسب جميع فواتير الشيت بالكامل إلى هذه المنشأة مع عزل محاسبي تام
                  </p>
                </div>
              </div>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- اختر المنشأة المستهدفة --</option>
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Area & Download Template */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label
                htmlFor="eta-excel-file-input"
                className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30"
              >
                <Upload className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">
                  {file ? file.name : 'اختر ملف إكسل (.xlsx, .xls) للبدء بالمعاينة'}
                </span>
                <input
                  id="eta-excel-file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => EtaExcelEngine.downloadEtaExcelTemplate()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>تحميل النموذج الرسمي المعتمد</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {isParsing && (
            <div className="flex items-center justify-center py-8 text-xs font-bold text-indigo-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent ml-2" />
              <span>جارٍ قراءة وفحص ملف الإكسل والتحقق من القواعد المحاسبية...</span>
            </div>
          )}

          {/* Result Overview Cards */}
          {parseResult && !isParsing && (
            <div className="space-y-6">
              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">عدد الفواتير</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{totals.count}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">الصافي قبل الضريبة</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 font-mono">
                    {totals.subtotal.toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">ض.ق.م (14% / إعفاء)</div>
                  <div className="mt-1 text-sm font-bold text-indigo-700 font-mono">
                    {totals.vat.toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">الإجمالي المستحق</div>
                  <div className="mt-1 text-sm font-black text-emerald-700 font-mono">
                    {totals.grandTotal.toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">المسدد (نقدي/بنك)</div>
                  <div className="mt-1 text-sm font-bold text-slate-800 font-mono">
                    {totals.paid.toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">المتبقي (آجل)</div>
                  <div className="mt-1 text-sm font-bold text-amber-700 font-mono">
                    {totals.remaining.toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>

              {/* Errors Section */}
              {parseResult.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-2">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>تم رصد ({parseResult.errors.length}) أخطاء تمنع الاستيراد (يجب تصحيحها):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-rose-700 list-disc list-inside max-h-40 overflow-y-auto">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx} className="font-sans leading-relaxed">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Section */}
              {parseResult.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>تنبيهات وملاحظات فنية ({parseResult.warnings.length}):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-700 list-disc list-inside max-h-32 overflow-y-auto">
                    {parseResult.warnings.map((warn, idx) => (
                      <li key={idx} className="font-sans leading-relaxed">
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Invoices Preview Table */}
              {parseResult.invoices.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>قائمة الفواتير المحللة ({parseResult.invoices.length} فاتورة):</span>
                    <span className="text-[11px] text-slate-500">
                      إجمالي الصفوف المقروءة: {parseResult.totalRowsRead} صف
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                        <tr>
                          <th className="p-2.5">رقم الفاتورة</th>
                          <th className="p-2.5">نوع المستند</th>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">الطرف المتعامل</th>
                          <th className="p-2.5">الصافي</th>
                          <th className="p-2.5">ض.ق.م</th>
                          <th className="p-2.5">الإجمالي</th>
                          <th className="p-2.5">المسدد</th>
                          <th className="p-2.5">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parseResult.invoices.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  inv.invoiceType === 'CREDIT_NOTE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : inv.invoiceType === 'DEBIT_NOTE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : inv.invoiceType === 'OFFICE_SERVICE'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {inv.invoiceType}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{inv.date}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{inv.partnerName}</td>
                            <td className="p-2.5 font-mono text-slate-700">
                              {Number(inv.subtotal).toLocaleString('ar-EG')}
                            </td>
                            <td className="p-2.5 font-mono text-indigo-700">
                              {Number(inv.totalVat).toLocaleString('ar-EG')}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700">
                              {Number(inv.grandTotal).toLocaleString('ar-EG')}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {Number(inv.paidAmount).toLocaleString('ar-EG')}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {inv.status === 'PAID' ? 'مسدد' : inv.status === 'PARTIALLY_PAID' ? 'مسدد جزئياً' : 'آجل'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Status Message */}
          {importStatus && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                importStatus.success
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>يتم تدقيق تطابق مجموع البنود مع إجمالي كل فاتورة بنسبة 100%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={
                !parseResult ||
                parseResult.invoices.length === 0 ||
                parseResult.errors.length > 0 ||
                !selectedClientId ||
                isParsing
              }
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>تأكيد استيراد الفواتير للمنشأة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
