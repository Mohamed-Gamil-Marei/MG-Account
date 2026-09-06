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
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
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
    if (!selectedUser) return;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="pin-auth-container"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header with Cloud Sync Indicator */}
        <div className="bg-slate-950/60 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                تسجيل الدخول وقفل الشاشة
              </h3>
              <p className="text-xs text-slate-400">
                منظومة المحاسب والمراجع القانوني الموحدة
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              سحابي متزامن
            </span>
            {syncStatus.lastSyncedAt && (
              <span className="text-[10px] text-slate-400 mt-1">
                تزامن: {syncStatus.lastSyncedAt}
              </span>
            )}
          </div>
        </div>

        {/* User Selection Dropdown & Quick Selector */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>قائمة الموظفين والمستخدمين المصرح لهم:</span>
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
                  {u.name} — {u.roleTitleArabic} ({u.employeeCode || u.username})
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
                return (
                  <button
                    key={u.id}
                    id={`select-user-${u.id}`}
                    onClick={() => handleQuickLogin(u)}
                    type="button"
                    className={`flex items-center gap-2 p-2 rounded-xl text-right transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/10'
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
                      <div className="font-semibold text-xs truncate leading-tight">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {u.roleTitleArabic.split('(')[0].trim()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Selected User Card */}
        {selectedUser && (
          <div className="px-6 pt-3 pb-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{selectedUser.roleTitleArabic}</span>
            </div>
            <p className="text-xs font-semibold text-slate-200">
              أدخل الرمز السري (PIN) لحساب: <span className="text-amber-400">{selectedUser.name}</span>
            </p>
          </div>
        )}

        {/* PIN Dots / Display */}
        <div className="px-6 py-3">
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <div className="relative w-full max-w-[260px]">
              <input
                id="pin-input-field"
                type={showPin ? 'text' : 'password'}
                maxLength={20}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="••••••"
                className="w-full text-center text-lg font-mono py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-2xl text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 tracking-widest"
                autoFocus
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
                className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-shake"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Interactive PIN Pad */}
        <div className="px-8 pb-4 pt-1">
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                id={`pin-key-${num}`}
                onClick={() => handleDigitClick(num)}
                className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500/20 border border-slate-700/80 text-xl font-bold font-mono text-slate-100 hover:text-amber-400 hover:border-amber-500/40 transition-all flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              id="pin-clear-btn"
              onClick={handleClear}
              className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center"
            >
              مسح
            </button>
            <button
              type="button"
              id="pin-key-0"
              onClick={() => handleDigitClick('0')}
              className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-amber-500/20 border border-slate-700/80 text-xl font-bold font-mono text-slate-100 hover:text-amber-400 hover:border-amber-500/40 transition-all flex items-center justify-center shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              id="pin-delete-btn"
              onClick={handleDeleteDigit}
              className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center"
            >
              ← تراجع
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-3">
          {allowCancel && onCancel && (
            <button
              type="button"
              id="pin-cancel-btn"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              إلغاء
            </button>
          )}
          <button
            type="button"
            id="pin-submit-btn"
            onClick={() => handleSubmit()}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            تأكيد الدخول
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
            جلسة مشفرة ومؤمنة
          </span>
        </div>
      </div>
    </div>
  );
};
