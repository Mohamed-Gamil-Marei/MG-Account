import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Printer,
  Calendar,
  Check,
  FileText,
  User,
  Info,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import {
  ClosingStep,
  ClosingStepStatus,
  createDefaultChecklist,
  canFinalize,
} from '../../utils/closingChecklist';

interface ClosingChecklistPanelProps {
  clientId: string;
  clientName: string;
  initialYear?: number;
}

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022];

export const ClosingChecklistPanel: React.FC<ClosingChecklistPanelProps> = ({
  clientId,
  clientName,
  initialYear = 2026,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [checklist, setChecklist] = useState<ClosingStep[]>([]);
  const [editingNoteStepId, setEditingNoteStepId] = useState<string | null>(null);

  // Load checklist whenever clientId or selectedYear changes
  useEffect(() => {
    const loaded = db.getChecklist(clientId, selectedYear);
    setChecklist(loaded);
  }, [clientId, selectedYear]);

  const finalizationResult = useMemo(() => canFinalize(checklist), [checklist]);

  const stats = useMemo(() => {
    const total = checklist.length;
    const doneCount = checklist.filter((s) => s.status === 'DONE').length;
    const naCount = checklist.filter((s) => s.status === 'NA' && s.note && s.note.trim()).length;
    const completed = doneCount + naCount;
    const pendingCount = total - completed;
    return { total, doneCount, naCount, completed, pendingCount };
  }, [checklist]);

  const currentUser = useMemo(() => db.getCurrentUser(), []);

  // Open Items check for this client & fiscal year (Requirement 3)
  const pendingOpenItems = useMemo(() => {
    return db.getOpenItems(clientId, selectedYear).filter((i) => i.status === 'OPEN' || i.status === 'RECEIVED');
  }, [clientId, selectedYear]);

  const handleStatusChange = (stepId: string, newStatus: ClosingStepStatus) => {
    const updated = checklist.map((step) => {
      if (step.id === stepId) {
        const nowStr = new Date().toLocaleString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          ...step,
          status: newStatus,
          doneBy: newStatus === 'PENDING' ? undefined : currentUser?.name || 'محاسب عام',
          doneAt: newStatus === 'PENDING' ? undefined : nowStr,
        };
      }
      return step;
    });

    setChecklist(updated);
    db.saveChecklist(clientId, selectedYear, updated);
  };

  const handleNoteChange = (stepId: string, newNote: string) => {
    const updated = checklist.map((step) => {
      if (step.id === stepId) {
        return { ...step, note: newNote };
      }
      return step;
    });

    setChecklist(updated);
    db.saveChecklist(clientId, selectedYear, updated);
  };

  const handleResetChecklist = () => {
    if (window.confirm('هل أنت تأكد من إعادة ضبط قائمة الإقفال إلى الحالة الافتراضية؟')) {
      const defaults = createDefaultChecklist();
      setChecklist(defaults);
      db.saveChecklist(clientId, selectedYear, defaults);
    }
  };

  const handlePrintChecklist = () => {
    const yearStr = String(selectedYear);
    const openItemsNoticeHtml = pendingOpenItems.length > 0
      ? `<div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 10px; margin-top: 15px; border-radius: 6px; font-size: 12px; color: #92400e;">
           <strong>تحذير رقابي قبل الاعتماد النهائي:</strong> يوجد عدد (${pendingOpenItems.length}) بنود ومستندات مفتوحة/معلقة للعميل عن السنة المالية ${yearStr}:
           <ul style="margin-top: 5px; padding-right: 20px;">
             ${pendingOpenItems.map((item) => `<li>[${item.kind}] ${item.text}</li>`).join('')}
           </ul>
         </div>`
      : '';

    const html = `
      <div style="font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; padding: 20px;">
        <h2 style="font-size: 20px; font-weight: bold; border-bottom: 2px solid #334155; padding-bottom: 8px;">
          قائمة الإقفال المعتمدة للملف المالي - ${clientName} (${yearStr})
        </h2>
        <p style="margin: 10px 0; color: #475569; font-size: 13px;">
          حالة الاعتماد: <strong>${finalizationResult.ok ? 'مكتملة ومستوفاة' : 'غير مكتملة'}</strong> | المحاسب المسؤول: ${currentUser?.name || 'مكتب المحاسبة'}
        </p>

        ${openItemsNoticeHtml}

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: right;">
              <th style="border: 1px solid #cbd5e1; padding: 8px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">إجراء الإقفال</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">الشرط</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">الحالة</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">المسؤول والتاريخ</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">ملاحظات / مبرر التخطي</th>
            </tr>
          </thead>
          <tbody>
            ${checklist
              .map(
                (step, idx) => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${step.label}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${step.required ? 'إجباري' : 'اختياري'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                  ${
                    step.status === 'DONE'
                      ? 'مكتمل'
                      : step.status === 'NA'
                      ? 'غير مطبق'
                      : 'قيد الانتظار'
                  }
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">
                  ${step.doneBy ? `${step.doneBy} (${step.doneAt || ''})` : '-'}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${step.note || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <title>قائمة إقفال ${clientName} - ${yearStr}</title>
            <style>
              body { font-family: system-ui, sans-serif; direction: rtl; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
              th { background: #f0f0f0; }
            </style>
          </head>
          <body>
            ${html}
            <script>window.onload = function() { window.print(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 text-right">
      {/* Top Header Controls & Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Client & Fiscal Year Selection */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              قائمة الإقفال المالي والرقابي (Closing Checklist)
            </h3>
            <p className="text-xs text-slate-500">
              العميل: <span className="font-bold text-slate-700 dark:text-slate-300">{clientName}</span>
            </p>
          </div>
        </div>

        {/* Year Selector & Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">السنة المالية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y} className="text-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrintChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة القائمة
          </button>

          <button
            onClick={handleResetChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            title="إعادة القائمة إلى حالتها الافتراضية الأولية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة ضبط
          </button>
        </div>
      </div>

      {/* Pending Open Items Warning Banner (Requirement 3) */}
      {pendingOpenItems.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              تنبيه: يوجد عدد <strong className="font-mono text-sm underline">{pendingOpenItems.length}</strong> بنود مفتوحة (مستندات/أسئلة معلقة) لهذا العميل عن السنة المالية {selectedYear}.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium shrink-0">
            (تنبيه تحذيري لا يمنع الإقفال المالي، ولكن يُدرج في تقرير الاعتماد والطباعة)
          </span>
        </div>
      )}

      {/* Finalization Readiness Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${
          finalizationResult.ok
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {finalizationResult.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-bold text-sm">
              {finalizationResult.ok
                ? 'جاهز للإقفال النهائي - كل خطوات الإقفال المالي مستوفاة بالكامل'
                : `غير جاهز للإقفال النهائي - متبقي ${finalizationResult.missing.length} خطوة مطلوبة`}
            </span>
            {!finalizationResult.ok && (
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                الخطوات المتبقية: {finalizationResult.missing.join(' • ')}
              </p>
            )}
          </div>
        </div>

        {/* Progress Counter Summary */}
        <div className="flex items-center gap-3 shrink-0 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs">
          <span>
            الإنجاز: <strong className="text-slate-900 dark:text-slate-100">{stats.completed}</strong> / {stats.total}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">مكتمل: {stats.doneCount}</span>
          {stats.naCount > 0 && (
            <span className="text-blue-700 dark:text-blue-400 font-semibold">تخطي: {stats.naCount}</span>
          )}
          {stats.pendingCount > 0 && (
            <span className="text-amber-700 dark:text-amber-400 font-semibold">معلق: {stats.pendingCount}</span>
          )}
        </div>
      </div>

      {/* Checklist Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">خطوة الإقفال</th>
                <th className="py-2.5 px-3 text-center w-28">الشرط</th>
                <th className="py-2.5 px-3 text-center w-48">الحالة والإجراء</th>
                <th className="py-2.5 px-3 w-48">إنجاز بواسطة</th>
                <th className="py-2.5 px-3">ملاحظات / سبب التخطي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {checklist.map((step, index) => {
                const isNaMissingNote = step.status === 'NA' && (!step.note || !step.note.trim());
                return (
                  <tr
                    key={step.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                      isNaMissingNote ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                      {index + 1}
                    </td>

                    {/* Step Label */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {step.label}
                    </td>

                    {/* Requirement tag */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        مطلوبة
                      </span>
                    </td>

                    {/* Status Toggle Buttons */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(step.id, 'PENDING')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            step.status === 'PENDING'
                              ? 'bg-slate-700 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          معلق
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(step.id, 'DONE')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            step.status === 'DONE'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                          }`}
                        >
                          تم
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(step.id, 'NA')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            step.status === 'NA'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                          }`}
                        >
                          تخطي
                        </button>
                      </div>
                    </td>

                    {/* Done By / Done At */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {step.doneBy ? (
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {step.doneBy}
                          </div>
                          {step.doneAt && <div className="text-[10px] text-slate-400">{step.doneAt}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Note Input */}
                    <td className="py-2.5 px-3">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={step.note || ''}
                          onChange={(e) => handleNoteChange(step.id, e.target.value)}
                          placeholder={
                            step.status === 'NA'
                              ? 'أدخل سبب التخطي (مطلوب للتعميد)'
                              : 'ملاحظات اختيارية...'
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-none transition ${
                            isNaMissingNote
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 placeholder-red-400 font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-slate-500'
                          }`}
                        />
                        {isNaMissingNote && (
                          <span className="absolute left-2 text-[10px] text-red-600 dark:text-red-400 font-bold">
                            سبب التخطي مطلوب
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
