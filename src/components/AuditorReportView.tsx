import React, { useState, useMemo } from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { FileCheck2, Printer, AlertCircle } from 'lucide-react';
import { PrintService } from '../services/PrintService';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

export interface AuditorReportViewProps {
  state: DatabaseState;
  selectedYear?: number;
  onNavigateToTab?: (tab: string) => void;
}

export const AuditorReportView: React.FC<AuditorReportViewProps> = ({
  state,
  selectedYear = 2026,
  onNavigateToTab,
}) => {
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;
  const targetYear =
    state.activeClientContext?.selectedFiscalYear ||
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    selectedYear;
  const fiscalBounds = db.getClientFiscalYearBounds(activeClientId, targetYear);
  const unassignedEntries = db.getUnassignedJournalEntries();

  // Principle 8: No default professional opinion — user must explicitly select one
  const [opinionType, setOpinionType] = useState<
    '' | 'UNQUALIFIED' | 'QUALIFIED' | 'ADVERSE' | 'DISCLAIMER'
  >('');
  const [basisParagraph, setBasisParagraph] = useState('');
  const [keyAuditMatters, setKeyAuditMatters] = useState('');

  const financialMetrics = useMemo(() => {
    if (!activeClientId) return { totalAssets: 0, totalRevenues: 0, netIncome: 0, entriesCount: 0 };
    const clientAccounts = db.getClientAccounts(activeClientId, targetYear);
    const postedEntries = (state.journalEntries || []).filter((je) => {
      if (je.clientId !== activeClientId) return false;
      if (!je.isPosted && je.status !== 'POSTED') return false;
      if (je.fiscalYear) return je.fiscalYear === targetYear;
      return je.date >= fiscalBounds.startDate && je.date <= fiscalBounds.endDate;
    });

    const movMap = new Map<string, { debit: number; credit: number }>();
    for (const je of postedEntries) {
      for (const l of je.lines || []) {
        const key = l.accountCode || l.accountId || '';
        const prev = movMap.get(key) || { debit: 0, credit: 0 };
        prev.debit += Number(l.debit) || 0;
        prev.credit += Number(l.credit) || 0;
        movMap.set(key, prev);
      }
    }

    let totalAssets = 0;
    let totalRevenues = 0;
    let totalExpenses = 0;

    for (const acc of clientAccounts) {
      const mov = movMap.get(acc.code) || movMap.get(acc.id) || { debit: 0, credit: 0 };
      const openDr = Number(acc.openingBalanceDebit) || 0;
      const openCr = Number(acc.openingBalanceCredit) || 0;
      const netDebit = openDr + mov.debit - (openCr + mov.credit);
      const balance = acc.nature === 'CREDIT' ? -netDebit : netDebit;

      if (acc.category === 'ASSETS') totalAssets += balance;
      if (acc.category === 'REVENUE') totalRevenues += balance;
      if (acc.category === 'EXPENSES' || acc.category === 'COGS') totalExpenses += balance;
    }

    return {
      totalAssets,
      totalRevenues,
      netIncome: totalRevenues - totalExpenses,
      entriesCount: postedEntries.length,
    };
  }, [
    activeClientId,
    targetYear,
    fiscalBounds.startDate,
    fiscalBounds.endDate,
    state.accounts,
    state.journalEntries,
    state.openingBalances,
    state.clientOpeningBalances,
  ]);

  if (!activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار العميل (المنشأة) أولاً لإعداد تقرير مراقب الحسابات</p>
          <p className="mt-1">التقرير المهني مرتبط ببيانات القوائم المالية الخاصة بالمنشأة المختارة فقط.</p>
        </div>
      </div>
    );
  }

  if (unassignedEntries.length > 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 text-xs flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-700" />
          <div>
            <p className="font-black text-sm">
              لا يمكن إصدار تقرير مراقب الحسابات قبل نسب القيود غير المنسوبة ({unassignedEntries.length} قيد)
            </p>
            <p className="mt-1">
              يرجى الانتقال إلى شاشة &quot;قيود غير منسوبة&quot; ونسب القيود المعلقة إلى المنشأة المختصة أولاً.
            </p>
          </div>
        </div>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('UNASSIGNED_ENTRIES')}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold shrink-0 hover:bg-rose-700"
          >
            فتح شاشة قيود غير منسوبة
          </button>
        )}
      </div>
    );
  }

  const opinionLabelMap: Record<string, string> = {
    UNQUALIFIED: 'رأي غير متحفظ (نظيف)',
    QUALIFIED: 'رأي متحفظ',
    ADVERSE: 'رأي عكسي',
    DISCLAIMER: 'امتناع عن إبداء الرأي',
  };

  const canPrintReport = Boolean(opinionType && basisParagraph.trim());

  return (
    <div id="auditor-report-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 text-xs" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              تقرير مراقب الحسابات المستقل • {activeClient.name}
            </h2>
            <p className="text-xs text-slate-500">
              وفقاً لمعايير المراجعة المصرية (EAS 700 / 705) عن السنة المالية المنتهية في {fiscalBounds.labelAr} ({fiscalBounds.startDate} إلى {fiscalBounds.endDate})
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canPrintReport}
          onClick={() =>
            PrintService.printElementById('auditor-report-printable', {
              documentTitle: `تقرير مراقب الحسابات - ${activeClient.name} - ${fiscalBounds.endDate}`,
            })
          }
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة التقرير الرسمي</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-slate-500 block">المنشأة محل المراجعة</span>
          <span className="font-black text-slate-900 dark:text-white">{activeClient.name}</span>
        </div>
        <div>
          <span className="text-slate-500 block">إجمالي الأصول في {fiscalBounds.endDate}</span>
          <span className="font-mono font-bold text-emerald-700">{formatEgyptianCurrency(financialMetrics.totalAssets)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">إجمالي الإيرادات ({targetYear})</span>
          <span className="font-mono font-bold text-blue-700">{formatEgyptianCurrency(financialMetrics.totalRevenues)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">صافي نتيجة العام ({ financialMetrics.entriesCount } قيد مرحّل)</span>
          <span className="font-mono font-bold text-indigo-700">{formatEgyptianCurrency(financialMetrics.netIncome)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            نوع الرأي المهني للمراجع (إدخال إلزامي بعد استكمال أدلة المراجعة)
          </label>
          <select
            value={opinionType}
            onChange={(e) => setOpinionType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
          >
            <option value="">-- اختر نوع الرأي المهني --</option>
            <option value="UNQUALIFIED">رأي غير متحفظ (Unqualified)</option>
            <option value="QUALIFIED">رأي متحفظ (Qualified)</option>
            <option value="ADVERSE">رأي عكسي (Adverse)</option>
            <option value="DISCLAIMER">امتناع عن إبداء الرأي (Disclaimer)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            أساس الرأي والتحفظات المهنية (إدخال إلزامي من واقع أوراق العمل)
          </label>
          <textarea
            value={basisParagraph}
            onChange={(e) => setBasisParagraph(e.target.value)}
            rows={2}
            placeholder="اكتب نص أساس الرأي أو التحفظات المستخرجة من أوراق عمل المراجعة..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            أمور المراجعة الرئيسية أو فقرة لفت الانتباه (اختياري)
          </label>
          <input
            type="text"
            value={keyAuditMatters}
            onChange={(e) => setKeyAuditMatters(e.target.value)}
            placeholder="أي إيضاحات جوهرية يرى المراجع الإشارة إليها في التقرير..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {!canPrintReport ? (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-black">لا يتم توليد استنتاج أو رأي مهني افتراضي تلقائياً</p>
            <p className="mt-0.5">يرجى تحديد نوع الرأي المهني وكتابة فقرة أساس الرأي بناءً على نتائج فحص أرصدة وقيود المنشأة ({activeClient.name}) لعرض وطباعة التقرير الرسمي.</p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4 leading-7 text-slate-800 dark:text-slate-200">
          <h3 className="text-center font-black text-base">
            تقرير مراقب الحسابات المستقل ({opinionLabelMap[opinionType]})
          </h3>
          <p className="font-bold">إلى السادة المساهمين / الشركاء في: {activeClient.name}</p>
          <p>
            لقد راجعنا القوائم المالية المرفقة لشركة <strong>{activeClient.name}</strong> (سجل تجاري رقم: {activeClient.commercialRegister || activeClient.commercialRegNo || '—'}، بطاقة ضريبية رقم: {activeClient.taxId || activeClient.taxCardNo || '—'}) والتي تتمثل في قائمة المركز المالي في {fiscalBounds.labelAr} ({fiscalBounds.endDate}) بإجمالي أصول قدره <strong>{formatEgyptianCurrency(financialMetrics.totalAssets)}</strong>، وكذلك قوائم الدخل والتغير في حقوق الملكية والتدفقات النقدية عن السنة المالية المنتهية في ذلك التاريخ ({fiscalBounds.startDate} حتى {fiscalBounds.endDate}) بصافي نتيجة قدرها <strong>{formatEgyptianCurrency(financialMetrics.netIncome)}</strong>، وملخصاً للسياسات المحاسبية الهامة والإيضاحات الأخرى المتممة.
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <p className="font-black mb-1">أساس الرأي ({opinionLabelMap[opinionType]}):</p>
            <p>{basisParagraph}</p>
          </div>
          {keyAuditMatters.trim() && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="font-black mb-1">فقرة لفت انتباه / أمور المراجعة الرئيسية:</p>
              <p>{keyAuditMatters}</p>
            </div>
          )}
          <div className="pt-6 flex justify-between items-end border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-bold">مراقب الحسابات</p>
              <p className="text-slate-600">{state.officeProfile.auditorName}</p>
              <p className="text-slate-500">{state.officeProfile.firmName}</p>
            </div>
            <div className="text-left">
              <p>القاهرة، جمهورية مصر العربية</p>
              <p className="font-mono">{state.officeProfile.licenseNumber || 'س.م.م'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
