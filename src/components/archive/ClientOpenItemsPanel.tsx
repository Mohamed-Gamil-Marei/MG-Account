import React, { useState, useMemo } from 'react';
import {
  FileQuestion,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  Check,
  Send,
  X,
  FileText,
  Filter,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { OpenItem, OpenItemKind, OpenItemStatus } from '../../types';
import {
  formatOpenItemKindLabel,
  formatOpenItemStatusLabel,
  formatOpenItemsTextForClient,
} from '../../utils/openItems';

interface ClientOpenItemsPanelProps {
  state: DatabaseState;
  selectedClientId: string;
  fiscalYear?: number | string;
}

export const ClientOpenItemsPanel: React.FC<ClientOpenItemsPanelProps> = ({
  state,
  selectedClientId,
  fiscalYear = 2026,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RECEIVED' | 'CLOSED'>('ALL');
  const [selectedYear, setSelectedYear] = useState<number | string>(fiscalYear);

  // Quick 1-line form state
  const [newItemText, setNewItemText] = useState<string>('');
  const [newItemKind, setNewItemKind] = useState<OpenItemKind>('DOCUMENT');
  const [newItemDueDate, setNewItemDueDate] = useState<string>('');

  // Copy / Message modal state
  const [showClientMessageModal, setShowClientMessageModal] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const client = useMemo(
    () => state.clients.find((c) => c.id === selectedClientId) || state.clients[0],
    [state.clients, selectedClientId]
  );

  const officeProfile = state.officeProfile;

  const openItems = useMemo(() => {
    return db.getOpenItems(selectedClientId);
  }, [state.openItems, selectedClientId]);

  const filteredItems = useMemo(() => {
    return openItems.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
  }, [openItems, statusFilter]);

  const stats = useMemo(() => {
    const total = openItems.length;
    const openCount = openItems.filter((i) => i.status === 'OPEN').length;
    const receivedCount = openItems.filter((i) => i.status === 'RECEIVED').length;
    const closedCount = openItems.filter((i) => i.status === 'CLOSED').length;
    return { total, openCount, receivedCount, closedCount };
  }, [openItems]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    db.addOpenItem({
      clientId: selectedClientId,
      clientName: client?.name,
      fiscalYear: selectedYear,
      kind: newItemKind,
      text: newItemText.trim(),
      requestedAt: new Date().toISOString().split('T')[0],
      dueDate: newItemDueDate || undefined,
      status: 'OPEN',
    });

    setNewItemText('');
    setNewItemDueDate('');
  };

  const handleStatusChange = (id: string, newStatus: OpenItemStatus) => {
    db.updateOpenItem(id, { status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت تأكد من حذف هذا البند؟')) {
      db.deleteOpenItem(id);
    }
  };

  const clientMessageText = useMemo(() => {
    return formatOpenItemsTextForClient(
      client?.name || 'العميل',
      selectedYear,
      openItems,
      officeProfile?.name
    );
  }, [client?.name, selectedYear, openItems, officeProfile?.name]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(clientMessageText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>البنود المفتوحة والمستندات المعلقة: {client?.name}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            حصر الأسئلة، المذكرات والتوضيحات المطلوبة من العميل للعام المالي {selectedYear}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowClientMessageModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>توليد رسالة الطلب للعميل (واتساب / إيميل)</span>
        </button>
      </div>

      {/* Quick 1-Line Add Form (Requirement 2) */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-2 text-xs"
      >
        <select
          value={newItemKind}
          onChange={(e) => setNewItemKind(e.target.value as OpenItemKind)}
          className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0 font-medium"
        >
          <option value="DOCUMENT">مستند مطلوب</option>
          <option value="QUESTION">استفسار/توضيح</option>
          <option value="ADJUSTMENT">تسوية/قيد معلق</option>
        </select>

        <input
          type="text"
          required
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="إضافة سريعة: اكتب المستند أو البيان المطلوب من العميل هنا..."
          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-500 w-full"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <input
            type="date"
            value={newItemDueDate}
            onChange={(e) => setNewItemDueDate(e.target.value)}
            title="تاريخ الاستحقاق (اختياري)"
            className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة البند</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs & Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            الكل ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'OPEN'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            مفتوح ({stats.openCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('RECEIVED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'RECEIVED'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            تم الرد ({stats.receivedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'CLOSED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            مغلق ومعتمد ({stats.closedCount})
          </button>
        </div>
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          لا توجد بنود مفتوحة أو مستندات معلقة بهذه الحالة.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">نوع البند</th>
                <th className="p-3">البيان / المطلوب</th>
                <th className="p-3">السنة</th>
                <th className="p-3">تاريخ الطلب</th>
                <th className="p-3">الموعد المستهدف</th>
                <th className="p-3">حالة البند</th>
                <th className="p-3 text-center w-20">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                    {formatOpenItemKindLabel(item.kind)}
                  </td>
                  <td className="p-3 text-slate-900 dark:text-white font-medium">
                    {item.text}
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                    {item.fiscalYear || selectedYear}
                  </td>
                  <td className="p-3 font-mono text-slate-500">
                    {item.requestedAt}
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                    {item.dueDate || '—'}
                  </td>
                  <td className="p-3">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as OpenItemStatus)}
                      className={`px-2 py-1 rounded text-xs font-bold border ${
                        item.status === 'OPEN'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : item.status === 'RECEIVED'
                          ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      <option value="OPEN">مفتوح (قيد الانتظار)</option>
                      <option value="RECEIVED">تم الاستلام/الرد</option>
                      <option value="CLOSED">مغلق ومعتمد</option>
                    </select>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="حذف البند"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Copy / WhatsApp Client Message Modal (Requirement 4) */}
      {showClientMessageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden space-y-4 p-5 text-right">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>رسالة قائمة البنود المفتوحة الموجهة للعميل</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowClientMessageModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                نص عربي بسيط مصاغ وجاهز للنسخ والإرسال للعميل عبر WhatsApp أو الإيميل:
              </p>
              <textarea
                readOnly
                rows={10}
                value={clientMessageText}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-sans text-slate-800 dark:text-slate-200 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClientMessageModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(clientMessageText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>فتح في WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'تم النسخ!' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
