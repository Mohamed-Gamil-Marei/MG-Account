import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Smartphone, Laptop } from 'lucide-react';
import { CloudSync, CloudSyncInfo } from '../services/cloudSyncService';
import { db } from '../db/localDatabase';

interface CloudSyncHeaderWidgetProps {
  isDark?: boolean;
}

export const CloudSyncHeaderWidget: React.FC<CloudSyncHeaderWidgetProps> = ({ isDark = false }) => {
  const [syncInfo, setSyncInfo] = useState<CloudSyncInfo>(CloudSync.getSyncInfo());
  const [isOpen, setIsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = CloudSync.subscribe((info) => {
      setSyncInfo(info);
    });
    return unsub;
  }, []);

  const handleManualPush = async () => {
    setActionMessage('جاري رفع التعديلات للسحابة...');
    const ok = await db.syncToCloudNow();
    if (ok) {
      setActionMessage('تمت المزامنة بنجاح! التعديلات متاحة الآن على الهاتف وباقي الأجهزة');
      setTimeout(() => setActionMessage(null), 3500);
    } else {
      setActionMessage('تعذر رفع البيانات. يرجى التحقق من اتصال الإنترنت');
    }
  };

  const handleManualPull = async () => {
    setActionMessage('جاري جلب أحدث البيانات من السحابة...');
    const ok = await db.pullFromCloudNow();
    if (ok) {
      setActionMessage('تم تحديث البيانات المحلية بأحدث نسخة سحابية!');
      setTimeout(() => setActionMessage(null), 3500);
    } else {
      setActionMessage('لم يتم العثور على تحديثات جديدة في السحابة');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const renderBadge = () => {
    switch (syncInfo.status) {
      case 'SYNCING':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span className="hidden xl:inline text-[11px]">مزامنة سحابية...</span>
          </div>
        );
      case 'SYNCED':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden xl:inline text-[11px]">سحابي مباشر</span>
          </div>
        );
      case 'OFFLINE':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <CloudOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xl:inline text-[11px]">دون إنترنت</span>
          </div>
        );
      case 'ERROR':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden xl:inline text-[11px]">خطأ اتصال</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden xl:inline text-[11px]">سحابي جاهز</span>
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
        title="حالة الربط السحابي والتشغيل من الموبايل"
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
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">الربط السحابي والتشغيل الموحد</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">مزامنة فورية بين الهاتف والكمبيوتر</p>
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
                <span className="text-slate-500 dark:text-slate-400">حالة الاتصال السحابي:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  قاعدة البيانات متصلة (Firestore Real-time)
                </span>
              </div>
              {syncInfo.lastSyncedAt && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">آخر مزامنة ناجحة:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 dir-ltr text-[10px]">
                    {new Date(syncInfo.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
              {syncInfo.lastSyncedBy && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">بواسطة:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{syncInfo.lastSyncedBy}</span>
                </div>
              )}
            </div>

            {/* Cross-Platform Instructions */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 mb-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 text-[11px]">
                <Smartphone className="w-3.5 h-3.5" />
                <span>كيفية الفتح من الموبايل أو أي جهاز آخر:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                افتح رابط المنظومة على هاتفك وسجل الدخول بالرمز المعتمد، وستظهر كل القيود والبيانات متطابقة لحظياً مع الكمبيوتر.
              </p>
            </div>

            {actionMessage && (
              <div className="p-2 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
                {actionMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="btn-manual-cloud-push"
                onClick={handleManualPush}
                disabled={syncInfo.status === 'SYNCING'}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.status === 'SYNCING' ? 'animate-spin' : ''}`} />
                <span>رفع وتحديث السحابة</span>
              </button>

              <button
                type="button"
                id="btn-manual-cloud-pull"
                onClick={handleManualPull}
                disabled={syncInfo.status === 'SYNCING'}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                <span>سحب أحدث نسخة</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
