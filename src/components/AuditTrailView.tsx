import React, { useState } from 'react';
import {
  History,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';

interface AuditTrailViewProps {
  state: DatabaseState;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const filteredLogs = state.auditLogs.filter((log) => {
    return (
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDownloadBackup = () => {
    const jsonStr = db.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_محاسبية_احتياطية_محمد_جميل_مرعي_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const success = db.importFullBackupJson(jsonStr);
        if (success) {
          setRestoreStatus('تم استعادة قاعدة البيانات بنجاح تام');
          setTimeout(() => setRestoreStatus(null), 4000);
        } else {
          alert('فشل استعادة الملف: تنسيق JSON غير متوافق');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف النسخ الاحتياطي');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'تحذير: هل أنت متأكد من إعادة ضبط قاعدة البيانات إلى البيانات النموذجية الأولية؟ سيتم تحديث كافة السجلات.'
      )
    ) {
      db.resetToDemoData();
      setRestoreStatus('تمت إعادة تهيئة المنظومة بالبيانات النموذجية');
      setTimeout(() => setRestoreStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              سجل التدقيق والرقابة المحاسبية والنسخ الاحتياطي (Audit Trail & Backup)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل غير قابل للتعديل يوثق كافة العمليات والمستخدمين والتعديلات على قيود اليومية والحسابات، مع إدارة التخزين المحلي.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل نسخة احتياطية (JSON)</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>استعادة نسخة</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer"
            title="إعادة ضبط للبيانات النموذجية"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تهيئة البيانات</span>
          </button>
        </div>
      </div>

      {/* Restore Notification */}
      {restoreStatus && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {/* Database Health Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-bold block">إجمالي سجلات الحسابات:</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {state.accounts.length} حساب
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-bold block">قيود اليومية المسجلة:</span>
          <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
            {state.journalEntries.length} قيد
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-bold block">حركات الخزنة والشركات:</span>
          <div className="text-lg font-black text-blue-800 font-mono mt-0.5">
            {state.treasuryTransactions.length + state.clients.length} سجل
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-bold block">عمليات الرقابة والتدقيق:</span>
          <div className="text-lg font-black text-purple-800 font-mono mt-0.5">
            {state.auditLogs.length} عملية
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في سجل التعديلات والتدقيق..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">التوقيت والتاريخ</th>
                <th className="py-3 px-4">المستخدم والمدقق</th>
                <th className="py-3 px-4">نوع الإجراء</th>
                <th className="py-3 px-4">تفاصيل وبيان الحركة الرقابية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.slice().map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{log.user}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : log.action === 'DELETE'
                          ? 'bg-red-100 text-red-800'
                          : log.action === 'POST'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {log.action === 'CREATE'
                        ? 'إنشاء'
                        : log.action === 'UPDATE'
                        ? 'تعديل'
                        : log.action === 'DELETE'
                        ? 'حذف'
                        : log.action === 'POST'
                        ? 'ترحيل'
                        : 'إلغاء ترحيل'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
