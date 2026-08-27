import React from 'react';
import {
  TrendingUp,
  Wallet,
  Receipt,
  Scale,
  Building2,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Award,
  Sparkles,
  ShieldCheck,
  Percent,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  Laptop,
  Download,
  Keyboard,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface DashboardProps {
  state: DatabaseState;
  onNavigate?: (tabId: string) => void;
  onSelectTab?: (tabId: string) => void;
  onOpenQuickJournal?: () => void;
  onOpenQuickTreasury?: () => void;
  onOpenDesktopModal?: () => void;
  onOpenShortcutsModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onNavigate,
  onSelectTab,
  onOpenQuickJournal,
  onOpenQuickTreasury,
  onOpenDesktopModal,
  onOpenShortcutsModal,
}) => {
  const navigate = onNavigate || onSelectTab || (() => {});

  const calculatedAccounts = computeAccountBalances(state.accounts, state.journalEntries);
  const incomeData = generateIncomeStatement(calculatedAccounts);
  const balanceData = generateBalanceSheet(calculatedAccounts, incomeData);

  // Office treasury summary
  const treasuryIncome = state.treasuryTransactions
    .filter((t) => t.type === 'INCOME_FEES')
    .reduce((sum, t) => sum + t.amount, 0);

  const treasuryExpense = state.treasuryTransactions
    .filter((t) => t.type === 'EXPENSE_OFFICE' || t.type === 'PARTNER_DRAWINGS')
    .reduce((sum, t) => sum + t.amount, 0);

  const treasuryNetBalance = treasuryIncome - treasuryExpense;

  // Unposted entries
  const unpostedEntries = state.journalEntries.filter((e) => !e.isPosted);

  // Tax alerts
  const urgentTaxes = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Professional Polish Welcome & Authority Bar */}
      <div className="bg-[#1E293B] rounded-xl p-5 sm:p-6 text-white shadow-sm border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام التدقيق والرقابة المحاسبية المتكامل - جمهورية مصر العربية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            مرحباً بك، {state.officeProfile.auditorName}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            المنظومة مهيأة بالكامل وفقاً للمعايير المحاسبية المصرية (EAS) وقوانين الضرائب وهيئة الاستثمار وسجل المحاسبين والمراجعين.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          {onOpenShortcutsModal && (
            <button
              onClick={onOpenShortcutsModal}
              id="dash-btn-shortcuts"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer border border-slate-600"
              title="عرض اختصارات لوحة المفاتيح (Ctrl+K)"
            >
              <Keyboard className="w-4 h-4 text-blue-400" />
              <span>اختصارات</span>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono text-blue-300">
                Ctrl+K
              </span>
            </button>
          )}
          {onOpenDesktopModal && (
            <button
              onClick={onOpenDesktopModal}
              id="dash-btn-desktop-install"
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer border border-emerald-400/30"
              title="تثبيت وتحميل البرنامج ليعمل على سطح المكتب"
            >
              <Laptop className="w-4 h-4 text-emerald-200" />
              <span>تحميل لسطح المكتب</span>
            </button>
          )}
          <button
            onClick={() => (onOpenQuickJournal ? onOpenQuickJournal() : navigate('JOURNAL_ENTRIES'))}
            id="dash-btn-journal"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>إضافة قيد يومية</span>
          </button>
          <button
            onClick={() => (onOpenQuickTreasury ? onOpenQuickTreasury() : navigate('OFFICE_TREASURY'))}
            id="dash-btn-treasury"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>حركة بخزنة المكتب</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenues */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الإيرادات والمبيعات</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatEgyptianCurrency(incomeData.revenuesTotal)}
            </div>
            <div className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>مجمل الربح: {formatEgyptianCurrency(incomeData.grossProfit)}</span>
            </div>
          </div>
        </div>

        {/* Net Profit After Tax */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">صافي أرباح العام (بعد الضريبة)</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold tracking-tight ${incomeData.netProfitAfterTax >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatEgyptianCurrency(incomeData.netProfitAfterTax)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              ضريبة الدخل التقديرية (22.5%): {formatEgyptianCurrency(incomeData.taxExpense)}
            </div>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي أصول المنشأة</span>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatEgyptianCurrency(balanceData.totalAssets)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>المركز المالي: {balanceData.isBalanced ? 'متزن محاسبياً' : 'يوجد فارق تسوية'}</span>
            </div>
          </div>
        </div>

        {/* Office Treasury Net Balance */}
        <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-200/80 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">رصيد خزنة المكتب المستقلة</span>
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-950 tracking-tight">
              {formatEgyptianCurrency(treasuryNetBalance)}
            </div>
            <div className="text-xs text-amber-800 font-medium mt-1 flex items-center justify-between">
              <span>أتعاب: {formatEgyptianCurrency(treasuryIncome)}</span>
              <span>مصروفات: {formatEgyptianCurrency(treasuryExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid & Activity Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Services Quick Access & Recent Journal Entries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Services Grid */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>الخدمات المحاسبية والرقابية السريعة للمكتب</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => navigate('FINANCIAL_STATEMENTS')}
                className="p-3.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/70 text-right transition-all group cursor-pointer"
              >
                <FileCheck2 className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-900">القوائم المالية</div>
                <div className="text-[11px] text-slate-500 mt-0.5">مركز مالي ودخل وتدفقات</div>
              </button>

              <button
                onClick={() => navigate('AUDITOR_REPORT')}
                className="p-3.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/70 text-right transition-all group cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-900">تقرير المراقب</div>
                <div className="text-[11px] text-slate-500 mt-0.5">اعتماد محمد جميل مرعي</div>
              </button>

              <button
                onClick={() => navigate('CREDIT_SIMULATOR')}
                className="p-3.5 rounded-lg bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/70 text-right transition-all group cursor-pointer"
              >
                <TrendingUp className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-900">ملف الائتمان البنكي</div>
                <div className="text-[11px] text-slate-500 mt-0.5">توزيع نسبي ذكي للمبيعات</div>
              </button>

              <button
                onClick={() => navigate('CERTIFICATES')}
                className="p-3.5 rounded-lg bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200/70 text-right transition-all group cursor-pointer"
              >
                <Award className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-900">الشهادات المهنية</div>
                <div className="text-[11px] text-slate-500 mt-0.5">دخل ورأس مال وملاءة</div>
              </button>
            </div>
          </div>

          {/* Recent Journal Entries List */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">آخر قيود اليومية العامة المسجلة</h3>
              </div>
              <button
                onClick={() => navigate('JOURNAL_ENTRIES')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>عرض كافة القيود ({state.journalEntries.length})</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {state.journalEntries.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {entry.serialNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{entry.date}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          entry.isPosted
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.isPosted ? 'مرحل للأستاذ' : 'مسودة غير مرحلة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium line-clamp-1">
                      {entry.description}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-sm font-bold text-slate-900">
                      {formatEgyptianCurrency(entry.totalDebit)}
                    </div>
                    <div className="text-[11px] text-slate-400">{entry.lines.length} أطراف</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Tax Declarations & Office Treasury */}
        <div className="space-y-6">
          {/* Tax Tracker Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">تنبيهات الإقرارات الضريبية</h3>
              </div>
              <button
                onClick={() => navigate('TAX_TRACKER')}
                className="text-xs text-blue-600 font-semibold cursor-pointer"
              >
                شاشة الضرائب ←
              </button>
            </div>

            {urgentTaxes.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 text-xs text-center font-medium">
                جميع الإقرارات الضريبية مقدمة ومسددة بالكامل لمصلحة الضرائب المصرية.
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentTaxes.map((tax) => (
                  <div
                    key={tax.id}
                    className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950">
                        {tax.declarationType === 'VAT_10'
                          ? 'إقرار ق.م (نموذج 10)'
                          : tax.declarationType === 'INCOME_27_CORP'
                          ? 'إقرار دخل شركات (نم 27)'
                          : tax.declarationType === 'PAYROLL_4'
                          ? 'إقرار كسب عمل (نم 4)'
                          : 'إقرار ضريبي'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        استحقاق: {tax.dueDate}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 font-medium truncate">
                      {tax.clientName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
                      <span>الفترة: {tax.period}</span>
                      <span className="font-bold text-amber-950">
                        الضريبة: {formatEgyptianCurrency(tax.netVatPayable || tax.netTaxPayable || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Office Treasury Quick Stream */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">حركات خزنة المكتب الأخيرة</h3>
              </div>
              <button
                onClick={() => navigate('OFFICE_TREASURY')}
                className="text-xs text-blue-600 font-semibold cursor-pointer"
              >
                الخزنة ←
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {state.treasuryTransactions.slice(-4).reverse().map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        tx.type === 'INCOME_FEES'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tx.type === 'INCOME_FEES' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">
                        {tx.category}
                      </div>
                      <div className="text-[10px] text-slate-400">{tx.date} • {tx.clientName || 'مصروف مكتب'}</div>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      tx.type === 'INCOME_FEES' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {tx.type === 'INCOME_FEES' ? '+' : '-'} {formatEgyptianCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two Callout Cards from the Professional Polish theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="bg-[#1E293B] text-white rounded-xl p-4 sm:p-5 flex items-center justify-between border border-slate-700 shadow-xs">
          <div>
            <div className="text-xs text-slate-400 font-medium">سجل المراجعين والمحاسبين</div>
            <div className="text-sm sm:text-base font-bold text-white mt-0.5">
              ترخيص مزاولة المهنة: {state.officeProfile.licenseNumber}
            </div>
            <div className="text-[11px] text-blue-400 mt-1">جمعية المحاسبين والمراجعين المصرية</div>
          </div>
          <button
            onClick={() => navigate('AUDITOR_REPORT')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            تقرير المراقب
          </button>
        </div>

        <div className="bg-emerald-900 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between border border-emerald-800 shadow-xs">
          <div>
            <div className="text-xs text-emerald-300 font-medium">المعايير المعتمدة</div>
            <div className="text-sm sm:text-base font-bold text-white mt-0.5">
              معايير المحاسبة المصرية (EAS) وقانون الضرائب 91 لسنة 2005
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1">حسابات ختامية ومراكز مالية معتمدة</div>
          </div>
          <button
            onClick={() => navigate('FINANCIAL_STATEMENTS')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            القوائم الختامية
          </button>
        </div>
      </div>
    </div>
  );
};
