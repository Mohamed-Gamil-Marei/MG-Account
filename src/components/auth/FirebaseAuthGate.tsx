import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  User,
  Users,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { firebaseAuth, FirebaseUserProfile } from '../../services/firebaseAuthService';
import { UserRole } from '../../types';

interface FirebaseAuthGateProps {
  onAuthenticated: (profile: FirebaseUserProfile) => void;
}

export const FirebaseAuthGate: React.FC<FirebaseAuthGateProps> = ({ onAuthenticated }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
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
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('يرجى كتابة الاسم الكامل للمستخدم.');
          setIsLoading(false);
          return;
        }
        const profile = await firebaseAuth.register(email, password, name.trim(), selectedRole);
        setSuccessMsg(`تم إنشاء الحساب بنجاح بصلاحية: ${profile.roleTitleArabic}`);
        setTimeout(() => onAuthenticated(profile), 600);
      } else {
        const profile = await firebaseAuth.signIn(email, password);
        setSuccessMsg(`أهلاً بك، تم تسجيل الدخول بنجاح: ${profile.name}`);
        setTimeout(() => onAuthenticated(profile), 600);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let msg = 'حدث خطأ أثناء المصادقة، يرجى المحاولة مرة أخرى.';
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق أو إنشاء حساب جديد.';
      } else if (code === 'auth/email-already-in-use') {
        msg = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من التسجيل.';
      } else if (code === 'auth/invalid-email') {
        msg = 'صيغة البريد الإلكتروني غير صحيحة.';
      } else if (code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة جداً. استخدم 6 رموز على الأقل.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill test credentials
  const fillPreset = (presetEmail: string, presetRole: UserRole, presetName: string) => {
    setEmail(presetEmail);
    setPassword('Pass123456');
    setName(presetName);
    setSelectedRole(presetRole);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-y-auto" dir="rtl">
      {/* Background glowing accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-emerald-900/40 p-6 border-b border-slate-800 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-lg font-black text-white tracking-tight">
            منظومة المحاسب القانوني ومراقب الحسابات
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            تسجيل الدخول الإجباري المؤمن عبر Firebase Auth & RBAC
          </p>
        </div>

        {/* Content Form */}
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
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    الاسم الكامل للمستخدم:
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أ.د. محمد جميل مرعي"
                      className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    تحديد الدور والصلاحية في Firestore:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: 'ADMIN', label: 'مدير', desc: 'كامل الصلاحيات' },
                      { role: 'ACCOUNTANT', label: 'محاسب', desc: 'قيود ودفاتر' },
                      { role: 'SECRETARY', label: 'سكرتارية', desc: 'استقبال وفواتير' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => setSelectedRole(item.role as UserRole)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedRole === item.role
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold shadow-xs'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
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
                  placeholder="midotota580@gmail.com"
                  required
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                كلمة المرور (Password):
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pr-9 pl-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق والاتصال بـ Firebase...</span>
                </>
              ) : isRegisterMode ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>إنشاء الحساب وتحديد الدور في Firestore</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>دخول المنظومة (Firebase Sign-In)</span>
                </>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="pt-2 text-center border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
            >
              {isRegisterMode
                ? 'لديك حساب بالفعل؟ انقر لتسجيل الدخول'
                : 'مستخدم جديد؟ إنشاء حساب جديد وتحديد الصلاحيات'}
            </button>
          </div>

          {/* Quick Presets for Dev / Testing */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
              <span>حسابات تجريبية سريعة للاختبار:</span>
              <span className="text-[10px] text-slate-600 font-mono">Pass123456</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => fillPreset('midotota580@gmail.com', 'ADMIN', 'محمد جميل مرعي')}
                className="py-1 px-1.5 bg-slate-950 hover:bg-slate-800 border border-blue-900/50 rounded-lg text-blue-300 font-medium truncate cursor-pointer text-center"
              >
                👑 مدير (Owner)
              </button>
              <button
                type="button"
                onClick={() => fillPreset('accountant@cpa-office.com', 'ACCOUNTANT', 'أحمد مراجعة - محاسب')}
                className="py-1 px-1.5 bg-slate-950 hover:bg-slate-800 border border-emerald-900/50 rounded-lg text-emerald-300 font-medium truncate cursor-pointer text-center"
              >
                📊 محاسب (Accountant)
              </button>
              <button
                type="button"
                onClick={() => fillPreset('secretary@cpa-office.com', 'SECRETARY', 'منى استقبال - سكرتارية')}
                className="py-1 px-1.5 bg-slate-950 hover:bg-slate-800 border border-purple-900/50 rounded-lg text-purple-300 font-medium truncate cursor-pointer text-center"
              >
                📋 سكرتارية (Secretary)
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>مشفر بمعايير Firebase TLS 1.3</span>
          </div>
          <span className="font-mono text-[10px]">Firestore RBAC v2.0</span>
        </div>
      </div>
    </div>
  );
};
