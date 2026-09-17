import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PowerOff,
  Phone,
  Building,
  ShieldCheck,
  X,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppApiService, WhatsAppApiSessionStatus } from '../../services/whatsappApiService';
import { DatabaseState } from '../../db/localDatabase';

interface WhatsAppQrLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

export const WhatsAppQrLinkingModal: React.FC<WhatsAppQrLinkingModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [sessionStatus, setSessionStatus] = useState<WhatsAppApiSessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const st = await WhatsAppApiService.getSessionStatus();
      if (st) {
        setSessionStatus(st);
      }
    } catch (err: any) {
      console.warn('Failed to fetch session status:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();

    // Poll status while modal is open
    const interval = setInterval(fetchStatus, 3500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSession = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await WhatsAppApiService.startSession();
      if (res) {
        setSessionStatus(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تشغيل خادم جلسة الواتساب');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectSession = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في فصل جلسة الواتساب الحالية؟')) return;
    setIsLoading(true);
    try {
      const res = await WhatsAppApiService.disconnectSession();
      if (res) {
        setSessionStatus(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل فصل الجلسة');
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = sessionStatus?.status === 'CONNECTED';
  const isScanQr = sessionStatus?.status === 'SCAN_QR_CODE' && sessionStatus?.qrCodeDataUrl;
  const officeFirm = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
  const auditorName = state.officeProfile.auditorName || 'محمد جميل مرعي';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ربط وتفعيل واتساب المكتب بالباركود الداخلي</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {isConnected ? 'متصل ومفعل ✅' : 'قيد الربط ⏳'}
                </span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                إرسال الرسائل والمستندات مباشرة من داخل البرنامج دون الحاجة لمتصفح خارجي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-slate-700 dark:text-slate-300">
          {/* Numbers Info Callout */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                💬
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">رقم واتساب المكتب المعتمد:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">0552777332</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                📞
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">هاتف الاتصال المباشر والمكالمات:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">01003335360</span>
              </div>
            </div>
          </div>

          {/* Connected State */}
          {isConnected && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  واتساب المكتب متصل بنجاح وجاهز للإرسال المباشر!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  الرقم المرتبط: <strong className="font-mono">{sessionStatus?.connectedPhone || '0552777332'}</strong> • اسم الحساب: <strong>{sessionStatus?.connectedName || officeFirm}</strong>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-2">
                  ⚡ أي مطالبة أو سند قبض أو إقرار أو مستند يتم إرساله الآن من داخل البرنامج مباشرة بضغطة زر واحدة.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDisconnectSession}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>فصل جلسة الواتساب</span>
                </button>
              </div>
            </div>
          )}

          {/* QR Code Scanning State */}
          {!isConnected && isScanQr && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>باركود QR نشط: وجّه كاميرا واتساب هاتفك الآن 📱</span>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block mx-auto">
                <img
                  src={sessionStatus.qrCodeDataUrl!}
                  alt="باركود ربط واتساب المكتب"
                  className="w-56 h-56 mx-auto rounded-xl"
                />
                <div className="mt-2 text-[10px] text-slate-500 font-mono">
                  رقم الواتساب المعتمد: 0552777332
                </div>
              </div>

              {/* Steps */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 text-right border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 max-w-md mx-auto">
                <span className="font-bold text-slate-800 dark:text-slate-200 block border-b pb-1 text-[11px]">
                  خطوات الربط السريع (مرة واحدة فقط):
                </span>
                <ol className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] list-decimal list-inside leading-relaxed">
                  <li>افتح تطبيق <strong>WhatsApp</strong> على هاتف المكتب <strong>(0552777332)</strong>.</li>
                  <li>اضغط على <strong>(الثلاث نقاط ⠇)</strong> بأعلى الشاشة أو <strong>الإعدادات</strong>.</li>
                  <li>اختر <strong>الأجهزة المرتبطة (Linked Devices)</strong> ثم <strong>ربط جهاز</strong>.</li>
                  <li>وجّه الكاميرا نحو باركود QR الظاهر بالأعلى ليتم الربط فوراً وتلقائياً.</li>
                </ol>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>تحديث كود QR</span>
                </button>
              </div>
            </div>
          )}

          {/* Not Connected / Needs Start */}
          {!isConnected && !isScanQr && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  تشغيل جلسة واتساب وتوليد باركود الربط
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  اضغط على الزر أدناه لتشغيل محرك الباركود الداخلي لمكتب المحاسب القانوني ({auditorName}) وربط رقم الواتساب <strong>0552777332</strong>.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartSession}
                disabled={isLoading}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'جاري الاتصال وتوليد الباركود...' : 'بدء جلسة وتوليد باركود الواتساب 📱'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isConnected ? '🟢 المنظومة متصلة وجاهزة للإرسال' : '⚪ غير متصل حالياً'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
