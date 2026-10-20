import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AuditChainVerificationResult, AuditLogEntry, DatabaseState, db } from '../db/localDatabase';
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Filter,
  History,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export interface AuditTrailViewProps {
  state: DatabaseState;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ state }) => {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [manualCheckResult, setManualCheckResult] = useState<AuditChainVerificationResult | null>(null);

  const chainStatus = manualCheckResult || db.verifyAuditChain();
  const allLogs = state.auditLogs || [];

  const uniqueActions = useMemo(
    () => Array.from(new Set(allLogs.map((l) => l.action).filter(Boolean))).sort(),
    [allLogs]
  );
  const uniqueEntityTypes = useMemo(
    () => Array.from(new Set(allLogs.map((l) => l.entityType).filter(Boolean))).sort(),
    [allLogs]
  );
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of state.users || []) {
      map.set(u.id, u.name);
    }
    for (const l of allLogs) {
      if (l.userId && !map.has(l.userId)) {
        map.set(l.userId, l.userName || l.userId);
      }
    }
    return Array.from(map.entries());
  }, [state.users, allLogs]);

  const logs = useMemo(() => {
    return allLogs.filter((l) => {
      if (clientFilter !== 'ALL' && l.clientId !== clientFilter) return false;
      if (userFilter !== 'ALL' && l.userId !== userFilter && l.userName !== userFilter) return false;
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (entityTypeFilter !== 'ALL' && l.entityType !== entityTypeFilter) return false;

      const logDate = String(l.timestamp || '').slice(0, 10);
      if (dateFrom && logDate && logDate < dateFrom) return false;
      if (dateTo && logDate && logDate > dateTo) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.action?.toLowerCase().includes(q) ||
        l.entityType?.toLowerCase().includes(q) ||
        l.entityId?.toLowerCase().includes(q) ||
        l.clientId?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.userName?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.beforeValue?.toLowerCase().includes(q) ||
        l.afterValue?.toLowerCase().includes(q)
      );
    });
  }, [allLogs, clientFilter, userFilter, actionFilter, entityTypeFilter, dateFrom, dateTo, search]);

  const brokenEntry: AuditLogEntry | undefined = useMemo(() => {
    if (chainStatus.valid || !chainStatus.brokenEntryId) return undefined;
    return allLogs.find((l) => l.id === chainStatus.brokenEntryId);
  }, [chainStatus, allLogs]);

  const handleToggleExpand = (id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRunIntegrityCheck = () => {
    const res = db.verifyAuditChain();
    setManualCheckResult(res);
  };

  const handleResetFilters = () => {
    setSearch('');
    setClientFilter('ALL');
    setUserFilter('ALL');
    setActionFilter('ALL');
    setEntityTypeFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportExcel = () => {
    const rows = logs.map((l) => ({
      معرف_السجل: l.id,
      التوقيت_القاهرة: l.timestamp,
      معرف_المستخدم: l.userId,
      اسم_المستخدم: l.userName,
      الدور: l.userRole,
      الإجراء: l.action,
      نوع_الكيان: l.entityType,
      معرف_الكيان: l.entityId || '',
      العميل: l.clientId || '',
      السبب: l.reason || '',
      التفاصيل: l.details || '',
      القيمة_قبل: l.beforeValue || '',
      القيمة_بعد: l.afterValue || '',
      البصمة_السابقة_prevHash: l.prevHash || '',
      البصمة_الحالية_hash: l.hash || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AuditTrail');
    XLSX.writeFile(workbook, `سجل_المراجعة_Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const formatPrettyJson = (raw?: string) => {
    if (!raw) return '— (لا توجد قيمة مسجلة)';
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              سجل الرقابة والتدقيق الشامل (Audit Trail)
            </h2>
            <p className="text-xs text-slate-500">
              {chainStatus.valid
                ? 'توثيق زمني غير قابل للتلاعب لكافة العمليات المحاسبية والضريبية والأمنية'
                : 'تنبيه أمني: فشل التحقق من سلامة سلسلة التدقيق الرقمية (تم رصد تعديل غير مصرح به)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunIntegrityCheck}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
            <span>فحص سلامة السجل</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* شريط الفلاتر والبحث النصي */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>تصفية وبحث متقدم في سجل المراجعة</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث نصي (في الإجراء، التفاصيل، السبب، القيم قبل/بعد)..."
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <select
              aria-label="فلتر العميل"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">كل العملاء والمنشآت</option>
              {(state.clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="فلتر المستخدم"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">كل المستخدمين</option>
              {uniqueUsers.map(([uid, uname]) => (
                <option key={uid} value={uid}>
                  {uname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="فلتر الإجراء"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">كل الإجراءات</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="فلتر نوع الكيان"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">كل أنواع الكيانات</option>
              {uniqueEntityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">من تاريخ:</span>
            <input
              type="date"
              aria-label="من تاريخ"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">إلى تاريخ:</span>
            <input
              type="date"
              aria-label="إلى تاريخ"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono"
            />
          </div>
          <span className="mr-auto text-[11px] font-semibold text-slate-500">
            إجمالي النتائج المفلترة: {logs.length} من أصل {allLogs.length} سجل
          </span>
        </div>
      </div>

      {/* نتيجة فحص سلسلة الهاش verifyAuditChain */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-bold ${
          chainStatus.valid
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-300 bg-rose-50 text-rose-900'
        }`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {chainStatus.valid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{chainStatus.message}</span>
          </div>
          {!chainStatus.valid && (
            <div className="text-[11px] text-rose-800 pr-7">
              أول سجل مكسور: المعرّف{' '}
              <span className="font-mono font-black">{chainStatus.brokenEntryId || 'غير معروف'}</span>
              {' — '}التاريخ والتوقيت:{' '}
              <span className="font-mono font-black">{brokenEntry?.timestamp || 'غير متوفر'}</span>
            </div>
          )}
        </div>
        <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-white/80 border border-current/20">
          {chainStatus.valid
            ? `SHA-256 CHAIN VERIFIED (${chainStatus.totalRecords})`
            : `CHAIN BROKEN (${chainStatus.brokenEntryId || 'TAMPERED'})`}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
          <span>لا توجد سجلات مراجعة مطابقة للفلاتر المحددة</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 w-10">توسيع</th>
                <th className="p-3">التوقيت (القاهرة)</th>
                <th className="p-3">المستخدم</th>
                <th className="p-3">الإجراء</th>
                <th className="p-3">الكيان / العميل</th>
                <th className="p-3">السبب والتفاصيل</th>
                <th className="p-3">القيمة قبل / بعد</th>
                <th className="p-3">بصمة السجل (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => {
                const isBrokenEntry = !chainStatus.valid && chainStatus.brokenEntryId === log.id;
                const isExpanded = Boolean(expandedRowIds[log.id]);
                const clientObj = log.clientId ? (state.clients || []).find((c) => c.id === log.clientId) : undefined;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => handleToggleExpand(log.id)}
                      className={`cursor-pointer transition ${
                        isBrokenEntry ? 'bg-rose-50/80' : isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          aria-label="توسيع تفاصيل السجل"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(log.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <div>{log.timestamp}</div>
                        <div className="text-[10px] text-slate-400">{log.id}</div>
                      </td>
                      <td className="p-3 font-bold">
                        {log.userName}
                        <span className="block text-[10px] font-normal text-slate-500">{log.userRole}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{log.action}</td>
                      <td className="p-3 text-slate-600">
                        <div className="font-bold">{log.entityType}</div>
                        {log.entityId && <div className="text-[10px] font-mono text-slate-500">#{log.entityId}</div>}
                        {log.clientId && (
                          <div className="text-[10px] font-semibold text-emerald-700">
                            {clientObj ? `${clientObj.name} (${log.clientId})` : log.clientId}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-800">
                        <div>{log.details}</div>
                        {log.reason && <div className="text-[11px] text-slate-500 mt-0.5">السبب: {log.reason}</div>}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                        {log.beforeValue && <div>قبل: {log.beforeValue.slice(0, 50)}</div>}
                        {log.afterValue && <div>بعد: {log.afterValue.slice(0, 50)}</div>}
                        <span className="text-[10px] text-indigo-600 underline">
                          {isExpanded ? 'إخفاء التفاصيل' : 'عرض القيمة قبل وبعد'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">
                        <div title={log.hash}>#{log.hash?.slice(0, 12) || '—'}</div>
                        <div className="text-[9px] text-slate-400" title={log.prevHash}>
                          السابق: {log.prevHash === 'GENESIS' ? 'GENESIS' : log.prevHash?.slice(0, 10)}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="rounded-xl border border-amber-200 bg-white p-3">
                              <div className="font-bold text-amber-800 mb-1.5 border-b border-amber-100 pb-1">
                                القيمة قبل التعديل (Before Value):
                              </div>
                              <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                {formatPrettyJson(log.beforeValue)}
                              </pre>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-white p-3">
                              <div className="font-bold text-emerald-800 mb-1.5 border-b border-emerald-100 pb-1">
                                القيمة بعد التعديل (After Value):
                              </div>
                              <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                {formatPrettyJson(log.afterValue)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
                            <span>معرف السجل: {log.id}</span>
                            <span>بصمة السجل (hash): {log.hash}</span>
                            <span>البصمة السابقة (prevHash): {log.prevHash}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


