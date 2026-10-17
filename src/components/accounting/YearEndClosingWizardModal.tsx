import React, { useState } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { Lock, X, CheckCircle2 } from 'lucide-react';

export interface YearEndClosingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onSuccess?: () => void;
}

export const YearEndClosingWizardModal: React.FC<YearEndClosingWizardModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess,
}) => {
  const [fiscalYear, setFiscalYear] = useState(
    state.activeClientContext?.selectedFiscalYear || 2026
  );

  if (!isOpen) return null;

  const handleCloseYear = () => {
    db.addJournalEntry({
      entryNumber: `CLS-${fiscalYear}`,
      date: `${fiscalYear}-12-31`,
      description: `قيد إقفال السنة المالية ${fiscalYear} وترحيل الأرباح المحتجزة`,
      documentType: 'CLOSING',
      isPosted: true,
      status: 'POSTED',
      fiscalYear,
      clientId: state.activeClientContext?.clientId || undefined,
      lines: [],
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              معالج إقفال السنة المالية وتوليد قيود الإقفال
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>سيقوم المعالج بإقفال حسابات الإيرادات والمصروفات وترحيل صافي النتيجة إلى حساب الأرباح المحتجزة.</p>
          <div>
            <label className="block font-bold mb-1">السنة المالية المراد إقفالها</label>
            <input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value) || 2026)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCloseYear}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تنفيذ الإقفال السنوي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
