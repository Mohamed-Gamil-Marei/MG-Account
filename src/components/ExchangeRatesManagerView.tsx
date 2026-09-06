import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  Search,
  Calendar,
  ArrowRightLeft,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { CurrencyCode, DailyExchangeRateRecord } from '../types';
import { currencyService, formatFinancialCurrency, SUPPORTED_CURRENCIES } from '../utils/currencyService';

interface ExchangeRatesManagerViewProps {
  state: DatabaseState;
  onSelectCurrencyForReporting?: (currency: CurrencyCode) => void;
  onNavigateToFinancialStatements?: () => void;
}

export const ExchangeRatesManagerView: React.FC<ExchangeRatesManagerViewProps> = ({
  state,
  onSelectCurrencyForReporting,
  onNavigateToFinancialStatements,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Rate Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Partial<DailyExchangeRateRecord> | null>(null);

  // Quick Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(1000);
  const [calcFromCurrency, setCalcFromCurrency] = useState<CurrencyCode>('USD');
  const [calcToCurrency, setCalcToCurrency] = useState<CurrencyCode>('EGP');

  const exchangeRates = state.exchangeRates || [];
  const currentReportingCurrency = state.preferences.reportingCurrency || 'EGP';

  // Live Sync with CBE / Server API
  const handleLiveSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await currencyService.fetchLiveRates();
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();

      const newRecords: Array<Omit<DailyExchangeRateRecord, 'id' | 'createdAt' | 'updatedAt'>> = [];

      SUPPORTED_CURRENCIES.forEach((c) => {
        if (c.code === 'EGP') return;
        const rate = result.rates[c.code] || c.rateToEgp;
        newRecords.push({
          date: today,
          currency: c.code,
          baseCurrency: 'EGP',
          officialRate: Math.round(rate * 100) / 100,
          buyRate: Math.round((rate - 0.08) * 100) / 100,
          sellRate: Math.round((rate + 0.08) * 100) / 100,
          source: 'CBE',
          notes: `تحديث آلي مباشر من البنك المركزي المصري (${result.source})`,
        });
      });

      db.saveBulkExchangeRates(newRecords);
      setSyncFeedback('تم تحديث وتثبيت أسعار الصرف الرسمية لليوم بنجاح وفقاً لنشرة البنك المركزي المصري!');
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err) {
      setSyncFeedback('تعذر التحديث اللحظي عبر الإنترنت. يرجى إدخال الأسعار يدوياً.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open modal to add or edit
  const handleOpenAddModal = () => {
    setEditingRecord({
      date: selectedDate || new Date().toISOString().slice(0, 10),
      currency: 'USD',
      baseCurrency: 'EGP',
      buyRate: 48.55,
      sellRate: 48.68,
      officialRate: 48.62,
      source: 'CBE',
      notes: 'سعر إقفال جلسة اليوم',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: DailyExchangeRateRecord) => {
    setEditingRecord({ ...rec });
    setIsModalOpen(true);
  };

  const handleSaveModalRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.currency || !editingRecord.date || !editingRecord.officialRate) {
      alert('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    db.saveExchangeRate({
      id: editingRecord.id,
      date: editingRecord.date,
      currency: editingRecord.currency as CurrencyCode,
      baseCurrency: 'EGP',
      officialRate: Number(editingRecord.officialRate),
      buyRate: Number(editingRecord.buyRate || editingRecord.officialRate),
      sellRate: Number(editingRecord.sellRate || editingRecord.officialRate),
      source: editingRecord.source || 'MANUAL',
      notes: editingRecord.notes || '',
    });

    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string, currency: string, date: string) => {
    if (window.confirm(`هل أنت متأكد من حذف سجل سعر الصرف لعملة [${currency}] في تاريخ ${date}؟`)) {
      db.deleteExchangeRate(id);
    }
  };

  // Switch Global Reporting Currency
  const handleSetGlobalReportingCurrency = (curr: CurrencyCode) => {
    db.setReportingCurrency(curr);
    if (onSelectCurrencyForReporting) {
      onSelectCurrencyForReporting(curr);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return exchangeRates
      .filter((r) => {
        if (selectedCurrencyFilter !== 'ALL' && r.currency !== selectedCurrencyFilter) return false;
        if (selectedDate && r.date !== selectedDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.currency.localeCompare(b.currency));
  }, [exchangeRates, selectedCurrencyFilter, selectedDate]);

  // Latest rates for quick overview cards
  const latestRatesByCurrency = useMemo(() => {
    const map = new Map<CurrencyCode, DailyExchangeRateRecord>();
    SUPPORTED_CURRENCIES.forEach((c) => {
      if (c.code === 'EGP') return;
      const latest = db.getDailyExchangeRate(c.code);
      if (latest) {
        map.set(c.code, latest);
      }
    });
    return map;
  }, [exchangeRates]);

  // Quick Calculator conversion calculation
  const calculatedConversion = useMemo(() => {
    const fromRate = db.getExchangeRateValue(calcFromCurrency);
    const toRate = db.getExchangeRateValue(calcToCurrency);
    return currencyService.convertBetween(calcAmount, calcFromCurrency, calcToCurrency, fromRate, toRate);
  }, [calcAmount, calcFromCurrency, calcToCurrency, exchangeRates]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  إدارة وتحديث أسعار الصرف اليومية (EAS 13)
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  تحديث يومي فوري لأسعار العملات المعتمدة، وسجلات تاريخية لإقفال الميزانيات، وعرض القوائم المالية بعملة التقرير والعملة الأصلية
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleLiveSync}
              disabled={isSyncing}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all ${
                isSyncing
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري سحب أسعار اليوم...' : 'تحديث أسعار اليوم لحظياً (CBE)'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل سعر صرف يدوي</span>
            </button>

            {onNavigateToFinancialStatements && (
              <button
                onClick={onNavigateToFinancialStatements}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">عرض القوائم المالية</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Success / Error Banner */}
        {syncFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{syncFeedback}</span>
          </div>
        )}

        {/* Global Reporting Currency Context Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">عملة التقرير والعرض المعتمدة للنظام:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-300">
              <span>{currencyService.getCurrencyInfo(currentReportingCurrency).flag}</span>
              <span>{currencyService.getCurrencyInfo(currentReportingCurrency).nameAr}</span>
              <span className="text-[11px] opacity-80">({currentReportingCurrency})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">تغيير سريع لعملة التقرير:</span>
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => handleSetGlobalReportingCurrency(c.code)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  currentReportingCurrency === c.code
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c.flag} {c.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Rate Cards + Currency Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Currency Rate Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>أسعار صرف العملات الأجنبية مقابل الجنيه المصري (EGP)</span>
            </h2>
            <span className="text-xs text-slate-500">
              إجمالي العملات المعتمدة: <strong>{SUPPORTED_CURRENCIES.length - 1}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {SUPPORTED_CURRENCIES.filter((c) => c.code !== 'EGP').map((c) => {
              const rateRecord = latestRatesByCurrency.get(c.code);
              const officialRate = rateRecord?.officialRate || c.rateToEgp;
              const buyRate = rateRecord?.buyRate || officialRate - 0.08;
              const sellRate = rateRecord?.sellRate || officialRate + 0.08;
              const recordDate = rateRecord?.date || new Date().toISOString().slice(0, 10);
              const sourceLabel = rateRecord?.source === 'CBE' ? 'البنك المركزي' : rateRecord?.source === 'MANUAL' ? 'يدوي' : 'بنكي';

              return (
                <div
                  key={c.code}
                  className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-xs relative group"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{c.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{c.code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {c.symbol}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{c.nameAr}</p>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                        {sourceLabel}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{recordDate}</p>
                    </div>
                  </div>

                  {/* Rate Numbers */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">السعر الرسمي (CBE):</span>
                      <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {officialRate.toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-slate-500">ج.م</span>
                      </span>
                    </div>

                    <div className="text-left space-y-0.5 border-r border-slate-200 dark:border-slate-700 pr-3">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400">شراء:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{buyRate.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400">بيع:</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">{sellRate.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Quick Edit & Action */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">1 {c.code} = {officialRate.toFixed(2)} EGP</span>
                    <button
                      onClick={() => {
                        if (rateRecord) {
                          handleOpenEditModal(rateRecord);
                        } else {
                          setEditingRecord({
                            date: new Date().toISOString().slice(0, 10),
                            currency: c.code,
                            baseCurrency: 'EGP',
                            officialRate: c.rateToEgp,
                            buyRate: c.rateToEgp - 0.08,
                            sellRate: c.rateToEgp + 0.08,
                            source: 'MANUAL',
                            notes: `سعر عملة ${c.code}`,
                          });
                          setIsModalOpen(true);
                        }
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تعديل السعر</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Live Multi-Currency Conversion Calculator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-500" />
              <span>حاسبة تحويل العملات اللحظية</span>
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ المراد تحويله:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="أدخل المبلغ..."
                />
              </div>
            </div>

            {/* Currency Selectors */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  من عملة (المصدر):
                </label>
                <select
                  value={calcFromCurrency}
                  onChange={(e) => setCalcFromCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={() => {
                    const temp = calcFromCurrency;
                    setCalcFromCurrency(calcToCurrency);
                    setCalcToCurrency(temp);
                  }}
                  className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all shadow-xs"
                  title="تبديل العملتين"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  إلى عملة (الهدف):
                </label>
                <select
                  value={calcToCurrency}
                  onChange={(e) => setCalcToCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Converted Result Display */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 p-4 rounded-xl border border-blue-100 dark:border-slate-700 text-center space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">القيمة المحولة الصافية:</span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">
                {formatFinancialCurrency(calculatedConversion, calcToCurrency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                سعر الصرف المطبق: 1 {calcFromCurrency} ={' '}
                {(
                  db.getExchangeRateValue(calcFromCurrency) / db.getExchangeRateValue(calcToCurrency)
                ).toFixed(4)}{' '}
                {calcToCurrency}
              </div>
            </div>

            {/* Quick Note about EAS 13 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>قاعدة المعيار المحاسبي EAS 13:</span>
              </div>
              <p className="leading-relaxed">
                يتم تسجيل المعاملة بسعر الصرف في تاريخ حدوثها، مع إعادة تقييم الأرصدة النقدية في تاريخ الميزانية وإثبات فروق العملة في الأرباح والخسائر.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Rates Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>سجل أسعار الصرف التاريخية واليومية</span>
            </h3>
            <p className="text-xs text-slate-500">
              أرشيف كامل لأسعار الصرف اليومية وأسعار إقفال الميزانيات السنوية المعتمدة
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">التاريخ:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  الكل
                </button>
              )}
            </div>

            {/* Currency Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">العملة:</span>
              <select
                value={selectedCurrencyFilter}
                onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="ALL">جميع العملات</option>
                {SUPPORTED_CURRENCIES.filter((c) => c.code !== 'EGP').map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">العملة</th>
                <th className="py-3 px-4">السعر الرسمي (CBE)</th>
                <th className="py-3 px-4">سعر الشراء</th>
                <th className="py-3 px-4">سعر البيع</th>
                <th className="py-3 px-4">المصدر</th>
                <th className="py-3 px-4">الملاحظات والغرض</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد سجلات أسعار صرف مطابقة للتاريخ والعملة المحددة.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((rec) => {
                  const currInfo = currencyService.getCurrencyInfo(rec.currency);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {rec.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{currInfo.flag}</span>
                          <span>{rec.currency}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({currInfo.symbol})</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {rec.officialRate.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {rec.buyRate.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {rec.sellRate.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.source === 'CBE' ? 'البنك المركزي' : rec.source === 'MANUAL' ? 'يدوي / محاسب' : rec.source || 'بنكي'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            title="تعديل السجل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(rec.id, rec.currency, rec.date)}
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600"
                            title="حذف السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Egyptian Accounting Standard (EAS 13) Guidelines Accordion */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span>الدليل المهني لمعيار المحاسبة المصري رقم (13) - آثار التغيرات في أسعار صرف العملات الأجنبية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px]">1</span>
              <span>الاعتراف الأولي بالمعاملات</span>
            </h4>
            <p className="leading-relaxed">
              تُسجل المعاملات بالعملة الأجنبية مبدئياً بالعملة الوظيفية (الجنيه المصري) بتطبيق سعر الصرف الفوري بين العملة الوظيفية والعملة الأجنبية في تاريخ إجراء المعاملة.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px]">2</span>
              <span>إعادة تقييم البنود النقدية في تاريخ الإقفال</span>
            </h4>
            <p className="leading-relaxed">
              تُترجم البنود النقدية بالعملة الأجنبية (النقدية، البنوك، العملاء، الموردين) باستخدام سعر الإقفال (Closing Rate) في نهاية الفترة المالية، وتُثبت الفروق في قائمة الدخل.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px]">3</span>
              <span>عرض القوائم المالية بعملة التقرير</span>
            </h4>
            <p className="leading-relaxed">
              عند ترجمة النتائج والمركز المالي إلى عملة عرض أخرى (كالـ USD أو EUR)، تترجم الأصول والالتزامات بسعر إقفال الميزانية، والإيرادات والمصروفات بمتوسط سعر الصرف المرجح.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Add or Edit Exchange Rate */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingRecord.id ? 'تعديل سعر الصرف المسجل' : 'تسجيل سعر صرف يومي جديد'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalRecord} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    العملة الأجنبية:
                  </label>
                  <select
                    value={editingRecord.currency || 'USD'}
                    onChange={(e) => setEditingRecord({ ...editingRecord, currency: e.target.value as CurrencyCode })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold outline-none"
                  >
                    {SUPPORTED_CURRENCIES.filter((c) => c.code !== 'EGP').map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    التاريخ (جلسة التداول / الإقفال):
                  </label>
                  <input
                    type="date"
                    required
                    value={editingRecord.date || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold outline-none"
                  />
                </div>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    السعر الرسمي (CBE):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={editingRecord.officialRate || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingRecord({
                        ...editingRecord,
                        officialRate: val,
                        buyRate: editingRecord.buyRate || Math.round((val - 0.08) * 100) / 100,
                        sellRate: editingRecord.sellRate || Math.round((val + 0.08) * 100) / 100,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    سعر الشراء:
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={editingRecord.buyRate || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, buyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold outline-none text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">
                    سعر البيع:
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={editingRecord.sellRate || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, sellRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold outline-none text-rose-600 dark:text-rose-400"
                  />
                </div>
              </div>

              {/* Source & Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مصدر السعر:
                </label>
                <select
                  value={editingRecord.source || 'CBE'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, source: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold outline-none"
                >
                  <option value="CBE">البنك المركزي المصري (نشرة رسمية)</option>
                  <option value="COMMERCIAL_BANKS">بنوك تجارية (الأهلي / مصر / CIB)</option>
                  <option value="MANUAL">تسجيل يدوي للمكتب</option>
                  <option value="CUSTOM">سعر اتفاقي / تعاقدي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات السعر (مثل: سعر إقفال ميزانية 2026):
                </label>
                <input
                  type="text"
                  value={editingRecord.notes || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  placeholder="مثال: سعر إقفال 31 ديسمبر لميزانية المنشأة"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-600/20"
                >
                  حفظ وتثبيت السعر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
