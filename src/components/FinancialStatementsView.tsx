import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  TrendingUp,
  Wallet,
  Scale,
  Sparkles,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
} from '../utils/accountingCalculations';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';

interface FinancialStatementsViewProps {
  state: DatabaseState;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({ state }) => {
  const [statementTab, setStatementTab] = useState<'BALANCE_SHEET' | 'INCOME' | 'CASH_FLOW' | 'NOTES'>('BALANCE_SHEET');
  const [fiscalYear, setFiscalYear] = useState(2026);

  const calculatedAccounts = computeAccountBalances(state.accounts, state.journalEntries);
  const incomeData = generateIncomeStatement(calculatedAccounts);
  const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);
  const cashFlowData = generateCashFlowStatement(incomeData, balanceData);

  const profile = state.officeProfile;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              القوائم المالية والحسابات الختامية (Financial Statements)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            معدة وفقاً لمعايير المحاسبة المصرية (EAS) والقوانين واللوائح السارية بجمهورية مصر العربية.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <span>السنة المالية:</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="bg-transparent font-mono focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة القوائم المعتمدة</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setStatementTab('BALANCE_SHEET')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            statementTab === 'BALANCE_SHEET'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>1. قائمة المركز المالي (Balance Sheet)</span>
        </button>

        <button
          onClick={() => setStatementTab('INCOME')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            statementTab === 'INCOME'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. قائمة الدخل الشامل (Income Statement)</span>
        </button>

        <button
          onClick={() => setStatementTab('CASH_FLOW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            statementTab === 'CASH_FLOW'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>3. قائمة التدفقات النقدية (Cash Flows)</span>
        </button>

        <button
          onClick={() => setStatementTab('NOTES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            statementTab === 'NOTES'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>4. الإيضاحات والسياسات المحاسبية</span>
        </button>
      </div>

      {/* Main Statement Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:shadow-none print:border-none">
        {/* Official Header with Auditor & Client Name */}
        <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div>
            <div className="text-xs text-slate-500 font-bold tracking-wider">
              {profile.firmName} / {profile.auditorName}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              شركة النيل للصناعات الهندسية والتجارة (ش.م.م)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              سجل تجاري: 148293 جنوب القاهرة • بطاقة ضريبية: 489-201-987
            </p>
          </div>

          <div className="text-center sm:text-left">
            <div className="inline-block bg-slate-100 border border-slate-300 rounded-xl px-4 py-2">
              <div className="text-[11px] font-bold text-slate-500">القوائم المالية المدققة</div>
              <div className="text-sm font-black text-emerald-900">
                عن السنة المنتهية في 31 ديسمبر {fiscalYear}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">القيم بالجنيه المصري (EGP)</div>
            </div>
          </div>
        </div>

        {/* 1. BALANCE SHEET */}
        {statementTab === 'BALANCE_SHEET' && (
          <div className="space-y-6 text-xs">
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
                قائمة المركز المالي كما في 31 ديسمبر {fiscalYear}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assets Column */}
              <div className="space-y-4">
                <h3 className="font-black text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-900 flex justify-between">
                  <span>الأصول (Assets)</span>
                  <span className="font-mono">{formatEgyptianCurrency(balanceData.totalAssets)}</span>
                </h3>

                {/* Non-current assets */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-800 flex justify-between">
                    <span>الأصول غير المتداولة (الثابتة بالصافي)</span>
                    <span className="font-mono text-emerald-800">
                      {formatEgyptianCurrency(balanceData.nonCurrentAssets.totalNonCurrentAssets)}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 pr-3 border-r border-slate-200">
                    <div className="flex justify-between">
                      <span>الأصول الثابتة بالتكلفة التاريخية:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.nonCurrentAssets.propertyPlantEquipment)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>(يخصم): مجمع الإهلاك المتراكم:</span>
                      <span className="font-mono">({formatEgyptianCurrency(balanceData.nonCurrentAssets.accumulatedDepreciation)})</span>
                    </div>
                  </div>
                </div>

                {/* Current Assets */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-800 flex justify-between">
                    <span>الأصول المتداولة (Current Assets)</span>
                    <span className="font-mono text-emerald-800">
                      {formatEgyptianCurrency(balanceData.currentAssets.totalCurrentAssets)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-slate-600 pr-3 border-r border-slate-200">
                    <div className="flex justify-between">
                      <span>مخزون بضاعة آخر المدة:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.inventory)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العملاء والمدينون التجاريون:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.tradeReceivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>أوراق القبض (شيكات):</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.notesReceivable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مصلحة الضرائب (خصم وتحصيل وقيمة مضافة):</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.whtTaxDebit + balanceData.currentAssets.vatInputTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مصروفات مدفوعة مقدماً ومدينون متنوعون:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.prepaymentsAndOther)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                      <span>النقدية وما في حكمها بالبنوك والخزينة:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentAssets.cashAndBanks)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between font-black text-sm">
                  <span>إجمالي الأصول:</span>
                  <span className="font-mono text-emerald-400">{formatEgyptianCurrency(balanceData.totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities and Equity Column */}
              <div className="space-y-4">
                <h3 className="font-black text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-900 flex justify-between">
                  <span>حقوق الملكية والالتزامات</span>
                  <span className="font-mono">{formatEgyptianCurrency(balanceData.totalEquityAndLiabilities)}</span>
                </h3>

                {/* Equity */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-800 flex justify-between">
                    <span>حقوق الملكية (Equity)</span>
                    <span className="font-mono text-emerald-800">
                      {formatEgyptianCurrency(balanceData.equity.totalEquity)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-slate-600 pr-3 border-r border-slate-200">
                    <div className="flex justify-between">
                      <span>رأس المال المصدر والمدفوع:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.equity.paidUpCapital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الاحتياطي القانوني (5%):</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.equity.legalReserve)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>أرباح مرحلة من أعوام سابقة:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.equity.retainedEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>صافي ربح العام المالي الحالي:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.equity.currentYearNetProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>جاري الشركاء:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.equity.partnersCurrentAccount)}</span>
                    </div>
                  </div>
                </div>

                {/* Non-current Liabilities */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-800 flex justify-between">
                    <span>الالتزامات طويلة الأجل (غير متداولة)</span>
                    <span className="font-mono text-slate-900">
                      {formatEgyptianCurrency(balanceData.nonCurrentLiabilities.totalNonCurrentLiabilities)}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 pr-3 border-r border-slate-200">
                    <div className="flex justify-between">
                      <span>قروض وتسهيلات بنكية طويلة الأجل:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.nonCurrentLiabilities.longTermLoans)}</span>
                    </div>
                  </div>
                </div>

                {/* Current Liabilities */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-800 flex justify-between">
                    <span>الالتزامات المتداولة (قصيرة الأجل)</span>
                    <span className="font-mono text-slate-900">
                      {formatEgyptianCurrency(balanceData.currentLiabilities.totalCurrentLiabilities)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-slate-600 pr-3 border-r border-slate-200">
                    <div className="flex justify-between">
                      <span>الموردون والدائنون التجاريون:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentLiabilities.tradePayables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>أوراق الدفع:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentLiabilities.notesPayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مصلحة الضرائب (قيمة مضافة + كسب عمل + خصم):</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentLiabilities.vatOutputTax + balanceData.currentLiabilities.payrollTaxPayable + balanceData.currentLiabilities.whtPayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الهيئة القومية للتأمين الاجتماعي:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentLiabilities.socialInsurancePayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مصروفات مستحقة:</span>
                      <span className="font-mono">{formatEgyptianCurrency(balanceData.currentLiabilities.accruedExpenses)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between font-black text-sm">
                  <span>إجمالي حقوق الملكية والالتزامات:</span>
                  <span className="font-mono text-emerald-400">{formatEgyptianCurrency(balanceData.totalEquityAndLiabilities)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. INCOME STATEMENT */}
        {statementTab === 'INCOME' && (
          <div className="space-y-6 text-xs max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
                قائمة الدخل الشامل عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear}
              </h2>
            </div>

            <div className="border border-slate-300 rounded-2xl overflow-hidden divide-y divide-slate-200">
              <div className="p-3.5 bg-slate-50 flex justify-between font-bold text-slate-900 text-sm">
                <span>إيرادات النشاط والمبيعات:</span>
                <span className="font-mono">{formatEgyptianCurrency(incomeData.revenuesTotal)}</span>
              </div>

              <div className="p-3.5 flex justify-between text-slate-700">
                <span>(يخصم): تكلفة المبيعات / البضاعة المباعة:</span>
                <span className="font-mono text-red-700">({formatEgyptianCurrency(incomeData.costOfGoodsSold)})</span>
              </div>

              <div className="p-3.5 bg-emerald-50/70 flex justify-between font-black text-emerald-950 text-sm">
                <span>مجمل الربح (Gross Profit):</span>
                <span className="font-mono">{formatEgyptianCurrency(incomeData.grossProfit)}</span>
              </div>

              <div className="p-3.5 space-y-2">
                <div className="font-bold text-slate-800">(يخصم): المصروفات التشغيلية:</div>
                <div className="pr-4 space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>مصروفات بيعية وتسويقية:</span>
                    <span className="font-mono">({formatEgyptianCurrency(incomeData.sellingAndMarketingExpenses)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مصروفات عمومية وإدارية:</span>
                    <span className="font-mono">({formatEgyptianCurrency(incomeData.administrativeExpenses)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إهلاك الأصول الثابتة السنوي:</span>
                    <span className="font-mono">({formatEgyptianCurrency(incomeData.depreciationExpense)})</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 flex justify-between font-bold text-blue-950">
                <span>صافي أرباح النشاط التشغيلي (EBIT):</span>
                <span className="font-mono">{formatEgyptianCurrency(incomeData.operatingProfit)}</span>
              </div>

              <div className="p-3.5 flex justify-between text-slate-700">
                <span>(يخصم): تكاليف وفوائد تمويلية مصرفية:</span>
                <span className="font-mono text-red-700">({formatEgyptianCurrency(incomeData.financeCosts)})</span>
              </div>

              <div className="p-3.5 flex justify-between font-bold text-slate-900">
                <span>صافي الربح قبل ضريبة الدخل (EBT):</span>
                <span className="font-mono">{formatEgyptianCurrency(incomeData.profitBeforeTax)}</span>
              </div>

              <div className="p-3.5 flex justify-between text-red-800 font-semibold bg-red-50/40">
                <span>(يخصم): مخصص ضريبة الدخل التقديرية (22.5% وفق القانون المصري):</span>
                <span className="font-mono">({formatEgyptianCurrency(incomeData.taxExpense)})</span>
              </div>

              <div className="p-4 bg-emerald-900 text-white flex justify-between font-black text-base">
                <span>صافي أرباح العام بعد الضريبة (Net Profit):</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(incomeData.netProfitAfterTax)}</span>
              </div>
            </div>

            {/* Tafqeet in Arabic */}
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
              <span className="text-slate-500">التفقيط الرسمي للأرباح:</span>{' '}
              {numberToArabicWords(incomeData.netProfitAfterTax)}
            </div>
          </div>
        )}

        {/* 3. CASH FLOW */}
        {statementTab === 'CASH_FLOW' && (
          <div className="space-y-6 text-xs max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4">
                قائمة التدفقات النقدية عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear}
              </h2>
            </div>

            <div className="border border-slate-300 rounded-2xl overflow-hidden divide-y divide-slate-200">
              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)
              </div>
              <div className="p-3.5 space-y-1.5 text-slate-700 pr-6">
                <div className="flex justify-between font-bold">
                  <span>صافي الربح المحاسبي قبل الضريبة:</span>
                  <span className="font-mono">{formatEgyptianCurrency(cashFlowData.operatingCashFlow.netProfitBeforeTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>يضاف: إهلاك الأصول الثابتة (بند غير نقدي):</span>
                  <span className="font-mono">+{formatEgyptianCurrency(cashFlowData.operatingCashFlow.depreciationAdjustment)}</span>
                </div>
                <div className="flex justify-between">
                  <span>التغير في المدينين والعملاء:</span>
                  <span className="font-mono">{formatEgyptianCurrency(cashFlowData.operatingCashFlow.changeInReceivables)}</span>
                </div>
                <div className="flex justify-between">
                  <span>التغير في المخزون السلعي:</span>
                  <span className="font-mono">{formatEgyptianCurrency(cashFlowData.operatingCashFlow.changeInInventory)}</span>
                </div>
                <div className="flex justify-between">
                  <span>التغير في الموردين والدائنين:</span>
                  <span className="font-mono">+{formatEgyptianCurrency(cashFlowData.operatingCashFlow.changeInPayables)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>ضرائب دخل مسددة لمصلحة الضرائب:</span>
                  <span className="font-mono">({formatEgyptianCurrency(Math.abs(cashFlowData.operatingCashFlow.taxPaid))})</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 flex justify-between font-bold text-emerald-900">
                <span>صافي التدفق النقدي من الأنشطة التشغيلية:</span>
                <span className="font-mono">{formatEgyptianCurrency(cashFlowData.operatingCashFlow.netOperatingCash)}</span>
              </div>

              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)
              </div>
              <div className="p-3.5 flex justify-between text-slate-700 pr-6">
                <span>مدفوعات لشراء أصول ثابتة ومعدات:</span>
                <span className="font-mono text-red-700">({formatEgyptianCurrency(Math.abs(cashFlowData.investingCashFlow.purchaseOfFixedAssets))})</span>
              </div>
              <div className="p-3 bg-slate-50 flex justify-between font-bold text-slate-900">
                <span>صافي التدفق النقدي المستخدم في الأنشطة الاستثمارية:</span>
                <span className="font-mono">{formatEgyptianCurrency(cashFlowData.investingCashFlow.netInvestingCash)}</span>
              </div>

              <div className="p-3.5 bg-slate-100 font-black text-slate-900 text-sm">
                ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)
              </div>
              <div className="p-3.5 flex justify-between text-slate-700 pr-6">
                <span>صافي حركة القروض وتوزيعات الأرباح:</span>
                <span className="font-mono">+{formatEgyptianCurrency(cashFlowData.financingCashFlow.netFinancingCash)}</span>
              </div>

              <div className="p-4 bg-slate-900 text-white flex justify-between font-black text-sm">
                <span>صافي الزيادة (النقص) في النقدية وما في حكمها خلال العام:</span>
                <span className="font-mono text-emerald-400">{formatEgyptianCurrency(cashFlowData.netChangeInCash)}</span>
              </div>
              <div className="p-3.5 bg-slate-100 flex justify-between font-bold text-slate-900">
                <span>رصيد النقدية في أول العام:</span>
                <span className="font-mono">{formatEgyptianCurrency(cashFlowData.beginningCash)}</span>
              </div>
              <div className="p-4 bg-emerald-900 text-white flex justify-between font-black text-base">
                <span>رصيد النقدية في نهاية العام (كما بالمركز المالي):</span>
                <span className="font-mono text-emerald-300">{formatEgyptianCurrency(cashFlowData.endingCash)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTES */}
        {statementTab === 'NOTES' && (
          <div className="space-y-5 text-xs text-slate-800 leading-relaxed max-w-3xl mx-auto">
            <div className="text-center pb-2 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900">
                الإيضاحات المتممة للقوائم المالية والسياسات المحاسبية الهامة
              </h2>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-sm text-emerald-900">1. الكيان القانوني ونشاط المنشأة:</h3>
              <p className="pr-3 text-slate-700">
                تأسست شركة النيل للصناعات الهندسية والتجارة كشركة مساهمة مصرية (ش.م.م) خاضعة لأحكام القانون رقم 159 لسنة 1981 ولائحته التنفيذية وتعديلاته وقانون الاستثمار رقم 72 لسنة 2017، وغرضها تصنيع وتوزيع وتوريد المعدات واللوحات الكهروميكانيكية.
              </p>

              <h3 className="font-bold text-sm text-emerald-900">2. أسس إعداد القوائم المالية والامتثال:</h3>
              <p className="pr-3 text-slate-700">
                أعدت القوائم المالية المرفقة طبقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين والقرارات الوزارية المصرية ذات الصلة. تم إعداد القوائم على أساس مبدأ الاستحقاق ومفهوم المنشأة المستمرة (Going Concern).
              </p>

              <h3 className="font-bold text-sm text-emerald-900">3. أهم السياسات المحاسبية المطبقة:</h3>
              <ul className="list-disc pr-6 space-y-1.5 text-slate-700">
                <li><strong>الأصول الثابتة وإهلاكها:</strong> تثبت الأصول الثابتة بالتكلفة التاريخية مخصوماً منها مجمع الإهلاك وخسائر الاضمحلال، وتهلك بطريقة القسط الثابت بنسب (مباني 5%، آلات 10%، سيارات 20%، حواسب 25%).</li>
                <li><strong>المخزون السلعي:</strong> يقيم المخزون بالتكلفة أو صافي القيمة البيعية أيهما أقل، وتحدد التكلفة وفقاً لطريقة المتوسط المرجح.</li>
                <li><strong>الاعتراف بالإيراد:</strong> يتم الاعتراف بالإيراد وفقاً لمعيار المحاسبة المصري رقم (48) "الإيراد من العقود مع العملاء" عند انتقال السيطرة على السلع والخدمات.</li>
                <li><strong>الضرائب والتأمينات:</strong> تحسب ضريبة الدخل بواقع 22.5% وفقاً لقانون الضريبة على الدخل رقم 91 لسنة 2005، وتورد ضريبة القيمة المضافة 14% وفقاً للقانون رقم 67 لسنة 2016.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Auditor Stamp & Signature Footer */}
        <div className="pt-6 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="space-y-1 text-center sm:text-right">
            <div className="font-bold text-slate-500">إعداد ومراجعة المحاسب القانوني ومراقب الحسابات:</div>
            <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
            <div className="text-emerald-800 font-semibold">{profile.title}</div>
            <div className="text-slate-500 font-mono text-[11px]">{profile.licenseNumber}</div>
          </div>

          {/* QR Code and Official Stamp */}
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[10px] text-slate-400 font-bold mb-1">الختم الإلكتروني المعتمد</div>
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-900 p-1 text-center">
                <span>مكتب المحاسب القانوني</span>
                <span className="text-emerald-700 font-black">{profile.auditorName || 'محمد جميل مرعي'}</span>
                <span>{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</span>
                <span className="text-[8px] text-slate-500">معتمد</span>
              </div>
            </div>

            <div
              dangerouslySetInnerHTML={{
                __html: generateQrCodeSvg(`EAS-FIN-REPORT|NILE_ENG|${fiscalYear}|CPA_MOHAMED_GAMIL_MAREI|EAS_APPROVED`, 90),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
