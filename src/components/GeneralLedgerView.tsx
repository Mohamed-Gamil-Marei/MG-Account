import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Account, JournalEntry } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances, CalculatedAccount } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface GeneralLedgerViewProps {
  state: DatabaseState;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ state }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  const calculatedAccounts = computeAccountBalances(state.accounts, state.journalEntries);
  const postedEntries = state.journalEntries.filter((e) => e.isPosted);

  // Accounts to display
  const accountsToDisplay = selectedAccountId === 'ALL'
    ? calculatedAccounts.filter((a) => a.level >= 2)
    : calculatedAccounts.filter((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              دفتر الأستاذ العام التفصيلي (General Ledger)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            كشف حركة الحسابات التفصيلي مع بيان الرصيد الافتتاحي، الحركات اليومية، والرصيد المتحرك بعد كل قيد.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة كشف الأستاذ</span>
          </button>
        </div>
      </div>

      {/* Account Selector and Date Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full md:w-80">
          <label className="block text-slate-700 font-bold mb-1">اختر الحساب المحاسبي المراد عرضه:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
          >
            <option value="ALL">-- عرض كافة الحسابات (شامل) --</option>
            {state.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                [{acc.code}] {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-slate-700 font-bold mb-1">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
            />
          </div>
        </div>
      </div>

      {/* Ledger Accounts Cards */}
      <div className="space-y-6">
        {accountsToDisplay.map((acc) => {
          // Extract entries matching this account within date range
          const ledgerTransactions: {
            date: string;
            serial: string;
            description: string;
            debit: number;
            credit: number;
          }[] = [];

          for (const entry of postedEntries) {
            if (entry.date >= startDate && entry.date <= endDate) {
              for (const line of entry.lines) {
                if (line.accountId === acc.id) {
                  ledgerTransactions.push({
                    date: entry.date,
                    serial: entry.serialNumber,
                    description: line.description || entry.description,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                  });
                }
              }
            }
          }

          const initialOpening = acc.nature === 'DEBIT' ? acc.openingBalanceDebit : -acc.openingBalanceCredit;
          let runningBalance = initialOpening;

          return (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-black"
            >
              {/* Account Header */}
              <div className="bg-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30">
                    {acc.code}
                  </span>
                  <span className="font-bold text-sm">{acc.name}</span>
                  <span className="text-xs text-slate-300">
                    (طبيعة الحساب: {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'})
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span>الرصيد الافتتاحي: <strong className="font-mono">{formatEgyptianCurrency(acc.nature === 'DEBIT' ? acc.openingBalanceDebit : acc.openingBalanceCredit)}</strong></span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-300 font-bold">
                    الرصيد الختامي: <strong className="font-mono text-white">{formatEgyptianCurrency(acc.currentBalance || 0)}</strong>
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">التاريخ</th>
                      <th className="py-2.5 px-4">رقم القيد</th>
                      <th className="py-2.5 px-4">البيان والشرح</th>
                      <th className="py-2.5 px-4 text-left">حركة مدين (ج.م)</th>
                      <th className="py-2.5 px-4 text-left">حركة دائن (ج.م)</th>
                      <th className="py-2.5 px-4 text-left">الرصيد المتحرك (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Opening balance row */}
                    <tr className="bg-slate-50/40 text-slate-500 italic">
                      <td className="py-2 px-4 font-mono">{startDate}</td>
                      <td className="py-2 px-4">-</td>
                      <td className="py-2 px-4 font-semibold">رصيد أول المدة / افتتاحي</td>
                      <td className="py-2 px-4 text-left font-mono">{acc.openingBalanceDebit > 0 ? formatEgyptianCurrency(acc.openingBalanceDebit) : '-'}</td>
                      <td className="py-2 px-4 text-left font-mono">{acc.openingBalanceCredit > 0 ? formatEgyptianCurrency(acc.openingBalanceCredit) : '-'}</td>
                      <td className="py-2 px-4 text-left font-mono font-bold text-slate-900">{formatEgyptianCurrency(Math.abs(runningBalance))}</td>
                    </tr>

                    {ledgerTransactions.map((tx, idx) => {
                      if (acc.nature === 'DEBIT') {
                        runningBalance += tx.debit - tx.credit;
                      } else {
                        runningBalance += tx.credit - tx.debit;
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-slate-600">{tx.date}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">{tx.serial}</td>
                          <td className="py-2.5 px-4 text-slate-800">{tx.description}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-left text-blue-900">
                            {tx.debit > 0 ? formatEgyptianCurrency(tx.debit) : '-'}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-left text-amber-900">
                            {tx.credit > 0 ? formatEgyptianCurrency(tx.credit) : '-'}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-black text-left text-slate-900">
                            {formatEgyptianCurrency(Math.abs(runningBalance))}
                          </td>
                        </tr>
                      );
                    })}

                    {ledgerTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                          لا توجد حركات ترحيل خلال الفترة المحددة لهذا الحساب.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Ledger Account Totals */}
                  <tfoot>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-t border-slate-200">
                      <td colSpan={3} className="py-2.5 px-4 text-left">
                        إجمالي الحركات والرصيد الختامي للحساب:
                      </td>
                      <td className="py-2.5 px-4 font-mono text-left text-blue-950">
                        {formatEgyptianCurrency(acc.movementDebit || 0)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-left text-amber-950">
                        {formatEgyptianCurrency(acc.movementCredit || 0)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-left text-emerald-950 font-black">
                        {formatEgyptianCurrency(acc.currentBalance || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
