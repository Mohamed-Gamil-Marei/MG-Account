import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  ArrowLeftRight,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { AuditedJournalRow } from '../../services/journalNotesAuditService';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface JournalEntryCardsViewProps {
  rows: AuditedJournalRow[];
  onApplySuggestedReclassification: (rowId: string) => void;
  onResetRowResolution: (rowId: string) => void;
  onSelectRowForCorrection: (row: AuditedJournalRow) => void;
}

export const JournalEntryCardsView: React.FC<JournalEntryCardsViewProps> = ({
  rows,
  onApplySuggestedReclassification,
  onResetRowResolution,
  onSelectRowForCorrection,
}) => {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
          لا توجد قيود تطابق معايير التصفية الحالية
        </p>
        <p className="text-xs text-slate-500">
          يمكنك تغيير خيارات البحث أو التصفية بالأعلى لعرض باقي السطور
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {rows.map((row) => {
        const hasIssue = row.audit.hasIssue;
        const isResolved = row.isResolved || !!row.userOverriddenAccount;
        const currentAccount = row.userOverriddenAccount || row.accountName;
        const amount = Math.max(row.debit || 0, row.credit || 0);

        return (
          <div
            key={row.id}
            className={`rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden flex flex-col justify-between ${
              isResolved
                ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : hasIssue
                ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 hover:shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Card Header */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs">
                  قيد #{row.entryNo}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {row.date}
                </span>
                {row.originalRowIndex && (
                  <span className="text-[10.5px] text-slate-500 bg-slate-200/70 dark:bg-slate-700/60 px-2 py-0.5 rounded font-mono">
                    صف الإكسيل #{row.originalRowIndex}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                  {formatEgyptianCurrency(amount)}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    (row.debit || 0) > 0
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {(row.debit || 0) > 0 ? 'طرف مدين' : 'طرف دائن'}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3.5 flex-1">
              {/* Narration from File */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center justify-between">
                  <span>البيان:</span>
                  {row.audit.matchedKeywords && row.audit.matchedKeywords.length > 0 && (
                    <div className="flex items-center gap-1">
                      {row.audit.matchedKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold"
                        >
                          دلالة: {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {row.narration || 'لا يوجد بيان مدون'}
                </p>
              </div>

              {hasIssue ? (
                <div className="space-y-3">
                  {/* Before / After Direction Diff */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Before (Original) */}
                    <div
                      className={`p-3 rounded-xl border ${
                        isResolved
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                          : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1">
                        ❌ الحساب المسجل:
                      </span>
                      <span className="text-xs font-black text-rose-900 dark:text-rose-200 line-through block">
                        {row.accountName}
                      </span>
                      {row.accountCode && (
                        <span className="block text-[10px] text-rose-600/80 font-mono mt-0.5">
                          كود الحساب: {row.accountCode}
                        </span>
                      )}
                    </div>

                    {/* After (Suggested / Resolved) */}
                    <div
                      className={`p-3 rounded-xl border ${
                        isResolved
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                          : 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                        {isResolved ? '✅ الحساب المعتمد:' : '💡 التوجيه المقترح:'}
                      </span>
                      <span className="text-xs font-black text-indigo-900 dark:text-indigo-100 block">
                        {currentAccount}
                      </span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        المرجع: {row.audit.accountingStandardRef}
                      </span>
                    </div>
                  </div>

                  {/* Accounting Issue Note */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>الملاحظة المحاسبية (موجب المعايير):</span>
                    </div>
                    <p className="text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
                      {row.audit.issueDescription}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span>توجيه سليم ومطابق للمعيار المحاسبي</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            {hasIssue && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!isResolved ? (
                    <button
                      type="button"
                      onClick={() => onApplySuggestedReclassification(row.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد التوجيه</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        تم الاعتماد
                      </span>
                      <button
                        type="button"
                        onClick={() => onResetRowResolution(row.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        تراجع
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRowForCorrection(row)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span>قيد التسوية</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
