import React, { useState, useMemo, useRef } from 'react';
import {
  Building,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  FileCheck,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Layers,
  Upload,
  FileUp,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { BankStatementLine, BankReconciliationSession } from '../../types';
import { autoMatchBankStatement } from '../../utils/performanceEngine';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface BankReconciliationViewProps {
  state: DatabaseState;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({ state }) => {
  // Find bank accounts from the chart of accounts
  const bankAccounts = useMemo(() => {
    return state.accounts.filter(
      (a) =>
        a.code.startsWith('1102') ||
        a.code.startsWith('102') ||
        a.name.includes('بنك') ||
        a.name.includes('حساب جاري')
    );
  }, [state.accounts]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    bankAccounts[0]?.id || 'acc-bank-cib'
  );

  const selectedAccount = useMemo(() => {
    return (
      bankAccounts.find((a) => a.id === selectedAccountId) ||
      bankAccounts[0] || {
        id: 'acc-bank-cib',
        code: '110201',
        name: 'البنك التجاري الدولي - CIB (حساب جاري رئيسي)',
        currentBalance: 3450000,
        openingBalanceDebit: 3450000,
        openingBalanceCredit: 0,
      }
    );
  }, [bankAccounts, selectedAccountId]);

  // Initial demo bank statement lines
  const [statementLines, setStatementLines] = useState<BankStatementLine[]>([
    {
      id: 'st-01',
      date: '2026-01-05',
      reference: 'TXN-984210',
      description: 'تحويل بنكي وارد - سداد عميل شركة الأمل',
      debit: 0,
      credit: 450000,
      isMatched: true,
      matchedEntryRef: 'JV-2026-0001',
      matchConfidence: 100,
    },
    {
      id: 'st-02',
      date: '2026-01-10',
      reference: 'CHQ-883190',
      description: 'شيك مسحوب رقم 883190 - سداد مورد خامات',
      debit: 180000,
      credit: 0,
      isMatched: true,
      matchedEntryRef: 'JV-2026-0004',
      matchConfidence: 100,
    },
    {
      id: 'st-03',
      date: '2026-01-18',
      reference: 'TXN-110294',
      description: 'إيداع نقدي فرع البنك الرئيسي',
      debit: 0,
      credit: 95000,
      isMatched: false,
    },
    {
      id: 'st-04',
      date: '2026-01-25',
      reference: 'FEE-202601',
      description: 'عمولات ومصروفات تحويلات إلكترونية ومسك حساب',
      debit: 4350,
      credit: 0,
      isMatched: false,
      notes: 'لم تقيد بالدفاتر بعد',
    },
    {
      id: 'st-05',
      date: '2026-01-31',
      reference: 'INT-9921',
      description: 'عوائد وفوائد دائنة عن الوديعة الاستثمارية',
      debit: 0,
      credit: 18400,
      isMatched: false,
      notes: 'فوائد بنكية مستحقة',
    },
  ]);

  const [statementEndingBalance, setStatementEndingBalance] = useState<number>(3829050);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV or Text lines from Bank Statement
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
        const parsedLines: BankStatementLine[] = [];

        // Check if first line is header
        const startIndex = rows[0] && (rows[0].includes('تاريخ') || rows[0].toLowerCase().includes('date')) ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const cols = rows[i].split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 3) {
            const rawDate = cols[0] || new Date().toISOString().slice(0, 10);
            const ref = cols[1] || `BNK-${Math.floor(100000 + Math.random() * 900000)}`;
            const desc = cols[2] || 'حركة بنكية مستوردة';
            const val1 = parseFloat((cols[3] || '0').replace(/[^0-9.-]/g, '')) || 0;
            const val2 = parseFloat((cols[4] || '0').replace(/[^0-9.-]/g, '')) || 0;

            const debit = val1 > 0 ? val1 : 0;
            const credit = val2 > 0 ? val2 : (val1 < 0 ? Math.abs(val1) : 0);

            parsedLines.push({
              id: `st-import-${Date.now()}-${i}`,
              date: rawDate,
              reference: ref,
              description: desc,
              debit,
              credit,
              isMatched: false,
              notes: 'مستورد من كشف الحساب البنكي',
            });
          }
        }

        if (parsedLines.length > 0) {
          setStatementLines(parsedLines);
          // Auto calculate ending balance if available or estimate from last line
          const totalIn = parsedLines.reduce((s, l) => s + l.credit, 0);
          const totalOut = parsedLines.reduce((s, l) => s + l.debit, 0);
          setStatementEndingBalance((prev) => Math.max(0, prev + totalIn - totalOut));
          setSuccessToast(`تم استيراد ${parsedLines.length} حركة بنكية بنجاح من كشف الحساب.`);
          setTimeout(() => setSuccessToast(null), 5000);
        } else {
          alert('تعذر استخراج حركات صالحة من الملف. تأكد أن الملف مفصول بفاصلة (CSV) ويحتوي على التاريخ والمرجع والبيان والمبالغ.');
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة ملف كشف الحساب البنكي.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto Matching Execution
  const matchResults = useMemo(() => {
    return autoMatchBankStatement(statementLines, state.journalEntries, selectedAccountId);
  }, [statementLines, state.journalEntries, selectedAccountId]);

  const handleRunAutoMatch = () => {
    const updated = autoMatchBankStatement(statementLines, state.journalEntries, selectedAccountId);
    setStatementLines(updated.matchedLines);
    setSuccessToast(`تمت المطابقة الذكية بنجاح! نسبة التطابق بلغت ${updated.matchRate}%.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Add Manual Entry to Ledger for Unmatched Bank Fees/Interest
  const handlePostFeeToJournal = (line: BankStatementLine) => {
    const isFee = line.debit > 0;
    const amount = isFee ? line.debit : line.credit;

    // Create dual entry for fee/interest
    const feeAcc = state.accounts.find((a) => a.name.includes('عمولات') || a.name.includes('مصروفات بنكية')) || {
      id: 'acc-bank-fee',
      code: '510801',
      name: 'مصروفات وعمولات بنكية',
    };

    const interestAcc = state.accounts.find((a) => a.name.includes('فوائد') || a.name.includes('إيرادات تمويلية')) || {
      id: 'acc-bank-interest',
      code: '420101',
      name: 'إيرادات فوائد بنكية وعوائد استثمار',
    };

    const newEntry = {
      id: `jv-bank-${Date.now()}`,
      entryNumber: state.journalEntries.length + 1,
      serialNumber: `JV-${new Date().getFullYear()}-${String(state.journalEntries.length + 1).padStart(4, '0')}`,
      date: line.date || new Date().toISOString().split('T')[0],
      description: `قيد تسوية بنكية: ${line.description} (مرجع: ${line.reference})`,
      currency: 'EGP' as const,
      exchangeRate: 1,
      lines: isFee
        ? [
            {
              id: `l-1-${Date.now()}`,
              accountId: feeAcc.id,
              accountCode: feeAcc.code,
              accountName: feeAcc.name,
              debit: amount,
              credit: 0,
              description: line.description,
            },
            {
              id: `l-2-${Date.now()}`,
              accountId: selectedAccount.id,
              accountCode: selectedAccount.code,
              accountName: selectedAccount.name,
              debit: 0,
              credit: amount,
              description: `سحب البنك للعمولة: ${line.reference}`,
            },
          ]
        : [
            {
              id: `l-1-${Date.now()}`,
              accountId: selectedAccount.id,
              accountCode: selectedAccount.code,
              accountName: selectedAccount.name,
              debit: amount,
              credit: 0,
              description: `إيداع العائد البنكي: ${line.reference}`,
            },
            {
              id: `l-2-${Date.now()}`,
              accountId: interestAcc.id,
              accountCode: interestAcc.code,
              accountName: interestAcc.name,
              debit: 0,
              credit: amount,
              description: line.description,
            },
          ],
      totalDebit: amount,
      totalCredit: amount,
      isPosted: true,
      entryType: 'ADJUSTING' as const,
    };

    const savedEntry = db.addJournalEntry(newEntry);

    // Mark line as matched
    setStatementLines((prev) =>
      prev.map((l) =>
        l.id === line.id
          ? {
              ...l,
              isMatched: true,
              matchedEntryRef: savedEntry.serialNumber,
              matchConfidence: 100,
              notes: 'تم ترحيل القيد المحاسبي آلياً بنجاح',
            }
          : l
      )
    );

    setSuccessToast(`تم ترحيل قيد التسوية ${savedEntry.serialNumber} بنجاح إلى اليومية العامة.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const bookBalance = selectedAccount.currentBalance || 3450000;
  const unmatchedBankCredits = statementLines.filter((l) => !l.isMatched && l.credit > 0).reduce((s, l) => s + l.credit, 0);
  const unmatchedBankDebits = statementLines.filter((l) => !l.isMatched && l.debit > 0).reduce((s, l) => s + l.debit, 0);
  const adjustedBookBalance = bookBalance + unmatchedBankCredits - unmatchedBankDebits;
  const difference = Math.abs(adjustedBookBalance - statementEndingBalance);

  const filteredLines = useMemo(() => {
    return statementLines.filter((l) => {
      const q = (searchQuery || '').toLowerCase();
      const matchText =
        !q ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.reference || '').toLowerCase().includes(q);
      if (!matchText) return false;
      if (filterStatus === 'MATCHED') return l.isMatched;
      if (filterStatus === 'UNMATCHED') return !l.isMatched;
      return true;
    });
  }, [statementLines, searchQuery, filterStatus]);

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-800/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>نظام المطابقة البنكية والتسوية الذاتية المعتمدة | EAS & IFRS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            مذكرة تسوية البنك والمطابقة التلقائية
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            مطابقة كشوف الحسابات البنكية مع قيود اليومية آلياً، واكتشاف الشيكات المعلقة، وتوليد مذكرات التسوية الرسمية المعتمدة بختم المحاسب القانوني.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bank Statement CSV/Excel Import Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt,.tsv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            title="استيراد كشف حساب البنك من ملف CSV أو نصي"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد كشف حساب البنك (CSV)</span>
          </button>

          <button
            onClick={handleRunAutoMatch}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تشغيل المطابقة الذكية الآلية</span>
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة مذكرة التسوية الرسمية</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Selection & Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">الحساب البنكي المحدد</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">رصيد الدفاتر (الأستاذ العام)</span>
          <div className="text-lg font-black text-blue-400 font-mono">
            {bookBalance.toLocaleString('ar-EG')} <span className="text-xs text-slate-400 font-sans">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500">مرحل ومطابق للقيود</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">رصيد كشف حساب البنك الفعلي</span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {statementEndingBalance.toLocaleString('ar-EG')} <span className="text-xs text-slate-400 font-sans">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500">في 31 يناير 2026</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">نسبة التطابق الآلي</span>
          <div className="flex items-center gap-2">
            <div className="text-lg font-black text-amber-400 font-mono">{matchResults.matchRate}%</div>
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${matchResults.matchRate}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">
            {statementLines.filter((l) => l.isMatched).length} من {statementLines.length} حركات مطابقة
          </span>
        </div>
      </div>

      {/* Reconciliation Summary Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>خلاصة مذكرة تسوية البنك اللحظية (Bank Reconciliation Statement)</span>
          </h2>
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[11px] font-bold">
            معيار المحاسبة المصري رقم (4)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-300 border-b border-slate-800 pb-2">تسوية رصيد الدفاتر:</div>
            <div className="flex justify-between items-center text-slate-300">
              <span>رصيد الحساب بالدفاتر:</span>
              <span className="font-mono font-bold text-white">{bookBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span>(+) إيداعات / فوائد بالبنك لم تسجل بالدفاتر:</span>
              <span className="font-mono font-bold">+{unmatchedBankCredits.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-rose-400">
              <span>(-) مصروفات / عمولات بنكية لم تسجل بالدفاتر:</span>
              <span className="font-mono font-bold">-{unmatchedBankDebits.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-blue-400 font-bold border-t border-slate-800 pt-2">
              <span>(=) رصيد الدفاتر المعدل:</span>
              <span className="font-mono text-sm">{adjustedBookBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-300 border-b border-slate-800 pb-2">مطابقة رصيد البنك:</div>
            <div className="flex justify-between items-center text-slate-300">
              <span>رصيد كشف الحساب البنكي الفعلي:</span>
              <span className="font-mono font-bold text-white">{statementEndingBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>فارق التسوية النهائي:</span>
              <span className={`font-mono font-bold ${difference === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {difference === 0 ? '0.00 ج.م (مطابق تماماً ✓)' : `${difference.toLocaleString('ar-EG')} ج.م`}
              </span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg text-[11px] text-slate-300 leading-relaxed border border-slate-800">
              {difference === 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  كافة الحركات متطابقة بدقة، ومذكرة التسوية معتمدة وجاهزة للإقفال المالي.
                </span>
              ) : (
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  يوجد حركات غير مقيدة بالدفاتر؛ يرجى النقر على زر «ترحيل قيد التسوية» أدناه لكل بند.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statement Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black text-white">حركات كشف حساب البنك وقرارات المطابقة</h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="بحث في الوصف أو المرجع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">جميع الحركات</option>
              <option value="MATCHED">المطابقة فقط</option>
              <option value="UNMATCHED">غير المطابقة (تحتاج قيد)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">التاريخ</th>
                <th className="p-3">رقم المرجع البنكي</th>
                <th className="p-3">بيان الحركة</th>
                <th className="p-3 text-center">مدين (سحب / مصاريف)</th>
                <th className="p-3 text-center">دائن (إيداع / تحويل)</th>
                <th className="p-3 text-center">حالة المطابقة</th>
                <th className="p-3 text-center">الإجراء المحاسبي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-mono text-slate-300">{line.date}</td>
                  <td className="p-3 font-mono text-blue-400 font-bold">{line.reference}</td>
                  <td className="p-3 text-slate-200">
                    <div className="font-bold">{line.description}</div>
                    {line.notes && <div className="text-[10px] text-amber-400 mt-0.5">{line.notes}</div>}
                  </td>
                  <td className="p-3 font-mono text-center text-rose-400 font-bold">
                    {line.debit > 0 ? `${line.debit.toLocaleString('ar-EG')} ج.م` : '-'}
                  </td>
                  <td className="p-3 font-mono text-center text-emerald-400 font-bold">
                    {line.credit > 0 ? `${line.credit.toLocaleString('ar-EG')} ج.م` : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {line.isMatched ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مطابق ({line.matchedEntryRef || 'دفتر اليومية'})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <AlertCircle className="w-3 h-3" />
                        <span>غير مقيد بالدفاتر</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {!line.isMatched ? (
                      <button
                        onClick={() => handlePostFeeToJournal(line)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                        title="إنشاء وترحيل قيد تسوية تلقائي"
                      >
                        ترحيل قيد التسوية آلياً ⚡
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-bold">تم الإثبات ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative text-slate-900 text-right my-8">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>

            <PrintLayoutWrapper
              documentTitle="مذكرة تسوية البنك المعتمدة"
              documentRefNumber={`REC-BANK-${new Date().getFullYear()}-001`}
              documentDate={new Date().toLocaleDateString('ar-EG')}
              companyName={state.officeProfile?.firmName || 'الشركة المصرية للتجارة والمقاولات'}
              showSignatureStamp={true}
              notes="تم إعداد مذكرة التسوية وفق معايير المحاسبة المصرية (معيار 4 الخاص بالتدفقات النقدية والأرصدة البنكية)."
            >
              <div className="space-y-6 text-right py-4 text-xs">
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block">اسم البنك والحساب:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedAccount.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الفترة المالية المنتهية:</span>
                    <span className="font-bold text-slate-900 text-sm">31 يناير 2026</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                      <tr>
                        <th className="p-2.5">البيان والتفصيل</th>
                        <th className="p-2.5 text-center">المبلغ الجزئي</th>
                        <th className="p-2.5 text-center">المبلغ الكلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2.5 font-bold">رصيد حساب البنك كما هو وارد بدفاتر المنشأة</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                          {bookBalance.toLocaleString('ar-EG')} ج.م
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/60">
                        <td className="p-2.5 font-bold text-emerald-900">
                          يضاف: إيرادات وعوائد مقيدة بالبنك ولم تقيد بالدفاتر
                        </td>
                        <td className="p-2.5 text-center font-mono">{unmatchedBankCredits.toLocaleString('ar-EG')} ج.م</td>
                        <td className="p-2.5 text-center">-</td>
                      </tr>
                      <tr className="bg-rose-50/60">
                        <td className="p-2.5 font-bold text-rose-900">
                          يخصم: مصاريف وعمولات بنكية مقيدة بالبنك ولم تقيد بالدفاتر
                        </td>
                        <td className="p-2.5 text-center font-mono">({unmatchedBankDebits.toLocaleString('ar-EG')} ج.م)</td>
                        <td className="p-2.5 text-center">-</td>
                      </tr>
                      <tr className="bg-blue-50 font-bold text-blue-950">
                        <td className="p-2.5">رصيد الدفاتر المعدل النهائي</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-center font-mono text-sm">{adjustedBookBalance.toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                      <tr className="font-bold border-t-2 border-slate-400">
                        <td className="p-2.5">رصيد كشف حساب البنك الفعلي المطابق</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-center font-mono text-sm">{statementEndingBalance.toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-100 rounded-lg text-slate-700 text-[11px] leading-relaxed">
                  <strong>إقرار مراقب الحسابات:</strong> نشهد بأننا قد قمنا بمطابقة الحساب البنكي أعلاه مع قيود اليومية ومستندات الإيداع والسحب وكشوف حساب البنك، وأن الرصيد الفعلي يطابق الدفاتر بعد إجراء قيود التسوية اللازمة.
                </div>
              </div>
            </PrintLayoutWrapper>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند الرسمي الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
