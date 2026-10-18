import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  ArrowLeftRight,
  ShieldAlert,
  Calendar,
  Hash,
  Layers,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { ClientArchiveRecord, JournalEntry } from '../types';

interface UnassignedEntriesViewProps {
  clients: ClientArchiveRecord[];
  onResolvedChange?: () => void;
  onNavigateToReports?: () => void;
}

export const UnassignedEntriesView: React.FC<UnassignedEntriesViewProps> = ({
  clients,
  onResolvedChange,
  onNavigateToReports,
}) => {
  const [unassignedEntries, setUnassignedEntries] = useState<JournalEntry[]>(() =>
    db.getUnassignedJournalEntries()
  );
  const [selectedClientByEntry, setSelectedClientByEntry] = useState<Record<string, string>>({});
  const [batchClientId, setBatchClientId] = useState<string>(clients[0]?.id || '');
  const [assignmentReason, setAssignmentReason] = useState<string>(
    'نسب قيد تاريخي غير منسوب إلى المنشأة المختصة بعد مراجعة المستندات'
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const refreshUnassigned = () => {
    const fresh = db.getUnassignedJournalEntries();
    setUnassignedEntries([...fresh]);
    onResolvedChange?.();
  };

  const handleAssignSingle = (entryId: string) => {
    setFeedback(null);
    const targetClientId = selectedClientByEntry[entryId] || batchClientId;
    if (!targetClientId) {
      setFeedback({ type: 'error', message: 'يرجى اختيار المنشأة (العميل) أولاً قبل نسب القيد.' });
      return;
    }
    try {
      const assigned = db.assignJournalEntryToClient(
        entryId,
        targetClientId,
        assignmentReason.trim() || 'نسب قيد تاريخي إلى المنشأة المختصة'
      );
      const clientObj = clients.find((c) => c.id === targetClientId);
      setFeedback({
        type: 'success',
        message: `تم نسب القيد رقم (${assigned.entryNumber}) بنجاح إلى المنشأة (${clientObj?.name || targetClientId}) وتوثيق العملية في سجل المراجعة.`,
      });
      refreshUnassigned();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر نسب القيد إلى العميل.',
      });
    }
  };

  const handleAssignAll = () => {
    setFeedback(null);
    if (!batchClientId) {
      setFeedback({
        type: 'error',
        message: 'يرجى اختيار المنشأة المراد نسب القيود غير المنسوبة إليها.',
      });
      return;
    }
    try {
      const count = db.assignAllUnassignedEntriesToClient(
        batchClientId,
        assignmentReason.trim() || 'نسب جماعي للقيود غير المنسوبة إلى المنشأة المختصة'
      );
      const clientObj = clients.find((c) => c.id === batchClientId);
      setFeedback({
        type: 'success',
        message: `تم نسب (${count}) قيد محاسبي بنجاح إلى المنشأة (${clientObj?.name || batchClientId}). جميع التقارير المالية والضريبية متاحة الآن.`,
      });
      refreshUnassigned();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر نسب القيود.',
      });
    }
  };

  const totalDebit = unassignedEntries.reduce(
    (sum, entry) =>
      sum + (entry.lines || []).reduce((lSum, l) => lSum + (Number(l.debit) || 0), 0),
    0
  );
  const totalCredit = unassignedEntries.reduce(
    (sum, entry) =>
      sum + (entry.lines || []).reduce((lSum, l) => lSum + (Number(l.credit) || 0), 0),
    0
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div
        className={`rounded-2xl border p-6 shadow-sm ${
          unassignedEntries.length > 0
            ? 'bg-amber-950/10 border-amber-500/40'
            : 'bg-emerald-950/10 border-emerald-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-xl shrink-0 ${
                unassignedEntries.length > 0
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {unassignedEntries.length > 0 ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                قيود غير منسوبة لمنشأة (معالجة البيانات المرحّلة)
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                    unassignedEntries.length > 0
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {unassignedEntries.length} قيد معلق
                </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                التزاماً بمبدأ الفصل الصارم بين حسابات المنشآت وعدم الحذف التلقائي للبيانات التاريخية، يتم حجز أي قيد
                بدون معرّف عميل (<code className="font-mono text-xs">clientId</code>) في هذه الشاشة. يلزم نسب كل قيد
                إلى المنشأة الخاصة به قبل عرض أو تصدير أي تقرير محاسبي أو ضريبي.
              </p>
            </div>
          </div>

          {unassignedEntries.length === 0 && onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition flex items-center gap-2 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              الانتقال إلى القوائم والتقارير المالية
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            إجمالي القيود غير المنسوبة
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {unassignedEntries.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {unassignedEntries.length === 0
              ? 'جميع القيود مربوطة بمنشآتها'
              : 'مطلوب نسبها لتفعيل التقارير'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            إجمالي المدين للقيود المعلقة (ج.م)
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">محفوظة بالكامل دون حذف</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            إجمالي الدائن للقيود المعلقة (ج.م)
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">يُعاد ربط أكواد الحسابات تلقائياً عند النسب</div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {unassignedEntries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            تخصيص ونسب القيود إلى المنشأة المختصة (مع التسجيل في سجل المراجعة SHA-256)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                المنشأة (العميل) الافتراضية للنسب الجماعي
              </label>
              <select
                value={batchClientId}
                onChange={(e) => setBatchClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">-- اختر المنشأة --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — سنة مالية {c.fiscalYear || c.activeFiscalYear}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                سبب النسب والتوثيق في سجل المراجعة (إلزامي)
              </label>
              <input
                type="text"
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                placeholder="مثال: نسب قيود مرحلة من الإصدار السابق بعد مطابقة المستندات..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-3">
              <button
                onClick={handleAssignAll}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                نسب الكل للمنشأة المختارة ({unassignedEntries.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {unassignedEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            لا توجد أي قيود غير منسوبة حالياً
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            جميع قيود اليومية في قاعدة البيانات منسوبة إلى منشآت محددة (<code className="font-mono">clientId</code>)،
            ومعزولة بالكامل في ميزان المراجعة والقوائم المالية والإقرارات الضريبية.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">رقم القيد</th>
                  <th className="py-3.5 px-4">التاريخ والسنة</th>
                  <th className="py-3.5 px-4">البيان وتفاصيل الأسطر</th>
                  <th className="py-3.5 px-4">إجمالي المدين / الدائن</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 w-72">المنشأة المختصة</th>
                  <th className="py-3.5 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {unassignedEntries.map((entry) => {
                  const entryDebit = (entry.lines || []).reduce(
                    (s, l) => s + (Number(l.debit) || 0),
                    0
                  );
                  const entryCredit = (entry.lines || []).reduce(
                    (s, l) => s + (Number(l.credit) || 0),
                    0
                  );
                  const chosenClient =
                    selectedClientByEntry[entry.id] !== undefined
                      ? selectedClientByEntry[entry.id]
                      : batchClientId;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          {entry.entryNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {entry.date}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          سنة مالية: {entry.fiscalYear || entry.date?.slice(0, 4)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {entry.description || 'بدون بيان'}
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {(entry.lines || []).map((line, lIdx) => (
                            <div
                              key={line.id || lIdx}
                              className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono"
                            >
                              <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                [{line.accountCode}] {line.accountName}
                              </span>
                              {Number(line.debit) > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  مدين: {Number(line.debit).toLocaleString('ar-EG')}
                                </span>
                              )}
                              {Number(line.credit) > 0 && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  دائن: {Number(line.credit).toLocaleString('ar-EG')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                          م: {entryDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </div>
                        <div className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                          د: {entryCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            entry.isPosted || entry.status === 'POSTED'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {entry.isPosted || entry.status === 'POSTED' ? 'مرحّل' : 'مسودة'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={chosenClient}
                          onChange={(e) =>
                            setSelectedClientByEntry((prev) => ({
                              ...prev,
                              [entry.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- اختر العميل --</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleAssignSingle(entry.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap"
                        >
                          نسب القيد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
