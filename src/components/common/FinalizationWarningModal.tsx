import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { ClosingStep } from '../../utils/closingChecklist';
import { OpenItem } from '../../types';

interface FinalizationWarningModalProps {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  fiscalYear: number | string;
  onClose: () => void;
  onProceedDraftPrint: () => void;
}

export const FinalizationWarningModal: React.FC<FinalizationWarningModalProps> = ({
  isOpen,
  clientId,
  clientName,
  fiscalYear,
  onClose,
  onProceedDraftPrint,
}) => {
  const checklist: ClosingStep[] = useMemo(() => {
    if (!clientId) return [];
    return db.getChecklist(clientId, fiscalYear);
  }, [clientId, fiscalYear]);

  const missingSteps = useMemo(() => {
    return checklist.filter((s) => s.required && s.status !== 'DONE' && s.status !== 'NA');
  }, [checklist]);

  const openItems: OpenItem[] = useMemo(() => {
    if (!clientId) return [];
    return db.getOpenItems(clientId, fiscalYear).filter((i) => i.status === 'OPEN' || i.status === 'RECEIVED');
  }, [clientId, fiscalYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-4 p-6 text-right">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>تنبيه عدم إتمام إقفال ملف العميل ({clientName} - {fiscalYear})</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed">
            لم يتم استيفاء جميع خطوات قائمة الإقفال الإجبارية أو توجد بنود مفتوحة معلقة لهذا العميل. بناءً على ضوابط الجودة المهنية، لا يمكن طباعة القوائم بصيغتها النهائية المعتمدة.
          </p>

          {/* Missing Steps List */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              خطوات الإقفال الناقصة أو غير المكتملة ({missingSteps.length}):
            </h4>
            {missingSteps.length === 0 ? (
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold">✓ كافة الخطوات الإجبارية مكتملة.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300">
                {missingSteps.map((step) => (
                  <li key={step.id}>{step.label}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Open Items List */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              البنود المفتوحة والمستندات المعلقة للعميل ({openItems.length}):
            </h4>
            {openItems.length === 0 ? (
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold">✓ لا توجد بنود مفتوحة معلقة.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                {openItems.map((item) => (
                  <li key={item.id}>
                    [{item.kind}] {item.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع وتعديل</span>
          </button>

          <button
            type="button"
            onClick={onProceedDraftPrint}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كمسودة (غير نهائية)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
