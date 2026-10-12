import React, { useState } from 'react';
import {
  Trash2,
  AlertOctagon,
  KeyRound,
  CheckCircle2,
  X,
  AlertTriangle,
  Download,
  ShieldCheck,
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
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCheckbox) {
      setErrorMessage('يرجى تحديد مربع الإقرار والموافقة للمتابعة.');
      return;
    }

    if (confirmationText.trim() !== 'تفريغ') {
      setErrorMessage('يرجى كتابة كلمة "تفريغ" بالحروف العربية بالضبط للتأكيد.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await db.resetForProduction({
        passcode,
        confirmationText: confirmationText.trim(),
      });

      setIsProcessing(false);

      if (res.success) {
        // Automatically download full backup JSON
        if (res.backupJson) {
          const blob = new Blob([res.backupJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `full-backup-before-production-reset-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        setSuccessMessage(res.message);
        setPasscode('');
        setConfirmationText('');
        setConfirmCheckbox(false);
        setTimeout(() => {
          if (onPurgeComplete) onPurgeComplete();
          onClose();
        }, 2000);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'حدث خطأ أثناء تنفيذ عملية تهيئة المنظومة.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 text-right dir-rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-200 dark:border-red-900/50 text-xs animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-800 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                منطقة تهيئة المنظومة للعمل الفعلي
              </span>
              <h3 className="text-sm font-bold text-white mt-1">تهيئة البرنامج للعمل الفعلي وتفريغ البيانات التجريبية</h3>
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
        <form onSubmit={handlePurge} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Detailed breakdown banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <div className="font-bold flex items-center gap-2 text-slate-900 dark:text-white text-xs">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
              <span>تنبيه هام جداً قبل البدء في التهيئة الفعلية:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200">
                <span className="font-bold block mb-1 text-red-700 dark:text-red-300">🗑️ ما سيتم حذفه وتفريغه:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-red-800 dark:text-red-300">
                  <li>كافة ملفات وأرشيف العملاء</li>
                  <li>جميع قيود اليومية والحركات المالية</li>
                  <li>سندات الخزنة والبنك والشهادات</li>
                  <li>الفواتير، الإقرارات، والأصول الثابتة</li>
                  <li>دراسات الجدوى وعروض الأسعار</li>
                  <li>المواعيد والبنود المفتوحة وسجل الرسائل</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200">
                <span className="font-bold block mb-1 text-emerald-700 dark:text-emerald-300">🛡️ ما سيتم الإبقاء عليه:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                  <li>دليل الحسابات المعياري (بأرصدة صفريّة)</li>
                  <li>حسابات المستخدمين والصلاحيات الأجهزة</li>
                  <li>تفضيلات النظام والأمان</li>
                  <li>هيكل بيانات المكتب الأساسي</li>
                </ul>
              </div>
            </div>

            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200 text-[10px] flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600 shrink-0" />
              <span>سيتم تلقائياً تنزيل نسخة احتياطية شاملة (JSON) بحاسوبك قبل بدء التفريغ.</span>
            </div>
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
              أقر بصفتي مدير النظام بأني أرغب بتفريغ كافة البيانات التجريبية وتهيئة البرنامج للعمل الفعلي.
            </span>
          </label>

          {/* Confirmation Text Input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
              اكتب كلمة <strong className="text-red-600 font-bold px-1 bg-red-50 dark:bg-red-950 rounded">"تفريغ"</strong> لتأكيد العملية:
            </label>
            <input
              type="text"
              required
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="اكتب كلمة: تفريغ"
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Passcode input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
              <KeyRound className="w-3.5 h-3.5 text-red-600" />
              <span>كلمة مرور التفريغ وتأكيد الصلاحية:</span>
            </label>
            <input
              type="password"
              required
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="أدخل كلمة المرور..."
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
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
              disabled={isProcessing || !confirmCheckbox || confirmationText.trim() !== 'تفريغ' || !passcode}
              className="flex-1 p-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isProcessing ? 'جاري تصدير النسخة وتفريغ النظام...' : 'تهيئة البرنامج للعمل الفعلي الآن'}</span>
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
