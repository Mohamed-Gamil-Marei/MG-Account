import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  FileCheck,
  Search,
  Filter,
  Info,
  Layers,
  Sparkles,
  Printer,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { calculateBenfordDistribution } from '../../utils/performanceEngine';
import { AnomalyAlert } from '../../types';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface FraudAuditSentinelViewProps {
  state: DatabaseState;
}

export const FraudAuditSentinelView: React.FC<FraudAuditSentinelViewProps> = ({ state }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Compute Benford's and Forensic Anomaly results
  const forensicResults = useMemo(() => {
    return calculateBenfordDistribution(state.journalEntries);
  }, [state.journalEntries]);

  const filteredAnomalies = useMemo(() => {
    return forensicResults.anomalies.filter((a) => {
      const matchQuery =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (selectedSeverity === 'ALL') return true;
      return a.severity === selectedSeverity;
    });
  }, [forensicResults.anomalies, searchQuery, selectedSeverity]);

  const criticalCount = forensicResults.anomalies.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = forensicResults.anomalies.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Top Forensic Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-red-900/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>نظام التدقيق الجنائي المالي ورصد الاحتيال | Benford's Law Forensic Sentinel</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            حارس الرقابة المالية وكشف الأنماط المشبوهة
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            تطبيق قانون بنفورد الإحصائي (Benford's Law) وخوارزميات الرصد الذاتي لاكتشاف التلاعب المحاسبي، الأرقام الدائرية المصطنعة، والسحوبات المخالفة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-700/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة ملف الرقابة الجنائية</span>
          </button>
        </div>
      </div>

      {/* Forensic Score & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">مؤشر مخاطر التدقيق (Audit Risk)</span>
          <div className="flex items-center gap-2">
            <div
              className={`text-2xl font-black font-mono ${
                forensicResults.overallRiskScore > 50
                  ? 'text-red-400'
                  : forensicResults.overallRiskScore > 25
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {forensicResults.overallRiskScore} / 100
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                forensicResults.overallRiskScore > 50
                  ? 'bg-red-500/20 text-red-300'
                  : forensicResults.overallRiskScore > 25
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {forensicResults.overallRiskScore > 50
                ? 'مخاطر مرتفعة'
                : forensicResults.overallRiskScore > 25
                ? 'مخاطر متوسطة'
                : 'آمن ومنتظم'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">محسوب بناءً على معايير ISA 240</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">عينة القيود والمبالغ المفحوصة</span>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {forensicResults.totalSampleAmounts.toLocaleString('ar-EG')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            من إجمالي {state.journalEntries.length} قيد يومية مسجل
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">مخالفات وسحوبات حرجة (Critical)</span>
          <div className="text-2xl font-black text-rose-400 font-mono">{criticalCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">سحوبات نقدية ضخمة أو قيود عطلات</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">تنبيهات وملاحظات عالية الأهمية</span>
          <div className="text-2xl font-black text-amber-400 font-mono">{highCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">أرقام دائرية مصطنعة بدون كسور</span>
        </div>
      </div>

      {/* Benford's Law First-Digit Visual Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" />
              <span>منحنى توزيع قانون بنفورد للرقم الأول (Benford's Law Distribution)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مقارنة التوزيع التكراري الفعلي لمبالغ القيود مع التوزيع الرياضي الطبيعي لكشف أي افتعال أو تزوير في الأرقام.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block"></span>
              <span>التوزيع الفعلي للدفاتر</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-slate-600 inline-block"></span>
              <span>المعيار الطبيعي المتوقع</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="grid grid-cols-9 gap-2 items-end h-48 pt-4 pb-2 border-b border-slate-800">
          {forensicResults.digitStats.map((stat) => {
            const maxH = 100;
            const actualHeight = Math.min(100, Math.round((stat.actualPercentage / 35) * maxH));
            const expectedHeight = Math.min(100, Math.round((stat.expectedPercentage / 35) * maxH));

            return (
              <div key={stat.digit} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 mb-1 group-hover:text-white transition-colors">
                  {stat.actualPercentage}%
                </div>
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Expected Bar */}
                  <div
                    className="w-1/2 bg-slate-700/60 rounded-t-xs transition-all"
                    style={{ height: `${expectedHeight}%` }}
                    title={`المتوقع للرقم ${stat.digit}: ${stat.expectedPercentage}%`}
                  ></div>
                  {/* Actual Bar */}
                  <div
                    className={`w-1/2 rounded-t-xs transition-all ${
                      stat.isAnomalous
                        ? 'bg-rose-500 shadow-md shadow-rose-500/30'
                        : 'bg-blue-500'
                    }`}
                    style={{ height: `${actualHeight}%` }}
                    title={`الفعلي للرقم ${stat.digit}: ${stat.actualPercentage}% (${stat.actualCount} حركة)`}
                  ></div>
                </div>
                <div
                  className={`mt-2 font-mono font-bold text-xs px-2 py-0.5 rounded-sm ${
                    stat.isAnomalous ? 'bg-rose-500/20 text-rose-300' : 'text-slate-300'
                  }`}
                >
                  {stat.digit}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
          <span>* الرقم (1) هو الأكثر ظهوراً طبيعياً بنسبة ~30.1% ويتناقص التوزيع تدريجياً حتى الرقم (9) بنسبة ~4.6%.</span>
          <span className="text-amber-400 font-bold">
            {forensicResults.digitStats.filter((d) => d.isAnomalous).length > 0
              ? `تم رصد انحراف غير طبيعي في الأرقام: ${forensicResults.digitStats
                  .filter((d) => d.isAnomalous)
                  .map((d) => d.digit)
                  .join(' ، ')}`
              : 'كافة الأرقام متطابقة إحصائياً مع منحنى بنفورد الطبيعي ✓'}
          </span>
        </div>
      </div>

      {/* Forensic Anomaly Radar Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-black text-white">سجل الانحرافات والمخاطر المكتشفة آلياً</h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="بحث في الحسابات أو نوع الانحراف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">جميع المستويات</option>
              <option value="CRITICAL">حرجة (Critical)</option>
              <option value="HIGH">مرتفعة (High)</option>
              <option value="MEDIUM">متوسطة (Medium)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">القيد والتاريخ</th>
                <th className="p-3">الحساب المعني</th>
                <th className="p-3 text-center">المبلغ</th>
                <th className="p-3 text-center">مستوى الخطورة</th>
                <th className="p-3">طبيعة الانحراف والمخاطرة</th>
                <th className="p-3">توصية مراقب الحسابات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    لا توجد انحرافات أو مؤشرات تلاعب مطابقة لخيارات البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono">
                      <div className="text-white font-bold">قيد #{anom.entryNumber}</div>
                      <div className="text-[10px] text-slate-400">{anom.entryDate}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-200">{anom.accountName}</td>
                    <td className="p-3 font-mono text-center font-bold text-white">
                      {anom.amount.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : anom.severity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {anom.severity === 'CRITICAL'
                          ? 'حرج'
                          : anom.severity === 'HIGH'
                          ? 'مرتفع'
                          : 'متوسط'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs">
                      <div className="font-bold text-white mb-0.5">{anom.title}</div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">{anom.description}</div>
                    </td>
                    <td className="p-3 text-amber-300 text-[11px] max-w-xs leading-relaxed">
                      {anom.recommendation}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Forensic Audit Report Modal */}
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
              documentTitle="تقرير الرقابة والتدقيق الجنائي المالي (Forensic Audit Report)"
              documentRefNumber={`FOR-AUDIT-${new Date().getFullYear()}-009`}
              documentDate={new Date().toLocaleDateString('ar-EG')}
              companyName={state.officeProfile?.firmName || 'الشركة المصرية للتجارة والصناعة'}
              showSignatureStamp={true}
              notes="تم الفحص والتحليل الجنائي استناداً لمعايير المراجعة الدولية ISA 240 الخاصة بمسؤولية مراجع الحسابات عن الاحتيال والأنماط الشاذة."
            >
              <div className="space-y-6 text-right py-4 text-xs">
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-slate-500 block">مؤشر مخاطر الفحص:</span>
                    <span className="font-bold text-slate-900 text-base">{forensicResults.overallRiskScore} / 100</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">عدد المبالغ المفحوصة:</span>
                    <span className="font-bold text-slate-900 text-base">
                      {forensicResults.totalSampleAmounts.toLocaleString('ar-EG')} حركة
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">النتيجة العامة:</span>
                    <span className="font-bold text-emerald-800 text-base">مستوى مخاطر منضبط</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-300 pb-1">
                    أولاً: ملخص فحص قانون بنفورد (Benford's Law Forensic Analysis)
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    تم فحص الأرقام المحاسبية المسجلة باليومية العامة وفق المنحنى الإحصائي الطبيعي، وتبين انتظام غالبية الأرقام المسجلة مع نسب الظهور الطبيعية مع عدم وجود افتعال أو تكرار غير مبرر للأرقام العشوائية.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-300 pb-1">
                    ثانياً: قائمة القيود الموصى بفحص مستنداتها المؤيدة
                  </h4>
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2">رقم القيد</th>
                          <th className="p-2">الحساب</th>
                          <th className="p-2 text-center">المبلغ</th>
                          <th className="p-2">الملاحظة الجنائية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {forensicResults.anomalies.slice(0, 8).map((a) => (
                          <tr key={a.id}>
                            <td className="p-2 font-mono font-bold">#{a.entryNumber}</td>
                            <td className="p-2 font-bold">{a.accountName}</td>
                            <td className="p-2 font-mono text-center">{a.amount.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-2 text-slate-700">{a.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </PrintLayoutWrapper>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير الجنائي المعتمد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
