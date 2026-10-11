import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Copy,
  FileText,
  X,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientDeadline, DeadlineType, DeadlineStatus } from '../../types';
import {
  getDeadlineStatus,
  formatDeadlineTypeLabel,
  generateMonthlyDeadlines,
} from '../../utils/deadlines';

interface ClientDeadlinesPanelProps {
  state: DatabaseState;
  selectedClientId: string;
}

export const ClientDeadlinesPanel: React.FC<ClientDeadlinesPanelProps> = ({
  state,
  selectedClientId,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'FILED'>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingDeadline, setEditingDeadline] = useState<ClientDeadline | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [type, setType] = useState<DeadlineType>('VAT');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [enableMonthlyRepeat, setEnableMonthlyRepeat] = useState<boolean>(false);
  const [repeatMonthsCount, setRepeatMonthsCount] = useState<number>(3);

  const client = useMemo(
    () => state.clients.find((c) => c.id === selectedClientId) || state.clients[0],
    [state.clients, selectedClientId]
  );

  const deadlines = useMemo(() => {
    return db.getClientDeadlines(selectedClientId);
  }, [state.clientDeadlines, selectedClientId]);

  const deadlinesWithStatus = useMemo(() => {
    return deadlines.map((d) => ({
      ...d,
      calcStatus: getDeadlineStatus(d),
    })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [deadlines]);

  const filteredDeadlines = useMemo(() => {
    if (filter === 'ALL') return deadlinesWithStatus;
    return deadlinesWithStatus.filter((d) => d.calcStatus === filter);
  }, [deadlinesWithStatus, filter]);

  const stats = useMemo(() => {
    const total = deadlinesWithStatus.length;
    const overdue = deadlinesWithStatus.filter((d) => d.calcStatus === 'OVERDUE').length;
    const dueSoon = deadlinesWithStatus.filter((d) => d.calcStatus === 'DUE_SOON').length;
    const upcoming = deadlinesWithStatus.filter((d) => d.calcStatus === 'UPCOMING').length;
    const filed = deadlinesWithStatus.filter((d) => d.calcStatus === 'FILED').length;

    return { total, overdue, dueSoon, upcoming, filed };
  }, [deadlinesWithStatus]);

  const handleOpenAddModal = () => {
    setEditingDeadline(null);
    setTitle('');
    setType('VAT');
    setDueDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setEnableMonthlyRepeat(false);
    setRepeatMonthsCount(3);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (d: ClientDeadline) => {
    setEditingDeadline(d);
    setTitle(d.title);
    setType(d.type);
    setDueDate(d.dueDate);
    setNote(d.note || '');
    setEnableMonthlyRepeat(false);
    setShowAddModal(true);
  };

  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    if (editingDeadline) {
      db.updateClientDeadline(editingDeadline.id, {
        title: title.trim(),
        type,
        dueDate,
        note: note.trim() || undefined,
      });
    } else {
      const basePayload = {
        clientId: selectedClientId,
        clientName: client?.name,
        title: title.trim(),
        type,
        dueDate,
        status: 'PENDING' as DeadlineStatus,
        note: note.trim() || undefined,
      };

      db.addClientDeadline(basePayload);

      if (enableMonthlyRepeat && repeatMonthsCount > 0) {
        const repeated = generateMonthlyDeadlines(basePayload, repeatMonthsCount);
        db.addMultipleClientDeadlines(repeated);
      }
    }

    setShowAddModal(false);
  };

  const handleToggleFiled = (d: ClientDeadline) => {
    const newStatus: DeadlineStatus = d.status === 'FILED' ? 'PENDING' : 'FILED';
    db.updateClientDeadline(d.id, {
      status: newStatus,
      filedAt: newStatus === 'FILED' ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت تأكد من حذف موعد الإقرار هذا؟')) {
      db.deleteClientDeadline(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>مواعيد الإقرارات والتكليفات القانونية: {client?.name}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            متابعة استحقاق الضريبة، التأمينات والسجل لضمان التقديم في التوقيتات بدون غرامات.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موعد إقرار جديد</span>
        </button>
      </div>

      {/* Filter Tabs & Mini Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            الكل ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter('OVERDUE')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'OVERDUE'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            متأخر ({stats.overdue})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DUE_SOON')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'DUE_SOON'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            خلال 7 أيام ({stats.dueSoon})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UPCOMING')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'UPCOMING'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            قادم ({stats.upcoming})
          </button>
          <button
            type="button"
            onClick={() => setFilter('FILED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === 'FILED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            تم التقديم ({stats.filed})
          </button>
        </div>
      </div>

      {/* Deadlines Compact List */}
      {filteredDeadlines.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          لا توجد مواعيد إقرارات مسجلة ضمن هذه التصفية.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">نوع التكليف / الإقرار</th>
                <th className="p-3">العنوان / البيان</th>
                <th className="p-3">تاريخ الاستحقاق</th>
                <th className="p-3">الحالة التشغيلية</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3 text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredDeadlines.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.calcStatus === 'OVERDUE' ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                    {formatDeadlineTypeLabel(item.type)}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                    {item.title}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.dueDate}
                  </td>
                  <td className="p-3">
                    {item.calcStatus === 'FILED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        تم التقديم ({item.filedAt || 'مكتمل'})
                      </span>
                    )}
                    {item.calcStatus === 'OVERDUE' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        متأخر (تجاوز التاريخ)
                      </span>
                    )}
                    {item.calcStatus === 'DUE_SOON' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        مستحق خلال أسبوع
                      </span>
                    )}
                    {item.calcStatus === 'UPCOMING' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        قادم لاحقاً
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    {item.note || '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleFiled(item)}
                        title={item.status === 'FILED' ? 'إلغاء التقديم' : 'تحديد كـ "تم التقديم"'}
                        className={`p-1.5 rounded transition-all ${
                          item.status === 'FILED'
                            ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        title="تعديل الموعد"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="حذف الموعد"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden space-y-4 p-5 text-right">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>{editingDeadline ? 'تعديل موعد إقرار' : 'إضافة موعد إقرار جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  نوع الإقرار / التكليف:
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DeadlineType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="VAT">إقرار القيمة المضافة (VAT)</option>
                  <option value="INCOME_TAX">إقرار ضريبة الدخل</option>
                  <option value="WHT">إقرار الخصم والتحصيل (WHT)</option>
                  <option value="PAYROLL_TAX">إقرار كسب العمل والأجور</option>
                  <option value="SOCIAL_INSURANCE">التأمينات الاجتماعية</option>
                  <option value="COMMERCIAL_REGISTER">تجديد السجل التجاري</option>
                  <option value="OTHER">موعد/تأكيد آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  عنوان البيان / التفاصيل:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إقرار قيمة مضافة عن شهر يناير 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  تاريخ الاستحقاق (تاريخ محدد يدويًا):
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  تنبيه: يدخل المحاسب التاريخ بيده تجنباً للتوليد الآلي بأحكام قانونية قد تتغير.
                </p>
              </div>

              {!editingDeadline && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={enableMonthlyRepeat}
                      onChange={(e) => setEnableMonthlyRepeat(e.target.checked)}
                      className="rounded text-slate-800"
                    />
                    <span>تكرار شهري للمستند بنفس اليوم للأشهر القادمة</span>
                  </label>

                  {enableMonthlyRepeat && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">عدد الأشهر التالية:</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={repeatMonthsCount}
                        onChange={(e) => setRepeatMonthsCount(Math.max(1, Math.min(12, Number(e.target.value))))}
                        className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-center font-mono"
                      />
                      <span className="text-slate-500 font-medium">شهور</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ملاحظات إضافية (اختياري):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظات حول طريقة السداد أو التسليم..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold"
                >
                  حفظ الموعد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
