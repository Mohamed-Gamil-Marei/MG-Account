import React, { useState, useMemo } from 'react';
import {
  Scale,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { computeAccountBalances } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import * as XLSX from 'xlsx';

interface TrialBalanceViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const calculatedAccounts = useMemo(() => {
    return computeAccountBalances(state.accounts, state.journalEntries);
  }, [state.accounts, state.journalEntries]);

  // Filter leaf/analytical accounts
  const leafAccounts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return calculatedAccounts.filter(
      (a) =>
        a.level >= 2 &&
        (!term || a.name.toLowerCase().includes(term) || a.code.includes(term))
    );
  }, [calculatedAccounts, searchTerm]);

  // Calculate Totals
  const {
    totalOpeningDebit,
    totalOpeningCredit,
    totalMovementDebit,
    totalMovementCredit,
    totalEndingDebit,
    totalEndingCredit,
  } = useMemo(() => {
    let opDeb = 0;
    let opCred = 0;
    let movDeb = 0;
    let movCred = 0;
    let endDeb = 0;
    let endCred = 0;

    for (const a of leafAccounts) {
      opDeb += a.openingBalanceDebit || 0;
      opCred += a.openingBalanceCredit || 0;
      movDeb += a.movementDebit || 0;
      movCred += a.movementCredit || 0;
      endDeb += a.endingBalanceDebit || 0;
      endCred += a.endingBalanceCredit || 0;
    }

    return {
      totalOpeningDebit: opDeb,
      totalOpeningCredit: opCred,
      totalMovementDebit: movDeb,
      totalMovementCredit: movCred,
      totalEndingDebit: endDeb,
      totalEndingCredit: endCred,
    };
  }, [leafAccounts]);

  const isOpeningBalanced = Math.abs(totalOpeningDebit - totalOpeningCredit) < 0.01;
  const isMovementBalanced = Math.abs(totalMovementDebit - totalMovementCredit) < 0.01;
  const isEndingBalanced = Math.abs(totalEndingDebit - totalEndingCredit) < 0.01;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = leafAccounts.map((a) => ({
      'كود الحساب': a.code,
      'اسم الحساب': a.name,
      'طبيعة الحساب': a.nature === 'DEBIT' ? 'مدين' : 'دائن',
      'افتتاحي مدين': a.openingBalanceDebit || 0,
      'افتتاحي دائن': a.openingBalanceCredit || 0,
      'حركة مدين': a.movementDebit || 0,
      'حركة دائن': a.movementCredit || 0,
      'ختامي مدين': a.endingBalanceDebit || 0,
      'ختامي دائن': a.endingBalanceCredit || 0,
    }));

    rows.push({
      'كود الحساب': 'الإجمالي',
      'اسم الحساب': 'المجموع الكلي المعتمد',
      'طبيعة الحساب': '-',
      'افتتاحي مدين': totalOpeningDebit,
      'افتتاحي دائن': totalOpeningCredit,
      'حركة مدين': totalMovementDebit,
      'حركة دائن': totalMovementCredit,
      'ختامي مدين': totalEndingDebit,
      'ختامي دائن': totalEndingCredit,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');
    XLSX.writeFile(wb, `ميزان_المراجعة_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <UnifiedScreenCard
      id="trial-balance-card"
      title="ميزان المراجعة بالمجاميع والأرصدة"
      subtitle="الميزان ذو الأعمدة الستة المعتمد وفق المعايير المصرية (EAS)"
      icon={Scale}
      badge={isEndingBalanced ? 'متزن محاسبياً ✓' : 'غير متزن ⚠'}
      badgeVariant={isEndingBalanced ? 'emerald' : 'rose'}
      actionMenuItems={[
        {
          id: 'btn-export-tb-excel',
          label: 'تصدير إكسيل رسمي',
          icon: FileSpreadsheet,
          onClick: handleExportExcel,
        },
        {
          id: 'btn-print-tb',
          label: 'طباعة الميزان',
          icon: Printer,
          onClick: () => window.print(),
        },
      ]}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="بحث بكود أو اسم الحساب بالميزان..."
    >
      <div className="space-y-4">
        {/* Verification status boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-bold block text-[11px]">الأرصدة الافتتاحية:</span>
              <span className="font-mono text-slate-900 dark:text-white font-bold mt-0.5 block">
                {formatEgyptianCurrency(totalOpeningDebit)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                isOpeningBalanced
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-rose-950/60 text-red-800 dark:text-rose-300'
              }`}
            >
              {isOpeningBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              <span>{isOpeningBalanced ? 'متزن' : 'فرق'}</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-bold block text-[11px]">حركات الفترة (المجاميع):</span>
              <span className="font-mono text-slate-900 dark:text-white font-bold mt-0.5 block">
                {formatEgyptianCurrency(totalMovementDebit)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                isMovementBalanced
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-rose-950/60 text-red-800 dark:text-rose-300'
              }`}
            >
              {isMovementBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              <span>{isMovementBalanced ? 'متزن' : 'فرق'}</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-bold block text-[11px]">الأرصدة الختامية:</span>
              <span className="font-mono text-emerald-800 dark:text-emerald-400 font-bold mt-0.5 block">
                {formatEgyptianCurrency(totalEndingDebit)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                isEndingBalanced
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-rose-950/60 text-red-800 dark:text-rose-300'
              }`}
            >
              {isEndingBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              <span>{isEndingBalanced ? 'متزن' : 'فرق'}</span>
            </span>
          </div>
        </div>

        {/* Table with 6 Columns - Compact Mode & Zebra Striping */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full text-right border-collapse text-xs accounting-table">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-center">
                <th rowSpan={2} className="py-2 px-2.5 border-l border-slate-200 dark:border-slate-700 text-right">
                  كود
                </th>
                <th rowSpan={2} className="py-2 px-2.5 border-l border-slate-200 dark:border-slate-700 text-right">
                  اسم الحساب
                </th>
                <th colSpan={2} className="py-1 px-2 border-b border-l border-slate-200 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">
                  الأرصدة الافتتاحية
                </th>
                <th colSpan={2} className="py-1 px-2 border-b border-l border-slate-200 dark:border-slate-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">
                  حركات الفترة (المجاميع)
                </th>
                <th colSpan={2} className="py-1 px-2 border-b border-l border-slate-200 dark:border-slate-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300">
                  الأرصدة الختامية
                </th>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold text-center">
                <th className="py-1 px-2 border-l border-slate-200 dark:border-slate-700">مدين</th>
                <th className="py-1 px-2 border-l border-slate-200 dark:border-slate-700">دائن</th>
                <th className="py-1 px-2 border-l border-slate-200 dark:border-slate-700">مدين</th>
                <th className="py-1 px-2 border-l border-slate-200 dark:border-slate-700">دائن</th>
                <th className="py-1 px-2 border-l border-slate-200 dark:border-slate-700">مدين</th>
                <th className="py-1 px-2">دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leafAccounts.map((acc, idx) => (
                <tr
                  key={acc.id}
                  className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                    idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-800 dark:text-emerald-400 border-l border-slate-100 dark:border-slate-800">
                    {acc.code}
                  </td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                    {acc.name}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                    {acc.openingBalanceDebit ? formatEgyptianCurrency(acc.openingBalanceDebit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                    {acc.openingBalanceCredit ? formatEgyptianCurrency(acc.openingBalanceCredit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                    {acc.movementDebit ? formatEgyptianCurrency(acc.movementDebit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                    {acc.movementCredit ? formatEgyptianCurrency(acc.movementCredit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center font-bold text-emerald-800 dark:text-emerald-400 border-l border-slate-100 dark:border-slate-800">
                    {acc.endingBalanceDebit ? formatEgyptianCurrency(acc.endingBalanceDebit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center font-bold text-emerald-800 dark:text-emerald-400">
                    {acc.endingBalanceCredit ? formatEgyptianCurrency(acc.endingBalanceCredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold font-mono text-center">
                <td colSpan={2} className="py-2 px-3 text-right">
                  الإجمالي العام المعتمد:
                </td>
                <td className="py-2 px-2 border-l border-slate-800 text-blue-300">
                  {formatEgyptianCurrency(totalOpeningDebit)}
                </td>
                <td className="py-2 px-2 border-l border-slate-800 text-blue-300">
                  {formatEgyptianCurrency(totalOpeningCredit)}
                </td>
                <td className="py-2 px-2 border-l border-slate-800 text-amber-300">
                  {formatEgyptianCurrency(totalMovementDebit)}
                </td>
                <td className="py-2 px-2 border-l border-slate-800 text-amber-300">
                  {formatEgyptianCurrency(totalMovementCredit)}
                </td>
                <td className="py-2 px-2 border-l border-slate-800 text-emerald-300">
                  {formatEgyptianCurrency(totalEndingDebit)}
                </td>
                <td className="py-2 px-2 text-emerald-300">
                  {formatEgyptianCurrency(totalEndingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </UnifiedScreenCard>
  );
};
