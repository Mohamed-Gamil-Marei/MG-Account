import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  FileSpreadsheet,
  Printer,
  Trash2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Edit3,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FinancialActivityLog } from '../../types';
import { db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { PrintService } from '../../services/PrintService';
import * as XLSX from 'xlsx';
import { triggerFileDownload } from '../../utils/dataImportExport';

interface FinancialActivityLogViewProps {
  fiscalYear: number;
  clientId?: string;
  clientName?: string;
  onRefreshStatements?: () => void;
  className?: string;
}

export const FinancialActivityLogView: React.FC<FinancialActivityLogViewProps> = ({
  fiscalYear,
  clientId,
  clientName,
  onRefreshStatements,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatementFilter, setSelectedStatementFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');

  // Pull activity logs from localDatabase
  const logs: FinancialActivityLog[] = useMemo(() => {
    return db.getFinancialActivityLogs(fiscalYear, clientId);
  }, [fiscalYear, clientId, db.getState().financialActivityLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Statement filter
      if (selectedStatementFilter !== 'ALL' && log.statementType !== selectedStatementFilter) {
        return false;
      }
      // Action filter
      if (selectedActionFilter !== 'ALL' && log.action !== selectedActionFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchItem = log.itemName?.toLowerCase().includes(term);
        const matchUser = log.userName?.toLowerCase().includes(term);
        const matchNotes = log.notes?.toLowerCase().includes(term);
        return matchItem || matchUser || matchNotes;
      }
      return true;
    });
  }, [logs, selectedStatementFilter, selectedActionFilter, searchTerm]);

  // Total variance sum
  const totalModificationsValue = useMemo(() => {
    return logs.reduce((acc, curr) => acc + (Math.abs(curr.variance || 0)), 0);
  }, [logs]);

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const officeProfile = db.getState().officeProfile;
      const wb = XLSX.utils.book_new();

      const rows = filteredLogs.map((log, index) => ({
        'م': index + 1,
        'التاريخ والوقت': log.timestamp,
        'المستخدم القائم بالتعديل': log.userName,
        'الصفة / الصلاحية': log.userRole || 'مراجع قانوني',
        'القائمة المالية': getStatementName(log.statementType),
        'نوع الإجراء': getActionName(log.action),
        'البند المالي المُعدل': log.itemName,
        'القيمة السابقة (ج.م)': log.previousValue !== undefined ? log.previousValue : '---',
        'القيمة الجديدة (ج.م)': log.newValue !== undefined ? log.newValue : '---',
        'قيمة التعديل / الفارق (ج.م)': log.variance !== undefined ? log.variance : 0,
        'ملاحظات وسند التعديل': log.notes || 'معتمد مهنياً',
      }));

      const headerMeta = [
        { 'م': 'اسم المنشأة المهنية', 'التاريخ والوقت': officeProfile.firmName },
        { 'م': 'المحاسب القانوني ومراقب الحسابات', 'التاريخ والوقت': officeProfile.auditorName },
        { 'م': 'رقم القيد بسجل المحاسبين (س.م.م)', 'التاريخ والوقت': officeProfile.licenseNumber },
        { 'م': 'اسم العميل / الشركة', 'التاريخ والوقت': clientName || 'الشركة المصرية' },
        { 'م': 'السنة المالية', 'التاريخ والوقت': fiscalYear },
        { 'م': 'تقرير', 'التاريخ والوقت': 'سجل النشاط المالي ورقابة التعديلات على القوائم المالية' },
        { 'م': 'تاريخ التصدير', 'التاريخ والوقت': new Date().toLocaleString('ar-EG') },
        { 'م': '----------------', 'التاريخ والوقت': '----------------' },
      ];

      const ws = XLSX.utils.json_to_sheet([...headerMeta, ...rows]);
      ws['!views'] = [{ RTL: true }];
      ws['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 25 },
        { wch: 20 },
        { wch: 22 },
        { wch: 22 },
        { wch: 30 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 35 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'سجل النشاط المالي');
      wb.Workbook = { Views: [{ RTL: true }] };

      const filename = `سجل_النشاط_المالي_${clientName || 'الشركة'}_${fiscalYear}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      triggerFileDownload(blob, filename);
    } catch (e: any) {
      alert('خطأ أثناء تصدير سجل النشاط: ' + e?.message);
    }
  };

  // Print
  const handlePrint = () => {
    PrintService.printElementById('financial-activity-log-printable', {
      title: `سجل النشاط المالي ورقابة التعديلات - ${clientName || 'الشركة'} - ${fiscalYear}`,
      orientation: 'landscape',
      recordId: `LOG-FS-${clientId || 'CL'}-${fiscalYear}`,
    });
  };

  // Clear logs
  const handleClearLogs = () => {
    if (confirm('هل أنت متأكد من مسح سجل النشاط المالي لهذه السنة المالية؟ لا يمكن التراجع عن هذا الإجراء.')) {
      db.clearFinancialActivityLogs(fiscalYear, clientId);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <History className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  سجل النشاط المالي ورقابة التعديلات (Audit Trail)
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  توثيق مهني EAS / ISA 240
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold font-mono">
                  لسنة {fiscalYear}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تتبع كامل وشفاف لكافة التعديلات، المستخدمين، أرصدة ميزان المراجعة، وقيم وفوارق التعديلات لضمان النزاهة المهنية
              </p>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="تصدير سجل النشاط إلى مصنف Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="طباعة سجل النشاط بالترويسة المعتمدة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة السجل</span>
            </button>

            {onRefreshStatements && (
              <button
                onClick={onRefreshStatements}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-bold transition-all border border-slate-600 cursor-pointer active:scale-95"
                title="إعادة فحص ومطابقة القيود مع القوائم"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحديث القوائم</span>
              </button>
            )}

            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="مسح سجل النشاط"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-700/80">
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-bold">إجمالي الحركات والأنشطة:</span>
            <span className="text-base sm:text-lg font-black font-mono text-white">{logs.length} حدث</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-bold">قيمة التعديلات الإجمالية:</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
              {formatEgyptianCurrency(totalModificationsValue)}
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-bold">آخر تعديل موثق:</span>
            <span className="text-xs font-bold text-amber-300 font-mono truncate block">
              {logs[0]?.timestamp || 'لا توجد تعديلات بعد'}
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-bold">حالة الرقابة والشفافية:</span>
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>مفعلة ونشطة 100%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في البنود، المستخدم، أو الملاحظات..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Statement Type Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-bold">القائمة:</span>
            <select
              value={selectedStatementFilter}
              onChange={(e) => setSelectedStatementFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">جميع القوائم والشاشات</option>
              <option value="BALANCE_SHEET">قائمة المركز المالي</option>
              <option value="INCOME">قائمة الدخل الشامل</option>
              <option value="CASH_FLOW">قائمة التدفقات النقدية</option>
              <option value="TRIAL_BALANCE_SYNC">تحديث ميزان المراجعة</option>
              <option value="NOTES">الإيضاحات المتممة</option>
              <option value="GENERAL">إجراءات عامة وأرشفة</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">الإجراء:</span>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">كافة أنواع الإجراءات</option>
              <option value="UPDATE_LINE">تعديل رقم بند</option>
              <option value="ADD_CUSTOM_LINE">إضافة بند مخصص</option>
              <option value="DELETE_CUSTOM_LINE">حذف بند مخصص</option>
              <option value="SYNC_TRIAL_BALANCE">ربط وتحديث ميزان المراجعة</option>
              <option value="RESET_TO_LEDGER">استعادة أرقام الدفاتر</option>
              <option value="ARCHIVE_STATEMENT">أرشفة واعتماد القوائم</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Log Table (Printable Container) */}
      <div
        id="financial-activity-log-printable"
        data-record-id={`LOG-FS-${clientId || 'CL'}-${fiscalYear}`}
        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">م</th>
                <th className="py-3 px-3 w-40">التاريخ والوقت</th>
                <th className="py-3 px-3 w-44">المستخدم المسؤول</th>
                <th className="py-3 px-3 w-36">القائمة المتأثرة</th>
                <th className="py-3 px-3 min-w-[160px]">البند المالي المُعدل</th>
                <th className="py-3 px-3 w-36">نوع الإجراء</th>
                <th className="py-3 px-3 w-28 text-center">القيمة السابقة</th>
                <th className="py-3 px-3 w-28 text-center">القيمة الجديدة</th>
                <th className="py-3 px-3 w-32 text-center">قيمة التعديل (الفارق)</th>
                <th className="py-3 px-3 min-w-[180px]">ملاحظات وسند التعديل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2 opacity-50" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                      لا توجد سجلات نشاط مطابقة للمحددات
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      يتم تسجيل وتوثيق أي تعديل على الأرقام أو تحديث لميزان المراجعة آلياً هنا.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const varianceNum = log.variance;
                  const isPositive = varianceNum !== undefined && varianceNum > 0;
                  const isNegative = varianceNum !== undefined && varianceNum < 0;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {log.userName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {log.userRole || 'مراجع قانوني'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatementBadgeClass(log.statementType)}`}>
                          {getStatementName(log.statementType)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {log.itemName}
                        </div>
                        {log.itemKey && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {log.itemKey}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {getActionIcon(log.action)}
                          <span>{getActionName(log.action)}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                        {typeof log.previousValue === 'number'
                          ? formatEgyptianCurrency(log.previousValue)
                          : log.previousValue || '---'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                        {typeof log.newValue === 'number'
                          ? formatEgyptianCurrency(log.newValue)
                          : log.newValue || '---'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                        {varianceNum !== undefined && varianceNum !== 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-rose-600" />
                            )}
                            <span>
                              {isPositive ? '+' : ''}
                              {formatEgyptianCurrency(varianceNum)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0.00</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                        <div className="max-w-xs truncate" title={log.notes || ''}>
                          {log.notes || 'تعديل معتمد وفق مستندات المراجعة'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helpers
function getStatementName(type: string): string {
  switch (type) {
    case 'BALANCE_SHEET':
      return 'قائمة المركز المالي';
    case 'INCOME':
      return 'قائمة الدخل الشامل';
    case 'CASH_FLOW':
      return 'قائمة التدفقات النقدية';
    case 'TRIAL_BALANCE_SYNC':
      return 'تحديث ميزان المراجعة';
    case 'NOTES':
      return 'الإيضاحات المتممة';
    default:
      return 'إجراء عام / أرشفة';
  }
}

function getStatementBadgeClass(type: string): string {
  switch (type) {
    case 'BALANCE_SHEET':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'INCOME':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'CASH_FLOW':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
    case 'TRIAL_BALANCE_SYNC':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

function getActionName(action: string): string {
  switch (action) {
    case 'UPDATE_LINE':
      return 'تعديل رقم بند';
    case 'ADD_CUSTOM_LINE':
      return 'إضافة بند مالي مخصص';
    case 'DELETE_CUSTOM_LINE':
      return 'حذف بند مخصص';
    case 'SYNC_TRIAL_BALANCE':
      return 'تحديث لحظي من ميزان المراجعة';
    case 'RESET_TO_LEDGER':
      return 'استعادة أرقام الدفاتر الأصلية';
    case 'ARCHIVE_STATEMENT':
      return 'أرشفة القوائم المالية';
    default:
      return action;
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'UPDATE_LINE':
      return <Edit3 className="w-3 h-3 text-amber-500" />;
    case 'ADD_CUSTOM_LINE':
      return <Plus className="w-3 h-3 text-emerald-500" />;
    case 'DELETE_CUSTOM_LINE':
      return <Trash2 className="w-3 h-3 text-rose-500" />;
    case 'SYNC_TRIAL_BALANCE':
      return <RefreshCw className="w-3 h-3 text-purple-500" />;
    case 'RESET_TO_LEDGER':
      return <RefreshCw className="w-3 h-3 text-blue-500" />;
    case 'ARCHIVE_STATEMENT':
      return <ShieldCheck className="w-3 h-3 text-teal-500" />;
    default:
      return <Layers className="w-3 h-3 text-slate-400" />;
  }
}
