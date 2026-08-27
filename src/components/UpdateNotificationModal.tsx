import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Laptop,
  ArrowRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppVersionInfo, CURRENT_APP_VERSION, UpdateCheckerService } from '../services/updateChecker';

interface UpdateNotificationModalProps {
  versionInfo: AppVersionInfo;
  onClose: () => void;
  onOpenDesktopModal: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  versionInfo,
  onClose,
  onOpenDesktopModal,
}) => {
  const [showFullChangelog, setShowFullChangelog] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateStep, setUpdateStep] = useState<number>(0);

  const handleDismiss = () => {
    if (dontShowAgain) {
      UpdateCheckerService.dismissVersion(versionInfo.version);
    }
    onClose();
  };

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    setUpdateStep(1);

    // Simulate fast update refresh & cache sync
    setTimeout(() => {
      setUpdateStep(2);
      setTimeout(() => {
        setUpdateStep(3);
        setTimeout(() => {
          setIsUpdating(false);
          // Reload to apply latest assets or open desktop modal
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (let registration of registrations) {
                registration.update();
              }
            });
          }
          window.location.reload();
        }, 800);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300"></div>
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                <Sparkles className="w-7 h-7 animate-pulse text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    تحديث متاح
                  </span>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    v{versionInfo.version}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-1 text-white">
                  يوجد إصدار جديد متاح لمنظومة المحاسب!
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-emerald-800/60 flex flex-wrap items-center justify-between text-xs text-emerald-100/90 gap-2">
            <span>الإصدار الحالي المثبت: <strong className="font-mono text-white">v{CURRENT_APP_VERSION}</strong></span>
            <span>تاريخ الإصدار: <strong className="text-white">{versionInfo.releaseDate}</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          {/* Main Title & Description */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{versionInfo.changelog.title}</span>
            </h4>
            <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
              يتضمن هذا التحديث تحسينات جوهرية في الأداء وسرعة الاستجابة، وتوافقية أعلى مع الشاشات وسطح المكتب.
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>أبرز ما يقدمه الإصدار الجديد ({versionInfo.version}):</span>
            </h5>
            <div className="grid grid-cols-1 gap-2">
              {versionInfo.changelog.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle Full Changelog */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFullChangelog(!showFullChangelog)}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <span>سجل التحسينات والتعديلات التفصيلي</span>
              {showFullChangelog ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showFullChangelog && (
              <div className="p-4 space-y-4 bg-white border-t border-slate-200 text-xs">
                <div>
                  <h6 className="font-bold text-blue-900 mb-1.5">التحسينات والميزات الإضافية:</h6>
                  <ul className="space-y-1.5 text-slate-600 pr-2">
                    {versionInfo.changelog.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h6 className="font-bold text-amber-900 mb-1.5">الإصلاحات والمعالجات:</h6>
                  <ul className="space-y-1.5 text-slate-600 pr-2">
                    {versionInfo.changelog.fixes.map((fix, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Updating Progress Overlay if triggered */}
          {isUpdating && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <h5 className="font-bold text-blue-950 text-xs">جاري تطبيق التحديث وتحميل الملفات الجديدة...</h5>
                  <p className="text-[11px] text-blue-700">
                    {updateStep === 1 && 'جاري فحص وتحديث حزم التخزين المؤقت (Cache)...'}
                    {updateStep === 2 && 'جاري مزامنة قواعد البيانات وترقية البنية المحاسبية...'}
                    {updateStep === 3 && 'اكتمل التحديث بنجاح! جاري إعادة التحميل...'}
                  </p>
                </div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${(updateStep / 3) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Don't show again checkbox */}
          <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
            <input
              type="checkbox"
              id="cb-dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="cb-dont-show-again" className="cursor-pointer select-none">
              عدم إظهار هذا التنبيه مرة أخرى لهذا الإصدار (v{versionInfo.version})
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenDesktopModal();
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Laptop className="w-4 h-4 text-slate-700" />
            <span>تحميل حزمة سطح المكتب الجديدة (.ZIP / .BAT)</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              تذكيري لاحقاً
            </button>

            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              id="btn-confirm-apply-update"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>تحديث المنظومة الآن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
