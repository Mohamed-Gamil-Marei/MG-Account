import React from 'react';
import { Save, CheckCircle2, WifiOff, RefreshCw, Trash2 } from 'lucide-react';

interface AutoSaveStatusBadgeProps {
  lastSavedTime?: string | null;
  isSaving?: boolean;
  isOffline?: boolean;
  onManualSave?: () => void;
  onClearDraft?: () => void;
  documentLabel?: string;
  className?: string;
}

export const AutoSaveStatusBadge: React.FC<AutoSaveStatusBadgeProps> = ({
  lastSavedTime,
  isSaving = false,
  isOffline = false,
  onManualSave,
  onClearDraft,
  documentLabel = 'المسودة',
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs select-none ${className}`}>
      {/* Offline Alert Indicator */}
      {isOffline && (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] animate-pulse"
          title="انقطاع الاتصال بالإنترنت - يتم حفظ كافة البيانات محلياً في ذاكرة المتصفح (LocalStorage) بأمان تام"
        >
          <WifiOff className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>غير متصل • الحفظ المحلي نشط</span>
        </span>
      )}

      {/* Auto-Save State Pill */}
      {isSaving ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
          <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
          <span>جاري الحفظ التلقائي في المتصفح...</span>
        </span>
      ) : lastSavedTime ? (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] shadow-2xs"
          title={`تم حفظ ${documentLabel} تلقائياً في ذاكرة المتصفح (LocalStorage) عند ${lastSavedTime} لتجنب فقدان العمل في حال انقطاع الاتصال أو تحديث الصفحة`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>تم الحفظ التلقائي في المتصفح: {lastSavedTime}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-[10px]">
          <Save className="w-3 h-3" />
          <span>الحفظ التلقائي نشط</span>
        </span>
      )}

      {/* Optional Manual Save Trigger */}
      {onManualSave && (
        <button
          type="button"
          onClick={onManualSave}
          className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          title="حفظ فوري للمسودة في المتصفح الآن"
        >
          حفظ مسودة الآن
        </button>
      )}

      {/* Clear Draft Option */}
      {lastSavedTime && onClearDraft && (
        <button
          type="button"
          onClick={onClearDraft}
          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-0.5"
          title="مسح المسودة المحفوظة والبدء بنموذج فارغ"
        >
          <Trash2 className="w-2.5 h-2.5" />
          <span>مسح</span>
        </button>
      )}
    </div>
  );
};
