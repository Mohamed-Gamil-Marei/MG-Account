import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ArrowUpDown,
  Building2,
  Users,
} from 'lucide-react';
import { Account, JournalEntry } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances, CalculatedAccount } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';

interface GeneralLedgerViewProps {
  state: DatabaseState;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ state }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  const calculatedAccounts = useMemo(() => {
    return computeAccountBalances(state.accounts, state.journalEntries);
  }, [state.accounts, state.journalEntries]);

  // Fast single-pass pre-indexing of ledger transactions by account ID
  const indexedTransactions = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        serial: string;
        description: string;
        debit: number;
        credit: number;
        clientId?: string | null;
        clientName?: string;
      }[]
    >();

    const posted = state.journalEntries.filter((e) => e.isPosted);
    for (const entry of posted) {
      if (entry.date >= startDate && entry.date <= endDate) {
        if (selectedClientId !== 'ALL' && entry.clientId !== selectedClientId) {
          continue;
        }

        const clientObj = entry.clientId ? state.clients.find((c) => c.id === entry.clientId) : undefined;

        for (const line of entry.lines) {
          if (!line.accountId) continue;
          if (!map.has(line.accountId)) {
            map.set(line.accountId, []);
          }
          map.get(line.accountId)!.push({
            date: entry.date,
            serial: entry.serialNumber,
            description: line.description || entry.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            clientId: entry.clientId,
            clientName: clientObj?.name,
          });
        }
      }
    }
    return map;
  }, [state.journalEntries, state.clients, startDate, endDate, selectedClientId]);

  // Accounts to display
  const accountsToDisplay = useMemo(() => {
    return selectedAccountId === 'ALL'
      ? calculatedAccounts.filter((a) => a.level >= 2)
      : calculatedAccounts.filter((a) => a.id === selectedAccountId);
  }, [selectedAccountId, calculatedAccounts]);

  return (
    <UnifiedScreenCard
      title="دفتر الأستاذ العام وكشوف الحسابات المساعدة"
      subtitle="General & Sub-Ledgers • حركة الحسابات والعملاء والموردين"
      icon={BookOpen}
      actionsSlot={
        <ScreenActionToolbar
          modelType="JOURNAL"
          title="دفتر الأستاذ العام وحركات الحسابات"
          count={accountsToDisplay.length}
        />
      }
    >
      <div className="space-y-4">
        {/* Account Selector, Client Filter and Date Filters */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full lg:w-auto flex-1">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الحساب المحاسبي الرئيسي:</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">-- عرض كافة الحسابات (شامل) --</option>
                {state.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>كشف حساب فرعي / مساعد (العميل أو المورد):</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs text-blue-900 dark:text-blue-300 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">-- جميع الشركات والجهات الفرعية --</option>
                {state.clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} {cli.taxNumber ? `(ضريبة: ${cli.taxNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">من تاريخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">إلى تاريخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Ledger Accounts Cards */}
        <div className="space-y-4">
          {accountsToDisplay.map((acc) => {
            const ledgerTransactions = indexedTransactions.get(acc.id) || [];
            const initialOpening = acc.nature === 'DEBIT' ? acc.openingBalanceDebit : -acc.openingBalanceCredit;
            let runningBalance = initialOpening;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:border-black"
              >
                {/* Account Header */}
                <div className="bg-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30">
                      {acc.code}
                    </span>
                    <span className="font-bold text-xs sm:text-sm">{acc.name}</span>
                    <span className="text-[11px] text-slate-300">
                      ({acc.nature === 'DEBIT' ? 'مدين' : 'دائن'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span>الرصيد الافتتاحي: <strong className="font-mono">{formatEgyptianCurrency(acc.nature === 'DEBIT' ? acc.openingBalanceDebit : acc.openingBalanceCredit)}</strong></span>
                    <span className="text-slate-500">|</span>
                    <span className="text-emerald-300 font-bold">
                      الرصيد الختامي: <strong className="font-mono text-white">{formatEgyptianCurrency(acc.currentBalance || 0)}</strong>
                    </span>
                  </div>
                </div>

                {/* Transactions Table - Compact Mode & Zebra Striping */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs accounting-table">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-1.5 px-2.5">التاريخ</th>
                        <th className="py-1.5 px-2.5">رقم القيد</th>
                        <th className="py-1.5 px-2.5">البيان</th>
                        <th className="py-1.5 px-2.5 text-left">مدين</th>
                        <th className="py-1.5 px-2.5 text-left">دائن</th>
                        <th className="py-1.5 px-2.5 text-left">الرصيد المتحرك</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Opening balance row */}
                      <tr className="bg-slate-50/40 text-slate-500 italic">
                        <td className="py-1.5 px-2.5 font-mono">{startDate}</td>
                        <td className="py-1.5 px-2.5">-</td>
                        <td className="py-1.5 px-2.5 font-semibold">رصيد أول المدة / افتتاحي</td>
                        <td className="py-1.5 px-2.5 text-left font-mono">{acc.openingBalanceDebit > 0 ? formatEgyptianCurrency(acc.openingBalanceDebit) : '-'}</td>
                        <td className="py-1.5 px-2.5 text-left font-mono">{acc.openingBalanceCredit > 0 ? formatEgyptianCurrency(acc.openingBalanceCredit) : '-'}</td>
                        <td className="py-1.5 px-2.5 text-left font-mono font-bold text-slate-900 dark:text-slate-100">{formatEgyptianCurrency(Math.abs(runningBalance))}</td>
                      </tr>

                      {ledgerTransactions.map((tx, idx) => {
                        if (acc.nature === 'DEBIT') {
                          runningBalance += tx.debit - tx.credit;
                        } else {
                          runningBalance += tx.credit - tx.debit;
                        }

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                              idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">{tx.date}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-800 dark:text-emerald-400">{tx.serial}</td>
                            <td className="py-1.5 px-2.5 text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{tx.description}</span>
                                {tx.clientName && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                    <Users className="w-2.5 h-2.5 text-blue-600" />
                                    {tx.clientName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-left text-blue-900 dark:text-blue-400">
                              {tx.debit > 0 ? formatEgyptianCurrency(tx.debit) : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-left text-amber-900 dark:text-amber-400">
                              {tx.credit > 0 ? formatEgyptianCurrency(tx.credit) : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-left text-slate-900 dark:text-slate-100">
                              {formatEgyptianCurrency(Math.abs(runningBalance))}
                            </td>
                          </tr>
                        );
                      })}

                      {ledgerTransactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-3 text-center text-slate-400 text-xs">
                            لا توجد حركات ترحيل خلال الفترة المحددة لهذا الحساب.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* Ledger Account Totals */}
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={3} className="py-2 px-3 text-left">
                          إجمالي الحركات والرصيد الختامي:
                        </td>
                        <td className="py-2 px-3 font-mono text-left text-blue-950 dark:text-blue-300">
                          {formatEgyptianCurrency(acc.movementDebit || 0)}
                        </td>
                        <td className="py-2 px-3 font-mono text-left text-amber-950 dark:text-amber-300">
                          {formatEgyptianCurrency(acc.movementCredit || 0)}
                        </td>
                        <td className="py-2 px-3 font-mono text-left text-emerald-950 dark:text-emerald-300 font-bold">
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
    </UnifiedScreenCard>
  );
};
