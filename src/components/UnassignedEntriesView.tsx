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
  Receipt,
  Landmark,
  Package,
  FileCheck2,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import {
  ClientArchiveRecord,
  JournalEntry,
  Invoice,
  OfficeTreasuryTransaction,
  FixedAsset,
  TaxDeclarationRecord,
} from '../types';

interface UnassignedEntriesViewProps {
  clients: ClientArchiveRecord[];
  onResolvedChange?: () => void;
  onNavigateToReports?: () => void;
}

type TabType = 'JOURNAL' | 'INVOICES' | 'TREASURY' | 'ASSETS' | 'TAXES';

export const UnassignedEntriesView: React.FC<UnassignedEntriesViewProps> = ({
  clients,
  onResolvedChange,
  onNavigateToReports,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('JOURNAL');
  const [unassignedEntries, setUnassignedEntries] = useState<JournalEntry[]>(() =>
    db.getUnassignedJournalEntries()
  );
  const [unassignedInvoices, setUnassignedInvoices] = useState<Invoice[]>(() =>
    db.getUnassignedInvoices()
  );
  const [unassignedTreasury, setUnassignedTreasury] = useState<OfficeTreasuryTransaction[]>(() =>
    db.getUnassignedTreasuryTransactions()
  );
  const [unassignedAssets, setUnassignedAssets] = useState<FixedAsset[]>(() =>
    db.getUnassignedFixedAssets()
  );
  const [unassignedDeclarations, setUnassignedDeclarations] = useState<TaxDeclarationRecord[]>(() =>
    db.getUnassignedTaxDeclarations()
  );

  const [selectedClientByRecord, setSelectedClientByRecord] = useState<Record<string, string>>({});
  const [batchClientId, setBatchClientId] = useState<string>(clients[0]?.id || '');
  const [assignmentReason, setAssignmentReason] = useState<string>(
    'نسب سجل تاريخي غير منسوب إلى المنشأة المختصة بعد مراجعة المستندات'
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const refreshAll = () => {
    setUnassignedEntries([...db.getUnassignedJournalEntries()]);
    setUnassignedInvoices([...db.getUnassignedInvoices()]);
    setUnassignedTreasury([...db.getUnassignedTreasuryTransactions()]);
    setUnassignedAssets([...db.getUnassignedFixedAssets()]);
    setUnassignedDeclarations([...db.getUnassignedTaxDeclarations()]);
    onResolvedChange?.();
  };

  const totalUnassignedCount =
    unassignedEntries.length +
    unassignedInvoices.length +
    unassignedTreasury.length +
    unassignedAssets.length +
    unassignedDeclarations.length;

  const handleAssignSingleRecord = (
    entityType: 'JOURNAL_ENTRY' | 'INVOICE' | 'TREASURY' | 'FIXED_ASSET' | 'TAX_DECLARATION',
    recordId: string,
    labelDesc: string
  ) => {
    setFeedback(null);
    const targetClientId = selectedClientByRecord[recordId] || batchClientId;
    if (!targetClientId) {
      setFeedback({ type: 'error', message: 'يرجى اختيار المنشأة (العميل) أولاً قبل نسب السجل.' });
      return;
    }
    try {
      if (entityType === 'JOURNAL_ENTRY') {
        db.assignJournalEntryToClient(
          recordId,
          targetClientId,
          assignmentReason.trim() || 'نسب قيد تاريخي إلى المنشأة المختصة'
        );
      } else {
        db.assignUnassignedRecordToClient(
          entityType,
          recordId,
          targetClientId,
          assignmentReason.trim() || 'نسب سجل تاريخي إلى المنشأة المختصة'
        );
      }
      const clientObj = clients.find((c) => c.id === targetClientId);
      setFeedback({
        type: 'success',
        message: `تم نسب ${labelDesc} بنجاح إلى المنشأة (${clientObj?.name || targetClientId}) وتوثيق العملية في سجل المراجعة.`,
      });
      refreshAll();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر نسب السجل إلى العميل.',
      });
    }
  };

  const handleAssignAll = () => {
    setFeedback(null);
    if (!batchClientId) {
      setFeedback({
        type: 'error',
        message: 'يرجى اختيار المنشأة المراد نسب السجلات غير المنسوبة إليها.',
      });
      return;
    }
    try {
      const count = db.assignAllUnassignedEntriesToClient(
        batchClientId,
        assignmentReason.trim() || 'نسب جماعي لكافة السجلات غير المنسوبة إلى المنشأة المختصة'
      );
      const clientObj = clients.find((c) => c.id === batchClientId);
      setFeedback({
        type: 'success',
        message: `تم نسب (${count}) سجل محاسبي وضريبي بنجاح إلى المنشأة (${clientObj?.name || batchClientId}). جميع التقارير والقوائم متاحة الآن.`,
      });
      refreshAll();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر نسب السجلات.',
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
      {/* Banner */}
      <div
        className={`rounded-2xl border p-6 shadow-sm ${
          totalUnassignedCount > 0
            ? 'bg-amber-950/10 border-amber-500/40'
            : 'bg-emerald-950/10 border-emerald-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-xl shrink-0 ${
                totalUnassignedCount > 0
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {totalUnassignedCount > 0 ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                سجلات وقيود غير منسوبة لمنشأة (معالجة البيانات التاريخية والعزل)
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                    totalUnassignedCount > 0
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {totalUnassignedCount} سجل معلق
                </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                التزاماً بمبدأ العزل الصارم بين المنشآت والسنوات المالية، يتم حجز أي قيد أو فاتورة أو حركة خزنة أو أصل أو إقرار بدون معرّف منشأة (<code className="font-mono text-xs">clientId</code>) في هذه الشاشة. لا يدخل أي سجل غير منسوب في أي ميزان مراجعة أو قائمة مالية حتى يتم نسبه للمنشأة وتوثيق ذلك.
              </p>
            </div>
          </div>

          {totalUnassignedCount === 0 && onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              الانتقال إلى القوائم والتقارير المالية
            </button>
          )}
        </div>
      </div>

      {/* 5-Category Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('JOURNAL')}
          className={`cursor-pointer rounded-xl border p-4 transition ${
            activeTab === 'JOURNAL'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Layers className="w-4 h-4 text-blue-600" />
            قيود اليومية
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
            {unassignedEntries.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {unassignedEntries.length > 0 ? `${totalDebit.toLocaleString('ar-EG')} ج.م` : 'مكتملة'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('INVOICES')}
          className={`cursor-pointer rounded-xl border p-4 transition ${
            activeTab === 'INVOICES'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Receipt className="w-4 h-4 text-emerald-600" />
            الفواتير الإلكترونية
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
            {unassignedInvoices.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {unassignedInvoices.length > 0 ? 'معلقة غير منسوبة' : 'مكتملة'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('TREASURY')}
          className={`cursor-pointer rounded-xl border p-4 transition ${
            activeTab === 'TREASURY'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Landmark className="w-4 h-4 text-amber-600" />
            حركات الخزنة
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
            {unassignedTreasury.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {unassignedTreasury.length > 0 ? 'معلقة غير منسوبة' : 'مكتملة'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('ASSETS')}
          className={`cursor-pointer rounded-xl border p-4 transition ${
            activeTab === 'ASSETS'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Package className="w-4 h-4 text-purple-600" />
            الأصول الثابتة
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
            {unassignedAssets.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {unassignedAssets.length > 0 ? 'معلقة غير منسوبة' : 'مكتملة'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('TAXES')}
          className={`cursor-pointer rounded-xl border p-4 transition ${
            activeTab === 'TAXES'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            الإقرارات الضريبية
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
            {unassignedDeclarations.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {unassignedDeclarations.length > 0 ? 'معلقة غير منسوبة' : 'مكتملة'}
          </div>
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

      {/* Batch Assign Bar */}
      {totalUnassignedCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            تخصيص ونسب السجلات إلى المنشأة المختصة (مع التسجيل التلقائي في سجل المراجعة وسلسلة SHA-256)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                المنشأة (العميل) المراد نسب السجلات إليها
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
                placeholder="مثال: نسب السجلات غير المنسوبة إلى المنشأة المختصة بعد مراجعة المستندات..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-3">
              <button
                onClick={handleAssignAll}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                نسب كافة السجلات المعلقة ({totalUnassignedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('JOURNAL')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'JOURNAL'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          قيود اليومية ({unassignedEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'INVOICES'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          الفواتير ({unassignedInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('TREASURY')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'TREASURY'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          حركات الخزنة ({unassignedTreasury.length})
        </button>
        <button
          onClick={() => setActiveTab('ASSETS')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'ASSETS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          الأصول الثابتة ({unassignedAssets.length})
        </button>
        <button
          onClick={() => setActiveTab('TAXES')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'TAXES'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          الإقرارات الضريبية ({unassignedDeclarations.length})
        </button>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'JOURNAL' && (
        unassignedEntries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد قيود يومية معلقة غير منسوبة</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">رقم القيد</th>
                    <th className="py-3 px-4">التاريخ والسنة</th>
                    <th className="py-3 px-4">البيان وتفاصيل الأسطر</th>
                    <th className="py-3 px-4">إجمالي المدين / الدائن</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 w-72">المنشأة المختصة</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
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
                      selectedClientByRecord[entry.id] !== undefined
                        ? selectedClientByRecord[entry.id]
                        : batchClientId;

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-slate-400" />
                            {entry.entryNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {entry.date}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            سنة مالية: {entry.fiscalYear || entry.date?.slice(0, 4)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {entry.description || 'بدون بيان'}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {(entry.lines || []).map((line, lIdx) => (
                              <div
                                key={line.id || lIdx}
                                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono"
                              >
                                <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>[{line.accountCode}] {line.accountName}</span>
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
                        <td className="py-3 px-4 font-mono text-xs">
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                            م: {entryDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </div>
                          <div className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            د: {entryCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </div>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
                          <select
                            value={chosenClient}
                            onChange={(e) =>
                              setSelectedClientByRecord((prev) => ({
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleAssignSingleRecord(
                                'JOURNAL_ENTRY',
                                entry.id,
                                `القيد رقم (${entry.entryNumber})`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
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
        )
      )}

      {activeTab === 'INVOICES' && (
        unassignedInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد فواتير معلقة غير منسوبة</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">الطرف الآخر (العميل/المورد)</th>
                    <th className="py-3 px-4">الإجمالي (ج.م)</th>
                    <th className="py-3 px-4 w-72">المنشأة المختصة</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unassignedInvoices.map((inv) => {
                    const chosenClient =
                      selectedClientByRecord[inv.id] !== undefined
                        ? selectedClientByRecord[inv.id]
                        : batchClientId;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{inv.date}</td>
                        <td className="py-3 px-4">{inv.customerName || inv.receiverName || 'غير محدد'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(Number(inv.totalAmount) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={chosenClient}
                            onChange={(e) =>
                              setSelectedClientByRecord((prev) => ({
                                ...prev,
                                [inv.id]: e.target.value,
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleAssignSingleRecord(
                                'INVOICE',
                                inv.id,
                                `الفاتورة رقم (${inv.invoiceNumber})`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            نسب الفاتورة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'TREASURY' && (
        unassignedTreasury.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد حركات خزنة معلقة غير منسوبة</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">رقم الحركة</th>
                    <th className="py-3 px-4">التاريخ والنوع</th>
                    <th className="py-3 px-4">البيان</th>
                    <th className="py-3 px-4">المبلغ (ج.م)</th>
                    <th className="py-3 px-4 w-72">المنشأة المختصة</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unassignedTreasury.map((tx) => {
                    const chosenClient =
                      selectedClientByRecord[tx.id] !== undefined
                        ? selectedClientByRecord[tx.id]
                        : batchClientId;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {tx.receiptNumber || tx.id}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <div>{tx.date}</div>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                            tx.type === 'INFLOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tx.type === 'INFLOW' ? 'مقبوضات' : 'مدفوعات'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{tx.description || 'بدون بيان'}</td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {(Number(tx.amount) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={chosenClient}
                            onChange={(e) =>
                              setSelectedClientByRecord((prev) => ({
                                ...prev,
                                [tx.id]: e.target.value,
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleAssignSingleRecord(
                                'TREASURY',
                                tx.id,
                                `حركة الخزنة رقم (${tx.receiptNumber || tx.id})`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            نسب الحركة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'ASSETS' && (
        unassignedAssets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد أصول ثابتة معلقة غير منسوبة</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">اسم الأصل وكوده</th>
                    <th className="py-3 px-4">تاريخ الشراء</th>
                    <th className="py-3 px-4">التكلفة التاريخية</th>
                    <th className="py-3 px-4">طريقة ونسبة الإهلاك</th>
                    <th className="py-3 px-4 w-72">المنشأة المختصة</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unassignedAssets.map((ast) => {
                    const chosenClient =
                      selectedClientByRecord[ast.id] !== undefined
                        ? selectedClientByRecord[ast.id]
                        : batchClientId;
                    return (
                      <tr key={ast.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div>{ast.name}</div>
                          <span className="text-xs text-slate-400 font-mono">{ast.assetCode || ast.id}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{ast.purchaseDate}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(Number(ast.historicalCost) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {ast.depreciationMethod} ({ast.depreciationRate}%)
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={chosenClient}
                            onChange={(e) =>
                              setSelectedClientByRecord((prev) => ({
                                ...prev,
                                [ast.id]: e.target.value,
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleAssignSingleRecord(
                                'FIXED_ASSET',
                                ast.id,
                                `الأصل الثابت (${ast.name})`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            نسب الأصل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'TAXES' && (
        unassignedDeclarations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد إقرارات ضريبية معلقة غير منسوبة</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">نوع الإقرار</th>
                    <th className="py-3 px-4">الفترة والضريبة المستحقة</th>
                    <th className="py-3 px-4">تاريخ الاستحقاق</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 w-72">المنشأة المختصة</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unassignedDeclarations.map((decl) => {
                    const chosenClient =
                      selectedClientByRecord[decl.id] !== undefined
                        ? selectedClientByRecord[decl.id]
                        : batchClientId;
                    return (
                      <tr key={decl.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {decl.declarationType}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>سنة {decl.taxYear}</div>
                          <div className="font-mono font-bold text-emerald-600">
                            {(Number(decl.totalTaxDue) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{decl.dueDate}</td>
                        <td className="py-3 px-4 text-xs font-bold">{decl.status}</td>
                        <td className="py-3 px-4">
                          <select
                            value={chosenClient}
                            onChange={(e) =>
                              setSelectedClientByRecord((prev) => ({
                                ...prev,
                                [decl.id]: e.target.value,
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleAssignSingleRecord(
                                'TAX_DECLARATION',
                                decl.id,
                                `الإقرار الضريبي (${decl.declarationType})`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
                          >
                            نسب الإقرار
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};
