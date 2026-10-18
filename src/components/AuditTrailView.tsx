import React, { useState } from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { History, Search, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface AuditTrailViewProps {
  state: DatabaseState;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ state }) => {
  const [search, setSearch] = useState('');
  const chainStatus = db.verifyAuditChain();

  const logs = (state.auditLogs || []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q)
    );
  });

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
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في سجل التدقيق..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
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
        <div className="flex items-center gap-2">
          {chainStatus.valid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{chainStatus.message}</span>
        </div>
        <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-white/80 border border-current/20">
          {chainStatus.valid ? 'SHA-256 CHAIN VERIFIED' : `CHAIN BROKEN (${chainStatus.brokenEntryId || 'TAMPERED'})`}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
          <span>سجل الرقابة نشط وجاهز لتسجيل كافة العمليات</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3">التوقيت (القاهرة)</th>
                <th className="p-3">المستخدم</th>
                <th className="p-3">العملية</th>
                <th className="p-3">الكيان / العميل</th>
                <th className="p-3">السبب والتفاصيل</th>
                <th className="p-3">قبل / بعد</th>
                <th className="p-3">بصمة السجل (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => {
                const isBrokenEntry = !chainStatus.valid && chainStatus.brokenEntryId === log.id;
                return (
                  <tr key={log.id} className={isBrokenEntry ? 'bg-rose-50/80' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="p-3 font-bold">
                      {log.userName}
                      <span className="block text-[10px] font-normal text-slate-500">{log.userRole}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{log.action}</td>
                    <td className="p-3 text-slate-600">
                      <div>{log.entityType}</div>
                      {log.clientId && <div className="text-[10px] font-mono text-slate-500">{log.clientId}</div>}
                    </td>
                    <td className="p-3 text-slate-800">
                      <div>{log.details}</div>
                      {log.reason && <div className="text-[11px] text-slate-500 mt-0.5">السبب: {log.reason}</div>}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                      {log.beforeValue && <div>قبل: {log.beforeValue.slice(0, 60)}</div>}
                      {log.afterValue && <div>بعد: {log.afterValue.slice(0, 60)}</div>}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-500">
                      <div title={log.hash}>#{log.hash?.slice(0, 12) || '—'}</div>
                      <div className="text-[9px] text-slate-400" title={log.prevHash}>
                        السابق: {log.prevHash === 'GENESIS' ? 'GENESIS' : log.prevHash?.slice(0, 10)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

