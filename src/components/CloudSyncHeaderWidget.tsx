import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { FirebaseSparkSync, SyncStatusInfo } from '../services/firebaseSparkSync';
import { db } from '../db/localDatabase';

interface CloudSyncHeaderWidgetProps {
  isDark?: boolean;
}

export const CloudSyncHeaderWidget: React.FC<CloudSyncHeaderWidgetProps> = ({ isDark = false }) => {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>({
    status: 'ONLINE',
    unsentChangesCount: 0
  });
  const [isOpen, setIsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = FirebaseSparkSync.subscribe((info) => {
      setSyncInfo(info);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setActionMessage('جاري المزامنة مع Firebase Spark...');
    await FirebaseSparkSync.flushUnsentQueue();
    setActionMessage('تمت مزامنة التعديلات بنجاح!');
    setTimeout(() => setActionMessage(null), 3000);
  };

  const renderBadge = () => {
    switch (syncInfo.status) {
      case 'SYNCING':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span className="text-[11px]">جاري المزامنة...</span>
          </div>
        );
      case 'OFFLINE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <CloudOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px]">غير متصل {syncInfo.unsentChangesCount > 0 ? `(${syncInfo.unsentChangesCount})` : ''}</span>
          </div>
        );
      case 'ERROR':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px]">خطأ اتصال</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px]">متصل {syncInfo.unsentChangesCount > 0 ? `(معلق: ${syncInfo.unsentChangesCount})` : ''}</span>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        id="btn-cloud-sync-status"
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer transition-transform active:scale-95 flex items-center"
        title="حالة المزامنة السحابية (متصل / غير متصل / تعديلات معلقة)"
      >
        {renderBadge()}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-40 p-4 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">المزامنة اللحظية (Firebase Spark)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">حالة الربط والتعديلات المعلقة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Status Card */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2 mb-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">حالة الاتصال:</span>
                <span className={`font-bold font-mono ${syncInfo.status === 'ONLINE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {syncInfo.status === 'ONLINE' ? 'متصل بالسحابة' : syncInfo.status === 'OFFLINE' ? 'غير متصل (أوفلاين)' : 'جاري المزامنة...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">التعديلات غير المُرسلة:</span>
                <span className={`font-bold font-mono ${syncInfo.unsentChangesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {syncInfo.unsentChangesCount} تعديل
                </span>
              </div>
              {syncInfo.lastSyncedAt && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">آخر مزامنة:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 dir-ltr text-[10px]">
                    {new Date(syncInfo.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {actionMessage && (
              <div className="p-2 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
                {actionMessage}
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              id="btn-manual-sync"
              onClick={handleManualSync}
              disabled={syncInfo.status === 'SYNCING'}
              className="w-full px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.status === 'SYNCING' ? 'animate-spin' : ''}`} />
              <span>مزامنة فورية الآن</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
