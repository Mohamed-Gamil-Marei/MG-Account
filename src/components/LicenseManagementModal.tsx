import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Users,
  Calendar,
  Sparkles,
  Wifi,
  WifiOff,
  Globe2,
  MessageSquare,
  FileCheck2,
  Building2,
  Clock,
  Layers,
  Lock,
} from 'lucide-react';
import { db } from '../db/localDatabase';

export interface LicenseStatusData {
  success?: boolean;
  status: 'VALID' | 'EXPIRING' | 'GRACE' | 'EXPIRED' | 'MISSING_OR_INVALID';
  enforcement?: 'on' | 'off' | string;
  message?: string;
  daysRemaining?: number;
  maxUsers?: number;
  currentUsers?: number;
  mode?: 'ONLINE' | 'OFFLINE';
  features?: {
    cloudSync?: boolean;
    ai?: boolean;
    whatsapp?: boolean;
    eta?: boolean;
  };
  payload?: {
    licenseId?: string;
    officeName?: string;
    plan?: string;
    issuedAt?: string;
    expiresAt?: string;
    maxUsers?: number;
    mode?: 'ONLINE' | 'OFFLINE';
    features?: {
      cloudSync?: boolean;
      ai?: boolean;
      whatsapp?: boolean;
      eta?: boolean;
    };
  };
  requestId?: string;
}

