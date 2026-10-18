import React, { useState, useMemo } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  Lock,
  Unlock,
  X,
  CheckCircle2,
  ArrowLeftRight,
  AlertTriangle,
  Calendar,
  Eye,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface YearEndClosingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onSuccess?: () => void;
}

export const YearEndClosingWizardModal: React.FC<YearEndClosingWizardModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess,
}) => {
  const activeClientId = state.activeClientContext?.clientId || '';
  const activeClient = state.clients.find((c) => c.id === activeClientId);
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [fiscalYear, setFiscalYear] = useState(
    state.activeClientContext?.selectedFiscalYear ||
      activeClient?.fiscalYear ||
      activeClient?.activeFiscalYear ||
      2026
  );
  const [rolloverToNextYear, setRolloverToNextYear] = useState(true);
  const [lockClosedPeriod, setLockClosedPeriod] = useState(true);
  const [showLinePreview, setShowLinePreview] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [closingResult, setClosingResult] = useState<{
    closingEntryNumber: string | number;
    incomeSummaryEntryId: string;
    netIncome: number;
    isProfit: boolean;
    rolledAccountsCount: number;
    toFiscalYear: number;
  } | null>(null);

  const bounds = useMemo(() => {
    if (!activeClientId) return null;
    return db.getClientFiscalYearBounds(activeClientId, fiscalYear);
  }, [activeClientId, fiscalYear, activeClient]);

  const preview = useMemo(() => {
    if (!activeClientId) return null;
    try {
      return db.previewYearEndClosing(activeClientId, fiscalYear);
    } catch {
      return null;
    }
  }, [activeClientId, fiscalYear, state.journalEntries, state.fiscalPeriodLocks, state.accounts, state.openingBalances]);

  if (!isOpen) return null;

  const handleExecuteClosing = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!activeClientId) {
      setErrorMsg('يجب اختيار المنشأة (العميل النشط) أولاً قبل إقفال السنة المالية.');
      return;
    }

    try {
      const res = db.executeYearEndClosing(activeClientId, fiscalYear, {
        rolloverToNextYear,
        lockPeriod: lockClosedPeriod,
        reason: `إقفال حقيقي للسنة المالية (${fiscalYear}) وترحيل صافي الدخل والأرصدة للسنة (${fiscalYear + 1})`,
      });

      setClosingResult({
        closingEntryNumber: res.closingEntryNumber,
        incomeSummaryEntryId: res.incomeSummaryEntryId,
        netIncome: res.netIncome,
        isProfit: res.isProfit,
        rolledAccountsCount: res.rolledAccountsCount,
        toFiscalYear: fiscalYear + 1,
      });

      onSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر إتمام إقفال السنة المالية.');
    }
  };

  const handleUnlockPeriod = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!activeClientId) return;
    if (!unlockReason.trim()) {
      setErrorMsg('يجب إدخال سبب رسمي لفك إقفال الفترة المالية.');
      return;
    }

    try {
      db.unlockFiscalPeriod(activeClientId, fiscalYear, unlockReason.trim());
      setSuccessMsg(`تم فك إقفال السنة المالية (${fiscalYear}) بنجاح وتوثيق العملية في سجل المراجعة.`);
      setUnlockReason('');
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر فك إقفال الفترة المالية.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                معالج إقفال السنة المالية وترحيل الأرصدة
              </h3>
              <p className="text-xs text-slate-500">
                إقفال حقيقي للإيرادات والمصروفات وتوزيع صافي الدخل وتدوير الأرصدة الافتتاحية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!activeClientId || !activeClient ? (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-sm">يرجى اختيار المنشأة أولاً</p>
              <p className="mt-0.5">لا يمكن تنفيذ إقفال السنة المالية بدون تحديد المنشأة المستهدفة.</p>
            </div>
          </div>
        ) : closingResult ? (
          /* Success Receipt Screen */
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-950 dark:text-emerald-50">
                    تم إقفال السنة المالية ({fiscalYear}) وترحيل الأرصدة بنجاح تام!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    المنشأة: {activeClient.name} • نطاق الفترة المقفولة: {bounds?.startDate} إلى {bounds?.endDate}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 text-center font-mono">
                <div className="bg-white/80 dark:bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">قيد إقفال النشاط</span>
                  <span className="font-black text-sm">#{closingResult.closingEntryNumber}</span>
                </div>
                <div className="bg-white/80 dark:bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">صافي الدخل المرحل</span>
                  <span className={`font-black text-sm ${closingResult.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatEgyptianCurrency(closingResult.netIncome)}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">الحسابات المرحلة</span>
                  <span className="font-black text-sm">{closingResult.rolledAccountsCount} حساب</span>
                </div>
                <div className="bg-white/80 dark:bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">السنة الجديدة</span>
                  <span className="font-black text-sm">{closingResult.toFiscalYear}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-100/70 dark:bg-emerald-900/60 rounded-xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  التحقق المحاسبي بعد الإقفال (Post-Closing Equilibrium):
                </p>
                <p>
                  • أرصدة كافة حسابات الإيرادات والمصروفات أصبحت <strong>0.00 ج.م</strong>.
                </p>
                <p>
                  • تم ترحيل صافي الربح إلى حساب <strong>الأرباح المحتجزة (3102)</strong>.
                </p>
                <p>
                  • تم ترحيل أرصدة الأصول والالتزامات وحقوق الملكية كأرصدة افتتاحية للسنة ({closingResult.toFiscalYear}).
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800"
              >
                إتمام وإغلاق
              </button>
            </div>
          </div>
        ) : (
          /* Main Closing Wizard Step */
          <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
            {/* Context & Year Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500 text-[11px] block">المنشأة المستهدفة</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{activeClient.name}</span>
                <span className="text-slate-400 font-mono text-[11px] block">{activeClient.code}</span>
              </div>
              <div>
                <label className="text-slate-500 text-[11px] block font-bold mb-1">السنة المالية للإقفال</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value) || 2026)}
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-black text-sm"
                  />
                  <div className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{bounds?.startDate} → {bounds?.endDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Locked Period Warning & Admin Unlock Panel */}
            {preview?.isCurrentlyLocked ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 space-y-3">
                <div className="flex items-center gap-2.5 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>الفترة المالية ({fiscalYear}) مقفلة بالفعل لهذه المنشأة</span>
                </div>
                <p className="text-xs">
                  تم إقفال هذه السنة سابقاً لمنع أي تعديل أو ازدواجية. لإعادة الإقفال أو تعديل القيود، يلزم فك إقفال الفترة بواسطة مدير النظام.
                </p>

                {isAdmin ? (
                  <div className="pt-2 border-t border-rose-200 dark:border-rose-800 space-y-2">
                    <label className="block font-bold text-[11px] text-rose-950 dark:text-rose-100">
                      سبب فك إقفال الفترة (إلزامي للتوثيق بسجل المراجعة):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={unlockReason}
                        onChange={(e) => setUnlockReason(e.target.value)}
                        placeholder="مثال: تصحيح قيد تسوية أخير معتمد من الشريك..."
                        className="flex-1 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleUnlockPeriod}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-rose-700 shrink-0"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>فك الإقفال (ADMIN)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>فك الإقفال يتطلب صلاحية مدير النظام (ADMIN). حسابك الحالي لا يمتلك هذه الصلاحية.</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Pre-closing Verification Checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <span className="font-bold text-slate-900 dark:text-white block">
                فحص شروط الإقفال المحاسبي (Validation Pre-Checks):
              </span>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    {preview?.draftEntriesCount === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>ترحيل كافة قيود السنة (لا توجد قيود مسودة DRAFT)</span>
                  </span>
                  <span className="font-mono font-bold">
                    {preview?.draftEntriesCount === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400">مكتمل (0 مسودة)</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">{preview?.draftEntriesCount} قيد مسودة معلق</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    {preview?.isBalancedBeforeClosing ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>توازن ميزان المراجعة قبل الإقفال (مدين = دائن)</span>
                  </span>
                  <span className="font-mono font-bold">
                    {preview?.isBalancedBeforeClosing ? (
                      <span className="text-emerald-700 dark:text-emerald-400">متوازن (فارق 0.00 ج.م)</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">غير متوازن (فارق: {preview?.differenceBeforeClosing} ج.م)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    {!preview?.isCurrentlyLocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>حالة الفترة المالية للسنة ({fiscalYear})</span>
                  </span>
                  <span className="font-mono font-bold">
                    {!preview?.isCurrentlyLocked ? (
                      <span className="text-emerald-700 dark:text-emerald-400">فترة مفتوحة تقبل الإقفال</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">فترة مقفلة سابقاً</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Income & P&L Summary Cards */}
            {preview && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <span className="text-slate-500 text-[11px] block">إجمالي إيرادات السنة</span>
                  <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                    {formatEgyptianCurrency(preview.totalRevenues)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{preview.revenueRows.length} حساب إيرادات</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-slate-500 text-[11px] block">إجمالي تكاليف ومصروفات</span>
                  <span className="font-mono font-black text-sm text-amber-700 dark:text-amber-300">
                    {formatEgyptianCurrency(preview.totalExpenses)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{preview.expenseRows.length} حساب مصروفات</span>
                </div>
                <div className={`p-3 rounded-2xl border ${
                  preview.isProfit
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                }`}>
                  <span className="text-slate-500 text-[11px] block">{preview.isProfit ? 'صافي الربح المحقق' : 'صافي الخسارة المحققة'}</span>
                  <span className={`font-mono font-black text-sm ${
                    preview.isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}>
                    {formatEgyptianCurrency(preview.netIncome)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">يُرحل إلى الأرباح المحتجزة</span>
                </div>
              </div>
            )}

            {/* Closing Journal Lines Preview Toggle */}
            {preview && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowLinePreview(!showLinePreview)}
                    className="flex items-center gap-2 font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-xs"
                  >
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span>معاينة سطور قيود الإقفال الآلية ({preview.proposedClosingEntryLines.length + preview.proposedRetainedEarningsLines.length} سطر)</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    حـ/ ملخص الدخل 3999 + حـ/ الأرباح المحتجزة 3102
                  </span>
                </div>

                {showLinePreview && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3 max-h-56 overflow-y-auto">
                    <div>
                      <span className="font-bold text-[11px] text-indigo-700 dark:text-indigo-300 block mb-1">
                        1. قيد إقفال الإيرادات والمصروفات إلى ملخص الدخل:
                      </span>
                      <table className="w-full text-[11px] text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <th className="p-1 border">كود الحساب</th>
                            <th className="p-1 border">اسم الحساب</th>
                            <th className="p-1 border">مدين (ج.م)</th>
                            <th className="p-1 border">دائن (ج.م)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.proposedClosingEntryLines.map((l, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="p-1 border font-mono">{l.accountCode}</td>
                              <td className="p-1 border">{l.accountName}</td>
                              <td className="p-1 border font-mono">{l.debit > 0 ? formatEgyptianCurrency(l.debit) : '-'}</td>
                              <td className="p-1 border font-mono">{l.credit > 0 ? formatEgyptianCurrency(l.credit) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {preview.proposedRetainedEarningsLines.length > 0 && (
                      <div>
                        <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300 block mb-1">
                          2. قيد إقفال ملخص الدخل في الأرباح المحتجزة (3102):
                        </span>
                        <table className="w-full text-[11px] text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              <th className="p-1 border">كود الحساب</th>
                              <th className="p-1 border">اسم الحساب</th>
                              <th className="p-1 border">مدين (ج.م)</th>
                              <th className="p-1 border">دائن (ج.م)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.proposedRetainedEarningsLines.map((l, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="p-1 border font-mono">{l.accountCode}</td>
                                <td className="p-1 border">{l.accountName}</td>
                                <td className="p-1 border font-mono">{l.debit > 0 ? formatEgyptianCurrency(l.debit) : '-'}</td>
                                <td className="p-1 border font-mono">{l.credit > 0 ? formatEgyptianCurrency(l.credit) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolloverToNextYear}
                  onChange={(e) => setRolloverToNextYear(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                  ترحيل الأرصدة الختامية بعد الإقفال كافتتاحية للسنة ({fiscalYear + 1}) في{' '}
                  <code className="font-mono text-[11px]">openingBalances[{activeClientId}][{fiscalYear + 1}]</code>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockClosedPeriod}
                  onChange={(e) => setLockClosedPeriod(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  قفل الفترة المالية ({fiscalYear}) للمنشأة رسمياً فور إتمام الإقفال
                </span>
              </label>
            </div>

            {/* Error or Success Alert */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>لا يمكن تنفيذ الإقفال إلا بعد اجتياز جميع الفحوصات بالأعلى</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!preview?.canClose}
                  onClick={handleExecuteClosing}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md ${
                    preview?.canClose
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد وتنفيذ الإقفال الحقيقي للسنة ({fiscalYear})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
