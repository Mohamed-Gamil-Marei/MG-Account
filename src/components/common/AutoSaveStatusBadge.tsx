import React from 'react';
import { CheckCircle2, CloudOff, Loader2, Save, Trash2 } from 'lucide-react';

export interface AutoSaveStatusBadgeProps {
  lastSavedTime?: string | null;
  isSaving?: boolean;
  isOffline?: boolean;
  onManualSave?: () => void;
  onClearDraft?: () => void;
  documentLabel?: string;
}

export const AutoSaveStatusBadge: React.FC<AutoSaveStatusBadgeProps> = ({
  lastSavedTime,
  isSaving = false,
  isOffline = false,
  onManualSave,
  onClearDraft,
  documentLabel = 'المسودة',
}) => {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
      {isSaving ? (
        <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جارٍ حفظ {documentLabel}...</span>
        </span>
      ) : isOffline ? (
        <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
          <CloudOff className="w-3.5 h-3.5" />
          <span>محفوظ محلياً ({lastSavedTime || 'الآن'})</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{lastSavedTime ? `حُفظ تلقائياً ${lastSavedTime}` : 'الحفظ التلقائي مفعّل'}</span>
        </span>
      )}

      {onManualSave && (
        <button
          type="button"
          onClick={onManualSave}
          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
          title="حفظ المسودة الآن"
        >
          <Save className="w-3 h-3" />
          <span>حفظ</span>
        </button>
      )}

      {onClearDraft && lastSavedTime && (
        <button
          type="button"
          onClick={onClearDraft}
          className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
          title="مسح المسودة"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
