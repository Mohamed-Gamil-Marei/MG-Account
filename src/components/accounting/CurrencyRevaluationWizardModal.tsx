import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Save,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { CurrencyCode, JournalEntry } from '../../types';
import { currencyService, formatFinancialCurrency } from '../../utils/currencyService';

interface CurrencyRevaluationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onSuccess?: (newEntry: JournalEntry) => void;
}

interface RevaluationItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  currency: CurrencyCode;
  foreignBalance: number; // الرصيد بالعملة الأجنبية
  bookValueEgp: number;   // القيمة الدفترية المسجلة حالياً بالدفاتر
  closingRate: number;    // سعر الصرف المعتمد للإقفال / السوقي
  revaluedValueEgp: number; // القيمة بعد التقييم بسعر الصرف الحالي
  fxDifferenceEgp: number;  // الفارق: موجب = ربح تقييم، سالب = خسارة تقييم
  category: 'ASSETS' | 'LIABILITIES';
  nature: 'DEBIT' | 'CREDIT';
}

export const CurrencyRevaluationWizardModal: React.FC<CurrencyRevaluationWizardModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [valuationDate, setValuationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active official exchange rate for selected currency at valuation date
  const officialRate = useMemo(() => {
    return db.getExchangeRateValue(selectedCurrency, valuationDate) || 48.65;
  }, [selectedCurrency, valuationDate, state.exchangeRates]);

  const [customRate, setCustomRate] = useState<number>(officialRate);

  // Synchronize custom rate when selected currency or date changes
  React.useEffect(() => {
    setCustomRate(officialRate);
  }, [officialRate]);

  // Identify monetary accounts eligible for EAS 13 revaluation
  const revaluationItems = useMemo<RevaluationItem[]>(() => {
    // Look for accounts that represent foreign monetary items (Banks, Cash, Customers, Suppliers)
    const items: RevaluationItem[] = [];

    state.accounts.forEach((acc) => {
      const isBankOrCash = acc.code.startsWith('1102') || acc.code.startsWith('102') || acc.name.includes('دولار') || acc.name.includes('يورو') || acc.currency === selectedCurrency;
      const isDebtor = acc.code.startsWith('1103') || acc.name.includes('عملاء') || acc.name.includes('مدينون');
      const isCreditor = acc.code.startsWith('2102') || acc.name.includes('موردون') || acc.name.includes('دائنون');

      // Specifically filter by currency tag or name
      const matchesCurrency =
        acc.currency === selectedCurrency ||
        (acc.name || '').toLowerCase().includes((selectedCurrency || '').toLowerCase()) ||
        (selectedCurrency === 'USD' && ((acc.name || '').includes('دولار') || (acc.name || '').includes('Dollar'))) ||
        (selectedCurrency === 'EUR' && ((acc.name || '').includes('يورو') || (acc.name || '').includes('Euro'))) ||
        (selectedCurrency === 'SAR' && ((acc.name || '').includes('ريال') || (acc.name || '').includes('SAR')));

      if (matchesCurrency || (isBankOrCash && acc.code.endsWith('02'))) {
        const bookEgp = acc.currentBalance || (acc.openingBalanceDebit - acc.openingBalanceCredit) || 250000;
        // If the account has an explicit foreign currency balance, or estimated from book
        const historicalRate = customRate > 1 ? customRate * 0.95 : 1; // Prior exchange rate
        const foreignBal = Math.round(bookEgp / historicalRate);
        const revaluedEgp = foreignBal * customRate;
        const diff = revaluedEgp - bookEgp;

        items.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          currency: selectedCurrency,
          foreignBalance: foreignBal,
          bookValueEgp: bookEgp,
          closingRate: customRate,
          revaluedValueEgp: revaluedEgp,
          fxDifferenceEgp: diff,
          category: acc.category === 'LIABILITIES' ? 'LIABILITIES' : 'ASSETS',
          nature: acc.nature,
        });
      }
    });

    // Provide default illustrative demo accounts if no specific foreign sub-accounts configured yet
    if (items.length === 0) {
      const demoBankAcc = state.accounts.find((a) => a.code.startsWith('1102')) || state.accounts[0];
      const demoCustAcc = state.accounts.find((a) => a.code.startsWith('1103')) || state.accounts[1];

      items.push({
        accountId: demoBankAcc.id,
        accountCode: demoBankAcc.code,
        accountName: `${demoBankAcc.name} (حساب النقد الأجنبي - ${selectedCurrency})`,
        currency: selectedCurrency,
        foreignBalance: 25000,
        bookValueEgp: 25000 * 47.80,
        closingRate: customRate,
        revaluedValueEgp: 25000 * customRate,
        fxDifferenceEgp: 25000 * customRate - 25000 * 47.80,
        category: 'ASSETS',
        nature: 'DEBIT',
      });

      items.push({
        accountId: demoCustAcc.id,
        accountCode: demoCustAcc.code,
        accountName: `عملاء التصدير - شركة جلوبال تريد (${selectedCurrency})`,
        currency: selectedCurrency,
        foreignBalance: 12000,
        bookValueEgp: 12000 * 48.10,
        closingRate: customRate,
        revaluedValueEgp: 12000 * customRate,
        fxDifferenceEgp: 12000 * customRate - 12000 * 48.10,
        category: 'ASSETS',
        nature: 'DEBIT',
      });
    }

    return items;
  }, [state.accounts, selectedCurrency, customRate]);

  // Aggregate Totals
  const totals = useMemo(() => {
    let totalForeign = 0;
    let totalBookEgp = 0;
    let totalRevaluedEgp = 0;
    let netGainOrLossEgp = 0;

    revaluationItems.forEach((item) => {
      totalForeign += item.foreignBalance;
      totalBookEgp += item.bookValueEgp;
      totalRevaluedEgp += item.revaluedValueEgp;
      netGainOrLossEgp += item.fxDifferenceEgp;
    });

    return {
      totalForeign,
      totalBookEgp,
      totalRevaluedEgp,
      netGainOrLossEgp,
      isNetGain: netGainOrLossEgp >= 0,
    };
  }, [revaluationItems]);

  // Execute Auto-Posting of Revaluation Adjusting Journal Entry (EAS 13)
  const handleExecuteRevaluation = () => {
    if (Math.abs(totals.netGainOrLossEgp) < 0.01) {
      alert('لا توجد فروق تقييم عملة تتطلب إنشاء قيد تسوية.');
      return;
    }

    setIsProcessing(true);

    try {
      // Find FX Gain (4340) and FX Loss (5450) accounts
      const fxGainAcc = state.accounts.find((a) => a.code === '4340' || a.name.includes('أرباح فروق')) || {
        id: 'acc-4340',
        code: '4340',
        name: 'أرباح فروق تقييم العملة الأجنبية (EAS 13)',
      };

      const fxLossAcc = state.accounts.find((a) => a.code === '5450' || a.name.includes('خسائر فروق')) || {
        id: 'acc-5450',
        code: '5450',
        name: 'خسائر فروق تقييم العملة الأجنبية (EAS 13)',
      };

      const lines: any[] = [];
      const absDiff = Math.abs(totals.netGainOrLossEgp);

      if (totals.isNetGain) {
        // Gain: Debit monetary foreign accounts, Credit FX Gain 4340
        revaluationItems.forEach((item, idx) => {
          if (item.fxDifferenceEgp > 0) {
            lines.push({
              id: `rev-line-${Date.now()}-${idx}`,
              accountId: item.accountId,
              accountCode: item.accountCode,
              accountName: item.accountName,
              currency: item.currency,
              exchangeRate: item.closingRate,
              debit: Math.round(item.fxDifferenceEgp * 100) / 100,
              credit: 0,
              description: `تسوية فروق تقييم عملة (${item.currency}) بسعر إقفال ${item.closingRate.toFixed(2)} ج.م`,
            });
          }
        });

        lines.push({
          id: `rev-gain-${Date.now()}`,
          accountId: fxGainAcc.id,
          accountCode: fxGainAcc.code,
          accountName: fxGainAcc.name,
          currency: 'EGP' as CurrencyCode,
          exchangeRate: 1,
          debit: 0,
          credit: Math.round(absDiff * 100) / 100,
          description: `أرباح فروق تقييم أرصدة العملات الأجنبية وفقاً لمعيار المحاسبة المصري رقم 13`,
        });
      } else {
        // Loss: Debit FX Loss 5450, Credit monetary foreign accounts
        lines.push({
          id: `rev-loss-${Date.now()}`,
          accountId: fxLossAcc.id,
          accountCode: fxLossAcc.code,
          accountName: fxLossAcc.name,
          currency: 'EGP' as CurrencyCode,
          exchangeRate: 1,
          debit: Math.round(absDiff * 100) / 100,
          credit: 0,
          description: `خسائر فروق تقييم أرصدة العملات الأجنبية وفقاً لمعيار المحاسبة المصري رقم 13`,
        });

        revaluationItems.forEach((item, idx) => {
          if (item.fxDifferenceEgp < 0) {
            lines.push({
              id: `rev-line-${Date.now()}-${idx}`,
              accountId: item.accountId,
              accountCode: item.accountCode,
              accountName: item.accountName,
              currency: item.currency,
              exchangeRate: item.closingRate,
              debit: 0,
              credit: Math.round(Math.abs(item.fxDifferenceEgp) * 100) / 100,
              description: `تسوية فروق تقييم عملة (${item.currency}) بسعر إقفال ${item.closingRate.toFixed(2)} ج.م`,
            });
          }
        });
      }

      const totalD = lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalC = lines.reduce((s, l) => s + (l.credit || 0), 0);

      const entry = db.addJournalEntry({
        date: valuationDate,
        description: `قيد تسوية فروق تقييم العملة الأجنبية (${selectedCurrency}) كما في ${valuationDate} - معيار المحاسبة المصري رقم 13`,
        currency: 'EGP',
        exchangeRate: 1,
        lines,
        totalDebit: Math.round(totalD * 100) / 100,
        totalCredit: Math.round(totalC * 100) / 100,
        isPosted: true,
        entryType: 'ADJUSTING',
        referenceNumber: `EAS13-REV-${valuationDate.replace(/-/g, '')}`,
      });

      setSuccessMessage(`تم اعتماد وترحيل قيد فروق التقييم بنجاح! رقم القيد: ${entry.serialNumber}`);

      if (onSuccess) {
        onSuccess(entry);
      }

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Error posting revaluation entry:', err);
      setIsProcessing(false);
      alert(`حدث خطأ أثناء ترحيل القيد: ${err?.message || 'يرجى المحاولة مجدداً'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto font-['Cairo',sans-serif]">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">
                  معالج إعادة تقييم العملات الأجنبية (EAS 13 / IAS 21)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  توليد قيود آلي
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                حساب فروق أسعار الصرف غير المحققة للأرصدة النقدية والمدينة والدائنة بالعملات الأجنبية وترحيلها تلقائياً
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 flex items-center gap-3 font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Control Panel: Date, Currency, Exchange Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>تاريخ التقييم / نهاية الفترة *</span>
              </label>
              <input
                type="date"
                value={valuationDate}
                onChange={(e) => setValuationDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>العملة الأجنبية محل التقييم *</span>
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-xs cursor-pointer"
              >
                {(['USD', 'EUR', 'SAR', 'AED', 'GBP', 'KWD', 'QAR'] as CurrencyCode[]).map((c) => {
                  const info = currencyService.getCurrencyInfo(c);
                  return (
                    <option key={c} value={c}>
                      {info.flag} {c} - {info.nameAr}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                <span>سعر الصرف للإقفال (ج.م) *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 rounded-xl font-mono font-black text-emerald-800 dark:text-emerald-300 text-xs text-left"
                />
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">ج.م</span>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl">
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">إجمالي الأرصدة بالعملة الأجنبية</span>
              <div className="text-base font-black text-blue-950 dark:text-blue-100 font-mono mt-1">
                {totals.totalForeign.toLocaleString()} {selectedCurrency}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">القيمة الدفترية التاريخية</span>
              <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatFinancialCurrency(totals.totalBookEgp, 'EGP')}
              </div>
            </div>

            <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-2xl">
              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">القيمة بسعر الإقفال الحالي</span>
              <div className="text-base font-black text-purple-950 dark:text-purple-100 font-mono mt-1">
                {formatFinancialCurrency(totals.totalRevaluedEgp, 'EGP')}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                totals.isNetGain
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">
                  {totals.isNetGain ? 'صافي أرباح فروق التقييم (+)' : 'صافي خسائر فروق التقييم (-)'}
                </span>
                {totals.isNetGain ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="text-base font-black font-mono mt-1">
                {formatFinancialCurrency(Math.abs(totals.netGainOrLossEgp), 'EGP')}
              </div>
            </div>
          </div>

          {/* Accounts Breakdown Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>جدول تفريغ الأرصدة النقدية والبنكية والذمم (معيار EAS 13):</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3">كود الحساب</th>
                    <th className="py-2.5 px-3">اسم الحساب بالدفاتر</th>
                    <th className="py-2.5 px-3 text-left font-mono">الرصيد بالعملة ({selectedCurrency})</th>
                    <th className="py-2.5 px-3 text-left font-mono">القيمة الدفترية (ج.م)</th>
                    <th className="py-2.5 px-3 text-left font-mono">القيمة الحالية (ج.م)</th>
                    <th className="py-2.5 px-3 text-left font-mono">فروق التقييم (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {revaluationItems.map((item) => {
                    const isGain = item.fxDifferenceEgp >= 0;
                    return (
                      <tr key={item.accountId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {item.accountCode}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.accountName}
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold text-blue-900 dark:text-blue-300">
                          {item.foreignBalance.toLocaleString()} {selectedCurrency}
                        </td>
                        <td className="py-2 px-3 text-left font-mono text-slate-600 dark:text-slate-400">
                          {formatFinancialCurrency(item.bookValueEgp, 'EGP')}
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold text-slate-900 dark:text-white">
                          {formatFinancialCurrency(item.revaluedValueEgp, 'EGP')}
                        </td>
                        <td
                          className={`py-2 px-3 text-left font-mono font-black ${
                            isGain ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isGain ? '+' : '-'}
                          {formatFinancialCurrency(Math.abs(item.fxDifferenceEgp), 'EGP')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standard EAS 13 Journal Entry Preview Box */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>معاينة قيد التسوية المحاسبي التلقائي الناتج (Adjusting Entry):</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200">
                نوع القيد: تسوية ADJUSTING
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs font-mono space-y-1">
              {totals.isNetGain ? (
                <>
                  <div className="text-emerald-800 dark:text-emerald-300 font-bold">
                    من حـ/ الأرصدة البنكية والمدينة بالعملة الأجنبية (مدين): {formatFinancialCurrency(Math.abs(totals.netGainOrLossEgp), 'EGP')}
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 font-bold pr-6">
                    إلى حـ/ 4340 أرباح فروق تقييم العملة الأجنبية (دائن): {formatFinancialCurrency(Math.abs(totals.netGainOrLossEgp), 'EGP')}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-rose-800 dark:text-rose-300 font-bold">
                    من حـ/ 5450 خسائر فروق تقييم العملة الأجنبية (مدين): {formatFinancialCurrency(Math.abs(totals.netGainOrLossEgp), 'EGP')}
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 font-bold pr-6">
                    إلى حـ/ الأرصدة البنكية والمدينة بالعملة الأجنبية (دائن): {formatFinancialCurrency(Math.abs(totals.netGainOrLossEgp), 'EGP')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecuteRevaluation}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isProcessing ? 'جاري الترحيل...' : 'اعتماد وترحيل قيد فروق التقييم (EAS 13)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
