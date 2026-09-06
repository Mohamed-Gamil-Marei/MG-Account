import React, { useMemo } from 'react';
import {
  Sparkles,
  History,
  ArrowLeftRight,
  TrendingUp,
  CheckCircle2,
  Scale,
  Zap,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { JournalEntry, JournalEntryLine, Account } from '../../types';
import {
  JournalSuggestionEngine,
  CounterAccountSuggestion,
  HistoricalPatternMatch,
} from '../../services/journalSuggestionEngine';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface JournalAutoSuggestBarProps {
  entries: JournalEntry[];
  accounts: Account[];
  lines: JournalEntryLine[];
  description: string;
  entryType: JournalEntry['entryType'];
  difference: number;
  totalDebit: number;
  totalCredit: number;
  onApplyHistoricalPattern: (pattern: HistoricalPatternMatch) => void;
  onAddSuggestedCounterLine: (suggestion: CounterAccountSuggestion) => void;
  onQuickBalance: (account: Account, nature: 'DEBIT' | 'CREDIT', amount: number) => void;
}

export const JournalAutoSuggestBar: React.FC<JournalAutoSuggestBarProps> = ({
  entries,
  accounts,
  lines,
  description,
  entryType,
  difference,
  totalDebit,
  totalCredit,
  onApplyHistoricalPattern,
  onAddSuggestedCounterLine,
  onQuickBalance,
}) => {
  const [isPatternsExpanded, setIsPatternsExpanded] = React.useState<boolean>(false);

  // 1. Identify active accounts currently in lines to generate counter-account predictions
  const counterSuggestions = useMemo(() => {
    // Find the primary line with an account selected
    const filledLines = lines.filter((l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0));
    if (filledLines.length === 0) {
      // If no amounts entered yet, check any line with an account
      const firstAccLine = lines.find((l) => l.accountId);
      if (firstAccLine) {
        return JournalSuggestionEngine.getSuggestedCounterAccounts(
          firstAccLine.accountId,
          'DEBIT',
          entries,
          accounts,
          difference
        );
      }
      return [];
    }

    // Determine target from the most prominent line
    const lastFilled = filledLines[filledLines.length - 1];
    const isDebit = (Number(lastFilled.debit) || 0) > 0;
    const targetNature: 'DEBIT' | 'CREDIT' = isDebit ? 'DEBIT' : 'CREDIT';

    // Exclude accounts already present on the counter side
    const counterAccounts = JournalSuggestionEngine.getSuggestedCounterAccounts(
      lastFilled.accountId,
      targetNature,
      entries,
      accounts,
      difference
    );

    // Filter out accounts already in the form on the same nature
    return counterAccounts.filter((sug) => {
      const alreadyPresent = lines.some(
        (l) =>
          l.accountId === sug.account.id &&
          ((sug.suggestedNature === 'DEBIT' && Number(l.debit) > 0) ||
            (sug.suggestedNature === 'CREDIT' && Number(l.credit) > 0))
      );
      return !alreadyPresent;
    });
  }, [lines, entries, accounts, difference]);

  // 2. Find historical entries & patterns matching the current description / type
  const historicalPatterns = useMemo(() => {
    return JournalSuggestionEngine.findHistoricalMatches(
      description,
      entryType,
      entries,
      accounts
    );
  }, [description, entryType, entries, accounts]);

  // 3. Find top balancing account suggestion if unbalance exists
  const balancingSuggestion = useMemo(() => {
    if (difference < 0.01) return null;
    const neededNature: 'DEBIT' | 'CREDIT' = totalDebit > totalCredit ? 'CREDIT' : 'DEBIT';

    // Check history for top cash/bank/liability/asset accounts used in balancing
    const usageStats = JournalSuggestionEngine.getAccountUsageStats(entries, accounts);
    const sortedAccounts = Array.from(usageStats.values())
      .filter((st) => (neededNature === 'DEBIT' ? st.debitCount > 0 : st.creditCount > 0))
      .sort((a, b) => (neededNature === 'DEBIT' ? b.debitCount - a.debitCount : b.creditCount - a.creditCount));

    const topAccStat = sortedAccounts[0];
    if (topAccStat) {
      const acc = accounts.find((a) => a.id === topAccStat.accountId);
      if (acc) {
        return {
          account: acc,
          nature: neededNature,
          amount: difference,
          count: neededNature === 'DEBIT' ? topAccStat.debitCount : topAccStat.creditCount,
        };
      }
    }

    // Default fallback to Bank (1120) or Cash (1110)
    const fallbackBank = accounts.find((a) => a.code.startsWith('1120') || a.name.includes('بنك'));
    if (fallbackBank) {
      return {
        account: fallbackBank,
        nature: neededNature,
        amount: difference,
        count: 10,
      };
    }
    return null;
  }, [difference, totalDebit, totalCredit, entries, accounts]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 border border-indigo-900/50 shadow-md space-y-3.5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              محرك الاقتراح التلقائي استناداً إلى سجل العمليات السابقة
              <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20">
                {entries.length} قيد تاريخي محلل
              </span>
            </h4>
            <p className="text-[11px] text-slate-300">
              اقتراح فوري للأطراف المقابلة (مدينة/دائنة) ونسب التكرار لسرعة ودقة التوجيه المحاسبي.
            </p>
          </div>
        </div>

        {historicalPatterns.length > 0 && (
          <button
            type="button"
            onClick={() => setIsPatternsExpanded((prev) => !prev)}
            className="text-[11px] px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-indigo-200 hover:text-white rounded-lg border border-slate-600 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {historicalPatterns.length} أنماط سابقة متطابقة
            </span>
            {isPatternsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* 1. Quick Balancing Alert Card if entry is unbalanced */}
      {balancingSuggestion && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-amber-200 font-bold">فارق عدم التوازن: </span>
              <strong className="text-white font-mono">{formatEgyptianCurrency(balancingSuggestion.amount)}</strong>
              <span className="text-slate-300 text-[11px] mr-2">
                (مطلوب طرف {balancingSuggestion.nature === 'DEBIT' ? 'مدين' : 'دائن'} لموازنة القيد)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onQuickBalance(
                balancingSuggestion.account,
                balancingSuggestion.nature,
                balancingSuggestion.amount
              )
            }
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              موازنة القيد بـ [{balancingSuggestion.account.code}] {balancingSuggestion.account.name}
            </span>
          </button>
        </div>
      )}

      {/* 2. Counter-Party Instant Suggestions Chips */}
      {counterSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1 font-bold">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
              الأطراف المقابلة الأكثر اقتراناً وتكراراً بالعمليات السابقة:
            </span>
            <span className="text-[10px] text-slate-400">اضغط على أي بند لإدراجه فوراً</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {counterSuggestions.map((sug) => {
              const isDeb = sug.suggestedNature === 'DEBIT';
              const amtToFill = sug.suggestedAmount || difference;

              return (
                <button
                  key={sug.account.id}
                  type="button"
                  onClick={() => onAddSuggestedCounterLine(sug)}
                  className="group px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl border border-slate-700 hover:border-emerald-500/50 flex items-center gap-2 text-xs cursor-pointer transition-all shadow-xs text-right"
                  title={`${sug.sampleDescription || ''} - نسبة الثقة والتكرار ${sug.confidencePercentage}%`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      isDeb
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isDeb ? 'طرف مدين' : 'طرف دائن'}
                  </span>

                  <span className="font-mono font-bold text-slate-300 group-hover:text-white">
                    [{sug.account.code}]
                  </span>

                  <span className="font-bold text-slate-100">{sug.account.name}</span>

                  {amtToFill > 0 && (
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {formatEgyptianCurrency(amtToFill)}
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded">
                    {sug.confidencePercentage}% تكرار
                  </span>

                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Expandable Historical Precedents & Patterns */}
      {isPatternsExpanded && historicalPatterns.length > 0 && (
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              العمليات السابقة المشابهة المسجلة بالنظام:
            </span>
            <span className="text-[10px] text-slate-400">
              تطبيق بنية القيد السابقة مع ضبط المبالغ تلقائياً
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {historicalPatterns.map((pat) => (
              <div
                key={pat.id}
                className="bg-slate-800/90 rounded-xl p-2.5 border border-slate-700 hover:border-indigo-500/50 flex flex-col justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white line-clamp-1">{pat.title}</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                      تكرر {pat.frequency}x
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-1 text-[11px]">
                    {pat.lines.map((pl, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center justify-between text-slate-300 font-mono text-[10px]"
                      >
                        <span className="flex items-center gap-1">
                          <span
                            className={
                              pl.nature === 'DEBIT' ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'
                            }
                          >
                            {pl.nature === 'DEBIT' ? 'من ح/' : 'إلى ح/'}
                          </span>
                          <span>{pl.accountName}</span>
                        </span>
                        <span className="text-slate-400">({pl.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">آخر تسجيل: {pat.lastUsedDate}</span>
                  <button
                    type="button"
                    onClick={() => onApplyHistoricalPattern(pat)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>تطبيق هذا القيد</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
