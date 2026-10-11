import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { db } from '../../db/localDatabase';

interface ConfirmActualDataModalProps {
  isOpen: boolean;
  year: number;
  onClose: () => void;
  onConfirm: () => void;
  clientName?: string;
}

export const ConfirmActualDataModal: React.FC<ConfirmActualDataModalProps> = ({
  isOpen,
  year,
  onClose,
  onConfirm,
  clientName,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirmAction = () => {
    if (!isChecked) return;
    try {
      db.logAudit(
        'UPDATE',
        `تغيير مصدر بيانات السنة المالية ${year} من محاكاة تحليلية إلى (قوائم فعلية - ACTUAL) بعد الإقرار الصريح: "أقر بأن الأرقام مطابقة للقوائم الفعلية للعميل"${
          clientName ? ` للعميل [${clientName}]` : ''
        }`
      );
    } catch (e) {
      console.warn('Audit log error:', e);
    }
    onConfirm();
    setIsChecked(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>إقرار مطابقة أرقام السنة المالية {year} كبيانات فعلية</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <p>
            تغيير مصدر البيانات إلى <strong className="text-emerald-700 dark:text-emerald-400 font-black">قوائم فعلية معتمدة (ACTUAL)</strong> يزيل التنبيه القانوني للمحاكاة عن هذه السنة المالية في جميع شاشات الملف الائتماني والطباعة.
          </p>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer font-bold text-amber-950 dark:text-amber-100">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-400"
              />
              <span>أقر بأن الأرقام مطابقة للقوائم الفعلية للعميل</span>
            </label>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mr-6">
              يتطلب معيار جودة المراجعة والتدقيق إقرار المحاسب المسؤول بالتحقق من المطابقة قبل إزالة صفة المحاكاة.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!isChecked}
            onClick={handleConfirmAction}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
              isChecked
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد واعتماد (ACTUAL)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
