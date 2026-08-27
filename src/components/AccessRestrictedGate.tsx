import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { SystemUser, NavigationTab } from '../types';
import { SecurityAuthModal } from './SecurityAuthModal';

interface AccessRestrictedGateProps {
  currentUser: SystemUser;
  targetTabName: string;
  onOverrideSuccess: () => void;
  onNavigateHome: () => void;
}

export const AccessRestrictedGate: React.FC<AccessRestrictedGateProps> = ({
  currentUser,
  targetTabName,
  onOverrideSuccess,
  onNavigateHome,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold font-mono px-3 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-200">
            صلاحيات الوصول مقيدة (RBAC Protected)
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            غير مصرح لك بفتح قسم [{targetTabName}]
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            المستخدم الحالي: <strong>{currentUser.name}</strong> بصلاحية (<strong>{currentUser.roleTitleArabic}</strong>).
            تم تقييد الوصول إلى هذا القسم الحساس وفقاً لسياسة الرقابة الداخلية وإجراءات ضبط الجودة بالمكتب.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">مستوى الصلاحية الحالي:</span>
            <span className="font-bold text-slate-800">{currentUser.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">الوصول للخزنة:</span>
            <span className={currentUser.canAccessTreasury ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {currentUser.canAccessTreasury ? 'مسموح' : 'محظور'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">الوصول لسجل المراجعة والتدقيق:</span>
            <span className={currentUser.canAccessAuditTrail ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {currentUser.canAccessAuditTrail ? 'مسموح' : 'محظور'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={onNavigateHome}
            className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            العودة للوحة التحكم
          </button>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span>إذن استثنائي للمدير</span>
          </button>
        </div>

        {/* Override Modal */}
        <SecurityAuthModal
          isOpen={isAuthModalOpen}
          actionTitle={`فتح وتخويل الوصول إلى قسم [${targetTabName}]`}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            onOverrideSuccess();
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    </div>
  );
};
