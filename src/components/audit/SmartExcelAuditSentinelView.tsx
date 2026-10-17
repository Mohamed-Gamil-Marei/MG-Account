import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { FileSpreadsheet, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { analyzeAuditDataset } from '../../utils/excelAuditEngine';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface SmartExcelAuditSentinelViewProps {
  state: DatabaseState;
}

export const SmartExcelAuditSentinelView: React.FC<SmartExcelAuditSentinelViewProps> = ({ state }) => {
  const [summary, setSummary] = useState(() => {
    const sampleRows = (state.journalEntries || []).flatMap((je, idx) =>
      (je.lines || []).map((l, lIdx) => ({
        rowNumber: idx * 10 + lIdx + 1,
        entryNumber: String(je.entryNumber || idx + 1),
        date: je.date,
        accountCode: l.accountCode || '',
        accountName: l.accountName || '',
        description: l.description || je.description || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    );
    return analyzeAuditDataset(sampleRows);
  });

  const handleRecalculate = () => {
    const rows = (state.journalEntries || []).flatMap((je, idx) =>
      (je.lines || []).map((l, lIdx) => ({
        rowNumber: idx * 10 + lIdx + 1,
        entryNumber: String(je.entryNumber || idx + 1),
        date: je.date,
        accountCode: l.accountCode || '',
        accountName: l.accountName || '',
        description: l.description || je.description || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    );
    setSummary(analyzeAuditDataset(rows));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              حارس التدقيق الذكي لملفات الإكسيل وموازين المراجعة (Excel Audit Sentinel)
            </h2>
            <p className="text-xs text-slate-500">
              فحص قانون بنفورد (Benford&apos;s Law) وكشف الشذوذ الإحصائي وتوازن القيود المستوردة
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700"
        >
          <Sparkles className="w-4 h-4" />
          <span>إعادة فحص الدفاتر الحالية</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">إجمالي السطور المفحوصة</div>
          <div className="text-lg font-black font-mono mt-1">{summary.totalRows}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">إجمالي المدين</div>
          <div className="text-lg font-black font-mono text-emerald-700 mt-1">
            {formatEgyptianCurrency(summary.totalDebit, true)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">إجمالي الدائن</div>
          <div className="text-lg font-black font-mono text-indigo-700 mt-1">
            {formatEgyptianCurrency(summary.totalCredit, true)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500">حالة التوازن ومؤشر بنفورد</div>
          <div className="mt-1 flex items-center gap-1.5 font-bold">
            {summary.isBalanced ? (
              <span className="text-emerald-700 inline-flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> متوازن وسليم
              </span>
            ) : (
              <span className="text-amber-700 inline-flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> يوجد ملاحظات
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
