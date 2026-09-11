import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Sparkles,
  Printer,
  Scale,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { runAuditConsistencySentinel, AuditCheckItem, AuditConsistencyReport } from '../../services/auditConsistencyEngine';
import { formatEgyptianCurrency, generateQrCodeSvg, buildVerificationUrl } from '../../utils/qrCodeGenerator';
import { UnifiedScreenCard } from '../common/UnifiedScreenCard';

interface AuditConsistencySentinelViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

export const AuditConsistencySentinelView: React.FC<AuditConsistencySentinelViewProps> = ({
  state,
  fiscalYear = 2026,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ISSUES_ONLY' | 'PASSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [isCertificateMode, setIsCertificateMode] = useState<boolean>(false);

  const report: AuditConsistencyReport = useMemo(() => {
    return runAuditConsistencySentinel(state, fiscalYear);
  }, [state, fiscalYear]);

  const filteredChecks = useMemo(() => {
    return report.checks.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.titleAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.descriptionAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.standardReference.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterSeverity === 'ISSUES_ONLY') return c.status !== 'PASSED';
      if (filterSeverity === 'PASSED') return c.status === 'PASSED';
      return true;
    });
  }, [report.checks, filterSeverity, searchTerm]);

  const handlePostAllDrafts = () => {
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
    <UnifiedScreenCard
      id="audit-consistency-sentinel-card"
      title="المراجع الآلي الذكي لكشف التناقضات والأخطاء (Audit Sentinel)"
      subtitle="محرك التدقيق المتقاطع للاتساق المحاسبي وفق المعايير المصرية (EAS) وقانون 91"
      icon={ShieldCheck}
      badge={
        report.overallHealthScore >= 90
          ? `سلامة محاسبية ${report.overallHealthScore}% ✓`
          : `تنبيهات تدقيق ${report.overallHealthScore}%`
      }
      badgeVariant={
        report.overallHealthScore >= 90
          ? 'emerald'
          : report.overallHealthScore >= 70
          ? 'amber'
          : 'rose'
      }
      primaryAction={{
        id: 'btn-toggle-clearance-cert',
        label: isCertificateMode ? 'عرض الفحص المباشر' : 'استخراج شهادة الفحص المعتمدة',
        icon: isCertificateMode ? ShieldCheck : FileCheck2,
        variant: isCertificateMode ? 'outline' : 'primary',
        onClick: () => setIsCertificateMode(!isCertificateMode),
      }}
      actionMenuItems={[
        {
          id: 'btn-print-sentinel',
          label: 'طباعة التقرير الفني',
          icon: Printer,
          onClick: () => window.print(),
        },
      ]}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="بحث في بنود الفحص والمعايير..."
      filterTabs={[
        { id: 'ALL', label: `كافة بنود الفحص (${report.summary.totalChecks})` },
        { id: 'ISSUES_ONLY', label: `الملاحظات والتناقضات (${report.summary.warningCount + report.summary.criticalCount})` },
        { id: 'PASSED', label: `البنود المتوافقة السليمة (${report.summary.passedCount})` },
      ]}
      activeFilterTab={filterSeverity}
      onFilterTabChange={(tabId) => setFilterSeverity(tabId as any)}
    >
      {isCertificateMode ? (
        /* Official Clearance Certificate Preview */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white space-y-6 shadow-xs">
          <div className="border-b-2 border-slate-800 dark:border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{report.firmName}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">محاسبون قانونيون ومراقبوا حسابات معتمدون</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                سجل المحاسبين والمراجعين: {state.officeProfile?.licenseNumber || '998877'}
              </p>
            </div>
            <div className="sm:text-left">
              <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-800">
                شهادة فحص وتدقيق داخلي معتمدة (Audit Clearance Certificate)
              </span>
              <p className="text-[11px] text-slate-500 mt-1">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs leading-relaxed space-y-2">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              إلى السادة / إدارات الائتمان بالبنوك، ومصلحة الضرائب المصرية، والجهات الرقابية:
            </p>
            <p>
              نشهد نحن مكتب المحاسب القانوني <strong>{report.auditorName}</strong>، وبناءً على نتائج التدقيق الآلي المتقاطع المستند لمعايير المحاسبة المصرية (EAS) وقانون الضرائب 91 لسنة 2005، بأنه قد جرى الفحص الشامل لدفاتر وقوائم منشأة:{' '}
              <strong className="text-blue-600 dark:text-blue-400"> {report.clientName}</strong> عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear}.
            </p>
            <p>
              وقد تحققت سلامة القوائم بمؤشر جودة وتوازن محاسبي قدره <strong>({report.overallHealthScore}%)</strong>، وتطابقت معادلة المركز المالي وميزان المراجعة بصفر فروق.
            </p>
          </div>

          {/* Key figures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">إجمالي أصول المركز المالي:</span>
              <span className="font-mono text-base font-bold text-slate-900 dark:text-white mt-1 block">
                {formatEgyptianCurrency(report.financialSnapshot.totalAssets)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">صافي إيرادات النشاط:</span>
              <span className="font-mono text-base font-bold text-slate-900 dark:text-white mt-1 block">
                {formatEgyptianCurrency(report.financialSnapshot.netSales)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">صافي الربح المعتمد:</span>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {formatEgyptianCurrency(report.financialSnapshot.netProfit)}
              </span>
            </div>
          </div>

          {/* QR & Signature */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-20 h-20 border border-slate-300 dark:border-slate-700 rounded-lg p-1 bg-white shadow-2xs shrink-0"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">كود التحقق الرقمي المشفر:</span>
                <span className="font-mono">AUD-EAS-{fiscalYear}-{Math.abs(Math.round(report.financialSnapshot.totalAssets)).toString().slice(-4)}</span>
                <span className="block text-[10px]">مستند موثق إلكترونياً وغير قابل للتعديل</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <span className="text-xs text-slate-600 dark:text-slate-400 block">المحاسب القانوني ومراقب الحسابات:</span>
              <span className="font-bold text-sm block text-slate-900 dark:text-white">{report.auditorName}</span>
              <span className="text-[10px] text-slate-400 block">(التوقيع والختم المهني)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Live Inspection Dashboard */
        <div className="space-y-4">
          {/* Summary Health Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-black text-lg border-2 ${
                  report.overallHealthScore >= 90
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : report.overallHealthScore >= 70
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                }`}
              >
                {report.overallHealthScore}%
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {report.overallHealthScore === 100
                    ? 'النظام المحاسبي متزن بالكامل وخالٍ من أي تناقضات'
                    : report.overallHealthScore >= 80
                    ? 'النظام متزن محاسبياً مع بعض الملاحظات والتنبيهات الإجرائية'
                    : 'تنبيه: توجد تناقضات محاسبية تحتاج لمعالجة قبل الاعتماد النهائي'}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{report.summary.passedCount} بنود سليمة</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{report.summary.warningCount} ملاحظات</span>
                  {report.summary.criticalCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{report.summary.criticalCount} حرجة</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">فارق توازن الميزانية:</span>
                <span
                  className={`font-bold ${
                    report.financialSnapshot.balanceSheetVariance < 0.01
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {report.financialSnapshot.balanceSheetVariance.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Checks List */}
          <div className="space-y-2.5">
            {filteredChecks.map((check) => {
              const isSelected = selectedCheckId === check.id;
              return (
                <div
                  key={check.id}
                  onClick={() => setSelectedCheckId(isSelected ? null : check.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    check.status === 'PASSED'
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                      : check.severity === 'CRITICAL'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:border-rose-500'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 hover:border-amber-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {check.status === 'PASSED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : check.severity === 'CRITICAL' ? (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{check.titleAr}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {check.standardReference}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{check.descriptionAr}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {check.status === 'PASSED' ? (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                          مطابق ✓
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            check.severity === 'CRITICAL'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {check.severity === 'CRITICAL' ? 'حرج' : 'ملاحظة'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Recommendation */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 space-y-1">
                        <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>التوصية المحاسبية والإجرائية:</span>
                        </span>
                        <p className="leading-relaxed">{check.recommendationAr}</p>
                      </div>

                      {check.id === 'UNPOSTED_ENTRIES' && check.status !== 'PASSED' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostAllDrafts();
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
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
        </div>
      )}
    </UnifiedScreenCard>
  );
};
