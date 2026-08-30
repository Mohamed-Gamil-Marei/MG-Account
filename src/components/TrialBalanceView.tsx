import React, { useState, useMemo } from 'react';
import {
  Scale,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import * as XLSX from 'xlsx';

interface TrialBalanceViewProps {
  state: DatabaseState;
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

  const isOpeningBalanced = Math.abs(totalOpeningDebit - totalOpeningCredit) < 1;
  const isMovementBalanced = Math.abs(totalMovementDebit - totalMovementCredit) < 1;
  const isEndingBalanced = Math.abs(totalEndingDebit - totalEndingCredit) < 1;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = leafAccounts.map((a) => ({
      'كود الحساب': a.code,
      'اسم الحساب': a.name,
      'افتتاحي مدين': a.openingBalanceDebit,
      'افتتاحي دائن': a.openingBalanceCredit,
      'حركات مدين': a.movementDebit,
      'حركات دائن': a.movementCredit,
      'ختامي مدين': a.endingBalanceDebit,
      'ختامي دائن': a.endingBalanceCredit,
    }));

    // Add totals row
    rows.push({
      'كود الحساب': 'المجموع',
      'اسم الحساب': 'إجمالي ميزان المراجعة بالمجاميع والأرصدة',
      'افتتاحي مدين': totalOpeningDebit,
      'افتتاحي دائن': totalOpeningCredit,
      'حركات مدين': totalMovementDebit,
      'حركات دائن': totalMovementCredit,
      'ختامي مدين': totalEndingDebit,
      'ختامي دائن': totalEndingCredit,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');
    XLSX.writeFile(wb, `ميزان_المراجعة_بالمجاميع_والأرصدة_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ميزان المراجعة المصري ذو الأعمدة الستة (الأرصدة الافتتاحية + حركات الفترة + الأرصدة الختامية).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ScreenActionToolbar
            modelType="ACCOUNTS"
            title="ميزان المراجعة بالمجاميع والأرصدة"
            count={leafAccounts.length}
          />
        </div>
      </div>

      {/* Verification status boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">الأرصدة الافتتاحية:</span>
            <span className="font-mono text-slate-900 font-bold mt-0.5 block">
              {formatEgyptianCurrency(totalOpeningDebit)}
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              isOpeningBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isOpeningBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isOpeningBalanced ? 'متزن' : 'غير متزن'}</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">حركات الفترة (المجاميع):</span>
            <span className="font-mono text-slate-900 font-bold mt-0.5 block">
              {formatEgyptianCurrency(totalMovementDebit)}
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              isMovementBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isMovementBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isMovementBalanced ? 'متزن' : 'غير متزن'}</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">الأرصدة الختامية:</span>
            <span className="font-mono text-emerald-800 font-bold mt-0.5 block">
              {formatEgyptianCurrency(totalEndingDebit)}
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              isEndingBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isEndingBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isEndingBalanced ? 'متزن محاسبياً' : 'غير متزن'}</span>
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في الحسابات بالميزان..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* 6-Column Trial Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              {/* Grouped Header */}
              <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                <th rowSpan={2} className="py-3 px-4 border-l border-slate-700">كود الحساب</th>
                <th rowSpan={2} className="py-3 px-4 border-l border-slate-700">اسم الحساب</th>
                <th colSpan={2} className="py-2 px-4 text-center border-l border-slate-700 bg-slate-900/60">
                  الأرصدة الافتتاحية
                </th>
                <th colSpan={2} className="py-2 px-4 text-center border-l border-slate-700 bg-slate-900/40">
                  حركات الفترة (المجاميع)
                </th>
                <th colSpan={2} className="py-2 px-4 text-center bg-emerald-950/60 text-emerald-200">
                  الأرصدة الختامية بعد التسويات
                </th>
              </tr>
              <tr className="bg-slate-700 text-slate-200 font-semibold border-b border-slate-600">
                <th className="py-2 px-3 text-left border-l border-slate-600">مدين (ج.م)</th>
                <th className="py-2 px-3 text-left border-l border-slate-600">دائن (ج.م)</th>
                <th className="py-2 px-3 text-left border-l border-slate-600">مدين (ج.م)</th>
                <th className="py-2 px-3 text-left border-l border-slate-600">دائن (ج.م)</th>
                <th className="py-2 px-3 text-left border-l border-slate-600 text-emerald-300">مدين (ج.م)</th>
                <th className="py-2 px-3 text-left text-amber-300">دائن (ج.م)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {leafAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-emerald-800 border-l border-slate-100">{acc.code}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900 border-l border-slate-100">{acc.name}</td>
                  <td className="py-2.5 px-3 text-left text-slate-700 border-l border-slate-100">
                    {acc.openingBalanceDebit > 0 ? formatEgyptianCurrency(acc.openingBalanceDebit) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left text-slate-700 border-l border-slate-100">
                    {acc.openingBalanceCredit > 0 ? formatEgyptianCurrency(acc.openingBalanceCredit) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left text-blue-900 font-bold border-l border-slate-100">
                    {acc.movementDebit > 0 ? formatEgyptianCurrency(acc.movementDebit) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left text-amber-900 font-bold border-l border-slate-100">
                    {acc.movementCredit > 0 ? formatEgyptianCurrency(acc.movementCredit) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left text-emerald-800 font-black border-l border-slate-100">
                    {acc.endingBalanceDebit > 0 ? formatEgyptianCurrency(acc.endingBalanceDebit) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left text-amber-800 font-black">
                    {acc.endingBalanceCredit > 0 ? formatEgyptianCurrency(acc.endingBalanceCredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 font-mono">
                <td colSpan={2} className="py-3 px-4 font-sans font-black text-slate-900 border-l border-slate-200">
                  الإجمالي العام لميزان المراجعة:
                </td>
                <td className="py-3 px-3 text-left border-l border-slate-200">{formatEgyptianCurrency(totalOpeningDebit)}</td>
                <td className="py-3 px-3 text-left border-l border-slate-200">{formatEgyptianCurrency(totalOpeningCredit)}</td>
                <td className="py-3 px-3 text-left text-blue-950 border-l border-slate-200">{formatEgyptianCurrency(totalMovementDebit)}</td>
                <td className="py-3 px-3 text-left text-amber-950 border-l border-slate-200">{formatEgyptianCurrency(totalMovementCredit)}</td>
                <td className="py-3 px-3 text-left text-emerald-950 font-black border-l border-slate-200">{formatEgyptianCurrency(totalEndingDebit)}</td>
                <td className="py-3 px-3 text-left text-amber-950 font-black">{formatEgyptianCurrency(totalEndingCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
