import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../../lib/apiClient';
import { db } from '../../db/localDatabase';
import { SystemUser } from '../../types';

interface ForceChangePasswordModalProps {
  currentUser: SystemUser;
  onSuccess: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  currentUser,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requirement 2: Strict modal enforcement (No ESC key, no outside click dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 10) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحديث كلمة المرور.');
      }

      // Requirement 4: Clear flag locally and reload user from server
      db.setMustChangePassword(currentUser.id, false);

      try {
        const meRes = await fetchWithAuth('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.user) {
            const reloadedProfile = {
              uid: String(meData.user.id),
              email: meData.user.email,
              name: meData.user.name || meData.user.email,
              role: meData.user.role,
              roleTitleArabic: meData.user.role === 'ADMIN' ? 'مدير المنظومة والشريك المسؤول' : 'مستخدم النظام',
              canAccessTreasury: !!meData.user.canAccessTreasury,
              canAccessAuditTrail: !!meData.user.canAccessAuditTrail,
              canAccessCreditFiles: !!meData.user.canAccessCreditFiles,
              canAccessTaxReports: !!meData.user.canAccessTaxReports,
              canManageUsers: !!meData.user.canManageUsers,
              canPostEntries: !!meData.user.canPostEntries,
              canEditPostedEntries: !!meData.user.canEditPostedEntries,
              canDeleteRecords: !!meData.user.canDeleteRecords,
              mustChangePassword: false,
            };
            db.syncLoggedInUser(reloadedProfile as any, 'SERVER_AUTH');
          }
        }
      } catch (reloadErr) {
        console.warn('Could not reload user from /api/auth/me:', reloadErr);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ كلمة المرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="force-change-password-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none"
      dir="rtl"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right font-['Cairo',system-ui,sans-serif] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              تغيير كلمة المرور المؤقتة (إلزامي)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أنت مسجل حالياً بكلمة مرور مؤقتة مولّدة آلياً.
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-semibold">
          لدواعي الأمان المهني، يلزم تعيين كلمة مرور شخصية جديدة لا تقل عن 10 خانات قبل بدء استخدام المنظومة. لا يمكن تجاوز هذه الشاشة أو التنقل حتى إتمام الحفظ.
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              كلمة المرور الجديدة (10 أحرف على الأقل):
            </label>
            <input
              data-testid="new-password-input"
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تأكيد كلمة المرور الجديدة:
            </label>
            <input
              data-testid="confirm-password-input"
              type="password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            data-testid="change-password-submit-btn"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ كلمة المرور ومتابعة العمل'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
