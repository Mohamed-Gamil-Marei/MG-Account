import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { SecurityAuthService, MASTER_EDIT_PASSWORD } from '../services/securityAuth';

interface SecurityAuthModalProps {
  isOpen?: boolean;
  title?: string;
  actionTitle?: string;
  description?: string;
  itemDescription?: string;
  actionType?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const SecurityAuthModal: React.FC<SecurityAuthModalProps> = ({
  isOpen = true,
  title = 'تأكيد إذن تعديل السجل المحاسبي',
  actionTitle,
  description,
  itemDescription = 'البيانات المعروضة حالياً تعمل في (نظام عرض البيانات) لمنع التعديل غير المقصود.',
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (isOpen === false) return null;

  const displayTitle = actionTitle || title;
  const displayDescription = description || itemDescription;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (SecurityAuthService.verifyPassword(password)) {
      setErrorMessage(null);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 300);
    } else {
      setErrorMessage('الرقم السري غير مطابق! (الرقم السري الافتراضي: Mg120)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                حماية وتأمين السجلات
              </span>
              <h3 className="text-sm font-bold text-white mt-1">{displayTitle}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-slate-700 text-xs leading-relaxed">
              <p className="font-semibold text-slate-900 mb-0.5">وضع الحماية وعرض البيانات</p>
              <p>{displayDescription}</p>
              <p className="mt-1 text-[11px] text-amber-900 font-bold">
                أدخل الرقم السري المصرح به (<span className="font-mono text-emerald-800 font-bold">Mg120</span>) لتأكيد العملية.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>الرقم السري للتأكيد:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Mg120</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="أدخل الرقم السري (Mg120)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 pl-10 text-right"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? 'إخفاء' : 'إظهار'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>تم التحقق بنجاح! جاري المتابعة...</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSuccess || !password}
              id="btn-submit-edit-auth"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>تأكيد المتابعة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