interface LicenseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export const LicenseManagementModal: React.FC<LicenseManagementModalProps> = ({
  isOpen,
  onClose,
  onActivated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activating, setActivating] = useState<boolean>(false);
  const [licenseData, setLicenseData] = useState<LicenseStatusData | null>(null);
  const [licenseCodeInput, setLicenseCodeInput] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRequestId, setCopiedRequestId] = useState<boolean>(false);

  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser.role === 'ADMIN';

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/license/status');
      const data = await res.json();
      if (data.success) {
        setLicenseData(data);
      } else {
        setLicenseData({
          status: 'MISSING_OR_INVALID',
          message: data.error || 'تعذر جلب حالة الترخيص.',
        });
      }
    } catch (err: any) {
      setLicenseData({
        status: 'MISSING_OR_INVALID',
        message: 'فشل الاتصال بخادم التراخيص.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActionMessage(null);
      setLicenseCodeInput('');
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (licenseData?.enforcement === 'off') return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = licenseCodeInput.trim();
    if (!code) {
      setActionMessage({ type: 'error', text: 'يرجى إدخال أو لصق كود الترخيص أولاً.' });
      return;
    }

    try {
      setActivating(true);
      setActionMessage(null);

      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseCode: code }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setActionMessage({
          type: 'success',
          text: result.message || 'تم تفعيل ترخيص المنظومة بنجاح وتحديث الصلاحيات!',
        });
        setLicenseCodeInput('');
        setLicenseData(result);

        // Notify Header and other listeners without needing a page restart
        window.dispatchEvent(new CustomEvent('license-updated', { detail: result }));
        if (onActivated) {
          onActivated();
        }
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || 'فشل تفعيل الترخيص: الكود غير صالح أو تالف أو تم التلاعب به.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `خطأ أثناء الاتصال بالخادم: ${err.message || 'تعذر إتمام طلب التفعيل'}`,
      });
    } finally {
      setActivating(false);
    }
  };

  // Helper labels and colors
  const effectivePayload = licenseData?.payload;
  const effectiveMode = licenseData?.mode || effectivePayload?.mode || 'OFFLINE';
  const effectiveFeatures = licenseData?.features || effectivePayload?.features || {
    cloudSync: effectiveMode === 'ONLINE',
    ai: effectiveMode === 'ONLINE',
    whatsapp: effectiveMode === 'ONLINE',
    eta: effectiveMode === 'ONLINE',
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'VALID':
        return {
          label: 'ساري ومفعّل (صالح)',
          bgColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          icon: ShieldCheck,
        };
      case 'EXPIRING':
        return {
          label: 'قارب على الانتهاء',
          bgColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          icon: AlertTriangle,
        };
      case 'GRACE':
        return {
          label: 'فترة سماح (7 أيام)',
          bgColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
          icon: Clock,
        };
      case 'EXPIRED':
        return {
          label: 'منتهي الصلاحية',
          bgColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
          icon: ShieldAlert,
        };
      case 'MISSING_OR_INVALID':
      default:
        return {
          label: 'غير مفعّل / بدون ترخيص',
          bgColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
          icon: Lock,
        };
    }
  };

  const statusBadge = getStatusBadge(licenseData?.status);
  const StatusIcon = statusBadge.icon;
  const isReadOnly = licenseData?.status === 'EXPIRED' || licenseData?.status === 'MISSING_OR_INVALID';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      data-testid="license-management-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>إدارة وترخيص المنظومة</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ed25519 Secured
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تأكيد هوية المكتب، وضع التشغيل، المزايا المعتمدة وفترة الصلاحية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          {!isAdmin ? (
            /* Admin Only Gate Warning */
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                الصلاحية مقتصرة على مدير النظام (ADMIN)
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                عذراً، إدارة وتفعيل تراخيص المنظومة مقتصرة حصرياً على حساب مدير النظام العام. يرجى التواصل مع المدير لإدخال كود الترخيص.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          ) : (
            <>
              {/* Prominent Read-Only & Export Banner if MISSING_OR_INVALID or EXPIRED */}
              {isReadOnly && (
                <div
                  className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-3 animate-pulse"
                  data-testid="license-readonly-banner"
                >
                  <ShieldAlert className="w-6 h-6 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                      تنبيه هام: المنظومة حالياً في وضع القراءة والتصدير فقط
                    </h4>
                    <p className="text-xs text-red-700/90 dark:text-red-300/90 leading-relaxed">
                      نظراً لعدم وجود ترخيص مفعّل أو انتهاء صلاحية الترخيص، تم قفل عمليات الحفظ والإضافة والتعديل لحماية البيانات. يمكنك استعراض وطباعة وتصدير كافة التقارير، ويرجى تفعيل كود الترخيص أدناه لفك القفل واستعادة صلاحيات العمل الكاملة.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Header & Key Attributes Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <StatusIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">حالة ترخيص النظام</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bgColor}`}>
                          <span className="w-2 h-2 rounded-full bg-current" />
                          <span>{statusBadge.label}</span>
                        </span>
                        {licenseData?.message && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                            • {licenseData.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                    title="تحديث حالة الترخيص"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>تحديث الحالة</span>
                  </button>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Office Name */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      اسم المكتب المرخص
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate" title={effectivePayload?.officeName || '—'}>
                      {effectivePayload?.officeName || 'المكتب غير مسجل بعد'}
                    </span>
                  </div>

                  {/* Plan */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      باقة الاشتراك
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                      {effectivePayload?.plan || 'TRIAL (تجريبي)'}
                    </span>
                  </div>

                  {/* Operation Mode */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      {effectiveMode === 'ONLINE' ? (
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      وضع التشغيل
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${effectiveMode === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {effectiveMode === 'ONLINE' ? 'أونلاين (Online)' : 'أوفلاين محلي (Offline)'}
                      </span>
                    </div>
                  </div>

                  {/* Expiration Date & Days */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      تاريخ الانتهاء
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono block">
                      {effectivePayload?.expiresAt
                        ? new Date(effectivePayload.expiresAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'غير محدد'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {licenseData?.daysRemaining !== undefined
                        ? licenseData.daysRemaining >= 0
                          ? `متبقي: ${licenseData.daysRemaining} يوم`
                          : `انتهى منذ: ${Math.abs(licenseData.daysRemaining)} يوم`
                        : '—'}
                    </span>
                  </div>

                  {/* Max Users & Current */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-teal-500" />
                      عدد المستخدمين المسموح
                    </span>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 dark:text-white font-mono">
                        {effectivePayload?.maxUsers || licenseData?.maxUsers || '10'} مستخدمين
                      </span>
                      {licenseData?.currentUsers !== undefined && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          (الحالي: {licenseData.currentUsers})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hardware / Request ID */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-purple-500" />
                      معرف جهاز المنظومة
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                        {licenseData?.requestId || 'LOCAL-NODE'}
                      </span>
                      {licenseData?.requestId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(licenseData.requestId!);
                            setCopiedRequestId(true);
                            setTimeout(() => setCopiedRequestId(false), 2000);
                          }}
                          className="p-1 rounded hover:bg-slate-150 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title="نسخ معرف الجهاز"
                        >
                          {copiedRequestId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enabled Features Strip */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                    المزايا والقدرات المعتمدة في الترخيص:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        key: 'cloudSync',
                        label: 'المزامنة السحابية',
                        icon: Globe2,
                        enabled: !!effectiveFeatures.cloudSync,
                      },
                      {
                        key: 'ai',
                        label: 'الذكاء الاصطناعي',
                        icon: Sparkles,
                        enabled: !!effectiveFeatures.ai,
                      },
                      {
                        key: 'whatsapp',
                        label: 'إشعارات الواتساب',
                        icon: MessageSquare,
                        enabled: !!effectiveFeatures.whatsapp,
                      },
                      {
                        key: 'eta',
                        label: 'الفاتورة الإلكترونية',
                        icon: FileCheck2,
                        enabled: !!effectiveFeatures.eta,
                      },
                    ].map((feat) => {
                      const Icon = feat.icon;
                      return (
                        <div
                          key={feat.key}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                            feat.enabled
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${feat.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold block truncate">{feat.label}</span>
                            <span className="text-[9px] block font-medium">
                              {feat.enabled ? 'مفعلة' : 'غير مفعلة'}
                            </span>
                          </div>
                          {feat.enabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* License Activation Form */}
              <form onSubmit={handleActivate} className="space-y-3 pt-2">
                <div>
                  <label
                    htmlFor="license-code-input"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    تفعيل كود ترخيص جديد:
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    قم بلصق كود الترخيص الرقمي الموقّع المستلم من إدارة المنظومة (يتكون من جزأين مشفرين ومفصولين بنقطة):
                  </p>
                  <textarea
                    id="license-code-input"
                    data-testid="license-code-input"
                    rows={3}
                    value={licenseCodeInput}
                    onChange={(e) => setLicenseCodeInput(e.target.value)}
                    placeholder="eyJsaWNlbnNlSWQiOiJMSUMtLi4uIn0=.3b9F... (الصق كود الترخيص هنا)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all resize-none"
                    dir="ltr"
                  />
                </div>

                {/* Feedback Message */}
                {actionMessage && (
                  <div
                    data-testid="license-feedback-message"
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
                      actionMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {actionMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    إغلاق
                  </button>
                  <button
                    type="submit"
                    data-testid="license-activate-btn"
                    disabled={activating || !licenseCodeInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {activating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التحقق والتفعيل...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تفعيل الترخيص فوراً</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseManagementModal;
