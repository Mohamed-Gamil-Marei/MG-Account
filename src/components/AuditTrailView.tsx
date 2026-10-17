import React, { useState } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { History, Search, ShieldCheck } from 'lucide-react';

export interface AuditTrailViewProps {
  state: DatabaseState;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ state }) => {
  const [search, setSearch] = useState('');
  const logs = (state.auditLogs || []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q)
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
              توثيق زمني غير قابل للتلاعب لكافة العمليات المحاسبية والضريبية والأمنية
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
                <th className="p-3">التوقيت</th>
                <th className="p-3">المستخدم</th>
                <th className="p-3">العملية</th>
                <th className="p-3">الكيان</th>
                <th className="p-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-[11px]">{log.timestamp}</td>
                  <td className="p-3 font-bold">{log.userName}</td>
                  <td className="p-3 font-mono font-bold text-indigo-700">{log.action}</td>
                  <td className="p-3 text-slate-600">{log.entityType}</td>
                  <td className="p-3 text-slate-800">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
