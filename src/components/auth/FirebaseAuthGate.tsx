import React, { useState, useEffect } from 'react';
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
  Crown,
  Sparkles,
  Key,
} from 'lucide-react';
import { firebaseAuth, FirebaseUserProfile } from '../../services/firebaseAuthService';
import { saveOfflineAuthCache, verifyOfflineAuthCache, clearOfflineAuthCache } from '../../services/offlineAuthService';
import { db } from '../../db/localDatabase';

interface FirebaseAuthGateProps {
  onAuthenticated: (profile: FirebaseUserProfile) => void;
}

export const FirebaseAuthGate: React.FC<FirebaseAuthGateProps> = ({ onAuthenticated }) => {
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupCheckError, setSetupCheckError] = useState<string | null>(null);

  // Admin Setup form state
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');

  // Standard Login / Register state
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const checkSetupStatus = async () => {
    setCheckingSetup(true);
    setSetupCheckError(null);
    let isMounted = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/auth/check-setup', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (isMounted && data.success) {
          if (data.needsSetup) {
            setNeedsAdminSetup(true);
          } else {
            setNeedsAdminSetup(false);
          }
        }
      } else {
        const status = res.status;
        if (isMounted) {
          if (status >= 500 && status <= 504) {
            setSetupCheckError(`السيرفر غير متاح (خطأ ${status}): فشل الاستجابة من الخادم.`);
          } else {
            setSetupCheckError(`تعذر الاتصال بالسيرفر (رمز الاستجابة: ${status}).`);
          }
          setNeedsAdminSetup(false);
        }
      }
    } catch (err: any) {
      if (isMounted) {
        if (err.name === 'AbortError') {
          setSetupCheckError('انتهت مهلة الاتصال بالخادم (Timeout بعد 8 ثوانٍ). السيرفر غير متاح.');
        } else {
          setSetupCheckError('تعذر الاتصال بالسيرفر (خطأ شبكة أو السيرفر متوقف).');
        }
        setNeedsAdminSetup(false);
      }
    } finally {
      if (isMounted) setCheckingSetup(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = setupName.trim();
    const cleanEmail = setupEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !setupPassword || !setupConfirmPassword || !setupToken.trim()) {
      setError('يرجى ملء كافة الحقول لإعداد حساب المدير الرئيسي (بما في ذلك رمز الإعداد وتأكيد كلمة المرور).');
      return;
    }

    if (setupPassword.length < 10) {
      setError('يجب ألا تقل كلمة المرور عن 10 أحرف/أرقام لضمان أمان حساب المدير.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setError('كلمات المرور غير متطابقة. يرجى التأكد من تطابق كلمة المرور وتأكيدها.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: setupPassword,
          setupToken: setupToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || 'فشل إنشاء حساب المدير الرئيسي.');
      }

      const adminProfile: FirebaseUserProfile = {
        uid: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: 'ADMIN',
        roleTitleArabic: 'مدير المنظومة والشريك المسؤول',
        canAccessTreasury: true,
        canAccessAuditTrail: true,
        canAccessCreditFiles: true,
        canAccessTaxReports: true,
        canManageUsers: true,
        canPostEntries: true,
        canEditPostedEntries: true,
        canDeleteRecords: true,
        isOffline: false,
      };

      await saveOfflineAuthCache(adminProfile.email, setupPassword, adminProfile);
      db.syncLoggedInUser(adminProfile);

      setSuccessMsg(`مبارك! تم إنشاء حساب المدير الرئيسي بنجاح: ${adminProfile.name}`);
      setTimeout(() => {
        onAuthenticated(adminProfile);
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إنشاء حساب المدير.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim();
    const formattedEmail = normalizedEmail.includes('@') ? normalizedEmail : `${normalizedEmail}@system.local`;

    if (!normalizedEmail || !password) {
      setError('يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور.');
      return;
    }

    if (isRegistering && password.length < 10) {
      setError('يجب ألا تقل كلمة المرور للحساب الجديد عن 10 أحرف/أرقام.');
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
        const profile = await firebaseAuth.signUp(name.trim(), formattedEmail, password);
        await saveOfflineAuthCache(profile.email, password, profile);
        db.syncLoggedInUser(profile);
        setSuccessMsg('تم تسجيل حسابك بنجاح. حسابك بانتظار تفعيل المدير (PENDING).');
        setTimeout(() => {
          onAuthenticated(profile);
        }, 1200);
      } else {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formattedEmail, password }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const data = await res.json();
          if (!res.ok || !data.success || !data.user) {
            const errCode = res.status;
            if (errCode >= 500 && errCode <= 504) {
              const verifyRes = await verifyOfflineAuthCache(formattedEmail, password);
              if (verifyRes.success && verifyRes.profile) {
                db.syncLoggedInUser(verifyRes.profile);
                onAuthenticated(verifyRes.profile);
                return;
              }
              throw new Error('السيرفر غير متاح مؤقتاً (خطأ 50x) ولا يوجد كاش أوفلاين لهذا الحساب.');
            }
            throw new Error(data.error || 'فشل تسجيل الدخول.');
          }

          const serverUser = data.user;
          const userProfile: FirebaseUserProfile = {
            uid: String(serverUser.id),
            email: serverUser.email,
            name: serverUser.name,
            role: serverUser.role,
            roleTitleArabic: serverUser.role === 'ADMIN' ? 'مدير المنظومة' : serverUser.role === 'ACCOUNTANT' ? 'محاسب مالي' : 'مستخدم',
            canAccessTreasury: !!serverUser.canAccessTreasury,
            canAccessAuditTrail: !!serverUser.canAccessAuditTrail,
            canAccessCreditFiles: !!serverUser.canAccessCreditFiles,
            canAccessTaxReports: !!serverUser.canAccessTaxReports,
            canManageUsers: !!serverUser.canManageUsers,
            canPostEntries: !!serverUser.canPostEntries,
            canEditPostedEntries: !!serverUser.canEditPostedEntries,
            canDeleteRecords: !!serverUser.canDeleteRecords,
            isOffline: false,
          };

          await saveOfflineAuthCache(userProfile.email, password, userProfile);
          db.syncLoggedInUser(userProfile);
          onAuthenticated(userProfile);
        } catch (fetchErr: any) {
          const isNetworkError =
            fetchErr.name === 'AbortError' ||
            fetchErr.message?.includes('Failed to fetch') ||
            fetchErr.message?.includes('NetworkError') ||
            fetchErr.message?.includes('502') ||
            fetchErr.message?.includes('503') ||
            fetchErr.message?.includes('504');

          if (isNetworkError) {
            const verifyRes = await verifyOfflineAuthCache(formattedEmail, password);
            if (verifyRes.success && verifyRes.profile) {
              db.syncLoggedInUser(verifyRes.profile);
              onAuthenticated(verifyRes.profile);
              return;
            }
            throw new Error('تعذر الاتصال بالسيرفر ولا يوجد كاش أوفلاين صالح لهذا الحساب.');
          }
          throw fetchErr;
        }
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء المصادقة.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">جاري التحقق من حالة المنظومة...</p>
        </div>
      </div>
    );
  }

  // FIRST MASTER ADMIN SETUP FORM
  if (needsAdminSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-y-auto" dir="rtl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-blue-950/60 p-6 border-b border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>إعداد المدير الرئيسي الأول</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-amber-300/80 mt-1.5 font-medium leading-relaxed">
              أهلاً بك! النظام خالي من المستخدمين حالياً. يرجى إنشاء حساب المدير الرئيسي ووضع رمز الإعداد (SETUP_TOKEN).
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

            <form onSubmit={handleAdminSetupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم المدير الرئيسي الكامل:
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="مثال: د. أحمد المحاسب"
                    required
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  البريد الإلكتروني للمدير:
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="admin@company.com"
                    required
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  كلمة المرور (10 أحرف على الأقل):
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={10}
                    className="w-full pr-9 pl-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  تأكيد كلمة المرور:
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={10}
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>رمز الإعداد (SETUP_TOKEN):</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <input
                    type="text"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="أدخل رمز SETUP_TOKEN الخاص بالخادم"
                    required
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-sm text-amber-100 placeholder-amber-500/50 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                </div>
                <p className="text-[10px] text-amber-400/70 mt-1">
                  رمز الأمان المطلوب لإنشاء أول حساب مدير في البيئة.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تفعيل حساب المدير...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>إنشاء حساب المدير الرئيسي والبدء</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD LOGIN / REGISTER FORM
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
            {isRegistering ? 'تسجيل حساب جديد (دور PENDING قيد الموافقة)' : 'تسجيل الدخول الآمن للأنظمة'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {setupCheckError && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{setupCheckError} (العمل في وضع الأوفلاين إن وجد كاش مسجل)</span>
              </div>
              <div className="text-left">
                <button
                  type="button"
                  onClick={checkSetupStatus}
                  className="px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

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
                    placeholder="الاسم الثلاثي أو الرباعي"
                    required
                    className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                البريد الإلكتروني / اسم المستخدم:
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com أو اسم المستخدم"
                  required
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                كلمة المرور (10 أحرف على الأقل):
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={10}
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
