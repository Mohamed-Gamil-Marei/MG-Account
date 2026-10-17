import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, AlertTriangle, KeyRound, ArrowRight } from 'lucide-react';
import {
  getDesktopInitialAdminCredentials,
  consumeDesktopInitialAdminCredentials,
  DesktopAdminCredentials,
} from '../../services/desktopAdminCredentialsService';

interface InitialAdminModalProps {
  onDismiss?: (email: string) => void;
}

export const InitialAdminModal: React.FC<InitialAdminModalProps> = ({ onDismiss }) => {
  const [credentials, setCredentials] = useState<DesktopAdminCredentials | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getDesktopInitialAdminCredentials().then((creds) => {
      if (isMounted && creds && creds.password) {
        setCredentials(creds);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!credentials) return null;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(credentials.password);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleProceed = () => {
    const email = credentials.email || 'admin@desktop.local';
    consumeDesktopInitialAdminCredentials();
    setCredentials(null);
    if (onDismiss) {
      onDismiss(email);
    }
  };

  const isReset = Boolean(credentials.isReset);

  return (
    <div
      data-testid="initial-admin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-right font-['Cairo',system-ui,sans-serif] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isReset
                ? 'استرجاع كلمة مرور مدير المنظومة (سطح المكتب)'
                : 'بيانات الدخول الأولية لمدير المنظومة (سطح المكتب)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isReset
                ? 'تم توليد كلمة مرور مؤقتة جديدة للمدير بناءً على تشغيل المنظومة بالمعامل --reset-admin-password.'
                : 'تم تهيئة أول حساب مدير للنظام تلقائياً وبأمان كامل.'}
            </p>
          </div>
        </div>

        {/* Warning Badge */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-black mb-0.5">تنبيه هام جداً (تُعرض لمرة واحدة فقط):</strong>
            لن تظهر كلمة المرور هذه مرة أخرى في أي سجل أو شاشة. يرجى نسخها وحفظها فوراً في مكان آمن. سيطلب منك النظام تغييرها فور تسجيل دخولك الأول.
          </div>
        </div>

        {/* Credentials Display */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
              اسم المستخدم / البريد الإلكتروني:
            </label>
            <div
              data-testid="initial-admin-email"
              className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 select-all"
            >
              {credentials.email}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                كلمة المرور المؤقتة الموّلدة (12 خانة):
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                data-testid="initial-admin-password"
                className="flex-1 font-mono text-base font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 tracking-wider select-all"
              >
                {showPassword ? credentials.password : '••••••••••••'}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          data-testid="initial-admin-proceed-btn"
          onClick={handleProceed}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>نسخت كلمة المرور ومتابعة للدخول</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};
