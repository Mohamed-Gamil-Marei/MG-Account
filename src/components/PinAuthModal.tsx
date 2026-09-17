import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Sparkles,
  RefreshCw,
  Globe2,
  Laptop,
  UserCheck,
  KeyRound,
  Info,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { cloudSync, SyncStatus } from '../lib/cloudSync';
import { SystemUser } from '../types';

interface PinAuthModalProps {
  isOpen: boolean;
  onSuccess: (user: SystemUser) => void;
  onCancel?: () => void;
  targetUser?: SystemUser | null;
  allowCancel?: boolean;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  targetUser,
  allowCancel = false,
}) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [authMode, setAuthMode] = useState<'SELECT' | 'MANUAL'>('SELECT');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [manualIdentifier, setManualIdentifier] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync.getStatus());

  useEffect(() => {
    const loadedUsers = db.getUsers();
    setUsers(loadedUsers);
    if (targetUser) {
      setSelectedUser(targetUser);
    } else {
      const current = db.getCurrentUser();
      setSelectedUser(current || loadedUsers[0]);
    }
  }, [isOpen, targetUser]);

  useEffect(() => {
    const unsub = cloudSync.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 20) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleQuickLogin = (user: SystemUser) => {
    setSelectedUser(user);
    setPin('');
    setError(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (authMode === 'MANUAL') {
      if (!manualIdentifier.trim()) {
        setError('يرجى إدخال اسم المستخدم أو كود الموظف');
        return;
      }
      const res = db.authenticateUser(manualIdentifier, pin);
      if (res.success && res.user) {
        setPin('');
        setError(null);
        onSuccess(res.user);
      } else {
        setError(res.message || 'بيانات الدخول غير صحيحة');
      }
      return;
    }

    // SELECT mode
    if (!selectedUser) {
      setError('يرجى اختيار حساب المستخدم');
      return;
    }

    const res = db.authenticateByPin(selectedUser.id, pin);
    if (res.success && res.user) {
      setPin('');
      setError(null);
      onSuccess(res.user);
    } else {
      setError(res.message || 'الرمز السري غير صحيح');
    }
  };

  return (
    <div
      id="pin-auth-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="pin-auth-container"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-950/70 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                منظومة المحاسب القانوني المتكامل
              </h3>
              <p className="text-xs text-slate-400">
                بوابة تسجيل الدخول والتحقق المهني
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              مؤمن وسحابي
            </span>
          </div>
        </div>

        {/* Info Banner: Manual Admin Addition Policy */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-[11px] text-amber-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            يتم تسجيل الدخول حصرياً عبر المستخدمين المضافين يدوياً من لوحة الأدمن.
          </span>
        </div>

        {/* Tab Switcher: Select from Users vs. Manual Username Input */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1.5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('SELECT');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'SELECT'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>المستخدمون المعتمدون ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('MANUAL');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'MANUAL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>دخول يدوي (اسم مستخدم)</span>
          </button>
        </div>

        {/* Mode Content */}
        {authMode === 'SELECT' ? (
          /* User Selection Dropdown & Quick Selector */
          <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>اختر حساب المستخدم المعتمد:</span>
              </label>
              <select
                id="employee-select-dropdown"
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const u = users.find((usr) => usr.id === e.target.value);
                  if (u) handleQuickLogin(u);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100 py-1">
                    {u.name} — {u.roleTitleArabic} ({u.username || u.employeeCode || u.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <span>أو الاختيار السريع لحساب المستخدم:</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                {users.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isInactive = u.isActive === false;
                  return (
                    <button
                      key={u.id}
                      id={`select-user-${u.id}`}
                      onClick={() => handleQuickLogin(u)}
                      type="button"
                      className={`flex items-center gap-2 p-2 rounded-xl text-right transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/10'
                          : isInactive
                          ? 'bg-rose-950/20 border-rose-900/40 text-slate-400'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {u.avatarInitials || u.name.substring(0, 2)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs truncate leading-tight flex items-center gap-1">
                          {u.name}
                          {isInactive && <span className="text-[9px] text-rose-400">(معطّل)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.username || u.roleTitleArabic.split('(')[0].trim()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Manual Username / Employee Code Input */
          <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>اسم المستخدم أو كود الموظف المعتمد:</span>
            </label>
            <input
              type="text"
              id="manual-username-input"
              value={manualIdentifier}
              onChange={(e) => {
                setManualIdentifier(e.target.value);
                setError(null);
              }}
              placeholder="مثال: admin أو ahmed أو EMP-001"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <p className="text-[10px] text-slate-400">
              يجب أن يكون المستخدم مضافاً يدوياً مسبقاً من قِبل الأدمن في لوحة التحكم.
            </p>
          </div>
        )}

        {/* Selected User Indicator (Select Mode) */}
        {authMode === 'SELECT' && selectedUser && (
          <div className="px-6 pt-3 pb-1 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{selectedUser.roleTitleArabic}</span>
            </div>
            <p className="text-xs font-semibold text-slate-200">
              أدخل الرمز السري (PIN / كلمة المرور) للحساب: <span className="text-amber-400">{selectedUser.name}</span>
            </p>
          </div>
        )}

        {/* PIN / Password Input */}
        <div className="px-6 py-2">
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <div className="relative w-full max-w-[280px]">
              <input
                id="pin-input-field"
                type={showPin ? 'text' : 'password'}
                maxLength={30}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="الرمز السري / كلمة المرور"
                className="w-full text-center text-base font-mono py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-2xl text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 tracking-wider"
              />
              <button
                type="button"
                id="toggle-pin-visibility"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                title={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div
                id="pin-error-alert"
                className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-shake max-w-sm text-center"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Interactive PIN Pad */}
        <div className="px-8 pb-3 pt-1">
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                id={`pin-key-${num}`}
                onClick={() => handleDigitClick(num)}
                className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500/20 border border-slate-700/80 text-lg font-bold font-mono text-slate-100 hover:text-amber-400 hover:border-amber-500/40 transition-all flex items-center justify-center shadow-sm cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              id="pin-clear-btn"
              onClick={handleClear}
              className="h-10 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
            >
              مسح
            </button>
            <button
              type="button"
              id="pin-key-0"
              onClick={() => handleDigitClick('0')}
              className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500/20 border border-slate-700/80 text-lg font-bold font-mono text-slate-100 hover:text-amber-400 hover:border-amber-500/40 transition-all flex items-center justify-center shadow-sm cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              id="pin-delete-btn"
              onClick={handleDeleteDigit}
              className="h-10 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
            >
              ← تراجع
            </button>
          </div>
        </div>

        {/* Master Admin Helper Hint */}
        <div className="px-6 py-1.5 bg-slate-950/40 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400">
            حساب الأدمن الرئيسي: <span className="text-amber-400 font-mono font-bold">admin</span> | كلمة المرور: <span className="text-amber-400 font-mono font-bold">admin</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-3">
          {allowCancel && onCancel && (
            <button
              type="button"
              id="pin-cancel-btn"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}
          <button
            type="button"
            id="pin-submit-btn"
            onClick={() => handleSubmit()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            تأكيد تسجيل الدخول
          </button>
        </div>

        {/* Device & Sync Footer Note */}
        <div className="bg-slate-950 px-4 py-2 text-center text-[11px] text-slate-400 border-t border-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Laptop className="w-3 h-3 text-amber-500" />
            جهاز: {syncStatus.deviceId}
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            جلسة مشفرة ومحمية
          </span>
        </div>
      </div>
    </div>
  );
};

export default PinAuthModal;

