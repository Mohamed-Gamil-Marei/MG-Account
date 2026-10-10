import React, { useState, useMemo, useEffect } from 'react';
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
  Send,
} from 'lucide-react';
import { Account, JournalEntry } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances, CalculatedAccount } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { WhatsAppDocumentShareModal } from './archive/WhatsAppDocumentShareModal';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../utils/excelArabicStyler';

interface GeneralLedgerViewProps {
  state: DatabaseState;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ state }) => {
  const activeYear = state.activeClientContext?.selectedFiscalYear || 2026;
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    state.activeClientContext?.clientId || 'ALL'
  );
  const [startDate, setStartDate] = useState<string>(`${activeYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${activeYear}-12-31`);
  const [isWhatsAppShareOpen, setIsWhatsAppShareOpen] = useState(false);

  useEffect(() => {
    if (state.activeClientContext?.clientId) {
      setSelectedClientId(state.activeClientContext.clientId);
    }
  }, [state.activeClientContext?.clientId]);

  useEffect(() => {
    if (state.activeClientContext?.selectedFiscalYear) {
      const yr = state.activeClientContext.selectedFiscalYear;
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    }
  }, [state.activeClientContext?.selectedFiscalYear]);

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

  const handleExportLedgerToExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: Record<string, any>[] = [];

    accountsToDisplay.forEach((acc) => {
      const txs = indexedTransactions.get(acc.id) || [];
      const openingBal = acc.nature === 'DEBIT' ? acc.openingBalanceDebit : acc.openingBalanceCredit;
      let running = openingBal;

      // Account Header Banner Row
      rows.push({
        'التاريخ': `[${acc.code}] ${acc.name}`,
        'رقم القيد': `طبيعة الحساب: ${acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}`,
        'البيان': 'رصيد أول المدة الافتتاحي',
        'العميل / المركز': '-',
        'مدين (ج.م)': acc.openingBalanceDebit || 0,
        'دائن (ج.م)': acc.openingBalanceCredit || 0,
        'الرصيد المتحرك': running,
      });

      txs.forEach((tx) => {
        if (acc.nature === 'DEBIT') {
          running += tx.debit - tx.credit;
        } else {
          running += tx.credit - tx.debit;
        }

        rows.push({
          'التاريخ': tx.date,
          'رقم القيد': tx.serial,
          'البيان': tx.description,
          'العميل / المركز': tx.clientName || '-',
          'مدين (ج.م)': tx.debit || 0,
          'دائن (ج.م)': tx.credit || 0,
          'الرصيد المتحرك': running,
        });
      });

      // Total Account Row
      rows.push({
        'التاريخ': 'إجمالي الحركات',
        'رقم القيد': `حركات: ${txs.length}`,
        'البيان': 'الرصيد الختامي المعتمد',
        'العميل / المركز': '-',
        'مدين (ج.م)': acc.movementDebit || 0,
        'دائن (ج.م)': acc.movementCredit || 0,
        'الرصيد المتحرك': acc.currentBalance || running,
      });

      // Empty separator row
      rows.push({
        'التاريخ': '',
        'رقم القيد': '',
        'البيان': '',
        'العميل / المركز': '',
        'مدين (ج.م)': '',
        'دائن (ج.م)': '',
        'الرصيد المتحرك': '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    formatWorksheetForArabicExport(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, 'دفتر الأستاذ العام');
    const safeTitle = selectedAccountId === 'ALL' ? 'الأستاذ_العام_الشامل' : `كشف_حساب_${accountsToDisplay[0]?.code || 'محدد'}`;
    writeArabicExcelFile(wb, `${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <UnifiedScreenCard
      id="general-ledger-container"
      targetElementId="general-ledger-container"
      printSelector="#general-ledger-container"
      title="دفتر الأستاذ العام وكشوف الحسابات المساعدة"
      subtitle="General & Sub-Ledgers • حركة الحسابات والعملاء والموردين"
      icon={BookOpen}
      actionsSlot={
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-export-ledger-excel"
            onClick={handleExportLedgerToExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="تصدير كشف حساب الأستاذ العام لإكسل"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصدير إكسل</span>
          </button>
          <button
            type="button"
            id="btn-ledger-whatsapp-share"
            onClick={() => setIsWhatsAppShareOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="إرسال كشف الحساب عبر WhatsApp للعميل"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إرسال كشف الحساب للواتساب</span>
            <span className="sm:hidden">واتساب</span>
          </button>
          <ScreenActionToolbar
            modelType="JOURNAL"
            title="دفتر الأستاذ العام وحركات الحسابات"
            targetElementId="general-ledger-container"
            printSelector="#general-ledger-container"
            count={accountsToDisplay.length}
          />
        </div>
      }
    >
      <div id="general-ledger-printable-content" className="space-y-4">
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
                    {cli.name} {cli.taxCardNo ? `(ضريبة: ${cli.taxCardNo})` : ''}
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

      {/* WhatsApp Statement Sharing Modal */}
      {isWhatsAppShareOpen && (
        <WhatsAppDocumentShareModal
          isOpen={isWhatsAppShareOpen}
          onClose={() => setIsWhatsAppShareOpen(false)}
          client={
            selectedClientId !== 'ALL'
              ? state.clients.find((c) => c.id === selectedClientId) || null
              : state.clients.find((c) => c.id === state.activeClientContext?.clientId) || state.clients[0] || null
          }
          state={state}
          initialShareType="ACCOUNT_STATEMENT"
          initialAccountStatement={{
            accountId: selectedAccountId !== 'ALL' ? selectedAccountId : undefined,
            startDate,
            endDate,
          }}
        />
      )}
    </UnifiedScreenCard>
  );
};
