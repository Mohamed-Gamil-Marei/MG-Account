import React, { useState } from 'react';
import {
  Trash2,
  AlertOctagon,
  KeyRound,
  CheckCircle2,
  X,
  RefreshCcw,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { db } from '../db/localDatabase';

interface PurgeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeComplete?: () => void;
}

export const PurgeDatabaseModal: React.FC<PurgeDatabaseModalProps> = ({
  isOpen,
  onClose,
  onPurgeComplete,
}) => {
  const [passcode, setPasscode] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePurge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCheckbox) {
      setErrorMessage('يرجى تحديد مربع التأكيد للموافقة على تفريغ البيانات.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    setTimeout(() => {
      const res = db.purgeAllDatabaseData(passcode);
      setIsProcessing(false);
      if (res.success) {
        setSuccessMessage(res.message);
        setPasscode('');
        setConfirmCheckbox(false);
        setTimeout(() => {
          if (onPurgeComplete) onPurgeComplete();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200 dark:border-red-900/50 text-right space-y-0 text-xs animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-800 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                منطقة العمليات الحرجة
              </span>
              <h3 className="text-sm font-bold text-white mt-1">تفريغ وتصفير بيانات المنظومة بالكامل</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handlePurge} className="p-6 space-y-4">
          {/* Warning banner */}
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-900 dark:text-red-200 space-y-2">
            <div className="font-bold flex items-center gap-2 text-red-800 dark:text-red-300 text-xs">
              <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>تحذير شديد الأهمية: هذا الإجراء لا يمكن التراجع عنه!</span>
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
              سيتم حذف ومسح كافة قيود اليومية، حركات الخزينة، ملفات العملاء، الفواتير، الإقرارات الضريبية، والشهادات نهائياً وتصفير كافة الأرصدة إلى الصفر لبدء دورة محاسبية جديدة تماماً.
            </p>
          </div>

          {/* Confirm Checkbox */}
          <label className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmCheckbox}
              onChange={(e) => setConfirmCheckbox(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              أقر بأنني أرغب بتفريغ ومسح كافة بيانات البرنامج والبدء بملف محاسبي نظيف.
            </span>
          </label>

          {/* Passcode input */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-600" />
                <span>الرقم السري لتأكيد التفريغ:</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="أدخل الرقم السري المصرح به..."
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isProcessing || !confirmCheckbox || !passcode}
              className="flex-1 p-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isProcessing ? 'جاري تفريغ ومسح البيانات...' : 'تفريغ وتصفير البيانات الآن'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
