import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  History,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Clock,
  ArrowLeftRight,
  Hash,
  Coins,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { JournalHistorySnapshot, formatFinancialValue } from '../../utils/journalUndoEngine';

interface JournalUndoToolbarProps {
  undoHistory: JournalHistorySnapshot[];
  redoHistory: JournalHistorySnapshot[];
  onUndo: () => void;
  onRedo: () => void;
  onRestoreSnapshot?: (snapshot: JournalHistorySnapshot, index: number) => void;
  lastActionMessage?: string | null;
  lastUndoMessage?: string | null;
  hasNegativeValues?: boolean;
  hasDecimals?: boolean;
  isBalanced?: boolean;
  onSwapSides?: () => void;
  onApplyStorno?: () => void;
  onAutoBalance?: () => void;
  totalDebit?: number;
  totalCredit?: number;
  difference?: number;
  className?: string;
  compact?: boolean;
}

export const JournalUndoToolbar: React.FC<JournalUndoToolbarProps> = ({
  undoHistory,
  redoHistory,
  onUndo,
  onRedo,
  onRestoreSnapshot,
  lastActionMessage,
  lastUndoMessage,
  hasNegativeValues = false,
  hasDecimals = false,
  isBalanced,
  onSwapSides,
  onApplyStorno,
  onAutoBalance,
  totalDebit = 0,
  totalCredit = 0,
  difference = 0,
  className = '',
  compact = false,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showStornoHelp, setShowStornoHelp] = useState<boolean>(false);

  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;
  const nextUndoAction = canUndo ? undoHistory[undoHistory.length - 1] : null;
  const nextRedoAction = canRedo ? redoHistory[redoHistory.length - 1] : null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl ${className}`}>
      {/* Undo and Redo Controls */}
      <div className="flex items-center gap-1.5">
        {/* Undo Button */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={canUndo ? `تراجع عن: ${nextUndoAction?.actionLabel} (Ctrl+Z)` : 'لا توجد عمليات سابقة للتراجع عنها (Ctrl+Z)'}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            canUndo
              ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs hover:border-slate-400 active:scale-95'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5 text-blue-600" />
          <span>تراجع</span>
          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
            Ctrl+Z
          </span>
          {canUndo && (
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-mono font-bold">
              {undoHistory.length}
            </span>
          )}
        </button>

        {/* Redo Button */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={canRedo ? `إعادة: ${nextRedoAction?.actionLabel} (Ctrl+Y)` : 'لا توجد عمليات للإعادة (Ctrl+Y)'}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            canRedo
              ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs hover:border-slate-400 active:scale-95'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>إعادة</span>
          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
            Ctrl+Y
          </span>
          {canRedo && (
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-mono font-bold">
              {redoHistory.length}
            </span>
          )}
        </button>

        {/* History Log Dropdown Button */}
        <button
          type="button"
          onClick={() => setShowHistoryModal(!showHistoryModal)}
          disabled={undoHistory.length === 0}
          title="عرض سجل تعديلات الأرقام والرجوع لأي خطوة سابقة"
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            showHistoryModal
              ? 'bg-blue-600 text-white shadow-xs'
              : undoHistory.length > 0
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">سجل التعديلات</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showHistoryModal ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Center Feedback / Next undo notification */}
      <div className="flex-1 min-w-[200px] flex items-center gap-2 text-xs">
        {(lastActionMessage || lastUndoMessage) ? (
          <div className="text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 animate-in fade-in duration-150 text-[11px] font-medium">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate max-w-xs">{lastActionMessage || lastUndoMessage}</span>
          </div>
        ) : canUndo && nextUndoAction ? (
          <div className="text-slate-600 text-[11px] hidden md:flex items-center gap-1 truncate">
            <span className="text-slate-400">التراجع المتاح:</span>
            <span className="font-semibold text-slate-700 truncate max-w-sm">{nextUndoAction.actionLabel}</span>
          </div>
        ) : (
          <div className="text-slate-400 text-[11px] hidden lg:block">
            جاهز لإدخال الأرقام العشرية والسالبة مع ميزة التراجع الفوري (Ctrl+Z)
          </div>
        )}
      </div>

      {/* Right side indicators (Storno, Decimals, Quick Help) */}
      <div className="flex items-center gap-1.5">
        {hasNegativeValues && (
          <button
            type="button"
            onClick={() => setShowStornoHelp(!showStornoHelp)}
            className="text-[11px] bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="تم رصد قيم سالبة (قيد عكسي Storno) - انقر لمعرفة التفاصيل"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>تسوية سالبة (Storno)</span>
          </button>
        )}

        {hasDecimals && (
          <span className="text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
            <Hash className="w-3 h-3 text-indigo-600" />
            <span>كسور عشرية دقيقة</span>
          </span>
        )}
      </div>

      {/* Storno / Negative Values Explanatory Popover */}
      {showStornoHelp && (
        <div className="w-full mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 animate-in fade-in duration-150">
          <div className="flex items-center justify-between font-bold mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>معالجة القيم السالبة وقيود التسوية العكسية (Red Storno):</span>
            </div>
            <button
              type="button"
              onClick={() => setShowStornoHelp(false)}
              className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-rose-800 leading-relaxed">
            وفقاً للمعايير المحاسبية، يتم استخدام الأرقام السالبة لتصحيح الأخطاء الدفترية دون تضخيم غير حقيقي لمجاميع حركة الحسابات. إذا كان إدخال القيمة السالبة خطأً غير مقصود، يمكنك الضغط على <kbd className="px-1.5 py-0.5 bg-white border border-rose-300 rounded font-mono font-bold">Ctrl+Z</kbd> أو زر التراجع أعلاه لإلغائه فوراً.
          </p>
        </div>
      )}

      {/* Detailed Undo History Modal / Dropdown */}
      {showHistoryModal && (
        <div className="w-full mt-2 p-3 bg-white border border-slate-300 rounded-xl shadow-lg animate-in slide-in-from-top-1 duration-150 z-20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800 text-xs">سجل تعديلات أرقام القيد (التراجع الزمني)</span>
              <span className="text-[11px] text-slate-500 font-mono">({undoHistory.length} تعديل متاح)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {undoHistory
              .slice()
              .reverse()
              .map((snapshot, revIdx) => {
                const actualIndex = undoHistory.length - 1 - revIdx;
                const timeStr = snapshot.timestamp
                  ? new Date(snapshot.timestamp).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={snapshot.id}
                    className="p-2 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-mono font-bold shrink-0">
                        {undoHistory.length - revIdx}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-[11px] truncate">{snapshot.actionLabel}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{timeStr}</span>
                          <span>•</span>
                          <span>مدين: {formatFinancialValue(snapshot.totalDebit, snapshot.currency)}</span>
                          <span>•</span>
                          <span>دائن: {formatFinancialValue(snapshot.totalCredit, snapshot.currency)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onRestoreSnapshot) {
                          onRestoreSnapshot(snapshot, actualIndex);
                          setShowHistoryModal(false);
                        }
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 hover:border-blue-600 rounded-md text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-2xs"
                    >
                      استعادة هذه الخطوة
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>اختصارات لوحة المفاتيح: <strong>Ctrl+Z</strong> للتراجع، <strong>Ctrl+Y</strong> للإعادة</span>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="text-blue-700 hover:underline font-bold cursor-pointer disabled:opacity-50"
            >
              التراجع عن آخر تعديل الآن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
