import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, Loader2, Save, Trash2 } from 'lucide-react';
import { db } from '../../db/localDatabase';

export interface AutoSaveStatusBadgeProps {
  lastSavedTime?: string | null;
  isSaving?: boolean;
  isOffline?: boolean;
  hasStorageError?: boolean;
  storageErrorMessage?: string | null;
  onManualSave?: () => void;
  onClearDraft?: () => void;
  documentLabel?: string;
}

export const AutoSaveStatusBadge: React.FC<AutoSaveStatusBadgeProps> = ({
  lastSavedTime,
  isSaving = false,
  isOffline = false,
  hasStorageError,
  storageErrorMessage,
  onManualSave,
  onClearDraft,
  documentLabel = 'المسودة',
}) => {
  const [liveStorageError, setLiveStorageError] = useState<string | null>(() =>
    db.hasStorageWriteFailure() ? db.getLastStorageWriteError() || 'فشل الحفظ' : null
  );
  const [liveLastSuccessTime, setLiveLastSuccessTime] = useState<string | null>(() =>
    db.getLastStorageSaveSuccessAt()
  );

  useEffect(() => {
    const handleWriteError = (ev: Event) => {
      const customEv = ev as CustomEvent<{ message?: string }>;
      setLiveStorageError(customEv.detail?.message || 'فشل حفظ البيانات في التخزين المحلي');
      setLiveLastSuccessTime(null);
    };
    const handleWriteSuccess = (ev: Event) => {
      const customEv = ev as CustomEvent<{ timestamp?: string }>;
      setLiveStorageError(null);
      setLiveLastSuccessTime(customEv.detail?.timestamp || new Date().toLocaleTimeString('ar-EG'));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mg:storage-write-error', handleWriteError);
      window.addEventListener('mg:storage-write-success', handleWriteSuccess);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mg:storage-write-error', handleWriteError);
        window.removeEventListener('mg:storage-write-success', handleWriteSuccess);
      }
    };
  }, []);

  const isFailed = Boolean(hasStorageError || liveStorageError || db.hasStorageWriteFailure());
  const errorTooltip = storageErrorMessage || liveStorageError || db.getLastStorageWriteError() || 'فشل الحفظ في التخزين المحلي';
  const effectiveSavedTime = isFailed ? null : (lastSavedTime ?? liveLastSuccessTime);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] ${
        isFailed
          ? 'bg-rose-950/90 border-rose-500 text-rose-100'
          : 'bg-slate-800/80 border-slate-700 text-slate-300'
      }`}
      data-testid="autosave-status-badge"
    >
      {isFailed ? (
        <span className="inline-flex items-center gap-1 text-rose-300 font-bold" title={errorTooltip}>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>فشل الحفظ</span>
        </span>
      ) : isSaving ? (
        <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جارٍ حفظ {documentLabel}...</span>
        </span>
      ) : isOffline ? (
        <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
          <CloudOff className="w-3.5 h-3.5" />
          <span>محفوظ محلياً ({effectiveSavedTime || 'الآن'})</span>
        </span>
      ) : effectiveSavedTime ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>تم الحفظ ({effectiveSavedTime})</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
          <span>بانتظار الحفظ الفعلي</span>
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

      {onClearDraft && effectiveSavedTime && !isFailed && (
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

