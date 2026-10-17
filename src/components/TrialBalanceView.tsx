import React, { useMemo } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { Scale, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PrintService } from '../services/PrintService';

export interface TrialBalanceViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({ state, fiscalYear = 2026 }) => {
  const rows = useMemo(() => {
    const activeClientId = state.activeClientContext?.autoFilterEnabled
      ? state.activeClientContext.clientId
      : null;

    const postedEntries = (state.journalEntries || []).filter((je) => {
      if (!je.isPosted) return false;
      if (activeClientId && je.clientId && je.clientId !== activeClientId) return false;
      return true;
    });

    const movementMap = new Map<string, { debit: number; credit: number }>();
    for (const je of postedEntries) {
      for (const line of je.lines || []) {
        const key = line.accountId || line.accountCode || '';
        const prev = movementMap.get(key) || { debit: 0, credit: 0 };
        prev.debit += Number(line.debit) || 0;
        prev.credit += Number(line.credit) || 0;
        movementMap.set(key, prev);
      }
    }

    return (state.accounts || []).map((acc) => {
      const mov = movementMap.get(acc.id) || movementMap.get(acc.code) || { debit: 0, credit: 0 };
      const openDr = Number(acc.openingBalanceDebit) || 0;
      const openCr = Number(acc.openingBalanceCredit) || 0;
      const totalDr = openDr + mov.debit;
      const totalCr = openCr + mov.credit;
      const net = totalDr - totalCr;
      return {
        ...acc,
        openDr,
        openCr,
        movDr: mov.debit,
        movCr: mov.credit,
        closeDr: net > 0 ? net : 0,
        closeCr: net < 0 ? Math.abs(net) : 0,
      };
    });
  }, [state.accounts, state.journalEntries, state.activeClientContext]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.openDr += r.openDr;
        acc.openCr += r.openCr;
        acc.movDr += r.movDr;
        acc.movCr += r.movCr;
        acc.closeDr += r.closeDr;
        acc.closeCr += r.closeCr;
        return acc;
      },
      { openDr: 0, openCr: 0, movDr: 0, movCr: 0, closeDr: 0, closeCr: 0 }
    );
  }, [rows]);

  const isBalanced = Math.abs(totals.closeDr - totals.closeCr) < 0.01;

  return (
    <div id="trial-balance-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              ميزان المراجعة بالمجاميع والأرصدة • السنة المالية {fiscalYear}
            </h2>
            <p className="text-xs text-slate-500">
              عرض الأرصدة الافتتاحية وحركة الفترة والأرصدة الختامية المعتمدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isBalanced
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {isBalanced ? 'ميزان المراجعة متوازن' : 'يوجد فرق توازن'}
          </span>
          <button
            type="button"
            onClick={() =>
              PrintService.printElementById('trial-balance-printable', {
                documentTitle: `ميزان المراجعة - ${fiscalYear}`,
              })
            }
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الميزان</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-2.5">كود الحساب</th>
              <th className="p-2.5">اسم الحساب</th>
              <th className="p-2.5 text-center">أول المدة (مدين)</th>
              <th className="p-2.5 text-center">أول المدة (دائن)</th>
              <th className="p-2.5 text-center">الحركة (مدين)</th>
              <th className="p-2.5 text-center">الحركة (دائن)</th>
              <th className="p-2.5 text-center">الرصيد الختامي (مدين)</th>
              <th className="p-2.5 text-center">الرصيد الختامي (دائن)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2.5 font-mono font-bold">{r.code}</td>
                <td className="p-2.5 font-bold">{r.name}</td>
                <td className="p-2.5 text-center font-mono">{formatEgyptianCurrency(r.openDr)}</td>
                <td className="p-2.5 text-center font-mono">{formatEgyptianCurrency(r.openCr)}</td>
                <td className="p-2.5 text-center font-mono">{formatEgyptianCurrency(r.movDr)}</td>
                <td className="p-2.5 text-center font-mono">{formatEgyptianCurrency(r.movCr)}</td>
                <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{formatEgyptianCurrency(r.closeDr)}</td>
                <td className="p-2.5 text-center font-mono font-bold text-indigo-700">{formatEgyptianCurrency(r.closeCr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-900">
              <td colSpan={2} className="p-3">الإجمالي العام</td>
              <td className="p-3 text-center font-mono">{formatEgyptianCurrency(totals.openDr)}</td>
              <td className="p-3 text-center font-mono">{formatEgyptianCurrency(totals.openCr)}</td>
              <td className="p-3 text-center font-mono">{formatEgyptianCurrency(totals.movDr)}</td>
              <td className="p-3 text-center font-mono">{formatEgyptianCurrency(totals.movCr)}</td>
              <td className="p-3 text-center font-mono text-emerald-800">{formatEgyptianCurrency(totals.closeDr)}</td>
              <td className="p-3 text-center font-mono text-indigo-800">{formatEgyptianCurrency(totals.closeCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
