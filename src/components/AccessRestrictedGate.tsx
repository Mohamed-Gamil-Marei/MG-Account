import React from 'react';
import { SystemUser } from '../types';
import { ShieldAlert, Lock, Home } from 'lucide-react';

export interface AccessRestrictedGateProps {
  currentUser?: SystemUser | null;
  targetTabName: string;
  onOverrideSuccess?: () => void;
  onNavigateHome?: () => void;
}

export const AccessRestrictedGate: React.FC<AccessRestrictedGateProps> = ({
  currentUser,
  targetTabName,
  onNavigateHome,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 text-center max-w-lg mx-auto my-8 space-y-4" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h3 className="text-base font-black text-slate-900 dark:text-white">
        وصول مقيد حسب صلاحيات الدور الوظيفي (RBAC)
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        المستخدم الحالي <strong>({currentUser?.name || 'غير محدد'})</strong> لا يملك صلاحية الوصول إلى شاشة <strong>{targetTabName}</strong>. يرجى مراجعة الشريك المدير لمنح الصلاحية.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </button>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5" /> محمي بواسطة نظام الصلاحيات
        </span>
      </div>
    </div>
  );
};
