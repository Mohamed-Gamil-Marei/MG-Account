import React from 'react';
import { RotateCcw, Trash2, ArrowLeft, Clock, FileText } from 'lucide-react';

interface DraftRecoveryBannerProps {
  documentType: string;
  savedAt: string;
  descriptionSummary?: string;
  linesCount?: number;
  onResume: () => void;
  onDiscard: () => void;
  onDismiss?: () => void;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({
  documentType,
  savedAt,
  descriptionSummary,
  linesCount,
  onResume,
  onDiscard,
  onDismiss,
}) => {
  return (
    <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-3 sm:p-4 shadow-sm text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Info Column */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/40">
            <RotateCcw className="w-4 h-4 animate-spin-once" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                توجد مسودة غير مكتملة ({documentType})
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                <span>محفوظة: {savedAt}</span>
              </span>
              {typeof linesCount === 'number' && linesCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <FileText className="w-3 h-3 text-amber-600" />
                  <span>{linesCount} بنود / أسطر</span>
                </span>
              )}
            </div>
            {descriptionSummary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate max-w-xl font-medium">
                بيان المسودة: <span className="font-semibold text-slate-800 dark:text-slate-100">{descriptionSummary}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={onResume}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>استئناف التحرير والإدخال</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:border-rose-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="حذف هذه المسودة نهائياً والبدء بنموذج فارغ"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح المسودة</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="إغلاق هذا الإشعار"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
