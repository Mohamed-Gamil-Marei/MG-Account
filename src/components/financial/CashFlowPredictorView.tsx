import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Printer,
  Sparkles,
  CheckCircle2,
  LineChart,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { generate12MonthPredictiveCashFlow } from '../../utils/performanceEngine';
import { CashFlowMonthForecast } from '../../types';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface CashFlowPredictorViewProps {
  state: DatabaseState;
}

export const CashFlowPredictorView: React.FC<CashFlowPredictorViewProps> = ({ state }) => {
  const [initialCashBuffer, setInitialCashBuffer] = useState<number>(450000);
  const [scenarioMode, setScenarioMode] = useState<'EXPECTED' | 'STRESS_TEST' | 'OPTIMISTIC'>('EXPECTED');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Compute 12-Month Projection
  const forecastMonths: CashFlowMonthForecast[] = useMemo(() => {
    return generate12MonthPredictiveCashFlow(state.accounts, state.journalEntries, initialCashBuffer);
  }, [state.accounts, state.journalEntries, initialCashBuffer]);

  // Aggregate totals
  const totalProjectedInflows = forecastMonths.reduce((s, m) => s + m.expectedInflows.totalInflows, 0);
  const totalProjectedOutflows = forecastMonths.reduce((s, m) => s + m.expectedOutflows.totalOutflows, 0);
  const lowestProjectedMonth = forecastMonths.reduce((min, m) =>
    m.projectedEndingCash < min.projectedEndingCash ? m : min
  );
  const peakProjectedMonth = forecastMonths.reduce((max, m) =>
    m.projectedEndingCash > max.projectedEndingCash ? m : max
  );

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-indigo-800/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>محاكي التدفقات النقدية التنبؤي لـ 12 شهراً | Predictive Liquidity & Cash Flow Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            خريطة السيولة والتدفقات النقدية المستقبلية
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            محاكاة رياضية ذكية للتنبؤ بالتدفقات النقدية الداخلة والخارجة شهرياً، والتنبؤ بمواسم الضغط الضريبي وسداد الموردين قبل حدوث عجز السيولة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تقرير توقعات السيولة</span>
          </button>
        </div>
      </div>

      {/* Control Bar & Key Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">الرصيد النقدي الافتتاحي</span>
          <div className="text-lg font-black text-indigo-400 font-mono">
            {initialCashBuffer.toLocaleString('ar-EG')} <span className="text-xs font-sans text-slate-400">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">رصيد الصندوق والبنوك المتاح</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">إجمالي التدفقات الداخلة المتوقعة (12 شهر)</span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {totalProjectedInflows.toLocaleString('ar-EG')} <span className="text-xs font-sans text-slate-400">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">تحصيلات عملاء ومبيعات نقدية</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">إجمالي التدفقات الخارجة المتوقعة</span>
          <div className="text-lg font-black text-rose-400 font-mono">
            {totalProjectedOutflows.toLocaleString('ar-EG')} <span className="text-xs font-sans text-slate-400">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">موردين، رواتب، ضرائب وإيجار</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">أدنى نقطة سيولة متوقعة</span>
          <div
            className={`text-lg font-black font-mono ${
              lowestProjectedMonth.projectedEndingCash < 100000 ? 'text-amber-400' : 'text-blue-400'
            }`}
          >
            {lowestProjectedMonth.projectedEndingCash.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-sans text-slate-400">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">في شهر ({lowestProjectedMonth.monthNameAr})</span>
        </div>
      </div>

      {/* 12-Month Interactive Trajectory Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-indigo-400" />
              <span>المسار الشهري لتطور رصيد الخزينة والبنوك لعام 2026</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تتبع الأرصدة النقدية بنهاية كل شهر مع تحديد أشهر ذروة الالتزامات (موسم الإقرارات والإقفالات).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScenarioMode('EXPECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenarioMode === 'EXPECTED'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              السيناريو الواقعي المرجح
            </button>
            <button
              onClick={() => setScenarioMode('STRESS_TEST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenarioMode === 'STRESS_TEST'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              سيناريو الضغط (Stress Test -18%)
            </button>
          </div>
        </div>

        {/* 12-Month Bars Chart */}
        <div className="grid grid-cols-12 gap-1.5 items-end h-56 pt-4 pb-2 border-b border-slate-800">
          {forecastMonths.map((m) => {
            const displayEnding =
              scenarioMode === 'STRESS_TEST' ? m.stressTestEndingCash : m.projectedEndingCash;
            const maxVal = Math.max(1200000, peakProjectedMonth.projectedEndingCash);
            const heightPercent = Math.min(100, Math.max(10, Math.round((displayEnding / maxVal) * 100)));

            return (
              <div key={m.monthKey} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[9px] font-mono text-slate-400 mb-1 group-hover:text-white transition-colors truncate">
                  {Math.round(displayEnding / 1000)}k
                </div>

                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    m.riskLevel === 'CRITICAL' || displayEnding < 50000
                      ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-md shadow-rose-600/30'
                      : m.riskLevel === 'WARNING' || displayEnding < 150000
                      ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                      : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${m.monthNameAr}: ${displayEnding.toLocaleString('ar-EG')} ج.م`}
                ></div>

                <div className="mt-2 text-[10px] font-bold text-slate-300 truncate w-full text-center">
                  {m.monthKey.split('-')[1]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              <span>سيولة آمنة ومريحة</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>اقتراب من حد الأمان (Buffer)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>عجز أو ضغط سيولة حرج</span>
            </span>
          </div>

          <span className="text-indigo-400 font-bold">
            * تم احتساب موسم الإقرارات الضريبية لشهر أبريل بنموذج التزامات مصلحة الضرائب المصرية.
          </span>
        </div>
      </div>

      {/* Detailed 12-Month Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black text-white">الجدول التفصيلي للتدفقات الشهرية لعام 2026</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">كافة القيم بالجنيه المصري (EGP)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">الشهر المالي</th>
                <th className="p-3 text-center">رصيد أول المدة</th>
                <th className="p-3 text-center text-emerald-400">إجمالي الداخل (+)</th>
                <th className="p-3 text-center text-rose-400">إجمالي الخارج (-)</th>
                <th className="p-3 text-center">صافي الحركة الشهرية</th>
                <th className="p-3 text-center">الرصيد الختامي المتوقع</th>
                <th className="p-3 text-center">تقييم الأمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {forecastMonths.map((m) => (
                <tr key={m.monthKey} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-bold text-white">{m.monthNameAr}</td>
                  <td className="p-3 font-mono text-center text-slate-300">
                    {m.openingCash.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-3 font-mono text-center font-bold text-emerald-400">
                    +{m.expectedInflows.totalInflows.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-3 font-mono text-center font-bold text-rose-400">
                    -{m.expectedOutflows.totalOutflows.toLocaleString('ar-EG')}
                  </td>
                  <td
                    className={`p-3 font-mono text-center font-bold ${
                      m.netMonthlyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.netMonthlyChange >= 0 ? '+' : ''}
                    {m.netMonthlyChange.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-3 font-mono text-center font-black text-indigo-300 text-sm">
                    {m.projectedEndingCash.toLocaleString('ar-EG')} ج.م
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        m.riskLevel === 'SAFE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : m.riskLevel === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {m.riskLevel === 'SAFE' ? 'فائض مريح' : m.riskLevel === 'WARNING' ? 'مراقبة حذرة' : 'عجز متوقع'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Cash Forecast Print Modal */}
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
              documentTitle="تقرير الموازنة التقديرية وتوقعات التدفقات النقدية (Cash Forecast)"
              documentRefNumber={`CASH-PROJ-${new Date().getFullYear()}-01`}
              documentDate={new Date().toLocaleDateString('ar-EG')}
              companyName={state.officeProfile?.firmName || 'الشركة المصرية للتجارة والمقاولات'}
              showSignatureStamp={true}
              notes="تم إعداد الموازنة النقدية التقديرية لعام 2026 استناداً لمعدلات تحصيل العملاء وجداول استحقاق الالتزامات والضرائب."
            >
              <div className="space-y-6 text-right py-4 text-xs">
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-slate-500 block">إجمالي المقبوضات المتوقعة:</span>
                    <span className="font-bold text-emerald-800 text-base">
                      {totalProjectedInflows.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">إجمالي المدفوعات التقديرية:</span>
                    <span className="font-bold text-rose-800 text-base">
                      {totalProjectedOutflows.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">صافي الفائض السنوي:</span>
                    <span className="font-bold text-indigo-900 text-base">
                      {(totalProjectedInflows - totalProjectedOutflows).toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2">الشهر</th>
                        <th className="p-2 text-center">المقبوضات</th>
                        <th className="p-2 text-center">المدفوعات</th>
                        <th className="p-2 text-center">صافي التدفق</th>
                        <th className="p-2 text-center">الرصيد الختامي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {forecastMonths.map((m) => (
                        <tr key={m.monthKey}>
                          <td className="p-2 font-bold">{m.monthNameAr}</td>
                          <td className="p-2 font-mono text-center">{m.expectedInflows.totalInflows.toLocaleString('ar-EG')}</td>
                          <td className="p-2 font-mono text-center">{m.expectedOutflows.totalOutflows.toLocaleString('ar-EG')}</td>
                          <td className="p-2 font-mono text-center font-bold">
                            {m.netMonthlyChange.toLocaleString('ar-EG')}
                          </td>
                          <td className="p-2 font-mono text-center font-bold text-slate-900">
                            {m.projectedEndingCash.toLocaleString('ar-EG')} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </PrintLayoutWrapper>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير التقديري الرسمي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
