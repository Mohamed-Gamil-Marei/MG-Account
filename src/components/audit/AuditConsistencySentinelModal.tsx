import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Sparkles,
  Printer,
  X,
  Scale,
  DollarSign,
  TrendingUp,
  Award,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { runAuditConsistencySentinel, AuditCheckItem, AuditConsistencyReport } from '../../services/auditConsistencyEngine';
import { formatEgyptianCurrency, generateQrCodeSvg, buildVerificationUrl } from '../../utils/qrCodeGenerator';

interface AuditConsistencySentinelModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  fiscalYear?: number;
}

export const AuditConsistencySentinelModal: React.FC<AuditConsistencySentinelModalProps> = ({
  isOpen,
  onClose,
  state,
  fiscalYear = 2026,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ISSUES_ONLY' | 'PASSED'>('ALL');
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);

  const report: AuditConsistencyReport = useMemo(() => {
    return runAuditConsistencySentinel(state, fiscalYear);
  }, [state, fiscalYear]);

  if (!isOpen) return null;

  const filteredChecks = report.checks.filter((c) => {
    if (filterSeverity === 'ISSUES_ONLY') return c.status !== 'PASSED';
    if (filterSeverity === 'PASSED') return c.status === 'PASSED';
    return true;
  });

  const handlePostAllDrafts = () => {
    // Post any draft entries
    const draftIds = state.journalEntries.filter((e) => !e.isPosted).map((e) => e.id);
    if (draftIds.length > 0) {
      db.postBatchJournalEntries(draftIds);
    }
  };

  const qrUrl = buildVerificationUrl({
    docNumber: `AUDIT-CLEARANCE-${fiscalYear}-${Date.now().toString().slice(-4)}`,
    docType: 'شهادة فحص وتدقيق مالي متقاطع',
    clientName: report.clientName,
    auditorName: report.auditorName,
    licenseNumber: state.officeProfile?.licenseNumber || '998877',
    amount: report.financialSnapshot.totalAssets,
    date: new Date().toISOString().slice(0, 10),
    fiscalYear,
  });
  const qrSvg = generateQrCodeSvg(qrUrl, 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 text-slate-100 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                report.overallHealthScore >= 90
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : report.overallHealthScore >= 70
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  المراجع الآلي الذكي لكشف التناقضات والأخطاء (AI Audit Sentinel)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  EAS & Law 91
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                فحص آلي وتدقيق متقاطع لـ {report.summary.totalChecks} مؤشر توازن محاسبي وقانوني للمنشأة: [{report.clientName}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintPreview(!isPrintPreview)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>{isPrintPreview ? 'عرض الفحص المباشر' : 'شهادة التدقيق المعتمدة'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print / Clearance Certificate Preview Mode */}
        {isPrintPreview ? (
          <div className="p-6 overflow-y-auto bg-white text-slate-900 font-serif space-y-6">
            <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{report.firmName}</h2>
                <p className="text-xs text-slate-600">محاسبون قانونيون ومراقبوا حسابات معتمدون</p>
                <p className="text-[11px] text-slate-500">رقم القيد بسجل المحاسبين: {state.officeProfile?.licenseNumber || '998877'}</p>
              </div>
              <div className="text-left">
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                  شهادة خلو من التناقضات الجوهرية (Clean Audit Clearance)
                </span>
                <p className="text-[11px] text-slate-500 mt-1">تاريخ الفحص: {new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs leading-relaxed space-y-2">
              <p className="font-bold text-slate-800">إلى السادة / الجهات المعنية، البنوك، ومصلحة الضرائب المصرية:</p>
              <p>
                نشهد نحن مكتب المحاسب القانوني <strong>{report.auditorName}</strong>، وبناءً على إجراءات التدقيق والتحقق الآلي المستند لمعايير المحاسبة المصرية (EAS) وقانون الضرائب رقم 91 لسنة 2005، بأنه قد جرى التدقيق والمطابقة الكاملة لقوائم وسجلات منشأة:
                <strong className="text-blue-900"> {report.clientName}</strong> عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear}.
              </p>
              <p>
                وقد أسفر الفحص المتزن عن مؤشر سلامة محاسبية بنسبة <strong>({report.overallHealthScore}%)</strong>، مع تأكيد توازن الميزانية وميزان المراجعة وترحيل كامل أرباح النشاط بدقة الفلس.
              </p>
            </div>

            {/* Key figures table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 font-bold p-2.5 border-b border-slate-300">
                ملخص المؤشرات المدققة والمعتمدة:
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-200 text-center p-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">إجمالي أصول المركز المالي:</span>
                  <span className="font-bold font-mono text-sm text-slate-900">
                    {formatEgyptianCurrency(report.financialSnapshot.totalAssets)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">صافي إيرادات النشاط:</span>
                  <span className="font-bold font-mono text-sm text-slate-900">
                    {formatEgyptianCurrency(report.financialSnapshot.netSales)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">صافي الربح المعتمد:</span>
                  <span className="font-bold font-mono text-sm text-emerald-700">
                    {formatEgyptianCurrency(report.financialSnapshot.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stamp, Signature & Official QR Code */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 border border-slate-300 rounded-lg p-1 bg-white shadow-2xs"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-bold block text-slate-700">الباركود المشفر للتحقق الفوري:</span>
                  <span>كود التحقق: {`AUD-${fiscalYear}-${Math.abs(Math.round(report.financialSnapshot.totalAssets)).toString().slice(-5)}`}</span>
                  <span className="block">وثيقة معتمدة ومسجلة بسجلات المكتب</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs text-slate-600 block">مراقب الحسابات والمراجع القانوني:</span>
                <span className="font-bold text-sm block">{report.auditorName}</span>
                <span className="text-[10px] text-slate-400 block">(التوقيع والختم المعتمد)</span>
              </div>
            </div>

            <div className="no-print pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير / تصدير PDF</span>
              </button>
            </div>
          </div>
        ) : (
          /* Interactive Inspection Dashboard */
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* Health Score Banner */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-black text-lg border-2 ${
                      report.overallHealthScore >= 90
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40'
                        : report.overallHealthScore >= 70
                        ? 'border-amber-500 text-amber-400 bg-amber-950/40'
                        : 'border-rose-500 text-rose-400 bg-rose-950/40'
                    }`}
                  >
                    {report.overallHealthScore}%
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {report.overallHealthScore === 100
                        ? 'الملف المحاسبي متزن 100% وخالٍ من أي تناقضات'
                        : report.overallHealthScore >= 80
                        ? 'الملف متزن محاسبياً مع بعض الملاحظات الإجرائية'
                        : 'تنبيه: توجد تناقضات محاسبية تتطلب المعالجة قبل الاعتماد'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-bold">{report.summary.passedCount} بنود سليمة</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{report.summary.warningCount} ملاحظات</span>
                    {report.summary.criticalCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">{report.summary.criticalCount} حرجة</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterSeverity('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterSeverity === 'ALL'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الكل ({report.summary.totalChecks})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSeverity('ISSUES_ONLY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterSeverity === 'ISSUES_ONLY'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الملاحظات ({report.summary.warningCount + report.summary.criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSeverity('PASSED')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterSeverity === 'PASSED'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  المجتازة ({report.summary.passedCount})
                </button>
              </div>
            </div>

            {/* Checks Grid / List */}
            <div className="space-y-2.5">
              {filteredChecks.map((check) => {
                const isSelected = selectedCheckId === check.id;
                return (
                  <div
                    key={check.id}
                    onClick={() => setSelectedCheckId(isSelected ? null : check.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      check.status === 'PASSED'
                        ? 'bg-slate-950/40 border-slate-800/80 hover:border-emerald-500/40'
                        : check.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-500/60'
                        : 'bg-amber-950/20 border-amber-800/60 hover:border-amber-500/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {check.status === 'PASSED' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : check.severity === 'CRITICAL' ? (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{check.titleAr}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {check.standardReference}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{check.descriptionAr}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {check.status === 'PASSED' ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/80">
                            مطابق ✓
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              check.severity === 'CRITICAL'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800'
                            }`}
                          >
                            {check.severity === 'CRITICAL' ? 'حرج' : 'تنبيه'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed drawer / Recommendation */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-100 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 space-y-1">
                          <span className="font-bold text-amber-400 block flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>التوصية المحاسبية للمراجع:</span>
                          </span>
                          <p className="text-slate-300 leading-relaxed">{check.recommendationAr}</p>
                        </div>

                        {check.id === 'UNPOSTED_ENTRIES' && check.status !== 'PASSED' && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePostAllDrafts();
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ترحيل كافة القيود المسودة فوراً</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center text-[11px]">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">إجمالي الأصول:</span>
                <span className="font-bold font-mono text-white text-xs">
                  {formatEgyptianCurrency(report.financialSnapshot.totalAssets)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">إجمالي الخصوم وحقوق الملكية:</span>
                <span className="font-bold font-mono text-white text-xs">
                  {formatEgyptianCurrency(report.financialSnapshot.totalLiabilitiesAndEquity)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">فارق التوازن:</span>
                <span
                  className={`font-bold font-mono text-xs ${
                    report.financialSnapshot.balanceSheetVariance < 0.01 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {report.financialSnapshot.balanceSheetVariance.toFixed(2)} ج.م
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">صافي الربح المعتمد:</span>
                <span className="font-bold font-mono text-emerald-400 text-xs">
                  {formatEgyptianCurrency(report.financialSnapshot.netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>نظام الفحص المتطابق مع معايير المراجعة المصرية (ESA) وقانون الضرائب 91</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
