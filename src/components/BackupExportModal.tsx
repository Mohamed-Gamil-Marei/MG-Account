import React, { useState } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  FileText,
  Layers,
  Sparkles,
  QrCode,
  Check,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import {
  ModelType,
  ExportFormat,
  exportModelData,
  importModelData,
} from '../utils/dataImportExport';
import { generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { PurgeDatabaseModal } from './PurgeDatabaseModal';

interface BackupExportModalProps {
  state: DatabaseState;
  onClose: () => void;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  state,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT' | 'OVERVIEW'>('EXPORT');
  const [selectedModel, setSelectedModel] = useState<ModelType>('ALL_DATA');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('XLSX');
  const [importTargetModel, setImportTargetModel] = useState<ModelType>('ACCOUNTS');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  const modelsList: { id: ModelType; name: string; icon: string; count: number; serialPrefix: string }[] = [
    { id: 'ALL_DATA', name: 'النسخة الكاملة الشاملة لكافة النماذج', icon: '🗄️', count: state.accounts.length + state.journalEntries.length + state.clients.length, serialPrefix: 'ALL' },
    { id: 'ACCOUNTS', name: 'شجرة الحسابات المصرية (COA)', icon: '🌳', count: state.accounts.length, serialPrefix: '1xxx / 2xxx' },
    { id: 'JOURNAL', name: 'قيود اليومية والترحيل (Journal)', icon: '📋', count: state.journalEntries.length, serialPrefix: 'JV-2026-xxxx' },
    { id: 'CLIENTS', name: 'أرشيف وملفات العملاء والشركات', icon: '🏢', count: state.clients.length, serialPrefix: 'CL-xxxx' },
    { id: 'TREASURY', name: 'خزنة أعمال وسندات المكتب', icon: '🏦', count: state.treasuryTransactions.length, serialPrefix: 'TR-2026-xxxx' },
    { id: 'TAXES', name: 'إقرارات الضرائب والقيمة المضافة (ETA)', icon: '📊', count: state.taxDeclarations.length, serialPrefix: 'TAX-xxxx' },
    { id: 'CERTIFICATES', name: 'الشهادات المهنية المعتمدة', icon: '📜', count: state.certificates.length, serialPrefix: 'CERT-2026-xxxx' },
    { id: 'INVOICES', name: 'الفواتير والمبيعات والمشتريات', icon: '🧾', count: state.invoices.length, serialPrefix: 'INV-2026-xxxx' },
    { id: 'FEASIBILITY', name: 'دراسات الجدوى الاقتصادية', icon: '📈', count: state.feasibilityStudies.length, serialPrefix: 'FS-2026-xxx' },
    { id: 'CREDIT_SIM', name: 'نماذج المحاكاة الائتمانية', icon: '🎯', count: state.creditSimulations.length, serialPrefix: 'SIM-xxxx' },
  ];

  const handleExport = () => {
    try {
      setIsProcessing(true);
      const res = exportModelData(selectedModel, selectedFormat, state);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `${res.message} (${res.fileName})` });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `فشل التصدير: ${err?.message || 'خطأ غير متوقع'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const res = await importModelData(file, importTargetModel);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `حدث خطأ أثناء معالجة الملف: ${err?.message}` });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-right space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                مركز استيراد وتصدير جميع النماذج والبيانات
              </h3>
              <p className="text-xs text-slate-500">
                تصدير واستيراد شامل بجميع الصيغ (Excel, CSV, JSON, TXT) مع تثبيت السيريال وأكواد QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => { setActiveTab('EXPORT'); setStatusMessage(null); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير النماذج (Export)</span>
          </button>

          <button
            onClick={() => { setActiveTab('IMPORT'); setStatusMessage(null); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'IMPORT'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد النماذج (Import)</span>
          </button>

          <button
            onClick={() => { setActiveTab('OVERVIEW'); setStatusMessage(null); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>معايير السيريال والـ QR</span>
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shrink-0 animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: EXPORT */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4 text-xs">
              {/* Select Model */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>1. اختر النموذج أو السجل المطلوب تصديره:</span>
                  <span className="text-[11px] text-blue-600 font-mono">10 نماذج مدعومة</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modelsList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        selectedModel === m.id
                          ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-1 ring-blue-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{m.icon}</span>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono font-bold shrink-0">
                        {m.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Format */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800">
                  2. اختر صيغة التصدير المطلوبة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'XLSX' as ExportFormat, label: 'Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-emerald-700', desc: 'جداول إكسل منسقة' },
                    { id: 'CSV' as ExportFormat, label: 'CSV (.csv)', icon: FileText, color: 'text-amber-700', desc: 'متوافق عالمياً UTF-8' },
                    { id: 'JSON' as ExportFormat, label: 'JSON (.json)', icon: FileCode, color: 'text-blue-700', desc: 'نسخ احتياطي كامل' },
                    { id: 'TXT' as ExportFormat, label: 'Text (.txt)', icon: FileText, color: 'text-slate-700', desc: 'تقرير نصي مطبوع' },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = selectedFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setSelectedFormat(fmt.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${fmt.color}`} />
                        <span className="font-bold text-xs">{fmt.label}</span>
                        <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Features Pill */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تضمين السيريال كود والرقم المرجعي الموحد</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>توليد كود التشفير QR Code لجميع السجلات</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isProcessing ? 'جاري تجهيز وتنزيل الملف...' : `تصدير [${modelsList.find(m => m.id === selectedModel)?.name}] بصيغة ${selectedFormat}`}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>الاستيراد الذكي للبيانات + الترخيص التلقائي للأجهزة:</span>
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                    🔑 Auto-License Protected
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  عند استيراد ملف <strong>JSON الشامل</strong> على أي جهاز كمبيوتر أو متصفح جديد، يتم التحقق من التوقيع الرقمي وترخيص الجهاز الجديد فوراً وبشكل تلقائي دون الحاجة لإعادة كتابة كود الماستر.
                </p>
              </div>

              {/* Target Model for Excel/CSV */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  1. حدد نوع النموذج المراد استيراد بياناته (في حال ملفات Excel / CSV):
                </label>
                <select
                  value={importTargetModel}
                  onChange={(e) => setImportTargetModel(e.target.value as ModelType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ACCOUNTS">🌳 شجرة الحسابات المصرية (دليل الحسابات)</option>
                  <option value="CLIENTS">🏢 أرشيف العملاء والشركات</option>
                  <option value="TREASURY">🏦 سندات وحركات خزنة المكتب</option>
                  <option value="ALL_DATA">🗄️ استعادة كاملة لقاعدة البيانات (ملف JSON)</option>
                </select>
              </div>

              {/* File Upload Zone */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800">
                  2. اختر الملف من جهازك:
                </label>
                <label
                  htmlFor="universal-file-import-input"
                  className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl transition-all cursor-pointer text-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-emerald-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">
                      اضغط هنا لاختيار الملف أو اسحبه إلى هنا
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يدعم الصيغ: (.xlsx, .xls, .csv, .json)
                    </p>
                  </div>
                  <input
                    id="universal-file-import-input"
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Reset & Danger Zone Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">هل ترغب في استرجاع التهيئة التجريبية؟</span>
                  <button
                    onClick={() => {
                      if (window.confirm('هل أنت متأكد من إعادة ضبط البيانات إلى النماذج التجريبية الشاملة للمكتب؟')) {
                        db.resetToDemoData();
                        setStatusMessage({ type: 'success', text: 'تم استعادة البيانات التجريبية الشاملة لجميع النماذج.' });
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold border border-amber-200 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة تعيين البيانات النموذجية</span>
                  </button>
                </div>

                {/* Complete Database Purge Button */}
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-bold text-[11px]">تفريغ وتصفير بيانات المنظومة بالكامل (محمي بـ PIN)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ شامل (Mgacc120)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW & QR / SERIAL COMPLIANCE */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm">معايير السيريال الموحد والـ QR Code الرقمي</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
                    EAS / ETA Compliant
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تم تطبيق ترقيم تسلسلي مشفر (Serial Numbers) وبصمة رقمية QR Code على كافة النماذج والمخرجات المحاسبية لضمان التوثيق ومنع التكرار وسهولة التدقيق الضريبي.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">هيكل السيريال والـ QR المطبق في كل نموذج:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {modelsList.filter(m => m.id !== 'ALL_DATA').map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <span>{m.icon}</span>
                          <span>{m.name.split('(')[0]}</span>
                        </span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                          {m.serialPrefix}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>كود QR:</span>
                        <span className="font-mono text-emerald-700 text-[9px]">تشفير مشتق وتفقيط رقمي</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 shrink-0">
          معايير المحاسبة المصرية (EAS) • إعداد محاسب ومراجع قانوني محمد جميل مرعي
        </div>
      </div>

      {/* Purge Modal */}
      <PurgeDatabaseModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onPurgeComplete={() => {
          setStatusMessage({ type: 'success', text: 'تم تفريغ ومسح كافة بيانات المنظومة بنجاح.' });
        }}
      />
    </div>
  );
};
