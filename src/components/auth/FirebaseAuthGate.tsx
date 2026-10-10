import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { firebaseAuth, FirebaseUserProfile } from '../../services/firebaseAuthService';

interface FirebaseAuthGateProps {
  onAuthenticated: (profile: FirebaseUserProfile) => void;
}

export const FirebaseAuthGate: React.FC<FirebaseAuthGateProps> = ({ onAuthenticated }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    if (password.length < 6) {
      setError('يجب ألا تقل كلمة المرور عن 6 أحرف/أرقام.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        if (!name.trim()) {
          setError('يرجى كتابة الاسم الكامل.');
          setIsLoading(false);
          return;
        }
        const profile = await firebaseAuth.signUp(name.trim(), email.trim(), password);
        setSuccessMsg('تم إنشاء الحساب بنجاح وهو الآن قيد الانتظار (PENDING) بانتظار تفعيل المدير.');
        setTimeout(() => {
          if (profile.role !== 'PENDING') {
            onAuthenticated(profile);
          }
        }, 1500);
      } else {
        const profile = await firebaseAuth.signIn(email, password);
        setSuccessMsg(`أهلاً بك، تم تسجيل الدخول بنجاح: ${profile.name}`);
        setTimeout(() => onAuthenticated(profile), 600);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(err?.message || 'حدث خطأ أثناء المصادقة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-y-auto" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-emerald-900/40 p-6 border-b border-slate-800 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-lg font-black text-white tracking-tight">
            منظومة المحاسب القانوني ومراقب الحسابات
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {isRegistering ? 'تسجيل حساب جديد (دور PENDING افتراضياً)' : 'تسجيل الدخول الآمن عبر Firebase Spark'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل:
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم المستخدم"
                    required
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                البريد الإلكتروني:
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                كلمة المرور (6 أحرف على الأقل):
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pr-9 pl-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول'}</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 text-center border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ تسجيل حساب جديد (PENDING)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
