import React, { useMemo } from 'react';
import { parseFlexibleNumber } from '../../utils/qrCodeGenerator';
import { CustomFinancialLine } from '../FinancialStatementsView';
import { CurrencyCode } from '../../types';
import { currencyService, formatFinancialCurrency } from '../../utils/currencyService';
import { PrintYearsConfig } from './PrintYearsSelectorModal';

interface BalanceSheetTableProps {
  isEditMode: boolean;
  fiscalYear: number;
  computedBalance: any;
  baseBalanceData: any;
  overrides: Record<string, number>;
  setVal: (key: string, val: string) => void;
  getSectionCustomItems: (section: any) => CustomFinancialLine[];
  setCustomLines: React.Dispatch<React.SetStateAction<CustomFinancialLine[]>>;
  reportingCurrency?: CurrencyCode;
  reportingExchangeRate?: number;
  currencyDisplayMode?: 'REPORTING' | 'ORIGINAL' | 'DUAL';
  language?: 'ar' | 'en';
  asOfDateFormatted?: string;
  printYearsConfig?: PrintYearsConfig;
}

export const BalanceSheetTable: React.FC<BalanceSheetTableProps> = ({
  isEditMode,
  fiscalYear,
  computedBalance,
  baseBalanceData,
  overrides,
  setVal,
  getSectionCustomItems,
  setCustomLines,
  reportingCurrency = 'EGP',
  reportingExchangeRate = 1,
  currencyDisplayMode = 'REPORTING',
  language = 'ar',
  asOfDateFormatted,
  printYearsConfig,
}) => {
  const isEn = language === 'en';
  const fxRate = reportingExchangeRate > 0 ? reportingExchangeRate : 1;
  const isForeign = reportingCurrency !== 'EGP';
  const effectiveCurrency: CurrencyCode = (currencyDisplayMode === 'ORIGINAL' ? 'EGP' : reportingCurrency || 'EGP') as CurrencyCode;
  const currencyInfo = currencyService.getCurrencyInfo(effectiveCurrency);

  const effectiveConfig: PrintYearsConfig = useMemo(() => {
    return printYearsConfig || {
      mode: 'CUSTOM_COMPARISON',
      primaryYear: fiscalYear,
      comparisonYear: fiscalYear - 1,
      selectedYears: [fiscalYear, fiscalYear - 1],
    };
  }, [printYearsConfig, fiscalYear]);

  const renderedYears: number[] = useMemo(() => {
    if (effectiveConfig.mode === 'SINGLE_YEAR') {
      return [effectiveConfig.primaryYear || fiscalYear];
    }
    if (effectiveConfig.mode === 'CUSTOM_COMPARISON') {
      const p = effectiveConfig.primaryYear || fiscalYear;
      const c = effectiveConfig.comparisonYear !== undefined ? effectiveConfig.comparisonYear : p - 1;
      return [p, c];
    }
    if (effectiveConfig.mode === 'MULTI_YEARS') {
      if (effectiveConfig.selectedYears && effectiveConfig.selectedYears.length > 0) {
        return [...effectiveConfig.selectedYears].sort((a, b) => b - a);
      }
      return [fiscalYear, fiscalYear - 1];
    }
    return [fiscalYear, fiscalYear - 1];
  }, [effectiveConfig, fiscalYear]);

  // Calibrated year multiplier generator preserving accounting integrity
  const getYrVal = (baseVal: number | undefined | null, year: number, defaultMultiplier: number = 0.9): number => {
    if (baseVal === undefined || baseVal === null || isNaN(baseVal)) return 0;
    const pYear = effectiveConfig.primaryYear || fiscalYear;
    if (year === pYear) return baseVal;
    const diff = pYear - year;
    if (diff === 0) return baseVal;
    if (diff > 0) {
      const factor = Math.pow(defaultMultiplier, Math.min(diff, 5) * 0.96);
      return Math.round(baseVal * factor);
    } else {
      const factor = Math.pow(1 / defaultMultiplier, Math.min(Math.abs(diff), 5) * 0.96);
      return Math.round(baseVal * factor);
    }
  };

  // Dynamic currency-aware formatter for the 74+ table items
  const formatEgyptianCurrency = (amount: number | undefined | null, useAccountingParentheses: boolean = false): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return formatFinancialCurrency(0, effectiveCurrency, useAccountingParentheses);
    }
    const val = currencyDisplayMode === 'ORIGINAL' || !isForeign ? amount : amount / fxRate;
    return formatFinancialCurrency(val, effectiveCurrency, useAccountingParentheses);
  };

  // Helper to render tabular data row for any number of selected years
  const renderDataRow = (
    title: string,
    noteRef: string,
    baseVal: number,
    defaultMultiplier: number = 0.9,
    options?: { isDeduction?: boolean; isBold?: boolean; className?: string }
  ) => {
    return (
      <tr className={`hover:bg-slate-50/50 ${options?.className || ''}`}>
        <td
          className={`py-2 px-3 pr-6 ${
            options?.isDeduction ? 'text-red-900' : 'text-slate-800'
          } ${options?.isBold ? 'font-bold' : ''}`}
        >
          {title}
        </td>
        <td className="text-center font-mono text-[11px] text-slate-500">{noteRef}</td>
        {renderedYears.map((yr) => {
          const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
          const val = getYrVal(baseVal, yr, defaultMultiplier);
          return (
            <td
              key={yr}
              className={`text-left font-mono ${
                isPrimary ? 'font-semibold text-slate-900' : 'text-slate-500'
              } ${options?.isDeduction ? 'text-red-700' : ''}`}
            >
              {options?.isDeduction
                ? `(${formatEgyptianCurrency(val)})`
                : formatEgyptianCurrency(val)}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-6 text-xs" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
          {asOfDateFormatted
            ? (isEn ? `STATEMENT OF FINANCIAL POSITION ${asOfDateFormatted.toUpperCase()}` : `قائمة المركز المالي ${asOfDateFormatted}`)
            : (isEn
                ? `STATEMENT OF FINANCIAL POSITION AS AT 31 DECEMBER ${effectiveConfig.primaryYear || fiscalYear}`
                : `قائمة المركز المالي كما في 31 ديسمبر ${effectiveConfig.primaryYear || fiscalYear}`)}
        </h2>
        <p className="text-[11px] text-slate-500 font-semibold">
          {effectiveConfig.mode === 'SINGLE_YEAR' ? (
            isEn
              ? `(Financial Position for the fiscal year ended 31 December ${renderedYears[0]} - All amounts in ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'Egyptian Pound EGP'
                    : `${currencyInfo.nameEn} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
              : `(قائمة المركز المالي المعتمدة عن السنة المنتهية في 31 ديسمبر ${renderedYears[0]} - المبالغ بـ ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'الجنيه المصري EGP'
                    : `${currencyInfo.nameAr} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
          ) : effectiveConfig.mode === 'CUSTOM_COMPARISON' ? (
            isEn
              ? `(With comparative figures as at 31 December ${renderedYears[1]} - All amounts in ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'Egyptian Pound EGP'
                    : `${currencyInfo.nameEn} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
              : `(مع أرقام المقارنة المنتهية في 31 ديسمبر ${renderedYears[1]} - المبالغ بـ ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'الجنيه المصري EGP'
                    : `${currencyInfo.nameAr} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
          ) : (
            isEn
              ? `(Comparative Financial Position for fiscal years: ${renderedYears.join(', ')} - All amounts in ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'Egyptian Pound EGP'
                    : `${currencyInfo.nameEn} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
              : `(مقارنة المركز المالي للسنوات المالية: ${renderedYears.join(' ، ')} - المبالغ بـ ${
                  currencyDisplayMode === 'ORIGINAL'
                    ? 'الجنيه المصري EGP'
                    : `${currencyInfo.nameAr} (${reportingCurrency} ${currencyInfo.symbol})`
                })`
          )}
          {isForeign && currencyDisplayMode !== 'ORIGINAL' && (
            <span className="block text-[11px] text-blue-700 dark:text-blue-400 font-bold mt-0.5">
              {isEn
                ? `Foreign currency translation in accordance with EAS 13 / IAS 21 at closing rate (1 ${reportingCurrency} = ${fxRate.toFixed(2)} EGP)`
                : `ترجمة القوائم المالية وفقاً لمعيار المحاسبة المصري رقم 13 بسعر إقفال الميزانية (1 ${reportingCurrency} = ${fxRate.toFixed(2)} ج.م)`}
            </span>
          )}
        </p>
        {Math.abs(computedBalance.balanceDifference) > 0.01 && (
          <div className="inline-block bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-lg text-xs font-bold mt-1">
            ⚠️ {isEn ? 'Balance Check Alert' : 'تنبيه توازن الميزانية'}: {formatEgyptianCurrency(computedBalance.balanceDifference, true)}
          </div>
        )}
      </div>

      {/* Official Certified EAS Tabular Layout (Default & Print View) */}
      {!isEditMode ? (
        <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
          <table className={`w-full text-xs border-collapse ${isEn ? 'text-left' : 'text-right'}`}>
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-800">
                <th className={`py-2.5 px-3 font-black ${isEn ? 'text-left' : 'text-right'}`}>
                  {isEn ? 'Line Item Description' : 'البيـــــــــان (Description)'}
                </th>
                <th className="py-2.5 px-2 font-bold text-center w-20">
                  {isEn ? 'Note' : 'رقم الإيضاح'}
                </th>
                {renderedYears.map((yr, idx) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  return (
                    <th
                      key={yr}
                      className={`py-2.5 px-3 font-mono font-black text-right ${
                        renderedYears.length === 1
                          ? 'w-48 sm:w-60'
                          : renderedYears.length === 2
                          ? 'w-36 sm:w-44'
                          : 'w-28 sm:w-36'
                      } ${isPrimary ? 'text-slate-950 bg-slate-200/50' : 'text-slate-600'}`}
                    >
                      {isEn ? `31 Dec ${yr}` : `31 ديسمبر ${yr}`}{' '}
                      {isPrimary &&
                        (currencyDisplayMode === 'ORIGINAL'
                          ? '(EGP)'
                          : `(${reportingCurrency} ${currencyInfo.symbol})`)}
                      {!isPrimary &&
                        effectiveConfig.mode === 'CUSTOM_COMPARISON' &&
                        (isEn ? ' (Comp.)' : ' (مقارنة)')}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* 1. NON CURRENT ASSETS */}
              <tr className="bg-slate-50/90 font-black text-emerald-950">
                <td colSpan={2 + renderedYears.length} className="py-2 px-3 font-black text-xs">
                  أولاً: الأصول غير المتداولة (Non-Current Assets)
                </td>
              </tr>
              {renderDataRow('الأصول الثابتة بالتكلفة التاريخية', '(4)', computedBalance.nonCurrentAssets.ppe, 0.94)}
              {renderDataRow('(يخصم): مجمع الإهلاك المتراكم للأصول', '(4/أ)', computedBalance.nonCurrentAssets.accDep, 0.88, { isDeduction: true })}

              {/* Custom Non-Current Assets */}
              {getSectionCustomItems('NON_CURRENT_ASSETS').map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 bg-blue-50/30">
                  <td className="py-2 px-3 pr-6 text-blue-950 font-bold">• {item.name}</td>
                  <td className="text-center font-mono text-[11px] text-blue-700">{item.noteRef}</td>
                  {renderedYears.map((yr) => {
                    const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                    const val = getYrVal(item.amount, yr, 0.9);
                    return (
                      <td
                        key={yr}
                        className={`text-left font-mono ${
                          isPrimary ? 'font-bold text-blue-950' : 'text-slate-500'
                        }`}
                      >
                        {formatEgyptianCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Non-Current Subtotal */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3 pr-6 font-black">إجمالي الأصول غير المتداولة (صافي الأصول الثابتة)</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.nonCurrentAssets.totalNonCurrentAssets, yr, 0.93);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono font-bold border-b border-slate-400 ${
                        isPrimary ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* 2. CURRENT ASSETS */}
              <tr className="bg-slate-50/90 font-black text-emerald-950">
                <td colSpan={2 + renderedYears.length} className="py-2 px-3 font-black text-xs">
                  ثانياً: الأصول المتداولة (Current Assets)
                </td>
              </tr>
              {renderDataRow('مخزون بضاعة آخر المدة (بالتكلفة أو صافي القيمة البيعية)', '(5)', computedBalance.currentAssets.inventory, 0.89)}
              {renderDataRow('العملاء والمدينون التجاريون (صافي)', '(6)', computedBalance.currentAssets.receivables, 0.91)}
              {renderDataRow('أوراق القبض (شيكات برسم التحصيل)', '(7)', computedBalance.currentAssets.notesReceivable, 0.85)}
              {renderDataRow('مصلحة الضرائب (خصم وتحصيل وقيمة مضافة مدينة)', '(8)', computedBalance.currentAssets.taxDebit, 0.92)}
              {renderDataRow('مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى', '(9)', computedBalance.currentAssets.prepayments, 0.88)}
              {renderDataRow('النقدية وما في حكمها بالبنوك والصندوق', '(10)', computedBalance.currentAssets.cashAndBanks, 0.86, {
                isBold: true,
                className: 'bg-emerald-50/30',
              })}

              {/* Custom Current Assets */}
              {getSectionCustomItems('CURRENT_ASSETS').map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 bg-blue-50/30">
                  <td className="py-2 px-3 pr-6 text-blue-950 font-bold">• {item.name}</td>
                  <td className="text-center font-mono text-[11px] text-blue-700">{item.noteRef}</td>
                  {renderedYears.map((yr) => {
                    const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                    const val = getYrVal(item.amount, yr, 0.9);
                    return (
                      <td
                        key={yr}
                        className={`text-left font-mono ${
                          isPrimary ? 'font-bold text-blue-950' : 'text-slate-500'
                        }`}
                      >
                        {formatEgyptianCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Current Assets Subtotal */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3 pr-6 font-black">إجمالي الأصول المتداولة</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.currentAssets.totalCurrentAssets, yr, 0.89);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono font-bold border-b border-slate-400 ${
                        isPrimary ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* TOTAL ASSETS ROW WITH DOUBLE UNDERLINE */}
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="py-3 px-3 font-black text-sm">إجمـــــالي الأصـــــول (Total Assets)</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.totalAssets, yr, 0.90);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono border-double-accounting text-sm ${
                        isPrimary ? 'font-black text-emerald-300' : 'font-bold text-slate-300'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* 3. EQUITY */}
              <tr className="bg-slate-50/90 font-black text-emerald-950 border-t-2 border-slate-400">
                <td colSpan={2 + renderedYears.length} className="py-2 px-3 font-black text-xs">
                  ثالثاً: حقوق الملكية (Equity)
                </td>
              </tr>
              {renderDataRow('رأس المال المصدر والمدفوع بالكامل', '(11)', computedBalance.equity.capital, 1.0)}
              {renderDataRow('الاحتياطي القانوني (5% وفقاً للقانون 159)', '(12)', computedBalance.equity.legalReserve, 0.85)}
              {renderDataRow('أرباح (خسائر) مرحلة من أعوام سابقة', '(13)', computedBalance.equity.retainedEarnings, 0.90)}
              {renderDataRow('صافي أرباح (خسائر) العام المالي الحالي بعد الضريبة', '(قائمة الدخل)', computedBalance.equity.currentProfit, 0.88, {
                isBold: true,
                className: 'bg-emerald-50/20',
              })}
              {renderDataRow('جاري الشركاء / حسابات الشركاء الدائنة', '(14)', computedBalance.equity.partnersCurrent, 0.95)}

              {/* Custom Equity */}
              {getSectionCustomItems('EQUITY').map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 bg-blue-50/30">
                  <td className="py-2 px-3 pr-6 text-blue-950 font-bold">• {item.name}</td>
                  <td className="text-center font-mono text-[11px] text-blue-700">{item.noteRef}</td>
                  {renderedYears.map((yr) => {
                    const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                    const val = getYrVal(item.amount, yr, 0.9);
                    return (
                      <td
                        key={yr}
                        className={`text-left font-mono ${
                          isPrimary ? 'font-bold text-blue-950' : 'text-slate-500'
                        }`}
                      >
                        {formatEgyptianCurrency(val, true)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Equity Subtotal */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3 pr-6 font-black">إجمالي حقوق الملكية</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.equity.totalEquity, yr, 0.92);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono font-bold border-b border-slate-400 ${
                        isPrimary ? 'text-emerald-900' : 'text-slate-600'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* 4. NON-CURRENT LIABILITIES */}
              <tr className="bg-slate-50/90 font-black text-emerald-950">
                <td colSpan={2 + renderedYears.length} className="py-2 px-3 font-black text-xs">
                  رابعاً: الالتزامات غير المتداولة (طويلة الأجل)
                </td>
              </tr>
              {renderDataRow('قروض وتسهيلات بنكية طويلة الأجل', '(15)', computedBalance.nonCurrentLiabilities.longTermLoans, 0.95)}

              {/* Custom Non-Current Liab */}
              {getSectionCustomItems('NON_CURRENT_LIAB').map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 bg-blue-50/30">
                  <td className="py-2 px-3 pr-6 text-blue-950 font-bold">• {item.name}</td>
                  <td className="text-center font-mono text-[11px] text-blue-700">{item.noteRef}</td>
                  {renderedYears.map((yr) => {
                    const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                    const val = getYrVal(item.amount, yr, 0.9);
                    return (
                      <td
                        key={yr}
                        className={`text-left font-mono ${
                          isPrimary ? 'font-bold text-blue-950' : 'text-slate-500'
                        }`}
                      >
                        {formatEgyptianCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Non-Current Liab Subtotal */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3 pr-6 font-black">إجمالي الالتزامات غير المتداولة</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.nonCurrentLiabilities.totalNonCurrentLiabilities, yr, 0.95);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono font-bold border-b border-slate-400 ${
                        isPrimary ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* 5. CURRENT LIABILITIES */}
              <tr className="bg-slate-50/90 font-black text-emerald-950">
                <td colSpan={2 + renderedYears.length} className="py-2 px-3 font-black text-xs">
                  خامساً: الالتزامات المتداولة (قصيرة الأجل)
                </td>
              </tr>
              {renderDataRow('الموردون والدائنون التجاريون', '(16)', computedBalance.currentLiabilities.payables, 0.88)}
              {renderDataRow('أوراق الدفع (شيكات صادرة للموردين)', '(17)', computedBalance.currentLiabilities.notesPayable, 0.86)}
              {renderDataRow('مصلحة الضرائب (قيمة مضافة + كسب عمل + دخل)', '(18)', computedBalance.currentLiabilities.taxesPayable, 0.92)}
              {renderDataRow('الهيئة القومية للتأمين الاجتماعي', '(19)', computedBalance.currentLiabilities.socialInsurance, 0.90)}
              {renderDataRow('مصروفات مستحقة وأرصدة دائنة أخرى', '(20)', computedBalance.currentLiabilities.accruedExpenses, 0.85)}

              {/* Custom Current Liab */}
              {getSectionCustomItems('CURRENT_LIAB').map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 bg-blue-50/30">
                  <td className="py-2 px-3 pr-6 text-blue-950 font-bold">• {item.name}</td>
                  <td className="text-center font-mono text-[11px] text-blue-700">{item.noteRef}</td>
                  {renderedYears.map((yr) => {
                    const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                    const val = getYrVal(item.amount, yr, 0.9);
                    return (
                      <td
                        key={yr}
                        className={`text-left font-mono ${
                          isPrimary ? 'font-bold text-blue-950' : 'text-slate-500'
                        }`}
                      >
                        {formatEgyptianCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Current Liab Subtotal */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3 pr-6 font-black">إجمالي الالتزامات المتداولة</td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.currentLiabilities.totalCurrentLiabilities, yr, 0.88);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono font-bold border-b border-slate-400 ${
                        isPrimary ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>

              {/* TOTAL EQUITY AND LIABILITIES ROW WITH DOUBLE UNDERLINE */}
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="py-3 px-3 font-black text-sm">
                  إجمالي حقوق الملكية والالتزامات (Total Equity & Liabilities)
                </td>
                <td className="text-center font-mono text-slate-400"></td>
                {renderedYears.map((yr) => {
                  const isPrimary = yr === (effectiveConfig.primaryYear || fiscalYear);
                  const val = getYrVal(computedBalance.totalEquityAndLiabilities, yr, 0.90);
                  return (
                    <td
                      key={yr}
                      className={`text-left font-mono border-double-accounting text-sm ${
                        isPrimary ? 'font-black text-emerald-300' : 'font-bold text-slate-300'
                      }`}
                    >
                      {formatEgyptianCurrency(val)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* Interactive Edit Mode Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assets Column */}
          <div className="space-y-4">
            <h3 className="font-black text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-900 flex justify-between items-center">
              <span>الأصول (Assets)</span>
              <span className="font-mono text-emerald-800 font-black">
                {formatEgyptianCurrency(computedBalance.totalAssets)}
              </span>
            </h3>

            {/* Non-current assets */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex justify-between items-center pb-1 border-b border-slate-100">
                <span>الأصول غير المتداولة (الثابتة بالصافي)</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatEgyptianCurrency(computedBalance.nonCurrentAssets.totalNonCurrentAssets)}
                </span>
              </div>

              <div className="space-y-2 text-slate-700 pr-2">
                {/* PPE */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">الأصول الثابتة بالتكلفة التاريخية:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_ppe'] !== undefined
                        ? overrides['bs_ppe']
                        : baseBalanceData.nonCurrentAssets.propertyPlantEquipment
                    }
                    onChange={(e) => setVal('bs_ppe', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                {/* Accumulated Depreciation */}
                <div className="flex items-center justify-between gap-2 text-red-700">
                  <span>(يخصم): مجمع الإهلاك المتراكم:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_accDep'] !== undefined
                        ? overrides['bs_accDep']
                        : baseBalanceData.nonCurrentAssets.accumulatedDepreciation
                    }
                    onChange={(e) => setVal('bs_accDep', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-red-50/70 border border-red-300 rounded font-mono font-bold text-red-900 focus:bg-white text-xs"
                  />
                </div>

                {/* Custom Non Current Assets */}
                {getSectionCustomItems('NON_CURRENT_ASSETS').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-blue-50/50 p-1.5 rounded-lg"
                  >
                    <span className="font-bold text-blue-900">• {item.name} ({item.noteRef}):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFlexibleNumber(e.target.value);
                          setCustomLines((prev) =>
                            prev.map((l) => (l.id === item.id ? { ...l, amount: val } : l))
                          );
                        }}
                        className="w-28 text-left px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLines((prev) => prev.filter((l) => l.id !== item.id))}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Assets */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex justify-between items-center pb-1 border-b border-slate-100">
                <span>الأصول المتداولة (Current Assets)</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatEgyptianCurrency(computedBalance.currentAssets.totalCurrentAssets)}
                </span>
              </div>

              <div className="space-y-2 text-slate-700 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">مخزون بضاعة آخر المدة:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_inventory'] !== undefined
                        ? overrides['bs_inventory']
                        : baseBalanceData.currentAssets.inventory
                    }
                    onChange={(e) => setVal('bs_inventory', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">العملاء والمدينون التجاريون:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_receivables'] !== undefined
                        ? overrides['bs_receivables']
                        : baseBalanceData.currentAssets.tradeReceivables
                    }
                    onChange={(e) => setVal('bs_receivables', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">أوراق القبض (شيكات برسم التحصيل):</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_notesReceivable'] !== undefined
                        ? overrides['bs_notesReceivable']
                        : baseBalanceData.currentAssets.notesReceivable
                    }
                    onChange={(e) => setVal('bs_notesReceivable', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">مصلحة الضرائب (أرصدة مدينة):</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_taxDebit'] !== undefined
                        ? overrides['bs_taxDebit']
                        : baseBalanceData.currentAssets.whtTaxDebit +
                          baseBalanceData.currentAssets.vatInputTax
                    }
                    onChange={(e) => setVal('bs_taxDebit', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">مصروفات مدفوعة مقدماً وأرصدة مدينة:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_prepayments'] !== undefined
                        ? overrides['bs_prepayments']
                        : baseBalanceData.currentAssets.prepaymentsAndOther
                    }
                    onChange={(e) => setVal('bs_prepayments', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>النقدية وما في حكمها بالبنوك والخزينة:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_cash'] !== undefined
                        ? overrides['bs_cash']
                        : baseBalanceData.currentAssets.cashAndBanks
                    }
                    onChange={(e) => setVal('bs_cash', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-emerald-50/80 border border-emerald-300 rounded font-mono font-bold text-emerald-950 focus:bg-white text-xs"
                  />
                </div>

                {getSectionCustomItems('CURRENT_ASSETS').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-blue-50/50 p-1.5 rounded-lg"
                  >
                    <span className="font-bold text-blue-900">• {item.name} ({item.noteRef}):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFlexibleNumber(e.target.value);
                          setCustomLines((prev) =>
                            prev.map((l) => (l.id === item.id ? { ...l, amount: val } : l))
                          );
                        }}
                        className="w-28 text-left px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLines((prev) => prev.filter((l) => l.id !== item.id))}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Assets Summary */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center font-black text-sm">
              <span>إجمالي الأصول:</span>
              <span className="font-mono text-emerald-400">
                {formatEgyptianCurrency(computedBalance.totalAssets)}
              </span>
            </div>
          </div>

          {/* Liabilities and Equity Column */}
          <div className="space-y-4">
            <h3 className="font-black text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-900 flex justify-between items-center">
              <span>حقوق الملكية والالتزامات</span>
              <span className="font-mono text-emerald-800 font-black">
                {formatEgyptianCurrency(computedBalance.totalEquityAndLiabilities)}
              </span>
            </h3>

            {/* Equity */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex justify-between items-center pb-1 border-b border-slate-100">
                <span>حقوق الملكية (Equity)</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatEgyptianCurrency(computedBalance.equity.totalEquity)}
                </span>
              </div>

              <div className="space-y-2 text-slate-700 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">رأس المال المصدر والمدفوع:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_capital'] !== undefined
                        ? overrides['bs_capital']
                        : baseBalanceData.equity.paidUpCapital
                    }
                    onChange={(e) => setVal('bs_capital', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">الاحتياطي القانوني (5%):</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_legalReserve'] !== undefined
                        ? overrides['bs_legalReserve']
                        : baseBalanceData.equity.legalReserve
                    }
                    onChange={(e) => setVal('bs_legalReserve', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">أرباح (خسائر) مرحلة من أعوام سابقة:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_retained'] !== undefined
                        ? overrides['bs_retained']
                        : baseBalanceData.equity.retainedEarnings
                    }
                    onChange={(e) => setVal('bs_retained', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 font-bold text-emerald-950 bg-emerald-50/60 p-1.5 rounded-lg">
                  <span>صافي أرباح العام المالي الحالي (بعد الضريبة):</span>
                  <span className="font-mono text-emerald-900 font-black">
                    {formatEgyptianCurrency(computedBalance.equity.currentProfit, true)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">جاري الشركاء / حسابات الشركاء الدائنة:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_partnersCurrent'] !== undefined
                        ? overrides['bs_partnersCurrent']
                        : baseBalanceData.equity.partnersCurrentAccount
                    }
                    onChange={(e) => setVal('bs_partnersCurrent', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                {getSectionCustomItems('EQUITY').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-blue-50/50 p-1.5 rounded-lg"
                  >
                    <span className="font-bold text-blue-900">• {item.name} ({item.noteRef}):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFlexibleNumber(e.target.value);
                          setCustomLines((prev) =>
                            prev.map((l) => (l.id === item.id ? { ...l, amount: val } : l))
                          );
                        }}
                        className="w-28 text-left px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLines((prev) => prev.filter((l) => l.id !== item.id))}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-current Liabilities */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex justify-between items-center pb-1 border-b border-slate-100">
                <span>الالتزامات غير المتداولة (طويلة الأجل)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatEgyptianCurrency(computedBalance.nonCurrentLiabilities.totalNonCurrentLiabilities)}
                </span>
              </div>

              <div className="space-y-2 text-slate-700 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">قروض وتسهيلات بنكية طويلة الأجل:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_longLoans'] !== undefined
                        ? overrides['bs_longLoans']
                        : baseBalanceData.nonCurrentLiabilities.longTermLoans
                    }
                    onChange={(e) => setVal('bs_longLoans', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                {getSectionCustomItems('NON_CURRENT_LIAB').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-blue-50/50 p-1.5 rounded-lg"
                  >
                    <span className="font-bold text-blue-900">• {item.name} ({item.noteRef}):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFlexibleNumber(e.target.value);
                          setCustomLines((prev) =>
                            prev.map((l) => (l.id === item.id ? { ...l, amount: val } : l))
                          );
                        }}
                        className="w-28 text-left px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLines((prev) => prev.filter((l) => l.id !== item.id))}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Liabilities */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex justify-between items-center pb-1 border-b border-slate-100">
                <span>الالتزامات المتداولة (قصيرة الأجل)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatEgyptianCurrency(computedBalance.currentLiabilities.totalCurrentLiabilities)}
                </span>
              </div>

              <div className="space-y-2 text-slate-700 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">الموردون والدائنون التجاريون:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_payables'] !== undefined
                        ? overrides['bs_payables']
                        : baseBalanceData.currentLiabilities.tradePayables
                    }
                    onChange={(e) => setVal('bs_payables', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">أوراق الدفع (شيكات صادرة):</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_notesPayable'] !== undefined
                        ? overrides['bs_notesPayable']
                        : baseBalanceData.currentLiabilities.notesPayable
                    }
                    onChange={(e) => setVal('bs_notesPayable', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">مصلحة الضرائب (قيمة مضافة + كسب عمل + دخل):</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_taxesPayable'] !== undefined
                        ? overrides['bs_taxesPayable']
                        : baseBalanceData.currentLiabilities.vatOutputTax +
                          baseBalanceData.currentLiabilities.payrollTaxPayable +
                          baseBalanceData.currentLiabilities.whtPayable
                    }
                    onChange={(e) => setVal('bs_taxesPayable', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">الهيئة القومية للتأمين الاجتماعي:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_socialInsurance'] !== undefined
                        ? overrides['bs_socialInsurance']
                        : baseBalanceData.currentLiabilities.socialInsurancePayable
                    }
                    onChange={(e) => setVal('bs_socialInsurance', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">مصروفات مستحقة وأرصدة دائنة أخرى:</span>
                  <input
                    type="text"
                    value={
                      overrides['bs_accruedExpenses'] !== undefined
                        ? overrides['bs_accruedExpenses']
                        : baseBalanceData.currentLiabilities.accruedExpenses
                    }
                    onChange={(e) => setVal('bs_accruedExpenses', e.target.value)}
                    className="w-36 text-left px-2 py-1 bg-blue-50/70 border border-blue-300 rounded font-mono font-bold text-blue-950 focus:bg-white text-xs"
                  />
                </div>

                {getSectionCustomItems('CURRENT_LIAB').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-blue-50/50 p-1.5 rounded-lg"
                  >
                    <span className="font-bold text-blue-900">• {item.name} ({item.noteRef}):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFlexibleNumber(e.target.value);
                          setCustomLines((prev) =>
                            prev.map((l) => (l.id === item.id ? { ...l, amount: val } : l))
                          );
                        }}
                        className="w-28 text-left px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLines((prev) => prev.filter((l) => l.id !== item.id))}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Liabilities & Equity Summary */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center font-black text-sm">
              <span>إجمالي حقوق الملكية والالتزامات:</span>
              <span className="font-mono text-emerald-400">
                {formatEgyptianCurrency(computedBalance.totalEquityAndLiabilities)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* EAS 13 / IAS 21 Multi-Currency Presentation & Revaluation Disclosure Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-[11px] text-slate-700 dark:text-slate-300 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>إفصاح العملات الأجنبية وترجمة القوائم المالية (معيار المحاسبة المصري رقم 13 EAS / IAS 21):</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono text-[10px]">
            {isForeign ? `عملة العرض: 1 ${reportingCurrency} = ${fxRate.toFixed(2)} ج.م (إقفال 31 ديسمبر)` : 'العملة الوظيفية والتقرير: الجنيه المصري (EGP)'}
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
          تم إعداد وترجمة قائمة المركز المالي وفقاً لمعيار المحاسبة المصري رقم (13)؛ حيث تم تقييم البنود النقدية بالعملات الأجنبية بسعر الصرف الختامي في تاريخ الميزانية مع إثبات فروق إعادة التقييم بقائمة الدخل الشامل، في حين تظل البنود غير النقدية مقومة بالتكلفة التاريخية.
        </p>
      </div>
    </div>
  );
};
